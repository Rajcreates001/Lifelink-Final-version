"""
AI Routes — Donor Compatibility & Forecast
============================================
Endpoints for:
- Donor-recipient compatibility checking
- Donation availability forecasting
- User profile clustering (engagement analysis)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from app.db.database import require_db
from app.services.collections import USERS
from app.services.medical_knowledge import (
    assess_donor_compatibility,
    validate_blood_group,
)
from app.services.repository import MongoRepository
from app.core.auth import get_current_user, AuthContext
from app.services.rate_limiter import rate_limit_ml

from app.routes.ai_shared import as_object_id, ensure_meta, run_prediction

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


# ─── Request Models ─────────────────────────────────────────────

class CompatibilityRequest(BaseModel):
    requester_id: str
    donor_id: str
    organ_type: str | None = "Blood"


class ProfileClusterRequest(BaseModel):
    user_id: str


class DonationForecastRequest(BaseModel):
    user_id: str | None = None
    blood_group: str | None = None


# ─── Profile Cluster ────────────────────────────────────────────

@router.post("/check_profile_cluster")
async def check_profile_cluster(payload: ProfileClusterRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    # IDOR guard: users can only access their own profile cluster
    if payload.user_id != ctx.user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's profile cluster")

    db = require_db()
    user_repo = MongoRepository(db, USERS)

    user = await user_repo.find_one({"_id": as_object_id(payload.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    public_profile = user.get("publicProfile") or {}
    health_records = public_profile.get("healthRecords") or {}

    sos_count = len(user.get("sos_alerts") or []) if isinstance(user.get("sos_alerts"), list) else 0
    if isinstance(user.get("sos_alerts"), dict):
        sos_count = len(user["sos_alerts"])
    donation_count = len(user.get("donation_history") or []) if isinstance(user.get("donation_history"), list) else 0

    emergency_rate = min(15, sos_count + 1)
    avg_response_time = max(5, 25 - donation_count * 2)
    hospital_bed_occupancy = min(100, max(20, 50 + sos_count * 5))

    cluster_payload = {
        "sos_usage": sos_count,
        "donations_made": donation_count,
        "health_logs": min(10, max(1, len(health_records))),
    }
    result = await run_prediction("predict_cluster", cluster_payload)

    cluster_labels = {
        0: "Regular User - Low Activity",
        1: "Active Donor - High Engagement",
        2: "Medical Professional - Specialized",
    }

    cluster = None
    if isinstance(result, dict):
        cluster = result.get("cluster_id")
    if cluster is None:
        total_engagement = donation_count + sos_count
        if total_engagement >= 5:
            cluster = 1
        elif total_engagement >= 2:
            cluster = 2
        else:
            cluster = 0

    engagement_level = (
        "High" if cluster == 1 else
        "Professional" if cluster == 2 else
        "Standard"
    )

    confidence = 0.55 + min(0.30, (donation_count + sos_count) * 0.05)
    reasoning = [
        f"Cluster derived from {donation_count} donations, {sos_count} SOS events, and profile engagement patterns.",
    ]

    meta = ensure_meta(
        result.get("meta") if isinstance(result, dict) else None,
        min(0.85, confidence),
        reasoning,
        [
            {"title": "Data Source", "detail": f"User profile with {donation_count + sos_count} engagement events"},
            {"title": "Model", "detail": "ml/activity_cluster_model.joblib"},
        ]
    )
    return {
        "cluster_id": cluster,
        "cluster_label": cluster_labels.get(cluster, "User Profile"),
        "engagement_level": engagement_level,
        "meta": meta,
    }


# ─── Donation Forecast ──────────────────────────────────────────

@router.post("/predict_donation_forecast")
async def predict_donation_forecast(payload: DonationForecastRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    donation_frequency = 1
    hospital_stock_level = 50

    # IDOR guard: if user_id is provided, it must match the authenticated user
    if payload.user_id and payload.user_id != ctx.user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's donation forecast")
    effective_user_id = payload.user_id or ctx.user_id

    db = require_db()
    if effective_user_id:
        try:
            user_repo = MongoRepository(db, USERS)
            user = await user_repo.find_one({"_id": as_object_id(effective_user_id)})
            if user:
                donation_history = user.get("donation_history") or []
                if isinstance(donation_history, list):
                    donation_frequency = min(12, max(1, len(donation_history)))
                    hospital_stock_level = min(95, max(10, donation_frequency * 15 + 20))
        except Exception:
            logger.debug("Suppressed Exception in %s", __name__)

    blood_group = payload.blood_group or "O+"
    try:
        normalized_bg = validate_blood_group(blood_group)
        blood_group = normalized_bg or "O+"
    except Exception:
        logger.debug("Suppressed Exception in %s", __name__)

    forecast_data = {
        "month": datetime.now(timezone.utc).month,
        "donation_frequency": donation_frequency,
        "hospital_stock_level": hospital_stock_level,
        "region": "General",
        "resource_type": blood_group,
    }

    result = await run_prediction("predict_availability", forecast_data)
    score = result.get("predicted_availability_score") if isinstance(result, dict) else None

    if score is None:
        score = min(95, max(30, donation_frequency * 12 + 20))
    elif isinstance(score, (int, float)) and (score <= 0 or score > 100):
        score = min(95, max(30, donation_frequency * 12 + 20))

    status = "High Availability" if score > 70 else "Moderate" if score > 40 else "Low Availability"

    reasoning = [
        f"Forecast based on donation frequency ({donation_frequency}), blood group ({blood_group}), and current month ({datetime.now(timezone.utc).strftime('%B')}).",
    ]
    if score > 70:
        reasoning.append("Current availability is sufficient for most requests.")
    elif score > 40:
        reasoning.append("Supply may need attention; consider scheduling donations.")
    else:
        reasoning.append("Availability is limited; urgent donations recommended.")

    meta = ensure_meta(
        result.get("meta") if isinstance(result, dict) else None,
        max(0.50, min(0.80, 0.50 + donation_frequency * 0.03)),
        reasoning,
        [
            {"title": "Dataset", "detail": "ml/donor_availability_data.csv"},
            {"title": "Model", "detail": "ml/donor_availability_model.joblib"},
        ]
    )
    return {
        "forecast_days": max(1, int(score // 10) + 1),
        "availability_score": round(score, 1),
        "status": status,
        "meta": meta,
    }


# ─── Compatibility Check ────────────────────────────────────────

@router.post("/check_compatibility")
async def check_compatibility(payload: CompatibilityRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    if not payload.requester_id or not payload.donor_id:
        raise HTTPException(status_code=400, detail="requester_id and donor_id are required")
    # IDOR guard: the requester must be the authenticated user
    if payload.requester_id != ctx.user_id:
        raise HTTPException(status_code=403, detail="You can only check compatibility for yourself as the requester")

    db = require_db()
    user_repo = MongoRepository(db, USERS)

    requester = await user_repo.find_one({"_id": as_object_id(payload.requester_id)})
    donor = await user_repo.find_one({"_id": as_object_id(payload.donor_id)})

    profile_warnings = []
    if not requester:
        profile_warnings.append(f"requester profile {payload.requester_id} not found; using default profile")
    if not donor:
        profile_warnings.append(f"donor profile {payload.donor_id} not found; using default profile")

    requester_hr = ((requester or {}).get("publicProfile") or {}).get("healthRecords") or {}
    donor_profile = ((donor or {}).get("publicProfile") or {}).get("donorProfile") or {}
    donor_hr = ((donor or {}).get("publicProfile") or {}).get("healthRecords") or {}

    recipient_blood = requester_hr.get("bloodGroup") or None
    donor_blood = donor_hr.get("bloodGroup") or None

    compatibility_payload = {
        "receiver_blood_type": recipient_blood or "O+",
        "receiver_age": requester_hr.get("age") or 30,
        "receiver_gender": requester_hr.get("gender") or "Male",
        "donor_blood_type": donor_blood or "O+",
        "donor_age": donor_hr.get("age") or 30,
        "donor_gender": donor_hr.get("gender") or "Male",
        "organ_type": payload.organ_type or "Blood",
        "location_distance": 5,
    }

    availability = donor_profile.get("availability") or "Available"
    donor_available = availability != "Unavailable"

    ml_score = None
    ml_result = None
    try:
        result = await run_prediction("predict_compat", compatibility_payload)
        if isinstance(result, dict) and not result.get("error"):
            ml_result = result
            raw_score = result.get("probability") or result.get("compatibility_score") or 0
            if 0 < raw_score <= 1:
                raw_score = raw_score * 100
            if not (raw_score == 0 or (45 <= raw_score <= 55)):
                ml_score = raw_score
    except HTTPException:
        logger.debug("Suppressed HTTPException in %s", __name__)

    knowledge_assessment = assess_donor_compatibility(
        recipient_blood=recipient_blood,
        donor_blood=donor_blood,
        recipient_age=requester_hr.get("age"),
        donor_age=donor_hr.get("age"),
        distance_km=5.0,
        donor_available=donor_available
    )
    if ml_score is not None and 10 <= ml_score <= 100:
        score = ml_score
        k_score = float(knowledge_assessment["compatibility_score"])
        score = round(0.6 * score + 0.4 * k_score, 2)
        reasoning = [
            "ML model prediction combined with medical knowledge layer assessment.",
        ]
    else:
        score = float(knowledge_assessment["compatibility_score"])
        reasoning = [
            "Evidence-based assessment from medical knowledge layer (ML model unavailable or inconclusive).",
        ]

    if availability == "Unavailable":
        score = max(30, score - 20)
    if availability == "On Call":
        score = max(40, score - 10)
    score = max(10, min(100, score))

    factor_summaries = [
        f["factor"] for f in knowledge_assessment.get("factors", [])
    ] + [
        f"Availability: {availability}",
    ]
    reasoning.append(
        f"Factors: {'; '.join(factor_summaries[:5])}."
    )

    priority = "High" if score >= 80 else "Medium" if score >= 60 else "Low"
    estimated_wait_minutes = 15 if availability == "Available" else 35 if availability == "On Call" else 60

    meta = ensure_meta(
        ml_result.get("meta") if isinstance(ml_result, dict) else None,
        knowledge_assessment["confidence"].get("overall", 0.70),
        reasoning + profile_warnings,
        [
            {"title": "Medical Knowledge", "detail": "app/services/medical_knowledge.py::assess_donor_compatibility"},
            {"title": "Model", "detail": "ml/compatibility_model.joblib"},
        ]
    )
    if profile_warnings:
        meta["warnings"] = profile_warnings

    return {
        "compatibility_score": round(score),
        "probability": round(score / 100, 4),
        "recommendation": "Good Match" if score > 70 else "Check Further",
        "compatible": knowledge_assessment.get("compatible"),
        "availability": availability,
        "priority": priority,
        "estimated_wait_minutes": estimated_wait_minutes,
        "factors": knowledge_assessment.get("factors", []),
        "meta": meta,
    }
