# Contributing to LifeLink

Thanks for contributing! This document covers the essentials; for
architecture and ports see `docs/INFRASTRUCTURE.md` and `docs/API_VERSIONING.md`.

## Quick start

```bash
# Backend (Python 3.11+, FastAPI)
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3001

# Client (Node 18+, Vite)
cd client
npm ci
npm run dev          # http://localhost:5000

# Full stack with Docker
docker compose --profile ai up -d --build
```

## Before opening a PR

- [ ] `cd client && npm run lint && npx vitest run && npm run build`
      (lint is a **ratchet** — see `client/.lint-baseline`; don't raise it)
- [ ] `cd backend && python -m flake8 app/ --count` (ratchet, see
      `backend/.flake8-baseline`) and `pytest ../tests/test_unit -v`
- [ ] New backend endpoints have tests and, where they list data, pagination
- [ ] No new `except Exception:` without logging — the ratchet test
      `tests/test_unit/test_no_silent_exceptions.py` will fail otherwise
- [ ] Schema changes go through **Alembic** (`backend/migrations/versions/`),
      never ad-hoc DDL
- [ ] Secrets stay out of git — CI runs gitleaks

## Conventions

- **API**: new code targets `/v2/*`; `/api/*` is deprecated (Sunset 2026-07-01).
- **Commits**: conventional-commit style (`fix:`, `feat:`, `chore:` …),
  focused, one logical change per commit.
- **Python**: line length 120 (see `backend/.flake8`); type hints on new code.
- **JS**: match existing style; ESLint gates via the baseline ratchet.

## Reporting issues

Open a GitHub issue with: what you did, what you expected, what happened,
and (for bugs) backend logs with the `request_id` field.
