# API Versioning & Sunset Policy

LifeLink exposes two API surfaces:

| Surface | Prefix | Status |
|---|---|---|
| **v1 (legacy)** | `/api/*` | **Deprecated** — Sunset: **2026-07-01** |
| **v2 (current)** | `/v2/*` | Active development |

## What "deprecated" means in practice

Every v1 response carries deprecation headers (RFC 8594):

```
Deprecation: true
Sunset: Wed, 01 Jul 2026 00:00:00 GMT
Link: </docs/API_VERSIONING.md>; rel="deprecation"
```

- `Deprecation` — this endpoint is superseded by a v2 equivalent.
- `Sunset` — the date after which the endpoint may be removed without notice.
- `Link` — pointer to this document.

`/api/health` is exempt: it is the canonical liveness probe for nginx,
Docker, and monitoring, and has no v2 replacement.

## Migration guidance

| v1 domain | v2 equivalent |
|---|---|
| `/api/auth/*` | `/v2/auth/*` (adds refresh tokens, logout revocation) |
| `/api/users/*` | `/v2/users/*` |
| `/api/hospital/*` | `/v2/hospital/*` |
| `/api/ambulance/*` | `/v2/ambulance/*` |
| `/api/government/*` | `/v2/government/*` |

New client code must target `/v2/*` only. The client's `src/config/api.js`
is the reference integration.

## Removal plan

1. Audit access logs for v1 traffic after the Sunset date.
2. Migrate remaining internal callers (mostly legacy dashboard pages).
3. Delete v1 routers from `backend/app/routes/` in a single release, keeping
   `/api/health`.

## Adding v2 endpoints

Register v2 routers in `backend/app/main.py` under the `/v2` prefix and keep
business logic in `backend/app/services/` so both surfaces can share it
during the migration window.
