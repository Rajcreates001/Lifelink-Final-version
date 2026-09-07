# LifeLink — Architecture (as built)

> This document describes LifeLink **as actually implemented**. Historical/blueprint docs live in `docs/archive/`.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                FRONTEND (React 19 + Vite, JS/JSX)           │
│  Role dashboards: Public / Hospital / Ambulance / Government│
│  Leaflet maps · Recharts analytics · i18next                │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (fetch) + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                NGINX (client/Dockerfile)                    │
│  Static SPA + reverse proxy /api,/v2,/ws → backend:3001     │
│  Security headers, no /metrics exposure                     │
└──────────────────────────┬──────────────────────────────────┘
┌──────────────────────────▼──────────────────────────────────┐
│                BACKEND (FastAPI, port 3001)                 │
│  42 v1 routers + 27 v2 routers · SlowAPI rate limiting      │
│  JWT auth (HS256) + RBAC/scopes · refresh token rotation    │
│  Prometheus middleware · structured JSON logs + request IDs │
│  Token-authenticated WebSockets (/v2/realtime/ws/{channel}) │
└───────┬──────────────────┬───────────────────┬──────────────┘
        │                  │                   │
┌───────▼──────┐   ┌───────▼───────┐   ┌───────▼─────────────┐
│ PostgreSQL 15│   │   Redis 7     │   │ Celery worker/beat  │
│ SQLAlchemy   │   │ cache + Celery│   │ async ML + schedules│
│ async + JSONB│   │ broker        │   │                     │
└──────────────┘   └───────────────┘   └─────────────────────┘

External: Groq/OpenAI-compatible LLM · OSRM routing · Nominatim
geocoding · Open-Meteo weather · optional SIE embeddings · Sentry
```

## Key Decisions

| Decision | Choice | Notes |
|---|---|---|
| Frontend framework | React 19 + Vite (JavaScript) | JSX, no TypeScript currently |
| Styling | Tailwind CSS 3 | |
| Charts | Recharts | chart.js removed in consolidation |
| Backend | FastAPI + Uvicorn | single image serves API/worker/beat via entrypoint |
| Data layer | PostgreSQL, document-style JSONB via `MongoRepository` | legacy Mongo-style API over one `documents` table; relational redesign is a known debt item |
| Schema management | Alembic | single source of truth; `Base.metadata.create_all` only in development |
| Auth | JWT HS256, 60-min access tokens + refresh rotation | roles → scopes via `app/core/rbac.py` |
| Rate limiting | SlowAPI, Redis-backed, on `/api/auth/*` and `/v2/auth/*` + `/v2/ai/*` | `RATE_LIMIT_ENABLED` flag |
| Realtime | WebSockets with first-message token auth | channel manager in `app/services/realtime/manager.py` |
| LLM | Groq (default) or OpenAI-compatible | server-side only, Redis-cached, graceful degradation |
| Monitoring | Prometheus `/metrics` (internal), optional Sentry | |
| Deployment | Docker Compose (dev/prod/staging) | prod has no bind mounts, nightly Postgres backups |

## Request Flow

1. Client calls `apiFetch` (`client/src/config/api.js`) — adds `Authorization: Bearer <token>`, handles 401 with a single refresh-and-retry, caches GETs.
2. Nginx proxies `/api/*` and `/v2/*` to `backend:3001` (WebSocket upgrade for `/v2/realtime/ws/`).
3. Prometheus middleware records request metrics; request-ID middleware attaches a correlation ID (propagated to logs via a contextvar filter).
4. Router dependency chain: `get_current_user` → JWT decode → DB user check (no fallback for deleted users) → `resolve_scopes(role, sub_role)` → `require_roles`/`require_scopes` guard.
5. Data access via `MongoRepository` (SQLAlchemy over JSONB `documents` table); typed Alembic migrations evolve the schema.

## Schema Management

- **Alembic is the single source of truth** (`backend/alembic/versions/`).
- The Docker entrypoint runs `alembic upgrade head` before starting the API.
- `Base.metadata.create_all` runs **only** when `APP_ENV != "production"` (dev convenience).
- Demo seeding runs **only** when `APP_ENV != "production"`.
- The legacy `schema.sql` path is kept only for legacy parity; `schema1.sql` was removed.

## Environments

| File | Purpose | Bind mounts | Notes |
|---|---|---|---|
| `docker-compose.yml` | Local dev | `./backend:/app` | seeds demo data, `--reload` |
| `docker-compose.prod.yml` | Production override | none | no seed in prod, nightly backups, no `--reload` |
| `docker-compose.staging.yml` | Staging stack | `./backend:/app` + ml volume | requires JWT_SECRET/PRIVACY_SALT in env |

## Monitoring

- Prometheus scrapes `backend:3001/metrics` (docker network; not exposed via frontend).
- Grafana dashboards in `monitoring/grafana/`, stack via `docker compose -f monitoring/docker-compose.monitoring.yml`.
- Sentry initializes only when `SENTRY_DSN` is set.

## Security Model

- JWT access tokens (60 min) + refresh tokens (7 days, single-use rotation).
- Deleted/revoked users are rejected even with a valid JWT.
- WebSocket channels require `{"type":"auth","token":"..."}` as the first message (6s timeout).
- RBAC scopes per role: `ambulance:write`, `hospital:write`, `emergency:trigger`, `gov:write`, `dashboard:read`, etc.
- Rate limits: auth endpoints `5/min` (login/signup), AI endpoints `30/min`, global default `120/min` per IP.
- Frontend stores tokens in `sessionStorage` only (cleared on tab close).
- Secret scanning (gitleaks) + Dependabot in CI; lint gates are enforced (no `|| true`).

## Known Debt

- **Document/JSONB data layer**: 100+ route modules use a Mongo-style repository over a single JSONB table. A proper relational redesign (typed tables per entity) is planned.
- ML model provenance: several joblib files are duplicated/byte-identical; models are LFS-tracked and need a registry with versioning.
- Frontend is JavaScript; a TypeScript migration is aspirational, not started.
