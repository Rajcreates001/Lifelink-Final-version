from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Depends
from app.core.auth import get_current_user, AuthContext

from app.db.mongo import get_db
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
    db = get_db()
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
    db = get_db()
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
    db = get_db()
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
    db = get_db()
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
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/staff/{staff_id}")
async def update_staff(staff_id: str, payload: StaffMemberUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = get_db()
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
    db = get_db()
    repo = MongoRepository(db, HOSPITAL_STAFF)
    deleted = await repo.delete_by_id(staff_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"message": "Staff member removed"}


