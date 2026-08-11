import React, { useMemo } from 'react';

const DeptEquipmentIntelligence = () => {
  const items = useMemo(() => [
    { name: 'MRI-1', usage: 82, maintenance: '14 days', failure: 12, idle: 8, efficiency: 88 },
    { name: 'MRI-2', usage: 96, maintenance: '3 days', failure: 34, idle: 2, efficiency: 72 },
    { name: 'CT-1', usage: 74, maintenance: '21 days', failure: 8, idle: 15, efficiency: 92 },
    { name: 'CT-2', usage: 88, maintenance: '10 days', failure: 18, idle: 6, efficiency: 82 },
    { name: 'Ventilator-8', usage: 65, maintenance: '5 days', failure: 8, idle: 22, efficiency: 90 },
    { name: 'ECG-3', usage: 58, maintenance: '30 days', failure: 4, idle: 30, efficiency: 95 },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-microscope text-amber-500"></i>Equipment Intelligence</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {items.map((eq, idx) => (
          <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all border border-transparent hover:border-slate-100">
            <div className={'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ' + (eq.failure > 20 ? 'bg-red-100 text-red-500' : eq.usage > 85 ? 'bg-amber-100 text-amber-500' : 'bg-emerald-100 text-emerald-500')}>
              <i className={'fas ' + (eq.name.includes('MRI') ? 'fa-magnet' : eq.name.includes('CT') ? 'fa-cube' : eq.name.includes('Vent') ? 'fa-fan' : 'fa-heart-pulse') + ' text-xs'}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold text-slate-700">{eq.name}</span>
                <span className={'text-[9px] font-bold ' + (eq.failure > 20 ? 'text-red-500' : eq.failure > 10 ? 'text-amber-500' : 'text-emerald-500')}>{eq.failure}% fail.</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={'h-full rounded-full ' + (eq.usage > 85 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: eq.usage + '%' }} />
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                <span>Usage: {eq.usage}%</span>
                <span>Maint: {eq.maintenance}</span>
                <span>Idle: {eq.idle}%</span>
                <span>Eff: {eq.efficiency}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptEquipmentIntelligence;
