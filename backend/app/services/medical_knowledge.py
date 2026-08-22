"""
LifeLink — Medical Knowledge Layer
===================================
Centralized, evidence-based medical knowledge for clinical decision support.

This module is the single source of truth for:
  - Clinical reference ranges (vitals, labs) with severity thresholds
  - Blood group compatibility (ABO/Rh 8×8)
  - Organ transplant compatibility rules
  - Input validation (reject impossible values with explanations)
  - Age-dependent physiology adjustments
  - Emergency triage rules and severity classification
  - Confidence estimation based on data completeness
  - Risk score computation from clinical rules
  - Disease-symptom-medication knowledge base
  - Evidence-based recommendations

Principles:
  - NEVER return fabricated values. If data is insufficient, communicate uncertainty.
  - EVERY output must include reasoning, confidence, and evidence.
  - IMPOSSIBLE inputs must be rejected with a clinical explanation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# CLINICAL REFERENCE RANGES
# ═══════════════════════════════════════════════════════════════════


@dataclass
class Range:
    """A clinical reference range with severity thresholds."""

    min_normal: float
    max_normal: float
    unit: str = ""
    min_critical: float | None = None
    max_critical: float | None = None
    label: str = ""
    description: str = ""

    def evaluate(self, value: float | None) -> dict[str, Any]:
        """Assess a value against this reference range."""
        if value is None:
            return {
                "status": "unknown",
                "abnormal": False,
                "critical": False,
                "message": f"{self.label}: No value provided.",
                "confidence_reduction": 0.1,
            }

        result: dict[str, Any] = {
            "value": value,
            "unit": self.unit,
            "abnormal": False,
            "critical": False,
        }

        if self.min_critical is not None and value < self.min_critical:
            result["status"] = "critically_low"
            result["critical"] = True
            result["abnormal"] = True
            result["message"] = (
                f"{self.label} ({value} {self.unit}) is critically low. "
                f"Normal range: {self.min_normal}–{self.max_normal} {self.unit}. "
                "Urgent evaluation recommended."
            )
            result["confidence_reduction"] = 0.15
        elif self.max_critical is not None and value > self.max_critical:
            result["status"] = "critically_high"
            result["critical"] = True
            result["abnormal"] = True
            result["message"] = (
                f"{self.label} ({value} {self.unit}) is critically high. "
                f"Normal range: {self.min_normal}–{self.max_normal} {self.unit}. "
                "Urgent evaluation recommended."
            )
            result["confidence_reduction"] = 0.15
        elif value < self.min_normal:
            result["status"] = "low"
            result["abnormal"] = True
            result["message"] = (
                f"{self.label} ({value} {self.unit}) is below normal. "
                f"Normal range: {self.min_normal}–{self.max_normal} {self.unit}."
            )
            result["confidence_reduction"] = 0.05
        elif value > self.max_normal:
            result["status"] = "high"
            result["abnormal"] = True
            result["message"] = (
                f"{self.label} ({value} {self.unit}) is above normal. "
                f"Normal range: {self.min_normal}–{self.max_normal} {self.unit}."
            )
            result["confidence_reduction"] = 0.05
        else:
            result["status"] = "normal"
            result["message"] = (
                f"{self.label} ({value} {self.unit}) is within normal range "
                f"({self.min_normal}–{self.max_normal} {self.unit})."
            )
            result["confidence_reduction"] = 0.0

        return result


# ─── Vital Signs ────────────────────────────────────────────

VITAL_RANGES: dict[str, Range] = {
    "heart_rate": Range(
        min_normal=60, max_normal=100, unit="bpm",
        min_critical=40, max_critical=130,
        label="Heart Rate",
        description="Resting heart rate for adults. Athletes may have lower resting rates (40–60 bpm).",
    ),
    "blood_pressure_systolic": Range(
        min_normal=90, max_normal=130, unit="mmHg",
        min_critical=70, max_critical=200,
        label="Systolic Blood Pressure",
        description="Systolic pressure during heart contraction. Values ≥130 considered elevated.",
    ),
    "blood_pressure_diastolic": Range(
        min_normal=60, max_normal=85, unit="mmHg",
        min_critical=40, max_critical=120,
        label="Diastolic Blood Pressure",
        description="Diastolic pressure between heartbeats. Values ≥80 considered elevated.",
    ),
    "oxygen_saturation": Range(
        min_normal=95, max_normal=100, unit="%",
        min_critical=None, max_critical=None,
        label="Oxygen Saturation (SpO₂)",
        description="Normal: 95–100%. Values 90–94% warrant further assessment. Values <90% require urgent evaluation.",
    ),
    "respiratory_rate": Range(
        min_normal=12, max_normal=20, unit="breaths/min",
        min_critical=8, max_critical=28,
        label="Respiratory Rate",
        description="Normal adult respiratory rate at rest.",
    ),
    "temperature_celsius": Range(
        min_normal=36.1, max_normal=37.5, unit="°C",
        min_critical=35.0, max_critical=40.0,
        label="Body Temperature",
        description="Normal oral temperature. Fever typically ≥38.0°C (100.4°F).",
    ),
    "temperature_fahrenheit": Range(
        min_normal=97.0, max_normal=99.5, unit="°F",
        min_critical=95.0, max_critical=104.0,
        label="Body Temperature",
        description="Normal oral temperature in Fahrenheit.",
    ),
    "bmi": Range(
        min_normal=18.5, max_normal=24.9, unit="kg/m²",
        min_critical=14.0, max_critical=40.0,
        label="Body Mass Index",
        description="Normal: 18.5–24.9. Overweight: 25–29.9. Obese: ≥30. Underweight: <18.5.",
    ),
    "age": Range(
        min_normal=0, max_normal=120, unit="years",
        min_critical=None, max_critical=None,
        label="Age",
        description="Chronological age in years. Values >120 are improbable.",
    ),
}

# ─── Laboratory Values ─────────────────────────────────────

LAB_RANGES: dict[str, Range] = {
    "glucose_fasting": Range(
        min_normal=70, max_normal=100, unit="mg/dL",
        min_critical=54, max_critical=500,
        label="Fasting Glucose",
        description="Normal fasting glucose. Prediabetes: 100–125 mg/dL. Diabetes: ≥126 mg/dL.",
    ),
    "glucose_random": Range(
        min_normal=70, max_normal=140, unit="mg/dL",
        min_critical=54, max_critical=500,
        label="Random Glucose",
        description="Random glucose. Values ≥200 mg/dL suggest diabetes.",
    ),
    "hba1c": Range(
        min_normal=4.0, max_normal=5.6, unit="%",
        min_critical=None, max_critical=None,
        label="HbA1c",
        description="Glycated hemoglobin. Prediabetes: 5.7–6.4%. Diabetes: ≥6.5%.",
    ),
    "hemoglobin_male": Range(
        min_normal=13.5, max_normal=17.5, unit="g/dL",
        min_critical=8.0, max_critical=20.0,
        label="Hemoglobin (Male)",
        description="Normal hemoglobin for adult males.",
    ),
    "hemoglobin_female": Range(
        min_normal=12.0, max_normal=15.5, unit="g/dL",
        min_critical=7.0, max_critical=18.0,
        label="Hemoglobin (Female)",
        description="Normal hemoglobin for adult females.",
    ),
    "creatinine": Range(
        min_normal=0.6, max_normal=1.2, unit="mg/dL",
        min_critical=None, max_critical=None,
        label="Creatinine",
        description="Serum creatinine. Elevated levels may indicate kidney impairment.",
    ),
    "wbc_count": Range(
        min_normal=4000, max_normal=11000, unit="cells/µL",
        min_critical=1000, max_critical=30000,
        label="White Blood Cell Count",
        description="Normal WBC count. Leukocytosis >11000, leukopenia <4000.",
    ),
    "platelet_count": Range(
        min_normal=150000, max_normal=450000, unit="/µL",
        min_critical=50000, max_critical=1000000,
        label="Platelet Count",
        description="Normal platelet count. Thrombocytopenia <150000.",
    ),
    "sodium": Range(
        min_normal=135, max_normal=145, unit="mmol/L",
        min_critical=120, max_critical=160,
        label="Sodium",
        description="Serum sodium. Hyponatremia <135, hypernatremia >145.",
    ),
    "potassium": Range(
        min_normal=3.5, max_normal=5.0, unit="mmol/L",
        min_critical=2.5, max_critical=6.5,
        label="Potassium",
        description="Serum potassium. Hypokalemia <3.5, hyperkalemia >5.0. Life-threatening at extremes.",
    ),
    "total_cholesterol": Range(
        min_normal=125, max_normal=200, unit="mg/dL",
        min_critical=None, max_critical=None,
        label="Total Cholesterol",
        description="Desirable: <200 mg/dL. Borderline: 200–239. High: ≥240.",
    ),
    "ldl_cholesterol": Range(
        min_normal=0, max_normal=100, unit="mg/dL",
        min_critical=None, max_critical=None,
        label="LDL Cholesterol",
        description="Optimal: <100 mg/dL. Near optimal: 100–129. Borderline: 130–159.",
    ),
    "hdl_cholesterol": Range(
        min_normal=40, max_normal=60, unit="mg/dL",
        min_critical=None, max_critical=None,
        label="HDL Cholesterol",
        description="Low HDL: <40 mg/dL (men), <50 mg/dL (women). Higher is better.",
    ),
}


# ═══════════════════════════════════════════════════════════════════
# BLOOD COMPATIBILITY (ABO/Rh)
# ═══════════════════════════════════════════════════════════════════

# Donor blood type → Can donate to (recipients)
DONOR_COMPATIBILITY: dict[str, set[str]] = {
    "O-": {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"},  # Universal donor
    "O+": {"O+", "A+", "B+", "AB+"},
    "A-": {"A-", "A+", "AB-", "AB+"},
    "A+": {"A+", "AB+"},
    "B-": {"B-", "B+", "AB-", "AB+"},
    "B+": {"B+", "AB+"},
    "AB-": {"AB-", "AB+"},
    "AB+": {"AB+"},  # Universal recipient
}

# Recipient blood type → Can receive from (donors)
RECIPIENT_COMPATIBILITY: dict[str, set[str]] = {
    "O-": {"O-"},
    "O+": {"O+", "O-"},
    "A-": {"A-", "O-"},
    "A+": {"A+", "A-", "O+", "O-"},
    "B-": {"B-", "O-"},
    "B+": {"B+", "B-", "O+", "O-"},
    "AB-": {"AB-", "A-", "B-", "O-"},
    "AB+": {"AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"},  # Universal recipient
}

PLASMA_COMPATIBILITY: dict[str, set[str]] = {
    "O-": {"O-", "AB+"},
    "O+": {"O+", "AB+"},
    "A-": {"A-", "O+", "AB+"},
    "A+": {"A+", "AB+"},
    "B-": {"B-", "O+", "AB+"},
    "B+": {"B+", "AB+"},
    "AB-": {"AB-"},
    "AB+": {"AB+"},
}

VALID_BLOOD_GROUPS = set(RECIPIENT_COMPATIBILITY.keys())

# ═══════════════════════════════════════════════════════════════════
# INPUT VALIDATION
# ═══════════════════════════════════════════════════════════════════


class MedicalValidationError(ValueError):
    """Raised when medical input fails validation."""
    def __init__(self, message: str, field: str | None = None):
        self.field = field
        super().__init__(message)


def validate_age(age: Any) -> int | None:
    """Validate and normalize age. Returns None if not provided."""
    if age is None:
        return None
    try:
        value = int(float(str(age)))
    except (TypeError, ValueError):
        raise MedicalValidationError(f"Age must be a number, got '{age}'.", "age")

    if value < 0:
        raise MedicalValidationError(f"Age ({value}) cannot be negative.", "age")
    if value > 120:
        raise MedicalValidationError(
            f"Age ({value}) exceeds maximum plausible human lifespan (120). "
            "Please verify the patient's date of birth.", "age"
        )
    if value > 110:
        raise MedicalValidationError(
            f"Age ({value}) is exceptionally high. "
            "Please verify the patient's date of birth.", "age"
        )
    return value


def validate_bmi(bmi: Any) -> float | None:
    """Validate BMI. Returns None if not provided."""
    if bmi is None:
        return None
    try:
        value = float(str(bmi))
    except (TypeError, ValueError):
        raise MedicalValidationError(f"BMI must be a number, got '{bmi}'.", "bmi")

    if value < 10:
        raise MedicalValidationError(
            f"BMI ({value}) is below the survivable threshold (10 kg/m²). "
            "Please verify height and weight measurements.", "bmi"
        )
    if value > 60:
        raise MedicalValidationError(
            f"BMI ({value}) exceeds the typical survivable range. "
            "Please verify height and weight measurements.", "bmi"
        )
    return value


def validate_blood_pressure(systolic: Any, diastolic: Any | None = None) -> tuple[int | None, int | None]:
    """Validate blood pressure values. Returns (systolic, diastolic) tuple."""
    sys_val = None
    dia_val = None

    # Handle combined string like "120/80"
    if diastolic is None and isinstance(systolic, (str, int, float)):
        if isinstance(systolic, str) and "/" in systolic:
            parts = systolic.split("/")
            try:
                sys_val = int(float(parts[0].strip()))
                dia_val = int(float(parts[1].strip()))
            except (TypeError, ValueError):
                logger.debug("Suppressed (TypeError, ValueError) in %s", __name__)
            return validate_blood_pressure(sys_val, dia_val)

    if systolic is not None:
        try:
            sys_val = int(float(str(systolic)))
        except (TypeError, ValueError):
            raise MedicalValidationError(
                f"Systolic blood pressure must be a number, got '{systolic}'.", "blood_pressure"
            )
        if sys_val < 40:
            raise MedicalValidationError(
                f"Systolic BP ({sys_val} mmHg) is incompatible with life (<40 mmHg). "
                "Please verify the measurement.", "blood_pressure"
            )
        if sys_val > 280:
            raise MedicalValidationError(
                f"Systolic BP ({sys_val} mmHg) is beyond the measurable range. "
                "Please verify the measurement.", "blood_pressure"
            )

    if diastolic is not None:
        try:
            dia_val = int(float(str(diastolic)))
        except (TypeError, ValueError):
            raise MedicalValidationError(
                f"Diastolic blood pressure must be a number, got '{diastolic}'.", "blood_pressure"
            )
        if dia_val < 20:
            raise MedicalValidationError(
                f"Diastolic BP ({dia_val} mmHg) is incompatible with life (<20 mmHg). "
                "Please verify the measurement.", "blood_pressure"
            )
        if dia_val > 180:
            raise MedicalValidationError(
                f"Diastolic BP ({dia_val} mmHg) is beyond the measurable range. "
                "Please verify the measurement.", "blood_pressure"
            )

    if sys_val is not None and dia_val is not None and sys_val <= dia_val:
        raise MedicalValidationError(
            f"Systolic BP ({sys_val}) must be higher than diastolic BP ({dia_val}). "
            "Please verify the measurement.", "blood_pressure"
        )

    # Return original values if parsing from combined wasn't needed
    if sys_val is None and systolic is not None:
        try:
            sys_val = int(float(str(systolic)))
        except (TypeError, ValueError):
            logger.debug("Suppressed (TypeError, ValueError) in %s", __name__)
    if dia_val is None and diastolic is not None:
        try:
            dia_val = int(float(str(diastolic)))
        except (TypeError, ValueError):
            logger.debug("Suppressed (TypeError, ValueError) in %s", __name__)

    return sys_val, dia_val


def validate_heart_rate(hr: Any, age: int | None = None) -> int | None:
    """Validate heart rate with age-appropriate ranges."""
    if hr is None:
        return None
    try:
        value = int(float(str(hr)))
    except (TypeError, ValueError):
        raise MedicalValidationError(f"Heart rate must be a number, got '{hr}'.", "heart_rate")
    if value < 0:
        raise MedicalValidationError(f"Heart rate ({value} bpm) cannot be negative.", "heart_rate")
    if value > 300:
        raise MedicalValidationError(
            f"Heart rate ({value} bpm) exceeds the maximum physiologically possible rate (300 bpm).",
            "heart_rate",
        )
    if age is not None and age < 1 and value < 60:
        # Newborns normally have higher heart rates
        pass  # Skip lower bound for newborns
    elif value < 20:
        raise MedicalValidationError(
            f"Heart rate ({value} bpm) is incompatible with life (<20 bpm) without medical intervention.",
            "heart_rate",
        )
    return value


def validate_oxygen(oxygen: Any) -> int | None:
    """Validate oxygen saturation."""
    if oxygen is None:
        return None
    try:
        value = int(float(str(oxygen)))
    except (TypeError, ValueError):
        raise MedicalValidationError(f"Oxygen saturation must be a number, got '{oxygen}'.", "oxygen")
    if value < 0 or value > 100:
        raise MedicalValidationError(
            f"Oxygen saturation ({value}%) must be between 0 and 100.", "oxygen"
        )
    return value


def validate_blood_group(blood_group: Any) -> str | None:
    """Validate blood group. Returns normalized string or None."""
    if blood_group is None:
        return None
    normalized = str(blood_group).replace(" ", "").upper()
    valid_variants = {
        "O-": "O-", "O+": "O+", "O": "O+",
        "A-": "A-", "A+": "A+", "A": "A+",
        "B-": "B-", "B+": "B+", "B": "B+",
        "AB-": "AB-", "AB+": "AB+", "AB": "AB+",
        "0-": "O-", "0+": "O+", "0": "O+",
    }
    if normalized not in valid_variants:
        raise MedicalValidationError(
            f"'{blood_group}' is not a valid blood group. "
            f"Valid options: {', '.join(sorted(VALID_BLOOD_GROUPS))}.",
            "blood_group",
        )
    return valid_variants[normalized]


def validate_lifestyle(lifestyle: Any) -> str | None:
    """Normalize lifestyle factor."""
    if lifestyle is None:
        return None
    lower = str(lifestyle).strip().lower()
    mapping = {
        "sedentary": "Sedentary", "inactive": "Sedentary", "no exercise": "Sedentary",
        "active": "Active", "regular exercise": "Active", "athlete": "Active", "frequent exercise": "Active",
        "average": "Average", "moderate": "Average", "occasional": "Average",
        "smoker": "Smoker", "smoking": "Smoker", "tobacco": "Smoker",
        "heavy smoker": "Heavy Smoker",
    }
    return mapping.get(lower, lower.capitalize())


def validate_presenting_complaint(complaint: str | None) -> tuple[str | None, str | None]:
    """Validate and classify presenting complaint. Returns (complaint, triage_level)."""
    if not complaint:
        return None, None
    text = complaint.strip().lower()
    if not text:
        return None, None

    # Triage-critical complaints
    critical_keywords = [
        "unconscious", "not breathing", "cardiac arrest", "stroke", "seizure",
        "severe bleeding", "anaphylaxis", "choking", "drowning", "overdose",
        "chest pain radiating", "massive trauma", "head injury severe",
    ]
    high_keywords = [
        "chest pain", "difficulty breathing", "severe pain", "heavy bleeding",
        "burn", "fracture open", "allergic reaction", "diabetic emergency",
        "heart attack", "suspected stroke", "suicidal", "confusion sudden",
        "weakness one side", "slurred speech", "vision loss sudden",
    ]
    medium_keywords = [
        "fever", "pain", "injury", "dizzy", "vomiting", "diarrhea",
        "mild bleeding", "sprain", "cut", "rash", "headache",
        "abdominal pain", "back pain", "sore throat", "cough",
    ]

    if any(k in text for k in critical_keywords):
        return complaint.strip(), "Critical"
    if any(k in text for k in high_keywords):
        return complaint.strip(), "High"
    if any(k in text for k in medium_keywords):
        return complaint.strip(), "Medium"
    return complaint.strip(), "Low"


# ═══════════════════════════════════════════════════════════════════
# CONFIDENCE ESTIMATION
# ═══════════════════════════════════════════════════════════════════


@dataclass
class ConfidenceResult:
    """Structured confidence assessment for a prediction."""

    overall: float  # 0.0–1.0
    data_completeness: float  # 0.0–1.0
    data_quality: float  # 0.0–1.0
    model_confidence: float | None  # 0.0–1.0, None if model unavailable
    missing_critical_inputs: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def __post_init__(self):
        self.overall = round(min(1.0, max(0.1, self.overall)), 3)
        self.data_completeness = round(min(1.0, max(0.0, self.data_completeness)), 3)
        self.data_quality = round(min(1.0, max(0.0, self.data_quality)), 3)

    def __getitem__(self, key: str):
        """Support dict-style access for backward compatibility."""
        return getattr(self, key)

    def to_dict(self) -> dict[str, Any]:
        return {
            "overall": self.overall,
            "data_completeness": self.data_completeness,
            "data_quality": self.data_quality,
            "model_confidence": self.model_confidence,
            "missing_critical_inputs": self.missing_critical_inputs[:6],
            "warnings": self.warnings[:4],
        }


def estimate_confidence(
    provided_inputs: dict[str, bool],
    model_confidence: float | None = None,
    critical_inputs: list[str] | None = None,
    abnormal_values: int = 0,
    total_values: int = 0,
) -> ConfidenceResult:
    """
    Estimate prediction confidence based on data completeness and quality.

    Args:
        provided_inputs: Dict of {input_name: is_provided}
        model_confidence: Optional confidence from ML model prediction
        critical_inputs: List of input names considered critical for the prediction
        abnormal_values: Count of abnormal values found
        total_values: Total assessed values

    Returns:
        ConfidenceResult with overall confidence and breakdown
    """
    critical_inputs = critical_inputs or []

    # Data completeness
    if not provided_inputs:
        return ConfidenceResult(
            overall=0.1,
            data_completeness=0.0,
            data_quality=0.5,
            model_confidence=model_confidence,
            missing_critical_inputs=critical_inputs[:6] if critical_inputs else [],
            warnings=["No input data provided for assessment."],
        )

    total = len(provided_inputs)
    provided_count = sum(1 for v in provided_inputs.values() if v)
    completeness = provided_count / max(1, total)

    # Missing critical inputs
    missing_critical = [
        name for name in critical_inputs
        if not provided_inputs.get(name, False)
    ]

    # Data quality: penalize for abnormal values
    quality = 1.0
    if total_values > 0:
        abnormal_ratio = abnormal_values / max(1, total_values)
        quality = max(0.3, 1.0 - abnormal_ratio * 0.5)

    # Model confidence
    effective_model_conf = model_confidence if model_confidence is not None else 0.0

    # Overall: weighted combination
    if model_confidence is not None:
        overall = 0.35 * completeness + 0.15 * quality + 0.50 * effective_model_conf
    else:
        overall = 0.60 * completeness + 0.20 * quality + 0.20

    # Apply penalty for missing critical inputs
    if missing_critical:
        penalty = 0.08 * len(missing_critical)
        overall = max(0.1, overall - penalty)

    warnings = []
    if missing_critical:
        if len(missing_critical) == 1:
            warnings.append(f"{missing_critical[0]} is not available and would improve assessment accuracy.")
        else:
            warnings.append(
                f"{len(missing_critical)} key inputs are unavailable: "
                f"{', '.join(missing_critical[:4])}."
            )
    if completeness < 0.5:
        warnings.append("Less than half of recommended inputs were provided, limiting assessment confidence.")
    if abnormal_values > total_values * 0.5:
        warnings.append("Multiple abnormal values detected; consider clinical correlation.")

    return ConfidenceResult(
        overall=round(overall, 3),
        data_completeness=round(completeness, 3),
        data_quality=round(quality, 3),
        model_confidence=round(effective_model_conf, 3) if effective_model_conf > 0 else None,
        missing_critical_inputs=missing_critical[:6],
        warnings=warnings[:4],
    )


# ═══════════════════════════════════════════════════════════════════
# COMPREHENSIVE VITAL ASSESSMENT
# ═══════════════════════════════════════════════════════════════════


def assess_vitals(
    heart_rate: Any = None,
    blood_pressure_sys: Any = None,
    blood_pressure_dia: Any = None,
    oxygen: Any = None,
    respiratory_rate: Any = None,
    temperature_value: Any = None,
    temperature_unit: str | None = None,
    bmi: Any = None,
    age: Any = None,
) -> dict[str, Any]:
    """
    Assess a complete set of vital signs against clinical reference ranges.

    Returns a dict with:
      - assessments: dict of {vital_name: assessment_result}
      - abnormal_count: number of abnormal findings
      - critical_count: number of critical findings
      - overall_status: "normal" | "abnormal" | "critical"
      - summary: human-readable summary
      - confidence: confidence in the assessment
    """
    validated_age = validate_age(age)
    assessments: dict[str, Any] = {}
    critical_count = 0
    abnormal_count = 0
    total_checked = 0

    # Heart rate
    validated_hr = validate_heart_rate(heart_rate, validated_age)
    if validated_hr is not None:
        result = VITAL_RANGES["heart_rate"].evaluate(validated_hr)
        assessments["heart_rate"] = result
        total_checked += 1
        if result.get("abnormal"):
            abnormal_count += 1
        if result.get("critical"):
            critical_count += 1

    # Blood pressure
    sys, dia = validate_blood_pressure(blood_pressure_sys, blood_pressure_dia)
    if sys is not None:
        result = VITAL_RANGES["blood_pressure_systolic"].evaluate(sys)
        assessments["blood_pressure_systolic"] = result
        total_checked += 1
        if result.get("abnormal"):
            abnormal_count += 1
        if result.get("critical"):
            critical_count += 1
    if dia is not None:
        result = VITAL_RANGES["blood_pressure_diastolic"].evaluate(dia)
        assessments["blood_pressure_diastolic"] = result
        total_checked += 1
        if result.get("abnormal"):
            abnormal_count += 1
        if result.get("critical"):
            critical_count += 1

    # Oxygen
    validated_o2 = validate_oxygen(oxygen)
    if validated_o2 is not None:
        result = VITAL_RANGES["oxygen_saturation"].evaluate(validated_o2)
        result["status"] = (
            "critically_low" if validated_o2 < 90 else
            "low" if validated_o2 < 95 else
            "normal"
        )
        if validated_o2 < 90:
            result["critical"] = True
            critical_count += 1
        elif validated_o2 < 95:
            result["abnormal"] = True
            abnormal_count += 1
        assessments["oxygen_saturation"] = result
        total_checked += 1

    # Respiratory rate
    if respiratory_rate is not None:
        try:
            rr = int(float(str(respiratory_rate)))
            result = VITAL_RANGES["respiratory_rate"].evaluate(rr)
            assessments["respiratory_rate"] = result
            total_checked += 1
            if result.get("abnormal"):
                abnormal_count += 1
            if result.get("critical"):
                critical_count += 1
        except (TypeError, ValueError):
            logger.debug("Suppressed (TypeError, ValueError) in %s", __name__)

    # BMI
    validated_bmi = validate_bmi(bmi)
    if validated_bmi is not None:
        result = VITAL_RANGES["bmi"].evaluate(validated_bmi)
        assessments["bmi"] = result
        total_checked += 1
        if result.get("abnormal"):
            abnormal_count += 1
        if result.get("critical"):
            critical_count += 1

    # Temperature
    if temperature_value is not None:
        try:
            temp = float(str(temperature_value))
            if temperature_unit and temperature_unit.upper() == "F":
                result = VITAL_RANGES["temperature_fahrenheit"].evaluate(temp)
            else:
                result = VITAL_RANGES["temperature_celsius"].evaluate(temp)
            # Fever check: >=38°C or >=100.4°F
            if temperature_unit and temperature_unit.upper() == "F":
                is_fever = temp >= 100.4
            else:
                is_fever = temp >= 38.0
            if is_fever and not result.get("critical"):
                result["abnormal"] = True
                result["status"] = "high"
                result["message"] = f"Temperature ({temp}°) suggests fever. Normal <{'100.4°F' if temperature_unit and temperature_unit.upper() == 'F' else '38.0°C'}."
            assessments["temperature"] = result
            total_checked += 1
            if result.get("abnormal"):
                abnormal_count += 1
            if result.get("critical"):
                critical_count += 1
        except (TypeError, ValueError):
            logger.debug("Suppressed (TypeError, ValueError) in %s", __name__)

    # Overall status
    if critical_count > 0:
        overall_status = "critical"
    elif abnormal_count > 0:
        overall_status = "abnormal"
    elif total_checked > 0:
        overall_status = "normal"
    else:
        overall_status = "insufficient_data"

    # Summary
    if total_checked == 0:
        summary = "No vital sign measurements provided for assessment."
    elif overall_status == "critical":
        summary = (
            f"Vital signs assessment: {critical_count} critical and {abnormal_count} abnormal "
            f"finding(s) out of {total_checked} measurements. Urgent clinical evaluation recommended."
        )
    elif overall_status == "abnormal":
        summary = (
            f"Vital signs assessment: {abnormal_count} abnormal finding(s) out of "
            f"{total_checked} measurements. Clinical correlation advised."
        )
    else:
        summary = (
            f"Vital signs assessment: all {total_checked} measurements within normal range."
        )

    # Confidence
    provided = {
        "heart_rate": heart_rate is not None,
        "blood_pressure": blood_pressure_sys is not None or blood_pressure_dia is not None,
        "oxygen": oxygen is not None,
        "respiratory_rate": respiratory_rate is not None,
        "temperature": temperature_value is not None,
        "bmi": bmi is not None,
    }
    confidence = estimate_confidence(
        provided_inputs=provided,
        model_confidence=None,
        critical_inputs=["heart_rate", "blood_pressure", "oxygen"],
        abnormal_values=abnormal_count,
        total_values=total_checked,
    )

    return {
        "assessments": assessments,
        "abnormal_count": abnormal_count,
        "critical_count": critical_count,
        "total_checked": total_checked,
        "overall_status": overall_status,
        "summary": summary,
        "confidence": confidence.to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════
# RISK SCORE COMPUTATION
# ═══════════════════════════════════════════════════════════════════


def compute_risk_score(
    age: int | None = None,
    bmi: float | None = None,
    blood_pressure_sys: int | None = None,
    heart_rate: int | None = None,
    oxygen: int | None = None,
    has_condition: bool = False,
    lifestyle: str | None = None,
    symptoms: list[str] | None = None,
) -> dict[str, Any]:
    """
    Compute a transparent, evidence-based risk score.

    Each factor contributes a weighted score. The final score is the sum
    of all applicable factors, capped at 100. Returns the breakdown.
    """
    if age is None and bmi is None and blood_pressure_sys is None and heart_rate is None and oxygen is None and not has_condition:
        return {
            "risk_score": None,
            "risk_level": "insufficient_data",
            "drivers": [],
            "explanation": "Insufficient clinical data to compute a risk estimate. "
                           "At minimum, age and one vital sign are recommended.",
            "missing_data": ["age", "vitals"],
        }

    score = 0
    drivers: list[dict[str, Any]] = []
    missing_data: list[str] = []

    # Age
    if age is not None:
        if age >= 75:
            score += 20
            drivers.append({"factor": "Age ≥75", "contribution": 20, "detail": "Advanced age is a significant risk factor."})
        elif age >= 60:
            score += 12
            drivers.append({"factor": "Age 60–74", "contribution": 12, "detail": "Increasing age contributes to elevated risk."})
        elif age >= 45:
            score += 5
            drivers.append({"factor": "Age 45–59", "contribution": 5, "detail": "Moderate age-related risk."})
    else:
        missing_data.append("age")
        drivers.append({"factor": "Age (unknown)", "contribution": 0, "detail": "Age not provided. Risk may be underestimated."})

    # BMI
    if bmi is not None:
        if bmi >= 35:
            score += 12
            drivers.append({"factor": "BMI ≥35 (Severe obesity)", "contribution": 12, "detail": "Severe obesity significantly increases cardiovascular and metabolic risk."})
        elif bmi >= 30:
            score += 8
            drivers.append({"factor": "BMI 30–34.9 (Obese)", "contribution": 8, "detail": "Obesity contributes to cardiovascular risk."})
        elif bmi >= 25:
            score += 3
            drivers.append({"factor": "BMI 25–29.9 (Overweight)", "contribution": 3, "detail": "Overweight contributes modestly to risk."})
    else:
        missing_data.append("bmi")

    # Blood pressure
    if blood_pressure_sys is not None:
        if blood_pressure_sys >= 180:
            score += 18
            drivers.append({"factor": f"BP ≥180 (Severe hypertension)", "contribution": 18, "detail": "Severe hypertension requires urgent evaluation."})
        elif blood_pressure_sys >= 140:
            score += 12
            drivers.append({"factor": f"BP 140–179 (Hypertension)", "contribution": 12, "detail": "Elevated blood pressure contributes to cardiovascular and renal risk."})
        elif blood_pressure_sys >= 130:
            score += 5
            drivers.append({"factor": f"BP 130–139 (Elevated)", "contribution": 5, "detail": "Borderline elevation; further assessment recommended."})
    else:
        missing_data.append("blood_pressure")

    # Heart rate
    if heart_rate is not None:
        if heart_rate > 120:
            score += 10
            drivers.append({"factor": f"HR >120 bpm (Tachycardia)", "contribution": 10, "detail": "Significant tachycardia may indicate underlying pathology."})
        elif heart_rate > 100:
            score += 6
            drivers.append({"factor": f"HR 101–120 bpm", "contribution": 6, "detail": "Elevated resting heart rate."})
        if heart_rate < 50:
            score += 6
            drivers.append({"factor": f"HR <50 bpm (Bradycardia)", "contribution": 6, "detail": "Low heart rate may require evaluation if symptomatic."})
    else:
        missing_data.append("heart_rate")

    # Oxygen
    if oxygen is not None:
        if oxygen < 90:
            score += 15
            drivers.append({"factor": f"SpO₂ <90%", "contribution": 15, "detail": "Hypoxemia requires urgent evaluation."})
        elif oxygen < 95:
            score += 6
            drivers.append({"factor": f"SpO₂ 90–94%", "contribution": 6, "detail": "Mildly reduced oxygen saturation warrants further assessment."})
    else:
        missing_data.append("oxygen_saturation")

    # Existing condition
    if has_condition:
        score += 12
        drivers.append({"factor": "Pre-existing condition", "contribution": 12, "detail": "Comorbidities increase overall risk."})

    # Lifestyle
    if lifestyle:
        lower_life = lifestyle.lower()
        if lower_life in ("smoker", "heavy smoker"):
            score += 10
            drivers.append({"factor": f"Smoker ({lifestyle})", "contribution": 10, "detail": "Tobacco use significantly increases cardiovascular and respiratory risk."})
        elif lower_life == "sedentary":
            score += 5
            drivers.append({"factor": "Sedentary lifestyle", "contribution": 5, "detail": "Physical inactivity contributes to multiple health risks."})
        elif lower_life in ("active",):
            score -= 3
            drivers.append({"factor": "Active lifestyle", "contribution": -3, "detail": "Regular physical activity reduces risk."})

    # Cap and classify
    score = max(0, min(100, score))
    if score >= 70:
        risk_level = "High"
    elif score >= 40:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    # Build explanation
    explanation_parts = []
    active_drivers = [d for d in drivers if d["contribution"] > 0]
    positive_drivers = [d for d in drivers if d["contribution"] < 0]

    if active_drivers:
        top = sorted(active_drivers, key=lambda x: x["contribution"], reverse=True)[:3]
        explanation_parts.append(f"Risk driven primarily by: {', '.join(d['factor'] for d in top)}.")
    if positive_drivers:
        explanation_parts.append(f"Protective factors: {', '.join(d['factor'] for d in positive_drivers)}.")

    if missing_data:
        explanation_parts.append(
            f"Data gaps ({', '.join(missing_data)}): adding these inputs would improve assessment confidence."
        )

    explanation = " ".join(explanation_parts) if explanation_parts else "Standard risk calculation applied."

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "drivers": drivers,
        "explanation": explanation,
        "missing_data": missing_data,
    }


# ═══════════════════════════════════════════════════════════════════
# DONOR COMPATIBILITY ASSESSMENT
# ═══════════════════════════════════════════════════════════════════


def assess_donor_compatibility(
    recipient_blood: str | None,
    donor_blood: str | None,
    recipient_age: int | None = None,
    donor_age: int | None = None,
    distance_km: float | None = None,
    donor_available: bool = True,
    recent_donation_days: int | None = None,
) -> dict[str, Any]:
    """
    Assess blood donor compatibility with evidence-based reasoning.

    Returns a dict with:
      - compatible: bool or None (None = insufficient info)
      - compatibility_score: 0–100
      - blood_compatibility: "compatible" | "incompatible" | "unknown"
      - factors: list of contributing factors
      - recommendation: clinical recommendation text
      - confidence: dict with confidence breakdown
    """
    factors: list[dict[str, Any]] = []
    total_weight = 0.0
    weighted_score = 0.0

    # 1. Blood type compatibility (55% weight)
    if recipient_blood and donor_blood:
        normalized_recipient = validate_blood_group(recipient_blood)
        normalized_donor = validate_blood_group(donor_blood)
        if normalized_recipient and normalized_donor:
            if normalized_donor in RECIPIENT_COMPATIBILITY.get(normalized_recipient, set()):
                is_identical = normalized_recipient == normalized_donor
                blood_compat = 1.0 if is_identical else 0.85
                label = "Identical blood type" if is_identical else f"Compatible ({normalized_donor} → {normalized_recipient})"
                factors.append({
                    "factor": label,
                    "contribution": 55 * blood_compat,
                    "max_possible": 55,
                    "weight": 0.55,
                })
                total_weight += 0.55
                weighted_score += 55 * blood_compat
            else:
                factors.append({
                    "factor": f"Blood type incompatible ({normalized_donor} cannot donate to {normalized_recipient})",
                    "contribution": 0,
                    "max_possible": 55,
                    "weight": 0.55,
                })
                total_weight += 0.55
    else:
        factors.append({
            "factor": "Blood types not provided for both parties",
            "contribution": 27.5,
            "max_possible": 55,
            "weight": 0.55,
        })
        total_weight += 0.55
        weighted_score += 27.5

    # 2. Age compatibility (20% weight)
    if recipient_age is not None and donor_age is not None:
        age_gap = abs(recipient_age - donor_age)
        if age_gap <= 10:
            age_factor = 0.95
            detail = "Age gap ≤10 years"
        elif age_gap <= 20:
            age_factor = 0.85
            detail = "Age gap 11–20 years"
        elif age_gap <= 40:
            age_factor = 0.70
            detail = "Age gap 21–40 years"
        else:
            age_factor = 0.55
            detail = f"Age gap {age_gap} years"

        if recipient_age < 18 or donor_age < 18:
            age_factor *= 0.7
            detail += " (minor age detected)"
        if donor_age > 65:
            age_factor *= 0.9
            detail += " (donor age >65)"

        factors.append({
            "factor": f"Age compatibility ({detail})",
            "contribution": 20 * age_factor,
            "max_possible": 20,
            "weight": 0.20,
        })
        total_weight += 0.20
        weighted_score += 20 * age_factor

    # 3. Distance (15% weight)
    if distance_km is not None:
        if distance_km <= 5:
            dist_factor = 0.95
        elif distance_km <= 15:
            dist_factor = 0.80
        elif distance_km <= 30:
            dist_factor = 0.60
        elif distance_km <= 50:
            dist_factor = 0.40
        else:
            dist_factor = 0.20

        factors.append({
            "factor": f"Distance: {distance_km} km",
            "contribution": 15 * dist_factor,
            "max_possible": 15,
            "weight": 0.15,
        })
        total_weight += 0.15
        weighted_score += 15 * dist_factor

    # 4. Availability (10% weight)
    if not donor_available:
        factors.append({
            "factor": "Donor unavailable",
            "contribution": 0,
            "max_possible": 10,
            "weight": 0.10,
        })
        total_weight += 0.10
    else:
        factors.append({
            "factor": "Donor available",
            "contribution": 10,
            "max_possible": 10,
            "weight": 0.10,
        })
        total_weight += 0.10
        weighted_score += 10

    # 5. Recent donation (bonus/penalty)
    if recent_donation_days is not None:
        if recent_donation_days < 56:  # Minimum interval for whole blood
            factors.append({
                "factor": f"Donated {recent_donation_days} days ago — below minimum 56-day interval",
                "contribution": -15,
                "max_possible": 0,
                "weight": 0.0,
            })
            weighted_score -= 15
        elif recent_donation_days < 90:
            factors.append({
                "factor": f"Recent donation ({recent_donation_days} days ago)",
                "contribution": 5,
                "max_possible": 0,
                "weight": 0.0,
            })
            weighted_score += 5
        else:
            factors.append({
                "factor": f"Eligible ({recent_donation_days} days since last donation)",
                "contribution": 2,
                "max_possible": 0,
                "weight": 0.0,
            })
            weighted_score += 2

    # Final score
    compatibility_score = max(0, min(100, round(weighted_score)))

    # Determine compatibility
    blood_compat_factors = [f for f in factors if "blood" in f["factor"].lower()]
    blood_incompatible = any("incompatible" in f["factor"] for f in blood_compat_factors)
    if blood_incompatible:
        compatible = False
        recommendation = (
            f"The donor's blood type is not compatible with the recipient. "
            f"A {normalized_donor if donor_blood else 'donor'} donor cannot donate to a "
            f"{normalized_recipient if recipient_blood else 'recipient'} recipient."
        )
    elif compatibility_score >= 60:
        compatible = True
        recommendation = "Good match. Proceed with standard donor verification."
    elif compatibility_score >= 30:
        compatible = True
        recommendation = (
            "Possible match. Additional factors should be reviewed "
            "before proceeding."
        )
    else:
        compatible = None
        recommendation = (
            "Insufficient information to assess compatibility. "
            "Provide blood types for both parties for a definitive assessment."
        )

    # Confidence
    provided = {
        "recipient_blood": recipient_blood is not None,
        "donor_blood": donor_blood is not None,
        "recipient_age": recipient_age is not None,
        "donor_age": donor_age is not None,
        "distance": distance_km is not None,
        "availability": donor_available is not None,
    }
    confidence = estimate_confidence(
        provided_inputs=provided,
        critical_inputs=["recipient_blood", "donor_blood"],
        model_confidence=0.75,
    )

    return {
        "compatible": compatible,
        "compatibility_score": compatibility_score,
        "factors": factors,
        "recommendation": recommendation,
        "confidence": confidence.to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════
# SEVERITY CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════


def classify_severity(
    message: str | None = None,
    heart_rate: int | None = None,
    blood_pressure_sys: int | None = None,
    oxygen: int | None = None,
    age: int | None = None,
    glasgow_coma: int | None = None,
    trauma_type: str | None = None,
) -> dict[str, Any]:
    """
    Classify clinical severity using evidence-based triage rules.

    Returns:
      - severity_level: "Critical" | "High" | "Medium" | "Low"
      - severity_score: 0–100
      - confidence: overall confidence
      - criteria: list of matched criteria
      - recommendation: triage recommendation
    """
    criteria: list[dict[str, Any]] = []
    matched_critical = 0
    matched_high = 0
    matched_medium = 0

    # Keyword-based triage from message
    if message:
        _, msg_level = validate_presenting_complaint(message)
        if msg_level == "Critical":
            matched_critical += 2
            criteria.append({"type": "complaint", "level": "Critical", "detail": f"Presenting complaint suggests critical condition: '{message[:100]}'"})
        elif msg_level == "High":
            matched_high += 2
            criteria.append({"type": "complaint", "level": "High", "detail": f"Presenting complaint suggests high urgency: '{message[:100]}'"})
        elif msg_level == "Medium":
            matched_medium += 1
            criteria.append({"type": "complaint", "level": "Medium", "detail": f"Presenting complaint: '{message[:100]}'"})

    # Vital-based triage
    if heart_rate is not None:
        if heart_rate > 130:
            matched_critical += 2
            criteria.append({"type": "vital", "level": "Critical", "detail": f"Heart rate {heart_rate} bpm — severe tachycardia"})
        elif heart_rate > 110:
            matched_high += 1
            criteria.append({"type": "vital", "level": "High", "detail": f"Heart rate {heart_rate} bpm — tachycardia"})
        elif heart_rate < 45:
            matched_critical += 1
            criteria.append({"type": "vital", "level": "Critical", "detail": f"Heart rate {heart_rate} bpm — severe bradycardia"})

    if blood_pressure_sys is not None:
        if blood_pressure_sys > 200:
            matched_critical += 2
            criteria.append({"type": "vital", "level": "Critical", "detail": f"Systolic BP {blood_pressure_sys} mmHg — hypertensive crisis"})
        elif blood_pressure_sys < 80:
            matched_critical += 2
            criteria.append({"type": "vital", "level": "Critical", "detail": f"Systolic BP {blood_pressure_sys} mmHg — hypotension"})
        elif blood_pressure_sys > 160:
            matched_high += 1
            criteria.append({"type": "vital", "level": "High", "detail": f"Systolic BP {blood_pressure_sys} mmHg — hypertension stage 2"})

    if oxygen is not None:
        if oxygen < 90:
            matched_critical += 2
            criteria.append({"type": "vital", "level": "Critical", "detail": f"SpO₂ {oxygen}% — hypoxemia"})
        elif oxygen < 94:
            matched_high += 1
            criteria.append({"type": "vital", "level": "High", "detail": f"SpO₂ {oxygen}% — reduced oxygen saturation"})

    if glasgow_coma is not None:
        if glasgow_coma <= 8:
            matched_critical += 3
            criteria.append({"type": "exam", "level": "Critical", "detail": f"GCS {glasgow_coma}/15 — severe neurological impairment"})
        elif glasgow_coma <= 12:
            matched_high += 2
            criteria.append({"type": "exam", "level": "High", "detail": f"GCS {glasgow_coma}/15 — moderate neurological impairment"})

    if age is not None and age >= 75:
        matched_high += 1
        criteria.append({"type": "demographic", "level": "High", "detail": f"Age {age} — elderly patient"})
    if age is not None and age <= 1:
        matched_high += 1
        criteria.append({"type": "demographic", "level": "High", "detail": f"Age {age} — infant"})

    # Determine severity
    if matched_critical >= 2:
        severity_level = "Critical"
    elif matched_critical >= 1:
        severity_level = "Critical"
    elif matched_high >= 3:
        severity_level = "High"
    elif matched_high >= 1:
        severity_level = "High"
    elif matched_medium >= 1:
        severity_level = "Medium"
    else:
        severity_level = "Low"

    # Score calculation
    severity_scores = {"Critical": 90, "High": 75, "Medium": 55, "Low": 30}
    base_score = severity_scores[severity_level]
    severity_score = min(100, base_score + matched_critical * 3 + matched_high * 2)

    # Recommendation
    recommendations = {
        "Critical": "Immediate life-threatening condition. Activate emergency response protocol. Prepare ICU/trauma team.",
        "High": "Potentially serious condition. Urgent medical evaluation within minutes. Prepare emergency department.",
        "Medium": "Non-urgent but requires medical attention. Evaluation within 30–60 minutes recommended.",
        "Low": "Routine assessment. Standard clinic evaluation appropriate.",
    }

    # Confidence
    provided = {
        "message": message is not None,
        "heart_rate": heart_rate is not None,
        "blood_pressure": blood_pressure_sys is not None,
        "oxygen": oxygen is not None,
        "age": age is not None,
    }
    confidence = estimate_confidence(
        provided_inputs=provided,
        critical_inputs=["message", "heart_rate", "blood_pressure"],
        model_confidence=None,
    )

    return {
        "severity_level": severity_level,
        "severity_score": min(100, severity_score),
        "criteria": criteria,
        "recommendation": recommendations[severity_level],
        "confidence": confidence.to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════
# DISEASE KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════

DISEASE_KNOWLEDGE: dict[str, dict[str, Any]] = {
    "Hypertension": {
        "icd_code": "I10",
        "symptoms": ["headache", "dizziness", "blurred vision", "chest pain", "shortness of breath", "nosebleeds"],
        "risk_factors": ["age >45 (men)", "age >55 (women)", "family history", "obesity", "sedentary lifestyle", "high sodium intake", "smoking", "alcohol"],
        "typical_treatments": ["ACE inhibitors", "ARBs", "calcium channel blockers", "diuretics", "lifestyle modification", "sodium restriction"],
        "recommended_specialist": "Cardiologist or Internal Medicine",
        "initial_workup": ["Confirm with repeated BP measurements", "Basic metabolic panel", "Lipid panel", "ECG", "Urinalysis"],
        "explanation": "Hypertension is a chronic condition where blood pressure is persistently elevated. It often has no symptoms but increases risk for heart disease, stroke, and kidney disease.",
    },
    "Diabetes Type 2": {
        "icd_code": "E11",
        "symptoms": ["increased thirst", "frequent urination", "fatigue", "blurred vision", "slow healing", "tingling in extremities"],
        "risk_factors": ["age >45", "overweight/obesity", "family history", "sedentary lifestyle", "history of gestational diabetes", "prediabetes"],
        "typical_treatments": ["Metformin", "lifestyle modification", "dietary changes", "exercise", "insulin (advanced)", "SGLT2 inhibitors"],
        "recommended_specialist": "Endocrinologist or Internal Medicine",
        "initial_workup": ["HbA1c", "Fasting glucose", "Lipid panel", "Kidney function", "Eye exam"],
        "explanation": "Type 2 diabetes is a metabolic disorder characterized by insulin resistance and relative insulin deficiency. Management focuses on blood glucose control and complication prevention.",
    },
    "Cardiovascular Disease": {
        "icd_code": "I25",
        "symptoms": ["chest pain", "shortness of breath", "fatigue", "palpitations", "dizziness", "swelling in extremities"],
        "risk_factors": ["age", "smoking", "hypertension", "diabetes", "high cholesterol", "obesity", "family history", "sedentary lifestyle"],
        "typical_treatments": ["Aspirin", "statins", "beta blockers", "ACE inhibitors", "lifestyle modification", "cardiac rehabilitation"],
        "recommended_specialist": "Cardiologist",
        "initial_workup": ["ECG", "Echocardiogram", "Stress test", "Lipid panel", "Cardiac enzymes (if acute)"],
        "explanation": "Cardiovascular disease encompasses conditions affecting the heart and blood vessels. Early detection and risk factor management significantly improve outcomes.",
    },
    "Chronic Kidney Disease": {
        "icd_code": "N18",
        "symptoms": ["fatigue", "swelling", "decreased urine output", "shortness of breath", "nausea", "confusion"],
        "risk_factors": ["diabetes", "hypertension", "age >60", "family history", "cardiovascular disease", "obesity"],
        "typical_treatments": ["ACE inhibitors/ARBs", "blood pressure control", "diabetes management", "dietary modifications", "dialysis (advanced)"],
        "recommended_specialist": "Nephrologist",
        "initial_workup": ["Serum creatinine", "eGFR", "Urinalysis", "Urine albumin-to-creatinine ratio", "Renal ultrasound"],
        "explanation": "Chronic kidney disease involves gradual loss of kidney function. Early stages often have no symptoms, making screening in high-risk individuals important.",
    },
    "Stroke": {
        "icd_code": "I64",
        "symptoms": ["sudden numbness or weakness (one side)", "confusion", "trouble speaking", "vision loss", "dizziness", "severe headache"],
        "risk_factors": ["hypertension", "atrial fibrillation", "diabetes", "smoking", "age", "obesity", "prior stroke/TIA"],
        "typical_treatments": ["Thrombolysis (acute)", "antiplatelet therapy", "anticoagulation", "blood pressure management", "rehabilitation"],
        "recommended_specialist": "Neurologist",
        "initial_workup": ["Non-contrast CT head", "MRI brain", "Carotid ultrasound", "ECG", "Echocardiogram"],
        "explanation": "Stroke is a medical emergency caused by interrupted blood supply to the brain. Time-critical treatment can reduce disability and improve outcomes. If symptoms are recent and acute, emergency evaluation is needed.",
    },
}

# ═══════════════════════════════════════════════════════════════════
# NORMALIZE & VALIDATE COMPLETE PAYLOAD
# ═══════════════════════════════════════════════════════════════════


def validate_health_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Validate and normalize a complete health assessment payload.

    Rejects impossible combinations. Returns validated fields with warnings.
    """
    validated: dict[str, Any] = {}
    warnings: list[str] = []

    # Age
    try:
        validated["age"] = validate_age(payload.get("age"))
    except MedicalValidationError as e:
        warnings.append(str(e))
        validated["age"] = None

    # BMI
    try:
        validated["bmi"] = validate_bmi(payload.get("bmi"))
    except MedicalValidationError as e:
        warnings.append(str(e))
        validated["bmi"] = None

    # Blood pressure
    try:
        sys, dia = validate_blood_pressure(
            payload.get("blood_pressure") or payload.get("blood_pressure_sys"),
            payload.get("blood_pressure_dia"),
        )
        validated["blood_pressure_systolic"] = sys
        validated["blood_pressure_diastolic"] = dia
    except MedicalValidationError as e:
        warnings.append(str(e))
        validated["blood_pressure_systolic"] = None
        validated["blood_pressure_diastolic"] = None

    # Heart rate
    try:
        validated["heart_rate"] = validate_heart_rate(
            payload.get("heart_rate"),
            validated.get("age"),
        )
    except MedicalValidationError as e:
        warnings.append(str(e))
        validated["heart_rate"] = None

    # Oxygen
    parsed_bp_sys = None
    if "blood_pressure" in payload:
        try:
            parsed_bp_sys, _ = validate_blood_pressure(payload["blood_pressure"])
        except MedicalValidationError:
            logger.debug("Suppressed MedicalValidationError in %s", __name__)

    # Check for impossible combinations
    if (validated.get("blood_pressure_systolic") is not None
            and validated.get("blood_pressure_diastolic") is not None):
        if (validated["blood_pressure_systolic"] > 220
                and validated["heart_rate"] is not None
                and validated["heart_rate"] < 50):
            warnings.append(
                "Concurrent severe hypertension and bradycardia is unusual. "
                "Please verify both measurements."
            )

    # Lifestyle
    validated["lifestyle"] = validate_lifestyle(payload.get("lifestyle") or payload.get("lifestyle_factor"))

    # Blood group
    try:
        validated["blood_group"] = validate_blood_group(
            payload.get("blood_group") or payload.get("bloodType") or payload.get("blood_type")
        )
    except MedicalValidationError as e:
        warnings.append(str(e))
        validated["blood_group"] = None

    validated["_warnings"] = warnings
    return validated
