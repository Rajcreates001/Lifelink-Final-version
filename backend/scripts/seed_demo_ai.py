"""
seed_demo_ai.py — Demo AI Output Seeder
========================================
Runs the REAL ML prediction endpoints and AI chat endpoints with realistic
demo inputs, so every role's dashboard shows persisted, computed results
immediately — no waiting for user input during a demo.

What it does
------------
1. Resolves the seeded demo accounts' real user ids from Postgres.
2. Mints JWTs with the same claims the login endpoint issues.
3. Calls the actual /api/predict_* / /api/gov/* / /api/hospital/* ML endpoints
   with realistic payloads. Outputs land in the `predictions` table — the same
   store dashboards read via prediction_store.
4. Creates per-role AI chat history through the real chat endpoints:
   - public user    → /v2/agents/chat/sessions + /v2/agents/ask
   - enterprise users (hospital/government/ambulance) → /v2/lifelink-ai/*
   Messages persist in ai_chat_messages / lifelink_ai_messages.
5. Throttles to respect the ML rate limiters (30/min predict, 8/min heavy ask).

Idempotent: safe to re-run. Existing conversations (by title) are skipped.

Usage (inside the backend container):
    python scripts/seed_demo_ai.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.services.collections import USERS  # noqa: E402

API_BASE = os.environ.get("API_BASE", "http://localhost:3001")

# Pacing (seconds) — tuned to the rate limiters:
#   ml:predict 30/min → 2s spacing is safe
#   ml:heavy    8/min → 8s spacing is safe
ML_PACING = float(os.environ.get("SEED_ML_PACING", "2.0"))
ASK_PACING = float(os.environ.get("SEED_ASK_PACING", "8.0"))

# ─── Demo accounts seeded by seed_mass_demo_data.py ─────────────────
# email → (role, sub_role). Public has no sub_role → uses the public AI.
DEMO_ACCOUNTS: dict[str, tuple[str, str | None]] = {
    "public.001@lifelink.demo": ("public", None),
    "government.001@lifelink.demo": ("government", "national_admin"),
    "hospital.002@lifelink.demo": ("hospital", "finance"),
    "ambulance.002@lifelink.demo": ("ambulance", "dispatcher"),
}

# ─── Per-role AI chat demo conversations ────────────────────────────
# Each conversation: title, module, and the demo queries to run through the
# real ask endpoint. The assistant replies are generated and persisted by the
# backend itself, so the history shown in the UI is genuine app behavior.
ROLE_CONVERSATIONS: dict[str, list[dict[str, Any]]] = {
    "public": [
        {
            "title": "My health risk and donor match",
            "module": "general",
            "queries": [
                "What is my current health risk level?",
                "Can I donate blood to someone with O+?",
                "Show my activity cluster and donation forecast.",
            ],
        },
        {
            "title": "Emergency guidance",
            "module": "general",
            "queries": [
                "What should I do during a cardiac emergency at home?",
            ],
        },
    ],
    "government": [
        {
            "title": "State outbreak and capacity briefing",
            "module": "operations",
            "queries": [
                "Forecast the dengue outbreak for Karnataka for the next 30 days.",
                "How should ambulances be allocated during a flood in Zone A?",
                "Detect anomalies in emergency reports for the last 24 hours.",
            ],
        },
        {
            "title": "District policy segmentation",
            "module": "ai-ml-lab",
            "queries": [
                "Segment districts by emergency response performance.",
            ],
        },
    ],
    "hospital": [
        {
            "title": "Capacity and bed forecast",
            "module": "bed-management",
            "queries": [
                "Forecast bed demand for next week.",
                "Predict severity for incoming emergency patients.",
                "Optimize ambulance allocation across our network.",
            ],
        },
        {
            "title": "Finance and revenue insights",
            "module": "finance-overview",
            "queries": [
                "Summarize our revenue and insurance claims status.",
                "Predict next month's operational expenses.",
            ],
        },
    ],
    "ambulance": [
        {
            "title": "Dispatch and ETA optimization",
            "module": "operations",
            "queries": [
                "Show the fastest route to the active incident.",
                "Prioritize my current assignments by urgency.",
                "Check nearest trauma centers with ICU capacity.",
            ],
        },
        {
            "title": "Shift handoff summary",
            "module": "history",
            "queries": [
                "Generate a shift handoff summary.",
            ],
        },
    ],
}

# ─── Real ML prediction payloads (validated by ai_schemas) ─────────
ML_PAYLOADS: dict[str, dict[str, Any]] = {
    "predict_health_risk": {
        "age": 42, "bmi": 26.4, "heart_rate": 78, "blood_pressure": 132,
        "has_condition": 0, "lifestyle_factor": "Active", "sex": "Male",
        "cholesterol": 196, "diabetes": 0, "family_history": 0, "smoking": 0,
        "obesity": 0, "exercise_hours_per_week": 4.5, "stress_level": 4,
        "previous_heart_problems": 0, "medication_use": 0,
    },
    "predict_user_cluster": {"sos_usage": 3, "donations_made": 6, "health_logs": 8},
    "predict_user_forecast": {"past_donations": 6},
    "hosp_predict_severity": {
        "age": 58, "heart_rate": 112, "blood_pressure_systolic": 148,
        "distance_km": 6.2, "emergency_type": "cardiac", "message": "chest pain, breathing difficulty",
    },
    "hosp_predict_outbreak": {"disease_name": "Dengue", "region": "Karnataka", "days_to_predict": 30},
    "hosp_optimize_ambulance": {"emergency_count": 6, "hospital_capacity_percent": 74},
    "hosp_detect_anomaly": {
        "region": "Mangaluru", "daily_emergency_count": 42,
        "hospital_admissions": 31, "disease_reports": 12,
    },
    "gov_predict_outbreak": {"disease_name": "Dengue", "region": "Karnataka", "days_to_predict": 30},
    "gov_predict_severity": {
        "heart_rate": 118, "blood_pressure_sys": 152, "oxygen_saturation": 91.0,
        "respiratory_rate": 24, "age": 63, "glasgow_coma_scale": 12,
        "trauma_type": "blunt", "chief_complaint": "chest_pain",
    },
    "gov_predict_availability": {
        "month": 8, "donation_frequency": 18, "hospital_stock_level": 55,
        "region": "Karnataka", "resource_type": "O+",
    },
    "gov_predict_allocation": {"emergency_count": 12, "hospital_capacity_percent": 74},
    "gov_predict_policy_segment": {"emergency_rate": 3.8, "avg_response_time": 12.5, "hospital_bed_occupancy": 74.0},
    "gov_predict_performance_score": {"emergency_rate": 3.8, "avg_response_time": 12.5, "hospital_bed_occupancy": 74.0},
    "gov_predict_anomaly": {
        "region": "Karnataka", "daily_emergency_count": 42,
        "hospital_admissions": 31, "disease_reports": 12,
    },
    "hospital_patient_recovery": {
        "age": 58, "bmi": 27.1, "heart_rate": 96, "blood_pressure": 142,
        "diagnosis": "cardiac_issue", "treatment_type": "Surgery",
    },
    "hospital_patient_stay": {
        "age": 58, "bmi": 27.1, "heart_rate": 96, "blood_pressure": 142,
        "diagnosis": "cardiac_issue", "treatment_type": "Surgery",
    },
    "hospital_inventory_predict": {
        "name": "Surgical Gloves", "quantity": 320, "minThreshold": 120,
        "category": "Consumables", "daily_usage": 18.0, "lead_time_days": 7,
        "supplier_reliability": 0.9,
    },
    "ml_predict_eta": {
        "distance_km": 14.2, "day_of_week": 3, "time_of_day": "morning",
        "traffic_level": "moderate", "emergency_type": "cardiac",
        "weather_condition": "clear", "hour": 9, "precipitation_mm": 0.0,
    },
}

# Which ML endpoints belong to which demo role (so each role's dashboard
# has relevant persisted predictions). Values are full API paths.
ROLE_ML_ENDPOINTS: dict[str, list[str]] = {
    "public": ["/api/predict_health_risk", "/api/predict_user_cluster", "/api/predict_user_forecast"],
    "government": [
        "/api/gov/predict_outbreak", "/api/gov/predict_severity", "/api/gov/predict_availability",
        "/api/gov/predict_allocation", "/api/gov/predict_policy_segment",
        "/api/gov/predict_performance_score", "/api/gov/predict_anomaly",
    ],
    "hospital": [
        "/api/hosp/predict_severity", "/api/hosp/predict_outbreak", "/api/hosp/optimize_ambulance",
        "/api/hosp/detect_anomaly", "/api/hospital/patient/recovery", "/api/hospital/patient/stay",
        "/api/hospital/inventory/predict",
    ],
    "ambulance": ["/api/ml/predict-eta", "/api/hosp/optimize_ambulance", "/api/hosp/predict_severity"],
}


async def _resolve_user_ids(dsn: str) -> dict[str, tuple[str, str, str | None]]:
    """Look up the demo accounts' real ids, roles, and subRoles from Postgres.
    Tokens must carry EXACTLY the claims the real login endpoint issues
    (role + subRole from the user record), otherwise the LifeLink AI
    isolation filters (hospital_id + user_id + role_id) won't match what
    the browser sees after logging in."""
    import asyncpg

    conn = await asyncpg.connect(dsn=dsn)
    try:
        rows = await conn.fetch(
            """
            SELECT data->>'_id' AS id, data->>'email' AS email,
                   data->>'role' AS role, data->>'subRole' AS sub_role
            FROM documents
            WHERE collection = $1 AND data->>'email' = ANY($2)
            """,
            USERS,
            list(DEMO_ACCOUNTS.keys()),
        )
        return {
            row["email"]: (row["id"], row["role"], row["sub_role"])
            for row in rows
        }
    finally:
        await conn.close()


def _mint_token(user_id: str, role: str, sub_role: str | None) -> str:
    """Mint a JWT with the same claims the real login endpoint issues."""
    claims = {"id": user_id, "role": role}
    if sub_role:
        claims["sub_role"] = sub_role
    return create_access_token(str(user_id), claims=claims)


async def _post(client: httpx.AsyncClient, path: str, token: str, payload: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = await client.post(f"{API_BASE}{path}", json=payload or {}, headers=headers, timeout=90.0)
        if resp.status_code >= 400:
            print(f"  ⚠️ {path} → {resp.status_code}: {resp.text[:160]}")
            return {}
        return resp.json()
    except Exception as exc:
        print(f"  ⚠️ {path} → error: {exc}")
        return {}


async def _get(client: httpx.AsyncClient, path: str, token: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = await client.get(f"{API_BASE}{path}", headers=headers, timeout=90.0)
        if resp.status_code >= 400:
            print(f"  ⚠️ GET {path} → {resp.status_code}: {resp.text[:160]}")
            return {}
        return resp.json()
    except Exception as exc:
        print(f"  ⚠️ GET {path} → error: {exc}")
        return {}


def _account_for_role(role: str) -> tuple[str, str, str | None] | None:
    """Return (email, role, sub_role) for a demo role, or None."""
    for email, (r, sub) in DEMO_ACCOUNTS.items():
        if r == role:
            return email, r, sub
    return None


async def seed_ml_predictions(client: httpx.AsyncClient, users: dict[str, tuple[str, str, str | None]]) -> None:
    """Run the real ML endpoints so outputs land in the `predictions` table."""
    print("\n── ML Predictions ────────────────────────────────────────")
    for role, endpoints in ROLE_ML_ENDPOINTS.items():
        account = _account_for_role(role)
        if not account or account[0] not in users:
            print(f"  ⏭️ [{role}] demo user not found in DB")
            continue
        email, _, _ = account
        user_id, role_name, sub_role = users[email]
        token = _mint_token(user_id, role_name, sub_role)
        print(f"\n[{role}] {email}")
        for endpoint in endpoints:
            # "/api/gov/predict_outbreak" → "gov_predict_outbreak"
            payload_key = endpoint.removeprefix("/api/").replace("/", "_").replace("-", "_")
            payload = ML_PAYLOADS.get(payload_key)
            if payload is None:
                print(f"  ⏭️ no payload for {endpoint}")
                continue
            result = await _post(client, endpoint, token, payload)
            if result:
                summary = (
                    result.get("prediction")
                    or result.get("predicted_severity")
                    or result.get("cluster_id")
                    or result.get("status")
                    or "ok"
                )
                print(f"  ✅ {endpoint} → {summary}")
            await asyncio.sleep(ML_PACING)  # stay under the 30/min ML limit


async def _seed_public_chat(client: httpx.AsyncClient, token: str) -> None:
    """Public user chat history via /v2/agents (AiChatService tables)."""
    existing = await _get(client, "/v2/agents/chat/sessions", token)
    sessions = existing.get("sessions", [])
    # Idempotency: the ask endpoint auto-renames conversations from the first
    # query, so match on message counts instead of titles. If the user already
    # has any chat history, the demo seed has run — skip.
    if any((s.get("messageCount") or s.get("message_count") or 0) > 0 for s in sessions):
        print("  ⏭️ chat history already present — skipping")
        return

    for conv in ROLE_CONVERSATIONS["public"]:
        created = await _post(
            client, "/v2/agents/chat/sessions", token,
            {"title": conv["title"], "module": conv.get("module", "general"), "mode": "chat"},
        )
        session_id = created.get("session", {}).get("id")
        if not session_id:
            print(f"  ⚠️ could not create session: {conv['title']}")
            continue
        print(f"  ✅ session: {conv['title']} ({session_id[:8]}…)")
        for idx, query in enumerate(conv["queries"], start=1):
            resp = await _post(
                client, "/v2/agents/ask", token,
                {
                    "query": query,
                    "memoryId": session_id,
                    "module": conv.get("module", "general"),
                    "mode": "chat",
                },
            )
            if resp:
                print(f"    💬 turn {idx}: {query[:48]}…")
            await asyncio.sleep(ASK_PACING)


async def _seed_enterprise_chat(client: httpx.AsyncClient, token: str, role: str) -> None:
    """Enterprise chat history via /v2/lifelink-ai (isolated tables)."""
    existing = await _get(client, "/v2/lifelink-ai/conversations?limit=50&offset=0", token)
    conversations = existing.get("conversations", [])
    # Idempotency: the ask endpoint auto-renames conversations from the first
    # query, so match on message counts instead of titles. If the user already
    # has any chat history, the demo seed has run — skip.
    if any((c.get("message_count") or 0) > 0 for c in conversations):
        print("  ⏭️ chat history already present — skipping")
        return

    for conv in ROLE_CONVERSATIONS[role]:
        created = await _post(
            client, "/v2/lifelink-ai/conversations", token,
            {"title": conv["title"], "module": conv.get("module", "general"), "mode": "chat"},
        )
        conv_id = created.get("conversation", {}).get("id")
        if not conv_id:
            print(f"  ⚠️ could not create conversation: {conv['title']}")
            continue
        print(f"  ✅ conversation: {conv['title']} ({conv_id[:8]}…)")
        for idx, query in enumerate(conv["queries"], start=1):
            resp = await _post(
                client, "/v2/lifelink-ai/ask", token,
                {
                    "conversation_id": conv_id,
                    "query": query,
                    "module": conv.get("module", "general"),
                    "web_search": False,
                    "attachments": [],
                },
            )
            if resp.get("conversation"):
                conv_id = resp["conversation"].get("id", conv_id)
            if resp:
                print(f"    💬 turn {idx}: {query[:48]}…")
            await asyncio.sleep(ASK_PACING)  # heavy endpoint — 8/min limit


async def seed_ai_chat(client: httpx.AsyncClient, users: dict[str, tuple[str, str, str | None]]) -> None:
    """Create per-role AI chat history via the real chat endpoints."""
    print("\n── AI Chat History ──────────────────────────────────────")
    for role in ROLE_CONVERSATIONS:
        account = _account_for_role(role)
        if not account or account[0] not in users:
            print(f"  ⏭️ [{role}] demo user not found in DB")
            continue
        email, _, _ = account
        user_id, role_name, sub_role = users[email]
        token = _mint_token(user_id, role_name, sub_role)
        print(f"\n[{role}] {email}")
        if role == "public":
            await _seed_public_chat(client, token)
        else:
            await _seed_enterprise_chat(client, token, role)


async def main() -> None:
    start = time.time()
    settings = get_settings()
    dsn = settings.postgres_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    users = await _resolve_user_ids(dsn)
    missing = set(DEMO_ACCOUNTS) - set(users)
    if missing:
        print(f"⚠️ demo users missing (run seed_mass_demo_data first): {missing}")

    async with httpx.AsyncClient() as client:
        await seed_ml_predictions(client, users)
        await seed_ai_chat(client, users)

    elapsed = int(time.time() - start)
    print(f"\n✅ Demo AI seeding complete in {elapsed}s")
    print("   ML outputs        → `predictions` table")
    print("   Public chat       → `ai_chat_sessions` / `ai_chat_messages`")
    print("   Enterprise chat   → `lifelink_ai_conversations` / `lifelink_ai_messages`")


if __name__ == "__main__":
    asyncio.run(main())
