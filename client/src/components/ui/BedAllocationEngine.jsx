import React, { useState } from 'react';

const mockBeds = [
  { id: 'ICU-12', ward: 'ICU', score: 94, reason: 'Nearest ICU with ventilator', distance: '12m', eta: '4 min' },
  { id: 'ICU-08', ward: 'ICU', score: 88, reason: 'Available, isolation capable', distance: '18m', eta: '6 min' },
  { id: 'ER-22', ward: 'Emergency', score: 76, reason: 'Observation bed, 2 nurses assigned', distance: '5m', eta: '2 min' },
  { id: 'GW-45', ward: 'General Ward', score: 65, reason: 'General bed, no isolation', distance: '22m', eta: '8 min' },
  { id: 'ICU-15', ward: 'ICU', score: 92, reason: 'ICU bed, awaiting discharge', distance: '15m', eta: '5 min' },
];

const BedAllocationEngine = () => {
  const [search, setSearch] = useState('');
  const filtered = mockBeds.filter(b => b.id.toLowerCase().includes(search.toLowerCase()) || b.ward.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-microchip text-emerald-500" />AI Bed Allocation Engine</h3>
      </div>
      <div className="p-3 space-y-3">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white/80 text-xs focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" placeholder="Search patient or bed..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {filtered.map((b, i) => (
            <div key={b.id} className="relative flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-600 font-bold text-[10px]">#{i + 1}</div>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] font-bold flex items-center justify-center">{b.score}%</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{b.id}</p>
                  <p className="text-[9px] text-slate-400">{b.ward}</p>
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-400 flex-shrink-0">
                <p className="font-semibold text-emerald-600">{b.distance}</p>
                <p>{b.eta}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-slate-100">
          <button className="w-full text-[10px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 py-2 rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all">
            <i className="fas fa-robot mr-1" />AI Auto-Assign Best Bed
          </button>
        </div>
      </div>
    </div>
  );
};

export default BedAllocationEngine;
