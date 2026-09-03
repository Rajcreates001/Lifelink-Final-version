"""
Priority Controller — VLA-Inspired Deadline-Aware Inference
===========================================================
Emergency priority classes:
    CRITICAL  → Cardiac arrest, severe oxygen deterioration (5s timeout)
    HIGH      → Ambulance routing, urgent cases (15s timeout)
    NORMAL    → Routine health summary (30s timeout)
    BACKGROUND → Historical analytics, batch (60s timeout)

If a request cannot be processed within the required time:
    FULL AI → FAST MODEL → RULE-BASED → HUMAN ESCALATION
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("lifelink.edge_ai.priority")


class Priority:
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    BACKGROUND = "background"


# Priority → timeout in seconds
DEADLINE_MAP = {
    Priority.CRITICAL: 5.0,
    Priority.HIGH: 15.0,
    Priority.NORMAL: 30.0,
    Priority.BACKGROUND: 60.0,
}

# Degradation chain: try each model in order
DEGRADATION_CHAIN = [
    {"tier": "full_ai", "model": "groq/compound", "timeout": None},
    {"tier": "fast_model", "model": "groq/compound", "timeout": 3.0},
    {"tier": "rule_based", "model": None, "timeout": 0.1},
    {"tier": "human_escalation", "model": None, "timeout": None},
]


@dataclass
class PriorityRequest:
    """A prioritized inference request."""
    request_id: str
    query: str
    priority: str
    data: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)

    @property
    def deadline(self) -> float:
        """Absolute deadline timestamp."""
        return self.created_at + DEADLINE_MAP.get(self.priority, 30.0)

    @property
    def time_remaining(self) -> float:
        """Seconds until deadline."""
        return max(0.0, self.deadline - time.time())

    @property
    def is_overdue(self) -> bool:
        return time.time() > self.deadline


class PriorityController:
    """Manages priority-based inference admission and degradation."""

    def __init__(self):
        self._queue: list[PriorityRequest] = []
        self._active: dict[str, PriorityRequest] = {}

    def admit(self, request: PriorityRequest) -> PriorityRequest:
        """
        Admit a request into the processing queue.
        Higher priority requests preempt lower priority ones.
        """
        priority_order = {
            Priority.CRITICAL: 0,
            Priority.HIGH: 1,
            Priority.NORMAL: 2,
            Priority.BACKGROUND: 3,
        }

        req_priority = priority_order.get(request.priority, 2)

        # CRITICAL requests always get admitted immediately
        if request.priority == Priority.CRITICAL:
            self._active[request.request_id] = request
            logger.info("CRITICAL request admitted: %s", request.request_id)
            return request

        # Check if we can preempt a lower-priority active request
        for active_id, active_req in list(self._active.items()):
            active_priority = priority_order.get(active_req.priority, 2)
            if req_priority < active_priority:
                # Preempt lower priority
                self._queue.append(active_req)
                del self._active[active_id]
                self._active[request.request_id] = request
                logger.info(
                    "Preempted %s for %s",
                    active_req.request_id, request.request_id,
                )
                return request

        # Normal admission
        self._queue.append(request)
        self._queue.sort(key=lambda r: priority_order.get(r.priority, 2))
        return request

    def next(self) -> PriorityRequest | None:
        """Get the next highest-priority request to process."""
        if self._queue:
            request = self._queue.pop(0)
            self._active[request.request_id] = request
            return request
        return None

    def complete(self, request_id: str) -> PriorityRequest | None:
        """Mark a request as completed."""
        return self._active.pop(request_id, None)

    def get_degradation_tier(self, request: PriorityRequest) -> str:
        """Determine which degradation tier to use based on remaining time."""
        remaining = request.time_remaining
        if remaining <= 0.1:
            return "human_escalation"
        elif remaining <= 3.0:
            return "rule_based"
        elif remaining <= 10.0:
            return "fast_model"
        else:
            return "full_ai"

    def get_stats(self) -> dict[str, Any]:
        return {
            "queued": len(self._queue),
            "active": len(self._active),
            "queue_priorities": [r.priority for r in self._queue],
        }
