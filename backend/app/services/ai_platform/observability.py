"""
LifeLink — AI Observability
============================
Two layers:
1. ObservabilityService — existing MongoDB-based inference logging (preserved)
2. AIObservabilityService — new PostgreSQL-based AI infrastructure metrics
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from app.db.database import get_db
from app.services.collections import INFERENCE_LOGS
from app.services.repository import MongoRepository

logger = logging.getLogger("lifelink.ai.observability")


# ═══════════════════════════════════════════════════════════════════
# EXISTING: ObservabilityService (MongoDB-based inference logging)
# ═══════════════════════════════════════════════════════════════════

class ObservabilityService:
    def __init__(self) -> None:
        self._db = get_db()
        self._repo = MongoRepository(self._db, INFERENCE_LOGS)

    async def log_inference(
        self,
        role: str,
        module_key: str,
        model_name: str,
        model_version: str | None,
        latency_ms: float,
        status: str,
        payload: dict[str, Any] | None = None,
        response: dict[str, Any] | None = None,
        quality_score: float | None = None,
        drift_score: float | None = None,
        data_freshness_hours: float | None = None,
        explanation_quality: float | None = None,
    ) -> dict[str, Any]:
        record = {
            "role": role,
            "module_key": module_key,
            "model_name": model_name,
            "model_version": model_version,
            "latency_ms": latency_ms,
            "status": status,
            "payload": payload or {},
            "response": response or {},
            "quality_score": quality_score,
            "drift_score": drift_score,
            "data_freshness_hours": data_freshness_hours,
            "explanation_quality": explanation_quality,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        return await self._repo.insert_one(record)

    async def summary(self, hours: int = 24) -> dict[str, Any]:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        records = await self._repo.find_many(
            {"created_at": {"$gte": since.isoformat()}},
            limit=500,
        )
        total = len(records)
        errors = [r for r in records if r.get("status") != "ok"]
        latency = [r.get("latency_ms", 0) for r in records if r.get("latency_ms") is not None]
        drift = [r.get("drift_score") for r in records if r.get("drift_score") is not None]
        quality = [r.get("quality_score") for r in records if r.get("quality_score") is not None]
        freshness = [r.get("data_freshness_hours") for r in records if r.get("data_freshness_hours") is not None]
        avg_latency = round(sum(latency) / len(latency), 2) if latency else 0
        sorted_latency = sorted(latency)
        p95_latency = sorted_latency[int(len(sorted_latency) * 0.95) - 1] if sorted_latency else 0
        avg_drift = round(sum(drift) / len(drift), 3) if drift else 0
        avg_quality = round(sum(quality) / len(quality), 3) if quality else 0
        avg_freshness = round(sum(freshness) / len(freshness), 2) if freshness else 0
        return {
            "window_hours": hours,
            "total_requests": total,
            "error_rate": round(len(errors) / total, 3) if total else 0,
            "avg_latency_ms": avg_latency,
            "p95_latency_ms": p95_latency,
            "avg_drift_score": avg_drift,
            "avg_quality_score": avg_quality,
            "avg_data_freshness_hours": avg_freshness,
            "recent_modules": list({r.get("module_key") for r in records if r.get("module_key")})[:12],
        }


# ═══════════════════════════════════════════════════════════════════
# NEW: AIObservabilityService (PostgreSQL-based infrastructure metrics)
# ═══════════════════════════════════════════════════════════════════

class AIObservabilityService:
    """Records and retrieves AI infrastructure metrics for the admin dashboard."""

    def __init__(self, session_factory=None):
        self._session_factory = session_factory
        self._in_memory_metrics: list[dict[str, Any]] = []

    async def record_request(
        self,
        request_id: str,
        user_id: str,
        role: str,
        agent: str,
        action: str,
        *,
        model: str = "",
        tokens_input: int = 0,
        tokens_output: int = 0,
        tokens_compressed: int = 0,
        latency_ms: float = 0.0,
        tools_used: list[str] | None = None,
        data_sources: list[str] | None = None,
        decision: str = "",
        approval_required: bool = False,
        approved_by: str | None = None,
        fallback_used: bool = False,
        error: str | None = None,
        input_reference: str | None = None,
        output_reference: str | None = None,
    ) -> None:
        """Record an AI audit log entry."""
        now = datetime.now(tz=timezone.utc)

        # Store in database
        if self._session_factory:
            try:
                from app.db.models import AiAuditLog
                async with self._session_factory() as session:
                    audit = AiAuditLog(
                        id=str(uuid4()),
                        request_id=request_id,
                        user_id=user_id,
                        role=role,
                        agent=agent,
                        action=action,
                        input_reference=input_reference,
                        output_reference=output_reference,
                        tools_used=tools_used or [],
                        data_sources=data_sources or [],
                        decision=decision,
                        approval_required=approval_required,
                        approved_by=approved_by,
                        tokens_input=tokens_input,
                        tokens_output=tokens_output,
                        tokens_compressed=tokens_compressed,
                        latency_ms=int(latency_ms),
                        model=model,
                        fallback_used=fallback_used,
                        error=error,
                        created_at=now,
                    )
                    session.add(audit)
                    await session.commit()
            except Exception as exc:
                logger.warning("Failed to record AI audit log: %s", exc)

        # Track in memory for metrics aggregation
        self._in_memory_metrics.append({
            "request_id": request_id,
            "user_id": user_id,
            "role": role,
            "agent": agent,
            "action": action,
            "model": model,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "tokens_compressed": tokens_compressed,
            "latency_ms": latency_ms,
            "tools_used": tools_used or [],
            "fallback_used": fallback_used,
            "error": error,
            "timestamp": now.isoformat(),
        })

    async def record_metric(
        self,
        metric_type: str,
        metric_name: str,
        value: float,
        tags: dict[str, Any] | None = None,
    ) -> None:
        """Record an aggregated metric."""
        now = datetime.now(tz=timezone.utc)
        if self._session_factory:
            try:
                from app.db.models import AiObservabilityMetrics
                async with self._session_factory() as session:
                    metric = AiObservabilityMetrics(
                        id=str(uuid4()),
                        metric_type=metric_type,
                        metric_name=metric_name,
                        value=value,
                        tags=tags or {},
                        recorded_at=now,
                    )
                    session.add(metric)
                    await session.commit()
            except Exception as exc:
                logger.warning("Failed to record metric: %s", exc)

    def get_dashboard_stats(self) -> dict[str, Any]:
        """Get aggregated stats for the AI infrastructure dashboard."""
        metrics = self._in_memory_metrics

        if not metrics:
            return self._empty_stats()

        total = len(metrics)
        successes = sum(1 for m in metrics if not m.get("error"))
        failures = total - successes
        fallbacks = sum(1 for m in metrics if m.get("fallback_used"))

        latencies = [m.get("latency_ms", 0) for m in metrics]
        tokens_in = [m.get("tokens_input", 0) for m in metrics]
        tokens_out = [m.get("tokens_output", 0) for m in metrics]
        tokens_comp = [m.get("tokens_compressed", 0) for m in metrics]

        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0

        total_tokens_in = sum(tokens_in)
        total_tokens_comp = sum(tokens_comp)
        total_tokens_out = sum(tokens_out)

        agent_counts: dict[str, int] = {}
        for m in metrics:
            agent = m.get("agent", "unknown")
            agent_counts[agent] = agent_counts.get(agent, 0) + 1

        all_tools: list[str] = []
        for m in metrics:
            all_tools.extend(m.get("tools_used", []))
        tool_counts: dict[str, int] = {}
        for t in all_tools:
            tool_counts[t] = tool_counts.get(t, 0) + 1

        model_counts: dict[str, int] = {}
        for m in metrics:
            model = m.get("model", "unknown")
            model_counts[model] = model_counts.get(model, 0) + 1

        return {
            "context": {
                "total_requests": total,
                "original_tokens": total_tokens_in,
                "compressed_tokens": total_tokens_comp,
                "output_tokens": total_tokens_out,
                "compression_percent": (
                    round((1 - total_tokens_comp / total_tokens_in) * 100, 1)
                    if total_tokens_in > 0 else 0
                ),
            },
            "retrieval": {
                "total_requests": total,
                "queries": total,
                "documents_retrieved": 0,
                "documents_reranked": 0,
                "top_relevance": 0.0,
            },
            "inference": {
                "model_breakdown": model_counts,
                "avg_latency_ms": round(avg_latency, 2),
                "p95_latency_ms": round(p95_latency, 2),
                "success_rate": round(successes / total * 100, 1) if total else 0,
                "fallback_rate": round(fallbacks / total * 100, 1) if total else 0,
            },
            "agents": {
                "total_calls": total,
                "agent_breakdown": agent_counts,
                "tool_calls": len(all_tools),
                "tool_breakdown": tool_counts,
                "failed_calls": failures,
                "human_escalations": sum(1 for m in metrics if m.get("approval_required")),
            },
        }

    def _empty_stats(self) -> dict[str, Any]:
        return {
            "context": {"total_requests": 0, "original_tokens": 0, "compressed_tokens": 0, "output_tokens": 0, "compression_percent": 0},
            "retrieval": {"total_requests": 0, "queries": 0, "documents_retrieved": 0, "documents_reranked": 0, "top_relevance": 0.0},
            "inference": {"model_breakdown": {}, "avg_latency_ms": 0, "p95_latency_ms": 0, "success_rate": 100, "fallback_rate": 0},
            "agents": {"total_calls": 0, "agent_breakdown": {}, "tool_calls": 0, "tool_breakdown": {}, "failed_calls": 0, "human_escalations": 0},
        }
