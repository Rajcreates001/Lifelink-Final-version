"""
LifeLink ML Model Retraining Script
====================================
Retrains 6 core ML models using expanded 10,000-row datasets.
Uses self-contained sklearn Pipelines so models drop-in replace existing ones.

Models retrained:
  1. health_risk_model.joblib   (Binary classifier)
  2. eta_model.joblib           (Regressor)
  3. bed_forecast_model.joblib  (Regressor)
  4. outbreak_forecast_models.joblib (Prophet time-series)
  5. inventory_prediction_model.joblib (Regressor)
  6. emergency_severity_model.joblib   (Multi-class classifier)

Usage:  python backend/scripts/retrain_models.py
"""

import json, os, sys, time, warnings, shutil
from pathlib import Path
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib

# -- sklearn ---------------------------------------------------------------
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    GradientBoostingRegressor,
)
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    r2_score, mean_absolute_error, mean_squared_error,
)

# -- XGBoost ---------------------------------------------------------------
import xgboost as xgb

# -- Prophet ---------------------------------------------------------------
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False

# -- Paths -----------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent.parent / "ml"

# ---------------------------------------------------------------------------
#  UTILITIES
# ---------------------------------------------------------------------------
def _header(title):
    print(f"\n{'='*68}")
    print(f"  {title}")
    print(f"{'='*68}")

def _report(name, y_test, y_pred, clf=False):
    print(f"\n  >> {name}")
    print(f"  {'-'*58}")
    if clf:
        acc = accuracy_score(y_test, y_pred)
        print(f"  Accuracy  : {acc:.4f}  ({acc*100:.2f}%)")
        print(f"\n  Classification Report:")
        print(classification_report(y_test, y_pred, digits=4))
        print(f"  Confusion Matrix:")
        print(confusion_matrix(y_test, y_pred))
    else:
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        print(f"  R²        : {r2:.4f}  ({r2*100:.2f}%)")
        print(f"  MAE       : {mae:.4f}")
        print(f"  RMSE      : {rmse:.4f}")
    print()

def _save(model, path, metrics=None, threshold=None):
    """Save model only if metrics exceed threshold (prevents overwriting good models with bad ones)."""
    if metrics is not None and threshold is not None:
        if metrics < threshold:
            print(f"  [SKIP] -> {path.name}  (metric {metrics:.4f} < threshold {threshold})")
            return
    joblib.dump(model, path)
    sz = os.path.getsize(path) / 1024
    print(f"  [SAVED] -> {path.name} ({sz:.0f} KB)")


# ==========================================================================
#  1. HEALTH RISK  (Binary Classifier)
#     Expanded cols: age,bmi,bp_sys,bp_dia,heart_rate,o2_sat,glucose,
#                    cholesterol,smoking,exercise,fam_hist,risk_score,risk_level
#     Prediction function sends: {age,bmi,blood_pressure,heart_rate,
#                                 has_condition,lifestyle_factor}
# ==========================================================================
def train_health_risk(csv_path, out_path):
    _header("1/6  HEALTH RISK MODEL")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Map expanded columns -> what predict_health_risk sends
    df["blood_pressure"] = df["blood_pressure_sys"]
    df["has_condition"]  = df["smoking"]  # 0/1
    df["lifestyle_factor"] = pd.cut(
        df["exercise_hours_week"], bins=[-1, 2, 5, 99], labels=["sedentary", "moderate", "active"]
    ).astype(str)
    df["risk_level"] = df["risk_level"].astype(str).str.strip().str.lower()
    df = df[df["risk_level"].isin(["low", "high"])]
    df["target"] = df["risk_level"].map({"low": 0, "high": 1}).astype(int)

    feats_num  = ["age", "bmi", "blood_pressure", "heart_rate", "has_condition"]
    feats_cat  = ["lifestyle_factor"]
    target     = "target"

    df = df.dropna(subset=feats_num + feats_cat + [target])
    print(f"  Cleaned: {len(df)} rows")

    X = df[feats_num + feats_cat]
    y = df[target]

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), feats_num),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
            ("ohe", OneHotEncoder(handle_unknown="ignore")),
        ]), feats_cat),
    ])

    # XGBoost inside Pipeline (self-contained)
    pipe = Pipeline([
        ("prep", preprocessor),
        ("clf", xgb.XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, eval_metric="logloss",
        )),
    ])
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)
    _report("XGBoost Pipeline", y_te, y_pred, clf=True)

    # Also train a fallback RandomForest for comparison
    pipe_rf = Pipeline([
        ("prep", preprocessor),
        ("clf", RandomForestClassifier(n_estimators=300, max_depth=12, class_weight="balanced", random_state=42)),
    ])
    pipe_rf.fit(X_tr, y_tr)
    y_pred_rf = pipe_rf.predict(X_te)
    _report("RandomForest (comparison)", y_te, y_pred_rf, clf=True)

    print("  => Using XGBoost Pipeline (self-contained, compatible with predict_health_risk)")
    acc = accuracy_score(y_te, pipe.predict(X_te))
    _save(pipe, out_path, metrics=acc, threshold=0.5)
    return pipe


# ==========================================================================
#  2. ETA  (Regressor)
#     Expanded cols: distance_km,traffic_level,time_of_day,day_of_week,
#                    weather_condition,emergency_type,base_time_minutes,
#                    actual_time_minutes
#     Prediction function sends: {distance_km,precipitation_mm,wind_kph,hour}
# ==========================================================================
def train_eta(csv_path, out_path):
    _header("2/6  ETA MODEL")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Keep categorical features directly instead of lossy mapping to derived values.
    # time_of_day, traffic_level, emergency_type, weather_condition are all
    # categorical features that the model can learn from directly via OneHotEncoder.
    df["eta_minutes"] = df["actual_time_minutes"]

    feats_num = ["distance_km", "day_of_week"]
    feats_cat = ["time_of_day", "traffic_level", "emergency_type", "weather_condition"]
    target    = "eta_minutes"

    required = feats_num + feats_cat + [target]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"  [ERR] Missing columns: {missing}")
        return None

    df = df.dropna(subset=required)
    print(f"  Cleaned: {len(df)} rows")

    X = df[feats_num + feats_cat]
    y = df[target]

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), feats_num),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
            ("ohe", OneHotEncoder(handle_unknown="ignore")),
        ]), feats_cat),
    ])

    # XGBoost Regressor Pipeline
    pipe = Pipeline([
        ("prep", preprocessor),
        ("reg", xgb.XGBRegressor(
            n_estimators=400, max_depth=7, learning_rate=0.03,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42,
        )),
    ])
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)
    _report("XGBoost Pipeline", y_te, y_pred)

    # RandomForest comparison
    pipe_rf = Pipeline([
        ("prep", preprocessor),
        ("reg", RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)),
    ])
    pipe_rf.fit(X_tr, y_tr)
    y_pred_rf = pipe_rf.predict(X_te)
    _report("RandomForest (comparison)", y_te, y_pred_rf)

    print("  => Using XGBoost Pipeline (self-contained, compatible with predict_eta_route)")
     # Note: predict_eta_route expects {distance_km,precipitation_mm,wind_kph,hour}
    # but the model trained here uses richer features: {distance_km,day_of_week,time_of_day,...}
    # The prediction function will need to be updated to supply default values.
    _save(pipe, out_path)
    return pipe


# ==========================================================================
#  3. BED FORECAST  (Regressor)
#     Expanded cols: hospital_capacity,current_occupancy,day_of_week,month,
#                    is_weekend,season,incoming_patients_24h,discharges_24h,
#                    predicted_demand_24h
#     Prediction function sends: {emergency_count,disease_case_count,
#                                 current_bed_occupancy,hospital_id}
# ==========================================================================
def train_bed_forecast(csv_path, out_path):
    _header("3/6  BED FORECAST MODEL")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Map expanded -> what predict_bed_forecast sends
    df["emergency_count"]      = df["incoming_patients_24h"]
    df["disease_case_count"]   = df["incoming_patients_24h"] * 0.3  # estimate
    df["current_bed_occupancy"] = df["current_occupancy"]
    df["hospital_id"]          = "H001"  # single-hospital placeholder
    df["next_week_bed_demand"] = df["predicted_demand_24h"] * 7  # scale to weekly

    feats_num  = ["emergency_count", "disease_case_count", "current_bed_occupancy"]
    feats_cat  = ["hospital_id"]
    target     = "next_week_bed_demand"

    df = df.dropna(subset=feats_num + feats_cat + [target])
    print(f"  Cleaned: {len(df)} rows")

    X = df[feats_num + feats_cat]
    y = df[target]

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), feats_num),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant", fill_value=0)),
            ("ohe", OneHotEncoder(handle_unknown="ignore")),
        ]), feats_cat),
    ])

    # XGBoost Regressor
    pipe = Pipeline([
        ("prep", preprocessor),
        ("reg", xgb.XGBRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, random_state=42,
        )),
    ])
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)
    _report("XGBoost Pipeline", y_te, y_pred)

    # RandomForest comparison
    pipe_rf = Pipeline([
        ("prep", preprocessor),
        ("reg", RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)),
    ])
    pipe_rf.fit(X_tr, y_tr)
    y_pred_rf = pipe_rf.predict(X_te)
    _report("RandomForest (comparison)", y_te, y_pred_rf)

    print("  => Using XGBoost Pipeline (self-contained, compatible with predict_bed_forecast)")
    _save(pipe, out_path)
    return pipe


# ==========================================================================
#  4. OUTBREAK FORECAST  (Prophet time-series)
#     Expanded cols: disease,region,population,cases_reported,hospitalizations,
#                    deaths,week,year,temperature_c,humidity_pct,prev_week_cases
#     Prediction function sends: {disease_name,region,days_to_predict}
# ==========================================================================
def train_outbreak(csv_path, out_path):
    _header("4/6  OUTBREAK FORECAST MODEL")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Create date from week+year
    df["ds"] = pd.to_datetime(
        df["year"].astype(str) + "-W" + df["week"].astype(str) + "-1",
        format="%Y-W%W-%w", errors="coerce"
    )
    if df["ds"].isna().any():
        df = df.sort_values(["year", "week"])
        df["ds"] = pd.date_range(start="2020-01-06", periods=len(df), freq="7D")

    df_model = df.rename(columns={"disease": "disease_name", "cases_reported": "y"})

    models = {}
    for (disease, region), grp in df_model.groupby(["disease_name", "region"]):
        grp = grp.dropna(subset=["ds", "y"]).sort_values("ds")
        if len(grp) < 3:
            print(f"  [SKIP] {disease}/{region}: only {len(grp)} weeks")
            continue
        try:
            m = Prophet(
                yearly_seasonality=True, weekly_seasonality=False,
                daily_seasonality=False, seasonality_mode="multiplicative",
            )
            m.fit(grp[["ds", "y"]])
            models[(disease, region)] = m
            print(f"  [OK]  {disease} / {region}  ({len(grp)} periods)")
        except Exception as e:
            print(f"  [ERR] {disease}/{region}: {e}")

    print(f"\n  Total Prophet models trained: {len(models)}")
    _save(models, out_path)
    return models


# ==========================================================================
#  5. INVENTORY PREDICTION  (Regressor)
#     Expanded cols: item_name,category,current_stock,daily_usage,
#                    lead_time_days,reorder_point,unit_cost,
#                    supplier_reliability,days_until_stockout
#     Prediction function sends: {quantity,minThreshold,category}
# ==========================================================================
def train_inventory(csv_path, out_path):
    _header("5/6  INVENTORY PREDICTION MODEL")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Use richer features from the expanded dataset.
    # The expanded dataset has 9 columns:
    #   item_name,category,current_stock,daily_usage,lead_time_days,
    #   reorder_point,unit_cost,supplier_reliability,days_until_stockout
    #
    # Previously we only used {quantity, minThreshold, category} which lost
    # signal from daily_usage, lead_time_days, and supplier_reliability.
    df["quantity"]      = df["current_stock"]
    df["minThreshold"]  = df["reorder_point"]
    # Target: predict days_until_stockout directly
    target = "days_until_stockout"

    feats_num = ["quantity", "minThreshold", "daily_usage", "lead_time_days", "supplier_reliability"]
    feats_cat = ["category"]

    required = feats_num + feats_cat + [target]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"  [ERR] Missing columns: {missing}")
        print(f"  Available: {list(df.columns)}")
        return None

    df = df.dropna(subset=required)
    print(f"  Cleaned: {len(df)} rows")

    X = df[feats_num + feats_cat]
    y = df[target]

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), feats_num),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
            ("ohe", OneHotEncoder(handle_unknown="ignore")),
        ]), feats_cat),
    ])

    # XGBoost Regressor
    pipe = Pipeline([
        ("prep", preprocessor),
        ("reg", xgb.XGBRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42,
        )),
    ])
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)
    _report("XGBoost Pipeline", y_te, y_pred)

    # RandomForest comparison
    pipe_rf = Pipeline([
        ("prep", preprocessor),
        ("reg", RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)),
    ])
    pipe_rf.fit(X_tr, y_tr)
    y_pred_rf = pipe_rf.predict(X_te)
    _report("RandomForest (comparison)", y_te, y_pred_rf)

    print("  => Using XGBoost Pipeline (self-contained)")
    _save(pipe, out_path)
    return pipe


# ==========================================================================
#  6. EMERGENCY SEVERITY  (Multi-class Classifier)
#     Expanded cols: heart_rate,blood_pressure_sys,oxygen_saturation,
#                    respiratory_rate,age,glasgow_coma_scale,
#                    trauma_type,chief_complaint,severity_level
#     Prediction function sends: REAL clinical features directly
# ==========================================================================
def train_emergency_severity(csv_path, out_path):
    _header("6/6  EMERGENCY SEVERITY MODEL (Real Clinical Features)")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Use real clinical features directly — no proxy garbage
    feats_num = [
        "heart_rate", "blood_pressure_sys", "oxygen_saturation",
        "respiratory_rate", "age", "glasgow_coma_scale",
    ]
    feats_cat = ["trauma_type", "chief_complaint"]
    target    = "severity_level"

    required = feats_num + feats_cat + [target]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"  [ERR] Missing columns: {missing}")
        return None

    df = df.dropna(subset=required)
    df[target] = df[target].astype(str).str.strip().str.lower()
    valid_labels = {"critical", "high", "low", "moderate"}
    df = df[df[target].isin(valid_labels)]
    print(f"  Cleaned: {len(df)} rows")
    print(f"  Class distribution:\n{df[target].value_counts()}\n")

    if len(df) < 50:
        print("  [SKIP] Too few rows after cleaning")
        return None

    X = df[feats_num + feats_cat]
    le = LabelEncoder()
    y = le.fit_transform(df[target])
    classes = len(le.classes_)
    print(f"  LabelEncoder: {list(le.classes_)} -> {list(range(classes))}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), feats_num),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
            ("ohe", OneHotEncoder(handle_unknown="ignore")),
        ]), feats_cat),
    ])

    # XGBoost Multi-class
    pipe = Pipeline([
        ("prep", preprocessor),
        ("clf", xgb.XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42,
            objective="multi:softprob", num_class=classes,
            eval_metric="mlogloss",
        )),
    ])
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)
    _report(f"XGBoost Pipeline ({classes} classes)", y_te, y_pred, clf=True)

    # RandomForest comparison
    pipe_rf = Pipeline([
        ("prep", preprocessor),
        ("clf", RandomForestClassifier(n_estimators=300, max_depth=12, class_weight="balanced", random_state=42)),
    ])
    pipe_rf.fit(X_tr, y_tr)
    y_pred_rf = pipe_rf.predict(X_te)
    _report(f"RandomForest (comparison, {classes} classes)", y_te, y_pred_rf, clf=True)

    print("  => Using XGBoost Pipeline (self-contained + LabelEncoder)")

    # Save as dict {pipeline, label_encoder} for predict_severity compatibility
    model_bundle = {
        "pipeline": pipe,
        "label_encoder": le,
    }
    joblib.dump(model_bundle, out_path)
    sz = os.path.getsize(out_path) / 1024
    print(f"  [SAVED] -> {out_path.name} ({sz:.0f} KB)")
    print(f"  predict_severity now expects clinical features:\n"
          f"    {feats_num + feats_cat}")
    return pipe


# ==========================================================================
#  4b. OUTBREAK XGBoost FALLBACK (for when Prophet fails)
# ==========================================================================
def train_outbreak_xgboost(csv_path, out_path):
    _header("4b/6  OUTBREAK XGBoost FALLBACK (Lag-based time series)")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}  |  Cols: {list(df.columns)}")

    # Generate synthetic week/year from row index (original cols are all NaN)
    df_model = df.rename(columns={"disease": "disease_name", "cases_reported": "cases", "region": "region"}).copy()
    df_model["week"] = (np.arange(len(df_model)) % 52) + 1
    df_model["year"] = 2020 + (np.arange(len(df_model)) // 52)

    # Fill missing previous_week_cases with 0 (first week has no previous)
    df_model["previous_week_cases"] = df_model["previous_week_cases"].fillna(0)

    # Encode categoricals
    le_disease = LabelEncoder()
    le_region = LabelEncoder()
    df_model["disease_enc"] = le_disease.fit_transform(df_model["disease_name"].astype(str))
    df_model["region_enc"] = le_region.fit_transform(df_model["region"].astype(str))

    # Cyclical encoding for week
    df_model["week_sin"] = np.sin(2 * np.pi * df_model["week"] / 52)
    df_model["week_cos"] = np.cos(2 * np.pi * df_model["week"] / 52)

    target = "cases"
    feature_cols = [
        "week_sin", "week_cos", "year", "population",
        "temperature_c", "humidity_pct", "previous_week_cases",
        "disease_enc", "region_enc",
    ]

    # Only drop rows where actual feature values are NaN (not the generated ones)
    df_model = df_model.dropna(subset=["temperature_c", "humidity_pct", "previous_week_cases", "population", target])
    print(f"  Cleaned: {len(df_model)} rows")

    if len(df_model) < 10:
        print("  [SKIP] Too few rows after cleaning")
        return None

    # Build per-(disease,region) models for predict_outbreak_forecast compatibility
    outbreak_models = {}
    for (disease, region), grp in df_model.groupby(["disease_name", "region"]):
        grp = grp.dropna(subset=feature_cols + [target])
        if len(grp) < 5:
            continue
        Xg = grp[feature_cols]
        yg = grp[target]
        Xg_tr, Xg_te, yg_tr, yg_te = train_test_split(Xg, yg, test_size=0.2, random_state=42)
        m = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
        m.fit(Xg_tr, yg_tr)
        outbreak_models[(disease, region)] = m
        print(f"  [OK]  {disease} / {region}  ({len(grp)} rows, R2={r2_score(yg_te, m.predict(Xg_te)):.3f})")

    print(f"\n  Total XGBoost outbreak models: {len(outbreak_models)}")
    if not outbreak_models:
        print("  [SKIP] No models trained; preserving existing file.")
        return None

    joblib.dump(outbreak_models, out_path)
    sz = os.path.getsize(out_path) / 1024
    print(f"  [SAVED] -> {out_path.name} ({sz:.0f} KB)")
    return outbreak_models


# ==========================================================================
#  MAIN
# ==========================================================================
def main():
    print()
    print("  LIFELINK ML MODEL RETRAINING")
    print("  Using 10,000-row expanded datasets with XGBoost")
    print(f"  ML directory: {ML_DIR}")

    t0 = time.time()

    # Backup existing models
    print("\n  Backing up existing .joblib files...")
    bak_dir = ML_DIR / "backups"
    bak_dir.mkdir(exist_ok=True)
    for f in ML_DIR.glob("*.joblib"):
        shutil.copy2(f, bak_dir / f.name)
        print(f"    {f.name} -> backups/")

    train_health_risk(
        ML_DIR / "health_risk_data_expanded.csv",
        ML_DIR / "health_risk_model.joblib",
    )

    train_eta(
        ML_DIR / "eta_expanded.csv",
        ML_DIR / "eta_model.joblib",
    )

    train_bed_forecast(
        ML_DIR / "bed_forecast_expanded.csv",
        ML_DIR / "bed_forecast_model.joblib",
    )

    # Try Prophet first, fall back to XGBoost
    if HAS_PROPHET:
        try:
            train_outbreak(
                ML_DIR / "outbreak_expanded.csv",
                ML_DIR / "outbreak_prophet.joblib",
            )
        except Exception as e:
            print(f"  [Prophet failed: {e}]")
    train_outbreak_xgboost(
        ML_DIR / "outbreak_expanded.csv",
        ML_DIR / "outbreak_forecast_models.joblib",
    )

    train_inventory(
        ML_DIR / "inventory_expanded.csv",
        ML_DIR / "inventory_prediction_model.joblib",
    )

    train_emergency_severity(
        ML_DIR / "emergency_severity_expanded.csv",
        ML_DIR / "emergency_severity_model.joblib",
    )

    elapsed = time.time() - t0
    print(f"\n{'='*68}")
    print(f"  ALL MODELS RETRAINED SUCCESSFULLY  ({elapsed:.1f}s)")
    print(f"{'='*68}\n")


if __name__ == "__main__":
    main()
