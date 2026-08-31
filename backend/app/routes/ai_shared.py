"""
AI Routes — Shared Utilities
==============================
Common constants, helper functions, and ML prediction runner
used across ai_reports, ai_predictions, ai_donors modules.
"""
from __future__ import annotations

import csv
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from app.core.celery_app import celery_app
from app.services.prediction_store import get_latest_prediction
from app.services.ml_runner import run_ml_model

logger = logging.getLogger(__name__)

MAX_REPORT_BYTES = 12 * 1024 * 1024
MIN_REPORT_CHARS = 40


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def as_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid ID format") from exc


def ensure_meta(meta: Any, confidence: float, reasoning: list[str], references: list[dict[str, str]] | None = None) -> dict[str, Any]:
    if not isinstance(meta, dict):
        meta = {}
    meta.setdefault("confidence", confidence)
    if reasoning:
        meta.setdefault("reasoning", reasoning)
    if references:
        meta.setdefault("references", references)
    return meta


async def run_prediction(command: str, payload: dict):
    """Run an ML prediction via Celery background task with fallback to direct model execution."""
    celery_app.send_task("system.generate_predictions", args=[command, payload])
    cached = await get_latest_prediction(command)
    if cached and isinstance(cached.get("result"), dict):
        result = cached["result"]
        result["meta"] = ensure_meta(
            result.get("meta"),
            cached.get("confidence", 0.0),
            ["Serving latest cached prediction; fresh run queued in background."],
            [{"title": "Task", "detail": f"system.generate_predictions::{command}"}]
        )
        return result

    try:
        result = await run_ml_model(command, payload, "ai_ml.py")
        if isinstance(result, dict):
            result["meta"] = ensure_meta(
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
            "meta": ensure_meta(
                None,
                0.0,
                ["Prediction queued for background processing."],
                [{"title": "Task", "detail": f"system.generate_predictions::{command}"}]
            ),
        }

    return {
        "status": "queued",
        "meta": ensure_meta(
            None,
            0.0,
            ["Prediction queued for background processing."],
            [{"title": "Task", "detail": f"system.generate_predictions::{command}"}]
        ),
    }


def load_hotspot_seed_data(limit: int = 200) -> list[dict]:
    csv_path = repo_root() / "backend" / "ml" / "emergency_hotspot_data.csv"
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


# ─── Text Processing Helpers ────────────────────────────────────

def looks_like_binary_text(text: str) -> bool:
    if not text:
        return False
    sample = text[:2000]
    if sample.lstrip().startswith("%PDF-"):
        return True
    non_printable = sum(1 for ch in sample if ord(ch) < 9 or (ord(ch) < 32 and ch not in "\n\t\r"))
    return non_printable / max(1, len(sample)) > 0.12


def clean_report_text(text: str) -> str:
    cleaned = text.replace("\x00", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def extract_pdf_text(data: bytes) -> tuple[str, list[str]]:
    notes: list[str] = []
    try:
        from pypdf import PdfReader
    except Exception:
        notes.append("pypdf_not_installed")
        return "", notes

    try:
        import io
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
        return text, notes
    except Exception as exc:
        notes.append(f"pdf_text_error:{exc}")
        return "", notes


def ocr_image_bytes(data: bytes) -> tuple[str, list[str]]:
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
        import io
        image = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(image)
        return text.strip(), notes
    except Exception as exc:
        notes.append(f"image_ocr_error:{exc}")
        return "", notes


def ocr_pdf_bytes(data: bytes) -> tuple[str, list[str]]:
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


def infer_upload_kind(filename: str | None, content_type: str | None) -> str:
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


def extract_text_from_upload(data: bytes, filename: str | None, content_type: str | None) -> tuple[str, dict[str, Any]]:
    meta: dict[str, Any] = {"source": "upload", "warnings": []}
    kind = infer_upload_kind(filename, content_type)
    if kind == "pdf":
        text, notes = extract_pdf_text(data)
        meta["warnings"].extend(notes)
        if len(text) < MIN_REPORT_CHARS:
            ocr_text, ocr_notes = ocr_pdf_bytes(data)
            meta["warnings"].extend(ocr_notes)
            if ocr_text:
                meta["source"] = "pdf_ocr"
                return clean_report_text(ocr_text), meta
        meta["source"] = "pdf_text"
        return clean_report_text(text), meta

    if kind == "image":
        ocr_text, ocr_notes = ocr_image_bytes(data)
        meta["warnings"].extend(ocr_notes)
        meta["source"] = "image_ocr"
        return clean_report_text(ocr_text), meta

    if kind == "text":
        try:
            text = data.decode("utf-8", errors="ignore")
        except Exception:
            text = ""
        meta["source"] = "text"
        return clean_report_text(text), meta

    meta["source"] = "binary"
    return "", meta
