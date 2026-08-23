"""
Patient Discharge Workflow API
==============================
Handles the complete discharge process: readiness assessment,
discharge summary generation, medication handoff, and follow-up scheduling.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import require_roles, require_scopes
from app.core.rbac import AuthContext
from app.db.mongo import get_db
from app.services.collections import PATIENTS
from app.services.repository import MongoRepository

logger = logging.getLogger("lifelink.discharge")
router = APIRouter(tags=["discharge"])


# ─── Request Models ────────────────────────────────────────────────

class DischargeReadinessCheck(BaseModel):
    patient_id: str
    hospital_id: str


class DischargeRequest(BaseModel):
    patient_id: str
    hospital_id: str
    discharge_type: str = "standard"  # standard, emergency, against_medical_advice, transfer
    condition_at_discharge: str = "stable"
    discharge_summary: str | None = None
    medications_prescribed: list[dict] | None = None
    follow_up_date: str | None = None
    follow_up_instructions: str | None = None
    transport_arranged: bool = False
    notes: str | None = None


class FollowUpSchedule(BaseModel):
    patient_id: str
    hospital_id: str
    appointments: list[dict]


# ─── Discharge Readiness Assessment ────────────────────────────────

@router.post("/discharge/readiness")
async def check_discharge_readiness(
    payload: DischargeReadinessCheck,
    ctx: AuthContext = Depends(require_scopes("patients:read")),
) -> dict:
    """Assess whether a patient is ready for discharge."""
    db = get_db()
    repo = MongoRepository(db, PATIENTS)

    patient = await repo.find_one({"_id": payload.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Assess readiness based on patient data
    readiness_factors = []
    readiness_score = 100
    blockers = []

    # Check vitals stability
    hr = patient.get("heartRate") or patient.get("heart_rate")
    bp = patient.get("bloodPressure") or patient.get("blood_pressure")
    o2 = patient.get("oxygen") or patient.get("oxygen_saturation")
    temp = patient.get("temperature")

    if hr and int(hr) > 100:
        readiness_score -= 15
        readiness_factors.append("Elevated heart rate")
    else:
        readiness_factors.append("Heart rate normal")

    if bp:
        bp_str = str(bp)
        if "/" in bp_str:
            systolic = int(bp_str.split("/")[0])
            if systolic > 140:
                readiness_score -= 10
                readiness_factors.append("Elevated blood pressure")
            else:
                readiness_factors.append("Blood pressure within range")
    else:
        readiness_factors.append("Blood pressure not recorded")

    if o2 and int(o2) < 95:
        readiness_score -= 20
        blockers.append("Oxygen saturation below 95%")
    elif o2:
        readiness_factors.append("Oxygen saturation adequate")

    if temp and float(temp) > 38.0:
        readiness_score -= 10
        readiness_factors.append("Elevated temperature")

    # Check admission duration
    admit_date = patient.get("admitDate") or patient.get("admit_date")
    if admit_date:
        try:
            if isinstance(admit_date, str):
                admitted = datetime.fromisoformat(admit_date.replace("Z", "+00:00"))
            else:
                admitted = admit_date
            days_admitted = (datetime.utcnow() - admitted.replace(tzinfo=None)).days
            if days_admitted < 1:
                readiness_score -= 5
                readiness_factors.append(f"Recently admitted ({days_admitted} days)")
            else:
                readiness_factors.append(f"Admitted for {days_admitted} days")
        except (ValueError, TypeError):
            pass

    # Check severity
    severity = str(patient.get("severity", "")).lower()
    if severity in ("critical", "high"):
        readiness_score -= 25
        blockers.append(f"Patient severity: {severity}")
    elif severity == "medium":
        readiness_score -= 10
        readiness_factors.append("Moderate severity — monitor before discharge")

    readiness_score = max(0, min(100, readiness_score))
    is_ready = readiness_score >= 60 and len(blockers) == 0

    return {
        "patient_id": payload.patient_id,
        "is_ready": is_ready,
        "readiness_score": readiness_score,
        "factors": readiness_factors,
        "blockers": blockers,
        "recommendation": (
            "Patient is ready for discharge" if is_ready
            else "Patient requires additional monitoring before discharge"
        ),
        "assessed_at": datetime.utcnow().isoformat(),
    }


# ─── Process Discharge ─────────────────────────────────────────────

@router.post("/discharge/process")
async def process_discharge(
    payload: DischargeRequest,
    ctx: AuthContext = Depends(require_scopes("patients:write")),
) -> dict:
    """Process a patient discharge with full summary."""
    db = get_db()
    repo = MongoRepository(db, PATIENTS)

    patient = await repo.find_one({"_id": payload.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Build discharge record
    discharge_record = {
        "patient_id": payload.patient_id,
        "hospital_id": payload.hospital_id,
        "discharge_type": payload.discharge_type,
        "condition_at_discharge": payload.condition_at_discharge,
        "discharge_summary": payload.discharge_summary or _generate_discharge_summary(patient, payload),
        "medications_prescribed": payload.medications_prescribed or [],
        "follow_up_date": payload.follow_up_date,
        "follow_up_instructions": payload.follow_up_instructions,
        "transport_arranged": payload.transport_arranged,
        "notes": payload.notes,
        "discharged_by": ctx.user_id,
        "discharged_at": datetime.utcnow().isoformat(),
        "status": "discharged",
    }

    # Update patient record
    await repo.update_one(
        {"_id": payload.patient_id},
        {"$set": {
            "status": "discharged",
            "dischargeDate": datetime.utcnow(),
            "dischargeRecord": discharge_record,
        }}
    )

    logger.info(
        "Patient %s discharged from hospital %s (type=%s, condition=%s)",
        payload.patient_id, payload.hospital_id,
        payload.discharge_type, payload.condition_at_discharge,
    )

    return {
        "status": "discharged",
        "patient_id": payload.patient_id,
        "discharge_record": discharge_record,
        "message": f"Patient successfully discharged ({payload.discharge_type})",
    }


# ─── Discharge Summary Generation ─────────────────────────────────

@router.post("/discharge/summary")
async def generate_discharge_summary(
    payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(require_scopes("patients:read")),
) -> dict:
    """Generate a structured discharge summary for a patient."""
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")

    db = get_db()
    repo = MongoRepository(db, PATIENTS)
    patient = await repo.find_one({"_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    name = patient.get("name", "Patient")
    age = patient.get("age", "N/A")
    admit_date = patient.get("admitDate") or patient.get("admit_date", "N/A")
    diagnosis = patient.get("diagnosis") or patient.get("condition", "N/A")
    severity = patient.get("severity", "N/A")

    summary = {
        "patient_name": name,
        "patient_age": age,
        "admission_date": str(admit_date),
        "discharge_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "diagnosis": diagnosis,
        "severity_at_admission": severity,
        "treatment_summary": patient.get("treatment") or "Treatment completed as per protocol",
        "condition_at_discharge": "Stable",
        "medications_at_discharge": patient.get("medications") or [],
        "follow_up_required": True,
        "follow_up_date": "Within 2 weeks",
        "instructions": [
            "Continue prescribed medications as directed",
            "Rest and avoid strenuous activity for 1 week",
            "Follow up with specialist if symptoms persist",
            "Emergency: Call hospital if condition worsens",
        ],
        "generated_at": datetime.utcnow().isoformat(),
    }

    return summary


# ─── Follow-Up Scheduling ──────────────────────────────────────────

@router.post("/discharge/follow-up")
async def schedule_follow_up(
    payload: FollowUpSchedule,
    ctx: AuthContext = Depends(require_scopes("patients:write")),
) -> dict:
    """Schedule follow-up appointments after discharge."""
    if not payload.appointments:
        raise HTTPException(status_code=400, detail="At least one appointment is required")

    scheduled = []
    for appt in payload.appointments:
        scheduled.append({
            "patient_id": payload.patient_id,
            "hospital_id": payload.hospital_id,
            "type": appt.get("type", "follow_up"),
            "department": appt.get("department", "General"),
            "doctor": appt.get("doctor", ""),
            "date": appt.get("date", ""),
            "time": appt.get("time", ""),
            "reason": appt.get("reason", "Post-discharge follow-up"),
            "status": "scheduled",
            "created_at": datetime.utcnow().isoformat(),
        })

    return {
        "status": "scheduled",
        "patient_id": payload.patient_id,
        "appointments": scheduled,
        "count": len(scheduled),
    }


# ─── Discharge Statistics ──────────────────────────────────────────

@router.get("/discharge/stats")
async def discharge_statistics(
    hospital_id: str = Query(...),
    days: int = Query(30, ge=1, le=365),
    ctx: AuthContext = Depends(require_scopes("dashboard:read")),
) -> dict:
    """Get discharge statistics for a hospital."""
    db = get_db()
    repo = MongoRepository(db, PATIENTS)

    # Count total and discharged patients
    hospital_oid = hospital_id
    total = await repo.count({"hospitalId": hospital_oid})
    discharged = await repo.count({"hospitalId": hospital_oid, "status": "discharged"})

    # Discharge rate
    discharge_rate = round(discharged / max(total, 1) * 100, 1)

    return {
        "hospital_id": hospital_id,
        "period_days": days,
        "total_patients": total,
        "discharged_patients": discharged,
        "active_patients": total - discharged,
        "discharge_rate_percent": discharge_rate,
        "average_length_of_stay_days": round(days / max(discharged, 1), 1),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─── Helper: Generate Discharge Summary ────────────────────────────

def _generate_discharge_summary(patient: dict, payload: DischargeRequest) -> str:
    """Generate a textual discharge summary."""
    name = patient.get("name", "Patient")
    diagnosis = patient.get("diagnosis") or patient.get("condition", "N/A")
    severity = patient.get("severity", "N/A")

    lines = [
        f"DISCHARGE SUMMARY",
        f"=" * 40,
        f"Patient: {name}",
        f"Diagnosis: {diagnosis}",
        f"Severity at admission: {severity}",
        f"Discharge type: {payload.discharge_type}",
        f"Condition at discharge: {payload.condition_at_discharge}",
        f"",
        f"Treatment completed as per protocol.",
        f"Patient is stable and fit for discharge.",
    ]

    if payload.medications_prescribed:
        lines.append("")
        lines.append("MEDICATIONS PRESCRIBED:")
        for med in payload.medications_prescribed:
            lines.append(f"  - {med.get('name', 'N/A')} {med.get('dosage', '')} ({med.get('frequency', '')})")

    if payload.follow_up_instructions:
        lines.append("")
        lines.append(f"FOLLOW-UP: {payload.follow_up_instructions}")

    lines.append(f"\nDischarged on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")

    return "\n".join(lines)
