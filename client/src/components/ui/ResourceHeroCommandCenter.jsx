import React, { useEffect, useState } from 'react';

const summaries = [
  {
    status: 'Resource Health: 96%',
    text: 'Inventory coverage at 41 days. Predicted shortages: 4 items. Equipment availability at 98%. Emergency readiness at 94%. AI confidence at 99%.',
    health: 96, aiConf: 99, inventory: 41, shortages: 4, equipAvail: 98, readiness: 94, financial: 87, procurement: 92,
  },
  {
    status: 'Supply chain risk detected',
    text: 'O Negative blood critically low. PPE stock below threshold. MRI-2 maintenance overdue. Recommended: expedite 3 purchase orders.',
    health: 88, aiConf: 96, inventory: 28, shortages: 7, equipAvail: 92, readiness: 83, financial: 82, procurement: 78,
  },
  {
    status: 'Optimal resource allocation',
    text: 'All departments within healthy resource utilization. Equipment maintenance up to date. Procurement ahead of schedule. Inventory surplus in 6 categories.',
    health: 98, aiConf: 99, inventory: 52, shortages: 1, equipAvail: 99, readiness: 97, financial: 94, procurement: 96,
  },
];

const ResourceHeroCommandCenter = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % summaries.length), 8000);
    return () => clearInterval(t);
  }, []);
  const s = summaries[idx];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 shadow-2xl animate-fade-in-up">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-600/10 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.08),transparent_70%)]" />
      <div className="relative z-10 px-4 py-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />LifeLink AI Resource Intelligence Center</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"><i className="fas fa-sync-alt text-[8px]" />Live</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white font-display">Hospital Resource Command Center</h2>
            <p className="text-xs text-teal-300/80 font-medium">Real-time AI optimization for hospital assets, inventory, workforce, procurement, and operational resources</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <div className="text-right"><p className="text-[9px] text-teal-300/70 uppercase">AI Confidence</p><p className="text-lg font-bold text-emerald-400">{s.aiConf}%</p></div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center"><i className="fas fa-cubes text-white text-sm" /></div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-300">{s.status}</span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium mb-4">{s.text}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Health</p><p className="text-base font-bold text-emerald-400">{s.health}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Inventory</p><p className="text-base font-bold text-white">{s.inventory}d</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Shortages</p><p className="text-base font-bold text-rose-400">{s.shortages}</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Equipment</p><p className="text-base font-bold text-emerald-400">{s.equipAvail}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Readiness</p><p className="text-base font-bold text-teal-400">{s.readiness}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Finance</p><p className="text-base font-bold text-white">{s.financial}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Procurement</p><p className="text-base font-bold text-teal-400">{s.procurement}%</p></div>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10"><p className="text-[8px] text-teal-300/60 uppercase">Carbon</p><p className="text-base font-bold text-emerald-400">B+</p></div>
        </div>
      </div>
    </div>
  );
};

export default ResourceHeroCommandCenter;
