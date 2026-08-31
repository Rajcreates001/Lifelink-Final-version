"""
AI Routes — ML Prediction Endpoints
=====================================
Validated ML prediction endpoints for:
- Health risk prediction
- User clustering and forecasting
- Hospital-specific predictions (severity, policy, outbreak, anomaly)
- Government predictions (outbreak, severity, availability, allocation, policy, performance, anomaly)
- Hospital patient predictions (recovery, stay, inventory)
- ML ETA prediction
- Emergency hotspots
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from app.db.database import require_db
from app.services.collections import USERS
from app.services.medical_knowledge import validate_health_payload
from app.services.repository import MongoRepository
from app.core.auth import get_current_user, AuthContext
from app.services.rate_limiter import rate_limit_ml

from app.routes.ai_shared import (
    as_object_id,
    ensure_meta,
    load_hotspot_seed_data,
    run_prediction,
)
from app.routes.ai_schemas import (
    AllocationPayload,
    AnomalyPayload,
    DonorAvailabilityPayload,
    EmergencySeverityPayload,
    ETAPayload,
    HealthRiskPayload,
    HospitalPerformancePayload,
    HospitalSeverityPayload,
    InventoryPayload,
    OutbreakForecastPayload,
    PerformanceScorePayload,
    PolicySegmentPayload,
    RecoveryPayload,
    StayDurationPayload,
    UserClusterPayload,
    UserForecastPayload,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


# ─── Health Risk & User Predictions ────────────────────────────

@router.post("/predict_health_risk")
async def predict_health_risk(
    payload: HealthRiskPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    # Convert to dict, excluding None values so ML model gets clean input
    raw = payload.model_dump(exclude_none=True)

    # Also run through medical_knowledge validation for extra safety
    validated = validate_health_payload(raw)
    warnings = validated.get("_warnings", [])

    hard_reject = [
        w for w in warnings
        if any(kw in w for kw in [
            "exceeds maximum", "incompatible with life", "cannot be negative",
            "beyond the measurable range", "below the survivable",
        ])
    ]
    if hard_reject:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Input validation failed: impossible values detected.",
                "warnings": hard_reject,
            }
        )

    clean_payload = {k: v for k, v in validated.items() if k != "_warnings"}
    for k, v in raw.items():
        if k not in clean_payload or clean_payload.get(k) is None:
            if k not in ("_warnings",):
                clean_payload.setdefault(k, v)

    result = await run_prediction("predict_risk", clean_payload)

    if warnings and isinstance(result, dict):
        meta = result.get("meta", {})
        if not isinstance(meta, dict):
            meta = {}
        meta["validation_warnings"] = warnings
        meta.setdefault("reasoning", [])
        if isinstance(meta["reasoning"], list):
            for w in warnings:
                meta["reasoning"].append(f"Validation: {w}")
        result["meta"] = meta

    return result


@router.post("/predict_user_cluster")
async def predict_user_cluster(
    payload: UserClusterPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_cluster", payload.model_dump())


@router.post("/predict_user_forecast")
async def predict_user_forecast(
    payload: UserForecastPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_forecast", payload.model_dump())


# ─── Hospital-Specific Predictions ──────────────────────────────

_SEVERITY_TRIAGE_MAP = {
    "critical": {
        "severity_score": 95, "ai_confidence": 0.92,
        "ambulance_type": "ICU Ambulance",
        "hospital_type": "Trauma & Critical Care Center",
        "response_time": "Immediate",
    },
    "high": {
        "severity_score": 82, "ai_confidence": 0.86,
        "ambulance_type": "Advanced Life Support",
        "hospital_type": "Emergency Department - Central",
        "response_time": "Fast",
    },
    "moderate": {
        "severity_score": 64, "ai_confidence": 0.8,
        "ambulance_type": "Standard Ambulance",
        "hospital_type": "Urgent Care Center",
        "response_time": "Normal",
    },
    "medium": {
        "severity_score": 64, "ai_confidence": 0.8,
        "ambulance_type": "Standard Ambulance",
        "hospital_type": "Urgent Care Center",
        "response_time": "Normal",
    },
    "low": {
        "severity_score": 45, "ai_confidence": 0.74,
        "ambulance_type": "Standard Ambulance",
        "hospital_type": "Walk-in Clinic",
        "response_time": "Standard",
    },
}


@router.post("/hosp/predict_severity")
async def hosp_predict_severity(
    payload: HospitalSeverityPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    result = await run_prediction("predict_hosp_severity", payload.model_dump(exclude_none=True))
    if isinstance(result, dict) and not result.get("error"):
        predicted = str(result.get("predicted_severity") or "").lower()
        triage = _SEVERITY_TRIAGE_MAP.get(predicted, _SEVERITY_TRIAGE_MAP["moderate"])
        result["severity_level"] = str(result.get("predicted_severity") or "Moderate").title()
        for key, value in triage.items():
            result.setdefault(key, value)
    return result


@router.post("/hosp/predict_policy")
async def hosp_predict_policy(
    payload: PolicySegmentPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_policy_seg", payload.model_dump())


@router.post("/hosp/predict_outbreak")
async def hosp_predict_outbreak(
    payload: OutbreakForecastPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_forecast_outbreak", payload.model_dump())


@router.post("/hosp/optimize_ambulance")
async def hosp_optimize_ambulance(
    payload: AllocationPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_allocation", payload.model_dump())


@router.post("/hosp/detect_anomaly")
async def hosp_detect_anomaly(
    payload: AnomalyPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_anomaly", payload.model_dump(exclude_none=True))


# ─── Government Predictions ─────────────────────────────────────

@router.post("/gov/predict_outbreak")
async def gov_predict_outbreak(
    payload: OutbreakForecastPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_forecast_outbreak", payload.model_dump())


@router.post("/gov/predict_severity")
async def gov_predict_severity(
    payload: EmergencySeverityPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_severity", payload.model_dump(exclude_none=True))


@router.post("/gov/predict_availability")
async def gov_predict_availability(
    payload: DonorAvailabilityPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_availability", payload.model_dump())


@router.post("/gov/predict_allocation")
async def gov_predict_allocation(
    payload: AllocationPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_allocation", payload.model_dump())


@router.post("/gov/predict_policy_segment")
async def gov_predict_policy_segment(
    payload: PolicySegmentPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_policy_seg", payload.model_dump())


@router.post("/gov/predict_performance_score")
async def gov_predict_performance_score(
    payload: PerformanceScorePayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_perf_score", payload.model_dump())


@router.post("/gov/predict_anomaly")
async def gov_predict_anomaly(
    payload: AnomalyPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_anomaly", payload.model_dump(exclude_none=True))


# ─── Hospital Patient & Inventory Predictions ───────────────────

@router.post("/hospital/patient/recovery")
async def hospital_patient_recovery(
    payload: RecoveryPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_recovery", payload.model_dump())


@router.post("/hospital/patient/stay")
async def hospital_patient_stay(
    payload: StayDurationPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_stay", payload.model_dump())


@router.post("/hospital/inventory/predict")
async def hospital_inventory_predict(
    payload: InventoryPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_inventory", payload.model_dump())


@router.post("/ml/predict-eta")
async def ml_predict_eta(
    payload: ETAPayload = Body(...),
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    return await run_prediction("predict_eta", payload.model_dump(exclude_none=True))


# ─── Emergency Hotspots ─────────────────────────────────────────

@router.get("/gov/emergency_hotspots")
async def gov_emergency_hotspots(
    ctx: AuthContext = Depends(get_current_user),
    _: None = Depends(rate_limit_ml.dependency()),
):
    seed_data = load_hotspot_seed_data()
    if not seed_data:
        return []

    try:
        result = await run_prediction("predict_hotspot", seed_data)
        if isinstance(result, dict) and result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException:
        for item in seed_data:
            item["cluster_label"] = "Unknown"
            item["cluster_id"] = -1
        return seed_data
