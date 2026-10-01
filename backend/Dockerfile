# ============================================================
# LifeLink Backend — Dockerfile
# Multi-purpose: API server, Celery worker, Celery beat
# ============================================================

FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies needed for ML libraries + OCR stack.
# tesseract  = OCR engine required by pytesseract (medical report images/scans)
# poppler    = PDF rasterizer required by pdf2image (scanned PDF reports)
# Without these, /api/analyze_report_file silently degrades for every
# scanned/image upload — the docs promise PDF/OCR support, so ship it.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libffi-dev \
    tesseract-ocr \
    poppler-utils \
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
