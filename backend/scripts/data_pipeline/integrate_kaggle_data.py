"""
LifeLink Kaggle Data Integration
==================================
Transforms 4 real Kaggle healthcare datasets into training-ready CSVs
for the corresponding ML models.

Kaggle Datasets to Training CSVs:
  1. kaggle_hospital_beds.csv       -> kaggle_bed_forecast_train.csv
  2. kaggle_er_wait_time.csv        -> kaggle_eta_train.csv
  3. kaggle_hospital_emergency.csv  -> kaggle_admission_train.csv
  4. kaggle_pune_hospitals.csv      -> kaggle_hospital_resources_train.csv

Usage:
    python scripts/data_pipeline/integrate_kaggle_data.py
"""

import csv
import os
import sys
import warnings
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = ROOT / "ml"


def log(msg):
    print(f"[integrate] {msg}", flush=True)


# =====================================================================
# 1. KAGGLE HOSPITAL BEDS -> BED FORECAST TRAINING DATA
# =====================================================================
def integrate_bed_forecast():
    """Transform kaggle_hospital_beds.csv -> kaggle_bed_forecast_train.csv

    The beds dataset has: patient_id, name, age, arrival_date, departure_date,
    service, satisfaction.

    We derive weekly bed occupancy features:
    - emergency_count: new arrivals per week
    - current_bed_occupancy: active patients at end of week
    - next_week_bed_demand: arrivals in the following week
    """
    src = ML_DIR / "kaggle_hospital_beds.csv"
    dst = ML_DIR / "kaggle_bed_forecast_train.csv"

    if not src.exists():
        log(f"[SKIP] {src.name} not found")
        return

    df = pd.read_csv(src)
    log(f"  Loading {src.name}: {len(df)} rows")

    # Parse dates
    df["arrival"] = pd.to_datetime(df["arrival_date"], errors="coerce")
    df["departure"] = pd.to_datetime(df["departure_date"], errors="coerce")

    # Create weekly bins starting from min arrival date
    min_date = df["arrival"].min()
    max_date = df["departure"].max()
    week_start = min_date - timedelta(days=min_date.weekday())
    weeks = pd.date_range(start=week_start, end=max_date + timedelta(days=7), freq="7D")

    rows = []
    hospital_id = "H001"

    for i in range(len(weeks) - 1):
        w_start = weeks[i]
        w_end = weeks[i + 1]

        # Arrivals this week = emergency_count
        arrivals = df[(df["arrival"] >= w_start) & (df["arrival"] < w_end)]

        # Active patients at end of week = arrived AND not yet departed
        active = df[(df["arrival"] < w_end) & ((df["departure"].isna()) | (df["departure"] >= w_end))]

        # Discharges this week
        discharges = df[(df["departure"] >= w_start) & (df["departure"] < w_end)]

        # Next week arrivals (for target)
        w_next_start = weeks[i + 1]
        w_next_end = weeks[i + 2] if i + 2 < len(weeks) else w_next_start + timedelta(days=7)
        next_arrivals = df[(df["arrival"] >= w_next_start) & (df["arrival"] < w_next_end)]

        rows.append({
            "hospital_id": hospital_id,
            "week_start": w_start.strftime("%Y-%m-%d"),
            "emergency_count": int(len(arrivals)),
            "disease_case_count": int(len(arrivals) * 0.3),
            "current_bed_occupancy": int(len(active)),
            "discharges_this_week": int(len(discharges)),
            "next_week_bed_demand": int(len(next_arrivals)),
        })

    out_df = pd.DataFrame(rows)

    # Generate richer features: rolling averages and trends
    if len(out_df) > 4:
        out_df["emergency_lag1"] = out_df["emergency_count"].shift(1).fillna(0).astype(int)
        out_df["occupancy_lag1"] = out_df["current_bed_occupancy"].shift(1).fillna(0).astype(int)
        out_df["emergency_rolling_2"] = out_df["emergency_count"].rolling(2, min_periods=1).mean().fillna(0).astype(int)
        out_df["occupancy_rolling_2"] = out_df["current_bed_occupancy"].rolling(2, min_periods=1).mean().fillna(0).astype(int)
        out_df["emergency_trend"] = (out_df["emergency_count"] - out_df["emergency_lag1"]).astype(int)
        out_df["occupancy_rate"] = (out_df["current_bed_occupancy"] / 300 * 100).round(1)
        log(f"  Added rolling features: {len(out_df)} rows x {len(out_df.columns)} cols")

    out_df.to_csv(dst, index=False)
    log(f"  -> {dst.name}: {len(out_df)} weekly rows ({len(out_df):,} records)")
    return out_df


# =====================================================================
# 2. KAGGLE ER WAIT TIME -> ETA TRAINING DATA
# =====================================================================
def integrate_eta():
    """Transform kaggle_er_wait_time.csv -> kaggle_eta_train.csv

    ER wait time dataset has rich features: Urgency Level, Facility Size,
    Nurse-to-Patient Ratio, Time to Medical Professional, Total Wait Time, etc.

    We map these to ETA-like features for ambulance response time prediction.
    Total Wait Time serves as a realistic proxy for emergency response time.
    """
    src = ML_DIR / "kaggle_er_wait_time.csv"
    dst = ML_DIR / "kaggle_eta_train.csv"

    if not src.exists():
        log(f"[SKIP] {src.name} not found")
        return

    df = pd.read_csv(src)
    log(f"  Loading {src.name}: {len(df)} rows")

    # Map time of day to hour (for model compatibility)
    tod_map = {
        "Early Morning": 6, "Late Morning": 10,
        "Afternoon": 14, "Evening": 19, "Night": 23,
    }
    df["hour"] = df["Time of Day"].map(tod_map).fillna(12).astype(int)

    # Map urgency level to emergency_type (for model compatibility)
    urgency_map = {
        "Low": "non_emergency",
        "Medium": "medical_emergency",
        "High": "accident",
        "Critical": "cardiac_issue",
    }
    df["emergency_type"] = df["Urgency Level"].map(urgency_map).fillna("medical_emergency")

    # Map day of week to numeric
    dow_map = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6,
    }
    df["day_of_week"] = df["Day of Week"].map(dow_map).fillna(0).astype(int)

    # Map season to numeric
    season_map = {"Winter": 0, "Spring": 1, "Summer": 2, "Fall": 3}
    df["season_code"] = df["Season"].map(season_map).fillna(0).astype(int)

    # Create distance_km estimate from facility size and region
    np.random.seed(42)
    df["distance_km"] = np.where(
        df["Region"] == "Urban",
        np.random.uniform(2, 12, len(df)),
        np.random.uniform(5, 25, len(df)),
    )
    df["distance_km"] = df["distance_km"].round(1)

    # Create traffic_level from time of day
    df["traffic_level"] = df["hour"].apply(
        lambda h: "heavy" if h in (7, 8, 9, 17, 18, 19)
        else "moderate" if h in (6, 10, 11, 15, 16, 20)
        else "low"
    )

    # Map urgency to response priority
    df["is_critical"] = (df["Urgency Level"] == "Critical").astype(int)

    # Target: Total Wait Time -> eta_minutes
    df["eta_minutes"] = df["Total Wait Time (min)"]

    # Select and rename columns
    out_df = pd.DataFrame({
        # Columns for current ETA model
        "distance_km": df["distance_km"],
        "hour": df["hour"],
        "eta_minutes": df["eta_minutes"],
        # Extra rich features for improved model
        "emergency_type": df["emergency_type"],
        "is_critical": df["is_critical"],
        "day_of_week": df["day_of_week"],
        "season_code": df["season_code"],
        "traffic_level": df["traffic_level"],
        "nurse_to_patient_ratio": df["Nurse-to-Patient Ratio"],
        "specialist_availability": df["Specialist Availability"],
        "facility_beds": df["Facility Size (Beds)"],
        "time_to_registration": df["Time to Registration (min)"],
        "time_to_triage": df["Time to Triage (min)"],
        "time_to_medical_professional": df["Time to Medical Professional (min)"],
        "patient_outcome": df["Patient Outcome"],
        "patient_satisfaction": df["Patient Satisfaction"],
        "region": df["Region"],
        "hospital_name": df["Hospital Name"],
        "hospital_id": df["Hospital ID"],
    })

    out_df.to_csv(dst, index=False)
    log(f"  -> {dst.name}: {len(out_df):,} rows")
    return out_df


# =====================================================================
# 3. KAGGLE HOSPITAL EMERGENCY -> ADMISSION PREDICTION
# =====================================================================
def integrate_admission():
    """Transform kaggle_hospital_emergency.csv -> kaggle_admission_train.csv

    Emergency dataset has: Patient Age, Gender, Race, Department Referral,
    Admission Flag (target), Wait Time, Satisfaction Score, Patients CM.

    We create a classification-ready dataset for admission prediction.
    """
    src = ML_DIR / "kaggle_hospital_emergency.csv"
    dst = ML_DIR / "kaggle_admission_train.csv"

    if not src.exists():
        log(f"[SKIP] {src.name} not found")
        return

    df = pd.read_csv(src)
    log(f"  Loading {src.name}: {len(df)} rows")

    # Target: binarize admission flag
    df["admitted"] = df["Patient Admission Flag"].astype(int)

    # Encode gender
    df["gender_code"] = df["Patient Gender"].map({"M": 0, "F": 1, "NC": 2}).fillna(2).astype(int)

    # Clean categorical features
    df["department_referral"] = df["Department Referral"].fillna("Unknown")
    df["patient_race"] = df["Patient Race"].fillna("Unknown")

    # Clean wait time (already int)
    df["wait_time"] = df["Patient Waittime"]

    # Clean satisfaction (some missing)
    df["satisfaction_score"] = df["Patient Satisfaction Score"].fillna(
        df["Patient Satisfaction Score"].median()
    )

    # Patients CM -> case mix index
    df["patients_cm"] = df["Patients CM"]

    # Create derived features
    df["age_group"] = pd.cut(
        df["Patient Age"],
        bins=[0, 18, 35, 50, 65, 120],
        labels=["pediatric", "young_adult", "adult", "middle_age", "senior"]
    ).astype(str)

    out_df = pd.DataFrame({
        "age": df["Patient Age"],
        "age_group": df["age_group"],
        "gender_code": df["gender_code"],
        "gender": df["Patient Gender"],
        "race": df["patient_race"],
        "department_referral": df["department_referral"],
        "wait_time_min": df["wait_time"],
        "satisfaction_score": df["satisfaction_score"].round(1),
        "patients_cm": df["patients_cm"],
        "admitted": df["admitted"],
    })

    out_df.to_csv(dst, index=False)
    admission_rate = 100 * out_df['admitted'].sum() / len(out_df)
    log(f"  -> {dst.name}: {len(out_df):,} rows ({out_df['admitted'].sum():,} admitted, {admission_rate:.1f}% admission rate)")
    return out_df


# =====================================================================
# 4. KAGGLE PUNE HOSPITALS -> HOSPITAL RESOURCE DATASET
# =====================================================================
def integrate_hospital_resources():
    """Transform kaggle_pune_hospitals.csv -> kaggle_hospital_resources_train.csv

    Pune hospitals data has: beds, doctors, nurses, footfall, ambulance info.
    """
    src = ML_DIR / "kaggle_pune_hospitals.csv"
    dst = ML_DIR / "kaggle_hospital_resources_train.csv"

    if not src.exists():
        log(f"[SKIP] {src.name} not found")
        return

    df = pd.read_csv(src)
    log(f"  Loading {src.name}: {len(df)} rows")

    # Find columns with fuzzy matching (column names have spaces/parentheses)
    def find_col(col_df, patterns):
        for c in col_df.columns:
            c_lower = c.lower()
            for p in patterns:
                if p in c_lower:
                    return c
        return None

    bed_emergency_col = find_col(df, ["emergency ward", "emergency bed"])
    bed_facility_col = find_col(df, ["bed in facility", "bed facility"])
    doctors_col = find_col(df, ["doctor", "physician"])
    nurses_col = find_col(df, ["nurse"])
    footfall_col = find_col(df, ["footfall", "patient"])
    ambulance_col = find_col(df, ["ambulance service"])
    ambulance_count_col = find_col(df, ["count of ambulance"])
    pharmacy_col = find_col(df, ["pharmacy"])
    type_col = find_col(df, ["type  (hospital", "type"])
    class_col = find_col(df, ["class"])
    facility_col = find_col(df, ["facility name"])
    zone_col = find_col(df, ["zone name"])

    # Clean numeric columns
    def clean_num(val):
        if pd.isna(val):
            return 0
        if isinstance(val, str):
            val = val.strip().replace(",", "")
            try:
                return float(val) if "." in val else int(float(val))
            except ValueError:
                return 0
        return val

    out_data = []
    for _, row in df.iterrows():
        entry = {
            "facility_name": str(row.get(facility_col, "")).strip() if facility_col else "",
            "zone": str(row.get(zone_col, "")).strip() if zone_col else "",
            "type": str(row.get(type_col, "")).strip() if type_col else "",
            "class": str(row.get(class_col, "")).strip() if class_col else "",
            "pharmacy_available": str(row.get(pharmacy_col, "")).strip() if pharmacy_col else "No",
            "beds_emergency": clean_num(row.get(bed_emergency_col, 0)),
            "beds_total": clean_num(row.get(bed_facility_col, 0)),
            "doctors": clean_num(row.get(doctors_col, 0)),
            "nurses": clean_num(row.get(nurses_col, 0)),
            "monthly_footfall": clean_num(row.get(footfall_col, 0)),
            "ambulance_service": "Yes" if ambulance_col and str(row.get(ambulance_col, "")).strip().lower() == "yes" else "No",
            "ambulance_count": clean_num(row.get(ambulance_count_col, 0)),
        }
        # Compute derived metrics
        entry["bed_occupancy_rate"] = round(
            entry["monthly_footfall"] / max(entry["beds_total"], 1) / 30, 2
        ) if entry["beds_total"] > 0 else 0
        entry["doctor_to_bed_ratio"] = round(
            entry["doctors"] / max(entry["beds_total"], 1), 3
        )
        entry["nurse_to_doctor_ratio"] = round(
            entry["nurses"] / max(entry["doctors"], 1), 2
        ) if entry["doctors"] > 0 else 0
        entry["is_public"] = 1 if "public" in entry["class"].lower() else 0
        entry["is_hospital"] = 1 if "hospital" in entry["type"].lower() else 0
        out_data.append(entry)

    out_df = pd.DataFrame(out_data)
    out_df.to_csv(dst, index=False)
    n_public = out_df['is_public'].sum()
    log(f"  -> {dst.name}: {len(out_df):,} hospitals")
    log(f"    Public: {n_public}, Private: {len(out_df) - n_public}")
    log(f"    Avg beds_total: {out_df['beds_total'].mean():.0f}, Avg doctors: {out_df['doctors'].mean():.0f}")
    return out_df


# =====================================================================
# MAIN
# =====================================================================
def main():
    log("=" * 60)
    log("Kaggle Data Integration Pipeline")
    log("=" * 60)

    log("\n[1/4] Bed Forecast - kaggle_hospital_beds.csv -> kaggle_bed_forecast_train.csv")
    integrate_bed_forecast()

    log("\n[2/4] ETA - kaggle_er_wait_time.csv -> kaggle_eta_train.csv")
    integrate_eta()

    log("\n[3/4] Admission Prediction - kaggle_hospital_emergency.csv -> kaggle_admission_train.csv")
    integrate_admission()

    log("\n[4/4] Hospital Resources - kaggle_pune_hospitals.csv -> kaggle_hospital_resources_train.csv")
    integrate_hospital_resources()

    log("\n" + "=" * 60)
    log("Integration complete!")
    log("=" * 60)

    # Show generated files
    for f in sorted(ML_DIR.glob("kaggle_*_train.csv")):
        sz = f.stat().st_size // 1024
        rows_df = pd.read_csv(f)
        log(f"  {f.name:50s} {len(rows_df):>6,} rows  {sz:>5} KB")


if __name__ == "__main__":
    main()
