import React, { useState, useMemo } from 'react';

const bottlenecks = [
  { dept: 'Radiology', issue: 'Delay', primaryCause: 'MRI utilization reached 96%', secondaryCause: 'Two technicians absent', thirdCause: 'Emergency imaging requests up 31%', impact: 'Wait time will increase to 84 min', action: 'Redirect MRI requests to Hospital B', confidence: 97, severity: 'high' },
  { dept: 'Emergency', issue: 'Congestion', primaryCause: 'Incoming ambulance surge', secondaryCause: 'Limited triage staff (2 of 4 on duty)', thirdCause: '3 critical patients requiring immediate attention', impact: 'Overflow within 47 min', action: 'Activate overflow team + 3 beds', confidence: 96, severity: 'high' },
  { dept: 'ICU', issue: 'Overload', primaryCause: '3 post-surgery sepsis cases', secondaryCause: '2 patients awaiting transfer to General Ward', thirdCause: 'Ventilator usage at 80%', impact: '98% occupancy by 6 PM', action: 'Transfer 2 stable patients to General Ward', confidence: 94, severity: 'high' },
  { dept: 'Laboratory', issue: 'Backlog', primaryCause: 'Hematology analyzer maintenance', secondaryCause: '12-sample backlog from morning rush', thirdCause: 'Staff shortage (1 tech on leave)', impact: '18 min avg delay', action: 'Redirect stat samples to backup analyzer', confidence: 89, severity: 'medium' },
];

const DeptBottleneckDetector = () => {
  const [expanded, setExpanded] = useState(null);
  const sorted = useMemo(() => [...bottlenecks].sort((a, b) => b.confidence - a.confidence), []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-rose-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-triangle-exclamation text-orange-500"></i>Bottleneck Detection</h3>
          <span className="text-[10px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1"></i>AI-detected</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {sorted.map((b, idx) => (
          <div key={idx}>
            <div onClick={() => setExpanded(expanded === idx ? null : idx)} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/50 hover:bg-white/80 cursor-pointer transition-all border border-transparent hover:border-slate-100">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold text-slate-700">{b.dept}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.issue}</span>
                  <span className="text-[9px] text-slate-400 ml-auto">{b.confidence}% AI</span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{b.primaryCause}</p>
              </div>
              <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform ${expanded === idx ? 'rotate-180' : ''}`}></i>
            </div>
            {expanded === idx && (
              <div className="ml-5 mr-3 px-3 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1 animate-fade-in">
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span><span><strong>Primary:</strong> {b.primaryCause}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span><strong>Secondary:</strong> {b.secondaryCause}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-400"></span><span><strong>Contributing:</strong> {b.thirdCause}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400"></span><span><strong>Impact:</strong> {b.impact}</span></div>
                </div>
                <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <i className="fas fa-robot text-emerald-500 text-[10px]"></i>
                  <span className="text-[10px] text-emerald-700 font-medium"><strong>AI Action:</strong> {b.action}</span>
                  <button className="ml-auto text-[9px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-lg hover:bg-emerald-700 active:scale-95">Apply</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptBottleneckDetector;
