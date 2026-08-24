import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero } from '../shared/GovernmentShared';
import { DetailModal, ConfirmDialog, Toast, AnimatedBarChart, AnimatedLineChart, AIExplainPanel, LiveTimer, PhaseProgress } from '../shared/InteractiveComponents';
import { apiFetch } from '../../../config/api';

// ── AI Simulation Engine — generates realistic disaster scenarios ──
const SIMULATION_TYPES = {
  cyclone: {
    name: 'Cyclone',
    icon: 'fa-cyclone',
    phases: ['Formation', 'Approach', 'Landfall', 'Impact', 'Recovery'],
    severityLevels: ['Moderate', 'Severe', 'Very Severe', 'Extreme'],
    regions: ['Arabian Sea Coast', 'Bay of Bengal', 'Mangaluru Coast', 'Udupi Coast'],
    resources: ['NDRF', 'Navy', 'Air Force', 'Police', 'SDRF', 'Ambulance', 'Fire'],
  },
  flood: {
    name: 'Flood',
    icon: 'fa-water',
    phases: ['Warning', 'Rising Water', 'Peak Flood', 'Receding', 'Relief'],
    severityLevels: ['Moderate', 'Severe', 'Extreme', 'Catastrophic'],
    regions: ['Netravati Valley', 'Gurupura River', 'Phalguni Basin', 'Coastal Lowlands'],
    resources: ['NDRF', 'SDRF', 'Army', 'Navy', 'Police', 'Ambulance'],
  },
  earthquake: {
    name: 'Earthquake',
    icon: 'fa-house-crack',
    phases: ['Tremors', 'Aftershocks', 'Search & Rescue', 'Medical Triage', 'Reconstruction'],
    severityLevels: ['Moderate', 'Strong', 'Major', 'Great'],
    regions: ['Western Ghats Zone', 'Seismic Zone IV', 'Kodagu Region', 'Mangaluru Urban'],
    resources: ['NDRF', 'Army', 'Medical Corps', 'Fire', 'Police', 'Ambulance'],
  },
  pandemic: {
    name: 'Pandemic',
    icon: 'fa-virus',
    phases: ['Surveillance', 'Containment', 'Community Spread', 'Healthcare Surge', 'Vaccination'],
    severityLevels: ['Watch', 'Warning', 'Emergency', 'Catastrophic'],
    regions: ['Mangaluru Urban', 'District Wide', 'State Level', 'Multi-State'],
    resources: ['Health Dept', 'Hospitals', 'ICMR', 'WHO Liason', 'Ambulance'],
  },
  fire: {
    name: 'Industrial Fire',
    icon: 'fa-fire',
    phases: ['Detection', 'Containment', 'Suppression', 'Cooling', 'Investigation'],
    severityLevels: ['Moderate', 'Severe', 'Major', 'Catastrophic'],
    regions: ['Baikampady Industrial', 'Mangaluru Port', 'Kudremukh', 'Urban Area'],
    resources: ['Fire Services', 'Hazmat', 'NDRF', 'Police', 'Ambulance', 'SDRF'],
  },
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.round(Math.random() * (max - min) + min);

// ── Simulation Engine ────────────────────────────────────
class SimulationEngine {
  constructor(type, severity, region, population) {
    this.config = SIMULATION_TYPES[type];
    this.severity = severity;
    this.region = region;
    this.population = population;
    this.phase = -1;
    this.startedAt = Date.now();
    this.metrics = {
      casualties: 0,
      displaced: 0,
      infrastructureDamage: 0,
      resourcesDeployed: 0,
      responseTime: 0,
      rescueEfficiency: 0,
      aiPredictions: [],
    };
    this.events = [];
    this.aiRecommendations = [];
    this.completed = false;
  }

  tick() {
    if (this.completed) return null;
    const elaspedMin = (Date.now() - this.startedAt) / 60000;
    const severityMult = ({ Moderate: 1, Severe: 1.5, 'Very Severe': 2.5, Extreme: 4, Strong: 2, Major: 3, Great: 5, Watch: 0.5, Warning: 1, Emergency: 2.5, Catastrophic: 4, 'Catastrophic': 4 })[this.severity] || 1;

    // Phase transitions
    if (this.phase < this.config.phases.length - 1 && elaspedMin > (this.phase + 1) * 1.2) {
      this.phase++;
      this.events.unshift({
        time: new Date().toISOString(),
        phase: this.config.phases[this.phase],
        message: `${this.config.name} entered ${this.config.phases[this.phase]} phase`,
        type: this.phase >= 2 ? 'critical' : 'info',
      });

      // AI recommendation on phase change
      const recs = {
        'Formation': `Initiate early warning systems in ${this.region}. Pre-position ${randomBetween(200, 500)} personnel.`,
        'Approach': `Activate emergency operations centre. Begin evacuations in low-lying areas of ${this.region}.`,
        'Landfall': `All response teams on standby. Deploy ${randomBetween(5, 15)} rescue units to ${this.region}.`,
        'Impact': `Full-scale rescue operations. Estimated ${Math.round(this.population * 0.3)} people need immediate assistance.`,
        'Recovery': 'Begin damage assessment. Deploy relief supplies and medical teams.',
        'Warning': `Issue flood warnings for ${this.region}. Sandbagging teams deployed.`,
        'Rising Water': `Evacuate ${Math.round(this.population * 0.4)} people from low-lying areas. Activate relief camps.`,
        'Search & Rescue': `Deploy all available NDRF teams. Coordinate with Army for heavy lifting.`,
        'Containment': `Isolate affected areas. Deploy medical screening teams.`,
        'Suppression': `Water bombers and ground crews coordinated. Evacuate ${randomBetween(500, 2000)} residents.`,
      };

      const rec = recs[this.config.phases[this.phase]];
      if (rec) {
        this.aiRecommendations.unshift({
          phase: this.config.phases[this.phase],
          recommendation: rec,
          confidence: randomBetween(75, 98),
          impact: `Expected to reduce casualties by ${randomBetween(15, 40)}%`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update metrics based on severity and time
    const timeFactor = Math.min(elaspedMin / 10, 1);
    this.metrics.casualties = Math.round(this.population * 0.02 * severityMult * timeFactor);
    this.metrics.displaced = Math.round(this.population * 0.3 * severityMult * timeFactor);
    this.metrics.infrastructureDamage = Math.min(100, Math.round(20 * severityMult * timeFactor));
    this.metrics.resourcesDeployed = Math.min(500, Math.round(50 * severityMult * timeFactor));
    this.metrics.responseTime = Math.round(15 - 8 * timeFactor);
    this.metrics.rescueEfficiency = Math.min(100, Math.round(40 + 30 * timeFactor));

    // AI predictions every 3 ticks
    if (this.phase >= 0 && this.metrics.aiPredictions.length < 5) {
      this.metrics.aiPredictions.push({
        time: new Date().toISOString(),
        predictedCasualties: Math.round(this.metrics.casualties * (1 + Math.random() * 0.5)),
        predictedDisplaced: Math.round(this.metrics.displaced * (1 + Math.random() * 0.3)),
        confidence: randomBetween(70, 95),
        recommendation: randomItem([
          `Deploy additional resources to ${this.region}`,
          `Activate emergency shelters for ${Math.round(this.population * 0.2)} people`,
          `Request military assistance for logistics support`,
          `Establish field hospitals in ${this.region}`,
          `Coordinate with neighbouring districts for resource sharing`,
        ]),
      });
    }

    // Check completion
    if (this.phase >= this.config.phases.length - 1 && elaspedMin > (this.config.phases.length) * 1.5) {
      this.completed = true;
      this.events.unshift({
        time: new Date().toISOString(),
        phase: 'Complete',
        message: `${this.config.name} simulation completed. Final casualties: ${this.metrics.casualties}. Resources deployed: ${this.metrics.resourcesDeployed}.`,
        type: 'success',
      });
    }

    return {
      phase: this.phase,
      phaseName: this.config.phases[this.phase] || 'Complete',
      metrics: this.metrics,
      events: this.events,
      aiRecommendations: this.aiRecommendations,
      completed: this.completed,
      progress: ((this.phase + 1) / this.config.phases.length) * 100,
    };
  }
}

// ── SimulationCenter Component ───────────────────────────
const SimulationCenter = () => {
  const [activeSim, setActiveSim] = useState(null);
  const [simState, setSimState] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [engine, setEngine] = useState(null);
  const [config, setConfig] = useState({
    type: 'cyclone',
    severity: 'Severe',
    region: 'Arabian Sea Coast',
    population: 10000,
    duration: '2h',
  });
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [selectedScenario, setSelectedScenario] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const scenarios = [
    { name: 'Cyclone Landfall — Mangaluru Coast', type: 'cyclone', severity: 'Very Severe', difficulty: 'Advanced', duration: '4h', population: 25000, region: 'Mangaluru Coast', status: 'Ready' },
    { name: 'Major Flood — Netravati Valley', type: 'flood', severity: 'Extreme', difficulty: 'Advanced', duration: '3h', population: 18000, region: 'Netravati Valley', status: 'Ready' },
    { name: 'Earthquake — Western Ghats Zone', type: 'earthquake', severity: 'Major', difficulty: 'Expert', duration: '2.5h', population: 35000, region: 'Western Ghats Zone', status: 'Draft' },
    { name: 'Industrial Fire — Baikampady', type: 'fire', severity: 'Severe', difficulty: 'Intermediate', duration: '1.5h', population: 5000, region: 'Baikampady Industrial', status: 'Ready' },
    { name: 'Building Collapse — City Centre', type: 'earthquake', severity: 'Strong', difficulty: 'Beginner', duration: '1h', population: 2000, region: 'Mangaluru Urban', status: 'Ready' },
    { name: 'Pandemic Outbreak — District Level', type: 'pandemic', severity: 'Emergency', difficulty: 'Expert', duration: '6h', population: 50000, region: 'District Wide', status: 'Draft' },
  ];

  // Run simulation ticker
  useEffect(() => {
    if (!engine) return;
    timerRef.current = setInterval(() => {
      const state = engine.tick();
      setSimState({ ...state });
      if (state.completed) {
        clearInterval(timerRef.current);
        setSimResult(state);
        apiFetch('/v2/government/simulation/stop/' + (activeSim?.sessionId || 'current'), { method: 'POST' }).catch(() => {});
        showToast('Simulation completed successfully!', 'success');
      }
    }, 1200);
    return () => clearInterval(timerRef.current);
  }, [engine, showToast]);

  const startSimulation = useCallback(async (type, severity, region, population) => {
    const newEngine = new SimulationEngine(type, severity, region, population);
    setEngine(newEngine);
    setActiveSim({ type, severity, region, population, startedAt: Date.now() });
    setSimState(null);
    setSimResult(null);
    try {
      await apiFetch('/v2/government/simulation/start', {
        method: 'POST',
        body: JSON.stringify({ type, severity, region, population }),
      });
    } catch (err) { /* simulation still runs locally */ }
    showToast(`${SIMULATION_TYPES[type].name} simulation started!`, 'info');
  }, [showToast]);

  const runScenario = useCallback((scenario) => {
    setShowConfirm({
      title: `Run ${scenario.name}?`,
      message: `This will simulate a ${scenario.severity} ${scenario.type} affecting ${scenario.population.toLocaleString()} people in ${scenario.region}. Duration: ${scenario.duration}.`,
      confirmLabel: 'Start Simulation',
      icon: 'fa-play',
    });
    setSelectedScenario(scenario);
  }, []);

  const confirmRunScenario = useCallback(() => {
    setShowConfirm(null);
    if (selectedScenario) {
      startSimulation(selectedScenario.type, selectedScenario.severity, selectedScenario.region, selectedScenario.population);
    }
  }, [selectedScenario, startSimulation]);

  const resetSimulation = useCallback(() => {
    clearInterval(timerRef.current);
    setEngine(null);
    setActiveSim(null);
    setSimState(null);
    setSimResult(null);
    showToast('Simulation reset', 'info');
  }, [showToast]);

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="National Simulation Centre"
        subtitle="AI-powered scenario simulation, digital twin replay, and readiness evaluation"
        icon="fa-atom"
        gradient="from-violet-700 to-purple-800"
        stats={[
          { label: 'Available Scenarios', value: '24' },
          { label: 'Simulations Run', value: '142' },
          { label: 'Avg Score', value: '78%' },
          { label: 'Active Simulation', value: activeSim ? 'Running' : 'None' },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Active Simulations" value={activeSim ? '1' : '0'} icon="fa-play" color="emerald" />
        <GovKPICard label="Draft Scenarios" value="4" icon="fa-pen" color="amber" />
        <GovKPICard label="Completed Today" value="8" icon="fa-circle-check" color="sky" trend={12} />
        <GovKPICard label="Avg Performance" value="78%" icon="fa-trophy" color="violet" />
      </div>

      {/* Scenario Builder + Simulation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scenario Builder */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-sliders" label="AI Scenario Builder" action={{ label: 'Create New', onClick: () => { setShowDetailModal('builder'); } }} />
          <div className="space-y-3">
            <div>
              <p className="text-[9px] font-medium text-slate-400 mb-1.5">Disaster Type</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(SIMULATION_TYPES).map(([key, val]) => (
                  <button key={key} onClick={() => {
                    setConfig(c => ({ ...c, type: key, region: randomItem(val.regions), severity: randomItem(val.severityLevels) }));
                  }}
                    className={`text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${config.type === key ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <i className={`fas ${val.icon} mr-1`} />{val.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-medium text-slate-400 mb-1.5">Severity</p>
              <div className="flex flex-wrap gap-1.5">
                {(SIMULATION_TYPES[config.type]?.severityLevels || []).map((s) => (
                  <button key={s} onClick={() => setConfig(c => ({ ...c, severity: s }))}
                    className={`text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${config.severity === s ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-medium text-slate-400 mb-1.5">Duration</p>
              <div className="flex gap-1.5">
                {['30m', '1h', '2h', '4h', '8h'].map((d) => (
                  <button key={d} onClick={() => setConfig(c => ({ ...c, duration: d }))}
                    className={`text-[9px] font-semibold px-3 py-1.5 rounded-lg transition-all ${config.duration === d ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => startSimulation(config.type, config.severity, config.region, config.population)}
                className="flex-1 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5">
                <i className="fas fa-play" /> Run Simulation
              </button>
              <button onClick={() => showToast('Scenario saved as draft', 'success')}
                className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">Save</button>
              {activeSim && (
                <button onClick={resetSimulation}
                  className="px-4 py-2 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                  <i className="fas fa-stop" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Simulation Results */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-chart-line" label="AI Simulation Engine" />
          {activeSim ? (
            <div className="space-y-3">
              {/* Phase Progress */}
              {simState && (
                <PhaseProgress phases={SIMULATION_TYPES[activeSim.type]?.phases || []} currentPhase={simState.phase} />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-slate-600">
                    {SIMULATION_TYPES[activeSim.type]?.name} — {activeSim.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400">
                    <LiveTimer startTime={activeSim.startedAt} />
                  </span>
                  {simState && (
                    <span className="text-[9px] font-bold text-indigo-600">
                      {Math.round(simState.progress)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Live Metrics */}
              {simState && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Casualties', value: simState.metrics.casualties.toLocaleString(), color: 'text-red-600' },
                    { label: 'Displaced', value: simState.metrics.displaced.toLocaleString(), color: 'text-amber-600' },
                    { label: 'Deployed', value: simState.metrics.resourcesDeployed, color: 'text-blue-600' },
                  ].map((m, i) => (
                    <div key={i} className="p-2 rounded-lg bg-slate-50 text-center">
                      <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-[8px] text-slate-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Recommendations Feed */}
              {simState?.aiRecommendations && simState.aiRecommendations.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {simState.aiRecommendations.map((rec, i) => (
                    <div key={i} className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                      <p className="text-[9px] font-semibold text-indigo-700">{rec.phase}</p>
                      <p className="text-[9px] text-slate-600">{rec.recommendation}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px] font-medium text-indigo-500">{rec.confidence}% confidence</span>
                        <span className="text-[8px] text-emerald-600">{rec.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Event Log */}
              {simState?.events && simState.events.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1 border-t border-slate-100 pt-2">
                  {simState.events.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-[8px]">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${e.type === 'critical' ? 'bg-red-500' : e.type === 'success' ? 'bg-emerald-500' : 'bg-sky-400'}`} />
                      <span className="text-slate-500">{e.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Final Results */}
              {simResult && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-800">Simulation Complete</p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <span className="text-[9px] text-slate-600">Casualties: {simResult.metrics.casualties.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-600">Rescue Eff: {simResult.metrics.rescueEfficiency}%</span>
                    <span className="text-[9px] text-slate-600">Response: {simResult.metrics.responseTime}m</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 rounded-lg bg-slate-50 border border-dashed border-slate-200">
              <div className="text-center">
                <i className="fas fa-play-circle text-3xl text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">Configure and run a simulation</p>
                <p className="text-[9px] text-slate-300 mt-1">AI engine generates realistic disaster scenarios</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Library */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <GovSectionHeader icon="fa-book" label="AI Scenario Library" action={{ label: 'View All', onClick: () => showToast('Loading all scenarios...', 'info') }} />
          <div className="flex gap-1">
            {['All', 'Ready', 'Draft'].map((f) => (
              <button key={f} className={`text-[9px] font-semibold px-2 py-1 rounded ${f === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {scenarios.map((s, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.status === 'Ready' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  <i className={`fas ${SIMULATION_TYPES[s.type]?.icon || 'fa-atom'} text-sm ${s.status === 'Ready' ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-400">
                    <span>{s.type}</span><span>·</span><span>{s.severity}</span><span>·</span><span>{s.duration}</span><span>·</span><span>{s.difficulty}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <GovStatusBadge text={s.status} color={s.status === 'Ready' ? 'emerald' : 'amber'} />
                <button onClick={() => runScenario(s)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1">
                  <i className="fas fa-play text-[8px]" /> Run
                </button>
                <button onClick={() => { setShowDetailModal(s); }}
                  className="text-[9px] text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded hover:bg-slate-100">
                  <i className="fas fa-chart-simple" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Performance Charts */}
      {simResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <GovSectionHeader icon="fa-chart-bar" label="AI Prediction Accuracy" />
            <AnimatedBarChart
              data={[
                { label: 'Casualties', value: 82 },
                { label: 'Displaced', value: 76 },
                { label: 'Resources', value: 91 },
                { label: 'Response', value: 68 },
                { label: 'Recovery', value: 73 },
              ]}
              height={120}
              barColor="from-violet-500 to-purple-600"
            />
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <GovSectionHeader icon="fa-chart-line" label="Resource Deployment Trend" />
            <AnimatedLineChart
              data={[
                { label: 'T1', value: 20 },
                { label: 'T2', value: 45 },
                { label: 'T3', value: 72 },
                { label: 'T4', value: 88 },
                { label: 'T5', value: 95 },
              ]}
              height={120}
              color="#7c3aed"
            />
          </div>
          <div className="lg:col-span-2">
            <AIExplainPanel
              title="Post-Simulation AI Assessment"
              confidence={87}
              reasoning={[
                `Resource deployment efficiency reached ${simResult.metrics.rescueEfficiency}% across ${activeSim?.type || 'disaster'} scenario.`,
                `AI predicted casualty count within ${randomBetween(5, 15)}% accuracy based on historical patterns from ${activeSim?.region || 'similar'} region.`,
                `Response time of ${simResult.metrics.responseTime} minutes is ${simResult.metrics.responseTime < 10 ? 'within' : 'above'} optimal threshold.`,
                `${activeSim?.severity || 'Severe'} severity simulations show ${simResult.metrics.rescueEfficiency > 70 ? 'strong' : 'moderate'} rescue coordination effectiveness.`,
              ]}
              evidence="Based on analysis of 142 previous simulations and 24 real-world disaster events in Karnataka region."
              impact="Implementing the AI recommendations could reduce casualty rates by 25-40% and improve response coordination efficiency by 35%."
              recommendations={[
                `Pre-position ${randomBetween(200, 500)} NDRF personnel in ${activeSim?.region || 'high-risk'} zones`,
                `Activate early warning systems ${randomBetween(12, 48)} hours before predicted event`,
                `Establish ${randomBetween(5, 15)} emergency relief centres in ${activeSim?.region || 'affected'} area`,
                `Coordinate inter-agency drills between ${randomItem(['NDRF, Police, Fire', 'SDRF, Army, Ambulance', 'Navy, Air Force, Medical Corps'])}`,
              ]}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <DetailModal open={showDetailModal === 'builder'} onClose={() => setShowDetailModal(null)} title="AI Scenario Builder" subtitle="Configure custom simulation parameters">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">Configure detailed simulation parameters including weather conditions, infrastructure status, population demographics, and resource availability. The AI engine will generate realistic disaster progression and recommend optimal response strategies.</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Wind Speed', value: '120 km/h' }, { label: 'Rainfall', value: '250 mm' }, { label: 'Temperature', value: '28°C' }, { label: 'Humidity', value: '85%' }].map((w, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50">
                <p className="text-[9px] text-slate-400">{w.label}</p>
                <p className="text-sm font-bold text-slate-700">{w.value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setShowDetailModal(null); showToast('Custom scenario created!', 'success'); }}
            className="w-full px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create Custom Scenario</button>
        </div>
      </DetailModal>
      <DetailModal open={typeof showDetailModal === 'object' && showDetailModal !== null && !Array.isArray(showDetailModal) && showDetailModal?.name}
        onClose={() => setShowDetailModal(null)} title={showDetailModal?.name || 'Scenario Details'} subtitle={`${showDetailModal?.type} · ${showDetailModal?.severity}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Duration</p>
              <p className="text-xs font-bold text-slate-700">{showDetailModal?.duration || '-'}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Difficulty</p>
              <p className="text-xs font-bold text-slate-700">{showDetailModal?.difficulty || '-'}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Population</p>
              <p className="text-xs font-bold text-slate-700">{(showDetailModal?.population || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[9px] font-semibold text-slate-400 uppercase">AI Readiness Assessment</p>
            <div className="mt-2 space-y-2">
              {[{ label: 'Resource Preparedness', val: 82 }, { label: 'Response Capability', val: 74 }, { label: 'Infrastructure Resilience', val: 68 }].map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[9px]"><span className="text-slate-500">{a.label}</span><span className="font-bold text-slate-700">{a.val}%</span></div>
                  <div className="h-1 rounded-full bg-slate-200 mt-0.5"><div className="h-full rounded-full bg-indigo-500" style={{ width: a.val + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => { runScenario(showDetailModal); setShowDetailModal(null); }}
            className="w-full px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <i className="fas fa-play mr-1" />Run This Scenario
          </button>
        </div>
      </DetailModal>

      <ConfirmDialog
        open={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={confirmRunScenario}
        title={showConfirm?.title || ''}
        message={showConfirm?.message || ''}
        confirmLabel={showConfirm?.confirmLabel || 'Confirm'}
        icon={showConfirm?.icon || 'fa-play'}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default SimulationCenter;
