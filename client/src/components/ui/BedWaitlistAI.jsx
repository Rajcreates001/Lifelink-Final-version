import React, { useState } from 'react';

const waitlist = [
  { priority: 'Critical', patient: 'John D.', condition: 'Cardiac arrest', waitTime: '0 min', bed: 'ICU-12', suggestion: 'Admit immediately', aiReason: 'ECG shows STEMI. Requires ICU bed with telemetry.', confidence: 98 },
  { priority: 'High', patient: 'Sarah M.', condition: 'Severe pneumonia', waitTime: '12 min', bed: 'ICU-08', suggestion: 'Admit within 30 min', aiReason: 'SpO2 dropping. Needs isolation bed.', confidence: 95 },
  { priority: 'Medium', patient: 'Raj K.', condition: 'Fractured hip', waitTime: '28 min', bed: 'Surgery-05', suggestion: 'Admit within 1 hr', aiReason: 'Stable for surgery ward. Pre-op prep needed.', confidence: 91 },
  { priority: 'Low', patient: 'Emma W.', condition: 'Migraine', waitTime: '45 min', bed: 'GW-22', suggestion: 'Admit within 2 hrs', aiReason: 'Responding to medication. General ward sufficient.', confidence: 87 },
];

const BedWaitlistAI = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-clock text-amber-500" />Waitlist AI</h3>
        <span className="text-[9px] text-amber-500 font-semibold">{waitlist.length} waiting</span>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {waitlist.map((w, i) => (
          <div key={i} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${w.priority === 'Critical' ? 'bg-red-500' : w.priority === 'High' ? 'bg-amber-500' : w.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate">{w.patient} - {w.condition}</p>
                  <p className="text-[8px] text-slate-400">Waiting {w.waitTime} • {w.bed}</p>
                </div>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${w.priority === 'Critical' ? 'bg-red-100 text-red-600' : w.priority === 'High' ? 'bg-amber-100 text-amber-600' : w.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'}`}>{w.priority}</span>
            </div>
            {expanded === i && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] space-y-1 animate-fade-in">
                <p><span className="font-semibold text-slate-600">AI reasoning:</span> {w.aiReason}</p>
                <p><span className="font-semibold text-slate-600">Suggestion:</span> {w.suggestion} <span className="text-emerald-600">({w.confidence}% conf)</span></p>
                <div className="flex gap-1 mt-1">
                  <button className="flex-1 text-[9px] font-bold text-white bg-emerald-600 py-1 rounded hover:bg-emerald-700 active:scale-95 transition-all">Assign Bed</button>
                  <button className="flex-1 text-[9px] font-bold text-slate-600 bg-slate-100 py-1 rounded hover:bg-slate-200 active:scale-95 transition-all">Escalate</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BedWaitlistAI;
