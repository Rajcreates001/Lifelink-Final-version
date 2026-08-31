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
from app.core.auth import get_current_user, AuthContext
from app.services.rate_limiter import rate_limit_ml_heavy

from app.routes.ai_shared import (
    MAX_REPORT_BYTES,
    MIN_REPORT_CHARS,
    as_object_id,
    clean_report_text,
    ensure_meta,
    extract_text_from_upload,
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
    age = _first_number([r"\bage\s*[:\-]?\s*(\d{1,3})\b"], text)
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

    risk_flags = build_risk_flags(metrics)
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

    risk_level = result.get("risk_level") or "Moderate"
    risk_score = result.get("risk_score") or (82 if risk_level == "Critical" else 65 if risk_level == "High" else 42)
    primary_category = result.get("primary_category") or (conditions[0] if conditions else "General")
    summary = result.get("summary") or "Automated summary generated from the submitted report."

    # Evidence-based vital assessment
    _vital_assessment = assess_vitals(
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

    if risk_flags:
        if risk_level == "Low" and len(risk_flags) >= 2:
            risk_level = "Moderate"
        if risk_level == "Moderate" and len(risk_flags) >= 3:
            risk_level = "High"
        if risk_level == "High" and len(risk_flags) >= 4:
            risk_level = "Critical"

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

    if summary == "Automated summary generated from the submitted report." and (conditions or metric_notes):
        summary_parts = []
        if conditions:
            summary_parts.append(f"Detected terms suggest: {', '.join(conditions)}")
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

    meta = ensure_meta(
        result.get("meta") if isinstance(result, dict) else None,
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
async def analyze_report(payload: AnalyzeReportRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml_heavy.dependency())):
    return await build_report_analysis(payload.report_text, payload.user_id, {"source": "text"})


@router.post("/analyze_report_file")
async def analyze_report_file(
    file: UploadFile = File(...),
    user_id: str | None = Form(default=None),
    report_text: str | None = Form(default=None),
    ctx: AuthContext = Depends(get_current_user),
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
        raise HTTPException(
            status_code=422,
            detail="Unable to extract readable text. Try a clearer scan or a text-based PDF."
        )
    return await build_report_analysis(combined, user_id, source_meta)
