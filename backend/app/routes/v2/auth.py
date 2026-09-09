from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.dependencies import get_auth_service
from app.core.rbac import AuthContext
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.db.database import require_db
from app.schemas.portal_auth import PortalLoginRequest, PortalSignupRequest
from app.services.auth_service import AuthService
from app.services.collections import USERS
from app.services.rate_limiter import rate_limit_auth, rate_limit_login, rate_limit_signup
from app.services.repository import MongoRepository
from app.services.token_store import revoke_token_jti

router = APIRouter(tags=["auth"])


class RefreshRequest(BaseModel):
    refreshToken: str


class LogoutRequest(BaseModel):
    refreshToken: str | None = None


@router.get("/portals")
async def list_portals(service: AuthService = Depends(get_auth_service)) -> dict:
    return service.list_portals()


@router.post("/signup", status_code=201)
async def signup(
    payload: PortalSignupRequest,
    service: AuthService = Depends(get_auth_service),
    _: None = Depends(rate_limit_signup.dependency())
) -> dict:
    return await service.signup(payload)


@router.post("/login")
async def login(
    payload: PortalLoginRequest,
    service: AuthService = Depends(get_auth_service),
    _: None = Depends(rate_limit_login.dependency())
) -> dict:
    return await service.login(payload)


def _seconds_until(exp_claim) -> int:
    """Remaining token lifetime in seconds (min 60 so the denylist entry sticks)."""
    try:
        remaining = int(exp_claim) - int(datetime.now(timezone.utc).timestamp())
    except Exception:
        return 3600
    return max(60, remaining)


@router.post("/refresh")
async def refresh(
    payload: RefreshRequest,
    _: None = Depends(rate_limit_auth.dependency()),
) -> dict:
    """Exchange a valid refresh token for a NEW access + refresh token (rotation).

    - The presented refresh token is validated (signature + expiry + `type=refresh`
      claim) and rejected if its jti was revoked.
    - The user must still exist in the database — deleted/revoked users cannot refresh.
    - The presented refresh token is revoked and a fresh one is issued, so a stolen
      refresh token is useless after the first legitimate use.
    """
    try:
        refresh_payload = decode_refresh_token(payload.refreshToken)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from exc

    user_id = refresh_payload.get("id") or refresh_payload.get("sub")
    role = refresh_payload.get("role")
    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    db = require_db()
    user = await MongoRepository(db, USERS).find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: burn the presented refresh token and issue a fresh pair.
    revoke_token_jti(
        refresh_payload.get("jti", ""),
        _seconds_until(refresh_payload.get("exp")),
    )
    claims = {"role": user.get("role", role), "sub_role": user.get("subRole")}
    token = create_access_token(str(user_id), claims=claims)
    new_refresh = create_refresh_token(str(user_id), claims=claims)
    return {"token": token, "refreshToken": new_refresh}


@router.post("/logout")
async def logout(
    payload: LogoutRequest | None = None,
    authorization: str | None = Header(default=None),
    _: None = Depends(rate_limit_auth.dependency()),
) -> dict:
    """Revoke the presented access token and (optionally) the refresh token.

    Idempotent and safe to call with an already-expired token as long as the
    signature is valid — clients should call this on every logout.
    """
    revoked = []
    if authorization and authorization.lower().startswith("bearer "):
        try:
            access_payload = decode_access_token(authorization.split(" ", 1)[1].strip())
            revoke_token_jti(access_payload.get("jti", ""), _seconds_until(access_payload.get("exp")))
            revoked.append("access")
        except Exception:
            pass  # already-expired/garbage token: nothing to revoke
    if payload and payload.refreshToken:
        try:
            refresh_payload = decode_refresh_token(payload.refreshToken)
            revoke_token_jti(refresh_payload.get("jti", ""), _seconds_until(refresh_payload.get("exp")))
            revoked.append("refresh")
        except Exception:
            pass  # unknown/expired refresh token: nothing to revoke
    return {"message": "Logged out", "revoked": revoked}


@router.post("/select-role")
async def select_role(
    payload: dict,
    ctx: AuthContext = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
    _: None = Depends(rate_limit_auth.dependency())
) -> dict:
    sub_role = payload.get("subRole")
    if not sub_role:
        raise HTTPException(status_code=400, detail="subRole is required")
    return await service.select_role(sub_role, ctx)
