"""
Government Auth Routes — Enterprise-Grade Government Authentication API
========================================================================
Endpoints:
  POST   /v2/gov/auth/bootstrap       — Seed all government data (dev)
  POST   /v2/gov/auth/login           — Government user login
  GET    /v2/gov/auth/organizations    — List all government organizations
  GET    /v2/gov/auth/organizations/{key} — Get single organization
  GET    /v2/gov/auth/org-users/{key} — Get users for an organization
  GET    /v2/gov/auth/dev-creds       — Dev auto-fill credentials
  GET    /v2/gov/auth/status          — System status
  POST   /v2/gov/auth/logout          — Logout + invalidate session
  POST   /v2/gov/auth/log-action      — Log an action to audit trail
  GET    /v2/gov/auth/profile         — Get authenticated user profile
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.asyncpg_pool import get_asyncpg_pool
from app.services.government_auth_service import GovernmentAuthService
from app.services.rate_limiter import rate_limit_login

logger = logging.getLogger(__name__)

router = APIRouter(tags=["government-auth"])


async def get_gov_service():
    """Dependency: get GovernmentAuthService instance."""
    pool = get_asyncpg_pool()
    return GovernmentAuthService(pool)


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
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "type": payload.get("type"),
        }
    except Exception:
        return None


@router.post("/gov/auth/bootstrap")
async def bootstrap_government_auth(
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Initialize and seed all government data (safe to call on every startup)."""
    settings = get_settings()
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Bootstrap only available in development mode")
    stats = await service.bootstrap()
    return {"status": "ok", "message": "Government auth system bootstrapped", "stats": stats}


@router.post("/gov/auth/login")
async def government_login(
    request: Request,
    body: dict,
    service: GovernmentAuthService = Depends(get_gov_service),
    _: None = Depends(rate_limit_login.dependency())
):
    """Authenticate a government user. Returns JWT + organization + AI context."""
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    remember = body.get("remember", False)

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    # Bootstrap ensures all tables and seed data exist (safe: CREATE TABLE IF NOT EXISTS).
    # In production the bootstrap is a no-op since tables already exist.
    try:
        await service.bootstrap()
    except Exception:
        logger.exception("Government auth bootstrap failed during login — tables may not exist yet. Subsequent login may fail if tables are missing.")

    try:
        device_info = _extract_device_info(request)
        result = await service.login(email, password, remember=remember, device_info=device_info)
        return result
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception:
        logger.exception("Government login error")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")


@router.get("/gov/auth/organizations")
async def list_organizations(
    category: str | None = None,
    level: str | None = None,
    search: str | None = None,
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """List all government organizations with optional filtering."""
    orgs = await service.list_organizations(category=category, level=level, search=search)
    return {
        "count": len(orgs),
        "organizations": orgs,
    }


@router.get("/gov/auth/organizations/{org_key}")
async def get_organization(
    org_key: str,
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Get a single government organization by key."""
    org = await service.get_organization(org_key)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get users for this org
    users = await service.get_org_users(org_key)
    org["users"] = users
    org["user_count"] = len(users)
    return org


@router.get("/gov/auth/org-users/{org_key}")
async def get_org_users(
    org_key: str,
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Get all users for a specific government organization."""
    users = await service.get_org_users(org_key)
    return {
        "organization_key": org_key,
        "count": len(users),
        "users": users,
    }


@router.get("/gov/auth/dev-creds")
async def get_dev_credentials(
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Return development auto-fill credentials for all government users."""
    settings = get_settings()
    if settings.app_env != "development":
        return {"credentials": [], "development_mode": False}

    await service.bootstrap()
    credentials = await service.get_gov_credentials()
    return {"credentials": credentials, "development_mode": True}


@router.get("/gov/auth/status")
async def government_auth_status(
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Get government auth system status with counts."""
    try:
        return await service.get_status()
    except Exception as e:
        return {"error": str(e)}


@router.post("/gov/auth/logout")
async def government_logout(
    body: dict,
    authorization: str | None = Header(default=None),
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Logout and invalidate session."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return {"status": "ok"}

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id:
            from app.db.asyncpg_pool import execute as db_execute
            now = datetime.now(timezone.utc)
            await db_execute(
                "UPDATE enterprise_sessions SET is_active = FALSE, logout_time = $1 "
                "WHERE user_id = $2 AND is_active = TRUE",
                now, user_id
            )
            await db_execute(
                "UPDATE enterprise_users SET last_activity = $1 WHERE id = $2",
                now, user_id
            )
            await service.log_action(user_id, "logout", "auth", details={"action": "logout"})
    except Exception as exc:
        logger.warning("Logout cleanup error (non-fatal): %s", exc)
    return {"status": "ok"}


@router.post("/gov/auth/log-action")
async def log_government_action(
    request: Request,
    body: dict,
    authorization: str | None = Header(default=None),
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Log a government action to the audit trail."""
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
        user["id"],
        action,
        category,
        details=body.get("details", {}),
        ip=ip
    )
    return {"status": "ok"}


@router.get("/gov/auth/profile")
async def get_government_profile(
    authorization: str | None = Header(default=None),
    service: GovernmentAuthService = Depends(get_gov_service)
):
    """Get authenticated government user's full profile with organization and permissions."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    token = authorization.split(" ", 1)[1].strip()
    user = _get_token_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    from app.db.asyncpg_pool import fetch_one as db_fetch_one

    profile = await db_fetch_one(
        "SELECT id, full_name, email, employee_id, designation, phone, status, "
        "mfa_enabled, avatar, profile_settings, last_login, last_activity "
        "FROM enterprise_users WHERE id = $1",
        user["id"]
    )
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    # Get workspaces + permissions
    workspaces = await service._enterprise.get_user_workspaces(user["id"])
    permissions = await service._enterprise._get_user_permissions(user["id"])

    # Get organization metadata
    org_key = workspaces[0].get("department_key") if workspaces else None
    org_meta = await service.get_organization(org_key) if org_key else None

    return {
        "user": profile,
        "workspaces": workspaces,
        "permissions": permissions,
        "organization": org_meta,
        "portal_type": "government",
    }
