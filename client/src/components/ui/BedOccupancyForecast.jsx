import React from 'react';

const timeframes = ['30 min', '1 hr', '6 hr', '12 hr', '24 hr', '7 days'];
const data = [
  { admissions: 3, discharges: 1, transfers: 2, emergency: 4, occupancy: 72, confidence: 98 },
  { admissions: 7, discharges: 3, transfers: 4, emergency: 8, occupancy: 76, confidence: 95 },
  { admissions: 18, discharges: 12, transfers: 6, emergency: 22, occupancy: 84, confidence: 89 },
  { admissions: 28, discharges: 18, transfers: 9, emergency: 30, occupancy: 88, confidence: 82 },
  { admissions: 42, discharges: 35, transfers: 14, emergency: 48, occupancy: 91, confidence: 76 },
  { admissions: 180, discharges: 160, transfers: 55, emergency: 210, occupancy: 87, confidence: 68 },
];

const BedOccupancyForecast = () => {
  const maxOcc = Math.max(...data.map(d => d.occupancy));
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-chart-line text-blue-500" />Occupancy Forecast</h3>
        <span className="text-[9px] text-slate-400"><i className="fas fa-robot text-[8px] mr-1" />AI predictions</span>
      </div>
      <div className="p-3 space-y-3">
        {timeframes.map((tf, i) => {
          const d = data[i];
          const pct = Math.round((d.occupancy / maxOcc) * 100);
          const color = d.occupancy >= 88 ? 'rose' : d.occupancy >= 78 ? 'amber' : 'emerald';
          return (
            <div key={tf} className="flex items-center gap-3">
              <span className="w-12 text-[10px] font-bold text-slate-500 flex-shrink-0">{tf}</span>
              <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden relative">
                <div className={`h-full rounded-full bg-gradient-to-r from-${color}-400 to-${color}-500 transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-[10px] font-bold text-slate-700">{d.occupancy}%</span>
              <span className="w-10 text-right text-[8px] text-slate-400">{d.confidence}%</span>
            </div>
          );
        })}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <div className="text-center"><p className="text-[9px] text-slate-400">Admissions</p><p className="text-xs font-bold text-rose-500">↑+180</p></div>
          <div className="text-center"><p className="text-[9px] text-slate-400">Discharges</p><p className="text-xs font-bold text-emerald-500">↓-160</p></div>
          <div className="text-center"><p className="text-[9px] text-slate-400">Shortage Risk</p><p className="text-xs font-bold text-amber-500">12%</p></div>
        </div>
      </div>
    </div>
  );
};

export default BedOccupancyForecast;
