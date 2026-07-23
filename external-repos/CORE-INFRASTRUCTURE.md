# 🔧 Core Infrastructure & Monitoring

> **Priority:** 🔴 P0 — Critical
> **Purpose:** Production monitoring, error tracking, distributed tracing, authentication, and secrets management.

---

## 1. Sentry

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/getsentry/sentry` |
| **Docs** | `https://docs.sentry.io/` |
| **Type** | Error Tracking & Performance Monitoring |
| **Language** | Python SDK + JavaScript SDK |
| **Integration** | FastAPI + React |
| **Free Tier** | 5K events/month (enough for dev) |
| **Effort** | ⏱ 30 minutes |

### What It Adds
- **Real-time error alerts** — catches crashes, API failures, frontend exceptions
- **Performance tracing** — shows slow API endpoints, slow database queries
- **Release tracking** — correlates errors to specific deployments
- **User feedback** — users can report bugs with screenshots

### How to Integrate
```bash
# Backend
pip install sentry-sdk
```
```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=settings.APP_ENV == "production" and 0.25 or 0.0,
    integrations=[FastApiIntegration(), SqlalchemyIntegration()],
)
```
```bash
# Frontend
npm install @sentry/react
```
```jsx
// client/src/main.jsx
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.25,
});
```

### Why LifeLink Needs This
Currently has **zero production error monitoring**. Bugs go unnoticed until users report them. Sentry catches:
- API 500 errors with full stack traces
- Frontend React crashes with component tree
- Slow API endpoints (e.g., ML predictions taking > 5s)
- Database query performance issues

---

## 2. OpenTelemetry

| Detail | Value |
|--------|-------|
| **Python SDK** | `https://github.com/open-telemetry/opentelemetry-python` |
| **JS SDK** | `https://github.com/open-telemetry/opentelemetry-js` |
| **Collector** | `https://github.com/open-telemetry/opentelemetry-collector` |
| **Type** | Distributed Tracing Standard |
| **Free Tier** | Fully open-source |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **End-to-end traces** — follows a request from React → FastAPI → PostgreSQL
- **Vendor-neutral** — can send traces to Datadog, Grafana, SigNoz, or self-host
- **Automatic instrumentation** — no manual code changes for basic tracing
- **Context propagation** — links frontend requests to backend traces

### How to Integrate
```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap --action=install
```

```python
# Run FastAPI with auto-instrumentation
# opentelemetry-instrument uvicorn app.main:app
```

```jsx
// Frontend
npm install @opentelemetry/sdk-trace-web @opentelemetry/instrumentation-fetch
```

### Why LifeLink Needs This
When a user clicks "SOS" and the request takes 10 seconds, OpenTelemetry tells you **exactly where** the time was spent — was it the ML model prediction (6s), database query (2s), ambulance routing API call (1.5s), or frontend rendering (0.5s)?

---

## 3. Prometheus + Grafana

| Detail | Value |
|--------|-------|
| **Prometheus** | `https://github.com/prometheus/prometheus` |
| **Grafana** | `https://github.com/grafana/grafana` |
| **Python Client** | `https://github.com/prometheus/client_python` |
| **FastAPI Instrument** | `https://github.com/trallnag/prometheus-fastapi-instrumentator` |
| **Type** | Metrics Collection & Dashboards |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Request metrics** — count, latency percentiles (p50/p95/p99), error rate per endpoint
- **System metrics** — CPU, memory, database connection pool usage
- **Business metrics** — # SOS triggered, # ambulances dispatched, avg response time
- **Beautiful dashboards** — real-time visualizations of system health

### How to Integrate
```bash
pip install prometheus-fastapi-instrumentator
```

```python
from prometheus_fastapi_instrumentator import Instrumentator

@app.on_event("startup")
async def start_metrics():
    Instrumentator().instrument(app).expose(app)
```

### Why LifeLink Needs This
Track real-time KPIs: How many emergencies per hour? What's the average ETA? Which hospitals are overloaded? Prometheus + Grafana make this data visible at a glance.

---

## 4. Auth0

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/auth0/auth0-python` |
| **React SDK** | `https://github.com/auth0/auth0-react` |
| **Type** | Authentication & Authorization Platform |
| **Free Tier** | 7,000 users, social login included |
| **Effort** | ⏱ 6 hours |

### What It Adds
- **Social login** — Google, GitHub, Facebook — one-click signup
- **Multi-factor auth (MFA)** — SMS/authenticator app for hospital/government users
- **Passwordless** — email magic link for public users
- **Breached password detection** — security alerts
- **SSO (SAML/OIDC)** — enterprise hospital SSO integration

### Why LifeLink Needs This
Currently **bare-minimum JWT auth**. No forgot password, no social login, no 2FA. For a healthcare platform handling PHI, Auth0's security features are essential.

---

## 5. HashiCorp Vault

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/hashicorp/vault` |
| **Python Client** | `https://github.com/hvac/hvac` |
| **Type** | Secrets Management |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Secure API key storage** — no more `.env` files with plaintext secrets
- **Dynamic secrets** — auto-generated temporary database credentials
- **Audit logging** — every secret access is logged
- **Encryption as a service** — encrypt PHI data at application level

### Why LifeLink Needs This
Currently stores `GROQ_API_KEY`, `SENDGRID_API_KEY`, `JWT_SECRET` in plaintext `.env` files. Vault provides enterprise-grade secrets management with rotation and auditing.

---

## 📦 Installation Commands Summary

```bash
# Python backend
pip install sentry-sdk opentelemetry-distro opentelemetry-exporter-otlp prometheus-fastapi-instrumentator

# JavaScript frontend
npm install @sentry/react @opentelemetry/sdk-trace-web @opentelemetry/instrumentation-fetch

# Infrastructure (Docker Compose)
services:
  sentry:       # getsentry/sentry
  prometheus:   # prom/prometheus
  grafana:      # grafana/grafana
  vault:        # hashicorp/vault
```
