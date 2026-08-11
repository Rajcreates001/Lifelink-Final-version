import React, { useState } from 'react';

const initialEvents = [
  { time: '09:12', icon: 'fa-user-injured', color: 'blue', text: 'Patient admitted', detail: 'John D. - Cardiology' },
  { time: '09:14', icon: 'fa-bed', color: 'indigo', text: 'Bed assigned', detail: 'ICU-12 allocated' },
  { time: '09:18', icon: 'fa-robot', color: 'purple', text: 'AI recommendation', detail: 'Activate overflow protocol' },
  { time: '09:21', icon: 'fa-broom', color: 'emerald', text: 'Cleaning completed', detail: 'ER-08 ready in 12 min' },
  { time: '09:24', icon: 'fa-arrow-right-arrow-left', color: 'amber', text: 'Transfer requested', detail: 'ICU > General Ward' },
  { time: '09:27', icon: 'fa-triangle-exclamation', color: 'red', text: 'Bottleneck detected', detail: 'ICU discharge delayed' },
  { time: '09:32', icon: 'fa-door-open', color: 'green', text: 'Discharged', detail: 'Sarah M. - Recovered' },
  { time: '09:35', icon: 'fa-bell', color: 'rose', text: 'Nurse notified', detail: 'Backup staff requested' },
];

const BedTimeline = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-timeline text-slate-500" />Live Timeline</h3>
        <span className="text-[9px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1" />Live</span>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {initialEvents.map((ev, i) => {
          const colorMap = { blue: 'text-blue-500 bg-blue-100', indigo: 'text-indigo-500 bg-indigo-100', purple: 'text-purple-500 bg-purple-100', emerald: 'text-emerald-500 bg-emerald-100', amber: 'text-amber-500 bg-amber-100', red: 'text-red-500 bg-red-100', green: 'text-green-500 bg-green-100', rose: 'text-rose-500 bg-rose-100' };
          const c = colorMap[ev.color] || 'text-slate-500 bg-slate-100';
          return (
            <div key={i} className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${c} text-[9px]`}>
                  <i className={`fas ${ev.icon}`} />
                </div>
                {i < initialEvents.length - 1 && <div className="w-px h-4 bg-slate-200" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-700">{ev.text}</p>
                  <span className="text-[8px] text-slate-400">{ev.time}</span>
                </div>
                <p className="text-[8px] text-slate-400">{ev.detail}</p>
                {expanded === i && (
                  <div className="mt-1 p-1.5 rounded bg-indigo-50 text-[8px] text-indigo-600 animate-fade-in">
                    AI: Normal operation. No intervention required.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BedTimeline;
