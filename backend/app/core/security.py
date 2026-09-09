import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings
from app.services.token_store import is_token_revoked

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(subject, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES, claims: dict | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        # Unique token ID so individual tokens can be revoked via the denylist.
        "jti": uuid.uuid4().hex,
    }
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
    payload = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": uuid.uuid4().hex,
    }
    if isinstance(subject, dict):
        payload.update(subject)
    else:
        payload["sub"] = subject
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Decode a token and reject it if its jti has been revoked.

    Revocation is keyed on `jti`; legacy tokens without a jti pass through
    (they cannot be individually revoked and expire naturally).
    """
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    jti = payload.get("jti")
    if jti and is_token_revoked(jti):
        raise jwt.InvalidTokenError("Token has been revoked")
    return payload


def decode_refresh_token(token: str) -> dict:
    """Decode and validate a refresh token; rejects tokens minted as access tokens."""
    payload = decode_access_token(token)
    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload
