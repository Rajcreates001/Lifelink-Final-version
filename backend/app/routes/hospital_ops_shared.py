import logging
"""LifeLink — Shared models, helpers, and seed logic
Automatically extracted from hospital_ops.py.
"""

import re
from datetime import datetime, timedelta
from typing import Any

from bson import ObjectId
from fastapi import Body, HTTPException
from pydantic import BaseModel

from app.services.collections import (
    ALERTS,
    AMBULANCE_ASSIGNMENTS,
    AMBULANCES,
    ANALYTICS_EVENTS,
    BED_ALLOCATIONS,
    BILLING_INVOICES,
    DEPARTMENT_LOGS,
    EMERGENCY_EVENTS,
    EQUIPMENT_INVENTORY,
    FINANCE_EXPENSES,
    HOSPITAL_BENCHMARKS,
    HOSPITAL_DEPARTMENTS,
    HOSPITAL_MESSAGES,
    HOSPITAL_NETWORK_AGREEMENTS,
    HOSPITALS,
    HOSPITAL_REPORTS,
    HOSPITAL_STAFF,
    ICU_ALERTS,
    ICU_PATIENTS,
    INSURANCE_CLAIMS,
    OPD_QUEUE,
    OPD_APPOINTMENTS,
    OPD_CONSULTATIONS,
    OPD_DOCTORS,
    OT_ALLOCATIONS,
    OT_SURGERIES,
    PATIENTS,
    PREDICTIONS,
    RADIOLOGY_REPORTS,
    RADIOLOGY_REQUESTS,
    RESOURCES,
    VENDOR_LEAD_TIMES
)
from app.core.celery_app import celery_app
from app.services.prediction_store import get_latest_prediction
from app.services.repository import MongoRepository

logger = logging.getLogger(__name__)

SEED_VERSION = 3

__all__ = [
    # Model classes
    "OpdAppointmentCreate",
    "OpdAppointmentUpdate",
    "OpdDoctorCreate",
    "OpdDoctorUpdate",
    "OpdConsultationCreate",
    "OpdConsultationUpdate",
    "IcuPatientCreate",
    "IcuPatientUpdate",
    "IcuAlertCreate",
    "IcuAlertUpdate",
    "RadiologyRequestCreate",
    "RadiologyRequestUpdate",
    "RadiologyReportCreate",
    "OTSurgeryCreate",
    "OTSurgeryUpdate",
    "OTAllocationCreate",
    "StaffMemberCreate",
    "StaffMemberUpdate",
    "EmergencyEventCreate",
    "EmergencyEventUpdate",
    "EmergencyIntakeCreate",
    "EmergencyIntakeUpdate",
    "BedAllocationCreate",
    "BedAllocationUpdate",
    "BillingInvoiceCreate",
    "BillingInvoiceUpdate",
    "InsuranceClaimCreate",
    "InsuranceClaimUpdate",
    "FinanceExpenseCreate",
    "HospitalReportGenerate",
    "ReportIngestCreate",
    "DepartmentLogCreate",
    "BenchmarkCreate",
    "VendorLeadTimeCreate",
    "EquipmentCreate",
    "EquipmentUpdate",
    "OpdQueueCreate",
    "OpdQueueUpdate",
    # Constants
    "SEED_VERSION",
    "UUID_HEX_RE",
    "UUID_CANON_RE",
    # Re-exported from stdlib so sub-modules get them via `import *`
    "datetime",
    "timedelta",
    # Private helpers (included explicitly so sub-module `import *` works)
    "_as_object_id",
    "_normalize_hospital_id",
    "_require_hospital_id",
    "_build_update",
    "_build_search",
    "_build_sort",
    "_parse_datetime",
    "_season_tag",
    "_normalize_shift",
    "_summarize_note",
    "_extract_keywords",
    "_follow_up_plan",
    "_predict_wait_minutes",
    "_resolve_hospital_doc",
    "_bed_breakdown",
    "_severity_from_text",
    "_department_from_symptoms",
    "_estimate_discharge_hours",
    "_score_department",
    "_simple_meta",
    "_safe_run_model",
    "_seed_collection",
    "_ensure_hospital_ops_seed",
    "_ensure_seeded",
    "_report_templates",
    "_summarize_report_text",
    "_month_key",
    # Route handler
    "preload_hospital_ops",
]


class OpdAppointmentCreate(BaseModel):
    hospitalId: str
    patient: str
    doctor: str
    time: str
    status: str | None = "Scheduled"
    appointmentType: str | None = None
    channel: str | None = None
    expectedDurationMinutes: int | None = None
    reason: str | None = None
    notes: str | None = None


class OpdAppointmentUpdate(BaseModel):
    patient: str | None = None
    doctor: str | None = None
    time: str | None = None
    status: str | None = None
    appointmentType: str | None = None
    channel: str | None = None
    expectedDurationMinutes: int | None = None
    reason: str | None = None
    notes: str | None = None


class OpdDoctorCreate(BaseModel):
    hospitalId: str
    name: str
    specialty: str
    availability: bool | None = True
    shift: str | None = None
    schedule: str | None = None


class OpdDoctorUpdate(BaseModel):
    name: str | None = None
    specialty: str | None = None
    availability: bool | None = None
    shift: str | None = None
    schedule: str | None = None


class OpdConsultationCreate(BaseModel):
    hospitalId: str
    patient: str
    doctor: str
    notes: str
    date: str | None = None
    status: str | None = "Open"
    followUpDate: str | None = None
    summary: str | None = None
    aiSummary: str | None = None
    keywords: list[str] | None = None
    followUpPlan: str | None = None


class OpdConsultationUpdate(BaseModel):
    patient: str | None = None
    doctor: str | None = None
    notes: str | None = None
    date: str | None = None
    status: str | None = None
    followUpDate: str | None = None
    summary: str | None = None
    aiSummary: str | None = None
    keywords: list[str] | None = None
    followUpPlan: str | None = None


class IcuPatientCreate(BaseModel):
    hospitalId: str
    name: str
    oxygen: int
    heartRate: int
    bp: str
    status: str | None = "Stable"


class IcuPatientUpdate(BaseModel):
    name: str | None = None
    oxygen: int | None = None
    heartRate: int | None = None
    bp: str | None = None
    status: str | None = None


class IcuAlertCreate(BaseModel):
    hospitalId: str
    message: str
    severity: str
    status: str | None = "Active"


class IcuAlertUpdate(BaseModel):
    message: str | None = None
    severity: str | None = None
    status: str | None = None


class RadiologyRequestCreate(BaseModel):
    hospitalId: str
    patient: str
    scan: str
    status: str | None = "Queued"


class RadiologyRequestUpdate(BaseModel):
    status: str | None = None


class RadiologyReportCreate(BaseModel):
    hospitalId: str
    patient: str
    scan: str
    fileName: str | None = None
    notes: str | None = None
    status: str | None = "Uploaded"


class OTSurgeryCreate(BaseModel):
    hospitalId: str
    patient: str
    procedure: str
    time: str
    status: str | None = "Scheduled"


class OTSurgeryUpdate(BaseModel):
    patient: str | None = None
    procedure: str | None = None
    time: str | None = None
    status: str | None = None


class OTAllocationCreate(BaseModel):
    hospitalId: str
    department: str
    patient_load: str
    shift: str


class StaffMemberCreate(BaseModel):
    hospitalId: str
    name: str
    role: str
    department: str
    shift: str | None = None
    availability: bool | None = True
    skillTags: list[str] | None = None
    certifications: list[str] | None = None
    maxPatients: int | None = None


class StaffMemberUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    department: str | None = None
    shift: str | None = None
    availability: bool | None = None
    skillTags: list[str] | None = None
    certifications: list[str] | None = None
    maxPatients: int | None = None


class EmergencyEventCreate(BaseModel):
    hospitalId: str
    patientName: str
    symptoms: str
    location: str | None = None
    source: str | None = "public"
    imagingMeta: dict | None = None


class EmergencyEventUpdate(BaseModel):
    status: str | None = None
    assignedDepartment: str | None = None
    assignedUnit: str | None = None
    notes: str | None = None
    imagingMeta: dict | None = None


class EmergencyIntakeCreate(BaseModel):
    hospitalId: str
    name: str
    age: int
    gender: str
    symptoms: str
    contact: str | None = None
    severity: str | None = None
    department: str | None = None


class EmergencyIntakeUpdate(BaseModel):
    status: str | None = None
    severity: str | None = None
    department: str | None = None
    notes: str | None = None


class BedAllocationCreate(BaseModel):
    hospitalId: str
    patientName: str
    bedType: str
    override: bool | None = False
    notes: str | None = None


class BedAllocationUpdate(BaseModel):
    bedType: str | None = None
    status: str | None = None
    notes: str | None = None


class BillingInvoiceCreate(BaseModel):
    hospitalId: str
    patientName: str
    department: str
    amount: float
    status: str | None = "Unpaid"
    insuranceProvider: str | None = None
    dueDate: str | None = None
    payer: str | None = None
    paidAt: str | None = None


class BillingInvoiceUpdate(BaseModel):
    status: str | None = None
    paidAmount: float | None = None
    refundAmount: float | None = None
    paidAt: str | None = None


class InsuranceClaimCreate(BaseModel):
    hospitalId: str
    invoiceId: str
    insurer: str
    amount: float
    status: str | None = "Submitted"
    submittedAt: str | None = None
    paidAt: str | None = None


class InsuranceClaimUpdate(BaseModel):
    status: str | None = None
    approvedAmount: float | None = None
    notes: str | None = None
    paidAt: str | None = None


class FinanceExpenseCreate(BaseModel):
    hospitalId: str
    category: str
    amount: float
    notes: str | None = None
    vendor: str | None = None
    contractRef: str | None = None


class HospitalReportGenerate(BaseModel):
    hospitalId: str
    reportKey: str


class ReportIngestCreate(BaseModel):
    hospitalId: str
    name: str
    content: str
    category: str | None = None


class DepartmentLogCreate(BaseModel):
    hospitalId: str
    department: str
    avgTreatmentMinutes: float
    dischargeRate: float
    delayRate: float
    throughputPerHour: float | None = None
    queueLength: int | None = None
    notes: str | None = None


class BenchmarkCreate(BaseModel):
    region: str
    metric: str
    value: float
    source: str | None = "external_feed"


class VendorLeadTimeCreate(BaseModel):
    hospitalId: str
    resourceName: str
    category: str
    vendorName: str | None = None
    leadTimeDays: int


class EquipmentCreate(BaseModel):
    hospitalId: str
    name: str
    category: str
    quantity: int
    status: str | None = "Available"
    minThreshold: int | None = 1


class EquipmentUpdate(BaseModel):
    quantity: int | None = None
    status: str | None = None
    minThreshold: int | None = None


class OpdQueueCreate(BaseModel):
    hospitalId: str
    patientName: str
    reason: str
    priority: str | None = "Normal"
    assignedDoctor: str | None = None
    notes: str | None = None


class OpdQueueUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    assignedDoctor: str | None = None
    notes: str | None = None


UUID_HEX_RE = re.compile(r"^[0-9a-fA-F]{32}$")
UUID_CANON_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def _as_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid ID format") from exc


def _normalize_hospital_id(hospital_id: str) -> ObjectId | str:
    text = (hospital_id or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="hospitalId is required")
    if re.fullmatch(r"[0-9a-fA-F]{24}", text):
        return ObjectId(text)
    if UUID_HEX_RE.fullmatch(text) or UUID_CANON_RE.fullmatch(text):
        return text
    # Demo/legacy identifiers such as "KMC001" are valid hospital keys — the
    # ops seed creates a hospital document with this exact id on demand.
    if re.fullmatch(r"[A-Za-z0-9_-]{2,64}", text):
        return text
    raise HTTPException(status_code=400, detail="Invalid hospitalId format")


def _require_hospital_id(hospital_id: str | None) -> ObjectId | str:
    if not hospital_id:
        raise HTTPException(status_code=400, detail="hospitalId is required")
    return _normalize_hospital_id(hospital_id)


def _build_update(payload: BaseModel, fields: list[str]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for field in fields:
        value = getattr(payload, field)
        if value is not None:
            data[field] = value
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    data["updatedAt"] = datetime.now(timezone.utc)
    return data


def _build_search(search: str | None, fields: list[str]) -> dict[str, Any] | None:
    if not search:
        return None
    text = search.strip()
    if not text:
        return None
    escaped = re.escape(text)
    return {"$or": [{field: {"$regex": escaped, "$options": "i"}} for field in fields]}


def _build_sort(sort_by: str | None, sort_dir: str | None, allowed: set[str], fallback: str) -> list[tuple[str, int]]:
    field = sort_by if sort_by in allowed else fallback
    direction = 1 if (sort_dir or "").lower() == "asc" else -1
    return [(field, direction)]


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            logger.debug("Suppressed ValueError in %s", __name__)
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue
    return None


def _season_tag(target: datetime | None) -> str | None:
    if not target:
        return None
    month = target.month
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Summer"
    if month in (6, 7, 8):
        return "Monsoon"
    return "Autumn"


def _normalize_shift(shift: str | None, schedule: str | None) -> str | None:
    if shift:
        return shift.strip().title()
    if not schedule:
        return None
    lower = schedule.lower()
    if any(token in lower for token in ["night", "evening", "eve"]):
        return "Night"
    if any(token in lower for token in ["afternoon", "pm"]):
        return "Afternoon"
    if any(token in lower for token in ["morning", "am"]):
        return "Morning"
    return None


def _summarize_note(text: str | None) -> str:
    content = (text or "").strip()
    if not content:
        return ""
    sentences = [segment.strip() for segment in content.split(".") if segment.strip()]
    if sentences:
        return f"{sentences[0]}."
    return content[:120]


def _extract_keywords(text: str | None, limit: int = 5) -> list[str]:
    content = (text or "").strip().lower()
    if not content:
        return []
    cleaned = re.sub(r"[^a-z0-9\s]", " ", content)
    tokens = [token for token in cleaned.split() if len(token) >= 4]
    stopwords = {
        "with",
        "from",
        "this",
        "that",
        "patient",
        "follow",
        "review",
        "check",
        "notes",
    }
    counts: dict[str, int] = {}
    for token in tokens:
        if token in stopwords:
            continue
        counts[token] = counts.get(token, 0) + 1
    ranked = sorted(counts.items(), key=lambda item: item[1], reverse=True)
    return [item[0] for item in ranked[:limit]]


def _follow_up_plan(text: str | None) -> str:
    lower = (text or "").lower()
    if any(token in lower for token in ["follow", "review", "recheck", "return"]):
        return "Schedule follow-up in 7 days"
    if any(token in lower for token in ["medication", "prescription", "therapy"]):
        return "Medication adherence check in 3 days"
    return "No follow-up flagged"


def _predict_wait_minutes(index: int, priority: str | None) -> int:
    base = 6
    multiplier = {"Critical": 0.6, "High": 0.8, "Normal": 1.0}
    weight = multiplier.get(priority or "Normal", 1.0)
    return max(4, round((index + 1) * base * weight))



async def _resolve_hospital_doc(db, hospital_id: str) -> dict[str, Any] | None:
    repo = MongoRepository(db, HOSPITALS)
    try:
        oid = _normalize_hospital_id(hospital_id)
    except HTTPException:
        return None
    doc = await repo.find_one({"_id": oid})
    if doc:
        return doc
    doc = await repo.find_one({"user": oid})
    return doc


def _bed_breakdown(beds: dict[str, Any] | None) -> dict[str, Any]:
    beds = beds or {}
    total = int(beds.get("totalBeds") or 0)
    occupied_raw = beds.get("occupiedBeds")
    available_raw = beds.get("availableBeds")
    occupied = int(occupied_raw or 0)
    available = int(available_raw if available_raw is not None else max(0, total - occupied))

    if (occupied_raw is None or occupied_raw == "") and available_raw is not None and total:
        occupied = max(0, total - available)
    if (available_raw is None or available_raw == "") and total:
        available = max(0, total - occupied)

    icu_total = int(beds.get("icuBeds") or max(1, round(total * 0.2)))
    emergency_total = int(beds.get("emergencyBeds") or max(1, round(total * 0.15)))
    general_total = max(0, total - icu_total - emergency_total)

    icu_occupied = min(icu_total, int(beds.get("icuOccupied") or max(0, round(occupied * 0.32))))
    emergency_occupied = min(emergency_total, int(beds.get("emergencyOccupied") or max(0, round(occupied * 0.22))))
    general_occupied = min(general_total, max(0, occupied - icu_occupied - emergency_occupied))

    return {
        "total": total,
        "occupied": occupied,
        "available": max(0, available),
        "icu": {
            "total": icu_total,
            "occupied": icu_occupied,
            "available": max(0, icu_total - icu_occupied),
        },
        "emergency": {
            "total": emergency_total,
            "occupied": emergency_occupied,
            "available": max(0, emergency_total - emergency_occupied),
        },
        "general": {
            "total": general_total,
            "occupied": general_occupied,
            "available": max(0, general_total - general_occupied),
        },
    }


def _severity_from_text(text: str) -> str:
    lower = (text or "").lower()
    if any(token in lower for token in ["cardiac", "unconscious", "severe", "stroke", "bleeding"]):
        return "Critical"
    if any(token in lower for token in ["fracture", "accident", "trauma", "chest"]):
        return "High"
    if any(token in lower for token in ["fever", "pain", "dizzy", "injury"]):
        return "Medium"
    return "Low"


def _department_from_symptoms(text: str) -> str:
    lower = (text or "").lower()
    if any(token in lower for token in ["chest", "cardiac", "heart"]):
        return "Cardiology"
    if any(token in lower for token in ["fracture", "ortho", "bone"]):
        return "Orthopedics"
    if any(token in lower for token in ["stroke", "neuro", "seizure"]):
        return "Neurology"
    if any(token in lower for token in ["trauma", "accident", "bleeding"]):
        return "Emergency"
    return "General"


def _estimate_discharge_hours(severity: str | None) -> int:
    level = (severity or "").lower()
    if level == "critical":
        return 72
    if level == "high":
        return 48
    if level == "medium":
        return 24
    return 12


def _score_department(patients: int, avg_time: float, discharge_rate: float, delay_rate: float) -> float:
    if patients <= 0:
        return 0.0
    time_score = max(0.0, 100 - avg_time * 3)
    delay_score = max(0.0, 100 - delay_rate * 100)
    return round((time_score * 0.4) + (discharge_rate * 0.4) + (delay_score * 0.2), 2)


def _simple_meta(confidence: float, reasoning: list[str], references: list[dict[str, str]] | None = None) -> dict[str, Any]:
    return {
        "confidence": confidence,
        "reasoning": reasoning,
        "references": references or [],
    }


async def _safe_run_model(command: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    celery_app.send_task("system.generate_predictions", args=[command, payload])
    cached = await get_latest_prediction(command)
    if cached and isinstance(cached.get("result"), dict):
        return cached["result"]
    return None


async def _seed_collection(
    repo: MongoRepository,
    query: dict[str, Any],
    docs: list[dict[str, Any]],
    force: bool = False
) -> int:
    if not force:
        existing = await repo.find_one(query)
        if existing:
            return 0
    inserted = 0
    for doc in docs:
        await repo.insert_one(doc)
        inserted += 1
    return inserted


async def _ensure_hospital_ops_seed(
    db,
    hospital_id: str,
    force: bool = False,
    scale: int | None = None
) -> dict[str, Any]:
    hospital_repo = MongoRepository(db, HOSPITALS)
    hospital_oid = _require_hospital_id(hospital_id)
    hospital_doc = await hospital_repo.find_one({"_id": hospital_oid})
    if not hospital_doc:
        hospital_doc = await hospital_repo.find_one({"user": hospital_oid})

    now = datetime.now(timezone.utc)
    if not hospital_doc:
        hospital_doc = await hospital_repo.insert_one(
            {
                "_id": hospital_oid,
                "user": hospital_oid,
                "name": "LifeLink General Hospital",
                "location": {"city": "Bengaluru", "state": "Karnataka"},
                "createdAt": now,
                "updatedAt": now,
            }
        )

    seed_scale = max(220, min(int(scale or 280), 600))
    existing_version = hospital_doc.get("opsSeedVersion") if hospital_doc else None
    existing_scale = hospital_doc.get("opsSeedScale") if hospital_doc else None
    if existing_version == SEED_VERSION and existing_scale == seed_scale and not force:
        return {
            "seeded": False,
            "version": SEED_VERSION,
            "hospitalId": str(hospital_doc.get("_id")),
        }

    seed_force = force or existing_version != SEED_VERSION or existing_scale != seed_scale
    bed_total = max(260, int(seed_scale * 1.35))
    bed_occupied = int(bed_total * 0.72)
    bed_available = max(0, bed_total - bed_occupied)
    bed_icu = max(32, int(bed_total * 0.18))
    bed_emergency = max(28, int(bed_total * 0.16))
    bed_icu_occupied = min(bed_icu, int(bed_icu * 0.72))
    bed_emergency_occupied = min(bed_emergency, int(bed_emergency * 0.76))

    departments = [
        "Emergency",
        "ICU",
        "General",
        "Cardiology",
        "Orthopedics",
        "Neurology",
        "Pediatrics",
        "Radiology",
        "Surgery",
        "Oncology",
    ]
    staff_roles = ["Doctor", "Nurse", "Technician", "Support", "Consultant"]
    shifts = ["Day", "Evening", "Night"]
    specialties = ["Trauma", "ICU", "Cardiology", "Neuro", "Ortho", "Radiology", "Surgery", "Pediatrics"]
    severity_cycle = ["Critical", "High", "Medium", "Low"]
    status_cycle = ["Admitted", "Observation", "Intake", "ICU", "Recovered"]

    hospital_update = {
        "opsSeedVersion": SEED_VERSION,
        "opsSeededAt": now,
        "opsSeedScale": seed_scale,
        "name": hospital_doc.get("name") or "LifeLink General Hospital",
        "location": hospital_doc.get("location") or {"city": "Bengaluru", "state": "Karnataka"},
        "specialties": hospital_doc.get("specialties")
        or departments,
        "beds": (hospital_doc.get("beds") if not seed_force else None)
        or {
            "totalBeds": bed_total,
            "occupiedBeds": bed_occupied,
            "availableBeds": bed_available,
            "icuBeds": bed_icu,
            "icuOccupied": bed_icu_occupied,
            "emergencyBeds": bed_emergency,
            "emergencyOccupied": bed_emergency_occupied,
        },
        "doctors": hospital_doc.get("doctors")
        or [
            {
                "name": f"Dr. {dept} Lead",
                "department": dept,
                "specialization": specialties[idx % len(specialties)],
                "availability": idx % 4 != 0,
            }
            for idx, dept in enumerate(departments[:8])
        ],
        "resources": hospital_doc.get("resources")
        or [
            {
                "name": "Ventilators",
                "category": "Equipment",
                "availableUnits": 48,
                "totalUnits": 70,
                "unit": "units",
            },
            {
                "name": "Oxygen Cylinders",
                "category": "Consumables",
                "availableUnits": 320,
                "totalUnits": 460,
                "unit": "units",
            },
            {
                "name": "Blood Units",
                "category": "Blood Bank",
                "availableUnits": 160,
                "totalUnits": 240,
                "unit": "units",
            },
            {
                "name": "PPE Kits",
                "category": "Supplies",
                "availableUnits": 680,
                "totalUnits": 920,
                "unit": "kits",
            },
        ],
        "updatedAt": now,
    }

    await hospital_repo.update_one({"_id": hospital_doc.get("_id")}, {"$set": hospital_update}, return_new=True)

    counts: dict[str, int] = {}
    patient_repo = MongoRepository(db, PATIENTS)
    staff_repo = MongoRepository(db, HOSPITAL_STAFF)
    invoice_repo = MongoRepository(db, BILLING_INVOICES)
    emergency_repo = MongoRepository(db, EMERGENCY_EVENTS)
    assignment_repo = MongoRepository(db, AMBULANCE_ASSIGNMENTS)
    dept_log_repo = MongoRepository(db, DEPARTMENT_LOGS)
    resource_repo = MongoRepository(db, RESOURCES)
    equipment_repo = MongoRepository(db, EQUIPMENT_INVENTORY)
    vendor_repo = MongoRepository(db, VENDOR_LEAD_TIMES)
    allocation_repo = MongoRepository(db, BED_ALLOCATIONS)
    report_repo = MongoRepository(db, HOSPITAL_REPORTS)
    expense_repo = MongoRepository(db, FINANCE_EXPENSES)
    claim_repo = MongoRepository(db, INSURANCE_CLAIMS)
    opd_appt_repo = MongoRepository(db, OPD_APPOINTMENTS)
    opd_doctor_repo = MongoRepository(db, OPD_DOCTORS)
    opd_queue_repo = MongoRepository(db, OPD_QUEUE)
    opd_consult_repo = MongoRepository(db, OPD_CONSULTATIONS)
    icu_patient_repo = MongoRepository(db, ICU_PATIENTS)
    icu_alert_repo = MongoRepository(db, ICU_ALERTS)
    radiology_request_repo = MongoRepository(db, RADIOLOGY_REQUESTS)
    radiology_report_repo = MongoRepository(db, RADIOLOGY_REPORTS)
    ot_surgery_repo = MongoRepository(db, OT_SURGERIES)
    ot_alloc_repo = MongoRepository(db, OT_ALLOCATIONS)
    benchmark_repo = MongoRepository(db, HOSPITAL_BENCHMARKS)
    ambulance_repo = MongoRepository(db, AMBULANCES)
    alert_repo = MongoRepository(db, ALERTS)
    analytics_repo = MongoRepository(db, ANALYTICS_EVENTS)
    prediction_repo = MongoRepository(db, PREDICTIONS)
    dept_repo = MongoRepository(db, HOSPITAL_DEPARTMENTS)
    message_repo = MongoRepository(db, HOSPITAL_MESSAGES)
    agreement_repo = MongoRepository(db, HOSPITAL_NETWORK_AGREEMENTS)

    patient_count = seed_scale + 40
    counts["patients"] = await _seed_collection(
        patient_repo,
        {"hospitalId": hospital_oid},
        [
            {
                "hospitalId": hospital_oid,
                "name": f"Patient {idx + 1}",
                "age": 18 + (idx % 62),
                "gender": "F" if idx % 2 == 0 else "M",
                "dept": departments[idx % len(departments)],
                "condition": f"{departments[idx % len(departments)]} case",
                "severity": severity_cycle[idx % len(severity_cycle)],
                "status": status_cycle[idx % len(status_cycle)],
                "createdAt": now - timedelta(hours=idx % 240),
                "updatedAt": now - timedelta(hours=idx % 120),
            }
            for idx in range(patient_count)
        ],
        force=seed_force
    )
    staff_count = int(seed_scale * 0.85)
    counts["staff"] = await _seed_collection(
        staff_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "name": f"Staff {idx + 1}",
                "role": staff_roles[idx % len(staff_roles)],
                "department": departments[idx % len(departments)],
                "shift": shifts[idx % len(shifts)],
                "availability": idx % 5 != 0,
                "skillTags": [specialties[idx % len(specialties)], departments[idx % len(departments)]],
                "certifications": ["BLS", "ACLS"] if idx % 3 == 0 else ["BLS"],
                "maxPatients": 12 + (idx % 10),
                "createdAt": now - timedelta(days=idx % 30),
                "updatedAt": now - timedelta(days=idx % 10),
            }
            for idx in range(staff_count)
        ],
        force=seed_force
    )
    invoice_count = seed_scale + 120
    counts["invoices"] = await _seed_collection(
        invoice_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patientName": f"Patient {idx + 1}",
                "department": departments[idx % len(departments)],
                "amount": 15000 + (idx % 18) * 2200,
                "status": "Paid" if idx % 3 == 0 else "Unpaid",
                "insuranceProvider": "Care Plus" if idx % 4 == 0 else "Star Health",
                "payer": "Insurer" if idx % 4 == 0 else "Self",
                "paidAt": (now - timedelta(days=idx % 30)).isoformat() if idx % 3 == 0 else None,
                "paidAmount": float(15000 + (idx % 18) * 2200) if idx % 3 == 0 else 0.0,
                "refundAmount": 0.0,
                "createdAt": now - timedelta(days=idx % 30, hours=idx % 18),
                "updatedAt": now - timedelta(days=idx % 15),
            }
            for idx in range(invoice_count)
        ],
        force=seed_force
    )
    emergency_count = int(seed_scale * 0.45)
    counts["emergencies"] = await _seed_collection(
        emergency_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patientName": f"Emergency {idx + 1}",
                "symptoms": "Trauma" if idx % 4 == 0 else "Chest pain",
                "location": "Central Zone",
                "source": "public",
                "severity": severity_cycle[idx % len(severity_cycle)],
                "priority": "High" if idx % 3 == 0 else "Medium",
                "status": "Assigned" if idx % 5 == 0 else "Unassigned",
                "createdAt": now - timedelta(hours=idx % 48),
                "updatedAt": now - timedelta(hours=idx % 24),
            }
            for idx in range(emergency_count)
        ],
        force=seed_force
    )
    assignment_count = int(seed_scale * 0.2)
    counts["assignments"] = await _seed_collection(
        assignment_repo,
        {"hospital": hospital_id},
        [
            {
                "ambulanceId": f"AMB-{100 + idx}",
                "hospital": hospital_id,
                "eventId": None,
                "status": "Active" if idx % 4 != 0 else "Completed",
                "etaMinutes": 6 + (idx % 14),
                "pickup": "Central Zone",
                "destination": "LifeLink General Hospital",
                "createdAt": now - timedelta(hours=idx % 36),
                "updatedAt": now - timedelta(hours=idx % 18),
            }
            for idx in range(assignment_count)
        ],
        force=seed_force
    )
    counts["department_logs"] = await _seed_collection(
        dept_log_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "department": dept,
                "avgTreatmentMinutes": 30 + (idx % 10) * 2.2,
                "dischargeRate": round(0.55 + (idx % 5) * 0.05, 2),
                "delayRate": round(0.06 + (idx % 4) * 0.03, 2),
                "throughputPerHour": 3.2 + (idx % 6) * 0.7,
                "queueLength": 6 + (idx % 14),
                "notes": "Stable throughput",
                "createdAt": now - timedelta(days=idx % 5),
                "updatedAt": now - timedelta(days=idx % 3),
            }
            for idx, dept in enumerate(departments)
        ],
        force=seed_force
    )
    resource_catalog = [
        {"name": "IV Kits", "category": "Supplies", "unit": "kits", "base": 320},
        {"name": "Dialysis Filters", "category": "Equipment", "unit": "filters", "base": 80},
        {"name": "Ventilator Circuits", "category": "Consumables", "unit": "sets", "base": 140},
        {"name": "Glucose Monitors", "category": "Supplies", "unit": "units", "base": 220},
        {"name": "Surgical Gloves", "category": "Supplies", "unit": "boxes", "base": 480},
        {"name": "Oxygen Masks", "category": "Consumables", "unit": "units", "base": 260},
    ]
    resource_count = 60
    counts["resources"] = await _seed_collection(
        resource_repo,
        {"hospitalId": hospital_oid},
        [
            {
                "hospitalId": hospital_oid,
                "name": f"{resource_catalog[idx % len(resource_catalog)]['name']} {idx + 1}",
                "category": resource_catalog[idx % len(resource_catalog)]["category"],
                "quantity": resource_catalog[idx % len(resource_catalog)]["base"] + (idx % 6) * 25,
                "minThreshold": max(12, int((resource_catalog[idx % len(resource_catalog)]["base"] + (idx % 6) * 25) * 0.2)),
                "unit": resource_catalog[idx % len(resource_catalog)]["unit"],
                "createdAt": now - timedelta(days=idx % 20),
                "updatedAt": now - timedelta(days=idx % 7),
            }
            for idx in range(resource_count)
        ],
        force=seed_force
    )
    equipment_catalog = [
        {"name": "MRI Scanner", "category": "Imaging", "base": 4},
        {"name": "CT Scanner", "category": "Imaging", "base": 3},
        {"name": "Ventilators", "category": "ICU", "base": 48},
        {"name": "ECG Machines", "category": "Cardiology", "base": 18},
        {"name": "Ultrasound", "category": "Imaging", "base": 12},
        {"name": "Infusion Pumps", "category": "ICU", "base": 36},
    ]
    equipment_count = 30
    counts["equipment"] = await _seed_collection(
        equipment_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "name": f"{equipment_catalog[idx % len(equipment_catalog)]['name']} {idx + 1}",
                "category": equipment_catalog[idx % len(equipment_catalog)]["category"],
                "quantity": equipment_catalog[idx % len(equipment_catalog)]["base"] + (idx % 4),
                "status": "Available" if idx % 6 != 0 else "Maintenance",
                "minThreshold": max(1, int(equipment_catalog[idx % len(equipment_catalog)]["base"] * 0.2)),
                "createdAt": now - timedelta(days=idx % 60),
                "updatedAt": now - timedelta(days=idx % 20),
            }
            for idx in range(equipment_count)
        ],
        force=seed_force
    )
    vendor_count = 15
    counts["vendors"] = await _seed_collection(
        vendor_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "resourceName": resource_catalog[idx % len(resource_catalog)]["name"],
                "category": resource_catalog[idx % len(resource_catalog)]["category"],
                "vendorName": f"Vendor {idx + 1}",
                "leadTimeDays": 4 + (idx % 10),
                "createdAt": now - timedelta(days=idx % 30),
                "updatedAt": now - timedelta(days=idx % 12),
            }
            for idx in range(vendor_count)
        ],
        force=seed_force
    )
    allocation_count = int(seed_scale * 0.35)
    bed_types = ["ICU", "Emergency", "General", "Ward"]
    counts["allocations"] = await _seed_collection(
        allocation_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patientName": f"Patient {idx + 1}",
                "bedType": bed_types[idx % len(bed_types)],
                "status": "Assigned" if idx % 6 != 0 else "Waiting",
                "notes": "Auto allocation",
                "createdAt": now - timedelta(hours=idx % 96),
                "updatedAt": now - timedelta(hours=idx % 48),
            }
            for idx in range(allocation_count)
        ],
        force=seed_force
    )
    report_templates = _report_templates()
    ingested_reports = [
        "Vendor Audit Notes",
        "Patient Feedback Digest",
        "Safety Drill Summary",
        "Clinical Quality Review",
        "Supply Chain Risk",
        "Ambulance KPI Snapshot",
    ]
    counts["reports"] = await _seed_collection(
        report_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "reportKey": template["key"],
                "name": template["name"],
                "status": "Ready",
                "generatedAt": now - timedelta(days=idx + 1),
                "content": f"{template['name']} content.",
                "summary": f"{template['name']} summary.",
                "createdAt": now - timedelta(days=idx + 1),
                "updatedAt": now - timedelta(days=idx + 1),
            }
            for idx, template in enumerate(report_templates)
        ]
        + [
            {
                "hospital": hospital_oid,
                "reportKey": "ingested",
                "name": name,
                "category": "Quality" if idx % 2 == 0 else "Compliance",
                "status": "Ready",
                "generatedAt": now - timedelta(days=idx + 1),
                "content": f"{name} content.",
                "summary": f"{name} summary.",
                "createdAt": now - timedelta(days=idx + 1),
                "updatedAt": now - timedelta(days=idx + 1),
            }
            for idx, name in enumerate(ingested_reports)
        ],
        force=seed_force
    )
    expense_categories = ["Supplies", "Equipment", "Staffing", "Facilities", "IT", "Logistics"]
    expense_count = int(seed_scale * 0.6)
    counts["expenses"] = await _seed_collection(
        expense_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "category": expense_categories[idx % len(expense_categories)],
                "amount": 18000 + (idx % 12) * 3200,
                "notes": "Monthly expense",
                "vendor": f"Vendor {idx % 15 + 1}",
                "contractRef": f"CN-{2024 + (idx % 2)}-{100 + idx}",
                "createdAt": now - timedelta(days=idx % 60),
                "updatedAt": now - timedelta(days=idx % 30),
            }
            for idx in range(expense_count)
        ],
        force=seed_force
    )
    claim_count = int(seed_scale * 0.7)
    counts["claims"] = await _seed_collection(
        claim_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "invoiceId": f"INV-{1000 + idx}",
                "insurer": "Star Health" if idx % 2 == 0 else "Care Plus",
                "amount": 28000 + (idx % 10) * 2600,
                "status": "Approved" if idx % 4 == 0 else "Submitted",
                "approvedAmount": float(26000 + (idx % 10) * 2400) if idx % 4 == 0 else 0.0,
                "submittedAt": (now - timedelta(days=idx % 45)).isoformat(),
                "paidAt": (now - timedelta(days=idx % 30)).isoformat() if idx % 4 == 0 else None,
                "createdAt": now - timedelta(days=idx % 45),
                "updatedAt": now - timedelta(days=idx % 20),
            }
            for idx in range(claim_count)
        ],
        force=seed_force
    )
    appointment_count = seed_scale
    appointment_types = ["New", "Follow-up", "Consultation"]
    channels = ["Online", "Walk-in", "Referral"]
    counts["opd_appointments"] = await _seed_collection(
        opd_appt_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patient": f"Patient {idx + 1}",
                "doctor": f"Dr. {departments[idx % len(departments)]} Lead",
                "time": (now + timedelta(days=idx % 21, hours=8 + (idx % 8))).isoformat(),
                "status": "Scheduled" if idx % 6 != 0 else "Completed",
                "appointmentType": appointment_types[idx % len(appointment_types)],
                "channel": channels[idx % len(channels)],
                "expectedDurationMinutes": 15 + (idx % 4) * 10,
                "reason": "Routine check",
                "notes": "Auto generated",
                "seasonTag": _season_tag(now),
                "slotHour": (now + timedelta(days=idx % 21, hours=8 + (idx % 8))).hour,
                "createdAt": now - timedelta(hours=idx % 72),
                "updatedAt": now - timedelta(hours=idx % 36),
            }
            for idx in range(appointment_count)
        ],
        force=seed_force
    )
    doctor_count = 48
    counts["opd_doctors"] = await _seed_collection(
        opd_doctor_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "name": f"Dr. OPD {idx + 1}",
                "specialty": departments[idx % len(departments)],
                "availability": idx % 5 != 0,
                "shift": shifts[idx % len(shifts)],
                "schedule": "Mon-Sat",
                "normalizedShift": shifts[idx % len(shifts)],
                "createdAt": now - timedelta(days=idx % 14),
                "updatedAt": now - timedelta(days=idx % 7),
            }
            for idx in range(doctor_count)
        ],
        force=seed_force
    )
    queue_count = int(seed_scale * 0.6)
    queue_statuses = ["Waiting", "In Service", "Completed"]
    counts["opd_queue"] = await _seed_collection(
        opd_queue_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patientName": f"Patient {idx + 1}",
                "reason": "General check",
                "priority": "High" if idx % 7 == 0 else "Normal",
                "status": queue_statuses[idx % len(queue_statuses)],
                "assignedDoctor": f"Dr. OPD {(idx % doctor_count) + 1}",
                "notes": "Queue flow",
                "checkInAt": now - timedelta(minutes=idx % 180),
                "serviceStartedAt": now - timedelta(minutes=idx % 90) if idx % 3 == 0 else None,
                "createdAt": now - timedelta(minutes=idx % 180),
                "updatedAt": now - timedelta(minutes=idx % 60),
            }
            for idx in range(queue_count)
        ],
        force=seed_force
    )
    consult_count = int(seed_scale * 0.7)
    counts["opd_consults"] = await _seed_collection(
        opd_consult_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patient": f"Patient {idx + 1}",
                "doctor": f"Dr. OPD {(idx % doctor_count) + 1}",
                "notes": "Clinical notes summary.",
                "date": (now - timedelta(days=idx % 30)).date().isoformat(),
                "status": "Closed" if idx % 4 == 0 else "Open",
                "summary": "Consultation summary.",
                "aiSummary": "Follow-up in 2 weeks.",
                "keywords": ["follow-up", "review"],
                "followUpPlan": "Schedule follow-up",
                "followUpDate": (now + timedelta(days=idx % 14)).date().isoformat(),
                "createdAt": now - timedelta(days=idx % 30),
                "updatedAt": now - timedelta(days=idx % 15),
            }
            for idx in range(consult_count)
        ],
        force=seed_force
    )
    icu_patient_count = int(seed_scale * 0.2)
    counts["icu_patients"] = await _seed_collection(
        icu_patient_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "name": f"ICU Patient {idx + 1}",
                "oxygen": 90 + (idx % 8),
                "heartRate": 84 + (idx % 40),
                "bp": f"{110 + (idx % 20)}/{70 + (idx % 15)}",
                "status": "Critical" if idx % 5 == 0 else "Stable",
                "createdAt": now - timedelta(hours=idx % 120),
                "updatedAt": now - timedelta(hours=idx % 60),
            }
            for idx in range(icu_patient_count)
        ],
        force=seed_force
    )
    icu_alert_count = int(seed_scale * 0.15)
    icu_alert_levels = ["High", "Medium", "Low"]
    counts["icu_alerts"] = await _seed_collection(
        icu_alert_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "message": f"Vitals fluctuation {idx + 1}",
                "severity": icu_alert_levels[idx % len(icu_alert_levels)],
                "status": "Active" if idx % 3 != 0 else "Resolved",
                "createdAt": now - timedelta(hours=idx % 48),
                "updatedAt": now - timedelta(hours=idx % 24),
            }
            for idx in range(icu_alert_count)
        ],
        force=seed_force
    )
    radiology_request_count = int(seed_scale * 0.55)
    scan_types = ["CT", "MRI", "X-Ray", "Ultrasound"]
    counts["radiology_requests"] = await _seed_collection(
        radiology_request_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patient": f"Patient {idx + 1}",
                "scan": f"{scan_types[idx % len(scan_types)]} Scan",
                "status": "Queued" if idx % 4 != 0 else "In Progress",
                "createdAt": now - timedelta(hours=idx % 72),
                "updatedAt": now - timedelta(hours=idx % 48),
            }
            for idx in range(radiology_request_count)
        ],
        force=seed_force
    )
    radiology_report_count = int(seed_scale * 0.4)
    counts["radiology_reports"] = await _seed_collection(
        radiology_report_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patient": f"Patient {idx + 1}",
                "scan": f"{scan_types[idx % len(scan_types)]} Scan",
                "fileName": f"scan_{idx + 1}.pdf",
                "notes": "No acute findings",
                "status": "Uploaded",
                "createdAt": now - timedelta(hours=idx % 60),
                "updatedAt": now - timedelta(hours=idx % 36),
            }
            for idx in range(radiology_report_count)
        ],
        force=seed_force
    )
    surgery_count = int(seed_scale * 0.5)
    procedures = ["Ortho Fixation", "Cardiac Cath", "Neuro Observation", "General Surgery"]
    counts["ot_surgeries"] = await _seed_collection(
        ot_surgery_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "patient": f"Patient {idx + 1}",
                "procedure": procedures[idx % len(procedures)],
                "time": (now + timedelta(hours=idx % 36)).isoformat(),
                "status": "Scheduled" if idx % 5 != 0 else "Completed",
                "createdAt": now - timedelta(hours=idx % 48),
                "updatedAt": now - timedelta(hours=idx % 24),
            }
            for idx in range(surgery_count)
        ],
        force=seed_force
    )
    ot_alloc_count = int(seed_scale * 0.35)
    patient_loads = ["High", "Medium", "Low"]
    counts["ot_allocations"] = await _seed_collection(
        ot_alloc_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "department": departments[idx % len(departments)],
                "patient_load": patient_loads[idx % len(patient_loads)],
                "shift": shifts[idx % len(shifts)],
                "allocation_decision": "Auto scheduled OT team",
                "createdAt": now - timedelta(hours=idx % 60),
                "updatedAt": now - timedelta(hours=idx % 36),
            }
            for idx in range(ot_alloc_count)
        ],
        force=seed_force
    )
    counts["benchmarks"] = await _seed_collection(
        benchmark_repo,
        {"region": "global"},
        [
            {"region": "global", "metric": "avg_occupancy", "value": 79.5, "source": "ops_feed", "createdAt": now - timedelta(days=7)},
            {"region": "global", "metric": "avg_wait_minutes", "value": 26.4, "source": "ops_feed", "createdAt": now - timedelta(days=7)},
            {"region": "global", "metric": "staff_coverage", "value": 86.9, "source": "ops_feed", "createdAt": now - timedelta(days=7)},
            {"region": "global", "metric": "opd_utilization", "value": 72.3, "source": "ops_feed", "createdAt": now - timedelta(days=7)},
        ],
        force=seed_force
    )
    ambulance_count = 24
    counts["ambulances"] = await _seed_collection(
        ambulance_repo,
        {"hospital": hospital_oid},
        [
            {
                "ambulanceId": f"AMB-{100 + idx}",
                "registrationNumber": f"KA-01-AA-{1000 + idx}",
                "hospital": hospital_oid,
                "status": "available" if idx % 4 != 0 else "en_route",
                "driver": {
                    "name": f"Driver {idx + 1}",
                    "licenseNumber": f"DL-{2000 + idx}",
                    "phone": f"900000{idx:04d}",
                    "availability": idx % 4 != 0,
                },
                "metrics": {
                    "averageResponseTime": 8 + (idx % 6),
                    "onTimeDeliveryRate": 90 + (idx % 8),
                    "totalTripsToday": 3 + (idx % 6),
                    "totalDistanceTodayKm": round(30 + (idx % 12) * 3.2, 1),
                },
                "createdAt": now - timedelta(days=idx % 10),
                "updatedAt": now - timedelta(days=idx % 4),
            }
            for idx in range(ambulance_count)
        ],
        force=seed_force
    )
    alert_count = 40
    counts["alerts"] = await _seed_collection(
        alert_repo,
        {"hospitalId": hospital_id},
        [
            {
                "hospitalId": hospital_id,
                "message": f"Operational alert {idx + 1}",
                "priority": "High" if idx % 5 == 0 else "Medium",
                "status": "pending" if idx % 4 != 0 else "resolved",
                "createdAt": now - timedelta(hours=idx % 72),
                "updatedAt": now - timedelta(hours=idx % 36),
            }
            for idx in range(alert_count)
        ],
        force=seed_force
    )
    analytics_count = 90
    analytics_types = ["bed_forecast", "staff_load", "er_wait", "supply_risk", "opd_demand"]
    counts["analytics_events"] = await _seed_collection(
        analytics_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "eventType": analytics_types[idx % len(analytics_types)],
                "value": round(0.4 + (idx % 10) * 0.05, 2),
                "createdAt": now - timedelta(hours=idx % 120),
                "updatedAt": now - timedelta(hours=idx % 60),
            }
            for idx in range(analytics_count)
        ],
        force=seed_force
    )
    prediction_count = 120
    prediction_models = ["icu_risk", "opd_no_show", "readmission", "supply_runout"]
    counts["predictions"] = await _seed_collection(
        prediction_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "risk_score": round(0.2 + (idx % 15) * 0.05, 2),
                "model": prediction_models[idx % len(prediction_models)],
                "createdAt": now - timedelta(hours=idx % 96),
                "updatedAt": now - timedelta(hours=idx % 48),
            }
            for idx in range(prediction_count)
        ],
        force=seed_force
    )
    counts["departments"] = await _seed_collection(
        dept_repo,
        {"hospital": hospital_oid},
        [
            {
                "hospital": hospital_oid,
                "name": dept,
                "createdAt": now - timedelta(days=idx % 14),
                "updatedAt": now - timedelta(days=idx % 7),
            }
            for idx, dept in enumerate(departments)
        ],
        force=seed_force
    )
    message_count = 10
    counts["messages"] = await _seed_collection(
        message_repo,
        {"fromHospital": hospital_doc.get("_id")},
        [
            {
                "fromHospital": hospital_doc.get("_id"),
                "toHospital": hospital_doc.get("_id"),
                "messageType": "resource",
                "subject": f"Resource request {idx + 1}",
                "details": "Requesting supplies.",
                "requestDetails": {
                    "urgencyLevel": "medium",
                    "resourceName": resource_catalog[idx % len(resource_catalog)]["name"],
                    "resourceQuantity": 8 + (idx % 10),
                },
                "status": "pending" if idx % 3 != 0 else "approved",
                "createdAt": now - timedelta(days=idx % 10),
                "updatedAt": now - timedelta(days=idx % 5),
            }
            for idx in range(message_count)
        ],
        force=seed_force
    )
    agreement_count = 6
    counts["agreements"] = await _seed_collection(
        agreement_repo,
        {"hospital": hospital_doc.get("_id")},
        [
            {
                "hospital": hospital_doc.get("_id"),
                "partner": hospital_doc.get("_id"),
                "dataTypes": ["beds", "resources", "staff"],
                "status": "active",
                "createdAt": now - timedelta(days=idx % 20),
                "updatedAt": now - timedelta(days=idx % 10),
            }
            for idx in range(agreement_count)
        ],
        force=seed_force
    )
    return {
        "seeded": True,
        "version": SEED_VERSION,
        "hospitalId": str(hospital_doc.get("_id")),
        "counts": counts,
    }


async def _ensure_seeded(db, hospital_id: str) -> None:
    try:
        await _ensure_hospital_ops_seed(db, hospital_id, scale=300)
    except HTTPException:
        return


def _report_templates() -> list[dict[str, str]]:
    return [
        {"key": "weekly-ops", "name": "Weekly Operations Summary"},
        {"key": "icu-performance", "name": "ICU Performance Review"},
        {"key": "finance-snapshot", "name": "Finance Snapshot"},
    ]


def _summarize_report_text(content: str) -> str:
    content = (content or "").strip()
    if not content:
        return "Summary unavailable."
    sentences = content.split(".")
    summary = ".".join(sentences[:2]).strip()
    if summary:
        return summary + "."
    return content[:240]


def _month_key(target: datetime) -> str:
    return target.strftime("%Y-%m")


async def preload_hospital_ops(payload: dict = Body(default_factory=dict)):
    hospital_id = payload.get("hospitalId")
    if not hospital_id:
        raise HTTPException(status_code=400, detail="hospitalId is required")
    bool(payload.get("force"))
