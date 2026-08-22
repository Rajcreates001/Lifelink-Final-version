#!/bin/bash
# ============================================================
# LifeLink — Sync Docker PostgreSQL with Local PostgreSQL
# Drops empty tables in Docker DB, applies full schema + data
# from local pg_dump files on D: drive
# ============================================================

set -e

SCHEMA_FILE="/docker-entrypoint-initdb.d/lifelink_schema.sql"
DATA_FILE="/docker-entrypoint-initdb.d/lifelink_data.sql"
LOCAL_SCHEMA="/mnt/d/docker/lifelink_schema_dump.sql"
LOCAL_DATA="/mnt/d/docker/lifelink_data_dump.sql"

echo "=== LifeLink DB Sync Script ==="
echo ""

# Check if dump files exist
if [ ! -f "$LOCAL_SCHEMA" ]; then
    echo "❌ Schema dump not found: $LOCAL_SCHEMA"
    exit 1
fi
if [ ! -f "$LOCAL_DATA" ]; then
    echo "❌ Data dump not found: $LOCAL_DATA"
    exit 1
fi

echo "Schema dump: $(du -h "$LOCAL_SCHEMA" | cut -f1)"
echo "Data dump:   $(du -h "$LOCAL_DATA" | cut -f1)"
echo ""

# Step 1: Drop all existing tables (they're all empty)
echo "=== Step 1: Dropping all existing tables ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d lifelink_db -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers and foreign keys temporarily
    SET session_replication_role = 'replica';
    
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped: %', r.tablename;
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all types
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
    
    SET session_replication_role = 'origin';
END
\$\$;
" 2>&1
echo "✅ All tables dropped"
echo ""

# Step 2: Apply schema
echo "=== Step 2: Applying schema ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d lifelink_db -f "$LOCAL_SCHEMA" 2>&1 | tail -5
echo "✅ Schema applied"
echo ""

# Step 3: Load data
echo "=== Step 3: Loading data (this may take a few minutes) ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d lifelink_db -f "$LOCAL_DATA" 2>&1 | tail -20
echo "✅ Data loaded"
echo ""

# Step 4: Verify
echo "=== Step 4: Verification ==="
TABLE_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d lifelink_db -t -A -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
ROW_TOTAL=$(PGPASSWORD=postgres psql -h localhost -U postgres -d lifelink_db -t -A -c "
SELECT sum(n_live_tup) FROM pg_stat_user_tables WHERE schemaname='public'
")
echo "Tables: $TABLE_COUNT"
echo "Total rows: $ROW_TOTAL"
echo ""
echo "=== Top 10 tables by row count ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d lifelink_db -c "
SELECT relname as table_name, n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND n_live_tup > 0
ORDER BY n_live_tup DESC
LIMIT 10;
" 2>&1

echo ""
echo "=== DONE ==="
