"""
LifeLink GPS Ambulance Tracking Simulation

Software-based GPS simulation that generates realistic ambulance location data
without requiring physical GPS hardware. Simulates:
- Realistic ambulance movement along road networks
- Traffic-based speed variations
- Route following with waypoints
- Random events (traffic jams, accidents, route changes)
- Battery/signal degradation simulation
"""

import asyncio
import json
import logging
import math
import random
import time
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger("lifelink.gps_simulator")

# Bangalore city coordinates (center point)
DEFAULT_CENTER = {"lat": 12.9716, "lng": 77.5946}

# Predefined ambulance routes in Bangalore (simulated road networks)
AMBULANCE_ROUTES = {
    "route_1": {
        "name": "MG Road to Koramangala",
        "waypoints": [
            {"lat": 12.9758, "lng": 77.6085, "name": "MG Road"},
            {"lat": 12.9745, "lng": 77.6050, "name": "Brigade Road"},
            {"lat": 12.9720, "lng": 77.6010, "name": "Residency Road"},
            {"lat": 12.9690, "lng": 77.5980, "name": "JC Road"},
            {"lat": 12.9650, "lng": 77.5960, "name": "Mekhri Circle"},
            {"lat": 12.9600, "lng": 77.5940, "name": "Hebbal"},
            {"lat": 12.9550, "lng": 77.5920, "name": "Koramangala"},
        ],
        "distance_km": 8.5,
        "estimated_minutes": 18,
    },
    "route_2": {
        "name": "Whitefield to Indiranagar",
        "waypoints": [
            {"lat": 12.9698, "lng": 77.7500, "name": "Whitefield"},
            {"lat": 12.9710, "lng": 77.7200, "name": "Marathahalli"},
            {"lat": 12.9720, "lng": 77.6900, "name": "HAL"},
            {"lat": 12.9730, "lng": 77.6600, "name": "Indiranagar"},
        ],
        "distance_km": 12.0,
        "estimated_minutes": 25,
    },
    "route_3": {
        "name": "Electronic City to Bannerghatta",
        "waypoints": [
            {"lat": 12.8450, "lng": 77.6600, "name": "Electronic City"},
            {"lat": 12.8700, "lng": 77.6400, "name": "Hosur Road"},
            {"lat": 12.8950, "lng": 77.6200, "name": "BTM Layout"},
            {"lat": 12.9200, "lng": 77.6000, "name": "Bannerghatta Road"},
        ],
        "distance_km": 15.0,
        "estimated_minutes": 30,
    },
}

# Traffic patterns (hour -> speed multiplier)
TRAFFIC_PATTERNS = {
    0: 0.9, 1: 0.95, 2: 0.95, 3: 0.95, 4: 0.95, 5: 0.9,
    6: 0.7, 7: 0.5, 8: 0.4, 9: 0.45, 10: 0.6, 11: 0.7,
    12: 0.65, 13: 0.7, 14: 0.75, 15: 0.7, 16: 0.6, 17: 0.45,
    18: 0.4, 19: 0.5, 20: 0.6, 21: 0.7, 22: 0.8, 23: 0.85,
}


class SimulatedAmbulance:
    """Represents a single simulated ambulance with realistic movement."""

    def __init__(self, ambulance_id: str, route_key: str = None):
        self.ambulance_id = ambulance_id
        self.route_key = route_key or random.choice(list(AMBULANCE_ROUTES.keys()))
        self.route = AMBULANCE_ROUTES[self.route_key]
        self.waypoints = self.route["waypoints"]
        self.current_waypoint_index = 0
        self.progress = 0.0  # 0.0 to 1.0 between current and next waypoint
        self.speed_kmh = 0.0
        self.fuel_level = random.randint(70, 100)
        self.battery_level = random.randint(80, 100)
        self.signal_strength = random.randint(85, 100)
        self.status = "en_route"  # en_route, at_location, returning, idle
        self.last_update = time.time()
        self.total_distance_km = 0.0
        self.trip_count = 0

        # Initialize position at first waypoint
        if self.waypoints:
            self.current_lat = self.waypoints[0]["lat"]
            self.current_lng = self.waypoints[0]["lng"]
            self.current_address = self.waypoints[0].get("name", "Unknown")

        # Random events
        self.traffic_delay = 0
        self.weather_condition = random.choice(["clear", "rain", "heavy_rain", "fog"])

    def update(self, delta_seconds: float = 1.0) -> dict:
        """Update ambulance position based on elapsed time."""
        if self.status == "idle":
            return self._get_position_data()

        now = datetime.utcnow()
        hour = now.hour

        # Get traffic multiplier for current time
        traffic_multiplier = TRAFFIC_PATTERNS.get(hour, 0.7)

        # Apply weather effect
        weather_multiplier = {
            "clear": 1.0,
            "rain": 0.8,
            "heavy_rain": 0.6,
            "fog": 0.7,
        }.get(self.weather_condition, 1.0)

        # Calculate effective speed
        base_speed = 40  # km/h base speed for ambulance
        effective_speed = base_speed * traffic_multiplier * weather_multiplier

        # Random speed variation (±15%)
        effective_speed *= random.uniform(0.85, 1.15)

        # Handle traffic delay
        if self.traffic_delay > 0:
            self.traffic_delay -= delta_seconds
            effective_speed *= 0.3  # Slow down in traffic

        self.speed_kmh = max(0, min(120, effective_speed))

        # Calculate distance traveled in this update
        distance_km = (self.speed_kmh * delta_seconds) / 3600

        # Move along route
        if self.current_waypoint_index < len(self.waypoints) - 1:
            current_wp = self.waypoints[self.current_waypoint_index]
            next_wp = self.waypoints[self.current_waypoint_index + 1]

            # Calculate segment distance
            segment_distance = self._haversine(
                current_wp["lat"], current_wp["lng"],
                next_wp["lat"], next_wp["lng"]
            )

            # Update progress along current segment
            if segment_distance > 0:
                self.progress += distance_km / segment_distance

            # Check if we've reached the next waypoint
            if self.progress >= 1.0:
                self.current_waypoint_index += 1
                self.progress = 0.0
                self.current_address = next_wp.get("name", "Unknown")

                # Check if route is complete
                if self.current_waypoint_index >= len(self.waypoints) - 1:
                    self.status = "at_location"
                    self.trip_count += 1
                    self.total_distance_km += segment_distance
                    return self._get_position_data()

            # Interpolate position
            if self.current_waypoint_index < len(self.waypoints) - 1:
                current_wp = self.waypoints[self.current_waypoint_index]
                next_wp = self.waypoints[self.current_waypoint_index + 1]
                self.current_lat = current_wp["lat"] + (next_wp["lat"] - current_wp["lat"]) * self.progress
                self.current_lng = current_wp["lng"] + (next_wp["lng"] - current_wp["lng"]) * self.progress

            self.total_distance_km += distance_km

        # Random events
        self._handle_random_events(delta_seconds)

        # Update fuel and battery
        self.fuel_level = max(0, self.fuel_level - random.uniform(0.01, 0.05))
        self.battery_level = max(0, self.battery_level - random.uniform(0.005, 0.02))
        self.signal_strength = max(50, min(100, self.signal_strength + random.uniform(-2, 2)))

        self.last_update = time.time()

        return self._get_position_data()

    def _handle_random_events(self, delta_seconds: float):
        """Handle random events like traffic jams, route changes."""
        if random.random() < 0.01:  # 1% chance per update
            event_type = random.choice(["traffic", "weather_change", "signal_drop"])

            if event_type == "traffic":
                self.traffic_delay = random.uniform(5, 30)
                logger.debug(f"Ambulance {self.ambulance_id}: Traffic delay {self.traffic_delay}s")
            elif event_type == "weather_change":
                self.weather_condition = random.choice(["clear", "rain", "heavy_rain", "fog"])
                logger.debug(f"Ambulance {self.ambulance_id}: Weather changed to {self.weather_condition}")
            elif event_type == "signal_drop":
                self.signal_strength = random.randint(30, 60)
                logger.debug(f"Ambulance {self.ambulance_id}: Signal dropped to {self.signal_strength}%")

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        R = 6371  # Earth's radius in km
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return R * c

    def _get_position_data(self) -> dict:
        """Get current position data as dictionary."""
        return {
            "ambulanceId": self.ambulance_id,
            "latitude": round(self.current_lat, 6),
            "longitude": round(self.current_lng, 6),
            "address": self.current_address,
            "speedKmh": round(self.speed_kmh, 1),
            "fuelLevel": round(self.fuel_level, 1),
            "batteryLevel": round(self.battery_level, 1),
            "signalStrength": round(self.signal_strength, 1),
            "status": self.status,
            "route": self.route["name"],
            "currentWaypoint": self.current_waypoint_index,
            "totalWaypoints": len(self.waypoints),
            "progress": round(self.progress * 100, 1),
            "weather": self.weather_condition,
            "trafficDelay": round(self.traffic_delay, 1),
            "totalDistanceKm": round(self.total_distance_km, 2),
            "tripCount": self.trip_count,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def reset_route(self):
        """Reset ambulance to start of route."""
        self.current_waypoint_index = 0
        self.progress = 0.0
        self.status = "en_route"
        if self.waypoints:
            self.current_lat = self.waypoints[0]["lat"]
            self.current_lng = self.waypoints[0]["lng"]
            self.current_address = self.waypoints[0].get("name", "Unknown")


class GPSSimulatorService:
    """Manages multiple simulated ambulances and broadcasts their positions."""

    def __init__(self):
        self.ambulances: dict[str, SimulatedAmbulance] = {}
        self.running = False
        self.update_interval = 2.0  # seconds between updates
        self._callbacks = []

    def register_ambulance(self, ambulance_id: str, route_key: str = None) -> SimulatedAmbulance:
        """Register a new simulated ambulance."""
        if ambulance_id not in self.ambulances:
            self.ambulances[ambulance_id] = SimulatedAmbulance(ambulance_id, route_key)
            logger.info(f"Registered simulated ambulance: {ambulance_id}")
        return self.ambulances[ambulance_id]

    def unregister_ambulance(self, ambulance_id: str):
        """Remove a simulated ambulance."""
        if ambulance_id in self.ambulances:
            del self.ambulances[ambulance_id]
            logger.info(f"Unregistered simulated ambulance: {ambulance_id}")

    def on_update(self, callback):
        """Register a callback for position updates."""
        self._callbacks.append(callback)

    def get_all_positions(self) -> list[dict]:
        """Get current positions of all simulated ambulances."""
        return [amb.update(0) for amb in self.ambulances.values()]

    def get_ambulance_position(self, ambulance_id: str) -> Optional[dict]:
        """Get position of a specific ambulance."""
        if ambulance_id in self.ambulances:
            return self.ambulances[ambulance_id].update(0)
        return None

    async def start_simulation(self):
        """Start the GPS simulation loop."""
        self.running = True
        logger.info(f"GPS Simulator started with {len(self.ambulances)} ambulances")

        while self.running:
            for ambulance_id, ambulance in self.ambulances.items():
                position = ambulance.update(self.update_interval)

                # Notify callbacks
                for callback in self._callbacks:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(position)
                        else:
                            callback(position)
                    except Exception as e:
                        logger.error(f"Callback error for {ambulance_id}: {e}")

            await asyncio.sleep(self.update_interval)

    def stop_simulation(self):
        """Stop the GPS simulation."""
        self.running = False
        logger.info("GPS Simulator stopped")

    def get_simulation_stats(self) -> dict:
        """Get simulation statistics."""
        ambulances = list(self.ambulances.values())
        return {
            "totalAmbulances": len(ambulances),
            "activeAmbulances": sum(1 for a in ambulances if a.status == "en_route"),
            "totalTrips": sum(a.trip_count for a in ambulances),
            "totalDistanceKm": round(sum(a.total_distance_km for a in ambulances), 2),
            "averageFuelLevel": round(sum(a.fuel_level for a in ambulances) / max(1, len(ambulances)), 1),
            "averageBatteryLevel": round(sum(a.battery_level for a in ambulances) / max(1, len(ambulances)), 1),
            "running": self.running,
        }


# Global simulator instance
gps_simulator = GPSSimulatorService()
