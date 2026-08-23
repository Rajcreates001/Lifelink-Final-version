"""
Healthcare Compliance API Routes
================================
ABDM/FHIR compliance endpoints.
"""
from __future__ import annotations

from fastapi import APIRouter, Body

from app.services.healthcare_compliance import (
    ABDMService,
    FHIRConverter,
    DataPrivacyService,
    ConsentType,
)

router = APIRouter(tags=["compliance"])

_abdm = ABDMService()
_fhir = FHIRConverter()
_privacy = DataPrivacyService()


@router.get("/compliance/abdm/status")
async def abdm_status():
    """Check ABDM integration status."""
    return {
        "status": "configured",
        "sandbox_mode": True,
        "features": [
            "ABHA verification",
            "Consent management",
            "Health record exchange",
            "Health Facility Registry",
        ],
        "environment": "sandbox",
    }


@router.post("/compliance/abdm/verify-abha")
async def verify_abha(payload: dict = Body(default_factory=dict)):
    """Verify an ABHA number."""
    abha = payload.get("abha_number", "")
    if not abha:
        return {"error": "abha_number is required", "verified": False}
    return await _abdm.verify_abha(abha)


@router.post("/compliance/abdm/consent")
async def create_consent(payload: dict = Body(default_factory=dict)):
    """Create a health data consent request."""
    purpose = payload.get("purpose", "treatment")
    consent_type = ConsentType(payload.get("consent_type", "treatment"))
    return await _abdm.create_consent(
        patient_abha=payload.get("patient_abha", ""),
        purpose=purpose,
        consent_type=consent_type,
        providers=payload.get("providers", []),
    )


@router.post("/compliance/fhir/patient")
async def fhir_patient(payload: dict = Body(default_factory=dict)):
    """Convert patient data to FHIR Patient resource."""
    return _fhir.patient_to_fhir(payload)


@router.post("/compliance/fhir/encounter")
async def fhir_encounter(payload: dict = Body(default_factory=dict)):
    """Convert encounter data to FHIR Encounter resource."""
    return _fhir.encounter_to_fhir(payload)


@router.post("/compliance/fhir/observation")
async def fhir_observation(payload: dict = Body(default_factory=dict)):
    """Convert observation data to FHIR Observation resource."""
    return _fhir.observation_to_fhir(payload)


@router.post("/compliance/fhir/condition")
async def fhir_condition(payload: dict = Body(default_factory=dict)):
    """Convert condition data to FHIR Condition resource."""
    return _fhir.condition_to_fhir(payload)


@router.get("/compliance/privacy/retention-policy")
async def retention_policy():
    """Get data retention policy."""
    return _privacy.generate_data_retention_policy()


@router.post("/compliance/privacy/classify")
async def classify_data(payload: dict = Body(default_factory=dict)):
    """Classify a data field by sensitivity level."""
    field = payload.get("field", "")
    classification = _privacy.classify_data(field)
    return {"field": field, "classification": classification.value}


@router.post("/compliance/privacy/redact")
async def redact_pii(payload: dict = Body(default_factory=dict)):
    """Redact PII fields from data."""
    return _privacy.redact_pii(payload)


@router.get("/compliance/ndhm/standards")
async def ndhm_standards():
    """Get NDHM compliance standards reference."""
    return {
        "standards": [
            {
                "name": "ABHA Number",
                "description": "14-digit Ayushman Bharat Health Account number",
                "format": "XX-XXXX-XXXX-XXXX",
                "status": "supported",
            },
            {
                "name": "Health Information Exchange",
                "description": "HIE-CM for consent-based health record sharing",
                "status": "scaffolded",
            },
            {
                "name": "Health Facility Registry",
                "description": "National registry of healthcare facilities",
                "status": "scaffolded",
            },
            {
                "name": "FHIR R4",
                "description": "Fast Healthcare Interoperability Resources",
                "status": "supported",
            },
            {
                "name": "SNOMED CT",
                "description": "Clinical terminology standard",
                "status": "scaffolded",
            },
            {
                "name": "LOINC",
                "description": "Laboratory observation codes",
                "status": "scaffolded",
            },
        ],
        "compliance_level": "scaffolded",
        "note": "Full ABDM integration requires sandbox credentials from abdm.gov.in",
    }
