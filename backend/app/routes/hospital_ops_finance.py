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


@router.get("/finance/invoices")
async def finance_invoices(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    department: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, BILLING_INVOICES)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["patientName", "department", "status", "insuranceProvider", "payer"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "status", "department", "amount", "dueDate"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/finance/invoices", status_code=201)
async def finance_create_invoice(payload: BillingInvoiceCreate):
    db = get_db()
    repo = MongoRepository(db, BILLING_INVOICES)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "patientName": payload.patientName,
        "department": payload.department,
        "amount": payload.amount,
        "status": payload.status or "Unpaid",
        "insuranceProvider": payload.insuranceProvider,
        "dueDate": payload.dueDate,
        "payer": payload.payer,
        "paidAt": payload.paidAt,
        "paidAmount": 0.0,
        "refundAmount": 0.0,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/finance/invoices/{invoice_id}")
async def finance_update_invoice(invoice_id: str, payload: BillingInvoiceUpdate):
    db = get_db()
    repo = MongoRepository(db, BILLING_INVOICES)
    oid = _as_object_id(invoice_id)
    update_data = _build_update(payload, ["status", "paidAmount", "refundAmount", "paidAt"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@router.get("/finance/claims")
async def finance_claims(
    hospitalId: str = Query(...),
    search: str | None = Query(None),
    status: str | None = Query(None),
    insurer: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_dir: str | None = Query(None),
):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    repo = MongoRepository(db, INSURANCE_CLAIMS)
    oid = _require_hospital_id(hospitalId)
    query: dict[str, Any] = {"hospital": oid}
    search_query = _build_search(search, ["insurer", "invoiceId", "status"])
    if search_query:
        query.update(search_query)
    if status:
        query["status"] = status
    if insurer:
        query["insurer"] = insurer
    sort = _build_sort(sort_by, sort_dir, {"createdAt", "updatedAt", "status", "insurer", "amount"}, "createdAt")
    records = await repo.find_many(query, sort=sort, limit=200)
    return {"count": len(records), "data": records}


@router.post("/finance/claims", status_code=201)
async def finance_create_claim(payload: InsuranceClaimCreate):
    db = get_db()
    repo = MongoRepository(db, INSURANCE_CLAIMS)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "invoiceId": payload.invoiceId,
        "insurer": payload.insurer,
        "amount": payload.amount,
        "status": payload.status or "Submitted",
        "approvedAmount": 0.0,
        "submittedAt": payload.submittedAt or datetime.utcnow().isoformat(),
        "paidAt": payload.paidAt,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.patch("/finance/claims/{claim_id}")
async def finance_update_claim(claim_id: str, payload: InsuranceClaimUpdate):
    db = get_db()
    repo = MongoRepository(db, INSURANCE_CLAIMS)
    oid = _as_object_id(claim_id)
    update_data = _build_update(payload, ["status", "approvedAmount", "notes", "paidAt"])
    updated = await repo.update_one({"_id": oid}, {"$set": update_data}, return_new=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Claim not found")
    return updated


@router.post("/finance/expenses", status_code=201)
async def finance_create_expense(payload: FinanceExpenseCreate):
    db = get_db()
    repo = MongoRepository(db, FINANCE_EXPENSES)
    oid = _require_hospital_id(payload.hospitalId)
    doc = {
        "hospital": oid,
        "category": payload.category,
        "amount": payload.amount,
        "notes": payload.notes,
        "vendor": payload.vendor,
        "contractRef": payload.contractRef,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    created = await repo.insert_one(doc)
    return created


@router.get("/finance/revenue")
async def finance_revenue(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    oid = _require_hospital_id(hospitalId)
    invoice_repo = MongoRepository(db, BILLING_INVOICES)
    expense_repo = MongoRepository(db, FINANCE_EXPENSES)
    claim_repo = MongoRepository(db, INSURANCE_CLAIMS)
    return await _compute_finance_summary(invoice_repo, expense_repo, claim_repo, oid)


@router.get("/finance/payer-delays")
async def finance_payer_delays(hospitalId: str = Query(...)):
    db = get_db()
    await _ensure_seeded(db, hospitalId)
    oid = _require_hospital_id(hospitalId)
    claim_repo = MongoRepository(db, INSURANCE_CLAIMS)
    claims = await claim_repo.find_many({"hospital": oid}, limit=300)

    delays = []
    by_insurer: dict[str, list[int]] = {}
    for claim in claims:
        submitted_at = claim.get("submittedAt")
        paid_at = claim.get("paidAt")
        if isinstance(submitted_at, str):
            try:
                submitted_at = datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
            except ValueError:
                submitted_at = None
        if isinstance(paid_at, str):
            try:
                paid_at = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
            except ValueError:
                paid_at = None
        if isinstance(submitted_at, datetime) and isinstance(paid_at, datetime):
            delay = (paid_at - submitted_at).days
            delays.append(delay)
            insurer = claim.get("insurer") or "Unknown"
            by_insurer.setdefault(insurer, []).append(delay)

    insurer_stats = [
        {"insurer": k, "avgDelayDays": round(sum(v) / max(1, len(v)), 1), "count": len(v)}
        for k, v in by_insurer.items()
    ]

    return {
        "averageDelayDays": round(sum(delays) / max(1, len(delays)), 1) if delays else 0,
        "insurers": insurer_stats,
    }


async def _compute_finance_summary(invoice_repo, expense_repo, claim_repo, hospital_oid: ObjectId) -> dict[str, Any]:
    invoices = await invoice_repo.find_many({"hospital": hospital_oid}, limit=500)
    expenses = await expense_repo.find_many({"hospital": hospital_oid}, limit=300)
    claims = await claim_repo.find_many({"hospital": hospital_oid}, limit=300)

    dept_breakdown: dict[str, float] = {}
    total_revenue = 0.0
    for inv in invoices:
        amount = float(inv.get("amount") or 0)
        total_revenue += amount
        dept = inv.get("department") or "General"
        dept_breakdown[dept] = dept_breakdown.get(dept, 0) + amount

    total_expenses = sum(float(exp.get("amount") or 0) for exp in expenses)
    profit = total_revenue - total_expenses

    expense_by_category: dict[str, float] = {}
    for exp in expenses:
        category = exp.get("category") or "General"
        expense_by_category[category] = expense_by_category.get(category, 0) + float(exp.get("amount") or 0)

    payer_delays = []
    for claim in claims:
        submitted_at = claim.get("submittedAt")
        paid_at = claim.get("paidAt")
        if isinstance(submitted_at, str):
            try:
                submitted_at = datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
            except ValueError:
                submitted_at = None
        if isinstance(paid_at, str):
            try:
                paid_at = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
            except ValueError:
                paid_at = None
        if isinstance(submitted_at, datetime) and isinstance(paid_at, datetime):
            payer_delays.append((paid_at - submitted_at).days)

    avg_payer_delay = round(sum(payer_delays) / max(1, len(payer_delays)), 1) if payer_delays else 0.0
    delinquent = len([d for d in payer_delays if d > 30])

    daily_series = []
    for day_offset in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=day_offset)
        day_key = day.date().isoformat()
        total = 0.0
        for inv in invoices:
            created_at = inv.get("createdAt")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except ValueError:
                    continue
            if isinstance(created_at, datetime) and created_at.date().isoformat() == day_key:
                total += float(inv.get("amount") or 0)
        daily_series.append({"label": day.strftime("%a"), "value": round(total, 2), "dayKey": day_key})

    monthly_series = []
    for month_offset in range(5, -1, -1):
        target = datetime.utcnow().replace(day=1)
        month = (target.month - month_offset - 1) % 12 + 1
        year = target.year + ((target.month - month_offset - 1) // 12)
        total = 0.0
        for inv in invoices:
            created_at = inv.get("createdAt")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except ValueError:
                    continue
            if isinstance(created_at, datetime) and created_at.year == year and created_at.month == month:
                total += float(inv.get("amount") or 0)
        month_label = datetime(year, month, 1).strftime("%b")
        monthly_series.append({"label": month_label, "value": round(total, 2), "monthKey": f"{year:04d}-{month:02d}"})

    fraud_alerts = []
    avg_invoice = total_revenue / max(1, len(invoices))
    for inv in invoices:
        if float(inv.get("amount") or 0) > avg_invoice * 2.5:
            fraud_alerts.append(f"Invoice {inv.get('_id')} exceeds expected amount")

    return {
        "totalRevenue": round(total_revenue, 2),
        "totalExpenses": round(total_expenses, 2),
        "profit": round(profit, 2),
        "departmentBreakdown": [{"department": k, "amount": round(v, 2)} for k, v in dept_breakdown.items()],
        "expenseBreakdown": [{"category": k, "amount": round(v, 2)} for k, v in expense_by_category.items()],
        "dailySeries": daily_series,
        "monthlySeries": monthly_series,
        "fraudAlerts": fraud_alerts,
        "payerDelayDays": avg_payer_delay,
        "delinquentPayers": delinquent,
    }


async def _build_report_content(db, report_key: str, hospital_oid: ObjectId, hospital_id: str) -> dict[str, Any]:
    now = datetime.utcnow()
    if report_key == "weekly-ops":
        patient_repo = MongoRepository(db, PATIENTS)
        staff_repo = MongoRepository(db, HOSPITAL_STAFF)
        emergency_repo = MongoRepository(db, EMERGENCY_EVENTS)
        invoice_repo = MongoRepository(db, BILLING_INVOICES)
        hospital_doc = await _resolve_hospital_doc(db, hospital_id)

        patients = await patient_repo.find_many({"hospitalId": hospital_oid}, limit=500)
        staff = await staff_repo.find_many({"hospital": hospital_oid}, limit=400)
        emergencies = await emergency_repo.find_many({"hospital": hospital_oid}, limit=200)
        invoices = await invoice_repo.find_many({"hospital": hospital_oid}, limit=300)

        bed_stats = _bed_breakdown(hospital_doc.get("beds") if hospital_doc else {})
        staff_available = len([s for s in staff if s.get("availability") is not False])
        emergency_active = [e for e in emergencies if (e.get("status") or "").lower() not in ["resolved", "closed"]]
        emergency_critical = len([e for e in emergency_active if e.get("severity") == "Critical"])

        week_cutoff = now - timedelta(days=7)
        weekly_revenue = 0.0
        for inv in invoices:
            created_at = inv.get("createdAt") or now
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except ValueError:
                    created_at = now
            if isinstance(created_at, datetime) and created_at >= week_cutoff:
                weekly_revenue += float(inv.get("amount") or 0)

        content = [
            f"Weekly Operations Summary ({week_cutoff.date().isoformat()} to {now.date().isoformat()})",
            f"Total patients: {len(patients)}",
            f"Emergency events: {len(emergency_active)} (critical: {emergency_critical})",
            f"Bed occupancy: {bed_stats['occupied']}/{bed_stats['total']} (ICU {bed_stats['icu']['occupied']}/{bed_stats['icu']['total']})",
            f"Staff availability: {staff_available}/{len(staff)}",
            f"Weekly revenue: ₹{round(weekly_revenue, 2)}",
        ]
        return {"content": "\n".join(content)}

    if report_key == "icu-performance":
        patient_repo = MongoRepository(db, ICU_PATIENTS)
        alert_repo = MongoRepository(db, ICU_ALERTS)

        patients = await patient_repo.find_many({"hospital": hospital_oid}, limit=200)
        alerts = await alert_repo.find_many({"hospital": hospital_oid}, limit=200)

        if patients:
            avg_oxygen = round(sum(int(p.get("oxygen") or 0) for p in patients) / len(patients))
            avg_hr = round(sum(int(p.get("heartRate") or 0) for p in patients) / len(patients))
            critical = len([p for p in patients if (p.get("status") or "").lower() == "critical"])
        else:
            avg_oxygen = 0
            avg_hr = 0
            critical = 0

        content = [
            "ICU Performance Review",
            f"Active ICU patients: {len(patients)}",
            f"Critical patients: {critical}",
            f"Average oxygen saturation: {avg_oxygen}%",
            f"Average heart rate: {avg_hr} bpm",
            f"Active ICU alerts: {len(alerts)}",
        ]
        return {"content": "\n".join(content)}

    if report_key == "finance-snapshot":
        invoice_repo = MongoRepository(db, BILLING_INVOICES)
        expense_repo = MongoRepository(db, FINANCE_EXPENSES)
        claim_repo = MongoRepository(db, INSURANCE_CLAIMS)
        summary = await _compute_finance_summary(invoice_repo, expense_repo, claim_repo, hospital_oid)
        top_departments = summary.get("departmentBreakdown", [])[:3]

        content = [
            "Finance Snapshot",
            f"Total revenue: ₹{summary.get('totalRevenue', 0)}",
            f"Total expenses: ₹{summary.get('totalExpenses', 0)}",
            f"Profit: ₹{summary.get('profit', 0)}",
            "Top departments:",
        ]
        for dept in top_departments:
            content.append(f"- {dept.get('department')}: ₹{dept.get('amount')}")
        return {"content": "\n".join(content)}

    return {"content": "Report template not available."}


