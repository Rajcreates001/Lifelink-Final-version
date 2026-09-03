"""
Edge AI Runtime — Top-Level Coordinator
========================================
Ties together:
- PriorityController (deadline-aware inference)
- StreamProcessor (freshness-based data handling)
- OfflineManager (connectivity resilience)

This is the isolated ambulance edge service.
It does NOT import from the main LifeLink backend directly.
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.edge_ai.priority import (
    Priority,
    PriorityController,
    PriorityRequest,
)
from app.services.edge_ai.stream_processor import AmbulanceStreamManager
from app.services.edge_ai.offline_mode import OfflineManager, ConnectionState

logger = logging.getLogger("lifelink.edge_ai.runtime")

# Singleton
_edge_runtime = None


def get_edge_runtime(ambulance_id: str = "default") -> "EdgeAIRuntime":
    global _edge_runtime
    if _edge_runtime is None:
        _edge_runtime = EdgeAIRuntime(ambulance_id)
    return _edge_runtime


class EdgeAIRuntime:
    """
    The edge AI runtime for ambulance operations.
    Handles: priority inference, stream processing, offline mode.
    """

    def __init__(self, ambulance_id: str):
        self.ambulance_id = ambulance_id
        self.priority_controller = PriorityController()
        self.streams = AmbulanceStreamManager(ambulance_id)
        self.offline = OfflineManager(ambulance_id)
        self._request_count = 0

    async def process_emergency(
        self,
        query: str,
        vitals: dict[str, Any] | None = None,
        gps: dict[str, Any] | None = None,
        priority: str = Priority.CRITICAL,
    ) -> dict[str, Any]:
        """
        Process an emergency request through the edge runtime.
        Handles priority, streams, and degradation automatically.
        """
        self._request_count += 1

        # Check connectivity
        connection_state = self.offline.check_connectivity()

        # Ingest stream data
        if vitals:
            self.streams.vitals.ingest("current", vitals)
        if gps:
            self.streams.gps.ingest("current", gps)

        # Create priority request
        import uuid
        request = PriorityRequest(
            request_id=str(uuid.uuid4()),
            query=query,
            priority=priority,
            data={
                "vitals": self.streams.vitals.get_latest_state(),
                "gps": self.streams.gps.get_latest_state(),
            },
        )

        # Admit through priority controller
        self.priority_controller.admit(request)

        # Determine degradation tier
        tier = self.priority_controller.get_degradation_tier(request)

        # Process based on connection state and tier
        if connection_state == ConnectionState.OFFLINE:
            return self._process_offline(request, tier)
        elif connection_state == ConnectionState.DEGRADED:
            return await self._process_degraded(request, tier)
        else:
            return await self._process_online(request, tier)

    async def _process_online(
        self,
        request: PriorityRequest,
        tier: str,
    ) -> dict[str, Any]:
        """Process with full AI stack."""
        try:
            from app.services.ai_platform.orchestrator import AIOrchestrator, AIRequest, UserContext
            orchestrator = AIOrchestrator()

            ai_request = AIRequest(
                query=request.query,
                priority=request.priority,
                agent_type="emergency",
                context_items=[
                    {"content": str(request.data.get("vitals", {})), "source_type": "live_vitals"},
                ],
            )
            # Set user context for ambulance
            ai_request.user_ctx = UserContext(
                user_id=self.ambulance_id,
                role="ambulance",
                sub_role="crew",
            )

            response = await orchestrator.process(ai_request)
            self.priority_controller.complete(request.request_id)

            return {
                "status": "success",
                "tier": tier,
                "response": response.response,
                "confidence": response.confidence,
                "requires_human_review": response.requires_human_review,
                "disclaimers": response.disclaimers,
                "data_label": response.data_label,
                "latency_ms": response.latency_ms,
                "connection_state": self.offline.state,
            }
        except Exception as exc:
            logger.warning("Online processing failed, degrading: %s", exc)
            return self._process_rule_based(request)

    async def _process_degraded(
        self,
        request: PriorityRequest,
        tier: str,
    ) -> dict[str, Any]:
        """Process with degraded AI (fast model or rule-based)."""
        if tier in ("full_ai", "fast_model"):
            # Try fast model, but with shorter timeout
            try:
                from app.services.llm_service import generate_response_async
                response = await generate_response_async(
                    prompt=request.query,
                    system_prompt="You are LifeLink AI in emergency mode. Be concise.",
                    mode="emergency",
                    timeout=3.0,
                )
                self.priority_controller.complete(request.request_id)
                return {
                    "status": "degraded",
                    "tier": tier,
                    "response": response,
                    "confidence": 0.5,
                    "requires_human_review": True,
                    "fallback_used": True,
                    "connection_state": self.offline.state,
                }
            except Exception:
                pass

        return self._process_rule_based(request)

    def _process_offline(
        self,
        request: PriorityRequest,
        tier: str,
    ) -> dict[str, Any]:
        """Process completely offline with local data."""
        # Store the event for later sync
        event_id = self.offline.store_event({
            "type": "emergency_request",
            "query": request.query,
            "priority": request.priority,
            "data": request.data,
        })

        # Get local critical data
        local_data = self.offline.get_critical_local_data()

        # Rule-based response for offline mode
        response = self._generate_offline_response(request, local_data)

        self.priority_controller.complete(request.request_id)

        return {
            "status": "offline",
            "tier": "rule_based",
            "response": response,
            "confidence": 0.3,
            "requires_human_review": True,
            "fallback_used": True,
            "local_event_id": event_id,
            "pending_sync": len(self.offline._pending_events),
            "connection_state": ConnectionState.OFFLINE,
        }

    def _process_rule_based(self, request: PriorityRequest) -> dict[str, Any]:
        """Rule-based fallback for emergency processing."""
        self.priority_controller.complete(request.request_id)
        return self._generate_offline_response(
            request,
            self.offline.get_critical_local_data(),
        )

    def _generate_offline_response(
        self,
        request: PriorityRequest,
        local_data: dict[str, Any],
    ) -> str:
        """Generate a rule-based emergency response."""
        protocols = local_data.get("emergency_protocols", [])
        response_parts = [
            "⚠️ EMERGENCY RESPONSE (Rule-Based Fallback)",
            f"Query: {request.query}",
            "",
            "Available Protocols:",
        ]
        for protocol in protocols:
            response_parts.append(f"  • {protocol}")

        response_parts.extend([
            "",
            "⚠️ This is a rule-based response. AI inference unavailable.",
            "Please proceed with clinical judgment.",
            f"Event stored for sync when connectivity is restored.",
        ])

        return "\n".join(response_parts)

    def get_status(self) -> dict[str, Any]:
        """Get the complete edge runtime status."""
        return {
            "ambulance_id": self.ambulance_id,
            "connection_state": self.offline.state,
            "priority": self.priority_controller.get_stats(),
            "streams": self.streams.get_summary(),
            "offline": self.offline.get_status(),
            "total_requests": self._request_count,
        }
