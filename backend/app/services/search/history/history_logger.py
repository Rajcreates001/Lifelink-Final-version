"""Search history logger — persists search queries, results, and feedback."""

from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger("lifelink.search.history")


class HistoryLogger:
    """Log search queries and results to MongoDB for history and personalization."""

    async def log(
        self,
        user_id: str,
        query: str,
        mode: str,
        intent_type: str,
        result_summary: str,
        confidence: float,
        sources_count: int,
        execution_ms: float,
    ) -> None:
        """Persist a search history entry."""
        if not user_id:
            return
        try:
            from app.db.mongo import get_db
            db = get_db()
            if db is None:
                return
            await db.get_collection("search_history").insert_one({
                "user_id": user_id,
                "query": query,
                "mode": mode,
                "intent_type": intent_type,
                "result_summary": result_summary[:500],
                "confidence": confidence,
                "sources_count": sources_count,
                "execution_ms": execution_ms,
                "timestamp": datetime.utcnow().isoformat(),
                "bookmarked": False,
            })
        except Exception as e:
            logger.warning("Failed to log search history: %s", e)
