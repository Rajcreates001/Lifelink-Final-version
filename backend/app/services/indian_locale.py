"""
Indian Localization Constants — Indian Data for LifeLink Platform
==================================================================
Provides Indian-specific data for seeding, demo, and default values.
All data is Karnataka-focused with Mangaluru as the primary city.

Usage:
    from app.services.indian_locale import INDIAN_NAMES, INDIAN_HOSPITALS, ...

    faker = Faker("en_IN")  # In seed scripts
    name = random.choice(INDIAN_NAMES["patients"])
"""

from __future__ import annotations

import random
from typing import Any

# ══════════════════════════════════════════════════════════════════
# DEFAULT GEOGRAPHY
# ══════════════════════════════════════════════════════════════════

DEFAULT_CENTER_LAT = 12.9141  # Mangaluru
DEFAULT_CENTER_LNG = 74.8560  # Mangaluru

PRIMARY_CITY = "Mangaluru"
PRIMARY_STATE = "Karnataka"

SECONDARY_CITIES = [
    "Bengaluru", "Mysuru", "Udupi", "Shivamogga", "Hubballi",
    "Belagavi", "Davanagere", "Kalaburagi", "Tumakuru", "Hassan",
]

DISTRICTS = [
    "Dakshina Kannada", "Udupi", "Kodagu", "Uttara Kannada",
    "Hassan", "Chikkamagaluru", "Shivamogga", "Davanagere",
    "Belagavi", "Hubballi", "Kalaburagi",
]

MANGALURU_AREAS = [
    "Hampankatta", "Lalbagh", "Kadri", "Kankanady", "Bejai",
    "Falnir", "Balmatta", "Bendoor", "Surathkal", "Kuloor",
    "Panambur", "Kavoor", "Derebail", "Bondel", "Konaje",
    "Ullal", "Jeppinamogaru", "Bajpe", "Pumpwell", "Attavar",
    "Valencia", "Padil", "Kodialbail", "Mangaladevi", "Bolar",
]

MANGALURU_ROADS = [
    "MG Road", "KS Rao Road", "NH-66", "Airport Road",
    "Kadri Road", "Pumpwell Junction", "Balmatta Road",
    "Kankanady Road", "Bejai-Kapikad Road", "Bendoor Well Road",
    "Falnir Road", "Lalbagh Road", "Bunts Hostel Road",
    "Car Street", "Kudmul Ranga Rao Road", "Saraswatpur Road",
    "Mallikatte Road", "Gandhi Nagar Road", "Shanti Nagar Road",
]

KARNATAKA_PINCODES = [
    "575001", "575002", "575003", "575004", "575005", "575006",
    "575007", "575008", "575010", "575011", "575013", "575014",
    "575015", "575016", "575017", "575018", "575019", "575020",
    "575021", "575022", "575023", "575025", "575026", "575028",
    "575029", "575030", "574101", "574102", "574103", "574104",
]


# ══════════════════════════════════════════════════════════════════
# INDIAN NAMES
# ══════════════════════════════════════════════════════════════════

INDIAN_NAMES: dict[str, list[str]] = {
    "patients": [
        "Rohan Shetty", "Sneha Rao", "Ananya Pai", "Nikhil Poojary",
        "Kavya Bhat", "Rahul Nayak", "Shruthi Acharya", "Pranav Hegde",
        "Harshith Shetty", "Deepak Kumar", "Meghana Gowda", "Arjun Kini",
        "Priya Prabhu", "Suresh Kamath", "Laxmi Pai", "Mohan Holla",
        "Radhika Shenoy", "Venkatesh Bhat", "Anita Nayak", "Ganesh Upadhyaya",
        "Savitri Poojary", "Ramesh Bangera", "Divya Shetty", "Lokesh Adiga",
        "Sangeeta Acharya", "Harish Mallya", "Jyothi Bhat", "Manoj Salian",
        "Shobha Hegde", "Kishore Kumar", "Sushma Nayak", "Anil Poojary",
        "Sujatha Shetty", "Ravi Shenoy", "Geetha Kamath", "Pradeep Holla",
        "Vani Prabhu", "Ullas Acharya", "Deepa Kini", "Vijay Moolya",
        "Shweta Bhat", "Anand Upadhyaya", "Latha Bangera", "Balaji Shetty",
        "Nalini Pai", "Siddharth Nayak", "Manjula Hegde", "Guruprasad Adiga",
    ],
    "doctors": [
        "Dr. Anil Shetty", "Dr. Nisha Rao", "Dr. Karthik Pai",
        "Dr. Raghav Bhat", "Dr. Vinay Kumar", "Dr. Ashwini Hegde",
        "Dr. Suresh Kamath", "Dr. Deepa Shenoy", "Dr. Prakash Nayak",
        "Dr. Laxmi Prabhu", "Dr. Ajith Mallya", "Dr. Radhika Kini",
        "Dr. Mohan Upadhyaya", "Dr. Shwetha Acharya", "Dr. Harish Bangera",
        "Dr. Geetha Holla", "Dr. Rajesh Poojary", "Dr. Nandini Bhat",
        "Dr. Venkatadri Salian", "Dr. Asha Kamath", "Dr. Kiran Adiga",
        "Dr. Meera Shetty", "Dr. Anand Pai", "Dr. Pallavi Hegde",
    ],
    "police": [
        "Inspector Prakash Gowda", "ACP Rohit Nayak", "SI Harish Shetty",
        "Inspector Satish Bhat", "ACP Venkatesh Rao", "SI Shashidhar Hegde",
        "Inspector Mohan Kumar", "ACP Lokesh Pai", "SI Ashwath Kamath",
        "Inspector Rajeev Shetty", "DG Priscilla David", "IG Ravi Poojary",
    ],
    "fire": [
        "Station Officer Ramesh Gowda", "Fire Officer Vinod Rao",
        "Divisional Officer Prashanth Bhat", "Station Officer Harish Shetty",
        "Fire Officer Manjunath Nayak", "Station Officer Prakash Kamath",
    ],
    "ambulance": [
        "EMT Rahul Shetty", "Paramedic Kavya Naik", "EMT Vinay Poojary",
        "Paramedic Shwetha Bhat", "EMT Praveen Acharya", "Paramedic Asha Kamath",
        "EMT Sunil Hegde", "Paramedic Laxmi Shenoy", "EMT Dinesh Bangera",
    ],
    "blood_donors": [
        "Arun Kumar", "Sanjana Shetty", "Vivek Rao", "Nithin Bhat",
        "Prasanna Pai", "Rakshita Hegde", "Ashok Nayak", "Parvati Kamath",
        "Dinesh Moolya", "Shwetha Acharya", "Gururaj Upadhyaya", "Latha Bangera",
        "Kishore Shetty", "Anuradha Kini", "Mohan Poojary", "Savitri Holla",
    ],
    "government": [
        "District Commissioner Meera Rao", "State Health Commissioner Dr. Prakash",
        "Deputy Commissioner Anjali Hegde", "Tehsildar Srinivas Bhat",
        "SDM Rohit Nayak", "IAS Officer Shashikala Shetty",
        "KAS Officer Praveen Kamath", "Department Director Harsha Pai",
    ],
    "ngo_volunteers": [
        "Shankar Nayak", "Uma Pai", "Prasanna Shetty", "Sachin Hegde",
        "Rekha Bangera", "Manjunath Acharya", "Sneha Holla", "Naveen Kini",
    ],
    "general": [
        "Anil Kumar", "Sunita Rao", "Mahesh Shetty", "Nandini Pai",
        "Ramesh Nayak", "Shashikala Hegde", "Praveen Bhat", "Asha Kamath",
        "Venkatesh Acharya", "Usha Poojary", "Mohan Bangera", "Geetha Holla",
        "Suresh Kini", "Latha Upadhyaya", "Kishore Mallya", "Sumana Adiga",
    ],
}


def random_name(category: str = "general") -> str:
    """Get a random Indian name from the specified category."""
    names = INDIAN_NAMES.get(category, INDIAN_NAMES["general"])
    return random.choice(names)


def random_patient_name() -> str:
    return random_name("patients")


def random_doctor_name() -> str:
    return random_name("doctors")


def random_phone(mobile: bool = True) -> str:
    """Generate an Indian phone number."""
    if mobile:
        prefixes = ["98765", "98450", "99800", "97410", "94480", "98860", "98455", "97420"]
        prefix = random.choice(prefixes)
        suffix = f"{random.randint(1000, 9999)}"
        return f"+91 {prefix}{suffix}"
    else:
        # Landline
        std_codes = ["0824", "080", "0821", "0820", "08182", "0836", "0831", "08192"]
        std = random.choice(std_codes)
        number = f"{random.randint(2000000, 9999999)}"
        return f"{std}-{number}"


# ══════════════════════════════════════════════════════════════════
# INDIAN HOSPITALS (Mangaluru & Karnataka focused)
# ══════════════════════════════════════════════════════════════════

INDIAN_HOSPITALS: list[dict[str, Any]] = [
    # ── Mangaluru Hospitals ──
    {"name": "Wenlock District Hospital", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2444590", "lat": 12.8676, "lng": 74.8420, "beds": 600, "type": "Government Multispecialty",
     "established": 1848, "specialties": ["General Medicine", "Surgery", "Orthopedics", "Pediatrics"]},
    {"name": "KMC Hospital Attavar", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2445858", "lat": 12.8578, "lng": 74.8519, "beds": 450, "type": "Private Multispecialty",
     "established": 1962, "specialties": ["Cardiology", "Neurology", "Nephrology", "Oncology"]},
    {"name": "A J Hospital & Research Centre", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2267000", "lat": 12.8802, "lng": 74.8425, "beds": 350, "type": "Private Multispecialty",
     "established": 2002, "specialties": ["Cardiology", "Gastroenterology", "Urology", "Orthopedics"]},
    {"name": "Indiana Hospital & Heart Institute", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-4264000", "lat": 12.9131, "lng": 74.8776, "beds": 250, "type": "Super Specialty",
     "established": 2006, "specialties": ["Cardiology", "Cardiothoracic Surgery", "Critical Care"]},
    {"name": "Father Muller Medical College Hospital", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2206510", "lat": 12.8761, "lng": 74.8826, "beds": 500, "type": "Teaching Hospital",
     "established": 1968, "specialties": ["General Medicine", "Surgery", "OBG", "Pediatrics", "Psychiatry"]},
    {"name": "Unity Hospital", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2421421", "lat": 12.8884, "lng": 74.8476, "beds": 150, "type": "Private Multispecialty",
     "established": 1995, "specialties": ["Emergency", "Orthopedics", "General Surgery"]},
    {"name": "Mangaluru Institute of Medical Sciences", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2222000", "lat": 12.9284, "lng": 74.8781, "beds": 300, "type": "Private Multispecialty",
     "established": 2010, "specialties": ["Cardiology", "Neurology", "Orthopedics", "Pulmonology"]},
    {"name": "Nethravathi Hospital & Research Centre", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2444222", "lat": 12.8614, "lng": 74.8548, "beds": 120, "type": "Private Multispecialty",
     "established": 2007, "specialties": ["General Medicine", "Surgery", "Gynecology"]},
    {"name": "K S Hegde Medical Academy", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2204100", "lat": 12.9149, "lng": 74.8951, "beds": 380, "type": "Teaching Hospital",
     "established": 1999, "specialties": ["Cardiology", "Neurology", "Nephrology", "Oncology", "Emergency"]},
    {"name": "Yenepoya Medical College Hospital", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2204666", "lat": 12.9298, "lng": 74.8770, "beds": 420, "type": "Teaching Hospital",
     "established": 1992, "specialties": ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Surgery"]},
    {"name": "District Hospital Mangaluru", "city": "Mangaluru", "district": "Dakshina Kannada",
     "phone": "0824-2441036", "lat": 12.8564, "lng": 74.8352, "beds": 200, "type": "Government District",
     "established": 1975, "specialties": ["General Medicine", "Surgery", "OBG", "Pediatrics"]},
    {"name": "Community Health Centre Surathkal", "city": "Surathkal", "district": "Dakshina Kannada",
     "phone": "0824-2470055", "lat": 13.0052, "lng": 74.8060, "beds": 50, "type": "Government CHC",
     "established": 1985, "specialties": ["General Medicine", "Maternal Health", "Child Health"]},
    {"name": "Primary Health Centre Ullal", "city": "Ullal", "district": "Dakshina Kannada",
     "phone": "0824-2466233", "lat": 12.8018, "lng": 74.8553, "beds": 20, "type": "Government PHC",
     "established": 1992, "specialties": ["General Medicine", "Immunization"]},

    # ── Bengaluru Hospitals ──
    {"name": "Victoria Hospital", "city": "Bengaluru", "district": "Bengaluru",
     "phone": "080-26701150", "lat": 12.9614, "lng": 77.5656, "beds": 800, "type": "Government Teaching"},
    {"name": "St. John's Medical College Hospital", "city": "Bengaluru", "district": "Bengaluru",
     "phone": "080-22065000", "lat": 12.9362, "lng": 77.5911, "beds": 500, "type": "Private Teaching"},
    {"name": "NIMHANS", "city": "Bengaluru", "district": "Bengaluru",
     "phone": "080-26995000", "lat": 12.9388, "lng": 77.5964, "beds": 600, "type": "Government Institute",
     "specialties": ["Neurology", "Psychiatry", "Neurosurgery"]},

    # ── Other Karnataka Hospitals ──
    {"name": "K.R. Hospital", "city": "Mysuru", "district": "Mysuru",
     "phone": "0821-2422554", "lat": 12.3067, "lng": 76.6458, "beds": 400, "type": "Government Teaching"},
    {"name": "District Hospital Udupi", "city": "Udupi", "district": "Udupi",
     "phone": "0820-2922761", "lat": 13.3410, "lng": 74.7421, "beds": 200, "type": "Government District"},
    {"name": "KIMS Hubballi", "city": "Hubballi", "district": "Dharwad",
     "phone": "0836-2373348", "lat": 15.3547, "lng": 75.1390, "beds": 500, "type": "Government Teaching"},
    {"name": "District Hospital Belagavi", "city": "Belagavi", "district": "Belagavi",
     "phone": "0831-2420803", "lat": 15.8497, "lng": 74.4977, "beds": 300, "type": "Government District"},
    {"name": "Shivamogga Institute of Medical Sciences", "city": "Shivamogga", "district": "Shivamogga",
     "phone": "08182-222222", "lat": 13.9239, "lng": 75.5681, "beds": 350, "type": "Government Teaching"},
]


def random_hospital() -> dict[str, Any]:
    return random.choice(INDIAN_HOSPITALS)


def random_address(city: str | None = None) -> str:
    """Generate a realistic Karnataka address."""
    if city is None:
        city = random.choice(SECONDARY_CITIES + [PRIMARY_CITY])
    area = random.choice(MANGALURU_AREAS) if city == "Mangaluru" else random.choice(MANGALURU_AREAS[:10])
    road = random.choice(MANGALURU_ROADS)
    pincode = random.choice(KARNATAKA_PINCODES)
    return f"{area}, {road}, {city}, {PRIMARY_STATE} - {pincode}"


# ══════════════════════════════════════════════════════════════════
# VEHICLE REGISTRATION (Karnataka)
# ══════════════════════════════════════════════════════════════════

KA_RTO_CODES = {
    "Bengaluru": {"Central": "KA-01", "West": "KA-02", "East": "KA-03", "South": "KA-04", "North": "KA-05"},
    "Mangaluru": "KA-19",
    "Udupi": "KA-20",
    "Mysuru": "KA-09",
    "Shivamogga": "KA-13",
    "Hubballi": "KA-25",
    "Belagavi": "KA-22",
    "Davanagere": "KA-17",
    "Kalaburagi": "KA-32",
    "Hassan": "KA-13",
    "Chikkamagaluru": "KA-18",
}


def random_ka_registration(vehicle_type: str = "private") -> str:
    """Generate a Karnataka vehicle registration number."""
    city = random.choice(list(KA_RTO_CODES.keys()))
    rto_code = KA_RTO_CODES[city]
    if isinstance(rto_code, dict):
        rto_code = random.choice(list(rto_code.values()))
    series = f"{random.choice('ABCDEFGHJKLMNOPRSTUVWXYZ')}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"
    number = f"{random.randint(1000, 9999)}"
    return f"{rto_code}-{series}-{number}"


def random_ambulance_registration() -> str:
    """Generate ambulance registration in AMB-KA-XXXX format."""
    number = f"{random.randint(1000, 9999)}"
    return f"AMB-KA-{number}"


def random_police_vehicle() -> str:
    """Generate police vehicle number."""
    return f"POL-KA-{random.randint(100, 999)}"


def random_fire_vehicle() -> str:
    """Generate fire vehicle number."""
    return f"FIRE-KA-{random.randint(100, 999)}"


# ══════════════════════════════════════════════════════════════════
# BLOOD GROUPS (Indian notation)
# ══════════════════════════════════════════════════════════════════

INDIAN_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

BLOOD_GROUP_DISTRIBUTION = {
    "O+": 0.35, "A+": 0.20, "B+": 0.25, "AB+": 0.08,
    "O-": 0.04, "A-": 0.03, "B-": 0.03, "AB-": 0.02,
}


def random_blood_group() -> str:
    """Generate a random blood group weighted by Indian distribution."""
    r = random.random()
    cumulative = 0.0
    for group, prob in BLOOD_GROUP_DISTRIBUTION.items():
        cumulative += prob
        if r <= cumulative:
            return group
    return "O+"


# ══════════════════════════════════════════════════════════════════
# EMERGENCY AGENCIES (Indian)
# ══════════════════════════════════════════════════════════════════

INDIAN_EMERGENCY_AGENCIES = {
    "police": ["Mangaluru City Police", "Dakshina Kannada Police", "Karnataka State Police", "Traffic Police Mangaluru"],
    "fire": ["Fire & Emergency Services Mangaluru", "Karnataka Fire Services", "Dakshina Kannada Fire Station"],
    "ambulance": ["108 Emergency Services", "Arogya Kavacha", "108 Ambulance Mangaluru"],
    "disaster": ["NDRF 5th Battalion", "SDRF Karnataka", "District Disaster Management Authority"],
    "health": ["NHM Karnataka", "District Health Office Mangaluru", "Karnataka Health Department"],
}

# ══════════════════════════════════════════════════════════════════
# INDIAN LANGUAGES
# ══════════════════════════════════════════════════════════════════

LANGUAGES = {
    "english": {"code": "en", "name": "English", "native": "English"},
    "kannada": {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    "hindi": {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
}

# ══════════════════════════════════════════════════════════════════
# INDIAN DATE FORMATS
# ══════════════════════════════════════════════════════════════════

INDIAN_DATE_FORMATS = {
    "long": "d F Y",        # "27 July 2026"
    "short": "d-m-Y",       # "27-07-2026"
    "slash": "d/m/Y",       # "27/07/2026"
    "full": "l, d F Y",     # "Monday, 27 July 2026"
}

INDIAN_TIME_FORMAT = "h:i A"  # "9:45 PM"
