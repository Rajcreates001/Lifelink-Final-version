"""
LifeLink — Medical Records Search Adapter
===========================================
Searches user's uploaded medical records and health records.
"""

from __future__ import annotations

import logging

from app.db.database import get_db
from app.services.collections import HEALTH_RECORDS
from app.services.repository import MongoRepository
from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.medical_records")


class MedicalRecordsAdapter:
    """Search a user's medical records and health reports."""

    async def search(self, query: str, user_id: str) -> list[SearchResultItem]:
        if not user_id:
            return []

        try:
            db = get_db()
            repo = MongoRepository(db, HEALTH_RECORDS)
            regex = {"$regex": query, "$options": "i"}
            docs = await repo.find_many(
                {"$or": [
                    {"diagnosis": regex},
                    {"notes": regex},
                    {"primary_category": regex},
                    {"conditions": regex},
                    {"medications": regex},
                    {"doctor_notes": regex},
                ]},
                limit=8,
            )
            results = []
            for d in docs:
                results.append(SearchResultItem(
                    id=str(d.get("_id", "")),
                    title=d.get("primary_category") or d.get("diagnosis", "Medical Record"),
                    category="medical_record",
                    summary=d.get("diagnosis", "")[:150],
                    content_snippet=d.get("notes", "")[:200] or d.get("doctor_notes", "")[:200],
                    source_type="user_history",
                    source_name="Your Medical Records",
                    trust_score=0.75,
                    timestamp=str(d.get("created_at", "") or d.get("timestamp", "")),
                    metadata=dict(d),
                ))
            return results
        except Exception as e:
            logger.warning("Medical records search error: %s", e)
            return []
