"""
AI Routes — Aggregator
=======================
Aggregates all AI sub-modules into a single router
so main.py can import it with a single ``include_router``.

Sub-modules:
  - ai_shared       (utilities, constants, ML prediction runner)
  - ai_reports      (medical report analysis, PDF/OCR, vitals, risk scoring)
  - ai_predictions  (ML prediction pass-through endpoints)
  - ai_donors       (donor compatibility, donation forecast, profile clustering)
"""
from fastapi import APIRouter

from .ai_reports import router as reports_router
from .ai_predictions import router as predictions_router
from .ai_donors import router as donors_router

router = APIRouter(tags=["ai"])

router.include_router(reports_router)
router.include_router(predictions_router)
router.include_router(donors_router)

__all__ = ["router"]
