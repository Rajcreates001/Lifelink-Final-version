from datetime import datetime

from bson import ObjectId
from celery.result import AsyncResult
from fastapi import APIRouter, Body, Depends, HTTPException

import json

from app.core.auth import require_roles, require_scopes
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.dependencies import get_routing_service, get_weather_service
from app.core.rbac import AuthContext
from app.db.mongo import get_db
from app.services.cache_store import CacheStore
from app.services.collections import ANALYTICS_EVENTS, PREDICTIONS
from app.services.prediction_store import get_latest_prediction
from app.services.routing_service import RoutingService
from app.services.weather_service import WeatherService
from app.services.repository import MongoRepository

router = APIRouter(tags=["ml"])


def _numeric(value, fallback: float = 0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


from app.services.medical_knowledge import (
    classify_severity as _classify_severity,
    compute_risk_score as _compute_risk_score,
    estimate_confidence as _est_conf,
    validate_health_payload as _validate_payload,
)


def _fast_health_risk(payload: dict) -> dict:
    # Use medical_knowledge compute_risk_score for evidence-based, transparent scoring

    age_val = None
    try:
        age_val = int(float(str(payload.get("age", 0)))) if payload.get("age") else None
    except (TypeError, ValueError):
        pass

    bmi_val = None
    try:
        bmi_val = float(str(payload.get("bmi", 0))) if payload.get("bmi") else None
    except (TypeError, ValueError):
        pass

    bp_val = None
    bp_raw = payload.get("blood_pressure")
    if bp_raw is not None:
        try:
            bp_str = str(bp_raw)
            if "/" in bp_str:
                bp_val = int(float(bp_str.split("/")[0].strip()))
            else:
                bp_val = int(float(bp_str))
        except (TypeError, ValueError):
            pass

    hr_val = None
    hr_raw = payload.get("heart_rate")
    if hr_raw is not None:
        try:
            hr_val = int(float(str(hr_raw)))
        except (TypeError, ValueError):
            pass

    oxygen_val = None
    o2_raw = payload.get("oxygen")
    if o2_raw is not None:
        try:
            oxygen_val = int(float(str(o2_raw)))
        except (TypeError, ValueError):
            pass

    has_condition = payload.get("has_condition") in {"1", 1, True}
    lifestyle = payload.get("lifestyle_factor") or payload.get("lifestyle")

    result = _compute_risk_score(
        age=age_val,
        bmi=bmi_val,
        blood_pressure_sys=bp_val,
        heart_rate=hr_val,
        oxygen=oxygen_val,
        has_condition=has_condition,
        lifestyle=lifestyle,
    )

    risk_level = result.get("risk_level", "Low")
    risk_score = result.get("risk_score", 0) or 50

    # Map drivers to the format expected by callers
    drivers_raw = result.get("drivers", [])
    if isinstance(drivers_raw, list):
        drivers = []
        for d in drivers_raw:
            if isinstance(d, dict):
                drivers.append(f"{d.get('factor', '')} ({d.get('contribution', 0)} pts)")
            else:
                drivers.append(str(d))
    else:
        drivers = []

    # Build evidence-based reasoning
    reasoning = [
        "Evidence-based risk scoring using clinical reference ranges and weighted factor analysis.",
    ]
    if result.get("missing_data"):
        reasoning.append(
            f"Inputs not available: {', '.join(result['missing_data'])}. "
            "Score may change with complete data."
        )
    if result.get("explanation"):
        reasoning.append(result["explanation"])

    # Confidence from source completeness
    conf = _est_conf(
        provided_inputs={
            "age": payload.get("age") is not None,
            "bmi": payload.get("bmi") is not None,
            "blood_pressure": bp_raw is not None,
            "heart_rate": hr_raw is not None,
            "oxygen": o2_raw is not None,
        },
        model_confidence=None,
        critical_inputs=["age", "blood_pressure"],
    )

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "drivers": drivers,
        "explanation": result.get("explanation", "Risk estimated from available clinical data."),
        "missing_data": result.get("missing_data", []),
        "meta": {
            "command": "predict_risk_fast",
            "confidence": round(conf.overall, 3),
            "reasoning": reasoning,
            "data_completeness": conf.data_completeness,
            "missing_critical_inputs": conf.missing_critical_inputs,
            "references": [
                {"title": "Medical Knowledge", "detail": "app/services/medical_knowledge.py::compute_risk_score"},
                {"title": "Model", "detail": "ml/ai_ml.py::predict_health_risk"},
            ],
        },
    }


def _fast_severity_from_message(message: str) -> dict:
    severity_result = _classify_severity(message=message)

    s_level = severity_result.get("severity_level", "Low")
    s_score = severity_result.get("severity_score", 45)
    conf = severity_result.get("confidence", {})
    criteria = severity_result.get("criteria", [])

    # Map severity level to operational recommendations
    ambulance_types = {
        "Critical": "ICU Ambulance",
        "High": "Advanced Life Support",
        "Medium": "Standard Ambulance",
        "Low": "Standard Ambulance",
    }
    hospital_types = {
        "Critical": "Trauma & Critical Care Center",
        "High": "Emergency Department - Central",
        "Medium": "Urgent Care Center",
        "Low": "Walk-in Clinic",
    }
    response_times = {
        "Critical": "Immediate",
        "High": "Fast",
        "Medium": "Normal",
        "Low": "Standard",
    }

    reasoning = []
    for c in criteria:
        if isinstance(c, dict):
            reasoning.append(f"{c.get('type', 'criterion')}: {c.get('detail', '')}")
    if not reasoning:
        reasoning.append(f"No specific triage criteria matched. Default severity: {s_level}.")

    return {
        "severity_level": s_level,
        "severity_score": s_score,
        "ai_confidence": round(conf.get("overall", 0.74), 2),
        "ambulance_type": ambulance_types.get(s_level, "Standard Ambulance"),
        "hospital_type": hospital_types.get(s_level, "Walk-in Clinic"),
        "response_time": response_times.get(s_level, "Standard"),
        "criteria": criteria,
        "recommendation": severity_result.get("recommendation", ""),
        "meta": {
            "confidence": round(conf.get("overall", 0.74), 3),
            "reasoning": reasoning[:4],
            "data_completeness": conf.get("data_completeness", 0.5),
            "references": [{"title": "Triage Rules", "detail": "app/services/medical_knowledge.py::classify_severity"}],
        },
    }


def _fallback_eta_minutes(distance_km: float) -> int:
    speed_kmh = 45
    return max(2, int(round((distance_km / speed_kmh) * 60)))


async def _run(command: str, payload):
    celery_app.send_task("system.generate_predictions", args=[command, payload])
    cached = await get_latest_prediction(command)
    if cached and isinstance(cached.get("result"), dict):
        return cached["result"]
    if command == "predict_risk":
        return _fast_health_risk(payload)
    if command == "predict_eta":
        distance_km = _numeric(payload.get("distance_km"), 1.0)
        return {
            "eta_minutes": _fallback_eta_minutes(distance_km),
            "distance_km": distance_km,
            "meta": {
                "confidence": 0.4,
                "reasoning": ["Fallback ETA until async model completes."],
                "references": [{"title": "Task", "detail": f"system.generate_predictions::{command}"}],
            },
        }
    if command == "predict_sos_severity":
        return _fast_severity_from_message(payload.get("message", ""))
    return {
        "status": "queued",
        "meta": {
            "confidence": 0.0,
            "reasoning": ["Prediction queued for background processing."],
            "references": [{"title": "Task", "detail": f"system.generate_predictions::{command}"}],
        },
    }


@router.post("/health-risk")
async def health_risk(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(require_roles("public", "hospital", "ambulance", "government"))):
    settings = get_settings()

    # Validate payload through medical knowledge layer before processing
    validated = _validate_payload(payload)
    val_warnings = validated.get("_warnings", [])

    # Reject impossible values before reaching ML or fast-path logic
    hard_reject = [
        w for w in val_warnings
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
            },
        )

    # Build clean payload from validated values, preserving unhandled fields
    clean_payload = {}
    for k in ["age", "bmi", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "lifestyle"]:
        if k in validated and validated[k] is not None:
            clean_payload[k] = validated[k]
    # Map blood_pressure_systolic back to blood_pressure for downstream compatibility
    if "blood_pressure_systolic" in clean_payload:
        clean_payload["blood_pressure"] = clean_payload.pop("blood_pressure_systolic")
    # Carry over all original fields not handled by validation
    for k, v in payload.items():
        if k not in clean_payload and k != "_warnings":
            clean_payload[k] = v

    cache = CacheStore(settings.redis_url, namespace="ml")
    fast_mode = bool(payload.get("fast") or payload.get("mode") == "fast")
    cache_key = f"health-risk:{hash(json.dumps(clean_payload, sort_keys=True))}:{'fast' if fast_mode else 'full'}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    result = None
    if fast_mode:
        result = _fast_health_risk(clean_payload)
    else:
        result = await _run("predict_risk", clean_payload)
    if not isinstance(result, dict):
        result = {}

    risk_level = result.get("risk_level") or ("High" if result.get("risk_score", 0) >= 70 else "Low")
    # Normalize legacy labels ("Moderate") to the canonical 4-level scale
    # (Low / Medium / High / Critical) expected by all callers.
    risk_level = {"Moderate": "Medium", "Very High": "Critical"}.get(risk_level, risk_level)
    risk_score = result.get("risk_score") or (78 if risk_level == "High" else 35)

    drivers = result.get("drivers") or []
    if not drivers:
        if payload.get("age") and int(payload.get("age")) >= 60:
            drivers.append("Age 60+")
        if payload.get("bmi") and float(payload.get("bmi")) >= 30:
            drivers.append("BMI over 30")
        if payload.get("blood_pressure") and float(payload.get("blood_pressure")) >= 140:
            drivers.append("High blood pressure")
        if payload.get("heart_rate") and float(payload.get("heart_rate")) >= 100:
            drivers.append("High resting heart rate")
        if payload.get("has_condition") in {"1", 1, True}:
            drivers.append("Existing condition")

    explanation = result.get("explanation") or "Risk score estimated from recent vitals and reported conditions."

    enriched = {
        **result,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "drivers": drivers,
        "explanation": explanation,
    }

    # Attach validation warnings to response meta
    if val_warnings:
        meta = enriched.get("meta", {})
        if not isinstance(meta, dict):
            meta = {}
        meta["validation_warnings"] = val_warnings
        if isinstance(meta.get("reasoning"), list):
            for w in val_warnings[:3]:
                meta["reasoning"].append(f"Validation: {w}")
        enriched["meta"] = meta

    cache.set(cache_key, enriched, ttl=300)

    user_id = payload.get("user_id")
    if user_id:
        try:
            oid = ObjectId(user_id)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid user_id") from exc
        stored_payload = {key: value for key, value in payload.items() if key not in {"fast", "mode"}}
        db = get_db()
        repo = MongoRepository(db, PREDICTIONS)
        await repo.insert_one(
            {
                "user": oid,
                "prediction_type": "health_risk",
                "risk_level": risk_level,
                "risk_score": risk_score,
                "drivers": drivers,
                "explanation": explanation,
                "payload": stored_payload,
                "createdAt": datetime.utcnow(),
            }
        )
        await MongoRepository(db, ANALYTICS_EVENTS).insert_one(
            {
                "user": oid,
                "module": "health_risk",
                "action": "predicted",
                "metadata": {
                    "risk_level": risk_level,
                    "risk_score": risk_score,
                },
                "createdAt": datetime.utcnow(),
            }
        )

    return enriched


@router.post("/health-risk/async")
async def health_risk_async(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(require_roles("public", "hospital", "ambulance", "government"))):
    job = celery_app.send_task("ml.run_model", args=["predict_risk", payload])
    return {"job_id": job.id, "status": job.status}


@router.post("/emergency-detection")
async def emergency_detection(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(require_scopes("emergency:trigger"))):
    if not payload.get("message"):
        raise HTTPException(status_code=400, detail="message is required")
    return await _run("predict_sos_severity", payload)


@router.post("/eta")
async def eta_prediction(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("routes:read")),
    routing: RoutingService = Depends(get_routing_service),
    weather: WeatherService = Depends(get_weather_service),
):
    distance_km = payload.get("distance_km")
    if distance_km is None and all(key in payload for key in ("start_lat", "start_lng", "end_lat", "end_lng")):
        route = await routing.route(
            float(payload["start_lat"]),
            float(payload["start_lng"]),
            float(payload["end_lat"]),
            float(payload["end_lng"]),
            include_geometry=False,
        )
        distance_km = (route.get("distance_meters") or 0) / 1000
    weather_now = None
    if payload.get("start_lat") is not None and payload.get("start_lng") is not None:
        weather_now = await weather.current(float(payload["start_lat"]), float(payload["start_lng"]))
    enriched_payload = {
        "distance_km": distance_km or 1.0,
        "precipitation_mm": (weather_now or {}).get("precipitation_mm"),
        "wind_kph": (weather_now or {}).get("wind_kph"),
        "hour": datetime.utcnow().hour,
    }
    settings = get_settings()
    cache = CacheStore(settings.redis_url, namespace="ml")
    cache_key = f"eta:{hash(json.dumps(enriched_payload, sort_keys=True))}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    result = await _run("predict_eta", enriched_payload)
    if not isinstance(result, dict):
        result = {}
    result["distance_km"] = distance_km
    cache.set(cache_key, result, ttl=300)
    return result


@router.post("/eta/async")
async def eta_prediction_async(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("routes:read")),
    routing: RoutingService = Depends(get_routing_service),
    weather: WeatherService = Depends(get_weather_service),
):
    distance_km = payload.get("distance_km")
    if distance_km is None and all(key in payload for key in ("start_lat", "start_lng", "end_lat", "end_lng")):
        route = await routing.route(
            float(payload["start_lat"]),
            float(payload["start_lng"]),
            float(payload["end_lat"]),
            float(payload["end_lng"]),
            include_geometry=False,
        )
        distance_km = (route.get("distance_meters") or 0) / 1000
    weather_now = None
    if payload.get("start_lat") is not None and payload.get("start_lng") is not None:
        weather_now = await weather.current(float(payload["start_lat"]), float(payload["start_lng"]))
    enriched_payload = {
        "distance_km": distance_km or 1.0,
        "precipitation_mm": (weather_now or {}).get("precipitation_mm"),
        "wind_kph": (weather_now or {}).get("wind_kph"),
        "hour": datetime.utcnow().hour,
    }
    job = celery_app.send_task("ml.run_model", args=["predict_eta", enriched_payload])
    return {"job_id": job.id, "status": job.status, "distance_km": distance_km}


@router.post("/hospital-load")
async def hospital_load(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(require_scopes("resources:read"))):
    return await _run("predict_bed_forecast", payload)


@router.post("/heatmap")
async def heatmap(payload: list = Body(default_factory=list), ctx: AuthContext = Depends(require_scopes("analytics:read"))):
    if not payload:
        raise HTTPException(status_code=400, detail="payload must be a non-empty list")
    return await _run("predict_hotspot", payload)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, ctx: AuthContext = Depends(require_scopes("ai:ask"))):
    result = AsyncResult(job_id, app=celery_app)
    if result.failed():
        return {"status": result.status, "error": str(result.result)}
    if result.ready():
        return {"status": result.status, "result": result.result}
    return {"status": result.status}
