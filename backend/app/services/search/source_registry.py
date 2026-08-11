"""
LifeLink — Source Registry for Medical Intelligence
====================================================
Defines which external medical sources are available per search mode,
their access methods (API / Scrapling), URLs, and rate-limit info.
"""

from __future__ import annotations

from typing import Any

# ─── Source Definitions ─────────────────────────────────────────

SOURCE_REGISTRY: dict[str, dict[str, Any]] = {
    "who": {
        "label": "World Health Organization",
        "trust_key": "who",
        "method": "scrapling",
        "url": "https://www.who.int",
        "search_url": "https://www.who.int/search?q={query}",
        "rate_limit_per_sec": 2,
        "timeout_sec": 15,
        "robots_txt_obey": True,
        "max_pages": 5,
        "extract_selector": "article, .sf-content-block, .region-content",
    },
    "cdc": {
        "label": "Centers for Disease Control",
        "trust_key": "cdc",
        "method": "scrapling",
        "url": "https://www.cdc.gov",
        "search_url": "https://www.cdc.gov/search/index.html?q={query}",
        "rate_limit_per_sec": 2,
        "timeout_sec": 15,
        "robots_txt_obey": True,
        "max_pages": 5,
        "extract_selector": "article, .content, main",
    },
    "nih": {
        "label": "National Institutes of Health",
        "trust_key": "nih",
        "method": "scrapling",
        "url": "https://www.nih.gov",
        "search_url": "https://search.nih.gov/search?q={query}",
        "rate_limit_per_sec": 3,
        "timeout_sec": 15,
        "robots_txt_obey": True,
        "max_pages": 3,
        "extract_selector": "article, .content, main",
    },
    "pubmed": {
        "label": "PubMed Central",
        "trust_key": "pubmed",
        "method": "api",
        "api_base_url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
        "search_url": "https://pubmed.ncbi.nlm.nih.gov/?term={query}",
        "rate_limit_per_sec": 3,
        "timeout_sec": 10,
        "max_results": 10,
    },
    "clinicaltrials": {
        "label": "ClinicalTrials.gov",
        "trust_key": "clinicaltrials",
        "method": "api",
        "api_base_url": "https://clinicaltrials.gov/api/v2",
        "search_url": "https://clinicaltrials.gov/search?term={query}",
        "rate_limit_per_sec": 5,
        "timeout_sec": 10,
        "max_results": 10,
    },
    "openfda": {
        "label": "OpenFDA",
        "trust_key": "openfda",
        "method": "api",
        "api_base_url": "https://api.fda.gov",
        "rate_limit_per_sec": 10,
        "timeout_sec": 10,
        "max_results": 10,
    },
    "medlineplus": {
        "label": "MedlinePlus",
        "trust_key": "medlineplus",
        "method": "scrapling",
        "url": "https://medlineplus.gov",
        "search_url": "https://medlineplus.gov/search?query={query}",
        "rate_limit_per_sec": 2,
        "timeout_sec": 12,
        "robots_txt_obey": True,
        "max_pages": 3,
        "extract_selector": "article, .section, .content",
    },
    "nhs": {
        "label": "NHS (UK)",
        "trust_key": "nhs",
        "method": "scrapling",
        "url": "https://www.nhs.uk",
        "search_url": "https://www.nhs.uk/search/?q={query}",
        "rate_limit_per_sec": 2,
        "timeout_sec": 12,
        "robots_txt_obey": True,
        "max_pages": 3,
        "extract_selector": "article, .nhsuk-content, main",
    },
    "mayo_clinic": {
        "label": "Mayo Clinic",
        "trust_key": "mayo_clinic",
        "method": "scrapling",
        "url": "https://www.mayoclinic.org",
        "search_url": "https://www.mayoclinic.org/search/search-results?q={query}",
        "rate_limit_per_sec": 1,
        "timeout_sec": 15,
        "robots_txt_obey": True,
        "max_pages": 3,
        "extract_selector": "article, .content, main",
    },
    "johns_hopkins": {
        "label": "Johns Hopkins Medicine",
        "trust_key": "johns_hopkins",
        "method": "scrapling",
        "url": "https://www.hopkinsmedicine.org",
        "search_url": "https://www.hopkinsmedicine.org/search?q={query}",
        "rate_limit_per_sec": 1,
        "timeout_sec": 15,
        "robots_txt_obey": True,
        "max_pages": 3,
        "extract_selector": "article, .content, main",
    },

    # ── Government / Registry Sources (placeholder for future API integration) ──
    "government_hospital_registry": {
        "label": "Government Hospital Registry",
        "trust_key": "government_hospital_registry",
        "method": "api",
        "api_base_url": None,
        "rate_limit_per_sec": 5,
        "timeout_sec": 10,
        "max_results": 10,
    },
    "government_blood_bank": {
        "label": "Government Blood Bank Portal",
        "trust_key": "government_blood_bank",
        "method": "api",
        "api_base_url": None,
        "rate_limit_per_sec": 5,
        "timeout_sec": 10,
        "max_results": 10,
    },
}

# ─── Mode-to-Source Mapping ─────────────────────────────────────

MODE_SOURCES: dict[str, list[str]] = {
    "quick": [
        "internal_db",
        "user_history",
        "ai_memory",
        "medlineplus",
        "nhs",
        "mayo_clinic",
    ],
    "deep": [
        "internal_db",
        "user_history",
        "ai_memory",
        "who",
        "cdc",
        "nih",
        "pubmed",
        "clinicaltrials",
        "openfda",
        "medlineplus",
        "nhs",
        "mayo_clinic",
        "johns_hopkins",
    ],
    "clinical": [
        "pubmed",
        "nih",
        "who",
        "cdc",
        "clinicaltrials",
        "openfda",
        "medlineplus",
    ],
    "compare": [
        "who",
        "cdc",
        "nih",
        "pubmed",
        "medlineplus",
        "nhs",
        "mayo_clinic",
    ],
    "hospital": [
        "internal_db",
        "government_hospital_registry",
    ],
    "donor": [
        "internal_db",
        "government_blood_bank",
    ],
}

# ─── Default Collections per Mode (Internal DB) ────────────────

MODE_COLLECTIONS: dict[str, list[str]] = {
    "quick": [
        "hospitals", "users", "alerts", "donations", "health_records",
    ],
    "deep": [
        "hospitals", "users", "alerts", "ambulances", "donations",
        "health_records", "knowledge_chunks", "patients", "doctors",
        "blood_banks", "emergency_requests", "notifications",
        "reports", "activities", "uploads",
    ],
    "clinical": [
        "health_records", "patients", "knowledge_chunks",
        "reports",
    ],
    "compare": [
        "hospitals", "health_records", "knowledge_chunks",
    ],
    "hospital": [
        "hospitals", "hospital_operations", "hospital_beds",
        "hospital_resources", "hospital_staff",
    ],
    "donor": [
        "users", "donations", "blood_banks",
    ],
}


def get_sources_for_mode(mode: str) -> list[str]:
    """Return the source keys configured for a given search mode."""
    return MODE_SOURCES.get(mode, MODE_SOURCES["quick"])


def get_collections_for_mode(mode: str) -> list[str]:
    """Return the database collection names configured for a given mode."""
    return MODE_COLLECTIONS.get(mode, MODE_COLLECTIONS["quick"])


def get_source_config(source_key: str) -> dict[str, Any] | None:
    """Return the full configuration for a known source key."""
    if source_key.startswith("internal_"):
        return {
            "label": source_key.replace("_", " ").title(),
            "trust_key": source_key,
            "method": "internal",
        }
    return SOURCE_REGISTRY.get(source_key)


def get_source_registry() -> dict[str, dict[str, Any]]:
    """Return the full source registry dict."""
    return dict(SOURCE_REGISTRY)
