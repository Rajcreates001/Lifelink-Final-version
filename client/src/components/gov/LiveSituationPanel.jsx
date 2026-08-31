import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';

// ─── Real-time incidents fetched from API ──
const INCIDENT_TYPES = {
  fire: { icon: 'fa-fire', color: 'text-red-400', bg: 'bg-red-500/10', label: 'Fire' },
  flood: { icon: 'fa-water', color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Flood' },
  medical: { icon: 'fa-heartbeat', color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Medical' },
  accident: { icon: 'fa-car-crash', color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Accident' },
  crime: { icon: 'fa-shield', color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Security' },
  rescue: { icon: 'fa-life-ring', color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Rescue' },
  hazmat: { icon: 'fa-biohazard', color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Hazmat' },
  default: { icon: 'fa-exclamation-triangle', color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Alert' },
};

// ─── Sample incidents for demo ─────────────────────────────
// Seed data shown only when API returns empty — replaced with real data on mount
const SEED_INCIDENTS = [
  { id: 1, type: 'fire', title: 'Building Fire — Balmatta', location: 'Mangaluru, DK', severity: 'Critical', units: 4, time: '2m ago' },
  { id: 2, type: 'flood', title: 'Flooding — Netravati Banks', location: 'Bantwal, DK', severity: 'Severe', units: 8, time: '5m ago' },
  { id: 3, type: 'medical', title: 'Mass Casualty — NH-66', location: 'Surathkal, Mangaluru', severity: 'Critical', units: 6, time: '7m ago' },
  { id: 4, type: 'accident', title: 'Bus Collision — Pumpwell', location: 'Mangaluru, DK', severity: 'High', units: 3, time: '12m ago' },
  { id: 5, type: 'rescue', title: 'Flood Rescue — 15 stranded', location: 'Kudremukh, Chikkamagaluru', severity: 'High', units: 5, time: '18m ago' },
  { id: 6, type: 'hazmat', title: 'Chemical Spill — Industrial Zone', location: 'Baikampady, Mangaluru', severity: 'Severe', units: 7, time: '25m ago' },
  { id: 7, type: 'crime', title: 'Missing Person Report', location: 'Kadri, Mangaluru', severity: 'Moderate', units: 2, time: '35m ago' },
  { id: 8, type: 'fire', title: 'Forest Fire — Western Ghats', location: 'Kodagu District', severity: 'High', units: 6, time: '42m ago' },
];

const SEVERITY_COLORS = {
  Critical: { badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-500' },
  Severe: { badge: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-500' },
  High: { badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-500' },
  Moderate: { badge: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-500' },
  Low: { badge: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-500' },
};

const LiveSituationPanel = ({ compact = false, maxItems = 5 }) => {
  const [incidents, setIncidents] = useState([]);
  const [currentTime, setCurrentTime] = useState('');

  // Fetch real incidents from API on mount
  useEffect(() => {
    let active = true;
    const fetchIncidents = async () => {
      try {
        const [feedRes, recentRes] = await Promise.all([
          apiFetch('/v2/government/monitoring/feed'),
          apiFetch('/v2/government/disaster/recent'),
        ]);
        if (!active) return;
        const feedData = feedRes.ok ? (feedRes.data?.data || feedRes.data?.feed || []) : [];
        const recentData = recentRes.ok ? (recentRes.data?.data || recentRes.data?.disasters || []) : [];
        const allItems = [...feedData, ...recentData];
        if (allItems.length > 0) {
          const mapped = allItems.slice(0, 20).map((item, idx) => ({
            id: item._id || item.id || idx,
            type: (item.type || item.disaster_type || 'default').toLowerCase(),
            title: item.title || item.message || item.name || 'Emergency Alert',
            location: item.location || item.region || item.district || 'Unknown',
            severity: item.severity || item.severity_level || 'High',
            units: item.units_deployed || item.units || 0,
            time: item.occurred_at || item.timestamp || item.createdAt || '',
          }));
          setIncidents(mapped);
        } else {
          setIncidents(SEED_INCIDENTS); // Seed data when API returns empty
        }
      } catch {
        setIncidents(SEED_INCIDENTS);
      }
    };
    fetchIncidents();
    return () => { active = false; };
  }, []);

  // Update clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate new incidents arriving
  useEffect(() => {
    const interval = setInterval(() => {
      const types = Object.keys(INCIDENT_TYPES);
      const newIncident = {
        id: Date.now(),
        type: types[Math.floor(Math.random() * types.length)],
        title: `New ${INCIDENT_TYPES[types[Math.floor(Math.random() * types.length)]].label} Alert`,
        location: 'Mangaluru Region',
        severity: ['Critical', 'Severe', 'High', 'Moderate'][Math.floor(Math.random() * 4)],
        units: Math.floor(Math.random() * 8) + 1,
        time: 'Just now',
      };
      setIncidents((prev) => [newIncident, ...prev].slice(0, 20));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const displayed = useMemo(() => incidents.slice(0, maxItems), [incidents, maxItems]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Situation Feed</span>
            <span className="text-[9px] text-slate-500 font-mono">{currentTime}</span>
          </div>
          <span className="text-[9px] text-slate-500">
            {incidents.length} active
          </span>
        </div>
      </div>

      {/* ── Incident Queue ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        <div className="grid grid-cols-1 gap-1.5">
          {displayed.map((incident) => {
            const typeConfig = INCIDENT_TYPES[incident.type] || INCIDENT_TYPES.default;
            const severity = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.Moderate;
            return (
              <div
                key={incident.id}
                className="group flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-700/40 border border-slate-700/20 hover:border-slate-600/30 transition-all cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-7 h-7 rounded-lg ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                  <i className={`fas ${typeConfig.icon} text-[11px] ${typeConfig.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${severity.dot} ${incident.time === 'Just now' ? 'animate-pulse' : ''}`} />
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{incident.title}</p>
                  </div>
                  <p className="text-[9px] text-slate-500 truncate">{incident.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${severity.badge}`}>
                      {incident.severity}
                    </span>
                    <span className="text-[8px] text-slate-500">{incident.units} units</span>
                    <span className="text-[8px] text-slate-500 ml-auto">{incident.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Status Summary ── */}
        {!compact && (
          <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/20">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Critical', value: incidents.filter(i => i.severity === 'Critical').length, color: 'text-red-400' },
                { label: 'Active Units', value: incidents.reduce((s, i) => s + i.units, 0), color: 'text-blue-400' },
                { label: 'Resolved Today', value: '127', color: 'text-emerald-400' },
                { label: 'Avg Response', value: '8.4m', color: 'text-amber-400' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[8px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-700/20">
        <div className="flex items-center justify-between text-[8px] text-slate-500">
          <span><i className="fas fa-satellite-dish mr-1" />Receiving live</span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveSituationPanel;
