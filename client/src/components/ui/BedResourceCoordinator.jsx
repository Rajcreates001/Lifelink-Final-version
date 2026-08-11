import React from 'react';

const resources = [
  { name: 'Ventilators', used: 18, total: 24, dept: 'ICU' },
  { name: 'ICU Monitors', used: 20, total: 24, dept: 'ICU' },
  { name: 'Oxygen Ports', used: 42, total: 60, dept: 'All' },
  { name: 'Nurses (ICU)', used: 18, total: 22, dept: 'ICU' },
  { name: 'Nurses (Ward)', used: 28, total: 36, dept: 'General' },
  { name: 'Ambulances', used: 4, total: 6, dept: 'Emergency' },
];

const BedResourceCoordinator = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-scale-balanced text-violet-500" />Resource Coordinator</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {resources.map((r) => {
          const pct = Math.round((r.used / r.total) * 100);
          return (
            <div key={r.name} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-700">{r.name}</span>
                  <span className="text-[8px] text-slate-400 ml-1">({r.dept})</span>
                </div>
                <span className="text-[9px] font-bold text-slate-600">{r.used}/{r.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 85 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                }`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                <span>{pct}% utilized</span>
                <span className={pct >= 85 ? 'text-red-500 font-semibold' : ''}>{r.total - r.used} available</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 pb-3 pt-1">
        <button className="w-full text-[9px] font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 py-1.5 rounded-xl hover:shadow-lg active:scale-95 transition-all">
          <i className="fas fa-robot mr-1" />AI Optimize Resources
        </button>
      </div>
    </div>
  );
};

export default BedResourceCoordinator;
