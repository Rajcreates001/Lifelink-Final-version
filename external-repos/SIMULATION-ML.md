# 🎮 Simulation Engines & ML Tools

> **Priority:** 🟡 P1 — High
> **Purpose:** Scale agent-based simulation, improve ML with real data, manage model lifecycle.

---

## 1. Advanced Simulation Engines

> **Note:** The current [Mesa](https://github.com/projectmesa/mesa) simulation is functional but limited to ~10K agents. For city-scale disaster simulations, these alternatives offer orders-of-magnitude better performance.

### 1.1 Agents.jl (Julia)

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/JuliaDynamics/Agents.jl` |
| **Docs** | `https://juliadynamics.github.io/Agents.jl/` |
| **Type** | High-Performance Agent-Based Modeling |
| **Language** | Julia |
| **Performance** | 100× faster than Mesa |
| **Effort** | ⏱ 16+ hours (requires learning Julia) |

#### What It Adds
- **100K+ agents** — simulate entire city's population simultaneously
- **Spatial GIS** — integrate real map data for evacuation modeling
- **Parallel execution** — multi-threading and GPU support built-in
- **Differential evolution** — optimize simulation parameters automatically

#### When to Use
Replace Mesa when you need **city-scale disaster simulations** (e.g., simulate all 12,000 ambulances across India responding to an earthquake simultaneously).

---

### 1.2 GAMA Platform

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/gama-platform/gama` |
| **Docs** | `https://gama-platform.org/` |
| **Type** | GIS-Integrated Agent-Based Modeling |
| **Language** | GAML (Java-based) |
| **Effort** | ⏱ 8+ hours |

#### What It Adds
- **Real GIS data** — simulation runs on actual city maps with real roads and buildings
- **Disaster-specific** — built-in fire spread, flood, earthquake models
- **3D visualization** — watch the simulation unfold in 3D
- **Network analysis** — model supply chain and communication networks

#### When to Use
Replace Mesa when simulations need **real geographic data** (e.g., simulate flood response using actual terrain elevation data).

---

### 1.3 FLAME GPU

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/FLAMEGPU/FLAMEGPU2` |
| **Docs** | `https://flamegpu.com/` |
| **Type** | GPU-Accelerated Agent Simulation |
| **Performance** | Millions of agents on a single GPU |
| **Effort** | ⏱ 16+ hours |

#### What It Adds
- **Massive scale** — simulate entire metropolitan populations
- **GPU acceleration** — leverages NVIDIA CUDA for parallel processing
- **Real-time** — watch simulations unfold at 60+ FPS

#### When to Use
Replace Mesa when you need **million-agent simulations** (e.g., pandemic spread across an entire state).

---

### 1.4 Abmax (JAX-based)

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/Abmax/abmax` |
| **Type** | Differentiable Agent-Based Modeling |
| **Effort** | ⏱ 8+ hours |

#### What It Adds
- **Gradient-based optimization** — automatically find optimal disaster response strategies
- **JAX performance** — runs on GPU/TPU with just-in-time compilation
- **Machine learning integration** — combine ABM with neural networks

#### When to Use
When you need to **optimize response strategies** computationally (e.g., "What's the optimal ambulance placement to minimize response time across all scenarios?").

---

## 2. CrewAI — Multi-Agent AI System

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/crewAIInc/crewAI` |
| **Docs** | `https://docs.crewai.com` |
| **Type** | Multi-Agent AI Orchestration |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Specialized AI agents** — create agent roles that collaborate
- **Tool integration** — agents can call APIs, search databases, query models
- **Sequential/parallel execution** — agents work in teams
- **Memory** — agents remember past interactions

### How to Integrate

```python
from crewai import Agent, Task, Crew, Process

triage_agent = Agent(
    role="Emergency Triage Specialist",
    goal="Classify emergency severity and recommend response priority",
    backstory="Expert in emergency medicine triage protocols",
    tools=[predict_severity, fetch_patient_history]
)

resource_agent = Agent(
    role="Resource Allocation Manager",
    goal="Find best hospital and ambulance for each emergency",
    backstory="Hospital operations expert with real-time resource awareness",
    tools=[check_bed_availability, find_nearest_ambulance]
)

dispatch_agent = Agent(
    role="Dispatch Coordinator",
    goal="Coordinate optimal emergency response",
    tools=[assign_ambulance, notify_hospital, update_family]
)

triage_task = Task(
    description="Classify incoming emergency: {emergency_data}",
    agent=triage_agent
)

dispatch_task = Task(
    description="Dispatch response based on triage: {triage_result}",
    agent=dispatch_agent,
    context=[triage_task]
)

crew = Crew(
    agents=[triage_agent, resource_agent, dispatch_agent],
    tasks=[triage_task, dispatch_task],
    process=Process.sequential
)
result = crew.kickoff(inputs={"emergency_data": sos_data})
```

### Why LifeLink Needs This
Currently a single LLM handles all AI tasks. With CrewAI, specialized agents collaborate:
- **Triage Agent** classifies severity
- **Resource Agent** finds best hospital/ambulance
- **Dispatch Agent** coordinates response
- **Family Agent** notifies family members
- **Report Agent** generates after-action reports

---

## 3. MLflow

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/mlflow/mlflow` |
| **Docs** | `https://mlflow.org/docs/latest/index.html` |
| **Type** | ML Model Lifecycle Management |
| **Effort** | ⏱ 4 hours |

### What It Adds
- **Experiment tracking** — log every model training run with parameters, metrics, artifacts
- **Model registry** — version models, track which version is in production
- **Model serving** — deploy models as REST APIs with one click
- **Drift monitoring** — detect when model predictions degrade over time

### How to Integrate

```python
import mlflow

mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("health-risk-prediction")

with mlflow.start_run():
    # Log parameters
    mlflow.log_param("model_type", "RandomForest")
    mlflow.log_param("n_estimators", 100)

    # Train model
    model.fit(X_train, y_train)
    accuracy = model.score(X_test, y_test)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)

    # Log model
    mlflow.sklearn.log_model(model, "model")

    # Register
    mlflow.register_model(f"runs:/{run_id}/model", "HealthRiskModel")
```

### Why LifeLink Needs This
Currently **no model tracking**. Can't answer: "Which version of the health risk model is deployed?" "Has accuracy degraded over time?" "What hyperparameters were used?"

---

## 4. Real Healthcare Datasets

| Dataset | Source | Records | Replaces | Use For |
|---------|--------|---------|----------|---------|
| **MIMIC-III** | `https://physionet.org/content/mimiciii/` | 60K ICU stays | `health_risk_expanded.csv` | Health risk prediction |
| **MIMIC-IV** | `https://physionet.org/content/mimiciv/` | 300K+ admissions | All health datasets | Patient outcome prediction |
| **NHANES** | `https://www.cdc.gov/nchs/nhanes/` | 10K+/year | `health_risk_data.csv` | Demographics + biometrics |
| **WHO GHO** | `https://www.who.int/data/gho` | Global | `outbreak_expanded.csv` | Disease surveillance |
| **PhysioNet** | `https://physionet.org/` | Various | Vital signs data | ECG, EEG, vitals analysis |
| **CDC WONDER** | `https://wonder.cdc.gov/` | US-wide | `hospital_data.csv` | Hospital utilization |

### How to Download

```bash
# MIMIC requires credentialled access (free, takes 1-2 days)
pip install wget
wget -r -np -nH --cut-dirs=1 -P ./backend/ml/real/ https://physionet.org/files/mimiciii/1.4/

# WHO data via API
pip install who-datasette
```

---

## 📦 Installation Commands Summary

```bash
# Simulation
pip install mesa  # already have
# pip install julia  # for Agents.jl (separate ecosystem)

# Multi-agent AI
pip install crewai

# ML lifecycle
pip install mlflow

# Dataset access
pip install wget who-datasette
```
