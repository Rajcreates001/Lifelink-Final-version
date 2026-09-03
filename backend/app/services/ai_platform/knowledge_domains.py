"""
LifeLink — Knowledge Domain Partitioning
=========================================
Prevents accidental cross-organization retrieval by logically
partitioning vector knowledge into authorized domains.

Domains:
    PUBLIC_KNOWLEDGE        — Public health info, general guidance
    MEDICAL_KNOWLEDGE       — Medical records, clinical data (per-hospital)
    HOSPITAL_KNOWLEDGE      — Hospital-specific SOPs, policies (per-hospital)
    GOVERNMENT_KNOWLEDGE    — Government policies, regulations (per-level)
    EMERGENCY_PROTOCOLS     — Emergency response procedures
    USER_AUTHORIZED_RECORDS — Patient records (per-user authorization)
    AI_HISTORY              — Previous AI interactions (per-user)

Metadata filtering:
    organization_id, hospital_id, department_id, role,
    user_id, document_type, source, date, classification,
    authorization_scope
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any

logger = logging.getLogger("lifelink.ai.knowledge_domains")


class KnowledgeDomain(str, Enum):
    PUBLIC_KNOWLEDGE = "public_knowledge"
    MEDICAL_KNOWLEDGE = "medical_knowledge"
    HOSPITAL_KNOWLEDGE = "hospital_knowledge"
    GOVERNMENT_KNOWLEDGE = "government_knowledge"
    EMERGENCY_PROTOCOLS = "emergency_protocols"
    USER_AUTHORIZED_RECORDS = "user_authorized_records"
    AI_HISTORY = "ai_history"


# Which roles can access which domains
DOMAIN_ACCESS = {
    KnowledgeDomain.PUBLIC_KNOWLEDGE: {"public", "hospital", "ambulance", "government"},
    KnowledgeDomain.MEDICAL_KNOWLEDGE: {"hospital"},
    KnowledgeDomain.HOSPITAL_KNOWLEDGE: {"hospital"},
    KnowledgeDomain.GOVERNMENT_KNOWLEDGE: {"government"},
    KnowledgeDomain.EMERGENCY_PROTOCOLS: {"hospital", "ambulance", "government"},
    KnowledgeDomain.USER_AUTHORIZED_RECORDS: {"public", "hospital", "ambulance", "government"},
    KnowledgeDomain.AI_HISTORY: {"public", "hospital", "ambulance", "government"},
}


class KnowledgeDomainManager:
    """Manages domain-based authorization for vector search."""

    def get_allowed_domains(self, role: str, sub_role: str | None = None) -> list[str]:
        """Get the knowledge domains a role can access."""
        allowed = []
        for domain, roles in DOMAIN_ACCESS.items():
            if role in roles:
                allowed.append(domain.value)
        return allowed

    def build_metadata_filter(
        self,
        role: str,
        user_id: str,
        organization_id: str | None = None,
        hospital_id: str | None = None,
        department_id: str | None = None,
        government_level: str | None = None,
    ) -> dict[str, Any]:
        """
        Build metadata filters for vector search based on authorization.
        These filters are applied BEFORE retrieval to prevent cross-tenant data leaks.
        """
        filters: dict[str, Any] = {}

        # Organization scope
        if organization_id:
            filters["organization_id"] = {"$eq": organization_id}

        # Hospital scope
        if hospital_id:
            filters["hospital_id"] = {"$eq": hospital_id}

        # Department scope (CEO and national_admin can see all)
        if department_id and role == "hospital" and sub_role not in ("ceo",):
            filters["department_id"] = {"$eq": department_id}

        # Government level scope
        if government_level and role == "government":
            filters["authorization_scope.government_level"] = {"$in": self._get_allowed_levels(government_level)}

        # User-specific scope for personal records
        if role in ("public",):
            filters["authorization_scope.user_id"] = {"$eq": user_id}

        return filters

    def classify_document(
        self,
        content: str,
        metadata: dict[str, Any],
    ) -> KnowledgeDomain:
        """Classify a document into a knowledge domain."""
        doc_type = metadata.get("document_type", "")
        source = metadata.get("source", "")

        if doc_type in ("medical_record", "patient_data", "diagnosis", "prescription"):
            return KnowledgeDomain.MEDICAL_KNOWLEDGE
        elif doc_type in ("hospital_sop", "policy", "procedure", "guideline"):
            return KnowledgeDomain.HOSPITAL_KNOWLEDGE
        elif doc_type in ("government_policy", "regulation", "compliance"):
            return KnowledgeDomain.GOVERNMENT_KNOWLEDGE
        elif doc_type in ("emergency_protocol", "disaster_response", "triage"):
            return KnowledgeDomain.EMERGENCY_PROTOCOLS
        elif doc_type in ("ai_conversation", "ai_history", "chat_log"):
            return KnowledgeDomain.AI_HISTORY
        elif doc_type in ("public_health", "health_info", "faq"):
            return KnowledgeDomain.PUBLIC_KNOWLEDGE
        else:
            # Default based on content analysis
            content_lower = content.lower()
            if any(w in content_lower for w in ["patient", "diagnosis", "vitals", "medical"]):
                return KnowledgeDomain.MEDICAL_KNOWLEDGE
            elif any(w in content_lower for w in ["policy", "protocol", "sop"]):
                return KnowledgeDomain.HOSPITAL_KNOWLEDGE
            return KnowledgeDomain.PUBLIC_KNOWLEDGE

    def _get_allowed_levels(self, user_level: str) -> list[str]:
        """Get all government levels this user can access."""
        hierarchy = {
            "national": ["national", "state", "district", "department"],
            "state": ["state", "district", "department"],
            "district": ["district", "department"],
            "department": ["department"],
        }
        return hierarchy.get(user_level, [])
