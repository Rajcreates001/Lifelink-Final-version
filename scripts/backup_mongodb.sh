#!/bin/bash
# ═══════════ mongodump ═══════════
# LifeLink MongoDB Backup Script
# ═══════════════════════════════════════════════════════════════
# Creates compressed backups of the LifeLink MongoDB database
# with automatic rotation of old backups.
#
# Usage:
#   ./scripts/backup_mongodb.sh
#   ./scripts/backup_mongodb.sh --database lifelink --retain 7
#
# Environment variables (or defaults):
#   MONGODB_URI  - MongoDB connection string
#   MONGO_HOST   - MongoDB host (default: localhost)
#   MONGO_PORT   - MongoDB port (default: 27017)
#   MONGO_USER   - MongoDB user (default: admin)
#   MONGO_DB     - Database name (default: lifelink)
#   BACKUP_DIR   - Backup directory (default: ./backups/mongodb)
#   RETAIN_DAYS  - Days to keep backups (default: 7)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_DB="${MONGO_DB:-lifelink}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/mongodb}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${MONGO_DB}_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
ARCHIVE_FILE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

# ─── Parse Arguments ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --database) MONGO_DB="$2"; shift 2 ;;
        --host) MONGO_HOST="$2"; shift 2 ;;
        --port) MONGO_PORT="$2"; shift 2 ;;
        --user) MONGO_USER="$2"; shift 2 ;;
        --retain) RETAIN_DAYS="$2"; shift 2 ;;
        --uri) MONGODB_URI="$2"; shift 2 ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --database NAME   MongoDB database (default: lifelink)"
            echo "  --host HOST       MongoDB host (default: localhost)"
            echo "  --port PORT       MongoDB port (default: 27017)"
            echo "  --user USER       MongoDB user (default: admin)"
            echo "  --retain DAYS     Days to keep backups (default: 7)"
            echo "  --uri URI         MongoDB connection URI"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ─── Functions ───────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; exit 1; }

cleanup_old_backups() {
    log "Cleaning up backups older than $RETAIN_DAYS days..."
    local count=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETAIN_DAYS 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETAIN_DAYS -delete
        log "Removed $count old backup(s)"
    else
        log "No old backups to remove"
    fi
}

# ─── Main ────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════"
log "  LifeLink MongoDB Backup"
log "  Database: $MONGO_DB @ $MONGO_HOST:$MONGO_PORT"
log "  Backup:   $ARCHIVE_FILE"
log "  Retain:   $RETAIN_DAYS days"
log "═══════════════════════════════════════════════════"

mkdir -p "$BACKUP_DIR"

# Determine mongodump command
MONGODUMP_CMD="mongodump"
if command -v mongosh &>/dev/null && docker ps --format '{{.Names}}' | grep -q mongo; then
    log "Using Docker mongodump..."
    USE_DOCKER=true
else
    USE_DOCKER=false
fi

# Perform backup
log "Starting backup..."
START_TIME=$(date +%s)

if [ "$USE_DOCKER" = true ]; then
    docker exec lifelink-mongo mongodump \
        --username "$MONGO_USER" \
        --password "${MONGO_PASSWORD:-password}" \
        --authenticationDatabase admin \
        --db "$MONGO_DB" \
        --out /tmp/backup \
        --gzip 2>/dev/null || true

    # Copy from container
    docker cp lifelink-mongo:/tmp/backup "$BACKUP_PATH" 2>/dev/null || {
        # Fallback: use mongodump directly via docker exec
        docker exec lifelink-mongo mongodump \
            --db "$MONGO_DB" \
            --out /tmp/backup 2>/dev/null || true
        docker cp lifelink-mongo:/tmp/backup "$BACKUP_PATH" 2>/dev/null || error "Failed to copy backup from container"
    }
else
    MONGODUMP_CMD="mongodump --host $MONGO_HOST --port $MONGO_PORT --db $MONGO_DB --out $BACKUP_PATH"
    if [ -n "${MONGODB_URI:-}" ]; then
        MONGODUMP_CMD="mongodump --uri $MONGODB_URI --db $MONGO_DB --out $BACKUP_PATH"
    fi
    eval $MONGODUMP_CMD 2>/dev/null || error "mongodump failed"
fi

# Compress backup
log "Compressing backup..."
tar -czf "$ARCHIVE_FILE" -C "$BACKUP_DIR" "$BACKUP_NAME" 2>/dev/null
rm -rf "$BACKUP_PATH"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
FILE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)

log "Backup completed in ${DURATION}s"
log "File: $ARCHIVE_FILE ($FILE_SIZE)"

# Cleanup old backups
cleanup_old_backups

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.tar.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log ""
log "═══════════════════════════════════════════════════"
log "  Backup Summary"
log "  File:     $ARCHIVE_FILE"
log "  Size:     $FILE_SIZE"
log "  Duration: ${DURATION}s"
log "  Total:    $TOTAL_BACKUPS backups ($TOTAL_SIZE)"
log "═══════════════════════════════════════════════════"
