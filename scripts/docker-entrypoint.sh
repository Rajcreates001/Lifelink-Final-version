#!/bin/bash
# ============================================================
# LifeLink — Docker Entrypoint Script
# ============================================================
# Handles database migration, API server, Celery worker and beat.
# ============================================================

set -e

# Derive sync DSN from the async POSTGRES_URL
PG_DSN="${POSTGRES_URL/postgresql+asyncpg:/postgresql:}"
PG_DSN="${PG_DSN:-postgresql://postgres:postgres@postgres:5432/lifelink_db}"

# Use PORT from environment, default to 3001
APP_PORT="${PORT:-3001}"

# ─── Wait for PostgreSQL ──────────────────────────────────
wait_for_postgres() {
    echo "⏳ Waiting for PostgreSQL..."
    for i in $(seq 1 30); do
        if python -c "
import asyncio, asyncpg
async def check():
    try:
        conn = await asyncpg.connect(dsn='${PG_DSN}')
        await conn.close()
        return True
    except Exception:
        return False
print(asyncio.run(check()))
" 2>/dev/null | grep -q True; then
            echo "✅ PostgreSQL is ready"
            return 0
        fi
        echo "  Attempt $i/30..."
        sleep 2
    done
    echo "❌ PostgreSQL not available after 30 attempts"
    exit 1
}

# ─── Wait for Redis ───────────────────────────────────────
wait_for_redis() {
    echo "⏳ Waiting for Redis..."
    for i in $(seq 1 15); do
        if python -c "
import redis
try:
    r = redis.Redis.from_url('${REDIS_URL:-redis://redis:6379/0}')
    r.ping()
    print('ok')
except Exception:
    print('fail')
" 2>/dev/null | grep -q ok; then
            echo "✅ Redis is ready"
            return 0
        fi
        echo "  Attempt $i/15..."
        sleep 2
    done
    echo "❌ Redis not available after 15 attempts"
    exit 1
}

# ─── Run Database Migration ───────────────────────────────
run_migration() {
    # Alembic is the single source of truth for schema management.
    # The legacy schema.sql bootstrap only fills in seed/demo data.
    echo "📦 Applying Alembic migrations..."
    if command -v alembic >/dev/null 2>&1; then
        # First deployment on an empty DB: schema.sql may already have created
        # tables via bootstrap; stamp so Alembic starts from the right revision.
        if [ -f "scripts/bootstrap_database.py" ]; then
            python scripts/bootstrap_database.py || echo "⚠️  bootstrap_database.py failed — continuing with Alembic"
        elif [ -f "backend/scripts/bootstrap_database.py" ]; then
            python backend/scripts/bootstrap_database.py || echo "⚠️  bootstrap_database.py failed — continuing with Alembic"
        fi

        # If the alembic_version table does not exist but the schema does
        # (databases created before this change), stamp to head instead of failing.
        STAMPED=$(python -c "
import asyncio, asyncpg, os
async def main():
    dsn = '${PG_DSN}'
    conn = await asyncpg.connect(dsn=dsn)
    try:
        has_version = await conn.fetchval(\"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version')\")
        has_docs = await conn.fetchval(\"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents')\")
        print('yes' if (not has_version and has_docs) else 'no')
    finally:
        await conn.close()
asyncio.run(main())
" 2>/dev/null || echo no)

        if [ "$STAMPED" = "yes" ]; then
            echo "📦 Pre-Alembic database detected — stamping alembic_version to head..."
            alembic stamp head || true
        fi

        alembic upgrade head && echo "✅ Alembic migrations applied"
    else
        echo "⚠️  alembic not installed — falling back to bootstrap only"
    fi

    echo "✅ Database setup complete!"
}

# ─── Start Backend API ────────────────────────────────────
start_api() {
    echo "🚀 Starting LifeLink Backend API on port ${APP_PORT}..."
    if [ "${APP_ENV:-development}" = "production" ]; then
        exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT}"
    fi
    exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT}" --reload
}

# ─── Start Celery Worker ──────────────────────────────────
start_worker() {
    echo "🚀 Starting Celery Worker..."
    exec celery -A app.core.celery_app worker --loglevel=info --concurrency=4 --pool=threads
}

# ─── Start Celery Beat ────────────────────────────────────
start_beat() {
    echo "🚀 Starting Celery Beat..."
    mkdir -p /app/celerybeat-schedule
    exec celery -A app.core.celery_app beat --loglevel=info --schedule=/app/celerybeat-schedule/schedule
}

# ─── Main ─────────────────────────────────────────────────
case "${1:-api}" in
    migrate)
        wait_for_postgres
        run_migration
        ;;
    api)
        wait_for_postgres
        wait_for_redis
        run_migration
        start_api
        ;;
    worker)
        wait_for_postgres
        wait_for_redis
        start_worker
        ;;
    beat)
        wait_for_redis
        start_beat
        ;;
    *)
        exec "$@"
        ;;
esac
