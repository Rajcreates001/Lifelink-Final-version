"""
Backward-compatible shim — all exports have moved to app.db.database.

This module re-exports everything from database.py so existing imports
continue to work. All new code should import from app.db.database directly.
"""
from app.db.database import (  # noqa: F401
    connect_database,
    connect_to_mongo,
    close_database,
    close_mongo_connection,
    get_db,
    require_db,
)

__all__ = [
    "connect_database",
    "connect_to_mongo",
    "close_database",
    "close_mongo_connection",
    "get_db",
    "require_db",
]
