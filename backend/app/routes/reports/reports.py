"""
LifeLink Report Generation API Endpoints

Generates PDF reports for:
- Hospital: Daily Ops, Financial, Compliance
- Government: Incident, Resource, Audit
- Simulation: After-Action Report

All endpoints return application/pdf responses.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.services.report_generator import ReportGenerator
from app.core.dependencies import require_roles

logger = logging.getLogger("lifelink.reports")
router = APIRouter(tags=["Reports"])


def _pdf_response(pdf_bytes: bytes | None, filename: str) -> Response:
    """Return a PDF response or 503 if generation failed."""
    if not pdf_bytes or pdf_bytes.startswith(b"No report generated"):
        raise HTTPException(
            status_code=503,
            detail="Report generation unavailable. WeasyPrint library not installed."
        )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )


# ── Hospital Reports ─────────────────────────────────────────

@router.post("/hospital/daily-ops")
async def hospital_daily_ops(
    data: dict,
    ctx=Depends(require_roles("hospital")),
):
    """Generate Hospital Daily Operations Report PDF."""
    gen = ReportGenerator()
    pdf = gen.generate_hospital_daily_ops(data)
    date_str = datetime.utcnow().strftime("%Y%m%d")
    return _pdf_response(pdf, f"hospital_daily_ops_{date_str}.pdf")


@router.post("/hospital/financial")
async def hospital_financial(
    data: dict,
    ctx=Depends(require_roles("hospital")),
):
    """Generate Hospital Financial Report PDF."""
    gen = ReportGenerator()
    pdf = gen.generate_hospital_financial(data)
    date_str = datetime.utcnow().strftime("%Y%m")
    return _pdf_response(pdf, f"hospital_financial_{date_str}.pdf")


@router.post("/hospital/compliance")
async def hospital_compliance(
    data: dict,
    ctx=Depends(require_roles("hospital")),
):
    """Generate Hospital Compliance Report PDF."""
    gen = ReportGenerator()
    pdf = gen.generate_hospital_compliance(data)
    date_str = datetime.utcnow().strftime("%Y%m")
    return _pdf_response(pdf, f"hospital_compliance_{date_str}.pdf")


# ── Government Reports ──────────────────────────────────────

@router.post("/government/incident")
async def government_incident(
    data: dict,
    ctx=Depends(require_roles("government")),
):
    """Generate Government Incident Report PDF."""
    gen = ReportGenerator()
    pdf = gen.generate_government_incident(data)
    date_str = datetime.utcnow().strftime("%Y%m%d")
    return _pdf_response(pdf, f"gov_incident_report_{date_str}.pdf")


@router.post("/government/resource")
async def government_resource(
    data: dict,
    ctx=Depends(require_roles("government")),
):
    """Generate Government Resource Report PDF."""
    gen = ReportGenerator()
    pdf = gen.generate_government_resource(data)
    date_str = datetime.utcnow().strftime("%Y%m%d")
    return _pdf_response(pdf, f"gov_resource_report_{date_str}.pdf")


# ── Simulation Report ───────────────────────────────────────

@router.post("/simulation/after-action")
async def simulation_report(
    data: dict,
    ctx=Depends(require_roles("government")),
):
    """Generate Simulation After-Action Report PDF."""
    gen = ReportGenerator()
    pdf = gen.generate_simulation_report(data)
    date_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return _pdf_response(pdf, f"simulation_after_action_{date_str}.pdf")
