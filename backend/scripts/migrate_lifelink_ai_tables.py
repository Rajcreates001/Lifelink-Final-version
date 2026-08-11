"""
migrate_lifelink_ai_tables.py — Non-destructive schema drift fix
================================================================
The lifelink_ai_* tables were originally created by an older version of
create_lifelink_ai_tables.py. As the SQLAlchemy models gained columns
(key/value/weight/context, source_query, confidence, …), the live tables
were never altered, causing "column does not exist" 500s across every
LifeLink AI endpoint.

This migration introspects the live tables against the SQLAlchemy models
and adds any missing columns with the model's type + default. It never
drops or recreates tables and never removes columns — 100% additive.

Run: python scripts/migrate_lifelink_ai_tables.py
"""

from __future__ import annotations

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings
from app.services.lifelink_ai_models import LifeLinkAIBase


async def _existing_columns(conn, table_name: str) -> set[str]:
    rows = await conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :t"
        ),
        {"t": table_name},
    )
    return {row[0] for row in rows.all() if row[0] is not None}


async def migrate() -> list[str]:
    settings = get_settings()
    engine = create_async_engine(settings.postgres_url)
    applied: list[str] = []
    try:
        async with engine.begin() as conn:
            for table in LifeLinkAIBase.metadata.sorted_tables:
                # Ensure the table itself exists (idempotent)
                await conn.execute(
                    text(
                        f"CREATE TABLE IF NOT EXISTS {table.name} "
                        f"(id VARCHAR(64) PRIMARY KEY)"
                    )
                )
                existing = await _existing_columns(conn, table.name)

                # Legacy columns that the current ORM models no longer declare
                # (e.g. lifelink_ai_memory.key_field) were created NOT NULL by
                # the original create script. ORM inserts never provide them,
                # so every insert 500s with NotNullViolationError. Make any
                # column that exists in the table but is NOT in the model
                # nullable — 100% additive, never drops data.
                model_cols = {col.name for col in table.columns}
                legacy_cols = existing - model_cols
                for legacy in sorted(legacy_cols):
                    await conn.execute(
                        text(
                            f"ALTER TABLE {table.name} "
                            f"ALTER COLUMN \"{legacy}\" DROP NOT NULL"
                        )
                    )
                    applied.append(f"{table.name}.{legacy} (drop NOT NULL)")

                for col in table.columns:
                    if col.name in existing:
                        continue
                    col_type = col.type.compile(dialect=engine.dialect)
                    default = col.default
                    # Quote the column name: some model columns (e.g.
                    # "references") are SQL reserved words and must be quoted.
                    ddl = (
                        f"ALTER TABLE {table.name} "
                        f"ADD COLUMN IF NOT EXISTS \"{col.name}\" {col_type}"
                    )
                    if default is not None and default.is_scalar:
                        ddl += f" DEFAULT {default.arg!r}"
                    await conn.execute(text(ddl))
                    applied.append(f"{table.name}.{col.name}")
    finally:
        await engine.dispose()
    return applied


async def main() -> None:
    applied = await migrate()
    if applied:
        print(f"Applied {len(applied)} column migration(s):")
        for col in applied:
            print(f"  + {col}")
    else:
        print("No drift detected — all lifelink_ai_* tables match the models.")


if __name__ == "__main__":
    asyncio.run(main())
