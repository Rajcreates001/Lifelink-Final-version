# LifeLink — Smart Emergency Response and Coordination System

LifeLink is an AI-powered emergency response platform that coordinates citizens, ambulances, hospitals, and authorities in real time. It delivers fast decision support, live routing, predictive analytics, and role-based workflows with security-first design.

## Overview

LifeLink provides a unified emergency ecosystem:

- Citizens trigger SOS requests instantly
- Hospitals receive pre-arrival alerts and ETAs
- Ambulances stream live location and route updates
- Authorities monitor hotspots and run AI-assisted analytics
- ML models and LLM-backed AI assist triage and planning

## Highlights

- LLM assistant with low-latency responses (Groq or any OpenAI-compatible endpoint)
- Real-time routing, traffic, and ETA insights
- Role-based dashboards for public, hospital, ambulance, government
- AI platform layer with inference, feature store, registry, and observability
- Rate limiting on authentication and AI endpoints
- Audit hash chain for tamper-evident system logging
- RAG semantic search with FAISS + SentenceTransformers
- Authenticated WebSocket streams for live operations

## Architecture

### Frontend

- React 19 + Vite single-page app (JavaScript, JSX)
- Role-protected routes and dashboard tabs
- Leaflet maps for live tracking and routing visualization
- Recharts for analytics visualizations

### Backend

- FastAPI + Uvicorn REST APIs (v1 + v2 service routes)
- PostgreSQL with SQLAlchemy (async) + asyncpg, document-style JSONB storage
- Alembic for schema migrations (single source of truth)
- Celery + Redis for background tasks and async ML
- Prometheus metrics, optional Sentry error tracking
- SlowAPI rate limiting on sensitive endpoints

### AI and Data

- Groq or OpenAI-compatible LLM endpoint (server-side only)
- ML engine in `backend/ml/` with joblib models (LFS-tracked)
- FAISS local vector index in `backend/.rag/`
- LangGraph multi-agent orchestration

### Free/Open-Source Integrations

- Routing: OSRM (http://router.project-osrm.org)
- Geocoding: Nominatim (OpenStreetMap)
- Weather: Open-Meteo (https://api.open-meteo.com)
- Maps: Leaflet + OpenStreetMap tiles

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| UI and Charts | Recharts, Lucide, Leaflet |
| Maps and Geo | Leaflet, React-Leaflet, OpenStreetMap tiles, Nominatim |
| Backend | FastAPI, Uvicorn, pydantic-settings |
| Async and Jobs | Celery, Redis |
| Database | PostgreSQL 15, SQLAlchemy 2.0 (async), Alembic |
| Auth and Security | JWT (PyJWT), bcrypt, RBAC + scopes, SlowAPI rate limiting |
| AI and ML | Groq / OpenAI-compatible API, pandas, numpy, scikit-learn, joblib |
| Agent Orchestration | LangGraph |
| Vector Search | FAISS, SentenceTransformers |
| Realtime | WebSockets (FastAPI, token-authenticated) |
| Monitoring | Prometheus, Grafana, optional Sentry |
| Routing and Weather | OSRM, Open-Meteo |

## Feature Map

### Public

- SOS emergency trigger with hospital matching
- Personal health dashboard and history
- Health risk prediction and anomaly cues
- Medical record analysis and summaries
- Donor matching and availability signals
- Nearby hospitals with ETA overlays
- Family monitoring with alerts
- LifeLink AI search and summaries

### Hospital

- Executive overview and AI insights
- Department analytics, bed management, and allocation
- Resource management and inventory forecasting
- Ambulance coordination and routing overlays
- Finance summaries, claims tracking, and analytics
- Staff roster and scheduling support
- Reports and compliance summaries
- Multi-hospital communication and mutual aid
- Live emergency feed and intake workflows

### Ambulance

- Assignment management and live navigation
- Location tracking with ETA updates
- Patient handoff summaries
- Incident escalation support
- Response history and performance stats

### Government

- National/state/district dashboards
- Emergency heatmaps and hotspot tracking
- Resource allocation and capacity signals
- Policy insights and compliance monitoring
- Audit visibility and reporting

## AI Platform (v2)

- Event streaming: `/v2/ai/events/publish`, `/v2/ai/events/{stream}`
- Feature store: `/v2/ai/features/{entity_type}/{entity_id}`
- Model registry: `/v2/ai/registry`
- Retrieval index: `/v2/ai/retrieval/ingest`, `/v2/ai/retrieval/search`
- Observability: `/v2/ai/observability`
- Privacy: `/v2/ai/privacy/redact`, `/v2/ai/privacy/scan`
- Synthetic data: `/v2/ai/synthetic/bootstrap`
- Inference: `/v2/ai/infer`, `/v2/ai/tasks/{task_key}/infer`

## ML Models Used

The ML engine uses joblib models located in `backend/ml/` (about 20 trained models):

- health_risk_model.joblib
- emergency_severity_model.joblib
- emergency_hotspot_model.joblib
- eta_model.joblib
- bed_forecast_model.joblib
- hospital_recommendation_model.joblib
- inventory_prediction_model.joblib
- staff_allocation_model.joblib
- donor_availability_model.joblib
- compatibility_model.joblib
- recovery_model.joblib
- stay_duration_model.joblib
- policy_segmentation_model.joblib
- outbreak_forecast_models.joblib
- anomaly_detection_model.joblib
- activity_cluster_model.joblib
- allocation_q_table.joblib
- emergency_classifier.joblib
- behavior_forecast_model.joblib
- …and more (see `backend/ml/`)

## Safety, Privacy, and Security

- JWT authentication with role-based access control and scopes
- Refresh token rotation (`POST /v2/auth/refresh`)
- Rate limiting on auth and AI endpoints (SlowAPI, Redis-backed)
- WebSocket connections require token authentication as the first message
- Anonymization for emergency payloads
- Redaction endpoints for sensitive data
- Audit hash chain for tamper-evident logs
- Input validation with FastAPI + pydantic
- Security headers on the frontend proxy (CSP, X-Frame-Options, HSTS)
- `/metrics` is NOT exposed through the frontend proxy (scrape internally)
- Strict error handling with consistent JSON responses
- Server-side AI calls only (API keys never exposed to the frontend)
- Secret scanning (gitleaks) and dependency updates (Dependabot) in CI

## Realtime WebSockets

WebSocket channels (token auth required as first message):

- `ws://localhost:3001/v2/realtime/ws/ambulance`
- `ws://localhost:3001/v2/realtime/ws/hospital`
- `ws://localhost:3001/v2/realtime/ws/alerts`
- `ws://localhost:3001/v2/realtime/ws/government`
- `ws://localhost:3001/v2/realtime/ws/ai`

HTTP publish helpers (require scopes):

- `POST /v2/realtime/ambulance-update`
- `POST /v2/realtime/hospital-update`
- `POST /v2/realtime/alert`
- `POST /v2/realtime/government-update`
- `POST /v2/realtime/publish` (generic channel publish)

## Project Structure

```text
LifeLink/
|-- client/                     # React frontend
|   |-- src/
|   |   |-- pages/              # Route-level screens
|   |   |-- components/         # Dashboard feature components
|   |   |-- context/            # Auth context
|   |   |-- config/api.js       # API base URL
|
|-- backend/                    # FastAPI backend
|   |-- app/                    # API routes and services
|   |   |-- routes/             # v1 routes
|   |   |-- routes/v2/          # Modular v2 service routes
|   |   |-- services/agents/    # LangGraph orchestration
|   |   |-- services/rag/       # FAISS + embeddings
|   |   |-- services/realtime/  # WebSocket manager
|   |-- alembic/                # DB migrations (source of truth)
|   |-- ml/                     # ML engine + models (LFS-tracked)
|   |-- scripts/                # Seeding and import utilities
|
|-- tests/                      # Unit, security, privacy, e2e tests
|-- scripts/                    # Ops scripts (entrypoint, backups, e2e)
|-- monitoring/                 # Prometheus + Grafana configs
|-- docs/                       # Architecture and archived docs
|-- docker-compose.yml          # Local development stack
|-- docker-compose.prod.yml     # Production override (no bind mounts)
|-- docker-compose.staging.yml  # Staging stack
```

## Quick Start (Docker)

**Requires:** Docker Desktop (includes Docker Compose)

```bash
git clone https://github.com/Rajcreates001/Lifelink-Final-version.git
cd Lifelink-Final-version
docker compose up -d --build postgres redis backend frontend
```

Open **http://localhost:5000** — everything works out of the box.

**No manual database setup needed.** The backend entrypoint waits for Postgres/Redis, applies Alembic migrations, and seeds demo users (skipped automatically when `APP_ENV=production`).

For the complete setup guide (ports, credentials, troubleshooting, data migration): **[SETUP.md](SETUP.md)**

## Environment Variables

Docker handles most environment variables automatically via `docker-compose.yml`. For local development without Docker, copy `.env.example` to `backend/.env` and fill in values — see [SETUP.md](SETUP.md#local-development-without-docker).

| Variable | Docker Default | Description |
|----------|---------------|-------------|
| `POSTGRES_URL` | `postgresql+asyncpg://postgres:postgres@postgres:5432/lifelink_db` | PostgreSQL connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `JWT_SECRET` | `change_me_before_deploy` (must override in prod) | JWT signing secret |
| `PRIVACY_SALT` | `change_me_before_deploy` (must override in prod) | Data anonymization salt |
| `LLM_PROVIDER` | `groq` | `groq` or `openai` (OpenAI-compatible) |
| `GROQ_API_KEY` | — | Groq API key (if provider is groq) |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | — | OpenAI-compatible endpoint (if provider is openai) |
| `SIE_ENABLED` | `false` | AI embeddings service (opt-in via `--profile ai`) |
| `RATE_LIMIT_ENABLED` | `true` | Toggle rate limiting |

## Data Import and Seeding

**Automatic (development/staging only):** the backend entrypoint applies Alembic migrations and seeds 370+ demo users, 79 departments, 48 roles, 108 permissions. Seeding is skipped when `APP_ENV=production` — run bootstrap manually there if you want demo data.

**Manual (if needed):**

```bash
# Re-run migrations
docker exec lifelink-backend alembic upgrade head

# Re-run bootstrap (idempotent — skips if data exists)
docker exec lifelink-backend python scripts/bootstrap_database.py

# Import hospital locations from CSV
docker exec lifelink-backend python scripts/import_hospital_locations.py --input /path/to/hospitals.csv --drop
```

For data migration from another database, see [SETUP.md](SETUP.md#migrating-data-from-another-database).

## Automated Backups

The production stack (`docker-compose.prod.yml`) includes a `postgres-backup` service that dumps the database nightly (02:30) to the `postgres_backups` volume and prunes backups older than 14 days.

Manual backup/restore scripts are in `scripts/backup_postgres.sh` and `scripts/restore_postgres.sh`.

## Deployment

### Docker (recommended)

```bash
# Development
docker compose up -d --build

# Production (no source bind mounts, auto backups)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Set real `JWT_SECRET`, `PRIVACY_SALT`, and `FRONTEND_URL` values in your environment or `.env` file before deploying.

## Testing

```bash
# Backend unit/security/privacy tests
cd backend && python -m pytest tests -x -q

# Frontend unit tests
cd client && npm test

# E2E API tests (requires running backend)
python scripts/run_e2e_tests.py
```

## Use Cases

- Road accidents
- Cardiac emergencies
- Stroke response
- Elderly care escalation
- Smart city emergency command workflows

## Author

Maharaj
B.E. CSE - Sahyadri College of Engineering
