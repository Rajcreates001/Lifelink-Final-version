import React, { useState, useEffect, useCallback } from 'react';
import { GovStatusBadge } from './GovernmentShared';

// ── Interactive Detail Modal ─────────────────────────────
export const DetailModal = ({ open, onClose, title, subtitle, children, size = 'md' }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size] || sizeClasses.md} max-h-[85vh] overflow-hidden animate-scale-in border border-slate-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Interactive Confirmation Dialog ──────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmColor = 'bg-red-600 hover:bg-red-500', icon = 'fa-triangle-exclamation' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <i className={`fas ${icon}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors ${confirmColor}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ── Interactive Toast / Notification ─────────────────────
export const Toast = ({ message, type = 'success', visible, onClose }) => {
  useEffect(() => {
    if (visible && onClose) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[120] px-4 py-3 rounded-xl border shadow-lg animate-slide-up ${colors[type] || colors.success} flex items-center gap-2`}>
      <i className={`fas ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`} />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
};

// ── Animated SVG Bar Chart ───────────────────────────────
export const AnimatedBarChart = ({ data, height = 160, barColor = 'from-indigo-500 to-blue-600', showValues = true }) => {
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimating(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            {showValues && <span className="text-[8px] font-bold text-slate-500">{d.value}</span>}
            <div className="w-full rounded-t-md bg-slate-100 overflow-hidden relative" style={{ height: '100%', maxHeight: `${height - 20}px` }}>
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t ${barColor} transition-all duration-1000 ease-out`}
                style={{ height: animating ? `${pct}%` : '0%' }}
              />
            </div>
            <span className="text-[7px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Animated SVG Line Chart ──────────────────────────────
export const AnimatedLineChart = ({ data, height = 140, color = '#6366f1' }) => {
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimating(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;
  const w = data.length * 40;
  const pts = data.map((d, i) =>
    `${i * (w / Math.max(data.length - 1, 1)) + 10},${height - 10 - ((d.value - minVal) / range) * (height - 20)}`
  ).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        className={animating ? 'animate-draw-line' : ''}
        style={{
          strokeDasharray: animating ? 'none' : '2000',
          strokeDashoffset: animating ? '0' : '2000',
          transition: 'stroke-dashoffset 1.5s ease-in-out',
        }}
      />
      {data.map((d, i) => {
        const x = i * (w / Math.max(data.length - 1, 1)) + 10;
        const y = height - 10 - ((d.value - minVal) / range) * (height - 20);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill={color} className={animating ? 'animate-fade-in' : ''} style={{ opacity: animating ? 1 : 0, transition: 'opacity 0.3s', transitionDelay: `${i * 100}ms` }} />
            <text x={x} y={height - 2} textAnchor="middle" className="fill-slate-400" fontSize="7">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Gauge Chart ──────────────────────────────────────────
export const GaugeChart = ({ value, max = 100, label, color = '#059669', size = 80 }) => {
  const [animVal, setAnimVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimVal(value), 200);
    return () => clearTimeout(t);
  }, [value]);

  const pct = Math.min(animVal / max, 1);
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-slate-800 font-bold" fontSize={size * 0.16}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <span className="text-[8px] text-slate-400 mt-1">{label}</span>}
    </div>
  );
};

// ── AI Explainability Panel ──────────────────────────────
export const AIExplainPanel = ({ title, confidence, reasoning, evidence, impact, recommendations, onAccept, onReject }) => (
  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
          <i className="fas fa-robot text-xs text-indigo-600" />
        </div>
        <span className="text-xs font-bold text-indigo-800">{title || 'AI Recommendation'}</span>
      </div>
      {confidence !== undefined && (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          {confidence}% confidence
        </span>
      )}
    </div>

    {reasoning && (
      <div className="mb-2">
        <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Reasoning</p>
        <div className="space-y-1">
          {reasoning.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-slate-600">
              <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
              {r}
            </div>
          ))}
        </div>
      </div>
    )}

    {evidence && (
      <div className="mb-2">
        <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Evidence</p>
        <p className="text-[10px] text-slate-500 italic">{evidence}</p>
      </div>
    )}

    {impact && (
      <div className="mb-2">
        <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Expected Impact</p>
        <p className="text-[10px] text-slate-600">{impact}</p>
      </div>
    )}

    {recommendations && recommendations.length > 0 && (
      <div className="mb-3">
        <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Recommended Actions</p>
        <div className="space-y-1">
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-slate-600">
              <span className="text-emerald-500 mt-0.5">→</span>
              {r}
            </div>
          ))}
        </div>
      </div>
    )}

    {(onAccept || onReject) && (
      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-indigo-100">
        {onAccept && (
          <button onClick={onAccept} className="px-3 py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
            <i className="fas fa-check mr-1" />Accept
          </button>
        )}
        {onReject && (
          <button onClick={onReject} className="px-3 py-1.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">
            <i className="fas fa-times mr-1" />Reject
          </button>
        )}
      </div>
    )}
  </div>
);

// ── Live Timer ───────────────────────────────────────────
export const LiveTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('0s');
  useEffect(() => {
    if (!startTime) return;
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const s = Math.floor(diff / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      setElapsed(h > 0 ? `${h}h ${m % 60}m` : m > 0 ? `${m}m ${s % 60}s` : `${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [startTime]);
  return <span className="font-mono text-xs">{elapsed}</span>;
};

// ── Progress indicator with phases ───────────────────────
export const PhaseProgress = ({ phases, currentPhase }) => (
  <div className="flex items-center gap-2">
    {phases.map((p, i) => (
      <div key={i} className="flex items-center gap-2 flex-1">
        <div className={`flex items-center gap-1.5 ${i <= currentPhase ? 'text-indigo-600' : 'text-slate-300'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${i < currentPhase ? 'bg-indigo-600 text-white' : i === currentPhase ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
            {i < currentPhase ? <i className="fas fa-check" /> : i + 1}
          </div>
          <span className="text-[8px] font-medium hidden sm:inline">{p}</span>
        </div>
        {i < phases.length - 1 && <div className={`flex-1 h-0.5 ${i < currentPhase ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
      </div>
    ))}
  </div>
);
