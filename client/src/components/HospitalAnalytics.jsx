import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { LoadingSpinner, ExplainabilityPanel } from './Common';
import ExecutiveDecisionCenter from './ui/ExecutiveDecisionCenter';
import AiBrainHeader from './ui/AiBrainHeader';
import AiReasoningEngine from './ui/AiReasoningEngine';
import AiAgentsPanel from './ui/AiAgentsPanel';
import AiSimulationLab from './ui/AiSimulationLab';
import AiKnowledgeGraph from './ui/AiKnowledgeGraph';
import AiAnomalyPanel from './ui/AiAnomalyPanel';

const AnimatedBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-violet-200/15 to-indigo-300/15 blur-3xl animate-pulse-slow" />
    <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-200/15 to-cyan-200/15 blur-3xl animate-pulse-slower" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.01]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="ai-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#ai-grid)"/>
    </svg>
  </div>
);

const AiModelsPanel = () => {
  const models = useMemo(() => [
    { name: 'Bed Forecast Model', accuracy: 94, latency: '42ms', version: 'v2.1', trained: '2026-06-15', confidence: 0.94 },
    { name: 'Patient Risk Model', accuracy: 91, latency: '68ms', version: 'v3.0', trained: '2026-07-01', confidence: 0.91 },
    { name: 'Emergency Forecast', accuracy: 89, latency: '35ms', version: 'v1.8', trained: '2026-06-20', confidence: 0.88 },
    { name: 'Staff Optimization', accuracy: 87, latency: '52ms', version: 'v2.3', trained: '2026-06-10', confidence: 0.86 },
    { name: 'Finance Predictor', accuracy: 93, latency: '44ms', version: 'v3.1', trained: '2026-07-05', confidence: 0.92 },
    { name: 'Blood Demand Model', accuracy: 90, latency: '38ms', version: 'v2.0', trained: '2026-06-25', confidence: 0.90 },
    { name: 'LLM Reasoning', accuracy: 88, latency: '124ms', version: 'v4.2', trained: '2026-07-10', confidence: 0.87 },
    { name: 'Disease Prediction', accuracy: 86, latency: '56ms', version: 'v1.5', trained: '2026-06-05', confidence: 0.85 },
  ], []);
  const [expanded, setExpanded] = useState('');
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-microchip text-violet-500"></i>Multi-Model AI</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {models.map((m) => (
          <div key={m.name}>
            <div onClick={() => setExpanded(expanded === m.name ? '' : m.name)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/50 hover:bg-white/80 cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-slate-700">{m.name}</span>
                  <span className="text-[9px] font-semibold text-indigo-600">{Math.round(m.confidence * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-slate-400">
                  <span>Accuracy: {m.accuracy}%</span><span>{m.latency}</span><span>{m.version}</span>
                </div>
              </div>
              <i className={`fas fa-chevron-down text-[8px] text-slate-400 transition-transform ${expanded === m.name ? 'rotate-180' : ''}`}></i>
            </div>
            {expanded === m.name && (
              <div className="ml-4 mr-2 px-2.5 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1 animate-fade-in">
                <div className="flex items-center gap-2 text-[9px] text-slate-600">
                  <span><strong>Trained:</strong> {m.trained}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600 font-semibold">Active</span>
                  <span className="text-slate-300">|</span>
                  <span>1,847 predictions today</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const PredictiveHospitalModel = () => {
  const predictions = useMemo(() => [
    { label: 'Admissions', current: 42, forecast: 58, time: 'Next 6h', risk: 'elevated' },
    { label: 'Discharges', current: 28, forecast: 36, time: 'Next 6h', risk: 'normal' },
    { label: 'ICU Occupancy', current: 82, forecast: 91, time: 'By 6 PM', risk: 'high', unit: '%' },
    { label: 'Bed Utilization', current: 78, forecast: 86, time: 'By 8 PM', risk: 'elevated', unit: '%' },
    { label: 'Emergency Arrivals', current: 18, forecast: 24, time: 'Next 4h', risk: 'elevated' },
    { label: 'Revenue Today', current: 284500, forecast: 312000, time: 'EOD', risk: 'normal', fmt: 'currency' },
  ], []);
  const rc = { high: 'text-red-600 bg-red-50', elevated: 'text-amber-600 bg-amber-50', normal: 'text-emerald-600 bg-emerald-50' };
  const colors = { high: 'from-red-400 to-rose-500', elevated: 'from-amber-400 to-orange-500', normal: 'from-emerald-400 to-teal-500' };
  const fmt = (v, f) => f === 'currency' ? '$' + (v / 1000).toFixed(0) + 'K' : v;
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-chart-line text-sky-500"></i>Predictive Hospital Model</h3>
          <span className="text-[10px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1"></i>Continuous</span>
        </div>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {predictions.map((p, idx) => {
          const pct = p.forecast > 0 ? Math.min(100, Math.round((p.current / p.forecast) * 100)) : 50;
          return (
            <div key={idx} className="relative px-3 py-2.5 rounded-xl bg-white/50 border border-slate-100 overflow-hidden group hover:bg-white/80 transition-all duration-200">
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colors[p.risk]} opacity-60`} />
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-600">{p.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${rc[p.risk]}`}>{p.risk}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-base font-extrabold text-slate-800">{fmt(p.current, p.fmt)}</span>
                <span className="text-[10px] text-slate-400">&rarr;</span>
                <span className="text-sm font-bold text-indigo-600">{fmt(p.forecast, p.fmt)}{p.unit || ''}</span>
                <span className="text-[9px] text-slate-400 ml-auto">{p.time}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${colors[p.risk]} transition-all duration-500`} style={{ width: pct + '%' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AiExecutiveSummary = () => {
  const summaries = useMemo(() => [
    { text: 'Hospital utilization is healthy. Emergency admissions up 14%. ICU projected to exceed 90% by 5 PM. Recommend reallocating two nurses and delaying elective admissions.', confidence: 97, color: 'from-emerald-500/10 to-teal-500/10' },
    { text: 'Radiology turnaround increased because MRI utilization exceeded historical averages by 22%. Three patients predicted to become critical. Financial efficiency remains above target at 94%.', confidence: 94, color: 'from-sky-500/10 to-blue-500/10' },
    { text: 'Potential blood shortage for O Negative within 12 hours. Staff fatigue in Radiology. Revenue forecast upgraded to $320K based on current run rate.', confidence: 92, color: 'from-amber-500/10 to-orange-500/10' },
  ], []);
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx((p) => (p + 1) % summaries.length), 8000); return () => clearInterval(t); }, []);
  const s = summaries[idx];
  return (
    <div className={'relative overflow-hidden rounded-2xl bg-gradient-to-r ' + s.color + ' backdrop-blur-sm border border-white/40 animate-fade-in-up'}>
      <div className="relative z-10 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-lg"><i className="fas fa-brain text-sm"></i></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-xs font-bold text-slate-800 font-display">Hospital Intelligence Report</h3>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/80 px-1.5 py-0.5 rounded-full"><i className="fas fa-sync-alt text-[7px] mr-0.5"></i>Auto-refreshing</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed font-medium">{s.text}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[9px] text-slate-500 font-medium">Confidence</span><span className="text-[10px] font-bold text-emerald-600">{s.confidence}%</span></div>
              <span className="text-slate-300">|</span>
              <span className="text-[9px] text-slate-500"><i className="fas fa-clock text-[7px] mr-0.5"></i>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinancialAiPanel = () => {
  const items = useMemo(() => [
    { label: 'Revenue Forecast', value: '$312K', change: '+8.2%', trend: 'up', confidence: 93 },
    { label: 'Insurance Claims', value: '84', change: '-12', trend: 'down', confidence: 91 },
    { label: 'Operational Cost', value: '$180K', change: '+2.1%', trend: 'up', confidence: 88 },
    { label: 'Profitability', value: '24.3%', change: '+1.8%', trend: 'up', confidence: 90 },
    { label: 'Resource Waste', value: '4.2%', change: '-0.8%', trend: 'down', confidence: 86 },
    { label: 'Optimization Opp.', value: '6', change: '+2', trend: 'up', confidence: 89 },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-coins text-emerald-500"></i>Financial AI</h3>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/50 border border-slate-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-semibold text-slate-600">{item.label}</span>
                <span className={'text-[9px] font-bold ' + (item.trend === 'up' ? 'text-emerald-600' : 'text-red-500')}>
                  <i className={'fas fa-arrow-' + item.trend + ' text-[8px] mr-0.5'}></i>{item.change}
                </span>
              </div>
              <p className="text-sm font-extrabold text-slate-800">{item.value}</p>
              <span className="px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-bold">{item.confidence}% confidence</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PatientRiskIntelligence = () => {
  const patients = useMemo(() => [
    { name: 'Patient #8842', risk: 'high', condition: 'Post-surgery sepsis', dept: 'ICU', score: 94, action: 'Emergency antibiotics + vasopressors' },
    { name: 'Patient #8901', risk: 'high', condition: 'Cardiac arrhythmia', dept: 'ICU', score: 91, action: 'Cardiology consult + antiarrhythmics' },
    { name: 'Patient #8765', risk: 'medium', condition: 'Bilateral pneumonia', dept: 'General Ward', score: 76, action: 'IV antibiotics + oxygen therapy' },
    { name: 'Patient #8912', risk: 'medium', condition: 'Diabetic ketoacidosis', dept: 'Emergency', score: 72, action: 'Insulin drip + fluids' },
    { name: 'Patient #8798', risk: 'low', condition: 'Fractured femur', dept: 'OT Recovery', score: 35, action: 'Standard post-op monitoring' },
  ], []);
  const rc = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' };
  const dots = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-heart-pulse text-rose-500"></i>Patient Risk Intelligence</h3>
          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">2 critical</span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {patients.map((p, idx) => (
          <div key={idx} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200 border border-transparent hover:border-slate-100">
            <span className={'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ' + dots[p.risk]}></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-slate-700">{p.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={'px-1 py-0.5 rounded text-[8px] font-bold uppercase ' + rc[p.risk]}>{p.risk}</span>
                  <span className="text-[9px] font-semibold text-indigo-600">{p.score}</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500">{p.condition} &bull; {p.dept}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <i className="fas fa-robot text-indigo-400 text-[7px]"></i>
                <p className="text-[8px] text-indigo-600 font-medium">{p.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClinicalAiPanel = () => {
  const alerts = useMemo(() => [
    { type: 'Potential Misdiagnosis', detail: 'Patient #8842 — symptoms consistent with sepsis, not post-op infection', confidence: 88, severity: 'high' },
    { type: 'Drug Interaction', detail: 'Patient #8765 — Amoxicillin + Warfarin interaction risk', confidence: 94, severity: 'critical' },
    { type: 'Sepsis Warning', detail: 'Patient #8831 — qSOFA score: 2, meets sepsis criteria', confidence: 91, severity: 'high' },
    { type: 'Readmission Risk', detail: 'Patient #8702 — 30-day readmission probability: 34%', confidence: 86, severity: 'medium' },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-sky-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-stethoscope text-cyan-500"></i>Clinical AI</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {alerts.map((a, idx) => (
          <div key={idx} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-white/50 border border-slate-100">
            <div className={'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ' + (a.severity === 'critical' ? 'bg-red-500' : a.severity === 'high' ? 'bg-amber-500' : 'bg-sky-500')}></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-slate-700">{a.type}</span>
                <span className="px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-bold">{a.confidence}%</span>
              </div>
              <p className="text-[9px] text-slate-600">{a.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OperationalAiPanel = () => {
  const items = useMemo(() => [
    { label: 'Equipment Failures', value: '1 predicted', detail: 'MRI-2 vibration anomaly detected', severity: 'warning', confidence: 87 },
    { label: 'Maintenance Due', value: '3 items', detail: 'X-Ray, CT-3, Ventilator-8', severity: 'info', confidence: 92 },
    { label: 'Resource Shortage', value: 'O Negative Blood', detail: 'Only 4 units remaining - critical in 12h', severity: 'critical', confidence: 94 },
    { label: 'Lab Delays', value: '18 min avg', detail: 'Hematology backlog of 12 samples', severity: 'warning', confidence: 85 },
  ], []);
  const sc = { critical: 'text-red-600 bg-red-50', warning: 'text-amber-600 bg-amber-50', info: 'text-blue-600 bg-blue-50' };
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-gears text-orange-500"></i>Operational AI</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/50 border border-slate-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
                <span className={'px-1 py-0.5 rounded text-[8px] font-bold ' + (sc[item.severity] || sc.info)}>{item.severity}</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-800">{item.value}</p>
              <div className="flex items-center gap-2 text-[8px] text-slate-500">
                <span>{item.detail}</span>
                <span className="text-indigo-500 font-semibold">{item.confidence}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContinuousLearningPanel = () => {
  const items = useMemo(() => [
    { label: 'Model Retraining', status: 'Completed', detail: 'Bed Forecast v2.2 trained', time: '2 hours ago', icon: 'fa-rotate', color: 'text-emerald-500' },
    { label: 'New Dataset', status: 'Loaded', detail: '24h emergency department data', time: '15 min ago', icon: 'fa-database', color: 'text-blue-500' },
    { label: 'Accuracy Boost', status: '+1.2%', detail: 'Patient Risk Model accuracy', time: 'Today', icon: 'fa-arrow-up', color: 'text-emerald-500' },
    { label: 'Feedback Integrated', status: '42 items', detail: 'User corrections processed', time: '1 hour ago', icon: 'fa-comments', color: 'text-purple-500' },
    { label: 'Knowledge Synced', status: 'Active', detail: 'WHO guidelines v2026.3', time: 'Live', icon: 'fa-book', color: 'text-amber-500' },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-graduation-cap text-teal-500"></i>Continuous Learning</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200">
            <div className={'w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center ' + item.color}>
              <i className={'fas ' + item.icon + ' text-[10px]'}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
                <span className="text-[9px] font-semibold text-indigo-600">{item.status}</span>
              </div>
              <div className="flex items-center gap-2 text-[8px] text-slate-500"><span>{item.detail}</span><span>{item.time}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AiExplanationPanel = () => {
  const [activeTab, setActiveTab] = useState('priority');
  const data = {
    priority: { why: 'ICU occupancy projected to exceed 90% by 6 PM', evidence: 'Current occupancy 82% with 5% hourly growth', history: 'Similar pattern on 2026-07-12 reached 94% peak', supporting: 'Emergency, General Ward', confidence: 94, risk: 'High', financial: '$12K potential loss', patient: '6 patients at risk', alternatives: 'Transfer 2 stable patients or activate overflow unit' },
    cost: { why: 'Revenue leakage of $38K in equipment rental billing', evidence: '12 billing discrepancies across 4 departments', history: 'Average $28K leakage over past 3 months', supporting: 'Finance, Procurement', confidence: 91, risk: 'Medium', financial: '$38K recoverable', patient: 'None', alternatives: 'Cross-check claims or audit equipment usage logs' },
    risk: { why: 'Emergency queue to exceed capacity in 47 min', evidence: '12 cases/2hr arrival rate exceeds 8 cases/2hr capacity', history: 'Capacity exceeded 14 times this month', supporting: 'Emergency, Triage', confidence: 96, risk: 'Critical', financial: '$8K loss', patient: '18 affected', alternatives: 'Activate overflow team or divert non-critical cases' },
  };
  const d = data[activeTab] || data.priority;
  const tabs = ['priority', 'cost', 'risk'];
  const tabLabels = { priority: 'Top Priority', cost: 'Cost Impact', risk: 'Risk Assessment' };
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-search-plus text-amber-500"></i>AI Explanations</h3>
          <span className="text-[10px] text-slate-400">Traceable AI</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex gap-1 mb-3">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={'px-2 py-1 rounded-lg text-[9px] font-semibold transition-all duration-200 ' + (activeTab === t ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-600')}>{tabLabels[t]}</button>
          ))}
        </div>
        <div className="space-y-2 text-[9px]">
          <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
            <i className="fas fa-question-circle text-indigo-400 text-[10px] mt-0.5"></i>
            <div><p className="text-[9px] text-indigo-700 font-bold uppercase">Why?</p><p className="text-[10px] text-slate-700 font-medium">{d.why}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-slate-600">
            <div className="flex items-center gap-1"><i className="fas fa-check-circle text-emerald-400"></i><span><strong>Evidence:</strong> {d.evidence}</span></div>
            <div className="flex items-center gap-1"><i className="fas fa-clock-rotate-left text-sky-400"></i><span><strong>History:</strong> {d.history}</span></div>
            <div className="flex items-center gap-1"><i className="fas fa-building text-purple-400"></i><span><strong>Supporting:</strong> {d.supporting}</span></div>
            <div className="flex items-center gap-1"><i className="fas fa-robot text-indigo-400"></i><span><strong>Confidence:</strong> {d.confidence}%</span></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={'px-1.5 py-0.5 rounded font-bold ' + (d.risk === 'Critical' ? 'bg-red-100 text-red-700' : d.risk === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>Risk: {d.risk}</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Financial: {d.financial}</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Patients: {d.patient}</span>
          </div>
          <div className="px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[8px] text-amber-700 font-bold uppercase">Alternatives</p>
            <p className="text-[10px] text-amber-800 font-medium">{d.alternatives}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AiTimeline = () => {
  const events = useMemo(() => [
    { time: '2 min ago', event: 'AI recommended activating overflow team in Emergency', icon: 'fa-robot', color: 'text-indigo-500' },
    { time: '8 min ago', event: 'Patient Risk Model flagged 3 patients for deterioration', icon: 'fa-heart-pulse', color: 'text-red-500' },
    { time: '15 min ago', event: 'Bed Forecast updated: 89% occupancy predicted by 6 PM', icon: 'fa-bed', color: 'text-purple-500' },
    { time: '22 min ago', event: 'Finance AI detected $38K revenue leakage in equipment billing', icon: 'fa-coins', color: 'text-emerald-500' },
    { time: '35 min ago', event: 'Clinical AI flagged drug interaction for Patient #8765', icon: 'fa-tablets', color: 'text-amber-500' },
    { time: '45 min ago', event: 'Anomaly detection found 12 unexpected emergency admissions', icon: 'fa-shield', color: 'text-red-500' },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-clock-rotate-left text-slate-500"></i>AI Decision Timeline</h3>
      </div>
      <div className="p-3 max-h-[300px] overflow-y-auto space-y-1">
        {events.map((evt, idx) => (
          <div key={idx} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-all">
            <div className={'w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center ' + evt.color + ' flex-shrink-0 mt-0.5'}>
              <i className={'fas ' + evt.icon + ' text-[8px]'}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-slate-400">{evt.time}</span>
                <p className="text-[10px] text-slate-700 leading-tight">{evt.event}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HospitalAnalytics = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const cacheKey = hospitalId ? 'hospital_ai_' + hospitalId : 'hospital_ai';

  useEffect(() => {
    if (!hospitalId) { setInsights(null); setLoading(false); return; }
    let cached = false;
    try { const c = localStorage.getItem(cacheKey); if (c) { setInsights(JSON.parse(c)); setLoading(false); cached = true; } } catch (_) {}
    if (!cached) setLoading(true);
    apiFetch('/api/hospital-ops/ceo/ai-insights?hospitalId=' + hospitalId, { method: 'GET' }).then((res) => {
      if (res.ok) { setInsights(res.data); localStorage.setItem(cacheKey, JSON.stringify(res.data || {})); }
    }).finally(() => setLoading(false));
  }, [hospitalId]);

  if (loading && !insights) return <LoadingSpinner />;

  return (
    <div className="relative pb-10">
      <AnimatedBg />
      <div className="relative z-10 space-y-4 sm:space-y-5">
        <AiBrainHeader />
        <AiExecutiveSummary />
        <AiReasoningEngine />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PredictiveHospitalModel />
          <AiAnomalyPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AiAgentsPanel />
          <AiSimulationLab />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AiKnowledgeGraph />
          <AiModelsPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PatientRiskIntelligence />
          <ClinicalAiPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FinancialAiPanel />
          <OperationalAiPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AiExplanationPanel />
          <ContinuousLearningPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExecutiveDecisionCenter />
          <AiTimeline />
        </div>

        {insights && (
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20">
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                <i className="fas fa-database text-slate-500"></i>AI Insights Data <span className="text-[9px] font-normal text-slate-400">(from backend)</span>
              </h3>
            </div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/50 rounded-xl px-3 py-2.5 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Predicted Inflow</p>
                <p className="text-lg font-bold text-slate-800">{insights.predicted_inflow || 0}</p>
                <p className="text-[9px] text-slate-500">Next 24 hours</p>
              </div>
              <div className="bg-white/50 rounded-xl px-3 py-2.5 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Spike Risk</p>
                <p className="text-lg font-bold text-slate-800">{insights.emergency_spike_risk || 'Low'}</p>
                <p className="text-[9px] text-slate-500">AI confidence: 92%</p>
              </div>
              <div className="bg-white/50 rounded-xl px-3 py-2.5 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Cost Pressure</p>
                <p className="text-lg font-bold text-slate-800">{insights.cost_pressure_index ?? 0}</p>
                <p className="text-[9px] text-slate-500">Margin at risk: ${insights.margin_at_risk ?? 0}</p>
              </div>
            </div>
            {insights?.overloaded_departments?.length > 0 && (
              <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                <span className="text-[9px] text-slate-400 font-medium">Overloaded:</span>
                {insights.overloaded_departments.map((d) => (
                  <span key={d} className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">{d}</span>
                ))}
              </div>
            )}
            <div className="px-3 pb-3"><ExplainabilityPanel meta={insights?.meta} /></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalAnalytics;
