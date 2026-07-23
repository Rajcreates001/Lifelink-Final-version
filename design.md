EVA Platform — Complete Architecture & Implementation Guide
> Purpose: This document is a comprehensive blueprint for building production-grade AI applications with the same architectural depth as EVA — a multi-module biomedical intelligence platform. Use this as your reference for architecture, real-time data, LLM integration, deployment, and design philosophy.
Last Updated: July 21, 2026
Build Status: ✅ Python 181/181 tests OK, TypeScript 0 errors, Vite  ✓ built in 17.34s 
────────────────────────────────────────────────────────────────────────────────
Table of Contents
1. Core Architecture
2. Technology Stack
3. Project Structure
4. LLM Integration & Credentials
5. Real-Time Data Architecture
6. Authentication & Authorization
7. Database & Storage Layer
8. Deployment & Operations
9. Design Patterns & Best Practices
10. Building Your Own Application
────────────────────────────────────────────────────────────────────────────────
1. Core Architecture
1.1 High-Level System Design
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + Vite 6)                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │Dashboards│  │Feature Modules│  │EVA Chat  │  │ Admin Panels│  │
│  │(27 total)│  │  (H01-H17)   │  │Assistant │  │(Enterprise, │  │
│  │          │  │              │  │          │  │ Developer)  │  │
│  └──────────┘  └──────────────┘  └──────────┘  └─────────────┘  │
│                         │ HTTP/WS                                │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                    BACKEND (FastAPI + Python 3.11)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Layer (38 Routers + WebSocket)            │   │
│  │  Auth → Rate Limit → Metrics → Response Standardization  │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                       │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │              Business Logic Services (84 services)         │   │
│  │  Intelligence │ Regulatory │ Clinical │ Competitive │ ...  │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                       │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │               Data Layer                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │   │
│  │  │PostgreSQL│  │ Weaviate │  │  Redis   │                │   │
│  │  │(Structured│  │(Vector)  │  │(Cache+Q) │                │   │
│  │  │  Data)   │  │          │  │          │                │   │
│  │  └──────────┘  └──────────┘  └──────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
1.2 Key Architectural Decisions
┌────────────────────┬────────────────────────┬──────────────────────────────────────────────┐
│ Decision           │ Choice                 │ Rationale                                    │
├────────────────────┼────────────────────────┼──────────────────────────────────────────────┤
│ Frontend Framework │ React 19 + TypeScript  │ Strong typing, component model, ecosystem    │
│ Build Tool         │ Vite 6                 │ Fast HMR, optimized builds, native ESM       │
│ Styling            │ Tailwind CSS 3         │ Utility-first, rapid prototyping, consistent │
│ Animation          │ Framer Motion          │ Declarative animations, AnimatePresence      │
│ Backend Framework  │ FastAPI                │ Async-native, auto-docs, Pydantic validation │
│ SQL ORM            │ SQLAlchemy 2.0 (async) │ Mature, well-tested, async support           │
│ Vector DB          │ Weaviate 1.27          │ Hybrid search, scalable, CRUD operations     │
│ Cache              │ Redis 7                │ Pub/sub, queue, cache, graceful fallback     │
│ Task Queue         │ Celery + Redis         │ Background processing, scheduling            │
│ Scheduling         │ APScheduler            │ Periodic refresh, cron-like jobs             │
└────────────────────┴────────────────────────┴──────────────────────────────────────────────┘
────────────────────────────────────────────────────────────────────────────────
2. Technology Stack
2.1 Frontend Dependencies (package.json)
// json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.10.1",
    "framer-motion": "^12.42.2",
    "lucide-react": "^0.556.0",
    "recharts": "^3.6.0",
    "three": "^0.166.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0",
    "axios": "^1.13.2",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "@deepgram/sdk": "^4.0.1",
    "@opencode-ai/sdk": "^1.15.12",
    "html2canvas": "^1.4.1",
    "plotly.js": "^3.6.0",
    "react-plotly.js": "^4.0.0",
    "3dmol": "^2.5.5"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "vite": "^6.1.0",
    "tailwindcss": "^3.4.17",
    "@vitejs/plugin-react": "^5.1.1",
    "vitest": "^4.1.10",
    "postcss": "^8.5.6",
    "autoprefixer": "^10.4.22"
  }
}
2.2 Backend Dependencies (pyproject.toml)
// toml
dependencies = [
    # Core API
    "fastapi>=0.111",
    "uvicorn>=0.30",
    "pydantic>=2.12",
    "pydantic-settings>=2.6",
    "python-multipart>=0.0.9",
 
    # Database
    "sqlalchemy>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13.1",
    "weaviate-client>=4.6",
 
    # AI / NLP
    "sentence-transformers>=2.7",
    "cerebras_cloud_sdk",
    "torch>=2.3",
 
    # Queue / Scheduling
    "redis>=5.0",
    "celery>=5.4",
    "apscheduler>=3.10.4",
 
    # Security
    "python-jose[cryptography]>=3.3.0",
    "bcrypt>=4.0.0",
    "cryptography>=46",
]
2.3 Infrastructure (Docker Compose)
// yaml
services:
  backend:    # FastAPI - 2 CPUs, 4GB memory (prod)
  frontend:   # Nginx SPA - 0.5 CPUs, 512MB (prod)
  worker:     # Celery - 4 CPUs, 4GB (prod)
  db:         # PostgreSQL 15 - 1 CPU, 1GB
  redis:      # Redis 7 - 0.5 CPU, 256MB
  weaviate:   # Weaviate 1.27 - 1 CPU, 1GB
────────────────────────────────────────────────────────────────────────────────
3. Project Structure
3.1 Directory Layout
eva-platform/
│
├── frontend/                          # React + TypeScript + Vite
│   ├── App.tsx                        # 45 routes, React.lazy loaded
│   ├── components/                    # Shared UI (14 subdirs)
│   │   ├── 3D/ auth/ eva/ h17/ hypothesis/ ...
│   │   └── widgets/ tutorial/ integration/
│   ├── config/                        # Module registry, access control
│   │   ├── moduleAccess.ts            # Role → module mapping
│   │   ├── moduleRegistry.ts          # Module definitions & status
│   │   ├── routes.tsx                 # All route defs + guards
│   │   └── dashboardData.ts           # Dashboard configuration
│   ├── context/                       # React contexts
│   │   └── EvaAgentContext.tsx        # EVA agent state
│   ├── hooks/                         # Custom hooks
│   │   ├── useDevWebSocket.ts         # Real-time WebSocket hook
│   │   ├── useCachedModuleData.ts     # Module data caching
│   │   └── useInteractionMode.ts
│   ├── modules/                       # 27 feature modules
│   │   ├── admin/                     # Enterprise + Developer admin
│   │   ├── developer/                 # DeveloperOperationsCenter.tsx
│   │   ├── dashboard/ intelligence/ regulatory/ clinical/ ...
│   │   └── data/ orb/ h14/ h18/ ...
│   ├── services/                      # 14 API client services
│   │   ├── enterpriseService.ts       # Admin API client
│   │   └── api.ts                     # Axios HTTP client
│   ├── store/                         # Zustand auth store
│   └── utils/                         # Utilities
│
├── backend/                           # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                    # Entry point + lifespan
│   │   ├── api/v1/endpoints/          # 38 route handlers
│   │   ├── core/                      # Auth, config, logging, metrics
│   │   ├── db/                        # Sessions, Redis, Weaviate
│   │   ├── models/                    # 24 SQLAlchemy models
│   │   ├── services/                  # 84 business services
│   │   └── worker/                    # Celery tasks
│   ├── Dockerfile                     # Multi-stage build
│   └── scripts/                       # 39 operational scripts
│
├── tests/                             # Consolidated tests
│   ├── conftest.py                    # Shared fixtures
│   └── integration/                   # Integration tests
│
├── datasets/                          # Dataset storage
├── docs/                              # Documentation
├── external/                          # External repos (Scrapling, OpenWork)
│
├── docker-compose.yml                 # Full local stack
├── docker-compose.prod.yml            # Production overrides
├── package.json                       # Frontend deps
└── vite.config.ts                     # Vite configuration

3.2 Module Registration Pattern
Every module follows this pattern:
// typescript
// frontend/config/moduleRegistry.ts
export const MODULE_REGISTRY: ModuleDefinition[] = [
  { key: 'h01', label: 'H01 — Information Retrieval', developmentStatus: 'PRODUCTION' },
  { key: 'h02', label: 'H02 — Competitive Intelligence', developmentStatus: 'PRODUCTION' },
  // ...
];
 
// frontend/config/moduleAccess.ts - Role-based access
const EVA_MODULE_ROLE_ACCESS: Record<string, Set<EvaRoleBucket>> = {
  h01: roleSet('admin', 'ceo', 'scientist', 'clinical'),
  h02: roleSet('ceo', 'scientist'),
  // ...
};
 
// frontend/config/routes.tsx - Route definition
{ path: PATHS.INTELLIGENCE, componentKey: 'CompetitiveIntelligence',
  guards: [{ type: 'module', moduleKey: 'h02' }, { type: 'role', roles: ['all'] }] },
────────────────────────────────────────────────────────────────────────────────
4. LLM Integration & Credentials
4.1 Environment Variables
// bash
# ── Backend .env — LLM Configuration ──
# Copy this to backend/.env and fill in your actual values
 
# Primary LLM Configuration
# EVA uses an OpenAI-compatible API endpoint (works with Groq, Cerebras, DeepSeek, Together, Ollama, etc.)
OPENAI_API_KEY=your_openai_compatible_key_here
OPENAI_BASE_URL=http://your-llm-server:8000/v1
LLM_ENDPOINT=http://your-llm-server:8000/v1/chat/completions
LLM_MODEL_NAME=your-model-name
LLM_MAX_OUTPUT_TOKENS=8192
 
# ── EVA's Actual LLM Credentials (for reference) ──
# These are the values currently deployed in the EVA backend:
#   OPENAI_API_KEY    = 10a92e750d5616640645cd96755a7b2154d42d20602c15d2d9d513724750d3a0
#   OPENAI_BASE_URL   = http://144.79.62.242:8000/v1
#   LLM_ENDPOINT      = http://144.79.62.242:8000/v1/chat/completions
#   LLM_MODEL_NAME    = qwen3.6-27b
#   LLM_MAX_OUTPUT_TOKENS = 8192
 
# Security
SECRET_KEY=change_this_to_a_secure_random_string
JWT_SECRET=your_jwt_secret_here
 
# Database
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/eva_db
 
# Redis & Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
 
# Vector DB
WEAVIATE_URL=http://localhost:8088
 
# Oracle / Regulatory
ADMIN_API_KEY=change-me-admin-key
 
# Voice / ASR
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region
NEMO_ASR_DEVICE=cpu
FFMPEG_PATH=/usr/bin/ffmpeg
HF_HUB_TOKEN=your_hf_token_here
4.2 LLM Configuration Architecture
The LLM is configured via  backend/app/core/config.py  using Pydantic Settings:
// python
# backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
 
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
 
    # Core LLM
    OPENAI_API_KEY: Optional[str] = None        # API key
    OPENAI_BASE_URL: Optional[str] = None        # Endpoint URL
    LLM_MODEL_NAME: Optional[str] = None         # Model identifier
    LLM_MAX_OUTPUT_TOKENS: int = 2048
 
    # Security
    SECRET_KEY: str = "change-me-in-env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
 
    # Database (Async)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eva_db"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
 
settings = Settings()
4.3 LLM Service Architecture
// python
# backend/app/services/infrastructure/llm_service.py
# Re-exported through: backend/app/services/llm_service.py
 
class LLMService:
    """
    Central LLM orchestration service.
    
    Features:
    - OpenAI-compatible chat completions API
    - Streaming support
    - Token management
    - Retry logic with exponential backoff
    - Timeout handling
    - Error classification (retryable vs non-retryable)
    """
 
    async def generate(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        stream: bool = False,
        timeout: Optional[int] = None,
    ) -> dict:
        """
        Generate a response from the LLM.
        
        Args:
            messages: Chat messages in OpenAI format
            model: Override default model name
            max_tokens: Override default max tokens
            temperature: Sampling temperature (0.0 - 2.0)
            stream: Enable streaming response
            timeout: Request timeout in seconds
            
        Returns:
            dict with keys: content, finish_reason, usage, model
        """
        ...
4.4 Credential Management Strategy
1. Never commit  .env  files — they are in  .gitignore 
2. Commit  .env.example  — template with placeholder values
3. Three strategies for production:
- Host  .env  file: Place next to  docker-compose.yml 
- Azure Key Vault: Init container fetches secrets at startup
- Docker Secrets: Store as  docker secret create 
4. Fallback behavior:  SECRET_KEY  has a deterministic fallback so the app never crashes on missing config
4.5 Required Secrets Quick Reference
┌───────────────────────┬──────────────────┬─────────────────────────────────────┬─────────────┐
│ Secret                │ Source           │ Used By                             │ Required    │
├───────────────────────┼──────────────────┼─────────────────────────────────────┼─────────────┤
│ OPENAI_API_KEY        │ LLM Provider     │ Backend (all modules)               │ ✅ Yes      │
│ OPENAI_BASE_URL       │ LLM Provider     │ Backend                             │ ✅ Yes      │
│ LLM_ENDPOINT          │ LLM Provider     │ Backend                             │ ✅ Yes      │
│ LLM_MODEL_NAME        │ LLM Provider     │ Backend (qwen3.6-27b in production) │ ✅ Yes      │
│ LLM_MAX_OUTPUT_TOKENS │ Config           │ Backend (8192 in production)        │ ✅ Yes      │
│ DATABASE_URL          │ DBA / Cloud      │ Backend                             │ ✅ Yes      │
│ WEAVIATE_URL          │ Weaviate Cloud   │ Backend                             │ ✅ Yes      │
│ JWT_SECRET            │ Generate locally │ Backend                             │ ✅ Yes      │
│ SECRET_KEY            │ Generate locally │ Backend                             │ ✅ Yes      │
│ ADMIN_API_KEY         │ Generate locally │ Backend                             │ ✅ Yes      │
│ CELERY_BROKER_URL     │ Redis URL        │ Backend                             │ ✅ Yes      │
│ CELERY_RESULT_BACKEND │ Redis URL        │ Backend                             │ ✅ Yes      │
│ AZURE_SPEECH_KEY      │ Azure Portal     │ Backend (TTS)                       │ ❌ Optional │
│ AZURE_SPEECH_REGION   │ Azure Portal     │ Backend                             │ ❌ Optional │
│ VITE_API_ORIGIN       │ Deployment URL   │ Frontend                            │ ✅ Yes      │
│ VITE_BP_API_KEY       │ Beyond Presence  │ Frontend (Avatar)                   │ ❌ Optional │
│ VITE_DEEPGRAM_KEY     │ Deepgram         │ Frontend (STT)                      │ ❌ Optional │
└───────────────────────┴──────────────────┴─────────────────────────────────────┴─────────────┘
────────────────────────────────────────────────────────────────────────────────
5. Real-Time Data Architecture
5.1 Three-Layer Real-Time Strategy
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ WebSocket │◄───│ SSE Manager  │◄───│ Backend Event Sources     │  │
│  │ (Browser) │    │ (In-Memory)  │    │ • Audit Service           │  │
│  └──────────┘    └──────────────┘    │ • Broadcast Platform      │  │
│       ▲                              │   Health (30s interval)   │  │
│       │                              │ • Ticket Status Updates   │  │
│  ┌────┴─────┐                       │ • Platform Events          │  │
│  │ 30s Poll │                       └──────────────────────────┘  │
│  │ (REST)   │                                                      │
│  └──────────┘                                                      │
│                                                                      │
│  Cache Layer:                                                       │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐    │
│  │  Redis Cache │   │  In-Memory Cache │   │ Stale-While-     │    │
│  │  (distributed)│  │  (fallback)      │   │ Revalidate       │    │
│  └──────────────┘   └──────────────────┘   └──────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
5.2 WebSocket Implementation Pattern
Frontend Hook (useDevWebSocket)
// typescript
// frontend/modules/developer/DeveloperOperationsCenter.tsx
 
function useDevWebSocket(onMessage: (event: string, data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const [connected, setConnected] = useState(false);
 
  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/ws/developer/live`;
 
    const ws = new WebSocket(url);
    wsRef.current = ws;
 
    ws.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
      // Authenticate with token
      ws.send(JSON.stringify({ type: 'auth', token }));
      // Heartbeat ping every 25s
      pingRef.current = window.setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };
 
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const ev = payload.event;
      const data = payload.data;
      if (ev === 'heartbeat' || ev === 'ping' || ev === 'pong') return;
      onMessage(ev, data);  // Forward to callback
    };
 
    ws.onclose = () => {
      setConnected(false);
      // Exponential backoff reconnect: 1s → 1.5s → 2.25s → ... → 15s max
      const delay = Math.min(1000 * Math.pow(1.5, retryRef.current), 15000);
      retryRef.current += 1;
      setTimeout(connect, delay);
    };
  }, []);
 
  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
 
  return connected;  // Returns connection status
}
 
// Live indicator component
function LiveIndicator({ connected }: { connected?: boolean }) {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const iv = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(iv);
  }, []);
  const isLive = connected !== undefined ? connected : true;
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${
      isLive ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        isLive ? 'bg-emerald-500' : 'bg-amber-400'
      } ${isLive && pulse ? 'opacity-100' : 'opacity-40'}`} />
      {isLive ? 'LIVE' : 'RECONNECTING'}
    </span>
  );
}

Backend WebSocket Endpoint
// python
# backend/app/main.py
 
@app.websocket("/ws/developer/live")
async def developer_live_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard streaming.
    
    Events streamed:
    - heartbeat (30s interval)
    - audit.new_log (from HTTP audit middleware)
    - ticket.updated (when developer updates ticket status)
    - platform.health (30s interval - system metrics)
    """
    await websocket.accept()
    
    # Subscribe to SSE managers for event streams
    audit_queue = sse_manager.subscribe()
    dev_audit_queue = developer_audit_sse_manager.subscribe()
    
    # Three background tasks:
    # 1. Heartbeat loop
    # 2. Audit log reader (from HTTP middleware)
    # 3. Developer events reader (tickets, audit, health)
    
    heartbeat_task = asyncio.create_task(_heartbeat_loop())
    audit_reader_task = asyncio.create_task(_audit_sse_reader())
    dev_sse_reader_task = asyncio.create_task(_dev_sse_reader())
    
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            # Handle: auth, ping/pong, subscribe, unsubscribe
    except WebSocketDisconnect:
        pass
    finally:
        # Cleanup all tasks and unsubscribe
        heartbeat_task.cancel()
        audit_reader_task.cancel()
        dev_sse_reader_task.cancel()
5.3 SSE Event Manager (Backend)
// python
# backend/app/services/infrastructure/audit_service.py
 
class SSEEventManager:
    """
    In-memory pub/sub event manager.
    
    - Subscribe: returns an asyncio.Queue
    - Broadcast: pushes events to all subscriber queues
    - Each WebSocket connection gets its own queue
    - Queues have a max size to prevent memory leaks
    """
 
    def __init__(self, max_queue_size: int = 100):
        self._subscribers: list[asyncio.Queue] = []
        self._lock = asyncio.Lock()
 
    async def broadcast(self, event: str, data: dict) -> None:
        """Push event + data to all subscribers."""
        async with self._lock:
            stale = []
            for q in self._subscribers:
                try:
                    q.put_nowait({"event": event, "data": data})
                except asyncio.QueueFull:
                    stale.append(q)
            for q in stale:
                self._subscribers.remove(q)  # Drop slow consumers
 
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue_size)
        self._subscribers.append(q)
        return q
 
    def unsubscribe(self, queue: asyncio.Queue) -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)
5.4 30-Second Health Broadcast Loop
// python
# backend/app/main.py — startup
 
async def _health_broadcast_loop() -> None:
    """Periodically fetches platform health stats and broadcasts via SSE."""
    while True:
        try:
            await asyncio.sleep(30)
            async with AsyncSessionLocal() as hb_db:
                await broadcast_platform_health(hb_db)
        except asyncio.CancelledError:
            break
        except Exception:
            pass
 
# Started in lifespan
health_broadcast_task = asyncio.create_task(_health_broadcast_loop())
// python
# backend/app/services/developer_admin_service.py
 
async def broadcast_platform_health(db: AsyncSession) -> None:
    """Fetch and broadcast live platform metrics."""
    now = datetime.utcnow()
    online_cutoff = now - timedelta(minutes=5)
 
    data = {
        "timestamp": now.isoformat() + "Z",
        "users_online": await db.execute(
            select(func.count(distinct(UserSession.user_id)))
            .where(UserSession.is_active, UserSession.last_activity >= online_cutoff)
        ).scalar() or 0,
        "total_users": ...,
        "active_sessions": ...,
        "open_tickets": ...,
        "errors_24h": ...,
        "resolved_today": ...,
        "system_health": {  # Per-component breakdown
            "database": {"status": "healthy", "cpu": 45, "memory": 62, ...},
            "api": {...},
            "worker": {...},
            "redis": {...},
            "weaviate": {...},
            "frontend": {...},
        },
    }
    await developer_audit_sse_manager.broadcast("platform.health", data)
5.5 30-Second Polling Pattern (Frontend)
Every panel in the Developer Admin Dashboard uses this pattern:
// typescript
function ModulesPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
 
  const load = () => {
    fetch('/api/developer/modules', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLastUpdated(new Date().toISOString()); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
 
  // Initial load
  useEffect(() => { load(); }, []);
  
  // 30-second polling
  useEffect(() => {
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);
  
  // ... render with LiveIndicator + timestamp
}
5.6 Cache Warmup Strategy
// python
# backend/app/services/cache_warmup_service.py
 
async def warm_all_caches() -> Dict[str, int]:
    """
    Pre-fetches common data into Redis on startup.
    
    Warms:
    - PubMed search results for common therapeutic areas
    - ClinicalTrials.gov results for common conditions
    - Regulatory data (FDA, EMA, WHO, PMDA)
    - SEC filings for top biotech companies
    - Biotech news for common keywords
    
    All errors are caught individually — one failing source
    doesn't prevent others from being cached.
    """
    tasks = [
        _warm_pubmed(medref_service),
        _warm_clinical_trials(medref_service),
        _warm_regulatory(scraper),
        _warm_sec_filings(scraper),
        _warm_biotech_news(scraper),
    ]
    await asyncio.gather(*tasks, return_exceptions=True)
    return {"status": "completed"}
5.7 Redis Cache with Graceful Fallback
// python
# backend/app/db/redis_cache.py
 
# All operations gracefully degrade to in-memory dict when Redis
# is unreachable — callers never block or crash.
 
async def get(key: str, default: T = None) -> Any | T:
    """1. Try Redis → 2. Try in-memory fallback → 3. Return default"""
 
async def set(key: str, value: Any, ttl: int = 300) -> bool:
    """Set in both Redis (if available) and in-memory cache"""
 
async def get_or_refresh(key: str, factory, ttl=300, stale_ttl=3600):
    """
    Stale-while-revalidate pattern:
    - Serve fresh data if available
    - Serve stale data + refresh in background if within stale_ttl
    - Compute fresh if not found anywhere
    """
────────────────────────────────────────────────────────────────────────────────
6. Authentication & Authorization
6.1 Multi-Layer Auth Architecture
┌──────────────────────────────────────────────┐
│            AUTHENTICATION LAYERS              │
├──────────────────────────────────────────────┤
│ 1. JWT Token (Bearer)                        │
│ 2. Role-Based Access (RBAC)                  │
│ 3. Module-Level Permissions                  │
│ 4. Feature Visibility Flags                  │
│ 5. Developer Admin (platform-level bypass)   │
│ 6. V2 Security Foundation (Classification)   │
└──────────────────────────────────────────────┘
6.2 JWT Authentication
// python
# backend/app/core/security.py
 
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
 
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

6.3 Role-Based Access Control
// typescript
// frontend/config/moduleAccess.ts
type EvaRoleBucket =
  | 'admin' | 'ceo' | 'finance' | 'scientist' | 'clinical'
  | 'regulatory' | 'marketing' | 'operations' | 'guest' | 'developer_admin';
 
const EVA_MODULE_ROLE_ACCESS: Record<string, Set<EvaRoleBucket>> = {
  dashboard: roleSet('admin', 'ceo', 'scientist', 'clinical', 'regulatory', 'marketing', 'guest'),
  h02:       roleSet('ceo', 'scientist'),
  h03:       roleSet('regulatory'),
  h14:       roleSet('scientist'),
  // ...
};
6.4 Route Guards (Frontend)
// typescript
// frontend/config/routes.tsx
export function RequireAuth({ children })          // JWT check
export function DevRequireAuth({ children })       // Developer admin token
export function AdminOnlyRoute({ children })       // Admin role check
export function RoleGuard({ children, allowedRoles })
export function ModuleGuard({ children, moduleKey })
export function FeatureGuard({ children, featureKey })
6.5 Admin Role Hierarchy
// typescript
// Roles recognized as 'admin' for permission purposes:
// - Admin
// - Application Admin
// - Platform Admin
// - Developer Admin
//
// Developer Admin bypasses ALL tenant restrictions,
// org boundaries, module restrictions, and user permissions.
────────────────────────────────────────────────────────────────────────────────
7. Database & Storage Layer
7.1 Data Storage Architecture
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STORAGE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PostgreSQL 15 (Primary)                                        │
│  ├── Enterprise Users & Roles                                   │
│  ├── Audit Logs & Triage Tickets                                │
│  ├── Regulatory / Compliance Records                            │
│  ├── Conference Data & Materials                                │
│  ├── Workspace / Collaboration Data                             │
│  ├── Chat Sessions & Messages                                   │
│  ├── Report Documents & Versions                                │
│  ├── Feature Flags & Module Access                              │
│  ├── Platform Events & Developer Admin                          │
│  └── Calendar / ETA / Telemetry                                 │
│                                                                  │
│  Weaviate 1.27 (Vector Store)                                   │
│  ├── Semantic Embeddings (768d)                                 │
│  ├── Hybrid Search (BM25 + Vector)                              │
│  ├── Knowledge Graph (Cross-References)                         │
│  └── RAG Grounding for LLM Responses                            │
│                                                                  │
│  Redis 7 (Cache + Queue)                                        │
│  ├── Session Cache                                              │
│  ├── API Response Cache (get_or_set / get_or_refresh)           │
│  ├── Celery Task Queue                                          │
│  ├── Pub/Sub for Real-Time Events                               │
│  └── In-Memory Fallback (graceful degradation)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
7.2 SQLAlchemy Model Example
// python
# backend/app/models/developer.py
 
class DeveloperAdmin(Base):
    __tablename__ = "developer_admins"
 
    id = Column(String, primary_key=True, index=True, default=_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
7.3 Async Database Session
// python
# backend/app/db/session.py
 
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
 
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.SQL_ECHO,
)
 
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
 
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
────────────────────────────────────────────────────────────────────────────────
8. Deployment & Operations
8.1 Multi-Stage Docker Build
// dockerfile
# Stage 1: Python builder
FROM python:3.11-slim AS builder
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .
 
# Stage 2: Node.js builder (for opencode CLI)
FROM node:20-bookworm-slim AS node-builder
RUN npm install -g opencode-ai@latest && npm cache clean --force
 
# Stage 3: Runtime
FROM python:3.11-slim
WORKDIR /app
# Copy only site-packages from builder (no build tools)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
# Create non-root user
RUN groupadd -r eva && useradd -r -g eva -d /app eva && chown -R eva:eva /app
USER eva
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081"]
8.2 Production Configuration
// yaml
# docker-compose.prod.yml overrides
services:
  backend:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 4G
  frontend:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
  worker:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 4G
8.3 Health Check Endpoints
┌───────────────┬───────────────────┬──────────────────────────────┐
│ Endpoint      │ Purpose           │ Check Method                 │
├───────────────┼───────────────────┼──────────────────────────────┤
│ /             │ Root health check │ Returns {"status": "online"} │
│ /health       │ Backend health    │ DB + Redis + Weaviate status │
│ /health/ready │ Readiness         │ All dependencies connected   │
│ /metrics      │ Prometheus        │ Structured metrics           │
└───────────────┴───────────────────┴──────────────────────────────┘
8.4 Logging Configuration
// python
# Structured JSON logging
{
    "timestamp": "2026-07-21T12:00:00Z",
    "level": "INFO",
    "module": "eva.backend.request",
    "message": "GET /api/search -> 200 (45ms) [ip=... role=scientist user=...]",
    "request_id": "abc123"
}
# Log rotation: 10MB max per file, 3 files retained
8.5 Startup Boot Sequence
1. Configure logging & stdio
2. Seed default enterprise users
3. Start audit service background worker
4. Seed Developer Admin account
5. Seed platform entities (org credentials, personas, features)
6. Seed V2 Security Foundation data
7. Seed platform credentials from .env
8. Auto-register connectors (SharePoint, QMS)
9. Start connector health monitor
10. Seed baseline database data (background)
11. Start scheduler (APScheduler)
12. Initialize spiders
13. Start opencode daemon (background)
14. Start Scrapling MCP server (background)
15. Initialize vector DB schema (background)
16. Start health broadcast loop (30s interval)
17. Warm Redis caches (background)
18. Run startup health check
19. ✅ Accept requests
────────────────────────────────────────────────────────────────────────────────
9. Design Patterns & Best Practices
9.1 Key Patterns Used Throughout EVA
┌────────────────────────┬─────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Pattern                │ Where Used                                  │ Why                                                │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ Lazy Loading           │ All 45 routes via React.lazy()              │ Code splitting, faster initial load                │
│ Parallel Fetch         │ Promise.all() in load functions             │ Reduces waterfall, faster data loading             │
│ Stale-While-Revalidate │ Redis cache get_or_refresh()                │ Serves stale data + refreshes in background        │
│ Graceful Degradation   │ Redis fallback to in-memory                 │ App never crashes when Redis is down               │
│ Background Tasks       │ asyncio.create_task() at startup            │ API starts immediately, warming happens in bg      │
│ Exponential Backoff    │ WebSocket reconnection                      │ Prevents reconnect storms                          │
│ SSE Pub/Sub            │ SSEEventManager class                       │ Decouples event producers from WebSocket consumers │
│ Role Normalization     │ normalizeRoleBucket()                       │ Flexible role matching with partial strings        │
│ Module Registry        │ Centralized module definitions              │ Single source of truth for what's implemented      │
│ Guard Components       │ Route guards (RequireAuth, RoleGuard, etc.) │ Declarative access control                         │
└────────────────────────┴─────────────────────────────────────────────┴────────────────────────────────────────────────────┘
9.2 Real-Time Data Maturity Model
┌──────────────┬──────────────────────────────────────┬──────────────────────────────────┬─────────────────┐
│ Level        │ Pattern                              │ Example Panels                   │ Update Interval │
├──────────────┼──────────────────────────────────────┼──────────────────────────────────┼─────────────────┤
│ 1. Polling   │ setInterval(fetch, 30000)            │ Modules, Datasets, Models, Users │ 30s             │
│ 2. WebSocket │ Persistent connection + event stream │ Overview, Audit, Tickets         │ Real-time       │
│ 3. Hybrid    │ WebSocket + polling                  │ Health, Feedback, Sessions       │ Real-time + 30s │
│ 4. Broadcast │ SSE event manager                    │ Platform health, Ticket updates  │ Event-driven    │
└──────────────┴──────────────────────────────────────┴──────────────────────────────────┴─────────────────┘
9.3 Frontend Component Architecture Patterns
// typescript
// 1. Shared UI Components (reusable)
function StatCard({ label, value, icon, color, subtitle, trend })
function Section({ title, description, children })
function DetailModal({ open, onClose, title, children })
function LiveIndicator({ connected })
function statusBadge(status)
function fmtDate(d)
 
// 2. Auth Headers Pattern
function authHeaders() {
  const token = localStorage.getItem('devAuthToken');
  const devId = localStorage.getItem('devUserId');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (devId) h['X-Dev-Id'] = devId;
  h['X-User-Role'] = 'admin';
  return h;
}
 
// 3. Panel Component Pattern
function SomePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
 
  const load = () => {
    fetch('/api/developer/some-endpoint', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLastUpdated(new Date().toISOString()); })
      .finally(() => setLoading(false));
  };
 
  useEffect(() => { load(); }, []);
  useEffect(() => { const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);
 
  if (loading) return <Loader />;
  if (!data) return <EmptyState />;
  return (
    <div>
      <h2>Title <LiveIndicator /></h2>
      <p>Description{lastUpdated && <span>Refreshed at {time}</span>}</p>
      {data.items.map(item => <Card key={item.id}>{item}</Card>)}
    </div>
  );
}
────────────────────────────────────────────────────────────────────────────────
10. Building Your Own Application
10.1 Step-by-Step Implementation Guide
Phase 1: Foundation (Week 1-2)
// bash
# 1. Setup monorepo structure
mkdir -p frontend backend tests docs
 
# 2. Initialize frontend
npx create-vite@latest frontend --template react-ts
cd frontend
npm install
npm install react-router-dom framer-motion lucide-react axios tailwindcss
 
# 3. Initialize backend
mkdir backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy asyncpg pydantic-settings python-jose bcrypt
 
# 4. Setup infrastructure (Docker Compose)
# docker-compose.yml with: PostgreSQL, Redis
Phase 2: Core API (Week 2-3)
- app/main.py (FastAPI entry with lifespan)
- app/core/config.py (Pydantic Settings)
- app/core/auth.py (JWT + role-based auth)
- app/db/session.py (Async SQLAlchemy)
- First 5-10 API endpoints
- Basic CRUD for users/modules
Phase 3: Frontend Shell (Week 3-4)
- App.tsx with React Router
- MainLayout with sidebar/topbar
- Authentication flow (login → JWT → redirect)
- Dashboard shell with placeholder cards
- 5-10 lazy-loaded routes
Phase 4: Real-Time Features (Week 4-5)
- WebSocket endpoint on backend
- SSE Event Manager
- useDevWebSocket hook on frontend
- LiveIndicator component
- 30-second polling pattern
- First panel with live data
Phase 5: Modules & Features (Week 5+)
- Module registry (config/moduleRegistry.ts)
- Role-based access (config/moduleAccess.ts)
- Route guards (RequireAuth, RoleGuard, ModuleGuard)
- Feature-specific panels with live data
- Admin dashboard (Enterprise + Developer)
10.2 Architecture Checklist for Your Application
[ ] Monorepo with  frontend/ ,  backend/ ,  tests/ ,  docs/ 
[ ] Docker Compose for local development
[ ] Multi-stage Dockerfile for production builds
[ ] Environment variables via  .env  (gitignored) +  .env.example 
[ ] Async SQLAlchemy with connection pooling
[ ] Redis for caching + task queue + pub/sub
[ ] JWT authentication with role-based access
[ ] Module registry for feature governance
[ ] WebSocket for real-time data streaming
[ ] 30s polling as fallback for real-time
[ ] Graceful degradation (Redis → in-memory)
[ ] Background tasks for startup warmup + periodic refresh
[ ] Health check endpoints ( /health ,  /health/ready )
[ ] Structured JSON logging with rotation
[ ] Rate limiting middleware
[ ] Prometheus metrics endpoint
[ ] Lazy-loaded routes for code splitting
[ ] CORS configuration for production origins
[ ] Non-root Docker user for security
[ ] Pagination on all list endpoints
10.3 LLM Integration Quick Start
// python
# 1. Configure (backend/.env)
# EVA uses an OpenAI-compatible endpoint with model: qwen3.6-27b
# The same pattern works for ANY OpenAI-compatible API:
#   - OpenAI:       https://api.openai.com/v1
#   - Groq:         https://api.groq.com/openai/v1
#   - Cerebras:     https://api.cerebras.ai/v1
#   - DeepSeek:     https://api.deepseek.com/v1
#   - Together:     https://api.together.xyz/v1
#   - Ollama (local): http://localhost:11434/v1
#   - Custom:       http://your-server:8000/v1
 
OPENAI_API_KEY=your-key-here
OPENAI_BASE_URL=http://your-llm-server:8000/v1
LLM_MODEL_NAME=your-model-name
LLM_MAX_OUTPUT_TOKENS=8192
 
# 2. Config class (backend/app/core/config.py)
class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    LLM_MODEL_NAME: Optional[str] = None
    LLM_MAX_OUTPUT_TOKENS: int = 2048
 
settings = Settings()
 
# 3. LLM Service (backend/app/services/llm_service.py)
import httpx
 
class LLMService:
    async def generate(self, messages, model=None, max_tokens=2048, temperature=0.7):
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or settings.LLM_MODEL_NAME,
            "messages": messages,
            "max_tokens": max_tokens or settings.LLM_MAX_OUTPUT_TOKENS,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.OPENAI_BASE_URL}/chat/completions",
                headers=headers, json=payload,
            )
            resp.raise_for_status()
            return resp.json()
 
# 4. Use in any endpoint
llm_service = LLMService()
 
@app.post("/api/chat")
async def chat(request: ChatRequest):
    response = await llm_service.generate(request.messages)
    return {"content": response["choices"][0]["message"]["content"]}
10.4 Monitoring & Operations Checklist
[ ] Health checks on all services
[ ] Prometheus metrics endpoint
[ ] Rate limiting per endpoint
[ ] Structured logging with correlation IDs
[ ] Error tracking (Sentry or similar)
[ ] Uptime monitoring
[ ] Resource usage alerts (CPU, memory, disk)
[ ] Database backup strategy
[ ] Secrets rotation policy
[ ] Deployment rollback plan
────────────────────────────────────────────────────────────────────────────────
> This document is a living blueprint. The EVA project demonstrates that a production-grade AI application needs: modular architecture, multiple real-time data strategies, robust auth/authorization, graceful degradation at every layer, and a startup sequence that prioritizes availability over completeness. Use this foundation to build your application with the same architectural depth — or go beyond it.


You're right, let me paste the full content directly:
# Production-Grade AI Application — Architecture Blueprint
 
> **Purpose**: A comprehensive, generic guide for building production-grade AI applications with real-time capabilities, modular architecture, and enterprise-grade deployment patterns. Use this as your reference for architecture decisions, real-time data handling, LLM integration, deployment, and design philosophy.
 
---
 
## Table of Contents
 
1. [Core Architecture](#1-core-architecture)
2. [Technology Stack Recommendations](#2-technology-stack-recommendations)
3. [Project Structure](#3-project-structure)
4. [LLM Integration](#4-llm-integration)
5. [Real-Time Data Architecture](#5-real-time-data-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Database & Storage Layer](#7-database--storage-layer)
8. [Deployment & Operations](#8-deployment--operations)
9. [Design Patterns & Best Practices](#9-design-patterns--best-practices)
10. [Building Your Own Application](#10-building-your-own-application)
 
---
 
## 1. Core Architecture
 
### 1.1 High-Level System Design
 
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vue/Svelte)                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │Dashboards│  │Feature Panels│  │AI Chat   │  │ Admin Panels│  │
│  │          │  │  (Module X)  │  │Assistant │  │             │  │
│  └──────────┘  └──────────────┘  └──────────┘  └─────────────┘  │
│                         │ HTTP/WS                                │
└─────────────────────────┼───────────────────────────────────────┘
│
┌─────────────────────────┼───────────────────────────────────────┐
│                    BACKEND (FastAPI/Django/Express)               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           API Layer (REST + WebSocket)                    │   │
│  │  Auth → Rate Limit → Metrics → Response Standards        │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                       │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │              Business Logic Services                       │   │
│  │  Domain A │ Domain B │ Domain C │ Domain D │ ...         │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                       │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │               Data Layer                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │   │
│  │  │PostgreSQL│  │ Vector DB│  │  Redis   │                │   │
│  │  │(Structured│  │(Semantic │  │(Cache+Q) │                │   │
│  │  │  Data)   │  │ Search)  │  │          │                │   │
│  │  └──────────┘  └──────────┘  └──────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
 
### 1.2 Key Architectural Decisions
 
| Decision | Recommended Choice | Rationale |
|----------|-------------------|-----------|
| Frontend Framework | React/Next.js or Vue/Nuxt | Strong typing (TS), component model, ecosystem |
| Build Tool | Vite | Fast HMR, optimized builds, native ESM |
| Styling | Tailwind CSS | Utility-first, rapid prototyping, consistent |
| Animation | Framer Motion (React) or GSAP | Declarative animations, AnimatePresence |
| Backend Framework | FastAPI or Express/NestJS | Async-native, auto-docs, strong validation |
| SQL ORM | SQLAlchemy / Prisma / Drizzle | Mature, well-tested, async support |
| Vector DB | Weaviate / Pinecone / Qdrant | Hybrid search, scalable, CRUD operations |
| Cache | Redis | Pub/sub, queue, cache, graceful fallback |
| Task Queue | Celery or Bull | Background processing, scheduling |
| Scheduling | APScheduler or node-cron | Periodic refresh, cron-like jobs |
 
---
 
## 2. Technology Stack Recommendations
 
### 2.1 Frontend (Recommended)
 
```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-router-dom": "^7.x",
    "framer-motion": "^12.x",
    "lucide-react": "^0.556.x",
    "recharts": "^3.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "typescript": "~5.x",
    "vite": "^6.x",
    "tailwindcss": "^3.x",
    "@vitejs/plugin-react": "^5.x",
    "vitest": "^4.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  }
}
2.2 Backend (Recommended Python Stack)
// toml
dependencies = [
    # Core API
    "fastapi>=0.111",
    "uvicorn>=0.30",
    "pydantic>=2.12",
    "pydantic-settings>=2.6",
    "python-multipart>=0.0.9",
 
    # Database
    "sqlalchemy>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13.1",
    "weaviate-client>=4.6",    # Or: pinecone-client, qdrant-client
 
    # AI / NLP (if needed)
    "sentence-transformers>=2.7",
    "torch>=2.3",
 
    # Queue / Scheduling
    "redis>=5.0",
    "celery>=5.4",
    "apscheduler>=3.10.4",
 
    # Security
    "python-jose[cryptography]>=3.3.0",
    "bcrypt>=4.0.0",
    "cryptography>=46",
]
2.3 Infrastructure (Docker Compose)
// yaml
services:
  backend:    # API server - 2 CPUs, 4GB memory (prod)
  frontend:   # Nginx SPA - 0.5 CPUs, 512MB (prod)
  worker:     # Background job processor - 2-4 CPUs, 4GB (prod)
  db:         # PostgreSQL 15 - 1 CPU, 1GB
  redis:      # Redis 7 - 0.5 CPU, 256MB
  vector-db:  # Weaviate/Qdrant - 1 CPU, 1GB
────────────────────────────────────────────────────────────────────────────────
3. Project Structure
3.1 Recommended Directory Layout
your-application/
│
├── frontend/                          # Frontend code
│   ├── App.tsx                        # Root component + routes
│   ├── components/                    # Shared UI components
│   │   ├── auth/                      # Login, registration
│   │   ├── common/                    # Reusable UI primitives
│   │   └── widgets/                   # Specialized widgets
│   ├── config/                        # Configuration
│   │   ├── moduleAccess.ts            # Role → module mapping
│   │   ├── moduleRegistry.ts          # Module definitions
│   │   └── routes.tsx                 # Route definitions + guards
│   ├── hooks/                         # Custom React hooks
│   │   ├── useWebSocket.ts            # Real-time WebSocket hook
│   │   └── useCachedData.ts           # Data caching hook
│   ├── modules/                       # Feature modules
│   │   ├── dashboard/                 # Main dashboard
│   │   ├── admin/                     # Admin panel
│   │   ├── feature-a/                 # Feature A
│   │   └── feature-b/                 # Feature B
│   ├── services/                      # API client services
│   ├── store/                         # State management
│   └── utils/                         # Utilities
│
├── backend/                           # Backend code
│   ├── app/
│   │   ├── main.py                    # Entry point
│   │   ├── api/v1/endpoints/          # Route handlers
│   │   ├── core/                      # Auth, config, logging, metrics
│   │   ├── db/                        # Database sessions + connections
│   │   ├── models/                    # ORM models
│   │   ├── services/                  # Business logic
│   │   └── worker/                    # Background tasks
│   ├── Dockerfile                     # Build
│   └── scripts/                       # Operational scripts
│
├── tests/                             # Consolidated tests
├── docs/                              # Documentation
│
├── docker-compose.yml                 # Local development stack
├── docker-compose.prod.yml            # Production overrides
├── package.json                       # Frontend dependencies
└── vite.config.ts                     # Build configuration
3.2 Module Registration Pattern
Every feature module should follow this pattern:
// typescript
// frontend/config/moduleRegistry.ts
// Central registry for all feature modules
export const MODULE_REGISTRY = [
  { key: 'feature_a', label: 'Feature A', developmentStatus: 'PRODUCTION' },
  { key: 'feature_b', label: 'Feature B', developmentStatus: 'PRODUCTION' },
  { key: 'feature_c', label: 'Feature C', developmentStatus: 'COMING_SOON' },
];
 
// frontend/config/moduleAccess.ts - Role-based access control
const MODULE_ROLE_ACCESS: Record<string, Set<RoleBucket>> = {
  feature_a: roleSet('admin', 'manager', 'user'),
  feature_b: roleSet('admin', 'manager'),
};
 
// frontend/config/routes.tsx - Route definition with guards
{ path: '/feature-a', component: FeatureAPage,
  guards: [{ type: 'module', moduleKey: 'feature_a' }, 
           { type: 'role', roles: ['all'] }] },
────────────────────────────────────────────────────────────────────────────────
4. LLM Integration
4.1 Environment Variables Template
// bash
# ── Backend .env — LLM Configuration ──
# Copy this template to .env and fill in your actual values
 
# Primary LLM Configuration
# OpenAI-compatible API endpoint (works with OpenAI, Groq, Cerebras, DeepSeek, Together, Ollama, etc.)
OPENAI_API_KEY=your_openai_compatible_key_here
OPENAI_BASE_URL=http://your-llm-server:8000/v1
LLM_ENDPOINT=http://your-llm-server:8000/v1/chat/completions
LLM_MODEL_NAME=your-model-name
LLM_MAX_OUTPUT_TOKENS=8192
 
# Security
SECRET_KEY=change_this_to_a_secure_random_string
JWT_SECRET=your_jwt_secret_here
 
# Database
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/your_db
 
# Redis & Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
 
# Vector DB
VECTOR_DB_URL=http://localhost:8080

4.2 LLM Configuration Architecture
// python
# backend/app/core/config.py
from pydantic_settings import BaseSettings
 
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
 
    # Core LLM
    OPENAI_API_KEY: Optional[str] = None        # API key
    OPENAI_BASE_URL: Optional[str] = None        # Endpoint URL
    LLM_MODEL_NAME: Optional[str] = None         # Model identifier
    LLM_MAX_OUTPUT_TOKENS: int = 2048
 
    # Security
    SECRET_KEY: str = "change-me-in-env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
 
    # Database (Async)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/your_db"
 
settings = Settings()
4.3 LLM Service Pattern
// python
# backend/app/services/llm_service.py
 
class LLMService:
    """
    Central LLM orchestration service.
    
    Features:
    - OpenAI-compatible chat completions API
    - Streaming support
    - Token management
    - Retry logic with exponential backoff
    - Timeout handling
    """
 
    async def generate(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> dict:
        """
        Generate a response from the LLM.
        
        Args:
            messages: Chat messages in OpenAI format
            model: Override default model name
            max_tokens: Override default max tokens
            temperature: Sampling temperature (0.0 - 2.0)
            stream: Enable streaming response
            
        Returns:
            dict with keys: content, finish_reason, usage, model
        """
        ...
4.4 Credential Management Best Practices
1. Never commit  .env  files — add to  .gitignore 
2. Commit  .env.example  — template with placeholder values
3. Production strategies:
- Host  .env  file placed next to  docker-compose.yml 
- Cloud secret manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- Docker secrets ( docker secret create )
4. Always have a fallback —  SECRET_KEY  should have a deterministic fallback so the app never crashes on missing config
5. Rotate keys regularly — implement a rotation policy
4.5 Required Secrets Quick Reference
┌───────────────────┬──────────────────┬──────────┬──────────┐
│ Secret            │ Source           │ Used By  │ Required │
├───────────────────┼──────────────────┼──────────┼──────────┤
│ OPENAI_API_KEY    │ LLM Provider     │ Backend  │ ✅ Yes   │
│ OPENAI_BASE_URL   │ LLM Provider     │ Backend  │ ✅ Yes   │
│ LLM_MODEL_NAME    │ LLM Provider     │ Backend  │ ✅ Yes   │
│ DATABASE_URL      │ DBA / Cloud      │ Backend  │ ✅ Yes   │
│ JWT_SECRET        │ Generate locally │ Backend  │ ✅ Yes   │
│ SECRET_KEY        │ Generate locally │ Backend  │ ✅ Yes   │
│ CELERY_BROKER_URL │ Redis URL        │ Backend  │ ✅ Yes   │
│ VITE_API_ORIGIN   │ Deployment URL   │ Frontend │ ✅ Yes   │
└───────────────────┴──────────────────┴──────────┴──────────┘
────────────────────────────────────────────────────────────────────────────────
5. Real-Time Data Architecture
5.1 Three-Layer Real-Time Strategy
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ WebSocket │◄───│ SSE Manager  │◄───│ Backend Event Sources     │  │
│  │ (Browser) │    │ (In-Memory)  │    │ • Audit Service           │  │
│  └──────────┘    └──────────────┘    │ • Health Broadcast        │  │
│       ▲                              │   (30s interval)          │  │
│       │                              │ • Status Updates          │  │
│  ┌────┴─────┐                       │ • Platform Events          │  │
│  │ 30s Poll │                       └──────────────────────────┘  │
│  │ (REST)   │                                                      │
│  └──────────┘                                                      │
│                                                                      │
│  Cache Layer:                                                       │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐    │
│  │  Redis Cache │   │  In-Memory Cache │   │ Stale-While-     │    │
│  │  (distributed)│  │  (fallback)      │   │ Revalidate       │    │
│  └──────────────┘   └──────────────────┘   └──────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
5.2 WebSocket Implementation Pattern
Frontend Hook (useWebSocket)
// typescript
// frontend/hooks/useWebSocket.ts
 
function useWebSocket(onMessage: (event: string, data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const pingRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
 
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
 
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/ws/live`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
 
    ws.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
      // Authenticate
      ws.send(JSON.stringify({ type: 'auth', token: getAuthToken() }));
      // Heartbeat every 25s to keep connection alive
      pingRef.current = window.setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };
 
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: ev, data } = payload;
        if (['heartbeat', 'ping', 'pong'].includes(ev)) return;
        onMessageRef.current(ev, data);
      } catch { /* ignore malformed messages */ }
    };
 
    ws.onerror = () => setConnected(false);
 
    ws.onclose = () => {
      setConnected(false);
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (!mountedRef.current) return;
      // Exponential backoff: 1s → 1.5s → 2.25s → ... → 15s max
      const delay = Math.min(1000 * Math.pow(1.5, retryRef.current), 15000);
      retryRef.current += 1;
      setTimeout(connect, delay);
    };
  }, []);
 
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
 
  return connected;  // Returns connection status for UI
}
Live Indicator Component
// typescript
// frontend/components/LiveIndicator.tsx
 
function LiveIndicator({ connected }: { connected?: boolean }) {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const iv = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(iv);
  }, []);
  
  const isLive = connected !== undefined ? connected : true;
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${
      isLive ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-1000 ${
        isLive ? 'bg-emerald-500' : 'bg-amber-400'
      } ${isLive && pulse ? 'opacity-100' : 'opacity-40'}`} />
      {isLive ? 'LIVE' : 'RECONNECTING'}
    </span>
  );
}
Backend WebSocket Endpoint

# backend/app/main.py
 
@app.websocket("/ws/live")
async def live_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard streaming.
    
    Events streamed:
    - heartbeat (30s interval)
    - audit.new_log (from HTTP audit middleware)
    - status.updated (when admin updates a record)
    - system.health (30s interval - system metrics)
    """
    await websocket.accept()
    
    # Subscribe to SSE managers for event streams
    audit_queue = sse_manager.subscribe()
    events_queue = event_manager.subscribe()
    
    # Three background readers
    heartbeat_task = asyncio.create_task(_heartbeat_loop())
    audit_reader = asyncio.create_task(_audit_reader())
    event_reader = asyncio.create_task(_event_reader())
    
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            # Handle: auth, ping/pong, subscribe, unsubscribe
    except WebSocketDisconnect:
        pass
    finally:
        # Cleanup
        for task in [heartbeat_task, audit_reader, event_reader]:
            task.cancel()
        sse_manager.unsubscribe(audit_queue)
        event_manager.unsubscribe(events_queue)
5.3 SSE Event Manager (Backend Pattern)
// python
# backend/app/services/event_manager.py
 
class SSEEventManager:
    """
    In-memory pub/sub event manager.
    
    - Subscribe: returns an asyncio.Queue
    - Broadcast: pushes events to all subscriber queues
    - Each WebSocket connection gets its own queue
    - Queues have a max size to prevent memory leaks
    """
 
    def __init__(self, max_queue_size: int = 100):
        self._subscribers: list[asyncio.Queue] = []
        self._lock = asyncio.Lock()
 
    async def broadcast(self, event: str, data: dict) -> None:
        """Push event + data to all subscribers."""
        async with self._lock:
            stale = []
            for q in self._subscribers:
                try:
                    q.put_nowait({"event": event, "data": data})
                except asyncio.QueueFull:
                    stale.append(q)  # Drop slow consumers
            for q in stale:
                self._subscribers.remove(q)
 
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue_size)
        self._subscribers.append(q)
        return q
 
    def unsubscribe(self, queue: asyncio.Queue) -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)
5.4 Health Broadcast Loop Pattern
// python
# Startup in lifespan
async def _health_broadcast_loop() -> None:
    """Periodically fetches system health stats and broadcasts via SSE."""
    while True:
        try:
            await asyncio.sleep(30)
            health_data = await fetch_system_health()
            await event_manager.broadcast("system.health", health_data)
        except asyncio.CancelledError:
            break
        except Exception:
            pass
 
# Started at application startup
health_broadcast_task = asyncio.create_task(_health_broadcast_loop())
5.5 30-Second Polling Pattern (Frontend)
Every dashboard panel should use this pattern for fallback + live data:
// typescript
function DataPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
 
  // WebSocket for real-time updates (when available)
  const wsConnected = useWebSocket((event, payload) => {
    if (event === 'data.updated') {
      setData(prev => ({ ...prev, ...payload }));
      setLiveCount(c => c + 1);
    }
  });
 
  // REST polling as fallback
  const load = async () => {
    try {
      const res = await fetch('/api/data', { headers: authHeaders() });
      const result = await res.json();
      setData(result);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };
 
  // Initial load + 30-second polling
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);
 
  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState />;
 
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2>Data Panel</h2>
        {wsConnected ? <LiveIndicator connected={true} /> : <LiveIndicator connected={false} />}
      </div>
      <p>Last updated: {lastUpdated && new Date(lastUpdated).toLocaleTimeString()}</p>
      {liveCount > 0 && <span className="badge">+{liveCount} updates</span>}
      {/* Render data */}
    </div>
  );
}
5.6 Cache Warmup Strategy
// python
# backend/app/services/cache_warmup_service.py
 
async def warm_all_caches() -> dict:
    """
    Pre-fetch common data into Redis on startup.
    
    Warms:
    - Frequently accessed search results
    - Popular reference data
    - Dashboard summary statistics
    
    All errors are caught individually — one failing source
    doesn't prevent others from being cached.
    """
    tasks = [
        _warm_popular_searches(search_service),
        _warm_reference_data(reference_service),
        _warm_dashboard_stats(dashboard_service),
    ]
    await asyncio.gather(*tasks, return_exceptions=True)
    return {"status": "completed"}
5.7 Redis Cache with Graceful Fallback
// python
# backend/app/db/redis_cache.py
 
# All operations gracefully degrade to in-memory dict when Redis
# is unreachable — callers never block or crash on transient failures.
 
async def get(key: str, default: T = None) -> Any | T:
    """1. Try Redis → 2. Try in-memory fallback → 3. Return default"""
 
async def set(key: str, value: Any, ttl: int = 300) -> bool:
    """Set in both Redis (if available) and in-memory cache"""
 
async def delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern (e.g. `namespace:*`)"""
 
async def get_or_refresh(key: str, factory, ttl=300, stale_ttl=3600):
    """
    Stale-while-revalidate pattern:
    - Serve fresh data if available
    - Serve stale data + refresh in background if within stale_ttl
    - Compute fresh if not found anywhere
    """
────────────────────────────────────────────────────────────────────────────────
6. Authentication & Authorization
6.1 Multi-Layer Auth Architecture
┌──────────────────────────────────────────────┐
│            AUTHENTICATION LAYERS              │
├──────────────────────────────────────────────┤
│ 1. JWT Token (Bearer)                        │
│ 2. Role-Based Access (RBAC)                  │
│ 3. Module-Level Permissions                  │
│ 4. Feature Visibility Flags                  │
│ 5. Admin/Superuser (platform-level bypass)   │
└──────────────────────────────────────────────┘

6.2 JWT Authentication
// python
# backend/app/core/security.py
 
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
 
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
6.3 Role-Based Access Control
// typescript
// frontend/config/moduleAccess.ts
type RoleBucket =
  | 'admin' | 'manager' | 'editor' | 'viewer' | 'guest';
 
const MODULE_ROLE_ACCESS: Record<string, Set<RoleBucket>> = {
  dashboard: roleSet('admin', 'manager', 'editor', 'viewer', 'guest'),
  analytics: roleSet('admin', 'manager'),
  settings:  roleSet('admin'),
  // ...
};
 
function roleSet(...roles: RoleBucket[]): Set<RoleBucket> {
  return new Set(roles);
}
6.4 Route Guards (Frontend)
// typescript
// frontend/config/routes.tsx
export function RequireAuth({ children })          // JWT check
export function AdminOnlyRoute({ children })       // Admin role check
export function RoleGuard({ children, allowedRoles })
export function ModuleGuard({ children, moduleKey })
export function FeatureGuard({ children, featureKey })
6.5 Admin Role Hierarchy
// typescript
// Admin roles (from most to least privileged):
// - Super Admin (full system access)
// - Application Admin (tenant-level management)
// - Developer Admin (platform operations, bypasses all restrictions)
────────────────────────────────────────────────────────────────────────────────
7. Database & Storage Layer
7.1 Recommended Data Storage Architecture
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STORAGE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PostgreSQL (Primary)                                           │
│  ├── Users & Roles                                              │
│  ├── Audit Logs & Events                                       │
│  ├── Business Domain Data                                      │
│  ├── Feature Configuration                                     │
│  └── Application Settings                                      │
│                                                                  │
│  Vector Database (Search)                                       │
│  ├── Semantic Embeddings                                        │
│  ├── Hybrid Search (Keyword + Vector)                           │
│  └── RAG Grounding for AI Responses                             │
│                                                                  │
│  Redis (Cache + Queue)                                          │
│  ├── Session Cache                                              │
│  ├── API Response Cache                                         │
│  ├── Task Queue (Celery/Bull)                                   │
│  ├── Pub/Sub for Real-Time Events                               │
│  └── In-Memory Fallback (graceful degradation)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
7.2 SQLAlchemy Model Pattern
// python
# backend/app/models/base.py
 
import uuid, datetime
from sqlalchemy import Column, String, Boolean, DateTime
 
def _uuid() -> str:
    return uuid.uuid4().hex
 
class BaseModel(Base):
    __abstract__ = True
 
    id = Column(String, primary_key=True, index=True, default=_uuid)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
 
# backend/app/models/user.py
class User(BaseModel):
    __tablename__ = "users"
 
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="viewer")
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
7.3 Async Database Session
// python
# backend/app/db/session.py
 
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
 
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.SQL_ECHO,
)
 
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
 
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
────────────────────────────────────────────────────────────────────────────────
8. Deployment & Operations
8.1 Multi-Stage Docker Build Pattern
// dockerfile
# Stage 1: Builder
FROM python:3.11-slim AS builder
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .
 
# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
# Copy only installed packages (no build tools)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
# Create non-root user for security
RUN groupadd -r app && useradd -r -g app -d /app app && chown -R app:app /app
USER app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
8.2 Production Configuration
// yaml
# docker-compose.prod.yml overrides
services:
  backend:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 4G
  frontend:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
  worker:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 4G
8.3 Health Check Endpoints
┌───────────────┬───────────────────┬──────────────────────────────┐
│ Endpoint      │ Purpose           │ Check Method                 │
├───────────────┼───────────────────┼──────────────────────────────┤
│ /             │ Root health check │ Returns {"status": "online"} │
│ /health       │ Backend health    │ DB + Redis + VectorDB status │
│ /health/ready │ Readiness         │ All dependencies connected   │
│ /metrics      │ Prometheus        │ Structured metrics           │
└───────────────┴───────────────────┴──────────────────────────────┘
8.4 Logging Configuration
// python
# Structured JSON logging pattern
{
    "timestamp": "2026-07-21T12:00:00Z",
    "level": "INFO",
    "service": "backend",
    "message": "GET /api/resource -> 200 (45ms)",
    "request_id": "abc123",
    "user_id": "user@example.com",
    "duration_ms": 45
}
# Log rotation: 10MB max per file, 3 files retained
8.5 Startup Boot Sequence Pattern
1. Configure logging & stdio
2. Connect to database, run migrations
3. Seed initial/admin user accounts
4. Start background audit/logging service
5. Register connectors/integrations
6. Load feature configuration
7. Start scheduler for periodic tasks
8. Start WebSocket event broadcast loop (30s interval)
9. Warm caches (background)
10. Run startup health check
11. ✅ Accept requests
────────────────────────────────────────────────────────────────────────────────
9. Design Patterns & Best Practices
9.1 Key Patterns for Production Applications
┌────────────────────────┬──────────────────────────────────┬────────────────────────────────────────────────────┐
│ Pattern                │ Where to Use                     │ Why                                                │
├────────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┤
│ Lazy Loading           │ All routes via React.lazy()      │ Code splitting, faster initial load                │
│ Parallel Fetch         │ Promise.all() in load functions  │ Reduces waterfall, faster data loading             │
│ Stale-While-Revalidate │ Redis cache get_or_refresh()     │ Serves stale data + refreshes in background        │
│ Graceful Degradation   │ Redis fallback to in-memory      │ App never crashes when cache is down               │
│ Background Tasks       │ asyncio.create_task() at startup │ API starts immediately, warming happens in bg      │
│ Exponential Backoff    │ WebSocket reconnection           │ Prevents reconnect storms                          │
│ SSE Pub/Sub            │ Event manager class              │ Decouples event producers from WebSocket consumers │
│ Role Normalization     │ Normalize role strings           │ Flexible role matching with partial strings        │
│ Module Registry        │ Centralized module definitions   │ Single source of truth for feature governance      │
│ Guard Components       │ Route guards                     │ Declarative access control                         │
└────────────────────────┴──────────────────────────────────┴────────────────────────────────────────────────────┘
9.2 Real-Time Data Maturity Model
┌──────────────┬──────────────────────────────────────┬─────────────────┬───────────────────────────────┐
│ Level        │ Pattern                              │ Update Interval │ Use Case                      │
├──────────────┼──────────────────────────────────────┼─────────────────┼───────────────────────────────┤
│ 1. Polling   │ setInterval(fetch, 30000)            │ 30s             │ Non-critical dashboards       │
│ 2. WebSocket │ Persistent connection + event stream │ Real-time       │ Live data panels              │
│ 3. Hybrid    │ WebSocket + polling                  │ Real-time + 30s │ Critical + fallback           │
│ 4. Broadcast │ SSE event manager                    │ Event-driven    │ System health, status changes │
└──────────────┴──────────────────────────────────────┴─────────────────┴───────────────────────────────┘
9.3 Frontend Component Architecture Pattern
// typescript
// 1. Shared UI Components (reusable)
function StatCard({ label, value, icon, color, subtitle, trend })
function Section({ title, description, children })
function DetailModal({ open, onClose, title, children })
function LiveIndicator({ connected })
function StatusBadge(status)
function FormatDate(d)
 
// 2. Auth Headers Pattern
function authHeaders() {
  const token = getAuthToken();
  const userId = getUserId();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : undefined,
    'X-User-Id': userId,
  };
}
 
// 3. Panel Component Pattern
function SomeDataPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
 
  const load = async () => {
    try {
      const res = await fetch('/api/endpoint', { headers: authHeaders() });
      const result = await res.json();
      setData(result);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
 
  // Initial load + 30-second polling
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);
 
  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState />;
  return (
    <div>
      <h2>Title <LiveIndicator /></h2>
      <p>Last refreshed: {lastUpdated && new Date(lastUpdated).toLocaleTimeString()}</p>
      {data.items.map(item => <Card key={item.id}>{item}</Card>)}
    </div>
  );
}

10. Building Your Own Application
10.1 Step-by-Step Implementation Guide
Phase 1: Foundation (Week 1-2)
// bash
# 1. Setup monorepo structure
mkdir -p frontend backend tests docs
 
# 2. Initialize frontend
cd frontend
npm create vite@latest . --template react-ts
npm install
npm install react-router-dom framer-motion lucide-react axios tailwindcss
 
# 3. Initialize backend
cd ../backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy asyncpg pydantic-settings python-jose bcrypt
 
# 4. Setup infrastructure (Docker Compose)
# docker-compose.yml with: PostgreSQL, Redis
Phase 2: Core API (Week 2-3)
- app/main.py (entry point with lifespan)
- app/core/config.py (Pydantic Settings for env vars)
- app/core/auth.py (JWT + role-based auth)
- app/db/session.py (Async SQLAlchemy)
- First 5-10 REST endpoints
- Basic CRUD for users
Phase 3: Frontend Shell (Week 3-4)
- App.tsx with React Router
- Main layout with sidebar/topbar
- Authentication flow (login → JWT → redirect)
- Dashboard shell with placeholder cards
- 5-10 lazy-loaded routes
Phase 4: Real-Time Features (Week 4-5)
- WebSocket endpoint on backend
- SSE Event Manager
- useWebSocket hook on frontend
- LiveIndicator component
- 30-second polling pattern
- First panel with live data
Phase 5: Modules & Features (Week 5+)
- Module registry (config/moduleRegistry.ts)
- Role-based access (config/moduleAccess.ts)
- Route guards (RequireAuth, RoleGuard, ModuleGuard)
- Feature-specific panels with live data
- Admin dashboard
10.2 Architecture Checklist
[ ] Monorepo with  frontend/ ,  backend/ ,  tests/ ,  docs/ 
[ ] Docker Compose for local development
[ ] Multi-stage Dockerfile for production builds
[ ] Environment variables via  .env  (gitignored) +  .env.example 
[ ] Async database with connection pooling
[ ] Redis for caching + task queue + pub/sub
[ ] JWT authentication with role-based access
[ ] Module registry for feature governance
[ ] WebSocket for real-time data streaming
[ ] 30s polling as fallback for real-time
[ ] Graceful degradation (cache → in-memory fallback)
[ ] Background tasks for startup warmup + periodic refresh
[ ] Health check endpoints ( /health ,  /health/ready )
[ ] Structured JSON logging with rotation
[ ] Rate limiting middleware
[ ] Prometheus metrics endpoint
[ ] Lazy-loaded routes for code splitting
[ ] CORS configuration for production origins
[ ] Non-root Docker user for security
[ ] Pagination on all list endpoints
10.3 LLM Integration Quick Start
// python
# 1. Configure (backend/.env)
# OpenAI-compatible endpoint (works with OpenAI, Groq, Cerebras, 
# DeepSeek, Together, Ollama, or any custom server)
OPENAI_API_KEY=your-key-here
OPENAI_BASE_URL=http://your-llm-server:8000/v1
LLM_MODEL_NAME=your-model-name
LLM_MAX_OUTPUT_TOKENS=8192
 
# 2. Config class (backend/app/core/config.py)
class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    LLM_MODEL_NAME: Optional[str] = None
    LLM_MAX_OUTPUT_TOKENS: int = 2048
 
settings = Settings()
 
# 3. LLM Service (backend/app/services/llm_service.py)
import httpx
 
class LLMService:
    async def generate(self, messages, model=None, max_tokens=2048, temperature=0.7):
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or settings.LLM_MODEL_NAME,
            "messages": messages,
            "max_tokens": max_tokens or settings.LLM_MAX_OUTPUT_TOKENS,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.OPENAI_BASE_URL}/chat/completions",
                headers=headers, json=payload,
            )
            resp.raise_for_status()
            return resp.json()
 
# 4. Use in any endpoint
llm_service = LLMService()
 
@app.post("/api/chat")
async def chat(request: ChatRequest):
    response = await llm_service.generate(request.messages)
    return {"content": response["choices"][0]["message"]["content"]}
10.4 Monitoring & Operations Checklist
[ ] Health checks on all services
[ ] Prometheus metrics endpoint
[ ] Rate limiting per endpoint
[ ] Structured logging with correlation IDs
[ ] Error tracking (Sentry or similar)
[ ] Uptime monitoring
[ ] Resource usage alerts (CPU, memory, disk)
[ ] Database backup strategy
[ ] Secrets rotation policy
[ ] Deployment rollback plan
────────────────────────────────────────────────────────────────────────────────
> This document is a living blueprint. A production-grade AI application needs: modular architecture, multiple real-time data strategies, robust auth/authorization, graceful degradation at every layer, and a startup sequence that prioritizes availability over completeness. Use this foundation to build your application with this architectural depth — or go beyond it.
