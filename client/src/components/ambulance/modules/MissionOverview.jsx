import React from 'react';
import { KPICard, StatusBadge, FORMAT_TIME, severityColor } from '../shared/AmbulanceShared';

const MissionOverview = ({ vehicle, incident, hospital, toIncident, toHospital, missionStart, patientStatus, goldenHour, onAction, onOpenTriage }) => {
  const kpis = [
    { label: 'ETA to Pickup', value: `${toIncident?.etaMinutes || 0} min`, icon: 'fa-clock', color: 'sky', subtitle: `${toIncident?.distanceKm || 0} km` },
    { label: 'ETA to Hospital', value: `${toHospital?.etaMinutes || 0} min`, icon: 'fa-hospital', color: 'amber', subtitle: `${toHospital?.distanceKm || 0} km` },
    { label: 'Current Speed', value: `${vehicle?.speedKph || 44} km/h`, icon: 'fa-gauge-high', color: 'emerald', trend: 8 },
    { label: 'Fuel Level', value: `${vehicle?.fuelLevel || 78}%`, icon: 'fa-gas-pump', color: 'rose', trend: -15 },
    { label: 'Patient GCS', value: `${incident?.gcs || '--'}`, icon: 'fa-brain', color: 'violet', trend: -10 },
    { label: 'Distance Remaining', value: `${((toIncident?.distanceKm || 0) + (toHospital?.distanceKm || 0)).toFixed(1)} km`, icon: 'fa-route', color: 'indigo' },
  ];

  return (
    <div className="space-y-5">
      {/* Hero: Incident Banner */}
      <div className={`rounded-xl bg-gradient-to-r ${
        incident?.severity === 'Critical' ? 'from-red-50 to-rose-50 border-red-200' :
        incident?.severity === 'High' ? 'from-amber-50 to-orange-50 border-amber-200' :
        'from-sky-50 to-blue-50 border-sky-200'
      } border p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              incident?.severity === 'Critical' ? 'bg-red-100 text-red-600' :
              incident?.severity === 'High' ? 'bg-amber-100 text-amber-600' :
              'bg-sky-100 text-sky-600'
            }`}>
              <i className="fas fa-triangle-exclamation text-xl" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-900">{incident?.label || 'Active Emergency'}</h2>
                <StatusBadge text={incident?.severity || 'Critical'} color={severityColor(incident?.severity)} />
              </div>
              <p className="text-sm text-slate-500 mb-3">{incident?.address || 'Location unknown'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Patient</p>
                  <p className="text-sm font-bold text-slate-800">{incident?.patientName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Age / GCS</p>
                  <p className="text-sm font-bold text-slate-800">{incident?.age || '--'} / {incident?.gcs || '--'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Mechanism</p>
                  <p className="text-sm font-bold text-slate-800">{incident?.mechanism || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Status</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-800">{patientStatus || 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button type="button" onClick={onOpenTriage}
            className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">
            <i className="fas fa-stethoscope mr-1.5" />AI Triage
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      {/* Crew + Vehicle + Timeline row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Crew Status */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-user-md text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Crew Status</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">RS</div>
                <div><p className="text-xs font-semibold text-slate-700">Rahul Shetty</p><p className="text-[9px] text-slate-400">EMT Lead</p></div>
              </div>
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-bold">KN</div>
                <div><p className="text-xs font-semibold text-slate-700">Kavya Naik</p><p className="text-[9px] text-slate-400">Paramedic</p></div>
              </div>
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[9px] font-bold">VP</div>
                <div><p className="text-xs font-semibold text-slate-700">Vikram Poojary</p><p className="text-[9px] text-slate-400">Driver</p></div>
              </div>
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
            </div>
          </div>
        </div>

        {/* Vehicle Status */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-truck-medical text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Status</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-slate-500">Vehicle</span><span className="font-semibold text-slate-700">{vehicle?.label || 'Ambulance A1'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Speed</span><span className="font-semibold text-slate-700">{vehicle?.speedKph || 44} km/h</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Fuel</span><div className="flex items-center gap-1.5"><div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${vehicle?.fuelLevel || 78}%` }} /></div><span className="font-semibold text-slate-700">{vehicle?.fuelLevel || 78}%</span></div></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">O₂ Level</span><span className="font-semibold text-slate-700">88% <span className="text-amber-500">(Low)</span></span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Equipment Status</span><span className="font-semibold text-emerald-600"><i className="fas fa-check-circle mr-0.5" />All checked</span></div>
          </div>
        </div>

        {/* Recent Alerts Timeline */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-bell text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Recent Alerts</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><p className="text-[10px] text-slate-600">Hospital confirmed: Trauma team ready</p></div>
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" /><p className="text-[10px] text-slate-600">Traffic congestion on Cubbon Rd — 3 min delay</p></div>
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" /><p className="text-[10px] text-slate-600">O₂ level critical: 88% remaining</p></div>
            <div className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><p className="text-[10px] text-slate-600">Police escort confirmed — priority lane active</p></div>
          </div>
        </div>
      </div>

      {/* Command Actions */}
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-bolt text-slate-400 text-xs" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Command Actions</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button type="button" onClick={() => onAction?.('triage')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 active:scale-95 transition-all text-xs font-semibold text-indigo-700">
            <i className="fas fa-stethoscope" /> AI Triage
          </button>
          <button type="button" onClick={() => onAction?.('notify_trauma')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all text-xs font-semibold text-rose-700">
            <i className="fas fa-bell" /> Notify Trauma
          </button>
          <button type="button" onClick={() => onAction?.('police_escort')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all text-xs font-semibold text-amber-700">
            <i className="fas fa-shield" /> Police Escort
          </button>
          <button type="button" onClick={() => onAction?.('alert_blood')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all text-xs font-semibold text-emerald-700">
            <i className="fas fa-droplet" /> Alert Blood Bank
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionOverview;
