import React, { useMemo } from 'react';

const DeptResourceOptimizer = () => {
  const recommendations = useMemo(() => [
    { action: 'Move 2 nurses to Emergency', reason: 'Current load 24 patients / 4 nurses (6:1 ratio vs target 4:1)', benefit: 'Reduce wait time by 32%', risk: 'Low', financial: 'No additional cost', confidence: 94 },
    { action: 'Transfer 2 ICU patients to General Ward', reason: 'ICU at 91% occupancy with 3 stable patients ready for transfer', benefit: 'Reduce ICU to 78% occupancy', risk: 'Low', financial: 'Saves $2K/day in ICU costs', confidence: 92 },
    { action: 'Delay 1 elective surgery', reason: 'OT schedule overbooked by 2 cases', benefit: 'Reduce OT overtime by 18%', risk: 'Medium (patient rescheduling)', financial: 'Saves $4K overtime', confidence: 88 },
    { action: 'Open overflow ward (Wing C)', reason: 'Emergency admissions up 31% in last 6h', benefit: 'Add 12 beds capacity', risk: 'Medium (staff reallocation)', financial: 'Costs $3K to activate', confidence: 91 },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-wand-magic-sparkles text-teal-500"></i>Resource Optimization</h3>
      </div>
      <div className="p-3 space-y-2">
        {recommendations.map((r, idx) => (
          <div key={idx} className="px-3 py-2 rounded-lg bg-white/50 border border-slate-100 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">{r.action}</span>
              <div className="flex items-center gap-1.5">
                <span className={'px-1 py-0.5 rounded text-[8px] font-bold ' + (r.risk === 'Low' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{r.risk}</span>
                <span className="px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-bold">{r.confidence}%</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 truncate">{r.reason}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[8px] text-emerald-600 font-semibold">{r.benefit}</span>
              <span className="text-[8px] text-slate-400">{r.financial}</span>
            </div>
            <button className="mt-1.5 w-full text-[9px] font-bold text-white bg-indigo-600 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">
              <i className="fas fa-check text-[7px] mr-1"></i>Approve & Execute
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptResourceOptimizer;
