"""Fuse relevance, trust, and geo scores into a final ranking."""

from app.services.search.ranking.relevance_ranker import RelevanceRanker
from app.services.search.ranking.trust_ranker import TrustRanker
from app.services.search.ranking.geo_ranker import GeoRanker
from app.services.search.schemas import SearchIntent, SearchResultItem

FUSION_WEIGHTS = {"relevance": 0.40, "trust": 0.25, "geo": 0.15, "freshness": 0.10, "content_richness": 0.10}


class FusionRanker:
    """Weights and fuses multiple ranking signals into a single score."""

    def __init__(self, relevance_ranker: RelevanceRanker | None = None, trust_ranker: TrustRanker | None = None):
        self._relevance = relevance_ranker or RelevanceRanker()
        self._trust = trust_ranker or TrustRanker()
        self._geo = GeoRanker()

    def rank(
        self,
        results: list[SearchResultItem],
        query: str,
        intent: SearchIntent,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[SearchResultItem]:
        if not results:
            return results
        for item in results:
            rel = self._relevance.score(item, query, intent)
            tr = self._trust.score(item)
            geo = self._geo.score(item, latitude, longitude)
            freshness = min(0.1, 0.05 if not item.timestamp else 0.08)
            content_richness = min(0.1, len(item.content_snippet or "") / 2000)
            item.relevance_score = round(rel, 3)
            item.confidence = round(
                rel * FUSION_WEIGHTS["relevance"]
                + tr * FUSION_WEIGHTS["trust"]
                + geo * FUSION_WEIGHTS["geo"]
                + freshness * FUSION_WEIGHTS["freshness"]
                + content_richness * FUSION_WEIGHTS["content_richness"],
                3,
            )
        results.sort(key=lambda x: x.confidence, reverse=True)
        return results
