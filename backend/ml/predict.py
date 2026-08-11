"""
LifeLink ML — Model Prediction Module
========================================
All predict_* functions extracted from the original ai_ml.py.

Each function loads a trained .joblib model and returns a prediction dict.
"""

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd

# ─── Ensure sibling modules are importable (for standalone execution) ──
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

# Local imports (absolute — works both as package import and standalone)
from features import SEVERITY_SCORE_MAP  # noqa: E402
from utils import _get_city_graph, _get_discretized_state, get_priority  # noqa: E402


# =====================================================================
# 1. EMERGENCY ALERT CLASSIFIER
# =====================================================================


def predict_emergency(text_input: str, model_path="emergency_classifier.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        predicted_category = model.predict([text_input])[0]
        priority = get_priority(predicted_category)
        return {"type": predicted_category, "priority": priority, "original_message": text_input}
    except FileNotFoundError:
        return {"error": "Model file (emergency_classifier.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 2. DONOR COMPATIBILITY
# =====================================================================


def predict_compatibility(input_data_dict: dict, model_path="compatibility_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        probability = model.predict_proba(input_df)[0][1]
        return {"probability": round(probability, 4)}
    except FileNotFoundError:
        return {"error": "Model file (compatibility_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 3. HOSPITAL RECOMMENDATION
# =====================================================================


def predict_hospital_recommendation(
    input_data_json, model_path="hospital_recommendation_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_data = input_data_json
        if isinstance(input_data_json, str):
            if os.path.isfile(input_data_json):
                with open(input_data_json, "r", encoding="utf-8") as handle:
                    input_data = json.load(handle)
            else:
                input_data = json.loads(input_data_json)
        if not isinstance(input_data, list) or len(input_data) == 0:
            return {"error": "Input must be a non-empty list of hospitals."}
        input_df = pd.DataFrame(input_data)
        probabilities = model.predict_proba(input_df)
        scores = probabilities[:, 1]
        ranked = []
        for idx, score in enumerate(scores):
            payload = dict(input_data[idx])
            payload["ml_score"] = round(float(score), 4)
            payload["index"] = idx
            ranked.append(payload)
        ranked.sort(key=lambda item: item.get("ml_score", 0), reverse=True)
        return {"best": ranked[0] if ranked else None, "ranked": ranked}
    except FileNotFoundError:
        return {"error": "Model file (hospital_recommendation_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 4. HEALTH RISK
# =====================================================================


def _health_risk_fallback(input_data_dict: dict) -> dict:
    """Rule-based health risk scoring used when the trained model cannot load
    (e.g. xgboost not installed). Mirrors medical_knowledge.compute_risk_score
    ranges so callers always get a usable risk_level + risk_score."""
    def _num(key):
        try:
            return float(input_data_dict.get(key))
        except (TypeError, ValueError):
            return None

    age = _num("age")
    bmi = _num("bmi")
    bp = _num("blood_pressure") or _num("blood_pressure_systolic")
    hr = _num("heart_rate")
    o2 = _num("oxygen") or _num("spo2")
    has_condition = input_data_dict.get("has_condition") in {"1", 1, True}
    lifestyle = input_data_dict.get("lifestyle") or input_data_dict.get("lifestyle_factor")

    score = 0
    if age is not None:
        score += 1 if age >= 30 else 0
        score += 3 if age >= 45 else 0
        score += 5 if age >= 60 else 0
    if bmi is not None:
        score += 3 if bmi >= 25 else 0
        score += 5 if bmi >= 30 else 0
        score += 8 if bmi >= 35 else 0
    if bp is not None:
        score += 5 if bp >= 120 else 0
        score += 7 if bp >= 140 else 0
        score += 10 if bp >= 160 else 0
    if hr is not None:
        score += 4 if hr >= 90 else 0
        score += 6 if hr >= 100 else 0
        score += 10 if hr >= 120 else 0
    if o2 is not None:
        score += 6 if o2 < 95 else 0
        score += 12 if o2 < 90 else 0
    if has_condition:
        score += 12
    if lifestyle in ("sedentary", "sedentary_lifestyle"):
        score += 5

    if score >= 50:
        level = "Critical"
    elif score >= 30:
        level = "High"
    elif score >= 15:
        level = "Medium"
    else:
        level = "Low"
    return {
        "risk_level": level,
        "risk_value": 2 if level == "Critical" else 1 if level in ("High", "Medium") else 0,
        "risk_score": min(100, max(0, score)),
        "fallback": True,
    }


def predict_health_risk(input_data_dict: dict, model_path="health_risk_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        proba = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(input_df)[0][1]
        risk_map = {0: "Low", 1: "High"}
        risk_level = risk_map.get(prediction, "Unknown")
        risk_score = int(round((proba or (0.8 if risk_level == "High" else 0.3)) * 100))
        return {"risk_level": risk_level, "risk_value": int(prediction), "risk_score": risk_score}
    except FileNotFoundError:
        return {"error": "Model file (health_risk_model.joblib) not found."}
    except Exception as e:
        # Missing optional ML dependencies (e.g. xgboost) or schema drift must
        # never break the API — fall back to rule-based scoring.
        try:
            result = _health_risk_fallback(input_data_dict)
            result["fallback_reason"] = str(e)
            return result
        except Exception:
            return {"error": f"Prediction error: {e}"}


# =====================================================================
# 5. USER ACTIVITY CLUSTER
# =====================================================================


def predict_activity_cluster(
    input_data_dict: dict, model_path="activity_cluster_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        cluster_map = {0: "Inactive", 1: "Active", 2: "Moderate"}
        input_df = pd.DataFrame([input_data_dict])
        features = ["sos_usage", "donations_made", "health_logs"]
        input_df = input_df[features]
        prediction = model.predict(input_df)[0]
        return {"cluster_label": cluster_map.get(prediction, "Unknown"), "cluster_id": int(prediction)}
    except FileNotFoundError:
        return {"error": "Model file (activity_cluster_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 6. BEHAVIOR FORECAST
# =====================================================================


def predict_behavior_forecast(
    input_data_dict: dict, model_path="behavior_forecast_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        features = ["past_donations"]
        input_df = input_df[features]
        prediction = model.predict(input_df)[0]
        predicted_value = max(0, round(prediction))
        return {"forecasted_donations_next_period": int(predicted_value)}
    except FileNotFoundError:
        return {"error": "Model file (behavior_forecast_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 7. EMERGENCY HOTSPOTS
# =====================================================================


def predict_emergency_hotspots(
    input_data_json, model_path="emergency_hotspot_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_data = input_data_json
        if isinstance(input_data_json, str):
            if os.path.isfile(input_data_json):
                with open(input_data_json, "r", encoding="utf-8") as handle:
                    input_data = json.load(handle)
            else:
                input_data = json.loads(input_data_json)
        if not isinstance(input_data, list) or len(input_data) == 0:
            return {"error": "Input must be a non-empty list."}
        df = pd.DataFrame(input_data)
        try:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df["hour_of_day"] = df["timestamp"].dt.hour
        except Exception:
            df["hour_of_day"] = np.random.randint(0, 24, df.shape[0])
        predictions = model.predict(df)
        cluster_map = {0: "High-Density Zone", 1: "Medium-Density Zone", 2: "Low-Density Zone"}
        df["cluster_label"] = [cluster_map.get(p, "Unknown") for p in predictions]
        df["cluster_id"] = predictions
        if "timestamp" in df.columns:
            df["timestamp"] = df["timestamp"].astype(str)
        return df.to_dict("records")
    except FileNotFoundError:
        return {"error": "Model file (emergency_hotspot_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 8. DISEASE OUTBREAK FORECAST
# =====================================================================


def predict_outbreak_forecast(
    input_data_dict: dict, model_path="outbreak_forecast_models.joblib"
) -> dict:
    try:
        models = joblib.load(model_path)
        disease = input_data_dict.get("disease_name")
        region = input_data_dict.get("region")
        days = int(input_data_dict.get("days_to_predict", 30))
        key = (disease, region)
        if key not in models:
            return {"error": f"No forecast model found for {disease} in {region}."}
        m = models[key]
        future = m.make_future_dataframe(periods=days)
        forecast = m.predict(future)
        results = []
        forecast_data = forecast.tail(days)
        for _, row in forecast_data.iterrows():
            results.append(
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "predicted_cases": round(max(0, row["yhat"])),
                    "confidence_low": round(max(0, row["yhat_lower"])),
                    "confidence_high": round(max(0, row["yhat_upper"])),
                }
            )
        return {"disease_name": disease, "region": region, "forecast": results}
    except FileNotFoundError:
        return {"error": "Model file (outbreak_forecast_models.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 9. EMERGENCY SEVERITY (clinical features)
# =====================================================================


def predict_severity(input_data_dict: dict, model_path="emergency_severity_model.joblib") -> dict:
    """
    Predict emergency severity using real clinical features.

    Expected input:
      heart_rate, blood_pressure_sys, oxygen_saturation, respiratory_rate,
      age, glasgow_coma_scale, trauma_type, chief_complaint

    Returns:
      {predicted_severity, severity_score, predicted_severity_numeric}
    """
    try:
        model_data = joblib.load(model_path)
        if isinstance(model_data, dict) and "pipeline" in model_data:
            pipeline = model_data["pipeline"]
            le = model_data["label_encoder"]
        else:
            # Old-format model fallback
            input_df = pd.DataFrame([input_data_dict])
            prediction = int(model_data.predict(input_df)[0])
            return {
                "predicted_severity": str(prediction),
                "severity_score": 50,
                "note": "Legacy model — retrain with expanded dataset.",
            }
        input_df = pd.DataFrame([input_data_dict])
        prediction = int(pipeline.predict(input_df)[0])
        severity_label = le.inverse_transform([prediction])[0]
        severity_score = SEVERITY_SCORE_MAP.get(severity_label, 50)
        return {
            "predicted_severity": severity_label,
            "severity_score": severity_score,
            "predicted_severity_numeric": prediction,
        }
    except FileNotFoundError:
        return {"error": "Model file (emergency_severity_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 10. DONOR / ORGAN AVAILABILITY
# =====================================================================


def predict_availability(input_data_dict: dict, model_path="donor_availability_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        predicted_score = max(0, min(100, round(prediction, 2)))
        return {"predicted_availability_score": predicted_score}
    except FileNotFoundError:
        return {"error": "Model file (donor_availability_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 11. RESOURCE ALLOCATION (Q-Learning)
# =====================================================================


def predict_allocation(input_data_dict: dict, model_path="allocation_q_table.joblib") -> dict:
    try:
        q_table = joblib.load(model_path)
        emerg_count = int(input_data_dict.get("emergency_count"))
        cap_percent = int(input_data_dict.get("hospital_capacity_percent"))
        state = _get_discretized_state(emerg_count, cap_percent)
        if state not in q_table:
            action_id = 0
        else:
            action_id = np.argmax(q_table[state])
        action_map = {0: "Send 1 Ambulance", 1: "Send 2 Ambulances", 2: "Send 3 Ambulances"}
        return {"optimal_action": action_map.get(action_id, "Unknown"), "action_id": int(action_id)}
    except FileNotFoundError:
        return {"error": "Model file (allocation_q_table.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 12. POLICY SEGMENTATION
# =====================================================================


def predict_policy_segmentation(
    input_data_dict: dict, model_path="policy_segmentation_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        cluster_map = {0: "Well-Served Region", 1: "Critical-Priority Region", 2: "Stressed Region"}
        input_df = pd.DataFrame([input_data_dict])
        features = ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"]
        input_df = input_df[features]
        prediction = model.predict(input_df)[0]
        return {"segment_label": cluster_map.get(prediction, "Unknown"), "cluster_id": int(prediction)}
    except FileNotFoundError:
        return {"error": "Model file (policy_segmentation_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 13. HEALTHCARE PERFORMANCE
# =====================================================================


def predict_healthcare_performance(
    input_data_dict: dict, model_path="healthcare_performance_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        features = ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"]
        input_df = input_df[features]
        prediction = model.predict(input_df)[0]
        score = max(0, min(100, round(prediction, 1)))
        return {"predicted_performance_score": score}
    except FileNotFoundError:
        return {"error": "Model file (healthcare_performance_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 14. ANOMALY DETECTION
# =====================================================================


def predict_anomaly(input_data_dict: dict, model_path="anomaly_detection_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        is_anomaly = prediction == -1
        return {
            "is_anomaly": bool(is_anomaly),
            "message": "Unusual pattern detected!" if is_anomaly else "Data pattern appears normal.",
        }
    except FileNotFoundError:
        return {"error": "Model file (anomaly_detection_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 15. HOSPITAL SEVERITY
# =====================================================================


def _severity_from_text(text: str) -> str:
    """Keyword-based triage fallback used when the severity model is missing
    its required feature columns."""
    lowered = (text or "").lower()
    critical_kw = ["cardiac arrest", "unconscious", "no pulse", "not breathing",
                   "severe bleeding", "massive", "multi-organ", "intubat", "gcs 3"]
    high_kw = ["chest pain", "difficulty breathing", "shortness of breath", "stroke",
               "severe", "bp 160", "bp 180", "unresponsive", "fracture", "trauma",
               "seizure", "oxygen", "spo2", "critical"]
    moderate_kw = ["moderate", "bleeding", "fever", "pain", "vomiting", "nausea",
                   "high bp", "elevated", "diabetic"]
    if any(k in lowered for k in critical_kw):
        return "Critical"
    if any(k in lowered for k in high_kw):
        return "High"
    if any(k in lowered for k in moderate_kw):
        return "Moderate"
    return "Low"


def predict_hospital_severity(
    input_data_dict: dict, model_path="hospital_severity_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        return {"predicted_severity": str(prediction)}
    except FileNotFoundError:
        return {"error": "Model file (hospital_severity_model.joblib) not found."}
    except Exception as e:
        # The severity model requires structured vitals (age, heart_rate,
        # blood_pressure_systolic, distance_km, emergency_type). When callers
        # only provide free text (message) or the model dependency is missing,
        # fall back to keyword triage instead of returning a broken payload.
        try:
            message = str(input_data_dict.get("message") or "")
            level = _severity_from_text(message)
            score_map = {"Critical": 92, "High": 74, "Moderate": 48, "Low": 25}
            return {
                "predicted_severity": level,
                "severity_score": score_map[level],
                "fallback": True,
                "fallback_reason": str(e),
            }
        except Exception:
            return {"error": f"Prediction error: {e}"}


# =====================================================================
# 16. ETA / ROUTE
# =====================================================================


def predict_eta_route(input_data_dict: dict, model_path="eta_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        distance_km = input_data_dict.get("distance_km")

        # Build input with defaults for new model features (backward compatible).
        # Retrained model expects: distance_km, day_of_week, time_of_day,
        #   traffic_level, emergency_type, weather_condition
        # Callers may still send old features: distance_km, precipitation_mm, wind_kph, hour
        _hour = int(input_data_dict.get("hour", 12))
        _tod_map = {6: "Early Morning", 10: "Late Morning", 14: "Afternoon", 19: "Evening", 23: "Night"}
        traffic_val = (
            "heavy" if _hour in (7, 8, 9, 17, 18, 19)
            else "moderate" if _hour in (6, 10, 11, 15, 16, 20)
            else "low"
        )

        def _build_eta_row(dist):
            return {
                "distance_km": float(dist),
                "day_of_week": int(input_data_dict.get("day_of_week", 2)),
                "time_of_day": str(input_data_dict.get("time_of_day", _tod_map.get(_hour, "Afternoon"))),
                "traffic_level": str(input_data_dict.get("traffic_level", traffic_val)),
                "emergency_type": str(input_data_dict.get("emergency_type", "medical_emergency")),
                "weather_condition": str(input_data_dict.get("weather_condition", "clear")),
            }

        if distance_km is not None:
            ml_input = pd.DataFrame([_build_eta_row(distance_km)])
            try:
                eta_minutes = float(model.predict(ml_input)[0])
            except Exception:
                base_speed = max(18, 40 - (float(input_data_dict.get("precipitation_mm", 0)) * 1.5))
                eta_minutes = (float(distance_km) / base_speed) * 60
            return {"eta_minutes": round(eta_minutes, 2)}

        import networkx as nx

        G = _get_city_graph()
        start_node = input_data_dict.get("start_node")
        end_node = input_data_dict.get("end_node")
        if start_node not in G or end_node not in G:
            return {"error": f"Invalid node. Must be one of: {list(G.nodes())}"}
        path = nx.dijkstra_path(G, source=start_node, target=end_node, weight="weight")
        base_time = nx.dijkstra_path_length(
            G, source=start_node, target=end_node, weight="weight"
        )
        ml_input = pd.DataFrame([_build_eta_row(base_time)])
        try:
            eta_minutes = float(model.predict(ml_input)[0])
        except Exception:
            eta_minutes = base_time
        return {
            "route": path,
            "base_minutes": round(base_time, 2),
            "eta_minutes": round(eta_minutes, 2),
        }
    except FileNotFoundError:
        return {"error": "Model file (eta_model.joblib) not found."}
    except ImportError:
        return {"error": "networkx library required for route planning."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 17. BED FORECAST
# =====================================================================


def predict_bed_forecast(input_data_dict: dict, model_path="bed_forecast_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        return {"predicted_bed_demand": round(float(prediction), 2)}
    except FileNotFoundError:
        return {"error": "Model file (bed_forecast_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 18. STAFF ALLOCATION
# =====================================================================


def predict_staff_allocation(
    input_data_dict: dict, model_path="staff_allocation_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        return {"allocation_decision": str(prediction)}
    except FileNotFoundError:
        return {"error": "Model file (staff_allocation_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 19. HOSPITAL PERFORMANCE
# =====================================================================


def predict_hospital_performance(
    input_data_dict: dict, model_path="hospital_performance_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        cluster_map = {0: "Needs Improvement", 1: "High-performing", 2: "Average"}
        input_df = pd.DataFrame([input_data_dict])
        features = [
            "avg_response_time",
            "treatment_success_rate",
            "patient_satisfaction",
            "resource_utilization",
        ]
        input_df = input_df[features]
        prediction = model.predict(input_df)[0]
        return {
            "performance_cluster": cluster_map.get(int(prediction), "Unknown"),
            "cluster_id": int(prediction),
        }
    except FileNotFoundError:
        return {"error": "Model file (hospital_performance_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 20. RECOVERY PROBABILITY
# =====================================================================


def predict_recovery(input_data_dict: dict, model_path="recovery_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict_proba(input_df)[0][1]
        return {"recovery_probability": round(prediction, 4)}
    except FileNotFoundError:
        return {"error": "Model file (recovery_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 21. STAY DURATION
# =====================================================================


def predict_stay_duration(input_data_dict: dict, model_path="stay_duration_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)
        required_columns = ["age", "bmi", "heart_rate", "blood_pressure", "diagnosis", "treatment_type"]
        input_data = {col: input_data_dict.get(col) for col in required_columns}
        input_df = pd.DataFrame([input_data])
        prediction = model.predict(input_df)[0]
        return {"predicted_stay_days": int(max(1, round(prediction)))}
    except FileNotFoundError:
        return {"error": "Model file (stay_duration_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 22. HOSPITAL DISEASE FORECAST
# =====================================================================


def predict_hospital_disease_forecast(
    input_data_dict: dict, model_path="hospital_disease_models.joblib"
) -> dict:
    try:
        models = joblib.load(model_path)
        hospital_id = input_data_dict.get("hospital_id")
        disease_name = input_data_dict.get("disease_name")
        days = int(input_data_dict.get("days_to_predict", 30))
        key = (hospital_id, disease_name)
        if key not in models:
            return {"error": f"No model found for hospital {hospital_id}, disease {disease_name}."}
        m = models[key]
        future = m.make_future_dataframe(periods=days)
        forecast = m.predict(future)
        results = []
        for _, row in forecast.tail(days).iterrows():
            results.append(
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "predicted_cases": round(max(0, row["yhat"])),
                    "confidence_low": round(max(0, row["yhat_lower"])),
                    "confidence_high": round(max(0, row["yhat_upper"])),
                }
            )
        return {"hospital_id": hospital_id, "disease_name": disease_name, "forecast": results}
    except FileNotFoundError:
        return {"error": "Model file (hospital_disease_models.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 23. INVENTORY PREDICTION
# =====================================================================


def predict_inventory(input_data_dict: dict, model_path="inventory_prediction_model.joblib") -> dict:
    try:
        model = joblib.load(model_path)

        def _safe_int(value, fallback=0):
            try:
                if value is None:
                    return fallback
                if isinstance(value, str) and not value.strip():
                    return fallback
                return int(value)
            except (TypeError, ValueError):
                return fallback

        def _safe_float(value, fallback=0.0):
            try:
                if value is None:
                    return fallback
                if isinstance(value, str) and not value.strip():
                    return fallback
                return float(value)
            except (TypeError, ValueError):
                return fallback

        # Build input with defaults for new features (retrained model uses richer features)
        # The new model expects: quantity, minThreshold, daily_usage, lead_time_days,
        #   supplier_reliability, category
        # But callers may only send: quantity, minThreshold, category
        current_qty = _safe_int(input_data_dict.get("quantity", 0))
        min_threshold = _safe_int(input_data_dict.get("minThreshold", 0))
        category = input_data_dict.get("category", "Consumables") or "Consumables"

        input_data = {
            "quantity": current_qty,
            "minThreshold": min_threshold,
            "daily_usage": _safe_float(input_data_dict.get("daily_usage", 15)),
            "lead_time_days": _safe_int(input_data_dict.get("lead_time_days", 7)),
            "supplier_reliability": _safe_float(input_data_dict.get("supplier_reliability", 0.85)),
            "category": category,
        }
        input_df = pd.DataFrame([input_data])
        prediction = model.predict(input_df)[0]

        # Rule-based calculations for additional insights
        if current_qty < min_threshold:
            depletion_rate = 0.7
        elif current_qty < min_threshold * 2:
            depletion_rate = 0.5
        else:
            depletion_rate = 0.3

        predicted_stock = max(0, int(current_qty * (1 - depletion_rate)))
        items_used_per_week = current_qty - predicted_stock
        usage_rate_per_day = max(0.1, round(items_used_per_week / 7, 2))
        days_until_stockout = (
            max(0, int(current_qty / usage_rate_per_day))
            if usage_rate_per_day > 0 and current_qty > 0
            else 999
        )

        if current_qty == 0 or current_qty <= min_threshold:
            status = "Critical - Order Immediately"
            action = "urgent_reorder"
        elif current_qty <= min_threshold * 1.5:
            status = "Low - Plan Reorder"
            action = "plan_reorder"
        else:
            status = "Adequate Supply"
            action = "maintain"

        return {
            "item_name": input_data_dict.get("name", "Unknown"),
            "current_quantity": current_qty,
            "min_threshold": min_threshold,
            "category": category,
            "predicted_next_week_stock": max(0, round(prediction)),
            "days_left": days_until_stockout,
            "usage_rate_per_day": usage_rate_per_day,
            "status": status,
            "action": action,
            "recommendation": (
                f"Order immediately! Only {days_until_stockout} days of stock left."
                if action == "urgent_reorder"
                else (
                    f"Plan order soon. Current stock: {current_qty} units."
                    if action == "plan_reorder"
                    else f"Stock level adequate at {current_qty} units."
                )
            ),
        }
    except FileNotFoundError:
        return {"error": "Model file (inventory_prediction_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 24. KAGGLE BED FORECAST
# =====================================================================


def predict_kaggle_bed_forecast(
    input_data_dict: dict, model_path="kaggle_bed_forecast_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        return {"predicted_bed_demand": round(float(prediction), 2)}
    except FileNotFoundError:
        return {"error": "Model file (kaggle_bed_forecast_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 25. KAGGLE ETA
# =====================================================================


def predict_kaggle_eta(
    input_data_dict: dict, model_path="kaggle_eta_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        return {"eta_minutes": round(float(prediction), 2)}
    except FileNotFoundError:
        return {"error": "Model file (kaggle_eta_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 26. ADMISSION PREDICTION
# =====================================================================


def predict_admission(
    input_data_dict: dict, model_path="admission_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = int(model.predict(input_df)[0])
        proba = model.predict_proba(input_df)[0][1]
        return {
            "admitted": bool(prediction),
            "admission_probability": round(float(proba), 4),
        }
    except FileNotFoundError:
        return {"error": "Model file (admission_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}


# =====================================================================
# 27. HOSPITAL CAPACITY
# =====================================================================


def predict_hospital_capacity(
    input_data_dict: dict, model_path="hospital_capacity_model.joblib"
) -> dict:
    try:
        model = joblib.load(model_path)
        input_df = pd.DataFrame([input_data_dict])
        prediction = model.predict(input_df)[0]
        return {"predicted_monthly_footfall": int(max(0, round(prediction)))}
    except FileNotFoundError:
        return {"error": "Model file (hospital_capacity_model.joblib) not found."}
    except Exception as e:
        return {"error": f"Prediction error: {e}"}
