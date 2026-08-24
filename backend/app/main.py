import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import get_settings, validate_jwt_secret
from app.db.mongo import close_mongo_connection, connect_to_mongo
from app.db.asyncpg_pool import close_asyncpg, connect_asyncpg
from app.routes.admin import router as admin_router
from app.routes.alerts import router as alerts_router
from app.routes.ai import router as ai_router
from app.routes.ambulance import router as ambulance_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.donors import router as donors_router
from app.routes.family import router as family_router
from app.routes.government_ops import router as government_ops_router
from app.routes.health import router as health_router
from app.routes.hospital_communication import router as hospital_communication_router
from app.routes.hospital_ml import router as hospital_ml_router
from app.routes.hospital_ops import router as hospital_ops_router
from app.routes.hospital_ops_discharge import router as hospital_ops_discharge_router
from app.routes.compliance import router as compliance_router
from app.routes.requests import router as requests_router
from app.routes.v2.agents import router as agents_v2_router
from app.routes.v2.analytics import router as analytics_v2_router
from app.routes.v2.ambulance import router as ambulance_v2_router
from app.routes.v2.ai_platform import router as ai_platform_v2_router
from app.routes.v2.auth import router as auth_v2_router
from app.routes.v2.gateway import router as gateway_v2_router
from app.routes.v2.government import router as government_v2_router
from app.routes.v2.government_command import router as government_command_v2_router
from app.routes.v2.hospital import router as hospital_v2_router
from app.routes.v2.integrations import router as integrations_v2_router
from app.routes.v2.ml import router as ml_v2_router
from app.routes.v2.modules import router as modules_v2_router
from app.routes.v2.notifications import router as notifications_v2_router
from app.routes.v2.public import router as public_v2_router
from app.routes.v2.rag import router as rag_v2_router
from app.routes.v2.realtime import router as realtime_v2_router
from app.routes.v2.routing import router as routing_v2_router
from app.routes.v2.search import router as search_v2_router
from app.routes.v2.users import router as users_v2_router
from app.routes.v2.system import router as system_v2_router
from app.routes.v2.simulation import router as simulation_v2_router
from app.routes.v2.history import router as history_v2_router
from app.routes.v2.enterprise_auth import router as enterprise_auth_v2_router
from app.routes.v2.lifelink_ai import router as lifelink_ai_v2_router
from app.routes.v2.government_auth import router as government_auth_v2_router
from app.routes.reports.reports import router as reports_router
from app.routes.gps_tracking import router as gps_tracking_router
from app.routes.ml_pipeline import router as ml_pipeline_router
from app.routes.backup import router as backup_router
from app.routes.status import router as status_router
from app.services.prometheus_metrics import PrometheusMiddleware, get_metrics

# ─── Structured JSON Logging ───────────────────────────────
class JsonFormatter(logging.Formatter):
    """Format log records as structured JSON with correlation IDs."""
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt or "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

logger = logging.getLogger("lifelink.fastapi")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger.handlers.clear()
logger.addHandler(handler)

# Silence noisy libs
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

settings = get_settings()

# Initialize Sentry error monitoring (only if DSN is configured)
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=settings.sentry_traces_sample_rate,
        environment=settings.app_env,
        send_default_pii=False,
    )
    logger.info("Sentry error monitoring initialized")


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_jwt_secret()
    logger.info("Starting %s in %s mode", settings.app_name, settings.app_env)
    await connect_to_mongo()
    await connect_asyncpg()
    logger.info("PostgreSQL connection initialized")
    yield
    await close_asyncpg()
    await close_mongo_connection()
    logger.info("PostgreSQL connection closed")


app = FastAPI(
    title="LifeLink — AI-Powered Emergency Healthcare Platform",
    description="""
## LifeLink Backend API

Comprehensive API for AI-powered emergency healthcare management across India.

### 🏥 Core Capabilities
- **Hospital Operations** — CEO dashboard, Emergency, ICU, OPD, OT, Radiology, Finance, Staff, Beds, Equipment
- **Ambulance Services** — Real-time dispatch, GPS tracking, navigation AI, patient monitoring
- **Government Command** — Disaster management, intelligence, simulation, policy, resource allocation
- **AI/ML Platform** — 28 trained models for healthcare predictions, triage, and optimization

### 🔐 Authentication
- **MongoDB Auth** (v1) — Hospital, Ambulance, Public users via `/api/auth/`
- **Enterprise Auth** (v2) — Hospital department workspaces via `/v2/enterprise/auth/`
- **Government Auth** (v2) — Government organizations via `/v2/gov/auth/`

### 🛡️ Security
- JWT token authentication with role-based access control
- Fernet AES-128 encryption for patient data at rest
- PII data masking and sanitization
- Rate limiting and audit trail

### 📊 Monitoring
- Prometheus metrics at `/metrics`
- Grafana dashboards at port 3000
- Real-time WebSocket updates across all dashboards

### 🗺️ GPS Tracking
- Software-based ambulance GPS simulation (no hardware required)
- Realistic Bangalore routes with traffic and weather effects
""",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {"name": "health", "description": "Health check and system status"},
        {"name": "auth", "description": "User authentication (login, signup, JWT tokens)"},
        {"name": "enterprise-auth", "description": "Hospital department workspace authentication"},
        {"name": "government-auth", "description": "Government organization authentication (ABDM-aligned)"},
        {"name": "ambulance", "description": "Ambulance dispatch, tracking, and assignments"},
        {"name": "hospital-ops", "description": "Hospital operations — CEO, Emergency, ICU, OPD, OT, Radiology, Finance, Staff, Beds, Equipment"},
        {"name": "discharge", "description": "Patient discharge workflow, readiness, and summaries"},
        {"name": "government-ops", "description": "Government operations — hospitals, emergencies, resources"},
        {"name": "government", "description": "Government V2 — disasters, monitoring, predictions, policies"},
        {"name": "government-command", "description": "Government command center — overview, broadcast, decisions"},
        {"name": "Simulation", "description": "Disaster simulation engine — run, step, stop, after-action reviews"},
        {"name": "compliance", "description": "Data compliance — encryption, PII masking, HIPAA, NDHM"},
        {"name": "gps-tracking", "description": "GPS ambulance tracking simulation — positions, routes, stats"},
        {"name": "realtime", "description": "WebSocket connections and real-time event streaming"},
        {"name": "ai", "description": "AI chat, insights, and hospital ML predictions"},
        {"name": "ai-platform", "description": "AI platform — model management, inference, analytics"},
        {"name": "ml", "description": "Machine learning model serving and predictions"},
        {"name": "LifeLink AI", "description": "LifeLink AI chat assistant (isolated from public AI)"},
        {"name": "rag", "description": "Retrieval-Augmented Generation for medical knowledge"},
        {"name": "integrations", "description": "External integrations — maps, traffic, weather, geocoding"},
        {"name": "routing", "description": "Route optimization for ambulances"},
        {"name": "agents", "description": "Multi-agent AI system for healthcare coordination"},
        {"name": "notifications", "description": "Push notifications and alert management"},
        {"name": "reports", "description": "Report generation and analytics exports"},
        {"name": "search", "description": "Full-text search across all entities"},
        {"name": "modules", "description": "Module configuration and management"},
        {"name": "analytics", "description": "Analytics dashboards and data pipelines"},
        {"name": "users", "description": "User profile management"},
        {"name": "system", "description": "System administration and cache management"},
        {"name": "gateway", "description": "API gateway — versioning, rate limiting"},
        {"name": "history", "description": "Activity timeline and audit history"},
        {"name": "public", "description": "Public endpoints (no auth required)"},
        {"name": "admin", "description": "Admin operations — user management, system config"},
        {"name": "alerts", "description": "Alert management and notification dispatch"},
        {"name": "dashboard", "description": "Dashboard data aggregation"},
        {"name": "donors", "description": "Blood/organ donor management"},
        {"name": "family", "description": "Family monitoring and patient tracking"},
        {"name": "hospital-communication", "description": "Inter-hospital communication and messaging"},
        {"name": "hospital-ml", "description": "Hospital-specific ML models and predictions"},
        {"name": "requests", "description": "Internal request management"},
    ],
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics middleware
app.add_middleware(PrometheusMiddleware)


# ─── Request ID Middleware ────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(health_router)
app.include_router(health_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(ambulance_router, prefix="/api/ambulance")
app.include_router(requests_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(donors_router, prefix="/api")
app.include_router(family_router, prefix="/api/family")
app.include_router(government_ops_router, prefix="/api/government-ops")
app.include_router(hospital_communication_router, prefix="/api/hospital-communication")
app.include_router(hospital_ml_router, prefix="/api/hospital")
app.include_router(hospital_ml_router, prefix="/api/hosp")
app.include_router(hospital_ops_router, prefix="/api/hospital-ops")
app.include_router(hospital_ops_discharge_router, prefix="/api/hospital-ops")
app.include_router(compliance_router, prefix="/api")

# V2 modular service routes
app.include_router(gateway_v2_router, prefix="/v2")
app.include_router(auth_v2_router, prefix="/v2/auth")
app.include_router(users_v2_router, prefix="/v2/users")
app.include_router(hospital_v2_router, prefix="/v2/hospital")
app.include_router(ambulance_v2_router, prefix="/v2/ambulance")
app.include_router(government_v2_router, prefix="/v2/government")
app.include_router(government_command_v2_router, prefix="/v2/government")
app.include_router(agents_v2_router, prefix="/v2/agents")
app.include_router(notifications_v2_router, prefix="/v2/notifications")
app.include_router(integrations_v2_router, prefix="/v2/integrations")
app.include_router(ml_v2_router, prefix="/v2/ml")
app.include_router(rag_v2_router, prefix="/v2/rag")
app.include_router(routing_v2_router, prefix="/v2")
app.include_router(public_v2_router, prefix="/v2/public")
app.include_router(realtime_v2_router, prefix="/v2/realtime")
app.include_router(analytics_v2_router, prefix="/v2/analytics")
app.include_router(search_v2_router, prefix="/v2")
app.include_router(modules_v2_router, prefix="/v2/modules")
app.include_router(ai_platform_v2_router, prefix="/v2/ai")
app.include_router(system_v2_router, prefix="/v2/system")

# Report generation & simulation routes
app.include_router(reports_router, prefix="/api/reports")
app.include_router(simulation_v2_router, prefix="/v2/government")

# History / Activity Timeline routes
app.include_router(history_v2_router, prefix="/v2")

# Enterprise Auth routes (workspace RBAC)
app.include_router(enterprise_auth_v2_router, prefix="/v2")

# LifeLink AI — dedicated chat system (completely isolated from public AI)
app.include_router(lifelink_ai_v2_router, prefix="/v2")

# Government Auth routes (enterprise-grade authentication for government organizations)
app.include_router(government_auth_v2_router, prefix="/v2")

# GPS Tracking simulation routes
app.include_router(gps_tracking_router, prefix="/api/gps-tracking")

# ML Pipeline — model registry, versioning, and automated retraining
app.include_router(ml_pipeline_router, prefix="/v2/ml-pipeline")

# Backup & Restore — database backup management
app.include_router(backup_router, prefix="/api")

# Public status page (no auth required)
app.include_router(status_router)


# ─── Prometheus Metrics Endpoint ─────────────────────────
@app.get("/metrics")
async def metrics():
    return get_metrics()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation failed", "details": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
