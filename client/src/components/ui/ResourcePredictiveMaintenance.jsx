import React from 'react';

const maintenance = [
  { equipment: 'MRI-2', failureProb: 68, downtime: '4h', parts: 'Cooling fan', tech: 'Siemens Tech', cost: '$2,400', duration: '3h', impact: '12 scans delayed', confidence: 92, autoSched: 'Tomorrow 8AM' },
  { equipment: 'ECG-1', failureProb: 22, downtime: '1h', parts: 'Lead wires', tech: 'In-house', cost: '$350', duration: '45 min', impact: 'Minor delay', confidence: 85, autoSched: 'Next week' },
  { equipment: 'Vent-B', failureProb: 12, downtime: '30 min', parts: 'Filter', tech: 'In-house', cost: '$120', duration: '20 min', impact: 'Minimal', confidence: 88, autoSched: '2 weeks' },
  { equipment: 'US-1', failureProb: 42, downtime: '2h', parts: 'Transducer', tech: 'GE Tech', cost: '$1,800', duration: '2h', impact: '4 scans delayed', confidence: 90, autoSched: 'In progress' },
];

const ResourcePredictiveMaintenance = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-wrench text-amber-500" />Predictive Maintenance</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {maintenance.map((m) => (
          <div key={m.equipment} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${m.failureProb >= 50 ? 'bg-red-500' : m.failureProb >= 25 ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                <span className="text-[10px] font-bold text-slate-700">{m.equipment}</span>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${m.failureProb >= 50 ? 'bg-red-100 text-red-700' : m.failureProb >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{m.failureProb}% risk</span>
            </div>
            <p className="text-[8px] text-slate-400">{m.parts} · {m.cost} · {m.duration}</p>
            <p className="text-[8px] text-indigo-500 mt-0.5">AI: Schedule {m.autoSched} · {m.confidence}% conf</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourcePredictiveMaintenance;
