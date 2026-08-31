"""
Database Connection — PostgreSQL via SQLAlchemy/asyncpg
======================================================
Provides async session factory for the application's PostgreSQL database.

Note: Despite the legacy module name 'mongo', this backend uses PostgreSQL
with a document-style JSONB storage layer (app.db.models.Document).
"""
from __future__ import annotations
import logging

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.models import Base


class DbState:
    engine: AsyncEngine | None = None
    session_factory: async_sessionmaker[AsyncSession] | None = None


db_state = DbState()


async def connect_database() -> None:
    """Initialize the PostgreSQL connection pool and create tables."""
    settings = get_settings()
    db_state.engine = create_async_engine(settings.postgres_url, pool_pre_ping=True)
    db_state.session_factory = async_sessionmaker(db_state.engine, expire_on_commit=False)

    async with db_state.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_database() -> None:
    """Dispose of the PostgreSQL connection pool."""
    if db_state.engine is not None:
        await db_state.engine.dispose()
        db_state.engine = None
        db_state.session_factory = None


# Module-level logger for graceful degradation messages
_logger = logging.getLogger("lifelink.database")


def get_db() -> async_sessionmaker[AsyncSession] | None:
    """
    Get database session factory with graceful degradation.
    Returns the session factory if available, or None — never raises.
    Reconnection is handled asynchronously at the lifespan level.
    """
    if db_state.session_factory is None:
        _logger.warning("Database not initialized — will reconnect on next lifespan cycle")
        return None
    return db_state.session_factory


def require_db() -> async_sessionmaker[AsyncSession]:
    """
    Get database session factory or raise 503 if unavailable.
    Use this in route handlers that cannot function without a database.
    """
    session = get_db()
    if session is None:
        raise HTTPException(
            status_code=503,
            detail="Database service unavailable. Please try again later.",
        )
    return session


# ─── Backward-compatible aliases ─────────────────────────────────
# These aliases preserve compatibility with existing code that imports
# the old function names from the legacy 'mongo' module name.
connect_to_mongo = connect_database
close_mongo_connection = close_database
