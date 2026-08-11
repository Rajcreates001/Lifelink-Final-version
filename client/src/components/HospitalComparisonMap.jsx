/**
 * HospitalComparisonMap — Mini-map widget for Resource Intelligence
 *
 * Shows 3-4 nearest hospitals with animated bed availability bars,
 * an abstract SVG mini-map with hospital pins, distance & ETA,
 * and occupancy status indicators.
 *
 * Designed to slot into the Resource Intelligence card in RequestsTab.
 */
import React, { useEffect, useMemo, useState } from 'react';

// ─── Mock nearest hospitals (will be replaced with real API data) ──
const MOCK_NEAREST = [
  {
    id: 'h1', name: 'City Medical Center', distance_km: 2.3, eta_min: 5,
    beds: { icu: { total: 10, occupied: 6 }, emergency: { total: 8, occupied: 4 }, general: { total: 15, occupied: 12 } },
    rating: 4.7, specialties: ['Trauma', 'Cardiology', 'Neurology'],
    latPct: 38, lngPct: 42, score: 94,
  },
  {
    id: 'h2', name: 'St. Mary\'s Hospital', distance_km: 5.8, eta_min: 11,
    beds: { icu: { total: 10, occupied: 5 }, emergency: { total: 8, occupied: 3 }, general: { total: 12, occupied: 7 } },
    rating: 4.5, specialties: ['Emergency', 'Orthopedics', 'Pediatrics'],
    latPct: 65, lngPct: 28, score: 87,
  },
  {
    id: 'h3', name: 'University Health Center', distance_km: 8.1, eta_min: 16,
    beds: { icu: { total: 12, occupied: 4 }, emergency: { total: 6, occupied: 5 }, general: { total: 10, occupied: 8 } },
    rating: 4.8, specialties: ['Cardiology', 'Oncology', 'Neurology'],
    latPct: 22, lngPct: 72, score: 76,
  },
  {
    id: 'h4', name: 'Northside Emergency Care', distance_km: 11.4, eta_min: 22,
    beds: { icu: { total: 8, occupied: 2 }, emergency: { total: 6, occupied: 2 }, general: { total: 20, occupied: 14 } },
    rating: 4.2, specialties: ['Emergency', 'Trauma'],
    latPct: 78, lngPct: 65, score: 69,
  },
];

// ─── Helpers ──────────────────────────────────────────
function occPercent(occ, total) {
  if (!total) return 0;
  return Math.round((occ / total) * 100);
}

function statusLabel(pct) {
  if (pct >= 90) return { label: 'Full', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' };
  if (pct >= 65) return { label: 'Limited', color: '#F97316', bg: 'rgba(249,115,22,0.12)' };
  return { label: 'Available', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
}

// ─── Animated bar ─────────────────────────────────────
function BedBar({ value, total, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(occPercent(value, total)), 300);
    return () => clearTimeout(timer);
  }, [value, total]);
  const pct = occPercent(value, total);
  return (
    <div className="flex items-center gap-2 text-[9px]">
      <span className="w-12 text-gray-400 shrink-0">{total} total</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 text-right font-medium" style={{ color }}>{value}/{total}</span>
    </div>
  );
}

// ─── Count-up helper ──────────────────────────────────
function useCountUpValue(target) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    if (target === 0) { setCount(0); return; }
    const step = Math.max(1, Math.ceil(target / (1000 / 16)));
    let start = 0;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return count;
}

// ─── Main Component ───────────────────────────────────
const HospitalComparisonMap = ({ hospitals: externalHospitals, className = '' }) => {
  const hospitals = externalHospitals && externalHospitals.length >= 3 ? externalHospitals : MOCK_NEAREST;
  const [expandedIdx, setExpandedIdx] = useState(null);
  const totalBeds = useMemo(() => hospitals.reduce((a, h) => a + (h.beds?.icu?.total || 0) + (h.beds?.emergency?.total || 0) + (h.beds?.general?.total || 0), 0), [hospitals]);
  const occBeds = useMemo(() => hospitals.reduce((a, h) => a + (h.beds?.icu?.occupied || 0) + (h.beds?.emergency?.occupied || 0) + (h.beds?.general?.occupied || 0), 0), [hospitals]);
  const totalCount = useCountUpValue(totalBeds);
  const occCount = useCountUpValue(occBeds);

  return (
    <div className={`${className}`}>
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] shadow-sm">
            <i className="fas fa-building-columns" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-xs">Hospital Comparison</p>
            <p className="text-[8px] text-gray-400">Nearest hospitals • Bed availability</p>
          </div>
        </div>
        {/* Mini occupancy summary */}
        <div className="flex items-center gap-2 text-[9px]">
          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
            {totalCount} beds
          </span>
          <span className={`px-1.5 py-0.5 rounded-full font-medium ${
            occBeds / totalBeds > 0.8 ? 'bg-red-50 text-red-600' :
            occBeds / totalBeds > 0.6 ? 'bg-amber-50 text-amber-600' :
            'bg-emerald-50 text-emerald-600'
          }`}>
            {occCount} occupied
          </span>
        </div>
      </div>

      {/* ── Mini-map + Hospital list (side-by-side) ── */}
      <div className="flex gap-4">
        {/* SVG Mini-Map */}
        <div className="relative w-[130px] h-[130px] shrink-0 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 overflow-hidden">
          {/* Grid lines */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
            <line x1="0" y1="25" x2="100" y2="25" stroke="#CBD5E1" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#CBD5E1" strokeWidth="0.5" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#CBD5E1" strokeWidth="0.5" />
            <line x1="25" y1="0" x2="25" y2="100" stroke="#CBD5E1" strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#CBD5E1" strokeWidth="0.5" />
            <line x1="75" y1="0" x2="75" y2="100" stroke="#CBD5E1" strokeWidth="0.5" />
          </svg>
          {/* Connecting lines from center to hospitals */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            {hospitals.slice(0, 4).map((h) => (
              <line key={`line-${h.id}`}
                x1="50" y1="50" x2={h.lngPct} y2={h.latPct}
                stroke={expandedIdx === h.id ? '#6366F1' : '#E2E8F0'}
                strokeWidth={expandedIdx === h.id ? 1.5 : 0.8}
                strokeDasharray="3,3"
                className="transition-all duration-300"
              />
            ))}
          </svg>
          {/* Pins */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            {/* Center "You are here" */}
            <circle cx="50" cy="50" r="6" fill="#DC2626" className="animate-ping-slow" opacity="0.3" />
            <circle cx="50" cy="50" r="4" fill="#DC2626" />
            <circle cx="50" cy="50" r="1.5" fill="#fff" />
            {/* Hospital pins */}
            {hospitals.slice(0, 4).map((h, i) => {
              const isActive = expandedIdx === h.id;
              const colors = ['#2563EB', '#8B5CF6', '#06B6D4', '#F97316'];
              return (
                <g key={`pin-${h.id}`} className="cursor-pointer" onClick={() => setExpandedIdx(isActive ? null : h.id)}>
                  {/* Glow */}
                  {isActive && (
                    <circle cx={h.lngPct} cy={h.latPct} r="8" fill={colors[i]} opacity="0.15" className="animate-ping-slow" />
                  )}
                  {/* Pin */}
                  <circle cx={h.lngPct} cy={h.latPct} r={isActive ? 5 : 3.5}
                    fill={isActive ? colors[i] : '#fff'}
                    stroke={colors[i]}
                    strokeWidth={isActive ? 2 : 1.5}
                    className="transition-all duration-200"
                  />
                  {/* Label */}
                  <text x={h.lngPct} y={h.latPct - 7} textAnchor="middle"
                    fontSize="4" fontWeight="600" fill="#64748B">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div className="absolute bottom-1 left-1 right-1 flex justify-between px-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[6px] text-gray-400">You</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[6px] text-gray-400">Hosp</span>
            </div>
          </div>
        </div>

        {/* Hospital List */}
        <div className="flex-1 min-w-0 space-y-2">
          {hospitals.slice(0, 4).map((h, i) => {
            const occIcu = occPercent(h.beds?.icu?.occupied || 0, h.beds?.icu?.total || 1);
            const occEmer = occPercent(h.beds?.emergency?.occupied || 0, h.beds?.emergency?.total || 1);
            const occGen = occPercent(h.beds?.general?.occupied || 0, h.beds?.general?.total || 1);
            const avgOcc = Math.round((occIcu + occEmer + occGen) / 3);
            const status = statusLabel(avgOcc);
            const isActive = expandedIdx === h.id;
            const colors = ['#2563EB', '#8B5CF6', '#06B6D4', '#F97316'];

            return (
              <div key={h.id}
                onClick={() => setExpandedIdx(isActive ? null : h.id)}
                className={`p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                  isActive ? 'shadow-sm scale-[1.01]' : 'hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: `${colors[i]}06`, borderColor: `${colors[i]}20` } : { borderColor: '#F1F5F9' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold text-white shrink-0" style={{ backgroundColor: colors[i] }}>
                      {i + 1}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-700 truncate">{h.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] text-gray-400">{h.distance_km} km</span>
                    <span className={`text-[7px] font-semibold px-1 py-0.5 rounded-full`}
                      style={{ backgroundColor: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    <span className="text-[8px] font-bold" style={{ color: colors[i] }}>{h.score}%</span>
                  </div>
                </div>

                {/* Expanded bed details */}
                {isActive && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5 animate-fade-in-up">
                    <div className="flex items-center gap-1 text-[8px] text-gray-400 mb-1">
                      <i className="fas fa-clock text-[7px]" /> ETA {h.eta_min} min
                      <span className="mx-1">•</span>
                      <i className="fas fa-star text-[7px]" /> {h.rating}
                      <span className="mx-1">•</span>
                      <span className="truncate">{h.specialties?.slice(0, 2).join(', ')}</span>
                    </div>
                    <BedBar value={h.beds?.icu?.occupied || 0} total={h.beds?.icu?.total || 1} color={colors[i]} />
                    <BedBar value={h.beds?.emergency?.occupied || 0} total={h.beds?.emergency?.total || 1} color={colors[i]} />
                    <BedBar value={h.beds?.general?.occupied || 0} total={h.beds?.general?.total || 1} color={colors[i]} />
                    {/* Quick actions */}
                    <div className="flex gap-1.5 mt-1.5">
                      <button className="flex-1 text-[7px] font-semibold py-1 rounded-md transition-all duration-150 hover:shadow-sm"
                        style={{ backgroundColor: `${colors[i]}12`, color: colors[i] }}
                        onClick={(e) => { e.stopPropagation(); }}>
                        <i className="fas fa-location-dot mr-0.5" /> Navigate
                      </button>
                      <button className="flex-1 text-[7px] font-semibold py-1 rounded-md transition-all duration-150 hover:shadow-sm"
                        style={{ backgroundColor: `${colors[i]}12`, color: colors[i] }}
                        onClick={(e) => { e.stopPropagation(); }}>
                        <i className="fas fa-phone mr-0.5" /> Contact
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapsed mini bars */}
                {!isActive && (
                  <div className="flex gap-2 mt-1">
                    {[
                      { label: 'ICU', pct: occIcu, color: colors[i] },
                      { label: 'ER', pct: occEmer, color: colors[i] },
                      { label: 'Gen', pct: occGen, color: colors[i] },
                    ].map((b) => (
                      <div key={b.label} className="flex-1">
                        <div className="flex justify-between text-[7px] text-gray-400 mb-0.5">
                          <span>{b.label}</span>
                          <span>{b.pct}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(b.pct, 100)}%`, backgroundColor: b.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HospitalComparisonMap;
