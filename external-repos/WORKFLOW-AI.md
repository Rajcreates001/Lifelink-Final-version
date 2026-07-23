# 🔄 Workflow Engines & Multi-Agent AI

> **Priority:** 🟡 P1 — High
> **Purpose:** Complex healthcare workflows (patient discharge, staff scheduling), durable execution, and multi-agent AI orchestration.

---

## 1. Temporal

| Detail | Value |
|--------|-------|
| **Python SDK** | `https://github.com/temporalio/sdk-python` |
| **Server** | `https://github.com/temporalio/temporal` |
| **Docs** | `https://docs.temporal.io/` |
| **Type** | Durable Execution / Workflow Engine |
| **Free** | ✅ Open-source server (self-host) |
| **Effort** | ⏱ 8 hours |

### What It Adds
- **Guaranteed execution** — workflows survive server crashes, network failures, process restarts
- **Long-running workflows** — patient stays that last days/weeks automatically tracked
- **Retry with backoff** — API calls automatically retry with exponential backoff
- **Timer/schedule** — "Check patient vitals every 4 hours" as a durable timer
- **Audit trail** — every step of a workflow is recorded for HIPAA compliance
- **Human-in-the-loop** — pause workflow and wait for doctor approval

### Example: Patient Discharge Workflow

```python
from temporalio import workflow

@workflow.defn
class PatientDischargeWorkflow:
    @workflow.run
    async def run(self, patient_id: str):
        # 1. Generate discharge summary
        summary = await workflow.execute_activity(
            generate_discharge_summary, patient_id,
            start_to_close_timeout=timedelta(minutes=5)
        )

        # 2. Get doctor approval (human-in-the-loop)
        approved = await workflow.execute_activity(
            request_doctor_approval, summary,
            start_to_close_timeout=timedelta(hours=24)
        )

        if not approved:
            return {"status": "rejected", "reason": "Doctor declined"}

        # 3. Schedule follow-up appointment
        followup = await workflow.execute_activity(
            schedule_followup, patient_id,
            start_to_close_timeout=timedelta(minutes=5)
        )

        # 4. Send discharge instructions to patient/family
        await workflow.execute_activity(
            notify_family, patient_id, summary,
            start_to_close_timeout=timedelta(minutes=2)
        )

        # 5. Notify cleaning crew for bed turnover
        await workflow.execute_activity(
            notify_bed_cleaning, patient_id,
            start_to_close_timeout=timedelta(minutes=2)
        )

        return {"status": "discharged", "summary": summary}
```

### Why LifeLink Needs This
**Patient Discharge Workflow** is flagged 🔴 Critical in the roadmap. Temporal makes it reliable:
- If the notification to the cleaning crew fails, it retries
- If the doctor takes 8 hours to approve, the workflow waits
- Every step is recorded for the audit trail
- If the server restarts mid-workflow, it resumes exactly where it left off

### Example: Staff Scheduling Workflow

```python
@workflow.defn
class StaffScheduleWorkflow:
    @workflow.run
    async def run(self, hospital_id: str, week: str):
        # 1. Get staff availability
        staff = await get_available_staff(hospital_id, week)

        # 2. Apply scheduling constraints
        schedule = await apply_constraints(staff, week)

        # 3. Get manager approval
        approved = await get_manager_approval(schedule)

        # 4. Publish schedule and notify staff
        await publish_schedule(schedule)
        await notify_all_staff(schedule)
```

---

## 2. SpiffWorkflow

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/sartography/SpiffWorkflow` |
| **Docs** | `https://spiffworkflow.readthedocs.io/` |
| **Type** | Python-native BPMN Workflow Engine |
| **Effort** | ⏱ 6 hours |

### What It Adds
- **Visual BPMN diagrams** — non-technical staff can design workflows using drag-and-drop
- **Python execution** — BPMN diagrams run as native Python code
- **Clinical pathway modeling** — model care protocols as visual flowcharts
- **Compliance audits** — BPMN diagrams are inherently auditable

### Example BPMN Processes for LifeLink
1. **Emergency Response Protocol** — from SOS trigger to hospital arrival
2. **Patient Admission** — from triage to bed assignment to treatment plan
3. **Blood Donation Process** — from donor registration to post-donation care
4. **Hospital Transfer** — from transfer request to patient handoff

### When to Use vs Temporal

| Scenario | Use |
|----------|-----|
| Need visual process maps for non-technical stakeholders | **SpiffWorkflow** |
| Need guaranteed execution across service crashes | **Temporal** |
| Need BPMN compliance for healthcare audits | **SpiffWorkflow** |
| Need complex retry logic and multi-service orchestration | **Temporal** |
| **Best approach**: Use both together! BPMN for the human-facing process model, Temporal for the backend execution guarantee. | **SpiffWorkflow + Temporal** |

---

## 3. Camunda 8

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/camunda/camunda-platform` |
| **Python Client** | `https://github.com/camunda-community-hub/pyzeebe` |
| **Type** | Enterprise BPMN Platform |
| **Effort** | ⏱ 8+ hours |

### What It Adds
- **Enterprise BPMN** — industry-standard process modeling and execution
- **DMN (Decision Model and Notation)** — clinical decision rules as decision tables
- **Operate dashboard** — monitor running workflows in real-time
- **Tasklist** — built-in task management for human assignments
- **Identity management** — SSO, permissions, multi-tenancy

### Example DMN Decision Table: Emergency Triage

| Heart Rate | BP Systolic | O2 Sat | Severity |
|-----------|-------------|--------|----------|
| > 120 | < 90 | < 90 | CRITICAL |
| 100-120 | 90-110 | 90-94 | HIGH |
| 80-100 | 110-130 | 95-100 | MODERATE |
| 60-80 | 120-140 | > 95 | LOW |

### When to Use
Enterprise deployments where Camunda's commercial support, SLA guarantees, and advanced features (DMN, Operate, Tasklist) are required.

---

## 4. CrewAI

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/crewAIInc/crewAI` |
| **Docs** | `https://docs.crewai.com` |
| **Type** | Multi-Agent AI Orchestration |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Specialized AI agent teams** for each domain
- **Agent collaboration** — agents share information and reach consensus
- **Tool integration** — agents call APIs, query databases, run ML models
- **Memory** — agents remember context across conversations
- **Sequential & hierarchical processes**

### LifeLink Agent Team

```
Emergency Crew:
├── Triage Agent        → Classifies severity, recommends priority
├── Resource Agent      → Checks bed/staff/ambulance availability
├── Dispatch Agent      → Coordinates ambulance + hospital response
├── Family Agent        → Notifies family, sends live updates
└── Report Agent        → Generates after-action summary

Hospital Crew:
├── Intake Agent        → Processes new patient admissions
├── Bed Manager Agent   → Optimizes bed allocation across wards
├── Supply Agent        → Tracks inventory, predicts shortages
└── Discharge Agent     → Manages discharge workflow

Government Crew:
├── Monitor Agent       → Watches real-time emergency metrics
├── Policy Agent        → Analyzes policy effectiveness
├── Resource Agent      → Tracks state-wide resource distribution
└── Simulate Agent      → Runs what-if disaster scenarios
```

---

## 5. AutoGen (Microsoft)

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/microsoft/autogen` |
| **Docs** | `https://microsoft.github.io/autogen/` |
| **Type** | Multi-Agent Conversation Framework |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Agent-to-agent conversation** — agents debate and reach consensus
- **Code generation** — agents can write and execute Python code
- **Web browsing** — agents can search the web for information
- **Multi-modal** — agents can analyze images, documents

### Example: Emergency Consensus

```
Triage Agent: "Patient has HR 140, BP 80/50, O2 88%. I classify as CRITICAL."
Resource Agent: "Nearest ICU bed is at City Hospital, 7 min away. Ambulance ID-42 is available."
Dispatch Agent: "Agreed. Dispatching Ambulance ID-42 to pickup. Notifying City Hospital ICU."
Family Agent: "Notifying emergency contact: John's wife at +91-9876543210."
```

### When to Use
Choose **CrewAI** for structured, predictable agent teams.
Choose **AutoGen** when agents need to have open-ended conversations, debate decisions, and use code/tools autonomously.

---

## 📦 Installation Commands Summary

```bash
# Workflow engines
pip install temporalio  # Python Temporal SDK
pip install SpiffWorkflow  # Python BPMN
pip install pyzeebe  # Camunda Python client

# Multi-agent AI
pip install crewai
pip install pyautogen  # Microsoft AutoGen

# Infrastructure (Docker Compose)
services:
  temporal:       # temporalio/auto-setup
  temporal-admin: # temporalio/admin-tools
  camunda:        # camunda/camunda-platform
```
