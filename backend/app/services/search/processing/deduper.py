"""Deduplicate search results by content hash and URL."""

from app.services.search.schemas import SearchResultItem


class Deduper:
    """Remove duplicate results based on title similarity and content hash."""

    def deduplicate(self, items: list[SearchResultItem]) -> list[SearchResultItem]:
        seen = set()
        result = []
        for item in items:
            key = item.id or hash(item.title or "") or hash(item.content_snippet[:100])
            if key not in seen:
                seen.add(key)
                result.append(item)
        return result
