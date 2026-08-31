"""
LifeLink — User History Search Adapter
========================================
Searches the user's past search history and activity for relevant context.
"""

from __future__ import annotations

import logging

from app.db.mongo import get_db
from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.user_history")


class UserHistoryAdapter:
    """Search user's past search queries, clicked results, and activity."""

    async def search(self, query: str, user_id: str) -> list[SearchResultItem]:
        """Search user's search history."""
        if not user_id:
            return []

        try:
            db = get_db()
            if db is None:
                return []
            collection = db.get_collection("search_history")
            if collection is None:
                return []

            query.lower()
            regex = {"$regex": query, "$options": "i"}
            docs = await collection.find(
                {"user_id": user_id, "$or": [{"query": regex}, {"result_summary": regex}]}
            ).sort("timestamp", -1).limit(5).to_list(length=5)

            results = []
            for d in docs:
                results.append(SearchResultItem(
                    id=str(d.get("_id", "")),
                    title=f"Past search: {d.get('query', '')}",
                    category="history",
                    summary=d.get("result_summary", "")[:150],
                    content_snippet=f"Mode: {d.get('mode', 'quick')} · {d.get('sources_count', 0)} sources",
                    source_type="user_history",
                    source_name="User Search History",
                    trust_score=0.70,
                    timestamp=str(d.get("timestamp", "")),
                    metadata=dict(d),
                ))
            return results

        except Exception as e:
            logger.warning("User history search error: %s", e)
            return []
