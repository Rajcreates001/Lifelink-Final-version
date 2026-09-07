"""Unit tests for the Redis-backed sliding-window rate limiter.

Uses a unique namespace per run so tests are isolated from any running
Redis instance or prior test state (the limiter's CacheStore may hit a
live Redis when one is available).
"""
from __future__ import annotations

import time
import uuid

import pytest

from app.services.rate_limiter import RateLimiter


@pytest.fixture()
def limiter() -> RateLimiter:
    # Unique namespace per test = unique Redis keys = no cross-run state.
    ns = f"test:{uuid.uuid4().hex[:12]}"
    return RateLimiter(ns, max_requests=3, window_seconds=1)


def test_first_request_allowed(limiter: RateLimiter):
    result = limiter.check("1.2.3.4")
    assert result.allowed is True
    assert result.remaining == 2
    assert result.retry_after == 0.0


def test_requests_within_limit_allowed(limiter: RateLimiter):
    assert limiter.check("1.2.3.4").allowed is True
    assert limiter.check("1.2.3.4").allowed is True
    third = limiter.check("1.2.3.4")
    assert third.allowed is True
    assert third.remaining == 0


def test_requests_over_limit_blocked(limiter: RateLimiter):
    for _ in range(3):
        limiter.check("1.2.3.4")
    blocked = limiter.check("1.2.3.4")
    assert blocked.allowed is False
    assert blocked.remaining == 0
    assert blocked.retry_after > 0


def test_different_ips_independent(limiter: RateLimiter):
    for _ in range(3):
        limiter.check("1.2.3.4")
    assert limiter.check("5.6.7.8").allowed is True


def test_window_reset_allows_again(limiter: RateLimiter):
    for _ in range(3):
        limiter.check("1.2.3.4")
    assert limiter.check("1.2.3.4").allowed is False
    # Wait past the 1s window
    time.sleep(1.1)
    assert limiter.check("1.2.3.4").allowed is True


def test_prebuilt_limits_sane():
    from app.services import rate_limiter as rl

    assert rl.rate_limit_login.max_requests >= 5
    assert rl.rate_limit_login.window_seconds <= 300
    assert rl.rate_limit_ml_heavy.max_requests <= 15
    assert rl.rate_limit_alerts.max_requests <= 10
