"""
AI Routes — Pydantic Validation Schemas
=========================================
Typed request models for all ML prediction endpoints.
Each model validates input fields with sensible defaults
so garbage data never reaches the ML models.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


# ─── Health Risk Prediction ─────────────────────────────────────

class HealthRiskPayload(BaseModel):
    """Input for health_risk_model.joblib — predicts heart attack risk."""
    age: int | None = Field(None, ge=0, le=120, description="Patient age in years")
    bmi: float | None = Field(None, ge=10, le=80, description="Body Mass Index")
    heart_rate: int | None = Field(None, ge=20, le=300, description="Heart rate in bpm")
    blood_pressure: int | None = Field(None, ge=40, le=300, description="Systolic blood pressure")
    blood_pressure_systolic: int | None = Field(None, ge=40, le=300, description="Systolic BP (alias)")
    oxygen: int | None = Field(None, ge=0, le=100, description="Oxygen saturation %")
    spo2: int | None = Field(None, ge=0, le=100, description="SpO2 % (alias)")
    has_condition: int | None = Field(None, ge=0, le=1, description="1 if patient has pre-existing condition")
    lifestyle: str | None = Field(None, description="Lifestyle factor: Active, Average, Sedentary, Smoker")
    lifestyle_factor: str | None = Field(None, description="Lifestyle factor (alias)")

    # Extended features from health_risk_data.csv
    sex: str | None = Field(None, description="Patient sex: Male / Female")
    cholesterol: int | None = Field(None, ge=0, le=600, description="Cholesterol level")
    diabetes: int | None = Field(None, ge=0, le=1, description="1 if diabetic")
    family_history: int | None = Field(None, ge=0, le=1, description="1 if family history of heart disease")
    smoking: int | None = Field(None, ge=0, le=1, description="1 if smoker")
    obesity: int | None = Field(None, ge=0, le=1, description="1 if obese")
    exercise_hours_per_week: float | None = Field(None, ge=0, le=100, description="Hours of exercise per week")
    stress_level: int | None = Field(None, ge=1, le=10, description="Stress level 1-10")
    previous_heart_problems: int | None = Field(None, ge=0, le=1, description="1 if prior heart problems")
    medication_use: int | None = Field(None, ge=0, le=1, description="1 if on medication")

    model_config = {"extra": "allow"}


# ─── User Activity Cluster ──────────────────────────────────────

class UserClusterPayload(BaseModel):
    """Input for activity_cluster_model.joblib — clusters user engagement."""
    sos_usage: int = Field(0, ge=0, description="Number of SOS alerts sent")
    donations_made: int = Field(0, ge=0, description="Number of donations made")
    health_logs: int = Field(0, ge=0, description="Number of health log entries")

    model_config = {"extra": "allow"}


# ─── User Behavior Forecast ─────────────────────────────────────

class UserForecastPayload(BaseModel):
    """Input for behavior_forecast_model.joblib — forecasts future donations."""
    past_donations: int = Field(0, ge=0, description="Historical donation count")

    model_config = {"extra": "allow"}


# ─── Hospital Severity ──────────────────────────────────────────

class HospitalSeverityPayload(BaseModel):
    """Input for hospital_severity_model.joblib — predicts patient severity."""
    age: int | None = Field(None, ge=0, le=120, description="Patient age")
    heart_rate: int | None = Field(None, ge=20, le=300, description="Heart rate bpm")
    blood_pressure_systolic: int | None = Field(None, ge=40, le=300, description="Systolic BP")
    distance_km: float | None = Field(None, ge=0, le=1000, description="Distance to hospital in km")
    emergency_type: str | None = Field(None, description="Type of emergency")
    message: str | None = Field(None, description="Free-text emergency description (for keyword fallback)")

    model_config = {"extra": "allow"}


# ─── Emergency Severity (Clinical) ──────────────────────────────

class EmergencySeverityPayload(BaseModel):
    """Input for emergency_severity_model.joblib (expanded) — clinical severity triage."""
    heart_rate: int | None = Field(None, ge=20, le=300, description="Heart rate bpm")
    blood_pressure_sys: int | None = Field(None, ge=40, le=300, description="Systolic blood pressure")
    oxygen_saturation: float | None = Field(None, ge=0, le=100, description="Oxygen saturation %")
    respiratory_rate: int | None = Field(None, ge=5, le=80, description="Respiratory rate breaths/min")
    age: int | None = Field(None, ge=0, le=120, description="Patient age")
    glasgow_coma_scale: int | None = Field(None, ge=3, le=15, description="GCS score 3-15")
    trauma_type: str | None = Field(None, description="Trauma type: blunt, penetrating, none")
    chief_complaint: str | None = Field(None, description="Primary complaint: chest_pain, trauma, etc.")

    model_config = {"extra": "allow"}


# ─── Donor Compatibility ────────────────────────────────────────

class DonorCompatibilityPayload(BaseModel):
    """Input for compatibility_model.joblib — checks donor-recipient match."""
    receiver_blood_type: str = Field(..., description="Receiver blood type: A+, B-, O+, etc.")
    receiver_age: int = Field(30, ge=0, le=120, description="Receiver age")
    receiver_gender: str = Field("Male", description="Receiver gender: Male / Female")
    donor_blood_type: str = Field(..., description="Donor blood type: A+, B-, O+, etc.")
    donor_age: int = Field(30, ge=0, le=120, description="Donor age")
    donor_gender: str = Field("Male", description="Donor gender: Male / Female")
    organ_type: str = Field("Blood", description="Organ type: Blood, Kidney, Liver, Heart")
    location_distance: float = Field(5, ge=0, le=10000, description="Distance in km")

    model_config = {"extra": "allow"}


# ─── Donor Availability ─────────────────────────────────────────

class DonorAvailabilityPayload(BaseModel):
    """Input for donor_availability_model.joblib — forecasts donor supply."""
    month: int = Field(1, ge=1, le=12, description="Month 1-12")
    donation_frequency: int = Field(10, ge=0, le=1000, description="Donation frequency in region")
    hospital_stock_level: int = Field(50, ge=0, le=100, description="Hospital stock level %")
    region: str = Field("General", description="Region name")
    resource_type: str = Field("O+", description="Blood/resource type")

    model_config = {"extra": "allow"}


# ─── Resource Allocation (Q-Learning) ───────────────────────────

class AllocationPayload(BaseModel):
    """Input for allocation_q_table.joblib — optimal ambulance dispatch."""
    emergency_count: int = Field(..., ge=0, le=100, description="Number of active emergencies")
    hospital_capacity_percent: int = Field(..., ge=0, le=100, description="Hospital capacity utilization %")

    model_config = {"extra": "allow"}


# ─── Policy Segmentation ────────────────────────────────────────

class PolicySegmentPayload(BaseModel):
    """Input for policy_segmentation_model.joblib — segments regions."""
    emergency_rate: float = Field(..., ge=0, description="Emergency calls per unit time")
    avg_response_time: float = Field(..., ge=0, description="Average response time in minutes")
    hospital_bed_occupancy: float = Field(..., ge=0, le=100, description="Bed occupancy %")

    model_config = {"extra": "allow"}


# ─── Healthcare Performance ─────────────────────────────────────

class PerformanceScorePayload(BaseModel):
    """Input for healthcare_performance_model.joblib — scores healthcare systems."""
    emergency_rate: float = Field(..., ge=0, description="Emergency rate")
    avg_response_time: float = Field(..., ge=0, description="Avg response time in minutes")
    hospital_bed_occupancy: float = Field(..., ge=0, le=100, description="Bed occupancy %")

    model_config = {"extra": "allow"}


# ─── Anomaly Detection ──────────────────────────────────────────

class AnomalyPayload(BaseModel):
    """Input for anomaly_detection_model.joblib — detects unusual patterns."""
    region: str | None = Field(None, description="Region name")
    daily_emergency_count: int | None = Field(None, ge=0, description="Daily emergency count")
    hospital_admissions: int | None = Field(None, ge=0, description="Hospital admissions")
    disease_reports: int | None = Field(None, ge=0, description="Disease reports")

    model_config = {"extra": "allow"}


# ─── Outbreak Forecast ──────────────────────────────────────────

class OutbreakForecastPayload(BaseModel):
    """Input for outbreak_forecast_models.joblib — predicts disease outbreaks."""
    disease_name: str = Field(..., description="Disease name: Influenza, Dengue, etc.")
    region: str = Field(..., description="Region name")
    days_to_predict: int = Field(30, ge=1, le=365, description="Forecast horizon in days")

    model_config = {"extra": "allow"}


# ─── Patient Recovery ───────────────────────────────────────────

class RecoveryPayload(BaseModel):
    """Input for recovery_model.joblib — predicts recovery probability."""
    age: int = Field(..., ge=0, le=120, description="Patient age")
    bmi: float = Field(..., ge=10, le=80, description="Body Mass Index")
    heart_rate: int = Field(..., ge=20, le=300, description="Heart rate bpm")
    blood_pressure: int = Field(..., ge=40, le=300, description="Systolic blood pressure")
    diagnosis: str = Field(..., description="Diagnosis: cardiac_issue, infection, etc.")
    treatment_type: str = Field(..., description="Treatment: Surgery, Medication, Therapy")

    model_config = {"extra": "allow"}


# ─── Stay Duration ──────────────────────────────────────────────

class StayDurationPayload(BaseModel):
    """Input for stay_duration_model.joblib — predicts hospital stay length."""
    age: int = Field(..., ge=0, le=120, description="Patient age")
    bmi: float = Field(..., ge=10, le=80, description="Body Mass Index")
    heart_rate: int = Field(..., ge=20, le=300, description="Heart rate bpm")
    blood_pressure: int = Field(..., ge=40, le=300, description="Systolic blood pressure")
    diagnosis: str = Field(..., description="Diagnosis")
    treatment_type: str = Field(..., description="Treatment type")

    model_config = {"extra": "allow"}


# ─── Inventory Prediction ───────────────────────────────────────

class InventoryPayload(BaseModel):
    """Input for inventory_prediction_model.joblib — forecasts stock levels."""
    name: str = Field("Unknown", description="Item name")
    quantity: int = Field(0, ge=0, description="Current stock quantity")
    minThreshold: int = Field(0, ge=0, description="Minimum threshold before reorder")
    category: str = Field("Consumables", description="Item category: Consumables, Equipment, etc.")
    daily_usage: float = Field(15, ge=0, description="Daily usage rate")
    lead_time_days: int = Field(7, ge=0, description="Supplier lead time in days")
    supplier_reliability: float = Field(0.85, ge=0, le=1, description="Supplier reliability 0-1")

    model_config = {"extra": "allow"}


# ─── ETA / Route ────────────────────────────────────────────────

class ETAPayload(BaseModel):
    """Input for eta_model.joblib — estimates arrival time."""
    distance_km: float | None = Field(None, ge=0, le=10000, description="Distance in km")
    start_node: str | None = Field(None, description="Start node for route planning")
    end_node: str | None = Field(None, description="End node for route planning")
    day_of_week: int = Field(2, ge=0, le=6, description="Day of week 0=Mon")
    time_of_day: str | None = Field(None, description="Time of day label")
    traffic_level: str | None = Field(None, description="Traffic: low, moderate, heavy")
    emergency_type: str | None = Field(None, description="Emergency type")
    weather_condition: str | None = Field(None, description="Weather: clear, rain, fog")
    hour: int | None = Field(None, ge=0, le=23, description="Hour of day (legacy)")
    precipitation_mm: float | None = Field(None, ge=0, description="Precipitation in mm (legacy)")

    model_config = {"extra": "allow"}


# ─── Hospital Performance ───────────────────────────────────────

class HospitalPerformancePayload(BaseModel):
    """Input for hospital_performance_model.joblib — clusters hospital performance."""
    avg_response_time: float = Field(..., ge=0, description="Avg response time minutes")
    treatment_success_rate: float = Field(..., ge=0, le=100, description="Success rate %")
    patient_satisfaction: float = Field(..., ge=0, le=5, description="Satisfaction score 1-5")
    resource_utilization: float = Field(..., ge=0, le=100, description="Resource utilization %")

    model_config = {"extra": "allow"}
