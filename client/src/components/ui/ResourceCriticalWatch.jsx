import React, { useState } from 'react';

const criticalItems = [
  { resource: 'O Negative Blood', urgency: 'Critical', depts: 'ICU, ER', patients: 6, exhaustion: '6 days', rec: 'Order 80 units urgently', supplier: 'BloodBank', eta: '1 day', confidence: 97 },
  { resource: 'PPE Kits', urgency: 'High', depts: 'All', patients: 180, exhaustion: '12 days', rec: 'Order 400 kits', supplier: 'ShieldCo', eta: '2 days', confidence: 94 },
  { resource: 'Ventilator Filters', urgency: 'High', depts: 'ICU, ER', patients: 18, exhaustion: '8 days', rec: 'Order 60 filters', supplier: 'MedSupply', eta: '3 days', confidence: 91 },
  { resource: 'Emergency Drugs', urgency: 'Medium', depts: 'ER, ICU', patients: 24, exhaustion: '14 days', rec: 'Order 200 units', supplier: 'PharmaQuick', eta: '3 days', confidence: 88 },
];

const ResourceCriticalWatch = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-exclamation-triangle text-red-500" />Critical Resource Watch</h3>
        <span className="text-[9px] text-red-500 font-bold">{criticalItems.length} alerts</span>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {criticalItems.map((c, i) => (
          <div key={i} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.urgency === 'Critical' ? 'bg-red-500' : c.urgency === 'High' ? 'bg-amber-500' : 'bg-yellow-500'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate">{c.resource}</p>
                  <p className="text-[8px] text-slate-400">Exhaustion in {c.exhaustion}</p>
                </div>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${c.urgency === 'Critical' ? 'bg-red-100 text-red-600' : c.urgency === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-yellow-100 text-yellow-700'}`}>{c.urgency}</span>
            </div>
            {expanded === i && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] space-y-1 animate-fade-in">
                <p><span className="text-slate-400">Departments:</span> {c.depts} · <span className="text-slate-400">Patients at risk:</span> {c.patients}</p>
                <p><span className="text-slate-400">AI recommendation:</span> {c.rec}</p>
                <p><span className="text-slate-400">Supplier:</span> {c.supplier} · ETA: {c.eta} · <span className="text-emerald-600">{c.confidence}% conf</span></p>
                <button className="w-full text-[9px] font-bold text-white bg-indigo-600 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">Place Urgent Order</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceCriticalWatch;
