"""
LifeLink ML Pipeline — API Endpoints
=====================================
Endpoints for model registry, versioning, retraining, and monitoring.
"""

import time
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.services.ml_pipeline import get_registry

logger = logging.getLogger("lifelink.ml_pipeline_api")
router = APIRouter(tags=["ml-pipeline"])


# ─── Registry Endpoints ──────────────────────────────────────

@router.get("/models")
async def list_models():
    """List all registered ML models with their current status."""
    registry = get_registry()
    models = registry.get_all_models()
    return {
        "count": len(models),
        "models": [{
            "name": m["name"],
            "display_name": m["display_name"],
            "description": m["description"],
            "category": m["category"],
            "current_version": m["current_version"],
            "last_retrained": m["last_retrained"],
            "auto_retrain": m["auto_retrain"],
            "versions_count": len(m.get("versions", [])),
            "status": "active" if m.get("current_version", 0) > 0 else "untrained",
        } for m in models],
    }


@router.get("/models/{model_name}")
async def get_model(model_name: str):
    """Get detailed information about a specific model."""
    registry = get_registry()
    model = registry.get_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    return model


@router.get("/models/{model_name}/versions")
async def get_model_versions(model_name: str):
    """Get all versions of a model with their metrics."""
    registry = get_registry()
    versions = registry.get_model_versions(model_name)
    if not versions:
        raise HTTPException(status_code=404, detail=f"No versions found for '{model_name}'")
    return {
        "model": model_name,
        "count": len(versions),
        "versions": versions,
    }


@router.get("/models/{model_name}/compare")
async def compare_versions(model_name: str):
    """Compare metrics across all versions of a model."""
    registry = get_registry()
    comparisons = registry.compare_versions(model_name)
    if not comparisons:
        raise HTTPException(status_code=404, detail=f"No versions found for '{model_name}'")
    return {
        "model": model_name,
        "comparisons": comparisons,
    }


@router.get("/models/{model_name}/current")
async def get_current_version(model_name: str):
    """Get the current active version of a model."""
    registry = get_registry()
    version = registry.get_current_version(model_name)
    if not version:
        raise HTTPException(status_code=404, detail=f"No active version for '{model_name}'")
    return version


# ─── Drift Detection ─────────────────────────────────────────

@router.get("/models/{model_name}/drift")
async def check_drift(model_name: str):
    """Check if a model needs retraining based on performance drift."""
    registry = get_registry()
    drift = registry.check_drift(model_name)
    return {"model": model_name, **drift}


@router.get("/drift/all")
async def check_all_drift():
    """Check drift for all models."""
    registry = get_registry()
    results = []
    for name in registry.registry["models"]:
        drift = registry.check_drift(name)
        results.append({"model": name, **drift})
    needs_retrain = [r for r in results if r.get("needs_retrain")]
    return {
        "total": len(results),
        "needs_retrain": len(needs_retrain),
        "models": results,
    }


# ─── Retraining ──────────────────────────────────────────────

# Global retrain state
_retrain_status = {"running": False, "current_model": "", "progress": 0, "last_run": ""}


def _run_retrain(model_name: str):
    """Background task to retrain a model."""
    _retrain_status["running"] = True
    _retrain_status["current_model"] = model_name
    _retrain_status["progress"] = 0

    try:
        import subprocess
        import sys

        start_time = time.time()

        # Run the retraining script for the specific model
        result = subprocess.run(
            [sys.executable, "-m", "ml.train", "--model", model_name],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent),
        )

        duration = time.time() - start_time

        # Register the new version
        registry = get_registry()
        model_path = str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent / "ml" / f"{model_name}.joblib")

        metrics = {"accuracy": 0.0}
        # Try to parse metrics from output
        for line in result.stdout.split("\n"):
            if "accuracy" in line.lower():
                try:
                    acc = float(line.split("=")[-1].strip())
                    metrics["accuracy"] = acc
                except (ValueError, IndexError):
                    pass

        registry.register_new_version(
            name=model_name,
            model_path=model_path,
            metrics=metrics,
            training_duration=duration,
            notes=f"Automated retrain at {datetime.now(timezone.utc).isoformat()}",
        )

        _retrain_status["progress"] = 100
        logger.info(f"Retrained {model_name} in {duration:.1f}s")

    except Exception as e:
        logger.error(f"Retrain failed for {model_name}: {e}")
    finally:
        _retrain_status["running"] = False
        _retrain_status["current_model"] = ""
        _retrain_status["last_run"] = datetime.now(timezone.utc).isoformat()


@router.post("/retrain/{model_name}")
async def retrain_model(model_name: str, background_tasks: BackgroundTasks):
    """Trigger retraining for a specific model (runs in background)."""
    if _retrain_status["running"]:
        raise HTTPException(status_code=409, detail="Retraining already in progress")

    registry = get_registry()
    if model_name not in registry.registry["models"]:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    background_tasks.add_task(_run_retrain, model_name)
    return {
        "status": "started",
        "model": model_name,
        "message": f"Retraining started for {model_name}",
    }


@router.post("/retrain/all")
async def retrain_all(background_tasks: BackgroundTasks):
    """Trigger retraining for all models that need it."""
    if _retrain_status["running"]:
        raise HTTPException(status_code=409, detail="Retraining already in progress")

    registry = get_registry()
    schedule = registry.get_retrain_schedule()
    models_to_retrain = [s["model"] for s in schedule if s["needs_retrain"]]

    if not models_to_retrain:
        return {"status": "no_action", "message": "All models are up to date"}

    # Queue retraining for each model
    for model_name in models_to_retrain:
        background_tasks.add_task(_run_retrain, model_name)

    return {
        "status": "started",
        "models": models_to_retrain,
        "count": len(models_to_retrain),
        "message": f"Retraining queued for {len(models_to_retrain)} models",
    }


@router.get("/retrain/status")
async def retrain_status():
    """Get the current retraining status."""
    return _retrain_status


@router.get("/retrain/schedule")
async def retrain_schedule():
    """Get the retraining schedule for all models."""
    registry = get_registry()
    schedule = registry.get_retrain_schedule()
    return {
        "count": len(schedule),
        "needs_retrain": sum(1 for s in schedule if s["needs_retrain"]),
        "schedule": schedule,
    }


# ─── Statistics ──────────────────────────────────────────────

@router.get("/stats")
async def pipeline_stats():
    """Get overall ML pipeline statistics."""
    registry = get_registry()
    return registry.get_stats()
