import React from 'react';

const MiniSparkline = ({ data = [], color = '#2563eb' }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} className="drop-shadow-sm" />
    </svg>
  );
};

const ExecutiveKpiCard = ({
  label,
  value,
  prefix = '',
  suffix = '',
  trend = null,
  trendLabel = '',
  prediction = null,
  predictionTime = '',
  target = null,
  recommendation = '',
  confidence = null,
  color = 'blue',
  sparklineData = [],
  onClick = null,
  delay = 0,
}) => {
  const colorMap = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-500/20', glow: 'rgba(37,99,235,0.08)', icon: 'text-blue-500' },
    green: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-500/20', glow: 'rgba(16,185,129,0.08)', icon: 'text-emerald-500' },
    red: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-500/20', glow: 'rgba(239,68,68,0.08)', icon: 'text-red-500' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-500/20', glow: 'rgba(245,158,11,0.08)', icon: 'text-amber-500' },
    purple: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', ring: 'ring-purple-500/20', glow: 'rgba(139,92,246,0.08)', icon: 'text-purple-500' },
    teal: { text: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', ring: 'ring-teal-500/20', glow: 'rgba(20,184,166,0.08)', icon: 'text-teal-500' },
  };
  const c = colorMap[color] || colorMap.blue;

  const trendIcon = trend === 'up' ? 'fa-arrow-up' : trend === 'down' ? 'fa-arrow-down' : 'fa-minus';
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      style={{ animationDelay: `${delay}ms` }}
      className={`
        relative overflow-hidden rounded-xl border border-white/40 bg-white/70 backdrop-blur-sm
        p-3 sm:p-4 hover:bg-white/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]
        transition-all duration-300 ease-out animate-fade-in-up group
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Hover glow */}
      <div className="absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: `0 0 30px ${c.glow}` }} />

      <div className="relative z-10">
        {/* Top row: label & sparkline */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">{label}</p>
          <MiniSparkline data={sparklineData} color={color === 'red' ? '#ef4444' : color === 'green' ? '#10b981' : '#2563eb'} />
        </div>

        {/* Value row */}
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className={`text-xl sm:text-2xl font-extrabold tracking-tight ${c.text}`}>
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </span>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
              <i className={`fas ${trendIcon} text-[9px]`}></i>
              {trendLabel}
            </span>
          )}
          {target && (
            <span className="text-[10px] text-slate-400 font-medium">/ {target}</span>
          )}
        </div>

        {/* Prediction & Confidence */}
        <div className="flex items-center gap-2 flex-wrap">
          {prediction && (
            <span className="text-[11px] text-slate-500 font-medium">
              <i className="fas fa-chart-line text-[9px] mr-0.5 text-indigo-400"></i>
              Predicted: <span className="font-bold text-slate-700">{prediction}</span>
              {predictionTime && <span className="text-slate-400"> by {predictionTime}</span>}
            </span>
          )}
          {confidence !== null && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
              <i className="fas fa-brain text-[8px]"></i>
              {Math.round(confidence * 100)}%
            </span>
          )}
        </div>

        {/* AI Recommendation */}
        {recommendation && (
          <div className={`mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-lg ${c.bg} border ${c.border}`}>
            <i className={`fas fa-robot text-[10px] mt-0.5 ${c.icon}`}></i>
            <p className="text-[10px] text-slate-600 leading-tight font-medium">{recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveKpiCard;
