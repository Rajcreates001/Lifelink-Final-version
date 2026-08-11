import React from 'react';

const allocations = [
  { from: 'General Ward', to: 'ICU', resource: 'Ventilators', qty: 3, reason: 'ICU projected to exceed capacity', confidence: 96, impact: '+2 beds available', action: 'Transfer now' },
  { from: 'OPD', to: 'Emergency', resource: 'Nurses', qty: 2, reason: 'Emergency queue at 18 patients, rising', confidence: 93, impact: '-8 min wait time', action: 'Reassign' },
  { from: 'Radiology', to: 'ICU', resource: 'ECG Monitors', qty: 2, reason: 'ICU monitors at 92% utilization', confidence: 89, impact: '+4 ICU beds monitored', action: 'Transfer' },
  { from: 'Pharmacy', to: 'ER', resource: 'Emergency Drugs', qty: 40, reason: 'ER demand up 22% this shift', confidence: 91, impact: 'Stock restored 6 days', action: 'Dispatch' },
];

const ResourceAllocationEngine = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-arrows-spin text-blue-500" />Resource Allocation Engine</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {allocations.map((a, i) => (
          <div key={i} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-700">{a.from} → {a.to}</p>
                <p className="text-[8px] text-slate-400">{a.qty}× {a.resource}</p>
              </div>
              <span className="text-[9px] font-bold text-emerald-600">{a.confidence}%</span>
            </div>
            <p className="text-[8px] text-indigo-500 mt-0.5">AI: {a.reason}</p>
            <button className="w-full text-[8px] font-bold text-white bg-blue-600 py-1 rounded hover:bg-blue-700 active:scale-95 transition-all mt-1">{a.action}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceAllocationEngine;
