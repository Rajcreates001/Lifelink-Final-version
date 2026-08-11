import React, { useMemo } from 'react';

const DeptTimeline = () => {
  const events = useMemo(() => [
    { time: '09:14', event: 'Radiology utilization exceeded threshold (96%)', icon: 'fa-x-ray', color: 'text-orange-500' },
    { time: '09:17', event: 'AI predicted 22 min delay in Radiology', icon: 'fa-clock', color: 'text-amber-500' },
    { time: '09:18', event: 'Backup technician requested for MRI-2', icon: 'fa-user-cog', color: 'text-blue-500' },
    { time: '09:21', event: 'Emergency activated overflow protocol', icon: 'fa-ambulance', color: 'text-red-500' },
    { time: '08:45', event: 'ICU patient #8842 flagged for deterioration', icon: 'fa-heart-pulse', color: 'text-rose-500' },
    { time: '08:30', event: 'Morning shift change - 14 nurses reported', icon: 'fa-user-nurse', color: 'text-purple-500' },
    { time: '08:12', event: 'Bed occupancy report generated for all departments', icon: 'fa-bed', color: 'text-sky-500' },
    { time: '07:55', event: 'AI staffing recommendation sent to CEO dashboard', icon: 'fa-robot', color: 'text-indigo-500' },
  ], []);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-clock-rotate-left text-slate-500"></i>Department Timeline</h3>
      </div>
      <div className="p-3 max-h-[260px] overflow-y-auto space-y-0.5">
        {events.map((e, idx) => (
          <div key={idx} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-all">
            <div className="flex flex-col items-center">
              <div className={'w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center ' + e.color}><i className={'fas ' + e.icon + ' text-[8px]'}></i></div>
              {idx < events.length - 1 && <div className="w-px h-3 bg-slate-200" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className="text-[8px] font-medium text-slate-400">{e.time}</span><p className="text-[10px] text-slate-700 leading-tight">{e.event}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptTimeline;
