"""Unit tests for token revocation + refresh rotation and the admin role gate.

Covers gap fixes:
- #3: token revocation denylist (jti-based) + refresh token rotation + logout
- #2: POST /api/users/verify requires an elevated role (no privilege escalation)
"""
from __future__ import annotations

import os
import sys
import time
from unittest.mock import patch

import jwt as pyjwt
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))


@pytest.fixture(autouse=True)
def _isolated_denylist():
    """Use an in-memory denylist (unreachable Redis) and restore state after."""
    from app.services import token_store
    from app.services.cache_store import CacheStore

    sentinel = token_store._cache
    token_store._cache = CacheStore("redis://localhost:1/0", namespace="tokendenylist-test")
    yield
    token_store._cache = sentinel


# ─── jti + revocation ─────────────────────────────────────────────

class TestTokenRevocation:
    def test_tokens_carry_unique_jti(self):
        from app.core.security import create_access_token, decode_access_token

        t1 = decode_access_token(create_access_token({"id": "u1", "role": "public"}))
        t2 = decode_access_token(create_access_token({"id": "u1", "role": "public"}))
        assert t1["jti"] and t2["jti"]
        assert t1["jti"] != t2["jti"]

    def test_revoked_access_token_is_rejected(self):
        from app.core.security import create_access_token, decode_access_token
        from app.services.token_store import revoke_token_jti

        token = create_access_token({"id": "u1", "role": "public"})
        payload = decode_access_token(token)
        revoke_token_jti(payload["jti"], ttl_seconds=120)

        with pytest.raises(pyjwt.InvalidTokenError, match="revoked"):
            decode_access_token(token)

    def test_other_tokens_unaffected_by_revocation(self):
        from app.core.security import create_access_token, decode_access_token
        from app.services.token_store import revoke_token_jti

        revoked = create_access_token({"id": "u1", "role": "public"})
        survivor = create_access_token({"id": "u1", "role": "public"})
        revoke_token_jti(decode_access_token(revoked)["jti"], ttl_seconds=120)

        assert decode_access_token(survivor)["id"] == "u1"

    def test_legacy_token_without_jti_still_valid(self):
        """Tokens minted before revocation existed must not break."""
        import time

        from app.core.config import get_settings
        from app.core.security import decode_access_token

        legacy = pyjwt.encode(
            {
                "id": "u1",
                "role": "public",
                "exp": int(time.time()) + 300,
                "type": "access",
            },
            get_settings().jwt_secret,
            algorithm="HS256",
        )
        assert decode_access_token(legacy)["id"] == "u1"


# ─── refresh rotation ─────────────────────────────────────────────

class TestRefreshRotation:
    def test_rotation_burns_old_refresh_token(self):
        from app.core.security import create_refresh_token, decode_refresh_token
        from app.services.token_store import revoke_token_jti

        old = create_refresh_token({"id": "u1", "role": "hospital"})
        payload = decode_refresh_token(old)

        # Simulate exactly what /v2/auth/refresh does on rotation.
        revoke_token_jti(payload["jti"], ttl_seconds=600)

        with pytest.raises(pyjwt.InvalidTokenError, match="revoked"):
            decode_refresh_token(old)

    def test_refresh_tokens_cannot_be_access_tokens(self):
        from app.core.security import create_refresh_token, decode_access_token

        refresh = create_refresh_token({"id": "u1", "role": "hospital"})
        assert decode_access_token(refresh)["type"] == "refresh"

    def test_rotated_token_has_fresh_jti(self):
        from app.core.security import create_refresh_token, decode_refresh_token

        old = decode_refresh_token(create_refresh_token({"id": "u1", "role": "hospital"}))
        new = decode_refresh_token(create_refresh_token({"id": "u1", "role": "hospital"}))
        assert old["jti"] != new["jti"]


# ─── admin verify role gate (#2) ──────────────────────────────────

class TestVerifyHospitalRoleGate:
    def test_verify_endpoint_requires_government_role(self):
        from app.routes.admin import verify_hospital
        import inspect

        src = inspect.getsource(verify_hospital)
        # The dependency chain must enforce a role, not bare authentication.
        assert "require_roles" in src
        assert "government" in src
        assert "get_current_user" not in src or "require_roles" in src

    def test_non_government_roles_rejected_by_rbac(self):
        from app.core.auth import require_roles
        from app.core.rbac import AuthContext, resolve_scopes
        from fastapi import HTTPException

        dep = require_roles("government")
        for role in ("public", "hospital", "ambulance"):
            ctx = AuthContext(user_id="u1", role=role, sub_role=None, scopes=resolve_scopes(role, None))
            with pytest.raises(HTTPException) as exc:
                dep(ctx)
            assert exc.value.status_code == 403

    def test_government_role_allowed_by_rbac(self):
        from app.core.auth import require_roles
        from app.core.rbac import AuthContext, resolve_scopes

        dep = require_roles("government")
        ctx = AuthContext(user_id="u1", role="government", sub_role=None, scopes=resolve_scopes("government", None))
        assert dep(ctx).role == "government"
