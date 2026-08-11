import React from 'react';

const costs = [
  { department: 'ICU', daily: '$48,200', waste: '$1,240', unused: '$3,200', expired: '$420', efficiency: 86, savings: '$8,400', rec: 'Review ventilator utilization' },
  { department: 'Emergency', daily: '$32,800', waste: '$2,100', unused: '$1,800', expired: '$680', efficiency: 74, savings: '$6,200', rec: 'Optimize drug ordering' },
  { department: 'Radiology', daily: '$22,400', waste: '$980', unused: '$2,400', expired: '$210', efficiency: 82, savings: '$4,800', rec: 'Schedule off-peak scans' },
  { department: 'General Ward', daily: '$28,600', waste: '$620', unused: '$1,200', expired: '$340', efficiency: 91, savings: '$3,200', rec: 'Consolidate supply orders' },
];

const ResourceCostOptimization = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-sack-dollar text-emerald-500" />Cost Optimization Engine</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {costs.map((c) => (
          <div key={c.department} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-700">{c.department}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${c.efficiency >= 85 ? 'bg-emerald-100 text-emerald-700' : c.efficiency >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.efficiency}% eff</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[8px] text-slate-400">
              <span>Daily: {c.daily}</span>
              <span>Waste: {c.waste}</span>
              <span>Expired: {c.expired}</span>
            </div>
            <p className="text-[8px] text-emerald-600 mt-0.5">AI: {c.rec} · Savings: {c.savings}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceCostOptimization;
