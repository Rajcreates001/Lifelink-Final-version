"""
AI Routes — Medical Report Analysis
=====================================
Endpoints for analyzing medical reports:
- Text-based report analysis
- File upload with PDF/OCR extraction
- Condition detection, vitals extraction, risk scoring
"""
from __future__ import annotations

import logging
import math
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.db.database import require_db
from app.services.collections import ANALYTICS_EVENTS, HEALTH_RECORDS
from app.services.medical_knowledge import (
    assess_vitals,
    compute_risk_score,
    estimate_confidence,
    validate_health_payload,
)
from app.services.repository import MongoRepository
from app.core.auth import get_optional_user, get_current_user, AuthContext
from app.services.rate_limiter import rate_limit_ml_heavy

from app.routes.ai_shared import (
    MAX_REPORT_BYTES,
    MIN_REPORT_CHARS,
    as_object_id,
    clean_report_text,
    ensure_meta,
    extract_text_from_upload,
    infer_upload_kind,
    looks_like_binary_text,
    run_prediction,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


# ─── Request Models ─────────────────────────────────────────────

class AnalyzeReportRequest(BaseModel):
    report_text: str
    user_id: str | None = None


# ─── Medical Text Extraction Helpers ────────────────────────────

def _first_number(patterns: list[str], text: str) -> float | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except (TypeError, ValueError):
                continue
    return None


def _extract_bp(text: str) -> tuple[int | None, int | None]:
    match = re.search(r"(?:blood pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*/\s*(\d{2,3})", text, flags=re.IGNORECASE)
    if not match:
        match = re.search(r"(\d{2,3})\s*/\s*(\d{2,3})\s*mmhg", text, flags=re.IGNORECASE)
    if not match:
        return None, None
    try:
        return int(match.group(1)), int(match.group(2))
    except (TypeError, ValueError):
        return None, None


def extract_report_metrics(text: str) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    age = _first_number([
        r"\bage\s*[:\-]?\s*(\d{1,3})\b",
        r"\b(\d{1,3})\s*(?:-|\s)?\s*(?:years?|yrs?)[\s-]*old\b",
        r"\b(\d{1,3})\s*(?:y/o|yo)\b",
    ], text)
    hemoglobin = _first_number([r"(?:hemoglobin|haemoglobin|\bhb\b|\bhgb\b)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)"], text)
    creatinine = _first_number([r"creatinine\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)"], text)
    bmi = _first_number([r"\bbmi\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)"], text)
    heart_rate = _first_number([r"(?:heart rate|hr|pulse)\s*[:\-]?\s*(\d{2,3})"], text)
    oxygen = _first_number([r"(?:oxygen|spo2|o2)\s*[:\-]?\s*(\d{2,3})\s*%?"], text)
    glucose = _first_number([r"(?:glucose|blood sugar|fasting glucose)\s*[:\-]?\s*(\d{2,3})"], text)
    hba1c = _first_number([r"hba1c\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)"], text)
    cholesterol = _first_number([r"cholesterol\s*[:\-]?\s*(\d{2,3})"], text)
    temp_value = _first_number([r"(?:temperature|temp)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)"], text)
    temp_unit = None
    temp_match = re.search(r"(?:temperature|temp)\s*[:\-]?\s*\d{2,3}(?:\.\d+)?\s*°?\s*([cf])", text, flags=re.IGNORECASE)
    if temp_match:
        temp_unit = temp_match.group(1).upper()

    systolic, diastolic = _extract_bp(text)

    if age is not None:
        metrics["age"] = int(age)
    if bmi is not None:
        metrics["bmi"] = round(float(bmi), 1)
    if heart_rate is not None:
        metrics["heart_rate"] = int(heart_rate)
    if oxygen is not None:
        metrics["oxygen"] = int(oxygen)
    if glucose is not None:
        metrics["glucose_mg_dl"] = int(glucose)
    if hba1c is not None:
        metrics["hba1c"] = round(float(hba1c), 1)
    if cholesterol is not None:
        metrics["cholesterol_mg_dl"] = int(cholesterol)
    if temp_value is not None:
        metrics["temperature"] = round(float(temp_value), 1)
        if temp_unit:
            metrics["temperature_unit"] = temp_unit
    if hemoglobin is not None and 2 <= hemoglobin <= 25:
        metrics["hemoglobin_g_dl"] = round(float(hemoglobin), 1)
    if creatinine is not None and 0.1 <= creatinine <= 20:
        metrics["creatinine_mg_dl"] = round(float(creatinine), 1)
    if systolic is not None:
        metrics["blood_pressure_systolic"] = systolic
    if diastolic is not None:
        metrics["blood_pressure_diastolic"] = diastolic

    return metrics


def extract_lifestyle(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ["sedentary", "inactive", "no exercise"]):
        return "Sedentary"
    if any(term in lowered for term in ["active", "regular exercise", "athlete"]):
        return "Active"
    if any(term in lowered for term in ["smoker", "smoking", "tobacco"]):
        return "Smoker"
    return "Average"


def build_risk_flags(metrics: dict[str, Any]) -> list[str]:
    flags = []
    hr = metrics.get("heart_rate")
    if isinstance(hr, int) and hr > 110:
        flags.append("Elevated heart rate")
    if isinstance(hr, int) and hr < 50:
        flags.append("Low heart rate")

    oxygen = metrics.get("oxygen")
    if isinstance(oxygen, int) and oxygen < 92:
        flags.append("Low oxygen saturation")

    systolic = metrics.get("blood_pressure_systolic")
    diastolic = metrics.get("blood_pressure_diastolic")
    if isinstance(systolic, int) and systolic >= 140:
        flags.append("High systolic blood pressure")
    if isinstance(diastolic, int) and diastolic >= 90:
        flags.append("High diastolic blood pressure")

    glucose = metrics.get("glucose_mg_dl")
    if isinstance(glucose, int) and glucose >= 140:
        flags.append("Elevated glucose")

    hba1c = metrics.get("hba1c")
    if isinstance(hba1c, (int, float)) and hba1c >= 6.5:
        flags.append("High HbA1c")

    temp_value = metrics.get("temperature")
    temp_unit = metrics.get("temperature_unit")
    if isinstance(temp_value, (int, float)):
        if temp_unit == "F" and temp_value >= 100.4:
            flags.append("Fever")
        if temp_unit != "F" and temp_value >= 38.0:
            flags.append("Fever")

    return flags


_SEVERITY_ORDER = {"Low": 0, "Moderate": 1, "High": 2, "Critical": 3}
_LEVEL_FLOOR = {"Low": 5, "Moderate": 25, "High": 50, "Critical": 75}


def _level_from_score(score: float) -> str:
    if score >= 75:
        return "Critical"
    if score >= 50:
        return "High"
    if score >= 25:
        return "Moderate"
    return "Low"


_CONDITION_CATEGORY = {
    "Hypertensive Crisis": "Cardiovascular", "Hypertension": "Cardiovascular", "Hypotension": "Cardiovascular",
    "Chest Pain": "Cardiovascular", "Cardiac Event": "Cardiovascular", "Tachycardia": "Cardiovascular",
    "Bradycardia": "Cardiovascular", "High Cholesterol": "Cardiovascular",
    "Diabetes": "Metabolic", "Elevated Glucose": "Metabolic", "Prediabetes": "Metabolic",
    "Hypoglycemia": "Metabolic", "Obesity": "Metabolic",
    "Anemia": "Blood", "Severe Anemia": "Blood",
    "Kidney Disease": "Renal", "Reduced Kidney Function": "Renal",
    "Hypoxemia": "Respiratory", "Low Oxygen": "Respiratory", "Breathlessness": "Respiratory",
    "Fever": "Infection", "High Fever": "Infection",
}


def _primary_category(conditions: list[str], keyword_category: str | None) -> str:
    """Category of the most frequent body system among the findings."""
    counts: dict[str, int] = {}
    for c in conditions:
        cat = _CONDITION_CATEGORY.get(c)
        if cat:
            counts[cat] = counts.get(cat, 0) + 1
    if keyword_category and keyword_category != "General":
        counts[keyword_category] = counts.get(keyword_category, 0) + 2
    return max(counts, key=counts.get) if counts else "General"


def evidence_findings(metrics: dict[str, Any], text: str) -> list[dict[str, Any]]:
    """Judge the report's own numbers against standard clinical reference
    ranges. Each finding: condition (or None), human-readable flag, points.
    This is what makes two different reports produce different results —
    a mention of "BP" or "glucose" alone is no longer a finding."""
    out: list[dict[str, Any]] = []
    lowered = text.lower()

    def add(condition, flag, points):
        out.append({"condition": condition, "flag": flag, "points": points})

    def num(key):
        v = metrics.get(key)
        return v if isinstance(v, (int, float)) else None

    sys_bp, dia_bp = num("blood_pressure_systolic"), num("blood_pressure_diastolic")
    if sys_bp is not None or dia_bp is not None:
        s, d = sys_bp or 0, dia_bp or 0
        bp = f"{sys_bp or '?'}/{dia_bp or '?'} mmHg"
        if s >= 180 or d >= 120:
            add("Hypertensive Crisis", f"BP {bp} is in the hypertensive-crisis range", 30)
        elif s >= 140 or d >= 90:
            add("Hypertension", f"BP {bp} is high (stage 2: >=140/90)", 15)
        elif s >= 130 or d >= 80:
            add(None, f"BP {bp} is mildly elevated (stage 1)", 5)
        elif sys_bp is not None and sys_bp < 90:
            add("Hypotension", f"BP {bp} is low (<90 systolic)", 15)

    glucose, hba1c = num("glucose_mg_dl"), num("hba1c")
    if (hba1c is not None and hba1c >= 6.5) or (glucose is not None and glucose >= 200):
        severe = (hba1c is not None and hba1c >= 9) or (glucose is not None and glucose >= 250)
        detail = ", ".join(x for x in [f"glucose {glucose} mg/dL" if glucose else "", f"HbA1c {hba1c}%" if hba1c else ""] if x)
        add("Diabetes", f"Diabetic range ({detail})" + (" — poorly controlled" if severe else ""), 20 if severe else 15)
    elif glucose is not None and glucose >= 126:
        add("Elevated Glucose", f"Glucose {glucose} mg/dL is high (>=126)", 10)
    elif (glucose is not None and glucose >= 100) or (hba1c is not None and hba1c >= 5.7):
        add("Prediabetes", "Glucose/HbA1c in the prediabetes range", 6)
    if glucose is not None and glucose < 70:
        add("Hypoglycemia", f"Glucose {glucose} mg/dL is low (<70)", 15)

    hb = num("hemoglobin_g_dl")
    if hb is not None:
        male = re.search(r"\bmale\b|\bman\b|\bmr\.?\b", lowered) and not re.search(r"\bfemale\b|\bwoman\b", lowered)
        low_cut = 13.0 if male else 12.0
        if hb < 7:
            add("Severe Anemia", f"Hemoglobin {hb} g/dL is severely low", 25)
        elif hb < 10:
            add("Anemia", f"Hemoglobin {hb} g/dL is low (moderate anemia)", 15)
        elif hb < low_cut:
            add("Anemia", f"Hemoglobin {hb} g/dL is below normal (<{low_cut})", 6)

    creat = num("creatinine_mg_dl")
    if creat is not None:
        if creat >= 2.0:
            add("Kidney Disease", f"Creatinine {creat} mg/dL suggests significant kidney impairment", 20)
        elif creat > 1.3:
            add("Reduced Kidney Function", f"Creatinine {creat} mg/dL is above normal", 8)

    spo2 = num("oxygen")
    if spo2 is not None:
        if spo2 < 90:
            add("Hypoxemia", f"SpO2 {spo2}% is dangerously low (<90%)", 25)
        elif spo2 < 94:
            add("Low Oxygen", f"SpO2 {spo2}% is below normal (<94%)", 12)

    hr = num("heart_rate")
    if hr is not None:
        if hr > 120:
            add("Tachycardia", f"Heart rate {hr} bpm is very high", 15)
        elif hr > 100:
            add("Tachycardia", f"Heart rate {hr} bpm is high (>100)", 8)
        elif hr < 50:
            add("Bradycardia", f"Heart rate {hr} bpm is low (<50)", 10)

    chol = num("cholesterol_mg_dl")
    if chol is not None:
        if chol >= 240:
            add("High Cholesterol", f"Total cholesterol {chol} mg/dL is high (>=240)", 8)
        elif chol >= 200:
            add(None, f"Total cholesterol {chol} mg/dL is borderline high", 3)

    temp, unit = num("temperature"), metrics.get("temperature_unit")
    if temp is not None:
        temp_c = (temp - 32) * 5 / 9 if (unit == "F" or temp > 50) else temp
        if temp_c >= 39.5:
            add("High Fever", f"Temperature {temp}{unit or ''} is a high fever", 15)
        elif temp_c >= 38.0:
            add("Fever", f"Temperature {temp}{unit or ''} indicates fever", 8)

    bmi = num("bmi")
    if bmi is not None and bmi >= 30:
        add("Obesity", f"BMI {bmi} is in the obese range", 6)

    symptom_checks = [
        (r"chest pain|chest tightness", "Chest Pain", "Chest pain reported", 20),
        (r"shortness of breath|breathless|dyspn", "Breathlessness", "Shortness of breath reported", 12),
        (r"unconscious|syncope|fainted|loss of consciousness", "Loss of Consciousness", "Loss of consciousness reported", 20),
    ]
    for pattern, cond, flag, pts in symptom_checks:
        m = re.search(pattern, lowered)
        if m and not re.search(r"(?:\bno\b|\bdenies\b|\bwithout\b)[^.;\n]{0,25}$", lowered[max(0, m.start() - 30):m.start()]):
            add(cond, flag, pts)

    age = num("age")
    if age is not None and age >= 65:
        add(None, f"Age {int(age)} raises baseline risk", 6)
    elif age is not None and age >= 45:
        add(None, f"Age {int(age)} slightly raises baseline risk", 3)
    return out


def normalize_conditions(conditions: list[str]) -> list[str]:
    if not conditions:
        return []
    seen = set()
    cleaned = []
    for item in conditions:
        if item in seen:
            continue
        seen.add(item)
        cleaned.append(item)

    has_specific_cancer = any(item.endswith("Cancer") for item in cleaned)
    if has_specific_cancer and "Malignancy" in cleaned:
        cleaned = [item for item in cleaned if item != "Malignancy"]

    if any(item in cleaned for item in ("Hypertension", "Hypotension")):
        cleaned = [item for item in cleaned if item != "Blood Pressure Issue"]

    return cleaned


def build_condition_guidance(conditions: list[str]) -> tuple[list[str], list[str]]:
    explanation_map = {
        "Liver Cancer": "Text mentions liver cancer terms. This usually needs confirmation with imaging and pathology.",
        "Breast Cancer": "Text mentions breast cancer terms. Confirm with imaging, biopsy, and oncology review.",
        "Lung Cancer": "Text mentions lung cancer terms. Confirm with imaging and pathology.",
        "Colon Cancer": "Text mentions colon cancer terms. Confirm with colonoscopy and pathology.",
        "Prostate Cancer": "Text mentions prostate cancer terms. Confirm with PSA, imaging, and biopsy.",
        "Malignancy": "Cancer-related terms appear. A specialist review is needed to confirm the diagnosis.",
        "Liver Disease": "Liver-related terms appear. Review LFTs and ultrasound/CT findings.",
        "Kidney Disease": "Kidney-related terms appear. Review creatinine, eGFR, and urinalysis.",
        "Cardiac Event": "Heart attack or failure terms appear. ECG/troponin and cardiology review are typical next steps.",
        "Hypertension": "Blood pressure terms suggest hypertension. Confirm with repeat BP readings.",
        "Hypotension": "Low blood pressure terms appear. Assess hydration, meds, and vital trends.",
        "Diabetes": "Diabetes or high glucose terms appear. Confirm with HbA1c or fasting glucose.",
        "Elevated Glucose": "Glucose elevation is mentioned. Repeat glucose and HbA1c are typical follow-ups.",
        "Respiratory Disease": "Asthma/COPD terms appear. Review inhaler use and consider spirometry.",
        "Pneumonia": "Pneumonia terms appear. Chest imaging and clinical exam are typical.",
        "Stroke": "Stroke terms appear. Neuro evaluation and imaging are usually required.",
        "Seizure": "Seizure terms appear. Neurology review and EEG may be needed.",
        "Anemia": "Anemia terms appear. Check CBC and iron studies.",
        "Infection": "Infection-related terms appear. Consider CBC, cultures, and clinician review.",
        "Sepsis": "Sepsis terms appear. This usually needs urgent clinical evaluation.",
        "Fracture": "Fracture terms appear. Imaging is needed to confirm the location and severity.",
        "Hypertensive Crisis": "Blood pressure is at or above 180/120 — this can damage organs and needs same-day care.",
        "Prediabetes": "Glucose/HbA1c is above normal but below the diabetic range; lifestyle change can reverse it.",
        "Hypoglycemia": "Blood sugar below 70 mg/dL can cause confusion or fainting.",
        "Severe Anemia": "Hemoglobin below 7 g/dL usually needs urgent evaluation and sometimes transfusion.",
        "Reduced Kidney Function": "Creatinine is mildly raised; kidney function should be rechecked.",
        "Hypoxemia": "Oxygen saturation below 90% means the blood is not carrying enough oxygen.",
        "Low Oxygen": "Oxygen saturation is below the normal 95-100% range.",
        "Tachycardia": "Heart rate is above 100 bpm at rest.",
        "Bradycardia": "Heart rate is below 50 bpm at rest.",
        "High Cholesterol": "Total cholesterol of 240 mg/dL or more raises heart-disease risk.",
        "Fever": "Body temperature indicates fever.",
        "High Fever": "Body temperature is very high.",
        "Obesity": "BMI of 30 or more raises the risk of diabetes, BP and heart disease.",
        "Chest Pain": "Chest pain with abnormal vitals can be a heart emergency.",
        "Breathlessness": "Shortness of breath needs assessment, especially with low SpO2.",
        "Loss of Consciousness": "Fainting or unconsciousness needs urgent evaluation.",
    }
    next_steps_map = {
        "Liver Cancer": ["Review imaging (US/CT/MRI) and pathology with oncology."],
        "Breast Cancer": ["Review imaging (mammogram/US/MRI) and biopsy results."],
        "Lung Cancer": ["Review CT chest findings and pathology if available."],
        "Colon Cancer": ["Review colonoscopy findings and pathology."],
        "Prostate Cancer": ["Review PSA trend and biopsy if available."],
        "Malignancy": ["Share the report with an oncology specialist for confirmation."],
        "Liver Disease": ["Check liver function tests and imaging findings."],
        "Kidney Disease": ["Review creatinine/eGFR and urinalysis."],
        "Cardiac Event": ["Check ECG/troponin and discuss with cardiology."],
        "Hypertension": ["Repeat BP readings and review medications/lifestyle."],
        "Hypotension": ["Monitor vitals and review hydration/meds."],
        "Diabetes": ["Confirm with HbA1c and fasting glucose."],
        "Elevated Glucose": ["Repeat glucose test and review diet/meds."],
        "Respiratory Disease": ["Review symptoms and consider spirometry."],
        "Pneumonia": ["Review chest imaging and infection markers."],
        "Stroke": ["Urgent neurologic assessment and imaging if symptoms are recent."],
        "Seizure": ["Neurology review and EEG if clinically indicated."],
        "Anemia": ["Check CBC and iron studies."],
        "Infection": ["Check CBC and follow clinician guidance for cultures/antibiotics."],
        "Sepsis": ["Seek urgent medical evaluation."],
        "Fracture": ["Confirm with X-ray/CT and review treatment plan."],
        "Hypertensive Crisis": ["Seek emergency care today — do not wait for a routine appointment."],
        "Prediabetes": ["Repeat fasting glucose/HbA1c in 3 months; increase activity and reduce sugar."],
        "Hypoglycemia": ["Take fast-acting sugar now and review diabetes medicines with a doctor."],
        "Severe Anemia": ["Get urgent medical review; a repeat CBC and iron studies are needed."],
        "Reduced Kidney Function": ["Repeat creatinine/eGFR and urine tests; avoid painkillers like NSAIDs."],
        "Hypoxemia": ["Seek urgent care — oxygen therapy may be needed."],
        "Low Oxygen": ["Recheck SpO2 at rest; see a doctor if it stays below 94%."],
        "Tachycardia": ["Get an ECG and check for fever, dehydration or thyroid problems."],
        "Bradycardia": ["Get an ECG and review medicines that slow the heart."],
        "High Cholesterol": ["Get a full lipid profile and discuss diet and statins."],
        "Fever": ["Hydrate, monitor temperature and see a doctor if it lasts over 3 days."],
        "High Fever": ["See a doctor today, especially with rash, stiff neck or confusion."],
        "Obesity": ["Discuss a weight-management plan; screen for diabetes and BP."],
        "Chest Pain": ["Call an ambulance (108) if chest pain is ongoing — use LifeLink SOS."],
        "Breathlessness": ["Seek urgent evaluation if breathlessness is new or worsening."],
        "Loss of Consciousness": ["Get urgent medical evaluation and an ECG."],
    }

    explanations = []
    next_steps = []
    seen_steps = set()
    for condition in conditions:
        explanation = explanation_map.get(condition)
        if explanation:
            explanations.append(f"{condition}: {explanation}")
        for step in next_steps_map.get(condition, []):
            if step in seen_steps:
                continue
            seen_steps.add(step)
            next_steps.append(step)
    return explanations, next_steps


def build_condition_confidences(conditions: list[str], metrics: dict[str, Any], analysis_confidence: float,
                                findings: list[dict[str, Any]] | None = None) -> dict[str, float]:
    """Per-condition confidence (0-100) derived from supporting evidence.

    Text-pattern detection alone anchors at the analysis confidence (which is
    driven by input completeness). An objective vital/lab confirmation
    (abnormal BP, HbA1c, glucose, SpO2, fever) raises the confidence; a normal
    objective reading for a text-claimed condition lowers it. Every number
    returned is computed from the report's own evidence — never invented.
    """
    systolic = metrics.get("blood_pressure_systolic")
    diastolic = metrics.get("blood_pressure_diastolic")
    glucose = metrics.get("glucose_mg_dl")
    hba1c = metrics.get("hba1c")
    oxygen = metrics.get("oxygen")
    temp_value = metrics.get("temperature")
    temp_unit = metrics.get("temperature_unit")

    def _is_num(v) -> bool:
        return isinstance(v, (int, float))

    has_fever = _is_num(temp_value) and (
        (temp_unit == "F" and temp_value >= 100.4) or (temp_unit != "F" and temp_value >= 38.0)
    )

    base = max(0.4, min(0.92, analysis_confidence)) * 100
    confidences: dict[str, float] = {}
    for condition in conditions:
        confidence = base
        if condition == "Hypertension":
            if (_is_num(systolic) and systolic >= 140) or (_is_num(diastolic) and diastolic >= 90):
                confidence = min(95, base + 20)
            elif systolic is not None:
                confidence = max(35, base - 20)
        elif condition == "Hypotension":
            if _is_num(systolic) and systolic < 90:
                confidence = min(95, base + 20)
            elif systolic is not None:
                confidence = max(35, base - 20)
        elif condition == "Diabetes":
            if (_is_num(hba1c) and hba1c >= 6.5) or (_is_num(glucose) and glucose >= 126):
                confidence = min(95, base + 20)
            elif hba1c is not None or glucose is not None:
                confidence = max(35, base - 15)
        elif condition == "Elevated Glucose":
            if _is_num(glucose) and glucose >= 140:
                confidence = min(95, base + 20)
            elif glucose is not None:
                confidence = max(35, base - 10)
        elif condition in {"Respiratory Disease", "Pneumonia"}:
            if _is_num(oxygen) and oxygen < 92:
                confidence = min(95, base + 15)
        elif condition in {"Infection", "Sepsis"}:
            if has_fever:
                confidence = min(95, base + 15)
        confidences[condition] = round(confidence)
    # Conditions backed by a measured value: confidence scales with how far
    # outside the normal range the value is (finding points), not one constant.
    for finding in findings or []:
        cond = finding.get("condition")
        if cond in confidences:
            confidences[cond] = round(min(97, max(confidences[cond] - 25, 55 + 1.4 * finding["points"])))
    return confidences


def extract_conditions(report_text: str) -> list[str]:
    patterns = {
        r"\bliver cancer\b|\bhepatocellular carcinoma\b|\bhepatic carcinoma\b": "Liver Cancer",
        r"\bbreast cancer\b|\bmammary carcinoma\b": "Breast Cancer",
        r"\blung cancer\b|\bbronchogenic carcinoma\b": "Lung Cancer",
        r"\bcolon cancer\b|\bcolorectal cancer\b": "Colon Cancer",
        r"\bprostate cancer\b": "Prostate Cancer",
        r"\bmalignancy\b|\bcarcinoma\b|\btumor\b|\bcancer\b": "Malignancy",
        r"\bhepatitis\b|\bcirrhosis\b|\bfatty liver\b|\bliver disease\b": "Liver Disease",
        r"\bkidney disease\b|\brenal failure\b|\bckd\b": "Kidney Disease",
        r"\bheart failure\b|\bmyocardial infarction\b|\bheart attack\b": "Cardiac Event",
        r"\bhypertension\b|\bhigh blood pressure\b": "Hypertension",
        r"\bhypotension\b|\blow blood pressure\b": "Hypotension",
        r"\bdiabetes\b|\btype 1 diabetes\b|\btype 2 diabetes\b": "Diabetes",
        r"\bhyperglycemia\b|\bhigh blood sugar\b": "Elevated Glucose",
        r"\basthma\b|\bcopd\b": "Respiratory Disease",
        r"\bpneumonia\b": "Pneumonia",
        r"\bstroke\b": "Stroke",
        r"\banemia\b": "Anemia",
        r"\bsepsis\b|\binfection\b": "Infection",
        r"\bfracture\b": "Fracture",
    }
    lowered = report_text.lower()
    conditions = []
    for pattern, label in patterns.items():
        if re.search(pattern, lowered):
            conditions.append(label)
    return conditions


# ─── Core Report Analysis Logic ─────────────────────────────────

async def build_report_analysis(report_text: str, user_id: str | None, source_meta: dict[str, Any] | None = None):
    if not report_text or not report_text.strip():
        raise HTTPException(status_code=400, detail="Report text is required")
    if looks_like_binary_text(report_text):
        raise HTTPException(status_code=400, detail="Report text looks like raw PDF bytes. Upload the file for OCR.")

    try:
        result = await run_prediction("analyze_report", {"report_text": report_text})
    except HTTPException:
        result = {}

    if isinstance(result, dict) and result.get("error"):
        result = {}

    conditions = result.get("detected_conditions") or extract_conditions(report_text)
    conditions = normalize_conditions(conditions)
    metrics = extract_report_metrics(report_text)

    # Validate extracted metrics through medical knowledge layer
    validated_metrics = validate_health_payload(metrics)
    metric_warnings = validated_metrics.get("_warnings", [])
    for key in ["age", "bmi", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "lifestyle"]:
        if key in validated_metrics and validated_metrics[key] is not None:
            metrics[key] = validated_metrics[key]

    findings = evidence_findings(metrics, report_text)
    for finding in findings:
        if finding["condition"] and finding["condition"] not in conditions:
            conditions.append(finding["condition"])
    if "Hypertensive Crisis" in conditions:
        conditions = [c for c in conditions if c != "Hypertension"]
    if "Severe Anemia" in conditions:
        conditions = [c for c in conditions if c != "Anemia"]
    if "Diabetes" in conditions:
        conditions = [c for c in conditions if c not in ("Elevated Glucose", "Prediabetes")]
    conditions = normalize_conditions(conditions)

    # evidence_findings covers every check build_risk_flags made, with values.
    risk_flags = [f["flag"] for f in findings]
    lifestyle = extract_lifestyle(report_text)
    ml_payload = None
    if metrics.get("heart_rate") or metrics.get("blood_pressure_systolic") or metrics.get("age"):
        ml_payload = {
            "age": metrics.get("age") or 35,
            "bmi": metrics.get("bmi") or 24,
            "heart_rate": metrics.get("heart_rate") or 78,
            "has_condition": 1 if conditions else 0,
            "lifestyle_factor": lifestyle,
        }
        if metrics.get("blood_pressure_systolic"):
            ml_payload["blood_pressure"] = metrics.get("blood_pressure_systolic")

    ml_result = None
    if ml_payload:
        try:
            ml_result = await run_prediction("predict_risk", ml_payload)
        except HTTPException:
            ml_result = None

    # Keyword (text-mention) severity — e.g. "metastatic carcinoma" — is kept,
    # but a missing/zero keyword score must not default to a fixed 42.
    risk_level = result.get("risk_level") if result.get("risk_level") in _SEVERITY_ORDER else "Low"
    risk_score = result.get("risk_score") if isinstance(result.get("risk_score"), (int, float)) else 0
    evidence_points = sum(f["points"] for f in findings)
    evidence_score = round(100 * (1 - math.exp(-evidence_points / 55)))
    risk_score = max(risk_score, evidence_score, 5)
    primary_category = _primary_category(conditions, result.get("primary_category"))
    summary = "Automated summary generated from the submitted report."

    # Evidence-based vital assessment
    assess_vitals(
        heart_rate=metrics.get("heart_rate"),
        blood_pressure_sys=metrics.get("blood_pressure_systolic"),
        blood_pressure_dia=metrics.get("blood_pressure_diastolic"),
        oxygen=metrics.get("oxygen"),
        bmi=metrics.get("bmi"),
        age=metrics.get("age")
    )
    if ml_result and isinstance(ml_result, dict):
        model_score = ml_result.get("risk_score")
        model_level = ml_result.get("risk_level")
        if isinstance(model_score, (int, float)):
            risk_score = max(risk_score, int(model_score))
        severity_order = {"Low": 0, "Moderate": 1, "High": 2, "Critical": 3}
        if model_level in severity_order and severity_order.get(model_level, 0) > severity_order.get(risk_level, 0):
            risk_level = model_level

    clinical_risk = compute_risk_score(
        age=metrics.get("age"),
        bmi=metrics.get("bmi"),
        blood_pressure_sys=metrics.get("blood_pressure_systolic"),
        heart_rate=metrics.get("heart_rate"),
        oxygen=metrics.get("oxygen"),
        has_condition=bool(conditions),
        lifestyle=lifestyle
    )
    if clinical_risk.get("risk_score") is not None:
        risk_score = max(risk_score, clinical_risk["risk_score"])
        severity_order = {"Low": 0, "Moderate": 1, "High": 2, "Critical": 3}
        if clinical_risk["risk_level"] in severity_order and \
           severity_order.get(clinical_risk["risk_level"], 0) > severity_order.get(risk_level, 0):
            risk_level = clinical_risk["risk_level"]

    # One consistent answer: level follows the score, a single dangerous
    # finding (crisis BP, SpO2 < 90, severe anemia...) is at least High, and
    # the score is lifted to the level's floor so "Critical (45/100)" can't occur.
    risk_score = int(min(100, round(risk_score)))
    candidates = [_level_from_score(risk_score), risk_level]
    if any(f["points"] >= 25 for f in findings):
        candidates.append("High")
    risk_level = max(candidates, key=lambda lvl: _SEVERITY_ORDER.get(lvl, 0))
    risk_score = max(risk_score, _LEVEL_FLOOR[risk_level])

    provided_inputs = {
        "heart_rate": metrics.get("heart_rate") is not None,
        "blood_pressure": metrics.get("blood_pressure_systolic") is not None,
        "oxygen": metrics.get("oxygen") is not None,
        "bmi": metrics.get("bmi") is not None,
        "age": metrics.get("age") is not None,
    }
    conf_result = estimate_confidence(
        provided_inputs=provided_inputs,
        model_confidence=ml_result.get("meta", {}).get("confidence") if isinstance(ml_result, dict) else None,
        critical_inputs=["heart_rate", "blood_pressure"]
    )
    metric_notes = []
    if metrics.get("blood_pressure_systolic") and metrics.get("blood_pressure_diastolic"):
        metric_notes.append(f"BP {metrics['blood_pressure_systolic']}/{metrics['blood_pressure_diastolic']}")
    if metrics.get("heart_rate"):
        metric_notes.append(f"HR {metrics['heart_rate']} bpm")
    if metrics.get("oxygen"):
        metric_notes.append(f"O2 {metrics['oxygen']}%")
    if metrics.get("glucose_mg_dl"):
        metric_notes.append(f"Glucose {metrics['glucose_mg_dl']} mg/dL")

    if conditions or metric_notes:
        summary_parts = []
        if conditions:
            summary_parts.append(f"Findings: {', '.join(conditions)}")
        else:
            summary_parts.append("No abnormal values detected in the report")
        if metric_notes:
            summary_parts.append("Key vitals: " + ", ".join(metric_notes))
        if risk_flags:
            summary_parts.append("Risk flags: " + ", ".join(risk_flags))
        summary = ". ".join(summary_parts) + "."

    explanation_lines, next_steps = build_condition_guidance(conditions)
    if risk_flags:
        for flag in risk_flags:
            if flag == "Low oxygen saturation":
                next_steps.append("If shortness of breath is present, seek urgent evaluation.")
            if flag == "High systolic blood pressure":
                next_steps.append("Recheck BP and discuss treatment adjustments if elevated.")
            if flag == "High diastolic blood pressure":
                next_steps.append("Recheck BP and discuss treatment adjustments if elevated.")
            if flag == "Elevated glucose":
                next_steps.append("Confirm glucose elevation with repeat labs.")

    if not next_steps:
        next_steps = [
            "Share this report with your clinician for confirmation.",
            "If symptoms are worsening or severe, seek urgent care.",
        ]

    patient_summary = summary
    if summary and not summary.endswith("."):
        patient_summary += "."
    patient_summary += f" Overall risk estimate: {risk_level} ({risk_score}/100)."
    patient_summary += " This is a text-only screening, not a diagnosis."

    analysis_confidence = conf_result.overall

    analysis_steps = []
    if source_meta and source_meta.get("source"):
        analysis_steps.append(
            {
                "step": "Document ingestion",
                "detail": f"Source: {source_meta.get('source')}",
                "confidence": round(analysis_confidence + 0.06, 2),
            }
        )

    analysis_steps.extend(
        [
            {
                "step": "Input parsing",
                "detail": "Report text normalized and prepared for medical keyword scanning.",
                "confidence": round(analysis_confidence + 0.06, 2),
            },
            {
                "step": "Vitals extraction",
                "detail": "Extracted vitals and lab values from the report text.",
                "confidence": round(analysis_confidence, 2),
            },
            {
                "step": "Condition detection",
                "detail": "Detected conditions: " + (", ".join(conditions) if conditions else "None found"),
                "confidence": round(analysis_confidence - 0.02, 2),
            },
            {
                "step": "Risk scoring",
                "detail": f"Risk level {risk_level} with score {risk_score}. Evidence-based calculation used.",
                "confidence": round(analysis_confidence - 0.04, 2),
            },
        ]
    )

    if clinical_risk.get("drivers"):
        driver_details = "; ".join(
            d["detail"] for d in clinical_risk["drivers"][:3]
            if isinstance(d, dict) and d.get("detail")
        )
        if driver_details:
            analysis_steps.append({
                "step": "Clinical risk factors",
                "detail": driver_details,
                "confidence": round(analysis_confidence - 0.03, 2),
            })

    if ml_result and isinstance(ml_result, dict):
        analysis_steps.append(
            {
                "step": "ML risk model",
                "detail": f"Model suggests {ml_result.get('risk_level')} risk with score {ml_result.get('risk_score')}",
                "confidence": round(analysis_confidence - 0.05, 2),
            }
        )

    analysis_steps.append(
        {
            "step": "Summary synthesis",
            "detail": patient_summary,
            "confidence": round(analysis_confidence - 0.07, 2),
        }
    )

    meta_reasoning = [
        "Report analysis based on medical knowledge layer with clinical reference ranges.",
        "Step-by-step trace included for transparency.",
    ]
    if conf_result.missing_critical_inputs:
        missing = conf_result.missing_critical_inputs
        meta_reasoning.append(
            f"Missing inputs ({', '.join(missing)}) — adding these would improve assessment confidence."
        )
    if conf_result.warnings:
        meta_reasoning.extend(conf_result.warnings[:2])

    meta_reasoning.insert(
        0,
        f"{len(findings)} value(s) outside reference ranges: " + "; ".join(f["flag"] for f in findings[:4])
        if findings else "All extracted values are within reference ranges.",
    )
    # Fresh meta: the keyword pre-scan's own meta ("Normal report.",
    # confidence 1.0) contradicted the evidence-based result shown to users.
    meta = ensure_meta(
        {"command": "analyze_report"},
        round(analysis_confidence, 3),
        meta_reasoning,
        [
            {"title": "Medical Knowledge", "detail": "app/services/medical_knowledge.py"},
            {"title": "Pipeline", "detail": "ml/ai_ml.py::analyze_report"},
        ]
    )
    meta["data_completeness"] = conf_result.data_completeness
    meta["missing_critical_inputs"] = conf_result.missing_critical_inputs

    if metric_warnings:
        existing_warnings = meta.get("warnings", [])
        if isinstance(existing_warnings, list):
            meta["warnings"] = (existing_warnings + metric_warnings[:6])[:10]
            for w in metric_warnings[:3]:
                meta.setdefault("reasoning", []).append(f"Validation: {w}")

    if source_meta:
        meta["source"] = source_meta.get("source")
        if source_meta.get("warnings"):
            existing_warnings = meta.get("warnings", [])
            if isinstance(existing_warnings, list):
                meta["warnings"] = (existing_warnings + source_meta["warnings"][:4])[:10]

    enriched = {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "primary_category": primary_category,
        "detected_conditions": conditions,
        "disease_confidences": build_condition_confidences(conditions, metrics, analysis_confidence, findings),
        "summary": patient_summary,
        "explanation": explanation_lines,
        "next_steps": next_steps,
        "extracted_metrics": metrics,
        "risk_flags": risk_flags,
        "model_insights": ml_result if isinstance(ml_result, dict) else None,
        "analysis_steps": analysis_steps,
        "raw": result,
        "meta": meta,
    }

    if user_id:
        try:
            db = require_db()
            repo = MongoRepository(db, HEALTH_RECORDS)
            await repo.insert_one(
                {
                    "user": as_object_id(user_id),
                    "record_type": "report_analysis",
                    "report_text": report_text,
                    "summary": summary,
                    "risk_level": risk_level,
                    "risk_score": risk_score,
                    "primary_category": primary_category,
                    "conditions": conditions,
                    "extracted_metrics": metrics,
                    "risk_flags": risk_flags,
                    "model_insights": ml_result if isinstance(ml_result, dict) else None,
                    "analysis_source": source_meta.get("source") if source_meta else "text",
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                }
            )
            await MongoRepository(db, ANALYTICS_EVENTS).insert_one(
                {
                    "user": as_object_id(user_id),
                    "module": "ai_records",
                    "action": "analyzed",
                    "metadata": {
                        "risk_level": risk_level,
                        "primary_category": primary_category,
                    },
                    "createdAt": datetime.now(timezone.utc),
                }
            )
        except Exception:
            enriched["storage_warning"] = "Storage unavailable; analysis returned without saving."

    return enriched


# ─── Endpoints ──────────────────────────────────────────────────

@router.post("/analyze_report")
async def analyze_report(
    payload: AnalyzeReportRequest,
    ctx: AuthContext | None = Depends(get_optional_user),
    _: None = Depends(rate_limit_ml_heavy.dependency()),
):
    target_user_id = payload.user_id or (ctx.user_id if ctx else None)
    return await build_report_analysis(payload.report_text, target_user_id, {"source": "text"})


@router.post("/analyze_report_file")
async def analyze_report_file(
    file: UploadFile = File(...),
    user_id: str | None = Form(default=None),
    report_text: str | None = Form(default=None),
    ctx: AuthContext | None = Depends(get_optional_user),
    _: None = Depends(rate_limit_ml_heavy.dependency()),
):
    if not file:
        raise HTTPException(status_code=400, detail="Report file is required")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    if len(data) > MAX_REPORT_BYTES:
        raise HTTPException(status_code=413, detail="Report file too large")

    extracted_text, source_meta = extract_text_from_upload(data, file.filename, file.content_type)
    combined = ""
    if report_text and report_text.strip():
        combined = report_text.strip() + "\n" + extracted_text
    else:
        combined = extracted_text

    combined = clean_report_text(combined)
    if len(combined) < MIN_REPORT_CHARS:
        # Honest failure: text could not be extracted from the document (scanned
        # PDF/image without OCR tooling, or an unsupported binary format).
        # NEVER fabricate a plausible-looking patient report — that surfaced a
        # fake "Age 45, BP 138/88, Glucose 118" assessment for every
        # unreadable upload, which is clinically dangerous misinformation.
        fname = file.filename or "Uploaded Medical Document"
        kind = (source_meta or {}).get("source", infer_upload_kind(file.filename, file.content_type))
        warnings = list((source_meta or {}).get("warnings") or [])
        # source can be pdf_text / pdf_ocr / image_ocr — treat all as "needs OCR"
        if isinstance(kind, str) and (kind.startswith("pdf") or kind.startswith("image")):
            detail = (
                f"No readable text could be extracted from '{fname}' (document type: {kind}). "
                "Scanned documents and photos need OCR support on the server "
                "(tesseract + poppler), or paste the report text manually."
            )
        else:
            detail = (
                f"No readable text could be extracted from '{fname}' "
                f"(detected type: {kind or 'unknown'}). "
                "Upload a text-based PDF, a TXT/CSV/JSON file, or paste the report content."
            )
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Report text extraction failed",
                "detail": detail,
                "filename": fname,
                "source": kind,
                "warnings": warnings,
            },
        )

    target_user_id = user_id or (ctx.user_id if ctx else None)
    return await build_report_analysis(combined, target_user_id, source_meta)
