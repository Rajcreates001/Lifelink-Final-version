"""
LifeLink — Search Intent Parser
================================
Converts natural-language user queries into structured SearchIntent
objects with entity extraction, medical synonym expansion, and
mode/hospital/donor specific intent classification.

Uses a rule-based approach first, then falls back to LLM for
ambiguous or complex queries.
"""

from __future__ import annotations

import re
from typing import Any

from app.services.search.mode_policies import get_mode_policy
from app.services.search.source_registry import (
    get_collections_for_mode,
    get_sources_for_mode,
)

# ─── Medical Synonyms Map ───────────────────────────────────────

MEDICAL_SYNONYMS: dict[str, list[str]] = {
    # Cardiovascular
    "heart attack": ["myocardial infarction", "mi", "cardiac arrest", "coronary"],
    "heart": ["cardiac", "cardiovascular", "cardio"],
    "high blood pressure": ["hypertension", "htn", "elevated bp"],
    "low blood pressure": ["hypotension", "low bp"],
    "chest pain": ["angina", "chest discomfort", "precordial pain"],
    "irregular heartbeat": ["arrhythmia", "palpitations", "dysrhythmia", "afib"],
    "stroke": ["cva", "cerebrovascular accident", "brain attack", "hemiplegia"],
    # Blood / Donor
    "blood sugar": ["glucose", "diabetes", "hba1c", "hyperglycemia"],
    "low blood": ["anemia", "low hemoglobin", "low iron"],
    "blood cancer": ["leukemia", "lymphoma", "hematologic malignancy"],
    "donate blood": ["blood donation", "give blood", "donor"],
    "blood group": ["blood type", "blood group"],
    # Respiratory
    "breathing problem": ["dyspnea", "shortness of breath", "sob", "respiratory distress"],
    "lung disease": ["copd", "pulmonary disease", "emphysema", "chronic bronchitis"],
    "pneumonia": ["lung infection", "chest infection", "bronchopneumonia"],
    # Digestive
    "stomach pain": ["abdominal pain", "gastritis", "dyspepsia", "belly ache"],
    "nausea": ["vomiting", "emesis", "queasy", "sick to stomach"],
    "diarrhea": ["loose stools", "frequent bowel movements", "gastroenteritis"],
    # Neurological
    "headache": ["cephalgia", "migraine", "tension headache"],
    "seizure": ["convulsion", "epileptic fit", "fits"],
    "dizziness": ["vertigo", "lightheaded", "balance problem"],
    # Orthopedic
    "bone pain": ["ostealgia", "fracture pain", "skeletal pain"],
    "back pain": ["lumbago", "sciatica", "spinal pain"],
    "joint pain": ["arthritis", "arthralgia", "joint inflammation"],
    # Infectious
    "fever": ["pyrexia", "high temperature", "hyperthermia", "febrile"],
    "infection": ["sepsis", "bacterial", "viral", "pathogen"],
    # Mental Health
    "depression": ["major depressive disorder", "mdd", "dysthymia", "low mood"],
    "anxiety": ["generalized anxiety", "panic", "nervousness", "gad"],
    # General
    "swelling": ["edema", "inflammation", "fluid retention"],
    "rash": ["dermatitis", "skin eruption", "hives", "urticaria"],
    "weight loss": ["cachexia", "unintentional weight loss", "wasting"],
    "tiredness": ["fatigue", "lethargy", "exhaustion", "malaise"],
    "surgery": ["operation", "surgical procedure", "operation"],
}

# ─── Intent Type Detectors ──────────────────────────────────────

_EMERGENCY_PATTERNS = [
    r"\b(emergency|urgent|critical|severe|sos|help|911|ambulance)\b",
    r"\b(unconscious|bleeding|heart.?attack|stroke|trauma)\b",
    r"\b(life.?threatening|accident|rescue|code.?blue)\b",
]

_DONOR_PATTERNS = [
    r"\b(donor|donation|donate|blood|plasma|platelet|transfusion)\b",
    r"\b(o[\+\-]|a[\+\-]|b[\+\-]|ab[\+\-])\b",
    r"\b(blood.?group|blood.?type|compatible)\b",
]

_HOSPITAL_PATTERNS = [
    r"\b(hospital|clinic|nearby|nearest|er|emergency.?room|trauma.?center)\b",
    r"\b(icu|bed|admit|admission|cardiology|specialist)\b",
]

_GUIDELINE_PATTERNS = [
    r"\b(guideline|protocol|recommendation|standard|best.?practice)\b",
    r"\b(who|cdc|nih|fda)\s+(recommend|guide|say)\b",
]

_CONDITION_PATTERNS = [
    r"\b(symptom|cause|treatment|diagnosis|prognosis|therapy)\b",
    r"\b(condition|disease|disorder|syndrome|infection)\b",
]

_DRUG_PATTERNS = [
    r"\b(drug|medication|medicine|prescription|dosage|side.?effect)\b",
    r"\b(antibiotic|painkiller|vaccine|antiviral|antidepressant)\b",
]


def _expand_synonyms(query: str) -> list[str]:
    """Expand a query with medical synonyms."""
    lowered = query.lower().strip()
    expanded = set()
    # Add original normalized form
    expanded.add(lowered)
    # Add synonyms
    for term, synonyms in MEDICAL_SYNONYMS.items():
        if term in lowered:
            expanded.update(synonyms)
        else:
            for syn in synonyms:
                if syn in lowered:
                    expanded.add(term)
                    break
    return list(expanded)


def _extract_blood_group(text: str) -> str | None:
    """Extract blood group like O+, A-, AB+, etc."""
    match = re.search(r"\b(A|B|AB|O)([\+\-])\b", text, re.IGNORECASE)
    if match:
        return f"{match.group(1).upper()}{match.group(2)}"
    return None


def _extract_age(text: str) -> int | None:
    """Extract age mention from text."""
    for pattern in [
        r"(?:age|aged|years?\s*old|yo)\s*[:\-]?\s*(\d+)",
        r"(\d+)\s*(?:year[s]?\s*old|yo|years)",
    ]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                age = int(match.group(1))
                if 0 < age < 130:
                    return age
            except (ValueError, IndexError):
                pass
    return None


def _extract_location(text: str) -> str | None:
    """Extract location mentions."""
    patterns = [
        r"(?:in|near|at|around|nearby)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"(?:city|area|region|state)\s*(?:of|:)?\s*([A-Z][a-z]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return None


def _detect_urgency(text: str) -> str:
    """Detect urgency level from text."""
    critical = re.search(
        r"\b(emergency|urgent|critical|severe|immediate|911|sos|life.threatening|code)\b",
        text, re.IGNORECASE,
    )
    if critical:
        return "critical"
    high = re.search(
        r"\b(important|serious|acute|quick|fast|asap|now)\b",
        text, re.IGNORECASE,
    )
    if high:
        return "high"
    return "medium"


def _detect_intent_type(text: str) -> str:
    """Classify the top-level intent type."""
    lowered = text.lower()

    donor_score = sum(1 for p in _DONOR_PATTERNS if re.search(p, lowered))
    hospital_score = sum(1 for p in _HOSPITAL_PATTERNS if re.search(p, lowered))
    guideline_score = sum(1 for p in _GUIDELINE_PATTERNS if re.search(p, lowered))
    condition_score = sum(1 for p in _CONDITION_PATTERNS if re.search(p, lowered))
    drug_score = sum(1 for p in _DRUG_PATTERNS if re.search(p, lowered))
    emergency_score = sum(1 for p in _EMERGENCY_PATTERNS if re.search(p, lowered))

    scores = {
        "emergency": emergency_score * 2.0,
        "donor_search": donor_score * 1.8,
        "hospital_lookup": hospital_score * 1.5,
        "guideline_lookup": guideline_score * 1.4,
        "condition_info": condition_score * 1.3,
        "drug_info": drug_score * 1.2,
    }

    # Short queries get clarity bonus
    words = lowered.split()
    if len(words) <= 4:
        top_type = max(scores, key=lambda k: scores[k])
        if scores[top_type] >= 2.0:
            return top_type

    best_type = max(scores, key=lambda k: scores[k])
    if scores[best_type] >= 1.5:
        return best_type

    return "general"


def _select_collections(intent_type: str) -> list[str]:
    """Map intent types to MongoDB collections."""
    mapping = {
        "donor_search": ["users", "donations", "blood_banks"],
        "hospital_lookup": ["hospitals", "hospital_operations", "hospital_beds"],
        "guideline_lookup": ["knowledge_chunks", "reports"],
        "condition_info": ["health_records", "patients", "knowledge_chunks"],
        "drug_info": ["health_records", "knowledge_chunks"],
        "emergency": ["alerts", "hospitals", "ambulances", "users"],
        "general": [
            "hospitals", "users", "alerts", "ambulances",
            "donations", "health_records", "knowledge_chunks",
        ],
    }
    return mapping.get(intent_type, mapping["general"])


def parse_intent(
    query: str,
    mode: str = "quick",
    latitude: float | None = None,
    longitude: float | None = None,
    role: str | None = None,
) -> dict[str, Any]:
    """
    Parse a natural-language query into a structured search intent.

    Args:
        query: The raw user query.
        mode: Search mode (quick, deep, clinical, compare, hospital, donor).
        latitude: Optional user latitude for geo-aware search.
        longitude: Optional user longitude for geo-aware search.
        role: Optional user role for permission-aware search.

    Returns:
        A SearchIntent-compatible dict.
    """
    if not query or not query.strip():
        return {
            "raw_query": query,
            "normalized_query": "",
            "intent_type": "general",
            "entities": [],
            "target_collections": [],
            "target_external_sources": [],
            "filters": {},
            "sort": [],
            "priority": "medium",
            "requires_external": False,
            "requires_medical_validation": False,
            "requires_comparison": False,
            "confidence": 0.0,
            "expanded_terms": [],
        }

    raw = query.strip()
    lowered = raw.lower()

    # Expand medical synonyms
    expanded = _expand_synonyms(raw)
    expanded_query = " ".join(expanded)

    # Detect intent type
    intent_type = _detect_intent_type(raw)

    # Extract entities
    entities: list[dict[str, Any]] = []
    bg = _extract_blood_group(raw)
    if bg:
        entities.append({"type": "blood_group", "value": bg})
    age = _extract_age(raw)
    if age:
        entities.append({"type": "age", "value": age})
    location = _extract_location(raw)
    if location:
        entities.append({"type": "location", "value": location})

    # Add geo if provided
    if latitude is not None and longitude is not None:
        entities.append({
            "type": "geo_coordinates",
            "value": {"lat": latitude, "lng": longitude},
        })

    # Detect medical conditions/symptoms in query
    for term, synonyms in MEDICAL_SYNONYMS.items():
        if term in lowered:
            entities.append({"type": "medical_term", "value": term, "synonyms": synonyms})
            break

    # Detect urgency
    priority = _detect_urgency(raw)

    # Select target collections based on intent + mode
    policy = get_mode_policy(mode)
    if mode in ("quick", "deep", "compare"):
        collections = get_collections_for_mode(mode)
    else:
        collections = _select_collections(intent_type)

    # Select external sources
    external_sources = get_sources_for_mode(mode)

    # Determine mode-specific flags
    requires_medical_validation = policy.get("requires_medical_validation", True)
    requires_comparison = policy.get("requires_comparison", False)
    insufficiency_threshold = policy.get("insufficiency_threshold", 0.30)

    # Compute confidence based on entity extraction quality
    entity_count = len(entities)
    confidence = min(0.95, 0.4 + entity_count * 0.12)

    return {
        "raw_query": raw,
        "normalized_query": expanded_query,
        "intent_type": intent_type,
        "entities": entities,
        "target_collections": collections,
        "target_external_sources": external_sources,
        "filters": {
            "blood_group": bg,
        } if bg else {},
        "sort": [f"{'distance' if any(e['type'] == 'geo_coordinates' for e in entities) else 'relevance'}"],
        "priority": priority,
        "requires_external": True,  # Always allow external fallback
        "requires_medical_validation": requires_medical_validation,
        "requires_comparison": requires_comparison,
        "confidence": round(confidence, 2),
        "expanded_terms": expanded,
    }


def needs_clarification(query: str) -> bool:
    """Check if a query is too short/ambiguous to search meaningfully."""
    if not query or not query.strip():
        return True
    tokens = [t for t in query.strip().split() if t]
    if len(tokens) <= 1:
        return True
    if len(query.strip()) < 5:
        return True
    return False
