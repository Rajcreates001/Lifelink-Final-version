"""
LifeLink — Hybrid AI Search Engine Schemas
===========================================
Pydantic models for the entire search pipeline — requests, responses,
intents, results, citations, progress tracking, and analytics.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# ─── Enums & Literals ───────────────────────────────────────────

SearchMode = Literal["quick", "deep", "clinical", "compare", "hospital", "donor"]
SearchStage = Literal[
    "intent_parsing",
    "internal_db_search",
    "user_context_search",
    "vector_search",
    "external_fetch",
    "processing",
    "ranking",
    "medical_validation",
    "ai_summarization",
    "citation",
    "done",
    "error",
]


# ─── Trust & Source Info ────────────────────────────────────────


class TrustScore(BaseModel):
    """Trust score for a single source."""

    source_key: str = Field(..., description="Canonical source key (e.g. 'who', 'pubmed')")
    source_label: str = Field(..., description="Human-readable label")
    score: float = Field(..., ge=0.0, le=1.0, description="Trust score 0.0–1.0")
    verified: bool = Field(default=False, description="Whether the source is medically verified")
    category: str = Field(default="external", description="Source category: internal/api/scraped_web")


class SourceInfo(BaseModel):
    """Information about a search source used."""

    key: str
    label: str
    trust_score: float
    verified: bool
    category: str
    documents_found: int = 0
    url: str | None = None
    error: str | None = None


# ─── Search Intent ──────────────────────────────────────────────


class SearchIntent(BaseModel):
    """Structured intent parsed from a natural-language query."""

    raw_query: str
    normalized_query: str = ""
    intent_type: str = Field(
        default="general",
        description="One of: donor_search, hospital_lookup, guideline_lookup, "
        "condition_info, drug_info, triage, emergency, general",
    )
    entities: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Detected entities: disease, drug, blood_group, location, organ, procedure",
    )
    target_collections: list[str] = Field(
        default_factory=list,
        description="MongoDB collections to search",
    )
    target_external_sources: list[str] = Field(
        default_factory=list,
        description="External source keys to query",
    )
    filters: dict[str, Any] = Field(default_factory=dict)
    sort: list[str] = Field(default_factory=list, description="Sort criteria")
    priority: str = Field(default="medium", description="low/medium/high/critical")
    requires_external: bool = False
    requires_medical_validation: bool = False
    requires_comparison: bool = False
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    expanded_terms: list[str] = Field(default_factory=list, description="Medical synonyms expanded")


# ─── Progress Tracking ──────────────────────────────────────────


class SearchProgressStage(BaseModel):
    """A single stage in the search pipeline with status."""

    stage: SearchStage
    label: str = ""
    status: Literal["pending", "running", "complete", "skipped", "error"] = "pending"
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: float | None = None
    items_found: int = 0
    error: str | None = None
    detail: str | None = None


class SearchProgress(BaseModel):
    """Full progress tracker for a search."""

    stages: list[SearchProgressStage] = Field(default_factory=list)
    current_stage: SearchStage = "intent_parsing"
    percent_complete: float = 0.0
    total_sources_queried: int = 0
    total_items_found: int = 0
    elapsed_ms: float = 0.0


# ─── Citation ───────────────────────────────────────────────────


class Citation(BaseModel):
    """A single source citation for an AI-generated answer."""

    source_key: str = Field(..., description="Canonical source key")
    source_label: str = Field(..., description="Human-readable source name")
    title: str = ""
    url: str | None = None
    publication_date: str | None = None
    organization: str = ""
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    snippet: str = ""
    category: str = "external"
    verified: bool = False


# ─── Result Items ───────────────────────────────────────────────


class SearchResultItem(BaseModel):
    """A single search result from any source."""

    id: str = ""
    title: str = ""
    category: str = Field(
        default="general",
        description="hospital, donor, article, guideline, record, alert, user, etc.",
    )
    source_type: str = Field(
        default="internal_db",
        description="internal_db, user_history, rag, scraped_web, api",
    )
    source_name: str = ""
    source_url: str | None = None
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    relevance_score: float = Field(default=0.5, ge=0.0, le=1.0)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    timestamp: str | None = None
    summary: str = ""
    content_snippet: str = ""
    content: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    citations: list[Citation] = Field(default_factory=list)
    explain: dict[str, Any] | None = None
    actions: list[dict[str, Any]] = Field(default_factory=list)


# ─── Summary ────────────────────────────────────────────────────


class SearchSummary(BaseModel):
    """AI-generated executive summary for search results."""

    executive_summary: str = ""
    key_findings: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    contradictions: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    sources_used: list[SourceInfo] = Field(default_factory=list)
    internal_sources_queried: int = 0
    external_sources_queried: int = 0
    total_items_found: int = 0
    answer_trace: str = ""  # e.g. "Searched 4 internal + 9 external sources"


# ─── Request / Response ─────────────────────────────────────────


class HybridSearchRequest(BaseModel):
    """Request payload for the hybrid search endpoint."""

    query: str = Field(..., min_length=1, max_length=2000, description="The search query")
    mode: SearchMode = Field(default="quick", description="Search mode")
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    filters: dict[str, Any] | None = None
    compare_sources: list[str] | None = None
    attachments: list[dict[str, Any]] | None = None
    force_refresh: bool = False
    max_results: int = Field(default=20, ge=1, le=100)
    include_progress: bool = Field(default=False, description="Include progress stages in response")
    user_id: str | None = None
    role: str | None = None


class HybridSearchResponse(BaseModel):
    """Response payload from the hybrid search endpoint."""

    query: str
    normalized_query: str = ""
    mode: SearchMode = "quick"
    intent: SearchIntent | None = None
    summary: SearchSummary | None = None
    results: list[SearchResultItem] = Field(default_factory=list)
    grouped_results: dict[str, list[SearchResultItem]] = Field(default_factory=dict)
    citations: list[Citation] = Field(default_factory=list)
    related_queries: list[str] = Field(default_factory=list)
    progress_trace: list[SearchProgressStage] = Field(default_factory=list)
    progress: SearchProgress | None = None
    analytics: dict[str, Any] = Field(default_factory=dict)
    cached: bool = False
    execution_ms: float = 0.0
    error: str | None = None


# ─── History / Feedback ─────────────────────────────────────────


class SearchHistoryEntry(BaseModel):
    """A single entry in the user's search history."""

    id: str = ""
    user_id: str = ""
    query: str
    normalized_query: str = ""
    mode: SearchMode = "quick"
    intent_type: str = "general"
    result_summary: str = ""
    confidence: float = 0.0
    sources_count: int = 0
    execution_ms: float = 0.0
    clicked_result_id: str | None = None
    bookmarked: bool = False
    feedback: str | None = None  # helpful / not_helpful
    timestamp: str = ""
    cached: bool = False


class SearchFeedback(BaseModel):
    """User feedback on a search result."""

    search_id: str
    result_id: str
    feedback_type: Literal["click", "save", "helpful", "not_helpful", "bookmark", "share"]
    detail: str | None = None
