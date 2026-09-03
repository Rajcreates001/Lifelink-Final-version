"""
LifeLink — AI Inference Gateway Routes
=======================================
All AI requests flow through these endpoints.
Frontend MUST NEVER directly control privileged inference infrastructure.

Endpoints:
    POST /api/ai/inference    — General AI inference
    POST /api/ai/embeddings   — Generate embeddings
    POST /api/ai/search       — Semantic search
    POST /api/ai/rerank       — Rerank documents
    POST /api/ai/structured   — Structured output inference
    POST /api/ai/safety       — Safety validation
    GET  /api/ai/health       — AI infrastructure health
    GET  /api/ai/stats        — Compression & performance stats
"""

from __future__ import annotations

import logging
import time
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.dependencies import get_current_token_payload
from app.services.ai_platform.context_builder import UserContext
from app.services.ai_platform.orchestrator import (
    AIOrchestrator,
    AIRequest,
    Priority,
)
from app.services.ai_platform.headroom_service import HeadroomService
from app.services.ai_platform.sie_client import get_sie_client

logger = logging.getLogger("lifelink.routes.ai_gateway")

router = APIRouter(prefix="/api/ai", tags=["ai-gateway"])

_orchestrator = AIOrchestrator()
_headroom = HeadroomService()


# ═══════════════════════════════════════════════════════════════════
# REQUEST MODELS
# ═══════════════════════════════════════════════════════════════════

class InferenceRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    agent_type: str = Field(default="conversational")
    priority: str = Field(default="normal")
    context_items: list[dict[str, Any]] = Field(default_factory=list)
    conversation_id: str | None = None
    structured_schema: dict[str, Any] | None = None


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)
    model: str | None = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    top_k: int = Field(default=10, ge=1, le=100)
    namespace: str | None = None


class RerankRequest(BaseModel):
    query: str = Field(..., min_length=1)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=50)


class StructuredRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    output_schema: dict[str, Any] = Field(..., alias="schema")
    system_prompt: str | None = None
    temperature: float = Field(default=0.1, ge=0.0, le=1.0)


class SafetyValidationRequest(BaseModel):
    response: str = Field(...)
    agent_type: str = Field(default="conversational")
    priority: str = Field(default="normal")


# ═══════════════════════════════════════════════════════════════════
# HELPER: Build UserContext from JWT
# ═══════════════════════════════════════════════════════════════════

def _build_user_ctx(user: dict[str, Any]) -> UserContext:
    """Build a UserContext from the authenticated user payload."""
    return UserContext(
        user_id=user.get("id", user.get("sub", "")),
        role=user.get("role", "public"),
        sub_role=user.get("sub_role"),
        organization_id=user.get("organization_id"),
        hospital_id=user.get("hospital_id"),
        department_id=user.get("department_id"),
        government_level=user.get("government_level"),
        scopes=user.get("scopes", []),
    )


# ═══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/inference")
async def ai_inference(
    body: InferenceRequest,
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """General AI inference through the full pipeline."""
    user_ctx = _build_user_ctx(user)

    request = AIRequest(
        user_ctx=user_ctx,
        query=body.query,
        priority=body.priority,
        agent_type=body.agent_type,
        context_items=body.context_items,
        conversation_id=body.conversation_id,
        structured_schema=body.structured_schema,
    )

    response = await _orchestrator.process(request)

    return {
        "request_id": response.request_id,
        "response": response.response,
        "agent": response.agent,
        "confidence": response.confidence,
        "reasoning": response.reasoning,
        "evidence": response.evidence,
        "sources": response.sources,
        "tools_used": response.tools_used,
        "requires_human_review": response.requires_human_review,
        "data_label": response.data_label,
        "disclaimers": response.disclaimers,
        "metrics": {
            "original_tokens": response.original_tokens,
            "compressed_tokens": response.compressed_tokens,
            "compression_ratio": response.compression_ratio,
            "retrieval_count": response.retrieval_count,
            "rerank_count": response.rerank_count,
            "latency_ms": response.latency_ms,
            "model": response.model,
            "fallback_used": response.fallback_used,
        },
    }


@router.post("/embeddings")
async def generate_embeddings(
    body: EmbeddingRequest,
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """Generate embeddings via SIE."""
    sie = get_sie_client()
    embeddings = await sie.embed(body.texts, model=body.model)
    return {
        "embeddings": embeddings,
        "count": len(embeddings),
        "dimension": len(embeddings[0]) if embeddings else 0,
    }


@router.post("/search")
async def semantic_search(
    body: SearchRequest,
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """Semantic search via SIE."""
    sie = get_sie_client()
    results = await sie.search(
        query=body.query,
        documents=body.documents,
        top_k=body.top_k,
        namespace=body.namespace,
    )
    return {
        "results": results,
        "count": len(results),
    }


@router.post("/rerank")
async def rerank_documents(
    body: RerankRequest,
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """Rerank documents by relevance via SIE."""
    sie = get_sie_client()
    results = await sie.rerank(
        query=body.query,
        documents=body.documents,
        top_k=body.top_k,
    )
    return {
        "results": results,
        "count": len(results),
    }


@router.post("/structured")
async def structured_output(
    body: StructuredRequest,
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """Request structured output from the AI."""
    sie = get_sie_client()
    result = await sie.structured_inference(
        prompt=body.prompt,
        schema=body.output_schema,
        system_prompt=body.system_prompt,
        temperature=body.temperature,
    )
    return result


@router.post("/safety")
async def validate_safety(
    body: SafetyValidationRequest,
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """Validate an AI response for medical safety."""
    # Build a minimal request for validation
    from app.services.ai_platform.orchestrator import AIOrchestrator
    orchestrator = AIOrchestrator()

    agent_response = {
        "response": body.response,
        "confidence": 0.8,
    }
    request = AIRequest(agent_type=body.agent_type, priority=body.priority)
    safety = orchestrator._validate_safety(agent_response, request)

    return safety


@router.get("/health")
async def ai_health():
    """Check AI infrastructure health (public for monitoring)."""
    settings = get_settings()
    sie = get_sie_client()

    sie_health = await sie.health_check()

    return {
        "headroom": {
            "enabled": settings.headroom_enabled,
            "available": _headroom.is_available,
        },
        "sie": sie_health,
        "feature_flags": {
            "semantic_search": settings.enable_semantic_search,
            "reranking": settings.enable_reranking,
            "structured_output": settings.enable_ai_structured_output,
            "edge_ai": settings.edge_ai_enabled,
            "observability": settings.enable_ai_observability,
            "scrapling": settings.enable_scrapling_search,
        },
    }


@router.get("/stats")
async def ai_stats(
    user: dict[str, Any] = Depends(get_current_token_payload),
):
    """Get AI compression and performance stats."""
    return {
        "headroom": _headroom.get_compression_stats(),
        "sie": get_sie_client().get_stats(),
    }
