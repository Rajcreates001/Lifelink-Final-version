"""Score results by geographic proximity to the user."""

from math import asin, cos, radians, sin, sqrt

from app.services.search.schemas import SearchResultItem


class GeoRanker:
    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        return R * 2 * asin(sqrt(a))

    def score(
        self,
        item: SearchResultItem,
        user_lat: float | None = None,
        user_lon: float | None = None,
    ) -> float:
        if user_lat is None or user_lon is None:
            return 0.5
        meta = item.metadata or {}
        loc = meta.get("location") or {}
        lat = loc.get("lat") or meta.get("lat")
        lon = loc.get("lng") or meta.get("lon")
        if not lat or not lon:
            return 0.5
        try:
            km = self._haversine_km(float(user_lat), float(user_lon), float(lat), float(lon))
            return max(0.1, 1.0 - (km / 100))
        except (ValueError, TypeError):
            return 0.5
