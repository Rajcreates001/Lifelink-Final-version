import React, { useState, useEffect } from 'react';

const anomalyTemplates = [
  { severity: 'critical', type: 'Unexpected Admissions', detail: '12 emergency admissions in last 2 hours (avg: 6)', impact: 'Emergency overload imminent', icon: 'fa-ambulance', color: 'text-red-500', bg: 'bg-red-50' },
  { severity: 'high', type: 'Patient Deterioration', detail: '3 ICU patients showing early sepsis indicators', impact: 'ICU capacity at 91%', icon: 'fa-heart-pulse', color: 'text-rose-500', bg: 'bg-rose-50' },
  { severity: 'medium', type: 'Revenue Drop', detail: '14% reduction in elective surgeries vs projection', impact: '$38K revenue leakage detected', icon: 'fa-chart-line', color: 'text-orange-500', bg: 'bg-orange-50' },
  { severity: 'medium', type: 'Medicine Misuse', detail: 'Antibiotic prescription rate up 22% in General Ward', impact: 'Resistance risk elevated', icon: 'fa-tablets', color: 'text-amber-500', bg: 'bg-amber-50' },
  { severity: 'high', type: 'Equipment Anomaly', detail: 'MRI-2 scanner vibration above threshold', impact: 'Possible failure within 48 hours', icon: 'fa-tools', color: 'text-red-500', bg: 'bg-red-50' },
  { severity: 'low', type: 'Duplicate Records', detail: '14 duplicate patient records detected in last 24h', impact: 'Minor data quality issue', icon: 'fa-copy', color: 'text-sky-500', bg: 'bg-sky-50' },
  { severity: 'medium', type: 'Staff Fatigue', detail: 'Radiology department staff hours exceeded safe limit', impact: 'Burnout risk at 20%', icon: 'fa-user-nurse', color: 'text-amber-500', bg: 'bg-amber-50' },
  { severity: 'critical', type: 'Blood Shortage Alert', detail: 'O Negative inventory dropped to 4 units', impact: 'Emergency surgery prep at risk', icon: 'fa-droplet', color: 'text-red-500', bg: 'bg-red-50' },
];

const AiAnomalyPanel = () => {
  const [anomalies, setAnomalies] = useState(anomalyTemplates);
  const [resolved, setResolved] = useState(new Set());
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const t = setInterval(() => {
      // Add a new random anomaly occasionally
      if (Math.random() > 0.6) {
        const newAnomaly = anomalyTemplates[Math.floor(Math.random() * anomalyTemplates.length)];
        setAnomalies((prev) => [{ ...newAnomaly, id: Date.now() }, ...prev].slice(0, 12));
      }
    }, 12000);
    return () => clearInterval(t);
  }, []);

  const active = anomalies.filter((_, idx) => !resolved.has(idx));

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-shield-halved text-red-500"></i>
            Anomaly Detection
          </h3>
          <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">
            {active.length} active
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1.5 max-h-[350px] overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-check-circle text-emerald-500 text-xl"></i>
              </div>
              <p className="text-xs font-bold text-slate-700">All clear</p>
              <p className="text-[9px] text-slate-400">No anomalies detected</p>
            </div>
          </div>
        ) : (
          active.map((anomaly, idx) => {
            const severityConfig = {
              critical: { badge: 'bg-red-100 text-red-700', border: 'border-red-200', bar: 'bg-gradient-to-b from-red-500 to-rose-500' },
              high: { badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200', bar: 'bg-gradient-to-b from-orange-500 to-amber-500' },
              medium: { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', bar: 'bg-gradient-to-b from-amber-500 to-yellow-500' },
              low: { badge: 'bg-sky-100 text-sky-700', border: 'border-sky-200', bar: 'bg-gradient-to-b from-sky-500 to-blue-500' },
            };
            const sc = severityConfig[anomaly.severity] || severityConfig.low;
            const isExpanded = expanded === idx;

            return (
              <div key={idx} className="relative rounded-lg bg-white border border-slate-100 hover:shadow-sm transition-all duration-200">
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${sc.bar}`} />
                <div className="pl-3 pr-2 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg ${anomaly.bg} flex items-center justify-center ${anomaly.color} flex-shrink-0`}>
                        <i className={`fas ${anomaly.icon} text-[10px]`}></i>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-700">{anomaly.type}</span>
                          <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${sc.badge}`}>{anomaly.severity}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 truncate max-w-[180px] sm:max-w-xs">{anomaly.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : idx)}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      >
                        <i className={`fas fa-chevron-down text-[8px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                      </button>
                      <button
                        onClick={() => setResolved((prev) => new Set([...prev, idx]))}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Resolve"
                      >
                        <i className="fas fa-check text-[8px]"></i>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 ml-8 mr-1 px-2.5 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 animate-fade-in">
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div><span className="text-slate-400">Impact:</span><p className="text-slate-700 font-semibold mt-0.5">{anomaly.impact}</p></div>
                        <div><span className="text-slate-400">Detection:</span><p className="text-slate-700 font-semibold mt-0.5">AI Pattern Recognition</p></div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <i className="fas fa-robot text-indigo-400 text-[8px]"></i>
                        <p className="text-[9px] text-indigo-700 font-medium">
                          <strong>AI Suggestion:</strong> {anomaly.severity === 'critical' ? 'Immediate action required. Notify department head.' : anomaly.severity === 'high' ? 'Schedule review within 2 hours.' : 'Monitor and address in next shift.'}
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="px-1 py-0.5 rounded bg-white text-indigo-500 text-[8px] font-semibold border border-indigo-100">
                          <i className="fas fa-brain text-[7px] mr-0.5"></i>
                          92% confidence
                        </span>
                        <span className="text-[8px] text-slate-400">Detected 3 min ago</span>
                        <button onClick={() => alert('Resolving AI-detected anomaly...')} className="ml-auto text-[8px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">
                          Resolve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AiAnomalyPanel;
