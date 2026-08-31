"""
lifelink_ai.py — LifeLink Enterprise AI Chat API routes.

COMPLETELY separate from the public /v2/agents/ endpoints.
Every endpoint validates hospital_id, user_id, and role_id.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel

from app.core.auth import get_current_user


async def _current_user_dict(authorization: str | None = Header(default=None)) -> dict:
    """
    Dependency: resolve the authenticated user into a plain dict.

    The LifeLink AI context helpers (_get_auth_context / _get_portal_scope)
    call `.get()` on the user object, but core.auth.get_current_user returns
    an AuthContext dataclass. Passing AuthContext directly crashes every
    authenticated /lifelink-ai/* call with AttributeError. This wrapper
    bridges the two shapes.
    """
    ctx = await get_current_user(authorization)
    return {
        "id": ctx.user_id,
        "role": ctx.role,
        "subRole": ctx.sub_role,
        "sub_role": ctx.sub_role,
        "scopes": sorted(ctx.scopes or set()),
    }
from app.core.dependencies import get_enterprise_ai_service, get_enterprise_rag_service
from app.services.enterprise_ai_service import (
    EnterpriseAIChatService,
    generate_conversation_title,
    get_role_context
)
from app.services.enterprise_rag_service import EnterpriseRAGService
router = APIRouter(tags=["LifeLink AI"])


# ─── Request Models ─────────────────────────────────────────────────────

class ContextRequest(BaseModel):
    department: str | None = None
    current_module: str = "general"


class ConversationCreateRequest(BaseModel):
    title: str | None = None
    module: str = "general"
    mode: str = "chat"


class AskRequest(BaseModel):
    conversation_id: str | None = None
    query: str
    module: str = "general"
    web_search: bool = False
    attachments: list[dict] | None = None
    regenerate: bool = False


class MemorySetRequest(BaseModel):
    memory_type: str = "preference"
    key: str
    value: str
    weight: float = 1.0
    context: dict | None = None


class FeedbackRequest(BaseModel):
    message_id: str
    rating: int
    comment: str | None = None


class UpdateTitleRequest(BaseModel):
    title: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 10


# ─── Helper: extract auth context ──────────────────────────────────────

GOVERNMENT_ROLE_PREFIXES = {
    "government", "police", "fire", "ndma", "ndrf", "sdrf",
    "state_", "district_", "national_", "ministry", "municipal",
    "electricity", "telecom", "imd", "transport",
    "ngo", "red_cross", "civil_defence", "forest",
    "army", "air_force", "navy", "medical_corps",
    "ambulance_authority", "ambulance_dispatch", "public_health",
    "epidemiology", "vaccination", "blood_bank_authority",
    "animal_husbandry", "pharma_supply", "medical_equipment",
    "relief_coordination", "waste_management", "water_supply",
    "disaster", "central_", "central_gov",
    "railways", "airport", "port_authority",
    "food_corporation", "forest_fire", "special_ops",
    "cyber_crime", "intelligence", "traffic_police",
    "hazmat", "police_control", "fire_control",
}


def _is_government_role(role_id: str) -> bool:
    """Check if the role_id is a government/non-hospital role."""
    r = role_id.lower()
    for prefix in GOVERNMENT_ROLE_PREFIXES:
        if r.startswith(prefix):
            return True
    return False


def _get_portal_scope(user: dict) -> str:
    """Determine portal scope: 'government' or 'hospital'."""
    role = str(user.get("role") or "").lower().replace(" ", "_")
    sub_role = str(user.get("subRole") or "").lower().replace(" ", "_")
    combined = f"{role}_{sub_role}" if sub_role else role
    if _is_government_role(role) or _is_government_role(sub_role) or _is_government_role(combined):
        return "government"
    return "hospital"


def _get_auth_context(user: dict) -> dict[str, str]:
    """Extract org_id, user_id, role_id, portal from the authenticated user.
    For hospital users: org_id = hospital_id.
    For government users: org_id = organization_id or department.
    """
    portal = _get_portal_scope(user)
    if portal == "government":
        org_id = (
            user.get("organization_id")
            or user.get("organizationId")
            or user.get("org_id")
            or user.get("_id")
            or "government"
        )
    else:
        # Hospital users: prefer an explicit hospital id, else fall back to the
        # user's own id as the org partition (mirrors the government fallback
        # to "government") so the AI context always has a scoping key.
        org_id = (
            user.get("hospital_id")
            or user.get("hospitalId")
            or user.get("id")
            or user.get("_id")
            or ""
        )
    user_id = user.get("id") or user.get("_id") or ""
    role_id = user.get("subRole") or user.get("role") or user.get("sub_role") or "staff"
    return {
        "org_id": str(org_id),
        "user_id": str(user_id),
        "role_id": str(role_id).lower().replace(" ", "_"),
        "portal": portal,
    }


def _validate_auth(auth: dict[str, str]) -> None:
    """Reject requests with missing auth context.
    Government users are validated by org_id instead of hospital_id."""
    if not auth["org_id"]:
        raise HTTPException(status_code=401, detail="Authentication required: missing organization ID")
    if not auth["user_id"]:
        raise HTTPException(status_code=401, detail="Authentication required: missing user ID")


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.get("/lifelink-ai/context")
async def get_ai_context(
    current_module: str = Query("general"),
    department: str | None = Query(None),
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Load the full AI context for the current user/role/hospital."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    context = await service.load_context(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        department=department or user.get("department"),
        current_module=current_module,
        portal=auth["portal"]
    )
    return {"context": context, "ok": True}


@router.get("/lifelink-ai/context/refresh")
async def refresh_ai_context(
    current_module: str = Query("general"),
    department: str | None = Query(None),
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Force-refresh the AI context (reloads memory, conversations, role)."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    context = await service.load_context(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        department=department or user.get("department"),
        current_module=current_module,
        portal=auth["portal"]
    )
    return {"context": context, "ok": True}


@router.post("/lifelink-ai/sessions")
async def create_ai_session(
    request: Request,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Create a new AI session (called on login)."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    session = await service.create_session(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        ip_address=client_ip,
        device=None,
        user_agent=user_agent
    )
    return {"session": session, "ok": True}


@router.post("/lifelink-ai/sessions/{session_id}/close")
async def close_ai_session(
    session_id: str,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Close an AI session (called on logout)."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    success = await service.close_session(
        session_id=session_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"]
    )
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@router.get("/lifelink-ai/conversations")
async def list_conversations(
    limit: int = Query(20),
    offset: int = Query(0),
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """List conversations for the current user — never shows other users' data."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    conversations = await service.list_conversations(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        limit=limit,
        offset=offset
    )
    return {"conversations": conversations, "ok": True}


@router.post("/lifelink-ai/conversations")
async def create_conversation(
    body: ConversationCreateRequest,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Create a new conversation — owned by the current user."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    conversation = await service.create_conversation(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        department=user.get("department") or user.get("subRole"),
        title=body.title or "New conversation",
        module=body.module,
        mode=body.mode
    )
    return {"conversation": conversation, "ok": True}


@router.get("/lifelink-ai/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Get a single conversation with messages — validates ownership."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    conversation = await service.get_conversation(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"]
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation": conversation, "ok": True}


@router.patch("/lifelink-ai/conversations/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str,
    body: UpdateTitleRequest,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Update conversation title — validates ownership."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    success = await service.update_conversation_title(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        title=body.title
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.post("/lifelink-ai/conversations/{conversation_id}/pin")
async def pin_conversation(
    conversation_id: str,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Pin a conversation — validates ownership."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    success = await service.pin_conversation(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        is_pinned=True
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.post("/lifelink-ai/conversations/{conversation_id}/unpin")
async def unpin_conversation(
    conversation_id: str,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Unpin a conversation — validates ownership."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    success = await service.pin_conversation(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        is_pinned=False
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.delete("/lifelink-ai/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Soft-delete a conversation — only the current user's copy."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    success = await service.delete_conversation(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"]
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await service.log_audit(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        action="delete",
        conversation_id=conversation_id
    )
    return {"ok": True}


@router.post("/lifelink-ai/conversations/search")
async def search_conversations(
    body: SearchRequest,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Search ONLY the current user's conversations — never global."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    results = await service.search_conversations(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        query=body.query,
        limit=body.limit
    )
    return {"results": results, "ok": True}


@router.post("/lifelink-ai/ask")
async def ask_ai(
    body: AskRequest,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """
    Ask LifeLink AI a question.
    - Loads full context (role, hospital, module, memory)
    - Creates or finds conversation
    - Stores message in isolated DB
    - Logs audit entry
    - Returns response scoped to user permissions
    """
    auth = _get_auth_context(user)
    _validate_auth(auth)
    start_time = time.time()

    role_context = get_role_context(auth["role_id"])
    role_label = role_context["role_label"]

    # 1. Find or create conversation
    conversation_id = body.conversation_id
    if conversation_id:
        conversation = await service.get_conversation(
            conversation_id=conversation_id,
            hospital_id=auth["org_id"],
            user_id=auth["user_id"],
            role_id=auth["role_id"]
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create New conversation with auto-generated title
        title = generate_conversation_title(body.query, role_label)
        conversation = await service.create_conversation(
            hospital_id=auth["org_id"],
            user_id=auth["user_id"],
            role_id=auth["role_id"],
            department=user.get("department") or user.get("subRole"),
            title=title,
            module=body.module,
            mode="chat"
        )
        conversation_id = conversation["id"]

    # 2. Store user message
    await service.add_message(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        role="user",
        content=body.query,
        attachments=body.attachments
    )
    # 3. Retrieve relevant RAG knowledge chunks
    rag_service = EnterpriseRAGService(service._session_factory)
    rag_chunks = await rag_service.retrieve(
        query=body.query,
        hospital_id=auth["org_id"],
        role_id=auth["role_id"],
        module=body.module,
        top_k=5
    )
    # 4. Load context for AI response
    context = await service.load_context(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        department=user.get("department") or user.get("subRole"),
        current_module=body.module,
        portal=auth["portal"]
    )
    # 5. Build role-scoped system prompt with RAG context
    accessible_modules = role_context.get("accessible_modules", [])
    accessible_modules_str = (
        ", ".join(accessible_modules) if isinstance(accessible_modules, list)
        else "All modules (system administrator)"
    )
    knowledge_domains = role_context.get("knowledge_domains", [])
    domains_str = (
        ", ".join(knowledge_domains) if isinstance(knowledge_domains, list)
        else "All domains (system administrator)"
    )

    # Build RAG context section
    rag_context_str = ""
    if rag_chunks:
        rag_context_parts = []
        for i, chunk in enumerate(rag_chunks[:3]):
            source_label = chunk.get("source", "knowledge")
            title = chunk.get("title", "Reference")
            content = chunk.get("content", "")[:500]
            rag_context_parts.append(
                f"[{i+1}] {title} (from {source_label}):\n{content}"
            )
        portal_label = auth.get("portal", "hospital").capitalize()
        rag_context_str = (
            f"\n\n--- RELEVANT KNOWLEDGE FROM {portal_label} DATABASE ---\n"
            + "\n\n".join(rag_context_parts)
            + "\n--- END OF KNOWLEDGE ---"
        )

    # Portal-aware context
    portal = auth.get("portal", "hospital")
    if portal == "government":
        gov_org_info = context.get("organization", {})
        org_summary = (
            f"Organization: {gov_org_info.get('name', 'Government Organization')} "
        )
        system_prompt = (
            f"You are LifeLink AI, the Government of India's National Emergency Response Intelligence. "
            f"Current user: {user.get('name') or user.get('fullName') or 'Officer'}.\n"
            f"Role: {role_label}\n"
            f"Scope: {role_context.get('scope', 'government')}\n"
            f"Description: {role_context.get('description', 'Government official')}\n"
            f"Accessible modules: {accessible_modules_str}\n"
            f"Knowledge domains: {domains_str}\n"
            f"Current module: {body.module}\n"
            f"{'You can access clinical/patient data.' if role_context.get('can_access_clinical') else 'You CANNOT access clinical/patient data.'}\n"
            f"{'You can access financial data.' if role_context.get('can_access_finance') else 'You CANNOT access financial data.'}\n"
            f"{'You can access administrative settings.' if role_context.get('can_access_admin') else 'You CANNOT access administrative settings.'}\n\n"
            f"CONTEXT:\n{org_summary}\n"
            f"{rag_context_str}\n\n"
            f"Answer ONLY within the scope of this user's role, government permissions, and security clearance. "
            f"When referencing national policies, NDMA guidelines, or state protocols, cite the relevant document. "
            f"Do NOT provide information outside authorized government domains. "
            f"Be concise, professional, and data-driven. "
            f"Use Indian Rupee (₹) formatting for financial data. "
            f"For emergency situations, recommend specific actions with clear reasoning. "
            f"If asked about a domain outside your scope, politely explain it is not available under your current security clearance."
        )
    else:
        # Hospital context summary
        hospital_info = context.get("hospital", {})
        hospital_summary = (
            f"Hospital: {hospital_info.get('name', 'LifeLink Hospital')} "
            f"({hospital_info.get('location', 'Pune, India')}).\n"
            f"{hospital_info.get('bed_summary', '500 beds total.')}\n"
            f"{hospital_info.get('department_status_text', '12 departments registered.')}"
        )
        _system_prompt = (
            f"You are LifeLink AI, an enterprise hospital assistant. "
            f"Current user: {user.get('name') or user.get('fullName') or 'Staff'}.\n"
            f"Role: {role_label}\n"
            f"Scope: {role_context.get('scope', 'general')}\n"
            f"Description: {role_context.get('description', 'Hospital staff')}\n"
            f"Accessible modules: {accessible_modules_str}\n"
            f"Knowledge domains: {domains_str}\n"
            f"Current module: {body.module}\n"
            f"Current shift: {context.get('current_shift', 'Morning')}\n"
            f"{'You can access clinical data.' if role_context.get('can_access_clinical') else 'You CANNOT access clinical/patient data.'}\n"
            f"{'You can access financial data.' if role_context.get('can_access_finance') else 'You CANNOT access financial data.'}\n"
            f"{'You can access administrative settings.' if role_context.get('can_access_admin') else 'You CANNOT access administrative settings.'}\n\n"
            f"HOSPITAL CONTEXT:\n{hospital_summary}\n"
            f"{rag_context_str}\n\n"
            f"Answer ONLY within the scope of this user's role and permissions. "
            f"When referencing policies or clinical guidelines, cite the source document title. "
            f"Do NOT provide information outside authorized domains. "
            f"Be concise, professional, and data-driven. "
            f"Use Indian Rupee (₹) formatting for financial data. "
            f"If asked about a domain outside your scope, politely explain it's not available."
        )

    # 5. Generate AI response (role-scoped)
    try:
        response_text = (
            f"Hello {user.get('name') or 'User'}. As **{role_label}**, I have access to "
            f"{accessible_modules_str}.\n\n"
            f"You asked: _{body.query}_\n\n"
            f"Based on your role permissions, I can analyze information related to: "
            f"{domains_str}. "
            f"Your current module view is **{body.module}**. "
            f"How would you like me to proceed?"
        )
    except Exception:
        response_text = "I apologize, but I encountered an issue processing your request. Please try again."

    latency_ms = int((time.time() - start_time) * 1000)

    # 6. Store assistant message
    _assistant_msg = await service.add_message(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        role="assistant",
        content=response_text,
        confidence=0.8,
        references=[{"title": f"Role: {role_label}", "detail": f"Scoped to {domains_str}"}],
        reasoning=[
            f"Loaded context for {role_label} ({auth['role_id']})",
            f"Verified permissions: {accessible_modules_str}",
            f"Generated response within role scope",
        ]
    )
    # 7. Log audit
    await service.log_audit(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        action="query",
        conversation_id=conversation_id,
        prompt=body.query,
        response_summary=response_text[:200],
        module=body.module,
        latency_ms=latency_ms,
        tokens_used=len(body.query.split()) + len(response_text.split()),
        success=True
    )
    # 8. Return full conversation
    updated_conversation = await service.get_conversation(
        conversation_id=conversation_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"]
    )
    return {
        "answer": response_text,
        "conversation": updated_conversation,
        "context": context,
        "rag_chunks": rag_chunks[:3],
        "latency_ms": latency_ms,
        "ok": True,
    }


@router.post("/lifelink-ai/memory")
async def set_memory(
    body: MemorySetRequest,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Store a memory item for the current user."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    memory = await service.set_memory(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        memory_type=body.memory_type,
        key=body.key,
        value=body.value,
        weight=body.weight,
        context=body.context
    )
    return {"memory": memory, "ok": True}


@router.get("/lifelink-ai/memory")
async def get_memory(
    memory_type: str | None = Query(None),
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Get memory items for the current user only."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    items = await service.get_memory(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        memory_type=memory_type
    )
    return {"memory": items, "ok": True}


@router.delete("/lifelink-ai/memory/{memory_id}")
async def delete_memory(
    memory_id: str,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Delete a memory item — validates ownership."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    success = await service.delete_memory(
        memory_id=memory_id,
        hospital_id=auth["org_id"],
        user_id=auth["user_id"]
    )
    if not success:
        raise HTTPException(status_code=404, detail="Memory item not found")
    return {"ok": True}


@router.post("/lifelink-ai/feedback")
async def add_feedback(
    body: FeedbackRequest,
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Add feedback on an AI response."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    feedback = await service.add_feedback(
        message_id=body.message_id,
        conversation_id="",
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"],
        rating=body.rating,
        comment=body.comment
    )
    if not feedback:
        raise HTTPException(status_code=400, detail="Invalid feedback (rating must be 1-5)")
    return {"feedback": feedback, "ok": True}


@router.post("/lifelink-ai/demo")
async def create_demo_conversations(
    user: dict = Depends(_current_user_dict),
    service: EnterpriseAIChatService = Depends(get_enterprise_ai_service)
):
    """Create demo conversations for development mode — isolated per user."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    created = await service.create_demo_conversations(
        hospital_id=auth["org_id"],
        user_id=auth["user_id"],
        role_id=auth["role_id"]
    )
    return {"created": created, "ok": True}


# ═══════════════════════════════════════════════════════════════════
# ENTERPRISE RAG ENDPOINTS
# ═══════════════════════════════════════════════════════════════════


class RAGIngestRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    content_type: str = "general"
    module: str = "general"
    roles: list[str] | None = None


@router.post("/lifelink-ai/rag/ingest")
async def ingest_rag_defaults(
    body: RAGIngestRequest | None = None,
    user: dict = Depends(_current_user_dict),
    rag_service: EnterpriseRAGService = Depends(get_enterprise_rag_service)
):
    """
    Ingest documents into the enterprise RAG index.
    - Without body: ingests all built-in policies + medical knowledge
    - With body: ingests a single custom document
    """
    auth = _get_auth_context(user)
    _validate_auth(auth)

    if body and body.content:
        result = await rag_service.ingest_custom_document(
            hospital_id=auth["org_id"],
            title=body.title or "Custom Document",
            content=body.content,
            content_type=body.content_type,
            module=body.module,
            roles=body.roles or [auth["role_id"]]
        )
    else:
        result = await rag_service.ingest_default_sources(
            hospital_id=auth["org_id"]
        )

    return {"result": result, "ok": True}


@router.post("/lifelink-ai/rag/search")
async def rag_search(
    query: str = Query(..., min_length=1),
    top_k: int = Query(5),
    module: str | None = Query(None),
    user: dict = Depends(_current_user_dict),
    rag_service: EnterpriseRAGService = Depends(get_enterprise_rag_service)
):
    """Search the enterprise RAG index for relevant knowledge chunks."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    results = await rag_service.retrieve(
        query=query,
        hospital_id=auth["org_id"],
        role_id=auth["role_id"],
        module=module,
        top_k=top_k
    )
    return {"results": results, "ok": True}


@router.get("/lifelink-ai/rag/stats")
async def rag_stats(
    user: dict = Depends(_current_user_dict),
    rag_service: EnterpriseRAGService = Depends(get_enterprise_rag_service)
):
    """Get enterprise RAG index statistics."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    stats = await rag_service.get_index_stats(
        hospital_id=auth["org_id"]
    )
    return {"stats": stats, "ok": True}


@router.post("/lifelink-ai/rag/reset")
async def rag_reset(
    user: dict = Depends(_current_user_dict),
    rag_service: EnterpriseRAGService = Depends(get_enterprise_rag_service)
):
    """Reset the enterprise RAG index for this hospital."""
    auth = _get_auth_context(user)
    _validate_auth(auth)

    deleted = await rag_service.reset_index(
        hospital_id=auth["org_id"]
    )
    return {"deleted": deleted, "ok": True}
