"""Score results by source trustworthiness."""

from app.services.search.schemas import SearchResultItem


class TrustRanker:
    def score(self, item: SearchResultItem) -> float:
        base = float(item.trust_score) if item.trust_score else 0.5
        if item.source_type == "internal_db":
            base = max(base, 0.85)
        elif item.source_type == "rag":
            base = max(base, 0.80)
        elif item.source_type == "scraped_web":
            base = max(base, 0.50)
        return min(1.0, base)
