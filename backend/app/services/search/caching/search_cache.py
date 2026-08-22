"""Search result cache with TTL and stale-while-revalidate."""

from __future__ import annotations

import logging
import time
from typing import Any

from app.services.cache_store import CacheStore

logger = logging.getLogger("lifelink.search.cache")


class SearchCache:
    """Cache search results with TTL and in-memory fallback."""

    def __init__(self):
        self._memory: dict[str, dict[str, Any]] = {}
        self._redis: CacheStore | None = None
        try:
            self._redis = CacheStore(namespace="search")
        except Exception:
            logger.debug("Suppressed Exception in %s", __name__)

    def get(self, key: str) -> dict[str, Any] | None:
        """Get cached result by key."""
        # Try Redis first
        if self._redis:
            try:
                cached = self._redis.get(key)
                if cached:
                    return cached
            except Exception:
                logger.debug("Suppressed Exception in %s", __name__)
        # Fallback to memory
        entry = self._memory.get(key)
        if entry and entry.get("expires_at", 0) > time.time():
            return entry.get("data")
        return None

    def set(self, key: str, data: dict[str, Any], ttl: int = 300) -> None:
        """Cache a result with TTL in seconds."""
        entry = {"data": data, "expires_at": time.time() + ttl, "created_at": time.time()}
        self._memory[key] = entry
        if self._redis:
            try:
                self._redis.set(key, data, ttl=ttl)
            except Exception:
                logger.debug("Suppressed Exception in %s", __name__)

    def invalidate(self, key: str) -> None:
        """Invalidate a cached entry."""
        self._memory.pop(key, None)
