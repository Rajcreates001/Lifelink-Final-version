# ============================================================
# LifeLink Backend — Dockerfile
# All stages share the same base image
# ============================================================

FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies needed for ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY backend/ /app/
COPY backend/ml/ /app/ml/

# Copy entrypoint to a location OUTSIDE /app so bind mounts don't override it
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

# Health check (shared by API container)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:3001/health').status)" 2>/dev/null || exit 1
