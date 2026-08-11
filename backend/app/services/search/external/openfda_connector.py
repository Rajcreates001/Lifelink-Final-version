"""OpenFDA drug/device/food API connector."""

from __future__ import annotations

import asyncio
import json
import logging
import urllib.parse
import urllib.request

from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.openfda")


def _fetch_json(url: str) -> dict:
    """Synchronous HTTP fetch — runs via asyncio.to_thread to not block the event loop."""
    req = urllib.request.Request(url, headers={"User-Agent": "LifeLink/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


class OpenFDAConnector:
    """Search OpenFDA for drug information, recalls, and adverse events."""

    BASE_URL = "https://api.fda.gov"

    async def search(self, query: str, max_results: int = 5) -> list[SearchResultItem]:
        try:
            params = urllib.parse.urlencode({
                "search": query,
                "limit": min(max_results, 10),
            })
            url = f"{self.BASE_URL}/drug/event.json?{params}"
            data = await asyncio.to_thread(_fetch_json, url)
            results_list = data.get("results", [])
            results = []
            for entry in results_list[:max_results]:
                patient = entry.get("patient", {})
                drug_info = (patient.get("drug") or [{}])[0] if patient.get("drug") else {}
                reaction_info = (patient.get("reaction") or [{}])[0] if patient.get("reaction") else {}
                results.append(SearchResultItem(
                    id=f"openfda:{hash(json.dumps(entry, sort_keys=True))}",
                    title=drug_info.get("medicinalproduct", "Drug Information")[:200],
                    category="article",
                    summary=f"Reaction: {reaction_info.get('reactionoutcome', 'N/A')} - {reaction_info.get('reactionmeddrapt', '')}",
                    content_snippet=f"Drug: {drug_info.get('medicinalproduct', '')}. Manufacturer: {drug_info.get('openfda', {}).get('manufacturer_name', ['N/A'])[0] if drug_info.get('openfda') else 'N/A'}",
                    source_type="scraped_web",
                    source_name="OpenFDA",
                    trust_score=0.96,
                    metadata={"source_key": "openfda"},
                ))
            return results
        except Exception as e:
            logger.warning("OpenFDA search error: %s", e)
            return []
