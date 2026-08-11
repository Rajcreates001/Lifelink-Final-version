from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import PlainTextResponse

from app.db.mongo import get_db
from app.services.repository import MongoRepository
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
    VENDOR_LEAD_TIMES,
)
from app.core.celery_app import celery_app
from app.services.prediction_store import get_latest_prediction

from .hospital_ops_shared import *


router = APIRouter(tags=["hospital-ops"])


@router.get("/icu/patients")
async def list_icu_patients(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, ICU_PATIENTS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["name", "status", "bp"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    sort = _build_sort(
        sort_by,
        sort_dir,
        {"createdAt", "updatedAt", "name", "oxygen", "heartRate", "status"},
        "createdAt",
    )
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/icu/patients", status_code=201)
async def create_icu_patient(payload: IcuPatientCreate):
    db = get_db()
    repo = MongoRepository(db, ICU_PATIENTS)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "name": payload.name,
        "oxygen": payload.oxygen,
        "heartRate": payload.heartRate,
        "bp": payload.bp,
        "status": payload.status or "Stable",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/icu/patients/{patient_id}")
async def update_icu_patient(patient_id: str, payload: IcuPatientUpdate):
    db = get_db()
    repo = MongoRepository(db, ICU_PATIENTS)
    oid = _as_object_id(patient_id)
    update_data = _build_update(payload, ["name", "oxygen", "heartRate", "bp", "status"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="ICU patient not found")
    return updated


@router.get("/icu/alerts")
async def list_icu_alerts(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    severity: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, ICU_ALERTS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["message", "severity", "status"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "severity", "status"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/icu/alerts", status_code=201)
async def create_icu_alert(payload: IcuAlertCreate):
    db = get_db()
    repo = MongoRepository(db, ICU_ALERTS)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "message": payload.message,
        "severity": payload.severity,
        "status": payload.status or "Active",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/icu/alerts/{alert_id}")
async def update_icu_alert(alert_id: str, payload: IcuAlertUpdate):
    db = get_db()
    repo = MongoRepository(db, ICU_ALERTS)
    oid = _as_object_id(alert_id)
    update_data = _build_update(payload, ["message", "severity", "status"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="ICU alert not found")
    return updated


@router.get("/icu/vitals")
async def icu_vitals(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, ICU_PATIENTS)
    oid = _require_hospital_id(hospitalId)
    records = await repo.find_many({"hospital": oid}, limit=200)

    if not records:
        return {
            "average_oxygen": 0,
            "average_heart_rate": 0,
            "critical_patients": 0,
            "patient_count": 0,
        }

    total_oxygen = 0
    total_hr = 0
    critical = 0
    count = 0

    for record in records:
        try:
            total_oxygen += int(record.get("oxygen") or 0)
        except (TypeError, ValueError):
            total_oxygen += 0
        try:
            total_hr += int(record.get("heartRate") or 0)
        except (TypeError, ValueError):
            total_hr += 0
        if (record.get("status") or "").lower() == "critical":
            critical += 1
        count += 1

    return {
        "average_oxygen": round(total_oxygen / count),
        "average_heart_rate": round(total_hr / count),
        "critical_patients": critical,
        "patient_count": count,
    }


@router.post("/icu/risk")
async def icu_risk(payload: dict = Body(default_factory=dict)):
    oxygen = int(payload.get("oxygen") or 0)
    heart_rate = int(payload.get("heartRate") or 0)
    risk = 0
    if oxygen < 92:
        risk += 40
    if oxygen < 88:
        risk += 15
    if heart_rate > 110:
        risk += 30
    if heart_rate > 130:
        risk += 10
    if heart_rate < 50:
        risk += 20
    risk = min(100, risk)
    risk_level = "Critical" if risk >= 70 else "High" if risk >= 50 else "Moderate" if risk >= 30 else "Low"
    meta = _simple_meta(
        0.6,
        [
            "Risk computed from oxygen saturation and heart rate thresholds.",
            "Higher risk escalates when oxygen drops or heart rate spikes.",
        ],
        [{"title": "Rule set", "detail": "ICU triage thresholds"}],
    )
    return {
        "riskScore": risk,
        "riskLevel": risk_level,
        "meta": meta,
    }


