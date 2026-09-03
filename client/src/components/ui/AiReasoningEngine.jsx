import React, { useState } from 'react';

const reasoningExamples = [
  {
    question: 'Why is Emergency overloaded?',
    analysis: [
      { step: 'Patient arrivals', detail: '12 cases in last 2 hours (avg: 6)', icon: 'fa-user-injured', color: 'text-red-500' },
      { step: 'Weather impact', detail: 'Heavy rain causing accident surge', icon: 'fa-cloud-rain', color: 'text-sky-500' },
      { step: 'Staff availability', detail: 'Only 2 triage nurses on duty (requires 4)', icon: 'fa-user-nurse', color: 'text-amber-500' },
      { step: 'Bed capacity', detail: '18 beds occupied / 24 total (75%)', icon: 'fa-bed', color: 'text-purple-500' },
    ],
    rootCause: 'Incoming ambulance surge + limited triage capacity',
    prediction: 'Will reach max capacity in 47 minutes',
    confidence: 0.96,
    action: 'Activate overflow team, open 3 additional beds',
    improvement: '+40% throughput expected',
  },
  {
    question: 'Why is ICU near critical?',
    analysis: [
      { step: 'Post-surgery complications', detail: '3 patients developed sepsis', icon: 'fa-heart-pulse', color: 'text-red-500' },
      { step: 'Emergency admissions', detail: '2 critical cases from Accident Block', icon: 'fa-ambulance', color: 'text-orange-500' },
      { step: 'Discharge delay', detail: '2 stable patients awaiting transfer to General Ward', icon: 'fa-clock', color: 'text-amber-500' },
      { step: 'Ventilator usage', detail: '28/35 ventilators in use (80%)', icon: 'fa-fan', color: 'text-purple-500' },
    ],
    rootCause: '3 post-surgery complications + delayed transfers',
    prediction: 'Occupancy to reach 98% by 6 PM',
    confidence: 0.94,
    action: 'Transfer 2 stable patients to General Ward',
    improvement: 'Reduce to 78% occupancy',
  },
  {
    question: 'Why did revenue drop yesterday?',
    analysis: [
      { step: 'Elective surgeries', detail: '14% reduction due to equipment maintenance', icon: 'fa-scalpel', color: 'text-blue-500' },
      { step: 'Insurance claims', detail: 'Processing delay of 2.3 days', icon: 'fa-shield', color: 'text-amber-500' },
      { step: 'Equipment rentals', detail: 'Billing discrepancy in 12 cases', icon: 'fa-tools', color: 'text-red-500' },
      { step: 'OPD volume', detail: '8% lower than projected', icon: 'fa-user-doctor', color: 'text-slate-500' },
    ],
    rootCause: 'Equipment maintenance reduced elective procedures',
    prediction: 'Recovery expected within 48 hours',
    confidence: 0.91,
    action: 'Fast-track 12 pending insurance claims ($85K)',
    improvement: '$38K revenue leakage recovered',
  },
];

const AiReasoningEngine = () => {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const reason = reasoningExamples[activeQuestion];

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-diagram-tree text-violet-500"></i>
            AI Reasoning Engine
          </h3>
          <span className="text-[10px] text-slate-400">
            <i className="fas fa-robot text-[8px] mr-1"></i>
            Explainable AI
          </span>
        </div>
      </div>

      <div className="p-3">
        {/* Question Selector */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {reasoningExamples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => { setActiveQuestion(idx); setShowFull(false); }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all duration-200 ${
                activeQuestion === idx
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <i className="fas fa-question-circle text-[8px] mr-1"></i>
              {ex.question}
            </button>
          ))}
        </div>

        {/* Reasoning Tree */}
        <div className="relative">
          {reason.analysis.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 mb-2 last:mb-0">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center ${step.color} shadow-sm`}>
                  <i className={`fas ${step.icon} text-xs`}></i>
                </div>
                {idx < reason.analysis.length - 1 && <div className="w-px h-4 bg-gradient-to-b from-indigo-200 to-transparent" />}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[11px] font-bold text-slate-700">{step.step}</p>
                <p className="text-[9px] text-slate-500">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Root Cause / Conclusion */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 mb-2">
            <i className="fas fa-bullseye text-red-400 text-[10px]"></i>
            <div className="flex-1">
              <p className="text-[9px] text-red-600 font-bold uppercase tracking-wider">Root Cause</p>
              <p className="text-[11px] text-red-800 font-semibold">{reason.rootCause}</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[9px] font-bold border border-indigo-100">
              {Math.round(reason.confidence * 100)}% AI
            </span>
          </div>

          {showFull && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <i className="fas fa-chart-line text-amber-400 text-[10px]"></i>
                <div className="flex-1">
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Prediction</p>
                  <p className="text-[11px] text-amber-800 font-semibold">{reason.prediction}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <i className="fas fa-check-circle text-emerald-400 text-[10px]"></i>
                <div className="flex-1">
                  <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Suggested Action</p>
                  <p className="text-[11px] text-emerald-800 font-semibold">{reason.action}</p>
                  <p className="text-[9px] text-emerald-600 mt-0.5">{reason.improvement}</p>
                </div>
                <button onClick={() => alert(`Executing: ${reason.action}\n${reason.improvement}`)} className="text-[9px] font-bold text-white bg-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-700 active:scale-95 transition-all">
                  Execute
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowFull(!showFull)}
            className="mt-2 w-full text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1.5 rounded-lg transition-all duration-200"
          >
            <i className={`fas fa-chevron-down text-[8px] mr-1 transition-transform ${showFull ? 'rotate-180' : ''}`}></i>
            {showFull ? 'Show less' : 'Show full analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiReasoningEngine;
