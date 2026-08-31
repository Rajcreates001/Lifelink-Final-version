"""
LifeLink — AI Memory Search Adapter
=====================================
Searches AI chat sessions, memory store, and prior assistant outputs.
"""

from __future__ import annotations

import logging

from app.services.search.schemas import SearchResultItem

logger = logging.getLogger("lifelink.search.ai_memory")


class AiMemoryAdapter:
    """Search AI memory/sessions for relevant context."""

    def __init__(self):
        self._chat_service = None

    async def _ensure_chat_service(self):
        if self._chat_service is None:
            try:
                from app.services.ai_chat_service import AiChatService
                self._chat_service = AiChatService()
            except Exception as e:
                logger.warning("Could not initialize AiChatService: %s", e)

    async def search(self, query: str, user_id: str) -> list[SearchResultItem]:
        if not user_id:
            return []
        await self._ensure_chat_service()

        results = []
        lowered = query.lower()
        try:
            if self._chat_service:
                messages = await self._chat_service.get_recent_messages(user_id, limit=20)
                for msg in messages:
                    content = str(msg.get("content", ""))
                    if not content or lowered not in content.lower():
                        continue
                    results.append(SearchResultItem(
                        id=f"memory:{msg.get('id', '')}",
                        title=f"AI Chat: {content[:60]}",
                        category="ai_memory",
                        summary=content[:200],
                        content_snippet=f"Role: {msg.get('role', '')}",
                        source_type="ai_memory",
                        source_name="AI Chat Memory",
                        trust_score=0.65,
                        timestamp=str(msg.get("timestamp", "")),
                        metadata=dict(msg),
                    ))
        except Exception as e:
            logger.warning("AI memory search error: %s", e)

        return results[:5]
