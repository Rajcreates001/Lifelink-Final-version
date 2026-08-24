"""
Prometheus Metrics Middleware for FastAPI

Exposes /metrics endpoint with:
- HTTP request count, latency, status codes
- Active connections
- Business metrics (patients, ambulances, etc.)
- System metrics (uptime, memory)
"""

import time
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    REGISTRY,
)
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


# ─── HTTP Metrics ─────────────────────────────────────────────

http_requests_total = Counter(
    "lifelink_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

http_request_duration_seconds = Histogram(
    "lifelink_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

http_requests_in_progress = Gauge(
    "lifelink_http_requests_in_progress",
    "Number of HTTP requests currently in progress",
    ["method"],
)

http_request_errors_total = Counter(
    "lifelink_http_request_errors_total",
    "Total HTTP error responses (4xx, 5xx)",
    ["method", "endpoint", "status_code"],
)

# ─── Business Metrics ─────────────────────────────────────────

active_websocket_connections = Gauge(
    "lifelink_websocket_connections_active",
    "Active WebSocket connections per channel",
    ["channel"],
)

ambulances_tracked = Gauge(
    "lifelink_ambulances_tracked",
    "Number of ambulances being tracked by GPS simulation",
)

ambulance_position_updates_total = Counter(
    "lifelink_ambulance_position_updates_total",
    "Total GPS position updates broadcast",
)

gps_simulation_running = Gauge(
    "lifelink_gps_simulation_running",
    "Whether GPS simulation is active (1) or stopped (0)",
)

# ─── System Metrics ───────────────────────────────────────────

app_info = Info(
    "lifelink_app",
    "LifeLink application information",
)

app_uptime_seconds = Gauge(
    "lifelink_app_uptime_seconds",
    "Application uptime in seconds",
)

# Initialize app info
_start_time = time.time()
app_info.info({
    "version": "0.1.0",
    "environment": "development",
    "name": "lifelink-fastapi",
})


# ─── Middleware ────────────────────────────────────────────────

class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware that tracks HTTP request metrics for Prometheus."""

    # Endpoints to exclude from metrics (high-cardinality or health checks)
    EXCLUDE_ENDPOINTS = {"/health", "/metrics", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip excluded endpoints
        if path in self.EXCLUDE_ENDPOINTS:
            return await call_next(request)

        method = request.method
        http_requests_in_progress.labels(method=method).inc()

        start_time = time.time()
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            status_code = response.status_code

            # Normalize endpoint to reduce cardinality
            endpoint = self._normalize_path(path)

            http_requests_total.labels(
                method=method, endpoint=endpoint, status_code=status_code
            ).inc()

            http_request_duration_seconds.labels(
                method=method, endpoint=endpoint
            ).observe(duration)

            if status_code >= 400:
                http_request_errors_total.labels(
                    method=method, endpoint=endpoint, status_code=str(status_code)
                ).inc()

            return response

        except Exception as exc:
            duration = time.time() - start_time
            endpoint = self._normalize_path(path)
            http_request_errors_total.labels(
                method=method, endpoint=endpoint, status_code="500"
            ).inc()
            http_request_duration_seconds.labels(
                method=method, endpoint=endpoint
            ).observe(duration)
            raise

        finally:
            http_requests_in_progress.labels(method=method).dec()
            app_uptime_seconds.set(time.time() - _start_time)

    def _normalize_path(self, path: str) -> str:
        """Normalize path to reduce metric cardinality.
        e.g. /api/ambulance/123/update-location → /api/ambulance/:id/update-location
        """
        parts = path.strip("/").split("/")
        normalized = []
        for i, part in enumerate(parts):
            # Skip query params
            if "?" in part:
                part = part.split("?")[0]
            # Replace UUIDs and numeric IDs
            if len(part) > 20 and any(c.isdigit() for c in part):
                normalized.append(":id")
            elif part.isdigit() and i > 0:
                normalized.append(":id")
            else:
                normalized.append(part)
        return "/" + "/".join(normalized)


# ─── Metrics Endpoint ─────────────────────────────────────────

def get_metrics() -> Response:
    """Generate Prometheus metrics response."""
    # Update uptime
    app_uptime_seconds.set(time.time() - _start_time)

    metrics = generate_latest(REGISTRY)
    return Response(
        content=metrics,
        media_type=CONTENT_TYPE_LATEST,
    )
