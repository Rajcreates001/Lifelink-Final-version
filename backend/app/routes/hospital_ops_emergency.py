from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Query, Depends
from app.core.auth import get_current_user, AuthContext
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
    VENDOR_LEAD_TIMES
)
from app.core.celery_app import celery_app
from app.services.prediction_store import get_latest_prediction

from .hospital_ops_shared import *


router = APIRouter(tags=["hospital-ops"])


@router.get("/emergency/feed")
async def emergency_feed(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    severity: str | None = Query(None),
    priority: str | None = Query(None),
    source: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, EMERGENCY_EVENTS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patientName", "symptoms", "location", "status", "severity", "priority", "source"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if priority:
        query["priority"] = priority
    if source:
        query["source"] = source
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "severity", "status", "priority"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/emergency/feed", status_code=201)
async def create_emergency_event(payload: EmergencyEventCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    repo = MongoRepository(db, EMERGENCY_EVENTS)
    oid = _require_hospital_id(payload.hospitalId)
    severity = _severity_from_text(payload.symptoms)
    priority = "High" if severity in ["Critical", "High"] else "Medium"
    doc = {
        "hospital": oid,
        "patientName": payload.patientName,
        "symptoms": payload.symptoms,
        "location": payload.location or "Unknown",
        "source": payload.source or "public",
        "severity": severity,
        "priority": priority,
        "status": "Unassigned",
        "imagingMeta": payload.imagingMeta,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/emergency/feed/{event_id}")
async def update_emergency_event(event_id: str, payload: EmergencyEventUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    repo = MongoRepository(db, EMERGENCY_EVENTS)
    oid = _as_object_id(event_id)
    update_data = _build_update(payload, ["status", "assignedDepartment", "assignedUnit", "notes", "imagingMeta"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Emergency event not found")
    return updated


@router.get("/emergency/ambulances")
async def emergency_ambulances(hospitalId: str = Query(...),
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    ambulance_repo = MongoRepository(db, AMBULANCES)
    assignment_repo = MongoRepository(db, AMBULANCE_ASSIGNMENTS)
    assignments = await assignment_repo.find_many({"hospital": _require_hospital_id(hospitalId)}, limit=200)
    ambulance_ids = [a.get("ambulanceId") for a in assignments if a.get("ambulanceId")]
    ambulances = await ambulance_repo.find_many({"ambulanceId": {"$in": ambulance_ids}}) if ambulance_ids else []
    return {
        "assignments": assignments,
        "ambulances": ambulances,
    }


@router.post("/emergency/dispatch", status_code=201)
async def emergency_dispatch(payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    assignment_repo = MongoRepository(db, AMBULANCE_ASSIGNMENTS)

    event_id = payload.get("eventId")
    ambulance_id = payload.get("ambulanceId")
    hospital_id = payload.get("hospitalId")
    if not hospital_id or not ambulance_id:
        raise HTTPException(status_code=400, detail="hospitalId and ambulanceId are required")

    hospital_oid = _require_hospital_id(hospital_id)
    eta = await _safe_run_model("predict_eta", {"location": payload.get("location", "")})
    eta_minutes = eta.get("eta_minutes") if isinstance(eta, dict) else None
    if eta_minutes is None:
        eta_minutes = payload.get("etaMinutes")
    if eta_minutes is None:
        eta_minutes = 12

    doc = {
        "ambulanceId": ambulance_id,
        "hospital": hospital_oid,
        "eventId": event_id,
        "status": "Active",
        "etaMinutes": eta_minutes,
        "pickup": payload.get("pickup"),
        "destination": payload.get("destination"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await assignment_repo.insert_one(doc)
    return created


@router.get("/emergency/intake")
async def emergency_intake(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    severity: str | None = Query(None),
    department: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    patient_repo = MongoRepository(db, PATIENTS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospitalId": oid, "status": "Intake"}
    search_query = _build_search(search, ["name", "dept", "condition", "severity", "status"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if department:
        query["dept"] = department
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "severity", "status", "dept"}, "createdAt")
    records = await patient_repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/emergency/intake", status_code=201)
async def create_emergency_intake(payload: EmergencyIntakeCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    patient_repo = MongoRepository(db, PATIENTS)
    oid = _require_hospital_id(payload.hospitalId)
    severity = payload.severity or _severity_from_text(payload.symptoms)
    department = payload.department or _department_from_symptoms(payload.symptoms)

    doc = {
        "hospitalId": oid,
        "name": payload.name,
        "age": payload.age,
        "gender": payload.gender,
        "dept": department,
        "condition": payload.symptoms,
        "severity": severity,
        "status": "Intake",
        "contact": payload.contact,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await patient_repo.insert_one(doc)
    return created


@router.patch("/emergency/intake/{patient_id}")
async def update_emergency_intake(patient_id: str, payload: EmergencyIntakeUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    patient_repo = MongoRepository(db, PATIENTS)
    oid = _as_object_id(patient_id)
    update_data: dict[str, Any] = {}
    if payload.status is not None:
        update_data["status"] = payload.status
    if payload.severity is not None:
        update_data["severity"] = payload.severity
    if payload.department is not None:
        update_data["dept"] = payload.department
    if payload.notes is not None:
        update_data["notes"] = payload.notes
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    update_data["updatedAt"] = datetime.utcnow()
    updated = await patient_repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient intake not found")
    return updated


