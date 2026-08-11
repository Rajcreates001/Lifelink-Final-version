import React from 'react';

const stages = [
  { label: 'Emergency', icon: 'fa-ambulance', count: 16, color: 'red' },
  { label: 'Observation', icon: 'fa-clock', count: 8, color: 'amber' },
  { label: 'ICU', icon: 'fa-heart-pulse', count: 19, color: 'purple' },
  { label: 'Ward', icon: 'fa-bed', count: 40, color: 'blue' },
  { label: 'Recovery', icon: 'fa-person-walking', count: 9, color: 'emerald' },
  { label: 'Discharge', icon: 'fa-door-open', count: 12, color: 'green' },
];

const flowLines = [
  ['Emergency', 'Observation'], ['Observation', 'ICU'],
  ['ICU', 'Ward'], ['Ward', 'Recovery'], ['Recovery', 'Discharge'],
  ['Emergency', 'ICU'], ['Emergency', 'Ward'], ['Observation', 'Ward'],
];

const BedPatientFlowEngine = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-arrows-spin text-rose-500" />Patient Flow Engine</h3>
      </div>
      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/45' }}>
          <svg viewBox="0 0 100 45" className="w-full h-full">
            {/* Connection lines */}
            {flowLines.map(([from, to]) => {
              const f = stages.find(s => s.label === from);
              const t = stages.find(s => s.label === to);
              if (!f || !t) return null;
              const fx = stages.indexOf(f) * 17 + 12;
              const fy = 5 + (stages.indexOf(f) % 2) * 14;
              const tx = stages.indexOf(t) * 17 + 12;
              const ty = 5 + (stages.indexOf(t) % 2) * 14;
              return (
                <line key={from + '-' + to} x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke="rgba(148,163,184,0.15)" strokeWidth={0.6} className="transition-all duration-300" />
              );
            })}
            {/* Stage circles */}
            {stages.map((s, i) => {
              const cx = i * 17 + 12;
              const cy = 5 + (i % 2) * 14;
              const colorMap = { red: '#ef4444', amber: '#f59e0b', purple: '#a855f7', blue: '#3b82f6', emerald: '#10b981', green: '#22c55e' };
              const bgMap = { red: '#fef2f2', amber: '#fffbeb', purple: '#faf5ff', blue: '#eff6ff', emerald: '#ecfdf5', green: '#f0fdf4' };
              return (
                <g key={s.label}>
                  <circle cx={cx} cy={cy} r={5} fill={bgMap[s.color]} stroke={colorMap[s.color]} strokeWidth={1.2} />
                  <text x={cx} y={cy + 0.4} textAnchor="middle" fontSize="2.5" fill={colorMap[s.color]}>{s.count}</text>
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="1.8" fill="#64748b">{s.label}</text>
                </g>
              );
            })}
            {/* Bottleneck indicator */}
            <rect x={3} y={33} width={30} height={3} rx={1.5} fill="#fef2f2" stroke="#ef4444" strokeWidth={0.5} />
            <text x={18} y={35.2} textAnchor="middle" fontSize="1.8" fill="#dc2626" fontWeight="600">⚠ ICU bottleneck detected</text>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default BedPatientFlowEngine;
