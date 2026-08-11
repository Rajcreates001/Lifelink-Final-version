import React from 'react';
import { KPICard, StatusBadge, severityColor } from '../shared/AmbulanceShared';

const vitals = { heartRate: 122, oxygen: 88, bp: '92/58', gcs: 10, rr: 28, temp: 38.2 };

const PatientTwin = ({ incident, patientStatus, onAction }) => {
  const vitalItems = [
    { label: 'Heart Rate', value: `${vitals.heartRate}`, unit: 'bpm', icon: 'fa-heart-pulse', color: vitals.heartRate > 100 ? 'red' : 'emerald', trend: 15 },
    { label: 'SpO₂', value: `${vitals.oxygen}%`, unit: 'Oxygen Sat', icon: 'fa-droplet', color: vitals.oxygen < 90 ? 'red' : vitals.oxygen < 94 ? 'amber' : 'emerald', trend: -5 },
    { label: 'Blood Pressure', value: `${vitals.bp}`, unit: 'mmHg', icon: 'fa-gauge-high', color: 'sky' },
    { label: 'GCS', value: `${vitals.gcs}`, unit: '/15', icon: 'fa-brain', color: vitals.gcs <= 8 ? 'red' : vitals.gcs <= 12 ? 'amber' : 'emerald', trend: -10 },
    { label: 'Resp Rate', value: `${vitals.rr}`, unit: '/min', icon: 'fa-lungs', color: vitals.rr > 24 ? 'red' : 'emerald' },
    { label: 'Temperature', value: `${vitals.temp}°C`, unit: 'Body Temp', icon: 'fa-temperature-high', color: vitals.temp > 38.5 ? 'red' : vitals.temp > 37.5 ? 'amber' : 'emerald' },
  ];

  const bodyRegions = [
    { region: 'Head', severity: 'Critical', color: 'red', findings: 'Possible TBI, GCS 10' },
    { region: 'Chest', severity: 'Moderate', color: 'amber', findings: 'Rib fracture suspected' },
    { region: 'Abdomen', severity: 'Low', color: 'emerald', findings: 'No immediate concerns' },
    { region: 'Pelvis', severity: 'Moderate', color: 'amber', findings: 'Stable, monitor' },
    { region: 'Legs', severity: 'Low', color: 'emerald', findings: 'Minor lacerations' },
    { region: 'Arms', severity: 'Low', color: 'emerald', findings: 'Abrasions only' },
  ];

  const shockIndex = (vitals.heartRate / parseInt(vitals.bp.split('/')[0] || '90')).toFixed(2);
  const shockSeverity = parseFloat(shockIndex) > 1.0 ? 'CRITICAL' : parseFloat(shockIndex) > 0.7 ? 'WARNING' : 'STABLE';

  return (
    <div className="space-y-5">
      {/* Hero: Patient Identity */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md">
            <i className="fas fa-user-injured text-2xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{incident?.patientName || 'Unknown Patient'}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>Age: {incident?.age || '--'} yrs</span>
              <span>Gender: Female</span>
              <span>Blood: O-negative</span>
              <StatusBadge text={patientStatus || 'Critical'} color={severityColor(patientStatus)} />
            </div>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-lg border"
              style={{
                borderColor: shockSeverity === 'CRITICAL' ? '#fecaca' : shockSeverity === 'WARNING' ? '#fed7aa' : '#bbf7d0',
                backgroundColor: shockSeverity === 'CRITICAL' ? '#fef2f2' : shockSeverity === 'WARNING' ? '#fffbeb' : '#f0fdf4',
              }}>
              <span className="text-[9px] font-bold uppercase"
                style={{ color: shockSeverity === 'CRITICAL' ? '#dc2626' : shockSeverity === 'WARNING' ? '#d97706' : '#059669' }}>
                Shock Index {shockIndex} — {shockSeverity}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-heart-pulse text-red-400 text-sm" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Vitals</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">REAL-TIME</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {vitalItems.map((v) => (
            <div key={v.label} className={`rounded-xl p-3 border text-center ${
              v.color === 'red' ? 'bg-red-50 border-red-200' :
              v.color === 'amber' ? 'bg-amber-50 border-amber-200' :
              v.color === 'sky' ? 'bg-sky-50 border-sky-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <i className={`fas ${v.icon} text-sm mb-1 ${
                v.color === 'red' ? 'text-red-500' :
                v.color === 'amber' ? 'text-amber-500' :
                v.color === 'sky' ? 'text-sky-500' :
                'text-emerald-500'
              }`} />
              <p className={`text-xl font-black font-mono ${
                v.color === 'red' ? 'text-red-700' :
                v.color === 'amber' ? 'text-amber-700' :
                'text-slate-900'
              }`}>{v.value}</p>
              <p className="text-[9px] text-slate-400">{v.unit}</p>
              <p className="text-[9px] font-semibold text-slate-500 mt-0.5">{v.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body Heat Map + AI Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Body Regions */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-person text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Body Assessment</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {bodyRegions.map((r) => (
              <div key={r.region} className={`flex items-center gap-2 p-2 rounded-lg border ${
                r.color === 'red' ? 'bg-red-50 border-red-200' :
                r.color === 'amber' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  r.color === 'red' ? 'bg-red-500 animate-pulse' :
                  r.color === 'amber' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`} />
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">{r.region}</p>
                  <p className="text-[9px] text-slate-500">{r.findings}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Diagnosis */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-robot text-indigo-500 text-sm" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase">AI Diagnosis</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Primary Assessment</p>
              <p className="text-xs text-slate-700 mt-0.5">Multi-trauma with suspected internal hemorrhage. GCS 10 indicates moderate TBI. Shock index elevated — ongoing blood loss likely.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/70 p-2">
                <p className="text-[9px] font-semibold text-slate-400 uppercase">Predicted Deterioration</p>
                <p className="text-xs font-bold text-red-600">High — within 15 min</p>
              </div>
              <div className="rounded-lg bg-white/70 p-2">
                <p className="text-[9px] font-semibold text-slate-400 uppercase">Survival Probability</p>
                <p className="text-xs font-bold text-amber-600">~45% without intervention</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Recommended Interventions</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {['IV Access', 'Fluid Resuscitation', 'O₂ Therapy', 'Pressure Dressing', 'Prepare OR'].map((item) => (
                  <span key={item} className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-semibold">{item}</span>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => onAction?.('full_diagnosis')}
              className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
              <i className="fas fa-notes-medical mr-1.5" />Full Diagnostic Report
            </button>
          </div>
        </div>
      </div>

      {/* Medical Timeline */}
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-timeline text-slate-400 text-xs" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Medical Timeline</span>
        </div>
        <div className="space-y-2">
          {[
            { time: '-15 min', event: 'GCS dropped from 12 to 10', status: 'warning' },
            { time: '-20 min', event: 'IV line established — LR running at 150ml/hr', status: 'success' },
            { time: '-25 min', event: 'C-spine immobilised, backboard applied', status: 'success' },
            { time: '-30 min', event: 'Initial vitals: HR 118, BP 96/62, SpO₂ 91%', status: 'info' },
            { time: '-35 min', event: 'Patient extricated from vehicle', status: 'info' },
            { time: '-40 min', event: 'Arrived on scene: Multi-vehicle collision', status: 'info' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 pb-2 border-b border-slate-100 last:border-b-0">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                item.status === 'warning' ? 'bg-amber-500' :
                item.status === 'success' ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
              <span className="text-[9px] font-bold text-slate-400 w-16 shrink-0">{item.time}</span>
              <p className="text-[11px] text-slate-700">{item.event}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientTwin;
