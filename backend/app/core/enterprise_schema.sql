-- Enterprise Auth Schema — Workspace RBAC Tables
-- Run via: psql -d lifelink_db -f enterprise_schema.sql
-- Or auto-created by the bootstrap() method on first call.

-- 1. Enterprise Users (hospital employees)
CREATE TABLE IF NOT EXISTS enterprise_users (
    id VARCHAR(40) PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    employee_id VARCHAR(60),
    designation VARCHAR(120),
    phone VARCHAR(40),
    status VARCHAR(30) DEFAULT 'active',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    avatar VARCHAR(500),
    profile_settings JSONB DEFAULT '{}'::jsonb,
    last_login TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_email ON enterprise_users (email);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_status ON enterprise_users (status);

-- 2. Roles
CREATE TABLE IF NOT EXISTS enterprise_roles (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_roles_name ON enterprise_roles (name);

-- 3. Permissions (granular, stored individually)
CREATE TABLE IF NOT EXISTS enterprise_permissions (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_permissions_name ON enterprise_permissions (name);
CREATE INDEX IF NOT EXISTS idx_enterprise_permissions_category ON enterprise_permissions (category);

-- 4. Role ↔ Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS enterprise_role_permissions (
    id VARCHAR(40) PRIMARY KEY,
    role_id VARCHAR(40) REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(40) REFERENCES enterprise_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_erp_role_id ON enterprise_role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_erp_permission_id ON enterprise_role_permissions (permission_id);

-- 5. Departments (hospital operational units)
CREATE TABLE IF NOT EXISTS enterprise_departments (
    id VARCHAR(40) PRIMARY KEY,
    key VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(120),
    status VARCHAR(30) DEFAULT 'operational',
    -- operational | busy | maintenance | restricted | offline
    manager_id VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_dept_key ON enterprise_departments (key);
CREATE INDEX IF NOT EXISTS idx_enterprise_dept_status ON enterprise_departments (status);

-- 6. User ↔ Department mapping (many-to-many with role)
-- One user can be in multiple departments with different roles
CREATE TABLE IF NOT EXISTS enterprise_user_departments (
    id VARCHAR(40) PRIMARY KEY,
    user_id VARCHAR(40) REFERENCES enterprise_users(id) ON DELETE CASCADE,
    department_id VARCHAR(40) REFERENCES enterprise_departments(id) ON DELETE CASCADE,
    role_id VARCHAR(40) REFERENCES enterprise_roles(id),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, department_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_eud_user_id ON enterprise_user_departments (user_id);
CREATE INDEX IF NOT EXISTS idx_eud_dept_id ON enterprise_user_departments (department_id);

-- 7. Sessions (active logins with device info)
CREATE TABLE IF NOT EXISTS enterprise_sessions (
    id VARCHAR(40) PRIMARY KEY,
    user_id VARCHAR(40) REFERENCES enterprise_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255),
    refresh_token_hash VARCHAR(255),
    device_id VARCHAR(120),
    device_name VARCHAR(200),
    browser VARCHAR(200),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    login_time TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ,
    logout_time TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_es_user_id ON enterprise_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_es_active ON enterprise_sessions (is_active);

-- 8. Audit Logs (immutable event trail)
CREATE TABLE IF NOT EXISTS enterprise_audit_logs (
    id VARCHAR(40) PRIMARY KEY,
    user_id VARCHAR(40) REFERENCES enterprise_users(id),
    action VARCHAR(120) NOT NULL,
    -- login, logout, workspace_entry, workspace_exit, patient_viewed, patient_updated,
    -- report_generated, ai_query, resource_allocated, bed_assigned, emergency_approved,
    -- profile_updated, settings_changed, export_performed, permission_denied
    category VARCHAR(60),
    -- auth, patient, workspace, report, ai, resource, admin
    entity_type VARCHAR(60),
    entity_id VARCHAR(40),
    department_id VARCHAR(40),
    workspace_id VARCHAR(60),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eal_user_id ON enterprise_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_eal_action ON enterprise_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_eal_category ON enterprise_audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_eal_created_at ON enterprise_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_eal_success ON enterprise_audit_logs (success);
