import React from 'react';

const CleaningIntelligence = () => {
  const teams = [
    { name: 'Team Alpha', beds: 4, progress: 75, eta: '12 min', status: 'Active' },
    { name: 'Team Beta', beds: 3, progress: 40, eta: '22 min', status: 'Active' },
    { name: 'Team Gamma', beds: 2, progress: 100, eta: 'Done', status: 'Complete' },
    { name: 'Team Delta', beds: 6, progress: 25, eta: '35 min', status: 'Active' },
  ];
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-broom text-cyan-500" />Cleaning Intelligence</h3>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[9px] text-slate-400 px-1">
          <span>4 teams • 15 beds in queue</span>
          <span>Next available: 14 min</span>
        </div>
        {teams.map((t) => (
          <div key={t.name} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-xs font-bold text-slate-700">{t.name}</span>
              </div>
              <span className="text-[9px] text-slate-400">{t.eta}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${t.status === 'Complete' ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-teal-400'}`}
                style={{ width: `${t.progress}%` }} />
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">{t.beds} beds • {t.progress}%</p>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Sanitization: <span className="text-emerald-600 font-semibold">12/15</span></span>
            <span>Maintenance: <span className="text-amber-600 font-semibold">3 pending</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleaningIntelligence;
