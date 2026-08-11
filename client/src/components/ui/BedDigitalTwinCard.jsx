import React, { useState } from 'react';

const BedDigitalTwinCard = ({ bed, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const statusColor = bed.status === 'Occupied' ? 'text-rose-600' : bed.status === 'Available' ? 'text-emerald-600' : 'text-amber-600';
  const statusBg = bed.status === 'Occupied' ? 'bg-rose-100' : bed.status === 'Available' ? 'bg-emerald-100' : 'bg-amber-100';
  return (
    <div
      onClick={() => { setExpanded(!expanded); onClick?.(bed); }}
      className="relative overflow-hidden rounded-xl bg-white/75 backdrop-blur-sm border border-white/40 p-3 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group animate-fade-in-up"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <i className="fas fa-bed text-sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{bed.label || bed.id}</p>
            <p className="text-[9px] text-slate-400">{bed.ward} • {bed.floor || 'Floor 2'}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBg} ${statusColor}`}>{bed.status}</span>
      </div>
      {bed.status === 'Occupied' && (
        <div className="space-y-1.5 text-[10px] text-slate-500">
          <p><span className="font-semibold text-slate-700">Patient:</span> {bed.patientName || 'Unknown'}</p>
          <p><span className="font-semibold text-slate-700">Doctor:</span> {bed.doctor || 'Dr. Assign'}</p>
          <p><span className="font-semibold text-slate-700">Equipment:</span> {bed.equipment || 'Ventilator, Monitor'}</p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
            <span><span className="font-semibold text-slate-700">Discharge:</span> {bed.expectedDischarge || '~2d'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${bed.risk === 'High' ? 'bg-red-100 text-red-600' : bed.risk === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {bed.risk || 'Low'} Risk
            </span>
          </div>
        </div>
      )}
      {bed.status === 'Cleaning' && (
        <div className="space-y-1 text-[10px] text-slate-500">
          <p><span className="font-semibold text-slate-700">Cleaning ETA:</span> {bed.cleaningETA || '15 min'}</p>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 animate-pulse" style={{ width: `${bed.cleaningProgress || 60}%` }} />
          </div>
        </div>
      )}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[9px] text-slate-400 animate-fade-in">
          <p><i className="fas fa-robot text-indigo-400 mr-1" />AI: {bed.aiRecommendation || 'Monitor vitals closely'}</p>
          <p><i className="fas fa-clock text-amber-400 mr-1" />Predicted release: {bed.predictedRelease || '~3h'}</p>
        </div>
      )}
      {expanded && (
        <div className="mt-2 flex gap-1">
          <button className="flex-1 text-[9px] font-bold text-white bg-indigo-600 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">Assign</button>
          <button className="flex-1 text-[9px] font-bold text-slate-600 bg-slate-100 py-1 rounded-lg hover:bg-slate-200 active:scale-95 transition-all">Transfer</button>
        </div>
      )}
    </div>
  );
};

export default BedDigitalTwinCard;
