"""
LifeLink — User Profile Search Adapter
========================================
Uses the user's profile (role, blood group, location, conditions)
to find relevant context for personalized search results.
"""

from __future__ import annotations

import logging

from app.db.mongo import get_db
from app.services.collections import USERS
from app.services.repository import MongoRepository
from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.user_profile")


class UserProfileAdapter:
    """Use user profile to provide personalized search context."""

    async def search(self, query: str, user_id: str) -> list[SearchResultItem]:
        """Return user profile context as a search enrichment."""
        if not user_id:
            return []

        try:
            db = get_db()
            repo = MongoRepository(db, USERS)
            user = await repo.find_one({"_id": user_id})
            if not user:
                return []

            profile = user.get("publicProfile") or {}
            health = profile.get("healthRecords") or {}
            donor = profile.get("donorProfile") or {}

            profile_data = {
                "name": user.get("name", ""),
                "role": user.get("role", ""),
                "blood_group": health.get("bloodGroup"),
                "age": health.get("age"),
                "location": user.get("location"),
                "conditions": health.get("conditions", []),
                "allergies": health.get("allergies", []),
                "is_donor": donor.get("isDonor", False),
                "donor_availability": donor.get("availability"),
            }

            return [SearchResultItem(
                id=f"profile:{user_id}",
                title=f"Your Profile - {profile_data['name']}",
                category="profile",
                summary=f"{profile_data.get('blood_group', 'N/A')} · {profile_data.get('age', 'N/A')} years",
                content_snippet=f"Role: {profile_data['role']} · Conditions: {', '.join(profile_data['conditions'][:3]) if profile_data['conditions'] else 'None'}",
                source_type="user_history",
                source_name="Your Profile",
                trust_score=0.70,
                metadata=profile_data,
            )]
        except Exception as e:
            logger.warning("User profile search error: %s", e)
            return []
