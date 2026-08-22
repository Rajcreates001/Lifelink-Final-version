from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import require_roles
from app.core.rbac import AuthContext
from app.db.mongo import get_db
from app.services.collections import ANALYTICS_EVENTS, USERS
from app.services.repository import MongoRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["history"])


def _safe_object_id(value: str) -> ObjectId | str:
    try:
        return ObjectId(str(value))
    except Exception:
        return str(value)


def _as_object_id(value: str | None) -> ObjectId | None:
    try:
        return ObjectId(str(value)) if value else None
    except Exception:
        return None


def _format_event(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw analytics_events document into a standard activity record."""
    oid = raw.get("_id")
    return {
        "id": str(oid) if oid else None,
        "user": str(raw.get("user", "")),
        "module": raw.get("module", "general"),
        "action": raw.get("action", "unknown"),
        "category": _categorize_action(raw.get("module", ""), raw.get("action", "")),
        "timestamp": raw.get("createdAt", raw.get("timestamp", datetime.utcnow())),
        "metadata": raw.get("metadata") or {},
        "ai_confidence": raw.get("metadata", {}).get("confidence") or raw.get("ai_confidence"),
        "severity": raw.get("metadata", {}).get("severity") or raw.get("severity"),
        "duration_ms": raw.get("metadata", {}).get("duration_ms") or raw.get("duration_ms"),
        "status": raw.get("metadata", {}).get("status") or raw.get("status", "completed"),
        "description": _generate_description(raw),
        "icon": _icon_for_action(raw.get("module", ""), raw.get("action", "")),
    }


def _categorize_action(module: str, action: str) -> str:
    """Assign a high-level category based on module + action."""
    module_lower = (module or "").lower()
    action_lower = (action or "").lower()

    # Emergency / SOS
    if module_lower in ("sos", "emergency") or "sos" in action_lower or "emergency" in action_lower:
        return "Emergency"
    # Health / AI predictions
    if module_lower in ("ai_health", "health", "prediction") or "predict" in action_lower or "risk" in action_lower:
        return "AI Health"
    # Donor related
    if module_lower in ("donor", "donation", "find_donors") or "donor" in action_lower or "donation" in action_lower:
        return "Donor"
    # Profile changes
    if module_lower in ("profile", "account") or "profile" in action_lower or "update" in action_lower:
        return "Profile"
    # Uploads / documents
    if module_lower in ("upload", "document", "record", "ai_records") or "upload" in action_lower or "file" in action_lower:
        return "Uploads"
    # Searches
    if module_lower in ("search", "query") or "search" in action_lower or "query" in action_lower:
        return "Search"
    # AI / system
    if module_lower in ("ai", "system", "agent") or "ai" in action_lower or "analysis" in action_lower:
        return "AI Analysis"
    # Notifications
    if module_lower in ("notification", "alert") or "notif" in action_lower or "alert" in action_lower:
        return "Notification"
    # Requests
    if module_lower in ("request", "resource") or "request" in action_lower or "resource" in action_lower:
        return "Request"

    return "General"


def _icon_for_action(module: str, action: str) -> str:
    """Map an action to a Font Awesome icon class."""
    module_lower = (module or "").lower()
    action_lower = (action or "").lower()

    if "sos" in module_lower or "emergency" in module_lower or "sos" in action_lower:
        return "fa-ambulance"
    if "donor" in module_lower or "donation" in module_lower:
        return "fa-hand-holding-heart"
    if "predict" in module_lower or "risk" in module_lower or "health" in module_lower:
        return "fa-heartbeat"
    if "profile" in module_lower or "update" in action_lower:
        return "fa-user-edit"
    if "upload" in module_lower or "file" in module_lower or "record" in module_lower:
        return "fa-file-upload"
    if "search" in module_lower or "query" in action_lower:
        return "fa-search"
    if "notif" in module_lower or "alert" in module_lower:
        return "fa-bell"
    if "request" in module_lower:
        return "fa-hand-holding-medical"
    if "ai" in module_lower or "analysis" in action_lower or "chat" in action_lower:
        return "fa-robot"
    if "login" in action_lower or "auth" in module_lower:
        return "fa-sign-in-alt"

    return "fa-circle"


def _generate_description(raw: dict[str, Any]) -> str:
    """Generate a human-readable description from the raw event."""
    module = raw.get("module", "")
    action = raw.get("action", "")
    meta = raw.get("metadata") or {}

    if action == "triggered" and module == "sos":
        severity = meta.get("severity", "Unknown")
        return f"SOS emergency triggered — {severity} severity"
    if action == "ranked" and "donor" in module:
        count = meta.get("count", 0)
        return f"Donor search found {count} compatible matches"
    if action == "notified" and "donor" in module:
        return "Donor notified of availability request"
    if action == "uploaded" or "upload" in action:
        filename = meta.get("filename", "document")
        return f"Uploaded {filename}"
    if action == "predict_risk" or "predict" in action:
        level = meta.get("risk_level", "Unknown")
        score = meta.get("risk_score", "")
        return f"AI health risk assessment: {level}" + (f" ({score}/100)" if score else "")
    if "profile" in action or "update" in action:
        fields = meta.get("changed_fields", [])
        if isinstance(fields, list) and fields:
            return f"Profile updated: {', '.join(fields[:3])}"
        return "Profile information updated"
    if action == "search" or "query" in action:
        q = meta.get("query", "")
        return f"Searched: {q[:60]}..." if len(q) > 60 else f"Searched: {q}" if q else "Performed a search"
    if action == "login":
        return "Logged into LifeLink"
    if action == "chat" or action == "ask":
        q = meta.get("query", "")
        return f"Asked AI: {q[:60]}..." if len(q) > 60 else f"Asked AI: {q}" if q else "Interacted with LifeLink AI"

    return f"{module} — {action}"


@router.get("/{user_id}")
async def list_activity_history(
    user_id: str,
    ctx: AuthContext = Depends(require_roles("public", "hospital", "government", "ambulance")),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    module: str | None = Query(None, description="Filter by module"),
    action: str | None = Query(None, description="Filter by action type"),
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search text across descriptions and metadata"),
    from_date: str | None = Query(None, description="Start date (ISO format)"),
    to_date: str | None = Query(None, description="End date (ISO format)"),
) -> dict:
    """
    List paginated activity history for a user with full-text search, module/category filters,
    date range filtering, and AI summary generation.
    """
    # Permission: users can only view their own history
    if str(ctx.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    db = get_db()
    repo = MongoRepository(db, ANALYTICS_EVENTS)

    # Build query filter
    query_filter: dict[str, Any] = {"user": _safe_object_id(user_id)}

    if module:
        query_filter["module"] = module
    if action:
        query_filter["action"] = action
    if from_date or to_date:
        date_filter: dict[str, Any] = {}
        if from_date:
            try:
                date_filter["$gte"] = datetime.fromisoformat(from_date)
            except ValueError:
                logger.debug("Suppressed ValueError in %s", __name__)
        if to_date:
            try:
                date_filter["$lte"] = datetime.fromisoformat(to_date)
            except ValueError:
                logger.debug("Suppressed ValueError in %s", __name__)
        if date_filter:
            query_filter["createdAt"] = date_filter

    # For text search, we search metadata fields
    if search:
        query_filter["$or"] = [
            {"module": {"$regex": search, "$options": "i"}},
            {"action": {"$regex": search, "$options": "i"}},
            {"metadata.query": {"$regex": search, "$options": "i"}},
            {"metadata.filename": {"$regex": search, "$options": "i"}},
            {"metadata.detail": {"$regex": search, "$options": "i"}},
            {"metadata.risk_level": {"$regex": search, "$options": "i"}},
        ]

    total = await repo.collection.count_documents(query_filter)

    # Paginate: fetch enough items to cover the requested page, then slice
    fetch_limit = page * limit
    raw_events = await repo.find_many(
        query_filter,
        sort=[("createdAt", -1)],
        limit=fetch_limit
    )
    skip = (page - 1) * limit
    events = [_format_event(e) for e in raw_events[skip:skip + limit]]

    # Build AI context summary from the events
    categories = {}
    module_counts = {}
    for e in events:
        cat = e.get("category", "General")
        categories[cat] = categories.get(cat, 0) + 1
        mod = e.get("module", "general")
        module_counts[mod] = module_counts.get(mod, 0) + 1

    # Also fetch module context from user profile
    user_repo = MongoRepository(db, USERS)
    user = await user_repo.find_one({"_id": _as_object_id(user_id)})
    profile_context = {}
    if user:
        hr = user.get("publicProfile", {}).get("healthRecords", {})
        profile_context = {
            "blood_group": hr.get("bloodGroup") or "Unknown",
            "age": hr.get("age") or "Unknown",
            "risk_conditions": hr.get("conditions") or [],
        }

    return {
        "events": events,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": max(1, (total + limit - 1) // limit),
        },
        "summary": {
            "total_events": total,
            "categories": categories,
            "module_counts": module_counts,
            "timeframe": {
                "newest": events[0]["timestamp"] if events else None,
                "oldest": events[-1]["timestamp"] if events else None,
            },
        },
        "profile_context": profile_context,
    }


@router.get("/{user_id}/{activity_id}")
async def get_activity_detail(
    user_id: str,
    activity_id: str,
    ctx: AuthContext = Depends(require_roles("public", "hospital", "government", "ambulance")),
) -> dict:
    """
    Get full detail for a single activity record, including complete context,
    AI reasoning, metadata, and related events.
    """
    # Permission check
    if str(ctx.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    db = get_db()
    repo = MongoRepository(db, ANALYTICS_EVENTS)

    oid = _as_object_id(activity_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid activity ID")

    raw = await repo.find_one({"_id": oid, "user": _safe_object_id(user_id)})
    if not raw:
        raise HTTPException(status_code=404, detail="Activity not found")

    event = _format_event(raw)
    meta = raw.get("metadata") or {}

    # Expand metadata into structured sections for the detail modal
    detail = {
        **event,
        "full_context": {
            "input": meta.get("input") or meta.get("query") or meta.get("message", ""),
            "output": meta.get("output") or meta.get("answer") or meta.get("result", ""),
            "ai_reasoning": meta.get("reasoning") or meta.get("ai_reasoning", []),
            "confidence": meta.get("confidence") or meta.get("ai_confidence"),
            "evidence": meta.get("evidence") or meta.get("references", []),
            "recommendations": meta.get("recommendations", []),
            "model_used": meta.get("model") or meta.get("model_name"),
            "execution_time_ms": meta.get("duration_ms"),
            "severity": meta.get("severity"),
            "status": meta.get("status"),
        },
        "related_records": meta.get("related_records") or meta.get("related", []),
        "changed_fields": meta.get("changed_fields") or meta.get("fields", []),
        "previous_values": meta.get("previous_values"),
        "new_values": meta.get("new_values"),
    }

    # Fetch related events (same module, same day)
    try:
        created_at = raw.get("createdAt")
        if created_at:
            related_query = {
                "user": _safe_object_id(user_id),
                "module": raw.get("module"),
                "_id": {"$ne": oid},
            }
            related_raw = await repo.find_many(
                related_query,
                sort=[("createdAt", -1)],
                limit=5
            )
            detail["related_events"] = [_format_event(r) for r in related_raw]
    except Exception:
        detail["related_events"] = []

    return detail


@router.post("/log")
async def log_activity(
    payload: dict,
    ctx: AuthContext = Depends(require_roles("public", "hospital", "government", "ambulance")),
) -> dict:
    """
    Log a new activity event. Accepts the same format as the internal _log_activity helper.
    This allows front-end modules to log their own activities directly.
    """
    db = get_db()
    repo = MongoRepository(db, ANALYTICS_EVENTS)

    module = payload.get("module", "general")
    action = payload.get("action", "unknown")
    metadata = payload.get("metadata") or {}

    doc = {
        "user": _safe_object_id(ctx.user_id),
        "module": module,
        "action": action,
        "metadata": metadata,
        "createdAt": datetime.utcnow(),
        "source": "frontend",
    }

    inserted = await repo.insert_one(doc)
    return {
        "id": str(inserted.get("_id")),
        "status": "logged",
    }
