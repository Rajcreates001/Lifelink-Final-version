#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# LifeLink PostgreSQL Backup Script
# ═══════════════════════════════════════════════════════════════
# Creates compressed backups of the LifeLink PostgreSQL database
# with automatic rotation of old backups.
#
# Usage:
#   ./scripts/backup_postgres.sh
#   ./scripts/backup_postgres.sh --database lifelink --retain 7
#
# Environment variables (or defaults):
#   PGHOST     - PostgreSQL host (default: localhost)
#   PGPORT     - PostgreSQL port (default: 5432)
#   PGUSER     - PostgreSQL user (default: lifelink)
#   PGDATABASE - Database name (default: lifelink)
#   PGPASSWORD - PostgreSQL password
#   BACKUP_DIR - Backup directory (default: ./backups/postgres)
#   RETAIN_DAYS - Days to keep backups (default: 7)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-lifelink}"
PGDATABASE="${PGDATABASE:-lifelink}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/postgres}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${PGDATABASE}_${TIMESTAMP}.sql.gz"

# ─── Parse Arguments ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --database) PGDATABASE="$2"; shift 2 ;;
        --host) PGHOST="$2"; shift 2 ;;
        --port) PGPORT="$2"; shift 2 ;;
        --user) PGUSER="$2"; shift 2 ;;
        --retain) RETAIN_DAYS="$2"; shift 2 ;;
        --dir) BACKUP_DIR="$2"; shift 2 ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --database NAME   Database name (default: lifelink)"
            echo "  --host HOST       PostgreSQL host (default: localhost)"
            echo "  --port PORT       PostgreSQL port (default: 5432)"
            echo "  --user USER       PostgreSQL user (default: lifelink)"
            echo "  --retain DAYS     Days to keep backups (default: 7)"
            echo "  --dir PATH        Backup directory"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ─── Functions ───────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; exit 1; }

cleanup_old_backups() {
    log "Cleaning up backups older than $RETAIN_DAYS days..."
    local count=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETAIN_DAYS 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETAIN_DAYS -delete
        log "Removed $count old backup(s)"
    else
        log "No old backups to remove"
    fi
}

# ─── Main ────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════"
log "  LifeLink PostgreSQL Backup"
log "  Database: $PGDATABASE @ $PGHOST:$PGPORT"
log "  Backup:   $BACKUP_FILE"
log "  Retain:   $RETAIN_DAYS days"
log "═══════════════════════════════════════════════════"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Verify connection
log "Verifying PostgreSQL connection..."
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; then
    # Try docker exec as fallback
    if docker exec lifelink-postgres pg_isready -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; then
        log "Connected via Docker container"
        DOCKER_EXEC="docker exec lifelink-postgres"
    else
        error "Cannot connect to PostgreSQL at $PGHOST:$PGPORT"
    fi
else
    DOCKER_EXEC=""
fi

# Perform backup
log "Starting backup..."
START_TIME=$(date +%s)

if [ -n "$DOCKER_EXEC" ]; then
    $DOCKER_EXEC pg_dump -U "$PGUSER" -d "$PGDATABASE" \
        --format=custom \
        --compress=9 \
        --verbose 2>/dev/null | gzip > "$BACKUP_FILE"
else
    PGPASSWORD="${PGPASSWORD:-}" pg_dump \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        --format=custom \
        --compress=9 \
        --verbose 2>/dev/null | gzip > "$BACKUP_FILE"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

log "Backup completed in ${DURATION}s"
log "File: $BACKUP_FILE ($FILE_SIZE)"

# Cleanup old backups
cleanup_old_backups

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log ""
log "═══════════════════════════════════════════════════"
log "  Backup Summary"
log "  File:     $BACKUP_FILE"
log "  Size:     $FILE_SIZE"
log "  Duration: ${DURATION}s"
log "  Total:    $TOTAL_BACKUPS backups ($TOTAL_SIZE)"
log "═══════════════════════════════════════════════════"
