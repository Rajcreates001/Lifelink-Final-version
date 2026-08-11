import React, { useEffect, useState } from 'react';

// ── Golden Hour Timer ──────────────────────────────────────────────
const GoldenHourTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  const goldenHourSeconds = 3600;

  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const remaining = Math.max(0, goldenHourSeconds - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (elapsed / goldenHourSeconds) * 100;
  const critical = remaining < 600;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9">
        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="18" cy="18" r="16" fill="none" stroke={critical ? '#ef4444' : '#f59e0b'} strokeWidth="3"
            strokeDasharray={`${(1 - pct / 100) * 100} 100`} strokeLinecap="round" />
        </svg>
        <i className={`fas fa-clock absolute inset-0 flex items-center justify-center text-[9px] ${critical ? 'text-red-500' : 'text-amber-500'}`} />
      </div>
      <div className="leading-tight">
        <p className={`text-[9px] font-bold uppercase ${critical ? 'text-red-600' : 'text-amber-600'}`}>Golden Hour</p>
        <p className={`text-sm font-black font-mono ${critical ? 'text-red-700' : 'text-slate-900'}`}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
};

// ── Mission Timer ──────────────────────────────────────────────────
const MissionTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <div className="flex items-center gap-1.5">
      <i className="fas fa-stopwatch text-slate-400 text-[10px]" />
      <span className="font-mono text-xs font-bold text-slate-800">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
      <span className="text-[8px] text-slate-400 uppercase">mission</span>
    </div>
  );
};

// ── Main Header ────────────────────────────────────────────────────
const AmbulanceMissionHeader = ({
  patientName,
  severity,
  eta,
  incidentLabel,
  vehicleLabel,
  speedKph,
  missionStart,
  onSwitchModule,
}) => {
  const severityColor = severity === 'Critical' ? 'red' : severity === 'High' ? 'amber' : 'sky';
  const badgeColors = { red: 'bg-red-100 text-red-700 border-red-200', amber: 'bg-amber-100 text-amber-700 border-amber-200', sky: 'bg-sky-100 text-sky-700 border-sky-200' };

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-4 px-4 py-2.5">
        {/* Left: Mission identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <i className="fas fa-truck-medical text-xs" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 truncate">{incidentLabel || 'Active Mission'}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColors[severityColor] || badgeColors.sky}`}>
                {severity || 'Active'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              <i className="fas fa-user-injured mr-1" />
              {patientName || 'Unknown'} · {vehicleLabel || 'Ambulance A1'}
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 shrink-0" />

        {/* Golden Hour */}
        <GoldenHourTimer startTime={missionStart} />

        <div className="h-6 w-px bg-slate-200 shrink-0" />

        {/* Mission Timer */}
        <MissionTimer startTime={missionStart} />

        <div className="h-6 w-px bg-slate-200 shrink-0" />

        {/* ETA & Speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <i className="fas fa-location-dot text-sky-500 text-[10px]" />
            <span className="text-xs font-bold text-slate-800">{eta || '--'}<span className="text-[9px] font-medium text-slate-400 ml-0.5">min</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fas fa-gauge-high text-emerald-500 text-[10px]" />
            <span className="text-xs font-bold text-slate-800">{speedKph || '--'}<span className="text-[9px] font-medium text-slate-400 ml-0.5">km/h</span></span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>
    </div>
  );
};

export default AmbulanceMissionHeader;
