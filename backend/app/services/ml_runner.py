"""
ML Runner — Direct Function Call Architecture
===============================================
Replaces subprocess-based ML execution with direct function imports from
the `ai_ml` module for 10-50x faster predictions.

Key improvements:
  - No subprocess overhead (spawn Python, load all deps, load model, predict, exit)
  - Models are loaded once and cached by joblib
  - Predictions use same async interface as before

All callers use `run_ml_model(command, payload)` — same API as before.
"""

import os
import json
from pathlib import Path
from typing import Any


# ─── Module-level setup ─────────────────────────────────────────────
# Resolve the ml/ directory once so model paths work correctly.
# All prediction functions have default model_path values like
# "emergency_severity_model.joblib" which resolve relative to CWD.
# The previous subprocess approach set cwd=str(ml_dir). We do the same
# by changing directory before each call.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_ML_DIR = _REPO_ROOT / "backend" / "ml"
# In Docker the app is at /app and ml/ is at /app/ml
if not _ML_DIR.exists():
    _ML_DIR = Path(__file__).resolve().parents[2] / "ml"


# ─── Reference map (for meta enrichment) ────────────────────────────
_REFERENCE_MAP: dict[str, list[dict[str, str]]] = {
    "predict_risk": [
        {"title": "Dataset", "detail": "ml/health_risk_data.csv"},
        {"title": "Model", "detail": "ml/health_risk_model.joblib"},
    ],
    "predict_eta": [
        {"title": "Dataset", "detail": "ml/eta_data.csv"},
        {"title": "Model", "detail": "ml/eta_model.joblib"},
    ],
    "predict_hotspot": [
        {"title": "Dataset", "detail": "ml/emergency_hotspot_data.csv"},
        {"title": "Model", "detail": "ml/emergency_hotspot_model.joblib"},
    ],
    "predict_sos_severity": [
        {"title": "Dataset", "detail": "ml/emergency_severity_data.csv"},
        {"title": "Model", "detail": "ml/emergency_severity_model.joblib"},
    ],
    "predict_hosp_severity": [
        {"title": "Dataset", "detail": "ml/hospital_severity_data.csv"},
        {"title": "Model", "detail": "ml/hospital_severity_model.joblib"},
    ],
    "predict_bed_forecast": [
        {"title": "Model", "detail": "ml/bed_forecast_model.joblib"},
    ],
    "predict_staff_alloc": [
        {"title": "Dataset", "detail": "ml/staff_allocation_data.csv"},
        {"title": "Model", "detail": "ml/staff_allocation_model.joblib"},
    ],
    "predict_hosp_disease": [
        {"title": "Dataset", "detail": "ml/hospital_disease_data.csv"},
        {"title": "Model", "detail": "ml/hospital_disease_models.joblib"},
    ],
    "predict_recovery": [
        {"title": "Dataset", "detail": "ml/patient_outcome_data.csv"},
        {"title": "Model", "detail": "ml/recovery_model.joblib"},
    ],
    "predict_stay": [
        {"title": "Model", "detail": "ml/stay_duration_model.joblib"},
    ],
    "predict_inventory": [
        {"title": "Dataset", "detail": "ml/inventory_data.csv"},
        {"title": "Model", "detail": "ml/inventory_prediction_model.joblib"},
    ],
    "predict_anomaly": [
        {"title": "Dataset", "detail": "ml/anomaly_data.csv"},
        {"title": "Model", "detail": "ml/anomaly_detection_model.joblib"},
    ],
    "predict_availability": [
        {"title": "Dataset", "detail": "ml/donor_availability_data.csv"},
        {"title": "Model", "detail": "ml/donor_availability_model.joblib"},
    ],
    "predict_severity": [
        {"title": "Dataset", "detail": "ml/emergency_severity_expanded.csv"},
        {"title": "Model", "detail": "ml/emergency_severity_model.joblib"},
        {"title": "Features", "detail": "heart_rate, bp_sys, o2_sat, resp_rate, age, gcs, trauma_type, chief_complaint"},
    ],
    "predict_policy_seg": [
        {"title": "Dataset", "detail": "ml/policy_data.csv"},
        {"title": "Model", "detail": "ml/policy_segmentation_model.joblib"},
    ],
    "predict_perf_score": [
        {"title": "Dataset", "detail": "ml/hospital_performance_data.csv"},
        {"title": "Model", "detail": "ml/healthcare_performance_model.joblib"},
    ],
    "predict_allocation": [
        {"title": "Model", "detail": "ml/allocation_q_table.joblib"},
    ],
    "predict_forecast_outbreak": [
        {"title": "Dataset", "detail": "ml/outbreak_data.csv"},
        {"title": "Model", "detail": "ml/outbreak_forecast_models.joblib"},
    ],
    "predict_compat": [
        {"title": "Dataset", "detail": "ml/compatibility_data.csv"},
        {"title": "Model", "detail": "ml/compatibility_model.joblib"},
    ],
    "predict_hosp_perf": [
        {"title": "Dataset", "detail": "ml/hospital_performance_data.csv"},
        {"title": "Model", "detail": "ml/hospital_performance_model.joblib"},
    ],
}


# ─── Helpers (unchanged from original) ──────────────────────────────


def _normalize_confidence(value: Any) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if numeric > 1:
        if numeric <= 100:
            numeric = numeric / 100
        else:
            numeric = min(numeric, 100) / 100
    return round(max(0.0, min(1.0, numeric)), 3)


def _extract_model_confidence(result: dict[str, Any]) -> float | None:
    """Extract ML model confidence from prediction result."""
    for key in ("confidence", "ai_confidence", "probability", "confidence_score"):
        if key in result:
            val = result.get(key)
            if val is not None:
                return _normalize_confidence(val)
    # Check nested meta
    meta = result.get("meta")
    if isinstance(meta, dict):
        for key in ("confidence", "overall"):
            if key in meta:
                return _normalize_confidence(meta.get(key))
    # Check classification probability
    if "probability" in result and isinstance(result["probability"], (int, float)):
        return _normalize_confidence(result["probability"])
    return None


# Keep original alias for backward compatibility
def _extract_confidence(result: dict[str, Any]) -> float | None:
    return _extract_model_confidence(result)


def _build_reasoning(command: str, payload: Any, result: dict[str, Any]) -> list[str]:
    reasoning: list[str] = []

    # Model-specific reasoning from the result itself
    drivers = result.get("drivers")
    if isinstance(drivers, list) and drivers:
        if all(isinstance(d, dict) for d in drivers):
            # Structured drivers from medical_knowledge
            factors = [f"{d.get('factor', '')} ({d.get('contribution', 0)})" for d in drivers[:4]]
            summary = "; ".join(factors)
        else:
            summary = ", ".join(str(item) for item in drivers[:4])
        reasoning.append(f"Contributing factors: {summary}.")

    explanation = result.get("explanation") or result.get("summary")
    if isinstance(explanation, str) and explanation.strip():
        reasoning.append(explanation.strip())

    # Uncertainty communication
    if result.get("missing_data"):
        missing = result["missing_data"]
        if isinstance(missing, list) and missing:
            reasoning.append(f"Data gaps: {', '.join(missing[:3])}. Assessment may change with complete information.")

    if not reasoning:
        reasoning.append("Prediction generated from model outputs and provided inputs.")

    if isinstance(payload, dict) and payload:
        provided = sum(1 for v in payload.values() if v is not None)
        total = max(1, len(payload))
        reasoning.append(f"Input completeness: {provided}/{total} features provided.")

    return reasoning[:4]


def _build_meta(command: str, payload: Any, result: dict[str, Any]) -> dict[str, Any]:
    from app.services.medical_knowledge import estimate_confidence as _est_conf

    model_confidence = _extract_model_confidence(result)

    # Compute data completeness from payload
    provided_inputs = {}
    if isinstance(payload, dict):
        for key, value in payload.items():
            if isinstance(value, (list, dict)):
                provided_inputs[key] = len(value) > 0 if hasattr(value, '__len__') else bool(value)
            else:
                provided_inputs[key] = value is not None

    # Determine critical inputs based on command
    critical_map = {
        "predict_risk": ["age", "blood_pressure", "heart_rate"],
        "predict_severity": ["heart_rate", "blood_pressure_sys", "oxygen_saturation"],
        "predict_eta": ["distance_km"],
        "predict_compat": ["receiver_blood_type", "donor_blood_type"],
        "predict_bed_forecast": ["occupancy"],
        "predict_hotspot": ["lat", "lng"],
    }
    critical_inputs = critical_map.get(command, [])

    # Count abnormal values from assessments
    abnormal_count = 0
    total_values = 0
    if isinstance(result, dict):
        for key in ("risk_score", "severity_score"):
            val = result.get(key)
            if isinstance(val, (int, float)):
                total_values += 1
                if val > 70:
                    abnormal_count += 1

    confidence_result = _est_conf(
        provided_inputs=provided_inputs,
        model_confidence=model_confidence,
        critical_inputs=critical_inputs,
        abnormal_values=abnormal_count,
        total_values=total_values,
    )

    overall = confidence_result.overall
    completeness = confidence_result.data_completeness
    missing_critical = confidence_result.missing_critical_inputs
    warnings = confidence_result.warnings

    meta = {
        "command": command,
        "confidence": round(overall, 3),
        "data_completeness": round(completeness, 3),
        "reasoning": _build_reasoning(command, payload, result),
        "references": _REFERENCE_MAP.get(command, [{"title": "Model", "detail": f"ml/ai_ml.py::{command}"}]),
    }

    if missing_critical:
        meta["missing_critical_inputs"] = missing_critical
    if warnings:
        meta["warnings"] = warnings

    return meta


def _merge_meta(existing: Any, fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(existing, dict):
        return fallback
    merged = {**fallback, **existing}
    if "reasoning" in merged and not isinstance(merged["reasoning"], list):
        merged["reasoning"] = [str(merged["reasoning"])]
    if "references" in merged and not isinstance(merged["references"], list):
        merged["references"] = [merged["references"]]
    return merged


def _prepare_payload(command: str, payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return payload

    if isinstance(payload, list):
        if command in {"predict_hotspot", "predict_recommend"}:
            return payload
        return {"value": payload}

    if payload is None:
        return {}

    # Keep compatibility with legacy primitive payloads
    if command == "predict_bed":
        return {"occupancy": payload}
    if command == "predict_eta":
        return {"location": payload}

    return {"value": payload}


def _enrich_result(command: str, payload: Any, result: Any) -> Any:
    if isinstance(result, dict):
        fallback = _build_meta(command, payload, result)
        result["meta"] = _merge_meta(result.get("meta"), fallback)
    return result


# ─── Core function — direct import vs subprocess ────────────────────

# Lazy-loaded module reference
_ai_ml_module = None


def _get_ai_ml():
    """Lazy-import the ai_ml module, adding ml/ to sys.path if needed."""
    global _ai_ml_module
    if _ai_ml_module is not None:
        return _ai_ml_module

    import sys as _sys
    _ml_str = str(_ML_DIR)
    if _ml_str not in _sys.path:
        _sys.path.insert(0, _ml_str)

    import importlib
    _ai_ml_module = importlib.import_module("ai_ml")
    return _ai_ml_module


async def run_ml_model(command: str, payload: Any = None, script_name: str = "ai_ml.py") -> Any:
    """
    Execute an ML prediction by importing and calling the function directly.

    Args:
        command: Command name (e.g. "predict_severity", "predict_eta")
        payload: Input data dict for the model
        script_name: Ignored (kept for backward compat with existing callers)

    Returns:
        Prediction result dict with 'meta' enriched with confidence/reasoning/references
    """
    ai_ml = _get_ai_ml()
    input_payload = _prepare_payload(command, payload)

    # Change CWD to ml/ so model_path defaults resolve correctly
    # (all predict_* functions have default model_path= values that are
    #  relative filenames expected to be found from the ml/ directory)
    original_cwd = os.getcwd()
    os.chdir(str(_ML_DIR))
    try:
        if command in ai_ml._COMMAND_MAP:
            result = ai_ml._COMMAND_MAP[command](input_payload)
        else:
            raise ValueError(f"Unknown ML command: {command}")
    finally:
        os.chdir(original_cwd)

    return _enrich_result(command, payload, result)
