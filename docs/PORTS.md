# Ports & Services Reference

Single source of truth for every port LifeLink uses. If you change a port,
change it **here and in the compose files** — nothing else should hardcode it.

## Application

| Service | Port | Where it's bound | Notes |
|---|---|---|---|
| **Backend API (FastAPI)** | `3001` | `docker-compose.yml` → host, container | Direct API access. Now also emits security headers + v1 deprecation headers |
| **Frontend (nginx)** | `5000` | `docker-compose.yml` → host | Public entry point; proxies `/api` + `/v2` to the backend, adds CSP/security headers |
| **SIE (AI engine)** | `18080` | `docker-compose.yml` → host | `/readyz` health endpoint |

> Browsers should use **`http://localhost:5000`** (nginx) — going straight to
> `:3001` bypasses nginx's CSP header set. The backend's own security-header
> middleware (added 2026-09) covers direct API callers.

## Data stores

| Service | Port | Notes |
|---|---|---|
| **PostgreSQL** | `5432` | Primary relational store; Alembic-managed schema |
| **MongoDB** | `27017` | Document store |
| **Redis** | `6379` | Cache, rate limiting, Celery broker |

## Observability

| Service | Port | Notes |
|---|---|---|
| **Prometheus** | `9090` | Scrapes `backend:3001/metrics` over the shared Docker network |
| **Grafana** | `3000` | Dashboards |

## Internal (container-to-container only)

| Service | Port | Notes |
|---|---|---|
| Celery worker/beat | — | No listening port; Redis broker |
| Postgres (staging) | `5432` | Same as prod, aligned on Postgres 15 |

## History

- The backend previously ran on **`4002`**; everything was consolidated on
  `3001` (2026-09). Only `docs/archive/` may still mention `4002` — those
  documents are frozen.
