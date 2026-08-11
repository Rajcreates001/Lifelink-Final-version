import React, { useState, useEffect } from 'react';

const stages = [
  { id: 'admission', label: 'Admission', icon: 'fa-door-open', color: 'text-sky-500', bg: 'bg-sky-100', count: 8 },
  { id: 'waiting', label: 'Waiting', icon: 'fa-hourglass-half', color: 'text-amber-500', bg: 'bg-amber-100', count: 12 },
  { id: 'diagnosis', label: 'Diagnosis', icon: 'fa-stethoscope', color: 'text-blue-500', bg: 'bg-blue-100', count: 18 },
  { id: 'lab', label: 'Lab', icon: 'fa-flask', color: 'text-purple-500', bg: 'bg-purple-100', count: 14 },
  { id: 'radiology', label: 'Radiology', icon: 'fa-x-ray', color: 'text-orange-500', bg: 'bg-orange-100', count: 10 },
  { id: 'treatment', label: 'Treatment', icon: 'fa-syringe', color: 'text-teal-500', bg: 'bg-teal-100', count: 24 },
  { id: 'icu', label: 'ICU', icon: 'fa-heart-pulse', color: 'text-rose-500', bg: 'bg-rose-100', count: 6 },
  { id: 'discharge', label: 'Discharge', icon: 'fa-house-chimney', color: 'text-emerald-500', bg: 'bg-emerald-100', count: 4 },
];

const DeptPatientFlow = () => {
  const [counts, setCounts] = useState(stages.map(s => s.count));
  useEffect(() => {
    const t = setInterval(() => {
      setCounts((prev) => prev.map(c => Math.max(1, c + Math.round((Math.random() - 0.5) * 4))));
    }, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-sky-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-people-arrows text-cyan-500"></i>Patient Flow Engine</h3>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Live</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {stages.map((s, idx) => (
            <div key={s.id} className="flex flex-col items-center flex-shrink-0 min-w-[60px]">
              <div className={'w-10 h-10 rounded-xl ' + s.bg + ' flex items-center justify-center ' + s.color + ' border border-white shadow-sm'}>
                <i className={'fas ' + s.icon + ' text-sm'}></i>
              </div>
              <p className="text-[9px] font-bold text-slate-700 mt-1">{counts[idx]}</p>
              <p className="text-[7px] text-slate-400 uppercase tracking-wider">{s.label}</p>
              {idx < stages.length - 1 && <div className="w-4 h-0.5 bg-slate-200 mt-2" />}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
          <i className="fas fa-robot text-indigo-400 text-[10px]"></i>
          <p className="text-[10px] text-indigo-700 font-medium"><strong>AI:</strong> Bottleneck detected at <strong>Diagnosis</strong> — consider adding 1 additional physician.</p>
        </div>
      </div>
    </div>
  );
};

export default DeptPatientFlow;
