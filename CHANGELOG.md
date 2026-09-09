# Changelog

All notable changes to LifeLink are documented here. The version in the
repo-root `VERSION` file is the single source of truth — release tooling
and CI read it from there.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/).

## [1.0.0] — 2026-09-08

### Added
- JWT refresh-token flow end-to-end: `/v2/auth/refresh` with **rotation**,
  `/v2/auth/logout` with **server-side token revocation** (denylist-backed),
  client single-flight 401 auto-refresh in `client/src/config/api.js`.
- Role gate on `POST /api/users/verify` (admin-only; was any-authenticated-user).
- Security headers on all backend responses + `/metrics` restricted to
  private-network scrapers.
- v1 API deprecation headers (`Deprecation`, `Sunset`, `Link`) and
  `docs/API_VERSIONING.md` sunset policy.
- Alembic as the single schema owner in production; JSONB/GIN/trgm
  performance-index migration (`0002`).
- Prometheus alert rules (`monitoring/alert_rules.yml`) and alertmanager
  wiring hooks.
- Pagination on donor and v2 user list endpoints.
- Ratcheting quality gates: ESLint baseline (client), flake8 baseline
  (backend), silent-exception ratchet, coverage floor.
- localStorage cache hygiene sweeper (`client/src/utils/storageSweeper.js`)
  with namespace caps and age-based eviction.
- Community files: CODEOWNERS, PR template, CONTRIBUTING.md.
- Golden-response fixtures as executable contract tests.

### Changed
- Chart.js → Recharts (≈430 kB lighter client bundle).
- Postgres aligned to 15 across dev/staging/prod compose files.
- Python deps pinned to installed versions; `psycopg2-binary` added for
  in-container Alembic runs.
- Backend port consolidated on **3001** everywhere (docs, CI, loadtest
  scripts); archive docs intentionally untouched.
- CI: backend unit job fixed (tests live at repo root), live-server suites
  moved to the e2e job, fake deploy jobs removed, mypy made advisory.

### Removed
- Duplicate `client/src/i18n/index.jsx` implementation (the `.js` one wins
  module resolution).
- `ApiTest.jsx` debug page from the production bundle and routes.
- One-off codemod scripts moved to `scripts/archive/`.
- Tracked test/load/e2e artifacts (now gitignored, regenerated per run).

### Fixed
- `build_metadata_filter` NameError on `sub_role` (AI knowledge service).
- Clobbered `compressed` key in headroom service output.
- 3 silent `except Exception` swallows in `core/auth.py` now log and narrow.
- CRLF line endings in `docker-entrypoint.sh` (`.gitattributes` now enforces
  LF for `*.sh`) that broke fresh Windows checkouts.
