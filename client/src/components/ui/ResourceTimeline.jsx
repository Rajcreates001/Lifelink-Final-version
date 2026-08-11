import React, { useState } from 'react';

const events = [
  { time: '08:00', icon: 'fa-truck', color: 'blue', text: 'PPE order delivered', detail: '400 kits from ShieldCo' },
  { time: '08:12', icon: 'fa-wrench', color: 'amber', text: 'MRI-2 maintenance scheduled', detail: 'Cooling fan replacement' },
  { time: '08:24', icon: 'fa-robot', color: 'purple', text: 'AI detected stock issue', detail: 'O Negative blood critically low' },
  { time: '08:35', icon: 'fa-cart-plus', color: 'emerald', text: 'Purchase order created', detail: 'PO-2024-02 for 80 units' },
  { time: '08:48', icon: 'fa-arrow-right-arrow-left', color: 'indigo', text: 'Ventilator transferred', detail: 'ICU → Emergency' },
  { time: '09:00', icon: 'fa-exclamation-triangle', color: 'red', text: 'Critical watch updated', detail: '4 items below threshold' },
  { time: '09:12', icon: 'fa-chart-line', color: 'teal', text: 'Demand forecast refreshed', detail: '+18% this week' },
  { time: '09:24', icon: 'fa-check-circle', color: 'green', text: 'Supplier score updated', detail: 'PharmaQuick: 98% reliability' },
];

const ResourceTimeline = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-timeline text-slate-500" />Resource Timeline</h3>
        <span className="text-[9px] text-slate-400">Live</span>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {events.map((ev, i) => {
          const colors = { blue: 'text-blue-500 bg-blue-100', amber: 'text-amber-500 bg-amber-100', purple: 'text-purple-500 bg-purple-100', emerald: 'text-emerald-500 bg-emerald-100', indigo: 'text-indigo-500 bg-indigo-100', red: 'text-red-500 bg-red-100', teal: 'text-teal-500 bg-teal-100', green: 'text-green-500 bg-green-100' };
          const c = colors[ev.color] || 'text-slate-500 bg-slate-100';
          return (
            <div key={i} className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${c} text-[9px]`}><i className={`fas ${ev.icon}`} /></div>
                {i < events.length - 1 && <div className="w-px h-4 bg-slate-200" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-700">{ev.text}</p>
                  <span className="text-[8px] text-slate-400">{ev.time}</span>
                </div>
                <p className="text-[8px] text-slate-400">{ev.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResourceTimeline;
