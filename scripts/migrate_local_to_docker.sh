#!/bin/bash
# ============================================================
# LifeLink — Local to Docker Data Migration Script
# ============================================================
# This script dumps your LOCAL PostgreSQL database and
# imports it into the Docker PostgreSQL container.
#
# Prerequisites:
#   1. Docker containers running (docker compose up -d)
#   2. pg_dump installed locally (comes with PostgreSQL)
#   3. Local PostgreSQL credentials match defaults below
#
# Usage:
#   bash scripts/migrate_local_to_docker.sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  LifeLink Local → Docker Data Migration${NC}"
echo -e "${BLUE}============================================${NC}"

# ─── Configuration ──────────────────────────────────────────
LOCAL_DB_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASS="${LOCAL_DB_PASS:-postgres}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-lifelink_db}"

DOCKER_CONTAINER="${DOCKER_CONTAINER:-lifelink-postgres}"
DOCKER_DB_USER="${DOCKER_DB_USER:-postgres}"
DOCKER_DB_NAME="${DOCKER_DB_NAME:-lifelink_db}"

DUMP_FILE="${DUMP_FILE:-/tmp/lifelink_local_dump.sql}"

# ─── Step 1: Check prerequisites ────────────────────────────
echo -e "\n${YELLOW}[1/5]${NC} Checking prerequisites..."

# Check pg_dump
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}✗ pg_dump not found. Install PostgreSQL client tools.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pg_dump available${NC}"

# Check Docker is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}✗ Docker is not running. Start Docker Desktop first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"; then
    echo -e "${RED}✗ Docker container '${DOCKER_CONTAINER}' is not running.${NC}"
    echo -e "  Run: ${YELLOW}docker compose up -d postgres${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker container '${DOCKER_CONTAINER}' is running${NC}"

# ─── Step 2: Test local database connection ─────────────────
echo -e "\n${YELLOW}[2/5]${NC} Testing local database connection..."
export PGPASSWORD="${LOCAL_DB_PASS}"
if ! pg_isready -h "${LOCAL_DB_HOST}" -p "${LOCAL_DB_PORT}" -U "${LOCAL_DB_USER}" &> /dev/null; then
    echo -e "${RED}✗ Cannot connect to local PostgreSQL at ${LOCAL_DB_HOST}:${LOCAL_DB_PORT}${NC}"
    echo -e "  Make sure your local PostgreSQL is running."
    echo -e "  Override with: ${YELLOW}LOCAL_DB_HOST=... LOCAL_DB_PORT=... bash $0${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Local PostgreSQL is accessible${NC}"

# ─── Step 3: Dump local database ────────────────────────────
echo -e "\n${YELLOW}[3/5]${NC} Dumping local database '${LOCAL_DB_NAME}'..."
pg_dump \
    -h "${LOCAL_DB_HOST}" \
    -p "${LOCAL_DB_PORT}" \
    -U "${LOCAL_DB_USER}" \
    -d "${LOCAL_DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    -f "${DUMP_FILE}" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to dump database '${LOCAL_DB_NAME}'${NC}"
    exit 1
fi

DUMP_SIZE=$(wc -c < "${DUMP_FILE}" | numfmt --to=iec 2>/dev/null || echo "${DUMP_SIZE} bytes")
echo -e "${GREEN}✓ Database dumped to ${DUMP_FILE} (${DUMP_SIZE})${NC}"

# ─── Step 4: Import into Docker container ───────────────────
echo -e "\n${YELLOW}[4/5]${NC} Importing into Docker container '${DOCKER_CONTAINER}'..."

# Copy the dump file into the container
docker cp "${DUMP_FILE}" "${DOCKER_CONTAINER}:/tmp/lifelink_import.sql"
echo -e "${GREEN}✓ Dump file copied to container${NC}"

# Import into the Docker PostgreSQL
docker exec -i "${DOCKER_CONTAINER}" \
    psql -U "${DOCKER_DB_USER}" -d "${DOCKER_DB_NAME}" -f /tmp/lifelink_import.sql 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to import data into Docker PostgreSQL${NC}"
    echo -e "  Check the error above. You may need to clean the database first."
    echo -e "  Run: ${YELLOW}docker compose down postgres && docker compose up -d postgres${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Data imported into Docker PostgreSQL${NC}"

# Clean up temp file in container
docker exec "${DOCKER_CONTAINER}" rm -f /tmp/lifelink_import.sql 2>/dev/null || true

# ─── Step 5: Verify ─────────────────────────────────────────
echo -e "\n${YELLOW}[5/5]${NC} Verifying migration..."
docker exec "${DOCKER_CONTAINER}" \
    psql -U "${DOCKER_DB_USER}" -d "${DOCKER_DB_NAME}" \
    -c "SELECT COUNT(*) || ' tables' FROM information_schema.tables WHERE table_schema = 'public';"

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ Migration Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e ""
echo -e "Your local database data has been migrated to Docker."
echo -e "Restart the backend to use the migrated data:"
echo -e "  ${YELLOW}docker compose restart backend${NC}"
echo -e ""

# Clean up local dump file
rm -f "${DUMP_FILE}"
