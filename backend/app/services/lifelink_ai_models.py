"""
lifelink_ai_models.py — Dedicated LifeLink AI database tables.

These tables are COMPLETELY separate from the public AI chat system.
All conversations are isolated by hospital_id, user_id, and role_id.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Boolean, Float, ForeignKey, Integer, JSON, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from typing import Optional


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class LifeLinkAIBase(DeclarativeBase):
    pass


class LifeLinkAIConversation(LifeLinkAIBase):
    """
    Each conversation belongs to exactly one user, one hospital, one role.
    No cross-hospital, cross-role, or cross-user sharing.
    """
    __tablename__ = "lifelink_ai_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255), default="New conversation")
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role_label: Mapped[str] = mapped_column(String(100), default="user")
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    module: Mapped[str] = mapped_column(String(100), default="general")
    mode: Mapped[str] = mapped_column(String(20), default="chat")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("idx_lai_conv_hosp_user_role", "hospital_id", "user_id", "role_id"),
        Index("idx_lai_conv_updated", "user_id", "updated_at"),
    )


class LifeLinkAIMessage(LifeLinkAIBase):
    """
    Messages belong to a conversation. Filtered by hospital_id + user_id + role_id at the service layer.
    """
    __tablename__ = "lifelink_ai_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(String(64), ForeignKey("lifelink_ai_conversations.id"), nullable=False, index=True)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text, default="")
    source_query: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    attachments: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    web_results: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    references: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    reasoning: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    clarifying: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    charts: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    report: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    orchestration: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    follow_up: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        Index("idx_lai_msg_conv", "conversation_id", "created_at"),
        Index("idx_lai_msg_hosp_user", "hospital_id", "user_id"),
    )


class LifeLinkAIContext(LifeLinkAIBase):
    """
    Stores the active context for each session — current module, role, hospital info.
    Loaded fresh on every AI interaction.
    """
    __tablename__ = "lifelink_ai_context"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role_label: Mapped[str] = mapped_column(String(100), default="user")
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    current_module: Mapped[str] = mapped_column(String(100), default="general")
    current_shift: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_resources: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    user_preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    hospital_context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    enabled_modules: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("idx_lai_ctx_session", "session_id"),
        Index("idx_lai_ctx_user_role", "user_id", "role_id"),
    )


class LifeLinkAIMemory(LifeLinkAIBase):
    """
    Long-term memory per user. Preferences, frequent queries, pinned items, shortcuts.
    NEVER shared between users.
    """
    __tablename__ = "lifelink_ai_memory"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    memory_type: Mapped[str] = mapped_column(String(50), default="preference")  # preference, shortcut, frequent_query, pinned
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("idx_lai_mem_user_type", "user_id", "memory_type"),
        Index("idx_lai_mem_hosp_role", "hospital_id", "role_id"),
    )


class LifeLinkAISession(LifeLinkAIBase):
    """
    Tracks active AI sessions — created on login, closed on logout.
    """
    __tablename__ = "lifelink_ai_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    login_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    last_activity: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    logout_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    device: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("idx_lai_sess_active", "user_id", "is_active"),
        Index("idx_lai_sess_hosp", "hospital_id"),
    )


class LifeLinkAIFeedback(LifeLinkAIBase):
    """
    User feedback on AI responses — stored per message, isolated per user.
    """
    __tablename__ = "lifelink_ai_feedback"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    message_id: Mapped[str] = mapped_column(String(64), ForeignKey("lifelink_ai_messages.id"), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(64), ForeignKey("lifelink_ai_conversations.id"), nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class LifeLinkAIEmbedding(LifeLinkAIBase):
    """
    RAG embeddings for LifeLink AI — stores chunked documents with metadata
    for retrieval-augmented generation.
    Chunks are isolated by hospital_id and optionally by role_id / module.
    """
    __tablename__ = "lifelink_ai_embeddings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    role_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    module: Mapped[str] = mapped_column(String(100), default="general", index=True)

    # Content
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    source_document: Mapped[str] = mapped_column(String(255), default="", index=True)
    source_title: Mapped[str] = mapped_column(String(255), default="")
    content_type: Mapped[str] = mapped_column(String(50), default="policy", index=True)
    # policy, clinical_guide, procedure, drug_info, hospital_info, medical_knowledge, general

    # Embedding vector (stored as JSON list of floats — actual search via FAISS)
    embedding_vector: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Metadata for search filtering
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    roles: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    accessible_modules: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("idx_lai_emb_hosp_type", "hospital_id", "content_type"),
        Index("idx_lai_emb_source", "source_document"),
        Index("idx_lai_emb_module", "module", "content_type"),
    )


class LifeLinkAIAuditLog(LifeLinkAIBase):
    """
    Audit trail for all AI interactions — immutable, append-only.
    """
    __tablename__ = "lifelink_ai_audit_log"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    conversation_id: Mapped[str] = mapped_column(String(64), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # query, response, delete, pin, feedback
    prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_summary: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    module: Mapped[str] = mapped_column(String(100), default="general")
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        Index("idx_lai_audit_user", "user_id", "created_at"),
        Index("idx_lai_audit_hosp", "hospital_id", "created_at"),
    )
