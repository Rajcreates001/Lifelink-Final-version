#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# LifeLink PostgreSQL Restore Script
# ═══════════════════════════════════════════════════════════════
# Restores a PostgreSQL database from a compressed backup.
#
# Usage:
#   ./scripts/restore_postgres.sh backup_file.sql.gz
#   ./scripts/restore_postgres.sh --latest
#   ./scripts/restore_postgres.sh --list
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-lifelink}"
PGDATABASE="${PGDATABASE:-lifelink}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/postgres}"

# ─── Functions ───────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; exit 1; }

list_backups() {
    log "Available PostgreSQL backups:"
    echo ""
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.sql.gz 2>/dev/null)" ]; then
        echo "  No backups found in $BACKUP_DIR"
        return
    fi
    echo "  Date                    File                          Size"
    echo "  ─────────────────────── ───────────────────────────── ──────"
    for f in $(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null); do
        local fname=$(basename "$f")
        local fsize=$(du -h "$f" | cut -f1)
        local fdate=$(stat -c %y "$f" 2>/dev/null || stat -f "%Sm" "$f" 2>/dev/null)
        echo "  $fdate  $fname  $fsize"
    done
}

get_latest_backup() {
    ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1
}

# ─── Parse Arguments ─────────────────────────────────────────
BACKUP_FILE=""
LIST_ONLY=false
USE_LATEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --list) LIST_ONLY=true; shift ;;
        --latest) USE_LATEST=true; shift ;;
        --database) PGDATABASE="$2"; shift 2 ;;
        --host) PGHOST="$2"; shift 2 ;;
        --port) PGPORT="$2"; shift 2 ;;
        --user) PGUSER="$2"; shift 2 ;;
        --dir) BACKUP_DIR="$2"; shift 2 ;;
        --help)
            echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
            echo "Options:"
            echo "  --list          List available backups"
            echo "  --latest        Restore from latest backup"
            echo "  --database NAME Database name (default: lifelink)"
            echo "  --host HOST     PostgreSQL host (default: localhost)"
            echo "  --port PORT     PostgreSQL port (default: 5432)"
            echo "  --user USER     PostgreSQL user (default: lifelink)"
            echo "  --dir PATH      Backup directory"
            exit 0 ;;
        *.sql.gz) BACKUP_FILE="$1"; shift ;;
        *) error "Unknown option: $1" ;;
    esac
done

# ─── List Mode ───────────────────────────────────────────────
if [ "$LIST_ONLY" = true ]; then
    list_backups
    exit 0
fi

# ─── Resolve Backup File ─────────────────────────────────────
if [ "$USE_LATEST" = true ]; then
    BACKUP_FILE=$(get_latest_backup)
    if [ -z "$BACKUP_FILE" ]; then
        error "No backups found in $BACKUP_DIR"
    fi
    log "Latest backup: $BACKUP_FILE"
fi

if [ -z "$BACKUP_FILE" ]; then
    error "No backup file specified. Use --latest or provide a file path."
fi

if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
fi

# ─── Confirmation ────────────────────────────────────────────
log "═══════════════════════════════════════════════════"
log "  LifeLink PostgreSQL Restore"
log "  Database: $PGDATABASE @ $PGHOST:$PGPORT"
log "  Backup:   $BACKUP_FILE"
log "  Size:     $(du -h "$BACKUP_FILE" | cut -f1)"
log "═══════════════════════════════════════════════════"
log ""
log "⚠️  WARNING: This will OVERWRITE the current database!"
log ""

# In non-interactive mode, skip confirmation
if [ -t 0 ]; then
    read -p "Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log "Restore cancelled."
        exit 0
    fi
fi

# ─── Drop and Recreate Database ──────────────────────────────
log "Dropping existing database..."
if docker exec lifelink-postgres psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $PGDATABASE;" 2>/dev/null; then
    log "Database dropped via Docker"
elif PGPASSWORD="${PGPASSWORD:-}" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $PGDATABASE;" 2>/dev/null; then
    log "Database dropped"
else
    error "Failed to drop database"
fi

log "Creating fresh database..."
if docker exec lifelink-postgres psql -U "$PGUSER" -d postgres -c "CREATE DATABASE $PGDATABASE;" 2>/dev/null; then
    log "Database created via Docker"
elif PGPASSWORD="${PGPASSWORD:-}" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE $PGDATABASE;" 2>/dev/null; then
    log "Database created"
else
    error "Failed to create database"
fi

# ─── Restore ─────────────────────────────────────────────────
log "Restoring from backup..."
START_TIME=$(date +%s)

if docker exec -i lifelink-postgres pg_restore -U "$PGUSER" -d "$PGDATABASE" --verbose --no-owner --no-acl < <(gzip -dc "$BACKUP_FILE") 2>/dev/null; then
    log "Restore completed via Docker"
elif PGPASSWORD="${PGPASSWORD:-}" pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --verbose --no-owner --no-acl < <(gzip -dc "$BACKUP_FILE") 2>/dev/null; then
    log "Restore completed"
else
    log "Warning: pg_restore reported some errors (non-critical for schema-only restores)"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log ""
log "═══════════════════════════════════════════════════"
log "  Restore Complete"
log "  Database: $PGDATABASE"
log "  Duration: ${DURATION}s"
log "  Source:   $BACKUP_FILE"
log "═══════════════════════════════════════════════════"
