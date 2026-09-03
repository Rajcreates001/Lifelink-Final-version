import React, { useState } from 'react';

const anomalies = [
  { dept: 'Radiology', type: 'Unexpected Delay', detail: 'MRI-2 utilization spiked to 96% (avg: 72%)',
    impact: 'Wait time increased by 22 min', icon: 'fa-clock', color: 'text-orange-500', bg: 'bg-orange-50' },
  { dept: 'Emergency', type: 'Patient Surge', detail: '12 admissions in 2h (avg: 6)',
    impact: 'Overflow expected in 47 min', icon: 'fa-ambulance', color: 'text-red-500', bg: 'bg-red-50' },
  { dept: 'General Ward', type: 'Resource Waste', detail: '14 unused antibiotic doses expired',
    impact: '$420 inventory loss', icon: 'fa-trash', color: 'text-amber-500', bg: 'bg-amber-50' },
  { dept: 'Laboratory', type: 'Equipment Issue', detail: 'Hematology analyzer calibration drift',
    impact: '12 samples need retesting', icon: 'fa-flask', color: 'text-purple-500', bg: 'bg-purple-50' },
  { dept: 'ICU', type: 'Staff Overload', detail: 'Nurse-to-patient ratio at 1:4 (target 1:2)',
    impact: 'Burnout risk elevated', icon: 'fa-user-nurse', color: 'text-rose-500', bg: 'bg-rose-50' },
];

const DeptAnomalyDetector = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-shield text-red-500"></i>Department Anomalies</h3>
          <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">{anomalies.length} active</span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {anomalies.map((a, idx) => (
          <div key={idx}>
            <div onClick={() => setExpanded(expanded === idx ? null : idx)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 cursor-pointer transition-all border border-transparent hover:border-slate-100">
              <div className={'w-6 h-6 rounded-lg ' + a.bg + ' flex items-center justify-center ' + a.color}><i className={'fas ' + a.icon + ' text-[10px]'}></i></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-slate-700">{a.dept}</span><span className="text-[9px] font-semibold text-indigo-600">{a.type}</span></div>
                <p className="text-[9px] text-slate-500 truncate">{a.detail}</p>
              </div>
              <i className={'fas fa-chevron-down text-[8px] text-slate-400 transition-transform ' + (expanded === idx ? 'rotate-180' : '')}></i>
            </div>
            {expanded === idx && (
              <div className="ml-8 mr-2 px-2.5 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1 animate-fade-in">
                <p className="text-[9px] text-slate-600"><strong>Impact:</strong> {a.impact}</p>
                <p className="text-[9px] text-slate-600"><strong>AI Suggestion:</strong> {a.dept === 'Radiology' ? 'Schedule MRI-2 maintenance and redistribute workload' : a.dept === 'Emergency' ? 'Activate surge protocol and call in backup staff' : 'Review inventory management process'}.</p>
                <button onClick={() => alert('Resolving anomaly in ' + a.dept + ': ' + a.type + '\n' + a.detail)} className="mt-1 text-[8px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-700 active:scale-95">Resolve</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptAnomalyDetector;
