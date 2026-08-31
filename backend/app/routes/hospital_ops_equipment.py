from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Depends
from app.core.auth import get_current_user, AuthContext

from app.db.database import get_db, require_db
from app.services.repository import MongoRepository
from app.services.collections import (
    EQUIPMENT_INVENTORY
)

from .hospital_ops_shared import *


router = APIRouter(tags=["hospital-ops"])


@router.get("/equipment")
async def equipment_list(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    category: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, EQUIPMENT_INVENTORY)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["name", "category", "status"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "name", "category", "quantity", "status"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/equipment", status_code=201)
async def create_equipment(payload: EquipmentCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, EQUIPMENT_INVENTORY)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "name": payload.name,
        "category": payload.category,
        "quantity": payload.quantity,
        "status": payload.status or "Available",
        "minThreshold": payload.minThreshold or 1,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/equipment/{equipment_id}")
async def update_equipment(equipment_id: str, payload: EquipmentUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, EQUIPMENT_INVENTORY)
    oid = _as_object_id(equipment_id)
    update_data = _build_update(payload, ["quantity", "status", "minThreshold"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return updated
