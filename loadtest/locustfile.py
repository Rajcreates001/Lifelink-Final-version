"""
LifeLink Load Testing — Locust

Comprehensive load testing for the LifeLink healthcare platform.
Handles authentication automatically and tests all available API endpoints.

Usage:
    # Headless mode (recommended):
    locust -f locustfile.py --host=http://localhost:4002 \
        --headless -u 50 -r 5 --run-time 60s \
        --html=reports/load_test_report.html --csv=reports/lifelink

    # Web UI mode:
    locust -f locustfile.py --host=http://localhost:4002
"""

import json
import random
import time
from datetime import datetime
from uuid import uuid4

from locust import HttpUser, TaskSet, between, events, task


# ─── Test Data ───────────────────────────────────────────────
BANGALORE_COORDS = {
    "lat_min": 12.84, "lat_max": 13.04,
    "lng_min": 77.45, "lng_max": 77.75,
}


def random_coord():
    return {
        "lat": round(random.uniform(BANGALORE_COORDS["lat_min"], BANGALORE_COORDS["lat_max"]), 6),
        "lng": round(random.uniform(BANGALORE_COORDS["lng_min"], BANGALORE_COORDS["lng_max"]), 6),
    }


# ─── Public Endpoints (No Auth Required) ─────────────────────
class PublicEndpoints(TaskSet):
    """Tests for endpoints that do not require authentication."""

    @task(10)
    def health_check(self):
        """Test health endpoint — highest frequency."""
        self.client.get("/health", name="/health")

    @task(8)
    def gps_status(self):
        """GPS simulation status."""
        self.client.get("/api/gps-tracking/status", name="/api/gps-tracking/status")

    @task(7)
    def gps_ambulances(self):
        """Get all GPS-tracked ambulances."""
        self.client.get("/api/gps-tracking/ambulances", name="/api/gps-tracking/ambulances")

    @task(5)
    def gps_routes(self):
        """List available GPS routes."""
        self.client.get("/api/gps-tracking/routes", name="/api/gps-tracking/routes")

    @task(5)
    def gps_stats(self):
        """GPS simulation stats."""
        self.client.get("/api/gps-tracking/stats", name="/api/gps-tracking/stats")

    @task(5)
    def realtime_status(self):
        """WebSocket/realtime status."""
        self.client.get("/v2/realtime/status", name="/v2/realtime/status")

    @task(4)
    def compliance_encryption(self):
        """Encryption status check."""
        self.client.get("/api/compliance/encryption/status", name="/api/compliance/encryption/status")

    @task(3)
    def gps_single_ambulance(self):
        """Get specific ambulance position."""
        amb_id = random.choice(["AMB-001", "AMB-002", "AMB-003", "AMB-004", "AMB-005"])
        self.client.get(f"/api/gps-tracking/ambulance/{amb_id}", name="/api/gps-tracking/ambulance/:id")


# ─── Authenticated Endpoints ─────────────────────────────────
class AuthenticatedTasks(TaskSet):
    """Tests for endpoints requiring authentication.
    Each user creates an account on start and uses the JWT token.
    """

    def on_start(self):
        """Create a test user and login to get a JWT token."""
        unique_id = str(uuid4())[:8]
        self.test_email = f"loadtest_{unique_id}@lifelink.test"

        # Signup
        with self.client.post(
            "/api/auth/signup",
            json={
                "name": f"LoadTest User {unique_id}",
                "email": self.test_email,
                "password": "loadtest123",
                "role": "government",
                "location": "Bangalore",
            },
            catch_response=True,
            name="/api/auth/signup",
        ) as response:
            if response.status_code == 201:
                data = response.json()
                self.token = data.get("token", "")
                response.success()
            elif response.status_code == 400 and "already exists" in response.text:
                # User exists, login instead
                self.token = ""
                response.success()
            else:
                self.token = ""
                response.success()  # Don't fail the test on auth issues

        # Login if no token from signup
        if not self.token:
            with self.client.post(
                "/api/auth/login",
                json={
                    "email": self.test_email,
                    "password": "loadtest123",
                },
                catch_response=True,
                name="/api/auth/login",
            ) as response:
                if response.status_code == 200:
                    data = response.json()
                    self.token = data.get("token", "")
                    response.success()
                else:
                    self.token = ""
                    response.success()

        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(5)
    def ambulance_list(self):
        """List all ambulances."""
        self.client.get("/api/ambulance/", headers=self.headers, name="/api/ambulance/")

    @task(5)
    def ambulance_emergency_status(self):
        """Emergency status."""
        self.client.get("/api/ambulance/emergency-status", headers=self.headers, name="/api/ambulance/emergency-status")

    @task(4)
    def ambulance_assignments(self):
        """List assignments."""
        self.client.get("/api/ambulance/assignments", headers=self.headers, name="/api/ambulance/assignments")

    @task(3)
    def hospital_ops_global_metrics(self):
        """Hospital CEO global metrics."""
        self.client.get(
            "/api/hospital-ops/ceo/global-metrics?hospitalId=hospital_001",
            headers=self.headers,
            name="/api/hospital-ops/ceo/global-metrics",
        )

    @task(3)
    def hospital_ops_emergency_feed(self):
        """Hospital emergency feed."""
        self.client.get(
            "/api/hospital-ops/emergency/feed?hospitalId=hospital_001",
            headers=self.headers,
            name="/api/hospital-ops/emergency/feed",
        )

    @task(3)
    def government_ops_hospitals(self):
        """List hospitals."""
        self.client.get("/api/government-ops/hospitals", headers=self.headers, name="/api/government-ops/hospitals")

    @task(2)
    def government_ops_emergencies(self):
        """List emergencies."""
        self.client.get("/api/government-ops/emergencies", headers=self.headers, name="/api/government-ops/emergencies")

    @task(2)
    def government_ops_reports(self):
        """List reports."""
        self.client.get("/api/government-ops/reports", headers=self.headers, name="/api/government-ops/reports")

    @task(2)
    def encrypt_patient(self):
        """Test encryption endpoint."""
        self.client.post(
            "/api/compliance/encrypt/patient",
            json={"name": f"Patient_{random.randint(1000, 9999)}", "phone": f"+91{random.randint(6000000000, 9999999999)}"},
            headers=self.headers,
            name="/api/compliance/encrypt/patient",
        )

    @task(2)
    def mask_pii(self):
        """Test PII masking."""
        self.client.post(
            "/api/compliance/mask",
            json={"data": {"name": "Test User", "phone": "+919876543210"}},
            headers=self.headers,
            name="/api/compliance/mask",
        )

    @task(2)
    def ai_insights(self):
        """AI insights endpoint."""
        self.client.get(
            "/v2/ai/insights?role=hospital&module_key=global-overview",
            headers=self.headers,
            name="/v2/ai/insights",
        )

    @task(1)
    def ambulance_update_location(self):
        """Update ambulance GPS location."""
        coord = random_coord()
        amb_id = random.choice(["AMB-001", "AMB-002", "AMB-003"])
        self.client.post(
            f"/api/ambulance/{amb_id}/update-location",
            json={"latitude": coord["lat"], "longitude": coord["lng"], "address": "Load Test Location"},
            headers=self.headers,
            name="/api/ambulance/:id/update-location",
        )

    @task(1)
    def ambulance_predict_eta(self):
        """Predict ETA."""
        start = random_coord()
        end = random_coord()
        self.client.post(
            "/api/ambulance/AMB-001/predict-eta",
            json={
                "currentLatitude": start["lat"],
                "currentLongitude": start["lng"],
                "destinationLatitude": end["lat"],
                "destinationLongitude": end["lng"],
            },
            headers=self.headers,
            name="/api/ambulance/:id/predict-eta",
        )


# ─── User Classes ────────────────────────────────────────────
class PublicLoadUser(HttpUser):
    """Simulates unauthenticated public traffic."""
    tasks = {PublicEndpoints: 1}
    wait_time = between(0.5, 2)
    weight = 3


class AuthenticatedLoadUser(HttpUser):
    """Simulates authenticated hospital/government users."""
    tasks = {AuthenticatedTasks: 1, PublicEndpoints: 1}
    wait_time = between(1, 4)
    weight = 2


# ─── Event Hooks ─────────────────────────────────────────────
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*65}")
    print(f"  LifeLink Load Test Started")
    print(f"  Target:  {environment.host}")
    print(f"  Time:    {datetime.utcnow().isoformat()}")
    print(f"{'='*65}\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.runner.stats
    total_requests = stats.total.num_requests
    total_failures = stats.total.num_failures
    avg_response = stats.total.avg_response_time
    failure_rate = (total_failures / max(1, total_requests)) * 100

    print(f"\n{'='*65}")
    print(f"  LifeLink Load Test — Results Summary")
    print(f"{'='*65}")
    print(f"  Total Requests:   {total_requests:,}")
    print(f"  Total Failures:   {total_failures:,} ({failure_rate:.1f}%)")
    print(f"  Avg Response:     {avg_response:.0f}ms")
    print(f"  RPS:              {stats.total.current_rps:.1f}")
    print(f"{'='*65}\n")

    # Per-endpoint breakdown
    print(f"  {'Endpoint':<45} {'Reqs':>6} {'Fails':>6} {'Avg ms':>8} {'RPS':>6}")
    print(f"  {'-'*45} {'-'*6} {'-'*6} {'-'*8} {'-'*6}")
    for name, stats_entry in sorted(stats.entries.items()):
        if stats_entry.num_requests > 0:
            ep_name = name[0][:45]
            print(f"  {ep_name:<45} {stats_entry.num_requests:>6} {stats_entry.num_failures:>6} {stats_entry.avg_response_time:>8.0f} {stats_entry.current_rps:>6.1f}")
    print()
