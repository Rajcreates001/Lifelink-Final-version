#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# LifeLink MongoDB Restore Script
# ═══════════════════════════════════════════════════════════════
# Restores a MongoDB database from a compressed backup.
#
# Usage:
#   ./scripts/restore_mongodb.sh backup_file.tar.gz
#   ./scripts/restore_mongodb.sh --latest
#   ./scripts/restore_mongodb.sh --list
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_DB="${MONGO_DB:-lifelink}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/mongodb}"

# ─── Functions ───────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; exit 1; }

list_backups() {
    log "Available MongoDB backups:"
    echo ""
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
        echo "  No backups found in $BACKUP_DIR"
        return
    fi
    echo "  Date                    File                          Size"
    echo "  ─────────────────────── ───────────────────────────── ──────"
    for f in $(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null); do
        local fname=$(basename "$f")
        local fsize=$(du -h "$f" | cut -f1)
        local fdate=$(stat -c %y "$f" 2>/dev/null || stat -f "%Sm" "$f" 2>/dev/null)
        echo "  $fdate  $fname  $fsize"
    done
}

get_latest_backup() {
    ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1
}

# ─── Parse Arguments ─────────────────────────────────────────
BACKUP_FILE=""
LIST_ONLY=false
USE_LATEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --list) LIST_ONLY=true; shift ;;
        --latest) USE_LATEST=true; shift ;;
        --database) MONGO_DB="$2"; shift 2 ;;
        --host) MONGO_HOST="$2"; shift 2 ;;
        --port) MONGO_PORT="$2"; shift 2 ;;
        --dir) BACKUP_DIR="$2"; shift 2 ;;
        --help)
            echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
            echo "Options:"
            echo "  --list          List available backups"
            echo "  --latest        Restore from latest backup"
            echo "  --database NAME Database name (default: lifelink)"
            echo "  --host HOST     MongoDB host (default: localhost)"
            echo "  --port PORT     MongoDB port (default: 27017)"
            echo "  --dir PATH      Backup directory"
            exit 0 ;;
        *.tar.gz) BACKUP_FILE="$1"; shift ;;
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
log "  LifeLink MongoDB Restore"
log "  Database: $MONGO_DB @ $MONGO_HOST:$MONGO_PORT"
log "  Backup:   $BACKUP_FILE"
log "  Size:     $(du -h "$BACKUP_FILE" | cut -f1)"
log "═══════════════════════════════════════════════════"
log ""
log "⚠️  WARNING: This will OVERWRITE the current database!"
log ""

if [ -t 0 ]; then
    read -p "Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log "Restore cancelled."
        exit 0
    fi
fi

# ─── Extract Backup ──────────────────────────────────────────
TEMP_DIR=$(mktemp -d)
log "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" 2>/dev/null
EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d | grep -v "^$TEMP_DIR$" | head -1)

if [ -z "$EXTRACTED_DIR" ]; then
    error "Failed to extract backup"
fi

# ─── Restore ─────────────────────────────────────────────────
log "Restoring from backup..."
START_TIME=$(date +%s)

if docker ps --format '{{.Names}}' | grep -q mongo; then
    log "Using Docker mongorestore..."
    docker cp "$EXTRACTED_DIR" lifelink-mongo:/tmp/restore 2>/dev/null
    docker exec lifelink-mongo mongorestore \
        --db "$MONGO_DB" \
        --drop \
        /tmp/restore/ 2>/dev/null || log "Warning: mongorestore reported some issues"
    docker exec lifelink-mongo rm -rf /tmp/restore 2>/dev/null
else
    mongorestore \
        --host "$MONGO_HOST" \
        --port "$MONGO_PORT" \
        --db "$MONGO_DB" \
        --drop \
        "$EXTRACTED_DIR" 2>/dev/null || log "Warning: mongorestore reported some issues"
fi

# Cleanup
rm -rf "$TEMP_DIR"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log ""
log "═══════════════════════════════════════════════════"
log "  Restore Complete"
log "  Database: $MONGO_DB"
log "  Duration: ${DURATION}s"
log "  Source:   $BACKUP_FILE"
log "═══════════════════════════════════════════════════"
