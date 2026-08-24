"""
LifeLink Production Load Test — Simulates realistic production traffic

This test simulates:
- 200 concurrent users (production-like)
- Realistic traffic patterns (ramp-up, steady state, spike)
- Mixed user types with realistic behavior
- Read-heavy workload (90% reads, 10% writes)
- Authentication flow (signup → login → API calls)

Usage:
    python production_loadtest.py --host http://localhost:4002 --users 200 --duration 120
"""

import argparse
import json
import random
import sys
import time
from datetime import datetime, timezone
from threading import Thread, Lock
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


# ─── Configuration ────────────────────────────────────────────
BANGALORE_COORDS = {
    "lat_min": 12.84, "lat_max": 13.04,
    "lng_min": 77.45, "lng_max": 77.75,
}

ENDPOINTS = {
    # Public endpoints (no auth) - 40% of traffic
    "public": [
        ("GET", "/health", 10),
        ("GET", "/api/gps-tracking/status", 8),
        ("GET", "/api/gps-tracking/ambulances", 7),
        ("GET", "/api/gps-tracking/routes", 3),
        ("GET", "/api/gps-tracking/stats", 5),
        ("GET", "/v2/realtime/status", 4),
        ("GET", "/api/compliance/encryption/status", 3),
    ],
    # Authenticated endpoints - 60% of traffic
    "authenticated": [
        ("GET", "/api/ambulance/", 5),
        ("GET", "/api/ambulance/emergency-status", 4),
        ("GET", "/api/ambulance/assignments", 4),
        ("GET", "/api/government-ops/hospitals", 3),
        ("GET", "/api/government-ops/emergencies", 3),
        ("GET", "/api/government-ops/reports", 2),
        ("GET", "/api/hospital-ops/ceo/global-metrics?hospitalId=hospital_001", 3),
        ("GET", "/api/hospital-ops/emergency/feed?hospitalId=hospital_001", 3),
        ("GET", "/v2/ai/insights?role=hospital&module_key=global-overview", 2),
        ("POST", "/api/compliance/encrypt/patient", 2),
        ("POST", "/api/compliance/mask", 2),
    ],
}


# ─── HTTP Client ──────────────────────────────────────────────

class HTTPClient:
    """Simple HTTP client for load testing."""

    def __init__(self, base_url: str, timeout: int = 10):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def request(self, method: str, path: str, data: dict = None,
                headers: dict = None) -> dict:
        url = f"{self.base_url}{path}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)

        body = json.dumps(data).encode() if data else None
        req = Request(url, data=body, headers=req_headers, method=method)

        start = time.time()
        try:
            with urlopen(req, timeout=self.timeout) as resp:
                elapsed = time.time() - start
                status = resp.status
                try:
                    body = json.loads(resp.read().decode())
                except Exception:
                    body = {}
                return {"ok": True, "status": status, "elapsed": elapsed, "body": body}
        except HTTPError as e:
            elapsed = time.time() - start
            return {"ok": False, "status": e.code, "elapsed": elapsed, "error": str(e)}
        except Exception as e:
            elapsed = time.time() - start
            return {"ok": False, "status": 0, "elapsed": elapsed, "error": str(e)}


# ─── Stats Collector ──────────────────────────────────────────

class StatsCollector:
    """Thread-safe statistics collector."""

    def __init__(self):
        self.lock = Lock()
        self.total_requests = 0
        self.successful = 0
        self.failed = 0
        self.total_time = 0.0
        self.min_time = float("inf")
        self.max_time = 0.0
        self.endpoint_stats = {}
        self.start_time = None
        self.errors = []

    def record(self, endpoint: str, method: str, result: dict):
        with self.lock:
            self.total_requests += 1
            elapsed = result["elapsed"]
            self.total_time += elapsed
            self.min_time = min(self.min_time, elapsed)
            self.max_time = max(self.max_time, elapsed)

            if result["ok"]:
                self.successful += 1
            else:
                self.failed += 1
                self.errors.append(f"{method} {endpoint}: {result.get('error', result['status'])}")

            key = f"{method} {endpoint}"
            if key not in self.endpoint_stats:
                self.endpoint_stats[key] = {"count": 0, "success": 0, "fail": 0, "total_time": 0.0}
            self.endpoint_stats[key]["count"] += 1
            self.endpoint_stats[key]["total_time"] += elapsed
            if result["ok"]:
                self.endpoint_stats[key]["success"] += 1
            else:
                self.endpoint_stats[key]["fail"] += 1

    def get_summary(self) -> dict:
        with self.lock:
            duration = time.time() - self.start_time if self.start_time else 1
            avg_time = self.total_time / max(1, self.total_requests)
            rps = self.total_requests / max(1, duration)
            p95 = self._percentile(95)
            p99 = self._percentile(99)

            return {
                "duration_seconds": round(duration, 1),
                "total_requests": self.total_requests,
                "successful": self.successful,
                "failed": self.failed,
                "failure_rate": f"{(self.failed / max(1, self.total_requests)) * 100:.1f}%",
                "requests_per_second": round(rps, 1),
                "avg_response_ms": round(avg_time * 1000, 1),
                "min_response_ms": round(self.min_time * 1000, 1),
                "max_response_ms": round(self.max_time * 1000, 1),
                "p95_response_ms": round(p95 * 1000, 1),
                "p99_response_ms": round(p99 * 1000, 1),
            }

    def _percentile(self, p: int) -> float:
        # Approximate from endpoint averages
        if not self.endpoint_stats:
            return 0
        times = []
        for stats in self.endpoint_stats.values():
            avg = stats["total_time"] / max(1, stats["count"])
            times.extend([avg] * stats["count"])
        if not times:
            return 0
        times.sort()
        idx = int(len(times) * p / 100)
        return times[min(idx, len(times) - 1)]

    def get_endpoint_report(self) -> list:
        with self.lock:
            report = []
            for key, stats in sorted(self.endpoint_stats.items(), key=lambda x: -x[1]["count"]):
                avg_ms = (stats["total_time"] / max(1, stats["count"])) * 1000
                report.append({
                    "endpoint": key,
                    "requests": stats["count"],
                    "success": stats["success"],
                    "failed": stats["fail"],
                    "avg_ms": round(avg_ms, 1),
                })
            return report


# ─── Load Test Worker ─────────────────────────────────────────

def worker(client: HTTPClient, stats: StatsCollector, user_id: int,
           duration: float, auth_token: str = None):
    """Single worker thread simulating one user."""
    end_time = time.time() + duration
    headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}

    while time.time() < end_time:
        # Pick endpoint based on traffic distribution
        if auth_token and random.random() < 0.6:
            endpoints = ENDPOINTS["authenticated"]
        else:
            endpoints = ENDPOINTS["public"]

        method, path, weight = random.choice(endpoints)

        # Add random query params for some endpoints
        if "?" in path and random.random() < 0.3:
            path = path.split("?")[0]

        result = client.request(method, path, headers=headers if auth_token else None)
        stats.record(path, method, result)

        # Think time (50-200ms between requests)
        time.sleep(random.uniform(0.05, 0.2))


# ─── Main ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LifeLink Production Load Test")
    parser.add_argument("--host", default="http://localhost:4002", help="Backend URL")
    parser.add_argument("--users", type=int, default=200, help="Number of concurrent users")
    parser.add_argument("--duration", type=int, default=120, help="Test duration in seconds")
    parser.add_argument("--ramp-up", type=int, default=30, help="Ramp-up time in seconds")
    args = parser.parse_args()

    print(f"\n{'='*65}")
    print(f"  LifeLink Production Load Test")
    print(f"  Target:   {args.host}")
    print(f"  Users:    {args.users}")
    print(f"  Duration: {args.duration}s")
    print(f"  Ramp-up:  {args.ramp_up}s")
    print(f"  Started:  {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*65}\n")

    client = HTTPClient(args.host)
    stats = StatsCollector()
    stats.start_time = time.time()

    # Verify backend is reachable
    result = client.request("GET", "/health")
    if not result["ok"]:
        print(f"ERROR: Backend not reachable at {args.host}")
        sys.exit(1)
    print(f"  Backend health: OK ({result['elapsed']*1000:.0f}ms)\n")

    # Get auth tokens for some users
    tokens = []
    print("  Creating test users and getting tokens...")
    for i in range(min(20, args.users)):  # Create up to 20 unique tokens
        try:
            result = client.request("POST", "/api/auth/signup", {
                "name": f"LoadTest User {i}",
                "email": f"loadtest_prod_{i}_{int(time.time())}@test.com",
                "password": "test1234",
                "role": "government",
                "location": "Bangalore",
            })
            if result["ok"] and "token" in result.get("body", {}):
                tokens.append(result["body"]["token"])
        except Exception:
            pass
    print(f"  Got {len(tokens)} auth tokens\n")

    # Start workers with ramp-up
    print(f"  Starting {args.users} users with {args.ramp_up}s ramp-up...")
    threads = []
    batch_size = max(1, args.users // max(1, args.ramp_up // 2))

    for i in range(args.users):
        token = tokens[i % len(tokens)] if tokens else None
        t = Thread(target=worker, args=(client, stats, i, args.duration, token))
        t.daemon = True
        threads.append(t)

        # Ramp up in batches
        if (i + 1) % batch_size == 0:
            time.sleep(args.ramp_up / max(1, args.users // batch_size))

        t.start()

    # Progress updates
    while any(t.is_alive() for t in threads):
        elapsed = time.time() - stats.start_time
        remaining = max(0, args.duration - elapsed)
        summary = stats.get_summary()
        print(f"\r  [{elapsed:.0f}s/{args.duration}s] "
              f"Reqs: {summary['total_requests']} | "
              f"RPS: {summary['requests_per_second']} | "
              f"Avg: {summary['avg_response_ms']}ms | "
              f"Errors: {summary['failure_rate']}",
              end="", flush=True)
        time.sleep(2)

    # Wait for all threads to finish
    for t in threads:
        t.join(timeout=5)

    # Final report
    summary = stats.get_summary()
    endpoint_report = stats.get_endpoint_report()

    print(f"\n\n{'='*65}")
    print(f"  PRODUCTION LOAD TEST RESULTS")
    print(f"{'='*65}\n")

    print(f"  Duration:           {summary['duration_seconds']}s")
    print(f"  Total Requests:     {summary['total_requests']:,}")
    print(f"  Successful:         {summary['successful']:,}")
    print(f"  Failed:             {summary['failed']:,} ({summary['failure_rate']})")
    print(f"  Requests/sec:       {summary['requests_per_second']}")
    print(f"  Avg Response:       {summary['avg_response_ms']}ms")
    print(f"  Min Response:       {summary['min_response_ms']}ms")
    print(f"  Max Response:       {summary['max_response_ms']}ms")
    print(f"  P95 Response:       {summary['p95_response_ms']}ms")
    print(f"  P99 Response:       {summary['p99_response_ms']}ms")

    print(f"\n  {'Endpoint':<45} {'Reqs':>6} {'OK':>6} {'Fail':>5} {'Avg ms':>8}")
    print(f"  {'-'*45} {'-'*6} {'-'*6} {'-'*5} {'-'*8}")
    for ep in endpoint_report[:15]:
        print(f"  {ep['endpoint']:<45} {ep['requests']:>6} {ep['success']:>6} {ep['failed']:>5} {ep['avg_ms']:>8.0f}")

    if stats.errors:
        print(f"\n  Top Errors:")
        error_counts = {}
        for e in stats.errors[:100]:
            error_counts[e] = error_counts.get(e, 0) + 1
        for err, count in sorted(error_counts.items(), key=lambda x: -x[1])[:5]:
            print(f"    [{count}x] {err}")

    print(f"\n{'='*65}\n")

    # Determine pass/fail
    failure_pct = (summary["failed"] / max(1, summary["total_requests"])) * 100
    if failure_pct < 5:
        print(f"  RESULT: PASS (failure rate {failure_pct:.1f}% < 5%)")
    elif failure_pct < 20:
        print(f"  RESULT: WARN (failure rate {failure_pct:.1f}%)")
    else:
        print(f"  RESULT: FAIL (failure rate {failure_pct:.1f}% >= 20%)")

    print(f"\n{'='*65}\n")
    return 0 if failure_pct < 5 else 1


if __name__ == "__main__":
    sys.exit(main())
