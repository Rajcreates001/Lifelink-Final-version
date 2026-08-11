import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from './Common';
import {
  BedHeroCommandCenter, BedDigitalMap, BedDigitalTwinCard,
  BedAllocationEngine, BedOccupancyForecast, BedPatientFlowEngine,
  BedTransferEngine, CleaningIntelligence, BedBottleneckDetector,
  BedHealthScore, BedWaitlistAI, BedResourceCoordinator,
  BedScenarioSimulator, BedKnowledgeGraph, BedTimeline,
} from './ui/BedIntelComponents';

const AnimatedBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-200/15 to-purple-300/15 blur-3xl animate-pulse-slow" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-200/15 to-indigo-200/15 blur-3xl animate-pulse-slower" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.01]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="bi-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#bi-grid)"/>
    </svg>
  </div>
);

const mockBeds = [
  { id: 'ICU-12', label: 'ICU-12', ward: 'ICU', floor: 'Floor 2', status: 'Occupied', patientName: 'John D.', doctor: 'Dr. Sharma', equipment: 'Ventilator, Monitor', expectedDischarge: '~2 days', risk: 'High', cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Monitor vitals closely; potential deterioration detected', predictedRelease: '~48h' },
  { id: 'ICU-08', label: 'ICU-08', ward: 'ICU', floor: 'Floor 2', status: 'Occupied', patientName: 'Sarah M.', doctor: 'Dr. Patel', equipment: 'Monitor, Infusion Pump', expectedDischarge: '~1 day', risk: 'Medium', cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Stable; prepare for step-down transfer', predictedRelease: '~24h' },
  { id: 'ICU-15', label: 'ICU-15', ward: 'ICU', floor: 'Floor 2', status: 'Cleaning', patientName: null, doctor: null, equipment: null, expectedDischarge: null, risk: null, cleaningETA: '15 min', cleaningProgress: 65, aiRecommendation: 'Cleaning in progress; next assignment: cardiac', predictedRelease: '~20 min' },
  { id: 'ICU-03', label: 'ICU-03', ward: 'ICU', floor: 'Floor 2', status: 'Available', patientName: null, doctor: null, equipment: 'Ventilator ready', expectedDischarge: null, risk: null, cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Ideal for incoming respiratory case', predictedRelease: 'Now' },
  { id: 'ER-22', label: 'ER-22', ward: 'Emergency', floor: 'Floor 1', status: 'Occupied', patientName: 'Raj K.', doctor: 'Dr. Gupta', equipment: 'ECG Monitor', expectedDischarge: '~4h', risk: 'Medium', cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Observation complete; discharge pending labs', predictedRelease: '~4h' },
  { id: 'ER-18', label: 'ER-18', ward: 'Emergency', floor: 'Floor 1', status: 'Available', patientName: null, doctor: null, equipment: 'Standard', expectedDischarge: null, risk: null, cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Ready for assignment - trauma protocol', predictedRelease: 'Now' },
  { id: 'GW-45', label: 'GW-45', ward: 'General Ward', floor: 'Floor 3', status: 'Occupied', patientName: 'Emma W.', doctor: 'Dr. Singh', equipment: 'Standard', expectedDischarge: '~1 day', risk: 'Low', cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Recovering well; discharge tomorrow AM', predictedRelease: '~18h' },
  { id: 'GW-46', label: 'GW-46', ward: 'General Ward', floor: 'Floor 3', status: 'Available', patientName: null, doctor: null, equipment: 'Standard', expectedDischarge: null, risk: null, cleaningETA: null, cleaningProgress: null, aiRecommendation: 'Ready for assignment - low acuity', predictedRelease: 'Now' },
];

const BedDetailModal = ({ bed, onClose }) => {
  if (!bed) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-600">
              <i className="fas fa-bed text-lg" />
            </div>
            <div><h2 className="text-base font-bold text-slate-800">{bed.label || bed.id}</h2><p className="text-[11px] text-slate-400">{bed.ward} • {bed.floor}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all"><i className="fas fa-times text-sm" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              bed.status === 'Occupied' ? 'bg-rose-100 text-rose-700' : bed.status === 'Cleaning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${bed.status === 'Occupied' ? 'bg-rose-500' : bed.status === 'Cleaning' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
              {bed.status}
            </span>
          </div>
          {bed.status === 'Occupied' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Patient</p><p className="text-sm font-bold text-slate-800">{bed.patientName}</p></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Doctor</p><p className="text-sm font-bold text-slate-800">{bed.doctor}</p></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Equipment</p><p className="text-sm font-bold text-slate-800">{bed.equipment}</p></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Discharge ETA</p><p className="text-sm font-bold text-amber-600">{bed.expectedDischarge}</p></div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                <div className="flex items-center gap-2"><i className="fas fa-robot text-indigo-400 text-sm" /><p className="text-xs text-indigo-700 font-medium">{bed.aiRecommendation}</p></div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] text-amber-700 font-semibold"><i className="fas fa-lightbulb text-amber-500 mr-1" />Transfer History</p>
                <div className="mt-1 space-y-1 text-[9px] text-amber-600">
                  <p>• Admitted from ER (3 days ago)</p>
                  <p>• Transferred to ICU (2 days ago)</p>
                  <p>• Nurse assigned: Priya K. (current shift)</p>
                </div>
              </div>
            </>
          )}
          {bed.status === 'Cleaning' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Cleaning ETA</p><p className="text-lg font-bold text-amber-600">{bed.cleaningETA}</p></div>
              <div><p className="text-[9px] text-slate-400 mb-1">Progress</p>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 animate-pulse" style={{ width: `${bed.cleaningProgress}%` }} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100"><p className="text-xs text-indigo-700 font-medium">{bed.aiRecommendation}</p></div>
            </div>
          )}
          {bed.status === 'Available' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <i className="fas fa-check-circle text-emerald-500" /><p className="text-sm font-bold text-emerald-700">Ready for assignment</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Equipment</p><p className="text-sm font-bold text-slate-800">{bed.equipment}</p></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[9px] text-slate-400">Predicted Release</p><p className="text-sm font-bold text-emerald-600">{bed.predictedRelease}</p></div>
              </div>
              <button className="w-full text-xs font-bold text-white bg-indigo-600 py-2 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">Assign Patient</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BedIntelligenceCenter = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!hospitalId) { setStats(null); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await apiFetch('/api/hospital-ops/ceo/resources?hospitalId=' + hospitalId, { method: 'GET' });
        setStats(res.ok ? res.data : null);
      } catch (_) { setStats(null); }
      finally { setLoading(false); }
    };
    load();
  }, [hospitalId]);

  const filteredBeds = useMemo(() =>
    mockBeds.filter(b =>
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.ward.toLowerCase().includes(search.toLowerCase()) ||
      (b.patientName && b.patientName.toLowerCase().includes(search.toLowerCase()))
    ), [search]);

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="relative pb-10">
      <AnimatedBg />
      <div className="relative z-10 space-y-4 sm:space-y-5">

        {/* Hero Command Center */}
        <BedHeroCommandCenter />

        {/* Smart Search */}
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/40 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-sm"
            placeholder='Search beds, patients, wards... (e.g., "ICU", "John D.", "ventilator")'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Digital Hospital Map + Allocation Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BedDigitalMap />
          <BedAllocationEngine />
        </div>

        {/* Bed Digital Twins */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Bed Digital Twins</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <span className="text-[9px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1" />Live · {filteredBeds.length} beds</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredBeds.map((bed) => (
              <BedDigitalTwinCard key={bed.id} bed={bed} onClick={() => setSelectedBed(bed)} />
            ))}
          </div>
        </div>

        {/* Row 1: Forecast + Patient Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BedOccupancyForecast />
          <BedPatientFlowEngine />
        </div>

        {/* Row 2: Bottleneck + Transfer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BedBottleneckDetector />
          <BedTransferEngine />
        </div>

        {/* Row 3: Health Score + Waitlist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BedHealthScore />
          <BedWaitlistAI />
        </div>

        {/* Row 4: Cleaning + Resource */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CleaningIntelligence />
          <BedResourceCoordinator />
        </div>

        {/* Row 5: Simulator + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BedScenarioSimulator />
          <BedTimeline />
        </div>

        {/* Row 6: Knowledge Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BedKnowledgeGraph />
          {/* Backend data section */}
          {stats?.beds && (
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up">
              <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20">
                <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <i className="fas fa-database text-slate-500" />Bed Data (from backend)
                </h3>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-[9px] text-slate-400">Total</p><p className="text-sm font-bold text-slate-800">{stats.beds.total || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-[9px] text-slate-400">Occupied</p><p className="text-sm font-bold text-amber-600">{stats.beds.occupied || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-[9px] text-slate-400">Available</p><p className="text-sm font-bold text-emerald-600">{stats.beds.available || 0}</p>
                  </div>
                </div>
                {stats.beds.icu && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[9px] text-slate-400">ICU</p><p className="text-xs font-bold text-purple-600">{stats.beds.icu.occupied}/{stats.beds.icu.total}</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[9px] text-slate-400">Emergency</p><p className="text-xs font-bold text-rose-600">{stats.beds.emergency?.occupied || 0}/{stats.beds.emergency?.total || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[9px] text-slate-400">General</p><p className="text-xs font-bold text-teal-600">{stats.beds.general?.occupied || 0}/{stats.beds.general?.total || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bed Detail Modal */}
      <BedDetailModal bed={selectedBed} onClose={() => setSelectedBed(null)} />
    </div>
  );
};

export default BedIntelligenceCenter;
