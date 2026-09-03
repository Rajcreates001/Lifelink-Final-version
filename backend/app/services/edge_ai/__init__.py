"""
LifeLink — Edge AI Runtime (VLA-Inspired)
==========================================
Isolated service for ambulance/field emergency AI.
Borrowed principles from VLA edge-inference architecture:

- Deadline-aware inference (CRITICAL > HIGH > NORMAL > BACKGROUND)
- Bounded memory management
- Freshness-based stream processing (latest-state buffer)
- Graceful degradation (FULL AI → FAST MODEL → RULE-BASED → HUMAN)
- Offline/degraded mode with local sync

DO NOT import the entire VLA repository.
This is inspired by edge-runtime design principles only.
"""

from app.services.edge_ai.runtime import EdgeAIRuntime, get_edge_runtime
from app.services.edge_ai.priority import Priority, PriorityController
from app.services.edge_ai.stream_processor import StreamProcessor
from app.services.edge_ai.offline_mode import OfflineManager

__all__ = [
    "EdgeAIRuntime",
    "get_edge_runtime",
    "Priority",
    "PriorityController",
    "StreamProcessor",
    "OfflineManager",
]
