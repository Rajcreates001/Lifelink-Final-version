import React, { useState } from 'react';

const equipmentList = [
  { id: 'MRI-1', name: 'MRI Scanner 1', status: 'Active', temp: '37.2°C', power: '98%', health: 92, hours: '4,280h', maintDue: '45 days', failurePct: 3, dept: 'Radiology', utilization: 88, replacement: '6.2y', icon: 'fa-mri' },
  { id: 'CT-1', name: 'CT Scanner', status: 'Active', temp: '36.8°C', power: '95%', health: 88, hours: '6,120h', maintDue: '22 days', failurePct: 6, dept: 'Radiology', utilization: 82, replacement: '4.8y', icon: 'fa-x-ray' },
  { id: 'Vent-A', name: 'Ventilator A', status: 'Active', temp: '35.5°C', power: '99%', health: 95, hours: '1,840h', maintDue: '90 days', failurePct: 2, dept: 'ICU', utilization: 74, replacement: '7.5y', icon: 'fa-lungs' },
  { id: 'ECG-1', name: 'ECG Monitor', status: 'Idle', temp: '34.2°C', power: '88%', health: 78, hours: '8,420h', maintDue: '8 days', failurePct: 12, dept: 'Cardiology', utilization: 56, replacement: '2.1y', icon: 'fa-heart-pulse' },
  { id: 'US-1', name: 'Ultrasound 1', status: 'Maintenance', temp: '38.1°C', power: '45%', health: 62, hours: '9,600h', maintDue: 'Overdue', failurePct: 22, dept: 'Radiology', utilization: 91, replacement: '0.8y', icon: 'fa-scanner' },
  { id: 'Incub-1', name: 'Incubator 1', status: 'Active', temp: '36.5°C', power: '97%', health: 91, hours: '3,200h', maintDue: '60 days', failurePct: 4, dept: 'Pediatrics', utilization: 68, replacement: '5.5y', icon: 'fa-baby' },
];

const ResourceEquipmentDigitalTwin = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-microchip text-sky-500" />Equipment Digital Twins</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
        {equipmentList.map((eq) => (
          <div key={eq.id} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === eq.id ? null : eq.id)}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  eq.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : eq.status === 'Idle' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}>
                  <i className={`fas ${eq.icon}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate">{eq.name}</p>
                  <p className="text-[8px] text-slate-400">{eq.dept} · {eq.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${eq.health >= 85 ? 'bg-emerald-100 text-emerald-700' : eq.health >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{eq.health}%</span>
                <i className={`fas fa-chevron-down text-[8px] text-slate-400 transition-transform ${expanded === eq.id ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {expanded === eq.id && (
              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] animate-fade-in">
                <span><span className="text-slate-400">Temp:</span> {eq.temp}</span>
                <span><span className="text-slate-400">Power:</span> {eq.power}</span>
                <span><span className="text-slate-400">Hours:</span> {eq.hours}</span>
                <span><span className="text-slate-400">Utilization:</span> {eq.utilization}%</span>
                <span><span className="text-slate-400">Failure Risk:</span> <span className={`${eq.failurePct >= 15 ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{eq.failurePct}%</span></span>
                <span><span className="text-slate-400">Maint Due:</span> {eq.maintDue}</span>
                <span><span className="text-slate-400">Replacement:</span> {eq.replacement}</span>
                <button className="text-[9px] font-bold text-white bg-indigo-600 py-0.5 rounded hover:bg-indigo-700 active:scale-95 transition-all">Schedule Maint</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceEquipmentDigitalTwin;
