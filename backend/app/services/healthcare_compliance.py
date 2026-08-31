"""
Healthcare Compliance Service
==============================
Scaffolding for Indian healthcare compliance:
- ABDM (Ayushman Bharat Digital Mission) integration
- FHIR (Fast Healthcare Interoperability Resources) support
- NDHM (National Digital Health Mission) standards
- Basic data privacy and consent management

This module provides the foundation for regulatory compliance.
Full implementation requires ABDM sandbox credentials and FHIR server.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime
from enum import Enum

logger = logging.getLogger("lifelink.compliance")


# ─── Enums ──────────────────────────────────────────────────────────

class ConsentType(str, Enum):
    TREATMENT = "treatment"
    RESEARCH = "research"
    EMERGENCY = "emergency"
    INSURANCE = "insurance"
    GOVERNMENT = "government"


class DataClassification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"  # PHI / PII


class FHIRResourceType(str, Enum):
    PATIENT = "Patient"
    ENCOUNTER = "Encounter"
    CONDITION = "Condition"
    OBSERVATION = "Observation"
    MEDICATION_REQUEST = "MedicationRequest"
    DIAGNOSTIC_REPORT = "DiagnosticReport"
    ALLERGY_INTOLERANCE = "AllergyIntolerance"
    PROCEDURE = "Procedure"
    IMMUNIZATION = "Immunization"


# ─── ABDM Integration ──────────────────────────────────────────────

class ABDMService:
    """
    Ayushman Bharat Digital Mission (ABDM) integration.

    Provides:
    - Health ID (ABHA) verification
    - Health Information Exchange & Consent Manager (HIE-CM) integration
    - Health Facility Registry integration
    - Professional Registry integration

    Environment variables:
      - ABDM_API_BASE_URL: ABDM gateway URL (default: https://dev.abdm.gov.in)
      - ABDM_CLIENT_ID: ABDM client ID
      - ABDM_CLIENT_SECRET: ABDM client secret
      - ABDM_SANDBOX_MODE: Use sandbox (true) or production (false)
    """

    def __init__(self):
        self.base_url = "https://dev.abdm.gov.in"
        self.sandbox_mode = True
        self._initialized = False

    async def initialize(self):
        """Initialize ABDM client with credentials."""
        import os
        self.base_url = os.getenv("ABDM_API_BASE_URL", self.base_url)
        self.sandbox_mode = os.getenv("ABDM_SANDBOX_MODE", "true").lower() == "true"
        self._initialized = True
        logger.info(
            "ABDM service initialized (sandbox=%s, url=%s)",
            self.sandbox_mode, self.base_url,
        )

    async def verify_abha(self, abha_number: str) -> dict:
        """
        Verify an ABHA (Ayushman Bharat Health Account) number.

        Returns:
            dict with verification status and patient demographics
        """
        await self.initialize()
        # In production, this would call the ABDM gateway
        return {
            "verified": True,
            "abha_number": abha_number,
            "status": "active",
            "mode": "sandbox" if self.sandbox_mode else "production",
            "verified_at": datetime.utcnow().isoformat(),
            "note": "Sandbox verification — integrate with ABDM gateway for production",
        }

    async def create_consent(
        self,
        patient_abha: str,
        purpose: str,
        consent_type: ConsentType,
        providers: list[str] | None = None,
        expiry_days: int = 30,
    ) -> dict:
        """
        Create a health data consent request via HIE-CM.

        Args:
            patient_abha: Patient's ABHA number
            purpose: Purpose of data access
            consent_type: Type of consent
            providers: List of provider IDs to grant access to
            expiry_days: Consent validity period

        Returns:
            dict with consent ID and status
        """
        await self.initialize()
        consent_id = hashlib.sha256(
            f"{patient_abha}:{purpose}:{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]

        return {
            "consent_id": consent_id,
            "patient_abha": patient_abha,
            "purpose": purpose,
            "consent_type": consent_type.value,
            "providers": providers or [],
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": datetime.utcnow().isoformat(),  # Would be calculated
            "mode": "sandbox" if self.sandbox_mode else "production",
        }

    async def fetch_health_records(
        self,
        patient_abha: str,
        consent_id: str,
        resource_types: list[FHIRResourceType] | None = None,
    ) -> dict:
        """
        Fetch patient health records from the Health Information Exchange.

        Args:
            patient_abha: Patient's ABHA number
            consent_id: Valid consent ID
            resource_types: Types of FHIR resources to fetch

        Returns:
            dict with FHIR Bundle of health records
        """
        await self.initialize()
        return {
            "resource_type": "Bundle",
            "type": "searchset",
            "total": 0,
            "entry": [],
            "patient_abha": patient_abha,
            "consent_id": consent_id,
            "fetched_at": datetime.utcnow().isoformat(),
            "mode": "sandbox" if self.sandbox_mode else "production",
            "note": "Sandbox mode — no real records returned. Integrate with ABDM HIE-CM for production.",
        }


# ─── FHIR Conversion ──────────────────────────────────────────────

class FHIRConverter:
    """
    Converts internal data models to FHIR R4 resources.

    Useful for:
    - Exporting patient data in interoperable format
    - Integrating with external healthcare systems
    - Meeting regulatory data format requirements
    """

    @staticmethod
    def patient_to_fhir(patient: dict) -> dict:
        """Convert an internal patient record to FHIR Patient resource."""
        return {
            "resourceType": "Patient",
            "id": patient.get("_id") or patient.get("id", ""),
            "identifier": [
                {
                    "system": "http://lifelink.ai/patient-id",
                    "value": patient.get("_id") or patient.get("id", ""),
                }
            ],
            "name": [
                {
                    "use": "official",
                    "text": patient.get("name", "Unknown"),
                }
            ],
            "gender": patient.get("gender", "unknown"),
            "birthDate": patient.get("dateOfBirth") or patient.get("dob", ""),
            "address": [
                {
                    "text": patient.get("address", ""),
                    "city": patient.get("city", ""),
                    "state": patient.get("state", ""),
                    "country": patient.get("country", "India"),
                }
            ],
            "telecom": [
                {"system": "phone", "value": patient.get("phone", "")},
                {"system": "email", "value": patient.get("email", "")},
            ],
        }

    @staticmethod
    def encounter_to_fhir(encounter: dict) -> dict:
        """Convert an encounter/admission to FHIR Encounter resource."""
        return {
            "resourceType": "Encounter",
            "id": encounter.get("_id") or encounter.get("id", ""),
            "status": "finished" if encounter.get("status") == "discharged" else "in-progress",
            "class": {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "IMP"},
            "subject": {"reference": f"Patient/{encounter.get('patientId', '')}"},
            "serviceProvider": {"reference": f"Organization/{encounter.get('hospitalId', '')}"},
            "period": {
                "start": encounter.get("admitDate") or encounter.get("admit_date", ""),
                "end": encounter.get("dischargeDate") or encounter.get("discharge_date", ""),
            },
        }

    @staticmethod
    def observation_to_fhir(observation: dict) -> dict:
        """Convert a vitals observation to FHIR Observation resource."""
        return {
            "resourceType": "Observation",
            "id": observation.get("_id", ""),
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": observation.get("loinc_code", ""),
                        "display": observation.get("name", ""),
                    }
                ]
            },
            "valueQuantity": {
                "value": observation.get("value"),
                "unit": observation.get("unit", ""),
            },
            "effectiveDateTime": observation.get("timestamp", ""),
        }

    @staticmethod
    def condition_to_fhir(condition: dict) -> dict:
        """Convert a diagnosis to FHIR Condition resource."""
        return {
            "resourceType": "Condition",
            "id": condition.get("_id", ""),
            "clinicalStatus": {
                "coding": [
                    {"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}
                ]
            },
            "code": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": condition.get("snomed_code", ""),
                        "display": condition.get("diagnosis", ""),
                    }
                ]
            },
            "subject": {"reference": f"Patient/{condition.get('patientId', '')}"},
            "onsetDateTime": condition.get("onsetDate", ""),
        }


# ─── Data Privacy ──────────────────────────────────────────────────

class DataPrivacyService:
    """
    Data privacy and consent management.

    Provides:
    - PII/PHI detection and redaction
    - Consent tracking
    - Data retention policies
    - Audit logging for data access
    """

    PII_FIELDS = {"name", "phone", "email", "address", "aadhaar", "abha", "patient_id"}
    PHI_FIELDS = {"diagnosis", "medication", "lab_result", "vital_sign", "allergy"}

    @classmethod
    def classify_data(cls, field_name: str) -> DataClassification:
        """Classify a data field by sensitivity level."""
        field_lower = field_name.lower()
        if field_lower in cls.PHI_FIELDS:
            return DataClassification.RESTRICTED
        if field_lower in cls.PII_FIELDS:
            return DataClassification.CONFIDENTIAL
        return DataClassification.INTERNAL

    @staticmethod
    def redact_pii(data: dict) -> dict:
        """Redact PII fields from a data dictionary."""
        redacted = {}
        for key, value in data.items():
            key_lower = key.lower()
            if key_lower in {"name", "patient_name"}:
                redacted[key] = "REDACTED"
            elif key_lower in {"phone", "mobile", "phone_number"}:
                redacted[key] = "***REDACTED***"
            elif key_lower in {"email", "email_address"}:
                redacted[key] = "***@***.***"
            elif key_lower in {"address", "street_address", "full_address"}:
                redacted[key] = "***REDACTED***"
            elif key_lower in {"aadhaar", "aadhaar_number"}:
                redacted[key] = "XXXX-XXXX-XXXX"
            elif key_lower in {"abha", "abha_number"}:
                redacted[key] = "XX-XXXX-XXXX-XXXX"
            else:
                redacted[key] = value
        return redacted

    @staticmethod
    def generate_data_retention_policy() -> dict:
        """Generate a data retention policy configuration."""
        return {
            "patient_records": {
                "retention_years": 10,
                "legal_basis": "Indian Medical Council Regulations",
                "action_after_expiry": "anonymize",
            },
            "emergency_records": {
                "retention_years": 5,
                "legal_basis": "Disaster Management Act",
                "action_after_expiry": "delete",
            },
            "audit_logs": {
                "retention_years": 7,
                "legal_basis": "IT Act 2000",
                "action_after_expiry": "archive",
            },
            "consent_records": {
                "retention_years": 3,
                "legal_basis": "ABDM guidelines",
                "action_after_expiry": "delete",
            },
            "insurance_claims": {
                "retention_years": 7,
                "legal_basis": "IRDAI regulations",
                "action_after_expiry": "archive",
            },
        }


# ─── Compliance Routes ─────────────────────────────────────────────

def get_compliance_router():
    """Get the compliance API router."""
    from fastapi import APIRouter

    router = APIRouter(tags=["compliance"])

    abdm = ABDMService()
    fhir = FHIRConverter()
    privacy = DataPrivacyService()

    @router.get("/abdm/status")
    async def abdm_status():
        """Check ABDM integration status."""
        return {
            "status": "configured",
            "sandbox_mode": abdm.sandbox_mode,
            "base_url": abdm.base_url,
            "features": [
                "ABHA verification",
                "Consent management",
                "Health record exchange",
            ],
        }

    @router.post("/abdm/verify-abha")
    async def verify_abha(payload: dict):
        """Verify an ABHA number."""
        abha = payload.get("abha_number", "")
        if not abha:
            return {"error": "abha_number is required"}
        return await abdm.verify_abha(abha)

    @router.post("/fhir/patient")
    async def fhir_patient(payload: dict):
        """Convert patient data to FHIR format."""
        return fhir.patient_to_fhir(payload)

    @router.post("/fhir/encounter")
    async def fhir_encounter(payload: dict):
        """Convert encounter data to FHIR format."""
        return fhir.encounter_to_fhir(payload)

    @router.get("/privacy/retention-policy")
    async def retention_policy():
        """Get data retention policy."""
        return privacy.generate_data_retention_policy()

    @router.post("/privacy/classify")
    async def classify_data(payload: dict):
        """Classify data fields by sensitivity."""
        field = payload.get("field", "")
        classification = privacy.classify_data(field)
        return {"field": field, "classification": classification.value}

    @router.post("/privacy/redact")
    async def redact_pii(payload: dict):
        """Redact PII from data."""
        return privacy.redact_pii(payload)

    return router


# Singleton
_abdm_service: ABDMService | None = None


def get_abdm_service() -> ABDMService:
    global _abdm_service
    if _abdm_service is None:
        _abdm_service = ABDMService()
    return _abdm_service
