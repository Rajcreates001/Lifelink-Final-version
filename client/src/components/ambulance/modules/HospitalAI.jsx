import React, { useMemo } from 'react';

const HOSPITALS = [
  { name: "St. Martha's Hospital", distance: 3.5, eta: 11, icuBeds: 3, totalBeds: 45, traumaReady: true, strokeReady: true, burnUnit: false, cardiacCenter: true, ventilators: 8, doctors: 12, nurses: 24, score: 94, etaScore: 88, capabilityScore: 97 },
  { name: 'Bowring & Lady Curzon', distance: 4.8, eta: 14, icuBeds: 5, totalBeds: 60, traumaReady: true, strokeReady: true, burnUnit: false, cardiacCenter: false, ventilators: 6, doctors: 10, nurses: 20, score: 89, etaScore: 82, capabilityScore: 92 },
  { name: 'MS Ramaiah Hospital', distance: 6.2, eta: 18, icuBeds: 8, totalBeds: 80, traumaReady: true, strokeReady: true, burnUnit: true, cardiacCenter: true, ventilators: 12, doctors: 18, nurses: 35, score: 91, etaScore: 75, capabilityScore: 98 },
  { name: 'Victoria Hospital', distance: 3.8, eta: 12, icuBeds: 2, totalBeds: 35, traumaReady: true, strokeReady: false, burnUnit: false, cardiacCenter: false, ventilators: 4, doctors: 8, nurses: 16, score: 82, etaScore: 85, capabilityScore: 78 },
  { name: 'KIMS Hospital', distance: 7.5, eta: 22, icuBeds: 10, totalBeds: 120, traumaReady: true, strokeReady: true, burnUnit: true, cardiacCenter: true, ventilators: 15, doctors: 25, nurses: 50, score: 95, etaScore: 70, capabilityScore: 99 },
];

const HospitalAI = ({ hospital: currentHospital, incident, onAction }) => {
  const sorted = useMemo(() => [...HOSPITALS].sort((a, b) => (b.score || 0) - (a.score || 0)), []);

  return (
    <div className="space-y-5">
      {/* Hospital Readiness Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-[9px] font-bold text-emerald-600 uppercase">Avg Capacity</p>
          <p className="text-2xl font-black text-slate-900">68%</p>
          <p className="text-[9px] text-slate-400">Across all hospitals</p>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-center">
          <p className="text-[9px] font-bold text-sky-600 uppercase">Total ICU Beds</p>
          <p className="text-2xl font-black text-slate-900">28</p>
          <p className="text-[9px] text-slate-400">Available now</p>
        </div>
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-4 text-center">
          <p className="text-[9px] font-bold text-violet-600 uppercase">Trauma Teams</p>
          <p className="text-2xl font-black text-slate-900">5</p>
          <p className="text-[9px] text-slate-400">On standby</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
          <p className="text-[9px] font-bold text-rose-600 uppercase">Ventilators</p>
          <p className="text-2xl font-black text-slate-900">45</p>
          <p className="text-[9px] text-slate-400">Total available</p>
        </div>
      </div>

      {/* AI Hospital Ranking */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-robot text-indigo-500 text-sm" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Hospital Ranking</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">REAL-TIME</span>
        </div>
        <div className="space-y-2">
          {sorted.map((h, i) => (
            <div key={h.name} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
              i === 0 ? 'bg-gradient-to-r from-emerald-50 to-sky-50 border-emerald-200 shadow-sm' :
              'bg-white border-slate-200 hover:border-slate-300'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-sky-500' : i === 2 ? 'bg-indigo-500' : 'bg-slate-400'
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-slate-500"><i className="fas fa-location-dot mr-0.5" />{h.distance} km</span>
                    <span className="text-[9px] text-slate-500"><i className="fas fa-clock mr-0.5" />{h.eta} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-700">{h.icuBeds} ICU</span>
                    <span>{h.totalBeds} beds</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {h.traumaReady && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700">TRAUMA</span>}
                  {h.cardiacCenter && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-rose-100 text-rose-700">CARDIAC</span>}
                  {h.strokeReady && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700">STROKE</span>}
                  {h.burnUnit && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">BURN</span>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800">{h.score}</p>
                  <p className="text-[8px] text-slate-400 uppercase">Match %</p>
                  <div className="mt-1 ml-auto w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${h.score}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Destination Info + Digital Handover */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-flag-checkered text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Current Destination</span>
          </div>
          {currentHospital ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white"><i className="fas fa-hospital" /></div>
              <div>
                <p className="text-sm font-bold text-slate-800">{currentHospital}</p>
                <p className="text-[10px] text-slate-500">Trauma team assembled · ICU ready · Blood bank cross-matching</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Confirmed</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No destination selected</p>
          )}
        </div>

        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-notes-medical text-indigo-500 text-sm" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase">Digital Handover</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <p><span className="font-semibold">Patient:</span> {incident?.patientName || 'Unknown'} · GCS {incident?.gcs || '--'} · Shock Index elevated</p>
            <p><span className="font-semibold">Interventions:</span> IV access, O₂ therapy, C-spine immobilised</p>
            <p><span className="font-semibold">Blood:</span> O-negative · Cross-match requested · 2-3 units estimated</p>
            <p><span className="font-semibold">Estimated Arrival:</span> ~11 min · Prepare trauma bay</p>
          </div>
          <button type="button" onClick={() => onAction?.('send_handover')}
            className="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
            <i className="fas fa-paper-plane mr-1.5" />Send Digital Handover
          </button>
        </div>
      </div>
    </div>
  );
};

export default HospitalAI;
