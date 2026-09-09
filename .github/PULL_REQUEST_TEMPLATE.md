<!-- Title: conventional-commit style, e.g. "fix: rotate refresh tokens on refresh" -->

## What & why

<!-- One or two sentences. Link the issue: Closes #123 -->

## How was it tested

- [ ] Backend: `pytest ../tests/test_unit -v` (from `backend/`)
- [ ] Lint ratchets unchanged: `python -m flake8 app/ --count` (backend),
      `npx eslint src/` at/below baseline (client)
- [ ] Client: `npx vitest run` and `npm run build`
- [ ] E2E against the Docker stack for user-facing changes

## Checklist

- [ ] No new `except Exception:` without logging (ratchet enforced)
- [ ] Schema changes via Alembic migration (not ad-hoc DDL)
- [ ] New list endpoints paginate
- [ ] Docs updated if behavior/ports/API surface changed
