"""
create_lifelink_ai_tables.py — Create LifeLink AI dedicated tables.

Run: python scripts/create_lifelink_ai_tables.py

Creates 7 isolated tables for the Enterprise AI Chat system.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Build database URL
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "lifelink_db")

SQL = """
-- LifeLink AI Conversations
CREATE TABLE IF NOT EXISTS lifelink_ai_conversations (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'New conversation',
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    role_label VARCHAR(100) NOT NULL DEFAULT 'user',
    department VARCHAR(100),
    module VARCHAR(100) NOT NULL DEFAULT 'general',
    mode VARCHAR(20) NOT NULL DEFAULT 'chat',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    extra_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_lai_conv_hosp_user_role ON lifelink_ai_conversations (hospital_id, user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_lai_conv_updated ON lifelink_ai_conversations (user_id, updated_at);

-- LifeLink AI Messages
CREATE TABLE IF NOT EXISTS lifelink_ai_messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES lifelink_ai_conversations(id),
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    role VARCHAR(10) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    source_query TEXT,
    confidence FLOAT,
    attachments JSONB DEFAULT '[]'::jsonb,
    web_results JSONB DEFAULT '[]'::jsonb,
    references JSONB DEFAULT '[]'::jsonb,
    reasoning JSONB DEFAULT '[]'::jsonb,
    clarifying JSONB DEFAULT '[]'::jsonb,
    charts JSONB DEFAULT '[]'::jsonb,
    report JSONB,
    orchestration JSONB,
    follow_up TEXT,
    extra_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lai_msg_conv ON lifelink_ai_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lai_msg_hosp_user ON lifelink_ai_messages (hospital_id, user_id);

-- LifeLink AI Context (per-session state)
CREATE TABLE IF NOT EXISTS lifelink_ai_context (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    role_label VARCHAR(100) NOT NULL DEFAULT 'user',
    department VARCHAR(100),
    current_module VARCHAR(100) NOT NULL DEFAULT 'general',
    current_shift VARCHAR(50),
    assigned_resources JSONB DEFAULT '[]'::jsonb,
    user_preferences JSONB DEFAULT '{}'::jsonb,
    hospital_context JSONB DEFAULT '{}'::jsonb,
    enabled_modules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lai_ctx_session ON lifelink_ai_context (session_id);
CREATE INDEX IF NOT EXISTS idx_lai_ctx_user_role ON lifelink_ai_context (user_id, role_id);

-- LifeLink AI Memory (long-term)
CREATE TABLE IF NOT EXISTS lifelink_ai_memory (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    memory_type VARCHAR(50) NOT NULL DEFAULT 'preference',
    key VARCHAR(255) NOT NULL,
    value TEXT,
    weight FLOAT NOT NULL DEFAULT 1.0,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lai_mem_user_type ON lifelink_ai_memory (user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_lai_mem_hosp_role ON lifelink_ai_memory (hospital_id, role_id);

-- LifeLink AI Sessions (login tracking)
CREATE TABLE IF NOT EXISTS lifelink_ai_sessions (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    device VARCHAR(255),
    user_agent TEXT,
    extra_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_lai_sess_active ON lifelink_ai_sessions (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_lai_sess_hosp ON lifelink_ai_sessions (hospital_id);

-- LifeLink AI Feedback
CREATE TABLE IF NOT EXISTS lifelink_ai_feedback (
    id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL REFERENCES lifelink_ai_messages(id),
    conversation_id VARCHAR(64) NOT NULL REFERENCES lifelink_ai_conversations(id),
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LifeLink AI Audit Log (immutable, append-only)
CREATE TABLE IF NOT EXISTS lifelink_ai_audit_log (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(64),
    action VARCHAR(50) NOT NULL,
    prompt TEXT,
    response_summary VARCHAR(500),
    module VARCHAR(100) NOT NULL DEFAULT 'general',
    latency_ms INTEGER,
    tokens_used INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lai_audit_user ON lifelink_ai_audit_log (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lai_audit_hosp ON lifelink_ai_audit_log (hospital_id, created_at);
"""


async def main():
    database_url = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"Creating LifeLink AI tables in: {DB_HOST}:{DB_PORT}/{DB_NAME}")

    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(database_url, echo=False)

    async with engine.begin() as conn:
        for statement in SQL.split(";"):
            stmt = statement.strip()
            if stmt:
                await conn.execute(stmt)

    await engine.dispose()

    tables = [
        "lifelink_ai_conversations",
        "lifelink_ai_messages",
        "lifelink_ai_context",
        "lifelink_ai_memory",
        "lifelink_ai_sessions",
        "lifelink_ai_feedback",
        "lifelink_ai_audit_log",
    ]

    print("\n✓ All 7 LifeLink AI tables created successfully:")
    for table in tables:
        print(f"  - {table}")


if __name__ == "__main__":
    asyncio.run(main())
