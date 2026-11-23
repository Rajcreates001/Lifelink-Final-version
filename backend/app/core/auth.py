from __future__ import annotations

import logging

from fastapi import Depends, Header, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from jwt import InvalidTokenError

from app.core.rbac import AuthContext, ensure_roles, ensure_scopes, resolve_scopes
from app.core.security import decode_access_token
from app.db.database import get_db
from app.services.collections import USERS
from app.services.repository import MongoRepository

logger = logging.getLogger("lifelink.auth")


async def _lookup_enterprise_user(user_id: str) -> dict | None:
    """Resolve an enterprise (workspace-modal) login against the
    enterprise_users SQL table.

    Workspace logins (WorkspaceAuthModal → /v2/enterprise/auth/login) issue
    JWTs whose `sub` is an enterprise_users.id — a 32-hex key that does NOT
    exist in the portal `users` collection. Without this lookup every
    /api/* call from an enterprise session died with 401 "User not found in
    database", which the frontend swallowed and rendered as an empty
    (all-zero) dashboard.
    """
    try:
        from app.db.asyncpg_pool import get_asyncpg_pool
        pool = get_asyncpg_pool()
    except Exception:  # pool not connected (unit tests / degraded mode)
        return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, status FROM enterprise_users WHERE id = $1",
                user_id,
            )
    except Exception as exc:
        logger.warning("enterprise user lookup failed for %s: %s", user_id, exc)
        return None
    if not row or row["status"] != "active":
        return None
    return dict(row)


def _extract_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
    return authorization.split(" ", 1)[1].strip()


async def get_optional_user(authorization: str | None = Header(default=None)) -> AuthContext | None:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        return None  # malformed/expired/revoked token — optional auth simply opts out

    user_id = payload.get("id") or payload.get("sub")
    role = payload.get("role") or payload.get("portal") or payload.get("portalRole")
    sub_role = payload.get("sub_role") or payload.get("subRole")

    if not user_id or not role:
        return None

    db = get_db()
    user_repo = MongoRepository(db, USERS)
    try:
        lookup_id = ObjectId(str(user_id))
    except InvalidId:
        lookup_id = user_id
    user = await user_repo.find_one({"_id": lookup_id})
    if not user:
        # Mirror get_current_user: enterprise sessions resolve via SQL.
        enterprise_user = await _lookup_enterprise_user(str(user_id))
        if not enterprise_user:
            return None

    scopes = resolve_scopes(role, sub_role)
    return AuthContext(user_id=str(user_id), role=role, sub_role=sub_role, scopes=scopes)


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthContext:
    token = _extract_token(authorization)
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = payload.get("id") or payload.get("sub")
    role = payload.get("role") or payload.get("portal") or payload.get("portalRole")
    sub_role = payload.get("sub_role") or payload.get("subRole")

    if not user_id or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Try MongoDB lookup for full AuthContext, but fall back to JWT-only context
    # if the user was not seeded in the database (e.g. demo/development mode).
    # The JWT already provides cryptographic proof of authentication.
    db = get_db()
    user_repo = MongoRepository(db, USERS)
    try:
        lookup_id = ObjectId(str(user_id))
    except InvalidId:
        lookup_id = user_id
    user = await user_repo.find_one({"_id": lookup_id})
    if not user:
        # Enterprise (workspace-modal) sessions live in the enterprise_users
        # SQL table, not the portal users collection. Resolve there before
        # rejecting — these are cryptographically verified logins with an
        # active account row.
        enterprise_user = await _lookup_enterprise_user(str(user_id))
        if not enterprise_user:
            # SECURITY: Do NOT fall back to JWT-only context.
            # This prevents revoked/deleted users from accessing the system.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in database",
            )
    scopes = resolve_scopes(role, sub_role)
    return AuthContext(user_id=str(user_id), role=role, sub_role=sub_role, scopes=scopes)


def require_roles(*roles: str):
    def _dependency(ctx: AuthContext = Depends(get_current_user)) -> AuthContext:
        ensure_roles(ctx.role, roles)
        return ctx

    return _dependency


def require_scopes(*scopes: str):
    def _dependency(ctx: AuthContext = Depends(get_current_user)) -> AuthContext:
        ensure_scopes(ctx.scopes, scopes)
        return ctx

    return _dependency
