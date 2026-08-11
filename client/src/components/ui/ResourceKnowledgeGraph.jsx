import React, { useState } from 'react';

const nodes = [
  { id: 'equipment', label: 'Equipment', x: 50, y: 8, icon: 'fa-microchip', color: 'sky' },
  { id: 'inventory', label: 'Inventory', x: 50, y: 28, icon: 'fa-boxes', color: 'indigo' },
  { id: 'departments', label: 'Departments', x: 20, y: 45, icon: 'fa-building', color: 'purple' },
  { id: 'suppliers', label: 'Suppliers', x: 80, y: 45, icon: 'fa-truck', color: 'emerald' },
  { id: 'patients', label: 'Patients', x: 20, y: 65, icon: 'fa-users', color: 'blue' },
  { id: 'maintenance', label: 'Maintenance', x: 80, y: 65, icon: 'fa-wrench', color: 'amber' },
  { id: 'orders', label: 'Orders', x: 50, y: 55, icon: 'fa-file-invoice', color: 'rose' },
  { id: 'warehouse', label: 'Warehouse', x: 50, y: 80, icon: 'fa-warehouse', color: 'teal' },
];

const connections = [
  ['equipment', 'departments'], ['equipment', 'maintenance'], ['equipment', 'patients'],
  ['inventory', 'departments'], ['inventory', 'suppliers'], ['inventory', 'warehouse'],
  ['orders', 'suppliers'], ['orders', 'warehouse'], ['orders', 'departments'],
  ['patients', 'departments'], ['maintenance', 'equipment'],
  ['departments', 'warehouse'], ['suppliers', 'warehouse'], ['inventory', 'orders'],
];

const ResourceKnowledgeGraph = () => {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-project-diagram text-indigo-500" />Resource Knowledge Graph</h3>
      </div>
      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/90' }}>
          <svg viewBox="0 0 100 90" className="w-full h-full">
            <defs>
              <filter id="rg-glow"><feGaussianBlur stdDeviation="0.5"/><feMerge><feMergeNode/></feMerge></filter>
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
                  onClick={() => setSelected(selected === n.id ? null : n.id)} className="cursor-pointer" filter="url(#rg-glow)">
                  <circle cx={n.x} cy={n.y} r={5} fill={isHovered ? '#eef2ff' : 'white'}
                    stroke={isHovered ? '#6366f1' : 'rgba(148,163,184,0.4)'}
                    strokeWidth={isHovered ? 2 : 1} className="transition-all duration-200" />
                  <text x={n.x} y={n.y + 0.5} textAnchor="middle" fontSize="2.5" fontWeight={isHovered ? '800' : '600'}
                    fill={isHovered ? '#4338ca' : '#64748b'}>{n.label}</text>
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="1.6" fill={isHovered ? '#818cf8' : '#94a3b8'}>
                    {n.id === 'equipment' ? '156 items' : n.id === 'inventory' ? '342 types' : n.id === 'departments' ? '12' : n.id === 'suppliers' ? '8' : n.id === 'patients' ? '186' : n.id === 'maintenance' ? '14 pending' : n.id === 'orders' ? '8 active' : '4 locations'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {selected && (
          <div className="mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] animate-fade-in">
            <p className="font-semibold text-indigo-700">{nodes.find(n => n.id === selected)?.label}</p>
            <p className="text-indigo-500">AI: {selected === 'equipment' ? '156 equipment items, 4 under maintenance' : selected === 'inventory' ? '342 inventory types across 12 departments' : selected === 'departments' ? '12 departments, 3 with critical resource needs' : selected === 'suppliers' ? '8 active suppliers, 1 under watch' : selected === 'patients' ? '186 patients consuming resources across all depts' : selected === 'maintenance' ? '14 pending maintenance tasks, 2 urgent' : selected === 'orders' ? '8 active purchase orders totaling $26,400' : '4 warehouse locations, 78% capacity utilized'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceKnowledgeGraph;
