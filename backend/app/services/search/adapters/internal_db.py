"""
LifeLink — Internal Database Search Adapter
=============================================
Searches all relevant MongoDB collections with collection-specific
search strategies. Uses regex, text indexes, and domain heuristics.
"""

from __future__ import annotations

import logging

from app.db.database import get_db
from app.services.collections import (
    ALERTS,
    AMBULANCES,
    DONATIONS,
    HEALTH_RECORDS,
    HOSPITALS,
    PATIENTS,
    USERS,
    VECTOR_STORE,
)
from app.services.repository import MongoRepository
from app.services.search.schemas import SearchIntent, SearchResultItem

logger = logging.getLogger("lifelink.search.internal_db")


class InternalDbAdapter:
    """Search across all internal MongoDB collections with domain-specific strategies."""

    COLLECTION_MAP: dict[str, str] = {
        "hospitals": HOSPITALS,
        "users": USERS,
        "alerts": ALERTS,
        "ambulances": AMBULANCES,
        "donations": DONATIONS,
        "health_records": HEALTH_RECORDS,
        "patients": PATIENTS,
        "knowledge_chunks": VECTOR_STORE,
    }

    async def search(
        self,
        query: str,
        intent: SearchIntent,
        user_id: str | None = None,
        role: str | None = None,
    ) -> list[SearchResultItem]:
        """Search across all targeted collections in parallel."""
        collections = intent.target_collections
        if not collections:
            return []

        try:
            db = get_db()
            if db is None:
                logger.warning("Database not available, skipping internal search")
                return []
        except Exception as e:
            logger.warning("Database connection error: %s", e)
            return []

        tasks = []
        for col_name in collections:
            mongo_name = self.COLLECTION_MAP.get(col_name)
            if not mongo_name:
                continue
            task = self._search_collection(db, mongo_name, col_name, query, role)
            tasks.append(task)

        results = []
        if tasks:
            import asyncio
            batched = await asyncio.gather(*tasks, return_exceptions=True)
            for batch in batched:
                if isinstance(batch, list):
                    results.extend(batch)
                elif isinstance(batch, Exception):
                    logger.warning("Collection search error: %s", batch)

        return results

    async def _search_collection(
        self,
        db,
        mongo_name: str,
        col_name: str,
        query: str,
        role: str | None,
    ) -> list[SearchResultItem]:
        try:
            repo = MongoRepository(db, mongo_name)
            query.lower()
            regex = {"$regex": query, "$options": "i"}

            items: list[SearchResultItem] = []

            if col_name == "hospitals":
                docs = await repo.find_many(
                    {"$or": [
                        {"name": regex},
                        {"hospital_name": regex},
                        {"location.city": regex},
                        {"location.state": regex},
                        {"location.address": regex},
                        {"specialties": regex},
                        {"departments": regex},
                    ]},
                    limit=10,
                )
                for doc in docs:
                    loc = doc.get("location") or {}
                    items.append(SearchResultItem(
                        id=str(doc.get("_id", "")),
                        title=doc.get("name") or doc.get("hospital_name") or "Hospital",
                        category="hospital",
                        summary=f"{doc.get('city') or loc.get('city') or ''} - {doc.get('beds_available', 'N/A')} beds available",
                        content_snippet=f"{loc.get('address', '')} {loc.get('city', '')} {loc.get('state', '')}",
                        source_type="internal_db",
                        source_name="LifeLink Hospital Registry",
                        trust_score=0.90,
                        metadata=doc,
                    ))

            elif col_name == "users":
                doc = await repo.find_many(
                    {"$or": [
                        {"name": regex},
                        {"email": regex},
                        {"phone": regex},
                        {"publicProfile.healthRecords.bloodGroup": regex},
                        {"publicProfile.healthRecords.conditions": regex},
                    ]},
                    limit=10,
                )
                for d in doc:
                    profile = d.get("publicProfile") or {}
                    health = profile.get("healthRecords") or {}
                    items.append(SearchResultItem(
                        id=str(d.get("_id", "")),
                        title=d.get("name", "User"),
                        category="user",
                        summary=f"{health.get('bloodGroup', 'N/A')} - {d.get('role', '')}",
                        content_snippet=d.get("email", ""),
                        source_type="internal_db",
                        source_name="LifeLink User Registry",
                        trust_score=0.90,
                        metadata=d,
                    ))

            elif col_name == "alerts":
                docs = await repo.find_many(
                    {"$or": [{"message": regex}, {"location": regex}, {"severity": regex}]},
                    limit=10,
                )
                for d in docs:
                    items.append(SearchResultItem(
                        id=str(d.get("_id", "")),
                        title=d.get("message", "Alert")[:80],
                        category="alert",
                        summary=f"Severity: {d.get('severity', 'N/A')} - {d.get('location', '')}",
                        content_snippet=str(d.get("message", "")),
                        source_type="internal_db",
                        source_name="LifeLink Alert Feed",
                        trust_score=0.85,
                        metadata=d,
                    ))

            elif col_name == "ambulances":
                docs = await repo.find_many(
                    {"$or": [
                        {"ambulanceId": regex},
                        {"registrationNumber": regex},
                        {"driverName": regex},
                        {"status": regex},
                    ]},
                    limit=10,
                )
                for d in docs:
                    items.append(SearchResultItem(
                        id=str(d.get("_id", "")),
                        title=d.get("ambulanceId", "Ambulance") or d.get("registrationNumber", ""),
                        category="ambulance",
                        summary=f"Status: {d.get('status', 'N/A')} - Driver: {d.get('driverName', 'N/A')}",
                        content_snippet=d.get("registrationNumber", ""),
                        source_type="internal_db",
                        source_name="LifeLink Fleet Registry",
                        trust_score=0.85,
                        metadata=d,
                    ))

            elif col_name == "donations":
                docs = await repo.find_many(
                    {"$or": [
                        {"bloodGroup": regex},
                        {"donorName": regex},
                        {"hospitalName": regex},
                        {"status": regex},
                    ]},
                    limit=10,
                )
                for d in docs:
                    items.append(SearchResultItem(
                        id=str(d.get("_id", "")),
                        title=f"Donation - {d.get('bloodGroup', 'N/A')}",
                        category="donation",
                        summary=f"{d.get('donorName', '')} -> {d.get('hospitalName', '')}",
                        content_snippet=d.get("status", ""),
                        source_type="internal_db",
                        source_name="LifeLink Donation Registry",
                        trust_score=0.85,
                        metadata=d,
                    ))

            elif col_name == "health_records":
                docs = await repo.find_many(
                    {"$or": [
                        {"diagnosis": regex},
                        {"notes": regex},
                        {"primary_category": regex},
                        {"conditions": regex},
                        {"medications": regex},
                    ]},
                    limit=10,
                )
                for d in docs:
                    items.append(SearchResultItem(
                        id=str(d.get("_id", "")),
                        title=d.get("primary_category") or d.get("diagnosis", "Health Record"),
                        category="health_record",
                        summary=f"{d.get('diagnosis', '')} - {d.get('patient_name', '')}",
                        content_snippet=d.get("notes", "")[:200],
                        source_type="internal_db",
                        source_name="LifeLink Health Records",
                        trust_score=0.80,
                        metadata=d,
                    ))

            elif col_name == "patients":
                docs = await repo.find_many(
                    {"$or": [
                        {"name": regex},
                        {"publicProfile.healthRecords.conditions": regex},
                        {"publicProfile.healthRecords.bloodGroup": regex},
                    ]},
                    limit=10,
                )
                for d in docs:
                    profile = d.get("publicProfile") or {}
                    health = profile.get("healthRecords") or {}
                    items.append(SearchResultItem(
                        id=str(d.get("_id", "")),
                        title=d.get("name", "Patient"),
                        category="patient",
                        summary=f"{health.get('bloodGroup', 'N/A')} - {health.get('age', '')}",
                        content_snippet=str(health.get("conditions", ""))[:200],
                        source_type="internal_db",
                        source_name="LifeLink Patient Registry",
                        trust_score=0.80,
                        metadata=d,
                    ))

            return items

        except Exception as e:
            logger.error("Error searching %s: %s", col_name, e)
            return []
