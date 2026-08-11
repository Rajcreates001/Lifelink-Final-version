import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { LoadingSpinner, StatusPill } from './Common';
import { useEmergencyFeed } from '../hooks/useWebSocket';

import ExecutiveKpiCard from './ui/ExecutiveKpiCard';
import ExecutivePriorityCenter from './ui/ExecutivePriorityCenter';
import ExecutiveFinancialIntel from './ui/ExecutiveFinancialIntel';
import DigitalTwinMap from './ui/DigitalTwinMap';
import ExecutiveDecisionCenter from './ui/ExecutiveDecisionCenter';

// ─── Animated Background ────────────────────────────────────
const AnimatedExecutiveBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-200/20 to-purple-300/20 blur-3xl animate-pulse-slow" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-200/20 to-teal-200/20 blur-3xl animate-pulse-slower" />
    <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-gradient-to-r from-amber-200/10 to-rose-200/10 blur-3xl animate-float" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="bg-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern></defs>
      <rect width="100%" height="100%" fill="url(#bg-grid)" />
    </svg>
  </div>
);

const AnimatedCounter = ({ value, suffix = '', prefix = '', decimals = 0, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const startTime = Date.now();
    let raf;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased * 10 ** decimals) / 10 ** decimals);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, decimals]);
  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
};

const ExecutiveAISummary = () => {
  const summaries = useMemo(() => [
    { text: 'Hospital operating normally. Emergency admissions increased by 18% during the last six hours. ICU occupancy expected to reach 91% before 6 PM. Recommend reallocating two nurses from General Ward to Emergency.', confidence: 97, color: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-200/30' },
    { text: 'Radiology turnaround time has increased by 28%. Blood inventory for O Negative may become critical within 12 hours. Financial forecast remains positive with 94% confidence.', confidence: 94, color: 'from-sky-500/10 to-blue-500/10', border: 'border-sky-200/30' },
    { text: 'AI detected possible staff shortage tonight \u2014 3 call-offs expected in Ward B. Surgery schedule on track with 14 operations today. Recommend reviewing evening shift coverage.', confidence: 91, color: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-200/30' },
  ], []);
  const [currentIdx, setCurrentIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrentIdx((p) => (p + 1) % summaries.length), 8000);
    return () => clearInterval(t);
  }, [summaries.length]);
  const s = summaries[currentIdx];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${s.color} border ${s.border} backdrop-blur-sm animate-fade-in-up`}>
      <div className="relative z-10 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg"><i className="fas fa-brain text-sm"></i></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-xs font-bold text-slate-800 font-display">LifeLink Executive Brief</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/80 px-1.5 py-0.5 rounded-full"><i className="fas fa-sync-alt text-[7px] mr-0.5"></i>Auto-refreshing</span>
                <span className="text-[9px] text-slate-400 font-medium">{currentIdx + 1}/{summaries.length}</span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed font-medium">{s.text}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[9px] text-slate-500 font-medium">Operational Confidence</span><span className="text-[10px] font-bold text-emerald-600">{s.confidence}%</span></div>
              <span className="text-slate-300">|</span>
              <span className="text-[9px] text-slate-500"><i className="fas fa-clock text-[7px] mr-0.5"></i>Updated {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-slate-200/50"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progress" style={{ animationDuration: '8s' }} /></div>
    </div>
  );
};

const ExecutiveHero = ({ metrics, hospitalName, status }) => {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const healthScore = metrics?.ai?.healthScore ?? 94;
  const occupancy = metrics?.beds?.total ? Math.round((metrics.beds.occupied / metrics.beds.total) * 100) : 81;
  const totalPatients = metrics?.patients?.total ?? 1246;
  const activeEmergencies = metrics?.emergency?.active ?? 12;
  const criticalCases = metrics?.emergency?.critical ?? 4;
  const activeSurgeries = metrics?.ot?.active ?? 7;
  const aiConfidence = metrics?.ai?.confidence ?? 98;
  const revenue = metrics?.revenue?.daily ?? 284500;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-2xl animate-fade-in-up">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-indigo-900/20 to-transparent" />
      <div className="relative z-10 px-4 py-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>{status || 'Operational'}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold"><i className="fas fa-robot text-[8px]"></i>LifeLink AI Active</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold"><i className="fas fa-wifi text-[8px]"></i>Network Connected</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">{greeting}, Executive</h2>
            <p className="text-xs text-indigo-300/80 font-medium">{hospitalName || 'Medical Center'} \u2022 AI Hospital Intelligence Platform</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
            <div className="text-right"><p className="text-[9px] text-indigo-300/70 uppercase tracking-wider">AI Confidence</p><p className="text-sm font-bold text-emerald-400">{aiConfidence}%</p></div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><i className="fas fa-brain text-white text-sm"></i></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Health Score</p><p className="text-base font-bold text-emerald-400"><AnimatedCounter value={healthScore} suffix="%" /></p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Occupancy</p><p className="text-base font-bold text-amber-400"><AnimatedCounter value={occupancy} suffix="%" /></p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Patients</p><p className="text-base font-bold text-white"><AnimatedCounter value={totalPatients} /></p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Emergency</p><p className="text-base font-bold text-rose-400"><AnimatedCounter value={activeEmergencies} /> <span className="text-[10px] text-rose-300">cases</span></p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Critical</p><p className="text-base font-bold text-red-400"><AnimatedCounter value={criticalCases} /></p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Surgeries</p><p className="text-base font-bold text-sky-400"><AnimatedCounter value={activeSurgeries} /> <span className="text-[10px] text-sky-300">active</span></p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Revenue</p><p className="text-sm font-bold text-teal-400">\u20b9{(revenue / 1000).toFixed(0)}K</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[9px] text-indigo-300/60 uppercase tracking-wider">Shift</p><p className="text-sm font-bold text-white capitalize">{h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'}</p></div>
        </div>
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <i className="fas fa-wand-magic-sparkles text-indigo-400 text-xs"></i>
          <p className="text-[10px] text-indigo-200/80 flex-1"><span className="text-indigo-300 font-semibold">AI Status:</span> Monitoring 18 systems \u2022 Analyzing 1.2M records \u2022 Response Time 48ms \u2022 Prediction Engine Active \u2022 Model: LifeLink MedAI v4</p>
          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-300 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>All systems nominal</span>
        </div>
      </div>
    </div>
  );
};

const BottleneckDetector = () => {
  const bottlenecks = useMemo(() => [
    { dept: 'Emergency', issue: 'Congestion', rootCause: 'Incoming ambulance surge + limited triage capacity', prediction: 'Will reach max capacity in 47 min', resolution: 'Activate overflow team and open 3 additional beds', improvement: '+40% throughput', severity: 'high' },
    { dept: 'ICU', issue: 'Overload', rootCause: '3 post-surgery complications + 2 emergency admissions', prediction: 'Occupancy to reach 98% by 6 PM', resolution: 'Transfer 2 stable patients to General Ward', improvement: 'Reduce to 78% occupancy', severity: 'high' },
    { dept: 'Radiology', issue: 'Delay', rootCause: 'MRI machine maintenance + staff shortage', prediction: 'Backlog of 12 scans, 2.8hr avg delay', resolution: 'Add 1 radiologist for evening shift', improvement: '-45% turnaround time', severity: 'medium' },
    { dept: 'Nursing', issue: 'Staff Shortage', rootCause: '3 call-offs expected tonight in Ward B', prediction: 'Ward B understaffed by 4 nurses by 10 PM', resolution: 'Reallocate 2 nurses from General Ward', improvement: 'Restore safe staffing ratio', severity: 'medium' },
  ], []);
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-rose-500/10 border-b border-white/20">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-triangle-exclamation text-orange-500"></i>Bottleneck Detector</h3><span className="text-[10px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1"></i>Auto-detected</span></div>
      </div>
      <div className="p-3 space-y-2">
        {bottlenecks.map((b, idx) => (
          <div key={idx}>
            <div onClick={() => setExpanded(expanded === idx ? null : idx)} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/50 hover:bg-white/80 cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-100">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold text-slate-700">{b.dept}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.issue}</span>
                  <span className="text-[9px] text-slate-400 ml-auto">{b.prediction}</span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{b.rootCause}</p>
              </div>
              <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${expanded === idx ? 'rotate-180' : ''}`}></i>
            </div>
            {expanded === idx && (
              <div className="ml-5 mr-3 px-3 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1 animate-fade-in">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-slate-400 font-medium">Resolution:</span><p className="text-slate-700 font-semibold mt-0.5">{b.resolution}</p></div>
                  <div><span className="text-slate-400 font-medium">Expected Improvement:</span><p className="text-emerald-600 font-bold mt-0.5">{b.improvement}</p></div>
                </div>
                <button className="mt-2 text-[9px] font-bold text-white bg-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">Apply Resolution</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const InsightsEngine = () => {
  const insights = useMemo(() => [
    { icon: 'fa-arrow-up', label: 'Hospital efficiency improved', desc: 'Overall operational efficiency up 4.2% this week', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: 'fa-arrow-up', label: 'Emergency load rising', desc: 'Emergency admissions up 18% in last 6 hours', color: 'text-red-600', bg: 'bg-red-50' },
    { icon: 'fa-arrow-down', label: 'Pediatrics unusually quiet', desc: 'Pediatric admissions down 32% compared to weekly average', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: 'fa-arrow-down', label: 'MRI utilization below average', desc: 'MRI scanner utilization at 62% vs target of 80%', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: 'fa-arrow-up', label: 'Cardiology performing well', desc: 'Cardiology department meets all KPI targets', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: 'fa-exclamation', label: 'Surgery delays detected', desc: 'Average surgery start delay increased to 18 minutes', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: 'fa-robot', label: 'AI detected staff shortage', desc: 'Possible staff shortage tonight in Ward B', color: 'text-purple-600', bg: 'bg-purple-50' },
  ], []);
  const [selectedInsight, setSelectedInsight] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-b border-white/20"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-lightbulb text-amber-400"></i>Today's AI Insights</h3></div>
      <div className="p-3 space-y-1.5">
        {insights.map((ins, idx) => (
          <div key={idx}>
            <div onClick={() => setSelectedInsight(selectedInsight === idx ? null : idx)} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedInsight === idx ? ins.bg + ' border border-slate-200' : 'hover:bg-slate-50 border border-transparent'}`}>
              <div className={`w-6 h-6 rounded-lg ${ins.bg} flex items-center justify-center flex-shrink-0`}><i className={`fas ${ins.icon} ${ins.color} text-[10px]`}></i></div>
              <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-slate-700">{ins.label}</p><p className="text-[9px] text-slate-500 truncate">{ins.desc}</p></div>
              <i className={`fas fa-chevron-down text-[9px] text-slate-400 transition-transform duration-200 ${selectedInsight === idx ? 'rotate-180' : ''}`}></i>
            </div>
            {selectedInsight === idx && (
              <div className="ml-9 mr-2 px-3 py-2 rounded-lg bg-white border border-slate-100 mb-1 animate-fade-in">
                <div className="flex items-start gap-2">
                  <i className="fas fa-robot text-indigo-400 text-[10px] mt-0.5"></i>
                  <div>
                    <p className="text-[10px] text-slate-600 leading-relaxed"><strong>AI Analysis:</strong> {ins.desc}. Confidence: {85 + Math.round(Math.random() * 12)}%.</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400"><span>Source: Operational analytics</span><span>\u2022</span><span>Updated 2 min ago</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const LivePatientFlow = () => {
  const stages = [
    { label: 'Admission', icon: 'fa-door-open', count: 8, color: 'text-sky-600', bg: 'bg-sky-100' },
    { label: 'Triage', icon: 'fa-stethoscope', count: 12, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Diagnosis', icon: 'fa-microscope', count: 18, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Treatment', icon: 'fa-syringe', count: 24, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Recovery', icon: 'fa-heart-pulse', count: 14, color: 'text-teal-600', bg: 'bg-teal-100' },
    { label: 'Discharge', icon: 'fa-house-chimney', count: 6, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-sky-500/10 border-b border-white/20">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-people-arrows text-cyan-500"></i>Live Patient Flow</h3><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>82 total</span></div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl ${stage.bg} flex items-center justify-center ${stage.color} border border-white shadow-sm`}><i className={`fas ${stage.icon} text-sm`}></i></div>
                <p className="text-[9px] font-bold text-slate-700 mt-1">{stage.count}</p>
                <p className="text-[7px] text-slate-500 uppercase tracking-wider">{stage.label}</p>
              </div>
              {idx < stages.length - 1 && <div className="flex items-center mx-1 mb-5"><div className="w-4 h-0.5 bg-slate-200" /><i className="fas fa-chevron-right text-[8px] text-slate-300"></i></div>}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100"><i className="fas fa-robot text-indigo-400 text-[10px]"></i><p className="text-[10px] text-indigo-700 font-medium">AI predicts bottleneck at <strong>Triage</strong> within 30 minutes. Consider adding 1 additional triage nurse.</p></div>
      </div>
    </div>
  );
};

const DepartmentComparisonChart = () => {
  const deptData = [
    { name: 'Emergency', efficiency: 78, revenue: 85, risk: 72, patients: 94 },
    { name: 'ICU', efficiency: 82, revenue: 74, risk: 68, patients: 88 },
    { name: 'Radiology', efficiency: 65, revenue: 62, risk: 45, patients: 70 },
    { name: 'OT', efficiency: 88, revenue: 92, risk: 55, patients: 65 },
    { name: 'General', efficiency: 90, revenue: 58, risk: 35, patients: 78 },
    { name: 'Laboratory', efficiency: 85, revenue: 45, risk: 30, patients: 72 },
  ];
  const [metric, setMetric] = useState('efficiency');
  const metricLabels = { efficiency: 'Efficiency', revenue: 'Revenue', risk: 'Risk Level', patients: 'Patient Load' };
  const metricColors = { efficiency: 'bg-emerald-400', revenue: 'bg-blue-400', risk: 'bg-red-400', patients: 'bg-purple-400' };
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-chart-bar text-slate-500"></i>Department Comparison</h3>
          <div className="flex gap-1">{Object.keys(metricLabels).map((key) => (<button key={key} onClick={() => setMetric(key)} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all duration-200 ${metric === key ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}>{metricLabels[key]}</button>))}</div>
        </div>
      </div>
      <div className="p-3">
        <div className="space-y-2">{deptData.map((dept, idx) => { const val = dept[metric]; const mx = Math.max(...deptData.map(d => d[metric])); const pct = (val / mx) * 100; return (<div key={idx} className="flex items-center gap-2"><span className="w-14 text-[10px] font-semibold text-slate-600 text-right">{dept.name}</span><div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${metricColors[metric]} transition-all duration-500`} style={{ width: pct + '%' }} /></div><span className="w-8 text-[10px] font-bold text-slate-700">{val}%</span></div>); })}</div>
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100"><i className="fas fa-robot text-indigo-400 text-[10px]"></i><p className="text-[10px] text-indigo-700 font-medium"><strong>AI Note:</strong> Radiology shows lowest {metricLabels[metric].toLowerCase()}. Recommend process review.</p></div>
      </div>
    </div>
  );
};

const LiveGlobalEvents = () => {
  const events = useMemo(() => [
    { label: 'Weather Alert', desc: 'Heavy rainfall expected \u2014 possible ambulance delays', time: '2 min ago', icon: 'fa-cloud-rain', bg: 'bg-sky-50' },
    { label: 'Disease Surveillance', desc: 'Dengue cases up 12% in neighboring districts', time: '8 min ago', icon: 'fa-biohazard', bg: 'bg-red-50' },
    { label: 'Traffic Advisory', desc: 'Accident on NH-44 causing 15 min delay for ambulances', time: '15 min ago', icon: 'fa-road', bg: 'bg-amber-50' },
    { label: 'Government Alert', desc: 'New blood donation drive announced', time: '28 min ago', icon: 'fa-gavel', bg: 'bg-purple-50' },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-b border-white/20"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-globe text-slate-500"></i>Live Global Events</h3></div>
      <div className="p-3 space-y-2">
        {events.map((evt, idx) => (
          <div key={idx} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-white/50 border border-slate-100/50">
            <div className={`w-7 h-7 rounded-lg ${evt.bg} flex items-center justify-center flex-shrink-0`}><i className={`fas ${evt.icon} text-xs`}></i></div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="text-[11px] font-bold text-slate-700">{evt.label}</span><span className="text-[8px] text-slate-400 ml-auto">{evt.time}</span></div><p className="text-[10px] text-slate-600 leading-tight">{evt.desc}</p></div>
          </div>
        ))}
        <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-1.5"><i className="fas fa-robot text-indigo-400 text-[10px]"></i><p className="text-[10px] text-indigo-700 font-medium"><strong>AI Impact Analysis:</strong> Weather may increase emergency wait times by 15-20 min.</p></div>
      </div>
    </div>
  );
};

const StaffIntelligence = () => {
  const depts = [
    { name: 'Emergency', active: 18, total: 24, burnout: 12, efficiency: 78 },
    { name: 'ICU', active: 22, total: 28, burnout: 8, efficiency: 82 },
    { name: 'General Ward', active: 32, total: 40, burnout: 15, efficiency: 85 },
    { name: 'Radiology', active: 8, total: 12, burnout: 20, efficiency: 65 },
    { name: 'OT', active: 14, total: 16, burnout: 6, efficiency: 90 },
    { name: 'Laboratory', active: 10, total: 14, burnout: 10, efficiency: 88 },
  ];
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-white/20">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-user-nurse text-purple-500"></i>Staff Intelligence</h3><span className="text-[10px] text-slate-400">104 active / 134 assigned</span></div>
      </div>
      <div className="p-3 space-y-2">
        {depts.map((dept, idx) => { const pct = Math.round((dept.active / dept.total) * 100); return (
          <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5"><span className="text-[11px] font-bold text-slate-700">{dept.name}</span><span className="text-[9px] text-slate-500">{dept.active}/{dept.total} on duty</span></div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: pct + '%' }} /></div>
              <div className="flex justify-between mt-0.5"><span className={`text-[9px] font-medium ${dept.burnout > 15 ? 'text-red-500' : dept.burnout > 10 ? 'text-amber-500' : 'text-emerald-500'}`}><i className="fas fa-fire text-[7px] mr-0.5"></i>Burnout risk: {dept.burnout}%</span><span className="text-[9px] text-slate-500">Efficiency: {dept.efficiency}%</span></div>
            </div>
          </div>
        );})}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100"><i className="fas fa-robot text-amber-500 text-[10px]"></i><p className="text-[10px] text-amber-700 font-medium"><strong>AI Suggestion:</strong> Reallocate 2 nurses from General Ward to Emergency.</p></div>
      </div>
    </div>
  );
};

const ResourceIntelligence = () => {
  const resources = [
    { name: 'ICU Beds', used: 42, total: 52, status: 'adequate' },
    { name: 'Ventilators', used: 28, total: 35, status: 'adequate' },
    { name: 'Oxygen Supply', used: 68, total: 100, status: 'adequate' },
    { name: 'O Negative Blood', used: 14, total: 18, status: 'critical' },
    { name: 'MRI Slots', used: 8, total: 12, status: 'warning' },
    { name: 'CT Scanner', used: 14, total: 16, status: 'warning' },
  ];
  const statusColors = { critical: 'text-red-600 bg-red-50 border-red-200', warning: 'text-amber-600 bg-amber-50 border-amber-200', adequate: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  const barColors = { critical: 'bg-red-400', warning: 'bg-amber-400', adequate: 'bg-emerald-400' };
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-white/20"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-boxes text-teal-500"></i>Resource Intelligence</h3></div>
      <div className="p-3 space-y-2">
        {resources.map((res, idx) => { const pct = Math.round((res.used / res.total) * 100); const sc = statusColors[res.status] || statusColors.adequate; return (
          <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5"><span className="text-[11px] font-bold text-slate-700">{res.name}</span><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${sc}`}>{res.status}</span></div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${barColors[res.status]} transition-all duration-500`} style={{ width: pct + '%' }} /></div>
              <div className="flex justify-between mt-0.5"><span className="text-[9px] text-slate-500">{res.used}/{res.total} units</span><span className="text-[9px] font-semibold text-slate-600">{pct}% utilized</span></div>
            </div>
          </div>
        );})}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100"><i className="fas fa-robot text-indigo-400 text-[10px]"></i><p className="text-[10px] text-indigo-700 font-medium"><strong>AI Alert:</strong> O Negative blood supply may become critical within 12 hours.</p></div>
      </div>
    </div>
  );
};

const HospitalTimeline = () => {
  const events = useMemo(() => [
    { time: '08:42', event: 'Emergency admission \u2014 Cardiac arrest (Code Blue)', icon: 'fa-heart-pulse', color: 'text-red-500' },
    { time: '08:35', event: 'ICU bed #12 status changed to Available', icon: 'fa-bed', color: 'text-emerald-500' },
    { time: '08:28', event: 'AI Alert: Blood inventory low', icon: 'fa-robot', color: 'text-purple-500' },
    { time: '08:20', event: 'Surgery #1423 completed \u2014 Dr. Sharma', icon: 'fa-scalpel', color: 'text-sky-500' },
    { time: '08:12', event: 'Ambulance #A-042 arrived \u2014 1 critical patient', icon: 'fa-truck-medical', color: 'text-orange-500' },
    { time: '07:55', event: 'Radiology report uploaded for Patient #8842', icon: 'fa-file-medical', color: 'text-amber-500' },
    { time: '07:40', event: 'Shift change \u2014 Morning team reporting', icon: 'fa-users', color: 'text-blue-500' },
    { time: '07:30', event: 'Patient discharge \u2014 Ward B, Room 204', icon: 'fa-house-chimney', color: 'text-teal-500' },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-b border-white/20">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-clock-rotate-left text-slate-500"></i>Hospital Timeline</h3><span className="text-[10px] text-slate-400">Today</span></div>
      </div>
      <div className="p-3 max-h-[280px] overflow-y-auto space-y-1">
        {events.map((evt, idx) => (
          <div key={idx} className="flex items-start gap-3 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-all duration-200">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center ${evt.color}`}><i className={`fas ${evt.icon} text-[10px]`}></i></div>
              {idx < events.length - 1 && <div className="w-px h-4 bg-slate-200" />}
            </div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-medium text-slate-400">{evt.time}</span><p className="text-[11px] text-slate-700 leading-tight">{evt.event}</p></div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══ Main Component ══════════════════════════════════════════
const HospitalOverview = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;
  const hospitalName = user?.name || user?.hospitalName || user?.displayName || 'Medical Center';
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const cacheKey = hospitalId ? `hospital_overview_${hospitalId}` : 'hospital_overview';

  const load = async (withSpinner) => {
    if (!hospitalId) { setMetrics(null); setAlerts([]); setLoading(false); return; }
    const show = withSpinner === true && !metrics;
    if (show) setLoading(true);
    try {
      const [mr, fr] = await Promise.all([
        apiFetch(`/api/hospital-ops/ceo/global-metrics?hospitalId=${hospitalId}`, { method: 'GET' }),
        apiFetch(`/api/hospital-ops/emergency/feed?hospitalId=${hospitalId}`, { method: 'GET' })
      ]);
      if (mr.ok) setMetrics(mr.data);
      if (fr.ok) setAlerts(fr.data?.data || []);
      if (mr.ok || fr.ok) localStorage.setItem(cacheKey, JSON.stringify({ metrics: mr.ok ? mr.data : null, alerts: fr.ok ? (fr.data?.data || []) : [] }));
    } finally { if (show) setLoading(false); }
  };

  useEffect(() => {
    let cached = false;
    try {
      const c = localStorage.getItem(cacheKey);
      if (c) { const p = JSON.parse(c); setMetrics(p.metrics || null); setAlerts(p.alerts || []); setLoading(false); cached = true; }
    } catch (_) {}
    load(!cached);
  }, [hospitalId]);

  const { feed: realtimeFeed, isConnected: wsConnected } = useEmergencyFeed({ enabled: !!hospitalId });

  useEffect(() => {
    if (!realtimeFeed.length) return;
    setAlerts((p) => {
      const ids = new Set(p.map(a => a._id || a.id));
      const nu = realtimeFeed.filter(i => !ids.has(i._id || i.id || i.alertId));
      return nu.length ? [...nu, ...p].slice(0, 50) : p;
    });
  }, [realtimeFeed]);

  const handleUpdateEmergency = async (id, status) => {
    setAlerts((p) => p.map(i => (i._id || i.id) === id ? { ...i, status } : i));
    await apiFetch(`/api/hospital-ops/emergency/feed/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  };

  const kpiCards = useMemo(() => [
    { label: 'Hospital Occupancy', value: metrics?.beds?.total ? Math.round((metrics.beds.occupied / metrics.beds.total) * 100) : 81, suffix: '%', trend: 'up', trendLabel: '6%', prediction: '89%', predictionTime: '6 PM', recommendation: 'Delay elective admissions if exceeds 90%', color: 'blue', sparklineData: [72, 75, 78, 82, 79, 83, 81, 84, 81] },
    { label: 'Emergency Load', value: metrics?.emergency?.active ?? 12, trend: 'up', trendLabel: '18%', prediction: '18 cases', predictionTime: 'next hour', recommendation: 'Activate overflow triage team', color: 'red', sparklineData: [6, 8, 10, 9, 12, 14, 13, 15, 12] },
    { label: 'AI Health Score', value: metrics?.ai?.healthScore ?? 94, suffix: '%', trend: 'up', trendLabel: '2%', prediction: '96%', predictionTime: 'EOD', color: 'green', sparklineData: [88, 90, 91, 92, 91, 93, 94, 94, 94] },
    { label: 'Available Beds', value: metrics?.beds?.available ?? 18, trend: 'down', trendLabel: '4', prediction: '12', predictionTime: '6 PM', recommendation: 'Plan early discharges to free beds', color: 'amber', sparklineData: [24, 22, 20, 18, 16, 18, 17, 16, 18] },
    { label: 'ICU Utilization', value: metrics?.beds?.icu?.occupied ? Math.round((metrics.beds.icu.occupied / (metrics.beds.icu.total || 56)) * 100) : 82, suffix: '%', trend: 'up', trendLabel: '5%', prediction: '91%', predictionTime: '6 PM', recommendation: 'Transfer 2 stable patients to General Ward', color: 'purple', sparklineData: [72, 75, 78, 80, 82, 81, 83, 84, 82] },
    { label: 'Doctors On Duty', value: metrics?.staff?.doctors ?? 36, prediction: '34', predictionTime: 'tonight', recommendation: 'Evening shift may be short by 2 doctors', color: 'teal', sparklineData: [42, 40, 38, 36, 36, 36, 36, 36, 36] },
    { label: 'Nurses Active', value: metrics?.staff?.nurses ?? 68, trend: 'down', trendLabel: '3', prediction: '62', predictionTime: 'tonight', recommendation: 'Call 2 backup nurses', color: 'blue', sparklineData: [72, 70, 70, 68, 68, 68, 67, 66, 68] },
    { label: 'Emergency Vehicles', value: metrics?.ambulance?.total ?? 8, trend: 'up', trendLabel: '2', prediction: '12', predictionTime: 'next hour', color: 'orange', sparklineData: [6, 6, 7, 7, 8, 8, 8, 8, 8] },
    { label: 'Blood Units', value: metrics?.bloodBank?.available ?? 146, trend: 'down', trendLabel: '12', prediction: '118', predictionTime: 'tomorrow', recommendation: 'O Negative running low - order 4 units', color: 'red', sparklineData: [160, 158, 155, 152, 148, 146, 146, 146, 146] },
    { label: 'Avg Wait Time', value: metrics?.opd?.avgWaitTime ?? 18, suffix: ' min', trend: 'up', trendLabel: '4 min', prediction: '24 min', predictionTime: 'peak hours', recommendation: 'Add 1 physician during peak hours', color: 'amber', sparklineData: [12, 14, 16, 18, 20, 22, 20, 18, 18] },
    { label: 'AI Risk Level', value: metrics?.ai?.riskLevel ?? 'Moderate', prediction: 'Moderate', predictionTime: 'next 24h', recommendation: 'Monitor Emergency and ICU', color: 'purple', sparklineData: [30, 35, 40, 45, 50, 48, 45, 42, 40] },
  ], [metrics]);

  if (loading && !metrics) return <LoadingSpinner />;

  return (
    <div className="relative pb-10">
      <AnimatedExecutiveBg />
      <div className="relative z-10 space-y-4 sm:space-y-5">
        <ExecutiveHero metrics={metrics} hospitalName={hospitalName} status={metrics?.hospitalStatus || 'Operational'} />
        <ExecutiveAISummary />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Executive KPIs</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <span className="text-[9px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1"></i>Live</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
            {kpiCards.map((kpi, idx) => <ExecutiveKpiCard key={idx} {...kpi} delay={idx * 60} />)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExecutivePriorityCenter />
          <ExecutiveFinancialIntel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DigitalTwinMap />
          <BottleneckDetector />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InsightsEngine />
          <LivePatientFlow />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DepartmentComparisonChart />
          <StaffIntelligence />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceIntelligence />
          <LiveGlobalEvents />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExecutiveDecisionCenter />
          <HospitalTimeline />
        </div>

        {metrics?.ai?.anomalies?.length > 0 && (
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-red-200/50 overflow-hidden animate-fade-in-up">
            <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30">
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-bell text-red-500"></i>AI Detected Anomalies</h3>
            </div>
            <div className="p-3 space-y-2">
              {metrics.ai.anomalies.map((alert, idx) => (
                <div key={`${alert}-${idx}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100"><i className="fas fa-circle-exclamation text-red-400 text-xs"></i><p className="text-[11px] text-red-700 font-medium">{alert}</p></div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 font-display">Live Emergency Feed</h3>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${wsConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />{wsConnected ? 'Live' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { import('../utils/dataExport').then(({ exportCSV }) => exportCSV(alerts, { filename: 'emergency_feed.csv' })); }} className="text-[10px] text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all duration-200" title="Export CSV"><i className="fas fa-download"></i></button>
                <span className="text-[10px] text-slate-400"><i className="fas fa-clock text-[8px] mr-0.5"></i>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="p-3">
            {alerts.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-sm text-slate-500"><i className="fas fa-check-circle text-emerald-400 mr-2"></i>No active emergencies.</div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div key={alert._id || alert.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/60 border border-slate-100 hover:bg-white/90 transition-all duration-200">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'Critical' ? 'bg-red-500' : alert.severity === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[11px] font-bold text-slate-800">{alert.patientName || 'Emergency case'}</p>
                        <div className="flex items-center gap-1.5">
                          <StatusPill text={alert.severity || 'High'} color={alert.severity === 'Critical' ? 'red' : 'yellow'} />
                          <StatusPill text={alert.status || 'Unassigned'} color={alert.status === 'Resolved' ? 'green' : 'blue'} />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">{alert.location || 'Unknown'} \u2022 {alert.symptoms || 'No symptoms'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition-all" onClick={() => handleUpdateEmergency(alert._id || alert.id, 'Assigned')}><i className="fas fa-check text-[7px] mr-0.5"></i>Assign</button>
                        <button className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition-all" onClick={() => handleUpdateEmergency(alert._id || alert.id, 'Resolved')}><i className="fas fa-check-double text-[7px] mr-0.5"></i>Resolve</button>
                        <button className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all"><i className="fas fa-robot text-[7px] mr-0.5"></i>AI Analyze</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalOverview;
