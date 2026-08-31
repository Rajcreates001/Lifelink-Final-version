"""Validate search results against the medical knowledge layer."""

from __future__ import annotations

import logging
from typing import Any

from app.services.medical_knowledge import (
    validate_blood_group,
)
from app.services.search.schemas import SearchIntent, SearchResultItem

logger = logging.getLogger("lifelink.search.medical_validator")


class MedicalValidator:
    """Validate and enrich search results with medical knowledge."""

    def validate(
        self,
        results: list[SearchResultItem],
        intent: SearchIntent,
        query: str,
    ) -> dict[str, Any]:
        """Validate results, add warnings, and adjust confidence."""
        warnings: list[str] = []

        # Check for blood group validation
        blood_entities = [e for e in intent.entities if e.get("type") == "blood_group"]
        for entity in blood_entities:
            bg = entity.get("value", "")
            try:
                validate_blood_group(bg)
            except Exception:
                warnings.append(f"Blood group '{bg}' may be invalid.")

        # Validate results for safety
        for item in results:
            if item.category == "donation":
                meta = item.metadata or {}
                bg = meta.get("bloodGroup") or ""
                if bg:
                    try:
                        validate_blood_group(bg)
                    except Exception:
                        item.confidence = max(0.1, (item.confidence or 0.5) - 0.2)
                        warnings.append(f"Blood group '{bg}' in result '{item.title[:50]}' needs verification.")

        return {
            "results": results,
            "warnings": warnings[:5],
        }
