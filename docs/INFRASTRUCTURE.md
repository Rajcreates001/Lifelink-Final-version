# LifeLink Infrastructure Guide

## GPS Ambulance Tracking Simulation

Software-based GPS simulation that generates realistic ambulance location data **without requiring physical GPS hardware**.

### How It Works

The GPS simulator (`backend/app/services/gps_simulator.py`) provides:

- **Realistic Movement**: Ambulances follow predefined routes in Bangalore with waypoint interpolation
- **Traffic Simulation**: Time-based traffic patterns (rush hour slowdowns)
- **Weather Effects**: Rain, fog, and heavy rain affect speed
- **Random Events**: Traffic jams, signal drops, weather changes
- **Vehicle Metrics**: Fuel, battery, signal strength simulation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gps-tracking/status` | Simulation status and stats |
| POST | `/api/gps-tracking/start` | Start simulation with 5 ambulances |
| POST | `/api/gps-tracking/stop` | Stop simulation |
| GET | `/api/gps-tracking/ambulances` | Get all ambulance positions |
| GET | `/api/gps-tracking/ambulance/{id}` | Get specific ambulance |
| POST | `/api/gps-tracking/register` | Register new ambulance |
| DELETE | `/api/gps-tracking/{id}` | Unregister ambulance |
| GET | `/api/gps-tracking/stats` | Simulation statistics |
| POST | `/api/gps-tracking/reset/{id}` | Reset ambulance route |
| GET | `/api/gps-tracking/routes` | List available routes |

### Usage

```bash
# Start simulation
curl -X POST http://localhost:4002/api/gps-tracking/start

# Get all positions
curl http://localhost:4002/api/gps-tracking/ambulances

# Stop simulation
curl -X POST http://localhost:4002/api/gps-tracking/stop
```

### Frontend Component

The `GPSTrackingSimulator` component (`client/src/components/ambulance/GPSTrackingSimulator.jsx`) provides:

- Live ambulance map with markers
- Real-time speed, fuel, battery, signal display
- Route progress visualization
- Traffic and weather indicators

---

## Load Testing

Comprehensive load testing using **Locust** for the LifeLink platform.

### Setup

```bash
cd loadtest
pip install -r requirements.txt
```

### Running Tests

```bash
# Interactive mode (web UI)
locust -f locustfile.py --host=http://localhost:4002

# Headless mode (CI/CD)
locust -f locustfile.py --host=http://localhost:4002 \
    --headless -u 100 -r 10 --run-time 2m \
    --html=reports/load_test_report.html
```

### Test Scenarios

| User Type | Weight | Tasks |
|-----------|--------|-------|
| HospitalUser | 3 | Hospital ops, auth, compliance |
| AmbulanceUser | 2 | Ambulance ops, GPS tracking, auth |
| GovernmentUser | 2 | Government ops, compliance, auth |
| PublicUser | 1 | Auth endpoints |

### Metrics Collected

- Request rate (req/s)
- Response time (p50, p95, p99)
- Failure rate
- Concurrent user capacity

---

## Monitoring Stack

**Prometheus + Grafana** monitoring for the LifeLink platform.

### Setup

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin / lifelink |
| Prometheus | http://localhost:9090 | - |

### Dashboard

The pre-configured Grafana dashboard (`lifelink-overview.json`) includes:

- Backend API uptime
- CPU, Memory, Disk usage
- HTTP request rate
- Response time percentiles (p50, p95)

### Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  LifeLink API   │────▶│    Prometheus    │
│   (port 4002)   │     │   (port 9090)    │
└─────────────────┘     └────────┬─────────┘
                                 │
┌─────────────────┐              │
│  Node Exporter  │──────────────┘
│   (port 9100)   │
└─────────────────┘              │
                                 ▼
                         ┌──────────────────┐
                         │     Grafana      │
                         │   (port 3000)    │
                         └──────────────────┘
```

### Metrics Endpoints

The backend exposes standard metrics at `/metrics` for Prometheus scraping.

---

## Running Everything Together

```bash
# Start main services
docker-compose up -d

# Start monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Start GPS simulation (via API)
curl -X POST http://localhost:4002/api/gps-tracking/start

# Run load tests
cd ../loadtest
locust -f locustfile.py --host=http://localhost:4002
```

---

## Project Completion Status

### ✅ Completed Features

| Category | Feature | Status |
|----------|---------|--------|
| **GPS Tracking** | Software-based simulation | ✅ Complete |
| **GPS Tracking** | Real-time position updates | ✅ Complete |
| **GPS Tracking** | Traffic/weather simulation | ✅ Complete |
| **GPS Tracking** | Frontend visualization | ✅ Complete |
| **Load Testing** | Locust configuration | ✅ Complete |
| **Load Testing** | Hospital user scenarios | ✅ Complete |
| **Load Testing** | Ambulance user scenarios | ✅ Complete |
| **Load Testing** | Government user scenarios | ✅ Complete |
| **Monitoring** | Prometheus setup | ✅ Complete |
| **Monitoring** | Grafana dashboards | ✅ Complete |
| **Monitoring** | Node exporter | ✅ Complete |
| **API Wiring** | Government modules | ✅ Complete |
| **API Wiring** | Ambulance modules | ✅ Complete |

### 📊 Project Completion: ~92%

### Remaining Items

| Item | Priority | Effort |
|------|----------|--------|
| Real ABDM/FHIR integration | Low | External dependency |
| Full TypeScript migration | Low | Not needed for college project |
| Production load testing | Medium | Requires production traffic |
| Real GPS hardware integration | Low | Requires physical devices |

---

## Environment Variables

```bash
# GPS Simulation
GPS_UPDATE_INTERVAL=2          # Seconds between position updates
GPS_DEFAULT_AMBULANCES=5       # Number of simulated ambulances

# Monitoring
PROMETHEUS_SCRAPE_INTERVAL=15s # How often Prometheus scrapes metrics
GRAFANA_ADMIN_PASSWORD=lifelink
```
