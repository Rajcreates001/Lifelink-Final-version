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

# ─── Run Database Migration ───────────────────────────────
run_migration() {
    echo "📦 Applying schema (SQL schema.sql)..."
    # Try root-level scripts first, then backend/scripts (Docker layout: backend/ -> /app/)
    if [ -f "scripts/bootstrap_database.py" ]; then
        python scripts/bootstrap_database.py
    elif [ -f "backend/scripts/bootstrap_database.py" ]; then
        python backend/scripts/bootstrap_database.py
    else
        echo "❌ bootstrap_database.py not found"
        exit 1
    fi

    echo "📦 Stamping Alembic head..."
    cd /app && alembic stamp head

    echo "✅ Database setup complete!"
}

# ─── Start Backend API ────────────────────────────────────
start_api() {
    echo "🚀 Starting LifeLink Backend API..."
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-3001}" --reload
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
        start_api
        ;;
    worker)
        wait_for_postgres
        start_worker
        ;;
    beat)
        start_beat
        ;;
    *)
        exec "$@"
        ;;
esac
