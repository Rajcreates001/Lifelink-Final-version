"""
Offline Mode Manager for Ambulance Edge Runtime
================================================
States: ONLINE → DEGRADED → OFFLINE → RECOVERING

If connectivity disappears:
    Ambulance → Local edge runtime → Critical local inference
    → Store events locally → Connection restored → Synchronize

Key principle: never allow AI unavailability to stop emergency response.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

logger = logging.getLogger("lifelink.edge_ai.offline")


class ConnectionState:
    ONLINE = "online"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    RECOVERING = "recovering"


class OfflineManager:
    """Manages offline/degraded mode for ambulance edge runtime."""

    def __init__(self, ambulance_id: str, storage_path: str | None = None):
        self.ambulance_id = ambulance_id
        self.state = ConnectionState.ONLINE
        self._storage_path = Path(storage_path or f".edge_ai/{ambulance_id}")
        self._storage_path.mkdir(parents=True, exist_ok=True)
        self._pending_events: list[dict[str, Any]] = []
        self._last_sync: float = 0.0
        self._state_changed_at: float = time.time()
        self._load_pending()

    def _load_pending(self) -> None:
        """Load pending events from local storage."""
        events_file = self._storage_path / "pending_events.jsonl"
        if events_file.exists():
            try:
                with events_file.open() as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            self._pending_events.append(json.loads(line))
                logger.info(
                    "Loaded %d pending events for ambulance %s",
                    len(self._pending_events), self.ambulance_id,
                )
            except Exception as exc:
                logger.warning("Failed to load pending events: %s", exc)

    def _save_pending(self) -> None:
        """Persist pending events to local storage."""
        events_file = self._storage_path / "pending_events.jsonl"
        try:
            with events_file.open("w") as f:
                for event in self._pending_events:
                    f.write(json.dumps(event, default=str) + "\n")
        except Exception as exc:
            logger.error("Failed to save pending events: %s", exc)

    def transition(self, new_state: str) -> None:
        """Transition to a new connection state."""
        old_state = self.state
        self.state = new_state
        self._state_changed_at = time.time()
        logger.info(
            "Ambulance %s: %s → %s",
            self.ambulance_id, old_state, new_state,
        )

    def check_connectivity(self) -> str:
        """Check current connectivity and transition state."""
        try:
            import urllib.request
            urllib.request.urlopen("http://localhost:3001/api/health", timeout=3)
            if self.state != ConnectionState.ONLINE:
                self.transition(ConnectionState.RECOVERING)
                # Will transition to ONLINE after successful sync
            return ConnectionState.ONLINE
        except Exception:
            if self.state == ConnectionState.ONLINE:
                self.transition(ConnectionState.DEGRADED)
            elif self.state == ConnectionState.RECOVERING:
                self.transition(ConnectionState.OFFLINE)
            elif self.state == ConnectionState.DEGRADED:
                # After some time in degraded, go fully offline
                elapsed = time.time() - self._state_changed_at
                if elapsed > 30:
                    self.transition(ConnectionState.OFFLINE)
            return self.state

    def store_event(self, event: dict[str, Any]) -> str:
        """
        Store an event locally for later synchronization.
        Returns the local event ID.
        """
        event_id = str(uuid4())
        stored_event = {
            "id": event_id,
            "ambulance_id": self.ambulance_id,
            "event": event,
            "stored_at": time.time(),
            "synced": False,
        }
        self._pending_events.append(stored_event)
        self._save_pending()
        logger.info("Stored event %s locally (offline mode)", event_id)
        return event_id

    async def sync_pending(self) -> dict[str, Any]:
        """
        Sync all pending events to the server.
        Returns sync results.
        """
        if not self._pending_events:
            return {"synced": 0, "failed": 0}

        if self.state == ConnectionState.OFFLINE:
            return {"synced": 0, "failed": 0, "reason": "offline"}

        synced = 0
        failed = 0

        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                for event in self._pending_events[:]:
                    try:
                        resp = await client.post(
                            "http://localhost:3001/api/ambulance/events/sync",
                            json=event,
                        )
                        if resp.status_code < 400:
                            self._pending_events.remove(event)
                            synced += 1
                        else:
                            failed += 1
                    except Exception:
                        failed += 1
        except Exception as exc:
            logger.warning("Sync failed: %s", exc)
            failed = len(self._pending_events)

        self._save_pending()

        if synced > 0 and failed == 0:
            self.transition(ConnectionState.ONLINE)

        self._last_sync = time.time()

        return {"synced": synced, "failed": failed}

    def get_critical_local_data(self) -> dict[str, Any]:
        """
        Get locally cached critical data for offline inference.
        This includes: recent vitals, patient info, hospital availability,
        emergency protocols.
        """
        cache_file = self._storage_path / "critical_cache.json"
        if cache_file.exists():
            try:
                with cache_file.open() as f:
                    return json.load(f)
            except Exception:
                pass

        return {
            "emergency_protocols": [
                "Cardiac: CPR + AED + transport to nearest cardiac center",
                "Trauma: Stabilize + direct transport to trauma center",
                "Stroke: Time-critical, nearest stroke center",
                "Respiratory: O2 support + nearest respiratory center",
            ],
            "nearest_hospitals": [],
            "blood_bank_status": "unknown",
        }

    def save_critical_cache(self, data: dict[str, Any]) -> None:
        """Cache critical data for offline use."""
        cache_file = self._storage_path / "critical_cache.json"
        try:
            with cache_file.open("w") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as exc:
            logger.error("Failed to save critical cache: %s", exc)

    def get_status(self) -> dict[str, Any]:
        """Get the current offline manager status."""
        return {
            "ambulance_id": self.ambulance_id,
            "state": self.state,
            "pending_events": len(self._pending_events),
            "last_sync": self._last_sync,
            "state_changed_at": self._state_changed_at,
            "seconds_in_state": round(time.time() - self._state_changed_at, 1),
        }
