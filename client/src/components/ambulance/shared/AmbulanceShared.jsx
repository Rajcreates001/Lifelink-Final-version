import React from 'react';

// ── Status colour helpers ─────────────────────────────
export const severityColor = (s) => {
  if (!s) return 'sky';
  const v = s.toLowerCase();
  if (v === 'critical' || v === 'red') return 'red';
  if (v === 'high' || v === 'amber') return 'amber';
  if (v === 'moderate') return 'orange';
  return 'sky';
};

export const statusDot = (status) => {
  if (!status) return 'bg-slate-400';
  const v = status.toLowerCase();
  if (v === 'success' || v === 'operational' || v === 'ready') return 'bg-emerald-500';
  if (v === 'warning' || v === 'busy' || v === 'moderate') return 'bg-amber-500';
  if (v === 'error' || v === 'critical') return 'bg-red-500';
  return 'bg-slate-400';
};

export const FORMAT_TIME = (ts) => {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

// ── KPI Card ──────────────────────────────────────────
export const KPICard = ({ label, value, icon, color, trend, subtitle }) => {
  const colorMap = {
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };
  const iconBg = colorMap[color] || 'bg-slate-50 border-slate-200 text-slate-600';
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3 hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <i className={`fas ${icon} text-sm`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-500 uppercase truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-[9px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {trend !== undefined && trend !== 0 && (
        <div className={`mt-2 text-[9px] font-semibold flex items-center gap-1 ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <i className={`fas ${trend > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-[9px]`} />
          {Math.abs(trend)}% vs last
        </div>
      )}
    </div>
  );
};

// ── StatusBadge ───────────────────────────────────────
export const StatusBadge = ({ text, color }) => {
  const colors = {
    red: 'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors[color] || colors.slate}`}>
      {text}
    </span>
  );
};

// ── SectionHeader ─────────────────────────────────────
export const SectionHeader = ({ icon, label, action }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <i className={`fas ${icon} text-slate-400 text-xs`} />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    {action && (
      <button type="button" onClick={action.onClick}
        className="text-[9px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1">
        {action.label} <i className="fas fa-arrow-right text-[8px]" />
      </button>
    )}
  </div>
);
