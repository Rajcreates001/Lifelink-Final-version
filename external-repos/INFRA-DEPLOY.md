# 🏗️ Infrastructure, PWA & Deployment

> **Priority:** 🟢 P2 — Medium (nice-to-have)
> **Purpose:** Container orchestration, offline support, CDN, and advanced observability.

---

## 1. Kubernetes

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/kubernetes/kubernetes` |
| **Minikube** | `https://github.com/kubernetes/minikube` |
| **k3s (Lightweight)** | `https://github.com/k3s-io/k3s` |
| **Helm** | `https://github.com/helm/helm` |
| **Type** | Container Orchestration |
| **Effort** | ⏱ 16+ hours (significant learning curve) |

### What It Adds
- **Auto-scaling** — automatically spin up more backend pods when traffic spikes
- **Self-healing** — if a service crashes, Kubernetes restarts it automatically
- **Rolling updates** — deploy new versions with zero downtime
- **Service discovery** — services find each other by name
- **Secret management** — Kubernetes secrets for API keys
- **Horizontal Pod Autoscaler** — scale based on CPU/memory/custom metrics

### When to Upgrade from Docker Compose

| Docker Compose | Kubernetes |
|---------------|------------|
| Single node | Multi-node cluster |
| Manual restart | Auto-healing |
| No auto-scaling | Horizontal auto-scaling |
| Docker-only | Multiple container runtimes |
| Basic networking | Advanced networking, ingress, service mesh |

### Recommended Setup

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lifelink-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lifelink-backend
  template:
    spec:
      containers:
      - name: backend
        image: lifelink/backend:latest
        ports:
        - containerPort: 3010
        env:
        - name: GROQ_API_KEY
          valueFrom:
            secretKeyRef:
              name: lifelink-secrets
              key: groq-api-key
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lifelink-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lifelink-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 2. PWA & Offline Support

### 2.1 Vite PWA Plugin

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/vite-pwa/vite-plugin-pwa` |
| **Docs** | `https://vite-pwa-org.netlify.app/` |
| **Type** | PWA Build Plugin for Vite |
| **Effort** | ⏱ 2 hours |

#### What It Adds
- **Installable app** — users can "Add to Home Screen" on mobile
- **Service worker** — automatically generated with precaching
- **Offline support** — cached pages work without internet
- **Push notifications** — PWA supports push even when browser is closed
- **Splash screen** — custom app splash screen with LifeLink branding
- **App manifest** — icons, theme color, display mode

#### How to Integrate

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'LifeLink Emergency Response',
        short_name: 'LifeLink',
        description: 'AI-powered emergency response and healthcare coordination',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

### 2.2 Workbox

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/GoogleChrome/workbox` |
| **Docs** | `https://developer.chrome.com/docs/workbox/` |
| **Type** | Service Worker Library |
| **Effort** | ⏱ 4 hours (if not using Vite PWA plugin) |

#### Key Strategies for LifeLink

| Strategy | Use Case |
|----------|----------|
| **Cache First** | Static assets (icons, images, CSS) |
| **Network First** | API data (hospital list, bed availability) |
| **Stale-While-Revalidate** | User profile, settings |
| **Network Only** | SOS dispatch, ambulance assignment |

### 2.3 IndexedDB (idb)

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/jakearchibald/idb` |
| **Type** | IndexedDB Wrapper |
| **Effort** | ⏱ 2 hours |

#### What It Adds
- **Client-side database** — store data locally for offline access
- **Offline SOS queue** — if user sends SOS without internet, queue it locally and send when reconnected
- **Cache hospital data** — hospitals directory, bed info available offline
- **Background sync** — automatically submit queued data when connectivity returns

```javascript
import { openDB } from 'idb';

const db = await openDB('lifelink-offline', 1, {
  upgrade(db) {
    db.createObjectStore('sos-queue', { keyPath: 'id' });
    db.createObjectStore('hospitals', { keyPath: 'id' });
  },
});

// Queue SOS for later
await db.add('sos-queue', {
  id: crypto.randomUUID(),
  location: { lat: 12.9716, lng: 77.5946 },
  severity: 'high',
  timestamp: Date.now(),
});
```

---

## 3. Cloudflare CDN

| Detail | Value |
|--------|-------|
| **Python SDK** | `https://github.com/cloudflare/cloudflare-python` |
| **Docs** | `https://developers.cloudflare.com/` |
| **Type** | CDN, DNS, DDoS Protection, SSL |
| **Free Tier** | Generous free tier for CDN + SSL |
| **Effort** | ⏱ 2 hours |

### What It Adds
- **Global CDN** — frontend assets served from 330+ locations worldwide
- **Automatic SSL** — free SSL certificates with auto-renewal
- **DDoS protection** — absorbs attack traffic before it reaches your servers
- **Image optimization** — automatic WebP conversion, resizing
- **Workers** — serverless functions at the edge (e.g., redirect, A/B testing)
- **DNS** — fast, reliable DNS management

### Why LifeLink Needs This
For a healthcare platform that must be available during disasters (when traffic spikes massively), Cloudflare provides:
- **DDoS protection** — prevents attackers from taking down the SOS system
- **CDN** — fast page loads globally, especially critical during emergencies
- **SSL** — HIPAA requires encryption in transit

---

## 4. SigNoz

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/SigNoz/signoz` |
| **Docs** | `https://signoz.io/docs/` |
| **Type** | Open-source Observability Platform |
| **Free** | ✅ Fully open-source |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Traces, metrics, logs in one place** — OpenTelemetry-native
- **Application performance monitoring** — see p99 latency, error rate, throughput
- **Infrastructure monitoring** — CPU, memory, disk usage per service
- **Alerts** — configure alerts for high error rate or latency
- **Dashboards** — pre-built dashboards for FastAPI applications
- **Logs explorer** — search and filter logs with SQL-like queries

### Why Choose SigNoz over Datadog

| Factor | SigNoz (Self-host) | Datadog (SaaS) |
|--------|-------------------|----------------|
| **Cost** | FREE (your infrastructure) | $$$$ (very expensive at scale) |
| **Data residency** | Full control | AWS/GCP regions |
| **HIPAA** | You control the deployment | BAA available (Enterprise) |
| **Learning curve** | Medium | Medium-Low |

---

## 5. Nginx

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/nginx/nginx` |
| **Type** | Reverse Proxy & Load Balancer |
| **Effort** | ⏱ 2 hours |

### What It Adds
- **Reverse proxy** — route `/api/*` to backend, `/` to frontend
- **Load balancing** — distribute traffic across multiple backend instances
- **Rate limiting** — prevent abuse of SOS endpoint
- **SSL termination** — handle HTTPS before passing to backend
- **Static file serving** — serve frontend build directly with caching

```nginx
# nginx.conf
upstream backend {
    server backend1:3010;
    server backend2:3010;
}

server {
    listen 443 ssl;
    server_name lifelink.ai;

    # Rate limit SOS endpoint
    location /api/sos {
        limit_req zone=sos burst=5 nodelay;
        proxy_pass http://backend;
    }

    location /api/ {
        proxy_pass http://backend;
    }

    location / {
        root /var/www/lifelink;
        try_files $uri /index.html;
    }
}
```

---

## 6. Redis Stack

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/redis/redis-stack` |
| **Type** | Redis + Modules (JSON, Search, TimeSeries) |
| **Effort** | ⏱ 2 hours |

### What It Adds (beyond current Redis)
- **RedisJSON** — store/query JSON documents directly in Redis
- **RediSearch** — full-text search over cached data
- **RedisTimeSeries** — time-series data for metrics (request rates, response times)
- **RedisBloom** — probabilistic data structures for deduplication

---

## 📦 Installation Commands Summary

```bash
# Kubernetes
# Install minikube or k3s locally

# PWA
npm install vite-plugin-pwa workbox-webpack-plugin

# Offline
npm install idb

# Infrastructure
# Docker Compose additions:
services:
  signoz:        # signoz/signoz
  nginx:         # nginx:alpine
  redis-stack:   # redis/redis-stack
```
