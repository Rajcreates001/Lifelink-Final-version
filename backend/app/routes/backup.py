"""
LifeLink Backup — API Endpoints
================================
Endpoints for database backup, restore, and history.
All endpoints require admin-level authentication.
"""

from fastapi import APIRouter, BackgroundTasks, Depends
from app.core.auth import require_roles
from app.core.rbac import AuthContext
from app.services.backup_manager import get_backup_manager

router = APIRouter(tags=["backup"])


# ─── Status ──────────────────────────────────────────────────

@router.get("/backup/status")
async def backup_status(ctx: AuthContext = Depends(require_roles("government", "hospital"))):
    """Get backup system status."""
    manager = get_backup_manager()
    return manager.get_status()


# ─── PostgreSQL ──────────────────────────────────────────────

@router.post("/backup/postgres")
async def backup_postgres(
    background_tasks: BackgroundTasks,
    ctx: AuthContext = Depends(require_roles("government")),
):
    """Trigger PostgreSQL backup (runs in background). Admin only."""
    manager = get_backup_manager()

    def run_backup():
        manager.backup_postgres()

    background_tasks.add_task(run_backup)
    return {"status": "started", "database": "postgres", "message": "PostgreSQL backup initiated"}


@router.post("/backup/postgres/restore")
async def restore_postgres(
    backup_file: str = "",
    latest: bool = True,
    ctx: AuthContext = Depends(require_roles("government")),
):
    """Restore PostgreSQL from backup. Admin only."""
    manager = get_backup_manager()
    result = manager.restore_postgres(backup_file=backup_file, latest=latest)
    return result


# ─── Combined ────────────────────────────────────────────────

@router.post("/backup/all")
async def backup_all(
    background_tasks: BackgroundTasks,
    ctx: AuthContext = Depends(require_roles("government")),
):
    """Trigger full backup. Admin only."""
    manager = get_backup_manager()

    def run_backup():
        manager.backup_all()

    background_tasks.add_task(run_backup)
    return {"status": "started", "message": "Full backup initiated for PostgreSQL"}


# ─── History ─────────────────────────────────────────────────

@router.get("/backup/history")
async def backup_history(
    limit: int = 20,
    ctx: AuthContext = Depends(require_roles("government", "hospital")),
):
    """Get backup history."""
    manager = get_backup_manager()
    history = manager.get_history(limit=limit)
    return {"count": len(history), "backups": history}
