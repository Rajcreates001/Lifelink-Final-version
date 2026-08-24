"""
LifeLink GPS Ambulance Tracking API

Software-based GPS simulation endpoints for ambulance tracking
without requiring physical GPS hardware.

Endpoints:
- GET  /api/gps-tracking/status          → Simulation status
- POST /api/gps-tracking/start           → Start simulation
- POST /api/gps-tracking/stop            → Stop simulation
- GET  /api/gps-tracking/ambulances      → Get all ambulance positions
- GET  /api/gps-tracking/ambulance/{id}  → Get specific ambulance position
- POST /api/gps-tracking/register        → Register new simulated ambulance
- DELETE /api/gps-tracking/{id}          → Unregister ambulance
- GET  /api/gps-tracking/stats           → Get simulation statistics
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException

from app.core.auth import get_current_user, AuthContext
from app.services.gps_simulator import gps_simulator

logger = logging.getLogger("lifelink.gps_tracking")

router = APIRouter(tags=["gps-tracking"])


@router.get("/status")
async def simulation_status():
    """Get GPS simulation status."""
    stats = gps_simulator.get_simulation_stats()
    return {
        "status": "running" if gps_simulator.running else "stopped",
        "ambulances": len(gps_simulator.ambulances),
        "updateInterval": gps_simulator.update_interval,
        **stats,
    }


@router.post("/start")
async def start_simulation(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user),
):
    """Start the GPS simulation with configured ambulances."""
    if gps_simulator.running:
        return {"status": "already_running", "message": "Simulation is already running"}

    # Register default ambulances if none exist
    if not gps_simulator.ambulances:
        default_ambulances = [
            ("AMB-001", "route_1"),
            ("AMB-002", "route_2"),
            ("AMB-003", "route_3"),
            ("AMB-004", "route_1"),
            ("AMB-005", "route_2"),
        ]
        for amb_id, route in default_ambulances:
            gps_simulator.register_ambulance(amb_id, route)

    # Start simulation in background
    import asyncio
    asyncio.create_task(gps_simulator.start_simulation())

    return {
        "status": "started",
        "ambulances": len(gps_simulator.ambulances),
        "message": f"GPS simulation started with {len(gps_simulator.ambulances)} ambulances",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/stop")
async def stop_simulation():
    """Stop the GPS simulation."""
    gps_simulator.stop_simulation()
    return {
        "status": "stopped",
        "message": "GPS simulation stopped",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/ambulances")
async def get_all_ambulances():
    """Get current positions of all simulated ambulances."""
    positions = gps_simulator.get_all_positions()
    return {
        "count": len(positions),
        "ambulances": positions,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/ambulance/{ambulance_id}")
async def get_ambulance_position(ambulance_id: str):
    """Get position of a specific ambulance."""
    position = gps_simulator.get_ambulance_position(ambulance_id)
    if not position:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found")
    return position


@router.post("/register")
async def register_ambulance(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user),
):
    """Register a new simulated ambulance."""
    ambulance_id = payload.get("ambulanceId")
    route_key = payload.get("routeKey")

    if not ambulance_id:
        raise HTTPException(status_code=400, detail="ambulanceId is required")

    ambulance = gps_simulator.register_ambulance(ambulance_id, route_key)
    return {
        "status": "registered",
        "ambulanceId": ambulance_id,
        "route": ambulance.route["name"],
        "message": f"Ambulance {ambulance_id} registered on route: {ambulance.route['name']}",
    }


@router.delete("/{ambulance_id}")
async def unregister_ambulance(
    ambulance_id: str,
    ctx: AuthContext = Depends(get_current_user),
):
    """Unregister a simulated ambulance."""
    if ambulance_id not in gps_simulator.ambulances:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found")

    gps_simulator.unregister_ambulance(ambulance_id)
    return {
        "status": "unregistered",
        "ambulanceId": ambulance_id,
        "message": f"Ambulance {ambulance_id} unregistered",
    }


@router.get("/stats")
async def get_simulation_stats():
    """Get simulation statistics."""
    return gps_simulator.get_simulation_stats()


@router.post("/reset/{ambulance_id}")
async def reset_ambulance_route(
    ambulance_id: str,
    ctx: AuthContext = Depends(get_current_user),
):
    """Reset an ambulance to start of its route."""
    if ambulance_id not in gps_simulator.ambulances:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found")

    gps_simulator.ambulances[ambulance_id].reset_route()
    return {
        "status": "reset",
        "ambulanceId": ambulance_id,
        "message": f"Ambulance {ambulance_id} route reset",
    }


@router.get("/routes")
async def list_available_routes():
    """List all available simulation routes."""
    from app.services.gps_simulator import AMBULANCE_ROUTES
    return {
        "routes": [
            {
                "key": key,
                "name": route["name"],
                "waypoints": len(route["waypoints"]),
                "distanceKm": route["distance_km"],
                "estimatedMinutes": route["estimated_minutes"],
            }
            for key, route in AMBULANCE_ROUTES.items()
        ]
    }
