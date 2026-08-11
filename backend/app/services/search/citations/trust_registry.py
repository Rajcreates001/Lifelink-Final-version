"""
LifeLink — Trust Registry for Medical Sources
==============================================
Single source of truth for trust scores assigned to medical
information sources. Used by the ranking engine and citation
generator to weight result quality.
"""

from __future__ import annotations

from typing import Any

TRUST_SCORES: dict[str, dict[str, Any]] = {
    # ── Government & International Health Organizations ──
    "who": {
        "score": 1.00,
        "label": "World Health Organization",
        "verified": True,
        "category": "api",
        "url": "https://www.who.int",
    },
    "cdc": {
        "score": 0.99,
        "label": "Centers for Disease Control and Prevention",
        "verified": True,
        "category": "api",
        "url": "https://www.cdc.gov",
    },
    "nih": {
        "score": 0.98,
        "label": "National Institutes of Health",
        "verified": True,
        "category": "api",
        "url": "https://www.nih.gov",
    },
    "pubmed": {
        "score": 0.98,
        "label": "PubMed Central (National Library of Medicine)",
        "verified": True,
        "category": "api",
        "url": "https://pubmed.ncbi.nlm.nih.gov",
    },
    "clinicaltrials": {
        "score": 0.97,
        "label": "ClinicalTrials.gov",
        "verified": True,
        "category": "api",
        "url": "https://clinicaltrials.gov",
    },
    "openfda": {
        "score": 0.96,
        "label": "OpenFDA",
        "verified": True,
        "category": "api",
        "url": "https://open.fda.gov",
    },
    "medlineplus": {
        "score": 0.95,
        "label": "MedlinePlus (National Library of Medicine)",
        "verified": True,
        "category": "scraped_web",
        "url": "https://medlineplus.gov",
    },
    # ── National Health Services ──
    "nhs": {
        "score": 0.94,
        "label": "National Health Service (UK)",
        "verified": True,
        "category": "scraped_web",
        "url": "https://www.nhs.uk",
    },
    "mayo_clinic": {
        "score": 0.92,
        "label": "Mayo Clinic",
        "verified": True,
        "category": "scraped_web",
        "url": "https://www.mayoclinic.org",
    },
    "johns_hopkins": {
        "score": 0.92,
        "label": "Johns Hopkins Medicine",
        "verified": True,
        "category": "scraped_web",
        "url": "https://www.hopkinsmedicine.org",
    },
    # ── Government Health Registries ──
    "government_hospital_registry": {
        "score": 0.90,
        "label": "Government Hospital Registry",
        "verified": True,
        "category": "api",
        "url": None,
    },
    "government_blood_bank": {
        "score": 0.88,
        "label": "Government Blood Bank Portal",
        "verified": True,
        "category": "api",
        "url": None,
    },
    # ── Internal LifeLink Sources ──
    "internal_db": {
        "score": 0.90,
        "label": "LifeLink Internal Database",
        "verified": True,
        "category": "internal",
        "url": None,
    },
    "user_history": {
        "score": 0.70,
        "label": "User History",
        "verified": False,
        "category": "internal",
        "url": None,
    },
    "ai_memory": {
        "score": 0.65,
        "label": "AI Memory",
        "verified": False,
        "category": "internal",
        "url": None,
    },
    # ── Medical Journals & News ──
    "medical_journal": {
        "score": 0.90,
        "label": "Peer-Reviewed Medical Journal",
        "verified": True,
        "category": "scraped_web",
        "url": None,
    },
    "medical_news": {
        "score": 0.70,
        "label": "Medical News Outlet",
        "verified": False,
        "category": "scraped_web",
        "url": None,
    },
    # ── Fallback ──
    "unknown": {
        "score": 0.40,
        "label": "Unverified Source",
        "verified": False,
        "category": "unknown",
        "url": None,
    },
}


def get_trust_info(source_key: str) -> dict[str, any]:
    """Get trust info for a source key, with fallback to unknown."""
    return TRUST_SCORES.get(source_key, TRUST_SCORES["unknown"])


def get_trust_badge(trust_score: float) -> dict[str, str]:
    """Return CSS-friendly badge info for a trust score."""
    if trust_score >= 0.90:
        return {
            "color": "emerald",
            "label": "Highly Trusted",
            "icon": "✓",
        }
    if trust_score >= 0.70:
        return {
            "color": "amber",
            "label": "Moderately Trusted",
            "icon": "⚠",
        }
    if trust_score >= 0.50:
        return {
            "color": "orange",
            "label": "Low Trust",
            "icon": "⚠",
        }
    return {
        "color": "red",
        "label": "Unverified",
        "icon": "✗",
    }
