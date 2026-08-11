"""
LifeLink — AI Search Summary Service
=====================================
Generates executive summaries, key findings, and recommendations
from search results using the LLM service (Groq/OpenAI).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.llm_service import generate_response
from app.services.search.schemas import SearchIntent, SearchResultItem, SearchSummary, SourceInfo

logger = logging.getLogger("lifelink.search.summary")


class SummaryService:
    """Generate AI-powered executive summaries for search results."""

    async def generate(
        self,
        query: str,
        results: list[SearchResultItem],
        intent: SearchIntent,
        mode: str,
        internal_count: int = 0,
        external_count: int = 0,
        warnings: list[str] | None = None,
        internal_sources_queried: int = 0,
        external_sources_queried: int = 0,
    ) -> SearchSummary | None:
        """Generate a summary using the LLM or a template fallback."""
        if not results:
            answer_trace = (
                f"Searched {internal_sources_queried} internal databases"
                f"{f' and {external_sources_queried} trusted external sources' if external_sources_queried else ''}."
            )
            return SearchSummary(
                executive_summary=f"No specific results found for '{query}'. {answer_trace}",
                confidence=0.3,
                internal_sources_queried=internal_sources_queried,
                external_sources_queried=external_sources_queried,
                answer_trace=answer_trace,
            )

        # Try LLM-generated summary
        try:
            result_text = "\n".join(
                f"- {r.title} ({r.category}, score: {r.confidence}): {r.summary[:100]}"
                for r in results[:8]
            )
            prompt = (
                f"Query: {query}\n\n"
                f"Searched {internal_count + external_count} results.\n"
                f"Internal sources: {internal_count}, External sources: {external_count}\n\n"
                f"Top results:\n{result_text}\n\n"
                f"Generate a concise executive summary (2-3 sentences) covering: what was found, "
                f"key insights, and confidence level. Format: Summary|Findings|Recommendations."
            )

            # Run synchronous LLM call in thread pool to avoid blocking event loop
            response = await asyncio.to_thread(
                generate_response,
                prompt=prompt,
                system_prompt="You are LifeLink's search summarizer. Be concise, factual, and cite evidence.",
            )

            parts = response.split("|")
            summary = SearchSummary(
                executive_summary=parts[0].strip() if parts else response[:300],
                confidence=min(0.85, 0.5 + len(results) * 0.03),
                internal_sources_queried=internal_sources_queried,
                external_sources_queried=external_sources_queried,
                total_items_found=internal_count + external_count,
                answer_trace=(
                    f"Searched {internal_sources_queried} internal databases "
                    f"and {external_sources_queried} trusted external sources."
                ),
            )
            if len(parts) >= 2:
                summary.key_findings = [{"finding": f.strip()} for f in parts[1].split(",")]
            if warnings:
                summary.warnings = warnings[:3]
            return summary

        except Exception as e:
            logger.warning("AI summary generation failed: %s", e)

        # Fallback: template summary
        answer_trace = (
            f"Searched {internal_sources_queried} internal databases"
            f"{f' and {external_sources_queried} trusted external sources' if external_sources_queried else ''}."
        )
        return SearchSummary(
            executive_summary=(
                f"Found {internal_count + external_count} results for '{query}'. "
                f"Top matches include {len(results[:3])} relevant items. {answer_trace}"
            ),
            confidence=min(0.75, 0.4 + len(results) * 0.04),
            internal_sources_queried=internal_sources_queried,
            external_sources_queried=external_sources_queried,
            total_items_found=internal_count + external_count,
            answer_trace=answer_trace,
        )
