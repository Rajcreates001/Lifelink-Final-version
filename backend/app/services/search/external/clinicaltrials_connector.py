"""ClinicalTrials.gov API v2 connector."""

from __future__ import annotations

import asyncio
import json
import logging
import urllib.parse
import urllib.request

from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.clinicaltrials")


def _fetch_json(url: str) -> dict:
    """Synchronous HTTP fetch — runs via asyncio.to_thread to not block the event loop."""
    req = urllib.request.Request(url, headers={"User-Agent": "LifeLink/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


class ClinicalTrialsConnector:
    """Search ClinicalTrials.gov via their REST API v2."""

    BASE_URL = "https://clinicaltrials.gov/api/v2"

    async def search(self, query: str, max_results: int = 5) -> list[SearchResultItem]:
        try:
            params = urllib.parse.urlencode({
                "query.term": query,
                "pageSize": min(max_results, 20),
                "format": "json",
                "sort": "@relevance",
            })
            url = f"{self.BASE_URL}/studies?{params}"
            data = await asyncio.to_thread(_fetch_json, url)
            studies = data.get("studies", [])
            results = []
            for study in studies[:max_results]:
                protocol = study.get("protocolSection", {})
                id_module = protocol.get("identificationModule", {})
                status_module = protocol.get("statusModule", {})
                protocol.get("designModule", {})
                desc_module = protocol.get("descriptionModule", {})
                results.append(SearchResultItem(
                    id=f"clinicaltrials:{id_module.get('nctId', '')}",
                    title=id_module.get("briefTitle", "Clinical Study")[:200],
                    category="article",
                    summary=(desc_module.get("briefSummary", "") or "")[:300],
                    content_snippet=(desc_module.get("detailedDescription", "") or "")[:500],
                    source_type="scraped_web",
                    source_name="ClinicalTrials.gov",
                    source_url=f"https://clinicaltrials.gov/study/{id_module.get('nctId', '')}" if id_module.get("nctId") else "",
                    trust_score=0.97,
                    timestamp=status_module.get("startDateStruct", {}).get("date", ""),
                    metadata={"source_key": "clinicaltrials", "nct_id": id_module.get("nctId", "")},
                ))
            return results
        except Exception as e:
            logger.warning("ClinicalTrials.gov search error: %s", e)
            return []
