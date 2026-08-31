"""
LifeLink — Scrapling-Powered External Search Service
======================================================
Uses Scrapling to fetch and extract content from trusted medical sources
(WHO, CDC, NIH, NHS, Mayo Clinic, MedlinePlus, etc.) as a fallback
when internal data is insufficient.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.search.citations.trust_registry import get_trust_info
from app.services.search.schemas import SearchResultItem
from app.services.search.source_registry import get_source_config

logger = logging.getLogger("lifelink.search.scrapling")


class ScraplingService:
    """Scrapling-powered external medical source scraper."""

    def __init__(self):
        self._scrapling_available = False
        self._html_cleaner = None
        self._deduper = None
        self._chunker = None

    async def _ensure_deps(self):
        if self._html_cleaner is None:
            from app.services.search.processing.html_cleaner import HtmlCleaner
            from app.services.search.processing.deduper import Deduper
            from app.services.search.processing.chunker import Chunker
            self._html_cleaner = HtmlCleaner()
            self._deduper = Deduper()
            self._chunker = Chunker()

    async def search(
        self,
        query: str,
        sources: list[str] | None = None,
        mode: str = "quick",
    ) -> dict[str, Any]:
        """
        Search external trusted medical sources.
        
        Uses Scrapling for HTML pages, direct API calls for structured sources.
        """
        await self._ensure_deps()

        if not sources:
            return {"results": [], "sources_used": []}

        all_results: list[SearchResultItem] = []
        sources_used: list[str] = []

        for source_key in sources:
            config = get_source_config(source_key)
            if not config:
                continue

            try:
                if config.get("method") == "api":
                    items = await self._fetch_via_api(source_key, query, config)
                elif config.get("method") == "scrapling":
                    items = await self._fetch_via_scrapling(source_key, query, config)
                else:
                    continue

                all_results.extend(items)
                sources_used.append(source_key)
            except Exception as e:
                logger.warning("Failed to fetch %s: %s", source_key, e)

            # Rate limiting: small delay between sources
            await asyncio.sleep(0.5)

        # Deduplicate
        if self._deduper and all_results:
            all_results = self._deduper.deduplicate(all_results)

        return {
            "results": all_results[:20],
            "sources_used": sources_used,
        }

    async def _fetch_via_api(
        self,
        source_key: str,
        query: str,
        config: dict[str, Any],
    ) -> list[SearchResultItem]:
        """Fetch from sources with structured APIs (PubMed, ClinicalTrials, OpenFDA)."""
        if source_key == "pubmed":
            from app.services.search.external.pubmed_connector import PubMedConnector
            connector = PubMedConnector()
            return await connector.search(query, max_results=config.get("max_results", 5))
        elif source_key == "clinicaltrials":
            from app.services.search.external.clinicaltrials_connector import ClinicalTrialsConnector
            connector = ClinicalTrialsConnector()
            return await connector.search(query, max_results=config.get("max_results", 5))
        elif source_key == "openfda":
            from app.services.search.external.openfda_connector import OpenFDAConnector
            connector = OpenFDAConnector()
            return await connector.search(query, max_results=config.get("max_results", 5))
        return []

    async def _fetch_via_scrapling(
        self,
        source_key: str,
        query: str,
        config: dict[str, Any],
    ) -> list[SearchResultItem]:
        """Fetch content from HTML-based sources using Scrapling."""
        trust_info = get_trust_info(source_key)
        results: list[SearchResultItem] = []

        try:
            from scrapling import Fetcher

            fetcher = Fetcher(
                impersonate="chrome",
                follow_redirects=True,
                timeout=config.get("timeout_sec", 15),
            )

            search_url = config.get("search_url", "")
            if not search_url:
                return results

            url = search_url.replace("{query}", query.replace(" ", "+"))
            resp = await asyncio.get_event_loop().run_in_executor(
                None, lambda: fetcher.get(url)
            )

            if not resp or resp.status not in (200, 201):
                logger.warning("Scrapling HTTP %s for %s", resp.status if resp else "None", url)
                return results

            # Extract content using selector
            selector = config.get("extract_selector", "article, main, .content")
            try:
                extracted = resp.css(selector)
            except Exception:
                extracted = []

            seen = set()
            for elem in extracted[:config.get("max_pages", 3)]:
                text = elem.text_content().strip()
                if not text or len(text) < 100:
                    continue

                # Clean HTML
                if self._html_cleaner:
                    text = self._html_cleaner.clean(text)

                # Get title
                title = ""
                try:
                    title_elem = elem.css("h1, h2, h3")
                    title = title_elem[0].text_content().strip()[:100] if title_elem else ""
                except Exception:
                    logger.debug("Suppressed Exception in %s", __name__)

                # Dedup check
                content_hash = hash(text[:200])
                if content_hash in seen:
                    continue
                seen.add(content_hash)

                # Chunk if needed
                if self._chunker and len(text) > 1000:
                    chunks = self._chunker.chunk(text)
                    for ci, chunk in enumerate(chunks[:2]):
                        results.append(SearchResultItem(
                            id=f"{source_key}:{hash(chunk[:100])}",
                            title=f"{title or source_key} (part {ci + 1})" if ci > 0 else (title or source_key),
                            category="article",
                            summary=chunk[:200],
                            content_snippet=chunk[:400],
                            source_type="scraped_web",
                            source_name=config.get("label", source_key),
                            source_url=url,
                            trust_score=trust_info.get("score", 0.5),
                            metadata={"source_key": source_key},
                        ))
                else:
                    results.append(SearchResultItem(
                        id=f"{source_key}:{content_hash}",
                        title=title or source_key,
                        category="article",
                        summary=text[:200],
                        content_snippet=text[:400],
                        source_type="scraped_web",
                        source_name=config.get("label", source_key),
                        source_url=url,
                        trust_score=trust_info.get("score", 0.5),
                        metadata={"source_key": source_key},
                    ))

            return results

        except ImportError:
            logger.warning(
                "Scrapling is not installed. Install with: pip install 'scrapling[all]' && scrapling install"
            )
            return []
        except Exception as e:
            logger.warning("Scrapling error for %s: %s", source_key, e)
            return []
