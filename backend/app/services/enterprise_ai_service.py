"""
enterprise_ai_service.py — LifeLink Enterprise AI Chat Service.

COMPLETELY isolated from the public AI chat system.
Every operation validates hospital_id, user_id, and role_id.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import func, select, delete as sa_delete, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = logging.getLogger(__name__)

from app.services.lifelink_ai_models import (
    LifeLinkAIConversation,
    LifeLinkAIMessage,
    LifeLinkAIContext,
    LifeLinkAIMemory,
    LifeLinkAISession,
    LifeLinkAIFeedback,
    LifeLinkAIAuditLog,
)

from app.db.models import CoreHospital, EnterpriseDepartment

# ── Role-based AI context profiles ──────────────────────────────────────

ROLE_CONTEXTS = {
    "hospital_ceo": {
        "role_label": "CEO",
        "scope": "executive",
        "description": "Hospital executive with full operational oversight",
        "accessible_modules": [
            "global-overview", "department-analytics", "bed-management",
            "resource-management", "ambulance-coordination", "finance-overview",
            "staff-management", "reports", "multi-hospital-network",
        ],
        "knowledge_domains": [
            "finance", "operations", "departments", "kpis",
            "emergency", "resources", "staff", "revenue",
        ],
        "can_access_clinical": False,
        "can_access_finance": True,
        "can_access_admin": True,
    },
    "emergency_physician": {
        "role_label": "Emergency Physician",
        "scope": "clinical",
        "description": "Emergency department physician with clinical access",
        "accessible_modules": [
            "live-emergency-feed", "ambulance-tracking", "patient-intake",
            "bed-allocation", "ai-decision-panel",
        ],
        "knowledge_domains": [
            "emergency", "patients", "diagnoses", "medications",
            "lab_results", "bed_availability", "triage",
        ],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "icu_physician": {
        "role_label": "ICU Physician",
        "scope": "clinical",
        "description": "ICU physician with critical care access",
        "accessible_modules": [
            "live-patient-monitoring", "critical-alerts", "ai-risk-prediction", "vitals-dashboard",
        ],
        "knowledge_domains": [
            "critical_care", "vitals", "medications", "icu_beds",
            "patient_status", "risk_scores", "ventilators",
        ],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "nurse": {
        "role_label": "Nurse",
        "scope": "clinical",
        "description": "Nursing staff with patient care access",
        "accessible_modules": [
            "live-patient-monitoring", "patient-intake", "bed-allocation",
        ],
        "knowledge_domains": [
            "vitals", "medication_schedule", "assigned_beds", "tasks",
            "patient_care", "shift_handoff",
        ],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "finance_officer": {
        "role_label": "Finance Officer",
        "scope": "financial",
        "description": "Finance department with billing and revenue access",
        "accessible_modules": [
            "billing", "revenue-analytics", "insurance", "cost-optimization",
        ],
        "knowledge_domains": [
            "revenue", "claims", "budgets", "invoices",
            "payments", "insurance", "expenses", "forecasts",
        ],
        "can_access_clinical": False,
        "can_access_finance": True,
        "can_access_admin": False,
    },
    "radiologist": {
        "role_label": "Radiologist",
        "scope": "clinical",
        "description": "Radiology specialist with scan and imaging access",
        "accessible_modules": [
            "scan-requests", "report-upload", "ai-scan-insights",
        ],
        "knowledge_domains": [
            "radiology", "scans", "imaging", "xray",
            "mri", "ct_scan", "reports",
        ],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "lab_technician": {
        "role_label": "Lab Technician",
        "scope": "clinical",
        "description": "Laboratory technician with test and sample access",
        "accessible_modules": [
            "scan-requests", "report-upload",
        ],
        "knowledge_domains": [
            "samples", "reports", "tests", "lab_results",
            "specimens", "pathology",
        ],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "pharmacist": {
        "role_label": "Pharmacist",
        "scope": "clinical",
        "description": "Pharmacy staff with medication and inventory access",
        "knowledge_domains": [
            "medications", "inventory", "prescriptions", "drug_interactions",
            "pharmacy_stock", "expiry_dates",
        ],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "system_administrator": {
        "role_label": "System Administrator",
        "scope": "admin",
        "description": "Platform administrator with full system access",
        "accessible_modules": "*",  # All modules
        "knowledge_domains": "*",  # All domains
        "can_access_clinical": True,
        "can_access_finance": True,
        "can_access_admin": True,
    },
    # ═══════════════════════════════════════════════════════════════════
    # GOVERNMENT / NATIONAL EMERGENCY ROLES
    # ═══════════════════════════════════════════════════════════════════
    # ── Police Department ──
    "police": {
        "role_label": "Police Commissioner",
        "scope": "government",
        "accessible_modules": ["incidents", "live-monitoring", "command-center", "ai-ml-lab"],
        "knowledge_domains": ["crime", "traffic", "deployment", "law_enforcement", "emergency_response", "public_safety"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "police_control": {
        "role_label": "Police Control Room",
        "scope": "government",
        "accessible_modules": ["incidents", "live-monitoring", "command-center"],
        "knowledge_domains": ["crime", "traffic", "dispatch", "emergency_response", "incident_reporting"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "traffic_police": {
        "role_label": "Traffic Police",
        "scope": "government",
        "accessible_modules": ["incidents", "live-monitoring"],
        "knowledge_domains": ["traffic", "road_closures", "diversions", "accident_response", "congestion"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "cyber_crime": {
        "role_label": "Cyber Crime",
        "scope": "government",
        "accessible_modules": ["incidents", "ai-ml-lab"],
        "knowledge_domains": ["cyber_crime", "digital_forensics", "online_fraud", "threat_intelligence", "data_security"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "special_ops": {
        "role_label": "Special Operations",
        "scope": "government",
        "accessible_modules": ["incidents", "command-center"],
        "knowledge_domains": ["tactical_ops", "emergency_response", "hostage_rescue", "counter_terrorism", "deployment"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "intelligence": {
        "role_label": "Intelligence Unit",
        "scope": "government",
        "accessible_modules": ["live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["intelligence", "surveillance", "threat_analysis", "criminal_networks", "counter_intelligence"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Fire & Rescue ──
    "fire": {
        "role_label": "Fire Chief",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "command-center", "simulation-center"],
        "knowledge_domains": ["fire_suppression", "hazmat", "rescue_ops", "building_collapse", "chemical_hazards", "emergency_response"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "fire_control": {
        "role_label": "Fire Control Room",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["fire_dispatch", "incident_tracking", "unit_deployment", "emergency_routing"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "hazmat": {
        "role_label": "Hazmat Team",
        "scope": "government",
        "accessible_modules": ["operations", "simulation-center"],
        "knowledge_domains": ["hazardous_materials", "chemical_spills", "decontamination", "biohazard", "industrial_accidents"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Ambulance / EMS ──
    "ambulance_authority": {
        "role_label": "Ambulance Authority",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["fleet_management", "gps_tracking", "patient_transport", "emergency_routing", "eta_optimization", "dispatch"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "ambulance_dispatch": {
        "role_label": "Ambulance Dispatch",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["dispatch_ops", "gps_tracking", "vehicle_status", "eta", "hospital_allocation"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Public Health ──
    "public_health": {
        "role_label": "Public Health Officer",
        "scope": "government",
        "accessible_modules": ["operations", "ai-ml-lab"],
        "knowledge_domains": ["disease_surveillance", "outbreak_control", "vaccination", "health_promotion", "epidemiology", "public_safety"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "epidemiology": {
        "role_label": "Epidemiologist",
        "scope": "government",
        "accessible_modules": ["operations", "ai-ml-lab"],
        "knowledge_domains": ["disease_tracking", "outbreak_investigation", "contact_tracing", "infection_control", "vaccination_analysis"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "vaccination": {
        "role_label": "Vaccination Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["vaccination_drive", "immunization", "cold_chain", "stock_management", "campaign_planning"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "blood_bank_authority": {
        "role_label": "Blood Bank Authority",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["blood_inventory", "donor_management", "expiry_tracking", "cross_hospital_transfer", "shortage_prediction"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "animal_husbandry": {
        "role_label": "Animal Husbandry Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["animal_health", "livestock_disease", "veterinary_care", "zoonotic_surveillance", "animal_husbandry_ops"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "pharma_supply": {
        "role_label": "Pharma Supply Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["pharmaceutical_supply", "drug_distribution", "inventory_tracking", "shortage_management", "expiry_monitoring"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "medical_equipment": {
        "role_label": "Medical Equipment Authority",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["equipment_inventory", "device_maintenance", "procurement", "utilization_analytics", "certification"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── NDMA ──
    "ndma": {
        "role_label": "NDMA Officer",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "live-monitoring", "simulation-center", "ai-ml-lab"],
        "knowledge_domains": ["disaster_management", "early_warning", "risk_assessment", "multi_hazard_planning", "mitigation", "response_coordination"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── NDRF / SDRF / Relief ──
    "ndrf": {
        "role_label": "NDRF Commander",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "command-center", "ai-ml-lab"],
        "knowledge_domains": ["rescue_ops", "disaster_response", "flood_rescue", "building_collapse", "personnel_deployment", "relief_distribution"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "sdrf": {
        "role_label": "SDRF Officer",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "command-center"],
        "knowledge_domains": ["state_disaster_response", "relief_ops", "search_rescue", "evacuation", "relief_camp_management"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "relief_coordination": {
        "role_label": "Relief Coordinator",
        "scope": "government",
        "accessible_modules": ["operations", "command-center"],
        "knowledge_domains": ["relief_management", "aid_distribution", "resource_allocation", "logistics", "volunteer_coordination"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── National / State / District Emergency ──
    "national_emergency": {
        "role_label": "National Emergency Operator",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "live-monitoring", "policy-workflow", "simulation-center", "ai-ml-lab"],
        "knowledge_domains": ["emergency_coordination", "inter_agency_response", "national_crisis", "policy_compliance", "resource_mobilization"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "state_emergency": {
        "role_label": "State Emergency Operator",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "live-monitoring", "command-center"],
        "knowledge_domains": ["state_emergency_coordination", "district_liaison", "crisis_response", "resource_allocation"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "district_emergency": {
        "role_label": "District Emergency Operator",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "disaster-management"],
        "knowledge_domains": ["local_emergency_response", "incident_reporting", "first_responders", "community_safety"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Municipal ──
    "municipal": {
        "role_label": "Municipal Commissioner",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "policy-workflow"],
        "knowledge_domains": ["civic_services", "water_supply", "waste_management", "sanitation", "public_works", "urban_planning"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "municipal_health": {
        "role_label": "Municipal Health Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "policy-workflow"],
        "knowledge_domains": ["civic_health", "sanitation", "vector_control", "food_safety", "public_hygiene"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "water_supply": {
        "role_label": "Water Supply Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["water_distribution", "infrastructure", "treatment_plants", "supply_management", "quality_monitoring"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "waste_management": {
        "role_label": "Waste Management Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["waste_collection", "recycling", "disposal", "sanitation_ops", "environmental_compliance"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Infrastructure / Transport ──
    "transport": {
        "role_label": "Transport Commissioner",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "policy-workflow"],
        "knowledge_domains": ["road_transport", "bus_fleet", "emergency_logistics", "route_planning", "public_transport"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "nhai": {
        "role_label": "NHAI Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["highway_infrastructure", "road_closures", "bridge_safety", "construction", "traffic_management"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "railways": {
        "role_label": "Railways Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["rail_operations", "train_scheduling", "station_management", "emergency_routes", "freight_logistics"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "airport": {
        "role_label": "Airport Authority",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "command-center"],
        "knowledge_domains": ["aviation_ops", "flight_management", "air_traffic", "emergency_response", "cargo_logistics"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "port_authority": {
        "role_label": "Port Authority",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["maritime_ops", "port_management", "shipping", "coastal_emergency", "cargo_handling"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "public_works": {
        "role_label": "Public Works Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "policy-workflow"],
        "knowledge_domains": ["infrastructure_projects", "construction", "building_safety", "road_maintenance", "public_facilities"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "food_corporation": {
        "role_label": "Food Corporation Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "command-center"],
        "knowledge_domains": ["food_supply", "grain_storage", "distribution", "public_distribution", "emergency_food_relief"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Utilities ──
    "electricity": {
        "role_label": "Electricity Board",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["power_grid", "electricity_distribution", "outage_management", "load_balancing", "infrastructure_maintenance"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "telecom": {
        "role_label": "Telecom Officer",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["telecommunications", "network_infrastructure", "emergency_comms", "broadband", "mobile_coverage"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "imd": {
        "role_label": "IMD Meteorologist",
        "scope": "government",
        "accessible_modules": ["operations", "ai-ml-lab"],
        "knowledge_domains": ["weather_forecasting", "cyclone_warning", "rainfall_analysis", "climate_data", "early_warning"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Environment ──
    "forest": {
        "role_label": "Forest Conservator",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["forest_management", "wildlife_conservation", "protected_areas", "environmental_monitoring", "afforestation"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "forest_fire": {
        "role_label": "Forest Fire Control",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["forest_fire_suppression", "wildfire_monitoring", "fire_prevention", "aerial_surveillance", "ecosystem_protection"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Civil Defence ──
    "civil_defence": {
        "role_label": "Civil Defence Officer",
        "scope": "government",
        "accessible_modules": ["operations", "command-center", "simulation-center"],
        "knowledge_domains": ["civil_protection", "shelter_management", "volunteer_coordination", "emergency_preparedness", "public_awareness"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── NGO / Relief ──
    "red_cross": {
        "role_label": "Indian Red Cross",
        "scope": "ngo",
        "accessible_modules": ["operations", "command-center", "ai-ml-lab"],
        "knowledge_domains": ["humanitarian_aid", "volunteers", "relief_distribution", "blood_bank", "disaster_relief"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "ngo_director": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "command-center"],
        "knowledge_domains": ["aid_management", "volunteer_coordination", "resource_allocation", "relief_ops", "community_outreach"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Specific NGO orgs (point to NGO Director context) ──
    "goonj": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "command-center"],
        "knowledge_domains": ["aid_management", "volunteer_coordination", "resource_allocation", "relief_ops", "community_outreach"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "seeds": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "command-center", "live-monitoring"],
        "knowledge_domains": ["aid_management", "community_resilience", "disaster_risk_reduction", "relief_ops", "volunteer_coordination"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "doctors_for_you": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "ai-ml-lab"],
        "knowledge_domains": ["medical_aid", "health_camps", "emergency_medicine", "disaster_relief", "community_health"],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "care_india": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "command-center", "live-monitoring"],
        "knowledge_domains": ["humanitarian_aid", "women_empowerment", "livelihoods", "education", "healthcare_access"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "give_india": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "policy-workflow"],
        "knowledge_domains": ["fundraising", "grant_management", "donor_relations", "philanthropy", "social_impact"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "akshaya_patra": {
        "role_label": "NGO Director",
        "scope": "ngo",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["food_relief", "mid_day_meals", "nutrition", "supply_chain", "community_feeding"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Defence ──
    "army_liaison": {
        "role_label": "Army Liaison",
        "scope": "defence",
        "accessible_modules": ["operations", "command-center", "live-monitoring"],
        "knowledge_domains": ["military_support", "medical_evacuation", "logistics", "emergency_deployment", "civil_affairs"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "air_force_liaison": {
        "role_label": "Air Force Liaison",
        "scope": "defence",
        "accessible_modules": ["operations", "command-center"],
        "knowledge_domains": ["air_operations", "air_drops", "medical_evacuation", "aerial_surveillance", "airlift_coordination"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "navy_liaison": {
        "role_label": "Navy Liaison",
        "scope": "defence",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["naval_operations", "coastal_security", "maritime_rescue", "flood_relief", "sea_transport"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "medical_corps": {
        "role_label": "Medical Corps",
        "scope": "defence",
        "accessible_modules": ["operations", "command-center", "ai-ml-lab"],
        "knowledge_domains": ["military_medicine", "field_hospitals", "trauma_care", "medical_logistics", "emergency_surgery"],
        "can_access_clinical": True,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── National Authorities ──
    "ministry_health": {
        "role_label": "Health Ministry",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "policy-workflow", "ai-ml-lab"],
        "knowledge_domains": ["health_policy", "national_health_programs", "disease_control", "hospital_regulation", "public_health_governance"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "nha": {
        "role_label": "National Health Authority",
        "scope": "government",
        "accessible_modules": ["operations", "policy-workflow", "ai-ml-lab"],
        "knowledge_domains": ["health_insurance", "ayushman_bharat", "hospital_empanelment", "health_schemes", "beneficiary_tracking"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "ncdc": {
        "role_label": "NCDC Director",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "ai-ml-lab"],
        "knowledge_domains": ["disease_control", "surveillance", "outbreak_investigation", "lab_network", "public_health_emergencies"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "icmr": {
        "role_label": "ICMR Researcher",
        "scope": "government",
        "accessible_modules": ["operations", "ai-ml-lab"],
        "knowledge_domains": ["medical_research", "clinical_trials", "disease_research", "vaccine_development", "epidemiology"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "blood_council": {
        "role_label": "Blood Council",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["blood_policy", "national_blood_supply", "donor_programs", "quality_standards", "emergency_reserve"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "central_surveillance": {
        "role_label": "Central Surveillance",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["disease_surveillance", "integrated_health_info", "early_warning", "cross_border_tracking", "data_analytics"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "central_gov": {
        "role_label": "Central Government",
        "scope": "government",
        "accessible_modules": ["command-center", "live-monitoring", "disaster-management", "policy-workflow", "ai-ml-lab"],
        "knowledge_domains": ["governance", "policy_formulation", "inter_ministerial", "national_security", "crisis_management", "budget_oversight"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── State Government ──
    "state_health": {
        "role_label": "State Health Department",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "policy-workflow", "ai-ml-lab"],
        "knowledge_domains": ["state_health_programs", "hospital_administration", "disease_control", "family_welfare", "public_health_ops"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "state_disaster": {
        "role_label": "State Disaster Authority",
        "scope": "government",
        "accessible_modules": ["operations", "disaster-management", "live-monitoring", "simulation-center"],
        "knowledge_domains": ["state_emergency_planning", "disaster_mitigation", "relief_coordination", "district_oversight", "resource_pooling"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "state_medical": {
        "role_label": "State Medical Directorate",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["medical_administration", "hospital_standards", "drug_licensing", "medical_education", "public_health_regulation"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "state_surveillance": {
        "role_label": "State Surveillance Unit",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "ai-ml-lab"],
        "knowledge_domains": ["disease_tracking", "integrated_surveillance", "epidemic_monitoring", "data_collection", "district_reporting"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── District Government ──
    "district_collector": {
        "role_label": "District Collector",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "disaster-management", "policy-workflow"],
        "knowledge_domains": ["district_administration", "law_and_order", "disaster_response", "revenue_administration", "development"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "district_health": {
        "role_label": "District Health Office",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "disaster-management"],
        "knowledge_domains": ["district_health_ops", "primary_care", "immunization", "disease_surveillance", "health_camps"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "district_surveillance": {
        "role_label": "District Surveillance",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring"],
        "knowledge_domains": ["local_disease_tracking", "early_warning", "sample_collection", "reporting"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    "district_disaster": {
        "role_label": "District Disaster Cell",
        "scope": "government",
        "accessible_modules": ["operations", "live-monitoring", "command-center"],
        "knowledge_domains": ["local_disaster_management", "evacuation", "relief_camps", "first_responders", "community_preparedness"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
    # ── Government Default Fallback ──
    "government": {
        "role_label": "Government Official",
        "scope": "government",
        "accessible_modules": ["command-center", "live-monitoring", "operations"],
        "knowledge_domains": ["governance", "emergency_response", "public_safety", "policy", "administration"],
        "can_access_clinical": False,
        "can_access_finance": False,
        "can_access_admin": False,
    },
}

DEFAULT_ROLE_CONTEXT = {
    "role_label": "Staff",
    "scope": "general",
    "description": "General hospital staff",
    "accessible_modules": [],
    "knowledge_domains": ["general"],
    "can_access_clinical": False,
    "can_access_finance": False,
    "can_access_admin": False,
}


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


def _as_iso(value: datetime | None) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.isoformat()


def _safe_timedelta_ms(start: float) -> int:
    return max(0, int((time.time() - start) * 1000))


def get_role_context(role_id: str) -> dict:
    """Get the AI context profile for a given role."""
    role_key = role_id.lower().replace(" ", "_") if role_id else ""
    return ROLE_CONTEXTS.get(role_key, DEFAULT_ROLE_CONTEXT)


def generate_conversation_title(query: str, role_label: str) -> str:
    """Auto-generate a conversation title from the first query."""
    prefixes = {
        "CEO": "Executive",
        "Emergency Physician": "Emergency",
        "ICU Physician": "ICU",
        "Finance Officer": "Financial",
        "Nurse": "Nursing",
        "Radiologist": "Radiology",
        "Lab Technician": "Lab",
        "Pharmacist": "Pharmacy",
        "System Administrator": "Admin",
        # Government roles
        "Police Commissioner": "Police",
        "Police Control Room": "Police Control",
        "Traffic Police": "Traffic",
        "Cyber Crime": "Cyber",
        "Special Operations": "Special Ops",
        "Intelligence Unit": "Intelligence",
        "Fire Chief": "Fire",
        "Fire Control Room": "Fire Control",
        "Hazmat Team": "Hazmat",
        "Ambulance Authority": "Ambulance",
        "Ambulance Dispatch": "Dispatch",
        "Public Health Officer": "Public Health",
        "Epidemiologist": "Epidemiology",
        "Vaccination Officer": "Vaccination",
        "Blood Bank Authority": "Blood Bank",
        "Animal Husbandry Officer": "Animal Health",
        "Pharma Supply Officer": "Pharma",
        "Medical Equipment Authority": "Med Equipment",
        "NDMA Officer": "NDMA",
        "NDRF Commander": "NDRF",
        "SDRF Officer": "SDRF",
        "Relief Coordinator": "Relief",
        "National Emergency Operator": "National Emergency",
        "State Emergency Operator": "State Emergency",
        "District Emergency Operator": "District Emergency",
        "Municipal Commissioner": "Municipal",
        "Municipal Health Officer": "Municipal Health",
        "Water Supply Officer": "Water Supply",
        "Waste Management Officer": "Waste",
        "Transport Commissioner": "Transport",
        "NHAI Officer": "NHAI",
        "Railways Officer": "Railways",
        "Airport Authority": "Airport",
        "Port Authority": "Port",
        "Public Works Officer": "Public Works",
        "Food Corporation Officer": "Food Supply",
        "Electricity Board": "Power",
        "Telecom Officer": "Telecom",
        "IMD Meteorologist": "Weather",
        "Forest Conservator": "Forest",
        "Forest Fire Control": "Forest Fire",
        "Civil Defence Officer": "Civil Defence",
        "Indian Red Cross": "Red Cross",
        "NGO Director": "NGO",
        "Army Liaison": "Army",
        "Air Force Liaison": "Air Force",
        "Navy Liaison": "Navy",
        "Medical Corps": "Medical Corps",
        "Health Ministry": "Health Ministry",
        "National Health Authority": "NHA",
        "NCDC Director": "NCDC",
        "ICMR Researcher": "ICMR",
        "Blood Council": "Blood Council",
        "Central Surveillance": "Surveillance",
        "Central Government": "Central Govt",
        "State Health Department": "State Health",
        "State Disaster Authority": "State Disaster",
        "State Medical Directorate": "State Medical",
        "State Surveillance Unit": "State Surveillance",
        "District Collector": "District",
        "District Health Office": "District Health",
        "District Surveillance": "District Surveillance",
        "District Disaster Cell": "District Disaster",
        "Government Official": "Government",
    }
    prefix = prefixes.get(role_label, "General")
    # Use first meaningful words
    clean = query.strip()[:60].replace("\n", " ")
    if len(clean) > 50:
        clean = clean[:47] + "..."
    return f"{prefix}: {clean}" if clean else f"{prefix} Discussion"


class EnterpriseAIChatService:
    """
    Enterprise AI Chat Service with full isolation:
    - Every query filtered by hospital_id, user_id, role_id
    - No cross-hospital, cross-role, or cross-user access
    - Role-based context loaded on every interaction
    - Audit logging for every action
    """

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    # ═══════════════════════════════════════════════════════════════════
    # SESSION MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════

    async def create_session(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        ip_address: str | None = None,
        device: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        """Create a new AI session when user logs in."""
        session_id = _uuid()
        record = LifeLinkAISession(
            id=session_id,
            hospital_id=hospital_id,
            user_id=user_id,
            role_id=role_id,
            login_time=_now(),
            last_activity=_now(),
            is_active=True,
            ip_address=ip_address,
            device=device,
            user_agent=user_agent,
        )
        async with self._session_factory() as db:
            db.add(record)
            await db.commit()

        return {
            "id": session_id,
            "hospital_id": hospital_id,
            "user_id": user_id,
            "role_id": role_id,
            "login_time": _as_iso(record.login_time),
            "is_active": True,
        }

    async def close_session(self, session_id: str, hospital_id: str, user_id: str) -> bool:
        """Close an AI session on logout."""
        async with self._session_factory() as db:
            stmt = (
                sa_update(LifeLinkAISession)
                .where(LifeLinkAISession.id == session_id)
                .where(LifeLinkAISession.hospital_id == hospital_id)
                .where(LifeLinkAISession.user_id == user_id)
                .values(is_active=False, logout_time=_now())
            )
            result = await db.execute(stmt)
            await db.commit()
            return result.rowcount > 0

    # ═══════════════════════════════════════════════════════════════════
    # CONTEXT LOADING
    # ═══════════════════════════════════════════════════════════════════

    async def load_context(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        department: str | None = None,
        current_module: str = "general",
        portal: str = "hospital",
    ) -> dict[str, Any]:
        """
        Load the full AI context for a user session.
        Includes role profile, accessible modules, recent conversations,
        memory, and hospital or government org context.
        """
        role_context = get_role_context(role_id)
        role_label = role_context["role_label"]

        # Get recent conversations
        conversations = await self.list_conversations(hospital_id, user_id, role_id, limit=5)

        # Get memory items
        memory_items = await self.get_memory(hospital_id, user_id, role_id)

        # Compute shift from current time
        current_hour = datetime.now(timezone.utc).hour + 5.5  # IST
        current_hour = current_hour % 24
        if 6 <= current_hour < 14:
            current_shift = "Morning (6AM-2PM)"
        elif 14 <= current_hour < 22:
            current_shift = "Evening (2PM-10PM)"
        else:
            current_shift = "Night (10PM-6AM)"

        # Get active session
        active_session = await self._get_active_session(hospital_id, user_id, role_id)

        # ── Portal-aware context loading ────────────────────────────────
        if portal == "government":
            org_context = await self._load_government_context()
            context = {
                "user": {
                    "id": user_id,
                    "hospital_id": hospital_id,
                    "role_id": role_id,
                    "role_label": role_label,
                    "department": department or "Government",
                    "scope": role_context["scope"],
                    "description": role_context["description"],
                },
                "role": role_context,
                "current_module": current_module,
                "current_shift": current_shift,
                "accessible_modules": role_context.get("accessible_modules", []),
                "allowed_domains": role_context.get("knowledge_domains", []),
                "recent_conversations": conversations[:3],
                "memory": memory_items[:10],
                "active_session_id": active_session.get("id") if active_session else None,
                "organization": org_context,
                "portal": "government",
                "loaded_at": _as_iso(_now()),
            }
        else:
            # ── Hospital context ────────────────────────────────────────
            hospital_context = await self._load_hospital_context()
            context = {
                "user": {
                    "id": user_id,
                    "hospital_id": hospital_id,
                    "role_id": role_id,
                    "role_label": role_label,
                    "department": department or "General",
                    "scope": role_context["scope"],
                    "description": role_context["description"],
                },
                "role": role_context,
                "current_module": current_module,
                "current_shift": current_shift,
                "accessible_modules": role_context.get("accessible_modules", []),
                "allowed_domains": role_context.get("knowledge_domains", []),
                "recent_conversations": conversations[:3],
                "memory": memory_items[:10],
                "active_session_id": active_session.get("id") if active_session else None,
                "hospital": hospital_context,
                "portal": "hospital",
                "loaded_at": _as_iso(_now()),
            }
        return context

    async def _load_government_context(self) -> dict[str, Any]:
        """
        Provide a minimal government organization context.
        Government users don't have hospital-specific context.
        """
        return {
            "name": "Government of India",
            "type": "government",
            "level": "national",
            "description": "National Emergency Response Platform",
            "jurisdiction": "All States and Union Territories",
            "capabilities": ["disaster_response", "emergency_coordination", "resource_allocation", "inter_agency_communication"],
        }

    async def _load_hospital_context(self) -> dict[str, Any]:
        """
        Query the hospitals + enterprise_departments tables to build
        a rich hospital context for the AI.
        Returns name, location, capacity/occupancy, department list,
        bed metrics, department status summary, policies, and resources.
        Wrapped in try/except so missing tables never crash the context loader.
        Falls back to _default_hospital_context() on failure with a logged warning.
        """
        try:
            async with self._session_factory() as db:
                stmt = select(CoreHospital).limit(1)
                hospital_record = (await db.execute(stmt)).scalar_one_or_none()

                dept_stmt = select(EnterpriseDepartment).order_by(EnterpriseDepartment.name)
                dept_records = (await db.execute(dept_stmt)).scalars().all()
        except Exception as exc:
            logger.warning(
                "Failed to load hospital context from enterprise_auth DB: %s. "
                "Enterprise auth bootstrap may not have run yet.",
                exc,
            )
            return self._default_hospital_context()

        # Start with the default context as a base, then overlay real data
        context = self._default_hospital_context()
        context["_context_source"] = "live_database"

        # ── Overlay hospital info if available ─────────────────────────
        if hospital_record:
            name = hospital_record.name
            location = hospital_record.location
            total_capacity = hospital_record.capacity or 0
            current_occupancy = hospital_record.occupancy or 0
            available_beds = max(0, total_capacity - current_occupancy)
            bed_utilization_pct = round(
                (current_occupancy / total_capacity * 100) if total_capacity > 0 else 0, 1
            )
            context.update({
                "name": name,
                "location": location,
                "total_capacity": total_capacity,
                "current_occupancy": current_occupancy,
                "available_beds": available_beds,
                "bed_utilization_pct": bed_utilization_pct,
                "bed_summary": (
                    f"{available_beds} beds available out of {total_capacity} "
                    f"({bed_utilization_pct}% utilized)."
                ),
            })

        # ── Overlay departments from DB records ───────────────────────
        departments_list = []
        dept_status_summary: dict[str, int] = {
            "operational": 0, "busy": 0,
            "maintenance": 0, "restricted": 0, "offline": 0,
        }
        for dept in dept_records:
            status = dept.status or "operational"
            dept_status_summary[status] = dept_status_summary.get(status, 0) + 1
            departments_list.append({
                "key": dept.key,
                "name": dept.name,
                "status": status,
                "location": dept.location,
                "description": dept.description,
                "manager_id": dept.manager_id,
            })

        total_departments = len(departments_list)
        operational_depts = dept_status_summary.get("operational", 0)
        busy_depts = dept_status_summary.get("busy", 0)

        status_parts = [f"{operational_depts} operational"]
        if busy_depts:
            status_parts.append(f"{busy_depts} busy")
        if dept_status_summary.get("maintenance"):
            status_parts.append(f"{dept_status_summary['maintenance']} maintenance")
        if dept_status_summary.get("offline"):
            status_parts.append(f"{dept_status_summary['offline']} offline")
        if dept_status_summary.get("restricted"):
            status_parts.append(f"{dept_status_summary['restricted']} restricted")

        context.update({
            "departments": departments_list,
            "department_status_summary": dept_status_summary,
            "total_departments": total_departments,
            "department_status_text": (
                f"{total_departments} departments: {', '.join(status_parts)}."
                if total_departments > 0
                else "No departments registered."
            ),
        })

        return context

    @staticmethod
    def _default_hospital_context() -> dict[str, Any]:
        """
        Fallback context when DB tables are not yet available.
        Also used as a base template that _load_hospital_context() overlays on top of.
        """
        return {
            "name": "LifeLink Hospital",
            "location": "Pune, Maharashtra, India",
            "total_capacity": 500,
            "current_occupancy": 0,
            "available_beds": 500,
            "bed_utilization_pct": 0.0,
            "total_departments": 0,
            "departments": [],
            "department_status_summary": {
                "operational": 0, "busy": 0,
                "maintenance": 0, "restricted": 0, "offline": 0,
            },
            "department_status_text": "No departments registered. The enterprise auth bootstrap may not have run yet.",
            "bed_summary": "500 virtual beds (database not connected for live data).",
            "policies": [
                {
                    "title": "Patient Data Privacy",
                    "description": "All patient data access is logged and audited. PHI is encrypted at rest and in transit.",
                    "category": "compliance",
                },
                {
                    "title": "Role-Based Access Control",
                    "description": "Access to modules and data is strictly governed by RBAC policies defined per role.",
                    "category": "security",
                },
                {
                    "title": "Emergency Override Protocol",
                    "description": "During mass casualty events, emergency override can grant temporary expanded access to clinical teams.",
                    "category": "operations",
                },
            ],
            "available_resources": {
                "blood_bank": {
                    "status": "Ready for query from database",
                    "note": "Connect to inventory tables for live blood stock levels.",
                },
                "ambulance_fleet": {
                    "status": "Ready for query from database",
                    "note": "Connect to ambulances table for live fleet status.",
                },
                "equipment": {
                    "status": "Ready for query from database",
                    "note": "Connect to equipment/resource tables for live availability.",
                },
            },
            "_context_source": "default_template",
        }

    async def _get_active_session(
        self, hospital_id: str, user_id: str, role_id: str
    ) -> dict[str, Any] | None:
        """Get the most recent active session for this user."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAISession)
                .where(LifeLinkAISession.hospital_id == hospital_id)
                .where(LifeLinkAISession.user_id == user_id)
                .where(LifeLinkAISession.role_id == role_id)
                .where(LifeLinkAISession.is_active == True)
                .order_by(LifeLinkAISession.last_activity.desc())
                .limit(1)
            )
            record = (await db.execute(stmt)).scalar_one_or_none()
        if not record:
            return None
        return {
            "id": record.id,
            "login_time": _as_iso(record.login_time),
            "last_activity": _as_iso(record.last_activity),
        }

    # ═══════════════════════════════════════════════════════════════════
    # CONVERSATIONS
    # ═══════════════════════════════════════════════════════════════════

    async def create_conversation(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        department: str | None = None,
        title: str = "New conversation",
        module: str = "general",
        mode: str = "chat",
    ) -> dict[str, Any]:
        """Create a new conversation with full isolation."""
        conv_id = _uuid()
        record = LifeLinkAIConversation(
            id=conv_id,
            title=title,
            hospital_id=hospital_id,
            user_id=user_id,
            role_id=role_id,
            role_label=get_role_context(role_id)["role_label"],
            department=department,
            module=module,
            mode=mode,
        )
        async with self._session_factory() as db:
            db.add(record)
            await db.commit()

        return {
            "id": conv_id,
            "title": title,
            "hospital_id": hospital_id,
            "user_id": user_id,
            "role_id": role_id,
            "module": module,
            "mode": mode,
            "created_at": _as_iso(record.created_at),
            "updated_at": _as_iso(record.updated_at),
            "messages": [],
        }

    async def list_conversations(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """List conversations for this user only — filtered by hospital + user + role."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.hospital_id == hospital_id)
                .where(LifeLinkAIConversation.user_id == user_id)
                .where(LifeLinkAIConversation.role_id == role_id)
                .where(LifeLinkAIConversation.is_deleted == False)
                .order_by(LifeLinkAIConversation.updated_at.desc())
                .offset(offset)
                .limit(limit)
            )
            records = (await db.execute(stmt)).scalars().all()

        return [
            {
                "id": r.id,
                "title": r.title,
                "hospital_id": r.hospital_id,
                "user_id": r.user_id,
                "role_id": r.role_id,
                "role_label": r.role_label,
                "module": r.module,
                "mode": r.mode,
                "message_count": r.message_count,
                "is_pinned": r.is_pinned,
                "created_at": _as_iso(r.created_at),
                "updated_at": _as_iso(r.updated_at),
            }
            for r in records
        ]

    async def get_conversation(
        self,
        conversation_id: str,
        hospital_id: str,
        user_id: str,
        role_id: str,
    ) -> dict[str, Any] | None:
        """Get a single conversation with messages — validates all three IDs."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.id == conversation_id)
                .where(LifeLinkAIConversation.hospital_id == hospital_id)
                .where(LifeLinkAIConversation.user_id == user_id)
                .where(LifeLinkAIConversation.role_id == role_id)
                .where(LifeLinkAIConversation.is_deleted == False)
            )
            record = (await db.execute(stmt)).scalar_one_or_none()

        if not record:
            return None

        messages = await self._get_messages(conversation_id, hospital_id, user_id, role_id)

        return {
            "id": record.id,
            "title": record.title,
            "hospital_id": record.hospital_id,
            "user_id": record.user_id,
            "role_id": record.role_id,
            "role_label": record.role_label,
            "department": record.department,
            "module": record.module,
            "mode": record.mode,
            "is_pinned": record.is_pinned,
            "message_count": record.message_count,
            "created_at": _as_iso(record.created_at),
            "updated_at": _as_iso(record.updated_at),
            "messages": messages,
        }

    async def update_conversation_title(
        self,
        conversation_id: str,
        hospital_id: str,
        user_id: str,
        role_id: str,
        title: str,
    ) -> bool:
        """Update conversation title — validates ownership."""
        async with self._session_factory() as db:
            stmt = (
                sa_update(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.id == conversation_id)
                .where(LifeLinkAIConversation.hospital_id == hospital_id)
                .where(LifeLinkAIConversation.user_id == user_id)
                .where(LifeLinkAIConversation.role_id == role_id)
                .values(title=title, updated_at=_now())
            )
            result = await db.execute(stmt)
            await db.commit()
            return result.rowcount > 0

    async def pin_conversation(
        self,
        conversation_id: str,
        hospital_id: str,
        user_id: str,
        role_id: str,
        is_pinned: bool = True,
    ) -> bool:
        """Pin/unpin a conversation — validates ownership."""
        async with self._session_factory() as db:
            stmt = (
                sa_update(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.id == conversation_id)
                .where(LifeLinkAIConversation.hospital_id == hospital_id)
                .where(LifeLinkAIConversation.user_id == user_id)
                .where(LifeLinkAIConversation.role_id == role_id)
                .values(is_pinned=is_pinned, updated_at=_now())
            )
            result = await db.execute(stmt)
            await db.commit()
            return result.rowcount > 0

    async def delete_conversation(
        self,
        conversation_id: str,
        hospital_id: str,
        user_id: str,
        role_id: str,
    ) -> bool:
        """
        Soft-delete a conversation — only removes the current user's copy.
        Validates all three IDs.
        """
        async with self._session_factory() as db:
            stmt = (
                sa_update(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.id == conversation_id)
                .where(LifeLinkAIConversation.hospital_id == hospital_id)
                .where(LifeLinkAIConversation.user_id == user_id)
                .where(LifeLinkAIConversation.role_id == role_id)
                .values(is_deleted=True, updated_at=_now())
            )
            result = await db.execute(stmt)
            await db.commit()
            return result.rowcount > 0

    async def search_conversations(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        query: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Search ONLY the current user's conversations — never global."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.hospital_id == hospital_id)
                .where(LifeLinkAIConversation.user_id == user_id)
                .where(LifeLinkAIConversation.role_id == role_id)
                .where(LifeLinkAIConversation.is_deleted == False)
                .where(LifeLinkAIConversation.title.ilike(f"%{query}%"))
                .order_by(LifeLinkAIConversation.updated_at.desc())
                .limit(limit)
            )
            records = (await db.execute(stmt)).scalars().all()

        return [
            {
                "id": r.id,
                "title": r.title,
                "module": r.module,
                "message_count": r.message_count,
                "updated_at": _as_iso(r.updated_at),
            }
            for r in records
        ]

    # ═══════════════════════════════════════════════════════════════════
    # MESSAGES
    # ═══════════════════════════════════════════════════════════════════

    async def add_message(
        self,
        conversation_id: str,
        hospital_id: str,
        user_id: str,
        role_id: str,
        role: str,  # 'user' or 'assistant'
        content: str,
        source_query: str | None = None,
        confidence: float | None = None,
        attachments: list | None = None,
        web_results: list | None = None,
        references: list | None = None,
        reasoning: list | None = None,
        clarifying: list | None = None,
        charts: list | None = None,
        report: dict | None = None,
        orchestration: dict | None = None,
        follow_up: str | None = None,
        metadata: dict | None = None,
    ) -> dict[str, Any] | None:
        """Add a message to a conversation — validates all three IDs."""
        # Verify conversation ownership
        conv = await self.get_conversation(conversation_id, hospital_id, user_id, role_id)
        if not conv:
            return None

        msg_id = _uuid()
        record = LifeLinkAIMessage(
            id=msg_id,
            conversation_id=conversation_id,
            hospital_id=hospital_id,
            user_id=user_id,
            role_id=role_id,
            role=role,
            content=content,
            source_query=source_query,
            confidence=confidence,
            attachments=attachments or [],
            web_results=web_results or [],
            references=references or [],
            reasoning=reasoning or [],
            clarifying=clarifying or [],
            charts=charts or [],
            report=report,
            orchestration=orchestration,
            follow_up=follow_up,
            extra_data=metadata,
        )

        # Auto-generate title if this is the first message
        new_title = None
        if conv["message_count"] == 0 and role == "user":
            role_label = get_role_context(role_id)["role_label"]
            new_title = generate_conversation_title(content, role_label)

        async with self._session_factory() as db:
            db.add(record)
            # Update conversation message count and title
            update_values = {"message_count": LifeLinkAIConversation.message_count + 1, "updated_at": _now()}
            if new_title:
                update_values["title"] = new_title
            stmt = (
                sa_update(LifeLinkAIConversation)
                .where(LifeLinkAIConversation.id == conversation_id)
                .values(**update_values)
            )
            await db.execute(stmt)
            await db.commit()

        return {
            "id": msg_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "source_query": source_query,
            "confidence": confidence,
            "attachments": attachments or [],
            "web_results": web_results or [],
            "references": references or [],
            "reasoning": reasoning or [],
            "clarifying": clarifying or [],
            "charts": charts or [],
            "report": report,
            "orchestration": orchestration,
            "follow_up": follow_up,
            "metadata": metadata,
            "created_at": _as_iso(record.created_at),
        }

    async def _get_messages(
        self,
        conversation_id: str,
        hospital_id: str,
        user_id: str,
        role_id: str,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Get messages for a conversation — filtered by all three IDs."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAIMessage)
                .where(LifeLinkAIMessage.conversation_id == conversation_id)
                .where(LifeLinkAIMessage.hospital_id == hospital_id)
                .where(LifeLinkAIMessage.user_id == user_id)
                .where(LifeLinkAIMessage.role_id == role_id)
                .order_by(LifeLinkAIMessage.created_at.asc())
                .limit(limit)
            )
            records = (await db.execute(stmt)).scalars().all()

        return [
            {
                "id": r.id,
                "conversation_id": r.conversation_id,
                "role": r.role,
                "content": r.content,
                "source_query": r.source_query,
                "confidence": r.confidence,
                "attachments": r.attachments or [],
                "web_results": r.web_results or [],
                "references": r.references or [],
                "reasoning": r.reasoning or [],
                "clarifying": r.clarifying or [],
                "charts": r.charts or [],
                "report": r.report,
                "orchestration": r.orchestration,
                "follow_up": r.follow_up,
                "metadata": r.extra_data,
                "created_at": _as_iso(r.created_at),
            }
            for r in records
        ]

    # ═══════════════════════════════════════════════════════════════════
    # MEMORY
    # ═══════════════════════════════════════════════════════════════════

    async def set_memory(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        memory_type: str,
        key: str,
        value: str,
        weight: float = 1.0,
        context: dict | None = None,
    ) -> dict[str, Any]:
        """Store a memory item for this user."""
        mem_id = _uuid()
        record = LifeLinkAIMemory(
            id=mem_id,
            hospital_id=hospital_id,
            user_id=user_id,
            role_id=role_id,
            memory_type=memory_type,
            key=key,
            value=value,
            weight=weight,
            context=context,
        )
        async with self._session_factory() as db:
            db.add(record)
            await db.commit()

        return {
            "id": mem_id,
            "memory_type": memory_type,
            "key": key,
            "value": value,
            "weight": weight,
        }

    async def get_memory(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        memory_type: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Get memory items for this user only."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAIMemory)
                .where(LifeLinkAIMemory.hospital_id == hospital_id)
                .where(LifeLinkAIMemory.user_id == user_id)
                .where(LifeLinkAIMemory.role_id == role_id)
            )
            if memory_type:
                stmt = stmt.where(LifeLinkAIMemory.memory_type == memory_type)
            stmt = stmt.order_by(LifeLinkAIMemory.weight.desc()).limit(limit)
            records = (await db.execute(stmt)).scalars().all()

        return [
            {
                "id": r.id,
                "memory_type": r.memory_type,
                "key": r.key,
                "value": r.value,
                "weight": r.weight,
                "context": r.context,
                "updated_at": _as_iso(r.updated_at),
            }
            for r in records
        ]

    async def delete_memory(self, memory_id: str, hospital_id: str, user_id: str) -> bool:
        """Delete a memory item — validates ownership."""
        async with self._session_factory() as db:
            stmt = (
                sa_delete(LifeLinkAIMemory)
                .where(LifeLinkAIMemory.id == memory_id)
                .where(LifeLinkAIMemory.hospital_id == hospital_id)
                .where(LifeLinkAIMemory.user_id == user_id)
            )
            result = await db.execute(stmt)
            await db.commit()
            return result.rowcount > 0

    # ═══════════════════════════════════════════════════════════════════
    # FEEDBACK
    # ═══════════════════════════════════════════════════════════════════

    async def add_feedback(
        self,
        message_id: str,
        conversation_id: str | None = None,
        hospital_id: str | None = None,
        user_id: str | None = None,
        role_id: str | None = None,
        rating: int = 5,
        comment: str | None = None,
    ) -> dict[str, Any] | None:
        """Add feedback on an AI response — validates ownership."""
        if rating < 1 or rating > 5:
            return None

        # If conversation_id not provided, look it up from the message
        if not conversation_id:
            async with self._session_factory() as db:
                stmt = select(LifeLinkAIMessage).where(LifeLinkAIMessage.id == message_id)
                msg = (await db.execute(stmt)).scalar_one_or_none()
                if msg:
                    conversation_id = msg.conversation_id
                    hospital_id = hospital_id or msg.hospital_id
                    user_id = user_id or msg.user_id
                    role_id = role_id or msg.role_id

        if not conversation_id or not hospital_id or not user_id:
            return None

        fb_id = _uuid()
        record = LifeLinkAIFeedback(
            id=fb_id,
            message_id=message_id,
            conversation_id=conversation_id,
            hospital_id=hospital_id,
            user_id=user_id,
            role_id=role_id,
            rating=rating,
            comment=comment,
        )
        async with self._session_factory() as db:
            db.add(record)
            await db.commit()

        return {
            "id": fb_id,
            "rating": rating,
            "comment": comment,
            "created_at": _as_iso(record.created_at),
        }

    # ═══════════════════════════════════════════════════════════════════
    # AUDIT LOGGING
    # ═══════════════════════════════════════════════════════════════════

    async def log_audit(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
        action: str,
        conversation_id: str | None = None,
        prompt: str | None = None,
        response_summary: str | None = None,
        module: str = "general",
        latency_ms: int | None = None,
        tokens_used: int | None = None,
        success: bool = True,
        error_message: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        """Log an audit entry for AI interaction."""
        record = LifeLinkAIAuditLog(
            id=_uuid(),
            hospital_id=hospital_id,
            user_id=user_id,
            role_id=role_id,
            conversation_id=conversation_id,
            action=action,
            prompt=prompt[:500] if prompt else None,
            response_summary=response_summary[:500] if response_summary else None,
            module=module,
            latency_ms=latency_ms,
            tokens_used=tokens_used,
            success=success,
            error_message=error_message[:500] if error_message else None,
            ip_address=ip_address,
        )
        async with self._session_factory() as db:
            db.add(record)
            await db.commit()

    # ═══════════════════════════════════════════════════════════════════
    # DEMO CONVERSATIONS (Development Mode)
    # ═══════════════════════════════════════════════════════════════════

    async def create_demo_conversations(
        self,
        hospital_id: str,
        user_id: str,
        role_id: str,
    ) -> list[dict[str, Any]]:
        """Create demo conversations for development mode — isolated per user."""
        role_context = get_role_context(role_id)
        role_label = role_context["role_label"]
        demos = _DEMO_PROMPTS.get(role_label, _DEMO_PROMPTS.get("Staff", []))

        created = []
        for query in demos[:3]:
            conv = await self.create_conversation(
                hospital_id=hospital_id,
                user_id=user_id,
                role_id=role_id,
                title=generate_conversation_title(query, role_label),
                module="general",
                mode="chat",
            )
            # Add user message
            await self.add_message(
                conversation_id=conv["id"],
                hospital_id=hospital_id,
                user_id=user_id,
                role_id=role_id,
                role="user",
                content=query,
            )
            # Add simulated response
            await self.add_message(
                conversation_id=conv["id"],
                hospital_id=hospital_id,
                user_id=user_id,
                role_id=role_id,
                role="assistant",
                content=f"Based on my analysis of {role_label.lower()} data, I recommend reviewing current metrics. The information is scoped to your role permissions and hospital context.",
                confidence=0.85,
                reasoning=["Analyzed available hospital data", "Applied role-based context filtering", "Generated response within permission boundaries"],
            )
            created.append(conv["id"])

        return created


# ── Demo prompts per role ───────────────────────────────────────────────

_DEMO_PROMPTS = {
    "CEO": [
        "How many ICU beds are available right now?",
        "Generate an executive revenue summary for this quarter.",
        "Predict tomorrow's hospital occupancy rate.",
    ],
    "Emergency Physician": [
        "Show me the current emergency department status.",
        "What are the incoming ambulance ETAs?",
        "List critical patients needing immediate attention.",
    ],
    "ICU Physician": [
        "Show me ICU bed utilization and availability.",
        "List patients with critical vital signs.",
        "Predict which patients are at risk of deterioration.",
    ],
    "Nurse": [
        "Show my assigned patients and their vitals.",
        "What medications are due for my current shift?",
        "Display the handoff summary for the next shift.",
    ],
    "Finance Officer": [
        "What is this month's revenue vs expenses?",
        "Show pending insurance claims that need approval.",
        "Generate a budget forecast for next quarter.",
    ],
    "Radiologist": [
        "List pending scan requests and their priority.",
        "Show recent MRI reports needing review.",
        "What AI insights are available for today's scans?",
    ],
    "Lab Technician": [
        "Show pending lab test requests.",
        "List samples that need processing this hour.",
        "Display recent test results that are flagged abnormal.",
    ],
    "Pharmacist": [
        "Show current pharmacy inventory levels.",
        "List medications that are low in stock.",
        "Check for potential drug interactions in current prescriptions.",
    ],
    "System Administrator": [
        "Show system health and performance metrics.",
        "List any security alerts from the last 24 hours.",
        "Generate an infrastructure utilization report.",
    ],
    "Staff": [
        "Show my tasks and notifications.",
        "What's happening in the hospital right now?",
        "Give me a summary of recent activity.",
    ],
    # ═══════════════════════════════════════════════════════════════════
    # GOVERNMENT ROLE DEMO PROMPTS
    # ═══════════════════════════════════════════════════════════════════
    "Police Commissioner": [
        "What are the active incidents in the city right now?",
        "Show me current patrol deployment across sectors.",
        "Analyze recent crime trends for this month.",
    ],
    "Police Control Room": [
        "Display all incoming emergency calls and their priority.",
        "What units are available for dispatch right now?",
        "Show the last 10 incident reports from today.",
    ],
    "Traffic Police": [
        "Show current traffic congestion hot spots.",
        "List road closures and diversions in the city.",
        "Recent accident reports and response times.",
    ],
    "Cyber Crime": [
        "Show recent cyber crime reports in our jurisdiction.",
        "Analyze patterns in online fraud cases this quarter.",
        "List ongoing digital forensic investigations.",
    ],
    "Special Operations": [
        "Show current tactical deployment status.",
        "Recent high-risk operation summaries.",
        "Team readiness and equipment status.",
    ],
    "Intelligence Unit": [
        "Show intelligence briefs for today.",
        "Analyze threat patterns in the region.",
        "Recent surveillance operation summaries.",
    ],
    "Fire Chief": [
        "How many active fire incidents are ongoing right now?",
        "Show deployed units and their current status.",
        "Recent hazmat incidents and containment reports.",
    ],
    "Fire Control Room": [
        "List all incoming fire emergency calls.",
        "What units are available for immediate dispatch?",
        "Show incident response times for today.",
    ],
    "Hazmat Team": [
        "Show recent chemical spill incidents and containment status.",
        "List hazmat equipment readiness levels.",
        "Recent decontamination operation summaries.",
    ],
    "Ambulance Authority": [
        "What is the current fleet status and availability?",
        "Show average ETA for active ambulance dispatches.",
        "Analyze patient transport trends this week.",
    ],
    "Ambulance Dispatch": [
        "Show all active ambulance units on the map.",
        "What are the current ETAs to nearest hospitals?",
        "List pending patient transport requests.",
    ],
    "Public Health Officer": [
        "Show current disease surveillance data for the district.",
        "Recent health alerts and recommended actions.",
        "Vaccination coverage rates and gaps.",
    ],
    "Epidemiologist": [
        "Analyze the current outbreak data and transmission trends.",
        "Show contact tracing completion rates.",
        "Recent lab test results and positive case trends.",
    ],
    "Vaccination Officer": [
        "Show vaccination drive progress and coverage.",
        "Current vaccine stock levels and cold chain status.",
        "Upcoming vaccination camp schedule.",
    ],
    "Blood Bank Authority": [
        "Show current blood inventory levels by blood group.",
        "Which blood groups are critically low?",
        "Cross-hospital transfer requests pending.",
    ],
    "Animal Husbandry Officer": [
        "Show recent livestock disease reports.",
        "Veterinary camp schedules and coverage.",
        "Zoonotic disease surveillance updates.",
    ],
    "Pharma Supply Officer": [
        "Show current pharmaceutical supply chain status.",
        "Which essential drugs are running low?",
        "Recent procurement and distribution summaries.",
    ],
    "Medical Equipment Authority": [
        "Show equipment inventory and maintenance status.",
        "List devices due for certification or calibration.",
        "Recent procurement needs and utilization rates.",
    ],
    "NDMA Officer": [
        "What are the current disaster alerts and warnings?",
        "Show risk assessments for active hazard zones.",
        "Recent mitigation project status and resource allocation.",
    ],
    "NDRF Commander": [
        "Show current rescue operation status across all teams.",
        "Personnel deployment and availability report.",
        "Recent disaster response summaries.",
    ],
    "SDRF Officer": [
        "Show state-level disaster response readiness.",
        "Relief camp status and resource distribution.",
        "Recent search and rescue operation reports.",
    ],
    "Relief Coordinator": [
        "Show relief supply inventory and distribution status.",
        "Pending aid requests from affected regions.",
        "Volunteer deployment and logistics status.",
    ],
    "National Emergency Operator": [
        "Show all active emergencies across the nation.",
        "Inter-agency coordination status and gaps.",
        "Resource mobilization and deployment summary.",
    ],
    "State Emergency Operator": [
        "Show current emergency situations across the state.",
        "District-level response coordination status.",
        "Resource requests and allocation summary.",
    ],
    "District Emergency Operator": [
        "Show active emergencies in the district.",
        "First responder deployment and availability.",
        "Recent incident reports and response times.",
    ],
    "Municipal Commissioner": [
        "Show civic service status across all wards.",
        "Water supply and waste collection metrics.",
        "Pending infrastructure projects and budgets.",
    ],
    "Municipal Health Officer": [
        "Show sanitation and vector control status.",
        "Recent food safety inspection reports.",
        "Public health complaint resolution summary.",
    ],
    "Water Supply Officer": [
        "Show water distribution status across zones.",
        "Treatment plant operational metrics.",
        "Reported water quality issues and resolutions.",
    ],
    "Waste Management Officer": [
        "Show waste collection coverage and efficiency.",
        "Recycling program metrics and improvements.",
        "Pending waste disposal requests.",
    ],
    "Transport Commissioner": [
        "Show public transport fleet status and routes.",
        "Emergency logistics vehicle availability.",
        "Recent route optimization recommendations.",
    ],
    "NHAI Officer": [
        "Show highway closure and construction status.",
        "Bridge safety inspection reports pending.",
        "Traffic management on major national highways.",
    ],
    "Railways Officer": [
        "Show train schedules and current disruptions.",
        "Station-wise passenger traffic and delays.",
        "Emergency train routing for relief operations.",
    ],
    "Airport Authority": [
        "Show current flight status and disruptions.",
        "Emergency response readiness at airports.",
        "Cargo and logistics handling capacity.",
    ],
    "Port Authority": [
        "Show port operations and vessel schedules.",
        "Coastal emergency response readiness.",
        "Cargo handling and logistics status.",
    ],
    "Public Works Officer": [
        "Show ongoing infrastructure projects and milestones.",
        "Road maintenance schedules and closures.",
        "Public building safety inspection reports.",
    ],
    "Food Corporation Officer": [
        "Show food grain stock levels across warehouses.",
        "Public distribution system coverage status.",
        "Emergency food relief supply readiness.",
    ],
    "Electricity Board": [
        "Show power grid load and distribution status.",
        "Current outages and restoration timelines.",
        "Infrastructure maintenance schedules.",
    ],
    "Telecom Officer": [
        "Show network coverage and uptime status.",
        "Emergency communication system readiness.",
        "Recent outages and broadband deployment.",
    ],
    "IMD Meteorologist": [
        "Show current weather warnings and forecasts.",
        "Cyclone and extreme weather tracking updates.",
        "Rainfall analysis and flood risk assessment.",
    ],
    "Forest Conservator": [
        "Show forest cover status and protected area reports.",
        "Wildlife movement alerts and human-animal conflicts.",
        "Recent afforestation project progress.",
    ],
    "Forest Fire Control": [
        "Show active forest fire incidents and containment.",
        "Fire risk indexes across forest zones.",
        "Aerial surveillance and patrol summaries.",
    ],
    "Civil Defence Officer": [
        "Show shelter readiness and capacity status.",
        "Volunteer registration and availability.",
        "Emergency preparedness drill schedules.",
    ],
    "Indian Red Cross": [
        "Show relief distribution metrics and volunteer status.",
        "Blood donation camp schedules and inventory.",
        "Pending aid requests from affected communities.",
    ],
    "NGO Director": [
        "Show aid distribution coverage and gaps.",
        "Volunteer deployment and resource allocation.",
        "Fund utilization and project impact summaries.",
    ],
    "Army Liaison": [
        "Show current military support operations active.",
        "Medical evacuation requests pending processing.",
        "Logistics support requests from civil authorities.",
    ],
    "Air Force Liaison": [
        "Show air support operations and aircraft readiness.",
        "Airdrop missions scheduled and completed.",
        "Medical evacuation flight requests.",
    ],
    "Navy Liaison": [
        "Show naval support operations and vessel readiness.",
        "Coastal rescue and flood relief operations.",
        "Maritime emergency response status.",
    ],
    "Medical Corps": [
        "Show field hospital deployment and capacity.",
        "Trauma cases received and treatment status.",
        "Medical supply inventory and resupply needs.",
    ],
    "Health Ministry": [
        "Show national health program implementation status.",
        "Disease control initiative progress reports.",
        "Hospital regulation compliance summaries.",
    ],
    "National Health Authority": [
        "Show Ayushman Bharat scheme coverage and claims.",
        "Hospital empanelment and quality metrics.",
        "Beneficiary enrollment and utilization trends.",
    ],
    "NCDC Director": [
        "Show national disease surveillance data and alerts.",
        "Outbreak investigation status and lab reports.",
        "Public health emergency preparedness status.",
    ],
    "ICMR Researcher": [
        "Show ongoing clinical trials and research studies.",
        "Recent disease research findings and publications.",
        "Vaccine development and efficacy study updates.",
    ],
    "Blood Council": [
        "Show national blood supply chain status.",
        "Blood quality standards compliance reports.",
        "Emergency blood reserve and mobilization readiness.",
    ],
    "Central Surveillance": [
        "Show integrated disease surveillance data feeds.",
        "Cross-border health tracking and early warnings.",
        "Data analytics insights from health information systems.",
    ],
    "Central Government": [
        "Show current national emergency response coordination.",
        "Inter-ministerial task force status reports.",
        "Policy implementation progress and budget utilization.",
    ],
    "State Health Department": [
        "Show state health program performance metrics.",
        "Hospital administration and quality reports.",
        "Disease control initiative progress in the state.",
    ],
    "State Disaster Authority": [
        "Show state-level disaster preparedness status.",
        "District-wise relief coordination status.",
        "Resource pooling and inter-district deployment.",
    ],
    "State Medical Directorate": [
        "Show hospital standards compliance in the state.",
        "Drug licensing and regulation updates.",
        "Medical education and training program status.",
    ],
    "State Surveillance Unit": [
        "Show integrated disease surveillance trends in state.",
        "District reporting compliance and data quality.",
        "Epidemic monitoring and early warning alerts.",
    ],
    "District Collector": [
        "Show district administration status and key metrics.",
        "Disaster response readiness and resource status.",
        "Development project progress and grievance status.",
    ],
    "District Health Office": [
        "Show district health program coverage and gaps.",
        "Immunization drive progress and cold chain status.",
        "Disease surveillance and health camp schedules.",
    ],
    "District Surveillance": [
        "Show local disease tracking and reporting status.",
        "Sample collection and lab testing progress.",
        "Early warning alerts from field units.",
    ],
    "District Disaster Cell": [
        "Show local disaster preparedness and response status.",
        "Evacuation plans and shelter capacity.",
        "First responder training and readiness.",
    ],
    "Government Official": [
        "Show current government operations and alerts.",
        "Emergency coordination status across agencies.",
        "Recent policy updates and action items.",
    ],
}
