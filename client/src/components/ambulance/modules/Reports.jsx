import React from 'react';

const Reports = ({ incident, onAction }) => {
  const reportTypes = [
    { label: 'Mission Summary Report', icon: 'fa-file-alt', desc: 'Complete mission timeline, patient summary, and key events.', format: 'PDF · DOCX', action: 'generate_mission' },
    { label: 'Patient Report', icon: 'fa-user-injured', desc: 'Full patient assessment, vitals log, interventions, and handover notes.', format: 'PDF · HL7 FHIR', action: 'generate_patient' },
    { label: 'AI Decision Log', icon: 'fa-robot', desc: 'Log of all AI recommendations, predictions, and actions taken.', format: 'PDF · JSON', action: 'generate_ai' },
    { label: 'Navigation Summary', icon: 'fa-route', desc: 'Route taken, traffic data, ETA accuracy, and navigation decisions.', format: 'PDF', action: 'generate_nav' },
    { label: 'Equipment Log', icon: 'fa-kit-medical', desc: 'Equipment usage, status changes, and inventory adjustments.', format: 'PDF · CSV', action: 'generate_equipment' },
    { label: 'Government Audit', icon: 'fa-shield-halved', desc: 'Audit-ready report for government compliance and emergency review.', format: 'PDF', action: 'generate_audit' },
  ];

  return (
    <div className="space-y-5">
      {/* Mission Quick Summary */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-white">
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Mission Documentation</p>
        <p className="text-lg font-bold mt-1">Generate comprehensive mission reports</p>
        <p className="text-xs text-slate-300 mt-1">Download in PDF, DOCX, HL7 FHIR, or JSON format</p>
        <div className="flex gap-2 mt-3">
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold">Patient: {incident?.patientName || 'Unknown'}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold">Mission: {incident?.label || 'Active'}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold">Severity: {incident?.severity || 'Critical'}</span>
        </div>
      </div>

      {/* Report Type Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reportTypes.map((r) => (
          <div key={r.label} className="rounded-xl bg-white border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white transition-all">
                <i className={`fas ${r.icon} text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                <p className="text-[9px] text-slate-400 mt-1"><i className="fas fa-file mr-0.5" />{r.format}</p>
              </div>
            </div>
            <button type="button" onClick={() => onAction?.(r.action)}
              className="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 active:scale-95 transition-all">
              <i className="fas fa-download mr-1" />Generate
            </button>
          </div>
        ))}
      </div>

      {/* Recently Generated */}
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-clock-rotate text-slate-400 text-xs" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Recently Generated</span>
        </div>
        <p className="text-xs text-slate-400 text-center py-4">No reports generated yet for this mission.</p>
      </div>
    </div>
  );
};

export default Reports;
