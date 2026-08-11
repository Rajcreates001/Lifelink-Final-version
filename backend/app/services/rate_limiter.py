"""
LifeLink Rate Limiter
======================
Redis-backed sliding-window rate limiter using the existing CacheStore pattern.
Provides a callable FastAPI dependency for per-IP throttling.

Usage:
    @router.post("/login")
    async def login(
        payload: LoginRequest,
        _: None = Depends(rate_limit("auth:login", max_requests=5, window_seconds=60)),
    ):
        ...
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.services.cache_store import CacheStore

logger = logging.getLogger(__name__)

_DEFAULT_MAX_REQUESTS = 10
_DEFAULT_WINDOW_SECONDS = 60

# Shared cache store — instantiated once on first import
_settings = get_settings()
_cache: CacheStore | None = None


def _get_cache() -> CacheStore:
    global _cache
    if _cache is None:
        _cache = CacheStore(_settings.redis_url, namespace="ratelimit")
    return _cache


@dataclass
class RateLimitResult:
    """Result of a rate-limit check returned to the caller."""
    allowed: bool
    remaining: int
    reset_at: float  # Unix timestamp when the window resets
    retry_after: float  # Seconds until the next allowed request (0 if allowed)


class RateLimiter:
    """
    Sliding-window rate limiter.

    Tracks request counts per (namespace, client_ip) key, expiring after
    *window_seconds*.  Uses Redis via CacheStore when available, otherwise
    falls back to the in-process LRU built into CacheStore.

    Thread-safe for FastAPI's async concurrency because CacheStore operations
    are short-lived synchronous calls dispatched in a thread pool.
    """

    def __init__(
        self,
        namespace: str,
        max_requests: int = _DEFAULT_MAX_REQUESTS,
        window_seconds: int = _DEFAULT_WINDOW_SECONDS,
    ) -> None:
        self.namespace = namespace
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    # ── Public API ──────────────────────────────────────────
    def check(self, client_ip: str) -> RateLimitResult:
        """Check whether *client_ip* is allowed through."""
        cache = _get_cache()
        ip_key = f"{self.namespace}:{client_ip}"

        record = cache.get(ip_key)
        now = time.time()

        if record is None:
            # First request — create window
            reset_at = now + self.window_seconds
            cache.set(ip_key, {"count": 1, "reset_at": reset_at}, ttl=self.window_seconds)
            return RateLimitResult(allowed=True, remaining=self.max_requests - 1, reset_at=reset_at, retry_after=0.0)

        count = record.get("count", 0)
        reset_at = record.get("reset_at", now + self.window_seconds)

        if now >= reset_at:
            # Window expired — reset
            reset_at = now + self.window_seconds
            cache.set(ip_key, {"count": 1, "reset_at": reset_at}, ttl=self.window_seconds)
            return RateLimitResult(allowed=True, remaining=self.max_requests - 1, reset_at=reset_at, retry_after=0.0)

        if count >= self.max_requests:
            # Rate limited
            retry_after = max(0.0, reset_at - now)
            return RateLimitResult(allowed=False, remaining=0, reset_at=reset_at, retry_after=retry_after)

        # Increment count
        count += 1
        remaining_ttl = max(1, int(reset_at - now))
        cache.set(ip_key, {"count": count, "reset_at": reset_at}, ttl=remaining_ttl)
        return RateLimitResult(allowed=True, remaining=self.max_requests - count, reset_at=reset_at, retry_after=0.0)

    # ── FastAPI dependency factory ───────────────────────────
    def dependency(self) -> Any:
        """
        Return a FastAPI dependency callable that extracts the client IP from the
        request and runs the rate-limit check, raising 429 if exceeded.

        Usage in route:
            @router.post("/login")
            async def login(_, _: None = Depends(limiter.dependency())):
                ...
        """
        limiter = self  # capture self in closure

        def _check(request: Request) -> None:
            client_ip = request.client.host if request.client else "unknown"
            result = limiter.check(client_ip)

            if not result.allowed:
                logger.warning("Rate limit hit — %s/%s (IP: %s)", self.namespace, client_ip)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Too many requests",
                        "retry_after_seconds": round(result.retry_after, 1),
                    },
                    headers={
                        "Retry-After": str(int(result.retry_after)),
                        "X-RateLimit-Remaining": str(result.remaining),
                        "X-RateLimit-Reset": str(int(result.reset_at)),
                    },
                )

        return _check


# ── Pre-built rate limiters for auth endpoints ─────────────

# Login: 20 requests per 60 seconds per IP. Enterprise e2e validation logs in
# as many distinct seeded roles (gov admin/officer, state, district, hospital
# departments, ambulance crew/dispatcher) — a 5/min cap throttles legitimate
# multi-role testing while 20/min still stops brute-force spraying.
rate_limit_login = RateLimiter("auth:login", max_requests=20, window_seconds=60)

# Signup: 10 requests per 300 seconds (5 min) per IP — enough headroom for
# multi-role demo onboarding (public + hospital + ambulance + v2) without
# tripping during e2e validation runs.
rate_limit_signup = RateLimiter("auth:signup", max_requests=10, window_seconds=300)

# General auth (select-role, etc): 10 requests per 60 seconds
rate_limit_auth = RateLimiter("auth:general", max_requests=10, window_seconds=60)
