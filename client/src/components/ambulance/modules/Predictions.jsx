import React from 'react';

const predictions = [
  { key: 'arrival', label: 'Arrival at Hospital', value: '11 min', trend: 'down', period: 'Current ETA', confidence: 92, icon: 'fa-clock', color: 'sky' },
  { key: 'deterioration', label: 'Deterioration Risk', value: 'High', trend: 'up', period: 'Next 15 min', confidence: 85, icon: 'fa-heart-pulse', color: 'red' },
  { key: 'survival', label: 'Survival Window', value: '~45 min', trend: 'down', period: 'Golden Hour', confidence: 78, icon: 'fa-hourglass-half', color: 'amber' },
  { key: 'icu_needed', label: 'ICU Bed Needed', value: '95%', trend: 'up', period: 'Probability', confidence: 90, icon: 'fa-bed', color: 'violet' },
  { key: 'blood_needed', label: 'Blood Required', value: '2-3 units', trend: 'up', period: 'O-negative', confidence: 88, icon: 'fa-droplet', color: 'rose' },
  { key: 'complication', label: 'Complication Risk', value: 'Moderate', trend: 'up', period: 'During transport', confidence: 72, icon: 'fa-exclamation-triangle', color: 'amber' },
  { key: 'oxygen_usage', label: 'O₂ Consumption', value: '88%', trend: 'down', period: '37 min remaining', confidence: 80, icon: 'fa-wind', color: 'sky' },
  { key: 'traffic_delay', label: 'Traffic Delay Risk', value: '~3 min', trend: 'up', period: 'Next 10 min', confidence: 82, icon: 'fa-traffic-light', color: 'orange' },
];

const timelineForecasts = [
  { time: 'Now', event: 'En route to hospital', eta: '0 min', confidence: 96 },
  { time: '+5 min', event: 'Approaching Cubbon Rd junction', eta: '5 min', confidence: 94 },
  { time: '+11 min', event: 'Arrival at ER — Handover', eta: '11 min', confidence: 92 },
  { time: '+20 min', event: 'Initial assessment & imaging', eta: '20 min', confidence: 85 },
  { time: '+45 min', event: 'Golden Hour threshold', eta: '45 min', confidence: 78 },
  { time: '+60 min', event: 'Surgery window closes', eta: '60 min', confidence: 65 },
];

const Predictions = ({ toHospital, onAction }) => {
  return (
    <div className="space-y-5">
      {/* Prediction Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-chart-line text-indigo-500 text-sm" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Predictions</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">AI FORECAST</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {predictions.map((p, i) => (
            <div key={p.key || i} className="rounded-xl bg-white border border-slate-200 p-3 hover:shadow-sm transition-shadow duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-semibold text-slate-500 uppercase">{p.label}</p>
                <i className={`fas ${p.icon || 'fa-chart-line'} text-sm ${
                  p.color === 'red' ? 'text-red-400' :
                  p.color === 'amber' ? 'text-amber-400' :
                  p.color === 'sky' ? 'text-sky-400' :
                  p.color === 'violet' ? 'text-violet-400' :
                  p.color === 'rose' ? 'text-rose-400' :
                  'text-slate-400'
                }`} />
              </div>
              <p className={`text-xl font-bold ${
                p.color === 'red' ? 'text-red-700' :
                p.color === 'amber' ? 'text-amber-700' :
                p.color === 'rose' ? 'text-rose-700' :
                'text-slate-900'
              }`}>{p.value}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-slate-400">{p.period}</span>
                <span className="flex items-center gap-1">
                  <span className={`text-[9px] font-semibold ${
                    p.confidence >= 90 ? 'text-emerald-600' :
                    p.confidence >= 80 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>{p.confidence}%</span>
                  <i className={`fas ${p.trend === 'up' ? 'fa-arrow-trend-up text-emerald-500' : 'fa-arrow-trend-down text-red-500'} text-[9px]`} />
                </span>
              </div>
              <div className="mt-2 w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${
                  p.confidence >= 90 ? 'bg-emerald-500' :
                  p.confidence >= 80 ? 'bg-amber-500' :
                  'bg-slate-400'
                }`} style={{ width: `${p.confidence}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Forecast */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-timeline text-slate-400 text-xs" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Mission Timeline Forecast</span>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="space-y-0">
            {timelineForecasts.map((tf, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-b-0">
                <div className="flex flex-col items-center gap-0.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    i === 2 ? 'bg-emerald-500 ring-2 ring-emerald-200' :
                    tf.confidence >= 90 ? 'bg-sky-500' :
                    tf.confidence >= 80 ? 'bg-amber-400' :
                    'bg-slate-300'
                  }`} />
                  {i < timelineForecasts.length - 1 && <div className="w-px h-6 bg-slate-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{tf.event}</p>
                  <p className="text-[9px] text-slate-400">{tf.eta}</p>
                </div>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                  tf.confidence >= 90 ? 'bg-emerald-100 text-emerald-700' :
                  tf.confidence >= 80 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{tf.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Controls */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-flask text-indigo-400" />
          <span className="text-[10px] font-bold text-indigo-400 uppercase">Scenario Simulation</span>
        </div>
        <p className="text-xs text-slate-300 mb-3">Run what-if scenarios to predict outcomes under different conditions:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['Traffic Delay +5 min', 'Alternate Route', 'O₂ Depletion', 'Hospital Diversion'].map((s) => (
            <button key={s} type="button" onClick={() => onAction?.('simulate_' + s.toLowerCase().replace(/\s+/g, '_'))}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 active:scale-95 transition-all">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Predictions;
