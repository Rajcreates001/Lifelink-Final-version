# LifeLink Frontend — Multi-stage Docker Build
# Stage 1: Build the React app
# Stage 2: Serve with Nginx (with reverse proxy to backend)

# ─── Build Stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# CRITICAL: Force VITE_API_URL to empty string during build.
# In Docker, the frontend uses relative URLs and nginx proxies /v2/* to backend.
# This prevents any hardcoded localhost URLs from being baked into the JS bundle.
ENV VITE_API_URL=""

# Install dependencies
COPY client/package.json client/package-lock.json* ./
RUN npm ci --production=false

# Copy source and build (client/.env is excluded by .dockerignore)
COPY client/ ./
RUN npm run build

# ─── Production Stage ─────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx config with reverse proxy to backend
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
