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


@router.get("/ceo/global-metrics")
async def ceo_global_metrics(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    patient_repo = MongoRepository(db, PATIENTS)
    staff_repo = MongoRepository(db, HOSPITAL_STAFF)
    invoice_repo = MongoRepository(db, BILLING_INVOICES)
    emergency_repo = MongoRepository(db, EMERGENCY_EVENTS)
    assignment_repo = MongoRepository(db, AMBULANCE_ASSIGNMENTS)
    hospital_repo = MongoRepository(db, HOSPITALS)
    benchmark_repo = MongoRepository(db, HOSPITAL_BENCHMARKS)

    patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=500)
    staff = await staff_repo.find_many({"hospital": hospital_oid}, limit=400)
    emergencies = await emergency_repo.find_many({"hospital": hospital_oid}, limit=200)
    assignments = await assignment_repo.find_many({"hospital": hospital_oid}, limit=200)
    hospital_doc = await _resolve_hospital_doc(db, hospitalId)

    dept_counts: dict[str, int] = {}
    for patient in patients:
        dept = patient.get("dept") or "General"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    beds = _bed_breakdown(hospital_doc.get("beds") if hospital_doc else {})

    now = datetime.utcnow()
    day_cutoff = now - timedelta(days=1)
    week_cutoff = now - timedelta(days=7)
    month_cutoff = now - timedelta(days=30)

    invoices = await invoice_repo.find_many({"hospital": hospital_oid}, limit=400)
    daily_total = 0.0
    weekly_total = 0.0
    monthly_total = 0.0
    for inv in invoices:
        created_at = inv.get("createdAt") or now
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = now
        amount = float(inv.get("amount") or 0)
        if created_at >= month_cutoff:
            monthly_total += amount
        if created_at >= week_cutoff:
            weekly_total += amount
        if created_at >= day_cutoff:
            daily_total += amount

    staff_available = len([s for s in staff if s.get("availability") is not False])
    staff_total = len(staff)

    emergency_active = [e for e in emergencies if (e.get("status") or "").lower() not in ["resolved", "closed"]]
    emergency_critical = len([e for e in emergency_active if e.get("severity") == "Critical"])

    inbound = len([a for a in assignments if (a.get("status") or "").lower() in ["active", "en route", "arriving"]])
    outbound = len([a for a in assignments if (a.get("status") or "").lower() in ["completed", "resolved", "closed"]])

    demand_forecast = await _safe_run_model(
        "predict_bed_forecast",
        {
            "emergency_count": len(emergency_active),
            "disease_case_count": len(patients),
            "current_bed_occupancy": beds["occupied"],
            "hospital_id": 1,
        },
    )

    anomalies = []
    if beds["total"] and beds["occupied"] / max(1, beds["total"]) > 0.9:
        anomalies.append("Bed occupancy above 90%")
    if staff_total and staff_available / max(1, staff_total) < 0.65:
        anomalies.append("Staff availability below 65%")
    if emergency_critical >= 3:
        anomalies.append("Multiple critical emergencies detected")

    occupancy_rate = round((beds["occupied"] / max(1, beds["total"])) * 100, 1) if beds["total"] else 0
    staff_coverage = round((staff_available / max(1, staff_total)) * 100, 1) if staff_total else 0
    revenue_trend = "Up" if weekly_total > daily_total * 3 else "Down" if weekly_total < daily_total else "Stable"

    hospitals = await hospital_repo.find_many({}, limit=200)
    occ_rates = []
    for hospital in hospitals:
        hbeds = _bed_breakdown(hospital.get("beds") if hospital else {})
        if hbeds["total"]:
            occ_rates.append(hbeds["occupied"] / max(1, hbeds["total"]))
    internal_benchmark = {
        "avgOccupancyRate": round((sum(occ_rates) / max(1, len(occ_rates))) * 100, 1) if occ_rates else 0,
        "hospitalCount": len(hospitals),
    }

    region = None
    if hospital_doc:
        location = hospital_doc.get("location") if isinstance(hospital_doc.get("location"), dict) else {}
        region = location.get("state") or location.get("city")
    region = region or "global"
    external = await benchmark_repo.find_many({"region": region}, sort=[("createdAt", -1)], limit=50)
    external_benchmarks = {}
    for item in external:
        metric = item.get("metric")
        if not metric:
            continue
        external_benchmarks.setdefault(metric, []).append(float(item.get("value") or 0))
    external_benchmarks = {
        metric: round(sum(values) / max(1, len(values)), 2)
        for metric, values in external_benchmarks.items()
    }

    return {
        "patients": {
            "total": len(patients),
            "by_department": dept_counts,
        },
        "beds": beds,
        "revenue": {
            "daily": round(daily_total, 2),
            "weekly": round(weekly_total, 2),
            "monthly": round(monthly_total, 2),
        },
        "staff": {
            "available": staff_available,
            "total": staff_total,
        },
        "emergency": {
            "active": len(emergency_active),
            "critical": emergency_critical,
        },
        "ambulance": {
            "inbound": inbound,
            "outbound": outbound,
        },
        "ai": {
            "forecast": demand_forecast or {},
            "anomalies": anomalies,
        },
        "kpiSignals": {
            "occupancyRate": occupancy_rate,
            "staffCoverage": staff_coverage,
            "revenueTrend": revenue_trend,
            "emergencyLoad": len(emergency_active),
        },
        "benchmarks": {
            "region": region,
            "internal": internal_benchmark,
            "external": external_benchmarks,
        },
    }


@router.post("/ceo/benchmarks", status_code=201)
async def create_benchmark(payload: BenchmarkCreate):
    db = get_db()
    repo = MongoRepository(db, HOSPITAL_BENCHMARKS)
    doc = {
        "region": payload.region,
        "metric": payload.metric,
        "value": payload.value,
        "source": payload.source or "external_feed",
        "createdAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.get("/ceo/benchmarks")
async def list_benchmarks(
    region: str = Query("global"),
    search: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    repo = MongoRepository(db, HOSPITAL_BENCHMARKS)
    query: dict[str, Any] = {"region": region}
    search_query = _build_search(search, ["metric", "source"])
    if search_query:
        query.update(search_query)
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "metric", "value"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=100)
    return {"count": len(records), "data": records}


@router.get("/ceo/ai-insights")
async def ceo_ai_insights(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    patient_repo = MongoRepository(db, PATIENTS)
    staff_repo = MongoRepository(db, HOSPITAL_STAFF)
    emergency_repo = MongoRepository(db, EMERGENCY_EVENTS)
    invoice_repo = MongoRepository(db, BILLING_INVOICES)
    expense_repo = MongoRepository(db, FINANCE_EXPENSES)

    patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=500)
    staff = await staff_repo.find_many({"hospital": hospital_oid}, limit=400)
    emergencies = await emergency_repo.find_many({"hospital": hospital_oid}, limit=200)
    invoices = await invoice_repo.find_many({"hospital": hospital_oid}, limit=300)
    expenses = await expense_repo.find_many({"hospital": hospital_oid}, limit=300)

    dept_counts: dict[str, int] = {}
    for patient in patients:
        dept = patient.get("dept") or "General"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    top_departments = sorted(dept_counts.items(), key=lambda item: item[1], reverse=True)
    overloaded = [dept for dept, count in top_departments if count >= 20]

    staff_available = len([s for s in staff if s.get("availability") is not False])
    staff_total = len(staff)
    emergency_active = [e for e in emergencies if (e.get("status") or "").lower() not in ["resolved", "closed"]]

    forecast = await _safe_run_model(
        "predict_bed_forecast",
        {
            "emergency_count": len(emergency_active),
            "disease_case_count": len(patients),
            "current_bed_occupancy": max(1, len(patients)),
            "hospital_id": 1,
        },
    )
    forecast_meta = forecast.get("meta") if isinstance(forecast, dict) else None

    staff_suggestion = (
        "Increase ER coverage" if staff_total and staff_available / staff_total < 0.7 else "Maintain current staffing"
    )
    bed_strategy = "Reserve ICU beds for predicted critical inflow" if len(emergency_active) > 4 else "Maintain standard allocation"
    emergency_risk = "High" if len(emergency_active) >= 6 else "Moderate" if len(emergency_active) >= 3 else "Low"

    revenue_total = sum(float(inv.get("amount") or 0) for inv in invoices)
    expense_total = sum(float(exp.get("amount") or 0) for exp in expenses)
    margin = revenue_total - expense_total
    cost_pressure = round((expense_total / max(1, revenue_total)) * 100, 1) if revenue_total else 0.0
    expense_by_category: dict[str, float] = {}
    for exp in expenses:
        category = exp.get("category") or "General"
        expense_by_category[category] = expense_by_category.get(category, 0) + float(exp.get("amount") or 0)
    top_costs = sorted(expense_by_category.items(), key=lambda item: item[1], reverse=True)[:3]

    insight_notes = []
    if emergency_active:
        insight_notes.append(f"Active emergencies: {len(emergency_active)}")
    if staff_total and staff_available / staff_total < 0.7:
        insight_notes.append("Staff coverage below target threshold")
    if overloaded:
        insight_notes.append("Department load imbalance detected")
    if not insight_notes:
        insight_notes.append("Operational signals stable")

    meta = _simple_meta(
        0.67,
        [
            "Insights derived from patient volume, staffing availability, and emergency load.",
            "Bed forecast model informs predicted inflow and allocation strategy.",
        ],
        forecast_meta.get("references") if isinstance(forecast_meta, dict) else [
            {"title": "Model", "detail": "ml/bed_forecast_model.joblib"},
        ],
    )

    return {
        "predicted_inflow": forecast.get("predicted_bed_demand") if isinstance(forecast, dict) else None,
        "overloaded_departments": overloaded,
        "staff_redistribution": staff_suggestion,
        "emergency_spike_risk": emergency_risk,
        "bed_allocation_strategy": bed_strategy,
        "cost_pressure_index": cost_pressure,
        "margin_at_risk": round(max(0.0, expense_total - revenue_total), 2),
        "top_cost_drivers": [{"category": k, "amount": round(v, 2)} for k, v in top_costs],
        "cost_optimization": "Reduce non-critical overtime" if cost_pressure > 75 else "Maintain procurement plan",
        "insight_notes": insight_notes,
        "meta": meta,
    }


@router.post("/ceo/ai-insights/simulate")
async def ceo_ai_insights_simulate(payload: dict = Body(default_factory=dict)):
    hospital_id = payload.get("hospitalId")
    if not hospital_id:
        raise HTTPException(status_code=400, detail="hospitalId is required")
    emergency_delta = int(payload.get("emergencyDelta") or 0)
    staff_delta = int(payload.get("staffDelta") or 0)
    discharge_delta = int(payload.get("plannedDischarges") or 0)

    db = get_db()
    hospital_oid = _require_hospital_id(hospital_id)
    patient_repo = MongoRepository(db, PATIENTS)
    staff_repo = MongoRepository(db, HOSPITAL_STAFF)
    emergency_repo = MongoRepository(db, EMERGENCY_EVENTS)

    patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=500)
    staff = await staff_repo.find_many({"hospital": hospital_oid}, limit=400)
    emergencies = await emergency_repo.find_many({"hospital": hospital_oid}, limit=200)

    active_emergencies = max(0, len(emergencies) + emergency_delta)
    staff_available = max(0, len([s for s in staff if s.get("availability") is not False]) + staff_delta)
    predicted_inflow = max(0, len(patients) - discharge_delta + emergency_delta * 3)
    cost_pressure = max(0, 60 + emergency_delta * 2 - discharge_delta)

    insight_notes = []
    if emergency_delta:
        insight_notes.append(f"Scenario adds {emergency_delta} emergency cases")
    if discharge_delta:
        insight_notes.append(f"Planned discharges: {discharge_delta}")
    if staff_delta:
        insight_notes.append(f"Staff availability delta: {staff_delta}")
    if not insight_notes:
        insight_notes.append("Scenario uses current baseline")

    meta = _simple_meta(
        0.58,
        [
            "Simulation adjusts emergency load, staff availability, and discharges.",
            "Outputs estimate operational strain under the provided scenario.",
        ],
        [{"title": "Scenario", "detail": "CEO AI insights simulation"}],
    )

    return {
        "predicted_inflow": predicted_inflow,
        "overloaded_departments": ["Emergency"] if active_emergencies > 6 else [],
        "staff_redistribution": "Increase ER coverage" if staff_available < 20 else "Maintain current staffing",
        "emergency_spike_risk": "High" if active_emergencies > 6 else "Moderate" if active_emergencies > 3 else "Low",
        "bed_allocation_strategy": "Hold 10% ICU beds" if active_emergencies > 4 else "Maintain standard allocation",
        "cost_pressure_index": round(cost_pressure, 1),
        "margin_at_risk": max(0, emergency_delta * 10000 - discharge_delta * 2500),
        "insight_notes": insight_notes,
        "meta": meta,
    }


@router.get("/ceo/department-performance")
async def ceo_department_performance(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    patient_repo = MongoRepository(db, PATIENTS)
    log_repo = MongoRepository(db, DEPARTMENT_LOGS)

    patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=500)
    logs = await log_repo.find_many({"hospital": hospital_oid}, limit=200)

    dept_counts: dict[str, int] = {}
    for patient in patients:
        dept = patient.get("dept") or "General"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    log_map: dict[str, dict[str, Any]] = {log.get("department"): log for log in logs if log.get("department")}

    performance = []
    bottlenecks = []
    for dept, count in dept_counts.items():
        log = log_map.get(dept, {})
        has_log = any(log.get(field) is not None for field in ["avgTreatmentMinutes", "dischargeRate", "delayRate"])
        avg_time = float(log.get("avgTreatmentMinutes") or 0) if has_log else None
        discharge_rate = float(log.get("dischargeRate") or 0) if has_log else None
        delay_rate = float(log.get("delayRate") or 0) if has_log else None
        throughput = float(log.get("throughputPerHour") or 0) if log.get("throughputPerHour") is not None else None
        queue_length = int(log.get("queueLength") or 0) if log.get("queueLength") is not None else None

        if not has_log and count:
            avg_time = 34 + min(count, 12)
            discharge_rate = 0.66
            delay_rate = 0.08
            throughput = round(max(2.5, count / 4), 1)
            queue_length = max(3, round(count / 2))

        score = _score_department(count, avg_time, (discharge_rate or 0) * 100, delay_rate or 0.0) if count else 0.0
        if delay_rate and delay_rate > 0.15 or (avg_time and avg_time > 45) or (queue_length and queue_length > 20):
            bottlenecks.append(dept)
        performance.append(
            {
                "department": dept,
                "patients": count,
                "avgTreatmentMinutes": round(avg_time, 1) if avg_time is not None else None,
                "dischargeRate": round(discharge_rate * 100, 1) if discharge_rate is not None else None,
                "delayRate": round(delay_rate * 100, 1) if delay_rate is not None else None,
                "score": score,
                "suggestion": "Add staffing" if delay_rate and delay_rate > 0.12 else "Maintain cadence",
                "throughputPerHour": throughput,
                "queueLength": queue_length,
            }
        )

    performance.sort(key=lambda item: item["score"], reverse=True)
    return {
        "count": len(performance),
        "departments": performance,
        "bottlenecks": bottlenecks,
    }


@router.post("/ceo/department-performance/logs", status_code=201)
async def create_department_log(payload: DepartmentLogCreate):
    db = get_db()
    repo = MongoRepository(db, DEPARTMENT_LOGS)
    hospital_oid = _require_hospital_id(payload.hospitalId)

    doc = {
        "hospital": hospital_oid,
        "department": payload.department,
        "avgTreatmentMinutes": payload.avgTreatmentMinutes,
        "dischargeRate": payload.dischargeRate,
        "delayRate": payload.delayRate,
        "throughputPerHour": payload.throughputPerHour,
        "queueLength": payload.queueLength,
        "notes": payload.notes,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.get("/ceo/resources")
async def ceo_resource_overview(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    hospital_doc = await _resolve_hospital_doc(db, hospitalId)
    resource_repo = MongoRepository(db, RESOURCES)
    equipment_repo = MongoRepository(db, EQUIPMENT_INVENTORY)
    staff_repo = MongoRepository(db, HOSPITAL_STAFF)
    vendor_repo = MongoRepository(db, VENDOR_LEAD_TIMES)

    beds = _bed_breakdown(hospital_doc.get("beds") if hospital_doc else {})
    resources = await resource_repo.find_many({"hospitalId": hospital_oid}, limit=300)
    equipment = await equipment_repo.find_many({"hospital": hospital_oid}, limit=200)
    staff = await staff_repo.find_many({"hospital": hospital_oid}, limit=400)

    shortages = []
    for item in resources:
        quantity = int(item.get("quantity") or 0)
        threshold = int(item.get("minThreshold") or 0)
        if threshold and quantity <= threshold:
            shortages.append({"name": item.get("name"), "category": item.get("category"), "quantity": quantity})

    for eq in equipment:
        quantity = int(eq.get("quantity") or 0)
        threshold = int(eq.get("minThreshold") or 1)
        if quantity <= threshold:
            shortages.append({"name": eq.get("name"), "category": eq.get("category"), "quantity": quantity})

    available_staff = len([s for s in staff if s.get("availability") is not False])

    lead_times = await vendor_repo.find_many({"hospital": hospital_oid}, limit=200)
    lead_map = {f"{item.get('category')}::{item.get('resourceName')}": item for item in lead_times}
    supply_risk = []
    for item in resources:
        key = f"{item.get('category')}::{item.get('name')}"
        lead = lead_map.get(key)
        if lead and int(lead.get("leadTimeDays") or 0) > 10:
            supply_risk.append({"resource": item.get("name"), "leadTimeDays": lead.get("leadTimeDays")})

    return {
        "beds": beds,
        "inventory": resources,
        "equipment": equipment,
        "vendorLeadTimes": lead_times,
        "supplyRisk": supply_risk,
        "staff": {
            "available": available_staff,
            "total": len(staff),
        },
        "shortages": shortages,
    }


@router.post("/ceo/resources/vendors", status_code=201)
async def create_vendor_lead_time(payload: VendorLeadTimeCreate):
    db = get_db()
    repo = MongoRepository(db, VENDOR_LEAD_TIMES)
    hospital_oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": hospital_oid,
        "resourceName": payload.resourceName,
        "category": payload.category,
        "vendorName": payload.vendorName,
        "leadTimeDays": payload.leadTimeDays,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.get("/ceo/beds/forecast")
async def ceo_bed_forecast(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    hospital_oid = _require_hospital_id(hospitalId)
    patient_repo = MongoRepository(db, PATIENTS)
    allocation_repo = MongoRepository(db, BED_ALLOCATIONS)

    patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=500)
    allocations = await allocation_repo.find_many({"hospital": hospital_oid}, limit=200)

    discharge_candidates = 0
    detailed = []
    for patient in patients:
        eta_hours = _estimate_discharge_hours(patient.get("severity"))
        status = (patient.get("status") or "").lower()
        if status in ["stable", "recovered", "observation"]:
            discharge_candidates += 1
        detailed.append(
            {
                "patient": patient.get("name"),
                "severity": patient.get("severity"),
                "etaHours": eta_hours,
                "department": patient.get("dept"),
            }
        )

    forecast = await _safe_run_model(
        "predict_bed_forecast",
        {
            "emergency_count": len([a for a in allocations if a.get("status") == "Assigned"]),
            "disease_case_count": len(patients),
            "current_bed_occupancy": len(patients),
            "hospital_id": 1,
        },
    )

    return {
        "expectedDischarges24h": discharge_candidates,
        "allocationCount": len(allocations),
        "forecast": forecast or {},
        "patients": detailed[:30],
    }


@router.get("/ceo/ambulance/coordination")
async def ceo_ambulance_coordination(hospitalId: str = Query(...)):
    db = get_db()
    assignment_repo = MongoRepository(db, AMBULANCE_ASSIGNMENTS)
    ambulance_repo = MongoRepository(db, AMBULANCES)
    emergency_repo = MongoRepository(db, EMERGENCY_EVENTS)

    assignments = await assignment_repo.find_many({"hospital": _require_hospital_id(hospitalId)}, limit=200)
    ambulance_ids = [a.get("ambulanceId") for a in assignments if a.get("ambulanceId")]
    ambulances = await ambulance_repo.find_many({"ambulanceId": {"$in": ambulance_ids}}) if ambulance_ids else []
    emergencies = await emergency_repo.find_many({"hospital": _require_hospital_id(hospitalId)}, limit=200)

    active = [a for a in assignments if (a.get("status") or "").lower() in ["active", "en route", "arriving"]]
    available_units = [a for a in ambulances if (a.get("status") or "").lower() in ["available", "idle"]]
    critical = len([e for e in emergencies if e.get("severity") == "Critical"])

    guidance = []
    if critical >= 3 and len(available_units) < 2:
        guidance.append("Activate mutual aid ambulances from nearby hospitals")
    if len(active) > len(available_units):
        guidance.append("Prioritize high-severity dispatches and stagger non-critical pickups")
    if not guidance:
        guidance.append("Ambulance coverage stable")

    multi_vehicle_plan = []
    if critical >= 2:
        multi_vehicle_plan.append({
            "incidentType": "Critical surge",
            "recommendation": "Deploy dual ambulances for simultaneous triage",
            "vehicles": min(2, len(available_units)),
        })

    return {
        "assignments": assignments,
        "ambulances": ambulances,
        "activeAssignments": len(active),
        "availableUnits": len(available_units),
        "guidance": guidance,
        "multiVehiclePlan": multi_vehicle_plan,
    }


