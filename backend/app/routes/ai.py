import logging
import csv
import io
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.db.mongo import get_db
from app.services.collections import ANALYTICS_EVENTS, HEALTH_RECORDS, USERS
from app.core.celery_app import celery_app
from app.services.medical_knowledge import (
    assess_donor_compatibility,
    assess_vitals,
    compute_risk_score,
    estimate_confidence,
    validate_blood_group,
    validate_health_payload
)
from app.services.prediction_store import get_latest_prediction
from app.services.repository import MongoRepository
from app.services.ml_runner import run_ml_model
from app.core.auth import get_current_user, AuthContext
from app.services.rate_limiter import rate_limit_ml, rate_limit_ml_heavy

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])

MAX_REPORT_BYTES = 12 * 1024 * 1024
MIN_REPORT_CHARS = 40


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _as_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid ID format") from exc


def _load_hotspot_seed_data(limit: int = 200) -> list[dict]:
    csv_path = _repo_root() / "backend" / "ml" / "emergency_hotspot_data.csv"
    if not csv_path.exists():
        return []

    rows: list[dict] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            try:
                rows.append(
                    {
                        "lat": float(row.get("lat", 0) or 0),
                        "lng": float(row.get("lng", 0) or 0),
                        "emergency_type": row.get("emergency_type") or "unknown",
                        "severity": row.get("severity") or "Unknown",
                        "timestamp": row.get("timestamp") or "",
                    }
                )
            except ValueError:
                continue

            if len(rows) >= limit:
                break
    return rows


async def _run_prediction(command: str, payload: dict):
    celery_app.send_task("system.generate_predictions", args=[command, payload])
    cached = await get_latest_prediction(command)
    if cached and isinstance(cached.get("result"), dict):
        result = cached["result"]
        result["meta"] = _ensure_meta(
            result.get("meta"),
            cached.get("confidence", 0.0),
            ["Serving latest cached prediction; fresh run queued in background."],
            [{"title": "Task", "detail": f"system.generate_predictions::{command}"}]
        )
        return result

    try:
        result = await run_ml_model(command, payload, "ai_ml.py")
        if isinstance(result, dict):
            result["meta"] = _ensure_meta(
                result.get("meta"),
                result.get("meta", {}).get("confidence", 0.65) if isinstance(result.get("meta"), dict) else 0.65,
                ["Generated immediately from the ML model as no cached prediction was available."],
                [{"title": "Model", "detail": f"ai_ml.py::{command}"}]
            )
            return result
    except Exception as exc:
        return {
            "status": "queued",
            "error": f"Prediction queued; direct model execution failed: {exc}",
            "meta": _ensure_meta(
                None,
                0.0,
                ["Prediction queued for background processing."],
                [{"title": "Task", "detail": f"system.generate_predictions::{command}"}]
            ),
        }

    return {
        "status": "queued",
        "meta": _ensure_meta(
            None,
            0.0,
            ["Prediction queued for background processing."],
            [{"title": "Task", "detail": f"system.generate_predictions::{command}"}]
        ),
    }


def _ensure_meta(meta: Any, confidence: float, reasoning: list[str], references: list[dict[str, str]] | None = None) -> dict[str, Any]:
    if not isinstance(meta, dict):
        meta = {}
    meta.setdefault("confidence", confidence)
    if reasoning:
        meta.setdefault("reasoning", reasoning)
    if references:
        meta.setdefault("references", references)
    return meta


def _looks_like_binary_text(text: str) -> bool:
    if not text:
        return False
    sample = text[:2000]
    if sample.lstrip().startswith("%PDF-"):
        return True
    non_printable = sum(1 for ch in sample if ord(ch) < 9 or (ord(ch) < 32 and ch not in "\n\t\r"))
    return non_printable / max(1, len(sample)) > 0.12


def _clean_report_text(text: str) -> str:
    cleaned = text.replace("\x00", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _extract_pdf_text(data: bytes) -> tuple[str, list[str]]:
    notes: list[str] = []
    try:
        from pypdf import PdfReader
    except Exception:
        notes.append("pypdf_not_installed")
        return "", notes

    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
        return text, notes
    except Exception as exc:
        notes.append(f"pdf_text_error:{exc}")
        return "", notes


def _ocr_image_bytes(data: bytes) -> tuple[str, list[str]]:
    notes: list[str] = []
    try:
        from PIL import Image
    except Exception:
        notes.append("pillow_not_installed")
        return "", notes
    try:
        import pytesseract
    except Exception:
        notes.append("pytesseract_not_installed")
        return "", notes

    try:
        image = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(image)
        return text.strip(), notes
    except Exception as exc:
        notes.append(f"image_ocr_error:{exc}")
        return "", notes


def _ocr_pdf_bytes(data: bytes) -> tuple[str, list[str]]:
    notes: list[str] = []
    try:
        from pdf2image import convert_from_bytes
    except Exception:
        notes.append("pdf2image_not_installed")
        return "", notes
    try:
        import pytesseract
    except Exception:
        notes.append("pytesseract_not_installed")
        return "", notes

    try:
        images = convert_from_bytes(data)
        texts = [pytesseract.image_to_string(image) for image in images]
        return "\n".join(texts).strip(), notes
    except Exception as exc:
        notes.append(f"pdf_ocr_error:{exc}")
        return "", notes


def _infer_upload_kind(filename: str | None, content_type: str | None) -> str:
    if content_type:
        if content_type == "application/pdf":
            return "pdf"
        if content_type.startswith("image/"):
            return "image"
        if content_type.startswith("text/"):
            return "text"

    if filename:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return "pdf"
        if ext in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}:
            return "image"
        if ext in {".txt", ".md", ".csv", ".json"}:
            return "text"
    return "binary"


def _extract_text_from_upload(data: bytes, filename: str | None, content_type: str | None) -> tuple[str, dict[str, Any]]:
    meta: dict[str, Any] = {"source": "upload", "warnings": []}
    kind = _infer_upload_kind(filename, content_type)
    if kind == "pdf":
        text, notes = _extract_pdf_text(data)
        meta["warnings"].extend(notes)
        if len(text) < MIN_REPORT_CHARS:
            ocr_text, ocr_notes = _ocr_pdf_bytes(data)
            meta["warnings"].extend(ocr_notes)
            if ocr_text:
                meta["source"] = "pdf_ocr"
                return _clean_report_text(ocr_text), meta
        meta["source"] = "pdf_text"
        return _clean_report_text(text), meta

    if kind == "image":
        ocr_text, ocr_notes = _ocr_image_bytes(data)
        meta["warnings"].extend(ocr_notes)
        meta["source"] = "image_ocr"
        return _clean_report_text(ocr_text), meta

    if kind == "text":
        try:
            text = data.decode("utf-8", errors="ignore")
        except Exception:
            text = ""
        meta["source"] = "text"
        return _clean_report_text(text), meta

    meta["source"] = "binary"
    return "", meta


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


def _extract_report_metrics(text: str) -> dict[str, Any]:
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


def _extract_lifestyle(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ["sedentary", "inactive", "no exercise"]):
        return "Sedentary"
    if any(term in lowered for term in ["active", "regular exercise", "athlete"]):
        return "Active"
    if any(term in lowered for term in ["smoker", "smoking", "tobacco"]):
        return "Smoker"
    return "Average"


def _build_risk_flags(metrics: dict[str, Any]) -> list[str]:
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


def _normalize_conditions(conditions: list[str]) -> list[str]:
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


def _build_condition_guidance(conditions: list[str]) -> tuple[list[str], list[str]]:
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


class CompatibilityRequest(BaseModel):
    requester_id: str
    donor_id: str
    organ_type: str | None = "Blood"


class AnalyzeReportRequest(BaseModel):
    report_text: str
    user_id: str | None = None


class ProfileClusterRequest(BaseModel):
    user_id: str


class DonationForecastRequest(BaseModel):
    user_id: str | None = None
    blood_group: str | None = None


def _extract_conditions(report_text: str) -> list[str]:
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



@router.post("/predict_health_risk")
async def predict_health_risk(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    # Validate payload before forwarding to ML model
    validated = validate_health_payload(payload)
    warnings = validated.get("_warnings", [])

    # Reject impossible values before reaching ML
    hard_reject = [
        w for w in warnings
        if any(kw in w for kw in [
            "exceeds maximum", "incompatible with life", "cannot be negative",
            "beyond the measurable range", "below the survivable",
        ])
    ]
    if hard_reject:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Input validation failed: impossible values detected.",
                "warnings": hard_reject,
            }
        )
    # Forward validated/normalized payload (strip _warnings before ML)
    clean_payload = {k: v for k, v in validated.items() if k != "_warnings"}
    # Merge back any fields that validate_health_payload didn't handle
    for k, v in payload.items():
        if k not in clean_payload or clean_payload.get(k) is None:
            if k not in ("_warnings",):
                clean_payload.setdefault(k, v)

    result = await _run_prediction("predict_risk", clean_payload)

    # Attach validation warnings to result meta
    if warnings and isinstance(result, dict):
        meta = result.get("meta", {})
        if not isinstance(meta, dict):
            meta = {}
        meta["validation_warnings"] = warnings
        meta.setdefault("reasoning", [])
        if isinstance(meta["reasoning"], list):
            for w in warnings:
                meta["reasoning"].append(f"Validation: {w}")
        result["meta"] = meta

    return result


@router.post("/predict_user_cluster")
async def predict_user_cluster(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_cluster", payload)


@router.post("/predict_user_forecast")
async def predict_user_forecast(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_forecast", payload)


@router.post("/check_profile_cluster")
async def check_profile_cluster(payload: ProfileClusterRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    db = get_db()
    user_repo = MongoRepository(db, USERS)

    user = await user_repo.find_one({"_id": _as_object_id(payload.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Derive cluster data from actual user profile instead of random
    public_profile = user.get("publicProfile") or {}
    health_records = public_profile.get("healthRecords") or {}

    # Count actual emergency/SOS events from user data
    sos_count = len(user.get("sos_alerts") or []) if isinstance(user.get("sos_alerts"), list) else 0
    if isinstance(user.get("sos_alerts"), dict):
        sos_count = len(user["sos_alerts"])
    donation_count = len(user.get("donation_history") or []) if isinstance(user.get("donation_history"), list) else 0

    # Compute deterministic cluster features from real profile data
    emergency_rate = min(15, sos_count + 1)
    avg_response_time = max(5, 25 - donation_count * 2)
    hospital_bed_occupancy = min(100, max(20, 50 + sos_count * 5))

    cluster_data = {
        "emergency_rate": emergency_rate,
        "avg_response_time": avg_response_time,
        "hospital_bed_occupancy": hospital_bed_occupancy,
        "donations_made": donation_count,
        "sos_usage": sos_count,
        "health_logs": min(10, max(1, len(health_records))),
    }

    # Also try the dedicated predict_user_cluster endpoint with proper user data
    cluster_payload = {
        "sos_usage": sos_count,
        "donations_made": donation_count,
        "health_logs": min(10, max(1, len(health_records))),
    }
    result = await _run_prediction("predict_cluster", cluster_payload)

    cluster_labels = {
        0: "Regular User - Low Activity",
        1: "Active Donor - High Engagement",
        2: "Medical Professional - Specialized",
    }

    # If ML model returned a valid cluster, use it; otherwise infer from actual data
    if isinstance(result, dict):
        cluster = result.get("cluster_id")
    if cluster is None:
        # Derive from actual engagement metrics
        total_engagement = donation_count + sos_count
        if total_engagement >= 5:
            cluster = 1  # Active Donor
        elif total_engagement >= 2:
            cluster = 2  # Medical Professional
        else:
            cluster = 0  # Regular User

    engagement_level = (
        "High" if cluster == 1 else
        "Professional" if cluster == 2 else
        "Standard"
    )

    confidence = 0.55 + min(0.30, (donation_count + sos_count) * 0.05)
    reasoning = [
        f"Cluster derived from {donation_count} donations, {sos_count} SOS events, and profile engagement patterns.",
    ]

    meta = _ensure_meta(
        result.get("meta") if isinstance(result, dict) else None,
        min(0.85, confidence),
        reasoning,
        [
            {"title": "Data Source", "detail": f"User profile with {donation_count + sos_count} engagement events"},
            {"title": "Model", "detail": "ml/activity_cluster_model.joblib"},
        ]
    )
    return {
        "cluster_id": cluster,
        "cluster_label": cluster_labels.get(cluster, "User Profile"),
        "engagement_level": engagement_level,
        "meta": meta,
    }


@router.post("/predict_donation_forecast")
async def predict_donation_forecast(payload: DonationForecastRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    # Derive donation frequency from real user data when possible
    donation_frequency = 1
    hospital_stock_level = 50

    db = get_db()
    if payload.user_id:
        try:
            user_repo = MongoRepository(db, USERS)
            user = await user_repo.find_one({"_id": _as_object_id(payload.user_id)})
            if user:
                donation_history = user.get("donation_history") or []
                if isinstance(donation_history, list):
                    donation_frequency = min(12, max(1, len(donation_history)))
                    # Estimate hospital stock level from donation frequency
                    hospital_stock_level = min(95, max(10, donation_frequency * 15 + 20))
        except Exception:
            logger.debug("Suppressed Exception in %s", __name__)

    blood_group = payload.blood_group or "O+"
    try:
        normalized_bg = validate_blood_group(blood_group)
        blood_group = normalized_bg or "O+"
    except Exception:
        logger.debug("Suppressed Exception in %s", __name__)

    forecast_data = {
        "month": datetime.utcnow().month,
        "donation_frequency": donation_frequency,
        "hospital_stock_level": hospital_stock_level,
        "region": "General",
        "resource_type": blood_group,
    }

    result = await _run_prediction("predict_availability", forecast_data)
    score = result.get("predicted_availability_score") if isinstance(result, dict) else None

    if score is None:
        # Deterministic fallback based on real donation frequency
        score = min(95, max(30, donation_frequency * 12 + 20))
    elif isinstance(score, (int, float)) and (score <= 0 or score > 100):
        score = min(95, max(30, donation_frequency * 12 + 20))

    status = "High Availability" if score > 70 else "Moderate" if score > 40 else "Low Availability"

    reasoning = [
        f"Forecast based on donation frequency ({donation_frequency}), blood group ({blood_group}), and current month ({datetime.utcnow().strftime('%B')}).",
    ]
    if score > 70:
        reasoning.append("Current availability is sufficient for most requests.")
    elif score > 40:
        reasoning.append("Supply may need attention; consider scheduling donations.")
    else:
        reasoning.append("Availability is limited; urgent donations recommended.")

    meta = _ensure_meta(
        result.get("meta") if isinstance(result, dict) else None,
        max(0.50, min(0.80, 0.50 + donation_frequency * 0.03)),
        reasoning,
        [
            {"title": "Dataset", "detail": "ml/donor_availability_data.csv"},
            {"title": "Model", "detail": "ml/donor_availability_model.joblib"},
        ]
    )
    return {
        "forecast_days": max(1, int(score // 10) + 1),
        "availability_score": round(score, 1),
        "status": status,
        "meta": meta,
    }


_SEVERITY_TRIAGE_MAP = {
    "critical": {
        "severity_score": 95, "ai_confidence": 0.92,
        "ambulance_type": "ICU Ambulance",
        "hospital_type": "Trauma & Critical Care Center",
        "response_time": "Immediate",
    },
    "high": {
        "severity_score": 82, "ai_confidence": 0.86,
        "ambulance_type": "Advanced Life Support",
        "hospital_type": "Emergency Department - Central",
        "response_time": "Fast",
    },
    "moderate": {
        "severity_score": 64, "ai_confidence": 0.8,
        "ambulance_type": "Standard Ambulance",
        "hospital_type": "Urgent Care Center",
        "response_time": "Normal",
    },
    "medium": {
        "severity_score": 64, "ai_confidence": 0.8,
        "ambulance_type": "Standard Ambulance",
        "hospital_type": "Urgent Care Center",
        "response_time": "Normal",
    },
    "low": {
        "severity_score": 45, "ai_confidence": 0.74,
        "ambulance_type": "Standard Ambulance",
        "hospital_type": "Walk-in Clinic",
        "response_time": "Standard",
    },
}


@router.post("/hosp/predict_severity")
async def hosp_predict_severity(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    result = await _run_prediction("predict_hosp_severity", payload)
    # Enrich the raw model output into a full triage response so callers always
    # receive severity_level, severity_score, ambulance/hospital type and response time.
    if isinstance(result, dict) and not result.get("error"):
        predicted = str(result.get("predicted_severity") or "").lower()
        triage = _SEVERITY_TRIAGE_MAP.get(predicted, _SEVERITY_TRIAGE_MAP["moderate"])
        result["severity_level"] = str(result.get("predicted_severity") or "Moderate").title()
        for key, value in triage.items():
            result.setdefault(key, value)
    return result


@router.post("/hosp/predict_policy")
async def hosp_predict_policy(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_policy_seg", payload)


@router.post("/hosp/predict_outbreak")
async def hosp_predict_outbreak(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_forecast_outbreak", payload)


@router.post("/hosp/optimize_ambulance")
async def hosp_optimize_ambulance(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_allocation", payload)


@router.post("/hosp/detect_anomaly")
async def hosp_detect_anomaly(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_anomaly", payload)


@router.post("/gov/predict_outbreak")
async def gov_predict_outbreak(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_forecast_outbreak", payload)


@router.post("/gov/predict_severity")
async def gov_predict_severity(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_severity", payload)


@router.post("/gov/predict_availability")
async def gov_predict_availability(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_availability", payload)


@router.post("/gov/predict_allocation")
async def gov_predict_allocation(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_allocation", payload)


@router.post("/gov/predict_policy_segment")
async def gov_predict_policy_segment(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_policy_seg", payload)


@router.post("/gov/predict_performance_score")
async def gov_predict_performance_score(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_perf_score", payload)


@router.post("/gov/predict_anomaly")
async def gov_predict_anomaly(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_anomaly", payload)


@router.post("/hospital/patient/recovery")
async def hospital_patient_recovery(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_recovery", payload)


@router.post("/hospital/patient/stay")
async def hospital_patient_stay(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_stay", payload)


@router.post("/hospital/inventory/predict")
async def hospital_inventory_predict(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_inventory", payload)


@router.post("/ml/predict-eta")
async def ml_predict_eta(payload: dict = Body(default_factory=dict), ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    return await _run_prediction("predict_eta", payload)


@router.post("/check_compatibility")
async def check_compatibility(payload: CompatibilityRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    if not payload.requester_id or not payload.donor_id:
        raise HTTPException(status_code=400, detail="requester_id and donor_id are required")

    db = get_db()
    user_repo = MongoRepository(db, USERS)

    requester = await user_repo.find_one({"_id": _as_object_id(payload.requester_id)})
    donor = await user_repo.find_one({"_id": _as_object_id(payload.donor_id)})

    profile_warnings = []
    if not requester:
        profile_warnings.append(f"requester profile {payload.requester_id} not found; using default profile")
    if not donor:
        profile_warnings.append(f"donor profile {payload.donor_id} not found; using default profile")

    requester_hr = ((requester or {}).get("publicProfile") or {}).get("healthRecords") or {}
    donor_profile = ((donor or {}).get("publicProfile") or {}).get("donorProfile") or {}
    donor_hr = ((donor or {}).get("publicProfile") or {}).get("healthRecords") or {}

    recipient_blood = requester_hr.get("bloodGroup") or None
    donor_blood = donor_hr.get("bloodGroup") or None

    compatibility_payload = {
        "receiver_blood_type": recipient_blood or "O+",
        "receiver_age": requester_hr.get("age") or 30,
        "receiver_gender": requester_hr.get("gender") or "Male",
        "donor_blood_type": donor_blood or "O+",
        "donor_age": donor_hr.get("age") or 30,
        "donor_gender": donor_hr.get("gender") or "Male",
        "organ_type": payload.organ_type or "Blood",
        "location_distance": 5,
    }

    availability = donor_profile.get("availability") or "Available"
    donor_available = availability != "Unavailable"

    # Primary: try ML prediction model
    ml_score = None
    ml_result = None
    try:
        result = await _run_prediction("predict_compat", compatibility_payload)
        if isinstance(result, dict) and not result.get("error"):
            ml_result = result
            raw_score = result.get("probability") or result.get("compatibility_score") or 0
            if 0 < raw_score <= 1:
                raw_score = raw_score * 100
            if not (raw_score == 0 or (45 <= raw_score <= 55)):
                ml_score = raw_score
    except HTTPException:
        logger.debug("Suppressed HTTPException in %s", __name__)

    # Secondary: use evidence-based medical_knowledge assessment
    knowledge_assessment = assess_donor_compatibility(
        recipient_blood=recipient_blood,
        donor_blood=donor_blood,
        recipient_age=requester_hr.get("age"),
        donor_age=donor_hr.get("age"),
        distance_km=5.0,
        donor_available=donor_available
    )
    # Blend: prefer ML score when reasonable, otherwise use knowledge layer
    if ml_score is not None and 10 <= ml_score <= 100:
        score = ml_score
        # Blend with knowledge score for robustness
        k_score = float(knowledge_assessment["compatibility_score"])
        score = round(0.6 * score + 0.4 * k_score, 2)
        reasoning = [
            "ML model prediction combined with medical knowledge layer assessment.",
        ]
    else:
        score = float(knowledge_assessment["compatibility_score"])
        reasoning = [
            "Evidence-based assessment from medical knowledge layer (ML model unavailable or inconclusive).",
        ]

    # Adjust for availability
    if availability == "Unavailable":
        score = max(30, score - 20)
    if availability == "On Call":
        score = max(40, score - 10)
    score = max(10, min(100, score))

    # Build factors summary from knowledge assessment
    factor_summaries = [
        f["factor"] for f in knowledge_assessment.get("factors", [])
    ] + [
        f"Availability: {availability}",
    ]
    reasoning.append(
        f"Factors: {'; '.join(factor_summaries[:5])}."
    )

    priority = "High" if score >= 80 else "Medium" if score >= 60 else "Low"
    estimated_wait_minutes = 15 if availability == "Available" else 35 if availability == "On Call" else 60

    meta = _ensure_meta(
        ml_result.get("meta") if isinstance(ml_result, dict) else None,
        knowledge_assessment["confidence"].get("overall", 0.70),
        reasoning + profile_warnings,
        [
            {"title": "Medical Knowledge", "detail": "app/services/medical_knowledge.py::assess_donor_compatibility"},
            {"title": "Model", "detail": "ml/compatibility_model.joblib"},
        ]
    )
    if profile_warnings:
        meta["warnings"] = profile_warnings

    return {
        "compatibility_score": round(score),
        "probability": round(score / 100, 4),
        "recommendation": "Good Match" if score > 70 else "Check Further",
        "compatible": knowledge_assessment.get("compatible"),
        "availability": availability,
        "priority": priority,
        "estimated_wait_minutes": estimated_wait_minutes,
        "factors": knowledge_assessment.get("factors", []),
        "meta": meta,
    }


async def _build_report_analysis(report_text: str, user_id: str | None, source_meta: dict[str, Any] | None = None):
    if not report_text or not report_text.strip():
        raise HTTPException(status_code=400, detail="Report text is required")
    if _looks_like_binary_text(report_text):
        raise HTTPException(status_code=400, detail="Report text looks like raw PDF bytes. Upload the file for OCR.")

    try:
        result = await _run_prediction("analyze_report", {"report_text": report_text})
    except HTTPException:
        result = {}

    if isinstance(result, dict) and result.get("error"):
        result = {}

    conditions = result.get("detected_conditions") or _extract_conditions(report_text)
    conditions = _normalize_conditions(conditions)
    metrics = _extract_report_metrics(report_text)

    # Validate extracted metrics through medical knowledge layer
    validated_metrics = validate_health_payload(metrics)
    metric_warnings = validated_metrics.get("_warnings", [])
    # Overwrite extracted metrics with validated/normalized values
    for key in ["age", "bmi", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "lifestyle"]:
        if key in validated_metrics and validated_metrics[key] is not None:
            metrics[key] = validated_metrics[key]

    risk_flags = _build_risk_flags(metrics)
    lifestyle = _extract_lifestyle(report_text)
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
            ml_result = await _run_prediction("predict_risk", ml_payload)
        except HTTPException:
            ml_result = None

    risk_level = result.get("risk_level") or "Moderate"
    risk_score = result.get("risk_score") or (82 if risk_level == "Critical" else 65 if risk_level == "High" else 42)
    primary_category = result.get("primary_category") or (conditions[0] if conditions else "General")
    summary = result.get("summary") or "Automated summary generated from the submitted report."

    # ── Use medical_knowledge for evidence-based vital assessment and risk computation ──
    vital_assessment = assess_vitals(
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

    # Compute clinical risk score from medical knowledge layer
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
        # Blend clinical risk with existing risk score
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

    # Confidence estimation from medical knowledge layer
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

    explanation_lines, next_steps = _build_condition_guidance(conditions)
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

    # Evidence-based confidence from medical_knowledge
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

    # Add clinical risk drivers from medical knowledge layer
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

    # Build evidence-based meta with confidence from medical knowledge layer
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

    meta = _ensure_meta(
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

    # Attach metric warnings from medical knowledge validation
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
            db = get_db()
            repo = MongoRepository(db, HEALTH_RECORDS)
            await repo.insert_one(
                {
                    "user": _as_object_id(user_id),
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
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }
            )
            await MongoRepository(db, ANALYTICS_EVENTS).insert_one(
                {
                    "user": _as_object_id(user_id),
                    "module": "ai_records",
                    "action": "analyzed",
                    "metadata": {
                        "risk_level": risk_level,
                        "primary_category": primary_category,
                    },
                    "createdAt": datetime.utcnow(),
                }
            )
        except Exception:
            enriched["storage_warning"] = "Storage unavailable; analysis returned without saving."

    return enriched


@router.post("/analyze_report")
async def analyze_report(payload: AnalyzeReportRequest, ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml_heavy.dependency())):
    return await _build_report_analysis(payload.report_text, payload.user_id, {"source": "text"})


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

    extracted_text, source_meta = _extract_text_from_upload(data, file.filename, file.content_type)
    combined = ""
    if report_text and report_text.strip():
        combined = report_text.strip() + "\n" + extracted_text
    else:
        combined = extracted_text

    combined = _clean_report_text(combined)
    if len(combined) < MIN_REPORT_CHARS:
        raise HTTPException(
            status_code=422,
            detail="Unable to extract readable text. Try a clearer scan or a text-based PDF."
        )
    return await _build_report_analysis(combined, user_id, source_meta)


@router.get("/gov/emergency_hotspots")
async def gov_emergency_hotspots(ctx: AuthContext = Depends(get_current_user), _: None = Depends(rate_limit_ml.dependency())):
    seed_data = _load_hotspot_seed_data()
    if not seed_data:
        return []

    try:
        result = await _run_prediction("predict_hotspot", seed_data)
        if isinstance(result, dict) and result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException:
        for item in seed_data:
            item["cluster_label"] = "Unknown"
            item["cluster_id"] = -1
        return seed_data
