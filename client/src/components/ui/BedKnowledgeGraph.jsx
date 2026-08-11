import React, { useState } from 'react';

const nodes = [
  { id: 'patients', label: 'Patients', x: 50, y: 10, icon: 'fa-users', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'beds', label: 'Beds', x: 50, y: 30, icon: 'fa-bed', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'doctors', label: 'Doctors', x: 20, y: 45, icon: 'fa-user-doctor', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'nurses', label: 'Nurses', x: 80, y: 45, icon: 'fa-user-nurse', color: 'text-sky-500', bg: 'bg-sky-50' },
  { id: 'equipment', label: 'Equipment', x: 20, y: 65, icon: 'fa-briefcase-medical', color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'departments', label: 'Departments', x: 50, y: 55, icon: 'fa-building', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'medicines', label: 'Medicines', x: 80, y: 65, icon: 'fa-tablets', color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'transfers', label: 'Transfers', x: 50, y: 80, icon: 'fa-arrow-right-arrow-left', color: 'text-cyan-500', bg: 'bg-cyan-50' },
];

const connections = [
  ['patients', 'beds'], ['patients', 'doctors'], ['patients', 'nurses'],
  ['beds', 'departments'], ['beds', 'equipment'],
  ['doctors', 'departments'], ['nurses', 'departments'],
  ['departments', 'medicines'], ['departments', 'transfers'],
  ['equipment', 'departments'], ['patients', 'transfers'],
  ['beds', 'transfers'], ['patients', 'medicines'],
];

const BedKnowledgeGraph = () => {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-project-diagram text-indigo-500" />Bed Knowledge Graph</h3>
      </div>
      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/92' }}>
          <svg viewBox="0 0 100 92" className="w-full h-full">
            <defs>
              <filter id="bg-glow"><feGaussianBlur stdDeviation="0.5"/><feMerge><feMergeNode/></feMerge></filter>
            </defs>
            {connections.map(([a, b]) => {
              const na = nodes.find(n => n.id === a);
              const nb = nodes.find(n => n.id === b);
              if (!na || !nb) return null;
              const isActive = hovered && (hovered === a || hovered === b);
              return <line key={a + '-' + b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={isActive ? '#6366f1' : 'rgba(148,163,184,0.2)'}
                strokeWidth={isActive ? 1.5 : 0.5} className="transition-all duration-300" />;
            })}
            {nodes.map((n) => {
              const isHovered = hovered === n.id;
              return (
                <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(selected === n.id ? null : n.id)} className="cursor-pointer" filter="url(#bg-glow)">
                  <circle cx={n.x} cy={n.y} r={5} fill={isHovered ? '#eef2ff' : 'white'}
                    stroke={isHovered ? '#6366f1' : 'rgba(148,163,184,0.4)'}
                    strokeWidth={isHovered ? 2 : 1} className="transition-all duration-200" />
                  <text x={n.x} y={n.y + 0.5} textAnchor="middle" fontSize="2.5" fontWeight={isHovered ? '800' : '600'}
                    fill={isHovered ? '#4338ca' : '#64748b'}>{n.label}</text>
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="1.6" fill={isHovered ? '#818cf8' : '#94a3b8'}>
                    {n.id === 'patients' ? '186' : n.id === 'beds' ? '184' : n.id === 'doctors' ? '42' : n.id === 'nurses' ? '92' : n.id === 'equipment' ? '156' : n.id === 'departments' ? '12' : n.id === 'medicines' ? '342' : '28'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {selected && (
          <div className="mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] animate-fade-in">
            <p className="font-semibold text-indigo-700">{nodes.find(n => n.id === selected)?.label}</p>
            <p className="text-indigo-500">AI: {selected === 'patients' ? '186 patients across 8 wards' : selected === 'beds' ? '184 beds, 71% occupied, 12 cleaning' : selected === 'doctors' ? '42 doctors, 38 on duty' : selected === 'nurses' ? '92 nurses, 78 on duty' : selected === 'equipment' ? '156 equipment items, 4 under maintenance' : selected === 'departments' ? '12 departments, 3 near capacity' : selected === 'medicines' ? '342 medicine types, 6 low stock' : '28 active transfers, 4 pending'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BedKnowledgeGraph;
