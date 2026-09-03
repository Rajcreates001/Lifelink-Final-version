"""
LifeLink — AI Context Builder (Security-First)
===============================================
CRITICAL: This is the security gate between user data and AI.
The AI must NEVER receive data the logged-in user is not authorized to access.

Flow:
    User
      ↓
    Authentication
      ↓
    Role + Permissions
      ↓
    Tenant / Hospital / Department Scope
      ↓
    Data Authorization Filter  ← THIS FILE
      ↓
    Context Construction       ← THIS FILE
      ↓
    Headroom (Compression)
      ↓
    SIE (Retrieval / Inference)
      ↓
    LLM
      ↓
    Response Safety Validation
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from app.core.config import get_settings
from app.core.rbac import (
    BASE_SCOPES,
    HOSPITAL_SUBROLES,
    GOVERNMENT_SUBROLES,
    AMBULANCE_SUBROLES,
    PORTAL_ROLES,
)

logger = logging.getLogger("lifelink.ai.context_builder")


# ═══════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════

@dataclass
class UserContext:
    """Authenticated user context for AI authorization."""
    user_id: str
    role: str  # public, hospital, ambulance, government
    sub_role: str | None = None
    organization_id: str | None = None
    hospital_id: str | None = None
    department_id: str | None = None
    government_level: str | None = None  # national, state, district, department
    scopes: list[str] = field(default_factory=list)
    session_id: str | None = None


@dataclass
class AuthorizationResult:
    """Result of an authorization check."""
    authorized: bool
    reason: str = ""
    filtered_items: list[dict[str, Any]] = field(default_factory=list)
    blocked_items: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class AIContext:
    """Fully authorized and constructed context for AI processing."""
    user_ctx: UserContext
    request_id: str
    items: list[dict[str, Any]]  # authorized context items
    tier_breakdown: dict[str, int] = field(default_factory=dict)
    total_tokens: int = 0
    authorization_filtered: int = 0
    construction_time_ms: float = 0.0


# ═══════════════════════════════════════════════════════════════════
# AI TOOL PERMISSIONS BY ROLE
# ═══════════════════════════════════════════════════════════════════

ROLE_AI_TOOLS = {
    "public": [
        "personal_health",
        "emergency_help",
        "public_information",
        "health_check",
        "hospital_finder",
    ],
    "hospital": {
        "ceo": [
            "hospital_analytics", "operations", "finance",
            "staff", "capacity", "emergency_overview",
        ],
        "finance": [
            "hospital_analytics", "finance", "billing",
            "insurance_claims", "revenue",
        ],
        "emergency": [
            "authorized_patient_records", "clinical_knowledge",
            "emergency_cases", "hospital_resources",
            "triage", "ambulance_coordination",
        ],
        "opd": [
            "authorized_patient_records", "clinical_knowledge",
            "scheduling", "prescriptions",
        ],
        "icu": [
            "authorized_patient_records", "clinical_knowledge",
            "icu_monitoring", "vitals", "medications",
        ],
        "radiology": [
            "authorized_patient_records", "radiology_reports",
            "imaging", "equipment_status",
        ],
        "ot": [
            "authorized_patient_records", "surgery_scheduling",
            "ot_staff", "equipment_status",
        ],
    },
    "ambulance": [
        "current_assignment", "navigation",
        "emergency_patient_context", "hospital_availability",
        "dispatch", "vitals_stream", "gps_tracking",
    ],
    "government": {
        "national_admin": [
            "national_data", "state_data", "district_data",
            "policy", "analytics", "emergency_coordination",
        ],
        "national_officer": [
            "national_data", "analytics", "emergency_coordination",
        ],
        "state_admin": [
            "state_data", "district_data", "analytics",
            "policy", "emergency_coordination",
        ],
        "state_officer": [
            "state_data", "analytics", "emergency_coordination",
        ],
        "district_admin": [
            "district_data", "analytics", "policy",
            "emergency_coordination", "hospital_management",
        ],
        "district_officer": [
            "district_data", "analytics",
        ],
        "department_head": [
            "department_data", "analytics", "policy",
        ],
        "department_officer": [
            "department_data", "analytics",
        ],
        "field_staff": [
            "field_data", "emergency_reports",
        ],
        "supervisory_authority": [
            "national_data", "state_data", "district_data",
            "audit_logs", "compliance",
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════
# AUTHORIZATION FILTER
# ═══════════════════════════════════════════════════════════════════

class AuthorizationFilter:
    """Ensures no data reaches AI without proper authorization."""

    def filter_items(
        self,
        items: list[dict[str, Any]],
        user_ctx: UserContext,
    ) -> AuthorizationResult:
        """Filter context items based on user authorization."""
        authorized = []
        blocked = []

        for item in items:
            if self._is_authorized(item, user_ctx):
                authorized.append(item)
            else:
                blocked.append(item)

        if blocked:
            logger.warning(
                "Authorization filtered %d/%d items for user %s (role=%s)",
                len(blocked), len(items), user_ctx.user_id, user_ctx.role,
            )

        return AuthorizationResult(
            authorized=len(blocked) == 0,
            filtered_items=authorized,
            blocked_items=blocked,
            reason=f"{len(authorized)} authorized, {len(blocked)} blocked" if blocked else "all authorized",
        )

    def _is_authorized(self, item: dict[str, Any], user_ctx: UserContext) -> bool:
        """Check if a single item is authorized for the given user context."""
        scope = item.get("authorization_scope", {})

        # Public items are always accessible
        if scope.get("public", False):
            return True

        # Check organization scope
        org_id = scope.get("organization_id")
        if org_id and org_id != user_ctx.organization_id:
            return False

        # Check hospital scope
        hospital_id = scope.get("hospital_id")
        if hospital_id and hospital_id != user_ctx.hospital_id:
            return False

        # Government level scope
        gov_level = scope.get("government_level")
        if gov_level:
            allowed_levels = self._get_government_hierarchy(user_ctx.government_level)
            if gov_level not in allowed_levels:
                return False

        # Department scope
        dept_id = scope.get("department_id")
        if dept_id and dept_id != user_ctx.department_id:
            # CEO and above can see all departments
            if user_ctx.sub_role not in ("ceo", "national_admin", "state_admin"):
                return False

        # User-level scope
        item_user_id = scope.get("user_id")
        if item_user_id and item_user_id != user_ctx.user_id:
            return False

        return True

    def _get_government_hierarchy(self, level: str | None) -> list[str]:
        """Return all levels this government user can access."""
        if not level:
            return []
        hierarchy = {
            "national": ["national", "state", "district", "department"],
            "state": ["state", "district", "department"],
            "district": ["district", "department"],
            "department": ["department"],
        }
        return hierarchy.get(level, [])


# ═══════════════════════════════════════════════════════════════════
# CONTEXT BUILDER
# ═══════════════════════════════════════════════════════════════════

class AIContextBuilder:
    """
    Builds authorized AI context from user context + raw data.
    CRITICAL: All data passes through authorization before AI processing.
    """

    def __init__(self):
        self._auth_filter = AuthorizationFilter()

    async def build_context(
        self,
        user_ctx: UserContext,
        raw_items: list[dict[str, Any]],
        tier_overrides: dict[str, str] | None = None,
    ) -> AIContext:
        """
        Build an authorized AI context.

        Steps:
        1. Authorize all items against user permissions
        2. Classify items into tiers
        3. Sort by importance
        4. Construct final context
        """
        start_time = time.time()
        request_id = str(uuid4())

        # Step 1: Authorization filter
        auth_result = self._auth_filter.filter_items(raw_items, user_ctx)
        authorized_items = auth_result.filtered_items

        # Step 2: Classify into tiers
        tier_breakdown = {"tier_1": 0, "tier_2": 0, "tier_3": 0, "tier_4": 0}
        for item in authorized_items:
            tier = tier_overrides.get(item.get("source_id", ""), None) if tier_overrides else None
            if not tier:
                tier = self._classify_tier(item)
            item["_tier"] = tier
            tier_breakdown[tier] = tier_breakdown.get(tier, 0) + 1

        # Step 3: Sort by tier priority then importance
        tier_order = {"tier_1": 0, "tier_2": 1, "tier_3": 2, "tier_4": 3}
        authorized_items.sort(
            key=lambda x: (tier_order.get(x.get("_tier", "tier_2"), 1))
        )

        # Step 4: Build context
        total_tokens = sum(
            len(item.get("content", "")) // 4 for item in authorized_items
        )

        construction_time = (time.time() - start_time) * 1000

        return AIContext(
            user_ctx=user_ctx,
            request_id=request_id,
            items=authorized_items,
            tier_breakdown=tier_breakdown,
            total_tokens=total_tokens,
            authorization_filtered=len(auth_result.blocked_items),
            construction_time_ms=construction_time,
        )

    def get_allowed_tools(self, user_ctx: UserContext) -> list[str]:
        """Get the list of AI tools allowed for this user's role."""
        role_tools = ROLE_AI_TOOLS.get(user_ctx.role, [])

        if isinstance(role_tools, list):
            return role_tools

        if isinstance(role_tools, dict):
            return role_tools.get(user_ctx.sub_role, [])

        return []

    def _classify_tier(self, item: dict[str, Any]) -> str:
        """Classify a context item into a compression tier."""
        source_type = item.get("source_type", "")
        age_hours = item.get("age_hours", 0)

        # Critical: active emergencies, current patient
        if source_type in (
            "current_emergency", "active_patient",
            "critical_alert", "live_vitals",
        ):
            return "tier_1"

        # Historical: older than 7 days
        if age_hours > 168:
            return "tier_3"

        # Low-value: redundant data
        if source_type in ("ui_event", "redundant_output", "duplicate"):
            return "tier_4"

        return "tier_2"
