from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.mongo import get_db
from app.services.collections import HEALTH_RECORDS, PREDICTIONS
from app.services.repository import MongoRepository

router = APIRouter(tags=["health"])


class VitalsIngestRequest(BaseModel):
    userId: str
    source: str | None = "manual"
    heart_rate: int | None = None
    blood_pressure: int | None = None
    oxygen: int | None = None
    temperature: float | None = None
    steps: int | None = None
    note: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class VitalsSample(BaseModel):
    source: str | None = "wearable"
    heart_rate: int | None = None
    blood_pressure: int | None = None
    oxygen: int | None = None
    temperature: float | None = None
    steps: int | None = None
    note: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class WearableIngestRequest(BaseModel):
    userId: str
    payloads: list[VitalsSample]


def _as_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid ID format") from exc


@router.get("/")
async def root() -> dict:
    return {
        "status": "ok",
        "service": "lifelink-fastapi",
        "docs": "/docs",
        "health": "/health",
    }


@router.get("/health")
async def health() -> dict:
    """
    Basic health check — returns status immediately.
    Use /health/ready for a full dependency check.
    """
    return {
        "status": "ok",
        "service": "lifelink-fastapi",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/health/ready")
async def health_ready() -> dict:
    """
    Readiness probe — checks all dependencies before reporting healthy.
    Each dependency is checked individually; one failure doesn't cascade.
    Returns 503 if critical dependencies are down.
    """
    import asyncio
    from app.core.config import get_settings

    settings = get_settings()
    checks = {}
    all_healthy = True

    # 1. MongoDB / PostgreSQL check
    try:
        from app.db.mongo import get_db
        from sqlalchemy import text
        db = get_db()
        async with db() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)[:100]}
        all_healthy = False

    # 2. ML Model check (try loading a basic prediction)
    try:
        import joblib
        import os
        model_path = os.path.join(os.path.dirname(__file__), "..", "ml", "health_risk_model.joblib")
        if os.path.exists(model_path):
            checks["ml_models"] = {"status": "healthy"}
        else:
            checks["ml_models"] = {"status": "degraded", "note": "Model files not loaded at startup"}
    except Exception as e:
        checks["ml_models"] = {"status": "degraded", "error": str(e)[:100]}

    # 3. LLM endpoint connectivity check
    try:
        import httpx
        base_url = settings.openai_base_url
        if not base_url:
            checks["llm_endpoint"] = {"status": "degraded", "note": "OPENAI_BASE_URL not configured"}
            all_healthy = False
        else:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{base_url}/models")
                if resp.status_code < 500:
                    checks["llm_endpoint"] = {"status": "healthy"}
                else:
                    checks["llm_endpoint"] = {"status": "degraded", "note": f"HTTP {resp.status_code}"}
    except Exception as e:
        checks["llm_endpoint"] = {"status": "degraded", "error": str(e)[:80]}

    status_code = 200 if all_healthy else 503
    raise HTTPException(status_code=status_code, detail={
        "status": "ready" if all_healthy else "degraded",
        "service": "lifelink-fastapi",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": checks,
    })


@router.post("/health/vitals", status_code=201)
async def ingest_vitals(payload: VitalsIngestRequest):
    db = get_db()
    repo = MongoRepository(db, HEALTH_RECORDS)

    doc = {
        "user": _as_object_id(payload.userId),
        "record_type": "vitals",
        "source": payload.source or "manual",
        "metrics": {
            "heart_rate": payload.heart_rate,
            "blood_pressure": payload.blood_pressure,
            "oxygen": payload.oxygen,
            "temperature": payload.temperature,
            "steps": payload.steps,
        },
        "note": payload.note,
        "location": {"lat": payload.latitude, "lng": payload.longitude}
        if payload.latitude is not None and payload.longitude is not None
        else None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    created = await repo.insert_one(doc)
    return created


@router.post("/health/wearables/ingest", status_code=201)
async def ingest_wearables(payload: WearableIngestRequest):
    db = get_db()
    repo = MongoRepository(db, HEALTH_RECORDS)

    inserted = 0
    for entry in payload.payloads:
        doc = {
            "user": _as_object_id(payload.userId),
            "record_type": "vitals",
            "source": entry.source or "wearable",
            "metrics": {
                "heart_rate": entry.heart_rate,
                "blood_pressure": entry.blood_pressure,
                "oxygen": entry.oxygen,
                "temperature": entry.temperature,
                "steps": entry.steps,
            },
            "note": entry.note,
            "location": {"lat": entry.latitude, "lng": entry.longitude}
            if entry.latitude is not None and entry.longitude is not None
            else None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        await repo.insert_one(doc)
        inserted += 1

    return {"status": "ok", "inserted": inserted}


@router.get("/health/vitals/latest/{user_id}")
async def latest_vitals(user_id: str):
    db = get_db()
    repo = MongoRepository(db, HEALTH_RECORDS)
    oid = _as_object_id(user_id)
    latest = await repo.find_many({"user": oid, "record_type": "vitals"}, sort=[("createdAt", -1)], limit=1)
    return latest[0] if latest else {}


@router.get("/health/risk/history/{user_id}")
async def risk_history(user_id: str):
    db = get_db()
    repo = MongoRepository(db, PREDICTIONS)
    oid = _as_object_id(user_id)
    records = await repo.find_many({"user": oid, "prediction_type": "health_risk"}, sort=[("createdAt", -1)], limit=12)
    return {"count": len(records), "data": records}


@router.get("/health/records/{user_id}")
async def health_records(user_id: str):
    db = get_db()
    repo = MongoRepository(db, HEALTH_RECORDS)
    oid = _as_object_id(user_id)
    records = await repo.find_many({"user": oid, "record_type": {"$in": ["medical_record", "report_analysis"]}}, sort=[("createdAt", -1)], limit=50)
    return {"count": len(records), "data": records}
