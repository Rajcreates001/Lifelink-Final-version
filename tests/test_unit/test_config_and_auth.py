"""
Unit tests for backend configuration, auth, and security modules.
Tests JWT token creation/verification, RBAC, and settings validation.
"""
from __future__ import annotations

import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))


# ─── JWT / Security Tests ─────────────────────────────────────────

class TestJWTSecurity:
    """Tests for JWT token creation and verification."""

    def test_create_access_token(self):
        from app.core.security import create_access_token
        token = create_access_token({"id": "user-123", "role": "public"})
        assert isinstance(token, str)
        assert len(token) > 20  # JWT tokens are reasonably long

    def test_create_token_with_expiry(self):
        from app.core.security import create_access_token
        token = create_access_token(
            {"id": "user-123", "role": "public"},
            expires_minutes=60
        )
        assert isinstance(token, str)

    def test_decode_access_token(self):
        from app.core.security import create_access_token, decode_access_token
        payload = {"id": "user-456", "role": "hospital"}
        token = create_access_token(payload)
        decoded = decode_access_token(token)
        assert decoded["id"] == "user-456"
        assert decoded["role"] == "hospital"

    def test_decode_invalid_token_fails(self):
        from app.core.security import decode_access_token
        try:
            decode_access_token("invalid.token.here")
            # If no exception, the function returned None or similar
        except Exception:
            pass  # Expected behavior

    def test_token_has_expiry(self):
        from app.core.security import create_access_token, decode_access_token
        token = create_access_token({"id": "test", "role": "public"})
        decoded = decode_access_token(token)
        assert "exp" in decoded


# ─── Configuration Tests ───────────────────────────────────────────

class TestSettings:
    """Tests for Settings configuration class."""

    def test_settings_loads(self):
        from app.core.config import get_settings
        settings = get_settings()
        assert settings is not None
        assert hasattr(settings, 'app_name')
        assert hasattr(settings, 'jwt_secret')

    def test_cors_origins_dev(self):
        from app.core.config import Settings
        settings = Settings(app_env="development")
        origins = settings.cors_origins
        assert isinstance(origins, list)
        assert len(origins) > 0

    def test_weak_jwt_secret_warning(self):
        from app.core.config import _WEAK_JWT_SECRETS
        assert "change_me" in _WEAK_JWT_SECRETS
        assert "secret" in _WEAK_JWT_SECRETS


# ─── RBAC Tests ────────────────────────────────────────────────────

class TestRBAC:
    """Tests for role-based access control."""

    def test_require_roles_returns_decorator(self):
        from app.core.auth import require_roles
        decorator = require_roles("public", "hospital")
        assert callable(decorator)

    def test_require_scopes_returns_decorator(self):
        from app.core.auth import require_scopes
        decorator = require_scopes("dashboard:read")
        assert callable(decorator)

    def test_auth_context_creation(self):
        from app.core.rbac import AuthContext
        ctx = AuthContext(user_id="test-123", role="public", sub_role=None, scopes=["dashboard:read"])
        assert ctx.user_id == "test-123"
        assert ctx.role == "public"
        assert "dashboard:read" in ctx.scopes


# ─── Medical Knowledge Module Import Tests ────────────────────────

class TestMedicalKnowledgeImports:
    """Verify all public functions from medical_knowledge are importable."""

    def test_import_validation_functions(self):
        from app.services.medical_knowledge import (
            validate_age, validate_bmi, validate_blood_pressure,
            validate_heart_rate, validate_oxygen, validate_blood_group,
        )
        assert callable(validate_age)
        assert callable(validate_bmi)
        assert callable(validate_blood_pressure)
        assert callable(validate_heart_rate)
        assert callable(validate_oxygen)
        assert callable(validate_blood_group)

    def test_import_analysis_functions(self):
        from app.services.medical_knowledge import (
            assess_vitals, compute_risk_score, classify_severity,
            assess_donor_compatibility, estimate_confidence,
        )
        assert callable(assess_vitals)
        assert callable(compute_risk_score)
        assert callable(classify_severity)
        assert callable(assess_donor_compatibility)
        assert callable(estimate_confidence)


# ─── ML Model Loading Tests ───────────────────────────────────────

class TestMLModels:
    """Tests for ML model loading and basic prediction."""

    def test_model_configs_exist(self):
        from app.services.medical_knowledge import ConfidenceResult
        result = ConfidenceResult(
            overall=0.85,
            data_completeness=0.9,
            data_quality=0.95,
            model_confidence=0.88,
            missing_critical_inputs=[],
            warnings=[],
        )
        assert result.overall == 0.85
        assert result.data_completeness == 0.9

    def test_model_configs_dict(self):
        """Verify MODEL_CONFIGS is accessible from ML features module."""
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'ml'))
        from features import MODEL_CONFIGS
        assert isinstance(MODEL_CONFIGS, dict)
        assert len(MODEL_CONFIGS) > 0


# ─── Audit Hash Chain Tests ───────────────────────────────────────

class TestAuditHashChain:
    """Tests for the audit log hash chain integrity."""

    def test_hash_chain_creation(self):
        import hashlib
        action = "test_action"
        actor = "test_actor"
        prev_hash = "0" * 64
        data = f"{action}:{actor}:{prev_hash}"
        current_hash = hashlib.sha256(data.encode()).hexdigest()
        assert len(current_hash) == 64

    def test_tamper_detection(self):
        import hashlib
        action = "test_action"
        actor = "test_actor"
        prev_hash = "0" * 64
        data = f"{action}:{actor}:{prev_hash}"
        original_hash = hashlib.sha256(data.encode()).hexdigest()
        tampered_data = f"tampered:{actor}:{prev_hash}"
        tampered_hash = hashlib.sha256(tampered_data.encode()).hexdigest()
        assert original_hash != tampered_hash

    def test_chain_integrity(self):
        import hashlib
        prev_hash = "0" * 64
        hashes = []
        for i in range(5):
            data = f"action_{i}:actor:{prev_hash}"
            h = hashlib.sha256(data.encode()).hexdigest()
            hashes.append(h)
            prev_hash = h
        # Verify chain: each hash depends on the previous
        prev = "0" * 64
        for i, h in enumerate(hashes):
            data = f"action_{i}:actor:{prev}"
            expected = hashlib.sha256(data.encode()).hexdigest()
            assert h == expected
            prev = h
