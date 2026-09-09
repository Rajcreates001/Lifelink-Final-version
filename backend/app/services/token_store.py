"""Token revocation denylist.

Backed by CacheStore (Redis when reachable, per-process in-memory fallback).
Revoked tokens are stored under their JWT ID (`jti`) with a TTL equal to the
token's remaining lifetime, so the denylist self-cleans and never grows.

Design notes:
- Tokens minted before this feature have no `jti` and can therefore never be
  revoked; they remain valid until natural expiry (backward compatible).
- Denylist lookups fail OPEN (availability over strictness): if Redis is
  unreachable we do not block authentication, we just log. In-memory fallback
  still covers single-instance deployments.
"""
from __future__ import annotations

import logging

from app.core.config import get_settings
from app.services.cache_store import CacheStore

logger = logging.getLogger(__name__)

_cache: CacheStore | None = None


def _get_cache() -> CacheStore:
    global _cache
    if _cache is None:
        _cache = CacheStore(get_settings().redis_url, namespace="tokendenylist")
    return _cache


def revoke_token_jti(jti: str, ttl_seconds: int) -> None:
    """Revoke a token by its jti for the rest of its lifetime."""
    if not jti:
        return
    ttl = max(60, int(ttl_seconds))
    try:
        _get_cache().set(f"revoked:{jti}", {"revoked": True}, ttl=ttl)
        logger.debug("Revoked token jti=%s for %ss", jti[:8], ttl)
    except Exception as exc:  # revocation must never crash the request path
        logger.warning("Failed to persist token revocation for jti=%s: %s", jti[:8], exc)


def is_token_revoked(jti: str) -> bool:
    """Check whether a token jti has been revoked (fail-open on store errors)."""
    if not jti:
        return False
    try:
        return _get_cache().get(f"revoked:{jti}") is not None
    except Exception as exc:
        logger.warning("Denylist lookup failed; failing open for jti=%s: %s", jti[:8], exc)
        return False
