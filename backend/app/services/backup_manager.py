"""
LifeLink Backup Manager
========================
Unified service for managing database backups across PostgreSQL and MongoDB.
Provides backup/restore operations, scheduling, and history tracking.
"""

import json
import os
import subprocess
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger("lifelink.backup")

# ─── Paths ───────────────────────────────────────────────────
PROJECT_DIR = Path(__file__).resolve().parent.parent.parent
SCRIPTS_DIR = PROJECT_DIR / "scripts"
BACKUPS_DIR = PROJECT_DIR / "backups"
HISTORY_FILE = BACKUPS_DIR / "backup_history.json"


class BackupManager:
    """Manages database backups for PostgreSQL and MongoDB."""

    def __init__(self):
        BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
        (BACKUPS_DIR / "postgres").mkdir(exist_ok=True)
        (BACKUPS_DIR / "mongodb").mkdir(exist_ok=True)
        self.history = self._load_history()

    def _load_history(self) -> dict:
        if HISTORY_FILE.exists():
            try:
                with open(HISTORY_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {"backups": [], "last_postgres": None, "last_mongodb": None}

    def _save_history(self):
        self.history["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(HISTORY_FILE, "w") as f:
            json.dump(self.history, f, indent=2, default=str)

    def _record_backup(self, db_type: str, status: str, file_path: str = "",
                       size: str = "", duration: float = 0, error: str = ""):
        entry = {
            "id": f"{db_type}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "type": db_type,
            "status": status,
            "file_path": file_path,
            "size": size,
            "duration_seconds": round(duration, 1),
            "error": error,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.history["backups"].insert(0, entry)
        self.history[f"last_{db_type}"] = entry["created_at"]
        # Keep last 100 entries
        if len(self.history["backups"]) > 100:
            self.history["backups"] = self.history["backups"][:100]
        self._save_history()
        return entry

    # ─── PostgreSQL ──────────────────────────────────────────

    def backup_postgres(self) -> dict:
        """Run PostgreSQL backup."""
        import time
        start = time.time()

        try:
            script = SCRIPTS_DIR / "backup_postgres.sh"
            if not script.exists():
                return {"status": "error", "error": "Backup script not found"}

            result = subprocess.run(
                ["bash", str(script)],
                capture_output=True, text=True, timeout=300,
                cwd=str(PROJECT_DIR),
            )

            duration = time.time() - start

            if result.returncode == 0:
                # Find the latest backup file
                backups = sorted(
                    (BACKUPS_DIR / "postgres").glob("*.sql.gz"),
                    key=lambda f: f.stat().st_mtime,
                    reverse=True,
                )
                latest = backups[0] if backups else None
                size = f"{latest.stat().st_size / 1024 / 1024:.1f}MB" if latest else ""

                entry = self._record_backup("postgres", "success",
                    str(latest) if latest else "", size, duration)
                return {"status": "success", "backup": entry}
            else:
                entry = self._record_backup("postgres", "failed",
                    error=result.stderr[:500], duration=duration)
                return {"status": "failed", "error": result.stderr[:500]}

        except Exception as e:
            duration = time.time() - start
            entry = self._record_backup("postgres", "error", error=str(e), duration=duration)
            return {"status": "error", "error": str(e)}

    def restore_postgres(self, backup_file: str = "", latest: bool = False) -> dict:
        """Restore PostgreSQL from backup."""
        import time
        start = time.time()

        try:
            script = SCRIPTS_DIR / "restore_postgres.sh"
            args = ["bash", str(script)]
            if latest:
                args.append("--latest")
            elif backup_file:
                args.append(backup_file)

            result = subprocess.run(
                args, capture_output=True, text=True, timeout=600,
                cwd=str(PROJECT_DIR),
            )

            duration = time.time() - start
            return {
                "status": "success" if result.returncode == 0 else "warning",
                "duration_seconds": round(duration, 1),
                "output": result.stdout[-500:] if result.stdout else "",
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # ─── MongoDB ─────────────────────────────────────────────

    def backup_mongodb(self) -> dict:
        """Run MongoDB backup."""
        import time
        start = time.time()

        try:
            script = SCRIPTS_DIR / "backup_mongodb.sh"
            if not script.exists():
                return {"status": "error", "error": "Backup script not found"}

            result = subprocess.run(
                ["bash", str(script)],
                capture_output=True, text=True, timeout=300,
                cwd=str(PROJECT_DIR),
            )

            duration = time.time() - start

            if result.returncode == 0:
                backups = sorted(
                    (BACKUPS_DIR / "mongodb").glob("*.tar.gz"),
                    key=lambda f: f.stat().st_mtime,
                    reverse=True,
                )
                latest = backups[0] if backups else None
                size = f"{latest.stat().st_size / 1024 / 1024:.1f}MB" if latest else ""

                entry = self._record_backup("mongodb", "success",
                    str(latest) if latest else "", size, duration)
                return {"status": "success", "backup": entry}
            else:
                entry = self._record_backup("mongodb", "failed",
                    error=result.stderr[:500], duration=duration)
                return {"status": "failed", "error": result.stderr[:500]}

        except Exception as e:
            duration = time.time() - start
            entry = self._record_backup("mongodb", "error", error=str(e), duration=duration)
            return {"status": "error", "error": str(e)}

    def restore_mongodb(self, backup_file: str = "", latest: bool = False) -> dict:
        """Restore MongoDB from backup."""
        import time
        start = time.time()

        try:
            script = SCRIPTS_DIR / "restore_mongodb.sh"
            args = ["bash", str(script)]
            if latest:
                args.append("--latest")
            elif backup_file:
                args.append(backup_file)

            result = subprocess.run(
                args, capture_output=True, text=True, timeout=600,
                cwd=str(PROJECT_DIR),
            )

            duration = time.time() - start
            return {
                "status": "success" if result.returncode == 0 else "warning",
                "duration_seconds": round(duration, 1),
                "output": result.stdout[-500:] if result.stdout else "",
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # ─── Combined Operations ─────────────────────────────────

    def backup_all(self) -> dict:
        """Backup both PostgreSQL and MongoDB."""
        results = {
            "postgres": self.backup_postgres(),
            "mongodb": self.backup_mongodb(),
        }
        results["overall"] = "success" if all(
            r["status"] == "success" for r in results.values()
        ) else "partial"
        return results

    def get_history(self, limit: int = 20) -> list:
        """Get backup history."""
        return self.history.get("backups", [])[:limit]

    def get_status(self) -> dict:
        """Get backup system status."""
        postgres_backups = list((BACKUPS_DIR / "postgres").glob("*.sql.gz"))
        mongodb_backups = list((BACKUPS_DIR / "mongodb").glob("*.tar.gz"))

        pg_size = sum(f.stat().st_size for f in postgres_backups)
        mg_size = sum(f.stat().st_size for f in mongodb_backups)

        return {
            "postgres": {
                "backup_count": len(postgres_backups),
                "total_size_mb": round(pg_size / 1024 / 1024, 1),
                "last_backup": self.history.get("last_postgres"),
                "latest_file": str(postgres_backups[-1]) if postgres_backups else None,
            },
            "mongodb": {
                "backup_count": len(mongodb_backups),
                "total_size_mb": round(mg_size / 1024 / 1024, 1),
                "last_backup": self.history.get("last_mongodb"),
                "latest_file": str(mongodb_backups[-1]) if mongodb_backups else None,
            },
            "history_count": len(self.history.get("backups", [])),
        }


# ─── Singleton ───────────────────────────────────────────────
_manager: Optional[BackupManager] = None


def get_backup_manager() -> BackupManager:
    global _manager
    if _manager is None:
        _manager = BackupManager()
    return _manager
