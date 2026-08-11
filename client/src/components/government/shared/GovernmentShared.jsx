import React from 'react';

// ── Status colour helpers ─────────────────────────────
export const sevColor = (s) => {
  if (!s) return 'slate';
  const v = s.toLowerCase();
  if (v === 'critical' || v === 'red') return 'red';
  if (v === 'high' || v === 'amber') return 'amber';
  if (v === 'moderate') return 'orange';
  return 'slate';
};

export const statusDot = (status) => {
  if (!status) return 'bg-slate-400';
  const v = status.toLowerCase();
  if (v === 'operational' || v === 'active' || v === 'ready') return 'bg-emerald-500';
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

// ── Government KPI Card ───────────────────────────────
export const GovKPICard = ({ label, value, icon, color, subtitle, trend }) => {
  const colorMap = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  const iconBg = colorMap[color] || 'bg-slate-50 border-slate-200 text-slate-600';
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <i className={`fas ${icon} text-sm`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-500 uppercase truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-[9px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {trend !== undefined && trend !== 0 && (
        <div className={`mt-2 text-[10px] font-semibold flex items-center gap-1 ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <i className={`fas ${trend > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-[9px]`} />
          {Math.abs(trend)}% vs last
        </div>
      )}
    </div>
  );
};

// ── Government Status Badge ───────────────────────────
export const GovStatusBadge = ({ text, color }) => {
  const colors = {
    red: 'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    teal: 'bg-teal-100 text-teal-700 border-teal-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${colors[color] || colors.slate}`}>
      {text === 'Critical' || text === 'High' || color === 'red' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      ) : null}
      {text}
    </span>
  );
};

// ── Government Section Header ─────────────────────────
export const GovSectionHeader = ({ icon, label, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon && <i className={`fas ${icon} text-slate-400 text-xs`} />}
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    {action && (
      <button type="button" onClick={action.onClick}
        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
        {action.label} <i className="fas fa-arrow-right text-[9px]" />
      </button>
    )}
  </div>
);

// ── Government Module Hero ────────────────────────────
export const GovModuleHero = ({ title, subtitle, icon, gradient, stats }) => (
  <div className={`rounded-2xl p-6 bg-gradient-to-br ${gradient || 'from-slate-800 to-slate-900'} text-white shadow-lg`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <i className={`fas ${icon} text-2xl`} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-white/70 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
    {stats && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
        {stats.map((s, i) => (
          <div key={i}>
            <p className="text-[10px] font-semibold text-white/50 uppercase">{s.label}</p>
            <p className="text-lg font-bold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── Alert Banner ──────────────────────────────────────
export const AlertBanner = ({ type, message, action }) => {
  const styles = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  return (
    <div className={`rounded-xl border p-3 flex items-center justify-between ${styles[type] || styles.info}`}>
      <div className="flex items-center gap-2">
        <i className={`fas ${type === 'critical' ? 'fa-circle-exclamation' : type === 'warning' ? 'fa-triangle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`} />
        <span className="text-xs font-medium">{message}</span>
      </div>
      {action && (
        <button onClick={action.onClick} className="text-xs font-bold underline">{action.label}</button>
      )}
    </div>
  );
};
