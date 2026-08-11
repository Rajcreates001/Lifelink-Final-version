import React, { useState, useEffect } from 'react';

const initialPriorities = [
  {
    id: 'p1', severity: 'high', department: 'Emergency',
    reason: 'Emergency queue predicted to exceed capacity in 47 minutes',
    financialImpact: '$12K potential loss', patientImpact: '6 patients at risk',
    risk: 'Critical', action: 'Activate overflow team',
    confidence: 0.98, expanded: false,
  },
  {
    id: 'p2', severity: 'medium', department: 'ICU',
    reason: 'ICU occupancy at 91% — expected to reach 98% by 6 PM',
    financialImpact: '$8K potential loss', patientImpact: '3 critical patients',
    risk: 'High', action: 'Transfer 2 stable patients to General Ward',
    confidence: 0.94, expanded: false,
  },
  {
    id: 'p3', severity: 'medium', department: 'Radiology',
    reason: 'Turnaround time increased by 28% — backlog of 12 scans',
    financialImpact: '$4K delay cost', patientImpact: 'Diagnostic delays for 8 patients',
    risk: 'Medium', action: 'Add 1 additional radiologist for evening shift',
    confidence: 0.89, expanded: false,
  },
  {
    id: 'p4', severity: 'low', department: 'Blood Bank',
    reason: 'O Negative inventory may become critical within 12 hours',
    financialImpact: '$2K shortage risk', patientImpact: 'Emergency surgery prep',
    risk: 'Medium', action: 'Request 4 units from regional blood bank',
    confidence: 0.86, expanded: false,
  },
  {
    id: 'p5', severity: 'high', department: 'Nursing',
    reason: 'AI detected possible staff shortage tonight — 3 call-offs expected',
    financialImpact: '$6K overtime cost', patientImpact: 'Ward B understaffed by 4 nurses',
    risk: 'High', action: 'Reallocate 2 nurses from General Ward to Emergency',
    confidence: 0.92, expanded: false,
  },
];

const ExecutivePriorityCenter = () => {
  const [priorities, setPriorities] = useState(initialPriorities);
  const [resolved, setResolved] = useState(new Set());

  // Simulate periodic updates to keep it live
  useEffect(() => {
    const timer = setInterval(() => {
      setPriorities((prev) => prev.map((p) => ({
        ...p,
        confidence: Math.max(0.7, Math.min(0.99, p.confidence + (Math.random() - 0.5) * 0.04)),
      })));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleResolve = (id) => {
    setResolved((prev) => new Set([...prev, id]));
  };

  const activePriorities = priorities.filter((p) => !resolved.has(p.id));

  if (!activePriorities.length) {
    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 p-5 text-center animate-fade-in-up">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <i className="fas fa-check-circle text-emerald-500 text-2xl"></i>
        </div>
        <p className="text-sm font-bold text-slate-800">All priorities resolved</p>
        <p className="text-xs text-slate-500 mt-1">LifeLink AI is monitoring for new issues.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-rose-500/10 to-amber-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h3 className="text-sm font-bold text-slate-800 font-display">
              AI Priority Center
            </h3>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              {activePriorities.length} active
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Auto-detected by AI</span>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {activePriorities.map((p, idx) => (
          <div
            key={p.id}
            style={{ animationDelay: `${idx * 80}ms` }}
            className="relative rounded-xl border bg-white/60 hover:bg-white/90 transition-all duration-200 animate-fade-in-up group"
          >
            {/* Severity bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
              p.severity === 'high' ? 'bg-gradient-to-b from-red-500 to-rose-500' :
              p.severity === 'medium' ? 'bg-gradient-to-b from-amber-500 to-orange-500' :
              'bg-gradient-to-b from-blue-500 to-sky-500'
            }`} />

            <div className="pl-3 pr-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      p.severity === 'high' ? 'bg-red-100 text-red-700' :
                      p.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {p.severity === 'high' ? 'High Priority' : p.severity === 'medium' ? 'Medium' : 'Low'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800">{p.department}</span>
                    <span className="px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-100">
                      {Math.round(p.confidence * 100)}% AI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">{p.reason}</p>
                </div>
                <button
                  onClick={() => handleResolve(p.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 active:scale-90 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  title="Resolve priority"
                >
                  <i className="fas fa-check text-xs"></i>
                </button>
              </div>

              {/* Expanded details */}
              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                <div>
                  <span className="text-slate-400">Financial Impact:</span>
                  <span className="font-semibold text-slate-700 ml-1">{p.financialImpact}</span>
                </div>
                <div>
                  <span className="text-slate-400">Patient Impact:</span>
                  <span className="font-semibold text-slate-700 ml-1">{p.patientImpact}</span>
                </div>
                <div>
                  <span className="text-slate-400">Risk Level:</span>
                  <span className={`font-semibold ml-1 ${
                    p.risk === 'Critical' ? 'text-red-600' : p.risk === 'High' ? 'text-amber-600' : 'text-slate-700'
                  }`}>{p.risk}</span>
                </div>
                <div>
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-semibold text-indigo-600 ml-1">{Math.round(p.confidence * 100)}%</span>
                </div>
              </div>

              {/* Recommended action */}
              <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                <i className="fas fa-robot text-indigo-400 text-[10px]"></i>
                <p className="text-[10px] text-indigo-700 font-semibold">
                  <span className="text-indigo-400">AI suggests:</span> {p.action}
                </p>
                <button className="ml-auto text-[9px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 active:scale-95 transition-all duration-200 whitespace-nowrap">
                  Apply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecutivePriorityCenter;
