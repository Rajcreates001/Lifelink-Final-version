import React, { useEffect, useState } from 'react';

const AnimatedCounter = ({ value, suffix = '', prefix = '', decimals = 0, duration = 800 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration, decimals]);

  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
};

const HospitalMetricCard = ({
  icon,
  label,
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  trend = null,
  trendLabel = '',
  color = 'blue',
  iconBg = null,
  delay = 0,
  onClick = null,
}) => {
  const colorMap = {
    blue: { bg: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-600', ring: 'ring-blue-500/30', glow: 'rgba(37,99,235,0.15)' },
    green: { bg: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-600', ring: 'ring-emerald-500/30', glow: 'rgba(16,185,129,0.15)' },
    red: { bg: 'from-red-500/20 to-red-600/10', text: 'text-red-600', ring: 'ring-red-500/30', glow: 'rgba(239,68,68,0.15)' },
    purple: { bg: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-600', ring: 'ring-purple-500/30', glow: 'rgba(139,92,246,0.15)' },
    orange: { bg: 'from-orange-500/20 to-orange-600/10', text: 'text-orange-600', ring: 'ring-orange-500/30', glow: 'rgba(249,115,22,0.15)' },
    teal: { bg: 'from-teal-500/20 to-teal-600/10', text: 'text-teal-600', ring: 'ring-teal-500/30', glow: 'rgba(20,184,166,0.15)' },
    rose: { bg: 'from-rose-500/20 to-rose-600/10', text: 'text-rose-600', ring: 'ring-rose-500/30', glow: 'rgba(244,63,94,0.15)' },
    amber: { bg: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-600', ring: 'ring-amber-500/30', glow: 'rgba(245,158,11,0.15)' },
    indigo: { bg: 'from-indigo-500/20 to-indigo-600/10', text: 'text-indigo-600', ring: 'ring-indigo-500/30', glow: 'rgba(99,102,241,0.15)' },
    sky: { bg: 'from-sky-500/20 to-sky-600/10', text: 'text-sky-600', ring: 'ring-sky-500/30', glow: 'rgba(14,165,233,0.15)' },
  };
  const c = colorMap[color] || colorMap.blue;

  const trendIcon = trend === 'up' ? 'fa-arrow-up' : trend === 'down' ? 'fa-arrow-down' : null;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : '';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      style={{ animationDelay: `${delay}ms` }}
      className={`
        relative overflow-hidden rounded-2xl border border-white/40
        bg-white/75 backdrop-blur-xl p-4 sm:p-5
        hover:bg-white/90 hover:shadow-xl hover:-translate-y-1
        active:scale-[0.98]
        transition-all duration-300 ease-out
        animate-fade-in-up group
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Background gradient accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${c.bg} -translate-y-8 translate-x-8 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />

      {/* Glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: `inset 0 0 30px ${c.glow}` }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 truncate">{label}</p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${c.text}`}>
              <AnimatedCounter value={value} suffix={suffix} prefix={prefix} decimals={decimals} />
            </span>
            {trend && trendIcon && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendColor} animate-fade-in`}>
                <i className={`fas ${trendIcon} text-[10px]`}></i>
                {trendLabel}
              </span>
            )}
          </div>
        </div>
        <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${c.bg} ${c.text} group-hover:scale-110 transition-transform duration-300 ${iconBg || ''}`}>
          <i className={`fas ${icon} text-lg`}></i>
        </div>
      </div>

      {/* Bottom shimmer on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
    </div>
  );
};

export default HospitalMetricCard;
