"""
LifeLink — Multi-Agent Intelligence System
============================================
Specialized AI agents for clinical and operational reasoning, coordinated
by a central Coordinator that produces transparent, weighted outputs.

Architecture:
                              ┌─────────────┐
                              │  Incoming    │
                              │  Request     │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │  Router     │
                              │ (intent)    │
                              └──┬───┬───┬──┘
                                 │   │   │
              ┌──────────────────┘   │   └──────────────────┐
              ▼                      ▼                      ▼
     ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
     │  Clinical      │   │  Emergency        │   │  Donation        │
     │  Agent         │   │  Agent            │   │  Agent           │
     └───────┬────────┘   └────────┬─────────┘   └────────┬─────────┘
             │                     │                       │
     ┌───────▼─────────────────────▼───────────────────────▼────────┐
     │                      Coordinator Agent                       │
     │  - Merges agent outputs                                       │
     │  - Computes confidence-weighted score                         │
     │  - Generates unified recommendation                           │
     │  - Produces explainable reasoning                             │
     └──────────────────────────────┬────────────────────────────────┘
                                    ▼
                         ┌──────────────────┐
                         │   Final Output   │
                         │  (enriched dict) │
                         └──────────────────┘

Agents:
  - Clinical Agent: reviews symptoms, vitals, history → risk assessment
  - Emergency Agent: evaluates urgency, severity → triage level
  - Hospital Agent: ranks hospitals by capacity, distance, specialty
  - Donation Agent: finds compatible donors with evidence-based scoring
  - Record Agent: analyzes medical documents, extracts conditions
  - Coordinator Agent: combines all outputs, confidence-weighted
"""

from __future__ import annotations

import logging

from datetime import datetime, timezone

logger = logging.getLogger(__name__)
from typing import Any

from app.services.medical_knowledge import (
    assess_vitals,
    classify_severity,
    compute_risk_score,
    assess_donor_compatibility,
    estimate_confidence,
    validate_age,
    validate_bmi,
    validate_blood_pressure,
    validate_heart_rate,
    validate_health_payload,
)


# ═══════════════════════════════════════════════════════════════════
# SHARED HELPERS
# ═══════════════════════════════════════════════════════════════════


def _haversine_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Compute great-circle distance in km between two GPS points."""
    from math import asin, cos, radians, sin, sqrt

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return 6371 * c


# ═══════════════════════════════════════════════════════════════════
# AGENT OUTPUT TYPES
# ═══════════════════════════════════════════════════════════════════


class AgentResult:
    """Standard wrapper for every agent's output."""

    def __init__(
        self,
        agent_name: str,
        status: str = "completed",
        summary: str = "",
        confidence: float = 0.0,
        data: dict | None = None,
        warnings: list[str] | None = None,
    ):
        self.agent_name = agent_name
        self.status = status  # "completed" | "skipped" | "error" | "no_data"
        self.summary = summary
        self.confidence = confidence
        self.data = data or {}
        self.warnings = warnings or []
        self.generated_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent": self.agent_name,
            "status": self.status,
            "summary": self.summary,
            "confidence": round(self.confidence, 3),
            "data": self.data,
            "warnings": self.warnings[:4],
            "generatedAt": self.generated_at,
        }


# ═══════════════════════════════════════════════════════════════════
# CLINICAL AGENT
# ═══════════════════════════════════════════════════════════════════


def clinical_agent(
    age: Any = None,
    bmi: Any = None,
    blood_pressure: Any = None,
    heart_rate: Any = None,
    oxygen: Any = None,
    has_condition: bool = False,
    lifestyle: str | None = None,
    symptoms: list[str] | None = None,
) -> AgentResult:
    """
    Clinical Agent — assesses patient vitals and computes risk.

    Uses medical_knowledge.py for evidence-based vital assessment
    and transparent risk scoring with per-factor contributions.
    """
    warnings: list[str] = []

    # Validate inputs
    validated_age = None
    try:
        validated_age = validate_age(age)
    except Exception as e:
        warnings.append(str(e))

    validated_bmi = None
    try:
        validated_bmi = validate_bmi(bmi)
    except Exception as e:
        warnings.append(str(e))

    sys_bp, dia_bp = None, None
    try:
        sys_bp, dia_bp = validate_blood_pressure(blood_pressure)
    except Exception as e:
        warnings.append(str(e))

    validated_hr = None
    try:
        validated_hr = validate_heart_rate(heart_rate, validated_age)
    except Exception as e:
        warnings.append(str(e))

    # Vital assessment
    vital_result = assess_vitals(
        heart_rate=validated_hr,
        blood_pressure_sys=sys_bp,
        blood_pressure_dia=dia_bp,
        oxygen=oxygen,
        bmi=validated_bmi,
        age=validated_age,
    )

    # Risk scoring
    risk_result = compute_risk_score(
        age=validated_age,
        bmi=validated_bmi,
        blood_pressure_sys=sys_bp,
        heart_rate=validated_hr,
        has_condition=has_condition,
        lifestyle=lifestyle,
        symptoms=symptoms,
    )

    # Confidence based on data completeness + vital assessment
    has_age = validated_age is not None
    has_bmi = validated_bmi is not None
    has_bp = sys_bp is not None
    has_hr = validated_hr is not None

    provided = {
        "age": has_age,
        "bmi": has_bmi,
        "blood_pressure": has_bp,
        "heart_rate": has_hr,
        "oxygen": oxygen is not None,
    }
    conf = estimate_confidence(
        provided_inputs=provided,
        critical_inputs=["age", "blood_pressure", "heart_rate"],
        model_confidence=0.82,
    )

    # Build summary
    risk_level = risk_result.get("risk_level", "insufficient_data")
    risk_score = risk_result.get("risk_score")
    summary_parts = []

    if risk_score is not None:
        summary_parts.append(f"Clinical risk: {risk_level} ({risk_score}/100).")
    else:
        summary_parts.append("Insufficient clinical data for risk scoring.")

    vital_overall = vital_result.get("overall_status", "insufficient_data")
    if vital_overall == "critical":
        summary_parts.append("Vitals assessment: critical findings detected.")
    elif vital_overall == "abnormal":
        summary_parts.append("Vitals assessment: some abnormal values.")
    elif vital_overall == "normal":
        summary_parts.append("Vitals assessment: all within normal range.")

    drivers = risk_result.get("drivers", [])
    if drivers:
        top = sorted(
            [d for d in drivers if isinstance(d, dict) and d.get("contribution", 0) > 0],
            key=lambda x: x["contribution"],
            reverse=True,
        )[:3]
        if top:
            summary_parts.append(
                f"Key factors: {', '.join(d['factor'] for d in top)}."
            )

    return AgentResult(
        agent_name="clinical",
        status="completed" if risk_score is not None else "no_data",
        summary=" ".join(summary_parts),
        confidence=conf["overall"],
        data={
            "risk_level": risk_level,
            "risk_score": risk_score,
            "vital_status": vital_overall,
            "abnormal_count": vital_result.get("abnormal_count", 0),
            "critical_count": vital_result.get("critical_count", 0),
            "drivers": drivers,
            "missing_data": risk_result.get("missing_data", []),
            "assessment": vital_result.get("assessments", {}),
        },
        warnings=warnings + conf.warnings,
    )


# ═══════════════════════════════════════════════════════════════════
# EMERGENCY AGENT
# ═══════════════════════════════════════════════════════════════════


def emergency_agent(
    message: str | None = None,
    heart_rate: Any = None,
    blood_pressure: Any = None,
    oxygen: Any = None,
    age: Any = None,
    glasgow_coma: Any = None,
) -> AgentResult:
    """
    Emergency Agent — evaluates severity and recommends triage response.

    Uses medical_knowledge.py classify_severity for evidence-based
    triage with matched criteria and confidence.
    """
    if not message and not any([heart_rate, blood_pressure, oxygen, age]):
        return AgentResult(
            agent_name="emergency",
            status="no_data",
            summary="No emergency indicators provided.",
            confidence=0.1,
            data={"severity_level": "unknown", "recommendation": "Insufficient information."},
        )

    sys_bp = None
    try:
        sys_bp, _ = validate_blood_pressure(blood_pressure) if blood_pressure else (None, None)
    except Exception:
        logger.debug("Suppressed Exception in %s", __name__)

    validated_hr = None
    try:
        validated_hr = validate_heart_rate(heart_rate)
    except Exception:
        logger.debug("Suppressed Exception in %s", __name__)

    severity_result = classify_severity(
        message=message,
        heart_rate=validated_hr,
        blood_pressure_sys=sys_bp,
        oxygen=oxygen,
        age=age,
        glasgow_coma=glasgow_coma,
    )

    level = severity_result.get("severity_level", "Low")
    score = severity_result.get("severity_score", 30)
    criteria = severity_result.get("criteria", [])
    recommendation = severity_result.get("recommendation", "")
    sev_conf = severity_result.get("confidence", {})

    summary_parts = [f"Triage: {level} severity ({score}/100)."]
    if criteria:
        matched = [c.get("detail", "") for c in criteria[:3]]
        summary_parts.append(f"Matched criteria: {'; '.join(matched)}.")
    if recommendation:
        summary_parts.append(recommendation[:200])

    return AgentResult(
        agent_name="emergency",
        status="completed",
        summary=" ".join(summary_parts),
        confidence=sev_conf.get("overall", 0.74),
        data={
            "severity_level": level,
            "severity_score": score,
            "criteria": criteria,
            "recommendation": recommendation,
            "matched_critical_count": sum(1 for c in criteria if c.get("level") == "Critical"),
            "matched_high_count": sum(1 for c in criteria if c.get("level") == "High"),
        },
    )


# ═══════════════════════════════════════════════════════════════════
# HOSPITAL AGENT
# ═══════════════════════════════════════════════════════════════════


def hospital_agent(
    hospitals: list[dict] | None = None,
    patient_lat: float | None = None,
    patient_lng: float | None = None,
    required_specialty: str | None = None,
    severity: str | None = None,
) -> AgentResult:
    """
    Hospital Agent — ranks hospitals by distance, capacity, specialty,
    and emergency suitability.

    Uses evidence-based weighting:
      - Distance (35%)
      - Bed availability / capacity (25%)
      - Specialty match (25%)
      - Emergency load / current strain (15%)
    """
    if not hospitals:
        return AgentResult(
            agent_name="hospital",
            status="no_data",
            summary="No hospital data available for ranking.",
            confidence=0.0,
            data={"ranked": [], "recommendation": None},
        )

    radius_km = {"Low": 100, "Medium": 80, "High": 70, "Critical": 60}.get(severity or "Medium", 80)
    scored: list[dict[str, Any]] = []
    warnings: list[str] = []

    for doc in hospitals:
        name = doc.get("name") or doc.get("hospital_name") or "Unknown"
        location = doc.get("location") or {}
        lat = doc.get("lat") or location.get("lat")
        lng = doc.get("lng") or location.get("lng")

        if patient_lat is not None and patient_lng is not None and lat and lng:
            try:
                distance_km = _haversine_km(
                    patient_lat, patient_lng, float(lat), float(lng)
                )
            except (TypeError, ValueError):
                distance_km = 999.0
        else:
            distance_km = None

        if distance_km is not None and distance_km > radius_km:
            continue

        #  Distance score (35%)
        if distance_km is not None:
            dist_score = max(0, 1 - (distance_km / radius_km)) * 35
        else:
            dist_score = 17.5  # Default midpoint

        #  Bed capacity (25%)
        beds = doc.get("beds") or {}
        total_beds = int(beds.get("totalBeds") or 0)
        occupied = int(beds.get("occupiedBeds") or 0)
        available_beds = total_beds - occupied

        bed_factor = (
            min(1.0, available_beds / max(1, total_beds * 0.3))
            if total_beds > 0
            else 0.5
        )
        capacity_score = bed_factor * 25

        #  Specialty match (25%)
        specialties = doc.get("specialties") or doc.get("departments") or []
        if isinstance(specialties, list) and required_specialty:
            match = any(
                required_specialty.lower() in s.lower() for s in specialties
            )
            specialty_score = 25 if match else 8
        else:
            specialty_score = 12.5  # Default midpoint

        #  Emergency load / rating (15%)
        rating = float(doc.get("rating") or 4.0)
        rating_score = (rating / 5.0) * 15

        total_score = dist_score + capacity_score + specialty_score + rating_score

        scored.append({
            "name": name,
            "distance_km": round(distance_km, 2) if distance_km is not None else None,
            "available_beds": available_beds,
            "total_beds": total_beds,
            "rating": round(rating, 1),
            "score": round(total_score, 1),
            "breakdown": {
                "distance": round(dist_score, 1),
                "capacity": round(capacity_score, 1),
                "specialty": round(specialty_score, 1),
                "rating": round(rating_score, 1),
            },
        })

    if not scored:
        return AgentResult(
            agent_name="hospital",
            status="no_data",
            summary=f"No hospitals found within {radius_km} km radius.",
            confidence=0.3,
            data={"ranked": [], "recommendation": None},
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    best = scored[0]
    recommendation = (
        f"Best match: {best['name']} ({best['distance_km']} km, "
        f"score {best['score']}/100, {best['available_beds']} beds available)."
    )

    return AgentResult(
        agent_name="hospital",
        status="completed",
        summary=recommendation,
        confidence=0.75,
        data={
            "ranked": scored[:10],
            "recommendation": {"name": best["name"], "distance_km": best["distance_km"], "score": best["score"]},
            "total_evaluated": len(scored),
            "radius_km": radius_km,
        },
        warnings=warnings,
    )


# ═══════════════════════════════════════════════════════════════════
# DONATION AGENT
# ═══════════════════════════════════════════════════════════════════


def donation_agent(
    recipient_blood: str | None = None,
    donor_pool: list[dict] | None = None,
    recipient_age: int | None = None,
    patient_lat: float | None = None,
    patient_lng: float | None = None,
) -> AgentResult:
    """
    Donation Agent — finds and ranks compatible donors.

    Uses medical_knowledge.py assess_donor_compatibility for
    evidence-based blood compatibility scoring.
    """
    if not donor_pool:
        return AgentResult(
            agent_name="donation",
            status="no_data",
            summary="No donor pool provided for matching.",
            confidence=0.0,
            data={"matched": [], "recommendation": None},
        )

    scored: list[dict[str, Any]] = []
    warnings: list[str] = []

    for donor in donor_pool:
        profile = donor.get("donorProfile") or donor.get("publicProfile", {}).get("donorProfile") or {}
        health = donor.get("healthRecords") or donor.get("publicProfile", {}).get("healthRecords") or {}

        donor_blood = profile.get("bloodGroup") or health.get("bloodGroup")
        donor_age = profile.get("age") or health.get("age")
        donor_available = profile.get("availability", "Available") != "Unavailable"

        # Estimate distance
        donor_location = donor.get("location") or health.get("location") or {}
        d_lat = donor.get("lat") or donor_location.get("lat")
        d_lng = donor.get("lng") or donor_location.get("lng")
        distance_km = None
        if patient_lat is not None and patient_lng is not None and d_lat and d_lng:
            try:
                distance_km = round(
                    _haversine_km(patient_lat, patient_lng, float(d_lat), float(d_lng)), 2
                )
            except (TypeError, ValueError):
                logger.debug("Suppressed (TypeError, ValueError) in %s", __name__)

        # Assess compatibility using medical knowledge layer
        compat = assess_donor_compatibility(
            recipient_blood=recipient_blood,
            donor_blood=donor_blood,
            recipient_age=recipient_age,
            donor_age=donor_age,
            distance_km=distance_km,
            donor_available=donor_available,
        )

        compat_score = compat.get("compatibility_score", 0)
        factors = compat.get("factors", [])

        if compat_score >= 30:  # Only include potentially viable matches
            scored.append({
                "name": donor.get("name") or "Unknown",
                "blood_group": donor_blood or "Unknown",
                "distance_km": distance_km,
                "compatibility_score": compat_score,
                "compatible": compat.get("compatible"),
                "available": donor_available,
                "factors": factors,
                "recommendation": compat.get("recommendation", ""),
            })

    if not scored:
        return AgentResult(
            agent_name="donation",
            status="completed",
            summary="No compatible donors found in the available pool.",
            confidence=0.6,
            data={"matched": [], "recommendation": None},
            warnings=warnings,
        )

    scored.sort(key=lambda x: x["compatibility_score"], reverse=True)
    best = scored[0]
    recommendation_parts = [
        f"Best match: {best.get('name', 'Donor')} "
        f"(compatibility {best['compatibility_score']}/100, "
        f"{best.get('blood_group', 'Unknown')})"
    ]
    if best.get("distance_km") is not None:
        recommendation_parts.append(f"~{best['distance_km']} km away")
    recommendation_parts.append(best.get("recommendation", ""))

    return AgentResult(
        agent_name="donation",
        status="completed",
        summary=" — ".join(recommendation_parts),
        confidence=0.78,
        data={
            "matched": scored[:10],
            "recommendation": {
                "name": best.get("name"),
                "compatibility_score": best["compatibility_score"],
                "blood_group": best.get("blood_group"),
                "distance_km": best.get("distance_km"),
            },
            "total_evaluated": len(donor_pool),
        },
        warnings=warnings,
    )


# ═══════════════════════════════════════════════════════════════════
# RECORD AGENT
# ═══════════════════════════════════════════════════════════════════


def record_agent(
    report_text: str | None = None,
    extracted_metrics: dict | None = None,
) -> AgentResult:
    """
    Record Agent — analyzes medical documents for conditions,
    metrics, and clinical findings.

    Uses medical_knowledge.py validate_health_payload for
    evidence-based extraction validation.
    """
    if not report_text and not extracted_metrics:
        return AgentResult(
            agent_name="record",
            status="no_data",
            summary="No medical record content provided.",
            confidence=0.0,
            data={"conditions": [], "metrics": {}, "summary": ""},
        )

    warnings: list[str] = []
    conditions: list[str] = []
    metrics = dict(extracted_metrics or {})

    # Extract conditions from text
    if report_text:
        lowered = report_text.lower()
        condition_patterns = {
            "Hypertension": ["hypertension", "high blood pressure", "bp elevated"],
            "Diabetes": ["diabetes", "type 1 diabetes", "type 2 diabetes", "elevated glucose", "hyperglycemia"],
            "Cardiovascular Disease": ["heart disease", "coronary artery", "myocardial infarction", "heart failure", "cad"],
            "Chronic Kidney Disease": ["kidney disease", "renal failure", "ckd", "chronic kidney"],
            "Stroke": ["stroke", "cerebrovascular", "cva", "transient ischemic"],
            "Anemia": ["anemia", "low hemoglobin", "low hb"],
            "Respiratory Disease": ["asthma", "copd", "chronic bronchitis", "pulmonary"],
            "Liver Disease": ["liver disease", "hepatitis", "cirrhosis", "fatty liver"],
            "Cancer": ["cancer", "carcinoma", "malignancy", "tumor", "neoplasm"],
            "Infection": ["infection", "sepsis", "pneumonia", "uti"],
            "Thyroid Disorder": ["hypothyroidism", "hyperthyroidism", "thyroid"],
        }

        for disease, keywords in condition_patterns.items():
            if any(k in lowered for k in keywords):
                conditions.append(disease)

    # Validate extracted metrics through medical knowledge layer
    if metrics:
        validated = validate_health_payload(metrics)
        val_warnings = validated.get("_warnings", [])
        warnings.extend(val_warnings)
        # Update metrics with validated values
        for key in ["age", "bmi", "heart_rate", "blood_pressure_systolic", "lifestyle"]:
            if key in validated and validated[key] is not None:
                metrics[key] = validated[key]

    # Compute summary
    summary_parts = []
    if conditions:
        summary_parts.append(f"Detected conditions: {', '.join(conditions)}")
    else:
        summary_parts.append("No specific conditions detected in the provided text.")

    metric_details = []
    if metrics.get("age"):
        metric_details.append(f"Age: {metrics['age']}")
    if metrics.get("bmi"):
        metric_details.append(f"BMI: {metrics['bmi']}")
    if metrics.get("heart_rate"):
        metric_details.append(f"HR: {metrics['heart_rate']}")
    if metrics.get("blood_pressure_systolic"):
        metric_details.append(
            f"BP: {metrics['blood_pressure_systolic']}"
            f"{'/' + str(metrics['blood_pressure_diastolic']) if metrics.get('blood_pressure_diastolic') else ''}"
        )
    if metric_details:
        summary_parts.append("Extracted: " + " | ".join(metric_details))

    conf_provided = {
        "report_text": bool(report_text and len(report_text) > 50),
        "conditions": bool(conditions),
        "metrics": bool(metrics),
    }
    conf = estimate_confidence(
        provided_inputs=conf_provided,
        model_confidence=0.80,
        critical_inputs=["report_text"],
    )

    return AgentResult(
        agent_name="record",
        status="completed" if conditions or metric_details else "no_data",
        summary=" ".join(summary_parts),
        confidence=conf["overall"],
        data={
            "conditions": conditions,
            "metrics": metrics,
            "extracted_metrics": metric_details,
            "condition_count": len(conditions),
        },
        warnings=warnings,
    )


# ═══════════════════════════════════════════════════════════════════
# COORDINATOR AGENT
# ═══════════════════════════════════════════════════════════════════


def coordinator_agent(
    request_type: str,
    inputs: dict[str, Any],
    clinical: AgentResult | None = None,
    emergency: AgentResult | None = None,
    hospital: AgentResult | None = None,
    donation: AgentResult | None = None,
    record: AgentResult | None = None,
) -> dict[str, Any]:
    """
    Coordinator Agent — combines all agent outputs into a unified,
    explainable response with confidence-weighted synthesis.

    Key responsibilities:
      1. Assigns weights to each agent based on request type
      2. Computes overall confidence from individual agent confidences
      3. Merges recommendations with evidence traceability
      4. Detects conflicts between agent outputs
      5. Produces human-readable summary with reasoning
    """
    agents = {
        "clinical": clinical,
        "emergency": emergency,
        "hospital": hospital,
        "donation": donation,
        "record": record,
    }

    # ── Agent weights by request type ──
    weight_map = {
        "health_assessment": {
            "clinical": 0.45, "emergency": 0.25, "record": 0.20,
            "hospital": 0.05, "donation": 0.05,
        },
        "emergency": {
            "emergency": 0.50, "clinical": 0.20, "hospital": 0.15,
            "donation": 0.10, "record": 0.05,
        },
        "hospital_search": {
            "hospital": 0.60, "emergency": 0.15, "clinical": 0.10,
            "donation": 0.10, "record": 0.05,
        },
        "donor_match": {
            "donation": 0.55, "emergency": 0.15, "hospital": 0.15,
            "clinical": 0.10, "record": 0.05,
        },
        "record_analysis": {
            "record": 0.50, "clinical": 0.25, "emergency": 0.15,
            "hospital": 0.05, "donation": 0.05,
        },
        "general": {
            "clinical": 0.25, "emergency": 0.25, "hospital": 0.20,
            "donation": 0.15, "record": 0.15,
        },
    }

    weights = weight_map.get(request_type, weight_map["general"])

    # ── Collect completed agents ──
    completed = {}
    summaries = []
    all_warnings: list[str] = []
    risk_signals: dict[str, Any] = {}
    recommendations: list[str] = []

    for name, agent in agents.items():
        if agent is None or agent.status == "skipped":
            continue

        completed[name] = agent
        summaries.append(agent.summary)
        all_warnings.extend(agent.warnings)

        # Collect risk signals
        data = agent.data or {}
        if name == "clinical":
            if data.get("risk_level") in ("High", "Critical"):
                risk_signals["clinical"] = {
                    "level": data["risk_level"],
                    "score": data.get("risk_score"),
                    "confirmation": bool(data.get("drivers")),
                }
            missing = data.get("missing_data", [])
            if missing:
                risk_signals["missing_inputs"] = missing

        elif name == "emergency":
            severity = data.get("severity_level")
            if severity in ("High", "Critical"):
                risk_signals["emergency"] = {
                    "level": severity,
                    "score": data.get("severity_score"),
                    "matched_criteria": data.get("criteria", [])[:3],
                }

        elif name == "hospital":
            recommendation = data.get("recommendation")
            if recommendation:
                recommendations.append(recommendation)

        elif name == "donation":
            best = data.get("recommendation")
            if best:
                recommendations.append(best)

    if not completed:
        return {
            "status": "no_data",
            "summary": "No agents returned usable data.",
            "confidence": 0.0,
            "agent_outputs": {},
            "recommendations": [],
            "risk_signals": {},
            "warnings": all_warnings[:6],
        }

    # ── Compute overall confidence ──
    total_weight = 0.0
    weighted_conf = 0.0
    for name, agent in completed.items():
        w = weights.get(name, 0.15)
        total_weight += w
        weighted_conf += w * agent.confidence

    overall_confidence = round(
        weighted_conf / max(0.01, total_weight), 3
    )

    # ── Detect conflicts ──
    conflicts: list[str] = []

    # Conflict: Clinical says low risk but Emergency says critical
    clin_level = (completed.get("clinical").data or {}).get("risk_level") if completed.get("clinical") else None
    emer_level = (completed.get("emergency").data or {}).get("severity_level") if completed.get("emergency") else None
    if clin_level and emer_level:
        severity_order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
        gap = abs(severity_order.get(clin_level, 0) - severity_order.get(emer_level, 0))
        if gap >= 2:
            conflicts.append(
                f"Clinical assessment ({clin_level}) and emergency triage ({emer_level}) "
                f"differ significantly ({gap} levels). Emergency triage should take precedence "
                f"in acute scenarios."
            )

    # ── Build summary ──
    if conflicts:
        summaries.append(f"Conflict detected: {conflicts[0]}")

    if recommendations:
        summaries.append("Recommendations: " + " | ".join(recommendations[:3]))

    overall_summary = " — ".join(summaries) if summaries else "Multi-agent analysis complete."

    # ── Determine overall status ──
    high_agent_risk = any(
        s.get("level") in ("High", "Critical")
        for name, s in risk_signals.items()
        if isinstance(s, dict) and name in ("clinical", "emergency")
    )
    status = "critical" if high_agent_risk else "completed"

    # ── Build final output ──
    return {
        "status": status,
        "summary": overall_summary,
        "confidence": overall_confidence,
        "request_type": request_type,
        "agent_outputs": {
            name: agent.to_dict() for name, agent in sorted(completed.items())
        },
        "risk_signals": risk_signals,
        "recommendations": recommendations[:5],
        "conflicts": conflicts,
        "warnings": all_warnings[:6],
        "missing_inputs": list(set(
            item for agent in completed.values()
            for item in (agent.data or {}).get("missing_data", [])
        )),
    }


# ═══════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════


def run_multi_agent_analysis(
    request_type: str = "general",
    inputs: dict[str, Any] | None = None,
    hospitals: list[dict] | None = None,
    donor_pool: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Run the complete multi-agent analysis pipeline.

    Args:
        request_type: One of "health_assessment", "emergency", "hospital_search",
                     "donor_match", "record_analysis", "general"
        inputs: Dict with patient data (age, bmi, blood_pressure, heart_rate,
                oxygen, has_condition, lifestyle, symptoms, message, report_text,
                extracted_metrics, patient_lat, patient_lng, required_specialty,
                recipient_blood, recipient_age, glasgow_coma)
        hospitals: List of hospital dicts for Hospital Agent
        donor_pool: List of donor dicts for Donation Agent

    Returns:
        Dict with status, summary, confidence, agent_outputs, risk_signals,
        recommendations, conflicts, warnings, missing_inputs
    """
    inputs = inputs or {}

    # Route to appropriate agents based on request type
    # For performance, skip irrelevant agents

    routing = {
        "health_assessment": ["clinical", "emergency", "record"],
        "emergency": ["emergency", "clinical", "hospital", "donation"],
        "hospital_search": ["hospital", "emergency"],
        "donor_match": ["donation", "hospital"],
        "record_analysis": ["record", "clinical"],
        "general": ["clinical", "emergency", "hospital", "donation", "record"],
    }

    active_agents = routing.get(request_type, routing["general"])

    # ── Run eligible agents ──
    clinical_result = None
    emergency_result = None
    hospital_result = None
    donation_result = None
    record_result = None

    if "clinical" in active_agents:
        clinical_result = clinical_agent(
            age=inputs.get("age"),
            bmi=inputs.get("bmi"),
            blood_pressure=inputs.get("blood_pressure"),
            heart_rate=inputs.get("heart_rate"),
            oxygen=inputs.get("oxygen"),
            has_condition=bool(inputs.get("has_condition")),
            lifestyle=inputs.get("lifestyle") or inputs.get("lifestyle_factor"),
            symptoms=inputs.get("symptoms"),
        )

    if "emergency" in active_agents:
        emergency_result = emergency_agent(
            message=inputs.get("message") or inputs.get("symptoms"),
            heart_rate=inputs.get("heart_rate"),
            blood_pressure=inputs.get("blood_pressure"),
            oxygen=inputs.get("oxygen"),
            age=inputs.get("age"),
            glasgow_coma=inputs.get("glasgow_coma"),
        )

    if "hospital" in active_agents and hospitals:
        hospital_result = hospital_agent(
            hospitals=hospitals,
            patient_lat=inputs.get("patient_lat"),
            patient_lng=inputs.get("patient_lng"),
            required_specialty=inputs.get("required_specialty"),
            severity=(
                emergency_result.data.get("severity_level") if emergency_result and emergency_result.data else None
            ),
        )

    if "donation" in active_agents and donor_pool:
        donation_result = donation_agent(
            recipient_blood=inputs.get("recipient_blood"),
            donor_pool=donor_pool,
            recipient_age=inputs.get("age"),
            patient_lat=inputs.get("patient_lat"),
            patient_lng=inputs.get("patient_lng"),
        )

    if "record" in active_agents:
        record_result = record_agent(
            report_text=inputs.get("report_text"),
            extracted_metrics=inputs.get("extracted_metrics"),
        )

    # ── Coordinator synthesis ──
    return coordinator_agent(
        request_type=request_type,
        inputs=inputs,
        clinical=clinical_result,
        emergency=emergency_result,
        hospital=hospital_result,
        donation=donation_result,
        record=record_result,
    )
