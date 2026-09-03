# LifeLink Frontend — Multi-stage Docker Build
# Stage 1: Build the React app
# Stage 2: Serve with Nginx (with reverse proxy to backend)

# ─── Build Stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY client/package.json client/package-lock.json* ./
RUN npm ci --production=false

# Copy source and build
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
