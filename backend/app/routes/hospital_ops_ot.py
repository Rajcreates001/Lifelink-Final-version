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


@router.get("/ot/surgeries")
async def list_ot_surgeries(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OT_SURGERIES)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patient", "procedure", "status"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "time", "status", "patient", "procedure"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/ot/surgeries", status_code=201)
async def create_ot_surgery(payload: OTSurgeryCreate):
    db = get_db()
    repo = MongoRepository(db, OT_SURGERIES)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "patient": payload.patient,
        "procedure": payload.procedure,
        "time": payload.time,
        "status": payload.status or "Scheduled",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/ot/surgeries/{surgery_id}")
async def update_ot_surgery(surgery_id: str, payload: OTSurgeryUpdate):
    db = get_db()
    repo = MongoRepository(db, OT_SURGERIES)
    oid = _as_object_id(surgery_id)
    update_data = _build_update(payload, ["patient", "procedure", "time", "status"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Surgery not found")
    return updated


@router.get("/ot/allocations")
async def list_ot_allocations(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    department: str | None = Query(None),
    patient_load: str | None = Query(None),
    shift: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OT_ALLOCATIONS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["department", "patient_load", "shift", "allocation_decision"])
    if search_query:
        query.update(search_query)
    if department:
        query["department"] = department
    if patient_load:
        query["patient_load"] = patient_load
    if shift:
        query["shift"] = shift
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "department", "patient_load", "shift"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=50)
    return {"count": len(records), "data": records}


@router.post("/ot/allocations", status_code=201)
async def create_ot_allocation(payload: OTAllocationCreate):
    db = get_db()
    repo = MongoRepository(db, OT_ALLOCATIONS)
    oid = _require_hospital_id(payload.hospitalId)

    allocation_decision = None
    celery_app.send_task(
        "system.generate_predictions",
        args=[
            "predict_staff_alloc",
            {
                "department": payload.department,
                "patient_load": payload.patient_load,
                "shift": payload.shift,
            },
        ],
    )
    cached = await get_latest_prediction("predict_staff_alloc")
    if cached and isinstance(cached.get("result"), dict):
        allocation_decision = cached["result"].get("allocation_decision") or cached["result"].get("decision")

    if not allocation_decision:
        allocation_decision = (
            f"Allocate a core team for {payload.department} ({payload.shift} shift) "
            f"with {payload.patient_load.lower()} patient load."
        )

    doc = {
        "hospital": oid,
        "department": payload.department,
        "patient_load": payload.patient_load,
        "shift": payload.shift,
        "allocation_decision": allocation_decision,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    created = await repo.insert_one(doc)
    return created


