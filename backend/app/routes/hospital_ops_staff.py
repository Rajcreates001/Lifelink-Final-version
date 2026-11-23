from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Query, Depends
from app.core.auth import get_current_user, AuthContext

from app.db.database import require_db
from app.services.repository import MongoRepository
from app.services.collections import (
    HOSPITAL_STAFF,
    PATIENTS
)

from .hospital_ops_shared import *


router = APIRouter(tags=["hospital-ops"])


@router.get("/staff")
async def list_staff(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    department: str | None = Query(None),
    role: str | None = Query(None),
    availability: bool | None = Query(None),
    shift: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, HOSPITAL_STAFF)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["name", "role", "department", "shift"])
    if search_query:
        query.update(search_query)
    if department:
        query["department"] = department
    if role:
        query["role"] = role
    if availability is not None:
        query["availability"] = availability
    if shift:
        query["shift"] = shift
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "name", "department", "role", "availability"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=300)
    return {"count": len(records), "data": records}


@router.get("/staff/skills/summary")
async def staff_skill_summary(hospitalId: str = Query(...),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, HOSPITAL_STAFF)
    oid = _require_hospital_id(hospitalId)
    staff = await repo.find_many({"hospital": oid}, limit=400)

    skill_counts: dict[str, int] = {}
    for member in staff:
        for skill in member.get("skillTags") or []:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    top_skills = sorted(skill_counts.items(), key=lambda item: item[1], reverse=True)
    recommendations = []
    if skill_counts and top_skills[0][1] < 3:
        recommendations.append("Increase staffing for critical skill coverage")
    if not skill_counts:
        recommendations.append("Add skill tags to staff profiles")

    return {
        "skills": [{"skill": k, "count": v} for k, v in top_skills],
        "recommendations": recommendations,
    }


@router.get("/staff/optimizer")
async def staff_optimizer(hospitalId: str = Query(...),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    staff_repo = MongoRepository(db, HOSPITAL_STAFF)
    patient_repo = MongoRepository(db, PATIENTS)
    hospital_oid = _require_hospital_id(hospitalId)
    staff = await staff_repo.find_many({"hospital": hospital_oid}, limit=400)
    patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=400)

    dept_load: dict[str, int] = {}
    for patient in patients:
        dept = patient.get("dept") or "General"
        dept_load[dept] = dept_load.get(dept, 0) + 1

    recommendations = []
    for dept, count in dept_load.items():
        available = len([s for s in staff if s.get("department") == dept and s.get("availability") is not False])
        if count > 20 and available < 6:
            recommendations.append({"department": dept, "action": "Add 2 staff", "reason": "High patient load"})
    if not recommendations:
        recommendations.append({"department": "All", "action": "Maintain staffing", "reason": "Balanced load"})

    return {"recommendations": recommendations}


@router.post("/staff", status_code=201)
async def create_staff(payload: StaffMemberCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, HOSPITAL_STAFF)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "name": payload.name,
        "role": payload.role,
        "department": payload.department,
        "shift": payload.shift or "Day",
        "availability": payload.availability if payload.availability is not None else True,
        "skillTags": payload.skillTags or [],
        "certifications": payload.certifications or [],
        "maxPatients": payload.maxPatients,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/staff/{staff_id}")
async def update_staff(staff_id: str, payload: StaffMemberUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, HOSPITAL_STAFF)
    oid = _as_object_id(staff_id)
    update_data = _build_update(payload, ["name", "role", "department", "shift", "availability", "skillTags", "certifications", "maxPatients"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return updated


@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, HOSPITAL_STAFF)
    deleted = await repo.delete_by_id(staff_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"message": "Staff member removed"}

# ─── Shift roster and leave requests (Staff Scheduling screen) ───────────────
STAFF_SCHEDULE = "staff_schedule"
STAFF_LEAVE_REQUESTS = "staff_leave_requests"


@router.post("/staff/optimizer")
async def staff_optimizer_post(payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user)
):
    """POST form of the optimizer used by the Staff Scheduling screen."""
    hospital_id = payload.get("hospitalId")
    if not hospital_id:
        raise HTTPException(status_code=400, detail="hospitalId is required")
    return await staff_optimizer(hospitalId=hospital_id, ctx=ctx)


@router.get("/schedule")
async def get_schedule(hospitalId: str = Query(...), date: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    """Day roster: every staff member on their assigned shift, plus shifts added
    for that date through POST /schedule."""
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    oid = _require_hospital_id(hospitalId)
    day = (date or datetime.now(timezone.utc).date().isoformat())[:10]
    staff = await MongoRepository(db, HOSPITAL_STAFF).find_many({"hospital": oid}, limit=400)
    added = await MongoRepository(db, STAFF_SCHEDULE).find_many({"hospital": oid, "date": day}, limit=400)
    roster = [
        {
            "_id": f"roster-{s.get('_id')}",
            "staffId": str(s.get("_id")),
            "staffName": s.get("name"),
            "department": s.get("department"),
            "role": s.get("role"),
            "shift": s.get("shift") or "Morning",
            "date": day,
            "source": "roster",
        }
        for s in staff if s.get("availability") is not False
    ]
    return {"count": len(roster) + len(added), "date": day, "data": roster + added}


@router.post("/schedule", status_code=201)
async def add_schedule_shift(payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    hospital_id = payload.get("hospitalId")
    staff_id = payload.get("staffId")
    if not hospital_id or not staff_id:
        raise HTTPException(status_code=400, detail="hospitalId and staffId are required")
    oid = _require_hospital_id(hospital_id)
    member = await MongoRepository(db, HOSPITAL_STAFF).find_one({"_id": _as_object_id(staff_id)}) or {}
    now = datetime.now(timezone.utc)
    doc = {
        "hospital": oid,
        "staffId": str(staff_id),
        "staffName": member.get("name") or payload.get("staffName") or "Staff",
        "role": member.get("role") or payload.get("role"),
        "department": payload.get("department") or member.get("department") or "General",
        "shift": payload.get("shift") or "Morning",
        "date": (payload.get("date") or now.date().isoformat())[:10],
        "source": "manual",
        "createdBy": ctx.user_id,
        "createdAt": now,
        "updatedAt": now,
    }
    return await MongoRepository(db, STAFF_SCHEDULE).insert_one(doc)


@router.get("/leave-requests")
async def list_leave_requests(hospitalId: str = Query(...), status: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    if status:
        query["status"] = status
    records = await MongoRepository(db, STAFF_LEAVE_REQUESTS).find_many(query, sort=[("createdAt", -1)], limit=200)
    return {"count": len(records), "data": records}


@router.post("/leave-requests", status_code=201)
async def create_leave_request(payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    hospital_id = payload.get("hospitalId")
    if not hospital_id:
        raise HTTPException(status_code=400, detail="hospitalId is required")
    now = datetime.now(timezone.utc)
    doc = {
        "hospital": _require_hospital_id(hospital_id),
        "staffId": payload.get("staffId"),
        "staffName": payload.get("staffName") or "Staff",
        "department": payload.get("department"),
        "startDate": payload.get("startDate") or now.date().isoformat(),
        "endDate": payload.get("endDate") or now.date().isoformat(),
        "reason": payload.get("reason") or "Personal",
        "status": "pending",
        "createdAt": now,
        "updatedAt": now,
    }
    return await MongoRepository(db, STAFF_LEAVE_REQUESTS).insert_one(doc)


@router.patch("/leave-requests/{leave_id}")
async def update_leave_request(leave_id: str, payload: dict = Body(default_factory=dict),
    ctx: AuthContext = Depends(get_current_user)
):
    status_value = str(payload.get("status") or "").lower()
    if status_value not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="status must be approved, rejected or pending")
    db = require_db()
    updated = await MongoRepository(db, STAFF_LEAVE_REQUESTS).update_one(
        {"_id": _as_object_id(leave_id)},
        {"$set": {"status": status_value, "reviewedBy": ctx.user_id, "updatedAt": datetime.now(timezone.utc)}},
        return_new=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return updated
