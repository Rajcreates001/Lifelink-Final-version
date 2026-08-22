import asyncio

from fastapi import APIRouter, Body, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.auth import require_scopes
from app.core.rbac import AuthContext
from app.core.dependencies import get_realtime_service
from app.core.security import decode_access_token
from app.services.realtime_service import RealtimeService

router = APIRouter(tags=["realtime"])
_service: RealtimeService = get_realtime_service()

AUTH_TIMEOUT_SECONDS = 6


class PublishEvent(BaseModel):
    channel: str
    event: dict


@router.get("/status")
async def realtime_status() -> dict:
    """Live connection status per channel (no auth — used by health probes)."""
    channels = {}
    for channel, conns in _service.manager.active.items():
        channels[channel] = len(conns)
    return {
        "status": "ok",
        "channels": channels,
        "total_connections": sum(channels.values()),
        "websocket_endpoint": "/v2/realtime/ws/{channel}",
    }


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    # Step 1: Accept the WebSocket handshake immediately
    await websocket.accept()

    # Step 2: Read the first message as authentication (token sent as first message)
    try:
        auth = await asyncio.wait_for(websocket.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        await websocket.close(code=4001, reason="Authentication timeout: send {\"type\": \"auth\", \"token\": \"...\"}")
        return
    except Exception:
        await websocket.close(code=4001, reason="Invalid auth message format")
        return

    # Step 3: Validate the auth token
    token = None
    if isinstance(auth, dict) and auth.get("type") == "auth":
        token = auth.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token in first message")
        return

    try:
        payload = decode_access_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Step 4: Register the authenticated connection (no double-accept needed)
    _service.manager.register(channel, websocket)
    await websocket.send_json({"type": "auth_ok", "user_id": payload.get("id", "")})

    # Step 5: Handle normal message flow
    try:
        while True:
            msg = await websocket.receive_json()
            await _service.broadcast(channel, {"channel": channel, "payload": msg})
    except WebSocketDisconnect:
        _service.disconnect(channel, websocket)


@router.post("/publish")
async def publish(
    payload: PublishEvent,
    ctx: AuthContext = Depends(require_scopes("dashboard:read"))
) -> dict:
    await _service.broadcast(payload.channel, {"channel": payload.channel, "payload": payload.event})
    return {"status": "ok", "channel": payload.channel}


@router.post("/ambulance-update")
async def ambulance_update(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("ambulance:write"))
) -> dict:
    await _service.broadcast("ambulance", {"type": "ambulance_update", "payload": payload})
    return {"status": "ok"}


@router.post("/hospital-update")
async def hospital_update(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("hospital:write"))
) -> dict:
    await _service.broadcast("hospital", {"type": "hospital_update", "payload": payload})
    return {"status": "ok"}


@router.post("/alert")
async def alert_event(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("emergency:trigger"))
) -> dict:
    await _service.broadcast("alerts", {"type": "alert", "payload": payload})
    return {"status": "ok"}


@router.post("/government-update")
async def government_update(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("gov:write"))
) -> dict:
    await _service.broadcast("government", {"type": "government_update", "payload": payload})
    return {"status": "ok"}
