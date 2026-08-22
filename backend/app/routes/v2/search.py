"""
LifeLink — Hybrid AI Search Route
===================================
Upgraded search endpoint that uses the HybridSearchOrchestrator to
combine internal database search, user context, semantic/vector search,
and external trusted medical sources — never returning empty results.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import get_optional_user, require_scopes
from app.core.rbac import AuthContext
from app.services.search.orchestrator import HybridSearchOrchestrator
from app.services.search.schemas import HybridSearchRequest, HybridSearchResponse

router = APIRouter(tags=["search"])


class LegacySearchRequest(BaseModel):
    """Backward-compatible search request that maps to HybridSearchRequest."""
    query: str
    mode: str = Field(default="quick", description="quick, deep, clinical, compare, hospital, donor")
    latitude: float | None = None
    longitude: float | None = None
    filters: dict | None = None
    force_refresh: bool = False
    max_results: int = 20


_orchestrator: HybridSearchOrchestrator | None = None


def _get_orchestrator() -> HybridSearchOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = HybridSearchOrchestrator()
    return _orchestrator


@router.post("/search")
async def search(
    payload: LegacySearchRequest,
    ctx: AuthContext | None = Depends(get_optional_user)
) -> dict:
    """
    Hybrid AI search endpoint.

    Combines:
    - Internal MongoDB search (users, hospitals, donors, alerts, etc.)
    - User context (profile, history, medical records, AI memory)
    - Semantic/vector search (FAISS RAG)
    - External trusted medical sources (WHO, CDC, PubMed, etc.) when internal results are insufficient

    Never returns empty — always provides an AI summary with citations.
    """
    orchestrator = _get_orchestrator()

    # Map legacy modes ("db", "ai") to the canonical hybrid modes so old
    # callers keep working: db -> quick (database-first), ai -> deep (AI).
    legacy_mode_map = {"db": "quick", "ai": "deep"}
    mode = legacy_mode_map.get((payload.mode or "").lower(), payload.mode)

    request = HybridSearchRequest(
        query=payload.query,
        mode=mode,
        latitude=payload.latitude,
        longitude=payload.longitude,
        filters=payload.filters or {},
        force_refresh=payload.force_refresh,
        max_results=payload.max_results,
        include_progress=True,
        user_id=str(ctx.user_id) if ctx and ctx.user_id else None,
        role=ctx.role if ctx else None
    )
    response = await orchestrator.search(
        request=request,
        user_id=str(ctx.user_id) if ctx and ctx.user_id else None,
        role=ctx.role if ctx else None
    )
    # Convert to dict for JSON response
    return response.model_dump()



