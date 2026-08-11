"""
LifeLink — Search Mode Policies
=================================
Defines the behavior configuration for each search mode —
what to search, how long to wait, when to fall back to external sources.
"""

from __future__ import annotations

from typing import Any

MODE_POLICIES: dict[str, dict[str, Any]] = {
    "quick": {
        "label": "Quick Search",
        "description": "Fast AI-powered answers from internal & external sources",
        "execution_type": "sync",
        "max_latency_ms": 5000,
        "requires_ai_summary": True,
        "requires_medical_validation": True,
        "requires_comparison": False,
        "insufficiency_threshold": 0.30,  # confidence below this triggers external
        "external_fallback": True,
        "max_external_sources": 3,
        "max_results": 20,
        "include_progress_detail": False,
        "cache_ttl_seconds": 300,
    },
    "deep": {
        "label": "Deep Research",
        "description": "Comprehensive multi-source research with evidence ranking",
        "execution_type": "async",
        "max_latency_ms": 30000,
        "requires_ai_summary": True,
        "requires_medical_validation": True,
        "requires_comparison": False,
        "insufficiency_threshold": 0.50,
        "external_fallback": True,
        "max_external_sources": 10,
        "max_results": 40,
        "include_progress_detail": True,
        "cache_ttl_seconds": 600,
    },
    "clinical": {
        "label": "Clinical Review",
        "description": "Evidence-based clinical information with source verification",
        "execution_type": "async",
        "max_latency_ms": 25000,
        "requires_ai_summary": True,
        "requires_medical_validation": True,
        "requires_comparison": False,
        "insufficiency_threshold": 0.40,
        "external_fallback": True,
        "max_external_sources": 8,
        "max_results": 30,
        "include_progress_detail": True,
        "cache_ttl_seconds": 3600,
    },
    "compare": {
        "label": "Compare Sources",
        "description": "Side-by-side comparison of information from multiple sources",
        "execution_type": "async",
        "max_latency_ms": 25000,
        "requires_ai_summary": True,
        "requires_medical_validation": True,
        "requires_comparison": True,
        "insufficiency_threshold": 0.30,
        "external_fallback": True,
        "max_external_sources": 6,
        "max_results": 30,
        "include_progress_detail": True,
        "cache_ttl_seconds": 1800,
    },
    "hospital": {
        "label": "Hospital Intelligence",
        "description": "Hospital data, capacity, and capability analysis",
        "execution_type": "sync",
        "max_latency_ms": 4000,
        "requires_ai_summary": True,
        "requires_medical_validation": False,
        "requires_comparison": False,
        "insufficiency_threshold": 0.25,
        "external_fallback": True,
        "max_external_sources": 2,
        "max_results": 20,
        "include_progress_detail": False,
        "cache_ttl_seconds": 120,
    },
    "donor": {
        "label": "Donor Intelligence",
        "description": "Blood donor analysis, matching, and availability",
        "execution_type": "sync",
        "max_latency_ms": 4000,
        "requires_ai_summary": True,
        "requires_medical_validation": True,
        "requires_comparison": False,
        "insufficiency_threshold": 0.25,
        "external_fallback": True,
        "max_external_sources": 2,
        "max_results": 20,
        "include_progress_detail": False,
        "cache_ttl_seconds": 60,
    },
}


def get_mode_policy(mode: str) -> dict[str, Any]:
    """Return the policy configuration for a search mode."""
    return MODE_POLICIES.get(mode, MODE_POLICIES["quick"])


def is_async_mode(mode: str) -> bool:
    """Check if a search mode runs asynchronously."""
    policy = get_mode_policy(mode)
    return policy.get("execution_type") == "async"


def get_insufficiency_threshold(mode: str) -> float:
    """Return the confidence threshold below which external fallback triggers."""
    policy = get_mode_policy(mode)
    return policy.get("insufficiency_threshold", 0.30)
