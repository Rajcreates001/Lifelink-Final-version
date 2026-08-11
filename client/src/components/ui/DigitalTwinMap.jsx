import React, { useState, useEffect, useMemo } from 'react';

const departments = [
  { id: 'emergency', label: 'Emergency', x: 15, y: 15, w: 30, h: 18, color: 'from-red-500 to-rose-600', load: 94, risk: 'high', beds: 18, wait: 12 },
  { id: 'icu', label: 'ICU', x: 50, y: 10, w: 25, h: 18, color: 'from-purple-500 to-violet-600', load: 91, risk: 'high', beds: 22, wait: 0 },
  { id: 'radiology', label: 'Radiology', x: 78, y: 15, w: 20, h: 15, color: 'from-amber-500 to-orange-600', load: 78, risk: 'medium', beds: 0, wait: 28 },
  { id: 'opd', label: 'OPD', x: 10, y: 40, w: 28, h: 20, color: 'from-sky-500 to-cyan-600', load: 65, risk: 'low', beds: 0, wait: 24 },
  { id: 'general', label: 'General Ward', x: 42, y: 38, w: 30, h: 22, color: 'from-teal-500 to-emerald-600', load: 72, risk: 'low', beds: 48, wait: 0 },
  { id: 'ot', label: 'OT', x: 76, y: 38, w: 22, h: 18, color: 'from-rose-500 to-pink-600', load: 85, risk: 'medium', beds: 0, wait: 15 },
  { id: 'pharmacy', label: 'Pharmacy', x: 12, y: 66, w: 22, h: 14, color: 'from-green-500 to-emerald-600', load: 58, risk: 'low', beds: 0, wait: 6 },
  { id: 'laboratory', label: 'Lab', x: 38, y: 66, w: 22, h: 14, color: 'from-cyan-500 to-teal-600', load: 82, risk: 'medium', beds: 0, wait: 18 },
  { id: 'blood_bank', label: 'Blood Bank', x: 64, y: 66, w: 22, h: 14, color: 'from-red-500 to-rose-600', load: 45, risk: 'low', beds: 0, wait: 0 },
  { id: 'admin', label: 'Admin', x: 82, y: 62, w: 16, h: 18, color: 'from-slate-500 to-gray-600', load: 35, risk: 'low', beds: 0, wait: 0 },
];

const DigitalTwinMap = () => {
  const [selectedDept, setSelectedDept] = useState(null);
  const [loadLevels, setLoadLevels] = useState(
    Object.fromEntries(departments.map((d) => [d.id, d.load]))
  );

  // Simulate load drift
  useEffect(() => {
    const t = setInterval(() => {
      setLoadLevels((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const drift = (Math.random() - 0.5) * 6;
          next[id] = Math.max(20, Math.min(100, Math.round(next[id] + drift)));
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const glowIntensity = (load) => {
    if (load >= 85) return 'shadow-[0_0_20px_rgba(239,68,68,0.5)]';
    if (load >= 70) return 'shadow-[0_0_15px_rgba(245,158,11,0.4)]';
    return 'shadow-[0_0_10px_rgba(34,197,94,0.3)]';
  };

  const riskColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-500 bg-red-100';
      case 'medium': return 'text-amber-500 bg-amber-100';
      default: return 'text-green-500 bg-green-100';
    }
  };

  const selected = selectedDept ? departments.find((d) => d.id === selectedDept) : null;

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-cube text-indigo-500"></i>
            Hospital Digital Twin
          </h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
            </span>
            <span className="text-[10px] text-slate-400">
              <i className="fas fa-sync-alt text-[8px] mr-1"></i>Live
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* SVG Map */}
        <div className="relative w-full" style={{ aspectRatio: '100/85' }}>
          <svg viewBox="0 0 100 85" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="0.3" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <rect width="100" height="85" fill="url(#grid)" rx="6" />
            {/* Corridor lines */}
            <line x1="0" y1="35" x2="100" y2="35" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="2,3" />
            <line x1="45" y1="0" x2="45" y2="35" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="2,3" />
            <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="2,3" />
            <line x1="35" y1="35" x2="35" y2="60" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="2,3" />
            <line x1="70" y1="35" x2="70" y2="60" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="2,3" />

            {/* Department boxes */}
            {departments.map((dept) => {
              const load = loadLevels[dept.id] || dept.load;
              const isSelected = selectedDept === dept.id;
              const opacity = selectedDept && !isSelected ? 0.3 : 1;

              let fillColor;
              if (load >= 85) fillColor = '#fecaca';
              else if (load >= 70) fillColor = '#fed7aa';
              else fillColor = '#bbf7d0';

              let strokeColor;
              if (load >= 85) strokeColor = '#ef4444';
              else if (load >= 70) strokeColor = '#f97316';
              else strokeColor = '#22c55e';

              return (
                <g
                  key={dept.id}
                  onClick={() => setSelectedDept(isSelected ? null : dept.id)}
                  className="cursor-pointer"
                  filter="url(#glow)"
                >
                  <rect
                    x={dept.x}
                    y={dept.y}
                    width={dept.w}
                    height={dept.h}
                    rx="3"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2 : 1}
                    opacity={opacity}
                    className={`transition-all duration-300 ${isSelected ? 'stroke-[3]' : ''}`}
                  />
                  <text
                    x={dept.x + dept.w / 2}
                    y={dept.y + dept.h / 2 + 0.5}
                    textAnchor="middle"
                    fontSize="2.8"
                    fontWeight="700"
                    fill={isSelected ? '#1e293b' : '#475569'}
                    opacity={opacity}
                  >
                    {dept.label}
                  </text>
                  <text
                    x={dept.x + dept.w / 2}
                    y={dept.y + dept.h / 2 + 4}
                    textAnchor="middle"
                    fontSize="2"
                    fontWeight="500"
                    fill={load >= 85 ? '#dc2626' : load >= 70 ? '#ea580c' : '#16a34a'}
                    opacity={opacity}
                  >
                    {load}% load
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Selected department popover */}
          {selected && (
            <div className="absolute top-2 right-2 w-48 rounded-xl bg-white/95 backdrop-blur border border-slate-200 shadow-xl p-3 animate-fade-in z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-800">{selected.label}</p>
                <button onClick={() => setSelectedDept(null)} className="text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Load</span>
                  <span className={`font-bold ${loadLevels[selected.id] >= 85 ? 'text-red-600' : loadLevels[selected.id] >= 70 ? 'text-amber-600' : 'text-green-600'}`}>
                    {loadLevels[selected.id]}%
                  </span>
                </div>
                {selected.beds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Beds</span>
                    <span className="font-semibold text-slate-700">{selected.beds}</span>
                  </div>
                )}
                {selected.wait > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wait Time</span>
                    <span className="font-semibold text-slate-700">{selected.wait} min</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Level</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${riskColor(selected.risk)}`}>
                    {selected.risk.toUpperCase()}
                  </span>
                </div>
              </div>
              <button className="mt-2 w-full text-[10px] font-bold text-white bg-indigo-600 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">
                Open Department
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-green-400"></span>
            <span className="text-[9px] text-slate-500">Normal (&lt;70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
            <span className="text-[9px] text-slate-500">Elevated (70-85%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-400"></span>
            <span className="text-[9px] text-slate-500">Critical (&gt;85%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinMap;
