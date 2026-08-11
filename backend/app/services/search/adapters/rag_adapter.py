"""
LifeLink — RAG/Vector Search Adapter
======================================
Enhanced FAISS-based semantic search with hybrid lexical+vector scoring,
synonym expansion, and rich metadata filtering.
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.rag.vector_store import search as vector_search, upsert_documents
from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.rag_adapter")


class RagAdapter:
    """Enhanced RAG/vector search with hybrid scoring + synonym expansion."""

    async def search(
        self,
        query: str,
        top_k: int = 15,
        role: str | None = None,
        user_id: str | None = None,
    ) -> list[SearchResultItem]:
        try:
            filters: dict[str, Any] = {}
            if role:
                filters["roles"] = [role]
            if user_id:
                filters["user_id"] = user_id
            results = vector_search(query, top_k=top_k, filters=filters)

            items = []
            for r in results:
                metadata = r.get("metadata") or {}
                items.append(SearchResultItem(
                    id=str(metadata.get("id", "")),
                    title=metadata.get("title", "Knowledge") or metadata.get("source", "Document"),
                    category="knowledge",
                    summary=(r.get("content") or "")[:200],
                    content_snippet=(r.get("content") or "")[:300],
                    source_type="rag",
                    source_name=metadata.get("source", "Knowledge Base"),
                    trust_score=min(1.0, 0.5 + float(r.get("score", 0))),
                    relevance_score=float(r.get("score", 0)),
                    confidence=float(r.get("score", 0)),
                    metadata=metadata,
                ))
            return items
        except Exception as e:
            logger.warning("RAG search error: %s", e)
            return []
