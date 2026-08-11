import React, { useMemo } from 'react';

const DeptStaffIntelligence = () => {
  const depts = useMemo(() => [
    { name: 'Emergency', doctors: 6, nurses: 18, patients: 24, ratio: 1, fatigue: 12, burnout: 14, shiftUtil: 82 },
    { name: 'ICU', doctors: 4, nurses: 22, patients: 14, ratio: 0.5, fatigue: 8, burnout: 10, shiftUtil: 78 },
    { name: 'General Ward', doctors: 8, nurses: 32, patients: 48, ratio: 1.2, fatigue: 15, burnout: 18, shiftUtil: 90 },
    { name: 'Radiology', doctors: 3, nurses: 8, patients: 12, ratio: 2.4, fatigue: 20, burnout: 22, shiftUtil: 95 },
    { name: 'OT', doctors: 5, nurses: 14, patients: 8, ratio: 0.4, fatigue: 6, burnout: 8, shiftUtil: 70 },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-user-nurse text-purple-500"></i>Staff Intelligence</h3>
          <span className="text-[10px] text-slate-400">26 doctors / 94 nurses</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {depts.map((d, idx) => (
          <div key={idx} className="px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all border border-transparent hover:border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">{d.name}</span>
              <span className="text-[9px] text-slate-500">{d.doctors} Dr / {d.nurses} Ns / {d.patients} Pts</span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-slate-500 mb-1">
              <span><strong>Ratio:</strong> {d.ratio}:1 Dr/Pt</span>
              <span className={'font-semibold ' + (d.burnout > 15 ? 'text-red-500' : d.burnout > 10 ? 'text-amber-500' : 'text-emerald-500')}><i className="fas fa-fire text-[7px] mr-0.5"></i>Burn: {d.burnout}%</span>
              <span>Shift: {d.shiftUtil}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={'h-full rounded-full ' + (d.fatigue > 15 ? 'bg-red-400' : d.fatigue > 10 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: d.fatigue * 5 + '%' }} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
          <i className="fas fa-robot text-amber-500 text-[10px]"></i>
          <p className="text-[10px] text-amber-700 font-medium"><strong>AI:</strong> Reallocate 2 nurses from General Ward to Emergency to balance workload.</p>
        </div>
      </div>
    </div>
  );
};

export default DeptStaffIntelligence;
