"""
Enterprise Auth Service — Workspace RBAC Authentication
=========================================================
Handles:
- Enterprise login (hospital email + password)
- Workspace authorization (user → role → department → permission → workspace)
- Remember Me with refresh tokens
- Development auto-fill credentials
- Multi-role workspace selection
- Audit logging for all auth events
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt

from app.core.config import get_settings
from app.core.security import create_access_token
from app.services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

_RATE_LIMITER = RateLimiter("enterprise:login", max_requests=10, window_seconds=60)

# ─── DB helpers (raw asyncpg for speed — no ORM overhead) ────────


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


# ─── Helpers ──────────────────────────────────────────────────────


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Permission definitions ───────────────────────────────────────

ALL_PERMISSIONS = {
    # Patient permissions
    "patients:view": "View patient records",
    "patients:edit": "Edit patient records",
    "patients:delete": "Delete patient records",
    # Clinical permissions
    "clinical:triage": "Perform triage",
    "clinical:diagnose": "Enter diagnosis",
    "clinical:prescribe": "Prescribe medication",
    "clinical:order_tests": "Order diagnostic tests",
    "clinical:view_results": "View test results",
    # Report permissions
    "reports:view": "View reports",
    "reports:generate": "Generate reports",
    "reports:approve": "Approve reports",
    "reports:export": "Export reports",
    # Bed management
    "beds:view": "View bed status",
    "beds:assign": "Assign beds",
    "beds:manage": "Manage bed allocation",
    # Staff permissions
    "staff:view": "View staff directory",
    "staff:assign": "Assign staff to duties",
    "staff:schedule": "Manage staff schedules",
    # Finance permissions
    "finance:view": "View financial data",
    "finance:manage": "Manage billing/invoices",
    "finance:approve": "Approve purchases",
    "finance:audit": "Audit financial records",
    # HR permissions
    "hr:view": "View HR records",
    "hr:manage": "Manage HR records",
    # Resource permissions
    "resources:view": "View resources",
    "resources:request": "Request resources",
    "resources:approve": "Approve resource requests",
    "resources:manage": "Manage inventory",
    # Ambulance permissions
    "ambulance:view": "View ambulance status",
    "ambulance:dispatch": "Dispatch ambulances",
    "ambulance:manage": "Manage ambulance fleet",
    # AI permissions
    "ai:query": "Query LifeLink AI",
    "ai:configure": "Configure AI models",
    "ai:manage": "Manage AI settings",
    # Admin permissions (system admin only)
    "admin:users": "Manage users (create/delete/suspend)",
    "admin:roles": "Manage roles and permissions",
    "admin:departments": "Manage departments",
    "admin:audit": "View audit logs",
    "admin:sessions": "Manage active sessions",
    "admin:security": "Manage security policies",
    "admin:settings": "Manage system settings",
    "admin:integrations": "Manage integrations",
    "admin:ai": "Manage AI configuration",
    "admin:backup": "Manage backups",
    "admin:monitor": "Monitor infrastructure",
    "admin:licenses": "Manage licenses",
}

# ─── Default role definitions ─────────────────────────────────────

DEFAULT_ROLES = {
    "system_administrator": {
        "description": "Full system access — manage users, permissions, AI, integrations, settings",
        "priority": 100,
        "is_system": True,
        "permissions": list(ALL_PERMISSIONS.keys()),
    },
    "hospital_ceo": {
        "description": "Executive hospital management",
        "priority": 90,
        "permissions": [
            "patients:view",
            "reports:view", "reports:generate", "reports:export",
            "beds:view",
            "staff:view",
            "finance:view", "finance:audit",
            "resources:view",
            "ambulance:view",
            "ai:query",
            "clinical:triage",
        ],
    },
    "emergency_physician": {
        "description": "Emergency department physician",
        "priority": 70,
        "permissions": [
            "patients:view", "patients:edit",
            "clinical:triage", "clinical:diagnose", "clinical:prescribe",
            "clinical:order_tests", "clinical:view_results",
            "beds:view", "beds:assign",
            "reports:view", "reports:generate",
            "ambulance:view", "ambulance:dispatch",
            "ai:query",
            "staff:view",
        ],
    },
    "icu_physician": {
        "description": "Intensive care physician",
        "priority": 70,
        "permissions": [
            "patients:view", "patients:edit",
            "clinical:triage", "clinical:diagnose", "clinical:prescribe",
            "clinical:order_tests", "clinical:view_results",
            "beds:view", "beds:assign",
            "reports:view", "reports:generate",
            "ai:query",
        ],
    },
    "nurse": {
        "description": "Registered nurse",
        "priority": 50,
        "permissions": [
            "patients:view", "patients:edit",
            "clinical:triage", "clinical:view_results",
            "beds:view",
            "reports:view",
            "ai:query",
            "staff:view",
        ],
    },
    "radiologist": {
        "description": "Radiology department",
        "priority": 60,
        "permissions": [
            "patients:view",
            "clinical:view_results", "clinical:order_tests",
            "reports:view", "reports:generate",
            "ai:query",
        ],
    },
    "lab_technician": {
        "description": "Laboratory technician",
        "priority": 50,
        "permissions": [
            "patients:view",
            "clinical:view_results", "clinical:order_tests",
            "reports:view",
            "ai:query",
        ],
    },
    "finance_officer": {
        "description": "Finance department",
        "priority": 60,
        "permissions": [
            "finance:view", "finance:manage", "finance:approve", "finance:audit",
            "reports:view", "reports:generate", "reports:export",
            "ai:query",
        ],
    },
    "pharmacist": {
        "description": "Pharmacy staff",
        "priority": 50,
        "permissions": [
            "patients:view",
            "clinical:prescribe",
            "resources:view",
            "reports:view",
            "ai:query",
        ],
    },
    "receptionist": {
        "description": "Front desk / reception",
        "priority": 30,
        "permissions": [
            "patients:view",
            "beds:view",
            "staff:view",
            "resources:view",
            "ai:query",
        ],
    },
    "it_technician": {
        "description": "IT support",
        "priority": 40,
        "permissions": [
            "admin:settings",
            "ai:query",
        ],
    },
    "hr_officer": {
        "description": "Human resources",
        "priority": 50,
        "permissions": [
            "hr:view", "hr:manage",
            "staff:view",
            "reports:view",
            "ai:query",
        ],
    },
}

# ─── Department definitions ──────────────────────────────────────

DEPARTMENT_DEFINITIONS = [
    {"key": "ceo", "name": "CEO Office", "description": "Executive hospital management", "status": "operational", "location": "5th Floor"},
    {"key": "emergency", "name": "Emergency Department", "description": "Acute care & trauma response", "status": "operational", "location": "Ground Floor"},
    {"key": "icu", "name": "ICU", "description": "Critical care & monitoring", "status": "operational", "location": "2nd Floor"},
    {"key": "opd", "name": "OPD", "description": "Outpatient consultations", "status": "operational", "location": "1st Floor"},
    {"key": "radiology", "name": "Radiology", "description": "Imaging & diagnostic scans", "status": "operational", "location": "3rd Floor"},
    {"key": "finance", "name": "Finance", "description": "Billing, revenue & accounting", "status": "operational", "location": "4th Floor"},
    {"key": "ot", "name": "OT", "description": "Operation theatre management", "status": "operational", "location": "2nd Floor"},
    {"key": "laboratory", "name": "Laboratory", "description": "Diagnostic testing", "status": "operational", "location": "3rd Floor"},
    {"key": "pharmacy", "name": "Pharmacy", "description": "Medication management", "status": "operational", "location": "Ground Floor"},
    {"key": "blood_bank", "name": "Blood Bank", "description": "Blood donation & supply", "status": "operational", "location": "Ground Floor"},
    {"key": "admin", "name": "System Administration", "description": "Platform management & configuration", "status": "operational", "location": "5th Floor"},
]

# === DEVELOPMENT AUTO-FILL CREDENTIALS =============================

DEV_CREDENTIALS = [
    # CEO Office — 2 hospital_ceo users
    {"department": "ceo", "role": "hospital_ceo", "email": "angel.henry@lifelink.demo", "password": "Password123", "name": "Angel Henry"},
    {"department": "ceo", "role": "hospital_ceo", "email": "sarah.mitchell@lifelink.demo", "password": "Password123", "name": "Sarah Mitchell"},
    # Emergency — 2 emergency_physician users
    {"department": "emergency", "role": "emergency_physician", "email": "doctor.emergency@lifelink.demo", "password": "Password123", "name": "Dr. Sarah Connor"},
    {"department": "emergency", "role": "emergency_physician", "email": "marcus.reed@lifelink.demo", "password": "Password123", "name": "Dr. Marcus Reed"},
    # ICU — 2 icu_physician users
    {"department": "icu", "role": "icu_physician", "email": "icu@lifelink.demo", "password": "Password123", "name": "Dr. Emily Chen"},
    {"department": "icu", "role": "icu_physician", "email": "james.wilson@lifelink.demo", "password": "Password123", "name": "Dr. James Wilson"},
    # Finance — 2 finance_officer users
    {"department": "finance", "role": "finance_officer", "email": "finance@lifelink.demo", "password": "Password123", "name": "David Park"},
    {"department": "finance", "role": "finance_officer", "email": "lisa.nguyen@lifelink.demo", "password": "Password123", "name": "Lisa Nguyen"},
    # Radiology — 2 radiologist users
    {"department": "radiology", "role": "radiologist", "email": "radiology@lifelink.demo", "password": "Password123", "name": "Dr. Alex Rivera"},
    {"department": "radiology", "role": "radiologist", "email": "priya.sharma@lifelink.demo", "password": "Password123", "name": "Dr. Priya Sharma"},
    # Laboratory — 2 lab_technician users
    {"department": "laboratory", "role": "lab_technician", "email": "lab@lifelink.demo", "password": "Password123", "name": "Tom Chen"},
    {"department": "laboratory", "role": "lab_technician", "email": "maria.garcia@lifelink.demo", "password": "Password123", "name": "Maria Garcia"},
    # OPD — nurse (1) + receptionist (1) — sharing OPD workspace
    {"department": "opd", "role": "nurse", "email": "opd@lifelink.demo", "password": "Password123", "name": "Nurse Rebecca"},
    {"department": "opd", "role": "receptionist", "email": "reception@lifelink.demo", "password": "Password123", "name": "Amy Williams"},
    # OT — OT Nurse (nurse)
    {"department": "ot", "role": "nurse", "email": "ot@lifelink.demo", "password": "Password123", "name": "Nurse Daniel"},
    # Pharmacy — 2 pharmacist users
    {"department": "pharmacy", "role": "pharmacist", "email": "pharmacy@lifelink.demo", "password": "Password123", "name": "Karen Lee"},
    {"department": "pharmacy", "role": "pharmacist", "email": "raj.patel@lifelink.demo", "password": "Password123", "name": "Raj Patel"},
    # Blood Bank — 1 lab_technician
    {"department": "blood_bank", "role": "lab_technician", "email": "bloodbank@lifelink.demo", "password": "Password123", "name": "Sam Rivers"},
    # Admin — 2 system_administrator + 1 it_technician
    {"department": "admin", "role": "system_administrator", "email": "admin@lifelink.demo", "password": "Admin@123", "name": "System Administrator"},
    {"department": "admin", "role": "system_administrator", "email": "sys.op@lifelink.demo", "password": "Admin@123", "name": "System Operator"},
    {"department": "admin", "role": "it_technician", "email": "it.support@lifelink.demo", "password": "Password123", "name": "IT Support"},
    # HR — 2 hr_officer users (under ceo office)
    {"department": "ceo", "role": "hr_officer", "email": "hr@lifelink.demo", "password": "Password123", "name": "HR Manager"},
    {"department": "ceo", "role": "hr_officer", "email": "hr.assistant@lifelink.demo", "password": "Password123", "name": "HR Assistant"},
]


class EnterpriseAuthService:
    """Enterprise authentication and workspace authorization service."""

    def __init__(self, pool):
        self.pool = pool

    # ── Bootstrap (create default schema & dev users) ───────────

    async def bootstrap(self) -> None:
        """Create enterprise auth tables if they don't exist, seed defaults."""
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_users (
                id VARCHAR(40) PRIMARY KEY, full_name VARCHAR(200) NOT NULL,
                email VARCHAR(200) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
                employee_id VARCHAR(60), designation VARCHAR(120), phone VARCHAR(40),
                status VARCHAR(30) NOT NULL DEFAULT 'active', mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                avatar VARCHAR(500), profile_settings JSONB NOT NULL DEFAULT '{}',
                last_login TIMESTAMPTZ, last_activity TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_roles (
                id VARCHAR(40) PRIMARY KEY, name VARCHAR(120) UNIQUE NOT NULL,
                description TEXT, priority INTEGER DEFAULT 0,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_permissions (
                id VARCHAR(40) PRIMARY KEY, name VARCHAR(120) UNIQUE NOT NULL,
                description TEXT, category VARCHAR(80),
                created_at TIMESTAMPTZ NOT NULL
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_role_permissions (
                id VARCHAR(40) PRIMARY KEY,
                role_id VARCHAR(40) REFERENCES enterprise_roles(id),
                permission_id VARCHAR(40) REFERENCES enterprise_permissions(id),
                created_at TIMESTAMPTZ NOT NULL
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_departments (
                id VARCHAR(40) PRIMARY KEY, key VARCHAR(60) UNIQUE NOT NULL,
                name VARCHAR(200) NOT NULL, description TEXT,
                location VARCHAR(120), status VARCHAR(30) DEFAULT 'operational',
                manager_id VARCHAR(40),
                created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_user_departments (
                id VARCHAR(40) PRIMARY KEY,
                user_id VARCHAR(40) REFERENCES enterprise_users(id),
                department_id VARCHAR(40) REFERENCES enterprise_departments(id),
                role_id VARCHAR(40) REFERENCES enterprise_roles(id),
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_sessions (
                id VARCHAR(40) PRIMARY KEY,
                user_id VARCHAR(40) REFERENCES enterprise_users(id),
                token_hash VARCHAR(255), refresh_token_hash VARCHAR(255),
                device_id VARCHAR(120), device_name VARCHAR(200),
                browser VARCHAR(200), os VARCHAR(100), ip_address VARCHAR(45),
                location VARCHAR(200), is_active BOOLEAN DEFAULT TRUE,
                login_time TIMESTAMPTZ NOT NULL, last_activity TIMESTAMPTZ,
                logout_time TIMESTAMPTZ, expires_at TIMESTAMPTZ
            )
        """)
        await _execute(self.pool, """
            CREATE TABLE IF NOT EXISTS enterprise_audit_logs (
                id VARCHAR(40) PRIMARY KEY,
                user_id VARCHAR(40) REFERENCES enterprise_users(id),
                action VARCHAR(120) NOT NULL, category VARCHAR(60),
                entity_type VARCHAR(60), entity_id VARCHAR(40),
                department_id VARCHAR(40), workspace_id VARCHAR(60),
                details JSONB DEFAULT '{}', ip_address VARCHAR(45),
                user_agent VARCHAR(500), success BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL
            )
        """)
        await self._seed_defaults()

    async def _seed_defaults(self) -> None:
        """Seed default roles, permissions, departments, and dev users."""
        now = _now()

        # Seed permissions
        for perm_name, perm_desc in ALL_PERMISSIONS.items():
            exists = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_permissions WHERE name = $1", perm_name)
            if not exists:
                await _execute(self.pool,
                    "INSERT INTO enterprise_permissions (id, name, description, category, created_at) VALUES ($1,$2,$3,$4,$5)",
                    uuid4().hex, perm_name, perm_desc, perm_name.split(":")[0], now)

        # Seed roles
        role_id_map = {}
        for role_name, role_def in DEFAULT_ROLES.items():
            exists = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_roles WHERE name = $1", role_name)
            if not exists:
                role_id = uuid4().hex
                role_id_map[role_name] = role_id
                await _execute(self.pool,
                    "INSERT INTO enterprise_roles (id, name, description, priority, is_system, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
                    role_id, role_name, role_def["description"], role_def["priority"],
                    role_def.get("is_system", False), now, now)

                # Assign permissions to role
                for perm_name in role_def["permissions"]:
                    perm = await _fetch_one(self.pool,
                        "SELECT id FROM enterprise_permissions WHERE name = $1", perm_name)
                    if perm:
                        await _execute(self.pool,
                            "INSERT INTO enterprise_role_permissions (id, role_id, permission_id, created_at) VALUES ($1,$2,$3,$4)",
                            uuid4().hex, role_id, perm["id"], now)
            else:
                role_id_map[role_name] = exists["id"]

        # Seed departments
        dept_id_map = {}
        for dept_def in DEPARTMENT_DEFINITIONS:
            exists = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_departments WHERE key = $1", dept_def["key"])
            if not exists:
                dept_id = uuid4().hex
                dept_id_map[dept_def["key"]] = dept_id
                await _execute(self.pool,
                    "INSERT INTO enterprise_departments (id, key, name, description, location, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                    dept_id, dept_def["key"], dept_def["name"], dept_def.get("description"),
                    dept_def.get("location"), dept_def["status"], now, now)
            else:
                dept_id_map[dept_def["key"]] = exists["id"]

        # Seed dev users
        settings = get_settings()
        is_dev = settings.app_env == "development"
        if is_dev:
            for cred in DEV_CREDENTIALS:
                exists = await _fetch_one(self.pool,
                    "SELECT id FROM enterprise_users WHERE email = $1", cred["email"])
                if not exists:
                    user_id = uuid4().hex
                    pw_hash = bcrypt.hashpw(cred["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                    await _execute(self.pool,
                        "INSERT INTO enterprise_users (id, full_name, email, password_hash, status, mfa_enabled, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                        user_id, cred["name"], cred["email"], pw_hash, "active", False, now, now)

                    # Map user to department
                    dept_id = dept_id_map.get(cred["department"])
                    role_id = role_id_map.get(cred["role"])
                    if dept_id and role_id:
                        await _execute(self.pool,
                            "INSERT INTO enterprise_user_departments (id, user_id, department_id, role_id, is_primary, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
                            uuid4().hex, user_id, dept_id, role_id, True, now)

    # ── Login ──────────────────────────────────────────────────

    async def login(self, email: str, password: str, remember: bool = False,
                    device_info: dict | None = None) -> dict:
        """Authenticate enterprise user. Returns token + user + workspaces."""
        user = await _fetch_one(self.pool,
            "SELECT id, full_name, email, password_hash, status, mfa_enabled, avatar, profile_settings FROM enterprise_users WHERE email = $1",
            email.lower().strip())

        if not user:
            await self._audit_log(None, "login", "auth", success=False,
                                  details={"reason": "user_not_found", "email": email},
                                  ip=device_info.get("ip") if device_info else None)
            raise PermissionError("Invalid email or password")

        if user["status"] != "active":
            await self._audit_log(user["id"], "login", "auth", success=False,
                                  details={"reason": f"account_{user['status']}"},
                                  ip=device_info.get("ip") if device_info else None)
            raise PermissionError(f"Account is {user['status']}. Contact your administrator.")

        if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            await self._audit_log(user["id"], "login", "auth", success=False,
                                  details={"reason": "invalid_password"},
                                  ip=device_info.get("ip") if device_info else None)
            raise PermissionError("Invalid email or password")

        # Update last login
        now = _now()
        await _execute(self.pool,
            "UPDATE enterprise_users SET last_login = $1, last_activity = $2 WHERE id = $3",
            now, now, user["id"])

        # Get all workspaces (department + role assignments)
        workspaces = await _fetch_all(self.pool, """
            SELECT d.id as department_id, d.key as department_key, d.name as department_name,
                   d.status as department_status, r.id as role_id, r.name as role_name,
                   ud.is_primary
            FROM enterprise_user_departments ud
            JOIN enterprise_departments d ON d.id = ud.department_id
            JOIN enterprise_roles r ON r.id = ud.role_id
            WHERE ud.user_id = $1
        """, user["id"])

        # Get all permissions for this user (union across all their roles)
        permissions = await self._get_user_permissions(user["id"])

        # Create session
        # Role claims are required by core.auth.get_current_user: without a
        # `role` claim every RBAC-protected endpoint returns 401. Hospital
        # workspace logins get role="hospital" (government logins override
        # this via GovernmentAuthService.login with role="government").
        primary = workspaces[0] if workspaces else {}
        # sub_role must be the department key ("emergency", "icu", "ceo", ...)
        # because every role-specific route/service (e.g. HospitalService
        # list_modules, LifeLink AI role context) keys off department keys.
        primary_dept_key = primary.get("department_key") or "general"
        primary_role_name = primary.get("role_name") or "enterprise"
        token = create_access_token(
            str(user["id"]),
            expires_minutes=1440 if remember else 60,  # 24h for remember, 1h otherwise
            claims={
                "type": "enterprise",
                "email": user["email"],
                "name": user["full_name"],
                "role": "hospital",
                "sub_role": primary_dept_key,
                "role_name": primary_role_name,
                "department_key": primary_dept_key,
            }
        )

        session_id = uuid4().hex
        await _execute(self.pool, """
            INSERT INTO enterprise_sessions
            (id, user_id, token_hash, device_id, device_name, browser, os, ip_address,
             location, is_active, login_time, last_activity, expires_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        """, session_id, user["id"], _hash_token(token),
            device_info.get("device_id") if device_info else None,
            device_info.get("device_name") if device_info else None,
            device_info.get("browser") if device_info else None,
            device_info.get("os") if device_info else None,
            device_info.get("ip") if device_info else None,
            device_info.get("location") if device_info else None,
            True, now, now,
            now + timedelta(hours=24) if remember else now + timedelta(hours=1))

        await self._audit_log(user["id"], "login", "auth", success=True,
                              details={"remember": remember, "workspaces": len(workspaces)},
                              ip=device_info.get("ip") if device_info else None)

        return {
            "token": token,
            "session_id": session_id,
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "status": user["status"],
                "mfa_enabled": user.get("mfa_enabled", False),
                "avatar": user.get("avatar"),
            },
            "workspaces": workspaces,
            "permissions": permissions,
        }

    # ── Verify workspace access ────────────────────────────────

    async def verify_workspace_access(self, user_id: str, department_key: str) -> dict:
        """Verify user has access to the requested workspace. Returns role + permissions."""
        membership = await _fetch_one(self.pool, """
            SELECT ud.*, d.name as department_name, d.status as department_status,
                   d.key as department_key, r.name as role_name, r.priority as role_priority
            FROM enterprise_user_departments ud
            JOIN enterprise_departments d ON d.id = ud.department_id
            JOIN enterprise_roles r ON r.id = ud.role_id
            WHERE ud.user_id = $1 AND d.key = $2
        """, user_id, department_key)

        if not membership:
            raise PermissionError("You do not have permission to access this workspace.")

        if membership["department_status"] in ("restricted", "offline", "maintenance"):
            raise PermissionError(
                f"This workspace is currently {membership['department_status']}. "
                "Contact your administrator for access.")

        permissions = await self._get_user_permissions(user_id)
        return {
            "authorized": True,
            "department": {
                "id": membership["department_id"],
                "key": membership["department_key"],
                "name": membership["department_name"],
                "status": membership["department_status"],
            },
            "role": {
                "id": membership["role_id"],
                "name": membership["role_name"],
                "priority": membership["role_priority"],
            },
            "permissions": permissions,
        }

    # ── Multi-workspace selection ──────────────────────────────

    async def get_user_workspaces(self, user_id: str) -> list[dict]:
        """Get all workspaces a user can access."""
        return await _fetch_all(self.pool, """
            SELECT d.id as department_id, d.key as department_key, d.name as department_name,
                   d.status as department_status, r.name as role_name, ud.is_primary
            FROM enterprise_user_departments ud
            JOIN enterprise_departments d ON d.id = ud.department_id
            JOIN enterprise_roles r ON r.id = ud.role_id
            WHERE ud.user_id = $1 AND d.status NOT IN ('offline')
            ORDER BY ud.is_primary DESC, r.priority DESC
        """, user_id)

    # ── Permission helpers ─────────────────────────────────────

    async def _get_user_permissions(self, user_id: str) -> list[str]:
        rows = await _fetch_all(self.pool, """
            SELECT DISTINCT p.name
            FROM enterprise_permissions p
            JOIN enterprise_role_permissions rp ON rp.permission_id = p.id
            JOIN enterprise_user_departments ud ON ud.role_id = rp.role_id
            WHERE ud.user_id = $1
        """, user_id)
        return [r["name"] for r in rows]

    async def has_permission(self, user_id: str, permission: str) -> bool:
        perms = await self._get_user_permissions(user_id)
        return permission in perms

    # ── Audit logging ──────────────────────────────────────────

    async def _audit_log(self, user_id: str | None, action: str, category: str,
                         success: bool = True, entity_type: str | None = None,
                         entity_id: str | None = None, department_id: str | None = None,
                         workspace_id: str | None = None, details: dict | None = None,
                         ip: str | None = None, user_agent: str | None = None) -> None:
        try:
            await _execute(self.pool, """
                INSERT INTO enterprise_audit_logs
                (id, user_id, action, category, entity_type, entity_id, department_id,
                 workspace_id, details, ip_address, user_agent, success, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            """, uuid4().hex, user_id, action, category, entity_type, entity_id,
                department_id, workspace_id,
                json.dumps(details or {}), ip, user_agent,
                success, _now())
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

    async def log_workspace_entry(self, user_id: str, department_key: str,
                                   ip: str | None = None) -> None:
        dept = await _fetch_one(self.pool,
            "SELECT id, key FROM enterprise_departments WHERE key = $1", department_key)
        await self._audit_log(user_id, "workspace_entry", "workspace",
                              department_id=dept["id"] if dept else None,
                              workspace_id=department_key, ip=ip,
                              details={"department_key": department_key})

    async def log_action(self, user_id: str, action: str, category: str,
                         entity_type: str | None = None, entity_id: str | None = None,
                         department_key: str | None = None, details: dict | None = None,
                         ip: str | None = None) -> None:
        dept_id = None
        if department_key:
            dept = await _fetch_one(self.pool,
                "SELECT id FROM enterprise_departments WHERE key = $1", department_key)
            if dept:
                dept_id = dept["id"]
        await self._audit_log(user_id, action, category,
                              entity_type=entity_type, entity_id=entity_id,
                              department_id=dept_id, workspace_id=department_key,
                              details=details, ip=ip)

    # ── Development auto-fill ──────────────────────────────────

    async def get_dev_credentials(self) -> list[dict]:
        """Return dev credentials from database for frontend auto-fill.
        Reads from the database directly to avoid Python-constant cache issues.
        """
        settings = get_settings()
        if settings.app_env != "development":
            return []
        rows = await _fetch_all(self.pool, """
            SELECT u.full_name, u.email, d.key AS department, r.name AS role
            FROM enterprise_users u
            JOIN enterprise_user_departments ud ON ud.user_id = u.id
            JOIN enterprise_departments d ON d.id = ud.department_id
            JOIN enterprise_roles r ON r.id = ud.role_id
            ORDER BY d.name, u.full_name
        """)
        # Map known dev emails to passwords (system_admin uses different password)
        password_map = {
            "admin@lifelink.demo": "Admin@123",
            "sys.op@lifelink.demo": "Admin@123",
        }
        return [
            {
                "department": row["department"],
                "role": row["role"],
                "email": row["email"],
                "password": password_map.get(row["email"], "Password123"),
                "name": row["full_name"],
            }
            for row in rows
        ]

    # ── Debug: list all enterprise auth tables ─────────────────

    async def get_status(self) -> dict:
        counts = {}
        for table in ["enterprise_users", "enterprise_roles", "enterprise_permissions",
                       "enterprise_departments", "enterprise_user_departments",
                       "enterprise_sessions", "enterprise_audit_logs"]:
            try:
                row = await _fetch_one(self.pool,
                    f"SELECT COUNT(*) as count FROM {table}")
                counts[table] = row["count"] if row else 0
            except Exception:
                counts[table] = -1
        return {"tables": counts}
