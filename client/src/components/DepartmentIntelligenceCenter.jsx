import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { LoadingSpinner, StatusPill } from './Common';
import {
  DeptHealthScore, DeptDigitalTwinCard, DeptPerformanceRanking,
  DeptBottleneckDetector, DeptPatientFlow, DeptForecast,
  DeptResourceOptimizer, DeptStaffIntelligence, DeptEquipmentIntelligence,
  DeptWaitingTimeAI, DeptAnomalyDetector, DeptScenarioSimulator,
  DeptTimeline, DeptKnowledgeGraph,
} from './ui/DeptIntelComponents';

const AnimatedBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-200/15 to-sky-300/15 blur-3xl animate-pulse-slow" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-teal-200/15 to-emerald-200/15 blur-3xl animate-pulse-slower" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.01]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="di-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#di-grid)"/>
    </svg>
  </div>
);

const HeroSummary = () => {
  const summaries = useMemo(() => [
    { text: 'Emergency is approaching overload within 3 hours. Radiology turnaround time increased by 22%. Cardiology is operating at optimal efficiency. Neurology is underutilized.', confidence: 98, efficiency: 94 },
    { text: 'ICU occupancy at 91% - consider transferring 2 stable patients. OPD wait times normal. Laboratory backlog cleared. Pharmacy inventory adequate.', confidence: 96, efficiency: 91 },
    { text: 'Surgery delays detected (18 min avg). Blood bank O Negative critical. Staff fatigue detected in Radiology. Three departments require intervention.', confidence: 94, efficiency: 87 },
  ], []);
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(p => (p + 1) % summaries.length), 8000); return () => clearInterval(t); }, []);
  const s = summaries[idx];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 shadow-2xl animate-fade-in-up">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-600/10 to-transparent" />
      <div className="relative z-10 px-4 py-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>AI Department Intelligence Center</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold"><i className="fas fa-robot text-[8px]"></i>Monitoring 8 departments</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">Hospital Operations Summary</h2>
            <p className="text-xs text-cyan-300/80 font-medium">Real-time operational intelligence across every department powered by predictive AI</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
            <div className="text-right"><p className="text-[9px] text-cyan-300/70 uppercase">AI Confidence</p><p className="text-sm font-bold text-emerald-400">{s.confidence}%</p></div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><i className="fas fa-brain text-white text-sm"></i></div>
          </div>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium mb-3">{s.text}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Efficiency</p><p className="text-base font-bold text-emerald-400">{s.efficiency}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Departments</p><p className="text-base font-bold text-white">8</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Critical</p><p className="text-base font-bold text-rose-400">2</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">At Risk</p><p className="text-base font-bold text-amber-400">3</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Optimal</p><p className="text-base font-bold text-emerald-400">3</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Patients</p><p className="text-base font-bold text-white">186</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Staff</p><p className="text-base font-bold text-white">134</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-cyan-300/60 uppercase">Revenue</p><p className="text-sm font-bold text-teal-400">$284K</p></div>
        </div>
      </div>
    </div>
  );
};

const departmentData = [
  { id: 'emergency', name: 'Emergency', icon: 'fa-ambulance', iconBg: 'bg-red-100', iconColor: 'text-red-600', healthScore: 68, patients: 18, waitTime: 24, doctors: 6, nurses: 18, occupiedBeds: 18, totalBeds: 24, revenue: 156, confidence: 79, aiPrediction: 'Overload expected in 3h - activate triage protocol', color: 'red' },
  { id: 'icu', name: 'ICU', icon: 'fa-heart-pulse', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', healthScore: 74, patients: 14, waitTime: 0, doctors: 4, nurses: 22, occupiedBeds: 19, totalBeds: 22, revenue: 145, confidence: 82, aiPrediction: '91% occupancy - transfer 2 stable patients', color: 'purple' },
  { id: 'radiology', name: 'Radiology', icon: 'fa-x-ray', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', healthScore: 65, patients: 12, waitTime: 28, doctors: 3, nurses: 8, occupiedBeds: 0, totalBeds: 0, revenue: 92, confidence: 76, aiPrediction: 'MRI-2 at 96% - maintenance needed', color: 'amber' },
  { id: 'opd', name: 'OPD', icon: 'fa-user-doctor', iconBg: 'bg-sky-100', iconColor: 'text-sky-600', healthScore: 86, patients: 42, waitTime: 24, doctors: 8, nurses: 12, occupiedBeds: 0, totalBeds: 0, revenue: 72, confidence: 88, aiPrediction: 'Normal operations - schedule as usual', color: 'sky' },
  { id: 'surgery', name: 'OT', icon: 'fa-scalpel', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', healthScore: 78, patients: 8, waitTime: 18, doctors: 5, nurses: 14, occupiedBeds: 0, totalBeds: 0, revenue: 112, confidence: 84, aiPrediction: '18 min delays detected - review schedule', color: 'rose' },
  { id: 'general', name: 'General Ward', icon: 'fa-bed', iconBg: 'bg-teal-100', iconColor: 'text-teal-600', healthScore: 82, patients: 48, waitTime: 0, doctors: 8, nurses: 32, occupiedBeds: 40, totalBeds: 52, revenue: 84, confidence: 86, aiPrediction: 'Stable occupancy - 12 beds available', color: 'teal' },
  { id: 'lab', name: 'Laboratory', icon: 'fa-flask', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', healthScore: 85, patients: 22, waitTime: 18, doctors: 2, nurses: 10, occupiedBeds: 0, totalBeds: 0, revenue: 48, confidence: 87, aiPrediction: 'Backlog cleared - normal ops resumed', color: 'cyan' },
  { id: 'pharmacy', name: 'Pharmacy', icon: 'fa-tablets', iconBg: 'bg-green-100', iconColor: 'text-green-600', healthScore: 90, patients: 0, waitTime: 6, doctors: 1, nurses: 6, occupiedBeds: 0, totalBeds: 0, revenue: 156, confidence: 91, aiPrediction: 'Inventory adequate - O Neg needs reorder', color: 'green' },
];

const DeptDetailModal = ({ dept, onClose }) => {
  if (!dept) return null;
  const healthPct = Math.round((dept.healthScore || 0) * 100 / 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl ' + (dept.iconBg || 'bg-indigo-100') + ' flex items-center justify-center ' + (dept.iconColor || 'text-indigo-600')}>
              <i className={'fas ' + (dept.icon || 'fa-building') + ' text-lg'}></i>
            </div>
            <div><h2 className="text-base font-bold text-slate-800">{dept.name} Department</h2><p className="text-[11px] text-slate-400">AI Department Intelligence</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all"><i className="fas fa-times text-sm"></i></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <DeptHealthScore score={healthPct} size={80} strokeWidth={6} />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Current Patients</p><p className="text-lg font-bold text-slate-800">{dept.patients}</p></div>
              <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Wait Time</p><p className="text-lg font-bold text-amber-600">{dept.waitTime}m</p></div>
              <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Revenue</p><p className="text-lg font-bold text-emerald-600">${dept.revenue}K</p></div>
              <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">AI Confidence</p><p className="text-lg font-bold text-indigo-600">{dept.confidence}%</p></div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <div className="flex items-center gap-2"><i className="fas fa-robot text-indigo-400 text-sm"></i><p className="text-xs text-indigo-700 font-medium">{dept.aiPrediction}</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2.5"><p className="text-[9px] text-slate-400">Doctors</p><p className="text-sm font-bold text-slate-700">{dept.doctors}</p></div>
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2.5"><p className="text-[9px] text-slate-400">Nurses</p><p className="text-sm font-bold text-slate-700">{dept.nurses}</p></div>
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2.5"><p className="text-[9px] text-slate-400">Beds</p><p className="text-sm font-bold text-slate-700">{dept.occupiedBeds}/{dept.totalBeds}</p></div>
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2.5"><p className="text-[9px] text-slate-400">Confidence</p><p className="text-sm font-bold text-indigo-600">{dept.confidence}%</p></div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[10px] text-amber-700 font-semibold"><i className="fas fa-lightbulb text-amber-500 mr-1"></i>Recommended Actions</p>
            <p className="text-[10px] text-amber-600 mt-1">{dept.id === 'emergency' ? 'Activate overflow protocol, call in 2 backup nurses, prepare 4 additional beds.' : dept.id === 'icu' ? 'Transfer 2 stable patients to General Ward, monitor ventilator usage.' : dept.id === 'radiology' ? 'Schedule MRI-2 maintenance, redistribute workload to CT scanner.' : dept.id === 'opd' ? 'Maintain current schedule. Consider teleconsult for follow-up visits.' : 'Continue current operations. Monitor for changes.'}</p>
            <button className="mt-2 w-full text-[10px] font-bold text-white bg-indigo-600 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"><i className="fas fa-arrow-right text-[8px] mr-1"></i>Enter Department Workspace</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DepartmentIntelligenceCenter = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!hospitalId) { setStats(null); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await apiFetch('/api/hospital-ops/ceo/department-performance?hospitalId=' + hospitalId, { method: 'GET' });
        setStats(res.ok ? res.data : null);
      } catch (_) { setStats(null); }
      finally { setLoading(false); }
    };
    load();
  }, [hospitalId]);

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="relative pb-10">
      <AnimatedBg />
      <div className="relative z-10 space-y-4 sm:space-y-5">
        <HeroSummary />

        {/* Digital Twin Cards */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Department Digital Twins</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <span className="text-[9px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1"></i>Live</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {departmentData.map((dept, idx) => (
              <DeptDigitalTwinCard key={dept.id} dept={dept} onClick={() => setSelectedDept(dept)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeptPerformanceRanking />
          <DeptBottleneckDetector />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeptPatientFlow />
          <DeptForecast />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeptResourceOptimizer />
          <DeptStaffIntelligence />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeptEquipmentIntelligence />
          <DeptWaitingTimeAI />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeptAnomalyDetector />
          <DeptScenarioSimulator />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeptKnowledgeGraph />
          <DeptTimeline />
        </div>

        {stats?.departments?.length > 0 && (
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20">
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                <i className="fas fa-database text-slate-500"></i>Department Data (from backend)
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
              {stats.departments.map((d) => (
                <div key={d.department} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/50 border border-slate-100">
                  <div><p className="text-[11px] font-bold text-slate-700">{d.department}</p><p className="text-[9px] text-slate-500">Score: {d.score} | Patients: {d.patients}</p></div>
                  <div className="flex items-center gap-1.5">
                    <StatusPill text={d.dischargeRate + '% discharge'} color="green" size="sm" />
                    <StatusPill text={d.delayRate + '% delays'} color={d.delayRate > 12 ? 'red' : 'yellow'} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DeptDetailModal dept={selectedDept} onClose={() => setSelectedDept(null)} />
    </div>
  );
};

export default DepartmentIntelligenceCenter;
