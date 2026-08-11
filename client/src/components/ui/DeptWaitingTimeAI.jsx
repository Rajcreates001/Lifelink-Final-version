import React from 'react';

const DeptWaitingTimeAI = () => {
  const depts = [
    { name: 'Emergency', current: 12, expected: 18, historical: 14, reason: 'Incoming ambulance surge (4 arriving)',
      prediction: '24 min in next hour', aiNote: 'Activate triage overflow protocol', severity: 'high' },
    { name: 'Radiology', current: 28, expected: 45, historical: 22, reason: 'MRI-2 maintenance + 2 techs absent',
      prediction: '52 min by evening', aiNote: 'Redirect non-critical MRI to CT', severity: 'high' },
    { name: 'OPD', current: 24, expected: 30, historical: 20, reason: 'Morning rush + 1 doctor on leave',
      prediction: '35 min by peak', aiNote: 'Consider teleconsult for follow-ups', severity: 'medium' },
    { name: 'Laboratory', current: 18, expected: 22, historical: 14, reason: 'Hematology analyzer backlog',
      prediction: '25 min until resolved', aiNote: 'Backup analyzer activated', severity: 'medium' },
  ];
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-clock text-amber-500"></i>Waiting Time AI</h3>
      </div>
      <div className="p-3 space-y-2">
        {depts.map((d, idx) => (
          <div key={idx} className="px-3 py-2 rounded-lg bg-white/50 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">{d.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px]"><span className="text-slate-400">Now:</span> <strong className="text-amber-600">{d.current}m</strong></span>
                <span className="text-[10px]"><span className="text-slate-400">Exp:</span> <strong className="text-red-600">{d.expected}m</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-500 mb-1">
              <span>Hist avg: {d.historical}m</span>
              <span className={'px-1 py-0.5 rounded ' + (d.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{d.severity}</span>
            </div>
            <p className="text-[9px] text-slate-600 mb-1">{d.reason}</p>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
              <i className="fas fa-robot text-indigo-400 text-[8px]"></i>
              <span className="text-[9px] text-indigo-700 font-medium">{d.aiNote}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptWaitingTimeAI;
