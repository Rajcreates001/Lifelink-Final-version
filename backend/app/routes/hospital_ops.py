"""
LifeLink — Hospital Operations Router Aggregator
==================================================
Aggregates all hospital-ops sub-modules into a single router
so the app can import it with a single `include_router`.

Sub-modules:
  - hospital_ops_shared     (models, helpers, seed logic, preload)
  - hospital_ops_opd        (OPD appointments, doctors, consultations, queue)
  - hospital_ops_icu        (ICU patients, alerts, vitals, risk)
  - hospital_ops_radiology  (Radiology requests, reports)
  - hospital_ops_ot         (OT surgeries, allocations)
  - hospital_ops_ceo        (CEO dashboard, benchmarks, resources, forecast)
  - hospital_ops_staff      (Staff management, skills, optimizer)
  - hospital_ops_emergency  (Emergency feed, ambulances, dispatch, intake)
  - hospital_ops_beds       (Bed allocation)
  - hospital_ops_finance    (Finance invoices, claims, expenses, revenue)
  - hospital_ops_reports    (Reports generate, download, summary)
  - hospital_ops_equipment  (Equipment inventory CRUD)

The main `router` is what `main.py` imports:
    from app.routes.hospital_ops import router as hospital_ops_router
    app.include_router(hospital_ops_router, prefix="/api/hospital-ops")
"""

from fastapi import APIRouter

from .hospital_ops_opd import router as opd_router
from .hospital_ops_icu import router as icu_router
from .hospital_ops_radiology import router as radiology_router
from .hospital_ops_ot import router as ot_router
from .hospital_ops_ceo import router as ceo_router
from .hospital_ops_staff import router as staff_router
from .hospital_ops_emergency import router as emergency_router
from .hospital_ops_beds import router as beds_router
from .hospital_ops_finance import router as finance_router
from .hospital_ops_reports import router as reports_router
from .hospital_ops_equipment import router as equipment_router

router = APIRouter(tags=["hospital-ops"])

# ── Seed/Preload endpoint ──────────────────────────────────────────
# This is defined in hospital_ops_shared — re-export it on the main router
from .hospital_ops_shared import preload_hospital_ops  # noqa: E402, F811

# Register all sub-routers (no extra prefix — paths are already namespaced)
router.include_router(opd_router)
router.include_router(icu_router)
router.include_router(radiology_router)
router.include_router(ot_router)
router.include_router(ceo_router)
router.include_router(staff_router)
router.include_router(emergency_router)
router.include_router(beds_router)
router.include_router(finance_router)
router.include_router(reports_router)
router.include_router(equipment_router)

# Also add the preload endpoint from shared
router.add_api_route(
    "/preload",
    preload_hospital_ops,
    methods=["POST"],
    tags=["hospital-ops"],
)

__all__ = ["router"]
