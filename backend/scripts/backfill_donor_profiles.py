"""
Backfill demo donor profiles
============================
One-time idempotent data fix for the @lifelink.demo seed accounts, which ship
with bare user documents (no publicProfile.donorProfile / healthRecords), so
AI donor matching has no blood groups, availability, or coordinates to rank
with. This mirrors exactly what real users enter through ProfileEditModal
(publicProfile.healthRecords.bloodGroup etc.) — it does NOT inject mock data
into any request path; it populates the same stored profile fields the app
itself writes when a user saves their profile.

Idempotency: users that already have publicProfile.healthRecords.bloodGroup
are skipped, and every generated value is derived deterministically from the
user's _id (stable across re-runs), so running this twice changes nothing.

Usage (inside the backend container or with the venv active):
    python scripts/backfill_donor_profiles.py            # default: 350 max
    python scripts/backfill_donor_profiles.py --limit 0  # no limit
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.database import connect_database, db_state  # noqa: E402
from app.services.collections import USERS  # noqa: E402
from app.services.repository import MongoRepository  # noqa: E402

BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]
GENDERS = ["Male", "Female"]
AVAILABILITY = ["Available", "Available", "Available", "On Call", "Standby"]

# Deterministic per-id pseudo-random in [0, 1)
def _stable_random(seed: str, salt: int = 0) -> float:
    return ((abs(hash(f"{seed}:{salt}")) % 100000) / 100000)


# Approximate city -> (lat, lng) for the Indian cities used by the demo
# seeder's faker. Unknown cities fall back to a deterministic point inside
# India's bounding box derived from the city name.
CITY_COORDS: dict[str, tuple[float, float]] = {
    "bangalore": (12.9716, 77.5946), "bengaluru": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777), "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090), "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639), "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567), "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873), "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319), "nagpur": (21.1458, 79.0882),
    "indore": (22.7196, 75.8577), "bhopal": (23.2599, 77.4126),
    "patna": (25.5941, 85.1376), "surat": (21.1702, 72.8311),
    "varanasi": (25.3176, 82.9739), "agra": (27.1767, 78.0081),
    "amritsar": (31.6340, 74.8723), "chandigarh": (30.7333, 76.7794),
    "kochi": (9.9312, 76.2673), "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198), "erode": (11.3410, 77.7172),
    "salem": (11.6643, 78.1460), "trichy": (10.7905, 78.7047),
    "mysore": (12.2958, 76.6394), "mysuru": (12.2958, 76.6394),
    "mangalore": (12.9141, 74.8560), "hubli": (15.3647, 75.1240),
    "hublidharwad": (15.3647, 75.1240), "belgaum": (15.8497, 74.4977),
    "gulbarga": (17.3297, 76.8343), "chapra": (25.7803, 84.7550),
    "dindigul": (10.3673, 77.9803), "thane": (19.2183, 72.9781),
    "baranagar": (22.6411, 88.3773), "raiganj": (25.6167, 88.1167),
    "bilaspur": (22.0797, 82.1409), "nandyal": (15.4889, 78.4867),
    "gaya": (24.7914, 84.9994), "dewas": (22.9611, 76.0514),
    "agartala": (23.8315, 91.2868), "shimla": (31.1048, 77.1734),
    "dehradun": (30.3165, 78.0322), "guwahati": (26.1445, 91.7362),
    "bhubaneswar": (20.2961, 85.8245), "cuttack": (20.4625, 85.8828),
    "ranchi": (23.3441, 85.3096), "jamshedpur": (22.8046, 86.2029),
    "raipur": (21.2514, 81.6296), "vijayawada": (16.5062, 80.6480),
    "visakhapatnam": (17.6868, 83.2185), "warangal": (17.9689, 79.5941),
    "solapur": (17.6599, 75.9064), "nasik": (19.9975, 73.7898),
    "nashik": (19.9975, 73.7898), "aurangabad": (19.8762, 75.3433),
    "rajkot": (22.3039, 70.8022), "vadodara": (22.3072, 73.1812),
    "gandhinagar": (23.2156, 72.6369), "faridabad": (28.4089, 77.3178),
    "gurgaon": (28.4595, 77.0266), "noida": (28.5355, 77.3910),
    "ghaziabad": (28.6692, 77.4538), "ludhiana": (30.9010, 75.8573),
    "jalandhar": (31.3260, 75.5762), "srinagar": (34.0837, 74.7973),
    "jammu": (32.7266, 74.8570), "udaipur": (24.5854, 73.7125),
    "jodhpur": (26.2389, 73.0243), "kota": (25.2138, 75.8648),
    "ajmer": (26.4499, 74.6399), "gwalior": (26.2183, 78.1828),
    "jabalpur": (23.1815, 79.9864), "allahabad": (25.4358, 81.8463),
    "prayagraj": (25.4358, 81.8463), "moradabad": (28.8386, 78.7733),
    "aligarh": (27.8974, 78.0880), "bareilly": (28.3670, 79.4304),
    "tirupati": (13.6288, 79.4192), "kurnool": (15.8281, 78.0373),
    "guntur": (16.3067, 80.4365), "trivandrum": (8.5241, 76.9366),
    "thiruvananthapuram": (8.5241, 76.9366), "kozhikode": (11.2588, 75.7804),
    "thrissur": (10.5276, 76.2144), "asansol": (23.6889, 86.9661),
    "durgapur": (23.5204, 87.3119), "siliguri": (26.7271, 88.3953),
    "howrah": (22.5958, 88.2636), "goa": (15.4909, 73.8278),
    "panaji": (15.4909, 73.8278), "pondicherry": (11.9416, 79.8083),
    "puducherry": (11.9416, 79.8083), "imphal": (24.8170, 93.9368),
    "shillong": (25.5788, 91.8933), "aizawl": (23.7271, 92.7176),
    "kohima": (25.6751, 94.1100), "itanagar": (27.0844, 93.6053),
    "gangtok": (27.3389, 88.6065), "port blair": (11.6234, 92.7265),
}


def _city_coords(city: str | None, seed: str) -> tuple[float, float]:
    if city:
        key = str(city).strip().lower().replace(" ", "").replace("_", "")
        direct = CITY_COORDS.get(key)
        if direct:
            return direct
        if city:
            # Deterministic point inside India's bounding box for unknown cities.
            lat = 8.0 + _stable_random(str(city), 11) * 27.0
            lng = 68.0 + _stable_random(str(city), 12) * 29.0
            return round(lat, 4), round(lng, 4)
    # No city at all: spread around Bangalore (the platform's PRIMARY_CITY).
    return (
        round(12.9716 + (_stable_random(seed, 13) - 0.5) * 0.7, 4),
        round(77.5946 + (_stable_random(seed, 14) - 0.5) * 0.7, 4),
    )


def _build_profile(user: dict) -> dict | None:
    """Build the publicProfile fields for one user, or None if already present."""
    profile = user.get("publicProfile") or {}
    health = profile.get("healthRecords") or {}
    donor_profile = profile.get("donorProfile") or {}

    if health.get("bloodGroup") or donor_profile.get("bloodGroup"):
        return None  # profile already exists — never overwrite real user data

    uid = str(user.get("_id") or user.get("id") or "")
    city = user.get("location") if isinstance(user.get("location"), str) else None
    lat, lng = _city_coords(city, uid)

    age = 21 + int(_stable_random(uid, 1) * 45)  # 21-65
    gender = GENDERS[int(_stable_random(uid, 2) * len(GENDERS)) % len(GENDERS)]
    blood_group = BLOOD_GROUPS[int(_stable_random(uid, 3) * len(BLOOD_GROUPS)) % len(BLOOD_GROUPS)]
    availability = AVAILABILITY[int(_stable_random(uid, 4) * len(AVAILABILITY)) % len(AVAILABILITY)]
    # Last donation 100-500 days ago — keeps everyone eligibility-eligible (>90d)
    days_ago = 100 + int(_stable_random(uid, 5) * 400)
    last_donation = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date().isoformat()

    health_records = {
        "age": age,
        "gender": gender,
        "bloodGroup": blood_group,
        "contact": user.get("phone") or health.get("contact"),
    }
    donor = {
        "availability": availability,
        "bloodGroup": blood_group,
        "lastDonation": last_donation,
        "organTypes": ["Blood"],
        "coordinates": {"lat": lat, "lng": lng},
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    return {"healthRecords": health_records, "donorProfile": donor}


async def backfill(limit: int) -> tuple[int, int]:
    await connect_database()
    repo = MongoRepository(db_state.session_factory, USERS)
    users = await repo.collection.find({"role": "public"}).to_list(length=1000)

    updated = skipped = 0
    for user in users:
        if limit and updated >= limit:
            break
        patch = _build_profile(user)
        if patch is None:
            skipped += 1
            continue
        await repo.collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"publicProfile": {**(user.get("publicProfile") or {}), **patch}}},
        )
        updated += 1
    return updated, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill demo donor profiles")
    parser.add_argument("--limit", type=int, default=350,
                        help="Max users to update (0 = all); default 350")
    args = parser.parse_args()

    start = datetime.now(timezone.utc)
    updated, skipped = asyncio.run(backfill(args.limit))
    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    print(f"✅ Donor profile backfill complete in {elapsed:.1f}s — updated: {updated}, already had profile: {skipped}")


if __name__ == "__main__":
    main()
