# LifeLink - Smart Emergency Response and Coordination System

LifeLink is an AI-powered emergency response platform that coordinates citizens, ambulances, hospitals, and authorities in real time. It delivers fast decision support, live routing, predictive analytics, and role-based workflows with security-first design.

## Overview

LifeLink provides a unified emergency ecosystem:

- Citizens trigger SOS requests instantly
- Hospitals receive pre-arrival alerts and ETAs
- Ambulances stream live location and route updates
- Authorities monitor hotspots and run AI-assisted analytics
- ML models and Groq-powered AI assist triage and planning

## Highlights

- Groq-backed AI assistant with low-latency responses
- Real-time routing, traffic, and ETA insights
- Role-based dashboards for public, hospital, ambulance, government
- AI platform layer with inference, feature store, registry, and observability
- Federated learning flows with differential privacy
- Audit hash chain for tamper-evident system logging
- RAG semantic search with FAISS + SentenceTransformers
- WebSocket streams for live operations

## Architecture

### Frontend

- React + Vite single-page app
- Role-protected routes and dashboard tabs
- Leaflet maps for live tracking and routing visualization

### Backend

- FastAPI + Uvicorn REST APIs (legacy + v2 service routes)
- PostgreSQL with asyncpg + SQLAlchemy
- Celery + Redis for background tasks and async ML
- WebSocket streams for realtime updates

### AI and Data

- Groq API for LLM responses
- ML engine in backend/ml/ai_ml.py with joblib models
- FAISS local vector index in backend/.rag
- LangGraph multi-agent orchestration

### Free/Open-Source Integrations

- Routing: OSRM (http://router.project-osrm.org)
- Geocoding: Nominatim (OpenStreetMap)
- Weather: Open-Meteo (https://api.open-meteo.com)
- Maps: Leaflet + OpenStreetMap tiles

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19, Vite, React Router |
| UI and Charts | Recharts, Chart.js, react-chartjs-2, Lucide |
| Maps and Geo | Leaflet, React-Leaflet, OpenStreetMap tiles, Nominatim |
| Networking | Axios (client), httpx (server) |
| Backend | FastAPI, Uvicorn, pydantic-settings |
| Async and Jobs | Celery, Redis |
| Database | PostgreSQL, SQLAlchemy, asyncpg |
| Auth and Security | JWT (PyJWT), bcrypt, RBAC + scopes |
| AI and ML | Groq API, pandas, numpy, scikit-learn, joblib, prophet, networkx |
| Agent Orchestration | LangGraph |
| Vector Search | FAISS, SentenceTransformers |
| Realtime | WebSockets (FastAPI) |
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

- Event streaming: /v2/ai/events/publish, /v2/ai/events/{stream}
- Feature store: /v2/ai/features/{entity_type}/{entity_id}
- Model registry: /v2/ai/registry
- Retrieval index: /v2/ai/retrieval/ingest, /v2/ai/retrieval/search
- Observability: /v2/ai/observability
- Privacy: /v2/ai/privacy/redact, /v2/ai/privacy/scan
- Synthetic data: /v2/ai/synthetic/bootstrap
- Inference: /v2/ai/infer, /v2/ai/tasks/{task_key}/infer

## ML Models Used

The ML engine uses joblib models located in backend/ml:

- health_risk_model.joblib
- emergency_severity_model.joblib
- emergency_hotspot_model.joblib
- eta_model.joblib
- bed_forecast_model.joblib
- hospital_severity_model.joblib
- hospital_disease_models.joblib
- hospital_recommendation_model.joblib
- hospital_performance_model.joblib
- healthcare_performance_model.joblib
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

## Safety, Privacy, and Security

- JWT authentication with role-based access control and scopes
- Differential privacy for federated learning weights
- Anonymization for emergency payloads
- Redaction endpoints for sensitive data
- Audit hash chain for tamper-evident logs
- Input validation with FastAPI + pydantic
- Strict error handling with consistent JSON responses
- Server-side AI calls only (Groq key never exposed to frontend)

## Realtime WebSockets

WebSocket channels:

- ws://localhost:3010/v2/realtime/ws/ambulance
- ws://localhost:3010/v2/realtime/ws/hospital
- ws://localhost:3010/v2/realtime/ws/alerts
- ws://localhost:3010/v2/realtime/ws/government
- ws://localhost:3010/v2/realtime/ws/ai

HTTP publish helpers:

- POST /v2/realtime/ambulance-update
- POST /v2/realtime/hospital-update
- POST /v2/realtime/alert
- POST /v2/realtime/government-update

## Project Structure

```text
LifeLink-MERN-v4/
|-- client/                     # React frontend
|   |-- src/
|   |   |-- pages/              # Route-level screens
|   |   |-- components/         # Dashboard feature components
|   |   |-- context/            # Auth context
|   |   |-- config/api.js       # API base URL
|
|-- backend/                    # FastAPI backend
|   |-- app/                    # API routes and services
|   |   |-- routes/             # Legacy routes
|   |   |-- routes/v2/          # Modular service routes
|   |   |-- services/agents/    # LangGraph orchestration
|   |   |-- services/rag/       # FAISS + embeddings
|   |   |-- services/realtime/  # WebSocket manager
|   |-- .rag/                   # Local RAG index data
|   |-- ml/                     # ML engine + datasets
|   |-- scripts/                # Seeding and import utilities
|
|-- tests/                      # Parity and smoke tests
|-- docker-compose.yml          # Local deployment stack definition
|-- .dockerignore               # Docker build ignore rules
```

## Quick Start (Docker)

**Requires:** Docker Desktop (includes Docker Compose)

```bash
git clone https://github.com/Rajcreates001/Lifelink-Final-version.git
cd Lifelink-Final-version
docker compose up -d --build postgres redis backend frontend
```

Open **http://localhost:5000** — everything works out of the box.

**No manual database setup needed.** The backend auto-creates tables and seeds 370+ demo users on first start.

For the complete setup guide (ports, credentials, troubleshooting, data migration): **[SETUP.md](SETUP.md)**

## Environment Variables

Docker handles all environment variables automatically via `docker-compose.yml`. No `.env` files needed for Docker.

For local development without Docker, see [SETUP.md](SETUP.md#local-development-without-docker).

| Variable | Docker Default | Description |
|----------|---------------|-------------|
| `POSTGRES_URL` | `postgresql+asyncpg://postgres:postgres@postgres:5432/lifelink_db` | PostgreSQL connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `JWT_SECRET` | `change_me_before_deploy` | JWT signing secret |
| `SIE_ENABLED` | `false` | AI embeddings (disabled by default) |
| `LLM_PROVIDER` | `openai` | LLM backend |

## Data Import and Seeding

**Automatic:** When you run `docker compose up`, the backend entrypoint automatically:
1. Creates all database tables from `backend/scripts/schema.sql`
2. Seeds 370+ demo users, 79 departments, 48 roles, 108 permissions
3. Seeds government auth and hospital module data

**Manual (if needed):**

```bash
# Re-run bootstrap (idempotent — skips if data exists)
docker exec lifelink-backend python scripts/bootstrap_database.py

# Import hospital locations from CSV
docker exec lifelink-backend python scripts/import_hospital_locations.py --input /path/to/hospitals.csv --drop
```

For data migration from another database, see [SETUP.md](SETUP.md#migrating-data-from-another-database).

## Deployment

### Cloud Deployment

- **Backend**: [render.yaml](render.yaml) defines the Render service. The backend auto-bootstraps schema and seeds demo data on first start.
- **Frontend**: Deploy to Vercel. Set `VITE_API_URL` to your backend URL.
- **Docker**: `docker compose up -d --build` works on any machine with Docker installed.

### Notes

- Redis is used for caching and Celery task queuing.
- All AI calls run through the FastAPI backend; API keys are never exposed to the frontend.
- SIE (AI embeddings) is disabled by default and behind a Docker profile to save resources.

## Testing

```bash
python -m pytest tests
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
