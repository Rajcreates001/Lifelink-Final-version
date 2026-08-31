"""
LifeLink — Hybrid Search Orchestrator
======================================
The brain of the search system. Coordinates the entire pipeline:
  1. Intent parsing
  2. Internal DB search (parallel across collections)
  3. User context search (history, profile, records, AI memory)
  4. RAG/vector search
  5. Insufficiency detection
  6. External source fetching (Scrapling + APIs)
  7. Content processing (clean, dedup, chunk)
  8. Ranking (relevance + trust + geo fusion)
  9. Medical validation
  10. AI summarization
  11. Citation generation
  12. Caching + history logging
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from app.services.search.schemas import (
    HybridSearchRequest,
    HybridSearchResponse,
    SearchIntent,
    SearchProgress,
    SearchProgressStage,
    SearchResultItem,
    SearchSummary,
    SourceInfo,
)
from app.services.search.intent_parser import parse_intent
from app.services.search.mode_policies import get_mode_policy, is_async_mode, get_insufficiency_threshold
from app.services.search.source_registry import get_source_config

logger = logging.getLogger("lifelink.search.orchestrator")


class HybridSearchOrchestrator:
    """
    Coordinates the entire multi-source hybrid search pipeline.

    Usage:
        orchestrator = HybridSearchOrchestrator()
        response = await orchestrator.search(request, user_ctx)
    """

    def __init__(self):
        self._adapters_initialized = False
        self._internal_adapter = None
        self._user_history_adapter = None
        self._user_profile_adapter = None
        self._medical_records_adapter = None
        self._ai_memory_adapter = None
        self._rag_adapter = None
        self._scrapling_service = None
        self._relevance_ranker = None
        self._trust_ranker = None
        self._fusion_ranker = None
        self._medical_validator = None
        self._summary_service = None
        self._citation_generator = None
        self._search_cache = None
        self._history_logger = None

    async def _ensure_adapters(self):
        """Lazy-load all adapters and services to avoid circular imports."""
        if self._adapters_initialized:
            return

        from app.services.search.adapters.internal_db import InternalDbAdapter
        from app.services.search.adapters.user_history import UserHistoryAdapter
        from app.services.search.adapters.user_profile import UserProfileAdapter
        from app.services.search.adapters.medical_records import MedicalRecordsAdapter
        from app.services.search.adapters.ai_memory import AiMemoryAdapter
        from app.services.search.adapters.rag_adapter import RagAdapter
        from app.services.search.external.scrapling_service import ScraplingService
        from app.services.search.ranking.fusion import FusionRanker
        from app.services.search.validation.medical_validator import MedicalValidator
        from app.services.search.summarization.summary_service import SummaryService
        from app.services.search.citations.citation_generator import CitationGenerator
        from app.services.search.caching.search_cache import SearchCache
        from app.services.search.history.history_logger import HistoryLogger
        from app.services.search.ranking.relevance_ranker import RelevanceRanker
        from app.services.search.ranking.trust_ranker import TrustRanker

        self._internal_adapter = InternalDbAdapter()
        self._user_history_adapter = UserHistoryAdapter()
        self._user_profile_adapter = UserProfileAdapter()
        self._medical_records_adapter = MedicalRecordsAdapter()
        self._ai_memory_adapter = AiMemoryAdapter()
        self._rag_adapter = RagAdapter()
        self._scrapling_service = ScraplingService()
        self._relevance_ranker = RelevanceRanker()
        self._trust_ranker = TrustRanker()
        self._fusion_ranker = FusionRanker(self._relevance_ranker, self._trust_ranker)
        self._medical_validator = MedicalValidator()
        self._summary_service = SummaryService()
        self._citation_generator = CitationGenerator()
        self._search_cache = SearchCache()
        self._history_logger = HistoryLogger()
        self._adapters_initialized = True

    # ── Progress Helpers ─────────────────────────────────────────

    def _make_stage(self, stage: str, label: str) -> SearchProgressStage:
        return SearchProgressStage(stage=stage, label=label, status="pending")

    def _start_stage(self, stages: list[SearchProgressStage], stage: str) -> dict[str, Any]:
        for s in stages:
            if s.stage == stage:
                s.status = "running"
                s.started_at = str(time.time())
                return {"stage": s, "start": time.time()}
        return {"stage": None, "start": time.time()}

    def _complete_stage(self, stages: list[SearchProgressStage], stage: str, ctx: dict[str, Any], items_found: int = 0):
        for s in stages:
            if s.stage == stage and s.status == "running":
                s.status = "complete"
                s.completed_at = str(time.time())
                s.items_found = items_found
                s.duration_ms = round((time.time() - ctx.get("start", time.time())) * 1000)
                break

    def _skip_stage(self, stages: list[SearchProgressStage], stage: str):
        for s in stages:
            if s.stage == stage:
                s.status = "skipped"
                break

    def _error_stage(self, stages: list[SearchProgressStage], stage: str, error: str):
        for s in stages:
            if s.stage == stage:
                s.status = "error"
                s.error = error
                break

    # ── Main Search ─────────────────────────────────────────────

    async def search(
        self,
        request: HybridSearchRequest,
        user_id: str | None = None,
        role: str | None = None,
    ) -> HybridSearchResponse:
        """
        Execute the full hybrid search pipeline.

        Args:
            request: The validated search request.
            user_id: The authenticated user's ID (for personalization).
            role: The user's role scope.

        Returns:
            A complete HybridSearchResponse with results, summary, citations.
        """
        start_time = time.time()
        await self._ensure_adapters()

        query = request.query.strip()
        mode = request.mode

        # ── Check cache first ──
        cache_key = f"{mode}:{query}:{role or 'all'}"
        cached = self._search_cache.get(cache_key)
        if cached and not request.force_refresh:
            cached["cached"] = True
            cached["execution_ms"] = round((time.time() - start_time) * 1000)
            return HybridSearchResponse(**cached)

        # ── Initialize progress ──
        policy = get_mode_policy(mode)
        show_progress = request.include_progress or is_async_mode(mode)

        stages = [
            self._make_stage("intent_parsing", "Understanding query intent"),
            self._make_stage("internal_db_search", "Searching LifeLink database"),
            self._make_stage("user_context_search", "Searching user context"),
            self._make_stage("vector_search", "Searching knowledge base"),
            self._make_stage("external_fetch", "Expanding to trusted sources"),
            self._make_stage("processing", "Processing results"),
            self._make_stage("ranking", "Ranking by relevance & trust"),
            self._make_stage("medical_validation", "Validating medically"),
            self._make_stage("ai_summarization", "Generating AI summary"),
            self._make_stage("citation", "Generating citations"),
            self._make_stage("done", "Complete"),
        ]

        # ═══════════════════════════════════════════════════════════
        # 1. INTENT PARSING
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "intent_parsing")

        intent_data = parse_intent(
            query=query,
            mode=mode,
            latitude=request.latitude,
            longitude=request.longitude,
            role=role,
        )
        intent = SearchIntent(**intent_data)
        self._complete_stage(stages, "intent_parsing", stage_ctx)

        # ═══════════════════════════════════════════════════════════
        # 2. INTERNAL DB SEARCH (parallel across collections)
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "internal_db_search")
        internal_results: list[SearchResultItem] = []
        internal_sources_queried = 0

        try:
            internal_results = await self._internal_adapter.search(
                query=query,
                intent=intent,
                user_id=user_id,
                role=role,
            )
            internal_sources_queried = len(intent.target_collections)
        except Exception as e:
            logger.warning("Internal DB search error: %s", e)
            self._error_stage(stages, "internal_db_search", str(e))

        self._complete_stage(stages, "internal_db_search", stage_ctx, len(internal_results))

        # ═══════════════════════════════════════════════════════════
        # 3. USER CONTEXT SEARCH (parallel)
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "user_context_search")
        user_context_results: list[SearchResultItem] = []
        user_history_results: list[SearchResultItem] = []
        medical_record_results: list[SearchResultItem] = []
        ai_memory_results: list[SearchResultItem] = []

        if user_id:
            try:
                history_task = self._user_history_adapter.search(query, user_id)
                profile_task = self._user_profile_adapter.search(query, user_id)
                records_task = self._medical_records_adapter.search(query, user_id)
                memory_task = self._ai_memory_adapter.search(query, user_id)
                (
                    user_history_results,
                    user_context_results,
                    medical_record_results,
                    ai_memory_results,
                ) = await asyncio.gather(
                    history_task, profile_task, records_task, memory_task,
                    return_exceptions=True,
                )
                # Handle exceptions
                if isinstance(user_history_results, Exception):
                    user_history_results = []
                if isinstance(user_context_results, Exception):
                    user_context_results = []
                if isinstance(medical_record_results, Exception):
                    medical_record_results = []
                if isinstance(ai_memory_results, Exception):
                    ai_memory_results = []

            except Exception as e:
                logger.warning("User context search error: %s", e)

        all_user_context = (
            user_history_results
            + user_context_results
            + medical_record_results
            + ai_memory_results
        )
        self._complete_stage(stages, "user_context_search", stage_ctx, len(all_user_context))

        # ═══════════════════════════════════════════════════════════
        # 4. VECTOR / RAG SEARCH
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "vector_search")
        rag_results: list[SearchResultItem] = []

        try:
            rag_results = await self._rag_adapter.search(
                query=query,
                top_k=15,
                role=role,
                user_id=user_id,
            )
        except Exception as e:
            logger.warning("RAG search error: %s", e)

        self._complete_stage(stages, "vector_search", stage_ctx, len(rag_results))

        # ── Fusion: combine all internal results ──
        all_internal = internal_results + all_user_context + rag_results
        total_internal_found = len(all_internal)

        # ═══════════════════════════════════════════════════════════
        # 5. INSUFFICIENCY DETECTION & EXTERNAL FALLBACK
        # ═══════════════════════════════════════════════════════════
        threshold = get_insufficiency_threshold(mode)
        internal_confidence = min(0.95, 0.3 + total_internal_found * 0.04)

        external_results: list[SearchResultItem] = []
        external_sources_used: list[str] = []
        external_sources_queried = 0

        needs_external = (
            intent.requires_external
            and internal_confidence < threshold
        )

        if needs_external:
            stage_ctx = self._start_stage(stages, "external_fetch")
            try:
                external_sources = intent.target_external_sources
                max_sources = policy.get("max_external_sources", 3)

                external_result = await self._scrapling_service.search(
                    query=query,
                    sources=external_sources[:max_sources],
                    mode=mode,
                )
                external_results = external_result.get("results", [])
                external_sources_used = external_result.get("sources_used", [])
                external_sources_queried = len(external_sources_used)
            except Exception as e:
                logger.warning("External search error: %s", e)
                self._error_stage(stages, "external_fetch", str(e))

            self._complete_stage(stages, "external_fetch", stage_ctx, len(external_results))
        else:
            self._skip_stage(stages, "external_fetch")

        # ═══════════════════════════════════════════════════════════
        # 6. PROCESSING (dedup, merge)
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "processing")

        all_results_dict: dict[str, SearchResultItem] = {}
        for item in all_internal + external_results:
            key = item.id or item.title or item.content_snippet[:50]
            if key not in all_results_dict:
                all_results_dict[key] = item
        merged_results = list(all_results_dict.values())

        self._complete_stage(stages, "processing", stage_ctx, len(merged_results))

        # ═══════════════════════════════════════════════════════════
        # 7. RANKING
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "ranking")

        ranked_results = self._fusion_ranker.rank(
            results=merged_results,
            query=query,
            intent=intent,
            latitude=request.latitude,
            longitude=request.longitude,
        )

        self._complete_stage(stages, "ranking", stage_ctx, len(ranked_results))

        # ═══════════════════════════════════════════════════════════
        # 8. MEDICAL VALIDATION
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "medical_validation")
        validation_warnings: list[str] = []

        if policy.get("requires_medical_validation", True):
            try:
                validated = self._medical_validator.validate(ranked_results, intent, query)
                ranked_results = validated.get("results", ranked_results)
                validation_warnings = validated.get("warnings", [])
            except Exception as e:
                logger.warning("Medical validation error: %s", e)

        self._complete_stage(stages, "medical_validation", stage_ctx)

        # ═══════════════════════════════════════════════════════════
        # 9. AI SUMMARIZATION
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "ai_summarization")
        summary: SearchSummary | None = None

        try:
            summary = await self._summary_service.generate(
                query=query,
                results=ranked_results[:10],
                intent=intent,
                mode=mode,
                internal_count=total_internal_found,
                external_count=len(external_results),
                warnings=validation_warnings,
                internal_sources_queried=internal_sources_queried,
                external_sources_queried=external_sources_queried,
            )
        except Exception as e:
            logger.warning("AI summarization error: %s", e)

        self._complete_stage(stages, "ai_summarization", stage_ctx)

        # ═══════════════════════════════════════════════════════════
        # 10. CITATIONS
        # ═══════════════════════════════════════════════════════════
        stage_ctx = self._start_stage(stages, "citation")

        citations = self._citation_generator.generate(ranked_results[:5])

        # Mark final stage done
        stage_ctx2 = self._start_stage(stages, "done")
        self._complete_stage(stages, "done", stage_ctx2)

        # ═══════════════════════════════════════════════════════════
        # 11. BUILD RESPONSE
        # ═══════════════════════════════════════════════════════════
        execution_ms = round((time.time() - start_time) * 1000)

        # Group results by category
        grouped: dict[str, list[SearchResultItem]] = {}
        for item in ranked_results:
            cat = item.category or "general"
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(item)

        # Build sources used list
        sources_used = [
            SourceInfo(
                key=src,
                label=get_source_config(src).get("label", src) if get_source_config(src) else src,
                trust_score=0.9,
                verified=True,
                category="internal",
                documents_found=len(internal_results),
            )
            for src in intent.target_collections[:5]
        ]
        if external_sources_used:
            for src_key in external_sources_used:
                config = get_source_config(src_key) or {}
                sources_used.append(SourceInfo(
                    key=src_key,
                    label=config.get("label", src_key),
                    trust_score=0.9,
                    verified=True,
                    category=config.get("category", "external"),
                ))

        # Build progress object
        progress = None
        if show_progress:
            total_stages = len(stages)
            completed = sum(1 for s in stages if s.status in ("complete", "skipped", "error"))
            progress = SearchProgress(
                stages=stages,
                current_stage="done" if completed == total_stages else stages[completed].stage,
                percent_complete=round((completed / total_stages) * 100, 1),
                total_sources_queried=internal_sources_queried + external_sources_queried,
                total_items_found=total_internal_found + len(external_results),
                elapsed_ms=execution_ms,
            )

        # Build summary if none generated
        if summary is None:
            answer_trace = (
                f"Searched {internal_sources_queried} internal databases"
                f"{f' and {external_sources_queried} trusted external sources' if external_sources_queried else ''}."
            )
            summary = SearchSummary(
                executive_summary=f"Found {total_internal_found + len(external_results)} results. {answer_trace}",
                confidence=internal_confidence,
                sources_used=sources_used,
                internal_sources_queried=internal_sources_queried,
                external_sources_queried=external_sources_queried,
                total_items_found=total_internal_found + len(external_results),
                answer_trace=answer_trace,
            )

        response = HybridSearchResponse(
            query=query,
            normalized_query=intent.normalized_query or query,
            mode=mode,
            intent=intent,
            summary=summary,
            results=ranked_results[: request.max_results],
            grouped_results=grouped,
            citations=citations,
            related_queries=_generate_related_queries(query, intent),
            progress_trace=stages if show_progress else [],
            progress=progress,
            analytics={
                "total_internal": total_internal_found,
                "total_external": len(external_results),
                "total_fused": len(ranked_results),
                "internal_confidence": round(internal_confidence, 2),
                "needs_external": needs_external,
                "mode": mode,
            },
            cached=False,
            execution_ms=execution_ms,
        )

        # Cache the response
        self._search_cache.set(cache_key, response.model_dump(), ttl=policy.get("cache_ttl_seconds", 300))

        # Log to history
        if user_id:
            try:
                await self._history_logger.log(
                    user_id=user_id,
                    query=query,
                    mode=mode,
                    intent_type=intent.intent_type,
                    result_summary=summary.executive_summary[:200] if summary else "",
                    confidence=summary.confidence if summary else 0.0,
                    sources_count=internal_sources_queried + external_sources_queried,
                    execution_ms=execution_ms,
                )
            except Exception as e:
                logger.warning("History logging error: %s", e)

        return response


def _generate_related_queries(query: str, intent: SearchIntent) -> list[str]:
    """Generate related follow-up search suggestions."""
    suggestions = []
    entities = intent.entities

    # Blood group suggestions
    bg = next((e["value"] for e in entities if e["type"] == "blood_group"), None)
    if bg:
        suggestions.append(f"Find {bg} blood banks near me")
        suggestions.append(f"Who can donate to {bg}?")

    # Medical term suggestions
    medical = next((e["value"] for e in entities if e["type"] == "medical_term"), None)
    if medical:
        suggestions.append(f"Latest treatment for {medical}")
        suggestions.append(f"{medical} symptoms and causes")

    # General suggestions
    if not suggestions:
        suggestions = [
            f"Tell me more about {query}",
            f"Latest research on {query}",
            f"Hospitals specializing in {query}",
        ]

    return suggestions[:5]
