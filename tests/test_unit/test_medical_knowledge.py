"""
Unit tests for backend/app/services/medical_knowledge.py

Tests clinical validation, risk scoring, severity classification,
donor compatibility, and confidence estimation.
"""
from __future__ import annotations

import sys
import os

# Add backend to path so we can import the medical knowledge module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from app.services.medical_knowledge import (
    validate_age,
    validate_bmi,
    validate_blood_pressure,
    validate_heart_rate,
    validate_oxygen,
    validate_blood_group,
    validate_health_payload,
    assess_vitals,
    compute_risk_score,
    classify_severity,
    assess_donor_compatibility,
    estimate_confidence,
    ConfidenceResult,
)


# ─── Validation Tests ─────────────────────────────────────────────

class TestValidateAge:
    def test_valid_adult(self):
        assert validate_age(30) == 30

    def test_valid_child(self):
        assert validate_age(5) == 5

    def test_valid_elderly(self):
        assert validate_age(90) == 90

    def test_zero_age(self):
        assert validate_age(0) == 0

    def test_negative_age_rejected(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_age(-5)

    def test_extreme_age_rejected(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_age(200)

    def test_string_age_returns_none(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_age("not_a_number")


class TestValidateBMI:
    def test_normal_bmi(self):
        assert validate_bmi(22.5) == 22.5

    def test_overweight(self):
        assert validate_bmi(28.0) == 28.0

    def test_obese(self):
        assert validate_bmi(35.0) == 35.0

    def test_zero_bmi(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_bmi(0)

    def test_negative_bmi(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_bmi(-5)

    def test_extreme_bmi(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_bmi(100)


class TestValidateBloodPressure:
    def test_normal_systolic(self):
        sys_val, dia_val = validate_blood_pressure(120)
        assert sys_val == 120

    def test_high_systolic(self):
        sys_val, dia_val = validate_blood_pressure(160)
        assert sys_val == 160

    def test_low_systolic(self):
        sys_val, dia_val = validate_blood_pressure(90)
        assert sys_val == 90

    def test_invalid_systolic(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_blood_pressure(300)

    def test_zero_systolic(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_blood_pressure(0)


class TestValidateHeartRate:
    def test_normal_hr(self):
        assert validate_heart_rate(72) == 72

    def test_high_hr(self):
        assert validate_heart_rate(120) == 120

    def test_low_hr(self):
        assert validate_heart_rate(50) == 50

    def test_invalid_hr(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_heart_rate(301)

    def test_zero_hr(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_heart_rate(0)


class TestValidateOxygen:
    def test_normal_o2(self):
        assert validate_oxygen(98) == 98

    def test_low_o2(self):
        assert validate_oxygen(92) == 92

    def test_critical_o2(self):
        assert validate_oxygen(85) == 85

    def test_invalid_o2(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_oxygen(110)

    def test_zero_o2(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_oxygen(-1)


class TestValidateBloodGroup:
    def test_valid_groups(self):
        for group in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]:
            result = validate_blood_group(group)
            assert result is not None, f"Blood group {group} should be valid"

    def test_invalid_group(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_blood_group("C+")

    def test_empty_group(self):
        import pytest
        from app.services.medical_knowledge import MedicalValidationError
        with pytest.raises(MedicalValidationError):
            validate_blood_group("")


class TestValidateHealthPayload:
    def test_valid_payload(self):
        payload = {"age": 45, "bmi": 25, "blood_pressure": 120, "heart_rate": 72, "oxygen": 98}
        result = validate_health_payload(payload)
        assert isinstance(result, dict)

    def test_missing_fields_no_crash(self):
        payload = {"age": 30}
        result = validate_health_payload(payload)
        assert isinstance(result, dict)

    def test_empty_payload(self):
        result = validate_health_payload({})
        assert isinstance(result, dict)

    def test_rejects_impossible_values(self):
        payload = {"age": 999, "heart_rate": 500}
        result = validate_health_payload(payload)
        assert isinstance(result, dict)
        # Should have warnings about impossible values
        warnings = result.get("_warnings", [])
        assert len(warnings) > 0


# ─── Risk Scoring Tests ────────────────────────────────────────────

class TestComputeRiskScore:
    def test_low_risk_healthy_young(self):
        result = compute_risk_score(age=25, bmi=22, blood_pressure_sys=115, heart_rate=65, oxygen=99)
        assert result["risk_level"] in ("Low", "Medium")
        assert 0 <= result["risk_score"] <= 100

    def test_high_risk_elderly_obese(self):
        result = compute_risk_score(
            age=75, bmi=38, blood_pressure_sys=170,
            heart_rate=105, oxygen=91,
            has_condition=True, lifestyle="smoker"
        )
        assert result["risk_level"] in ("High", "Critical")
        assert result["risk_score"] >= 70

    def test_missing_data_handled(self):
        result = compute_risk_score(age=50)
        assert "risk_level" in result
        assert "drivers" in result
        assert isinstance(result.get("missing_data"), list)

    def test_no_params_returns_valid_result(self):
        result = compute_risk_score()
        assert "risk_level" in result
        assert "risk_score" in result

    def test_has_explanation(self):
        result = compute_risk_score(age=60, bmi=30)
        assert "explanation" in result


# ─── Severity Classification Tests ────────────────────────────────

class TestClassifySeverity:
    def test_critical_case(self):
        result = classify_severity(message="Patient unconscious, not breathing, no pulse")
        assert result["severity_level"] in ("Critical", "High")
        assert result["severity_score"] >= 50

    def test_low_severity(self):
        result = classify_severity(message="Mild headache, slight fever 99F")
        assert result["severity_level"] in ("Low", "Medium")
        assert isinstance(result.get("criteria"), list)

    def test_with_vitals(self):
        result = classify_severity(
            message="Chest pain",
            heart_rate=110,
            blood_pressure_sys=160,
            oxygen=92
        )
        assert "severity_level" in result
        assert "confidence" in result

    def test_empty_message(self):
        result = classify_severity(message="")
        assert "severity_level" in result


# ─── Donor Compatibility Tests ────────────────────────────────────

class TestAssessDonorCompatibility:
    def test_compatible_blood(self):
        result = assess_donor_compatibility(
            donor_blood="O-", recipient_blood="A+",
            donor_age=30, recipient_age=35,
            distance_km=5
        )
        assert "compatibility_score" in result
        assert 0 <= result["compatibility_score"] <= 100

    def test_incompatible_blood(self):
        result = assess_donor_compatibility(
            donor_blood="A+", recipient_blood="B+",
            donor_age=30, recipient_age=35,
            distance_km=5
        )
        assert result["compatibility_score"] < 70  # Should score lower for incompatible

    def test_far_distance_reduces_score(self):
        close = assess_donor_compatibility(
            donor_blood="O-", recipient_blood="O-",
            donor_age=30, recipient_age=30,
            distance_km=2
        )
        far = assess_donor_compatibility(
            donor_blood="O-", recipient_blood="O-",
            donor_age=30, recipient_age=30,
            distance_km=100
        )
        assert close["compatibility_score"] >= far["compatibility_score"]


# ─── Confidence Estimation Tests ──────────────────────────────────

class TestEstimateConfidence:
    def test_all_data_high_confidence(self):
        result = estimate_confidence(
            provided_inputs={"age": True, "bmi": True, "bp": True, "hr": True},
            model_confidence=0.95,
            critical_inputs=["age", "bp"]
        )
        assert isinstance(result, ConfidenceResult)
        assert result.overall >= 0.5

    def test_missing_critical_lowers_confidence(self):
        result_full = estimate_confidence(
            provided_inputs={"age": True, "bmi": True, "bp": True},
            model_confidence=0.9,
            critical_inputs=["age", "bp"]
        )
        result_missing = estimate_confidence(
            provided_inputs={"age": False, "bmi": True, "bp": False},
            model_confidence=0.9,
            critical_inputs=["age", "bp"]
        )
        assert result_full.overall >= result_missing.overall

    def test_confidence_result_dict_access(self):
        result = estimate_confidence(
            provided_inputs={"age": True},
            model_confidence=0.8,
            critical_inputs=["age"]
        )
        # Should support dict-style access for backward compatibility
        assert result["overall"] == result.overall

    def test_data_completeness(self):
        result = estimate_confidence(
            provided_inputs={"age": True, "bmi": False, "bp": True},
            model_confidence=None,
            critical_inputs=["age", "bp"]
        )
        assert 0 <= result.data_completeness <= 1


# ─── Vital Assessment Tests ───────────────────────────────────────

class TestAssessVitals:
    def test_normal_vitals(self):
        result = assess_vitals(heart_rate=72, blood_pressure_sys=120, oxygen=98)
        assert isinstance(result, dict)

    def test_abnormal_vitals(self):
        result = assess_vitals(heart_rate=150, blood_pressure_sys=200, oxygen=85)
        assert isinstance(result, dict)

    def test_empty_vitals(self):
        result = assess_vitals()
        assert isinstance(result, dict)
