"""
LifeLink — SIE (Superlinked Inference Engine) Client
====================================================
Wraps SIE for:
- Embeddings (medical records, documents, emergency reports)
- Semantic retrieval (finding related cases, similar conditions)
- Reranking (100 candidates → 20 relevant → 5 highly relevant)
- Document processing (PDFs, reports, SOPs)
- Structured output (critical workflow data)

Architecture:
    LifeLink Backend
          ↓
    SIE Client
          ↓
    SIE Server (self-hosted)
          ↓
    Embeddings / Reranking / Extraction

SIE API Primitives (from superlinked.com/docs):
    POST /v1/encode/{model_id}  — Embeddings (items → vectors)
    POST /v1/score/{model_id}   — Reranking (query + items → scores)
    POST /v1/extract/{model_id} — Entity extraction (items → entities)
    POST /v1/embeddings         — OpenAI-compatible embeddings alias

SIE is NOT the application database — it is a dedicated inference service.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import time
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import get_settings

logger = logging.getLogger("lifelink.ai.sie")

# Lazy singleton
_sie_client = None


def get_sie_client() -> "SIEClient":
    global _sie_client
    if _sie_client is None:
        _sie_client = SIEClient()
    return _sie_client


class SIEClient:
    """Client for the Superlinked Inference Engine.

    Correct SIE HTTP endpoints (from official docs):
        POST /v1/encode/{model_id}   → embeddings   {"items": [{"text": "..."}]}
        POST /v1/score/{model_id}    → reranking    {"query": {"text": "..."}, "items": [...]}
        POST /v1/extract/{model_id}  → extraction   {"items": [...], "params": {"labels": [...]}}
        GET  /readyz                  → readiness check
        GET  /healthz                 → liveness check
    """

    def __init__(self):
        settings = get_settings()
        self._enabled = settings.sie_enabled
        self._base_url = settings.sie_base_url.rstrip("/")
        self._api_key = settings.sie_api_key
        self._timeout = settings.sie_timeout_seconds
        self._embedding_model = settings.sie_embedding_model
        self._reranker_model = settings.sie_reranker_model

    @property
    def is_available(self) -> bool:
        return self._enabled

    def _headers(self, accept_json: bool = True) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if accept_json:
            headers["Accept"] = "application/json"
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    # ── Embeddings ──────────────────────────────────────────────

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Uses SIE's native encode endpoint:
            POST /v1/encode/{model_id}
            Body: {"items": [{"text": "..."}, ...]}
            Response: [{"dense": [float, ...], ...}, ...]
        """
        if not self._enabled:
            return self._fallback_embed(texts)

        model = model or self._embedding_model
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{self._base_url}/v1/encode/{model}",
                    headers=self._headers(),
                    json={"items": [{"text": text} for text in texts]},
                )
                resp.raise_for_status()
                data = resp.json()
                # SIE returns a list of result objects with "dense" arrays
                return [item["dense"] for item in data]
        except Exception as exc:
            logger.warning("SIE embedding failed: %s — using fallback", exc)
            return self._fallback_embed(texts)

    async def embed_single(self, text: str, model: str | None = None) -> list[float]:
        """Embed a single text."""
        results = await self.embed([text], model=model)
        return results[0] if results else []

    # ── Semantic Retrieval ──────────────────────────────────────

    async def search(
        self,
        query: str,
        documents: list[dict[str, Any]],
        top_k: int = 10,
        namespace: str | None = None,
    ) -> list[dict[str, Any]]:
        """Semantic search over documents.

        SIE has no /v1/search endpoint. We implement search as:
            1. Encode query + documents via SIE
            2. Compute cosine similarity
            3. Return top_k results sorted by score
            4. Optionally rerank with cross-encoder
        """
        if not self._enabled:
            return self._fallback_search(query, documents, top_k)

        try:
            # Encode query and documents
            all_texts = [query] + [
                doc.get("content", doc.get("text", "")) for doc in documents
            ]
            embeddings = await self.embed(all_texts)

            if len(embeddings) < 2:
                return self._fallback_search(query, documents, top_k)

            query_emb = embeddings[0]
            doc_embs = embeddings[1:]

            # Compute cosine similarity scores
            scored = []
            for i, doc in enumerate(documents):
                doc_emb = doc_embs[i] if i < len(doc_embs) else []
                score = self._cosine_similarity(query_emb, doc_emb)
                scored.append({**doc, "score": score})

            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]

        except Exception as exc:
            logger.warning("SIE search failed: %s — using fallback", exc)
            return self._fallback_search(query, documents, top_k)

    # ── Reranking ───────────────────────────────────────────────

    async def rerank(
        self,
        query: str,
        documents: list[dict[str, Any]],
        top_k: int = 5,
        model: str | None = None,
    ) -> list[dict[str, Any]]:
        """Rerank documents by relevance to query.

        Uses SIE's native score endpoint:
            POST /v1/score/{model_id}
            Body: {"query": {"text": "..."}, "items": [{"text": "..."}, ...]}
            Response: {"scores": [{"item_id": "...", "score": float, "rank": int}]}
        """
        if not self._enabled:
            return documents[:top_k]

        model = model or self._reranker_model
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                # Build items from documents
                items = []
                for i, doc in enumerate(documents):
                    item = {"id": doc.get("id", f"doc-{i}")}
                    # SIE expects "text" field for the item content
                    if "content" in doc:
                        item["text"] = doc["content"]
                    elif "text" in doc:
                        item["text"] = doc["text"]
                    else:
                        item["text"] = json.dumps(doc)
                    items.append(item)

                resp = await client.post(
                    f"{self._base_url}/v1/score/{model}",
                    headers=self._headers(),
                    json={
                        "query": {"text": query},
                        "items": items,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                # Parse SIE score response: {"scores": [{"item_id": "...", "score": float, "rank": int}]}
                scores = data.get("scores", [])

                # Map scores back to original documents
                id_to_doc = {doc.get("id", f"doc-{i}"): doc for i, doc in enumerate(documents)}
                id_to_doc.update({f"doc-{i}": doc for i, doc in enumerate(documents)})

                reranked = []
                for entry in scores:
                    item_id = entry.get("item_id", "")
                    score = entry.get("score", 0.0)
                    doc = id_to_doc.get(item_id, {})
                    reranked.append({**doc, "score": score})

                return reranked[:top_k]

        except Exception as exc:
            logger.warning("SIE reranking failed: %s — using fallback", exc)
            return documents[:top_k]

    # ── Document Processing ─────────────────────────────────────

    async def process_document(
        self,
        content: str,
        content_type: str = "text/plain",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Process a document (PDF, report, SOP) into structured chunks.

        Uses SIE's extract endpoint for entity extraction:
            POST /v1/extract/{model_id}
            Body: {"items": [{"text": "..."}], "params": {"labels": [...]}}
        """
        if not self._enabled:
            return {
                "chunks": [{"content": content, "metadata": metadata or {}}],
                "processed": False,
            }

        try:
            async with httpx.AsyncClient(timeout=self._timeout * 2) as client:
                # Use GLiNER for medical entity extraction
                extract_model = "urchade/gliner_multi-v2.1"
                medical_labels = [
                    "condition", "medication", "procedure", "anatomy",
                    "symptom", "diagnosis", "treatment", "dosage",
                    "patient", "doctor", "hospital", "date",
                ]

                resp = await client.post(
                    f"{self._base_url}/v1/extract/{extract_model}",
                    headers=self._headers(),
                    json={
                        "items": [{"text": content}],
                        "params": {"labels": medical_labels},
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                entities = data.get("entities", []) if isinstance(data, dict) else []

                return {
                    "chunks": [{"content": content, "metadata": metadata or {}}],
                    "entities": entities,
                    "processed": True,
                    "model": extract_model,
                }

        except Exception as exc:
            logger.warning("SIE document processing failed: %s", exc)
            return {
                "chunks": [{"content": content, "metadata": metadata or {}}],
                "processed": False,
                "error": str(exc),
            }

    # ── Structured Output ───────────────────────────────────────

    async def structured_inference(
        self,
        prompt: str,
        schema: dict[str, Any],
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Request structured output from the LLM via SIE.

        SIE's generate endpoint requires the sglang bundle image.
        If sglang is not available, returns a fallback indicating
        structured output is not supported by the current SIE bundle.

        Note: The default cpu-default bundle does NOT include generation.
        For generation support, use the sglang bundle image.
        """
        if not self._enabled:
            return {"error": "SIE not available", "structured": False}

        # Try the OpenAI-compatible chat/completions endpoint (works with sglang bundle)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({
                    "role": "user",
                    "content": (
                        f"{prompt}\n\n"
                        f"Respond with valid JSON matching this schema:\n"
                        f"{json.dumps(schema, indent=2)}"
                    ),
                })

                resp = await client.post(
                    f"{self._base_url}/v1/chat/completions",
                    headers=self._headers(),
                    json={
                        "messages": messages,
                        "temperature": temperature,
                        "response_format": {"type": "json_object"},
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                try:
                    parsed = json.loads(content)
                    parsed["structured"] = True
                    return parsed
                except json.JSONDecodeError:
                    return {"raw_response": content, "structured": False}

        except Exception as exc:
            logger.warning(
                "SIE structured inference failed (sglang bundle may not be available): %s",
                exc,
            )
            return {
                "error": (
                    "Structured inference requires the SIE sglang bundle. "
                    "The current bundle does not include generation models. "
                    "Falling back to external LLM."
                ),
                "structured": False,
                "fallback_recommended": True,
            }

    # ── Health Check ────────────────────────────────────────────

    async def health_check(self) -> dict[str, Any]:
        """Check if SIE server is healthy.

        SIE exposes /readyz for readiness, /healthz for liveness.
        """
        if not self._enabled:
            return {"status": "disabled", "available": False}

        # SIE exposes /readyz for readiness, /healthz for liveness
        for endpoint in ["/readyz", "/healthz", "/health"]:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{self._base_url}{endpoint}")
                    if resp.status_code == 200:
                        return {"status": "healthy", "available": True, "endpoint": endpoint}
            except Exception:
                continue
        return {"status": "unreachable", "available": False, "error": "All SIE health endpoints failed"}

    # ── Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    # ── Fallbacks ───────────────────────────────────────────────

    def _fallback_embed(self, texts: list[str]) -> list[list[float]]:
        """Deterministic pseudo-embedding fallback when SIE is unavailable."""
        import hashlib
        results = []
        for text in texts:
            digest = hashlib.sha256(text.encode()).digest()
            vec = [((b - 128) / 128.0) for b in digest]
            # Pad to 384 dims (MiniLM size)
            while len(vec) < 384:
                vec.append(0.0)
            results.append(vec[:384])
        return results

    def _fallback_search(
        self,
        query: str,
        documents: list[dict[str, Any]],
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Keyword-based fallback search."""
        query_lower = query.lower()
        scored = []
        for doc in documents:
            text = doc.get("content", doc.get("text", "")).lower()
            score = sum(1 for word in query_lower.split() if word in text)
            scored.append({**doc, "score": score})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def get_stats(self) -> dict[str, Any]:
        """Return SIE stats for the observability dashboard."""
        return {
            "enabled": self._enabled,
            "base_url": self._base_url,
            "embedding_model": self._embedding_model,
            "reranker_model": self._reranker_model,
            "timeout_seconds": self._timeout,
        }
