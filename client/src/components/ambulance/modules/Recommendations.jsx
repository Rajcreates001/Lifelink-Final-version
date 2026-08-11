import React, { useState } from 'react';

const ALL_RECOMMENDATIONS = [
  { id: 'r1', title: 'Notify Trauma Team', description: 'Activate full trauma team at receiving hospital. Patient is critical with GCS 10 and suspected internal bleeding.', impact: 'high', icon: 'fa-bell', category: 'immediate', reasoning: 'GCS dropped from 12 to 10 in 15 min. Shock index elevated indicating ongoing blood loss.', evidence: 'ATLS guidelines — any patient with suspected hemorrhage and altered GCS requires immediate trauma team activation.', timeSave: '~5 min' },
  { id: 'r2', title: 'Prepare O₂ Supply', description: 'Current O₂ at 88%. Arrange cylinder swap at nearest medical supply or request backup from dispatch.', impact: 'high', icon: 'fa-droplet', category: 'immediate', reasoning: 'Patient requires high-flow O₂ (15L/min). At current consumption rate, supply will last ~37 min.', evidence: 'Hospital is 11 min away, but any delay or complication would exceed supply.', timeSave: 'Prevents crisis' },
  { id: 'r3', title: 'Request Police Escort', description: 'Activate priority lane clearance on remaining route. Estimated time savings: 2-3 min to hospital.', impact: 'medium', icon: 'fa-shield', category: 'recommended', reasoning: 'Traffic congestion expected on Cubbon Rd during peak hours. Police escort can save critical minutes.', evidence: 'Previous missions show 2-3 min average reduction with police escort on this corridor.', timeSave: '~2-3 min' },
  { id: 'r4', title: 'Alert Blood Bank', description: 'Patient likely O-negative. Request cross-matching and prepare 2-3 units for potential transfusion on arrival.', impact: 'medium', icon: 'fa-droplet', category: 'recommended', reasoning: 'Shock index and mechanism suggest significant blood loss. O-negative is universal donor but often in short supply.', evidence: '76% of multi-trauma patients with shock index >0.9 require transfusion within 1 hour of arrival.', timeSave: '~10 min' },
  { id: 'r5', title: 'Voice Documentation', description: 'Use voice transcription to auto-generate patient report, reducing paperwork time by ~5 min.', impact: 'low', icon: 'fa-microphone', category: 'optional', reasoning: 'Manual documentation during transport can distract from patient care. Voice transcription is hands-free.', evidence: 'Pilot study showed 40% reduction in documentation time with voice transcription.', timeSave: '~5 min' },
  { id: 'r6', title: 'Alert Neurosurgery', description: 'Patient shows signs of moderate TBI (GCS 10). Neurosurgery consult recommended on arrival.', impact: 'high', icon: 'fa-brain', category: 'immediate', reasoning: 'Decreasing GCS with suspected head injury requires neurosurgical evaluation within 30 min.', evidence: 'Brain Trauma Foundation guidelines — GCS ≤12 with suspected head injury requires neurosurgery consult.', timeSave: 'Critical' },
  { id: 'r7', title: 'Prepare CT Scanner', description: 'Notify radiology to prepare CT scanner for immediate trauma series upon arrival.', impact: 'medium', icon: 'fa-cube', category: 'immediate', reasoning: 'Whole body CT is standard for multi-trauma. Pre-notification reduces door-to-CT time.', evidence: 'Advanced notification reduces door-to-CT time by an average of 12 min.', timeSave: '~12 min' },
];

const Recommendations = ({ incident, onAction }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [rejectedIds, setRejectedIds] = useState([]);

  const categories = [
    { key: 'all', label: 'All', count: ALL_RECOMMENDATIONS.length },
    { key: 'immediate', label: 'Immediate', count: ALL_RECOMMENDATIONS.filter(r => r.category === 'immediate').length },
    { key: 'recommended', label: 'Recommended', count: ALL_RECOMMENDATIONS.filter(r => r.category === 'recommended').length },
    { key: 'optional', label: 'Optional', count: ALL_RECOMMENDATIONS.filter(r => r.category === 'optional').length },
  ];

  const filtered = activeCategory === 'all'
    ? ALL_RECOMMENDATIONS
    : ALL_RECOMMENDATIONS.filter(r => r.category === activeCategory);

  const impactColors = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
  const impactBorders = { high: 'border-l-red-400', medium: 'border-l-amber-400', low: 'border-l-blue-400' };

  const iconColors = ['sky', 'amber', 'emerald', 'violet', 'rose', 'indigo'];

  return (
    <div className="space-y-5">
      {/* Summary Banner */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <i className="fas fa-wand-magic-sparkles text-lg" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">AI Recommendations</p>
              <p className="text-[10px] text-slate-500">{ALL_RECOMMENDATIONS.length} recommendations · {ALL_RECOMMENDATIONS.filter(r => r.impact === 'high').length} high priority</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400">Accepted: {acceptedIds.length}</span>
            <span className="text-[9px] text-slate-400">|</span>
            <span className="text-[9px] text-slate-400">Rejected: {rejectedIds.length}</span>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2">
        {categories.map((cat) => (
          <button key={cat.key} type="button" onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
              activeCategory === cat.key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}>
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-2">
        {filtered.map((rec, i) => {
          const isAccepted = acceptedIds.includes(rec.id);
          const isRejected = rejectedIds.includes(rec.id);
          return (
            <div key={rec.id} className={`rounded-xl bg-white border border-slate-200 p-4 border-l-4 ${impactBorders[rec.impact]} hover:shadow-sm transition-all ${
              isAccepted ? 'border-l-emerald-500 bg-emerald-50/30' : isRejected ? 'opacity-60' : ''
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isAccepted ? 'bg-emerald-100 text-emerald-600' :
                  isRejected ? 'bg-slate-100 text-slate-400' :
                  `bg-${iconColors[i % iconColors.length]}-100 text-${iconColors[i % iconColors.length]}-600`
                }`}>
                  <i className={`fas ${rec.icon || 'fa-wand-magic-sparkles'} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactColors[rec.impact]}`}>
                      {rec.impact.toUpperCase()}
                    </span>
                    {isAccepted && <span className="text-[9px] font-semibold text-emerald-600"><i className="fas fa-check-circle mr-0.5" />Accepted</span>}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>

                  {/* Expandable Reasoning */}
                  <div className="mt-2 space-y-1.5 bg-slate-50 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-brain text-[9px] text-indigo-400 mt-0.5" />
                      <p className="text-[10px] text-slate-500"><span className="font-semibold text-slate-700">AI Reasoning:</span> {rec.reasoning}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <i className="fas fa-book text-[9px] text-amber-400 mt-0.5" />
                      <p className="text-[10px] text-slate-500"><span className="font-semibold text-slate-700">Evidence:</span> {rec.evidence}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <i className="fas fa-clock text-[9px] text-emerald-400 mt-0.5" />
                      <p className="text-[10px] text-slate-500"><span className="font-semibold text-slate-700">Time Saved:</span> {rec.timeSave}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {!isAccepted && !isRejected && (
                      <>
                        <button type="button" onClick={() => { setAcceptedIds(prev => [...prev, rec.id]); onAction?.('accept_' + rec.id); }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 active:scale-95 transition-all">
                          <i className="fas fa-check mr-1" />Accept
                        </button>
                        <button type="button" onClick={() => { setRejectedIds(prev => [...prev, rec.id]); onAction?.('reject_' + rec.id); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 active:scale-95 transition-all">
                          <i className="fas fa-times mr-1" />Dismiss
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => onAction?.('explain_' + rec.id)}
                      className="text-[10px] font-semibold text-sky-600 hover:text-sky-800">
                      <i className="fas fa-robot mr-1" />Explain
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Recommendations;
