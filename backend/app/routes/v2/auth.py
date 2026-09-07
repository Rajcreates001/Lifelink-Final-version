from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.dependencies import get_auth_service
from app.core.rbac import AuthContext
from app.core.security import create_access_token, decode_refresh_token
from app.db.database import require_db
from app.schemas.portal_auth import PortalLoginRequest, PortalSignupRequest
from app.services.auth_service import AuthService
from app.services.collections import USERS
from app.services.rate_limiter import rate_limit_auth, rate_limit_login, rate_limit_signup
from app.services.repository import MongoRepository

router = APIRouter(tags=["auth"])


class RefreshRequest(BaseModel):
    refreshToken: str


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


@router.post("/refresh")
async def refresh(
    payload: RefreshRequest,
    _: None = Depends(rate_limit_auth.dependency()),
) -> dict:
    """Exchange a valid refresh token for a new access token (rotation-ready).

    The refresh token is validated cryptographically (signature + expiry +
    `type=refresh` claim) and the user must still exist in the database —
    deleted/revoked users cannot refresh.
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

    token = create_access_token(str(user_id), claims={"role": user.get("role", role), "sub_role": user.get("subRole")})
    return {"token": token}


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
