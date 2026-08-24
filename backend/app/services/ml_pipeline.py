"""
LifeLink ML Pipeline — Model Registry & Automated Retraining
=============================================================
Provides:
- Model versioning with performance metrics tracking
- Automated retraining scheduler with configurable intervals
- Model comparison between versions
- Health monitoring for model drift
"""

import json
import os
import time
import logging
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger("lifelink.ml_pipeline")

# ─── Paths ───────────────────────────────────────────────────
ML_DIR = Path(__file__).resolve().parent.parent.parent / "ml"
REGISTRY_FILE = ML_DIR / "model_registry.json"
VERSIONS_DIR = ML_DIR / "versions"
RETRAIN_LOG = ML_DIR / "retrain_history.json"


# ─── Data Classes ────────────────────────────────────────────

@dataclass
class ModelVersion:
    """A single version of an ML model."""
    version: int
    model_path: str
    created_at: str
    metrics: dict = field(default_factory=dict)
    training_samples: int = 0
    training_duration_seconds: float = 0.0
    notes: str = ""
    status: str = "active"  # active, archived, deprecated


@dataclass
class ModelEntry:
    """Registry entry for an ML model."""
    name: str
    display_name: str
    description: str
    current_version: int = 1
    versions: list = field(default_factory=list)
    retrain_interval_hours: int = 24
    last_retrained: str = ""
    auto_retrain: bool = True
    min_accuracy: float = 0.7  # Minimum accuracy to consider model valid
    category: str = "general"  # general, emergency, hospital, ambulance, government


# ─── Model Registry ──────────────────────────────────────────

class ModelRegistry:
    """Manages model versions, performance tracking, and retraining."""

    # Known models with metadata
    KNOWN_MODELS = {
        "emergency_classifier": {
            "display_name": "Emergency Triage Classifier",
            "description": "Classifies emergency cases by severity level",
            "category": "emergency",
            "min_accuracy": 0.75,
        },
        "emergency_hotspot_model": {
            "display_name": "Emergency Hotspot Predictor",
            "description": "Predicts geographic emergency hotspots",
            "category": "emergency",
            "min_accuracy": 0.70,
        },
        "hospital_performance_model": {
            "display_name": "Hospital Performance Scorer",
            "description": "Scores hospital quality and efficiency",
            "category": "hospital",
            "min_accuracy": 0.72,
        },
        "healthcare_performance_model": {
            "display_name": "Healthcare System Performance",
            "description": "System-wide healthcare performance metrics",
            "category": "hospital",
            "min_accuracy": 0.70,
        },
        "staff_allocation_model": {
            "display_name": "Staff Allocation Optimizer",
            "description": "Optimizes staff scheduling and allocation",
            "category": "hospital",
            "min_accuracy": 0.68,
        },
        "recovery_model": {
            "display_name": "Patient Recovery Predictor",
            "description": "Predicts patient recovery timelines",
            "category": "hospital",
            "min_accuracy": 0.65,
        },
        "compatibility_model": {
            "display_name": "Donor Compatibility Matcher",
            "description": "Matches donors with recipients",
            "category": "hospital",
            "min_accuracy": 0.75,
        },
        "behavior_forecast_model": {
            "display_name": "Patient Behavior Forecaster",
            "description": "Forecasts patient behavior patterns",
            "category": "hospital",
            "min_accuracy": 0.68,
        },
        "activity_cluster_model": {
            "display_name": "Activity Cluster Analyzer",
            "description": "Clusters patient activity patterns",
            "category": "hospital",
            "min_accuracy": 0.70,
        },
        "policy_segmentation_model": {
            "display_name": "Policy Segmentation Model",
            "description": "Segments insurance policyholders",
            "category": "government",
            "min_accuracy": 0.72,
        },
    }

    def __init__(self):
        VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
        self.registry = self._load_registry()

    def _load_registry(self) -> dict:
        """Load or initialize the model registry."""
        if REGISTRY_FILE.exists():
            try:
                with open(REGISTRY_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                logger.warning("Corrupt registry file, initializing fresh")

        # Initialize with known models
        registry = {"models": {}, "metadata": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0",
        }}
        for name, info in self.KNOWN_MODELS.items():
            model_path = ML_DIR / f"{name}.joblib"
            entry = ModelEntry(
                name=name,
                display_name=info["display_name"],
                description=info["description"],
                category=info["category"],
                min_accuracy=info.get("min_accuracy", 0.7),
                current_version=1 if model_path.exists() else 0,
                last_retrained=datetime.now(timezone.utc).isoformat() if model_path.exists() else "",
            )
            if model_path.exists():
                entry.versions.append(ModelVersion(
                    version=1,
                    model_path=str(model_path),
                    created_at=datetime.now(timezone.utc).isoformat(),
                    status="active",
                    notes="Initial version",
                ))
            registry["models"][name] = asdict(entry)

        self._save_registry(registry)
        return registry

    def _save_registry(self, registry: dict = None):
        """Save registry to disk."""
        reg = registry or self.registry
        reg["metadata"]["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(REGISTRY_FILE, "w") as f:
            json.dump(reg, f, indent=2, default=str)

    def get_all_models(self) -> list:
        """Get all registered models."""
        return list(self.registry["models"].values())

    def get_model(self, name: str) -> Optional[dict]:
        """Get a specific model entry."""
        return self.registry["models"].get(name)

    def register_new_version(
        self,
        name: str,
        model_path: str,
        metrics: dict = None,
        training_samples: int = 0,
        training_duration: float = 0.0,
        notes: str = "",
    ) -> dict:
        """Register a new version of a model after retraining."""
        if name not in self.registry["models"]:
            logger.warning(f"Model '{name}' not in registry, adding it")
            self.registry["models"][name] = asdict(ModelEntry(
                name=name,
                display_name=name.replace("_", " ").title(),
                description=f"Auto-registered model: {name}",
            ))

        entry = self.registry["models"][name]
        new_version = entry["current_version"] + 1

        # Archive current version
        for v in entry["versions"]:
            if v["status"] == "active":
                v["status"] = "archived"

        # Create version directory
        version_dir = VERSIONS_DIR / name
        version_dir.mkdir(parents=True, exist_ok=True)

        # Copy model to versioned location
        versioned_path = str(version_dir / f"v{new_version}.joblib")
        if os.path.exists(model_path):
            shutil.copy2(model_path, versioned_path)

        # Create version entry
        version = ModelVersion(
            version=new_version,
            model_path=versioned_path,
            created_at=datetime.now(timezone.utc).isoformat(),
            metrics=metrics or {},
            training_samples=training_samples,
            training_duration_seconds=training_duration,
            notes=notes,
            status="active",
        )

        entry["versions"].append(asdict(version))
        entry["current_version"] = new_version
        entry["last_retrained"] = datetime.now(timezone.utc).isoformat()

        self._save_registry()
        logger.info(f"Registered {name} v{new_version} (accuracy={metrics.get('accuracy', 'N/A') if metrics else 'N/A'})")

        return asdict(version)

    def get_model_versions(self, name: str) -> list:
        """Get all versions of a model."""
        entry = self.get_model(name)
        if not entry:
            return []
        return entry.get("versions", [])

    def get_current_version(self, name: str) -> Optional[dict]:
        """Get the current active version of a model."""
        entry = self.get_model(name)
        if not entry:
            return None
        for v in entry.get("versions", []):
            if v["status"] == "active":
                return v
        return entry["versions"][-1] if entry.get("versions") else None

    def compare_versions(self, name: str) -> list:
        """Compare metrics across all versions of a model."""
        versions = self.get_model_versions(name)
        comparisons = []
        for v in versions:
            comparisons.append({
                "version": v["version"],
                "status": v["status"],
                "created_at": v["created_at"],
                "metrics": v.get("metrics", {}),
                "training_samples": v.get("training_samples", 0),
                "training_duration_seconds": v.get("training_duration_seconds", 0),
                "notes": v.get("notes", ""),
            })
        return comparisons

    def check_drift(self, name: str) -> dict:
        """Check if a model needs retraining based on performance drift."""
        entry = self.get_model(name)
        if not entry:
            return {"needs_retrain": False, "reason": "Model not found"}

        current = self.get_current_version(name)
        if not current:
            return {"needs_retrain": True, "reason": "No active version"}

        # Check if enough time has passed since last retrain
        last_retrained = entry.get("last_retrained", "")
        if last_retrained:
            try:
                last_dt = datetime.fromisoformat(last_retrained.replace("Z", "+00:00"))
                hours_since = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
                if hours_since < entry.get("retrain_interval_hours", 24):
                    return {
                        "needs_retrain": False,
                        "reason": f"Last retrain {hours_since:.1f}h ago (interval: {entry['retrain_interval_hours']}h)",
                    }
            except (ValueError, TypeError):
                pass

        # Check if accuracy is below threshold
        metrics = current.get("metrics", {})
        accuracy = metrics.get("accuracy") or metrics.get("r2")
        min_acc = entry.get("min_accuracy", 0.7)
        if accuracy is not None and accuracy < min_acc:
            return {
                "needs_retrain": True,
                "reason": f"Accuracy {accuracy:.4f} below threshold {min_acc}",
                "current_accuracy": accuracy,
                "threshold": min_acc,
            }

        return {
            "needs_retrain": True,
            "reason": f"Interval elapsed (>{entry.get('retrain_interval_hours', 24)}h)",
        }

    def get_retrain_schedule(self) -> list:
        """Get retraining schedule for all models."""
        schedule = []
        for name, entry in self.registry["models"].items():
            if not entry.get("auto_retrain", True):
                continue
            drift = self.check_drift(name)
            schedule.append({
                "model": name,
                "display_name": entry.get("display_name", name),
                "category": entry.get("category", "general"),
                "current_version": entry.get("current_version", 0),
                "last_retrained": entry.get("last_retrained", ""),
                "retrain_interval_hours": entry.get("retrain_interval_hours", 24),
                "needs_retrain": drift.get("needs_retrain", False),
                "reason": drift.get("reason", ""),
            })
        return sorted(schedule, key=lambda x: (-x["needs_retrain"], x["model"]))

    def get_stats(self) -> dict:
        """Get overall ML pipeline statistics."""
        models = self.get_all_models()
        total_versions = sum(len(m.get("versions", [])) for m in models)
        active_models = sum(1 for m in models if m.get("current_version", 0) > 0)

        accuracies = []
        for m in models:
            for v in m.get("versions", []):
                acc = v.get("metrics", {}).get("accuracy")
                if acc is not None:
                    accuracies.append(acc)

        return {
            "total_models": len(models),
            "active_models": active_models,
            "total_versions": total_versions,
            "avg_accuracy": round(sum(accuracies) / len(accuracies), 4) if accuracies else 0,
            "min_accuracy": round(min(accuracies), 4) if accuracies else 0,
            "max_accuracy": round(max(accuracies), 4) if accuracies else 0,
            "categories": list(set(m.get("category", "general") for m in models)),
        }


# ─── Singleton ───────────────────────────────────────────────
_registry: Optional[ModelRegistry] = None


def get_registry() -> ModelRegistry:
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
    return _registry
