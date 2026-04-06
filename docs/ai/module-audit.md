# LifeLink AI Module Audit (2026-04-03)

This audit maps every role, subrole, module, submodule, and data source. It includes a capability matrix tying each UI panel to AI outputs and required data, plus a gaps list and verification checklist.

## Roles and subroles

- public
- hospital: ceo, emergency, finance, opd, icu, radiology, ot
- ambulance: crew, dispatcher, fleet
- government: national_admin, state_admin, district_admin, supervisory_authority

## Data sources (current)

Collections (backend/app/services/collections.py):
- USERS, ALERTS, HOSPITALS, AMBULANCES, HOSPITAL_MESSAGES, PATIENTS, RESOURCES, RESOURCE_REQUESTS, DONATIONS
- NOTIFICATIONS, ANALYTICS_EVENTS, HOSPITAL_DEPARTMENTS, HEALTH_RECORDS, EMERGENCY_EVENTS, PREDICTIONS, AUDIT_LOGS
- VECTOR_STORE, AMBULANCE_ASSIGNMENTS, OPD_APPOINTMENTS, OPD_DOCTORS, OPD_CONSULTATIONS, ICU_PATIENTS, ICU_ALERTS
- RADIOLOGY_REQUESTS, RADIOLOGY_REPORTS, OT_SURGERIES, OT_ALLOCATIONS, HOSPITAL_STAFF, EQUIPMENT_INVENTORY
- BED_ALLOCATIONS, OPD_QUEUE, BILLING_INVOICES, INSURANCE_CLAIMS, FINANCE_EXPENSES, DEPARTMENT_LOGS
- FAMILY_MEMBERS, GOVERNMENT_REPORTS, GOVERNMENT_COMPLIANCE, MODULE_ITEMS, MODULE_ALERTS, MODULE_AUTOMATIONS
- AI_EVENTS, FEATURE_STORE, MODEL_REGISTRY, INFERENCE_LOGS, DRIFT_REPORTS, SYNTHETIC_EVENTS

External/system data:
- OSRM routing + simulated traffic (routing_service)
- Open-Meteo weather (weather_service)
- Local RAG vector index (backend/app/services/rag/vector_store.py)

## AI platform layer (v2)

Endpoints:
- Event streaming: /v2/ai/events/publish, /v2/ai/events/{stream}
- Feature store: /v2/ai/features/{entity_type}/{entity_id}
- Model registry: /v2/ai/registry
- Retrieval index: /v2/ai/retrieval/ingest, /v2/ai/retrieval/search
- Observability: /v2/ai/observability (latency, drift, quality)
- Privacy: /v2/ai/privacy/redact, /v2/ai/privacy/scan
- Synthetic data: /v2/ai/synthetic/bootstrap
- Inference: /v2/ai/infer, /v2/ai/tasks/{task_key}/infer

Standard inference schema:
- status, module_key, model_key or task_key
- result, confidence, explanation
- latency_ms, cached, model_version (if available)

## Capability matrix

### Public role

| Module | Submodule (panel) | UI file | Data sources | AI outputs | Required data | Gaps |
| --- | --- | --- | --- | --- | --- | --- |
| Emergency (SOS) | SOS input + Hospital map | client/src/pages/PublicDashboard.jsx, client/src/components/HospitalMap.jsx | ALERTS, EMERGENCY_EVENTS, HOSPITALS, ANALYTICS_EVENTS | Live triage copilot, escalation predictor, voice-to-incident summary, responder ETA confidence | SOS text, location, vitals, traffic, hospital capacity | Real-time vitals feed still simulated |
| Health Dashboard | Personal snapshot + history | client/src/pages/PublicDashboard.jsx | DONATIONS, RESOURCE_REQUESTS, HEALTH_RECORDS, PREDICTIONS | Personal risk timeline, anomaly detection, preventive reminders, symptom cluster radar | Longitudinal vitals, visit history, wearable data | Wearable ingestion pipeline pending |
| Health Risk Prediction | Risk calculator | client/src/components/HealthRiskCalculator.jsx | PREDICTIONS | Explainable risk breakdowns, scenario simulator, saved risk history | Vitals, lifestyle, meds, chronic conditions | Limited longitudinal risk baselines |
| Medical Records | AI record analysis + history | client/src/pages/PublicDashboard.jsx | HEALTH_RECORDS, PATIENTS, VECTOR_STORE | Longitudinal timeline, multi-record summarization, condition trend alerts, semantic record search | Structured record entries, labs, diagnoses | Some records remain unstructured |
| Donor Matching | Donor cards + filters | client/src/pages/PublicDashboard.jsx | DONATIONS, USERS, RESOURCE_REQUESTS | Compatibility graph, urgency-prioritized matching, supply-demand forecast | Donor inventory, requester urgency, geography | Needs donor availability signals |
| Nearby Hospitals | Map + list | client/src/components/HospitalMap.jsx | HOSPITALS, RESOURCES, ANALYTICS_EVENTS | Capacity prediction, wait-time inference, route safety scoring | Bed occupancy, historical wait times, traffic incidents | Limited live wait-time data |
| Family Monitoring | Member list | client/src/components/FamilyMonitoring.jsx | FAMILY_MEMBERS | Wellness trend detection, geofence alerts, adherence nudges | Member vitals, consented location | Missing live device feeds |
| LifeLink AI Search | Semantic search | client/src/pages/PublicDashboard.jsx | VECTOR_STORE, HEALTH_RECORDS | Citation-first answers, personalized query expansion, risk-aware disclaimers | Knowledge index, user context, risk flags | Need role-based filtering for citations |

### Hospital role

| Subrole | Module | Submodule (panel) | UI file | Data sources | AI outputs | Required data | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ceo | Global Overview | metrics + live feed | client/src/components/HospitalOverview.jsx | HOSPITAL_STAFF, ALERTS, BED_ALLOCATIONS | Hospital digital twin, KPI anomaly radar, cross-facility benchmarking | Multi-hospital metrics, SLA data | External benchmarking feeds needed |
| ceo | AI Insights | recommendations + simulator | client/src/components/HospitalAnalytics.jsx | ANALYTICS_EVENTS, FINANCE_EXPENSES | KPI anomaly radar, resource cost optimizer | Occupancy, staffing, discharge | Limited cost attribution |
| ceo | Department Analytics | charts | client/src/components/HospitalOpsModules.jsx | HOSPITAL_DEPARTMENTS, DEPARTMENT_LOGS | Throughput forecast, bottleneck finder | Department logs, shift schedules | Partial department telemetry |
| ceo | Bed Management | occupancy, allocations | client/src/components/HospitalBedManagement.jsx | BED_ALLOCATIONS, PATIENTS | Bed demand forecast, auto allocation suggestions | Admission trends, discharge ETA | Discharge ETA quality |
| ceo | Resource Management | inventory + AI modal | client/src/components/HospitalResources.jsx | RESOURCES, EQUIPMENT_INVENTORY | Supply chain risk, utilization forecast | Vendor lead time, usage logs | Vendor lead-time data missing |
| ceo | Ambulance Coordination | map + routing | client/src/components/AmbulanceETARoute.jsx | AMBULANCES, RESOURCES | Load-aware dispatch, handoff summary builder | Ambulance status, hospital load | Multi-vehicle coordination limited |
| ceo | Finance Overview | charts | client/src/components/HospitalOpsModules.jsx | BILLING_INVOICES, FINANCE_EXPENSES | Margin forecast, leakage detector | Billing, claims, expenses | Needs payer delay data |
| ceo | Staff Management | roster | client/src/components/HospitalOpsModules.jsx | HOSPITAL_STAFF | Staffing demand forecast, skill mix optimizer | Shift rosters, case mix | Skill tagging incomplete |
| ceo | Reports | report list | client/src/components/HospitalOpsModules.jsx | GOVERNMENT_REPORTS, GOVERNMENT_COMPLIANCE | Auto summary builder, compliance highlights | Report corpus | Report ingestion gaps |
| ceo | Multi-Hospital Network | communications | client/src/components/HospitalCommunications.jsx | HOSPITAL_MESSAGES, HOSPITALS | Transfer recommender, mutual aid score | Inter-hospital capacity | Network data sharing needed |
| emergency | Live Emergency Feed | feed | client/src/components/HospitalOpsModules.jsx | ALERTS, ICU_PATIENTS, RADIOLOGY_REPORTS | Surge predictor, multimodal triage assistant | SOS stream, vitals, imaging meta | Imaging metadata limited |
| emergency | Ambulance Tracking | map + routing | client/src/components/AmbulanceETARoute.jsx | AMBULANCES, AMBULANCE_ASSIGNMENTS | Load-aware assignment, reroute-on-incident alerts | Ambulance status, incident stream | Dispatch integration pending |
| emergency | Patient Intake | intake queue + patient list | client/src/components/HospitalPatients.jsx | PATIENTS | Intake summary, risk banding | Vitals, history | Standardized intake capture missing |
| emergency | Bed Allocation | allocations | client/src/components/HospitalBedManagement.jsx | BED_ALLOCATIONS, ALERTS | Critical-path orchestration, overflow routing | Bed status, triage | Bed state freshness |
| emergency | AI Decision Panel | AI insights | client/src/components/HospitalAnalytics.jsx | ANALYTICS_EVENTS, ALERTS | Realtime triage assistant, ambulance handoff summary | Streaming events | Event stream coverage partial |
| finance | Billing | invoices | client/src/components/HospitalOpsModules.jsx | BILLING_INVOICES | Claims anomaly detection, payment delay risk | Invoice history | Claim labels limited |
| finance | Revenue Analytics | revenue summary | client/src/components/HospitalOpsModules.jsx | INSURANCE_CLAIMS, FINANCE_EXPENSES | Payer-mix forecasting, revenue leakage model | Claims + payments | Denial reasons incomplete |
| finance | Insurance | claims | client/src/components/HospitalOpsModules.jsx | INSURANCE_CLAIMS | Claim rejection predictor, recovery plan | Claim history | Rejection feedback loop missing |
| finance | Cost Optimization | optimizer | client/src/components/HospitalResources.jsx | FINANCE_EXPENSES, RESOURCES | Resource cost optimizer, contract leak detection | Vendor contracts, usage | Contract metadata missing |
| opd | Appointment Scheduling | appointments | client/src/components/HospitalOpsModules.jsx | OPD_APPOINTMENTS | Demand forecast, no-show prediction | Appointment history | Seasonality coverage limited |
| opd | Doctor Management | roster | client/src/components/HospitalOpsModules.jsx | OPD_DOCTORS | Staffing optimizer, specialty coverage | Schedule + visit mix | Schedule normalization needed |
| opd | Patient Queue | queue | client/src/components/HospitalOpsModules.jsx | OPD_QUEUE | Wait-time prediction, queue priority flags | Queue timestamps | Timestamp accuracy varies |
| opd | Consultation Records | records | client/src/components/HospitalOpsModules.jsx | OPD_CONSULTATIONS | AI scribe summary, follow-up planner | Transcript notes | NLP pipeline limited |
| icu | Live Monitoring | ICU patients | client/src/components/HospitalOpsModules.jsx | ICU_PATIENTS | Early deterioration model, stability index | Vitals stream | Real-time feeds incomplete |
| icu | Critical Alerts | alerts | client/src/components/HospitalOpsModules.jsx | ICU_ALERTS | Sepsis risk scoring, alert fatigue filter | Labs + vitals | Lab data integration pending |
| icu | AI Risk Panel | AI insights | client/src/components/HospitalOpsModules.jsx | ICU_PATIENTS | Vent weaning guidance, discharge readiness | Therapy data | Weaning protocol data missing |
| icu | Vitals Dashboard | vitals | client/src/components/HospitalOpsModules.jsx | ICU_PATIENTS | Trend anomaly alerts, vitals forecast | Time series vitals | Drift baselines limited |
| radiology | Scan Requests | list | client/src/components/HospitalOpsModules.jsx | RADIOLOGY_REQUESTS | Scan priority queue, turnaround predictor | Triage severity | Severity tagging incomplete |
| radiology | Report Upload | upload | client/src/components/HospitalOpsModules.jsx | RADIOLOGY_REPORTS | Report drafting assist, finding consistency | Study metadata | Structured findings needed |
| radiology | AI Insights | insights | client/src/components/HospitalOpsModules.jsx | RADIOLOGY_REPORTS | Modality QA, image completeness | Imaging meta | Imaging feed pipeline missing |
| ot | Surgery Scheduling | schedules | client/src/components/HospitalOpsModules.jsx | OT_SURGERIES | Duration prediction, schedule optimizer | Case history | Case complexity features missing |
| ot | Staff Allocation | allocations | client/src/components/HospitalOpsModules.jsx | OT_ALLOCATIONS | Staff readiness optimization, skill coverage | Staff roster | Skill taxonomy incomplete |
| ot | Equipment Tracking | inventory | client/src/components/HospitalResources.jsx | EQUIPMENT_INVENTORY | Utilization forecast, equipment readiness | Maintenance logs | Maintenance capture needed |

### Ambulance role

| Module | Submodule (panel) | UI file | Data sources | AI outputs | Required data | Gaps |
| --- | --- | --- | --- | --- | --- | --- |
| Assignments | assignments list | client/src/components/AmbulanceModules.jsx | AMBULANCE_ASSIGNMENTS, AMBULANCES | Predictive prioritization, crew load balancing, multi-ambulance optimization | Dispatch logs, fleet status | Multi-crew routing data limited |
| Live Tracking | map + ws | client/src/components/AmbulanceLiveTracking.jsx | AMBULANCES, ANALYTICS_EVENTS, ALERTS | Route risk scoring, reroute-on-incident alerts | Traffic + incident data | Incident feed is simulated |
| Patient Info | vitals list | client/src/components/AmbulanceModules.jsx | AMBULANCE_ASSIGNMENTS | Pre-arrival summary, smart vitals triage, voice-to-case log | Vitals + history + audio | Audio capture pipeline missing |
| Navigation | route lookup | client/src/components/AmbulanceModules.jsx | ANALYTICS_EVENTS, RESOURCES | Multi-route ranking, hospital load-aware assignment | Traffic + hospital load | Hospital load signals limited |
| Emergency Status | severity counts | client/src/components/AmbulanceModules.jsx | ALERTS, AMBULANCES | Surge warnings, coverage gap heatmap | Alert stream | Streaming density varies |
| History | mission history | client/src/components/AmbulanceModules.jsx | AMBULANCE_ASSIGNMENTS, AMBULANCES | Outcome prediction, protocol review, predictive maintenance, fuel/route efficiency | Case outcomes, maintenance logs | Outcome labels limited |

### Government role

| Subrole | Module | Submodule (panel) | UI file | Data sources | AI outputs | Required data | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| national_admin | Country Dashboard | overview | client/src/components/AuthorityOverview.jsx | HOSPITALS, ALERTS | National digital twin, cross-region benchmark | National metrics | National feed aggregation needed |
| national_admin | Emergency Heatmap | hotspots | client/src/components/EmergencyHotspotMap.jsx | ALERTS | Hotspot evolution, severity drift, outbreak early warning | Time series alerts | Longitudinal alert history limited |
| national_admin | Resource Allocation | allocation | client/src/components/AuthorityResources.jsx | RESOURCES | Supply chain risk, inter-state resource simulation | Regional supply data | Supplier lead times missing |
| national_admin | Policy Insights | AI + outbreak | client/src/components/AuthorityAI.jsx, AuthorityOutbreak.jsx | GOVERNMENT_REPORTS, GOVERNMENT_COMPLIANCE | Policy impact modeling, compliance predictor | Policy interventions | Policy outcome data limited |
| state_admin | State Dashboard | overview | client/src/components/AuthorityOverview.jsx | HOSPITALS, RESOURCES | State capacity forecast, hotspot evolution, resource gap index | State metrics | State-level data latency |
| state_admin | Hospital Monitoring | list | client/src/components/GovernmentModules.jsx | AUDIT_LOGS, ANALYTICS_EVENTS | Compliance risk scoring, performance outliers | Audit logs + KPIs | KPI normalization needed |
| state_admin | Reports | reports | client/src/components/GovernmentModules.jsx | GOVERNMENT_REPORTS | Auto summarization, risk highlights | Report corpus | Reports unstructured |
| district_admin | District Emergencies | alerts | client/src/components/GovernmentModules.jsx | ALERTS | Incident clustering, peak window predictor | Alert feed | Sparse district data |
| district_admin | Ambulance Tracking | map | client/src/components/AuthorityMap.jsx | AMBULANCES, ANALYTICS_EVENTS | Coverage gaps, ETA reliability | Location history | GPS consistency varies |
| supervisory_authority | Hospital Audits | pending | client/src/components/AuthorityUserMgmt.jsx | AUDIT_LOGS | Audit anomaly detection, license risk flags | Audit logs | Audit labeling missing |
| supervisory_authority | Compliance Monitoring | compliance | client/src/components/GovernmentModules.jsx | GOVERNMENT_COMPLIANCE | Safety compliance scoring, penalty predictor | Compliance history | Compliance completeness |

## Gaps list (current)

- Live telemetry feeds (wearables, vitals, claims) remain partial or simulated.
- Model evaluation datasets and ground-truth labeling are limited across roles.
- RAG index requires richer metadata for strict citation filtering.
- Some dashboards still rely on mocked metrics; data ingestion pipelines needed.
- Drift and quality monitoring exists but needs automated thresholds and alerts.

## Verification checklist

- Role-based UI smoke runs: public, hospital (all subroles), ambulance, government subroles.
- API contract checks: /v2/ai/insights, /v2/ai/infer, /v2/ai/tasks/{task_key}/infer, /v2/ai/retrieval/search.
- Latency budgets: SOS and dispatch inference p95 < 1500 ms, search p95 < 1000 ms.
- Synthetic scenario replay: /v2/ai/synthetic/bootstrap + task inference to validate explanations.
