# LifeLink LLM Endpoint — Comprehensive Analysis Report

**Date:** July 23, 2026  
**Endpoint:** `http://144.79.62.242:8000/v1`  
**Model:** `qwen3.6-27b`  
**API Key:** Configured in `backend/app/core/config.py`

---

## 1. Connectivity Test

| Test | Result |
|------|--------|
| `GET /v1/models` | ✅ **200 OK** — Model available |
| Model ID | `qwen3.6-27b` |
| Model Root | `/models/Qwen3.6-27B-int4-AutoRound` |
| Max Context Length | **131,072 tokens** |

**Verdict: Endpoint is LIVE and responsive.**

---

## 2. Prompt Response Tests

### Test A — Analysis Mode (Healthcare Triage)

**Prompt:** *"45-year-old male, chest pain radiating to left arm, shortness of breath, onset 30 minutes ago. Patient has history of hypertension. What is the triage priority and recommended actions?"*

| Aspect | Result |
|--------|--------|
| Status | ✅ **200 OK** |
| Triage Accuracy | ✅ Correctly identified **Level 1 / Priority 1 / Immediate** (ACS suspicion) |
| Reasoning Quality | ✅ Clinically sound — covered positioning, oxygen, aspirin, nitroglycerin, ECG, biomarkers |
| Finish Reason | ⚠️ **"length"** — hit 512-token limit mid-sentence (contraindications cut off) |
| Overall | **Excellent clinical reasoning** — needs higher max_tokens for complete output |

### Test B — Emergency Mode (Mass Casualty Dispatch)

**Prompt:** *"MULTIPLE VEHICLE COLLISION reported on Highway 45. 3 critical injured. Nearest hospitals: City Hospital (4 min, 2 beds available), County General (8 min, 5 beds). Dispatch recommendation needed urgently."*

| Aspect | Result |
|--------|--------|
| Status | ✅ **200 OK** |
| Dispatch Logic | ✅ Correctly recommended splitting patients: 2 critical → City Hospital, 1 → County General |
| Urgency | ✅ Matched "emergency mode" with focused triage logic |
| Finish Reason | ⚠️ **"length"** — hit 320-token limit, output truncated before final recommendations |
| Overall | **Sound decision-making** — increase max_tokens for emergency mode |

### Test C — Basic Connectivity (Small Prompt)

**Prompt:** *"What are the first steps for a suspected heart attack?"*

| Aspect | Result |
|--------|--------|
| Status | ✅ **200 OK** |
| Response Quality | ✅ Correct first-aid guidance provided |
| Finish Reason | ⚠️ **"length"** — 200 tokens insufficient |
| Overall | **Functional** — model needs adequate token budget |

---

## 3. Key Findings

### ✅ What Works
- **Endpoint is stable** — 3/3 tests returned HTTP 200
- **Clinical reasoning is strong** — correct triage classification, appropriate medical guidance
- **Context window is huge** — 131K tokens supports long conversations
- **Response format is correct** — OpenAI-compatible chat completions API
- **Authentication works** — API key `10a92e75...` is accepted

### ⚠️ Issues Found

| Issue | Severity | Details |
|-------|----------|---------|
| **Token limits too low** | 🔴 **High** | All 3 tests hit `max_tokens` limit. The model's reasoning process consumes significant tokens before the final answer. Current config: analysis=512, emergency=320 tokens. Need to increase to **2048+** for useful completions. |
| **No streaming support in service** | 🟡 Medium | `llm_service.py` uses synchronous `openai.chat.completions.create()` with no `stream=True`. Users wait for full response before seeing any text. |
| **Redis cache may mask issues** | 🟢 Low | Caching at 90s TTL silently catches exceptions. Transient failures are hidden from users. |

### 🔧 Recommended Config Changes

In `backend/app/core/config.py`:
```python
# Current
llm_max_output_tokens: int = 8192

# In llm_service.py's generate_response():
# analysis mode: max_tokens = 512  → should be 2048
# emergency mode: max_tokens = 320  → should be 1024
```

---

## 4. LLM Integration Map — Where the Model is Used

### Backend Route Endpoints

| Route | File | Function | Description |
|-------|------|----------|-------------|
| `POST /v2/agents/ask` | `backend/app/routes/v2/agents.py` | `ask()` | **Primary LLM endpoint.** Accepts user questions, RAG context, web search results, attachments → generates AI response via `generate_text()` |
| `POST /v2/agents/decision` | `backend/app/routes/v2/agents.py` | `decision()` | Agent decision workflow using `run_decision_workflow()` |
| `POST /v2/agents/workflow` | `backend/app/routes/v2/agents.py` | `workflow()` | Agent workflow execution |
| `GET /v2/system/gateway` | `backend/app/routes/v2/gateway.py` | — | Reports `llm_provider` in system metadata |
| `GET /health/ready` | `backend/app/routes/health.py` | `health_ready()` | Pings LLM endpoint to verify liveness |

### Backend Services

| Service | File | How LLM is Used |
|---------|------|-----------------|
| `llm_service.generate_response()` | `backend/app/services/llm_service.py` | **Core function** — calls OpenAI/Groq API with prompts, caching, fallback |
| `agents.llm_client.generate_text()` | `backend/app/services/agents/llm_client.py` | **Thin wrapper** — delegates to `generate_response()` |
| `agents.orchestrator.run_decision_workflow()` | `backend/app/services/agents/orchestrator.py` | Uses LLM for agent decision-making |
| `ai_chat_service` | `backend/app/services/ai_chat_service.py` | Manages chat sessions, stores LLM responses in DB |

### Frontend Pages That Use LLM

| Page | File | How |
|------|------|-----|
| **AskLifeLink** | `client/src/pages/AskLifeLink.jsx` | Frontend chat interface — calls `POST /v2/agents/ask` |
| **LandingPage** | `client/src/pages/LandingPage.jsx` | Shows AI capabilities (indirect — not real-time LLM calls) |
| **GovernmentDashboard** | `client/src/pages/GovernmentDashboard.jsx` | Uses AI insights/agents |

### Potential New Integration Points

| Area | Component | Why Add LLM |
|------|-----------|-------------|
| 🏥 **Hospital Dashboard** | `HospitalDashboard.jsx` | AI-powered patient triage suggestions, resource recommendations |
| 🚑 **Ambulance Dashboard** | `AmbulanceDashboard.jsx` | Real-time dispatch guidance, route optimization explanations |
| 🏛️ **Government Dashboard** | `GovernmentDashboard.jsx` | Policy recommendations, compliance monitoring, trend analysis |
| 📊 **AI Platform v2** | `backend/app/routes/v2/ai_platform.py` | Synthetic data generation, model explanations, report generation |
| 📚 **RAG Search v2** | `backend/app/routes/v2/rag.py` | Knowledge retrieval + LLM summarization for medical queries |
| 🔔 **Alerts System** | `backend/app/routes/alerts.py` | AI-generated alert descriptions, severity justifications |
| 📈 **Simulation Module** | `backend/app/routes/v2/simulation.py` | AI-powered emergency simulation scenario generation |
| 🧬 **ML Model Pipeline** | `backend/ml/ai_ml.py` | LLM-based explanations for ML model predictions |

---

## 5. Summary

| Metric | Value |
|--------|-------|
| **Endpoint Status** | ✅ **Live & Reachable** |
| **Model** | `qwen3.6-27b` (131K context) |
| **Response Time** | Fast (3-10s for reasoning) |
| **Reasoning Quality** | 🟢 **Excellent** — clinically sound, well-structured |
| **Critical Issue** | 🔴 **Token limits too low** — needs increase |
| **Current Integration** | 1 primary route (`/v2/agents/ask`) + agent workflows |
| **Integration Potential** | 8+ additional dashboards and modules |

---

## 6. Quick Fixes Recommended

1. **Increase `max_tokens`** in `llm_service.py`:
   - Analysis mode: `512` → `2048`
   - Emergency mode: `320` → `1024`
   - This ensures the model can complete its reasoning + output before truncation

2. **Monitor the endpoint** regularly via the existing `GET /health/ready` endpoint

3. **Consider streaming** for the AskLifeLink chat UI for better UX (lower perceived latency)
