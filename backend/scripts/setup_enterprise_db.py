"""
Enterprise Auth Database Setup Script
Creates all tables with correct schema and seeds default data.
Run directly: python scripts/setup_enterprise_db.py
"""
import asyncio
import os
import asyncpg
import bcrypt
from uuid import uuid4
from datetime import datetime, timezone


async def setup():
    conn = await asyncpg.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "5432")),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "postgres"),
        database=os.environ.get("DB_NAME", "lifelink_db"),
    )

    now = datetime.now(timezone.utc)

    # 1. DROP ALL enterprise tables
    tables = [
        "enterprise_audit_logs", "enterprise_sessions",
        "enterprise_user_departments", "enterprise_role_permissions",
        "enterprise_permissions", "enterprise_roles",
        "enterprise_departments", "enterprise_users",
    ]
    for t in tables:
        await conn.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
        print(f"  Dropped {t}")

    # 2. CREATE tables with correct schemas
    await conn.execute("""
        CREATE TABLE enterprise_users (
            id VARCHAR(40) PRIMARY KEY, full_name VARCHAR(200) NOT NULL,
            email VARCHAR(200) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
            employee_id VARCHAR(60), designation VARCHAR(120), phone VARCHAR(40),
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            avatar VARCHAR(500), profile_settings JSONB NOT NULL DEFAULT '{}',
            last_login TIMESTAMPTZ, last_activity TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
        )
    """)
    print("  Created enterprise_users")

    await conn.execute("""
        CREATE TABLE enterprise_roles (
            id VARCHAR(40) PRIMARY KEY, name VARCHAR(120) UNIQUE NOT NULL,
            description TEXT, priority INTEGER DEFAULT 0,
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
        )
    """)
    print("  Created enterprise_roles")

    await conn.execute("""
        CREATE TABLE enterprise_permissions (
            id VARCHAR(40) PRIMARY KEY, name VARCHAR(120) UNIQUE NOT NULL,
            description TEXT, category VARCHAR(80),
            created_at TIMESTAMPTZ NOT NULL
        )
    """)
    print("  Created enterprise_permissions")

    await conn.execute("""
        CREATE TABLE enterprise_role_permissions (
            id VARCHAR(40) PRIMARY KEY,
            role_id VARCHAR(40) REFERENCES enterprise_roles(id),
            permission_id VARCHAR(40) REFERENCES enterprise_permissions(id),
            created_at TIMESTAMPTZ NOT NULL
        )
    """)
    print("  Created enterprise_role_permissions")

    await conn.execute("""
        CREATE TABLE enterprise_departments (
            id VARCHAR(40) PRIMARY KEY, key VARCHAR(60) UNIQUE NOT NULL,
            name VARCHAR(200) NOT NULL, description TEXT,
            location VARCHAR(120), status VARCHAR(30) DEFAULT 'operational',
            manager_id VARCHAR(40),
            created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
        )
    """)
    print("  Created enterprise_departments")

    await conn.execute("""
        CREATE TABLE enterprise_user_departments (
            id VARCHAR(40) PRIMARY KEY,
            user_id VARCHAR(40) REFERENCES enterprise_users(id),
            department_id VARCHAR(40) REFERENCES enterprise_departments(id),
            role_id VARCHAR(40) REFERENCES enterprise_roles(id),
            is_primary BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL
        )
    """)
    print("  Created enterprise_user_departments")

    await conn.execute("""
        CREATE TABLE enterprise_sessions (
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
    print("  Created enterprise_sessions")

    await conn.execute("""
        CREATE TABLE enterprise_audit_logs (
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
    print("  Created enterprise_audit_logs")

    # 3. SEED permissions
    ALL_PERMS = {
        "patients:view": "View patient records",
        "patients:edit": "Edit patient records",
        "patients:delete": "Delete patient records",
        "clinical:triage": "Perform triage",
        "clinical:diagnose": "Enter diagnosis",
        "clinical:prescribe": "Prescribe medication",
        "clinical:order_tests": "Order diagnostic tests",
        "clinical:view_results": "View test results",
        "reports:view": "View reports",
        "reports:generate": "Generate reports",
        "reports:approve": "Approve reports",
        "reports:export": "Export reports",
        "beds:view": "View bed status",
        "beds:assign": "Assign beds",
        "beds:manage": "Manage bed allocation",
        "staff:view": "View staff directory",
        "staff:assign": "Assign staff to duties",
        "staff:schedule": "Manage staff schedules",
        "finance:view": "View financial data",
        "finance:manage": "Manage billing/invoices",
        "finance:approve": "Approve purchases",
        "finance:audit": "Audit financial records",
        "hr:view": "View HR records",
        "hr:manage": "Manage HR records",
        "resources:view": "View resources",
        "resources:request": "Request resources",
        "resources:approve": "Approve resource requests",
        "resources:manage": "Manage inventory",
        "ambulance:view": "View ambulance status",
        "ambulance:dispatch": "Dispatch ambulances",
        "ambulance:manage": "Manage ambulance fleet",
        "ai:query": "Query LifeLink AI",
        "ai:configure": "Configure AI models",
        "ai:manage": "Manage AI settings",
        "admin:users": "Manage users",
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

    perm_ids = {}
    for name, desc in ALL_PERMS.items():
        pid = uuid4().hex
        perm_ids[name] = pid
        await conn.execute(
            "INSERT INTO enterprise_permissions (id, name, description, category, created_at) VALUES ($1,$2,$3,$4,$5)",
            pid, name, desc, name.split(":")[0], now,
        )
    print(f"  Seeded {len(ALL_PERMS)} permissions")

    # 4. SEED roles
    ROLES = {
        "system_administrator": (100, "Full system access", list(ALL_PERMS.keys()), True),
        "hospital_ceo": (90, "Executive hospital management", [
            "patients:view", "reports:view", "reports:generate", "reports:export",
            "beds:view", "staff:view", "finance:view", "finance:audit",
            "resources:view", "ambulance:view", "ai:query", "clinical:triage",
        ], False),
        "emergency_physician": (70, "Emergency department physician", [
            "patients:view", "patients:edit", "clinical:triage", "clinical:diagnose",
            "clinical:prescribe", "clinical:order_tests", "clinical:view_results",
            "beds:view", "beds:assign", "reports:view", "reports:generate",
            "ambulance:view", "ambulance:dispatch", "ai:query", "staff:view",
        ], False),
        "icu_physician": (70, "Intensive care physician", [
            "patients:view", "patients:edit", "clinical:triage", "clinical:diagnose",
            "clinical:prescribe", "clinical:order_tests", "clinical:view_results",
            "beds:view", "beds:assign", "reports:view", "reports:generate", "ai:query",
        ], False),
        "nurse": (50, "Registered nurse", [
            "patients:view", "patients:edit", "clinical:triage", "clinical:view_results",
            "beds:view", "reports:view", "ai:query", "staff:view",
        ], False),
        "radiologist": (60, "Radiology department", [
            "patients:view", "clinical:view_results", "clinical:order_tests",
            "reports:view", "reports:generate", "ai:query",
        ], False),
        "lab_technician": (50, "Laboratory technician", [
            "patients:view", "clinical:view_results", "clinical:order_tests",
            "reports:view", "ai:query",
        ], False),
        "finance_officer": (60, "Finance department", [
            "finance:view", "finance:manage", "finance:approve", "finance:audit",
            "reports:view", "reports:generate", "reports:export", "ai:query",
        ], False),
        "pharmacist": (50, "Pharmacy staff", [
            "patients:view", "clinical:prescribe", "resources:view",
            "reports:view", "ai:query",
        ], False),
        "receptionist": (30, "Front desk", [
            "patients:view", "beds:view", "staff:view", "resources:view", "ai:query",
        ], False),
        "it_technician": (40, "IT support", [
            "admin:settings", "ai:query",
        ], False),
        "hr_officer": (50, "Human resources", [
            "hr:view", "hr:manage", "staff:view", "reports:view", "ai:query",
        ], False),
    }

    role_ids = {}
    for name, (priority, desc, perms, is_system) in ROLES.items():
        rid = uuid4().hex
        role_ids[name] = rid
        await conn.execute(
            "INSERT INTO enterprise_roles (id, name, description, priority, is_system, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            rid, name, desc, priority, is_system, now, now,
        )
        for pname in perms:
            if pname in perm_ids:
                await conn.execute(
                    "INSERT INTO enterprise_role_permissions (id, role_id, permission_id, created_at) VALUES ($1,$2,$3,$4)",
                    uuid4().hex, rid, perm_ids[pname], now,
                )
    print(f"  Seeded {len(ROLES)} roles")

    # 5. SEED departments
    DEPARTMENTS = [
        ("ceo", "CEO Office", "Executive hospital management", "5th Floor", "operational"),
        ("emergency", "Emergency Department", "Acute care & trauma response", "Ground Floor", "operational"),
        ("icu", "ICU", "Critical care & monitoring", "2nd Floor", "operational"),
        ("opd", "OPD", "Outpatient consultations", "1st Floor", "operational"),
        ("radiology", "Radiology", "Imaging & diagnostic scans", "3rd Floor", "operational"),
        ("finance", "Finance", "Billing, revenue & accounting", "4th Floor", "operational"),
        ("ot", "OT", "Operation theatre management", "2nd Floor", "operational"),
        ("laboratory", "Laboratory", "Diagnostic testing", "3rd Floor", "operational"),
        ("pharmacy", "Pharmacy", "Medication management", "Ground Floor", "operational"),
        ("blood_bank", "Blood Bank", "Blood donation & supply", "Ground Floor", "operational"),
        ("admin", "System Administration", "Platform management & configuration", "5th Floor", "operational"),
    ]

    dept_ids = {}
    for key, name, desc, loc, status in DEPARTMENTS:
        did = uuid4().hex
        dept_ids[key] = did
        await conn.execute(
            "INSERT INTO enterprise_departments (id, key, name, description, location, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            did, key, name, desc, loc, status, now, now,
        )
    print(f"  Seeded {len(DEPARTMENTS)} departments")

    # 6. SEED dev users — 2 users per role (24 total)
    DEV_USERS = [
        # CEO Office — 2 hospital_ceo users
        ("ceo", "hospital_ceo", "angel.henry@lifelink.demo", os.environ.get("DEMO_PASSWORD", "Password123"), "Angel Henry"),
        ("ceo", "hospital_ceo", "sarah.mitchell@lifelink.demo", "Password123", "Sarah Mitchell"),
        # Emergency — 2 emergency_physician users
        ("emergency", "emergency_physician", "doctor.emergency@lifelink.demo", "Password123", "Dr. Sarah Connor"),
        ("emergency", "emergency_physician", "marcus.reed@lifelink.demo", "Password123", "Dr. Marcus Reed"),
        # ICU — 2 icu_physician users
        ("icu", "icu_physician", "icu@lifelink.demo", "Password123", "Dr. Emily Chen"),
        ("icu", "icu_physician", "james.wilson@lifelink.demo", "Password123", "Dr. James Wilson"),
        # Finance — 2 finance_officer users
        ("finance", "finance_officer", "finance@lifelink.demo", "Password123", "David Park"),
        ("finance", "finance_officer", "lisa.nguyen@lifelink.demo", "Password123", "Lisa Nguyen"),
        # Radiology — 2 radiologist users
        ("radiology", "radiologist", "radiology@lifelink.demo", "Password123", "Dr. Alex Rivera"),
        ("radiology", "radiologist", "priya.sharma@lifelink.demo", "Password123", "Dr. Priya Sharma"),
        # Laboratory — 2 lab_technician users
        ("laboratory", "lab_technician", "lab@lifelink.demo", "Password123", "Tom Chen"),
        ("laboratory", "lab_technician", "maria.garcia@lifelink.demo", "Password123", "Maria Garcia"),
        # OPD — nurse (1) + receptionist (1)
        ("opd", "nurse", "opd@lifelink.demo", "Password123", "Nurse Rebecca"),
        ("opd", "receptionist", "reception@lifelink.demo", "Password123", "Amy Williams"),
        # OT — OT Nurse
        ("ot", "nurse", "ot@lifelink.demo", "Password123", "Nurse Daniel"),
        # Pharmacy — 2 pharmacist users
        ("pharmacy", "pharmacist", "pharmacy@lifelink.demo", "Password123", "Karen Lee"),
        ("pharmacy", "pharmacist", "raj.patel@lifelink.demo", "Password123", "Raj Patel"),
        # Blood Bank — 1 lab_technician
        ("blood_bank", "lab_technician", "bloodbank@lifelink.demo", "Password123", "Sam Rivers"),
        # Admin — 2 system_administrator + 1 it_technician
        ("admin", "system_administrator", "admin@lifelink.demo", "Admin@123", "System Administrator"),
        ("admin", "system_administrator", "sys.op@lifelink.demo", "Admin@123", "System Operator"),
        ("admin", "it_technician", "it.support@lifelink.demo", "Password123", "IT Support"),
        # HR — 2 hr_officer users (under CEO department)
        ("ceo", "hr_officer", "hr@lifelink.demo", "Password123", "HR Manager"),
        ("ceo", "hr_officer", "hr.assistant@lifelink.demo", "Password123", "HR Assistant"),
    ]

    for dept_key, role_name, email, password, full_name in DEV_USERS:
        uid = uuid4().hex
        pw_hash = bcrypt.hashpw(str(password).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await conn.execute(
            "INSERT INTO enterprise_users (id, full_name, email, password_hash, status, mfa_enabled, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            uid, full_name, email, pw_hash, "active", False, now, now,
        )
        did = dept_ids.get(dept_key)
        rid = role_ids.get(role_name)
        if did and rid:
            await conn.execute(
                "INSERT INTO enterprise_user_departments (id, user_id, department_id, role_id, is_primary, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
                uuid4().hex, uid, did, rid, True, now,
            )
        print(f"  Created: {email} ({full_name}) -> {dept_key} ({role_name})")

    await conn.close()
    print("\n=== DATABASE SETUP COMPLETE ===")
    print("All 7 enterprise tables created with correct schema")
    print(f"Seeded: {len(ALL_PERMS)} permissions, {len(ROLES)} roles, {len(DEPARTMENTS)} departments, {len(DEV_USERS)} dev users")


asyncio.run(setup())
