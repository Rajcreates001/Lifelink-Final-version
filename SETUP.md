# LifeLink — Complete Setup Guide

This guide covers everything needed to run LifeLink on a fresh machine after cloning the repository. **No manual database setup is required** — Docker handles everything automatically.

---

## Quick Start (Docker — Recommended)

### Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine + Docker Compose** (Linux)
  - Docker Desktop includes Docker Compose v2+
  - Verify: `docker --version` and `docker compose version`
- **8 GB+ RAM** available for Docker (PostgreSQL + Redis + Backend + Frontend + optional SIE)

### Step 1: Clone

```bash
git clone https://github.com/Rajcreates001/Lifelink-Final-version.git
cd Lifelink-Final-version
```

### Step 2: Start Everything

```bash
docker compose up -d --build postgres redis backend frontend
```

This single command:
1. **Builds** the backend (Python 3.11 + FastAPI) and frontend (React + Nginx) images
2. **Starts** PostgreSQL and Redis
3. **Waits** for both to be healthy
4. **Bootstraps** the database:
   - Creates all tables (schema.sql)
   - Seeds **370+ demo users** (hospitals, government, public)
   - Seeds **79 departments**, **48 roles**, **108 permissions**
   - Seeds government auth data
5. **Starts** the backend API server (port 3001)
6. **Starts** the frontend (port 5000) with nginx reverse proxy

### Step 3: Open

Open **http://localhost:5000** in your browser.

That's it. No manual database setup, no migration commands, no environment file editing.

---

## Port Map

| Service | Internal Port | External URL | Description |
|---------|--------------|-------------|-------------|
| **Frontend** | 80 | http://localhost:5000 | React SPA + nginx reverse proxy |
| **Backend** | 3001 | http://localhost:3001 | FastAPI API server |
| **PostgreSQL** | 5432 | localhost:5432 | Database |
| **Redis** | 6379 | localhost:6379 | Cache + Celery broker |
| **SIE** (opt-in) | 8080 | localhost:18080 | AI embeddings (4GB, disabled by default) |

### How Frontend ↔ Backend Communication Works

```
Browser → http://localhost:5000/v2/auth/login
         ↓
    nginx (port 80 inside container)
         ↓ proxies /v2/* and /api/*
    Backend (port 3001 inside Docker network)
         ↓
    PostgreSQL (port 5432 inside Docker network)
```

The frontend uses **relative URLs** (empty `API_BASE_URL`) in Docker. Nginx proxies all `/api/*` and `/v2/*` requests to the backend. The browser never contacts the backend directly.

---

## Demo Credentials

### Public Portal
| Field | Value |
|-------|-------|
| Email | `public.001@lifelink.demo` |
| Password | `Demo@2026!` |
| Role | Public |

### Hospital Portal (via WorkspaceAuthModal)
| Department | Email | Password |
|------------|-------|----------|
| CEO Office | `angel.henry@lifelink.demo` | `Password123` |
| Emergency | `doctor.emergency@lifelink.demo` | `Password123` |
| ICU | `icu@lifelink.demo` | `Password123` |
| Finance | `finance@lifelink.demo` | `Password123` |
| Radiology | `radiology@lifelink.demo` | `Password123` |
| Laboratory | `lab@lifelink.demo` | `Password123` |
| OPD | `opd@lifelink.demo` | `Password123` |
| Pharmacy | `pharmacy@lifelink.demo` | `Password123` |
| Admin | `admin@lifelink.demo` | `Admin@123` |

### Government Portal
| Field | Value |
|-------|-------|
| Email | `government.001@lifelink.demo` |
| Password | `Demo@2026!` |

### Ambulance Portal
| Field | Value |
|-------|-------|
| Email | `ambulance.002@lifelink.demo` |
| Password | `Demo@2026!` |

---

## Login Flow

### Public / Government / Ambulance
1. Go to http://localhost:5000/login
2. Select role tab (Public / Government / Ambulance)
3. Pre-filled credentials appear automatically
4. Click "Login Securely"

### Hospital
1. Go to http://localhost:5000/login
2. Select the **Hospital** tab
3. Enter Hospital ID: `HOSP-1001`, Password: `Demo@2026!`
4. Click "Login Securely"
5. You land on the **Department Workspace Gateway**
6. Click any department card (e.g., Emergency, ICU)
7. It automatically enters that workspace (no second login needed)

---

## What Auto-Seeds on First Run

When you start Docker for the first time, the backend entrypoint (`scripts/docker-entrypoint.sh`) runs `backend/scripts/bootstrap_database.py` which:

1. **Applies schema** — Creates all PostgreSQL tables from `backend/scripts/schema.sql`
2. **Seeds demo data** via `backend/scripts/seed_mass_demo_data.py`:
   - 370+ enterprise users across hospital and government departments
   - 79 departments (hospital + government)
   - 48 roles with 108 permissions (RBAC)
   - Government auth data (ABDM-aligned)
   - Hospital module data (beds, staff, equipment, etc.)
3. **Enterprise auth bootstrap** — Creates enterprise auth tables and seeds dev users (runs on first enterprise login)

This is **idempotent** — running it again skips if data already exists.

---

## Docker Services

### Core Services (always started)

| Service | Image | Description |
|---------|-------|-------------|
| `postgres` | `postgres:15` | PostgreSQL database |
| `redis` | `redis:7-alpine` | Cache + Celery message broker |
| `backend` | `lifelink-mern-v4-backend` | FastAPI API server |
| `celery-worker` | (same as backend) | Background task processor |
| `celery-beat` | (same as backend) | Periodic task scheduler |
| `frontend` | `lifelink-mern-v4-frontend` | React SPA served via nginx |

### Optional Services

| Service | How to Start | Description |
|---------|-------------|-------------|
| `sie` | `docker compose --profile ai up -d sie` | Superlinked Inference Engine (4GB, AI embeddings/reranking) |

---

## Environment Variables

### Docker (No .env files needed)

All environment variables are defined in `docker-compose.yml` under `x-backend-env`. The Docker setup works out of the box with sensible defaults:

- **Database**: `postgres:postgres@postgres:5432/lifelink_db`
- **Redis**: `redis://redis:6379/0`
- **JWT Secret**: `change_me_before_deploy` (fine for local dev)
- **SIE**: Disabled by default (`SIE_ENABLED=false`)

### Local Development (without Docker)

For running frontend locally with `npm run dev`:

```bash
# client/.env (already configured)
VITE_API_URL=http://localhost:3001
```

For running backend locally:

```bash
# backend/.env
APP_ENV=development
PORT=3001
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lifelink_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change_me_before_deploy
FRONTEND_URL=http://localhost:5000
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
```

---

## Common Commands

### Start everything
```bash
docker compose up -d --build postgres redis backend frontend
```

### Stop everything
```bash
docker compose down
```

### Stop and remove all data (fresh start)
```bash
docker compose down -v
docker compose up -d --build postgres redis backend frontend
```

### View logs
```bash
docker logs lifelink-backend      # Backend API logs
docker logs lifelink-frontend     # Nginx logs
docker logs lifelink-postgres     # PostgreSQL logs
```

### Restart a single service
```bash
docker compose restart backend    # Restart backend (picks up code changes via bind mount)
docker compose up -d --build frontend  # Rebuild and restart frontend
```

### Rebuild frontend (after code changes)
```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Check service health
```bash
docker ps --filter "name=lifelink"
curl -s http://localhost:5000/api/health
```

---

## Troubleshooting

### "Cannot reach server" or blank page
1. **Hard-refresh** your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check backend is healthy: `curl http://localhost:5000/api/health`
3. Rebuild frontend: `docker compose build --no-cache frontend && docker compose up -d frontend`

### Backend fails to start
Check logs: `docker logs lifelink-backend --tail 50`
- If PostgreSQL isn't ready: `docker compose restart backend`
- If bootstrap fails: `docker compose down -v && docker compose up -d --build postgres redis backend frontend`

### "workspace access denied" for hospital
- Click any department card on the Hospital Workspace Gateway
- It should automatically enter the workspace (no second login needed)
- If it shows a login modal, close it and click the department card again

### React error #31 (blank page)
This means a component received unexpected data. Hard-refresh the browser to load the latest JavaScript bundle.

### SIE container is unhealthy
SIE is optional and not needed for normal operation. It's behind a Docker profile:
```bash
docker compose --profile ai up -d sie  # Only if you need AI embeddings
```

### Port conflicts
If ports 5000, 3001, 5432, or 6379 are already in use:
```bash
# Find what's using the port (Linux/Mac)
lsof -i :5000
# Or on Windows
netstat -ano | findstr :5000
```

---

## Migrating Data from Another Database

If you have data from a previous PostgreSQL instance and want to import it:

### Option 1: pg_dump / pg_restore

```bash
# On the source machine
pg_dump -U postgres lifelink_db > backup.sql

# On the new machine (after Docker is running)
docker exec -i lifelink-postgres psql -U postgres -d lifelink_db < backup.sql
```

### Option 2: Volume copy

```bash
# Stop containers
docker compose down

# Find the PostgreSQL volume
docker volume inspect lifelink-mern-v4_postgres_data

# Copy data directory from old machine to new
# (copy the PostgreSQL data directory to the volume path)
```

### Option 3: SQL import

```bash
# Copy your .sql file into the container
docker cp your_backup.sql lifelink-postgres:/tmp/backup.sql

# Import
docker exec -i lifelink-postgres psql -U postgres -d lifelink_db < /tmp/backup.sql
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ Frontend │───→│ Backend  │───→│   PostgreSQL     │   │
│  │ (nginx)  │    │(FastAPI) │    │  (port 5432)     │   │
│  │ :5000→80 │    │ :3001    │    └──────────────────┘   │
│  └──────────┘    └────┬─────┘                           │
│                       │                                  │
│                       ├──→ ┌──────────────────┐         │
│                       │    │      Redis        │         │
│                       │    │  (port 6379)      │         │
│                       │    └──────────────────┘         │
│                       │                                  │
│  ┌────────────────┐   │                                  │
│  │ Celery Worker  │───┘                                  │
│  │ Celery Beat    │                                      │
│  └────────────────┘                                      │
│                                                          │
│  ┌────────────────┐ (optional, profile: ai)              │
│  │  SIE Server    │                                      │
│  │  :18080→8080   │                                      │
│  └────────────────┘                                      │
└─────────────────────────────────────────────────────────┘

Browser → localhost:5000 → nginx → backend:3001 → postgres:5432
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.11, Uvicorn |
| Database | PostgreSQL 15, SQLAlchemy, asyncpg |
| Cache/Broker | Redis 7 |
| Task Queue | Celery |
| AI/ML | Groq API, SentenceTransformers, scikit-learn |
| Auth | JWT (PyJWT), bcrypt, RBAC |
| Maps | Leaflet + OpenStreetMap |
| Realtime | WebSocket (FastAPI) |
| Routing | OSRM (Open Source Routing Machine) |
| Docker | Multi-stage builds, health checks |

---

## Repository Structure

```
Lifelink-Final-version/
├── client/                          # React frontend
│   ├── Dockerfile                   # Multi-stage Docker build
│   ├── nginx.conf                   # Reverse proxy config
│   ├── src/
│   │   ├── config/api.js            # API URL configuration
│   │   ├── context/AuthContext.jsx   # Authentication state
│   │   ├── layout/DashboardLayout.jsx
│   │   ├── pages/                   # Route-level screens
│   │   ├── components/              # Feature components
│   │   └── hooks/                   # Custom hooks
│   └── package.json
│
├── backend/                         # FastAPI backend
│   ├── Dockerfile                   # Multi-purpose Docker build
│   ├── app/
│   │   ├── main.py                  # FastAPI app + lifespan
│   │   ├── core/config.py           # Settings (env vars)
│   │   ├── core/auth.py             # JWT auth
│   │   ├── routes/                  # API routes (v1)
│   │   ├── routes/v2/               # API routes (v2)
│   │   ├── services/                # Business logic
│   │   └── db/                      # Database models + connections
│   ├── scripts/
│   │   ├── bootstrap_database.py    # Schema + demo data seeding
│   │   ├── schema.sql               # PostgreSQL schema
│   │   └── seed_mass_demo_data.py   # Demo user generation
│   ├── ml/                          # ML models (.joblib)
│   └── requirements.txt
│
├── scripts/
│   └── docker-entrypoint.sh         # Container startup script
│
├── docker-compose.yml               # Full stack orchestration
├── .dockerignore                    # Build context exclusions
├── SETUP.md                         # This file
└── README.md                        # Project overview
```
