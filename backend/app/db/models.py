from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    collection: Mapped[str] = mapped_column(String(120), index=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiChatSession(Base):
    __tablename__ = "ai_chat_sessions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    module: Mapped[str | None] = mapped_column(String(80))
    mode: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(40), ForeignKey("ai_chat_sessions.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    role: Mapped[str] = mapped_column(String(20), index=True)
    content: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovHospital(Base):
    __tablename__ = "gov_hospitals"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    city: Mapped[str | None] = mapped_column(String(120))
    state: Mapped[str | None] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float, index=True)
    longitude: Mapped[float] = mapped_column(Float, index=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    beds_total: Mapped[int] = mapped_column(Integer, default=0)
    beds_available: Mapped[int] = mapped_column(Integer, default=0)
    load_score: Mapped[float] = mapped_column(Float, default=0.0)
    rating: Mapped[float] = mapped_column(Float, default=4.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovAmbulance(Base):
    __tablename__ = "gov_ambulances"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    code: Mapped[str] = mapped_column(String(60), index=True)
    driver: Mapped[str | None] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float, index=True)
    longitude: Mapped[float] = mapped_column(Float, index=True)
    status: Mapped[str] = mapped_column(String(40), default="available", index=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovEmergency(Base):
    __tablename__ = "gov_emergencies"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    emergency_type: Mapped[str] = mapped_column(String(120), index=True)
    severity: Mapped[str] = mapped_column(String(40), index=True)
    latitude: Mapped[float] = mapped_column(Float, index=True)
    longitude: Mapped[float] = mapped_column(Float, index=True)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    hospital_id: Mapped[str | None] = mapped_column(String(40), ForeignKey("gov_hospitals.id"))
    ambulance_id: Mapped[str | None] = mapped_column(String(40), ForeignKey("gov_ambulances.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovUser(Base):
    __tablename__ = "gov_users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    role: Mapped[str] = mapped_column(String(40), index=True)
    sub_role: Mapped[str | None] = mapped_column(String(60), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovPrediction(Base):
    __tablename__ = "gov_predictions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    prediction_type: Mapped[str] = mapped_column(String(80), index=True)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovVerificationRequest(Base):
    __tablename__ = "gov_verification_requests"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    requested_by: Mapped[str | None] = mapped_column(String(40))
    reviewed_by: Mapped[str | None] = mapped_column(String(40))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovAuditLog(Base):
    __tablename__ = "gov_audit_logs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    actor_id: Mapped[str] = mapped_column(String(40), index=True)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[str] = mapped_column(String(40), index=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovDisasterEvent(Base):
    __tablename__ = "gov_disaster_events"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    disaster_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    zone: Mapped[str | None] = mapped_column(String(120))
    severity: Mapped[str] = mapped_column(String(40), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    peak_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timeline: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    meta: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovDecisionEvent(Base):
    __tablename__ = "gov_decision_events"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    event: Mapped[str] = mapped_column(String(120), index=True)
    location: Mapped[str | None] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    suggested_action: Mapped[str] = mapped_column(Text)
    impact: Mapped[str] = mapped_column(String(40))
    affected_entities: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovPolicyAction(Base):
    __tablename__ = "gov_policy_actions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    action: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), index=True)
    impact: Mapped[str | None] = mapped_column(String(40))
    decision_event_id: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GovSimulationSession(Base):
    __tablename__ = "gov_simulation_sessions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    intensity: Mapped[str] = mapped_column(String(40), default="medium")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meta: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False)


class GovKnowledgeBase(Base):
    __tablename__ = "gov_knowledge_base"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    module: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str] = mapped_column(String(240), index=True)
    content: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    source: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class CoreHospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    location: Mapped[str] = mapped_column(String(240), index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=0)
    occupancy: Mapped[int] = mapped_column(Integer, default=0)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class CoreAmbulance(Base):
    __tablename__ = "ambulances"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    driver: Mapped[str | None] = mapped_column(String(160))
    location: Mapped[str] = mapped_column(String(240), index=True)
    status: Mapped[str] = mapped_column(String(40), default="available", index=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class CoreUser(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    role: Mapped[str] = mapped_column(String(40), index=True)
    location: Mapped[str | None] = mapped_column(String(240), index=True)


class CoreEmergency(Base):
    __tablename__ = "emergencies"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    emergency_type: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[str] = mapped_column(String(40), index=True)
    location: Mapped[str] = mapped_column(String(240), index=True)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    occurred_at: Mapped[datetime] = mapped_column("timestamp", DateTime(timezone=True), index=True)
    assigned_hospital: Mapped[str | None] = mapped_column(String(40))


class CorePrediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    prediction_type: Mapped[str] = mapped_column(String(80), index=True)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class CoreAuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    actor: Mapped[str] = mapped_column(String(120), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    hash: Mapped[str] = mapped_column(String(128))
    prev_hash: Mapped[str | None] = mapped_column(String(128))


# =====================================================================
# ENTERPRISE AUTH MODELS (Phase 1: Workspace RBAC)
# =====================================================================


class EnterpriseUser(Base):
    """Hospital employee / enterprise user with full identity and credentials."""
    __tablename__ = "enterprise_users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), index=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    employee_id: Mapped[str | None] = mapped_column(String(60))
    designation: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(30), default="active", index=True)  # active, suspended, inactive
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar: Mapped[str | None] = mapped_column(String(500))
    profile_settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_activity: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class EnterpriseRole(Base):
    """Named role with priority and description."""
    __tablename__ = "enterprise_roles"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)  # True for admin, cannot be deleted
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EnterprisePermission(Base):
    """Granular permission — stored individually for fine-grained RBAC."""
    __tablename__ = "enterprise_permissions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(80), index=True)  # e.g. "patients", "finance", "ai"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EnterpriseRolePermission(Base):
    """Many-to-many: roles ←→ permissions."""
    __tablename__ = "enterprise_role_permissions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    role_id: Mapped[str] = mapped_column(String(40), ForeignKey("enterprise_roles.id"), index=True)
    permission_id: Mapped[str] = mapped_column(String(40), ForeignKey("enterprise_permissions.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EnterpriseDepartment(Base):
    """Hospital department with operational status."""
    __tablename__ = "enterprise_departments"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    key: Mapped[str] = mapped_column(String(60), unique=True, index=True)  # e.g. "emergency", "icu"
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="operational", index=True)
    # operational | busy | maintenance | restricted | offline
    manager_id: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EnterpriseUserDepartment(Base):
    """Many-to-many: users ←→ departments with specific role in that department.
    Supports one user being in multiple departments with different roles."""
    __tablename__ = "enterprise_user_departments"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), ForeignKey("enterprise_users.id"), index=True)
    department_id: Mapped[str] = mapped_column(String(40), ForeignKey("enterprise_departments.id"), index=True)
    role_id: Mapped[str] = mapped_column(String(40), ForeignKey("enterprise_roles.id"), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EnterpriseSession(Base):
    """Active user sessions with device info for Remember Me."""
    __tablename__ = "enterprise_sessions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), ForeignKey("enterprise_users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), index=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(255))
    device_id: Mapped[str | None] = mapped_column(String(120))
    device_name: Mapped[str | None] = mapped_column(String(200))
    browser: Mapped[str | None] = mapped_column(String(200))
    os: Mapped[str | None] = mapped_column(String(100))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    location: Mapped[str | None] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    login_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_activity: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    logout_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# =====================================================================
# AI INFRASTRUCTURE MODELS (Headroom + SIE Integration)
# =====================================================================


class AiConversation(Base):
    """Isolated AI conversation per user/role/org/session."""
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    role_id: Mapped[str] = mapped_column(String(40), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(40), index=True)
    hospital_id: Mapped[str | None] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default="active", index=True)
    context_tier_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiMessage(Base):
    """Individual message in an AI conversation with token tracking."""
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(40), ForeignKey("ai_conversations.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    sender: Mapped[str] = mapped_column(String(20))  # user | assistant | system
    content: Mapped[str] = mapped_column(Text)
    original_token_count: Mapped[int] = mapped_column(Integer, default=0)
    compressed_token_count: Mapped[int] = mapped_column(Integer, default=0)
    context_version: Mapped[int] = mapped_column(Integer, default=1)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiContextItem(Base):
    """Scoped context items for authorization-filtered retrieval."""
    __tablename__ = "ai_context_items"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    conversation_id: Mapped[str | None] = mapped_column(String(40), index=True)
    source_type: Mapped[str] = mapped_column(String(60), index=True)  # record, document, conversation, rag_chunk, tool_output
    source_id: Mapped[str | None] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    importance: Mapped[str] = mapped_column(String(20), default="tier_2", index=True)  # tier_1, tier_2, tier_3, tier_4
    authorization_scope: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    organization_id: Mapped[str | None] = mapped_column(String(40), index=True)
    hospital_id: Mapped[str | None] = mapped_column(String(40), index=True)
    department_id: Mapped[str | None] = mapped_column(String(40), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiMemory(Base):
    """Persistent AI memory per user/role/org for cross-session context."""
    __tablename__ = "ai_memory"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    role_id: Mapped[str] = mapped_column(String(40), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(40), index=True)
    memory_type: Mapped[str] = mapped_column(String(40), index=True)  # preference, fact, summary, pattern
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(JSONB)
    importance: Mapped[str] = mapped_column(String(20), default="tier_2")
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    last_accessed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiContextRetrieval(Base):
    """Tracks what context was retrieved and sent to the LLM for each request."""
    __tablename__ = "ai_context_retrievals"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(40), index=True)
    conversation_id: Mapped[str | None] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    context_item_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    original_tokens: Mapped[int] = mapped_column(Integer, default=0)
    compressed_tokens: Mapped[int] = mapped_column(Integer, default=0)
    compression_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    retrieval_source: Mapped[str] = mapped_column(String(40))  # db, vector, scrapling, memory
    reranked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiAction(Base):
    """Records every AI-initiated action for audit and human-in-the-loop."""
    __tablename__ = "ai_actions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    role_id: Mapped[str] = mapped_column(String(40), index=True)
    agent: Mapped[str] = mapped_column(String(60), index=True)
    action_type: Mapped[str] = mapped_column(String(80), index=True)
    input_reference: Mapped[str | None] = mapped_column(String(120))
    output_reference: Mapped[str | None] = mapped_column(String(120))
    data_sources: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    decision: Mapped[str] = mapped_column(String(200))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(40))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiToolCall(Base):
    """Tracks every tool invocation by AI agents."""
    __tablename__ = "ai_tool_calls"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    agent: Mapped[str] = mapped_column(String(60), index=True)
    tool_name: Mapped[str] = mapped_column(String(80), index=True)
    tool_input: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    tool_output: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    authorization_scope: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiAuditLog(Base):
    """Immutable audit trail for every AI action, retrieval, and decision."""
    __tablename__ = "ai_audit_logs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[str] = mapped_column(String(40), index=True)
    role: Mapped[str] = mapped_column(String(40), index=True)
    agent: Mapped[str] = mapped_column(String(60), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    input_reference: Mapped[str | None] = mapped_column(String(120))
    output_reference: Mapped[str | None] = mapped_column(String(120))
    tools_used: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    data_sources: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    decision: Mapped[str | None] = mapped_column(Text)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(40))
    tokens_input: Mapped[int] = mapped_column(Integer, default=0)
    tokens_output: Mapped[int] = mapped_column(Integer, default=0)
    tokens_compressed: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    model: Mapped[str | None] = mapped_column(String(80))
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiObservabilityMetrics(Base):
    """Aggregated AI performance metrics for the infrastructure dashboard."""
    __tablename__ = "ai_observability_metrics"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    metric_type: Mapped[str] = mapped_column(String(60), index=True)  # latency, tokens, compression, retrieval, fallback
    metric_name: Mapped[str] = mapped_column(String(120), index=True)
    value: Mapped[float] = mapped_column(Float, default=0.0)
    tags: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class EnterpriseAuditLog(Base):
    """Immutable audit trail for every enterprise action."""
    __tablename__ = "enterprise_audit_logs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(40), ForeignKey("enterprise_users.id"), index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    # login, logout, workspace_entry, workspace_exit, patient_viewed, patient_updated,
    # report_generated, ai_query, resource_allocated, bed_assigned, emergency_approved,
    # profile_updated, settings_changed, export_performed, permission_denied
    category: Mapped[str | None] = mapped_column(String(60), index=True)
    # auth, patient, workspace, report, ai, resource, admin
    entity_type: Mapped[str | None] = mapped_column(String(60))
    entity_id: Mapped[str | None] = mapped_column(String(40))
    department_id: Mapped[str | None] = mapped_column(String(40))
    workspace_id: Mapped[str | None] = mapped_column(String(60))
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
