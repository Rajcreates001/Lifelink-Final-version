"""
LifeLink Backup — API Endpoints
================================
Endpoints for database backup, restore, and history.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.backup_manager import get_backup_manager

router = APIRouter(tags=["backup"])


# ─── Status ──────────────────────────────────────────────────

@router.get("/backup/status")
async def backup_status():
    """Get backup system status for both databases."""
    manager = get_backup_manager()
    return manager.get_status()


# ─── PostgreSQL ──────────────────────────────────────────────

@router.post("/backup/postgres")
async def backup_postgres(background_tasks: BackgroundTasks):
    """Trigger PostgreSQL backup (runs in background)."""
    manager = get_backup_manager()

    def run_backup():
        manager.backup_postgres()

    background_tasks.add_task(run_backup)
    return {"status": "started", "database": "postgres", "message": "PostgreSQL backup initiated"}


@router.post("/backup/postgres/restore")
async def restore_postgres(backup_file: str = "", latest: bool = True):
    """Restore PostgreSQL from backup."""
    manager = get_backup_manager()
    result = manager.restore_postgres(backup_file=backup_file, latest=latest)
    return result


# ─── MongoDB ─────────────────────────────────────────────────

@router.post("/backup/mongodb")
async def backup_mongodb(background_tasks: BackgroundTasks):
    """Trigger MongoDB backup (runs in background)."""
    manager = get_backup_manager()

    def run_backup():
        manager.backup_mongodb()

    background_tasks.add_task(run_backup)
    return {"status": "started", "database": "mongodb", "message": "MongoDB backup initiated"}


@router.post("/backup/mongodb/restore")
async def restore_mongodb(backup_file: str = "", latest: bool = True):
    """Restore MongoDB from backup."""
    manager = get_backup_manager()
    result = manager.restore_mongodb(backup_file=backup_file, latest=latest)
    return result


# ─── Combined ────────────────────────────────────────────────

@router.post("/backup/all")
async def backup_all(background_tasks: BackgroundTasks):
    """Trigger backup for both databases."""
    manager = get_backup_manager()

    def run_backup():
        manager.backup_all()

    background_tasks.add_task(run_backup)
    return {"status": "started", "message": "Full backup initiated for PostgreSQL and MongoDB"}


# ─── History ─────────────────────────────────────────────────

@router.get("/backup/history")
async def backup_history(limit: int = 20):
    """Get backup history."""
    manager = get_backup_manager()
    history = manager.get_history(limit=limit)
    return {"count": len(history), "backups": history}
