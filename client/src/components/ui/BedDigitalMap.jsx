import React, { useState } from 'react';

const wards = [
  { id: 'icu', name: 'ICU', x: 5, y: 8, w: 20, h: 22, total: 22, occupied: 19, color: 'orange', status: 'Near capacity' },
  { id: 'emergency', name: 'Emergency', x: 30, y: 8, w: 20, h: 22, total: 18, occupied: 16, color: 'red', status: 'Critical' },
  { id: 'general', name: 'General', x: 55, y: 8, w: 20, h: 22, total: 52, occupied: 40, color: 'yellow', status: 'High usage' },
  { id: 'pediatrics', name: 'Pediatrics', x: 80, y: 8, w: 15, h: 22, total: 12, occupied: 7, color: 'green', status: 'Healthy' },
  { id: 'surgery', name: 'Surgery', x: 5, y: 35, w: 20, h: 22, total: 14, occupied: 11, color: 'orange', status: 'Near capacity' },
  { id: 'cardiology', name: 'Cardiology', x: 30, y: 35, w: 20, h: 22, total: 16, occupied: 13, color: 'orange', status: 'High usage' },
  { id: 'neurology', name: 'Neurology', x: 55, y: 35, w: 20, h: 22, total: 10, occupied: 5, color: 'green', status: 'Healthy' },
  { id: 'oncology', name: 'Oncology', x: 80, y: 35, w: 15, h: 22, total: 14, occupied: 12, color: 'yellow', status: 'High usage' },
  { id: 'radiology', name: 'Radiology Rec', x: 5, y: 62, w: 20, h: 14, total: 6, occupied: 4, color: 'green', status: 'Healthy' },
  { id: 'isolation', name: 'Isolation', x: 30, y: 62, w: 20, h: 14, total: 8, occupied: 7, color: 'red', status: 'Critical' },
  { id: 'recovery', name: 'Recovery', x: 55, y: 62, w: 20, h: 14, total: 14, occupied: 9, color: 'yellow', status: 'High usage' },
  { id: 'maternity', name: 'Maternity', x: 80, y: 62, w: 15, h: 14, total: 10, occupied: 6, color: 'green', status: 'Healthy' },
];

const colorMap = {
  red: { fill: '#fef2f2', stroke: '#ef4444', text: '#dc2626', bgBadge: '#fee2e2', fillHover: '#fecaca' },
  orange: { fill: '#fff7ed', stroke: '#f97316', text: '#ea580c', bgBadge: '#ffedd5', fillHover: '#fed7aa' },
  yellow: { fill: '#fefce8', stroke: '#eab308', text: '#ca8a04', bgBadge: '#fef9c3', fillHover: '#fef08a' },
  green: { fill: '#f0fdf4', stroke: '#22c55e', text: '#16a34a', bgBadge: '#dcfce7', fillHover: '#bbf7d0' },
};

const BedDigitalMap = () => {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-map-marked-alt text-indigo-500" />Digital Hospital Map</h3>
        <span className="text-[9px] text-slate-400"><i className="fas fa-mouse-pointer text-[8px] mr-1" />Hover wards</span>
      </div>
      <div className="p-3">
        <div className="relative w-full" style={{ aspectRatio: '100/80' }}>
          <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Background grid */}
            <pattern id="bed-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.3" />
            </pattern>
            <rect width="100" height="80" fill="url(#bed-grid)" rx="4" />

            {/* Corridors */}
            <rect x="0" y="30" width="100" height="4" fill="rgba(148,163,184,0.12)" rx="1" />
            <rect x="26" y="0" width="2" height="80" fill="rgba(148,163,184,0.08)" rx="1" />
            <rect x="52" y="0" width="2" height="80" fill="rgba(148,163,184,0.08)" rx="1" />
            <rect x="77" y="0" width="2" height="80" fill="rgba(148,163,184,0.08)" rx="1" />
            <rect x="0" y="58" width="100" height="3" fill="rgba(148,163,184,0.12)" rx="1" />

            {/* Ward labels */}
            <text x="3" y="6" fontSize="1.8" fontWeight="700" fill="rgba(148,163,184,0.3)" fontFamily="monospace">NORTH WING</text>
            <text x="3" y="33" fontSize="1.8" fontWeight="700" fill="rgba(148,163,184,0.3)" fontFamily="monospace">EAST WING</text>
            <text x="3" y="60" fontSize="1.8" fontWeight="700" fill="rgba(148,163,184,0.3)" fontFamily="monospace">SOUTH WING</text>

            {wards.map((w) => {
              const c = colorMap[w.color] || colorMap.green;
              const isHovered = hovered === w.id;
              const pct = Math.round((w.occupied / w.total) * 100);
              return (
                <g key={w.id} onMouseEnter={() => setHovered(w.id)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
                  <rect x={w.x} y={w.y} width={w.w} height={w.h} rx={3}
                    fill={isHovered ? c.fillHover : c.fill}
                    stroke={isHovered ? c.stroke : 'rgba(148,163,184,0.3)'}
                    strokeWidth={isHovered ? 1.5 : 0.8}
                    className="transition-all duration-200"
                  />
                  <text x={w.x + w.w / 2} y={w.y + w.h / 3} textAnchor="middle" fontSize="2.8" fontWeight={isHovered ? '800' : '700'} fill={c.text}>{w.name}</text>
                  <text x={w.x + w.w / 2} y={w.y + w.h / 2 + 2} textAnchor="middle" fontSize="3.5" fontWeight="800" fill={c.stroke}>{w.occupied}/{w.total}</text>
                  <text x={w.x + w.w / 2} y={w.y + w.h / 1.5 + 1} textAnchor="middle" fontSize="2" fill={c.text}>{pct}%</text>
                  {isHovered && (
                    <rect x={w.x + w.w - 7} y={w.y + 1} width={6} height={3} rx={1}
                      fill={c.bgBadge} stroke={c.stroke} strokeWidth={0.3}
                    />
                  )}
                  {isHovered && (
                    <text x={w.x + w.w - 4} y={w.y + 3.2} textAnchor="middle" fontSize="1.5" fontWeight="600" fill={c.text}>{w.status}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f0fdf4] border border-[#22c55e]" /> Healthy</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fefce8] border border-[#eab308]" /> High usage</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fff7ed] border border-[#f97316]" /> Near capacity</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fef2f2] border border-[#ef4444]" /> Critical</span>
        </div>
      </div>
    </div>
  );
};

export default BedDigitalMap;
