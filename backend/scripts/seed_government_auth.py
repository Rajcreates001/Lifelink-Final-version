"""
seed_government_auth.py — Seed all 62 government organizations into the enterprise_auth system.

Creates:
- Government-specific roles with permissions
- Government organizations as enterprise departments
- 2 demo users per organization with dev credentials
- User-department-role mappings
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone

import asyncpg
import bcrypt

# ── Database connection ──────────────────────────────────────
DB_URL = "postgresql://postgres:Maha_251@localhost:5432/lifelink_v1_db"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _id() -> str:
    return uuid.uuid4().hex


# ══════════════════════════════════════════════════════════════════
# GOVERNMENT ROLES
# ══════════════════════════════════════════════════════════════════

GOV_ROLES: dict[str, dict] = {
    # ── National Authority Roles ──
    "ministry_health_officer": {
        "description": "Ministry of Health & Family Welfare official",
        "priority": 85,
        "permissions": [
            "reports:view", "reports:generate", "reports:export",
            "ai:query", "resources:view", "staff:view",
            "emergency:coordinate", "policy:view", "policy:write",
        ],
    },
    "ndma_officer": {
        "description": "National Disaster Management Authority officer",
        "priority": 90,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "resources:view", "resources:approve",
            "emergency:coordinate", "emergency:trigger",
            "ambulance:dispatch", "ambulance:view",
            "staff:view",
        ],
    },
    "ncdc_officer": {
        "description": "National Centre for Disease Control officer",
        "priority": 80,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "clinical:view_results",
            "emergency:coordinate",
        ],
    },
    "icmr_officer": {
        "description": "Indian Council of Medical Research officer",
        "priority": 75,
        "permissions": ["reports:view", "reports:generate", "ai:query"],
    },
    "nha_officer": {
        "description": "National Health Authority officer",
        "priority": 80,
        "permissions": [
            "reports:view", "reports:generate", "reports:export",
            "finance:view", "ai:query",
        ],
    },
    "central_admin": {
        "description": "Central Government Administrator",
        "priority": 95,
        "permissions": [
            "reports:view", "reports:generate", "reports:export",
            "finance:view", "finance:audit",
            "ai:query",
            "admin:users", "admin:audit",
            "resources:view", "resources:approve",
            "staff:view", "staff:assign",
        ],
    },
    "national_emergency_officer": {
        "description": "National Emergency Command Centre officer",
        "priority": 90,
        "permissions": [
            "ai:query", "emergency:coordinate", "emergency:trigger",
            "ambulance:dispatch", "ambulance:view",
            "resources:view", "resources:approve",
            "reports:view",
        ],
    },
    # ── State Government Roles ──
    "state_health_officer": {
        "description": "State Health Department official",
        "priority": 80,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "resources:view",
            "staff:view", "emergency:coordinate",
        ],
    },
    "state_disaster_officer": {
        "description": "State Disaster Management Authority officer",
        "priority": 85,
        "permissions": [
            "ai:query", "emergency:coordinate", "emergency:trigger",
            "resources:view", "resources:approve",
            "ambulance:dispatch",
            "reports:view",
        ],
    },
    "state_emergency_officer": {
        "description": "State Emergency Operations Centre officer",
        "priority": 85,
        "permissions": [
            "ai:query", "emergency:coordinate",
            "ambulance:dispatch", "ambulance:view",
            "reports:view",
        ],
    },
    # ── District Roles ──
    "district_collector": {
        "description": "District Collector",
        "priority": 85,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "resources:view", "resources:approve",
            "staff:view", "emergency:coordinate",
        ],
    },
    "district_health_officer": {
        "description": "District Health Officer",
        "priority": 75,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "resources:view",
            "staff:view",
        ],
    },
    # ── Police Roles ──
    "police_commissioner": {
        "description": "Police Commissioner / DGP",
        "priority": 90,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "emergency:coordinate", "emergency:trigger",
            "staff:view", "staff:assign",
            "resources:view",
            "ambulance:dispatch", "ambulance:view",
        ],
    },
    "police_control_officer": {
        "description": "Police Control Room operator",
        "priority": 70,
        "permissions": [
            "ai:query", "emergency:coordinate",
            "ambulance:dispatch",
        ],
    },
    "traffic_officer": {
        "description": "Traffic Control officer",
        "priority": 65,
        "permissions": [
            "ai:query", "emergency:coordinate",
        ],
    },
    # ── Fire Services Roles ──
    "fire_chief": {
        "description": "Fire Chief",
        "priority": 85,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "emergency:coordinate", "emergency:trigger",
            "resources:view", "resources:approve",
            "staff:view", "staff:assign",
        ],
    },
    "fire_control_officer": {
        "description": "Fire Control Room operator",
        "priority": 70,
        "permissions": [
            "ai:query", "emergency:coordinate",
        ],
    },
    # ── Ambulance Roles ──
    "ambulance_coordinator": {
        "description": "Ambulance Authority coordinator",
        "priority": 80,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "emergency:coordinate",
            "ambulance:dispatch", "ambulance:view", "ambulance:manage",
            "resources:view",
            "staff:view",
        ],
    },
    "ambulance_dispatcher": {
        "description": "Ambulance dispatcher",
        "priority": 65,
        "permissions": [
            "ai:query", "ambulance:dispatch", "ambulance:view",
            "emergency:coordinate",
        ],
    },
    # ── Health Roles ──
    "public_health_officer": {
        "description": "Public Health Department officer",
        "priority": 75,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "clinical:view_results",
            "resources:view",
        ],
    },
    "epidemiologist": {
        "description": "Epidemiologist",
        "priority": 80,
        "permissions": [
            "reports:view", "reports:generate", "reports:export",
            "ai:query", "clinical:view_results",
        ],
    },
    # ── Disaster Response Roles ──
    "ndrf_commander": {
        "description": "NDRF Commander",
        "priority": 90,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "emergency:coordinate", "emergency:trigger",
            "resources:view", "resources:approve",
            "staff:view", "staff:assign",
            "ambulance:dispatch",
        ],
    },
    "sdrf_officer": {
        "description": "SDRF officer",
        "priority": 80,
        "permissions": [
            "ai:query", "emergency:coordinate",
            "resources:view",
            "ambulance:view",
        ],
    },
    # ── Civic Roles ──
    "municipal_commissioner": {
        "description": "Municipal Commissioner",
        "priority": 85,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "resources:view", "resources:approve",
            "staff:view",
            "emergency:coordinate",
        ],
    },
    # ── NGO Roles ──
    "ngo_director": {
        "description": "NGO Director / Coordinator",
        "priority": 70,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "resources:view", "resources:request",
            "staff:view",
            "emergency:coordinate",
        ],
    },
    # ── Defence Roles ──
    "military_liaison": {
        "description": "Armed forces liaison officer",
        "priority": 90,
        "permissions": [
            "reports:view", "reports:generate",
            "ai:query", "emergency:coordinate",
            "resources:view", "resources:approve",
        ],
    },
    # ── General roles for infrastructure/utilities orgs ──
    "minister": {
        "description": "Department director / minister-level official",
        "priority": 80,
        "permissions": [
            "reports:view", "reports:generate", "reports:export",
            "ai:query",
            "resources:view", "resources:approve",
            "staff:view",
            "emergency:coordinate",
        ],
    },
}

# ══════════════════════════════════════════════════════════════════
# GOVERNMENT ORGANIZATIONS (as departments)
# ══════════════════════════════════════════════════════════════════

GOV_DEPARTMENTS: list[dict] = [
    # ── National Authorities ──
    {"key": "ministry_health", "name": "Ministry of Health & Family Welfare", "description": "National health policy & governance", "location": "New Delhi", "status": "operational"},
    {"key": "ndma", "name": "National Disaster Management Authority", "description": "Disaster preparedness & response coordination", "location": "New Delhi", "status": "operational"},
    {"key": "ncdc", "name": "National Centre for Disease Control", "description": "Disease surveillance & outbreak control", "location": "New Delhi", "status": "operational"},
    {"key": "icmr", "name": "Indian Council of Medical Research", "description": "Medical research & clinical trials", "location": "New Delhi", "status": "operational"},
    {"key": "nha", "name": "National Health Authority", "description": "Health insurance & Ayushman Bharat", "location": "New Delhi", "status": "operational"},
    {"key": "central_gov", "name": "Central Government Administrator", "description": "Central oversight & policy execution", "location": "New Delhi", "status": "operational"},
    {"key": "national_emergency", "name": "National Emergency Command Centre", "description": "24/7 emergency response coordination", "location": "New Delhi", "status": "operational"},
    {"key": "blood_council", "name": "National Blood Transfusion Council", "description": "National blood supply management", "location": "New Delhi", "status": "operational"},
    {"key": "central_surveillance", "name": "Central Surveillance Unit", "description": "National health surveillance & monitoring", "location": "New Delhi", "status": "operational"},
    # ── State Government ──
    {"key": "state_health", "name": "State Health Department", "description": "State healthcare administration", "location": "State Capital", "status": "operational"},
    {"key": "state_disaster", "name": "State Disaster Management Authority", "description": "State-level disaster response", "location": "State Capital", "status": "operational"},
    {"key": "state_emergency", "name": "State Emergency Operations Centre", "description": "Emergency coordination & dispatch", "location": "State Capital", "status": "operational"},
    {"key": "state_medical", "name": "State Health Commissioner Office", "description": "Medical regulation & public health", "location": "State Capital", "status": "operational"},
    {"key": "state_surveillance", "name": "State Disease Surveillance Unit", "description": "Disease tracking & reporting", "location": "State Capital", "status": "operational"},
    # ── District Administration ──
    {"key": "district_collector", "name": "District Collector Office", "description": "District administration & governance", "location": "District HQ", "status": "operational"},
    {"key": "district_health", "name": "District Health Office", "description": "District health services & programs", "location": "District HQ", "status": "operational"},
    {"key": "district_emergency", "name": "District Emergency Control Room", "description": "Local emergency response coordination", "location": "District HQ", "status": "operational"},
    {"key": "district_surveillance", "name": "District Surveillance Office", "description": "Local disease & health monitoring", "location": "District HQ", "status": "operational"},
    {"key": "district_disaster", "name": "District Disaster Management Cell", "description": "Local disaster preparedness & relief", "location": "District HQ", "status": "operational"},
    # ── Police Department ──
    {"key": "police", "name": "Police Department", "description": "Law enforcement & public safety", "location": "State Capital", "status": "operational"},
    {"key": "police_control", "name": "Police Control Room", "description": "Emergency dispatch & incident response", "location": "State Capital", "status": "operational"},
    {"key": "traffic_police", "name": "Traffic Control", "description": "Traffic management & road safety", "location": "State Capital", "status": "operational"},
    {"key": "cyber_crime", "name": "Cyber Crime Unit", "description": "Cyber crime investigation & prevention", "location": "State Capital", "status": "operational"},
    {"key": "special_ops", "name": "Special Operations", "description": "Tactical response & special missions", "location": "State Capital", "status": "operational"},
    {"key": "intelligence", "name": "Intelligence Unit", "description": "Intelligence gathering & analysis", "location": "National Capital", "status": "operational"},
    # ── Fire & Emergency Services ──
    {"key": "fire", "name": "Fire & Emergency Services", "description": "Fire suppression & rescue operations", "location": "State Capital", "status": "operational"},
    {"key": "fire_control", "name": "Fire Control Room", "description": "Fire dispatch & incident management", "location": "State Capital", "status": "operational"},
    {"key": "hazmat", "name": "Hazmat Team", "description": "Hazardous materials response", "location": "State Capital", "status": "operational"},
    # ── Ambulance Authority ──
    {"key": "ambulance_authority", "name": "Ambulance Authority", "description": "EMS fleet & patient transport", "location": "State Capital", "status": "operational"},
    {"key": "ambulance_dispatch", "name": "Ambulance Dispatch", "description": "Emergency dispatch & routing", "location": "State Capital", "status": "operational"},
    # ── Public Health ──
    {"key": "public_health", "name": "Public Health Department", "description": "Population health & disease prevention", "location": "State Capital", "status": "operational"},
    {"key": "epidemiology", "name": "Epidemiology Unit", "description": "Disease outbreak investigation", "location": "State Capital", "status": "operational"},
    {"key": "vaccination", "name": "Vaccination Office", "description": "Immunization programs & supply", "location": "State Capital", "status": "operational"},
    {"key": "blood_bank_authority", "name": "Blood Bank Authority", "description": "National blood inventory & distribution", "location": "New Delhi", "status": "operational"},
    {"key": "animal_husbandry", "name": "Animal Husbandry Department", "description": "Livestock health & zoonotic disease control", "location": "State Capital", "status": "operational"},
    {"key": "pharma_supply", "name": "Pharmaceutical Supply Authority", "description": "Medicine procurement & distribution", "location": "New Delhi", "status": "operational"},
    {"key": "medical_equipment", "name": "Medical Equipment Authority", "description": "Medical device procurement & maintenance", "location": "New Delhi", "status": "operational"},
    # ── Disaster Response ──
    {"key": "ndrf", "name": "NDRF", "description": "National Disaster Response Force", "location": "Multiple Locations", "status": "operational"},
    {"key": "sdrf", "name": "SDRF", "description": "State Disaster Response Force", "location": "State Capital", "status": "operational"},
    {"key": "relief_coordination", "name": "Relief Coordination", "description": "Emergency relief & rehabilitation", "location": "State Capital", "status": "operational"},
    # ── Municipal Corporation ──
    {"key": "municipal", "name": "Municipal Corporation", "description": "Urban administration & civic services", "location": "City", "status": "operational"},
    {"key": "municipal_health", "name": "Municipal Health Office", "description": "Urban health & sanitation", "location": "City", "status": "operational"},
    {"key": "water_supply", "name": "Water Supply Department", "description": "Water distribution & quality", "location": "City", "status": "operational"},
    {"key": "waste_management", "name": "Waste Management", "description": "Solid waste & sanitation services", "location": "City", "status": "operational"},
    {"key": "food_corporation", "name": "Food Corporation", "description": "Food supply & distribution during emergencies", "location": "New Delhi", "status": "operational"},
    # ── Transport & Infrastructure ──
    {"key": "transport", "name": "Transport Department", "description": "Transport regulation & logistics", "location": "State Capital", "status": "operational"},
    {"key": "nhai", "name": "National Highway Authority", "description": "Highway infrastructure & maintenance", "location": "New Delhi", "status": "operational"},
    {"key": "railways", "name": "Railways", "description": "Rail transport & emergency logistics", "location": "New Delhi", "status": "operational"},
    {"key": "airport", "name": "Airport Authority", "description": "Aviation & air emergency support", "location": "City", "status": "operational"},
    {"key": "port_authority", "name": "Port Authority", "description": "Maritime operations & coastal logistics", "location": "Coastal City", "status": "operational"},
    {"key": "public_works", "name": "Public Works Department", "description": "Infrastructure construction & maintenance", "location": "State Capital", "status": "operational"},
    # ── Utilities & Communications ──
    {"key": "electricity", "name": "Electricity Board", "description": "Power supply & grid management", "location": "State Capital", "status": "operational"},
    {"key": "telecom", "name": "Telecommunications", "description": "Communication networks & emergency lines", "location": "New Delhi", "status": "operational"},
    {"key": "imd", "name": "IMD - Weather Department", "description": "Weather forecasting & disaster warnings", "location": "New Delhi", "status": "operational"},
    # ── Forest & Environment ──
    {"key": "forest", "name": "Forest Department", "description": "Forest conservation & wildlife protection", "location": "State Capital", "status": "operational"},
    {"key": "forest_fire", "name": "Forest Fire Control", "description": "Forest fire prevention & response", "location": "State Capital", "status": "operational"},
    # ── Civil Defence ──
    {"key": "civil_defence", "name": "Civil Defence", "description": "Civil protection & volunteer coordination", "location": "State Capital", "status": "operational"},
    # ── NGOs ──
    {"key": "red_cross", "name": "Indian Red Cross Society", "description": "Humanitarian aid & disaster relief", "location": "New Delhi", "status": "operational"},
    {"key": "goonj", "name": "Goonj", "description": "Disaster relief & community development", "location": "New Delhi", "status": "operational"},
    {"key": "seeds", "name": "SEEDS India", "description": "Disaster preparedness & resilient recovery", "location": "New Delhi", "status": "operational"},
    {"key": "doctors_for_you", "name": "Doctors For You", "description": "Medical relief & health camps", "location": "Mumbai", "status": "operational"},
    {"key": "care_india", "name": "CARE India", "description": "Poverty alleviation & emergency relief", "location": "New Delhi", "status": "operational"},
    {"key": "give_india", "name": "GiveIndia Disaster Response", "description": "Fundraising & relief coordination", "location": "Bangalore", "status": "operational"},
    {"key": "akshaya_patra", "name": "Akshaya Patra - Relief", "description": "Food relief during emergencies", "location": "Bangalore", "status": "operational"},
    # ── Defence ──
    {"key": "army_liaison", "name": "Army Liaison", "description": "Army medical & logistics support", "location": "New Delhi", "status": "operational"},
    {"key": "air_force_liaison", "name": "Air Force Liaison", "description": "Air evacuation & airdrop support", "location": "New Delhi", "status": "operational"},
    {"key": "navy_liaison", "name": "Navy Liaison", "description": "Maritime rescue & coastal support", "location": "Mumbai", "status": "operational"},
    {"key": "medical_corps", "name": "Medical Corps", "description": "Armed forces medical services", "location": "New Delhi", "status": "operational"},
]

# ══════════════════════════════════════════════════════════════════
# DEV CREDENTIALS (2 users per organization)
# ══════════════════════════════════════════════════════════════════

# Map each org to its primary role
ORG_ROLE_MAP: dict[str, str] = {
    "ministry_health": "ministry_health_officer",
    "ndma": "ndma_officer",
    "ncdc": "ncdc_officer",
    "icmr": "icmr_officer",
    "nha": "nha_officer",
    "central_gov": "central_admin",
    "national_emergency": "national_emergency_officer",
    "blood_council": "public_health_officer",
    "central_surveillance": "epidemiologist",
    "state_health": "state_health_officer",
    "state_disaster": "state_disaster_officer",
    "state_emergency": "state_emergency_officer",
    "state_medical": "state_health_officer",
    "state_surveillance": "epidemiologist",
    "district_collector": "district_collector",
    "district_health": "district_health_officer",
    "district_emergency": "state_emergency_officer",
    "district_surveillance": "epidemiologist",
    "district_disaster": "state_disaster_officer",
    "police": "police_commissioner",
    "police_control": "police_control_officer",
    "traffic_police": "traffic_officer",
    "cyber_crime": "police_control_officer",
    "special_ops": "police_commissioner",
    "intelligence": "police_commissioner",
    "fire": "fire_chief",
    "fire_control": "fire_control_officer",
    "hazmat": "fire_control_officer",
    "ambulance_authority": "ambulance_coordinator",
    "ambulance_dispatch": "ambulance_dispatcher",
    "public_health": "public_health_officer",
    "epidemiology": "epidemiologist",
    "vaccination": "public_health_officer",
    "blood_bank_authority": "public_health_officer",
    "animal_husbandry": "public_health_officer",
    "pharma_supply": "public_health_officer",
    "medical_equipment": "public_health_officer",
    "ndrf": "ndrf_commander",
    "sdrf": "sdrf_officer",
    "relief_coordination": "ngo_director",
    "municipal": "municipal_commissioner",
    "municipal_health": "public_health_officer",
    "water_supply": "municipal_commissioner",
    "waste_management": "municipal_commissioner",
    "food_corporation": "minister",
    "transport": "minister",
    "nhai": "minister",
    "railways": "minister",
    "airport": "minister",
    "port_authority": "minister",
    "public_works": "minister",
    "electricity": "minister",
    "telecom": "minister",
    "imd": "minister",
    "forest": "minister",
    "forest_fire": "minister",
    "civil_defence": "minister",
    "red_cross": "ngo_director",
    "goonj": "ngo_director",
    "seeds": "ngo_director",
    "doctors_for_you": "ngo_director",
    "care_india": "ngo_director",
    "give_india": "ngo_director",
    "akshaya_patra": "ngo_director",
    "army_liaison": "military_liaison",
    "air_force_liaison": "military_liaison",
    "navy_liaison": "military_liaison",
    "medical_corps": "military_liaison",
}

# Secondary role for the second user in each org
ORG_ROLE_MAP_SECONDARY: dict[str, str] = {
    "ministry_health": "public_health_officer",
    "ndma": "ndma_officer",
    "police": "police_control_officer",
    "fire": "fire_control_officer",
    "municipal": "public_health_officer",
    "ndrf": "sdrf_officer",
}

# Generate dev credentials (2 users per org)
GOV_DEV_CREDENTIALS: list[dict] = []
for dept in GOV_DEPARTMENTS:
    key = dept["key"]
    role = ORG_ROLE_MAP.get(key, "minister")
    secondary_role = ORG_ROLE_MAP_SECONDARY.get(key, role)
    org_prefix = key.replace("_", ".")

    GOV_DEV_CREDENTIALS.append({
        "department": key,
        "role": role,
        "email": f"{org_prefix}.admin@gov.lifelink.demo",
        "password": "Password123",
        "name": f"Admin — {dept['name']}",
    })
    GOV_DEV_CREDENTIALS.append({
        "department": key,
        "role": secondary_role,
        "email": f"{org_prefix}.ops@gov.lifelink.demo",
        "password": "Password123",
        "name": f"Operator — {dept['name']}",
    })


async def main():
    print(f"[OK] Connecting to {DB_URL}")
    conn = await asyncpg.connect(DB_URL)
    now = _now()

    try:
        # 1. Create government roles
        role_id_map: dict[str, str] = {}
        for role_name, role_def in GOV_ROLES.items():
            existing = await conn.fetchrow(
                "SELECT id FROM enterprise_roles WHERE name = $1", role_name
            )
            if existing:
                role_id_map[role_name] = existing["id"]
                continue
            role_id = _id()
            await conn.execute(
                "INSERT INTO enterprise_roles (id, name, description, priority, is_system, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
                role_id, role_name, role_def["description"], role_def["priority"], False, now, now,
            )
            role_id_map[role_name] = role_id

        print(f"[OK] Created/verified {len(GOV_ROLES)} government roles")

        # 2. Create government organizations as departments
        dept_id_map: dict[str, str] = {}
        for dept in GOV_DEPARTMENTS:
            existing = await conn.fetchrow(
                "SELECT id FROM enterprise_departments WHERE key = $1", dept["key"]
            )
            if existing:
                dept_id_map[dept["key"]] = existing["id"]
                continue
            dept_id = _id()
            await conn.execute(
                "INSERT INTO enterprise_departments (id, key, name, description, location, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                dept_id, dept["key"], dept["name"], dept["description"], dept["location"], dept["status"], now, now,
            )
            dept_id_map[dept["key"]] = dept_id

        print(f"[OK] Created/verified {len(GOV_DEPARTMENTS)} government departments")

        # 3. Create government users (2 per org)
        users_created = 0
        for cred in GOV_DEV_CREDENTIALS:
            try:
                existing = await conn.fetchrow(
                    "SELECT id FROM enterprise_users WHERE email = $1", cred["email"]
                )
                if existing:
                    # Still ensure mapping exists even if user existed
                    user_id = existing["id"]
                else:
                    user_id = _id()
                    pw_hash = bcrypt.hashpw(cred["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                    await conn.execute(
                        "INSERT INTO enterprise_users (id, full_name, email, password_hash, status, mfa_enabled, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                        user_id, cred["name"], cred["email"], pw_hash, "active", False, now, now,
                    )

                # Map user to department + role
                dept_id = dept_id_map.get(cred["department"])
                role_id = role_id_map.get(cred["role"])
                if dept_id and role_id:
                    existing_map = await conn.fetchrow(
                        "SELECT id FROM enterprise_user_departments WHERE user_id = $1 AND department_id = $2",
                        user_id, dept_id,
                    )
                    if not existing_map:
                        await conn.execute(
                            "INSERT INTO enterprise_user_departments (id, user_id, department_id, role_id, is_primary, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
                            _id(), user_id, dept_id, role_id, True, now,
                        )
                users_created += 1
            except Exception as exc:
                print(f"  [WARN] Skipping {cred['email']}: {exc}")

        total_users = await conn.fetchrow(
            "SELECT COUNT(*) as count FROM enterprise_users WHERE email LIKE '%@gov.lifelink.demo'"
        )

        print(f"[OK] Created/verified {users_created} government user accounts")
        print(f"[OK] Total government users in DB: {total_users['count']}")

        # 4. Summary
        print(f"\n{'=' * 60}")
        print(f"  GOVERNMENT ENTERPRISE AUTH — SEED COMPLETE")
        print(f"  Organizations: {len(GOV_DEPARTMENTS)}")
        print(f"  Roles:          {len(GOV_ROLES)}")
        print(f"  Users created:  {users_created}")
        print(f"  Password:       Password123")
        print(f"  Domain:         @gov.lifelink.demo")
        print(f"{'=' * 60}")

    except Exception as e:
        print(f"[ERROR] {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
