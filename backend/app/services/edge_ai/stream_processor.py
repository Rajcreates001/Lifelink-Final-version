"""
Freshness-Based Stream Processor
================================
For ambulance data streams (GPS, vitals, camera, emergency status):
don't build an unlimited backlog. Instead:
    Incoming stream → Latest-state buffer → Inference

If new data supersedes old data, old low-value observations
can be dropped from active inference.

Inspired by VLA edge-runtime design principles.
"""

from __future__ import annotations

import logging
import time
from collections import OrderedDict
from typing import Any

logger = logging.getLogger("lifelink.edge_ai.stream")


class StreamProcessor:
    """
    Maintains a latest-state buffer for streaming data.
    Old data that is superseded by newer data is dropped.
    """

    def __init__(self, max_buffer_size: int = 100, max_age_seconds: float = 30.0):
        self._buffer: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._max_buffer_size = max_buffer_size
        self._max_age = max_age_seconds

    def ingest(self, key: str, data: dict[str, Any]) -> None:
        """
        Ingest a new data point. If the key already exists,
        the old data is superseded and dropped from active buffer.
        """
        # Remove old entry if exists (re-insert at end = newest)
        if key in self._buffer:
            del self._buffer[key]

        data["_ingested_at"] = time.time()
        self._buffer[key] = data

        # Evict oldest if buffer is full
        while len(self._buffer) > self._max_buffer_size:
            oldest_key, oldest_data = self._buffer.popitem(last=False)
            logger.debug("Evicted stale buffer entry: %s", oldest_key)

    def get_latest_state(self) -> dict[str, Any]:
        """Get the current latest-state snapshot for inference."""
        self._evict_expired()
        return dict(self._buffer)

    def get_latest(self, key: str) -> dict[str, Any] | None:
        """Get the latest value for a specific key."""
        return self._buffer.get(key)

    def get_stream_summary(self) -> dict[str, Any]:
        """Get a summary of the current buffer state."""
        self._evict_expired()
        ages = []
        for data in self._buffer.values():
            age = time.time() - data.get("_ingested_at", time.time())
            ages.append(round(age, 2))

        return {
            "buffer_size": len(self._buffer),
            "keys": list(self._buffer.keys()),
            "avg_age_seconds": round(sum(ages) / len(ages), 2) if ages else 0,
            "max_age_seconds": round(max(ages), 2) if ages else 0,
        }

    def _evict_expired(self) -> None:
        """Remove entries older than max_age."""
        now = time.time()
        expired = [
            key for key, data in self._buffer.items()
            if now - data.get("_ingested_at", 0) > self._max_age
        ]
        for key in expired:
            del self._buffer[key]
            logger.debug("Evicted expired buffer entry: %s", key)

    def clear(self) -> None:
        self._buffer.clear()


# Pre-built processors for common ambulance streams
class AmbulanceStreamManager:
    """Manages multiple stream processors for an ambulance's data."""

    def __init__(self, ambulance_id: str):
        self.ambulance_id = ambulance_id
        self.gps = StreamProcessor(max_buffer_size=50, max_age_seconds=60.0)
        self.vitals = StreamProcessor(max_buffer_size=30, max_age_seconds=120.0)
        self.emergency = StreamProcessor(max_buffer_size=10, max_age_seconds=300.0)
        self.comms = StreamProcessor(max_buffer_size=20, max_age_seconds=180.0)

    def get_all_latest(self) -> dict[str, Any]:
        """Get the latest state from all streams."""
        return {
            "ambulance_id": self.ambulance_id,
            "gps": self.gps.get_latest_state(),
            "vitals": self.vitals.get_latest_state(),
            "emergency": self.emergency.get_latest_state(),
            "comms": self.comms.get_latest_state(),
            "timestamp": time.time(),
        }

    def get_summary(self) -> dict[str, Any]:
        return {
            "ambulance_id": self.ambulance_id,
            "gps": self.gps.get_stream_summary(),
            "vitals": self.vitals.get_stream_summary(),
            "emergency": self.emergency.get_stream_summary(),
            "comms": self.comms.get_stream_summary(),
        }
