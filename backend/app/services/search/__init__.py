"""
LifeLink — Hybrid AI Search Engine
====================================
Multi-source intelligent search that combines internal databases,
user context, semantic/vector search, and external trusted medical
sources — powered by Scrapling.

Never returns empty results. Always explains. Always cites sources.
"""

from app.services.search.schemas import (
    HybridSearchRequest,
    HybridSearchResponse,
    SearchIntent,
    SearchResultItem,
    SearchProgressStage,
    SearchSummary,
    Citation,
    TrustScore,
    SourceInfo,
    SearchMode,
)

from app.services.search.orchestrator import HybridSearchOrchestrator
from app.services.search.source_registry import get_source_registry
from app.services.search.mode_policies import get_mode_policy

__all__ = [
    "HybridSearchRequest",
    "HybridSearchResponse",
    "SearchIntent",
    "SearchResultItem",
    "SearchProgressStage",
    "SearchSummary",
    "Citation",
    "TrustScore",
    "SourceInfo",
    "SearchMode",
    "HybridSearchOrchestrator",
    "get_source_registry",
    "get_mode_policy",
]
