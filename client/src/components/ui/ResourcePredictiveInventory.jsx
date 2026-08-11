import React from 'react';

const forecasts = [
  { period: 'Today', demand: '+8%', stock: 3245, confidence: 98, status: 'Stable' },
  { period: 'Tomorrow', demand: '+12%', stock: 3120, confidence: 95, status: 'Stable' },
  { period: 'This Week', demand: '+18%', stock: 2800, confidence: 88, status: 'Watch' },
  { period: 'Next Week', demand: '+14%', stock: 2400, confidence: 82, status: 'Reorder' },
  { period: 'This Month', demand: '+22%', stock: 1800, confidence: 76, status: 'Reorder' },
  { period: 'Seasonal', demand: '+35%', stock: 1200, confidence: 68, status: 'Critical' },
];

const ResourcePredictiveInventory = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-chart-line text-violet-500" />Predictive Inventory</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {forecasts.map((f) => {
          const maxStock = 3245;
          const barPct = Math.round((f.stock / maxStock) * 100);
          return (
            <div key={f.period} className="flex items-center gap-2">
              <span className="w-16 text-[9px] font-bold text-slate-500 flex-shrink-0">{f.period}</span>
              <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden relative">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  f.status === 'Critical' ? 'bg-red-400' : f.status === 'Reorder' ? 'bg-amber-400' : f.status === 'Watch' ? 'bg-yellow-300' : 'bg-emerald-400'
                }`} style={{ width: `${barPct}%` }} />
                <span className="absolute inset-0 flex items-center px-2 text-[8px] font-bold text-white mix-blend-difference">{f.stock}</span>
              </div>
              <span className="w-12 text-right text-[9px] text-slate-500">{f.demand}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                f.status === 'Critical' ? 'bg-red-100 text-red-600' : f.status === 'Reorder' ? 'bg-amber-100 text-amber-600' : f.status === 'Watch' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-600'
              }`}>{f.confidence}%</span>
            </div>
          );
        })}
      </div>
      <div className="px-3 pb-3">
        <button className="w-full text-[9px] font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 py-1.5 rounded-xl hover:shadow-lg active:scale-95 transition-all">
          <i className="fas fa-robot mr-1" />AI Demand Forecast Report
        </button>
      </div>
    </div>
  );
};

export default ResourcePredictiveInventory;
