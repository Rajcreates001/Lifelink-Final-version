"""
LifeLink ML — Model Training Module
=====================================
All train_* functions extracted from the original ai_ml.py.

Each function trains a specific model and saves it as a .joblib file.
"""

import json
import os
import random
import sys
from collections import defaultdict

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    IsolationForest,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

try:
    from prophet import Prophet

    HAS_PROPHET = True
except ImportError:
    print(json.dumps({"error": "Prophet library not found. Please run 'pip install prophet'"}))
    HAS_PROPHET = False

import logging

logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

# ─── Ensure sibling modules are importable (for standalone execution) ──
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

# Local imports (absolute — works both as package import and standalone)
from utils import _get_discretized_state, _get_reward  # noqa: E402
from features import SEVERITY_LABEL_MAP, SEVERITY_SCORE_MAP  # noqa: E402

try:
    import xgboost as xgb

    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


# =====================================================================
# 1. EMERGENCY ALERT CLASSIFIER (Naive Bayes / TF-IDF)
# =====================================================================


def train_and_save_model(csv_path="911_calls.csv", model_output_path="emergency_classifier.joblib"):
    print(f"Starting model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        df = df.dropna(subset=["title"])

        def map_category(title):
            title_lower = title.lower()
            if "fire:" in title_lower:
                return "fire"
            if "traffic:" in title_lower:
                return "accident"
            if "ems:" in title_lower:
                if any(kw in title_lower for kw in ["cardiac", "chest pain", "heart", "cpr"]):
                    return "cardiac_issue"
                if any(kw in title_lower for kw in ["accident", "mva", "vehicle"]):
                    return "accident"
                return "medical_emergency"
            return "other"

        df["category"] = df["title"].apply(map_category)
        df_model = df[df["category"] != "other"][["title", "category"]]
        if df_model.empty:
            print("Error: No data to train on after filtering.")
            return
        print(f"Data processed. Training on {len(df_model)} samples.")
        X = df_model["title"]
        y = df_model["category"]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        pipeline = Pipeline(
            [
                ("tfidf", TfidfVectorizer(stop_words="english")),
                ("nb", MultinomialNB()),
            ]
        )
        print("Fitting pipeline...")
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        print("\n--- Model: Multinomial Naive Bayes (Alert Classifier) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print("Classification Report:\n", classification_report(y_test, y_pred))
        print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during training: {e}")


# =====================================================================
# 2. DONOR COMPATIBILITY (Logistic Regression)
# =====================================================================


def train_compatibility_model(
    csv_path="compatibility_data.csv", model_output_path="compatibility_model.joblib"
):
    print(f"Starting compatibility model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        df = df.dropna()
        if "is_compatible" not in df.columns:
            print(f"Error: Target column 'is_compatible' not found in {csv_path}.")
            return
        X = df.drop("is_compatible", axis=1)
        y = df["is_compatible"]
        categorical_features = [
            "receiver_blood_type",
            "receiver_gender",
            "donor_blood_type",
            "donor_gender",
            "organ_type",
        ]
        numerical_features = ["receiver_age", "donor_age", "location_distance"]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", LogisticRegression(random_state=42, class_weight="balanced")),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        print("Fitting compatibility pipeline...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        target_names = ["Not Compatible (0)", "Compatible (1)"]
        print("\n--- Model: Logistic Regression (Donor Compatibility) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print(
            "Classification Report:\n", classification_report(y_test, y_pred, target_names=target_names)
        )
        print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
        print("-" * 50 + "\n")
        joblib.dump(clf, model_output_path)
        print(f"Model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found. Please create it first.")
    except Exception as e:
        print(f"An error occurred during compatibility training: {e}")


# =====================================================================
# 3. HOSPITAL RECOMMENDATION (RandomForest Classifier)
# =====================================================================


def train_recommendation_model(
    csv_path="hospital_data.csv", model_output_path="hospital_recommendation_model.joblib"
):
    print(f"Starting recommendation model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        df = df.dropna()
        if "is_best_choice" not in df.columns:
            print(f"Error: Target column 'is_best_choice' not found in {csv_path}.")
            return
        X = df.drop("is_best_choice", axis=1)
        y = df["is_best_choice"]
        categorical_features = ["emergency_type"]
        numerical_features = ["distance_km", "traffic_level", "hospital_rating"]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", RandomForestClassifier(random_state=42)),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting recommendation pipeline...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        target_names = ["Not Best (0)", "Best Choice (1)"]
        print("\n--- Model: RandomForestClassifier (Hospital Recommendation) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print(
            "Classification Report:\n", classification_report(y_test, y_pred, target_names=target_names)
        )
        print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
        print("-" * 50 + "\n")
        joblib.dump(clf, model_output_path)
        print(f"Model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found. Please create it first.")
    except Exception as e:
        print(f"An error occurred during recommendation training: {e}")


# =====================================================================
# 4. HEALTH RISK (Logistic Regression / XGBoost)
# =====================================================================


def train_health_risk_model(
    csv_path="health_risk_data.csv", model_output_path="health_risk_model.joblib"
):
    print(f"Starting health risk model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        processed_df = pd.DataFrame()
        processed_df["age"] = df["Age"]
        processed_df["bmi"] = df["BMI"]
        processed_df["heart_rate"] = df["Heart Rate"]
        processed_df["has_condition"] = df["Diabetes"]
        processed_df["lifestyle_factor"] = df["Diet"]
        processed_df["risk_level"] = df["Heart Attack Risk"]
        try:
            processed_df["blood_pressure"] = df["Blood Pressure"].apply(
                lambda x: int(x.split("/")[0])
            )
        except Exception as e:
            print(f"Warning: Could not parse 'Blood Pressure' column. Error: {e}. Skipping.")
        numerical_features = ["age", "bmi", "blood_pressure", "heart_rate", "has_condition"]
        categorical_features = ["lifestyle_factor"]
        if "blood_pressure" not in processed_df.columns:
            numerical_features.remove("blood_pressure")
        all_features = numerical_features + categorical_features
        processed_df = processed_df.dropna(subset=all_features + ["risk_level"])
        if "risk_level" not in processed_df.columns:
            print("Error: Target column not found after processing.")
            return
        if processed_df.empty:
            print("Error: No data remaining after processing.")
            return
        X = processed_df[all_features]
        y = processed_df["risk_level"]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", LogisticRegression(random_state=42, class_weight="balanced")),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting health risk pipeline...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        target_names = ["Low Risk (0)", "High Risk (1)"]
        print("\n--- Model: Logistic Regression (Health Risk) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print(
            "Classification Report:\n", classification_report(y_test, y_pred, target_names=target_names)
        )
        print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
        print("-" * 50 + "\n")
        joblib.dump(clf, model_output_path)
        print(f"Model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print("Error: The file health_risk_data.csv was not found.")
    except KeyError as e:
        print(f"Error: A required column is missing: {e}.")
    except Exception as e:
        print(f"An error occurred during health risk training: {e}")


# =====================================================================
# 5. USER ACTIVITY CLUSTERING (K-Means)
# =====================================================================


def train_activity_cluster_model(
    csv_path="user_activity_data.csv", model_output_path="activity_cluster_model.joblib"
):
    print(f"Starting activity cluster model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        features = ["sos_usage", "donations_made", "health_logs"]
        if not all(col in df.columns for col in features):
            print(f"Error: CSV must contain all of these columns: {features}")
            return
        df_features = df[features].dropna()
        pipeline = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("kmeans", KMeans(n_clusters=3, random_state=42, n_init=10)),
            ]
        )
        print("Fitting K-Means clustering pipeline...")
        pipeline.fit(df_features)
        print("\n--- Model: K-Means (Activity Cluster) ---")
        inertia = pipeline.named_steps["kmeans"].inertia_
        centers = pipeline.named_steps["kmeans"].cluster_centers_
        print(f"Inertia (Sum of squared distances): {inertia:.4f}")
        print(f"Cluster Centers (Scaled):\n{centers}")
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Activity cluster model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during cluster training: {e}")


# =====================================================================
# 6. BEHAVIOR FORECAST (Linear Regression)
# =====================================================================


def train_behavior_forecast_model(
    csv_path="user_forecast_data.csv", model_output_path="behavior_forecast_model.joblib"
):
    print(f"Starting behavior forecast model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        features = ["past_donations"]
        target = "future_donations"
        if not all(col in df.columns for col in features + [target]):
            print(f"Error: CSV must contain all of these columns: {features + [target]}")
            return
        df_model = df.dropna(subset=features + [target])
        X = df_model[features]
        y = df_model[target]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        model = LinearRegression()
        print("Fitting Linear Regression forecast model...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        print("\n--- Model: Linear Regression (Behavior Forecast) ---")
        print(f"R-squared (R2): {r2_score(y_test, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(model, model_output_path)
        print(f"Behavior forecast model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during forecast training: {e}")


# =====================================================================
# 7. EMERGENCY HOTSPOT CLUSTERING (K-Means)
# =====================================================================


def train_emergency_hotspot_model(
    csv_path="emergency_hotspot_data.csv", model_output_path="emergency_hotspot_model.joblib"
):
    print(f"Starting emergency hotspot model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        try:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df["hour_of_day"] = df["timestamp"].dt.hour
        except Exception:
            df["hour_of_day"] = np.random.randint(0, 24, df.shape[0])
        df = df.dropna(subset=["lat", "lng", "emergency_type", "severity", "hour_of_day"])
        numerical_features = ["lat", "lng", "hour_of_day"]
        categorical_features = ["emergency_type", "severity"]
        if df.empty:
            print("Error: No data to train on after processing.")
            return
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("kmeans", KMeans(n_clusters=3, random_state=42, n_init=10)),
            ]
        )
        print("Fitting K-Means hotspot pipeline...")
        pipeline.fit(df)
        print("\n--- Model: K-Means (Hotspot Cluster) ---")
        inertia = pipeline.named_steps["kmeans"].inertia_
        print(f"Inertia: {inertia:.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Emergency hotspot model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during hotspot training: {e}")


# =====================================================================
# 8. DISEASE OUTBREAK FORECAST (Prophet)
# =====================================================================


def train_outbreak_forecast_model(
    csv_path="outbreak_data.csv", model_output_path="outbreak_forecast_models.joblib"
):
    print(f"Starting outbreak forecast model training with data from {csv_path}...")
    if not HAS_PROPHET:
        print("Error: Prophet not installed. Skipping.")
        return
    try:
        df = pd.read_csv(csv_path)
        required_cols = ["date", "disease_name", "region", "cases"]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df["date"] = pd.to_datetime(df["date"])
        df = df.rename(columns={"date": "ds", "cases": "y"})
        models = {}
        for (disease, region), group_df in df.groupby(["disease_name", "region"]):
            if len(group_df) < 2:
                print(f"Skipping {disease} in {region}: not enough data points.")
                continue
            print(f"Training model for: {disease} in {region}...")
            m = Prophet(yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=False)
            m.fit(group_df[["ds", "y"]])
            models[(disease, region)] = m
        if not models:
            print("No models were trained.")
            return
        print(f"\n--- Model: Prophet (Time-Series) ---")
        print(f"Successfully trained {len(models)} model(s).")
        print("-" * 50 + "\n")
        joblib.dump(models, model_output_path)
        print(f"Outbreak forecast models saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during outbreak forecast training: {e}")


# =====================================================================
# 9. EMERGENCY SEVERITY (XGBoost multi-class — clinical features)
# =====================================================================


def train_severity_model(
    csv_path="emergency_severity_expanded.csv",
    model_output_path="emergency_severity_model.joblib",
):
    print(f"Starting emergency severity model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "severity_level"
        numerical_features = [
            "heart_rate",
            "blood_pressure_sys",
            "oxygen_saturation",
            "respiratory_rate",
            "age",
            "glasgow_coma_scale",
        ]
        categorical_features = ["trauma_type", "chief_complaint"]
        required_cols = numerical_features + categorical_features + [target]
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            print(f"Error: CSV missing columns: {missing}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on after cleaning.")
            return
        df[target] = df[target].astype(str).str.strip().str.lower()
        valid_labels = set(SEVERITY_LABEL_MAP.values())
        df = df[df[target].isin(valid_labels)]
        if df.empty:
            print(f"Error: No valid severity labels found.")
            return
        print(f"\n  Class distribution:\n{df[target].value_counts()}\n")
        X = df[numerical_features + categorical_features]
        y = df[target]
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        classes = len(le.classes_)
        print(f"  LabelEncoder classes: {list(le.classes_)} -> {list(range(classes))}")
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                (
                    "classifier",
                    xgb.XGBClassifier(
                        n_estimators=300,
                        max_depth=6,
                        learning_rate=0.05,
                        subsample=0.8,
                        colsample_bytree=0.8,
                        random_state=42,
                        objective="multi:softprob",
                        num_class=classes,
                        eval_metric="mlogloss",
                    ),
                ),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        print("Fitting severity prediction pipeline (XGBoost multi-class)...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        print(f"\n--- Model: XGBoost Pipeline (Emergency Severity) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print(f"Classification Report:\n{classification_report(y_test, y_pred, digits=4)}")
        print(f"Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")
        print("-" * 50 + "\n")
        model_bytes = {"pipeline": clf, "label_encoder": le}
        joblib.dump(model_bytes, model_output_path)
        print(f"Emergency severity model successfully saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during severity model training: {e}")


# =====================================================================
# 10. DONOR / ORGAN AVAILABILITY (RandomForest Regressor)
# =====================================================================


def train_availability_model(
    csv_path="donor_availability_data.csv", model_output_path="donor_availability_model.joblib"
):
    print(f"Starting donor availability model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "future_availability_score"
        numerical_features = ["month", "donation_frequency", "hospital_stock_level"]
        categorical_features = ["region", "resource_type"]
        required_cols = numerical_features + categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        reg = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("regressor", RandomForestRegressor(random_state=42, n_estimators=100)),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting availability prediction pipeline...")
        reg.fit(X_train, y_train)
        y_pred = reg.predict(X_test)
        print(f"\n--- Model: RandomForestRegressor (Availability) ---")
        print(f"R2: {r2_score(y_test, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(reg, model_output_path)
        print(f"Donor availability model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 11. RESOURCE ALLOCATION (Q-Learning)
# =====================================================================


def train_allocation_model(model_output_path="allocation_q_table.joblib"):
    print("Starting resource allocation model training (Q-Learning)...")
    actions = [0, 1, 2]
    q_table = defaultdict(lambda: np.zeros(len(actions)))
    alpha, gamma, epsilon = 0.1, 0.9, 0.1
    n_episodes = 10000
    print(f"Running {n_episodes} training simulations...")
    for i in range(n_episodes):
        emerg_count = random.randint(0, 10)
        cap_percent = random.randint(0, 100)
        state = _get_discretized_state(emerg_count, cap_percent)
        if random.uniform(0, 1) < epsilon:
            action = random.choice(actions)
        else:
            action = np.argmax(q_table[state])
        reward = _get_reward(state, action)
        next_emerg_count = random.randint(0, 10)
        next_cap_percent = random.randint(0, 100)
        next_state = _get_discretized_state(next_emerg_count, next_cap_percent)
        old_value = q_table[state][action]
        next_max = np.max(q_table[next_state])
        new_value = (1 - alpha) * old_value + alpha * (reward + gamma * next_max)
        q_table[state][action] = new_value
    print("Q-Learning training complete.")
    print(f"\n--- Model: Q-Learning (Allocation) ---")
    print(f"Trained Q-Table with {len(q_table)} states.")
    print("-" * 50 + "\n")
    joblib.dump(dict(q_table), model_output_path)
    print(f"Allocation Q-Table saved to {model_output_path}")


# =====================================================================
# 12. POLICY SEGMENTATION (K-Means)
# =====================================================================


def train_policy_segmentation_model(
    csv_path="policy_data.csv", model_output_path="policy_segmentation_model.joblib"
):
    print(f"Starting policy segmentation model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        features = ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"]
        if not all(col in df.columns for col in features):
            print(f"Error: CSV must contain: {features}")
            return
        df_features = df[features].dropna()
        if df_features.empty:
            print("Error: No data to train on.")
            return
        pipeline = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("kmeans", KMeans(n_clusters=3, random_state=42, n_init=10)),
            ]
        )
        print("Fitting K-Means policy segmentation pipeline...")
        pipeline.fit(df_features)
        print(f"\n--- Model: K-Means (Policy Segmentation) ---")
        print(f"Inertia: {pipeline.named_steps['kmeans'].inertia_:.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Policy segmentation model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 13. HEALTHCARE PERFORMANCE (Linear Regression)
# =====================================================================


def train_healthcare_performance_model(
    csv_path="policy_data.csv", model_output_path="healthcare_performance_model.joblib"
):
    print(f"Starting healthcare performance score model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "health_outcome_score"
        features = ["emergency_rate", "avg_response_time", "hospital_bed_occupancy"]
        required_cols = features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df[features]
        y = df[target]
        pipeline = Pipeline([("scaler", StandardScaler()), ("regressor", LinearRegression())])
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting performance score pipeline...")
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        print(f"\n--- Model: Linear Regression (Performance Score) ---")
        print(f"R2: {r2_score(y_test, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Healthcare performance model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 14. ANOMALY DETECTION (Isolation Forest)
# =====================================================================


def train_anomaly_detection_model(
    csv_path="anomaly_data.csv", model_output_path="anomaly_detection_model.joblib"
):
    print(f"Starting anomaly detection model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        numerical_features = ["daily_emergency_count", "hospital_admissions", "disease_reports"]
        categorical_features = ["region"]
        required_cols = numerical_features + categorical_features
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df[required_cols]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("anomaly_detector", IsolationForest(contamination="auto", random_state=42)),
            ]
        )
        print("Fitting anomaly detection pipeline...")
        pipeline.fit(X)
        y_pred = pipeline.predict(X)
        anomalies = (y_pred == -1).sum()
        print(f"\n--- Model: Isolation Forest (Anomaly Detection) ---")
        print(f"Total points: {len(X)}, Anomalies found: {anomalies}")
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Anomaly detection model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 15. HOSPITAL SEVERITY (RandomForest Classifier)
# =====================================================================


def train_hospital_severity_model(
    csv_path="hospital_severity_data.csv", model_output_path="hospital_severity_model.joblib"
):
    print(f"Starting hospital severity model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "severity"
        numerical_features = ["age", "heart_rate", "blood_pressure_systolic", "distance_km"]
        categorical_features = ["emergency_type"]
        required_cols = numerical_features + categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", RandomForestClassifier(random_state=42, class_weight="balanced")),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting hospital severity pipeline...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        print(f"\n--- Model: RandomForestClassifier (Hospital Severity) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print("Classification Report:\n", classification_report(y_test, y_pred))
        print("-" * 50 + "\n")
        joblib.dump(clf, model_output_path)
        print(f"Hospital severity model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 16. ETA (XGBoost Regressor)
# =====================================================================


def train_eta_model(csv_path="eta_data.csv", model_output_path="eta_model.joblib"):
    print(f"Starting ETA model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "eta_minutes"
        numerical_features = ["distance_km", "precipitation_mm", "wind_kph", "hour"]
        if not all(col in df.columns for col in numerical_features + [target]):
            # Generate synthetic data if columns missing
            synthetic = []
            for _ in range(1200):
                distance_km = max(1, np.random.gamma(2.0, 5.0))
                precipitation = max(0.0, np.random.exponential(2.0))
                wind = max(5.0, np.random.normal(18.0, 6.0))
                hour = np.random.randint(0, 24)
                base_speed = 40 - min(12, precipitation * 1.5) - min(8, (wind - 15) * 0.2)
                base_speed = max(18, base_speed)
                eta_minutes = (distance_km / base_speed) * 60
                eta_minutes *= 1.0 + (0.15 if hour in {7, 8, 9, 17, 18, 19} else 0)
                synthetic.append(
                    {
                        "distance_km": round(distance_km, 2),
                        "precipitation_mm": round(precipitation, 2),
                        "wind_kph": round(wind, 2),
                        "hour": int(hour),
                        "eta_minutes": round(eta_minutes, 2),
                    }
                )
            df = pd.DataFrame(synthetic)
        df = df.dropna(subset=numerical_features + [target])
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df[numerical_features]
        y = df[target]
        reg = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("regressor", RandomForestRegressor(random_state=42, n_estimators=160)),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting ETA prediction pipeline...")
        reg.fit(X_train, y_train)
        y_pred = reg.predict(X_test)
        print(f"\n--- Model: RandomForestRegressor (ETA) ---")
        print(f"R2: {r2_score(y_test, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(reg, model_output_path)
        print(f"ETA model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 17. BED FORECAST (XGBoost Regressor via Pipeline)
# =====================================================================


def train_bed_forecast_model(
    csv_path="hospital_resource_data.csv", model_output_path="bed_forecast_model.joblib"
):
    print(f"Starting bed forecast model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "next_week_bed_demand"
        numerical_features = ["emergency_count", "disease_case_count", "current_bed_occupancy"]
        categorical_features = ["hospital_id"]
        required_cols = numerical_features + categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value=0)),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        reg = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("regressor", LinearRegression()),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting bed forecast pipeline...")
        reg.fit(X_train, y_train)
        y_pred = reg.predict(X_test)
        print(f"\n--- Model: Linear Regression (Bed Forecast) ---")
        print(f"R2: {r2_score(y_test, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(reg, model_output_path)
        print(f"Bed forecast model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 18. STAFF ALLOCATION (DecisionTree Classifier)
# =====================================================================


def train_staff_allocation_model(
    csv_path="staff_allocation_data.csv", model_output_path="staff_allocation_model.joblib"
):
    print(f"Starting staff allocation model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "allocation_decision"
        categorical_features = ["patient_load", "department", "shift"]
        required_cols = categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[("cat", categorical_transformer, categorical_features)]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", DecisionTreeClassifier(random_state=42, class_weight="balanced")),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting staff allocation pipeline...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        print(f"\n--- Model: DecisionTreeClassifier (Staff Allocation) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(clf, model_output_path)
        print(f"Staff allocation model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 19. HOSPITAL PERFORMANCE CLUSTERING (K-Means)
# =====================================================================


def train_hospital_performance_model(
    csv_path="hospital_performance_data.csv",
    model_output_path="hospital_performance_model.joblib",
):
    print(f"Starting hospital performance model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        features = [
            "avg_response_time",
            "treatment_success_rate",
            "patient_satisfaction",
            "resource_utilization",
        ]
        required_cols = features + ["hospital_id"]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df_features = df.dropna(subset=features)
        if df_features.empty:
            print("Error: No data to train on.")
            return
        X = df_features[features]
        pipeline = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("kmeans", KMeans(n_clusters=3, random_state=42, n_init=10)),
            ]
        )
        print("Fitting K-Means hospital performance pipeline...")
        pipeline.fit(X)
        print(f"\n--- Model: K-Means (Hospital Performance) ---")
        print(f"Inertia: {pipeline.named_steps['kmeans'].inertia_:.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipeline, model_output_path)
        print(f"Hospital performance model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 20. PATIENT RECOVERY (Logistic Regression)
# =====================================================================


def train_recovery_model(
    csv_path="patient_outcome_data.csv", model_output_path="recovery_model.joblib"
):
    print(f"Starting recovery probability model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "recovered"
        numerical_features = ["age", "bmi", "heart_rate", "blood_pressure"]
        categorical_features = ["diagnosis", "treatment_type"]
        required_cols = numerical_features + categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        clf = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", LogisticRegression(random_state=42, class_weight="balanced")),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting recovery probability pipeline...")
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        print(f"\n--- Model: Logistic Regression (Recovery) ---")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(clf, model_output_path)
        print(f"Recovery model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 21. STAY DURATION (RandomForest Regressor)
# =====================================================================


def train_stay_duration_model(
    csv_path="patient_outcome_data.csv", model_output_path="stay_duration_model.joblib"
):
    print(f"Starting stay duration model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "stay_duration_days"
        numerical_features = ["age", "bmi", "heart_rate", "blood_pressure"]
        categorical_features = ["diagnosis", "treatment_type"]
        required_cols = numerical_features + categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        reg = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("regressor", RandomForestRegressor(random_state=42, n_estimators=100)),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting stay duration pipeline...")
        reg.fit(X_train, y_train)
        y_pred = reg.predict(X_test)
        print(f"\n--- Model: RandomForestRegressor (Stay Duration) ---")
        print(f"R2: {r2_score(y_test, y_pred):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(reg, model_output_path)
        print(f"Stay duration model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 22. HOSPITAL DISEASE FORECAST (Prophet)
# =====================================================================


def train_hospital_disease_forecast_model(
    csv_path="hospital_disease_data.csv", model_output_path="hospital_disease_models.joblib"
):
    print(f"Starting hospital disease forecast model training with data from {csv_path}...")
    if not HAS_PROPHET:
        print("Error: Prophet not installed. Skipping.")
        return
    try:
        df = pd.read_csv(csv_path)
        required_cols = ["date", "disease_name", "hospital_id", "cases"]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df["date"] = pd.to_datetime(df["date"])
        df = df.rename(columns={"date": "ds", "cases": "y"})
        models = {}
        for (hospital_id, disease), group_df in df.groupby(["hospital_id", "disease_name"]):
            if len(group_df) < 2:
                print(f"Skipping {disease} for hospital {hospital_id}: not enough data.")
                continue
            print(f"Training model for: {disease} at hospital {hospital_id}...")
            m = Prophet(yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=False)
            m.fit(group_df[["ds", "y"]])
            models[(hospital_id, disease)] = m
        if not models:
            print("No models were trained.")
            return
        print(f"\n--- Model: Prophet (Hospital Disease Forecast) ---")
        print(f"Trained {len(models)} model(s).")
        print("-" * 50 + "\n")
        joblib.dump(models, model_output_path)
        print(f"Hospital disease forecast models saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 23. INVENTORY PREDICTION (RandomForest Regressor)
# =====================================================================


def train_inventory_model(
    csv_path="inventory_data.csv", model_output_path="inventory_prediction_model.joblib"
):
    print(f"Starting inventory prediction model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "next_week_stock"
        numerical_features = ["quantity", "minThreshold"]
        categorical_features = ["category"]
        required_cols = numerical_features + categorical_features + [target]
        if not all(col in df.columns for col in required_cols):
            print(f"Error: CSV must contain: {required_cols}")
            return
        df = df.dropna(subset=required_cols)
        if df.empty:
            print("Error: No data to train on.")
            return
        X = df.drop(target, axis=1)
        y = df[target]
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numerical_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )
        reg = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("regressor", RandomForestRegressor(random_state=42, n_estimators=100)),
            ]
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print("Fitting inventory prediction pipeline...")
        reg.fit(X_train, y_train)
        y_pred = reg.predict(X_test)
        print(f"\n--- Model: RandomForestRegressor (Inventory Prediction) ---")
        print(f"R2: {r2_score(y_test, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(reg, model_output_path)
        print(f"Inventory prediction model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: The file {csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


# =====================================================================
# 24. KAGGLE BED FORECAST (trained on real bed stay data)
# =====================================================================


def train_kaggle_bed_forecast_model(
    csv_path="kaggle_bed_forecast_train.csv",
    model_output_path="kaggle_bed_forecast_model.joblib",
):
    """Train bed forecast model on Kaggle-derived bed occupancy data.
    Dataset from 1,000 real patient stay records aggregated into 55 weekly obs.
    Features: emergency_count, disease_case_count, current_bed_occupancy
    Target: next_week_bed_demand"""
    print(f"Starting Kaggle bed forecast model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "next_week_bed_demand"
        num_feats = ["emergency_count", "disease_case_count", "current_bed_occupancy"]
        cat_feats = ["hospital_id"]
        required = num_feats + cat_feats + [target]
        if not all(c in df.columns for c in required):
            print(f"Error: CSV must contain: {required}")
            print(f"  Found: {list(df.columns)}")
            return
        df = df.dropna(subset=required)
        if len(df) < 10:
            print(f"  [SKIP] Too few rows: {len(df)}")
            return
        print(f"  Using {len(df)} rows")
        X = df[num_feats + cat_feats]
        y = df[target]
        preprocessor = ColumnTransformer([
            ("num", Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]), num_feats),
            ("cat", Pipeline([
                ("impute", SimpleImputer(strategy="constant", fill_value=0)),
                ("ohe", OneHotEncoder(handle_unknown="ignore")),
            ]), cat_feats),
        ])
        pipe = Pipeline([
            ("prep", preprocessor),
            ("reg", xgb.XGBRegressor(
                n_estimators=50, max_depth=4, learning_rate=0.1,
                random_state=42,
            )),
        ])
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        pipe.fit(X_tr, y_tr)
        y_pred = pipe.predict(X_te)
        print(f"\n--- Model: XGBoost (Kaggle Bed Forecast) ---")
        print(f"R2: {r2_score(y_te, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_te, y_pred):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipe, model_output_path)
        print(f"Kaggle bed forecast model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
    except Exception as e:
        print(f"Error: {e}")


# =====================================================================
# 25. KAGGLE ETA (trained on 5000 real ER wait time records)
# =====================================================================


def train_kaggle_eta_model(
    csv_path="kaggle_eta_train.csv",
    model_output_path="kaggle_eta_model.joblib",
):
    """Train ETA model on Kaggle ER wait time dataset (5,000 records).
    Uses richer features: distance_km, hour, nurse_to_patient_ratio,
    facility_beds, emergency_type, traffic_level.
    Target: eta_minutes (Total Wait Time)"""
    print(f"Starting Kaggle ETA model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "eta_minutes"
        num_feats = [
            "distance_km", "hour", "nurse_to_patient_ratio",
            "specialist_availability", "facility_beds",
            "time_to_registration", "time_to_triage",
        ]
        cat_feats = ["emergency_type", "traffic_level"]
        required = num_feats + cat_feats + [target]
        missing = [c for c in required if c not in df.columns]
        if missing:
            print(f"Error: CSV missing columns: {missing}")
            return
        df = df.dropna(subset=required)
        print(f"  Using {len(df)} rows")
        X = df[num_feats + cat_feats]
        y = df[target]
        preprocessor = ColumnTransformer([
            ("num", Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]), num_feats),
            ("cat", Pipeline([
                ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
                ("ohe", OneHotEncoder(handle_unknown="ignore")),
            ]), cat_feats),
        ])
        pipe = Pipeline([
            ("prep", preprocessor),
            ("reg", xgb.XGBRegressor(
                n_estimators=300, max_depth=6, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                random_state=42,
            )),
        ])
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        pipe.fit(X_tr, y_tr)
        y_pred = pipe.predict(X_te)
        print(f"\n--- Model: XGBoost (Kaggle ETA) ---")
        print(f"R2: {r2_score(y_te, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_te, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_te, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipe, model_output_path)
        print(f"Kaggle ETA model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
    except Exception as e:
        print(f"Error: {e}")


# =====================================================================
# 26. ADMISSION PREDICTION (from 9216 real ER visits)
# =====================================================================


def train_admission_model(
    csv_path="kaggle_admission_train.csv",
    model_output_path="admission_model.joblib",
):
    """Train admission prediction on 9,216 real ER visit records.
    Predicts admission based on age, wait_time, referral, race, gender."""
    print(f"Starting admission prediction model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "admitted"
        num_feats = ["age", "wait_time_min", "satisfaction_score", "patients_cm"]
        cat_feats = ["gender_code", "department_referral", "race"]
        required = num_feats + cat_feats + [target]
        missing = [c for c in required if c not in df.columns]
        if missing:
            print(f"Error: CSV missing columns: {missing}")
            return
        df = df.dropna(subset=required)
        for c in cat_feats:
            df[c] = df[c].astype(str)
        print(f"  Using {len(df)} rows ({df[target].sum():,} admitted, {100*df[target].sum()/len(df):.1f}% rate)")
        X = df[num_feats + cat_feats]
        y = df[target].astype(int)
        preprocessor = ColumnTransformer([
            ("num", Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]), num_feats),
            ("cat", Pipeline([
                ("impute", SimpleImputer(strategy="constant", fill_value="Unknown")),
                ("ohe", OneHotEncoder(handle_unknown="ignore")),
            ]), cat_feats),
        ])
        pipe = Pipeline([
            ("prep", preprocessor),
            ("clf", xgb.XGBClassifier(
                n_estimators=300, max_depth=6, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                random_state=42, eval_metric="logloss",
            )),
        ])
        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        pipe.fit(X_tr, y_tr)
        y_pred = pipe.predict(X_te)
        print(f"\n--- Model: XGBoost (Admission Prediction, {len(df)} rows) ---")
        print(f"Accuracy: {accuracy_score(y_te, y_pred):.4f}")
        print("Classification Report:")
        print(classification_report(y_te, y_pred, digits=4))
        print("Confusion Matrix:")
        print(confusion_matrix(y_te, y_pred))
        print("-" * 50 + "\n")
        joblib.dump(pipe, model_output_path)
        print(f"Admission model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
    except Exception as e:
        print(f"Error: {e}")


# =====================================================================
# 27. HOSPITAL CAPACITY MODEL (from 737 real Pune hospitals)
# =====================================================================


def train_hospital_capacity_model(
    csv_path="kaggle_hospital_resources_train.csv",
    model_output_path="hospital_capacity_model.joblib",
):
    """Train hospital capacity model on 737 real Pune hospital facilities.
    Predicts monthly footfall from beds, staffing, and occupancy data."""
    print(f"Starting hospital capacity model training with data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
        target = "monthly_footfall"
        num_feats = [
            "beds_total", "doctors", "nurses",
            "bed_occupancy_rate", "doctor_to_bed_ratio", "nurse_to_doctor_ratio",
        ]
        cat_feats = ["class", "type"]
        required = num_feats + cat_feats + [target]
        missing = [c for c in required if c not in df.columns]
        if missing:
            print(f"Error: CSV missing columns: {missing}")
            return
        df = df.dropna(subset=required)
        for c in cat_feats:
            df[c] = df[c].astype(str)
        print(f"  Using {len(df)} rows")
        X = df[num_feats + cat_feats]
        y = df[target]
        preprocessor = ColumnTransformer([
            ("num", Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]), num_feats),
            ("cat", Pipeline([
                ("impute", SimpleImputer(strategy="constant", fill_value="Private")),
                ("ohe", OneHotEncoder(handle_unknown="ignore")),
            ]), cat_feats),
        ])
        pipe = Pipeline([
            ("prep", preprocessor),
            ("reg", xgb.XGBRegressor(
                n_estimators=300, max_depth=6, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                random_state=42,
            )),
        ])
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        pipe.fit(X_tr, y_tr)
        y_pred = pipe.predict(X_te)
        print(f"\n--- Model: XGBoost (Hospital Capacity, {len(df)} rows) ---")
        print(f"R2: {r2_score(y_te, y_pred):.4f}")
        print(f"MAE: {mean_absolute_error(y_te, y_pred):.4f}")
        print(f"RMSE: {np.sqrt(mean_squared_error(y_te, y_pred)):.4f}")
        print("-" * 50 + "\n")
        joblib.dump(pipe, model_output_path)
        print(f"Hospital capacity model saved to {model_output_path}")
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
    except Exception as e:
        print(f"Error: {e}")
