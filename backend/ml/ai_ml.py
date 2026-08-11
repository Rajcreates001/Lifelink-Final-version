"""
LifeLink ML — Backward-Compatible Entry Point
===============================================
Re-exports all functions from features, utils, train, and predict modules.

Preserves backward compatibility for:
  1. `python ai_ml.py <command> <json>`  (called by ml_runner.py as subprocess)
  2. `import ai_ml; ai_ml.predict_inventory(...)`  (used by test_inventory.py)
"""

import json
import os
import sys

# ─── Ensure sibling modules are importable ────────────────────────
# This is needed because ai_ml.py is run both as a standalone script
# (by ml_runner.py via subprocess) and imported as a module (by test_inventory.py).
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

# ─── Re-export all public symbols ──────────────────────────────────
from features import (  # noqa: E402
    MODEL_CONFIGS,
    SEVERITY_LABEL_MAP,
    SEVERITY_SCORE_MAP,
    get_model_config,
    model_file_path,
)
from utils import (  # noqa: E402
    analyze_medical_report,
    predict_sos_severity,
    get_priority,
    _get_discretized_state,
    _get_reward,
    _get_city_graph,
)
from train import (  # noqa: E402
    train_and_save_model,
    train_compatibility_model,
    train_recommendation_model,
    train_health_risk_model,
    train_activity_cluster_model,
    train_behavior_forecast_model,
    train_emergency_hotspot_model,
    train_outbreak_forecast_model,
    train_severity_model,
    train_availability_model,
    train_allocation_model,
    train_policy_segmentation_model,
    train_healthcare_performance_model,
    train_anomaly_detection_model,
    train_hospital_severity_model,
    train_eta_model,
    train_bed_forecast_model,
    train_staff_allocation_model,
    train_hospital_performance_model,
    train_recovery_model,
    train_stay_duration_model,
    train_hospital_disease_forecast_model,
    train_inventory_model,
    # Kaggle-integrated models
    train_kaggle_bed_forecast_model,
    train_kaggle_eta_model,
    train_admission_model,
    train_hospital_capacity_model,
)
from predict import (  # noqa: E402
    predict_emergency,
    predict_compatibility,
    predict_hospital_recommendation,
    predict_health_risk,
    predict_activity_cluster,
    predict_behavior_forecast,
    predict_emergency_hotspots,
    predict_outbreak_forecast,
    predict_severity,
    predict_availability,
    predict_allocation,
    predict_policy_segmentation,
    predict_healthcare_performance,
    predict_anomaly,
    predict_hospital_severity,
    predict_eta_route,
    predict_bed_forecast,
    predict_staff_allocation,
    predict_hospital_performance,
    predict_recovery,
    predict_stay_duration,
    predict_hospital_disease_forecast,
    predict_inventory,
    # Kaggle-integrated models
    predict_kaggle_bed_forecast,
    predict_kaggle_eta,
    predict_admission,
    predict_hospital_capacity,
)

__all__ = [
    # features
    "MODEL_CONFIGS",
    "SEVERITY_LABEL_MAP",
    "SEVERITY_SCORE_MAP",
    "get_model_config",
    "model_file_path",
    # utils
    "analyze_medical_report",
    "predict_sos_severity",
    "get_priority",
    "_get_discretized_state",
    "_get_reward",
    "_get_city_graph",
    # train
    "train_and_save_model",
    "train_compatibility_model",
    "train_recommendation_model",
    "train_health_risk_model",
    "train_activity_cluster_model",
    "train_behavior_forecast_model",
    "train_emergency_hotspot_model",
    "train_outbreak_forecast_model",
    "train_severity_model",
    "train_availability_model",
    "train_allocation_model",
    "train_policy_segmentation_model",
    "train_healthcare_performance_model",
    "train_anomaly_detection_model",
    "train_hospital_severity_model",
    "train_eta_model",
    "train_bed_forecast_model",
    "train_staff_allocation_model",
    "train_hospital_performance_model",
    "train_recovery_model",
    "train_stay_duration_model",
    "train_hospital_disease_forecast_model",
    "train_inventory_model",
    # Kaggle models
    "train_kaggle_bed_forecast_model",
    "train_kaggle_eta_model",
    "train_admission_model",
    "train_hospital_capacity_model",
    # predict
    "predict_emergency",
    "predict_compatibility",
    "predict_hospital_recommendation",
    "predict_health_risk",
    "predict_activity_cluster",
    "predict_behavior_forecast",
    "predict_emergency_hotspots",
    "predict_outbreak_forecast",
    "predict_severity",
    "predict_availability",
    "predict_allocation",
    "predict_policy_segmentation",
    "predict_healthcare_performance",
    "predict_anomaly",
    "predict_hospital_severity",
    "predict_eta_route",
    "predict_bed_forecast",
    "predict_staff_allocation",
    "predict_hospital_performance",
    "predict_recovery",
    "predict_stay_duration",
    "predict_hospital_disease_forecast",
    "predict_inventory",
    # Kaggle models
    "predict_kaggle_bed_forecast",
    "predict_kaggle_eta",
    "predict_admission",
    "predict_hospital_capacity",
]


# =====================================================================
# CLI Dispatcher  (used by ml_runner.py: `python ai_ml.py <command> <json>`)
# =====================================================================

_COMMAND_MAP = {
    # Training commands
    "train": train_and_save_model,
    "train_compat": train_compatibility_model,
    "train_recommend": train_recommendation_model,
    "train_health_risk": train_health_risk_model,
    "train_cluster": train_activity_cluster_model,
    "train_behavior": train_behavior_forecast_model,
    "train_hotspot": train_emergency_hotspot_model,
    "train_outbreak": train_outbreak_forecast_model,
    "train_severity": train_severity_model,
    "train_availability": train_availability_model,
    "train_alloc": train_allocation_model,
    "train_policy_seg": train_policy_segmentation_model,
    "train_performance": train_healthcare_performance_model,
    "train_anomaly": train_anomaly_detection_model,
    "train_hospital_severity": train_hospital_severity_model,
    "train_eta": train_eta_model,
    "train_bed_forecast": train_bed_forecast_model,
    "train_staff_alloc": train_staff_allocation_model,
    "train_hosp_perf": train_hospital_performance_model,
    "train_recovery": train_recovery_model,
    "train_stay": train_stay_duration_model,
    "train_hosp_disease": train_hospital_disease_forecast_model,
    "train_inventory": train_inventory_model,
    # Prediction commands
    "predict": predict_emergency,
    "predict_eta": predict_eta_route,
    "predict_bed_forecast": predict_bed_forecast,
    "predict_staff_alloc": predict_staff_allocation,
    "predict_hosp_disease": predict_hospital_disease_forecast,
    "predict_compat": predict_compatibility,
    "predict_recommend": predict_hospital_recommendation,
    "predict_hotspots": predict_emergency_hotspots,
    "predict_health_risk": predict_health_risk,
    "predict_cluster": predict_activity_cluster,
    "predict_behavior": predict_behavior_forecast,
    "predict_outbreak": predict_outbreak_forecast,
    "predict_severity": predict_severity,
    "predict_availability": predict_availability,
    "predict_alloc": predict_allocation,
    "predict_policy_seg": predict_policy_segmentation,
    "predict_performance": predict_healthcare_performance,
    "predict_anomaly": predict_anomaly,
    "predict_hospital_severity": predict_hospital_severity,
    "predict_hosp_perf": predict_hospital_performance,
    "predict_recovery": predict_recovery,
    "predict_stay": predict_stay_duration,
    "predict_inventory": predict_inventory,
    "predict_sos_severity": predict_sos_severity,
    # ── Aliases (route-facing command names → canonical functions) ──
    # Routes in app/routes/ai.py and app/routes/v2/ml.py call these names;
    # map them to the canonical predict_* functions so predictions run
    # directly instead of degrading to a "queued" stub.
    "predict_risk": predict_health_risk,
    "predict_forecast": predict_behavior_forecast,
    "predict_hosp_severity": predict_hospital_severity,
    "predict_forecast_outbreak": predict_outbreak_forecast,
    "predict_allocation": predict_allocation,
    "predict_perf_score": predict_healthcare_performance,
    "predict_hotspot": predict_emergency_hotspots,
    "analyze_report": analyze_medical_report,
    # Kaggle models
    "train_kaggle_bed_forecast": train_kaggle_bed_forecast_model,
    "train_kaggle_eta": train_kaggle_eta_model,
    "train_admission": train_admission_model,
    "train_hospital_capacity": train_hospital_capacity_model,
    "predict_kaggle_bed_forecast": predict_kaggle_bed_forecast,
    "predict_kaggle_eta": predict_kaggle_eta,
    "predict_admission": predict_admission,
    "predict_hospital_capacity": predict_hospital_capacity,
}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ai_ml.py <command> [json_input]"}))
        sys.exit(1)

    command = sys.argv[1]
    input_data = {}
    if len(sys.argv) > 2:
        try:
            input_data = json.loads(sys.argv[2])
        except (json.JSONDecodeError, IndexError):
            pass

    if command not in _COMMAND_MAP:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)

    func = _COMMAND_MAP[command]

    # Training commands with optional CSV path
    if command.startswith("train_"):
        csv_arg = input_data.get("csv_path") if isinstance(input_data, dict) else None
        result = func(csv_path=csv_arg) if csv_arg else func()
    else:
        result = func(input_data)

    if result is not None:
        print(json.dumps(result))


if __name__ == "__main__":
    main()
