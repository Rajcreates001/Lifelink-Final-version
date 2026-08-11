import React, { useMemo, useState } from 'react';

const DeptForecast = () => {
  const forecasts = useMemo(() => [
    { label: 'Patients', current: 42, forecast: 58, range: 'Next 6h', risk: 'elevated' },
    { label: 'Admissions', current: 12, forecast: 18, range: 'Next 6h', risk: 'elevated' },
    { label: 'Discharges', current: 8, forecast: 14, range: 'Next 6h', risk: 'normal' },
    { label: 'Emergency', current: 18, forecast: 24, range: 'Next 4h', risk: 'high' },
    { label: 'Bed Occupancy', current: 78, forecast: 89, range: 'By 6 PM', risk: 'high', unit: '%' },
    { label: 'Wait Time', current: 24, forecast: 38, range: 'By 8 PM', risk: 'elevated', unit: ' min' },
  ], []);
  const rc = { high: 'text-red-600 bg-red-50', elevated: 'text-amber-600 bg-amber-50', normal: 'text-emerald-600 bg-emerald-50' };
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-chart-line text-sky-500"></i>Department Forecast</h3>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {forecasts.map((f, idx) => (
          <div key={idx} className="px-3 py-2 rounded-xl bg-white/50 border border-slate-100 group hover:bg-white/80 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-600">{f.label}</span>
              <span className={'px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ' + (rc[f.risk] || rc.normal)}>{f.risk}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-base font-extrabold text-slate-800">{f.current}{f.unit || ''}</span>
              <span className="text-[10px] text-slate-400">&rarr;</span>
              <span className="text-sm font-bold text-indigo-600">{f.forecast}{f.unit || ''}</span>
              <span className="text-[9px] text-slate-400 ml-auto">{f.range}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={'h-full rounded-full ' + (f.risk === 'high' ? 'bg-red-400' : f.risk === 'elevated' ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: Math.min(100, Math.round((f.current / f.forecast) * 100)) + '%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptForecast;
