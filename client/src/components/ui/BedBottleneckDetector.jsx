import React, { useState } from 'react';

const bottlenecks = [
  { id: 1, dept: 'ICU', issue: 'Blocked discharge - awaiting insurance approval', severity: 'High', impact: '3 beds blocked', root: 'Insurance delay with United Health', evidence: '2 pending approvals since 8:00 AM', action: 'Escalate to insurance liaison', confidence: 96, expected: '+2 beds in 30 min' },
  { id: 2, dept: 'Emergency', issue: 'Delayed cleaning - overflow patients waiting', severity: 'High', impact: '5 beds unavailable', root: 'Cleaning team Gamma delayed', evidence: 'COVID-19 sanitization protocol', action: 'Activate backup cleaning team', confidence: 93, expected: '+4 beds in 20 min' },
  { id: 3, dept: 'General', issue: 'Doctor unavailable for discharge orders', severity: 'Medium', impact: '6 patients delayed', root: 'Dr. Sharma in surgery until 2 PM', evidence: 'No covering physician assigned', action: 'Assign covering doctor', confidence: 89, expected: '+6 beds in 1 hr' },
  { id: 4, dept: 'Radiology', issue: 'MRI-2 under maintenance - imaging backlog', severity: 'Medium', impact: '4 patients waiting', root: 'Scheduled maintenance extended', evidence: 'Part replacement delayed', action: 'Redirect to CT scanner', confidence: 91, expected: 'Wait time -15 min' },
];

const BedBottleneckDetector = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-traffic-cone text-red-500" />Bottleneck Detector</h3>
        <span className="text-[9px] text-red-400 font-semibold">4 active</span>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {bottlenecks.map((b) => (
          <div key={b.id} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate">{b.dept}: {b.issue}</p>
                  <p className="text-[8px] text-slate-400">{b.impact}</p>
                </div>
              </div>
              <i className={`fas fa-chevron-down text-[8px] text-slate-400 transition-transform ${expanded === b.id ? 'rotate-180' : ''}`} />
            </div>
            {expanded === b.id && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 text-[9px] animate-fade-in">
                <p><span className="font-semibold text-slate-600">Root cause:</span> {b.root}</p>
                <p><span className="font-semibold text-slate-600">Evidence:</span> {b.evidence}</p>
                <p><span className="font-semibold text-slate-600">AI action:</span> {b.action} <span className="text-emerald-600">({b.confidence}% conf)</span></p>
                <p><span className="font-semibold text-slate-600">Expected:</span> {b.expected}</p>
                <button className="w-full text-[9px] font-bold text-white bg-indigo-600 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all mt-1">Resolve with AI</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BedBottleneckDetector;
