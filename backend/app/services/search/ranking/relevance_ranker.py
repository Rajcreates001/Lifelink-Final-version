"""
LifeLink — Relevance Ranker
=============================
Scores results by semantic and lexical relevance to the query.
"""

from __future__ import annotations


from app.services.search.schemas import SearchIntent, SearchResultItem


class RelevanceRanker:
    """Score results by how relevant they are to the user's query."""

    def score(self, item: SearchResultItem, query: str, intent: SearchIntent) -> float:
        """Compute a relevance score (0.0–1.0) for a single result."""
        score = 0.3  # base score

        text = (
            (item.title or "") + " "
            + (item.summary or "") + " "
            + (item.content_snippet or "") + " "
            + (item.category or "")
        ).lower()

        query_terms = query.lower().split()
        matched = sum(1 for t in query_terms if t in text)
        if query_terms:
            score += (matched / len(query_terms)) * 0.3

        # Entity matching bonus
        for entity in intent.entities:
            val = entity.get("value")
            if isinstance(val, str) and val.lower() in text:
                score += 0.15
            elif isinstance(val, dict):
                for v in val.values():
                    if isinstance(v, str) and v.lower() in text:
                        score += 0.1
                        break

        # Category matching bonus
        for entity in intent.entities:
            if entity.get("type") == "blood_group" and item.category == "donation":
                score += 0.2
            if entity.get("type") == "medical_term" and item.category in ("health_record", "knowledge"):
                score += 0.15

        # Boost exact title matches
        if query.lower() in (item.title or "").lower():
            score += 0.2

        # Boost items with more content
        if len(item.content_snippet) > 100:
            score += 0.05

        return min(1.0, max(0.0, score))
