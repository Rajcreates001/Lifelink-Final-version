"""
Government Auth Service — Enterprise-Grade Government Authentication & Role Management
=======================================================================================
Extends the existing EnterpriseAuthService with government-specific:

- 62 government organizations with realistic metadata
- 200+ seeded demo users (3–5 per organization)
- 9-level role hierarchy (National Admin → Field Staff)
- Permission inheritance and granular scopes
- Session management with device tracking
- Full audit logging for every action
- LifeLink AI context per user/role/organization

Usage:
    service = GovernmentAuthService(pool)
    await service.bootstrap()  # Seeds everything on startup
    result = await service.login(email, password, ...)
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from uuid import uuid4

import bcrypt

from app.core.config import get_settings
from app.core.security import create_access_token
from app.services.enterprise_auth_service import EnterpriseAuthService

logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _id() -> str:
    return uuid4().hex

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

async def _fetch_one(pool, query: str, *args) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None

async def _fetch_all(pool, query: str, *args) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
        return [dict(row) for row in rows]

async def _execute(pool, query: str, *args) -> None:
    async with pool.acquire() as conn:
        await conn.execute(query, *args)


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT PERMISSIONS (extends enterprise permissions)
# ══════════════════════════════════════════════════════════════════

GOVERNMENT_PERMISSIONS: dict[str, str] = {
    # Dashboard & Analytics
    "dashboard:view": "View government dashboard",
    "dashboard:national": "Access national dashboard",
    "dashboard:state": "Access state dashboard",
    "dashboard:district": "Access district dashboard",
    "analytics:view": "View analytics & metrics",
    "analytics:export": "Export analytics data",
    "analytics:realtime": "View real-time analytics",

    # Emergency Management
    "emergency:view": "View emergencies",
    "emergency:coordinate": "Coordinate emergency response",
    "emergency:trigger": "Trigger emergency alerts",
    "emergency:dispatch": "Dispatch emergency units",
    "emergency:declare": "Declare emergency/disaster",
    "emergency:resolve": "Resolve emergencies",
    "emergency:national_mode": "Activate national disaster mode",
    "emergency:override": "Emergency override — bypass restrictions",

    # Government Operations
    "gov:view": "View government operations",
    "gov:manage": "Manage government operations",
    "gov:admin": "Government system administration",
    "gov:organizations": "Manage government organizations",
    "gov:departments": "Manage departments",

    # User Management
    "users:view": "View users",
    "users:create": "Create users",
    "users:edit": "Edit users",
    "users:delete": "Delete/suspend users",
    "users:assign": "Assign users to organizations",

    # Organization Management
    "organization:view": "View organizations",
    "organization:create": "Create organizations",
    "organization:edit": "Edit organizations",
    "organization:suspend": "Suspend organizations",
    "organization:delete": "Delete organizations",

    # Resource Management
    "resources:view": "View resources",
    "resources:allocate": "Allocate resources",
    "resources:approve": "Approve resource requests",
    "resources:manage": "Manage resource inventory",
    "resources:national": "Manage national resources",
    "resources:state": "Manage state resources",
    "resources:district": "Manage district resources",

    # Hospital Management
    "hospital:view": "View hospitals",
    "hospital:edit": "Edit hospital data",
    "hospital:oversight": "Hospital regulatory oversight",
    "hospital:capacity": "Manage hospital capacity",

    # Ambulance Management
    "ambulance:view": "View ambulances",
    "ambulance:dispatch": "Dispatch ambulances",
    "ambulance:manage": "Manage ambulance fleet",

    # Staff Management
    "staff:view": "View staff directory",
    "staff:assign": "Assign staff to duties",
    "staff:manage": "Manage staff records",

    # AI & Intelligence
    "ai:query": "Query LifeLink AI",
    "ai:configure": "Configure AI behavior",
    "ai:manage": "Manage AI models & settings",
    "ai:override": "Override AI recommendations",
    "intelligence:view": "View intelligence data",

    # Policy & Reports
    "policy:view": "View policies",
    "policy:write": "Create/edit policies",
    "policy:approve": "Approve policies",
    "reports:view": "View reports",
    "reports:generate": "Generate reports",
    "reports:approve": "Approve reports",
    "reports:export": "Export reports",

    # Simulation
    "simulation:view": "View simulations",
    "simulation:launch": "Launch simulations",
    "simulation:control": "Control running simulations",
    "simulation:manage": "Manage simulation scenarios",

    # Audit & Security
    "audit:view": "View audit logs",
    "audit:export": "Export audit logs",
    "security:view": "View security settings",
    "security:manage": "Manage security policies",
    "password:reset": "Reset user passwords",
    "session:manage": "Manage active sessions",

    # Volunteer & NGO Management
    "volunteer:view": "View volunteers",
    "volunteer:manage": "Manage volunteers",
    "ngo:view": "View NGOs",
    "ngo:coordinate": "Coordinate with NGOs",
    "ngo:manage": "Manage NGO partnerships",

    # Export & Data
    "export:data": "Export system data",
    "export:reports": "Export reports",
    "data:access": "Access data warehouse",
}


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT ROLE HIERARCHY (9-level)
# ══════════════════════════════════════════════════════════════════

GOVERNMENT_ROLES: dict[str, dict] = {
    # ── Level 9: National Admin (GOD MODE) ──
    "national_admin": {
        "description": "National Administrator — highest authority with unrestricted access across all government modules, organizations, and data",
        "priority": 100,
        "is_system": True,
        "level": 9,
        "permissions": list(GOVERNMENT_PERMISSIONS.keys()),
    },

    # ── Level 8: National Officer ──
    "national_officer": {
        "description": "National Officer — access to all national modules, can manage resources, dispatch emergencies, view analytics",
        "priority": 90,
        "is_system": True,
        "level": 8,
        "permissions": [
            "dashboard:view", "dashboard:national",
            "analytics:view", "analytics:export", "analytics:realtime",
            "emergency:view", "emergency:coordinate", "emergency:trigger", "emergency:dispatch",
            "gov:view", "gov:manage",
            "users:view",
            "organization:view",
            "resources:view", "resources:allocate", "resources:national",
            "hospital:view", "hospital:oversight",
            "ambulance:view", "ambulance:dispatch",
            "staff:view",
            "ai:query", "intelligence:view",
            "policy:view", "policy:write",
            "reports:view", "reports:generate", "reports:export",
            "simulation:view", "simulation:launch",
            "audit:view",
            "volunteer:view", "ngo:view",
            "export:data", "export:reports",
            "password:reset",
        ],
    },

    # ── Level 7: State Admin ──
    "state_admin": {
        "description": "State Administrator — full access to state-level modules, district management, and state resources",
        "priority": 80,
        "is_system": True,
        "level": 7,
        "permissions": [
            "dashboard:view", "dashboard:state",
            "analytics:view", "analytics:export",
            "emergency:view", "emergency:coordinate", "emergency:trigger", "emergency:dispatch",
            "gov:view", "gov:manage",
            "users:view", "users:assign",
            "organization:view",
            "resources:view", "resources:allocate", "resources:state",
            "hospital:view", "hospital:edit", "hospital:capacity",
            "ambulance:view", "ambulance:dispatch", "ambulance:manage",
            "staff:view", "staff:assign",
            "ai:query",
            "policy:view",
            "reports:view", "reports:generate", "reports:export",
            "simulation:view", "simulation:launch",
            "audit:view",
            "volunteer:view", "volunteer:manage", "ngo:view", "ngo:coordinate",
        ],
    },

    # ── Level 6: State Officer ──
    "state_officer": {
        "description": "State Officer — operational access to state modules, emergency coordination, resource management",
        "priority": 70,
        "level": 6,
        "permissions": [
            "dashboard:view", "dashboard:state",
            "analytics:view",
            "emergency:view", "emergency:coordinate", "emergency:dispatch",
            "gov:view",
            "resources:view", "resources:allocate",
            "hospital:view",
            "ambulance:view", "ambulance:dispatch",
            "staff:view",
            "ai:query",
            "reports:view", "reports:generate",
            "volunteer:view", "ngo:view",
        ],
    },

    # ── Level 5: District Admin ──
    "district_admin": {
        "description": "District Administrator — full access to district modules, local resources, emergency response",
        "priority": 60,
        "is_system": True,
        "level": 5,
        "permissions": [
            "dashboard:view", "dashboard:district",
            "analytics:view",
            "emergency:view", "emergency:coordinate", "emergency:trigger", "emergency:dispatch",
            "gov:view",
            "organization:view",
            "resources:view", "resources:allocate", "resources:district",
            "hospital:view", "hospital:capacity",
            "ambulance:view", "ambulance:dispatch",
            "staff:view", "staff:assign",
            "ai:query",
            "reports:view", "reports:generate",
            "simulation:view",
            "volunteer:view", "volunteer:manage", "ngo:view", "ngo:coordinate",
        ],
    },

    # ── Level 4: District Officer ──
    "district_officer": {
        "description": "District Officer — operational access to district modules and emergency coordination",
        "priority": 50,
        "level": 4,
        "permissions": [
            "dashboard:view", "dashboard:district",
            "emergency:view", "emergency:coordinate", "emergency:dispatch",
            "resources:view",
            "hospital:view",
            "ambulance:view", "ambulance:dispatch",
            "staff:view",
            "ai:query",
            "reports:view",
            "volunteer:view",
        ],
    },

    # ── Level 3: Department Head ──
    "department_head": {
        "description": "Department Head — manages department operations, staff, and resources",
        "priority": 40,
        "level": 3,
        "permissions": [
            "dashboard:view",
            "emergency:view", "emergency:coordinate",
            "resources:view",
            "staff:view", "staff:assign",
            "ai:query",
            "reports:view", "reports:generate",
        ],
    },

    # ── Level 2: Department Officer ──
    "department_officer": {
        "description": "Department Officer — operational staff with basic department access",
        "priority": 30,
        "level": 2,
        "permissions": [
            "dashboard:view",
            "emergency:view",
            "resources:view",
            "staff:view",
            "ai:query",
            "reports:view",
        ],
    },

    # ── Level 1: Field Staff ──
    "field_staff": {
        "description": "Field Staff — ground-level personnel with basic operational access",
        "priority": 20,
        "level": 1,
        "permissions": [
            "dashboard:view",
            "emergency:view",
            "ai:query",
            "reports:view",
        ],
    },
}


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT ORGANIZATIONS — 62 organizations
# ══════════════════════════════════════════════════════════════════

GOVERNMENT_ORGANIZATIONS: list[dict] = [
    # ── National Authorities (Command Tier) ──
    {"key": "ministry_health", "name": "Ministry of Health & Family Welfare", "description": "National health policy & governance", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 90, "ai_priority": 95, "default_dashboard": "health_dashboard", "color_theme": "#0284c7", "logo": "🏛️", "staff_count": 240, "ai_health": 94},
    {"key": "ndma", "name": "National Disaster Management Authority", "description": "Disaster preparedness & response coordination", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 100, "ai_priority": 92, "default_dashboard": "disaster_dashboard", "color_theme": "#dc2626", "logo": "🛡️", "staff_count": 180, "ai_health": 90},
    {"key": "ncdc", "name": "National Centre for Disease Control", "description": "Disease surveillance & outbreak control", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 85, "ai_priority": 90, "default_dashboard": "surveillance_dashboard", "color_theme": "#0891b2", "logo": "🔬", "staff_count": 120, "ai_health": 92},
    {"key": "icmr", "name": "Indian Council of Medical Research", "description": "Medical research & clinical trials", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 70, "ai_priority": 96, "default_dashboard": "research_dashboard", "color_theme": "#7c3aed", "logo": "⚗️", "staff_count": 90, "ai_health": 96},
    {"key": "nha", "name": "National Health Authority", "description": "Health insurance & Ayushman Bharat", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 75, "ai_priority": 88, "default_dashboard": "insurance_dashboard", "color_theme": "#6366f1", "logo": "🪪", "staff_count": 160, "ai_health": 88},
    {"key": "central_gov", "name": "Central Government Administrator", "description": "Central oversight & policy execution", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 85, "ai_priority": 91, "default_dashboard": "central_dashboard", "color_theme": "#475569", "logo": "🏛️", "staff_count": 300, "ai_health": 91},
    {"key": "national_emergency", "name": "National Emergency Command Centre", "description": "24/7 emergency response coordination", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 100, "ai_priority": 82, "default_dashboard": "necc_dashboard", "color_theme": "#be123c", "logo": "📡", "staff_count": 85, "ai_health": 82},
    {"key": "blood_council", "name": "National Blood Transfusion Council", "description": "National blood supply management", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 80, "ai_priority": 93, "default_dashboard": "blood_dashboard", "color_theme": "#dc2626", "logo": "🩸", "staff_count": 55, "ai_health": 93},
    {"key": "central_surveillance", "name": "Central Surveillance Unit", "description": "National health surveillance & monitoring", "category": "national", "location": "New Delhi", "status": "operational", "level": "national", "emergency_priority": 85, "ai_priority": 93, "default_dashboard": "surveillance_dashboard", "color_theme": "#0369a1", "logo": "🛰️", "staff_count": 85, "ai_health": 93},

    # ── State Authorities (Command Tier) ──
    {"key": "state_health", "name": "State Health Department", "description": "State healthcare administration", "category": "state", "location": "State Capital", "status": "operational", "level": "state", "emergency_priority": 85, "ai_priority": 90, "default_dashboard": "state_health_dashboard", "color_theme": "#0d9488", "logo": "🏥", "staff_count": 200, "ai_health": 90},
    {"key": "state_disaster", "name": "State Disaster Management Authority", "description": "State-level disaster response", "category": "state", "location": "State Capital", "status": "operational", "level": "state", "emergency_priority": 95, "ai_priority": 86, "default_dashboard": "state_disaster_dashboard", "color_theme": "#ea580c", "logo": "⚠️", "staff_count": 140, "ai_health": 86},
    {"key": "state_emergency", "name": "State Emergency Operations Centre", "description": "Emergency coordination & dispatch", "category": "state", "location": "State Capital", "status": "operational", "level": "state", "emergency_priority": 95, "ai_priority": 84, "default_dashboard": "state_eoc_dashboard", "color_theme": "#d97706", "logo": "📞", "staff_count": 75, "ai_health": 84},
    {"key": "state_medical", "name": "State Health Commissioner Office", "description": "Medical regulation & public health", "category": "state", "location": "State Capital", "status": "operational", "level": "state", "emergency_priority": 80, "ai_priority": 91, "default_dashboard": "state_medical_dashboard", "color_theme": "#059669", "logo": "👨‍⚕️", "staff_count": 110, "ai_health": 91},
    {"key": "state_surveillance", "name": "State Disease Surveillance Unit", "description": "Disease tracking & reporting", "category": "state", "location": "State Capital", "status": "operational", "level": "state", "emergency_priority": 80, "ai_priority": 89, "default_dashboard": "state_surveillance_dashboard", "color_theme": "#0284c7", "logo": "📈", "staff_count": 65, "ai_health": 89},

    # ── District Administration (Command Tier) ──
    {"key": "district_collector", "name": "District Collector Office", "description": "District administration & governance", "category": "district", "location": "District HQ", "status": "operational", "level": "district", "emergency_priority": 80, "ai_priority": 88, "default_dashboard": "district_collector_dashboard", "color_theme": "#1d4ed8", "logo": "🏢", "staff_count": 180, "ai_health": 88},
    {"key": "district_health", "name": "District Health Office", "description": "District health services & programs", "category": "district", "location": "District HQ", "status": "operational", "level": "district", "emergency_priority": 80, "ai_priority": 90, "default_dashboard": "district_health_dashboard", "color_theme": "#059669", "logo": "🏥", "staff_count": 120, "ai_health": 90},
    {"key": "district_emergency", "name": "District Emergency Control Room", "description": "Local emergency response coordination", "category": "district", "location": "District HQ", "status": "operational", "level": "district", "emergency_priority": 90, "ai_priority": 85, "default_dashboard": "district_emergency_dashboard", "color_theme": "#be123c", "logo": "📡", "staff_count": 45, "ai_health": 85},
    {"key": "district_surveillance", "name": "District Surveillance Office", "description": "Local disease & health monitoring", "category": "district", "location": "District HQ", "status": "operational", "level": "district", "emergency_priority": 70, "ai_priority": 87, "default_dashboard": "district_surveillance_dashboard", "color_theme": "#0891b2", "logo": "👁️", "staff_count": 35, "ai_health": 87},
    {"key": "district_disaster", "name": "District Disaster Management Cell", "description": "Local disaster preparedness & relief", "category": "district", "location": "District HQ", "status": "operational", "level": "district", "emergency_priority": 85, "ai_priority": 83, "default_dashboard": "district_disaster_dashboard", "color_theme": "#d97706", "logo": "⛑️", "staff_count": 50, "ai_health": 83},

    # ── Emergency Services ──
    {"key": "police", "name": "Police Department", "description": "Law enforcement & public safety", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 90, "ai_priority": 86, "default_dashboard": "police_dashboard", "color_theme": "#1e3a5f", "logo": "🛡️", "staff_count": 500, "ai_health": 86},
    {"key": "police_control", "name": "Police Control Room", "description": "Emergency dispatch & incident response", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 95, "ai_priority": 80, "default_dashboard": "police_control_dashboard", "color_theme": "#3730a3", "logo": "📡", "staff_count": 120, "ai_health": 80},
    {"key": "traffic_police", "name": "Traffic Control", "description": "Traffic management & road safety", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 70, "ai_priority": 84, "default_dashboard": "traffic_dashboard", "color_theme": "#ca8a04", "logo": "🚦", "staff_count": 200, "ai_health": 84},
    {"key": "cyber_crime", "name": "Cyber Crime Unit", "description": "Cyber crime investigation & prevention", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 60, "ai_priority": 92, "default_dashboard": "cyber_dashboard", "color_theme": "#7c3aed", "logo": "💻", "staff_count": 60, "ai_health": 92},
    {"key": "special_ops", "name": "Special Operations", "description": "Tactical response & special missions", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 90, "ai_priority": 88, "default_dashboard": "special_ops_dashboard", "color_theme": "#475569", "logo": "🎯", "staff_count": 80, "ai_health": 88},
    {"key": "intelligence", "name": "Intelligence Unit", "description": "Intelligence gathering & analysis", "category": "emergency_services", "location": "National Capital", "status": "operational", "level": "department", "emergency_priority": 90, "ai_priority": 90, "default_dashboard": "intelligence_dashboard", "color_theme": "#1e293b", "logo": "🕵️", "staff_count": 45, "ai_health": 90},

    # ── Fire & Rescue ──
    {"key": "fire", "name": "Fire & Emergency Services", "description": "Fire suppression & rescue operations", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 95, "ai_priority": 85, "default_dashboard": "fire_dashboard", "color_theme": "#dc2626", "logo": "🧯", "staff_count": 350, "ai_health": 85},
    {"key": "fire_control", "name": "Fire Control Room", "description": "Fire dispatch & incident management", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 95, "ai_priority": 82, "default_dashboard": "fire_control_dashboard", "color_theme": "#ea580c", "logo": "📡", "staff_count": 50, "ai_health": 82},
    {"key": "hazmat", "name": "Hazmat Team", "description": "Hazardous materials response", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 90, "ai_priority": 90, "default_dashboard": "hazmat_dashboard", "color_theme": "#d97706", "logo": "☣️", "staff_count": 40, "ai_health": 90},
    {"key": "ambulance_authority", "name": "Ambulance Authority", "description": "EMS fleet & patient transport", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 95, "ai_priority": 86, "default_dashboard": "ambulance_dashboard", "color_theme": "#059669", "logo": "🚑", "staff_count": 280, "ai_health": 86},
    {"key": "ambulance_dispatch", "name": "Ambulance Dispatch", "description": "Emergency dispatch & routing", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 95, "ai_priority": 81, "default_dashboard": "dispatch_dashboard", "color_theme": "#059669", "logo": "📍", "staff_count": 65, "ai_health": 81},

    # ── Health Department ──
    {"key": "public_health", "name": "Public Health Department", "description": "Population health & disease prevention", "category": "health", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 80, "ai_priority": 93, "default_dashboard": "public_health_dashboard", "color_theme": "#0891b2", "logo": "❤️", "staff_count": 150, "ai_health": 93},
    {"key": "epidemiology", "name": "Epidemiology Unit", "description": "Disease outbreak investigation", "category": "health", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 85, "ai_priority": 95, "default_dashboard": "epidemiology_dashboard", "color_theme": "#7c3aed", "logo": "🦠", "staff_count": 55, "ai_health": 95},
    {"key": "vaccination", "name": "Vaccination Office", "description": "Immunization programs & supply", "category": "health", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 75, "ai_priority": 91, "default_dashboard": "vaccination_dashboard", "color_theme": "#0284c7", "logo": "💉", "staff_count": 80, "ai_health": 91},
    {"key": "blood_bank_authority", "name": "Blood Bank Authority", "description": "National blood inventory & distribution", "category": "health", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 85, "ai_priority": 94, "default_dashboard": "blood_bank_dashboard", "color_theme": "#dc2626", "logo": "🩸", "staff_count": 60, "ai_health": 94},
    {"key": "animal_husbandry", "name": "Animal Husbandry Department", "description": "Livestock health & zoonotic disease control", "category": "health", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 60, "ai_priority": 88, "default_dashboard": "animal_husbandry_dashboard", "color_theme": "#059669", "logo": "🐴", "staff_count": 80, "ai_health": 88},
    {"key": "pharma_supply", "name": "Pharmaceutical Supply Authority", "description": "Medicine procurement & distribution", "category": "health", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 80, "ai_priority": 92, "default_dashboard": "pharma_dashboard", "color_theme": "#0891b2", "logo": "💊", "staff_count": 60, "ai_health": 92},
    {"key": "medical_equipment", "name": "Medical Equipment Authority", "description": "Medical device procurement & maintenance", "category": "health", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 75, "ai_priority": 90, "default_dashboard": "equipment_dashboard", "color_theme": "#6366f1", "logo": "🩺", "staff_count": 50, "ai_health": 90},

    # ── Disaster Response ──
    {"key": "ndrf", "name": "NDRF", "description": "National Disaster Response Force", "category": "disaster_response", "location": "Multiple Locations", "status": "operational", "level": "department", "emergency_priority": 100, "ai_priority": 87, "default_dashboard": "ndrf_dashboard", "color_theme": "#ea580c", "logo": "⛑️", "staff_count": 400, "ai_health": 87},
    {"key": "sdrf", "name": "SDRF", "description": "State Disaster Response Force", "category": "disaster_response", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 95, "ai_priority": 85, "default_dashboard": "sdrf_dashboard", "color_theme": "#d97706", "logo": "🛡️", "staff_count": 250, "ai_health": 85},
    {"key": "relief_coordination", "name": "Relief Coordination", "description": "Emergency relief & rehabilitation", "category": "disaster_response", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 90, "ai_priority": 88, "default_dashboard": "relief_dashboard", "color_theme": "#059669", "logo": "🤝", "staff_count": 100, "ai_health": 88},

    # ── Civic Administration ──
    {"key": "municipal", "name": "Municipal Corporation", "description": "Urban administration & civic services", "category": "civic", "location": "City", "status": "operational", "level": "department", "emergency_priority": 70, "ai_priority": 86, "default_dashboard": "municipal_dashboard", "color_theme": "#64748b", "logo": "🏙️", "staff_count": 350, "ai_health": 86},
    {"key": "municipal_health", "name": "Municipal Health Office", "description": "Urban health & sanitation", "category": "civic", "location": "City", "status": "operational", "level": "department", "emergency_priority": 70, "ai_priority": 88, "default_dashboard": "municipal_health_dashboard", "color_theme": "#0d9488", "logo": "🧹", "staff_count": 120, "ai_health": 88},
    {"key": "water_supply", "name": "Water Supply Department", "description": "Water distribution & quality", "category": "civic", "location": "City", "status": "operational", "level": "department", "emergency_priority": 65, "ai_priority": 82, "default_dashboard": "water_dashboard", "color_theme": "#0284c7", "logo": "💧", "staff_count": 90, "ai_health": 82},
    {"key": "waste_management", "name": "Waste Management", "description": "Solid waste & sanitation services", "category": "civic", "location": "City", "status": "operational", "level": "department", "emergency_priority": 60, "ai_priority": 80, "default_dashboard": "waste_dashboard", "color_theme": "#059669", "logo": "🗑️", "staff_count": 140, "ai_health": 80},
    {"key": "food_corporation", "name": "Food Corporation", "description": "Food supply & distribution during emergencies", "category": "civic", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 75, "ai_priority": 86, "default_dashboard": "food_dashboard", "color_theme": "#d97706", "logo": "🚚", "staff_count": 120, "ai_health": 86},

    # ── Infrastructure ──
    {"key": "transport", "name": "Transport Department", "description": "Transport regulation & logistics", "category": "infrastructure", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 70, "ai_priority": 84, "default_dashboard": "transport_dashboard", "color_theme": "#2563eb", "logo": "🚌", "staff_count": 100, "ai_health": 84},
    {"key": "nhai", "name": "National Highway Authority", "description": "Highway infrastructure & maintenance", "category": "infrastructure", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 65, "ai_priority": 86, "default_dashboard": "highway_dashboard", "color_theme": "#d97706", "logo": "🛣️", "staff_count": 80, "ai_health": 86},
    {"key": "railways", "name": "Railways", "description": "Rail transport & emergency logistics", "category": "infrastructure", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 75, "ai_priority": 85, "default_dashboard": "railway_dashboard", "color_theme": "#1d4ed8", "logo": "🚄", "staff_count": 200, "ai_health": 85},
    {"key": "airport", "name": "Airport Authority", "description": "Aviation & air emergency support", "category": "infrastructure", "location": "City", "status": "operational", "level": "department", "emergency_priority": 80, "ai_priority": 88, "default_dashboard": "airport_dashboard", "color_theme": "#0284c7", "logo": "✈️", "staff_count": 150, "ai_health": 88},
    {"key": "port_authority", "name": "Port Authority", "description": "Maritime operations & coastal logistics", "category": "infrastructure", "location": "Coastal City", "status": "operational", "level": "department", "emergency_priority": 70, "ai_priority": 87, "default_dashboard": "port_dashboard", "color_theme": "#2563eb", "logo": "🚢", "staff_count": 100, "ai_health": 87},
    {"key": "public_works", "name": "Public Works Department", "description": "Infrastructure construction & maintenance", "category": "infrastructure", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 65, "ai_priority": 84, "default_dashboard": "pwd_dashboard", "color_theme": "#ca8a04", "logo": "⛑️", "staff_count": 200, "ai_health": 84},

    # ── Utilities ──
    {"key": "electricity", "name": "Electricity Board", "description": "Power supply & grid management", "category": "utilities", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 80, "ai_priority": 84, "default_dashboard": "power_dashboard", "color_theme": "#ca8a04", "logo": "⚡", "staff_count": 180, "ai_health": 84},
    {"key": "telecom", "name": "Telecommunications", "description": "Communication networks & emergency lines", "category": "utilities", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 85, "ai_priority": 90, "default_dashboard": "telecom_dashboard", "color_theme": "#7c3aed", "logo": "📶", "staff_count": 75, "ai_health": 90},
    {"key": "imd", "name": "IMD — Weather Department", "description": "Weather forecasting & disaster warnings", "category": "utilities", "location": "New Delhi", "status": "operational", "level": "department", "emergency_priority": 85, "ai_priority": 92, "default_dashboard": "weather_dashboard", "color_theme": "#0891b2", "logo": "🌤️", "staff_count": 60, "ai_health": 92},

    # ── Environment ──
    {"key": "forest", "name": "Forest Department", "description": "Forest conservation & wildlife protection", "category": "environment", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 60, "ai_priority": 87, "default_dashboard": "forest_dashboard", "color_theme": "#059669", "logo": "🌲", "staff_count": 120, "ai_health": 87},
    {"key": "forest_fire", "name": "Forest Fire Control", "description": "Forest fire prevention & response", "category": "environment", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 85, "ai_priority": 83, "default_dashboard": "forest_fire_dashboard", "color_theme": "#dc2626", "logo": "🔥", "staff_count": 50, "ai_health": 83},

    # ── Civil Defence ──
    {"key": "civil_defence", "name": "Civil Defence", "description": "Civil protection & volunteer coordination", "category": "emergency_services", "location": "State Capital", "status": "operational", "level": "department", "emergency_priority": 80, "ai_priority": 86, "default_dashboard": "civil_defence_dashboard", "color_theme": "#d97706", "logo": "⛑️", "staff_count": 80, "ai_health": 86},

    # ── NGOs (Government-approved) ──
    {"key": "red_cross", "name": "Indian Red Cross Society", "description": "Humanitarian aid & disaster relief", "category": "ngo", "location": "New Delhi", "status": "operational", "level": "ngo", "emergency_priority": 80, "ai_priority": 90, "default_dashboard": "red_cross_dashboard", "color_theme": "#dc2626", "logo": "🤝", "staff_count": 200, "ai_health": 90},
    {"key": "goonj", "name": "Goonj", "description": "Disaster relief & community development", "category": "ngo", "location": "New Delhi", "status": "operational", "level": "ngo", "emergency_priority": 75, "ai_priority": 88, "default_dashboard": "goonj_dashboard", "color_theme": "#d97706", "logo": "📦", "staff_count": 120, "ai_health": 88},
    {"key": "seeds", "name": "SEEDS India", "description": "Disaster preparedness & resilient recovery", "category": "ngo", "location": "New Delhi", "status": "operational", "level": "ngo", "emergency_priority": 75, "ai_priority": 91, "default_dashboard": "seeds_dashboard", "color_theme": "#059669", "logo": "🌱", "staff_count": 60, "ai_health": 91},
    {"key": "doctors_for_you", "name": "Doctors For You", "description": "Medical relief & health camps", "category": "ngo", "location": "Mumbai", "status": "operational", "level": "ngo", "emergency_priority": 80, "ai_priority": 93, "default_dashboard": "dfu_dashboard", "color_theme": "#0284c7", "logo": "🩺", "staff_count": 85, "ai_health": 93},
    {"key": "care_india", "name": "CARE India", "description": "Poverty alleviation & emergency relief", "category": "ngo", "location": "New Delhi", "status": "operational", "level": "ngo", "emergency_priority": 70, "ai_priority": 87, "default_dashboard": "care_dashboard", "color_theme": "#2563eb", "logo": "🤲", "staff_count": 100, "ai_health": 87},
    {"key": "give_india", "name": "GiveIndia Disaster Response", "description": "Fundraising & relief coordination", "category": "ngo", "location": "Bangalore", "status": "operational", "level": "ngo", "emergency_priority": 65, "ai_priority": 89, "default_dashboard": "give_dashboard", "color_theme": "#7c3aed", "logo": "🎁", "staff_count": 50, "ai_health": 89},
    {"key": "akshaya_patra", "name": "Akshaya Patra — Relief", "description": "Food relief during emergencies", "category": "ngo", "location": "Bangalore", "status": "operational", "level": "ngo", "emergency_priority": 75, "ai_priority": 92, "default_dashboard": "akshaya_dashboard", "color_theme": "#ea580c", "logo": "🍽️", "staff_count": 80, "ai_health": 92},

    # ── Defence ──
    {"key": "army_liaison", "name": "Army Liaison", "description": "Army medical & logistics support", "category": "defence", "location": "New Delhi", "status": "operational", "level": "defence", "emergency_priority": 95, "ai_priority": 95, "default_dashboard": "army_dashboard", "color_theme": "#166534", "logo": "🛡️", "staff_count": 60, "ai_health": 95},
    {"key": "air_force_liaison", "name": "Air Force Liaison", "description": "Air evacuation & airdrop support", "category": "defence", "location": "New Delhi", "status": "operational", "level": "defence", "emergency_priority": 95, "ai_priority": 94, "default_dashboard": "airforce_dashboard", "color_theme": "#1d4ed8", "logo": "✈️", "staff_count": 40, "ai_health": 94},
    {"key": "navy_liaison", "name": "Navy Liaison", "description": "Maritime rescue & coastal support", "category": "defence", "location": "Mumbai", "status": "operational", "level": "defence", "emergency_priority": 90, "ai_priority": 93, "default_dashboard": "navy_dashboard", "color_theme": "#1e3a5f", "logo": "🚢", "staff_count": 35, "ai_health": 93},
    {"key": "medical_corps", "name": "Medical Corps", "description": "Armed forces medical services", "category": "defence", "location": "New Delhi", "status": "operational", "level": "defence", "emergency_priority": 95, "ai_priority": 96, "default_dashboard": "medical_corps_dashboard", "color_theme": "#be123c", "logo": "⭐", "staff_count": 80, "ai_health": 96},
]


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT USERS — 3-5 users per organization (200+ total)
# ══════════════════════════════════════════════════════════════════

class GovernmentUserSeed:
    """Builds realistic users for each government organization."""

    USERS: list[dict] = []

    @classmethod
    def _add(cls, org_key: str, role: str, name: str, email: str, password: str = "LifeLink@123",
             designation: str | None = None, employee_id: str | None = None) -> None:
        cls.USERS.append({
            "department": org_key,
            "role": role,
            "name": name,
            "email": email,
            "password": password,
            "designation": designation or role.replace("_", " ").title(),
            "employee_id": employee_id or f"GOV-{org_key.upper()}-{len([u for u in cls.USERS if u['department'] == org_key]) + 1:03d}",
        })

    @classmethod
    def build(cls) -> list[dict]:
        if cls.USERS:
            return cls.USERS

        # ── National Admin (GOD MODE) ──────────────
        cls._add("ndma", "national_admin", "Dr. Arjun Mehta", "national.admin@lifelink.demo", "LifeLink@123",
                 "National Administrator — Chief", "GOV-NADM-001")
        cls._add("ndma", "national_officer", "General Vikram Singh", "ndma.director@lifelink.demo", "LifeLink@123",
                 "Director, NDMA", "GOV-NDMA-001")
        cls._add("ndma", "national_officer", "Ms. Priya Sharma", "ndma.ops@lifelink.demo", "LifeLink@123",
                 "Senior Operations Officer", "GOV-NDMA-002")
        cls._add("ndma", "department_officer", "Mr. Aniket Joshi", "ndma.analyst@lifelink.demo", "LifeLink@123",
                 "Emergency Analyst", "GOV-NDMA-003")

        # ── Ministry of Health ──────────────────────
        cls._add("ministry_health", "national_officer", "Dr. Meera Patel", "health.secretary@lifelink.demo", "LifeLink@123",
                 "Health Secretary", "GOV-MH-001")
        cls._add("ministry_health", "department_head", "Dr. Rajesh Kumar", "health.addlsecretary@lifelink.demo", "LifeLink@123",
                 "Additional Secretary", "GOV-MH-002")
        cls._add("ministry_health", "department_officer", "Ms. Sunita Reddy", "health.policy@lifelink.demo", "LifeLink@123",
                 "Policy Officer", "GOV-MH-003")
        cls._add("ministry_health", "field_staff", "Mr. Karthik Nair", "health.coordinator@lifelink.demo", "LifeLink@123",
                 "Health Coordinator", "GOV-MH-004")

        # ── NCDC ──────────────────────────────────
        cls._add("ncdc", "national_officer", "Dr. Lakshmi Iyer", "ncdc.director@lifelink.demo", "LifeLink@123",
                 "Director, NCDC", "GOV-NCDC-001")
        cls._add("ncdc", "department_head", "Dr. Avinash Gupta", "ncdc.surveillance@lifelink.demo", "LifeLink@123",
                 "Chief Surveillance Officer", "GOV-NCDC-002")
        cls._add("ncdc", "department_officer", "Mr. Rohan Das", "ncdc.lab@lifelink.demo", "LifeLink@123",
                 "Lab Operations Manager", "GOV-NCDC-003")

        # ── ICMR ───────────────────────────────────
        cls._add("icmr", "national_officer", "Dr. Nandini Rao", "icmr.director@lifelink.demo", "LifeLink@123",
                 "Director General, ICMR", "GOV-ICMR-001")
        cls._add("icmr", "department_head", "Dr. Suresh Menon", "icmr.research@lifelink.demo", "LifeLink@123",
                 "Chief Research Officer", "GOV-ICMR-002")
        cls._add("icmr", "department_officer", "Ms. Deepa Krishnan", "icmr.trials@lifelink.demo", "LifeLink@123",
                 "Clinical Trials Manager", "GOV-ICMR-003")

        # ── NHA ────────────────────────────────────
        cls._add("nha", "national_officer", "Mr. Aditya Verma", "nha.ceo@lifelink.demo", "LifeLink@123",
                 "CEO, National Health Authority", "GOV-NHA-001")
        cls._add("nha", "department_head", "Ms. Kavita Joshi", "nha.operations@lifelink.demo", "LifeLink@123",
                 "Operations Director", "GOV-NHA-002")
        cls._add("nha", "department_officer", "Mr. Pranav Malhotra", "nha.insurance@lifelink.demo", "LifeLink@123",
                 "Insurance Program Manager", "GOV-NHA-003")

        # ── Central Government ─────────────────────
        cls._add("central_gov", "national_admin", "Mr. Abhishek Varma", "central.admin@lifelink.demo", "Gov@1234",
                 "Central Government Administrator", "GOV-CG-001")
        cls._add("central_gov", "national_officer", "Ms. Rohini Desai", "central.policy@lifelink.demo", "LifeLink@123",
                 "Policy Director", "GOV-CG-002")
        cls._add("central_gov", "department_officer", "Mr. Tarun Bajaj", "central.finance@lifelink.demo", "LifeLink@123",
                 "Finance Controller", "GOV-CG-003")
        cls._add("central_gov", "field_staff", "Mr. Vijay Chauhan", "central.audit@lifelink.demo", "LifeLink@123",
                 "Audit Officer", "GOV-CG-004")

        # ── National Emergency ──────────────────────
        cls._add("national_emergency", "national_admin", "Mr. Dhruv Rathore", "necc.director@lifelink.demo", "LifeLink@123",
                 "Director, NECC", "GOV-NECC-001")
        cls._add("national_emergency", "national_officer", "Ms. Ananya Shah", "necc.ops@lifelink.demo", "LifeLink@123",
                 "Operations Commander", "GOV-NECC-002")
        cls._add("national_emergency", "department_officer", "Mr. Karan Mehta", "necc.dispatch@lifelink.demo", "LifeLink@123",
                 "Dispatch Coordinator", "GOV-NECC-003")
        cls._add("national_emergency", "field_staff", "Ms. Riya Kapoor", "necc.comms@lifelink.demo", "LifeLink@123",
                 "Communications Officer", "GOV-NECC-004")

        # ── Blood Council ──────────────────────────
        cls._add("blood_council", "department_head", "Dr. Sunil Agarwal", "bloodcouncil.director@lifelink.demo", "LifeLink@123",
                 "Director, Blood Council", "GOV-BC-001")
        cls._add("blood_council", "department_officer", "Ms. Neha Gupta", "bloodcouncil.ops@lifelink.demo", "LifeLink@123",
                 "Operations Manager", "GOV-BC-002")
        cls._add("blood_council", "field_staff", "Mr. Ravi Singh", "bloodcouncil.logistics@lifelink.demo", "LifeLink@123",
                 "Logistics Officer", "GOV-BC-003")

        # ── Central Surveillance ────────────────────
        cls._add("central_surveillance", "department_head", "Dr. Vikram Joshi", "surveillance.director@lifelink.demo", "LifeLink@123",
                 "Director, Surveillance", "GOV-CSU-001")
        cls._add("central_surveillance", "department_officer", "Ms. Pooja Nair", "surveillance.analyst@lifelink.demo", "LifeLink@123",
                 "Senior Analyst", "GOV-CSU-002")
        cls._add("central_surveillance", "field_staff", "Mr. Amit Yadav", "surveillance.data@lifelink.demo", "LifeLink@123",
                 "Data Analyst", "GOV-CSU-003")

        # ── State Health ────────────────────────────
        cls._add("state_health", "state_admin", "Dr. Sanjay Gupta", "state.karnataka.admin@lifelink.demo", "LifeLink@123",
                 "State Health Commissioner", "GOV-SH-001")
        cls._add("state_health", "state_officer", "Ms. Lata Deshmukh", "state.health.ops@lifelink.demo", "LifeLink@123",
                 "State Health Operations", "GOV-SH-002")
        cls._add("state_health", "department_officer", "Mr. Mahesh Patil", "state.health.programs@lifelink.demo", "LifeLink@123",
                 "Program Manager", "GOV-SH-003")

        # ── State Disaster ──────────────────────────
        cls._add("state_disaster", "state_admin", "Col. Ranveer Singh", "state.disaster.admin@lifelink.demo", "LifeLink@123",
                 "State Disaster Commissioner", "GOV-SD-001")
        cls._add("state_disaster", "state_officer", "Ms. Swati Kale", "state.disaster.ops@lifelink.demo", "LifeLink@123",
                 "Operations Officer", "GOV-SD-002")
        cls._add("state_disaster", "department_officer", "Mr. Dinesh Naik", "state.disaster.resources@lifelink.demo", "LifeLink@123",
                 "Resource Manager", "GOV-SD-003")

        # ── State Emergency ─────────────────────────
        cls._add("state_emergency", "state_admin", "Mr. Harshvardhan Rao", "state.eoc.director@lifelink.demo", "LifeLink@123",
                 "Director, State EOC", "GOV-SE-001")
        cls._add("state_emergency", "state_officer", "Ms. Shruti Kulkarni", "state.eoc.coordinator@lifelink.demo", "LifeLink@123",
                 "Emergency Coordinator", "GOV-SE-002")
        cls._add("state_emergency", "department_officer", "Mr. Nikhil Pawar", "state.eoc.dispatch@lifelink.demo", "LifeLink@123",
                 "Dispatch Lead", "GOV-SE-003")

        # ── State Medical ───────────────────────────
        cls._add("state_medical", "state_officer", "Dr. Alka Tendulkar", "state.medical.commissioner@lifelink.demo", "LifeLink@123",
                 "Health Commissioner", "GOV-SM-001")
        cls._add("state_medical", "department_officer", "Mr. Ashwin Shetty", "state.medical.regulation@lifelink.demo", "LifeLink@123",
                 "Regulatory Officer", "GOV-SM-002")
        cls._add("state_medical", "field_staff", "Ms. Bhavana Rai", "state.medical.inspection@lifelink.demo", "LifeLink@123",
                 "Medical Inspector", "GOV-SM-003")

        # ── State Surveillance ──────────────────────
        cls._add("state_surveillance", "department_head", "Dr. Kiran Bhat", "state.surveillance.head@lifelink.demo", "LifeLink@123",
                 "Surveillance Head", "GOV-SS-001")
        cls._add("state_surveillance", "department_officer", "Ms. Anjali Deshpande", "state.surveillance.reporting@lifelink.demo", "LifeLink@123",
                 "Reporting Officer", "GOV-SS-002")
        cls._add("state_surveillance", "field_staff", "Mr. Ramesh Kulkarni", "state.surveillance.field@lifelink.demo", "LifeLink@123",
                 "Field Investigator", "GOV-SS-003")

        # ── District Collector ──────────────────────
        cls._add("district_collector", "district_admin", "Mr. Varun Chandrashekar", "district.bengaluru.admin@lifelink.demo", "LifeLink@123",
                 "District Collector", "GOV-DC-001")
        cls._add("district_collector", "district_officer", "Ms. Pallavi Shenoy", "district.collector.deputy@lifelink.demo", "LifeLink@123",
                 "Deputy Collector", "GOV-DC-002")
        cls._add("district_collector", "district_officer", "Mr. Ganesh Iyer", "district.collector.planning@lifelink.demo", "LifeLink@123",
                 "Emergency Planning Officer", "GOV-DC-003")

        # ── District Health ─────────────────────────
        cls._add("district_health", "district_admin", "Dr. Mohan Kumar", "district.health.admin@lifelink.demo", "LifeLink@123",
                 "District Health Officer", "GOV-DH-001")
        cls._add("district_health", "district_officer", "Ms. Radhika Shenoy", "district.health.programs@lifelink.demo", "LifeLink@123",
                 "Program Coordinator", "GOV-DH-002")
        cls._add("district_health", "department_officer", "Mr. Suresh Babu", "district.health.immunization@lifelink.demo", "LifeLink@123",
                 "Immunization Officer", "GOV-DH-003")

        # ── District Emergency ──────────────────────
        cls._add("district_emergency", "district_admin", "Mr. Arvind Tiwari", "district.emergency.control@lifelink.demo", "LifeLink@123",
                 "District Emergency Controller", "GOV-DE-001")
        cls._add("district_emergency", "district_officer", "Ms. Nalini Krishnan", "district.emergency.response@lifelink.demo", "LifeLink@123",
                 "Response Coordinator", "GOV-DE-002")
        cls._add("district_emergency", "field_staff", "Mr. Pradeep Rao", "district.emergency.field@lifelink.demo", "LifeLink@123",
                 "Field Response Officer", "GOV-DE-003")

        # ── District Surveillance ───────────────────
        cls._add("district_surveillance", "department_head", "Dr. Shilpa Menon", "district.surveillance.head@lifelink.demo", "LifeLink@123",
                 "Surveillance Head", "GOV-DS-001")
        cls._add("district_surveillance", "department_officer", "Mr. Yogesh Patil", "district.surveillance.monitoring@lifelink.demo", "LifeLink@123",
                 "Monitoring Officer", "GOV-DS-002")
        cls._add("district_surveillance", "field_staff", "Ms. Kavita Rao", "district.surveillance.field@lifelink.demo", "LifeLink@123",
                 "Field Investigator", "GOV-DS-003")

        # ── District Disaster ───────────────────────
        cls._add("district_disaster", "district_admin", "Mr. Omkar Joshi", "district.disaster.admin@lifelink.demo", "LifeLink@123",
                 "District Disaster Manager", "GOV-DD-001")
        cls._add("district_disaster", "district_officer", "Ms. Aishwarya Patil", "district.disaster.preparedness@lifelink.demo", "LifeLink@123",
                 "Preparedness Officer", "GOV-DD-002")
        cls._add("district_disaster", "field_staff", "Mr. Sachin Naik", "district.disaster.relief@lifelink.demo", "LifeLink@123",
                 "Relief Officer", "GOV-DD-003")

        # ── Police ─────────────────────────────────
        cls._add("police", "department_head", "Mr. Hemant Bhosle", "police.commissioner@lifelink.demo", "LifeLink@123",
                 "Police Commissioner", "GOV-PL-001")
        cls._add("police", "district_officer", "Ms. Indira Rajan", "police.deputy.commissioner@lifelink.demo", "LifeLink@123",
                 "Deputy Commissioner", "GOV-PL-002")
        cls._add("police", "department_officer", "Mr. Sandeep Wagh", "police.control.officer@lifelink.demo", "LifeLink@123",
                 "Emergency Control Officer", "GOV-PL-003")

        # ── Police Control ─────────────────────────
        cls._add("police_control", "department_head", "Mr. Imran Qureshi", "policecontrol.director@lifelink.demo", "LifeLink@123",
                 "Control Room Director", "GOV-PC-001")
        cls._add("police_control", "department_officer", "Ms. Jasmine D'Souza", "policecontrol.dispatch@lifelink.demo", "LifeLink@123",
                 "Dispatch Supervisor", "GOV-PC-002")
        cls._add("police_control", "field_staff", "Mr. Rajeshwari Kamath", "policecontrol.comms@lifelink.demo", "LifeLink@123",
                 "Communications Officer", "GOV-PC-003")

        # ── Traffic Police ─────────────────────────
        cls._add("traffic_police", "department_head", "Mr. Dhananjay Gokhale", "traffic.commissioner@lifelink.demo", "LifeLink@123",
                 "Traffic Commissioner", "GOV-TP-001")
        cls._add("traffic_police", "department_officer", "Ms. Vaishali Sawant", "traffic.ops@lifelink.demo", "LifeLink@123",
                 "Traffic Operations Manager", "GOV-TP-002")
        cls._add("traffic_police", "field_staff", "Mr. Prakash Mane", "traffic.field@lifelink.demo", "LifeLink@123",
                 "Traffic Field Officer", "GOV-TP-003")

        # ── Cyber Crime ────────────────────────────
        cls._add("cyber_crime", "department_head", "Mr. Arjun Rathore", "cyber.director@lifelink.demo", "LifeLink@123",
                 "Cyber Crime Director", "GOV-CC-001")
        cls._add("cyber_crime", "department_officer", "Ms. Divya Saxena", "cyber.investigation@lifelink.demo", "LifeLink@123",
                 "Investigation Lead", "GOV-CC-002")
        cls._add("cyber_crime", "field_staff", "Mr. Varun Mishra", "cyber.analyst@lifelink.demo", "LifeLink@123",
                 "Cyber Analyst", "GOV-CC-003")

        # ── Special Ops ────────────────────────────
        cls._add("special_ops", "department_head", "Col. Shivraj Deshmukh", "specialops.commandant@lifelink.demo", "LifeLink@123",
                 "Special Ops Commandant", "GOV-SO-001")
        cls._add("special_ops", "department_officer", "Ms. Zahra Khan", "specialops.planner@lifelink.demo", "LifeLink@123",
                 "Ops Planner", "GOV-SO-002")
        cls._add("special_ops", "field_staff", "Mr. Ranveer Chauhan", "specialops.tactical@lifelink.demo", "LifeLink@123",
                 "Tactical Officer", "GOV-SO-003")

        # ── Intelligence ───────────────────────────
        cls._add("intelligence", "department_head", "Mr. Yashwant Sinha", "intelligence.chief@lifelink.demo", "LifeLink@123",
                 "Intelligence Chief", "GOV-IN-001")
        cls._add("intelligence", "department_officer", "Ms. Meghana Raj", "intelligence.analyst@lifelink.demo", "LifeLink@123",
                 "Senior Analyst", "GOV-IN-002")
        cls._add("intelligence", "field_staff", "Mr. Kunal Agarwal", "intelligence.field@lifelink.demo", "LifeLink@123",
                 "Field Intelligence Officer", "GOV-IN-003")

        # ── Fire ──────────────────────────────────
        cls._add("fire", "department_head", "Mr. Ramesh Prabhu", "fire.chief@lifelink.demo", "LifeLink@123",
                 "Chief Fire Officer", "GOV-FR-001")
        cls._add("fire", "district_officer", "Ms. Shweta Dalvi", "fire.regional.commander@lifelink.demo", "LifeLink@123",
                 "Regional Commander", "GOV-FR-002")
        cls._add("fire", "department_officer", "Mr. Jatin Shah", "fire.response@lifelink.demo", "LifeLink@123",
                 "Fire Response Officer", "GOV-FR-003")

        # ── Fire Control ───────────────────────────
        cls._add("fire_control", "department_head", "Mr. Nilesh Kamble", "firecontrol.director@lifelink.demo", "LifeLink@123",
                 "Fire Control Director", "GOV-FC-001")
        cls._add("fire_control", "department_officer", "Ms. Seema Bhatt", "firecontrol.dispatch@lifelink.demo", "LifeLink@123",
                 "Dispatch Supervisor", "GOV-FC-002")
        cls._add("fire_control", "field_staff", "Mr. Vivek Pandit", "firecontrol.operator@lifelink.demo", "LifeLink@123",
                 "Control Operator", "GOV-FC-003")

        # ── Hazmat ────────────────────────────────
        cls._add("hazmat", "department_head", "Dr. Aparna Gokarn", "hazmat.chief@lifelink.demo", "LifeLink@123",
                 "Hazmat Chief", "GOV-HZ-001")
        cls._add("hazmat", "department_officer", "Mr. Bhushan Pawar", "hazmat.ops@lifelink.demo", "LifeLink@123",
                 "Hazmat Operations", "GOV-HZ-002")
        cls._add("hazmat", "field_staff", "Ms. Chandrika Patil", "hazmat.response@lifelink.demo", "LifeLink@123",
                 "Hazmat Response Officer", "GOV-HZ-003")

        # ── Ambulance Authority ─────────────────────
        cls._add("ambulance_authority", "department_head", "Dr. Arvind Kelkar", "ambulance.director@lifelink.demo", "LifeLink@123",
                 "Director, Ambulance Authority", "GOV-AA-001")
        cls._add("ambulance_authority", "department_officer", "Ms. Neelam Sharma", "ambulance.ops@lifelink.demo", "LifeLink@123",
                 "Operations Manager", "GOV-AA-002")
        cls._add("ambulance_authority", "field_staff", "Mr. Sanjay More", "ambulance.fleet@lifelink.demo", "LifeLink@123",
                 "Fleet Manager", "GOV-AA-003")

        # ── Ambulance Dispatch ──────────────────────
        cls._add("ambulance_dispatch", "department_head", "Mr. Uday Kulkarni", "ambdispatch.manager@lifelink.demo", "LifeLink@123",
                 "Dispatch Manager", "GOV-AD-001")
        cls._add("ambulance_dispatch", "department_officer", "Ms. Farah Sheikh", "ambdispatch.coordinator@lifelink.demo", "LifeLink@123",
                 "Dispatch Coordinator", "GOV-AD-002")
        cls._add("ambulance_dispatch", "field_staff", "Mr. Deepak Salunkhe", "ambdispatch.routing@lifelink.demo", "LifeLink@123",
                 "Routing Officer", "GOV-AD-003")

        # ── Public Health ──────────────────────────
        cls._add("public_health", "department_head", "Dr. Anuradha Kulkarni", "publichealth.director@lifelink.demo", "LifeLink@123",
                 "Director, Public Health", "GOV-PH-001")
        cls._add("public_health", "department_officer", "Mr. Milind Bhosale", "publichealth.programs@lifelink.demo", "LifeLink@123",
                 "Program Manager", "GOV-PH-002")
        cls._add("public_health", "field_staff", "Ms. Sneha Pawar", "publichealth.outreach@lifelink.demo", "LifeLink@123",
                 "Outreach Coordinator", "GOV-PH-003")

        # ── Epidemiology ───────────────────────────
        cls._add("epidemiology", "department_head", "Dr. Chetan Nair", "epidemiology.chief@lifelink.demo", "LifeLink@123",
                 "Chief Epidemiologist", "GOV-EP-001")
        cls._add("epidemiology", "department_officer", "Ms. Tanya Saxena", "epidemiology.investigation@lifelink.demo", "LifeLink@123",
                 "Investigation Lead", "GOV-EP-002")
        cls._add("epidemiology", "field_staff", "Mr. Anand Mishra", "epidemiology.field@lifelink.demo", "LifeLink@123",
                 "Field Investigator", "GOV-EP-003")

        # ── Vaccination ────────────────────────────
        cls._add("vaccination", "department_head", "Dr. Pallavi Joshi", "vaccination.director@lifelink.demo", "LifeLink@123",
                 "Vaccination Director", "GOV-VC-001")
        cls._add("vaccination", "department_officer", "Mr. Rajendra Chavan", "vaccination.supply@lifelink.demo", "LifeLink@123",
                 "Supply Chain Manager", "GOV-VC-002")
        cls._add("vaccination", "field_staff", "Ms. Savita Kale", "vaccination.camp@lifelink.demo", "LifeLink@123",
                 "Camp Coordinator", "GOV-VC-003")

        # ── Blood Bank Authority ───────────────────
        cls._add("blood_bank_authority", "department_head", "Dr. Harish Pandey", "bloodbank.director@lifelink.demo", "LifeLink@123",
                 "Blood Bank Director", "GOV-BB-001")
        cls._add("blood_bank_authority", "department_officer", "Ms. Ritika Jain", "bloodbank.inventory@lifelink.demo", "LifeLink@123",
                 "Inventory Manager", "GOV-BB-002")
        cls._add("blood_bank_authority", "field_staff", "Mr. Pankaj Tiwari", "bloodbank.logistics@lifelink.demo", "LifeLink@123",
                 "Logistics Officer", "GOV-BB-003")

        # ── NDRF ──────────────────────────────────
        cls._add("ndrf", "department_head", "Mr. Deepak Kumar", "ndrf.commander@lifelink.demo", "LifeLink@123",
                 "NDRF Commander", "GOV-NDRF-001")
        cls._add("ndrf", "department_officer", "Ms. Ritu Chaudhary", "ndrf.deputy@lifelink.demo", "LifeLink@123",
                 "Deputy Commander", "GOV-NDRF-002")
        cls._add("ndrf", "field_staff", "Mr. Mohan Singh", "ndrf.battalion@lifelink.demo", "LifeLink@123",
                 "Battalion Officer", "GOV-NDRF-003")
        cls._add("ndrf", "field_staff", "Mr. Jitendra Yadav", "ndrf.rescue@lifelink.demo", "LifeLink@123",
                 "Rescue Specialist", "GOV-NDRF-004")

        # ── SDRF ──────────────────────────────────
        cls._add("sdrf", "department_head", "Mr. Subhash Gaikwad", "sdrf.chief@lifelink.demo", "LifeLink@123",
                 "SDRF Chief", "GOV-SDRF-001")
        cls._add("sdrf", "department_officer", "Ms. Priyanka Mane", "sdrf.ops@lifelink.demo", "LifeLink@123",
                 "Operations Officer", "GOV-SDRF-002")
        cls._add("sdrf", "field_staff", "Mr. Gopal Khandekar", "sdrf.field@lifelink.demo", "LifeLink@123",
                 "Field Commander", "GOV-SDRF-003")

        # ── Relief Coordination ─────────────────────
        cls._add("relief_coordination", "department_head", "Ms. Ankita Sharma", "relief.director@lifelink.demo", "LifeLink@123",
                 "Relief Director", "GOV-RC-001")
        cls._add("relief_coordination", "department_officer", "Mr. Suraj Verma", "relief.camps@lifelink.demo", "LifeLink@123",
                 "Camp Coordinator", "GOV-RC-002")
        cls._add("relief_coordination", "field_staff", "Ms. Geeta Patil", "relief.field@lifelink.demo", "LifeLink@123",
                 "Field Relief Officer", "GOV-RC-003")

        # ── Municipal ──────────────────────────────
        cls._add("municipal", "department_head", "Mr. Harish Rao", "municipal.commissioner@lifelink.demo", "LifeLink@123",
                 "Municipal Commissioner", "GOV-MC-001")
        cls._add("municipal", "department_officer", "Ms. Shalini Iyer", "municipal.health@lifelink.demo", "LifeLink@123",
                 "Health Officer", "GOV-MC-002")
        cls._add("municipal", "field_staff", "Mr. Ravi Kini", "municipal.engineering@lifelink.demo", "LifeLink@123",
                 "City Engineer", "GOV-MC-003")

        # ── Municipal Health ───────────────────────
        cls._add("municipal_health", "department_head", "Dr. Jyoti Desai", "municipalhealth.officer@lifelink.demo", "LifeLink@123",
                 "Municipal Health Officer", "GOV-MH2-001")
        cls._add("municipal_health", "department_officer", "Mr. Vinayak Joshi", "municipalhealth.sanitation@lifelink.demo", "LifeLink@123",
                 "Sanitation Officer", "GOV-MH2-002")
        cls._add("municipal_health", "field_staff", "Ms. Savita Kamath", "municipalhealth.inspection@lifelink.demo", "LifeLink@123",
                 "Health Inspector", "GOV-MH2-003")

        # ── Water Supply ───────────────────────────
        cls._add("water_supply", "department_head", "Mr. Chandrashekar Patil", "water.engineer@lifelink.demo", "LifeLink@123",
                 "Chief Engineer, Water", "GOV-WS-001")
        cls._add("water_supply", "department_officer", "Ms. Rohini Bapat", "water.quality@lifelink.demo", "LifeLink@123",
                 "Quality Manager", "GOV-WS-002")
        cls._add("water_supply", "field_staff", "Mr. Shantanu More", "water.distribution@lifelink.demo", "LifeLink@123",
                 "Distribution Officer", "GOV-WS-003")

        # ── Waste Management ───────────────────────
        cls._add("waste_management", "department_head", "Mr. Prakash Shetty", "waste.director@lifelink.demo", "LifeLink@123",
                 "Director, Waste Management", "GOV-WM-001")
        cls._add("waste_management", "department_officer", "Ms. Deepali Kulkarni", "waste.ops@lifelink.demo", "LifeLink@123",
                 "Operations Manager", "GOV-WM-002")
        cls._add("waste_management", "field_staff", "Mr. Santosh Gaikwad", "waste.field@lifelink.demo", "LifeLink@123",
                 "Field Supervisor", "GOV-WM-003")

        # ── Food Corporation ──────────────────────
        cls._add("food_corporation", "department_head", "Mr. Dilip Agarwal", "foodcorp.managing.director@lifelink.demo", "LifeLink@123",
                 "Managing Director", "GOV-FC2-001")
        cls._add("food_corporation", "department_officer", "Ms. Bhavana Trivedi", "foodcorp.supply@lifelink.demo", "LifeLink@123",
                 "Supply Chain Director", "GOV-FC2-002")
        cls._add("food_corporation", "field_staff", "Mr. Dharmendra Yadav", "foodcorp.distribution@lifelink.demo", "LifeLink@123",
                 "Distribution Officer", "GOV-FC2-003")

        # ── Transport ─────────────────────────────
        cls._add("transport", "department_head", "Mr. Sudhir Mhatre", "transport.commissioner@lifelink.demo", "LifeLink@123",
                 "Transport Commissioner", "GOV-TR-001")
        cls._add("transport", "department_officer", "Ms. Archana Kelkar", "transport.regulation@lifelink.demo", "LifeLink@123",
                 "Regulation Officer", "GOV-TR-002")
        cls._add("transport", "field_staff", "Mr. Prakash Kamble", "transport.enforcement@lifelink.demo", "LifeLink@123",
                 "Enforcement Officer", "GOV-TR-003")

        # ── NHAI ──────────────────────────────────
        cls._add("nhai", "department_head", "Mr. Rohit Bhatia", "nhai.project.director@lifelink.demo", "LifeLink@123",
                 "Project Director", "GOV-NHAI-001")
        cls._add("nhai", "department_officer", "Ms. Nandita Ghosh", "nhai.engineering@lifelink.demo", "LifeLink@123",
                 "Chief Engineer", "GOV-NHAI-002")
        cls._add("nhai", "field_staff", "Mr. Satish Reddiar", "nhai.survey@lifelink.demo", "LifeLink@123",
                 "Survey Officer", "GOV-NHAI-003")

        # ── Railways ──────────────────────────────
        cls._add("railways", "department_head", "Mr. Dhananjay Kumar", "railways.gm@lifelink.demo", "LifeLink@123",
                 "General Manager, Railways", "GOV-RL-001")
        cls._add("railways", "department_officer", "Ms. Sangita Rao", "railways.operations@lifelink.demo", "LifeLink@123",
                 "Operations Director", "GOV-RL-002")
        cls._add("railways", "field_staff", "Mr. Amar Jeet Singh", "railways.logistics@lifelink.demo", "LifeLink@123",
                 "Logistics Coordinator", "GOV-RL-003")

        # ── Airport ───────────────────────────────
        cls._add("airport", "department_head", "Mr. Krishnan Nambiar", "airport.director@lifelink.demo", "LifeLink@123",
                 "Airport Director", "GOV-AP-001")
        cls._add("airport", "department_officer", "Ms. Sylvia Fernandes", "airport.ops@lifelink.demo", "LifeLink@123",
                 "Operations Manager", "GOV-AP-002")
        cls._add("airport", "field_staff", "Mr. Mohammed Rafiq", "airport.security@lifelink.demo", "LifeLink@123",
                 "Security Coordinator", "GOV-AP-003")

        # ── Port Authority ────────────────────────
        cls._add("port_authority", "department_head", "Capt. Srinivas Murthy", "port.chairman@lifelink.demo", "LifeLink@123",
                 "Port Chairman", "GOV-PA-001")
        cls._add("port_authority", "department_officer", "Ms. Lakshmi Nair", "port.ops@lifelink.demo", "LifeLink@123",
                 "Port Operations", "GOV-PA-002")
        cls._add("port_authority", "field_staff", "Mr. Francis D'Mello", "port.security@lifelink.demo", "LifeLink@123",
                 "Port Security", "GOV-PA-003")

        # ── Public Works ──────────────────────────
        cls._add("public_works", "department_head", "Mr. Shashank Bhat", "pwd.chief.engineer@lifelink.demo", "LifeLink@123",
                 "Chief Engineer, PWD", "GOV-PW-001")
        cls._add("public_works", "department_officer", "Ms. Arundhati Dhar", "pwd.projects@lifelink.demo", "LifeLink@123",
                 "Projects Manager", "GOV-PW-002")
        cls._add("public_works", "field_staff", "Mr. Balaji Krishnan", "pwd.maintenance@lifelink.demo", "LifeLink@123",
                 "Maintenance Officer", "GOV-PW-003")

        # ── Electricity Board ─────────────────────
        cls._add("electricity", "department_head", "Mr. Suryakant Patil", "electricity.ceo@lifelink.demo", "LifeLink@123",
                 "CEO, Electricity Board", "GOV-EB-001")
        cls._add("electricity", "department_officer", "Ms. Vaishali Kulkarni", "electricity.grid@lifelink.demo", "LifeLink@123",
                 "Grid Manager", "GOV-EB-002")
        cls._add("electricity", "field_staff", "Mr. Sharad Gaikwad", "electricity.distribution@lifelink.demo", "LifeLink@123",
                 "Distribution Officer", "GOV-EB-003")

        # ── Telecom ───────────────────────────────
        cls._add("telecom", "department_head", "Mr. Siddharth Kapoor", "telecom.director@lifelink.demo", "LifeLink@123",
                 "Director, Telecom", "GOV-TC-001")
        cls._add("telecom", "department_officer", "Ms. Asha Nair", "telecom.networks@lifelink.demo", "LifeLink@123",
                 "Network Manager", "GOV-TC-002")
        cls._add("telecom", "field_staff", "Mr. Pratik Shah", "telecom.emergency@lifelink.demo", "LifeLink@123",
                 "Emergency Communications Officer", "GOV-TC-003")

        # ── IMD ───────────────────────────────────
        cls._add("imd", "department_head", "Dr. Rajendra Bawaskar", "imd.director@lifelink.demo", "LifeLink@123",
                 "Director, IMD", "GOV-IMD-001")
        cls._add("imd", "department_officer", "Ms. Shubhangi Karande", "imd.forecasting@lifelink.demo", "LifeLink@123",
                 "Chief Meteorologist", "GOV-IMD-002")
        cls._add("imd", "field_staff", "Mr. Anil Kumar", "imd.warnings@lifelink.demo", "LifeLink@123",
                 "Warning Officer", "GOV-IMD-003")

        # ── Forest ────────────────────────────────
        cls._add("forest", "department_head", "Mr. Ranganath Shetty", "forest.pccf@lifelink.demo", "LifeLink@123",
                 "Principal Chief Conservator", "GOV-FR2-001")
        cls._add("forest", "department_officer", "Ms. Varsha Bhosle", "forest.conservation@lifelink.demo", "LifeLink@123",
                 "Conservation Officer", "GOV-FR2-002")
        cls._add("forest", "field_staff", "Mr. Manoj Sawant", "forest.ranger@lifelink.demo", "LifeLink@123",
                 "Forest Ranger", "GOV-FR2-003")

        # ── Forest Fire ───────────────────────────
        cls._add("forest_fire", "department_head", "Mr. Prakash Jadhav", "forestfire.chief@lifelink.demo", "LifeLink@123",
                 "Fire Control Chief", "GOV-FF-001")
        cls._add("forest_fire", "department_officer", "Ms. Urmila Patil", "forestfire.ops@lifelink.demo", "LifeLink@123",
                 "Fire Operations", "GOV-FF-002")
        cls._add("forest_fire", "field_staff", "Mr. Dattatreya Gawade", "forestfire.response@lifelink.demo", "LifeLink@123",
                 "Fire Response Officer", "GOV-FF-003")

        # ── Civil Defence ─────────────────────────
        cls._add("civil_defence", "department_head", "Mr. Hrishikesh Bapat", "civildefence.controller@lifelink.demo", "LifeLink@123",
                 "Civil Defence Controller", "GOV-CD-001")
        cls._add("civil_defence", "department_officer", "Ms. Padma Kini", "civildefence.volunteers@lifelink.demo", "LifeLink@123",
                 "Volunteer Coordinator", "GOV-CD-002")
        cls._add("civil_defence", "field_staff", "Mr. Shridhar Gokhale", "civildefence.training@lifelink.demo", "LifeLink@123",
                 "Training Officer", "GOV-CD-003")

        # ── Red Cross ─────────────────────────────
        cls._add("red_cross", "department_head", "Dr. Farzana Irani", "redcross.chairman@lifelink.demo", "LifeLink@123",
                 "Chairman, Red Cross", "GOV-RC2-001")
        cls._add("red_cross", "department_officer", "Mr. Ashish Ranade", "redcross.relief@lifelink.demo", "LifeLink@123",
                 "Relief Manager", "GOV-RC2-002")
        cls._add("red_cross", "field_staff", "Ms. Juliet Pereira", "redcross.volunteer@lifelink.demo", "LifeLink@123",
                 "Volunteer Coordinator", "GOV-RC2-003")
        cls._add("red_cross", "field_staff", "Mr. Sunil Salian", "redcross.blood@lifelink.demo", "LifeLink@123",
                 "Blood Donation Officer", "GOV-RC2-004")

        # ── Goonj ────────────────────────────────
        cls._add("goonj", "department_head", "Ms. Anuradha Dixit", "goonj.director@lifelink.demo", "LifeLink@123",
                 "Director, Goonj", "GOV-GJ-001")
        cls._add("goonj", "department_officer", "Mr. Pratik Thakur", "goonj.relief@lifelink.demo", "LifeLink@123",
                 "Relief Coordinator", "GOV-GJ-002")
        cls._add("goonj", "field_staff", "Ms. Poonam Raut", "goonj.logistics@lifelink.demo", "LifeLink@123",
                 "Logistics Coordinator", "GOV-GJ-003")

        # ── SEEDS ────────────────────────────────
        cls._add("seeds", "department_head", "Mr. Manish Khandelwal", "seeds.executive@lifelink.demo", "LifeLink@123",
                 "Executive Director, SEEDS", "GOV-SD2-001")
        cls._add("seeds", "department_officer", "Ms. Rashmi Verma", "seeds.preparedness@lifelink.demo", "LifeLink@123",
                 "Preparedness Officer", "GOV-SD2-002")
        cls._add("seeds", "field_staff", "Mr. Akash Gupta", "seeds.resilience@lifelink.demo", "LifeLink@123",
                 "Resilience Builder", "GOV-SD2-003")

        # ── Doctors For You ──────────────────────
        cls._add("doctors_for_you", "department_head", "Dr. Zubin Mehta", "dfy.director@lifelink.demo", "LifeLink@123",
                 "Medical Director, DFY", "GOV-DFY-001")
        cls._add("doctors_for_you", "department_officer", "Ms. Rashmi Shetty", "dfy.camps@lifelink.demo", "LifeLink@123",
                 "Camp Manager", "GOV-DFY-002")
        cls._add("doctors_for_you", "field_staff", "Mr. Imran Shaikh", "dfy.medical@lifelink.demo", "LifeLink@123",
                 "Medical Relief Officer", "GOV-DFY-003")

        # ── CARE India ───────────────────────────
        cls._add("care_india", "department_head", "Ms. Sukanya Dutta", "careindia.country.director@lifelink.demo", "LifeLink@123",
                 "Country Director, CARE", "GOV-CARE-001")
        cls._add("care_india", "department_officer", "Mr. Anupam Roy", "careindia.programs@lifelink.demo", "LifeLink@123",
                 "Program Manager", "GOV-CARE-002")
        cls._add("care_india", "field_staff", "Ms. Bina Patra", "careindia.emergency@lifelink.demo", "LifeLink@123",
                 "Emergency Response Officer", "GOV-CARE-003")

        # ── GiveIndia ────────────────────────────
        cls._add("give_india", "department_head", "Mr. Vivek Agarwal", "giveindia.ceo@lifelink.demo", "LifeLink@123",
                 "CEO, GiveIndia", "GOV-GI-001")
        cls._add("give_india", "department_officer", "Ms. Swati Shenoy", "giveindia.fundraising@lifelink.demo", "LifeLink@123",
                 "Fundraising Manager", "GOV-GI-002")
        cls._add("give_india", "field_staff", "Mr. Kaushik Banerjee", "giveindia.operations@lifelink.demo", "LifeLink@123",
                 "Operations Officer", "GOV-GI-003")

        # ── Akshaya Patra ─────────────────────────
        cls._add("akshaya_patra", "department_head", "Mr. Shridhar Venkat", "akshayapatra.ceo@lifelink.demo", "LifeLink@123",
                 "CEO, Akshaya Patra", "GOV-AP2-001")
        cls._add("akshaya_patra", "department_officer", "Ms. Nandini Bhat", "akshayapatra.kitchen@lifelink.demo", "LifeLink@123",
                 "Kitchen Operations Manager", "GOV-AP2-002")
        cls._add("akshaya_patra", "field_staff", "Mr. Dhananjay Rao", "akshayapatra.distribution@lifelink.demo", "LifeLink@123",
                 "Distribution Officer", "GOV-AP2-003")

        # ── Army Liaison ─────────────────────────
        cls._add("army_liaison", "department_head", "Col. Vikram Rathore", "army.liaison@lifelink.demo", "LifeLink@123",
                 "Army Liaison Officer", "GOV-AL-001")
        cls._add("army_liaison", "department_officer", "Major. Ankit Chauhan", "army.medical.support@lifelink.demo", "LifeLink@123",
                 "Medical Support Coordinator", "GOV-AL-002")
        cls._add("army_liaison", "field_staff", "Capt. Rohan Deshmukh", "army.logistics@lifelink.demo", "LifeLink@123",
                 "Logistics Officer", "GOV-AL-003")

        # ── Air Force Liaison ────────────────────
        cls._add("air_force_liaison", "department_head", "Gp Capt. Surinder Batra", "airforce.liaison@lifelink.demo", "LifeLink@123",
                 "Air Force Liaison Officer", "GOV-AFL-001")
        cls._add("air_force_liaison", "department_officer", "Wg Cdr. Nikhil Pillai", "airforce.evacuation@lifelink.demo", "LifeLink@123",
                 "Evacuation Coordinator", "GOV-AFL-002")
        cls._add("air_force_liaison", "field_staff", "Sqn Ldr. Meera Singh", "airforce.airdrops@lifelink.demo", "LifeLink@123",
                 "Airdrop Coordinator", "GOV-AFL-003")

        # ── Navy Liaison ─────────────────────────
        cls._add("navy_liaison", "department_head", "Cdr. Arun Prakash", "navy.liaison@lifelink.demo", "LifeLink@123",
                 "Navy Liaison Officer", "GOV-NL-001")
        cls._add("navy_liaison", "department_officer", "Lt Cdr. Sheila Eapen", "navy.coastal.rescue@lifelink.demo", "LifeLink@123",
                 "Coastal Rescue Coordinator", "GOV-NL-002")
        cls._add("navy_liaison", "field_staff", "Lt. Karan Gill", "navy.maritime@lifelink.demo", "LifeLink@123",
                 "Maritime Operations Officer", "GOV-NL-003")

        # ── Medical Corps ────────────────────────
        cls._add("medical_corps", "department_head", "Brig. Dr. Rajat Sen", "medicalcorps.director@lifelink.demo", "LifeLink@123",
                 "Director, Medical Corps", "GOV-MC2-001")
        cls._add("medical_corps", "department_officer", "Col. Dr. Suchitra Nair", "medicalcorps.operations@lifelink.demo", "LifeLink@123",
                 "Medical Operations", "GOV-MC2-002")
        cls._add("medical_corps", "field_staff", "Maj. Dr. Arunima Dey", "medicalcorps.field@lifelink.demo", "LifeLink@123",
                 "Field Medical Officer", "GOV-MC2-003")
        cls._add("medical_corps", "field_staff", "Capt. Dr. Vivek Shekhawat", "medicalcorps.trauma@lifelink.demo", "LifeLink@123",
                 "Trauma Specialist", "GOV-MC2-004")

        # ── Animal Husbandry ─────────────────────
        cls._add("animal_husbandry", "department_head", "Dr. Kishore Bapat", "animalhusbandry.commissioner@lifelink.demo", "LifeLink@123",
                 "Commissioner", "GOV-AH-001")
        cls._add("animal_husbandry", "department_officer", "Ms. Revati Kulkarni", "animalhusbandry.health@lifelink.demo", "LifeLink@123",
                 "Animal Health Officer", "GOV-AH-002")
        cls._add("animal_husbandry", "field_staff", "Mr. Dattatreya Salvi", "animalhusbandry.field@lifelink.demo", "LifeLink@123",
                 "Field Veterinarian", "GOV-AH-003")

        # ── Pharma Supply ─────────────────────────
        cls._add("pharma_supply", "department_head", "Mr. Ajay Mehta", "pharma.director@lifelink.demo", "LifeLink@123",
                 "Director, Pharma Supply", "GOV-PS-001")
        cls._add("pharma_supply", "department_officer", "Ms. Tanuja Kale", "pharma.procurement@lifelink.demo", "LifeLink@123",
                 "Procurement Officer", "GOV-PS-002")
        cls._add("pharma_supply", "field_staff", "Mr. Naresh Gupta", "pharma.distribution@lifelink.demo", "LifeLink@123",
                 "Distribution Officer", "GOV-PS-003")

        # ── Medical Equipment ─────────────────────
        cls._add("medical_equipment", "department_head", "Mr. Prashant Kini", "medicalequipment.director@lifelink.demo", "LifeLink@123",
                 "Director, Medical Equipment", "GOV-ME-001")
        cls._add("medical_equipment", "department_officer", "Ms. Swati Bhave", "medicalequipment.procurement@lifelink.demo", "LifeLink@123",
                 "Procurement Officer", "GOV-ME-002")
        cls._add("medical_equipment", "field_staff", "Mr. Manoj Pillai", "medicalequipment.maintenance@lifelink.demo", "LifeLink@123",
                 "Maintenance Officer", "GOV-ME-003")

        return cls.USERS


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT DEPARTMENT DEFINITIONS (for enterprise_departments table)
# ══════════════════════════════════════════════════════════════════

GOVERNMENT_DEPARTMENTS: list[dict] = [
    {
        "key": org["key"],
        "name": org["name"],
        "description": org["description"],
        "location": org.get("location", ""),
        "status": org["status"],
        "metadata": {
            "category": org["category"],
            "level": org["level"],
            "emergency_priority": org.get("emergency_priority", 50),
            "ai_priority": org.get("ai_priority", 50),
            "default_dashboard": org.get("default_dashboard", ""),
            "color_theme": org.get("color_theme", "#64748b"),
            "logo": org.get("logo", ""),
            "staff_count": org.get("staff_count", 0),
            "ai_health": org.get("ai_health", 85),
        },
    }
    for org in GOVERNMENT_ORGANIZATIONS
]


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT AUTH SERVICE
# ══════════════════════════════════════════════════════════════════

class GovernmentAuthService:
    """Enterprise-grade government authentication and organization management service."""

    def __init__(self, pool):
        self.pool = pool
        self._enterprise = EnterpriseAuthService(pool)

    # ── Bootstrap: seed all government data ──────────────────────

    async def bootstrap(self) -> dict:
        """Seed all government organizations, roles, permissions, and users.
        Safe to call on every startup (upsert semantics)."""
        now = _now()
        stats = {"roles": 0, "permissions": 0, "departments": 0, "users": 0, "assignments": 0}

        # 1. Ensure base enterprise tables exist
        await self._enterprise.bootstrap()

        # 2. Seed government-specific permissions
        for perm_name, perm_desc in GOVERNMENT_PERMISSIONS.items():
            exists = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_permissions WHERE name = $1", perm_name)
            if not exists:
                await _execute(self.pool,
                    "INSERT INTO enterprise_permissions (id, name, description, category, created_at) VALUES ($1,$2,$3,$4,$5)",
                    _id(), perm_name, perm_desc, perm_name.split(":")[0], now)
                stats["permissions"] += 1

        # 3. Seed government roles with their permissions
        role_id_map: dict[str, str] = {}
        for role_name, role_def in GOVERNMENT_ROLES.items():
            existing = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_roles WHERE name = $1", role_name)
            if existing:
                role_id_map[role_name] = existing["id"]
                continue

            role_id = _id()
            await _execute(self.pool,
                "INSERT INTO enterprise_roles (id, name, description, priority, is_system, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
                role_id, role_name, role_def["description"], role_def["priority"],
                role_def.get("is_system", False), now, now)
            role_id_map[role_name] = role_id
            stats["roles"] += 1

            # Assign permissions to role
            for perm_name in role_def["permissions"]:
                perm = await _fetch_one(self.pool,
                    "SELECT id FROM enterprise_permissions WHERE name = $1", perm_name)
                if perm:
                    await _execute(self.pool,
                        "INSERT INTO enterprise_role_permissions (id, role_id, permission_id, created_at) VALUES ($1,$2,$3,$4)",
                        _id(), role_id, perm["id"], now)

        # Refresh role ID map for previously existing roles
        for role_name in GOVERNMENT_ROLES:
            if role_name not in role_id_map:
                existing = await _fetch_one(self.pool,
                    "SELECT id FROM enterprise_roles WHERE name = $1", role_name)
                if existing:
                    role_id_map[role_name] = existing["id"]

        # 4. Seed government organizations as departments
        dept_id_map: dict[str, str] = {}
        for dept in GOVERNMENT_DEPARTMENTS:
            existing = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_departments WHERE key = $1", dept["key"])
            if existing:
                dept_id_map[dept["key"]] = existing["id"]
                continue

            dept_id = _id()
            await _execute(self.pool,
                "INSERT INTO enterprise_departments (id, key, name, description, location, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                dept_id, dept["key"], dept["name"], dept.get("description", ""),
                dept.get("location", ""), dept["status"], now, now)
            dept_id_map[dept["key"]] = dept_id
            stats["departments"] += 1

        # Refresh dept ID map
        for dept in GOVERNMENT_DEPARTMENTS:
            if dept["key"] not in dept_id_map:
                existing = await _fetch_one(self.pool,
                    "SELECT id FROM enterprise_departments WHERE key = $1", dept["key"])
                if existing:
                    dept_id_map[dept["key"]] = existing["id"]

        # 5. Seed government users
        users_data = GovernmentUserSeed.build()
        for user_data in users_data:
            existing = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_users WHERE email = $1", user_data["email"])
            if existing:
                continue

            user_id = _id()
            pw_hash = bcrypt.hashpw(
                user_data["password"].encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

            avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={user_data['name'].replace(' ', '%20')}&backgroundColor=indigo"

            await _execute(self.pool, """
                INSERT INTO enterprise_users
                (id, full_name, email, password_hash, employee_id, designation, status, mfa_enabled, avatar, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            """, user_id, user_data["name"], user_data["email"], pw_hash,
                user_data.get("employee_id", ""), user_data.get("designation", ""),
                "active", False, avatar_url, now, now)
            stats["users"] += 1

            # Map user to department + role
            dept_id = dept_id_map.get(user_data["department"])
            role_id = role_id_map.get(user_data["role"])
            if dept_id and role_id:
                await _execute(self.pool, """
                    INSERT INTO enterprise_user_departments
                    (id, user_id, department_id, role_id, is_primary, created_at)
                    VALUES ($1,$2,$3,$4,$5,$6)
                """, _id(), user_id, dept_id, role_id, True, now)
                stats["assignments"] += 1

        return stats

    # ── Login ───────────────────────────────────────────────────

    async def login(self, email: str, password: str, remember: bool = False,
                    device_info: dict | None = None) -> dict:
        """Authenticate a government user and return token + profile + organization + permissions."""
        result = await self._enterprise.login(email, password, remember, device_info)

        # Enrich with government-specific context
        org_key = None
        if result.get("workspaces"):
            org_key = result["workspaces"][0].get("department_key")

        # Get government organization metadata
        org_meta = None
        if org_key:
            for org in GOVERNMENT_ORGANIZATIONS:
                if org["key"] == org_key:
                    org_meta = {
                        "key": org["key"],
                        "name": org["name"],
                        "description": org["description"],
                        "category": org["category"],
                        "level": org["level"],
                        "emergency_priority": org.get("emergency_priority"),
                        "ai_priority": org.get("ai_priority"),
                        "color_theme": org.get("color_theme"),
                        "logo": org.get("logo"),
                        "default_dashboard": org.get("default_dashboard"),
                        "staff_count": org.get("staff_count"),
                    }
                    break

        result["organization"] = org_meta
        result["portal_type"] = "government"

        # Determine the command hierarchy level
        level = org_meta.get("level", "department") if org_meta else "department"
        result["command_level"] = level

        # Build LifeLink AI context for this user
        result["ai_context"] = self._build_ai_context(result, org_meta)

        # Re-issue the token with government role claims so RBAC-protected
        # endpoints (require_roles / require_scopes) accept this session.
        # EnterpriseAuthService.login stamps role="hospital", which is wrong
        # for government users.
        user_info = result.get("user") or {}
        workspaces = result.get("workspaces") or []
        role_name = workspaces[0].get("role_name") if workspaces else None
        try:
            token = create_access_token(
                str(user_info.get("id") or ""),
                expires_minutes=1440 if remember else 60,
                claims={
                    "type": "enterprise",
                    "email": user_info.get("email", ""),
                    "name": user_info.get("full_name", ""),
                    "role": "government",
                    "sub_role": role_name or "department_officer",
                },
            )
            result["token"] = token
        except Exception:
            logger.exception("Could not re-issue government token with role claims")

        return result

    def _build_ai_context(self, login_result: dict, org_meta: dict | None) -> dict:
        """Build AI context enriched with role, organization, permissions, and recent activity."""
        user = login_result.get("user", {})
        role_name = None
        if login_result.get("workspaces"):
            role_name = login_result["workspaces"][0].get("role_name")

        org_name = org_meta.get("name", "a government organization") if org_meta else "a government organization"
        command_level = org_meta.get("level", "department") if org_meta else "department"
        org_category = org_meta.get("category", "") if org_meta else ""
        user_name = user.get("full_name", "a government official")

        # Role-specific knowledge
        role_knowledge: dict[str, list[str]] = {
            "national_admin": [
                "You have GOD MODE access — full unrestricted authority across all government modules.",
                "You can view every state, district, patient, ambulance, hospital, and emergency.",
                "You can control simulations, create/delete users, suspend organizations, launch disaster drills.",
                "You can manage AI, override permissions, generate reports, and activate national disaster mode.",
                "You are the highest authority in the system.",
            ],
            "state_admin": [
                "You have full access to your state's modules and data.",
                "You can manage districts, hospitals, ambulances, police, fire, NGOs, and medical resources.",
                "You cannot modify national settings or access another state.",
            ],
            "district_admin": [
                "You have full access to your district's modules.",
                "You can manage hospitals, ambulances, blood banks, fire, police, NGOs, and patients.",
                "You can coordinate emergency response at the district level.",
                "You cannot access state or national-level administration.",
            ],
        }

        base_knowledge = [
            f"You are {user_name}, working at {org_name}.",
            f"Your role is {role_name or 'government official'} ({command_level} level).",
            f"Your organization type is {org_category}.",
        ]

        if role_name and role_name in role_knowledge:
            base_knowledge.extend(role_knowledge[role_name])
        else:
            base_knowledge.append(
                "Provide professional, context-aware responses appropriate for your government role."
            )
            base_knowledge.append("You can access dashboards, emergencies, resources, and AI analytics.")

        return {
            "user_name": user_name,
            "user_email": user.get("email", ""),
            "organization": org_name,
            "organization_type": org_category,
            "role": role_name or "",
            "command_level": command_level,
            "permissions": login_result.get("permissions", []),
            "ai_priority": org_meta.get("ai_priority", 50) if org_meta else 50,
            "emergency_priority": org_meta.get("emergency_priority", 50) if org_meta else 50,
            "knowledge_base": base_knowledge,
        }

    # ── Get organizations list ──────────────────────────────────

    async def list_organizations(self, category: str | None = None,
                                  level: str | None = None,
                                  search: str | None = None) -> list[dict]:
        """List government organizations with optional filtering."""
        orgs = GOVERNMENT_ORGANIZATIONS

        if category and category != "all":
            orgs = [o for o in orgs if o["category"] == category]

        if level:
            orgs = [o for o in orgs if o["level"] == level]

        if search:
            q = search.lower()
            orgs = [o for o in orgs if
                    q in o["name"].lower() or
                    q in o["description"].lower() or
                    q in o["key"].lower()]

        return orgs

    async def get_organization(self, org_key: str) -> dict | None:
        """Get a single organization by key."""
        for org in GOVERNMENT_ORGANIZATIONS:
            if org["key"] == org_key:
                return org
        return None

    # ── Get users for an organization ────────────────────────────

    async def get_org_users(self, org_key: str) -> list[dict]:
        """Get all seeded users for a specific organization."""
        users_data = GovernmentUserSeed.build()
        return [u for u in users_data if u["department"] == org_key]

    # ── Get dev credentials (auto-fill for frontend) ────────────

    async def get_gov_credentials(self) -> list[dict]:
        """Return government user credentials for frontend auto-fill.
        Uses password map built from seed data so passwords stay consistent.
        Only returns in development mode."""
        settings = get_settings()
        if settings.app_env != "development":
            return []

        # Build a comprehensive password map from seed data
        pw_map: dict[str, str] = {}
        for u in GovernmentUserSeed.build():
            pw_map[u["email"].lower()] = u["password"]

        dept_keys = [d["key"] for d in GOVERNMENT_DEPARTMENTS]
        readings = await _fetch_all(self.pool, """
            SELECT u.full_name, u.email, u.id,
                   d.key AS department, d.name AS department_name,
                   r.name AS role
            FROM enterprise_users u
            JOIN enterprise_user_departments ud ON ud.user_id = u.id
            JOIN enterprise_departments d ON d.id = ud.department_id
            JOIN enterprise_roles r ON r.id = ud.role_id
            WHERE d.key = ANY($1::varchar[])
            ORDER BY d.name, u.full_name
        """, dept_keys)

        return [
            {
                "department": row["department"],
                "department_name": row["department_name"],
                "role": row["role"],
                "email": row["email"],
                "password": pw_map.get(row["email"].lower(), "LifeLink@123"),
                "name": row["full_name"],
                "user_id": row["id"],
            }
            for row in readings
        ]

    # ── Audit log ───────────────────────────────────────────────

    async def log_action(self, user_id: str, action: str, category: str,
                         details: dict | None = None, ip: str | None = None) -> None:
        """Log a government action to the audit trail."""
        await self._enterprise.log_action(
            user_id, action, category,
            entity_type="government",
            details=details,
            ip=ip,
        )

    # ── Get system status ───────────────────────────────────────

    async def get_status(self) -> dict:
        """Get counts of all government-related entities."""
        base = await self._enterprise.get_status()
        base["government_organizations"] = len(GOVERNMENT_ORGANIZATIONS)
        base["government_roles"] = len(GOVERNMENT_ROLES)
        base["government_permissions"] = len(GOVERNMENT_PERMISSIONS)
        base["government_users"] = len(GovernmentUserSeed.build())
        return base
