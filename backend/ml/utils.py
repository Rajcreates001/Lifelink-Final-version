"""
LifeLink ML — Shared Utility Functions
========================================
Functions extracted from the original ai_ml.py that don't involve
model training or model-based prediction.

Includes:
  - analyze_medical_report()      keyword-based medical text analysis
  - predict_sos_severity()        rule-based SOS severity from message
  - get_priority()                priority lookup for emergency classifier
  - _get_discretized_state()      discretize state for Q-Learning
  - _get_reward()                 reward function for Q-Learning
  - _get_city_graph()             NetworkX graph for ambulance routing
"""

import re
import json


# =====================================================================
# MEDICAL REPORT ANALYZER
# =====================================================================

# (pattern, label, category, score) tuples
_REPORT_PATTERNS = [
    (r"\bliver cancer\b|\bhepatocellular carcinoma\b|\bhepatic carcinoma\b", "Liver Cancer", "Oncology", 12),
    (r"\bbreast cancer\b|\bmammary carcinoma\b", "Breast Cancer", "Oncology", 11),
    (r"\blung cancer\b|\bbronchogenic carcinoma\b", "Lung Cancer", "Oncology", 11),
    (r"\bcolon cancer\b|\bcolorectal cancer\b", "Colon Cancer", "Oncology", 11),
    (r"\bprostate cancer\b", "Prostate Cancer", "Oncology", 10),
    (r"\bmalignancy\b|\bcarcinoma\b|\btumor\b|\bcancer\b", "Malignancy", "Oncology", 9),
    (r"\bhepatitis\b|\bcirrhosis\b|\bfatty liver\b|\bliver disease\b", "Liver Disease", "Hepatic", 7),
    (r"\bkidney disease\b|\brenal failure\b|\bckd\b", "Kidney Disease", "Renal", 7),
    (r"\bheart failure\b|\bcardiac arrest\b|\bmyocardial infarction\b|\bheart attack\b", "Cardiac Event", "Cardiovascular", 10),
    (r"\bhypertension\b|\bhigh blood pressure\b", "Hypertension", "Cardiovascular", 6),
    (r"\bhypotension\b|\blow blood pressure\b", "Hypotension", "Cardiovascular", 5),
    (r"\bblood pressure\b|\bbp\b", "Blood Pressure Issue", "Cardiovascular", 4),
    (r"\barrhythmia\b|\birregular heartbeat\b", "Arrhythmia", "Cardiovascular", 7),
    (r"\bdiabetes\b|\btype 1 diabetes\b|\btype 2 diabetes\b", "Diabetes", "Metabolic", 6),
    (r"\bhyperglycemia\b|\bglucose\b|\bhigh blood sugar\b", "Elevated Glucose", "Metabolic", 4),
    (r"\basthma\b|\bcopd\b|\bchronic obstructive\b", "Respiratory Disease", "Respiratory", 6),
    (r"\bpneumonia\b|\brespiratory infection\b", "Pneumonia", "Respiratory", 7),
    (r"\bstroke\b|\bcerebrovascular\b", "Stroke", "Neurological", 9),
    (r"\bseizure\b|\bepilepsy\b", "Seizure", "Neurological", 6),
    (r"\banemia\b|\blow hemoglobin\b", "Anemia", "Blood", 4),
    (r"\bsepsis\b|\bsystemic infection\b", "Sepsis", "Infection", 9),
    (r"\binfection\b|\bfever\b|\bcovid\b", "Infection", "Infection", 5),
]


def analyze_medical_report(text: str) -> dict:
    """
    Analyze medical report text using keyword matching.
    Returns detected conditions, risk score, and risk level.
    """
    if not isinstance(text, str) or not text.strip():
        return {
            "summary": "Report text missing.",
            "detected_conditions": [],
            "risk_score": 0,
            "risk_level": "Low",
            "primary_category": "General",
        }

    lowered = re.sub(r"\s+", " ", text.lower()).strip()
    sample = lowered[:2000]
    non_printable = sum(1 for ch in sample if ord(ch) < 9 or (ord(ch) < 32 and ch not in "\n\t\r"))
    if sample.startswith("%pdf-") or (non_printable / max(1, len(sample)) > 0.12):
        return {
            "summary": "Report text looks like raw PDF bytes. Please upload the document for OCR.",
            "detected_conditions": [],
            "risk_score": 0,
            "risk_level": "Low",
            "primary_category": "General",
            "error": "invalid_report_text",
        }

    detected = []
    total_score = 0
    categories = {}

    for pattern, label, category, score in _REPORT_PATTERNS:
        if re.search(pattern, lowered):
            detected.append(label)
            total_score += score
            categories[category] = categories.get(category, 0) + 1

    risk = "Low"
    if total_score >= 20:
        risk = "Critical"
    elif total_score >= 12:
        risk = "High"
    elif total_score >= 6:
        risk = "Moderate"

    return {
        "summary": f"Detected: {', '.join(detected)}" if detected else "Normal report.",
        "detected_conditions": detected,
        "risk_score": min(total_score * 5, 100),
        "risk_level": risk,
        "primary_category": max(categories, key=categories.get) if categories else "General",
    }


# =====================================================================
# SOS SEVERITY (rule-based, from message keywords)
# =====================================================================

_SOS_CRITICAL_KEYWORDS = [
    "cardiac arrest", "heart attack", "stopped breathing", "unresponsive",
    "severe hemorrhage", "choking", "unconscious", "stroke", "comatose",
    "anaphylaxis", "poisoning", "electrocution", "critical",
]
_SOS_HIGH_KEYWORDS = [
    "chest pain", "difficulty breathing", "severe pain", "heavy bleeding",
    "loss of consciousness", "severe allergic", "broken bone", "serious injury",
    "emergency", "urgent", "danger", "severe", "collapsed",
]
_SOS_MEDIUM_KEYWORDS = [
    "accident", "trauma", "injured", "hurt", "pain", "bleeding",
    "fever", "vomiting", "dizzy", "weakness", "burns", "fracture",
    "sprain", "wound", "fall",
]
_SOS_LOW_KEYWORDS = [
    "cut", "bruise", "headache", "nausea", "cold", "cough", "rash",
    "minor", "slight", "small",
]


def predict_sos_severity(input_data_dict: dict) -> dict:
    """
    Analyze emergency SOS message and predict severity level
    using keyword-based approach.

    Returns severity level (Low/Medium/High/Critical) and recommendations.
    """
    try:
        message = input_data_dict.get("message", "").lower()

        severity_score = 0

        if any(kw in message for kw in _SOS_CRITICAL_KEYWORDS):
            severity_score = max(severity_score, 95)
        elif any(kw in message for kw in _SOS_HIGH_KEYWORDS):
            severity_score = max(severity_score, 75)
        elif any(kw in message for kw in _SOS_MEDIUM_KEYWORDS):
            severity_score = max(severity_score, 55)
        elif any(kw in message for kw in _SOS_LOW_KEYWORDS):
            severity_score = max(severity_score, 30)
        else:
            severity_score = 40 if len(message) > 50 else 25

        if severity_score >= 85:
            severity_level = "Critical"
            response_time = "1-5 minutes"
            ambulance_type = "Advanced Life Support (ALS)"
            hospital_priority = "Trauma Center"
        elif severity_score >= 70:
            severity_level = "High"
            response_time = "5-10 minutes"
            ambulance_type = "Basic Life Support (BLS)"
            hospital_priority = "Emergency Department"
        elif severity_score >= 50:
            severity_level = "Medium"
            response_time = "10-20 minutes"
            ambulance_type = "Standard Ambulance"
            hospital_priority = "Urgent Care / ED"
        else:
            severity_level = "Low"
            response_time = "20-30 minutes"
            ambulance_type = "Non-Emergency Transport"
            hospital_priority = "Clinic / Urgent Care"

        return {
            "severity_level": severity_level,
            "severity_score": severity_score,
            "message": message[:100],
            "response_time": response_time,
            "ambulance_type": ambulance_type,
            "hospital_priority": hospital_priority,
        }

    except Exception as e:
        return {
            "severity_level": "Medium",
            "severity_score": 50,
            "message": "",
            "response_time": "10-15 minutes",
            "ambulance_type": "Standard Ambulance",
            "hospital_priority": "Emergency Department",
            "error": str(e),
        }


# =====================================================================
# EMERGENCY ALERT CLASSIFIER — priority lookup
# =====================================================================

def get_priority(category: str) -> str:
    """Map emergency category to priority level."""
    if category in ["cardiac_issue", "accident", "fire"]:
        return "High"
    if category == "medical_emergency":
        return "Medium"
    return "Low"


# =====================================================================
# RESOURCE ALLOCATION — Q-Learning helpers
# =====================================================================

def _get_discretized_state(emergency_count: int, capacity_percent: int) -> tuple[str, str]:
    """Discretize (emergency_count, capacity_percent) into state."""
    if emergency_count <= 3:
        emerg_level = "Low"
    elif emergency_count <= 7:
        emerg_level = "Medium"
    else:
        emerg_level = "High"

    if capacity_percent <= 30:
        cap_level = "Low"
    elif capacity_percent <= 70:
        cap_level = "Medium"
    else:
        cap_level = "High"

    return (emerg_level, cap_level)


def _get_reward(state: tuple[str, str], action: int) -> int:
    """Reward function for resource allocation Q-Learning."""
    emerg_level, cap_level = state

    if emerg_level == "Low":
        if action == 0:
            return 20
        if action == 1:
            return -10
        if action == 2:
            return -20
    elif emerg_level == "Medium":
        if action == 0:
            return -30
        if action == 1:
            return 20
        if action == 2:
            return -10
    elif emerg_level == "High":
        if action == 0:
            return -50
        if action == 1:
            return -30
        if action == 2:
            return 20

    return -1


# =====================================================================
# AMBULANCE ROUTING — city graph
# =====================================================================

def _get_city_graph():
    """
    Build a simple NetworkX graph representing city locations
    for ambulance route planning.
    """
    import networkx as nx

    G = nx.Graph()
    edges = [
        ("Central City General", "St. Jude Hospital", 8),
        ("Central City General", "Mercy West", 12),
        ("Central City General", "Downtown", 5),
        ("St. Jude Hospital", "Downtown", 6),
        ("St. Jude Hospital", "North Sector", 10),
        ("Mercy West", "Downtown", 7),
        ("Mercy West", "West Suburbs", 15),
        ("Downtown", "North Sector", 9),
        ("Downtown", "South Suburbs", 10),
        ("North Sector", "North Suburbs", 14),
        ("South Suburbs", "West Suburbs", 16),
    ]
    G.add_weighted_edges_from(edges)
    return G
