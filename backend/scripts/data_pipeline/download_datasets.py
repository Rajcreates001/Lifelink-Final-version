"""
LifeLink Data Pipeline — Programmatic Dataset Downloader

Downloads real healthcare datasets from multiple public sources.
All datasets saved to backend/ml/ with standardized naming.

Usage:
    SET PYTHONIOENCODING=utf-8
    python scripts/data_pipeline/download_datasets.py
"""

import csv
import os
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))
ML_DIR = ROOT / "ml"
ML_DIR.mkdir(parents=True, exist_ok=True)

# Set console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore


def log(msg: str) -> None:
    print(f"[data_pipeline] {msg}")


# ── 1. Kaggle Healthcare Datasets ──────────────────────────
def fetch_kaggle_datasets() -> list[str]:
    """Download Kaggle healthcare datasets via kagglehub."""
    downloaded = []
    datasets = [
        ("xavierberge/hospital-emergency-dataset", "kaggle_hospital_emergency.csv"),
        ("rivalytics/er-wait-time", "kaggle_er_wait_time.csv"),
        ("jaderz/hospital-beds-management", "kaggle_hospital_beds.csv"),
        ("prasad22/pmc-hospital-infrastructure", "kaggle_pune_hospitals.csv"),
    ]

    try:
        import kagglehub
        for dataset_slug, local_name in datasets:
            try:
                log(f"Kaggle: Downloading {dataset_slug}...")
                path = kagglehub.dataset_download(dataset_slug)
                if path:
                    p = Path(path)
                    csv_files = list(p.glob("*.csv"))
                    if csv_files:
                        import shutil
                        shutil.copy(csv_files[0], ML_DIR / local_name)
                        log(f"  -> Saved {local_name}")
                        downloaded.append(str(ML_DIR / local_name))
                    else:
                        files = list(p.iterdir())
                        log(f"  -> Files: {[f.name for f in files[:5]]}")
            except Exception as e:
                log(f"  -> Failed: {e}")
    except ImportError:
        log("Kaggle: kagglehub not installed, skipping")

    return downloaded


# ── 2. Generate Expanded Synthetic Datasets ───────────────
def generate_expanded_datasets() -> None:
    """Generate larger, realistic synthetic datasets (10,000 rows each)."""
    import random
    random.seed(42)

    datasets_config = [
        {
            "filename": "health_risk_expanded.csv",
            "rows": 10000,
            "fields": [
                "age", "bmi", "blood_pressure_sys", "blood_pressure_dia",
                "heart_rate", "oxygen_saturation", "glucose_level",
                "cholesterol", "smoking", "exercise_hours_week",
                "family_history", "risk_score", "risk_level"
            ],
        },
        {
            "filename": "eta_expanded.csv",
            "rows": 10000,
            "fields": [
                "distance_km", "traffic_level", "time_of_day",
                "day_of_week", "weather_condition", "emergency_type",
                "base_time_minutes", "actual_time_minutes"
            ],
        },
        {
            "filename": "bed_forecast_expanded.csv",
            "rows": 10000,
            "fields": [
                "hospital_capacity", "current_occupancy", "day_of_week",
                "month", "is_weekend", "season", "incoming_patients_24h",
                "discharges_24h", "predicted_demand_24h"
            ],
        },
        {
            "filename": "outbreak_expanded.csv",
            "rows": 10000,
            "fields": [
                "disease", "region", "population", "cases_reported",
                "hospitalizations", "deaths", "week", "year",
                "temperature_c", "humidity_pct", "previous_week_cases"
            ],
        },
        {
            "filename": "inventory_expanded.csv",
            "rows": 10000,
            "fields": [
                "item_name", "category", "current_stock", "daily_usage",
                "lead_time_days", "reorder_point", "unit_cost",
                "supplier_reliability", "days_until_stockout"
            ],
        },
        {
            "filename": "emergency_severity_expanded.csv",
            "rows": 10000,
            "fields": [
                "heart_rate", "blood_pressure_sys", "oxygen_saturation",
                "respiratory_rate", "age", "glasgow_coma_scale",
                "trauma_type", "chief_complaint", "severity_level"
            ],
        },
    ]

    for config in datasets_config:
        out_path = ML_DIR / config["filename"]
        rows = []

        for i in range(config["rows"]):
            row = {}
            for field in config["fields"]:
                if field == "age":
                    row[field] = random.randint(18, 90)
                elif field == "bmi":
                    row[field] = round(random.gauss(27, 5), 1)
                elif field == "blood_pressure_sys":
                    row[field] = random.randint(100, 180)
                elif field == "blood_pressure_dia":
                    row[field] = random.randint(60, 110)
                elif field == "heart_rate":
                    row[field] = random.randint(60, 100)
                elif field == "oxygen_saturation":
                    row[field] = round(random.gauss(97, 2), 1)
                elif field == "glucose_level":
                    row[field] = round(random.gauss(100, 25), 1)
                elif field == "cholesterol":
                    row[field] = round(random.gauss(190, 40), 1)
                elif field == "smoking":
                    row[field] = random.choice([0, 0, 0, 1])
                elif field == "exercise_hours_week":
                    row[field] = round(random.gauss(3, 2), 1)
                elif field == "family_history":
                    row[field] = random.choice([0, 0, 1])
                elif field == "risk_score":
                    row[field] = round(random.uniform(0, 100), 1)
                elif field == "risk_level":
                    score = row.get("risk_score", 50)
                    row[field] = "low" if score < 30 else "moderate" if score < 60 else "high"
                elif field == "distance_km":
                    row[field] = round(random.uniform(1, 30), 1)
                elif field == "traffic_level":
                    row[field] = random.choice(["low", "moderate", "heavy"])
                elif field == "time_of_day":
                    row[field] = random.choice(["morning", "afternoon", "evening", "night"])
                elif field == "day_of_week":
                    row[field] = random.randint(0, 6)
                elif field == "weather_condition":
                    row[field] = random.choice(["clear", "rain", "fog", "storm"])
                elif field == "emergency_type":
                    row[field] = random.choice(["cardiac", "trauma", "respiratory", "accident"])
                elif field == "base_time_minutes":
                    row[field] = round(random.uniform(5, 45), 1)
                elif field == "actual_time_minutes":
                    base = row.get("base_time_minutes", 15)
                    row[field] = round(base * random.uniform(0.8, 1.6), 1)
                elif field == "hospital_capacity":
                    row[field] = random.choice([200, 300, 400, 500])
                elif field == "current_occupancy":
                    row[field] = random.randint(100, 450)
                elif field == "month":
                    row[field] = random.randint(1, 12)
                elif field == "is_weekend":
                    row[field] = random.choice([0, 0, 0, 1])
                elif field == "season":
                    row[field] = random.choice(["winter", "spring", "summer", "fall"])
                elif field == "incoming_patients_24h":
                    row[field] = random.randint(10, 60)
                elif field == "discharges_24h":
                    row[field] = random.randint(5, 40)
                elif field == "predicted_demand_24h":
                    occ = row.get("current_occupancy", 200)
                    inc = row.get("incoming_patients_24h", 20)
                    dis = row.get("discharges_24h", 15)
                    row[field] = max(0, occ + inc - dis)
                elif field in ("disease",):
                    row[field] = random.choice(["influenza", "dengue", "covid19", "malaria"])
                elif field == "region":
                    row[field] = random.choice(["north", "south", "east", "west", "central"])
                elif field == "population":
                    row[field] = random.randint(50000, 5000000)
                elif field == "cases_reported":
                    row[field] = random.randint(10, 500)
                elif field == "hospitalizations":
                    row[field] = round(row.get("cases_reported", 100) * random.uniform(0.1, 0.3))
                elif field == "deaths":
                    row[field] = round(row.get("cases_reported", 100) * random.uniform(0.01, 0.05))
                elif field == "temperature_c":
                    row[field] = round(random.uniform(10, 40), 1)
                elif field == "humidity_pct":
                    row[field] = round(random.uniform(30, 90), 1)
                elif field == "previous_week_cases":
                    row[field] = round(row.get("cases_reported", 100) * random.uniform(0.5, 1.5))
                elif field in ("item_name",):
                    row[field] = f"Item_{random.randint(1, 500)}"
                elif field == "category":
                    row[field] = random.choice(["medicine", "equipment", "supplies", "blood_products"])
                elif field == "current_stock":
                    row[field] = random.randint(10, 1000)
                elif field == "daily_usage":
                    row[field] = round(random.gauss(15, 5), 1)
                elif field == "lead_time_days":
                    row[field] = random.randint(2, 14)
                elif field == "reorder_point":
                    row[field] = random.randint(20, 100)
                elif field == "unit_cost":
                    row[field] = round(random.uniform(5, 500), 2)
                elif field == "supplier_reliability":
                    row[field] = round(random.uniform(0.7, 1.0), 2)
                elif field == "days_until_stockout":
                    usage = row.get("daily_usage", 10)
                    stock = row.get("current_stock", 100)
                    row[field] = round(stock / max(usage, 0.1), 1)
                elif field == "respiratory_rate":
                    row[field] = random.randint(8, 40)
                elif field == "glasgow_coma_scale":
                    row[field] = random.randint(3, 15)
                elif field == "trauma_type":
                    row[field] = random.choice(["blunt", "penetrating", "burn", "none"])
                elif field == "chief_complaint":
                    row[field] = random.choice(["chest_pain", "dyspnea", "trauma", "altered_mental"])
                elif field == "severity_level":
                    row[field] = random.choice(["critical", "high", "moderate", "low"])
                else:
                    row[field] = ""

            rows.append(row)

        # Write CSV with UTF-8 BOM for Excel compatibility
        with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=config["fields"])
            writer.writeheader()
            writer.writerows(rows)

        size_kb = out_path.stat().st_size // 1024
        log(f"Generated {config['rows']} rows -> {config['filename']} ({size_kb} KB)")

    log(f"Total: {sum(c['rows'] for c in datasets_config)} rows across {len(datasets_config)} datasets")


# ── Main ───────────────────────────────────────────────────
def main() -> None:
    log("=" * 60)
    log("Starting LifeLink Data Pipeline")
    log("=" * 60)

    # 1. Kaggle
    log("\n[1/3] Fetching Kaggle datasets...")
    kaggle_files = fetch_kaggle_datasets()
    log(f"Downloaded {len(kaggle_files)} Kaggle datasets")

    # 2. Expanded synthetic
    log("\n[2/3] Generating expanded synthetic datasets...")
    generate_expanded_datasets()

    # 3. Summary
    log("\n[3/3] Pipeline Complete!")
    log("=" * 60)

    csv_files = sorted(ML_DIR.glob("*.csv"))
    log(f"Total CSVs in ml/ directory: {len(csv_files)}")
    total_size_kb = 0
    for f in csv_files:
        size = f.stat().st_size
        total_size_kb += size // 1024
        log(f"  {f.name:45s} {size // 1024:>6} KB")

    log(f"\nTotal size: {total_size_kb} KB")
    log("=" * 60)


if __name__ == "__main__":
    main()
