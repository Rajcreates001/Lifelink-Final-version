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


@router.get("/reports")
async def list_reports(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    repo = MongoRepository(db, HOSPITAL_REPORTS)
    records = await repo.find_many({"hospital": hospital_oid}, sort=[("generatedAt", -1)], limit=50)
    by_key = {record.get("reportKey"): record for record in records if record.get("reportKey")}

    response = []
    for template in _report_templates():
        existing = by_key.get(template["key"])
        status = None
        if existing:
            status = existing.get("status") or ("Ready" if existing.get("content") else "Draft")
        response.append(
            {
                "id": existing.get("_id") if existing else None,
                "reportKey": template["key"],
                "name": template["name"],
                "status": status if existing else "Draft",
                "generatedAt": existing.get("generatedAt") if existing else None,
            }
        )

    return {"data": response}


@router.get("/reports/ingested")
async def list_ingested_reports(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    repo = MongoRepository(db, HOSPITAL_REPORTS)
    query: dict[str, Any] = {"hospital": hospital_oid, "reportKey": "ingested"}
    search_query = _build_search(search, ["name", "category", "summary", "status"])
    if search_query:
        query.update(search_query)
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    sort = _build_sort(sort_by, sort_dir, {"generatedAt", "createdAt", "status", "name", "category"}, "generatedAt")
    records = await repo.find_many(query, sort=sort, limit=100)
    return {"count": len(records), "data": records}


@router.post("/reports/ingest", status_code=201)
async def ingest_report(payload: ReportIngestCreate):
    db = get_db()
    hospital_oid = _require_hospital_id(payload.hospitalId)
    repo = MongoRepository(db, HOSPITAL_REPORTS)

    summary = _summarize_report_text(payload.content)
    now = datetime.utcnow()
    doc = {
        "hospital": hospital_oid,
        "reportKey": "ingested",
        "name": payload.name,
        "category": payload.category or "General",
        "status": "Ready",
        "generatedAt": now,
        "content": payload.content,
        "summary": summary,
        "createdAt": now,
        "updatedAt": now,
    }
    created = await repo.insert_one(doc)
    return created


@router.post("/reports/generate")
async def generate_report(payload: HospitalReportGenerate):
    db = get_db()
    hospital_oid = _require_hospital_id(payload.hospitalId)
    template = next((t for t in _report_templates() if t["key"] == payload.reportKey), None)
    if not template:
        raise HTTPException(status_code=400, detail="Unknown reportKey")

    repo = MongoRepository(db, HOSPITAL_REPORTS)
    report_data = await _build_report_content(db, payload.reportKey, hospital_oid, payload.hospitalId)

    now = datetime.utcnow()
    update_doc = {
        "hospital": hospital_oid,
        "reportKey": payload.reportKey,
        "name": template["name"],
        "status": "Ready",
        "generatedAt": now,
        "content": report_data.get("content") or "",
        "updatedAt": now,
    }

    existing = await repo.find_one({"hospital": hospital_oid, "reportKey": payload.reportKey})
    if existing:
        updated = await repo.update_one({"_id": _as_object_id(existing.get("_id"))}, {"$set": update_doc}, return_new=True)
        return updated

    update_doc["createdAt"] = now
    created = await repo.insert_one(update_doc)
    return created


@router.get("/reports/{report_id}/download")
async def download_report(report_id: str):
    db = get_db()
    repo = MongoRepository(db, HOSPITAL_REPORTS)
    oid = _as_object_id(report_id)
    record = await repo.find_one({"_id": oid})
    if not record:
        raise HTTPException(status_code=404, detail="Report not found")

    name = (record.get("name") or "report").strip().replace(" ", "_")
    content = record.get("content") or ""
    headers = {"Content-Disposition": f'attachment; filename="{name}.txt"'}
    return PlainTextResponse(content, headers=headers)


@router.get("/reports/{report_id}/summary")
async def report_summary(report_id: str):
    db = get_db()
    repo = MongoRepository(db, HOSPITAL_REPORTS)
    oid = _as_object_id(report_id)
    record = await repo.find_one({"_id": oid})
    if not record:
        raise HTTPException(status_code=404, detail="Report not found")

    summary = record.get("summary")
    if not summary:
        summary = _summarize_report_text(record.get("content") or "")
        await repo.update_one({"_id": oid}, {"$set": {"summary": summary, "updatedAt": datetime.utcnow()}})

    return {
        "id": record.get("_id"),
        "name": record.get("name"),
        "summary": summary,
    }


