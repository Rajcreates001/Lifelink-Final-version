from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Depends
from app.core.auth import get_current_user, AuthContext

from app.db.database import get_db, require_db
from app.services.repository import MongoRepository
from app.services.collections import (
    OPD_QUEUE,
    OPD_APPOINTMENTS,
    OPD_CONSULTATIONS,
    OPD_DOCTORS
)

from .hospital_ops_shared import *


router = APIRouter(tags=["hospital-ops"])


@router.get("/opd/appointments")
async def list_opd_appointments(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    appointmentType: str | None = Query(None),
    channel: str | None = Query(None),
    season: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_APPOINTMENTS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patient", "doctor", "reason", "notes", "appointmentType", "channel"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if appointmentType:
        query["appointmentType"] = appointmentType
    if channel:
        query["channel"] = channel
    if season:
        query["seasonTag"] = season
    sort = _build_sort(
        sort_by,
        sort_dir,
        {"createdAt", "updatedAt", "time", "status", "patient", "doctor", "appointmentType", "channel"},
        "createdAt"
    )
    records = await repo.find_many(query, sort=sort, limit=200)
    for record in records:
        if not record.get("seasonTag") or record.get("slotHour") is None:
            appt_time = _parse_datetime(record.get("time"))
            record["seasonTag"] = record.get("seasonTag") or _season_tag(appt_time)
            if appt_time:
                record["slotHour"] = appt_time.hour
    return {"count": len(records), "data": records}


@router.get("/opd/appointments/insights")
async def opd_appointment_insights(hospitalId: str = Query(...),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_APPOINTMENTS)
    oid = _require_hospital_id(hospitalId)
    records = await repo.find_many({"hospital": oid}, sort=[("createdAt", -1)], limit=500)

    now = datetime.now(timezone.utc)
    horizon_7 = now + timedelta(days=7)
    horizon_30 = now + timedelta(days=30)

    weekday_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekday_counts = {day: 0 for day in weekday_order}
    season_counts: dict[str, int] = {}
    channel_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    hour_counts: dict[int, int] = {}
    next_7 = 0
    next_30 = 0

    for record in records:
        appt_time = _parse_datetime(record.get("time"))
        if appt_time:
            if now <= appt_time <= horizon_7:
                next_7 += 1
            if now <= appt_time <= horizon_30:
                next_30 += 1
            weekday_counts[appt_time.strftime("%a")] = weekday_counts.get(appt_time.strftime("%a"), 0) + 1
            hour_counts[appt_time.hour] = hour_counts.get(appt_time.hour, 0) + 1
            season = record.get("seasonTag") or _season_tag(appt_time) or "Unknown"
            season_counts[season] = season_counts.get(season, 0) + 1
        channel = record.get("channel") or "Walk-in"
        channel_counts[channel] = channel_counts.get(channel, 0) + 1
        appointment_type = record.get("appointmentType") or "New"
        type_counts[appointment_type] = type_counts.get(appointment_type, 0) + 1

    peak_day = max(weekday_counts.items(), key=lambda item: item[1])[0] if records else "Mon"
    peak_hour = max(hour_counts.items(), key=lambda item: item[1])[0] if hour_counts else None
    season_coverage_score = round((len([count for count in season_counts.values() if count > 0]) / 4) * 100) if records else 0
    demand_score = min(100, (len(records) * 4) + (next_7 * 6)) if records else 0

    return {
        "totalAppointments": len(records),
        "next7Days": next_7,
        "next30Days": next_30,
        "peakDay": peak_day,
        "peakHour": peak_hour,
        "demandScore": demand_score,
        "seasonCoverageScore": season_coverage_score,
        "weekdayVolume": [{"label": day, "value": weekday_counts.get(day, 0)} for day in weekday_order],
        "seasonCoverage": [{"label": season, "value": count} for season, count in season_counts.items()],
        "channelMix": [{"label": channel, "value": count} for channel, count in channel_counts.items()],
        "appointmentTypeMix": [{"label": key, "value": value} for key, value in type_counts.items()],
    }


@router.post("/opd/appointments", status_code=201)
async def create_opd_appointment(payload: OpdAppointmentCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_APPOINTMENTS)
    oid = _require_hospital_id(payload.hospitalId)
    appt_time = _parse_datetime(payload.time)
    season_tag = _season_tag(appt_time)
    doc = {
        "hospital": oid,
        "patient": payload.patient,
        "doctor": payload.doctor,
        "time": payload.time,
        "status": payload.status or "Scheduled",
        "appointmentType": payload.appointmentType or "New",
        "channel": payload.channel or "Walk-in",
        "expectedDurationMinutes": payload.expectedDurationMinutes or 20,
        "reason": payload.reason,
        "notes": payload.notes,
        "seasonTag": season_tag,
        "slotHour": appt_time.hour if appt_time else None,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/opd/appointments/{appointment_id}")
async def update_opd_appointment(appointment_id: str, payload: OpdAppointmentUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_APPOINTMENTS)
    oid = _as_object_id(appointment_id)
    update_data = _build_update(
        payload,
        ["patient", "doctor", "time", "status", "appointmentType", "channel", "expectedDurationMinutes", "reason", "notes"]
    )
    if payload.time:
        appt_time = _parse_datetime(payload.time)
        update_data["seasonTag"] = _season_tag(appt_time)
        update_data["slotHour"] = appt_time.hour if appt_time else None
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return updated


@router.delete("/opd/appointments/{appointment_id}")
async def delete_opd_appointment(appointment_id: str,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_APPOINTMENTS)
    oid = _as_object_id(appointment_id)
    deleted = await repo.delete_one({"_id": oid})
    if not deleted:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"status": "ok"}


@router.get("/opd/doctors")
async def list_opd_doctors(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    specialty: str | None = Query(None),
    availability: bool | None = Query(None),
    shift: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_DOCTORS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["name", "specialty", "schedule", "shift", "normalizedShift"])
    if search_query:
        query.update(search_query)
    if specialty:
        query["specialty"] = specialty
    if availability is not None:
        query["availability"] = availability
    if shift:
        query["normalizedShift"] = shift
    sort = _build_sort(
        sort_by,
        sort_dir,
        {"createdAt", "updatedAt", "name", "specialty", "availability", "normalizedShift"},
        "createdAt"
    )
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.get("/opd/doctors/coverage")
async def opd_doctor_coverage(hospitalId: str = Query(...),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_DOCTORS)
    oid = _require_hospital_id(hospitalId)
    records = await repo.find_many({"hospital": oid}, sort=[("createdAt", -1)], limit=200)
    hospital_doc = await _resolve_hospital_doc(db, hospitalId)
    expected_specialties = list({*([doc.get("specialty") for doc in records if doc.get("specialty")])})
    if hospital_doc and hospital_doc.get("specialties"):
        expected_specialties = list({*expected_specialties, *hospital_doc.get("specialties")})

    by_specialty: dict[str, int] = {}
    by_shift: dict[str, int] = {}
    available_count = 0
    available_by_specialty: dict[str, int] = {}

    for record in records:
        specialty = record.get("specialty") or "General"
        by_specialty[specialty] = by_specialty.get(specialty, 0) + 1
        if record.get("availability") is not False:
            available_count += 1
            available_by_specialty[specialty] = available_by_specialty.get(specialty, 0) + 1
        shift = record.get("normalizedShift") or record.get("shift") or "Unassigned"
        by_shift[shift] = by_shift.get(shift, 0) + 1

    coverage_gaps = [spec for spec in expected_specialties if by_specialty.get(spec, 0) == 0]
    availability_rate = round((available_count / max(1, len(records))) * 100, 1) if records else 0

    return {
        "total": len(records),
        "available": available_count,
        "availabilityRate": availability_rate,
        "specialtyCoverage": [
            {
                "specialty": spec,
                "total": by_specialty.get(spec, 0),
                "available": available_by_specialty.get(spec, 0),
            }
            for spec in expected_specialties
        ],
        "shiftCoverage": [{"shift": shift, "count": count} for shift, count in by_shift.items()],
        "coverageGaps": coverage_gaps,
    }


@router.post("/opd/doctors", status_code=201)
async def create_opd_doctor(payload: OpdDoctorCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_DOCTORS)
    oid = _require_hospital_id(payload.hospitalId)
    normalized_shift = _normalize_shift(payload.shift, payload.schedule)
    doc = {
        "hospital": oid,
        "name": payload.name,
        "specialty": payload.specialty,
        "availability": payload.availability if payload.availability is not None else True,
        "shift": payload.shift or normalized_shift,
        "schedule": payload.schedule,
        "normalizedShift": normalized_shift,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/opd/doctors/{doctor_id}")
async def update_opd_doctor(doctor_id: str, payload: OpdDoctorUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_DOCTORS)
    oid = _as_object_id(doctor_id)
    update_data = _build_update(payload, ["name", "specialty", "availability", "shift", "schedule"])
    if payload.shift is not None or payload.schedule is not None:
        update_data["normalizedShift"] = _normalize_shift(payload.shift, payload.schedule)
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return updated


@router.delete("/opd/doctors/{doctor_id}")
async def delete_opd_doctor(doctor_id: str,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_DOCTORS)
    oid = _as_object_id(doctor_id)
    deleted = await repo.delete_one({"_id": oid})
    if not deleted:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"status": "ok"}


@router.get("/opd/consultations")
async def list_opd_consultations(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_CONSULTATIONS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patient", "doctor", "notes", "summary", "status", "aiSummary"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    sort = _build_sort(
        sort_by,
        sort_dir,
        {"createdAt", "updatedAt", "date", "status", "patient", "doctor"},
        "createdAt"
    )
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.get("/opd/consultations/insights")
async def opd_consultation_insights(hospitalId: str = Query(...),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_CONSULTATIONS)
    oid = _require_hospital_id(hospitalId)
    records = await repo.find_many({"hospital": oid}, sort=[("createdAt", -1)], limit=400)

    summary_count = 0
    follow_up_count = 0
    keyword_counts: dict[str, int] = {}

    for record in records:
        summary = record.get("aiSummary") or record.get("summary")
        if summary:
            summary_count += 1
        follow_plan = record.get("followUpPlan") or ""
        if follow_plan and follow_plan != "No follow-up flagged":
            follow_up_count += 1
        for keyword in record.get("keywords") or []:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1

    top_keywords = sorted(keyword_counts.items(), key=lambda item: item[1], reverse=True)[:6]
    coverage_rate = round((summary_count / max(1, len(records))) * 100, 1) if records else 0

    return {
        "total": len(records),
        "summaryCoverage": coverage_rate,
        "followUps": follow_up_count,
        "topKeywords": [{"label": key, "value": value} for key, value in top_keywords],
    }


@router.post("/opd/consultations", status_code=201)
async def create_opd_consultation(payload: OpdConsultationCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_CONSULTATIONS)
    oid = _require_hospital_id(payload.hospitalId)
    summary = payload.summary or _summarize_note(payload.notes)
    ai_summary = payload.aiSummary or summary
    keywords = payload.keywords or _extract_keywords(payload.notes)
    follow_up = payload.followUpPlan or _follow_up_plan(payload.notes)
    doc = {
        "hospital": oid,
        "patient": payload.patient,
        "doctor": payload.doctor,
        "notes": payload.notes,
        "date": payload.date or datetime.now(timezone.utc).date().isoformat(),
        "status": payload.status or "Open",
        "summary": summary,
        "aiSummary": ai_summary,
        "keywords": keywords,
        "followUpPlan": follow_up,
        "followUpDate": payload.followUpDate,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/opd/consultations/{consultation_id}")
async def update_opd_consultation(consultation_id: str, payload: OpdConsultationUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_CONSULTATIONS)
    oid = _as_object_id(consultation_id)
    update_data = _build_update(
        payload,
        ["patient", "doctor", "notes", "date", "status", "summary", "aiSummary", "keywords", "followUpPlan", "followUpDate"]
    )
    if payload.notes is not None:
        summary = _summarize_note(payload.notes)
        update_data.setdefault("summary", summary)
        update_data.setdefault("aiSummary", summary)
        update_data.setdefault("keywords", _extract_keywords(payload.notes))
        update_data.setdefault("followUpPlan", _follow_up_plan(payload.notes))
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return updated


@router.delete("/opd/consultations/{consultation_id}")
async def delete_opd_consultation(consultation_id: str,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_CONSULTATIONS)
    oid = _as_object_id(consultation_id)
    deleted = await repo.delete_one({"_id": oid})
    if not deleted:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return {"status": "ok"}


@router.get("/opd/queue")
async def opd_queue(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, OPD_QUEUE)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patientName", "reason", "assignedDoctor", "status", "priority"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "priority", "status", "patientName"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    wait_times = []
    for idx, record in enumerate(records):
        priority = record.get("priority") or "Normal"
        predicted = _predict_wait_minutes(idx, priority)
        wait_times.append(predicted)
        check_in = _parse_datetime(record.get("checkInAt")) or _parse_datetime(record.get("createdAt"))
        record["position"] = idx + 1
        record["predictedWaitMinutes"] = predicted
        record["checkInAt"] = check_in or record.get("createdAt")
        if isinstance(check_in, datetime):
            record["etaAt"] = check_in + timedelta(minutes=predicted)

    avg_wait = round(sum(wait_times) / max(1, len(wait_times))) if wait_times else 0
    queue_pressure = min(100, len(records) * 7)
    return {
        "count": len(records),
        "avgWaitMinutes": avg_wait,
        "queuePressure": queue_pressure,
        "data": records,
    }


@router.post("/opd/queue", status_code=201)
async def create_opd_queue(payload: OpdQueueCreate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_QUEUE)
    oid = _require_hospital_id(payload.hospitalId)
    now = datetime.now(timezone.utc)
    doc = {
        "hospital": oid,
        "patientName": payload.patientName,
        "reason": payload.reason,
        "priority": payload.priority or "Normal",
        "status": "Waiting",
        "assignedDoctor": payload.assignedDoctor,
        "notes": payload.notes,
        "checkInAt": now,
        "createdAt": now,
        "updatedAt": now,
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/opd/queue/{queue_id}")
async def update_opd_queue(queue_id: str, payload: OpdQueueUpdate,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_QUEUE)
    oid = _as_object_id(queue_id)
    update_data = _build_update(payload, ["status", "priority", "assignedDoctor", "notes"])
    if payload.status:
        now = datetime.now(timezone.utc)
        if payload.status == "In Service":
            update_data["serviceStartedAt"] = now
        if payload.status in {"Completed", "Canceled"}:
            update_data["completedAt"] = now
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    return updated


@router.delete("/opd/queue/{queue_id}")
async def delete_opd_queue(queue_id: str,
    ctx: AuthContext = Depends(get_current_user)
):
    db = require_db()
    repo = MongoRepository(db, OPD_QUEUE)
    oid = _as_object_id(queue_id)
    deleted = await repo.delete_one({"_id": oid})
    if not deleted:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    return {"status": "ok"}


