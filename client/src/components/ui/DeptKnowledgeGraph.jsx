import React, { useState } from 'react';

const nodes = [
  { id: 'emergency', label: 'Emergency', x: 50, y: 12, icon: 'fa-ambulance', color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'icu', label: 'ICU', x: 20, y: 35, icon: 'fa-heart-pulse', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'radiology', label: 'Radiology', x: 80, y: 35, icon: 'fa-x-ray', color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'opd', label: 'OPD', x: 15, y: 60, icon: 'fa-user-doctor', color: 'text-sky-500', bg: 'bg-sky-50' },
  { id: 'surgery', label: 'OT', x: 50, y: 50, icon: 'fa-scalpel', color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'lab', label: 'Lab', x: 82, y: 62, icon: 'fa-flask', color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { id: 'blood', label: 'Blood Bank', x: 50, y: 78, icon: 'fa-droplet', color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'pharmacy', label: 'Pharmacy', x: 20, y: 82, icon: 'fa-tablets', color: 'text-green-500', bg: 'bg-green-50' },
];

const connections = [
  ['emergency', 'icu'], ['emergency', 'radiology'], ['emergency', 'surgery'],
  ['icu', 'surgery'], ['radiology', 'lab'], ['surgery', 'lab'],
  ['surgery', 'blood'], ['lab', 'blood'], ['opd', 'pharmacy'],
  ['opd', 'radiology'], ['icu', 'blood'], ['emergency', 'lab'],
];

const DeptKnowledgeGraph = () => {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-project-diagram text-indigo-500"></i>Department Knowledge Graph</h3>
      </div>
      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/92' }}>
          <svg viewBox="0 0 100 92" className="w-full h-full">
            <defs><filter id="kg-glow2"><feGaussianBlur stdDeviation="0.5"/><feMerge><feMergeNode/></feMerge></filter></defs>
            {connections.map(([a, b]) => {
              const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b);
              if (!na || !nb) return null;
              const isActive = hovered && (hovered === a || hovered === b);
              return <line key={a + '-' + b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={isActive ? '#6366f1' : 'rgba(148,163,184,0.25)'} strokeWidth={isActive ? 1.5 : 0.5} className="transition-all duration-300" />;
            })}
            {nodes.map((n) => {
              const isHovered = hovered === n.id;
              return (
                <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} className="cursor-pointer" filter="url(#kg-glow2)">
                  <circle cx={n.x} cy={n.y} r={5} fill={isHovered ? '#eef2ff' : 'white'} stroke={isHovered ? '#6366f1' : 'rgba(148,163,184,0.4)'} strokeWidth={isHovered ? 2 : 1} className="transition-all duration-200" />
                  <text x={n.x} y={n.y + 0.5} textAnchor="middle" fontSize="2.8" fontWeight={isHovered ? '800' : '600'} fill={isHovered ? '#4338ca' : '#64748b'}>{n.label}</text>
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="1.8" fill={isHovered ? '#818cf8' : '#94a3b8'}>
                    {n.id === 'emergency' ? '18 pts' : n.id === 'icu' ? '14 pts' : n.id === 'radiology' ? '12 pts' : n.id === 'opd' ? '42 pts' : n.id === 'surgery' ? '8 pts' : n.id === 'lab' ? '22 tests' : n.id === 'blood' ? '48 units' : '342 items'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center justify-center gap-2 mt-1 text-[8px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>Click/hover nodes to explore connections
        </div>
      </div>
    </div>
  );
};

export default DeptKnowledgeGraph;
