"""PubMed E-utilities connector for searching medical literature."""

from __future__ import annotations

import asyncio
import json
import logging
import urllib.parse
import urllib.request
from typing import Any

from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.pubmed")


def _fetch_json(url: str) -> dict:
    """Synchronous HTTP fetch — called via asyncio.to_thread to avoid blocking."""
    req = urllib.request.Request(url, headers={"User-Agent": "LifeLink/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def _fetch_text(url: str) -> str:
    """Synchronous HTTP fetch returning raw text."""
    req = urllib.request.Request(url, headers={"User-Agent": "LifeLink/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="ignore")


class PubMedConnector:
    """Search PubMed via NCBI E-utilities API."""

    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    MAX_RETRIES = 2

    async def search(self, query: str, max_results: int = 5) -> list[SearchResultItem]:
        try:
            # Step 1: ESearch - get PMIDs (run in thread to avoid blocking event loop)
            params = urllib.parse.urlencode({
                "db": "pubmed",
                "term": query,
                "retmax": max_results,
                "retmode": "json",
                "sort": "relevance",
            })
            search_url = f"{self.BASE_URL}/esearch.fcgi?{params}"
            search_data = await asyncio.to_thread(_fetch_json, search_url)

            ids = search_data.get("esearchresult", {}).get("idlist", [])
            if not ids:
                return []

            # Step 2: EFetch - get details
            fetch_params = urllib.parse.urlencode({
                "db": "pubmed",
                "id": ",".join(ids),
                "retmode": "xml",
                "rettype": "abstract",
            })
            fetch_url = f"{self.BASE_URL}/efetch.fcgi?{fetch_params}"
            xml_data = await asyncio.to_thread(_fetch_text, fetch_url)

            # Parse XML for titles and abstracts
            results = self._parse_pubmed_xml(xml_data, ids)
            return results[:max_results]

        except Exception as e:
            logger.warning("PubMed search error: %s", e)
            return []

    def _parse_pubmed_xml(self, xml: str, ids: list[str]) -> list[SearchResultItem]:
        """Simple XML parsing for PubMed articles."""
        results = []
        import re

        articles = re.split(r"<\/PubmedArticle>", xml)
        for article in articles:
            if not article.strip():
                continue
            title_match = re.search(r"<ArticleTitle[^>]*>(.*?)</ArticleTitle>", article, re.DOTALL)
            abstract_match = re.search(r"<AbstractText[^>]*>(.*?)</AbstractText>", article, re.DOTALL)
            pmid_match = re.search(r"<PMID[^>]*>(.*?)</PMID>", article)
            journal_match = re.search(r"<Journal>(.*?)</Journal>", article, re.DOTALL)
            year_match = re.search(r"<PubDate[^>]*>(.*?)</PubDate>", article, re.DOTALL)

            if not title_match:
                continue

            title = self._clean_xml(title_match.group(1))
            abstract = self._clean_xml(abstract_match.group(1)) if abstract_match else ""
            pmid = self._clean_xml(pmid_match.group(1)) if pmid_match else ""
            year = ""
            if year_match:
                year_m = re.search(r"(\d{4})", year_match.group(1))
                if year_m:
                    year = year_m.group(1)

            results.append(SearchResultItem(
                id=f"pubmed:{pmid}",
                title=title[:200],
                category="article",
                summary=abstract[:300],
                content_snippet=abstract[:500],
                source_type="scraped_web",
                source_name="PubMed Central (National Library of Medicine)",
                source_url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else "",
                trust_score=0.98,
                timestamp=year,
                metadata={"source_key": "pubmed", "pmid": pmid},
            ))

        return results

    @staticmethod
    def _clean_xml(text: str) -> str:
        import re
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
