import React, { useState } from 'react';

const graphNodes = [
  { id: 'patients', label: 'Patients', x: 50, y: 15, size: 24, icon: 'fa-users', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600', connections: ['doctors', 'departments', 'diseases', 'medicines'] },
  { id: 'doctors', label: 'Doctors', x: 15, y: 40, size: 20, icon: 'fa-user-md', color: 'from-emerald-500 to-emerald-600', textColor: 'text-emerald-600', connections: ['departments', 'patients'] },
  { id: 'departments', label: 'Departments', x: 50, y: 50, size: 22, icon: 'fa-building', color: 'from-purple-500 to-purple-600', textColor: 'text-purple-600', connections: ['patients', 'doctors', 'resources', 'medicines'] },
  { id: 'diseases', label: 'Diseases', x: 85, y: 40, size: 18, icon: 'fa-biohazard', color: 'from-red-500 to-red-600', textColor: 'text-red-600', connections: ['patients', 'medicines'] },
  { id: 'resources', label: 'Resources', x: 25, y: 70, size: 18, icon: 'fa-boxes', color: 'from-teal-500 to-teal-600', textColor: 'text-teal-600', connections: ['departments'] },
  { id: 'medicines', label: 'Medicines', x: 65, y: 72, size: 18, icon: 'fa-tablets', color: 'from-amber-500 to-amber-600', textColor: 'text-amber-600', connections: ['patients', 'diseases', 'departments'] },
  { id: 'laboratory', label: 'Lab Tests', x: 88, y: 68, size: 16, icon: 'fa-flask', color: 'from-cyan-500 to-cyan-600', textColor: 'text-cyan-600', connections: ['patients', 'doctors'] },
  { id: 'blood', label: 'Blood Bank', x: 8, y: 82, size: 14, icon: 'fa-droplet', color: 'from-rose-500 to-rose-600', textColor: 'text-rose-600', connections: ['patients', 'resources'] },
];

const AiKnowledgeGraph = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const selected = selectedNode ? graphNodes.find((n) => n.id === selectedNode) : null;
  const activeHover = hoveredNode || selectedNode;

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-project-diagram text-indigo-500"></i>
            AI Knowledge Graph
          </h3>
          <span className="text-[10px] text-slate-400">42,816 nodes</span>
        </div>
      </div>

      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/92' }}>
          <svg viewBox="0 0 100 92" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="kg-glow">
                <feGaussianBlur stdDeviation="0.6" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Connections */}
            {graphNodes.map((node) =>
              node.connections.map((targetId) => {
                const target = graphNodes.find((n) => n.id === targetId);
                if (!target) return null;
                const isActive = activeHover && (activeHover === node.id || activeHover === target.id);
                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={node.x} y1={node.y}
                    x2={target.x} y2={target.y}
                    stroke={isActive ? '#6366f1' : 'rgba(148,163,184,0.3)'}
                    strokeWidth={isActive ? 1.5 : 0.6}
                    strokeOpacity={isActive ? 0.8 : 1}
                    className="transition-all duration-300"
                  />
                );
              })
            )}

            {/* Nodes */}
            {graphNodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isHovered = hoveredNode === node.id;
              const isConnected = activeHover && node.connections.includes(activeHover);
              const isDimmed = activeHover && !isSelected && !isHovered && !isConnected && activeHover !== node.id;
              const isRelated = activeHover && (isConnected || isHovered || isSelected);

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  filter="url(#kg-glow)"
                >
                  <circle
                    cx={node.x} cy={node.y} r={node.size / 2}
                    fill={isSelected || isHovered ? '#eef2ff' : isRelated ? '#f8fafc' : 'white'}
                    stroke={isSelected || isHovered ? '#6366f1' : isRelated ? '#818cf8' : 'rgba(148,163,184,0.4)'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                    opacity={isDimmed ? 0.3 : 1}
                    className="transition-all duration-300"
                  />
                  <text
                    x={node.x} y={node.y + 0.8}
                    textAnchor="middle"
                    fontSize="8"
                    fill={isSelected || isHovered ? '#4338ca' : isRelated ? '#6366f1' : '#64748b'}
                    fontWeight={isSelected || isHovered ? '800' : '600'}
                    opacity={isDimmed ? 0.3 : 1}
                    className="transition-all duration-300"
                  >
                    <tspan x={node.x} dy="-3">{node.label}</tspan>
                    <tspan x={node.x} dy="4.5" fontSize="5" fill={isSelected || isHovered ? '#818cf8' : '#94a3b8'}>
                      {node.id === 'patients' ? '1,246' : node.id === 'doctors' ? '84' : node.id === 'departments' ? '12' : node.id === 'diseases' ? '28' : node.id === 'resources' ? '156' : node.id === 'medicines' ? '342' : node.id === 'laboratory' ? '64' : '48'}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Selected node detail popover */}
          {selected && (
            <div className="absolute top-2 right-2 w-44 rounded-xl bg-white/95 backdrop-blur border border-slate-200 shadow-xl p-3 animate-fade-in z-10">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-800">{selected.label}</p>
                <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-[10px]"></i></button>
              </div>
              <div className="space-y-1 text-[9px]">
                <div className="flex justify-between"><span className="text-slate-400">Connections</span><span className="font-semibold text-slate-700">{selected.connections.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Records</span><span className="font-semibold text-slate-700">{selected.id === 'patients' ? '1,246' : selected.id === 'doctors' ? '84' : '42'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">AI Confidence</span><span className="font-semibold text-indigo-600">94%</span></div>
                <p className="text-slate-500 mt-1">
                  <i className="fas fa-robot text-indigo-400 text-[7px] mr-0.5"></i>
                  Connected to: {selected.connections.map((c) => graphNodes.find((n) => n.id === c)?.label).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-[8px] text-slate-400"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>Click nodes to explore</span>
          <span className="text-slate-200">|</span>
          <span className="text-[8px] text-slate-400">AI-powered relationship mapping</span>
        </div>
      </div>
    </div>
  );
};

export default AiKnowledgeGraph;
