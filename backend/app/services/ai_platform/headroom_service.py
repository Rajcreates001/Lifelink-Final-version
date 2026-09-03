"""
LifeLink — Headroom Context Compression Service
================================================
Wraps the headroom-ai library to compress:
- Tool outputs (JSON, logs, API responses)
- RAG chunks before sending to LLM
- Conversation history
- Database query results

Architecture:
    LifeLink Context Builder
            ↓
      Headroom Service  ←→  CCR (reversible compression)
            ↓
       Optimized Context → LLM / SIE

Tier Policy:
    Tier 1 (Critical): current emergency, active patient, critical alerts
        → NEVER compress/remove
    Tier 2 (Relevant): recent history, recent cases, recent conversation
        → Compress with balanced policy
    Tier 3 (Historical): old conversations, old reports, old notifications
        → Aggressive compression
    Tier 4 (Low-value): repeated UI events, redundant tool outputs
        → Maximum compression, potentially drop
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any
from uuid import uuid4

from app.core.config import get_settings

logger = logging.getLogger("lifelink.ai.headroom")

# Lazy-loaded headroom compress function
_compress_fn = None
_compress_available = None


def _ensure_headroom():
    """Lazy-load headroom library to avoid import failures when not installed."""
    global _compress_fn, _compress_available
    if _compress_available is not None:
        return _compress_available is not None

    settings = get_settings()
    if not settings.headroom_enabled:
        _compress_available = False
        logger.info("Headroom disabled via HEADROOM_ENABLED=false")
        return False

    try:
        from headroom import compress
        _compress_fn = compress
        _compress_available = True
        logger.info("Headroom context compression loaded successfully")
        return True
    except ImportError:
        logger.warning(
            "headroom-ai not installed. Run: pip install 'headroom-ai[all]'"
        )
        _compress_available = False
        return False
    except Exception as exc:
        logger.warning("Headroom initialization failed: %s", exc)
        _compress_available = False
        return False


# ═══════════════════════════════════════════════════════════════════
# TIER-BASED COMPRESSION POLICY
# ═══════════════════════════════════════════════════════════════════

TIER_POLICY = {
    "tier_1": {
        "compress": False,
        "description": "Critical — never compress or remove",
        "examples": [
            "current_emergency", "active_patient_condition",
            "critical_alert", "hospital_emergency_status",
        ],
    },
    "tier_2": {
        "compress": True,
        "level": "balanced",
        "description": "Relevant — compress with balanced policy",
        "examples": [
            "recent_health_history", "recent_emergency_cases",
            "recent_department_activity", "recent_conversation",
        ],
    },
    "tier_3": {
        "compress": True,
        "level": "aggressive",
        "description": "Historical — aggressive compression",
        "examples": [
            "old_conversations", "old_reports",
            "old_notifications", "historical_analytics",
        ],
    },
    "tier_4": {
        "compress": True,
        "level": "maximum",
        "description": "Low-value — maximum compression, potentially drop",
        "examples": [
            "repeated_ui_events", "redundant_tool_outputs",
            "duplicated_search_results",
        ],
    },
}


def classify_item_tier(item: dict[str, Any]) -> str:
    """Classify a context item into a compression tier based on its metadata."""
    source_type = item.get("source_type", "")
    importance = item.get("importance", "tier_2")
    age_hours = item.get("age_hours", 0)

    # Critical items are always tier 1
    if importance == "critical" or source_type in (
        "current_emergency", "active_patient", "critical_alert",
    ):
        return "tier_1"

    # Historical items
    if age_hours > 168:  # older than 7 days
        return "tier_3"

    # Low-value / redundant
    if source_type in ("ui_event", "redundant_output", "duplicate_result"):
        return "tier_4"

    return importance if importance.startswith("tier_") else "tier_2"


# ═══════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════

class HeadroomService:
    """LifeLink's context compression layer using Headroom."""

    def __init__(self):
        self._available = _ensure_headroom()
        settings = get_settings()
        self._compression_level = settings.headroom_compression_level

    @property
    def is_available(self) -> bool:
        return self._available

    async def compress_tool_output(
        self,
        output: str | dict[str, Any],
        tool_name: str = "unknown",
        tier: str = "tier_2",
    ) -> dict[str, Any]:
        """
        Compress a tool output (JSON, log, API response) before sending to LLM.

        Returns dict with keys: compressed, original_tokens, compressed_tokens, tier
        """
        if not self._available:
            return self._fallback_compress(output)

        policy = TIER_POLICY.get(tier, TIER_POLICY["tier_2"])

        # Tier 1 never gets compressed
        if not policy.get("compress", True):
            return {
                "compressed": output,
                "original_tokens": self._estimate_tokens(output),
                "compressed_tokens": self._estimate_tokens(output),
                "tier": tier,
                "compressed": False,
                "reason": "Tier 1 critical data preserved intact",
            }

        text = output if isinstance(output, str) else json.dumps(output, default=str)
        original_tokens = self._estimate_tokens(text)

        try:
            messages = [{"role": "user", "content": text}]
            result = _compress_fn(messages)
            # CompressResult object: .messages, .tokens_before, .tokens_after, .compression_ratio
            compressed_text = result.messages[0].get("content", text) if result.messages else text
            compressed_tokens = result.tokens_after if hasattr(result, "tokens_after") else self._estimate_tokens(compressed_text)
            comp_ratio = result.compression_ratio if hasattr(result, "compression_ratio") else (
                round(1 - compressed_tokens / original_tokens, 3) if original_tokens > 0 else 0.0
            )

            return {
                "compressed": compressed_text,
                "original_tokens": result.tokens_before if hasattr(result, "tokens_before") else original_tokens,
                "compressed_tokens": compressed_tokens,
                "tier": tier,
                "compressed": True,
                "compression_ratio": comp_ratio,
            }
        except Exception as exc:
            logger.warning("Headroom compression failed for %s: %s", tool_name, exc)
            return self._fallback_compress(output)

    async def compress_rag_chunks(
        self,
        chunks: list[dict[str, Any]],
        tier: str = "tier_2",
    ) -> dict[str, Any]:
        """
        Compress multiple RAG chunks before sending to LLM.

        Tier 1 chunks are preserved intact.
        Tier 2-4 chunks are compressed based on policy.
        """
        if not self._available:
            return self._fallback_compress_chunks(chunks)

        preserved = []
        compressed = []
        total_original = 0
        total_compressed = 0

        for chunk in chunks:
            chunk_tier = chunk.get("tier", tier)
            policy = TIER_POLICY.get(chunk_tier, TIER_POLICY["tier_2"])
            text = chunk.get("content", "")
            orig_tokens = self._estimate_tokens(text)
            total_original += orig_tokens

            if not policy.get("compress", True):
                preserved.append(chunk)
                total_compressed += orig_tokens
                continue

            try:
                messages = [{"role": "user", "content": text}]
                result = _compress_fn(messages)
                compressed_text = result.messages[0].get("content", text) if result.messages else text
                comp_tokens = result.tokens_after if hasattr(result, "tokens_after") else self._estimate_tokens(compressed_text)
                total_compressed += comp_tokens

                compressed.append({
                    **chunk,
                    "content": compressed_text,
                    "original_tokens": orig_tokens,
                    "compressed_tokens": comp_tokens,
                })
            except Exception:
                compressed.append({**chunk, "original_tokens": orig_tokens, "compressed_tokens": orig_tokens})
                total_compressed += orig_tokens

        return {
            "preserved_chunks": preserved,
            "compressed_chunks": compressed,
            "total_original_tokens": total_original,
            "total_compressed_tokens": total_compressed,
            "compression_ratio": (
                round(1 - total_compressed / total_original, 3)
                if total_original > 0
                else 0.0
            ),
        }

    async def compress_conversation_history(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 4000,
    ) -> dict[str, Any]:
        """
        Compress conversation history to fit within token budget.
        Tier 1 (recent 3 messages) are preserved intact.
        Older messages get progressively compressed.
        """
        if not self._available or len(messages) <= 3:
            return {
                "messages": messages,
                "compressed": False,
                "total_tokens": sum(self._estimate_tokens(m.get("content", "")) for m in messages),
            }

        # Split: recent (preserve) + older (compress)
        recent = messages[-3:]
        older = messages[:-3]

        total_original = sum(self._estimate_tokens(m.get("content", "")) for m in messages)

        compressed_older = []
        for msg in older:
            text = msg.get("content", "")
            try:
                result = _compress_fn(
                    [{"role": msg.get("role", "user"), "content": text}],
                )
                compressed_text = result.messages[0].get("content", text) if result.messages else text
                compressed_older.append({**msg, "content": compressed_text})
            except Exception:
                compressed_older.append(msg)

        all_messages = compressed_older + recent
        total_compressed = sum(self._estimate_tokens(m.get("content", "")) for m in all_messages)

        return {
            "messages": all_messages,
            "compressed": True,
            "total_original_tokens": total_original,
            "total_compressed_tokens": total_compressed,
            "compression_ratio": (
                round(1 - total_compressed / total_original, 3)
                if total_original > 0
                else 0.0
            ),
        }

    async def compress_for_scrapling(
        self,
        web_results: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Compress external web search results from Scrapling."""
        if not self._available:
            return web_results

        results = []
        for item in web_results:
            text = item.get("content", item.get("snippet", ""))
            if not text:
                results.append(item)
                continue

            try:
                result = _compress_fn(
                    [{"role": "user", "content": text}],
                )
                compressed = result.messages[0].get("content", text) if result.messages else text
                results.append({**item, "content": compressed, "original_content": text})
            except Exception:
                results.append(item)

        return results

    def get_compression_stats(self) -> dict[str, Any]:
        """Return compression statistics for the observability dashboard."""
        return {
            "headroom_available": self._available,
            "compression_level": self._compression_level,
            "tier_policy": {
                tier: {
                    "compress": policy["compress"],
                    "description": policy["description"],
                }
                for tier, policy in TIER_POLICY.items()
            },
        }

    def _fallback_compress(self, output: str | dict[str, Any]) -> dict[str, Any]:
        """Fallback when Headroom is unavailable — simple truncation."""
        text = output if isinstance(output, str) else json.dumps(output, default=str)
        tokens = self._estimate_tokens(text)

        # Simple fallback: keep last 60% of text
        if tokens > 500:
            chars = len(text)
            compressed_text = text[int(chars * 0.4):]
        else:
            compressed_text = text

        compressed_tokens = self._estimate_tokens(compressed_text)

        return {
            "compressed": compressed_text,
            "original_tokens": tokens,
            "compressed_tokens": compressed_tokens,
            "tier": "tier_2",
            "compressed": True,
            "fallback": True,
            "compression_ratio": (
                round(1 - compressed_tokens / tokens, 3)
                if tokens > 0
                else 0.0
            ),
        }

    def _fallback_compress_chunks(self, chunks: list[dict[str, Any]]) -> dict[str, Any]:
        """Fallback chunk compression."""
        total_original = 0
        total_compressed = 0
        compressed = []

        for chunk in chunks:
            text = chunk.get("content", "")
            tokens = self._estimate_tokens(text)
            total_original += tokens

            if tokens > 200:
                compressed_text = text[len(text) // 3:]
            else:
                compressed_text = text
            comp_tokens = self._estimate_tokens(compressed_text)
            total_compressed += comp_tokens
            compressed.append({**chunk, "content": compressed_text})

        return {
            "preserved_chunks": [],
            "compressed_chunks": compressed,
            "total_original_tokens": total_original,
            "total_compressed_tokens": total_compressed,
            "fallback": True,
            "compression_ratio": (
                round(1 - total_compressed / total_original, 3)
                if total_original > 0
                else 0.0
            ),
        }

    @staticmethod
    def _estimate_tokens(text: str | Any) -> int:
        """Rough token estimate: ~4 chars per token for English."""
        if not isinstance(text, str):
            text = json.dumps(text, default=str) if text else ""
        return max(1, len(text) // 4)
