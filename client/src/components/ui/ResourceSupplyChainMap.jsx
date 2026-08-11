import React from 'react';

const stages = [
  { label: 'Manufacturer', icon: 'fa-industry', x: 50, y: 5, desc: '3 active', color: 'emerald' },
  { label: 'Distributor', icon: 'fa-warehouse', x: 50, y: 22, desc: '5 partners', color: 'blue' },
  { label: 'Regional WH', icon: 'fa-building-warehouse', x: 50, y: 39, desc: '2 locations', color: 'indigo' },
  { label: 'Hospital', icon: 'fa-hospital', x: 50, y: 56, desc: 'Your hospital', color: 'purple' },
  { label: 'Departments', icon: 'fa-building', x: 50, y: 73, desc: '12 depts', color: 'sky' },
  { label: 'Patients', icon: 'fa-users', x: 50, y: 88, desc: '186 patients', color: 'teal' },
];

const flowLines = [
  [0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5],
];

const ResourceSupplyChainMap = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-network-wired text-cyan-500" />Supply Chain Map</h3>
      </div>
      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/95' }}>
          <svg viewBox="0 0 100 95" className="w-full h-full">
            {flowLines.map(([a, b]) => (
              <line key={a + '-' + b} x1={stages[a].x} y1={stages[a].y + 3} x2={stages[b].x} y2={stages[b].y - 3}
                stroke="rgba(148,163,184,0.2)" strokeWidth={0.5} />
            ))}
            {stages.map((s, i) => (
              <g key={s.label}>
                <rect x={s.x - 14} y={s.y} width={28} height={10} rx={5} fill="white" stroke="rgba(148,163,184,0.3)" strokeWidth={0.8} className="hover:stroke-indigo-400 transition-all cursor-pointer" />
                <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="3" fontWeight="700" fill="#475569">{s.label}</text>
                <text x={s.x} y={s.y + 8} textAnchor="middle" fontSize="2" fill="#94a3b8">{s.desc}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ResourceSupplyChainMap;
