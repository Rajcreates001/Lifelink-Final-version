from __future__ import annotations

import json
import logging
import time
from typing import Any

import redis

logger = logging.getLogger(__name__)

# Redis must never stall a request path: every operation is bounded by these
# timeouts and CacheStore degrades to the in-process memory cache on failure.
_REDIS_SOCKET_TIMEOUT_S = 1.0
_REDIS_CONNECT_TIMEOUT_S = 1.0
# If the initial ping fails, how long before the next CacheStore instance
# retries connecting (avoids paying the connect timeout on every request).
_REDIS_RETRY_INTERVAL_S = 30.0

# One shared client per redis_url across all CacheStore instances — the
# namespace only affects key prefixes, so the connection is reusable.
_shared_clients: dict[str, Any] = {}
_last_attempt: dict[str, float] = {}


class CacheStore:
    def __init__(self, redis_url: str, namespace: str) -> None:
        self._namespace = namespace
        self._memory_cache: dict[str, dict[str, Any]] = {}
        self._redis = self._init_redis(redis_url)

    @staticmethod
    def _init_redis(redis_url: str):
        now = time.time()
        if redis_url in _shared_clients:
            client = _shared_clients[redis_url]
            if client is not None:
                return client
            # Previous attempt failed — only retry at a bounded interval so a
            # down Redis costs at most one connect timeout per retry window.
            if now - _last_attempt.get(redis_url, 0.0) < _REDIS_RETRY_INTERVAL_S:
                return None
        try:
            client = redis.Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=_REDIS_SOCKET_TIMEOUT_S,
                socket_connect_timeout=_REDIS_CONNECT_TIMEOUT_S,
            )
            client.ping()
            _shared_clients[redis_url] = client
            return client
        except Exception:
            _shared_clients[redis_url] = None
            _last_attempt[redis_url] = now
            return None

    def _key(self, key: str) -> str:
        return f"{self._namespace}:{key}"

    def get(self, key: str) -> dict[str, Any] | None:
        namespaced = self._key(key)
        if self._redis:
            try:
                cached = self._redis.get(namespaced)
                if cached:
                    return json.loads(cached)
            except Exception:
                logger.debug("Suppressed Exception in %s", __name__)

        entry = self._memory_cache.get(namespaced)
        if not entry:
            return None
        if entry["expires_at"] <= time.time():
            self._memory_cache.pop(namespaced, None)
            return None
        return entry["value"]

    def set(self, key: str, value: dict[str, Any], ttl: int = 300) -> None:
        namespaced = self._key(key)
        if self._redis:
            try:
                self._redis.setex(namespaced, ttl, json.dumps(value))
                return
            except Exception:
                logger.debug("Suppressed Exception in %s", __name__)
        self._memory_cache[namespaced] = {"value": value, "expires_at": time.time() + ttl}
