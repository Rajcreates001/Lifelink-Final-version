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
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import require_roles
from app.services.llm_service import generate_response_async
from app.services.simulation.emergency_model import (
    SCENARIOS,
    run_simulation,
    run_comparative_simulation
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


@router.post("/generate-scenario")
async def generate_scenario(
    payload: dict,
    ctx=Depends(require_roles("government")),
):
    """Use AI to dynamically generate a custom simulation scenario from a natural language description."""
    description = (payload.get("description") or "").strip()
    if not description:
        raise HTTPException(status_code=400, detail="description is required")

    logger.info(f"Generating AI scenario from: {description[:60]}...")

    prompt = (
        f"Generate a detailed emergency simulation scenario based on this description: {description}\n\n"
        "Return ONLY a valid JSON object with these exact fields (no markdown, no code fences):\n"
        "{\n"
        '  "name": "short_snake_case_name",\n'
        '  "display_name": "Human Readable Name",\n'
        '  "description": "One-sentence description of the emergency scenario.",\n'
        '  "num_incidents": <integer 10-200>,\n'
        '  "num_ambulances": <integer 5-50>,\n'
        '  "num_hospitals": <integer 3-15>,\n'
        '  "severity_distribution": { "critical": <0.0-1.0>, "high": <0.0-1.0>, "moderate": <0.0-1.0>, "low": <0.0-1.0> },\n'
        '  "traffic_multiplier": <1.0-3.0>\n'
        "}\n\n"
        "Ensure severity_distribution values sum to 1.0. "
        "Make the scenario realistic and challenging based on the description."
    )

    try:
        raw = await generate_response_async(prompt=prompt, mode="analysis")
        # Extract JSON from LLM response (handles reasoning prefix, text wrapping, code fences)
        raw_clean = raw.strip()
        # Remove markdown code fences if present
        if raw_clean.startswith("```"):
            raw_clean = raw_clean.split("\n", 1)[-1]
            raw_clean = raw_clean.rsplit("```", 1)[0]
            raw_clean = raw_clean.strip()
        # Find the first top-level JSON object using brace-depth tracking
        json_str = None
        brace_depth = 0
        start = -1
        in_string = False
        escape_next = False
        for i, ch in enumerate(raw_clean):
            if escape_next:
                escape_next = False
                continue
            if ch == '\\' and in_string:
                escape_next = True
                continue
            if ch == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{':
                if brace_depth == 0:
                    start = i
                brace_depth += 1
            elif ch == '}':
                brace_depth -= 1
                if brace_depth == 0 and start >= 0:
                    json_str = raw_clean[start:i+1]
                    break
        if not json_str:
            raise ValueError("No valid JSON object found in LLM response")

        scenario_data = json.loads(json_str)

        # Validate required fields
        required = ["name", "display_name", "description", "num_incidents",
                    "num_ambulances", "num_hospitals", "severity_distribution", "traffic_multiplier"]
        for field in required:
            if field not in scenario_data:
                raise ValueError(f"Missing field: {field}")

        # Validate and clamp numeric fields to safe ranges
        scenario_data["num_incidents"] = max(10, min(500, int(scenario_data["num_incidents"])))
        scenario_data["num_ambulances"] = max(3, min(100, int(scenario_data["num_ambulances"])))
        scenario_data["num_hospitals"] = max(2, min(20, int(scenario_data["num_hospitals"])))
        scenario_data["traffic_multiplier"] = round(max(0.5, min(5.0, float(scenario_data["traffic_multiplier"]))), 1)

        # Validate severity distribution sums to 1.0
        sd = scenario_data["severity_distribution"]
        total = sum(sd.get(k, 0) for k in ["critical", "high", "moderate", "low"])
        if abs(total - 1.0) > 0.01:
            # Renormalize: keep proportions, adjust first entry to absorb rounding error
            for k in sd:
                sd[k] = sd.get(k, 0) / total
            # Round all and adjust the largest entry to make sum exactly 1.0
            rounded = {k: round(v, 2) for k, v in sd.items()}
            diff = round(1.0 - sum(rounded.values()), 2)
            if abs(diff) > 0.001:
                key_to_adjust = max(rounded, key=rounded.get)
                rounded[key_to_adjust] = round(rounded[key_to_adjust] + diff, 2)
            scenario_data["severity_distribution"] = rounded

    except Exception as exc:
        logger.error(f"AI scenario generation failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate scenario from description: {exc}"
        )

    return {
        "status": "generated",
        "scenario": {
            "name": scenario_data["name"],
            "display_name": scenario_data["display_name"],
            "description": scenario_data["description"],
            "num_incidents": scenario_data["num_incidents"],
            "num_ambulances": scenario_data["num_ambulances"],
            "num_hospitals": scenario_data["num_hospitals"],
            "severity_distribution": scenario_data["severity_distribution"],
            "traffic_multiplier": scenario_data["traffic_multiplier"],
        },
        "note": "Use this scenario with the /start endpoint by passing its values as the payload.",
        "generated_at": datetime.utcnow().isoformat(),
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
