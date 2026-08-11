import React, { useEffect, useState, useMemo } from 'react';

const summaries = [
  {
    status: 'Hospital operating normally',
    text: 'Emergency admissions increased by 14%. ICU is projected to exceed 90% occupancy by 5 PM. 3 patients predicted to become critical. Financial efficiency remains above target.',
    occupancy: 71, predictedOcc: 89, overflowRisk: 18, criticalBeds: 4, confidence: 98, readiness: 94, healthScore: 81,
    criticalShortage: '2h 14m',
  },
  {
    status: 'Overflow protocol recommended',
    text: 'Bed occupancy rising faster than predicted. Recommend activating overflow ward and delaying 2 elective admissions. O Negative blood supply critically low.',
    occupancy: 78, predictedOcc: 93, overflowRisk: 32, criticalBeds: 6, confidence: 96, readiness: 87, healthScore: 74,
    criticalShortage: '1h 06m',
  },
  {
    status: 'Stable operations',
    text: 'All departments operating within normal parameters. Cleaning team efficiency improved by 12%. Discharge rate trending upward. No critical shortages expected.',
    occupancy: 65, predictedOcc: 78, overflowRisk: 8, criticalBeds: 2, confidence: 99, readiness: 97, healthScore: 89,
    criticalShortage: 'N/A',
  },
];

const BedHeroCommandCenter = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % summaries.length), 8000);
    return () => clearInterval(t);
  }, []);
  const s = summaries[idx];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-2xl animate-fade-in-up">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/10 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_70%)]" />
      <div className="relative z-10 px-4 py-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />LifeLink AI Bed Intelligence Center</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"><i className="fas fa-sync-alt text-[8px]" />Live</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white font-display">Hospital Capacity Command Center</h2>
            <p className="text-xs text-indigo-300/80 font-medium">Real-time AI-powered hospital capacity optimization and patient allocation</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <div className="text-right"><p className="text-[9px] text-indigo-300/70 uppercase">AI Confidence</p><p className="text-lg font-bold text-emerald-400">{s.confidence}%</p></div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"><i className="fas fa-brain text-white text-sm" /></div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-300">{s.status}</span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium mb-4">{s.text}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Occupancy</p><p className="text-base font-bold text-amber-400">{s.occupancy}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Predicted (6h)</p><p className="text-base font-bold text-rose-400">{s.predictedOcc}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Overflow Risk</p><p className="text-base font-bold text-amber-400">{s.overflowRisk}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Readiness</p><p className="text-base font-bold text-emerald-400">{s.readiness}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Health Score</p><p className="text-base font-bold text-white">{s.healthScore}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Critical Beds</p><p className="text-base font-bold text-rose-400">{s.criticalBeds}</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Avg Wait</p><p className="text-base font-bold text-white">18m</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">Isolation</p><p className="text-base font-bold text-purple-400">8</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-indigo-300/60 uppercase">ICU Shortage</p><p className="text-xs font-bold text-rose-400">{s.criticalShortage}</p></div>
        </div>
      </div>
    </div>
  );
};

export default BedHeroCommandCenter;
