import React from 'react';

const DeptDigitalTwinCard = ({ dept, onClick }) => {
  const healthPct = Math.round((dept.healthScore || 0) * 100 / 100);
  const statusColor = healthPct >= 80 ? 'bg-emerald-500' : healthPct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const statusText = healthPct >= 80 ? 'Optimal' : healthPct >= 60 ? 'Elevated' : 'Critical';

  return (
    <div onClick={onClick} className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 p-4 hover:bg-white/90 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 cursor-pointer group animate-fade-in-up">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 -translate-y-8 translate-x-8 blur-xl group-hover:opacity-80 transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (dept.iconBg || 'bg-indigo-100') + ' ' + (dept.iconColor || 'text-indigo-600')}>
              <i className={'fas ' + (dept.icon || 'fa-building') + ' text-sm'}></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{dept.name || 'Department'}</h3>
              <div className="flex items-center gap-1">
                <span className={'w-1.5 h-1.5 rounded-full ' + statusColor + ' animate-pulse'}></span>
                <span className="text-[9px] font-semibold text-slate-500">{statusText}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={'text-lg font-extrabold ' + (healthPct >= 80 ? 'text-emerald-600' : healthPct >= 60 ? 'text-amber-600' : 'text-red-600')}>{healthPct}</span>
            <span className="text-[8px] text-slate-400">/100</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
          <div className="flex justify-between"><span className="text-slate-400">Patients</span><span className="font-bold text-slate-700">{dept.patients || 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Wait Time</span><span className="font-bold text-slate-700">{dept.waitTime || 0}m</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Doctors</span><span className="font-bold text-slate-700">{dept.doctors || 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Nurses</span><span className="font-bold text-slate-700">{dept.nurses || 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Beds</span><span className="font-bold text-slate-700">{dept.occupiedBeds || 0}/{dept.totalBeds || 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Revenue</span><span className="font-bold text-emerald-600">${dept.revenue || 0}K</span></div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
          <i className="fas fa-robot text-indigo-400 text-[8px]"></i>
          <span className="text-[8px] text-indigo-700 font-medium">{dept.aiPrediction || 'Analyzing patterns...'}</span>
          <span className="ml-auto text-[8px] font-bold text-indigo-500">{dept.confidence || 0}% AI</span>
        </div>
      </div>
    </div>
  );
};

export default DeptDigitalTwinCard;
