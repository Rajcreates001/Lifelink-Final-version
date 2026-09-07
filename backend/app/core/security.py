from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(subject, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES, claims: dict | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"}
    if isinstance(subject, dict):
        payload.update(subject)
    else:
        payload["sub"] = subject
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_refresh_token(subject, expires_days: int = REFRESH_TOKEN_EXPIRE_DAYS, claims: dict | None = None) -> str:
    """Create a long-lived refresh token (separate `type` claim so refresh
    tokens can never be used as access tokens and vice versa)."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    payload = {"exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh"}
    if isinstance(subject, dict):
        payload.update(subject)
    else:
        payload["sub"] = subject
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def decode_refresh_token(token: str) -> dict:
    """Decode and validate a refresh token; rejects tokens minted as access tokens."""
    payload = decode_access_token(token)
    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload
