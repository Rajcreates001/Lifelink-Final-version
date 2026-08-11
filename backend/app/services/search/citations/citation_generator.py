"""Generate source citations for search results with trust scores."""

from app.services.search.citations.trust_registry import get_trust_info
from app.services.search.schemas import Citation, SearchResultItem


class CitationGenerator:
    """Generate structured citations from search results."""

    def generate(self, results: list[SearchResultItem]) -> list[Citation]:
        citations = []
        seen = set()
        for item in results:
            key = item.source_name or item.source_type
            if key in seen:
                continue
            seen.add(key)
            trust = get_trust_info(key)
            citations.append(Citation(
                source_key=key,
                source_label=trust.get("label", key),
                title=item.title[:100],
                url=item.source_url,
                organization=trust.get("label", key),
                trust_score=trust.get("score", 0.5),
                snippet=item.summary[:180],
                category=trust.get("category", "external"),
                verified=trust.get("verified", False),
            ))
        return citations
