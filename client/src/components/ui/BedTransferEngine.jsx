import React, { useState } from 'react';

const hospitals = [
  { name: 'City General', beds: 8, icu: 3, distance: '4.2 km', travel: '12 min', match: 92 },
  { name: 'St. Mary\'s', beds: 5, icu: 2, distance: '6.8 km', travel: '18 min', match: 85 },
  { name: 'University Hospital', beds: 12, icu: 6, distance: '9.1 km', travel: '22 min', match: 78 },
  { name: 'Regional Medical', beds: 3, icu: 1, distance: '14.5 km', travel: '28 min', match: 64 },
];

const BedTransferEngine = () => {
  const [selected, setSelected] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-rose-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-arrow-right-arrow-left text-orange-500" />AI Transfer Engine</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {hospitals.map((h) => (
          <div key={h.name} onClick={() => setSelected(selected === h.name ? null : h.name)}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
              selected === h.name ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-orange-200'
            }`}
          >
            <div>
              <p className="text-xs font-bold text-slate-800">{h.name}</p>
              <p className="text-[9px] text-slate-400">{h.beds} beds • {h.icu} ICU • {h.distance}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-emerald-600">{h.match}%</p>
              <p className="text-[8px] text-slate-400">{h.travel}</p>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
            <p className="text-[10px] font-semibold text-indigo-700">Transfer to {selected}</p>
            <p className="text-[9px] text-slate-500">Insurance compatible • Specialist available • Bed ready in 8 min</p>
            <button onClick={() => alert('Approving transfer to ' + selected + '...\nInsurance compatible, specialist available, bed ready in 8 min.')} className="w-full text-[10px] font-bold text-white bg-indigo-600 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">
              <i className="fas fa-check mr-1" />Approve Transfer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedTransferEngine;
