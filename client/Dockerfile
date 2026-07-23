# ============================================================
# LifeLink Frontend — Dockerfile
# ============================================================
FROM node:20-bullseye

WORKDIR /app

# Copy package files first for layer caching
COPY client/package.json client/package-lock.json* ./
RUN npm install

# Copy source code
COPY client/ .

# Expose dev server port
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5000"]
