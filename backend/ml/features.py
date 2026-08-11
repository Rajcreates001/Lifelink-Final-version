"""
LifeLink ML — Shared Feature Definitions
==========================================
Centralized constants, model paths, and feature configs used by
both training and prediction modules.

Every model definition includes:
  - key: unique command name (e.g. "predict_severity")
  - model_file: .joblib filename
  - default_csv: training dataset filename (empty string if not CSV-based)
  - numerical_features: list of numerical column names
  - categorical_features: list of categorical column names
  - target: target column name (empty string for unsupervised)
"""

from typing import TypedDict


class ModelConfig(TypedDict, total=False):
    model_file: str
    default_csv: str
    numerical_features: list[str]
    categorical_features: list[str]
    target: str
    source: str  # e.g. "kaggle/hospital_beds"
    rows: int   # number of training rows
    description: str  # human-readable description


# ─── Severity Score Maps ──────────────────────────────────────────

SEVERITY_LABEL_MAP = {0: "critical", 1: "high", 2: "low", 3: "moderate"}
SEVERITY_SCORE_MAP = {"critical": 95, "high": 80, "moderate": 60, "low": 35}

# ─── Model Registry ───────────────────────────────────────────────

MODEL_CONFIGS: dict[str, ModelConfig] = {
    # Emergency Alert Classifier (Naive Bayes / TF-IDF)
    "emergency_classifier": {
        "model_file": "emergency_classifier.joblib",
        "default_csv": "911_calls.csv",
    },
    # Donor Compatibility (Logistic Regression)
    "compatibility": {
        "model_file": "compatibility_model.joblib",
        "default_csv": "compatibility_data.csv",
        "numerical_features": ["receiver_age", "donor_age", "location_distance"],
        "categorical_features": ["receiver_blood_type", "receiver_gender", "donor_blood_type", "donor_gender", "organ_type"],
        "target": "is_compatible",
    },
    # Hospital Recommendation (RandomForest Classifier)
    "hospital_recommendation": {
        "model_file": "hospital_recommendation_model.joblib",
        "default_csv": "hospital_data.csv",
        "numerical_features": ["distance_km", "traffic_level", "hospital_rating"],
        "categorical_features": ["emergency_type"],
        "target": "is_best_choice",
    },
    # Health Risk (XGBoost Classifier)
    "health_risk": {
        "model_file": "health_risk_model.joblib",
        "default_csv": "health_risk_data_expanded.csv",
        "numerical_features": ["age", "bmi", "blood_pressure", "heart_rate", "has_condition"],
        "categorical_features": ["lifestyle_factor"],
        "target": "risk_level",
    },
    # Activity Cluster (K-Means)
    "activity_cluster": {
        "model_file": "activity_cluster_model.joblib",
        "default_csv": "user_activity_data.csv",
        "numerical_features": ["sos_usage", "donations_made", "health_logs"],
    },
    # Behavior Forecast (Linear Regression)
    "behavior_forecast": {
        "model_file": "behavior_forecast_model.joblib",
        "default_csv": "user_forecast_data.csv",
        "numerical_features": ["past_donations"],
        "target": "future_donations",
    },
    # Emergency Hotspot (K-Means clustering on lat/lng/time)
    "emergency_hotspot": {
        "model_file": "emergency_hotspot_model.joblib",
        "default_csv": "emergency_hotspot_data.csv",
        "numerical_features": ["lat", "lng", "hour_of_day"],
        "categorical_features": ["emergency_type", "severity"],
    },
    # Disease Outbreak Forecast (Prophet + XGBoost fallback)
    "outbreak_forecast": {
        "model_file": "outbreak_forecast_models.joblib",
        "default_csv": "outbreak_expanded.csv",
    },
    "outbreak_prophet": {
        "model_file": "outbreak_prophet.joblib",
        "default_csv": "outbreak_expanded.csv",
    },
    # Emergency Severity (XGBoost multi-class — clinical features)
    "emergency_severity": {
        "model_file": "emergency_severity_model.joblib",
        "default_csv": "emergency_severity_expanded.csv",
        "numerical_features": [
            "heart_rate", "blood_pressure_sys", "oxygen_saturation",
            "respiratory_rate", "age", "glasgow_coma_scale",
        ],
        "categorical_features": ["trauma_type", "chief_complaint"],
        "target": "severity_level",
    },
    # Donor / Organ Availability (RandomForest Regressor)
    "donor_availability": {
        "model_file": "donor_availability_model.joblib",
        "default_csv": "donor_availability_data.csv",
        "numerical_features": ["month", "donation_frequency", "hospital_stock_level"],
        "categorical_features": ["region", "resource_type"],
        "target": "future_availability_score",
    },
    # Resource Allocation (Q-Learning — no CSV)
    "resource_allocation": {
        "model_file": "allocation_q_table.joblib",
    },
    # Policy Segmentation (K-Means)
    "policy_segmentation": {
        "model_file": "policy_segmentation_model.joblib",
        "default_csv": "policy_data.csv",
        "numerical_features": ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"],
    },
    # Healthcare Performance (Linear Regression)
    "healthcare_performance": {
        "model_file": "healthcare_performance_model.joblib",
        "default_csv": "policy_data.csv",
        "numerical_features": ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"],
        "target": "health_outcome_score",
    },
    # Anomaly Detection (Isolation Forest)
    "anomaly_detection": {
        "model_file": "anomaly_detection_model.joblib",
        "default_csv": "anomaly_data.csv",
        "numerical_features": ["daily_emergency_count", "hospital_admissions", "disease_reports"],
        "categorical_features": ["region"],
    },
    # Hospital Severity (RandomForest Classifier)
    "hospital_severity": {
        "model_file": "hospital_severity_model.joblib",
        "default_csv": "hospital_severity_data.csv",
        "numerical_features": ["age", "heart_rate", "blood_pressure_systolic", "distance_km"],
        "categorical_features": ["emergency_type"],
        "target": "severity",
    },
    # ETA (XGBoost Regressor)
    "eta": {
        "model_file": "eta_model.joblib",
        "default_csv": "eta_expanded.csv",
        "numerical_features": ["distance_km", "precipitation_mm", "wind_kph", "hour"],
        "target": "eta_minutes",
    },
    # Bed Forecast (XGBoost Regressor)
    "bed_forecast": {
        "model_file": "bed_forecast_model.joblib",
        "default_csv": "bed_forecast_expanded.csv",
        "numerical_features": ["emergency_count", "disease_case_count", "current_bed_occupancy"],
        "categorical_features": ["hospital_id"],
        "target": "next_week_bed_demand",
    },
    # Staff Allocation (DecisionTree Classifier)
    "staff_allocation": {
        "model_file": "staff_allocation_model.joblib",
        "default_csv": "staff_allocation_data.csv",
        "categorical_features": ["patient_load", "department", "shift"],
        "target": "allocation_decision",
    },
    # Hospital Performance Clustering (K-Means)
    "hospital_performance": {
        "model_file": "hospital_performance_model.joblib",
        "default_csv": "hospital_performance_data.csv",
        "numerical_features": ["avg_response_time", "treatment_success_rate", "patient_satisfaction", "resource_utilization"],
    },
    # Patient Recovery (Logistic Regression)
    "patient_recovery": {
        "model_file": "recovery_model.joblib",
        "default_csv": "patient_outcome_data.csv",
        "numerical_features": ["age", "bmi", "heart_rate", "blood_pressure"],
        "categorical_features": ["diagnosis", "treatment_type"],
        "target": "recovered",
    },
    # Stay Duration (RandomForest Regressor)
    "stay_duration": {
        "model_file": "stay_duration_model.joblib",
        "default_csv": "patient_outcome_data.csv",
        "numerical_features": ["age", "bmi", "heart_rate", "blood_pressure"],
        "categorical_features": ["diagnosis", "treatment_type"],
        "target": "stay_duration_days",
    },
    # Hospital Disease Forecast (Prophet)
    "hospital_disease": {
        "model_file": "hospital_disease_models.joblib",
        "default_csv": "hospital_disease_data.csv",
    },
    # Inventory Prediction (RandomForest Regressor)
    "inventory": {
        "model_file": "inventory_prediction_model.joblib",
        "default_csv": "inventory_expanded.csv",
        "numerical_features": ["quantity", "minThreshold"],
        "categorical_features": ["category"],
        "target": "next_week_stock",
    },

    # ================================================================
    # KAGGLE-INTEGRATED MODELS  (real datasets)
    # ================================================================

    # Kaggle Bed Forecast (derived from kaggle_hospital_beds.csv)
    "kaggle_bed_forecast": {
        "model_file": "kaggle_bed_forecast_model.joblib",
        "default_csv": "kaggle_bed_forecast_train.csv",
        "numerical_features": ["emergency_count", "disease_case_count", "current_bed_occupancy"],
        "categorical_features": ["hospital_id"],
        "target": "next_week_bed_demand",
        "source": "kaggle/hospital_beds",
        "rows": 55,
    },

    # Kaggle ETA (derived from kaggle_er_wait_time.csv - 5000 real ER wait records)
    "kaggle_eta": {
        "model_file": "kaggle_eta_model.joblib",
        "default_csv": "kaggle_eta_train.csv",
        "numerical_features": [
            "distance_km", "hour", "nurse_to_patient_ratio",
            "specialist_availability", "facility_beds",
            "time_to_registration", "time_to_triage",
        ],
        "categorical_features": ["emergency_type", "traffic_level"],
        "target": "eta_minutes",
        "source": "kaggle/er_wait_time",
        "rows": 5000,
    },

    # Admission Prediction (from kaggle_hospital_emergency.csv - 9216 real ER visits)
    "admission": {
        "model_file": "admission_model.joblib",
        "default_csv": "kaggle_admission_train.csv",
        "numerical_features": ["age", "wait_time_min", "satisfaction_score", "patients_cm"],
        "categorical_features": ["gender_code", "department_referral", "race"],
        "target": "admitted",
        "source": "kaggle/hospital_emergency",
        "rows": 9216,
    },

    # Hospital Capacity (from kaggle_pune_hospitals.csv - 737 real facilities)
    "hospital_capacity": {
        "model_file": "hospital_capacity_model.joblib",
        "default_csv": "kaggle_hospital_resources_train.csv",
        "numerical_features": [
            "beds_total", "doctors", "nurses",
            "monthly_footfall", "bed_occupancy_rate",
            "doctor_to_bed_ratio", "nurse_to_doctor_ratio",
        ],
        "categorical_features": ["class", "type"],
        "target": "monthly_footfall",
        "source": "kaggle/pune_hospitals",
        "rows": 737,
    },
}

# ─── Utility ────────────────────────────────────────────────────────

def get_model_config(key: str) -> ModelConfig | None:
    """Look up a model config by its registry key."""
    return MODEL_CONFIGS.get(key)

def model_file_path(key: str, ml_dir: str = ".") -> str:
    """Get the expected .joblib path for a model key."""
    cfg = MODEL_CONFIGS.get(key)
    if cfg is None:
        return ""
    import os
    return os.path.join(ml_dir, cfg.get("model_file", ""))
