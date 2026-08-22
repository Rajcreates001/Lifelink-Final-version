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


@router.get("/emergency/bed-allocation")
async def bed_allocation_list(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    bedType: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, BED_ALLOCATIONS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patientName", "bedType", "status"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if bedType:
        query["bedType"] = bedType
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "status", "bedType"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/emergency/bed-allocation", status_code=201)
async def bed_allocation_create(payload: BedAllocationCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    repo = MongoRepository(db, BED_ALLOCATIONS)
    hospital_oid = _require_hospital_id(payload.hospitalId)
    hospital_doc = await _resolve_hospital_doc(db, payload.hospitalId)
    beds = _bed_breakdown(hospital_doc.get("beds") if hospital_doc else {})

    bed_type = payload.bedType
    available = beds.get(bed_type.lower(), {}).get("available", 0) if isinstance(bed_type, str) else beds["available"]
    if available <= 0 and not payload.override:
        raise HTTPException(status_code=409, detail="No beds available for selected type")

    doc = {
        "hospital": hospital_oid,
        "patientName": payload.patientName,
        "bedType": payload.bedType,
        "status": "Assigned",
        "notes": payload.notes,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/emergency/bed-allocation/{allocation_id}")
async def bed_allocation_update(allocation_id: str, payload: BedAllocationUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
    repo = MongoRepository(db, BED_ALLOCATIONS)
    oid = _as_object_id(allocation_id)
    update_data = _build_update(payload, ["bedType", "status", "notes"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Bed allocation not found")
    return updated


