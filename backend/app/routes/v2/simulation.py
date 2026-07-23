"""
LifeLink Simulation API — Mesa Agent-Based Emergency Simulation

Replaces the old mock simulation with real Mesa agent-based modeling.
Endpoints:
- POST /v2/government/simulation/start  → Start a new simulation (Mesa-based)
- POST /v2/government/simulation/comparative  → Run traditional vs LifeLink comparison
- GET  /v2/government/simulation/scenarios  → List available scenarios
- POST /v2/government/simulation/after-action/{session_id}  → Generate report
"""

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import require_roles
from app.services.simulation.emergency_model import (
    SCENARIOS,
    run_simulation,
    run_comparative_simulation,
)

logger = logging.getLogger("lifelink.simulation.api")
router = APIRouter(prefix="/government/simulation", tags=["Simulation"])


@router.get("/scenarios")
async def list_scenarios(ctx=Depends(require_roles("government"))):
    """List all available simulation scenarios."""
    return {
        "scenarios": [
            {
                "name": s.name,
                "display_name": s.display_name,
                "description": s.description,
                "num_incidents": s.num_incidents,
                "num_ambulances": s.num_ambulances,
                "num_hospitals": s.num_hospitals,
            }
            for s in SCENARIOS.values()
        ]
    }


@router.post("/start")
async def start_simulation(
    payload: dict,
    ctx=Depends(require_roles("government")),
):
    """Run a Mesa-based emergency simulation with real agent behavior."""
    scenario = payload.get("scenario", "default")
    steps = min(payload.get("steps", 120), 300)  # Cap at 300 steps

    if scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario}")

    logger.info(f"Starting Mesa simulation: scenario={scenario}, steps={steps}")
    session_id = str(uuid.uuid4())

    result = run_simulation(scenario, steps)

    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Simulation failed"))

    return {
        "session_id": session_id,
        "status": "completed",
        "scenario": scenario,
        "steps_run": steps,
        "metrics": result,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/comparative")
async def comparative_simulation(
    payload: dict,
    ctx=Depends(require_roles("government")),
):
    """Run twin simulations: Traditional vs LifeLink-optimized."""
    scenario = payload.get("scenario", "earthquake")
    steps = min(payload.get("steps", 120), 300)

    if scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario}")

    logger.info(f"Running comparative simulation: {scenario} ({steps} steps)")

    result = run_comparative_simulation(scenario, steps)

    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Simulation failed"))

    return {
        "session_id": str(uuid.uuid4()),
        "status": "completed",
        "scenario": scenario,
        "steps_run": steps,
        "result": result,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/after-action/{session_id}")
async def after_action_report(
    session_id: str,
    payload: dict,
    ctx=Depends(require_roles("government")),
):
    """Generate after-action report from simulation metrics."""
    metrics = payload.get("metrics", {})
    # The metrics are already computed by the simulation engine
    # This endpoint formats them into the standard after-action report structure

    summary = metrics.get("summary", {})
    m = metrics.get("metrics", {})

    recommendations = metrics.get("recommendations", [])
    if not recommendations:
        recommendations = ["Simulation completed within normal parameters."]

    return {
        "session_id": session_id,
        "report": {
            "summary": summary,
            "metrics": m,
            "recommendations": recommendations,
            "timeline": metrics.get("timeline", []),
        },
        "generated_at": datetime.utcnow().isoformat(),
    }
