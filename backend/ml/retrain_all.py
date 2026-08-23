#!/usr/bin/env python3
"""
LifeLink ML — Comprehensive Model Retrainer
=============================================
Retrains ALL models that have expanded or Kaggle datasets available.
Reports accuracy metrics for each model.

Usage:
    cd backend
    python ml/retrain_all.py
"""
import os
import sys
import json
import time
import warnings

warnings.filterwarnings("ignore")

# Ensure sibling modules are importable
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error, classification_report

# Try importing xgboost
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from features import MODEL_CONFIGS

RESULTS = []


def log_result(model_name, status, accuracy=None, r2=None, mae=None, rows=None, extra=None):
    result = {
        "model": model_name,
        "status": status,
        "accuracy": accuracy,
        "r2": r2,
        "mae": mae,
        "rows": rows,
        "extra": extra,
    }
    RESULTS.append(result)
    acc_str = f"acc={accuracy:.4f}" if accuracy is not None else ""
    r2_str = f"R2={r2:.4f}" if r2 is not None else ""
    mae_str = f"MAE={mae:.2f}" if mae is not None else ""
    rows_str = f"rows={rows}" if rows else ""
    metrics = " | ".join(filter(None, [acc_str, r2_str, mae_str, rows_str]))
    icon = "[OK]" if status == "PASS" else "[FAIL]"
    print(f"  {icon} {model_name:35s} {metrics}")


def train_health_risk():
    """Health Risk Model — XGBoost classifier"""
    csv = os.path.join(_this_dir, "health_risk_data_expanded.csv")
    if not os.path.exists(csv):
        csv = os.path.join(_this_dir, "health_risk_data.csv")
    if not os.path.exists(csv):
        log_result("health_risk", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    # Map expanded column names to expected names
    if "blood_pressure_sys" in df.columns and "blood_pressure" not in df.columns:
        df["blood_pressure"] = df["blood_pressure_sys"]
    if "smoking" in df.columns and "has_condition" not in df.columns:
        df["has_condition"] = df["smoking"].apply(lambda x: 1 if str(x).lower() in ("yes", "1", "true") else 0)
    if "exercise_hours_week" in df.columns and "lifestyle_factor" not in df.columns:
        df["lifestyle_factor"] = df["exercise_hours_week"].apply(
            lambda x: "active" if float(x or 0) > 3 else "sedentary" if float(x or 0) < 1 else "moderate")
    if "risk_level" not in df.columns:
        # Generate target from vitals
        df["risk_level"] = "Low"
        df.loc[(df.get("blood_pressure", 0) > 140) | (df.get("heart_rate", 0) > 100), "risk_level"] = "Medium"
        df.loc[(df.get("blood_pressure", 0) > 160) | (df.get("heart_rate", 0) > 120) | (df.get("age", 0) > 70), "risk_level"] = "High"
        df.loc[(df.get("blood_pressure", 0) > 180) | (df.get("heart_rate", 0) > 140), "risk_level"] = "Critical"

    num_features = ["age", "bmi", "blood_pressure", "heart_rate", "has_condition"]
    cat_features = ["lifestyle_factor"]
    target = "risk_level"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("health_risk", "SKIP", extra="no target column")
        return

    X = df[features].copy()
    y = df[target].copy()

    # Encode categoricals
    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    if HAS_XGBOOST:
        model = xgb.XGBClassifier(
            n_estimators=100, max_depth=6, learning_rate=0.1,
            use_label_encoder=False, eval_metric="mlogloss",
            random_state=42, verbosity=0,
        )
    else:
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "health_risk_model.joblib")
    joblib.dump(model, out_path)
    log_result("health_risk", "PASS", accuracy=acc, rows=len(df))


def train_bed_forecast():
    """Bed Forecast — XGBoost regressor"""
    csv = os.path.join(_this_dir, "bed_forecast_expanded.csv")
    if not os.path.exists(csv):
        log_result("bed_forecast", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    # Map expanded column names
    if "incoming_patients_24h" in df.columns and "emergency_count" not in df.columns:
        df["emergency_count"] = df["incoming_patients_24h"]
    if "discharges_24h" in df.columns and "disease_case_count" not in df.columns:
        df["disease_case_count"] = df["discharges_24h"]
    if "current_occupancy" in df.columns and "current_bed_occupancy" not in df.columns:
        df["current_bed_occupancy"] = df["current_occupancy"]
    if "hospital_capacity" in df.columns and "hospital_id" not in df.columns:
        df["hospital_id"] = df["hospital_capacity"]
    if "next_week_bed_demand" not in df.columns:
        if "predicted_demand_24h" in df.columns:
            df["next_week_bed_demand"] = df["predicted_demand_24h"]
        else:
            df["next_week_bed_demand"] = df.get("current_occupancy", 0) + df.get("incoming_patients_24h", 0) - df.get("discharges_24h", 0)

    num_features = ["emergency_count", "disease_case_count", "current_bed_occupancy"]
    cat_features = ["hospital_id"]
    target = "next_week_bed_demand"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("bed_forecast", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    if HAS_XGBOOST:
        model = xgb.XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1,
            random_state=42, verbosity=0,
        )
    else:
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    out_path = os.path.join(_this_dir, "bed_forecast_model.joblib")
    joblib.dump(model, out_path)
    log_result("bed_forecast", "PASS", r2=r2, mae=mae, rows=len(df))


def train_eta():
    """ETA Model — XGBoost regressor"""
    csv = os.path.join(_this_dir, "eta_expanded.csv")
    if not os.path.exists(csv):
        log_result("eta", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    # Map expanded column names
    if "actual_time_minutes" in df.columns and "eta_minutes" not in df.columns:
        df["eta_minutes"] = df["actual_time_minutes"]
    if "traffic_level" in df.columns and df["traffic_level"].dtype == object:
        df["traffic_level"] = df["traffic_level"].map({"low": 1, "medium": 2, "high": 3, "Light": 1, "Moderate": 2, "Heavy": 3}).fillna(2)
    if "time_of_day" in df.columns and "hour" not in df.columns:
        df["hour"] = pd.to_numeric(df["time_of_day"], errors="coerce").fillna(12)
    if "base_time_minutes" in df.columns and "precipitation_mm" not in df.columns:
        df["precipitation_mm"] = 0
    if "wind_kph" not in df.columns:
        df["wind_kph"] = 0

    num_features = ["distance_km", "precipitation_mm", "wind_kph", "hour"]
    target = "eta_minutes"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    available_num = [c for c in num_features if c in df.columns]
    if target not in df.columns:
        log_result("eta", "SKIP", extra="no target")
        return

    X = df[available_num].copy()
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    if HAS_XGBOOST:
        model = xgb.XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1,
            random_state=42, verbosity=0,
        )
    else:
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    out_path = os.path.join(_this_dir, "eta_model.joblib")
    joblib.dump(model, out_path)
    log_result("eta", "PASS", r2=r2, mae=mae, rows=len(df))


def train_emergency_severity():
    """Emergency Severity — multi-class classifier"""
    csv = os.path.join(_this_dir, "emergency_severity_expanded.csv")
    if not os.path.exists(csv):
        csv = os.path.join(_this_dir, "emergency_severity_data.csv")
    if not os.path.exists(csv):
        log_result("emergency_severity", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["heart_rate", "blood_pressure_sys", "oxygen_saturation",
                     "respiratory_rate", "age", "glasgow_coma_scale"]
    cat_features = ["trauma_type", "chief_complaint"]
    target = "severity_level"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("emergency_severity", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = df[target].copy()

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.ensemble import RandomForestClassifier
    model = RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "emergency_severity_model.joblib")
    joblib.dump(model, out_path)
    log_result("emergency_severity", "PASS", accuracy=acc, rows=len(df))


def train_inventory():
    """Inventory Prediction — RandomForest regressor"""
    csv = os.path.join(_this_dir, "inventory_expanded.csv")
    if not os.path.exists(csv):
        csv = os.path.join(_this_dir, "inventory_data.csv")
    if not os.path.exists(csv):
        log_result("inventory", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    # Map expanded column names
    if "current_stock" in df.columns and "quantity" not in df.columns:
        df["quantity"] = df["current_stock"]
    if "reorder_point" in df.columns and "minThreshold" not in df.columns:
        df["minThreshold"] = df["reorder_point"]
    if "next_week_stock" not in df.columns:
        # Predict days until stockout based on current stock and daily usage
        if "days_until_stockout" in df.columns:
            df["next_week_stock"] = df["current_stock"] - (df["daily_usage"] * 7)
        else:
            df["next_week_stock"] = df.get("current_stock", 100) - df.get("daily_usage", 10) * 7

    num_features = ["quantity", "minThreshold"]
    cat_features = ["category"]
    target = "next_week_stock"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("inventory", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.ensemble import RandomForestRegressor
    model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    out_path = os.path.join(_this_dir, "inventory_prediction_model.joblib")
    joblib.dump(model, out_path)
    log_result("inventory", "PASS", r2=r2, mae=mae, rows=len(df))


def train_compatibility():
    """Donor Compatibility — Logistic Regression"""
    csv = os.path.join(_this_dir, "compatibility_data.csv")
    if not os.path.exists(csv):
        log_result("compatibility", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["receiver_age", "donor_age", "location_distance"]
    cat_features = ["receiver_blood_type", "receiver_gender", "donor_blood_type", "donor_gender", "organ_type"]
    target = "is_compatible"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("compatibility", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = df[target].copy()

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.linear_model import LogisticRegression
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "compatibility_model.joblib")
    joblib.dump(model, out_path)
    log_result("compatibility", "PASS", accuracy=acc, rows=len(df))


def train_hospital_recommendation():
    """Hospital Recommendation — RandomForest"""
    csv = os.path.join(_this_dir, "hospital_data.csv")
    if not os.path.exists(csv):
        log_result("hospital_recommendation", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["distance_km", "traffic_level", "hospital_rating"]
    cat_features = ["emergency_type"]
    target = "is_best_choice"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("hospital_recommendation", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = df[target].copy()

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.ensemble import RandomForestClassifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "hospital_recommendation_model.joblib")
    joblib.dump(model, out_path)
    log_result("hospital_recommendation", "PASS", accuracy=acc, rows=len(df))


def train_activity_cluster():
    """Activity Cluster — KMeans"""
    csv = os.path.join(_this_dir, "user_activity_data.csv")
    if not os.path.exists(csv):
        log_result("activity_cluster", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    features = ["sos_usage", "donations_made", "health_logs"]
    available = [c for c in features if c in df.columns]

    if len(available) < 2:
        log_result("activity_cluster", "SKIP", extra="insufficient features")
        return

    X = df[available].copy()
    for col in available:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_clusters = min(5, len(X) // 10) if len(X) > 10 else 2
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    model.fit(X_scaled)

    out_path = os.path.join(_this_dir, "activity_cluster_model.joblib")
    joblib.dump(model, out_path)
    log_result("activity_cluster", "PASS", rows=len(df), extra=f"k={n_clusters}")


def train_behavior_forecast():
    """Behavior Forecast — Linear Regression"""
    csv = os.path.join(_this_dir, "user_forecast_data.csv")
    if not os.path.exists(csv):
        log_result("behavior_forecast", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    target = "future_donations"
    features = ["past_donations"]
    available = [c for c in features if c in df.columns]

    if target not in df.columns or not available:
        log_result("behavior_forecast", "SKIP", extra="no target/features")
        return

    X = pd.to_numeric(df[available[0]], errors="coerce").fillna(0).values.reshape(-1, 1)
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.linear_model import LinearRegression
    model = LinearRegression()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "behavior_forecast_model.joblib")
    joblib.dump(model, out_path)
    log_result("behavior_forecast", "PASS", r2=r2, rows=len(df))


def train_emergency_hotspot():
    """Emergency Hotspot — KMeans clustering"""
    csv = os.path.join(_this_dir, "emergency_hotspot_data.csv")
    if not os.path.exists(csv):
        log_result("emergency_hotspot", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    features = ["lat", "lng", "hour_of_day"]
    available = [c for c in features if c in df.columns]

    if len(available) < 2:
        log_result("emergency_hotspot", "SKIP", extra="insufficient features")
        return

    X = df[available].copy()
    for col in available:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_clusters = min(8, len(X) // 20) if len(X) > 20 else 3
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    model.fit(X_scaled)

    out_path = os.path.join(_this_dir, "emergency_hotspot_model.joblib")
    joblib.dump(model, out_path)
    log_result("emergency_hotspot", "PASS", rows=len(df), extra=f"k={n_clusters}")


def train_policy_segmentation():
    """Policy Segmentation — KMeans"""
    csv = os.path.join(_this_dir, "policy_data.csv")
    if not os.path.exists(csv):
        log_result("policy_segmentation", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    features = ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"]
    available = [c for c in features if c in df.columns]

    if len(available) < 2:
        log_result("policy_segmentation", "SKIP", extra="insufficient features")
        return

    X = df[available].copy()
    for col in available:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_clusters = min(4, len(X) // 10) if len(X) > 10 else 2
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    model.fit(X_scaled)

    out_path = os.path.join(_this_dir, "policy_segmentation_model.joblib")
    joblib.dump(model, out_path)
    log_result("policy_segmentation", "PASS", rows=len(df), extra=f"k={n_clusters}")


def train_healthcare_performance():
    """Healthcare Performance — Linear Regression"""
    csv = os.path.join(_this_dir, "policy_data.csv")
    if not os.path.exists(csv):
        log_result("healthcare_performance", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    features = ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"]
    target = "health_outcome_score"
    available = [c for c in features if c in df.columns]

    if target not in df.columns or not available:
        log_result("healthcare_performance", "SKIP", extra="no target/features")
        return

    X = df[available].copy()
    for col in available:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.linear_model import LinearRegression
    model = LinearRegression()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "healthcare_performance_model.joblib")
    joblib.dump(model, out_path)
    log_result("healthcare_performance", "PASS", r2=r2, rows=len(df))


def train_anomaly_detection():
    """Anomaly Detection — Isolation Forest"""
    csv = os.path.join(_this_dir, "anomaly_data.csv")
    if not os.path.exists(csv):
        log_result("anomaly_detection", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    features = ["daily_emergency_count", "hospital_admissions", "disease_reports"]
    available = [c for c in features if c in df.columns]

    if len(available) < 2:
        log_result("anomaly_detection", "SKIP", extra="insufficient features")
        return

    X = df[available].copy()
    for col in available:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    model.fit(X_scaled)

    out_path = os.path.join(_this_dir, "anomaly_detection_model.joblib")
    joblib.dump(model, out_path)
    log_result("anomaly_detection", "PASS", rows=len(df))


def train_hospital_severity():
    """Hospital Severity — RandomForest"""
    csv = os.path.join(_this_dir, "hospital_severity_data.csv")
    if not os.path.exists(csv):
        log_result("hospital_severity", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["age", "heart_rate", "blood_pressure_systolic", "distance_km"]
    cat_features = ["emergency_type"]
    target = "severity"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("hospital_severity", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = df[target].copy()

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.ensemble import RandomForestClassifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "hospital_severity_model.joblib")
    joblib.dump(model, out_path)
    log_result("hospital_severity", "PASS", accuracy=acc, rows=len(df))


def train_staff_allocation():
    """Staff Allocation — Decision Tree"""
    csv = os.path.join(_this_dir, "staff_allocation_data.csv")
    if not os.path.exists(csv):
        log_result("staff_allocation", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    cat_features = ["patient_load", "department", "shift"]
    target = "allocation_decision"

    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available = [c for c in cat_features if c in df.columns]

    if target not in df.columns or not available:
        log_result("staff_allocation", "SKIP", extra="no target/features")
        return

    X = df[available].copy()
    y = df[target].copy()

    for col in available:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.tree import DecisionTreeClassifier
    model = DecisionTreeClassifier(max_depth=8, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "staff_allocation_model.joblib")
    joblib.dump(model, out_path)
    log_result("staff_allocation", "PASS", accuracy=acc, rows=len(df))


def train_hospital_performance():
    """Hospital Performance — KMeans clustering"""
    csv = os.path.join(_this_dir, "hospital_performance_data.csv")
    if not os.path.exists(csv):
        log_result("hospital_performance", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    features = ["avg_response_time", "treatment_success_rate", "patient_satisfaction", "resource_utilization"]
    available = [c for c in features if c in df.columns]

    if len(available) < 2:
        log_result("hospital_performance", "SKIP", extra="insufficient features")
        return

    X = df[available].copy()
    for col in available:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_clusters = min(4, len(X) // 10) if len(X) > 10 else 2
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    model.fit(X_scaled)

    out_path = os.path.join(_this_dir, "hospital_performance_model.joblib")
    joblib.dump(model, out_path)
    log_result("hospital_performance", "PASS", rows=len(df), extra=f"k={n_clusters}")


def train_recovery():
    """Patient Recovery — Logistic Regression"""
    csv = os.path.join(_this_dir, "patient_outcome_data.csv")
    if not os.path.exists(csv):
        log_result("recovery", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["age", "bmi", "heart_rate", "blood_pressure"]
    cat_features = ["diagnosis", "treatment_type"]
    target = "recovered"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("recovery", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = df[target].copy()

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.linear_model import LogisticRegression
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "recovery_model.joblib")
    joblib.dump(model, out_path)
    log_result("recovery", "PASS", accuracy=acc, rows=len(df))


def train_stay_duration():
    """Stay Duration — RandomForest Regressor"""
    csv = os.path.join(_this_dir, "patient_outcome_data.csv")
    if not os.path.exists(csv):
        log_result("stay_duration", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["age", "bmi", "heart_rate", "blood_pressure"]
    cat_features = ["diagnosis", "treatment_type"]
    target = "stay_duration_days"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("stay_duration", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.ensemble import RandomForestRegressor
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    out_path = os.path.join(_this_dir, "stay_duration_model.joblib")
    joblib.dump(model, out_path)
    log_result("stay_duration", "PASS", r2=r2, mae=mae, rows=len(df))


def train_donor_availability():
    """Donor Availability — RandomForest Regressor"""
    csv = os.path.join(_this_dir, "donor_availability_data.csv")
    if not os.path.exists(csv):
        log_result("donor_availability", "SKIP", extra="no dataset")
        return

    df = pd.read_csv(csv)
    num_features = ["month", "donation_frequency", "hospital_stock_level"]
    cat_features = ["region", "resource_type"]
    target = "future_availability_score"

    for col in num_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in cat_features:
        if col in df.columns:
            df[col] = df[col].fillna("unknown")

    available_num = [c for c in num_features if c in df.columns]
    available_cat = [c for c in cat_features if c in df.columns]
    features = available_num + available_cat

    if target not in df.columns:
        log_result("donor_availability", "SKIP", extra="no target")
        return

    X = df[features].copy()
    y = pd.to_numeric(df[target], errors="coerce").fillna(0)

    for col in available_cat:
        X[col] = X[col].astype("category").cat.codes

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    from sklearn.ensemble import RandomForestRegressor
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)

    out_path = os.path.join(_this_dir, "donor_availability_model.joblib")
    joblib.dump(model, out_path)
    log_result("donor_availability", "PASS", r2=r2, rows=len(df))


# ─── Q-Learning Allocation (no CSV needed) ────────────────────────

def train_allocation_qtable():
    """Resource Allocation — Q-Learning table (procedural, no CSV)"""
    import random as rng
    n_states = 10
    n_actions = 4
    q_table = np.zeros((n_states, n_actions))

    # Simple Q-learning training loop
    for episode in range(500):
        state = rng.randint(0, n_states - 1)
        for _ in range(50):
            action = rng.randint(0, n_actions - 1)
            reward = rng.uniform(-1, 1)
            next_state = rng.randint(0, n_states - 1)
            best_next = np.max(q_table[next_state])
            q_table[state, action] += 0.1 * (reward + 0.9 * best_next - q_table[state, action])
            state = next_state

    out_path = os.path.join(_this_dir, "allocation_q_table.joblib")
    joblib.dump(q_table, out_path)
    log_result("allocation_qtable", "PASS", rows=n_states * n_actions, extra="Q-table 10x4")


# ─── Main ─────────────────────────────────────────────────────────

ALL_TRAINERS = [
    ("health_risk", train_health_risk),
    ("bed_forecast", train_bed_forecast),
    ("eta", train_eta),
    ("emergency_severity", train_emergency_severity),
    ("inventory", train_inventory),
    ("compatibility", train_compatibility),
    ("hospital_recommendation", train_hospital_recommendation),
    ("activity_cluster", train_activity_cluster),
    ("behavior_forecast", train_behavior_forecast),
    ("emergency_hotspot", train_emergency_hotspot),
    ("policy_segmentation", train_policy_segmentation),
    ("healthcare_performance", train_healthcare_performance),
    ("anomaly_detection", train_anomaly_detection),
    ("hospital_severity", train_hospital_severity),
    ("staff_allocation", train_staff_allocation),
    ("hospital_performance", train_hospital_performance),
    ("recovery", train_recovery),
    ("stay_duration", train_stay_duration),
    ("donor_availability", train_donor_availability),
    ("allocation_qtable", train_allocation_qtable),
]


def main():
    print("=" * 70)
    print("LifeLink ML — Comprehensive Model Retrainer")
    print("=" * 70)
    print(f"Models to train: {len(ALL_TRAINERS)}")
    print()

    start = time.time()

    for name, trainer in ALL_TRAINERS:
        try:
            trainer()
        except Exception as e:
            log_result(name, "FAIL", extra=str(e)[:100])

    elapsed = time.time() - start

    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    skipped = sum(1 for r in RESULTS if r["status"] == "SKIP")

    print()
    print("=" * 70)
    print(f"RESULTS: {passed} PASS | {failed} FAIL | {skipped} SKIP | {elapsed:.1f}s")
    print("=" * 70)

    # Print accuracy summary
    print("\nAccuracy Summary:")
    for r in RESULTS:
        if r["status"] == "PASS":
            metrics = []
            if r.get("accuracy") is not None:
                metrics.append(f"accuracy={r['accuracy']:.4f}")
            if r.get("r2") is not None:
                metrics.append(f"R2={r['r2']:.4f}")
            if r.get("mae") is not None:
                metrics.append(f"MAE={r['mae']:.2f}")
            if r.get("extra"):
                metrics.append(r["extra"])
            print(f"  {r['model']:35s} {' | '.join(metrics)}")

    # Save results
    results_path = os.path.join(_this_dir, "retrain_results.json")
    with open(results_path, "w") as f:
        json.dump(RESULTS, f, indent=2, default=str)
    print(f"\nResults saved to: {results_path}")


if __name__ == "__main__":
    main()
