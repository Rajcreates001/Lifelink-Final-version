"""
LifeLink — AI Orchestrator (LangGraph)
=======================================
Central coordinator for all AI operations.
Integrates Headroom (context compression), SIE (inference/retrieval),
and LifeLink's multi-agent system — all through a security-first pipeline.

Architecture:
                      LIFE LINK
                         │
                  ┌──────▼──────┐
                  │   Security  │  ← Auth + RBAC + ABAC
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │ AI Context   │  ← Authorization Filter
                  │   Builder    │  ← Tier Classification
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │  HEADROOM   │  ← Context Compression
                  │ Context Opt.│  ← CCR (reversible)
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │     SIE     │  ← Embeddings + Retrieval
                  │ Retrieval + │  ← Reranking
                  │ Inference   │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │ LifeLink AI │  ← LangGraph Agents
                  │   Agents    │
                  └──────┬──────┘
                         │
           ┌─────────────┼──────────────┐
           ▼             ▼              ▼
      Healthcare     Emergency      Government
         AI             AI             AI
           │             │              │
           └─────────────┼──────────────┘
                         ▼
                  LifeLink Response
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from app.core.config import get_settings
from app.services.ai_platform.context_builder import (
    AIContext,
    AIContextBuilder,
    UserContext,
)
from app.services.ai_platform.headroom_service import HeadroomService
from app.services.ai_platform.sie_client import SIEClient, get_sie_client

logger = logging.getLogger("lifelink.ai.orchestrator")


# ═══════════════════════════════════════════════════════════════════
# PRIORITY CLASSES (VLA-inspired)
# ═══════════════════════════════════════════════════════════════════

class Priority:
    CRITICAL = "critical"    # Cardiac arrest, severe oxygen deterioration
    HIGH = "high"            # Ambulance routing, urgent cases
    NORMAL = "normal"        # Routine health summary, standard queries
    BACKGROUND = "background"  # Historical analytics, batch processing


PRIORITY_TIMEOUTS = {
    Priority.CRITICAL: 5.0,
    Priority.HIGH: 15.0,
    Priority.NORMAL: 30.0,
    Priority.BACKGROUND: 60.0,
}

PRIORITY_MODELS = {
    Priority.CRITICAL: "groq/compound",  # Fast model
    Priority.HIGH: "groq/compound",
    Priority.NORMAL: "groq/compound",
    Priority.BACKGROUND: "groq/compound",
}


# ═══════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE
# ═══════════════════════════════════════════════════════════════════

@dataclass
class AIRequest:
    """A fully authorized AI request."""
    request_id: str = field(default_factory=lambda: str(uuid4()))
    user_ctx: UserContext | None = None
    query: str = ""
    priority: str = Priority.NORMAL
    agent_type: str = "conversational"  # conversational, clinical, emergency, knowledge, search
    context_items: list[dict[str, Any]] = field(default_factory=list)
    conversation_id: str | None = None
    tools_allowed: list[str] = field(default_factory=list)
    structured_schema: dict[str, Any] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AIResponse:
    """The AI's response with full provenance."""
    request_id: str
    response: str
    agent: str
    confidence: float = 0.0
    reasoning: str = ""
    evidence: list[str] = field(default_factory=list)
    sources: list[dict[str, Any]] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    actions: list[dict[str, Any]] = field(default_factory=list)
    requires_human_review: bool = False
    # Metrics
    original_tokens: int = 0
    compressed_tokens: int = 0
    compression_ratio: float = 0.0
    retrieval_count: int = 0
    rerank_count: int = 0
    latency_ms: float = 0.0
    model: str = ""
    fallback_used: bool = False
    # Safety
    data_label: str = ""  # observed | predicted | inferred | recommended | unknown
    disclaimers: list[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════

class AIOrchestrator:
    """
    Central AI orchestrator — the single entry point for all AI operations.
    Every AI request flows through: Security → Context → Headroom → SIE → Agent → Response.
    """

    def __init__(self):
        self._context_builder = AIContextBuilder()
        self._headroom = HeadroomService()
        self._sie = get_sie_client()
        self._settings = get_settings()

    async def process(self, request: AIRequest) -> AIResponse:
        """
        Process an AI request through the full pipeline.

        Pipeline:
        1. Validate authorization
        2. Build authorized context
        3. Retrieve relevant documents (SIE)
        4. Compress context (Headroom)
        5. Run agent
        6. Validate response safety
        7. Record audit
        """
        start_time = time.time()
        settings = self._settings

        # Step 1: Validate authorization
        if not request.user_ctx:
            return self._error_response(request, "No user context provided", start_time)

        tools = self._context_builder.get_allowed_tools(request.user_ctx)
        if request.tools_allowed:
            request.tools_allowed = [t for t in request.tools_allowed if t in tools]
        else:
            request.tools_allowed = tools

        # Step 2: Build authorized context
        ai_context = await self._context_builder.build_context(
            request.user_ctx,
            request.context_items,
        )

        # Step 3: Retrieve relevant documents (SIE)
        retrieval_items = []
        if request.query and self._sie.is_available and settings.enable_semantic_search:
            try:
                retrieval_items = await self._sie.search(
                    query=request.query,
                    documents=[
                        {"id": item.get("source_id", ""), "content": item.get("content", "")}
                        for item in ai_context.items
                    ],
                    top_k=20,
                )

                # Rerank if enabled
                if retrieval_items and settings.enable_reranking:
                    retrieval_items = await self._sie.rerank(
                        query=request.query,
                        documents=retrieval_items,
                        top_k=5,
                    )
            except Exception as exc:
                logger.warning("SIE retrieval failed, proceeding without: %s", exc)

        # Step 4: Compress context (Headroom)
        compressed_context = ai_context.items
        original_tokens = ai_context.total_tokens
        compressed_tokens = original_tokens

        if self._headroom.is_available and ai_context.items:
            try:
                # Build messages for compression
                context_text = "\n".join(
                    f"[{item.get('_tier', 'tier_2')}] {item.get('content', '')}"
                    for item in ai_context.items
                )
                messages = [
                    {"role": "system", "content": context_text},
                    {"role": "user", "content": request.query},
                ]

                compression_result = await self._headroom.compress_conversation_history(messages)
                if compression_result.get("compressed"):
                    original_tokens = compression_result.get("total_original_tokens", original_tokens)
                    compressed_tokens = compression_result.get("total_compressed_tokens", compressed_tokens)
            except Exception as exc:
                logger.warning("Headroom compression failed, proceeding without: %s", exc)

        # Step 5: Run agent
        try:
            agent_response = await self._run_agent(request, ai_context, retrieval_items)
        except Exception as exc:
            logger.error("Agent execution failed: %s", exc)
            agent_response = self._fallback_response(request)

        # Step 6: Validate response safety
        safety = self._validate_safety(agent_response, request)

        # Step 7: Calculate metrics
        latency_ms = (time.time() - start_time) * 1000
        compression_ratio = (
            round(1 - compressed_tokens / original_tokens, 3)
            if original_tokens > 0
            else 0.0
        )

        return AIResponse(
            request_id=request.request_id,
            response=agent_response.get("response", ""),
            agent=request.agent_type,
            confidence=agent_response.get("confidence", 0.0),
            reasoning=agent_response.get("reasoning", ""),
            evidence=agent_response.get("evidence", []),
            sources=agent_response.get("sources", []),
            tools_used=agent_response.get("tools_used", []),
            actions=agent_response.get("actions", []),
            requires_human_review=safety.get("requires_human_review", False),
            original_tokens=original_tokens,
            compressed_tokens=compressed_tokens,
            compression_ratio=compression_ratio,
            retrieval_count=len(retrieval_items),
            rerank_count=len(retrieval_items),
            latency_ms=round(latency_ms, 2),
            model=PRIORITY_MODELS.get(request.priority, "groq/compound"),
            fallback_used=agent_response.get("fallback_used", False),
            data_label=agent_response.get("data_label", "inferred"),
            disclaimers=safety.get("disclaimers", []),
        )

    async def _run_agent(
        self,
        request: AIRequest,
        context: AIContext,
        retrieval_items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Route to the appropriate agent based on request type."""
        from app.services.multi_agent import (
            clinical_agent,
            emergency_agent,
            coordinator_agent,
        )

        # Build the agent event
        event = {
            "query": request.query,
            "context_items": [item.get("content", "") for item in context.items[:10]],
            "retrieval_items": [item.get("content", "") for item in retrieval_items[:5]],
            "user_role": context.user_ctx.role,
            "priority": request.priority,
        }

        if request.agent_type == "clinical":
            result = clinical_agent(event)
        elif request.agent_type == "emergency":
            result = emergency_agent(event)
        else:
            # Use the existing LLM for conversational queries
            from app.services.llm_service import generate_response_async
            system = "You are LifeLink AI. Provide clear, empathetic, evidence-based healthcare guidance."
            if context.user_ctx.role == "hospital":
                system = "You are LifeLink AI for hospital staff. Provide clinical decision support with evidence."
            elif context.user_ctx.role == "government":
                system = "You are LifeLink AI for government officials. Provide policy-relevant healthcare intelligence."

            response = await generate_response_async(
                prompt=request.query,
                system_prompt=system,
                mode=request.agent_type,
                timeout=PRIORITY_TIMEOUTS.get(request.priority, 30.0),
            )
            result = {
                "response": response,
                "confidence": 0.75,
                "data_label": "inferred",
            }

        return result

    def _validate_safety(
        self,
        agent_response: dict[str, Any],
        request: AIRequest,
    ) -> dict[str, Any]:
        """Validate the AI response for medical safety."""
        disclaimers = []
        requires_human_review = False

        response_text = agent_response.get("response", "")
        confidence = agent_response.get("confidence", 0.0)

        # Low confidence → human review
        if confidence < 0.5:
            requires_human_review = True
            disclaimers.append("Low confidence — recommend professional review")

        # Check for dangerous claims
        dangerous_phrases = [
            "you will have", "you are going to", "definitely",
            "100%", "guaranteed", "always", "never wrong",
        ]
        for phrase in dangerous_phrases:
            if phrase in response_text.lower():
                requires_human_review = True
                disclaimers.append(
                    f"Response may contain absolute claims — verify with clinical data"
                )
                break

        # Emergency actions always require human review
        if request.priority in (Priority.CRITICAL, Priority.HIGH):
            requires_human_review = True
            disclaimers.append("Emergency-level action — requires human approval before execution")

        # Medical data disclaimer
        if request.agent_type in ("clinical", "emergency"):
            disclaimers.append(
                "This is AI-generated analysis, not a medical diagnosis. "
                "Always consult a qualified healthcare professional."
            )

        return {
            "requires_human_review": requires_human_review,
            "disclaimers": disclaimers,
        }

    def _error_response(
        self,
        request: AIRequest,
        error: str,
        start_time: float,
    ) -> AIResponse:
        """Generate an error response."""
        return AIResponse(
            request_id=request.request_id,
            response=f"AI processing error: {error}",
            agent=request.agent_type,
            confidence=0.0,
            latency_ms=round((time.time() - start_time) * 1000, 2),
            requires_human_review=True,
            disclaimers=[error],
        )

    def _fallback_response(self, request: AIRequest) -> dict[str, Any]:
        """Generate a fallback response when agents fail."""
        return {
            "response": (
                "I apologize, but I'm unable to process your request at this time. "
                "This could be due to a temporary system issue. "
                "Please try again or contact your system administrator."
            ),
            "confidence": 0.0,
            "fallback_used": True,
            "data_label": "unknown",
            "disclaimers": ["System fallback — AI temporarily unavailable"],
        }
