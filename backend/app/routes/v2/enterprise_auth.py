"""
Enterprise Auth Routes — Workspace RBAC Authentication API
===========================================================
Endpoints:
  POST /v2/enterprise/auth/login       — Enterprise login
  POST /v2/enterprise/auth/verify      — Verify workspace access
  GET  /v2/enterprise/auth/workspaces   — List user's workspaces
  GET  /v2/enterprise/auth/dev-creds    — Dev auto-fill credentials
  POST /v2/enterprise/auth/logout      — Logout + invalidate session
  GET  /v2/enterprise/auth/status      — Enterprise auth system status
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.asyncpg_pool import get_asyncpg_pool
from app.services.enterprise_auth_service import EnterpriseAuthService
from app.services.rate_limiter import rate_limit_login

logger = logging.getLogger(__name__)

router = APIRouter(tags=["enterprise-auth"])


async def get_auth_service():
    pool = get_asyncpg_pool()
    return EnterpriseAuthService(pool)


def _extract_device_info(request: Request) -> dict:
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "browser": request.headers.get("sec-ch-ua") or request.headers.get("user-agent", "")[:100],
        "os": request.headers.get("sec-ch-ua-platform"),
        "device_id": request.headers.get("x-device-id"),
        "device_name": request.headers.get("x-device-name"),
        "location": request.headers.get("x-location"),
    }


def _get_token_user(token: str) -> dict | None:
    """Decode JWT and return user info. Returns None if invalid."""
    try:
        payload = decode_access_token(token)
        if payload.get("type") != "enterprise":
            return None
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
        }
    except Exception:
        return None


@router.post("/enterprise/auth/bootstrap")
async def bootstrap_enterprise_auth(
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Initialize enterprise auth tables and seed defaults (dev only)."""
    settings = get_settings()
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Bootstrap only available in development mode")
    await service.bootstrap()
    return {"status": "ok", "message": "Enterprise auth system bootstrapped"}


@router.post("/enterprise/auth/login")
async def enterprise_login(
    request: Request,
    body: dict,
    service: EnterpriseAuthService = Depends(get_auth_service),
    _: None = Depends(rate_limit_login.dependency())
):
    """Authenticate with hospital email + password. Returns token + workspaces."""
    email = body.get("email", "").strip()
    password = body.get("password", "")
    remember = body.get("remember", False)

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    # Bootstrap tables on first login (safe: CREATE TABLE IF NOT EXISTS)
    try:
        await service.bootstrap()
    except Exception as e:
        logger.warning("Enterprise auth bootstrap failed (may already exist): %s", e)

    try:
        device_info = _extract_device_info(request)
        result = await service.login(email, password, remember=remember, device_info=device_info)
        return result
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.exception("Enterprise login error")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")


@router.post("/enterprise/auth/verify")
async def verify_workspace(
    request: Request,
    body: dict,
    authorization: str | None = Header(default=None),
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Verify user has access to a specific workspace."""
    department_key = body.get("department_key", "").strip()
    if not department_key:
        raise HTTPException(status_code=400, detail="department_key is required")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization")

    token = authorization.split(" ", 1)[1].strip()
    user = _get_token_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        result = await service.verify_workspace_access(user["id"], department_key)
        # Log workspace entry
        ip = request.client.host if request.client else None
        await service.log_workspace_entry(user["id"], department_key, ip=ip)
        return result
    except PermissionError as e:
        ip = request.client.host if request.client else None
        await service.log_action(
            user["id"], "workspace_entry_denied", "workspace",
            department_key=department_key,
            details={"reason": str(e), "department_key": department_key},
            ip=ip
        )
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/enterprise/auth/workspaces")
async def list_workspaces(
    authorization: str | None = Header(default=None),
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """List all workspaces (departments) the authenticated user can access."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization")

    token = authorization.split(" ", 1)[1].strip()
    user = _get_token_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    workspaces = await service.get_user_workspaces(user["id"])
    return {"workspaces": workspaces}


@router.get("/enterprise/auth/dev-creds")
async def get_dev_credentials(
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Return development auto-fill credentials (empty in production)."""
    settings = get_settings()
    if settings.app_env != "development":
        return {"credentials": [], "development_mode": False}
    await service.bootstrap()
    credentials = await service.get_dev_credentials()
    return {"credentials": credentials, "development_mode": True}


@router.post("/enterprise/auth/logout")
async def enterprise_logout(
    body: dict,
    authorization: str | None = Header(default=None),
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Logout and invalidate session."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return {"status": "ok"}

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id:
            # Use the service for audit logging, direct DB for session invalidation
            pool = get_asyncpg_pool()
            async with pool.acquire() as conn:
                now = datetime.now(timezone.utc)
                await conn.execute(
                    "UPDATE enterprise_sessions SET is_active = FALSE, logout_time = $1 "
                    "WHERE user_id = $2 AND is_active = TRUE",
                    now, user_id
                )
                await conn.execute(
                    "UPDATE enterprise_users SET last_activity = $1 WHERE id = $2",
                    now, user_id
                )
            await service._audit_log(user_id, "logout", "auth", success=True)
    except Exception as exc:
        logger.warning("Logout cleanup error (non-fatal): %s", exc)
    return {"status": "ok"}


@router.get("/enterprise/auth/status")
async def enterprise_auth_status(
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Get enterprise auth system status (counts per table)."""
    try:
        return await service.get_status()
    except Exception as e:
        return {"error": str(e)}


@router.post("/enterprise/auth/log-action")
async def log_enterprise_action(
    request: Request,
    body: dict,
    authorization: str | None = Header(default=None),
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Log an enterprise action to the audit trail."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    token = authorization.split(" ", 1)[1].strip()
    user = _get_token_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    action = body.get("action")
    category = body.get("category", "general")
    if not action:
        raise HTTPException(status_code=400, detail="action is required")

    ip = request.client.host if request.client else None
    await service.log_action(
        user["id"], action, category,
        entity_type=body.get("entity_type"),
        entity_id=body.get("entity_id"),
        department_key=body.get("department_key"),
        details=body.get("details"),
        ip=ip
    )
    return {"status": "ok"}


@router.get("/enterprise/auth/user")
async def get_enterprise_user_info(
    authorization: str | None = Header(default=None),
    service: EnterpriseAuthService = Depends(get_auth_service)
):
    """Get authenticated user's full profile with permissions."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    token = authorization.split(" ", 1)[1].strip()
    user = _get_token_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    from app.db.asyncpg_pool import fetch_one
    profile = await fetch_one(
        "SELECT id, full_name, email, employee_id, designation, phone, status, "
        "mfa_enabled, avatar, profile_settings, last_login, last_activity "
        "FROM enterprise_users WHERE id = $1",
        user["id"]
    )
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    workspaces = await service.get_user_workspaces(user["id"])
    permissions = await service._get_user_permissions(user["id"])

    return {
        "user": profile,
        "workspaces": workspaces,
        "permissions": permissions,
    }
