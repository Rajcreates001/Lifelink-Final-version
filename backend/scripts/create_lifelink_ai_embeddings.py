"""
Create the lifelink_ai_embeddings table in PostgreSQL.
Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
"""
from __future__ import annotations

import asyncio
import asyncpg

DB_URL = "postgresql://postgres:Maha_251@localhost:5432/lifelink_v1_db"


async def main():
    conn = await asyncpg.connect(DB_URL)
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS lifelink_ai_embeddings (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL,
                user_id VARCHAR(64),
                role_id VARCHAR(64),
                module VARCHAR(100) NOT NULL DEFAULT 'general',
                chunk_text TEXT NOT NULL,
                chunk_index INTEGER DEFAULT 0,
                source_document VARCHAR(255) DEFAULT '',
                source_title VARCHAR(255) DEFAULT '',
                content_type VARCHAR(50) DEFAULT 'policy',
                embedding_vector JSONB,
                tags JSONB DEFAULT '[]',
                roles JSONB DEFAULT '[]',
                accessible_modules JSONB DEFAULT '[]',
                extra_data JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        print("[OK] lifelink_ai_embeddings table created (or already exists)")

        # Create indexes
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_lai_emb_hosp_type
            ON lifelink_ai_embeddings (hospital_id, content_type)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_lai_emb_source
            ON lifelink_ai_embeddings (source_document)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_lai_emb_module
            ON lifelink_ai_embeddings (module, content_type)
        """)
        print("[OK] Indexes created")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
