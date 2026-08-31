# ============================================================
# LifeLink Backend — Dockerfile
# Multi-purpose: API server, Celery worker, Celery beat
# ============================================================

FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies needed for ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libffi-dev \
    wget \
    curl \
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

# Expose the API port
EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]

# Default command is API server
CMD ["api"]
