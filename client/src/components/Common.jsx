// client/src/components/Common.jsx
import React from 'react';
import Card from './ui/Card';
import ReactDOM from 'react-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// ─── Chart Color Palette ───────────────────────────────
export const GRADIENT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// ─── Chart Drill-Down Modal ────────────────────────────
export const ChartDrillDown = ({ open, onClose, title, data }) => {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[70vh] overflow-y-auto animate-zoom-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><i className="fas fa-times"></i></button>
        </div>
        <div className="p-5">
          {Array.isArray(data) && data.length > 0 ? (
            <div className="space-y-2">
              {data.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <span className="font-medium text-slate-700">{item.label || item.name}</span>
                  <span className="font-bold text-slate-900">{item.value || item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No drill-down data available.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- Card Container ---
export const DashboardCard = ({ children, className = "", colorFlow = false }) => (
  <Card colorFlow={colorFlow} className={`min-w-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.05)] ${className}`}>
    {children}
  </Card>
);

// --- Input Field ---
export const Input = ({ name, type, placeholder, icon, value, onChange, required = false }) => (
  <div className="relative">
    <span className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pl-3 text-gray-400">
      <i className={`fas ${icon}`}></i>
    </span>
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      required={required}
      onChange={onChange}
      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all bg-gray-50/50"
    />
  </div>
);

// --- Loading Spinner ---
export const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-12 animate-fade-in">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-200 dark:border-blue-800 border-t-[#2563EB]"></div>
      <p className="text-sm text-gray-400 dark:text-slate-400 font-medium">Loading data...</p>
    </div>
  </div>
);

// --- Status Pill (for tables) ---
export const StatusPill = ({ text, color }) => {
  const colors = {
    green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    yellow: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    gray: 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
  };
  return (
    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${colors[color] || colors.gray}`}>
      {text}
    </span>
  );
};

// --- Tab Button ---
export const TabButton = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 px-4 py-3 text-sm font-semibold text-center transition-all duration-200 rounded-[14px] whitespace-nowrap ${
      isActive ? 'bg-white text-[#2563EB] shadow-md border border-[#E5E7EB]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    <i className={`fas ${icon} mr-2 hidden sm:inline`}></i>
    {label}
  </button>
);

// --- Stat Card ---
export const StatCard = ({ title, value, icon, color = 'text-[#2563EB]', subtitle, colorFlow = false }) => (
  <DashboardCard colorFlow={colorFlow}>
    <div className="flex items-center gap-4 mb-4">
      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-xl ${color} bg-white border border-[#E5E7EB]`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </DashboardCard>
);

// --- Progress Bar ---
export const ProgressBar = ({ value, colorClass = 'bg-[#2563EB]' }) => (
  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
    <div
      className={`${colorClass} h-2.5 rounded-full transition-all duration-700 ease-out`}
      style={{ width: `${Math.min(value, 100)}%` }}
    ></div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// GLOBAL LAYOUT SYSTEM — shared 12-column grid primitives
// ═══════════════════════════════════════════════════════════

// --- Grid Container (12-column) ---
export const Grid = ({ children, className = '' }) => (
  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${className}`}>
    {children}
  </div>
);

// --- Grid Column (accepts span size 3/4/6/8/12, defaults to full width on mobile) ---
const SPAN_CLASSES = { 3: 'lg:col-span-3', 4: 'lg:col-span-4', 6: 'lg:col-span-6', 8: 'lg:col-span-8', 12: 'lg:col-span-12' };
export const GridCol = ({ children, span = 12, className = '' }) => (
  <div className={`${SPAN_CLASSES[span] || 'lg:col-span-12'} ${className}`}>
    {children}
  </div>
);

// --- Section Header (consistent across all pages) ---
export const SectionHeader = ({ icon, title, subtitle, action, color = 'from-indigo-500 to-purple-600' }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon && (
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs shadow-sm`}>
          <i className={`fas ${icon}`} />
        </div>
      )}
      <div>
        <p className="font-bold text-gray-800 text-sm">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex items-center gap-2">{action}</div>}
  </div>
);

// --- Standard Hero Banner (consistent across all modules) ---
function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
  if (h.length === 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  return { r: 99, g: 102, b: 241 };
}

export const StandardHero = ({ icon, title, subtitle, statusItems, gradient = 'from-indigo-600 to-purple-700', accentColor = '#6366F1' }) => {
  const rgb = _hexToRgb(accentColor);
  return (
  <div className="relative rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden"
    style={{
      background: `linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)`,
      boxShadow: `0 0 60px rgba(${rgb.r},${rgb.g},${rgb.b},0.08), 0 20px 60px rgba(0,0,0,0.25)`,
    }}
  >
    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center shadow-lg border border-white/10">
          <div className="absolute inset-0 rounded-2xl bg-white/10 animate-ping-slow" />
          <i className={`fas ${icon} text-white text-xl relative z-10`} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-white/60 mt-1">{subtitle}</p>
        </div>
      </div>
      {statusItems && (
        <div className="flex flex-wrap gap-2">
          {statusItems.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              {s.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
              )}
              <span className="text-[10px] font-medium text-white/60">{s.label}:</span>
              <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

// --- Metric Card (standard sized metric display) ---
export const MetricCard = ({ label, value, icon, color = '#2563EB', subtitle }) => (
  <div className="p-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: `${color}06`, border: `1px solid ${color}12` }}>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: `${color}10`, color }}>
        <i className={`fas ${icon}`} />
      </div>
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
    </div>
    <p className="text-2xl font-bold tabular-nums" style={{ color }}>
      {value}
      <span className="text-xs font-normal text-gray-400 ml-1">{subtitle}</span>
    </p>
  </div>
);

const GRID_COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 6: 'sm:grid-cols-6' };
// --- Metric Grid (auto-layout for metric cards) ---
export const MetricGrid = ({ items, columns = 4 }) => (
  <div className={`grid grid-cols-2 ${GRID_COLS[columns] || 'sm:grid-cols-4'} gap-3`}>
    {items.map((item) => (
      <MetricCard key={item.label} {...item} />
    ))}
  </div>
);

// --- Empty State (consistent empty state across all pages) ---
export const EmptyState = ({ icon = 'fa-robot', title, description, action }) => (
  <DashboardCard>
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 border border-gray-200">
        <i className={`fas ${icon} text-3xl text-gray-300`} />
      </div>
      <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  </DashboardCard>
);

// --- Explainability Panel ---
export const ExplainabilityPanel = ({ meta }) => {
  if (!meta) return null;
  const confidence = Number.isFinite(meta.confidence) ? Math.round(meta.confidence * 100) : null;
  const reasoning = Array.isArray(meta.reasoning) ? meta.reasoning : [];
  const references = Array.isArray(meta.references) ? meta.references : [];

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 break-words">
      <div className="flex flex-wrap gap-2 mb-2">
        {confidence !== null && (
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
            Confidence: {confidence}%
          </span>
        )}
        {meta.command && (
          <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-semibold">
            {meta.command}
          </span>
        )}
      </div>
      {reasoning.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Reasoning</p>
          <ul className="mt-1 space-y-1">
            {reasoning.map((item) => (
              <li key={item} className="flex gap-2 break-words">
                <span>•</span>
                <span className="whitespace-pre-wrap break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {references.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">References</p>
          <ul className="mt-1 space-y-1">
            {references.map((ref, idx) => (
              <li key={`${ref.title || 'ref'}-${idx}`} className="break-words whitespace-pre-wrap">
                <span className="font-semibold text-slate-700">{ref.title || 'Source'}:</span> {ref.detail || ref.url || ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- ADD THIS COMPONENT: SimpleBarChart ---
export const SimpleBarChart = ({ data, title, barColorClass, height = 200, className = '', onBarClick }) => {
    const chartData = {
        labels: data.map(d => d.label),
        datasets: [{
            label: title,
            data: data.map(d => d.value),
            backgroundColor: (ctx) => {
              if (!ctx.chart?.ctx) return 'rgba(37, 99, 235, 0.7)';
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
              g.addColorStop(0, 'rgba(37, 99, 235, 0.85)');
              g.addColorStop(0.5, 'rgba(14, 165, 233, 0.6)');
              g.addColorStop(1, 'rgba(14, 165, 233, 0.2)');
              return g;
            },
            hoverBackgroundColor: 'rgba(37, 99, 235, 0.95)',
            borderRadius: 6,
            borderSkipped: false,
        }],
    };
    const options = {
        responsive: true, maintainAspectRatio: false,
        onClick: (event, elements) => { if (elements.length > 0 && onBarClick) onBarClick(data[elements[0].index]); },
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: false },
            title: { display: !!title, text: title, font: { size: 13, weight: '600' } },
            tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 12, boxPadding: 6, displayColors: true, callbacks: { label: (ctx) => `${ctx.parsed.y}${onBarClick ? ' (click to drill down)' : ''}` } },
        },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    };
    return (
        <DashboardCard className={`animate-chart-entrance ${className}`.trim()}>
            <h3 className="font-bold text-lg text-gray-900 mb-4">{title}</h3>
            <div style={{ height }}><Bar data={chartData} options={options} /></div>
            {onBarClick && data.length > 0 && <p className="text-[10px] text-slate-400 mt-2 text-center italic">Click a bar to drill down</p>}
        </DashboardCard>
    );
};

// ─── Gradient Area Chart (with drill-down) ─────────────
export const GradientAreaChart = ({ data, title, lineColor = 'rgba(37, 99, 235, 0.8)', height = 180, className = '', onPointClick }) => {
    const chartData = {
      labels: data.map((d) => d.label),
      datasets: [{
        label: title, data: data.map((d) => d.value),
        borderColor: lineColor,
        backgroundColor: (ctx) => {
          if (!ctx.chart?.ctx) return 'rgba(37, 99, 235, 0.15)';
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, height);
          g.addColorStop(0, lineColor.replace('0.8', '0.35'));
          g.addColorStop(0.5, lineColor.replace('0.8', '0.12'));
          g.addColorStop(1, 'rgba(255,255,255,0)');
          return g;
        },
        borderWidth: 3, tension: 0.4, pointRadius: 4, pointHoverRadius: 8,
        pointBackgroundColor: '#fff', pointBorderColor: lineColor, pointBorderWidth: 2.5, fill: true,
      }],
    };
    const options = {
      responsive: true, maintainAspectRatio: false,
      onClick: (event, elements) => { if (elements.length > 0 && onPointClick) onPointClick(data[elements[0].index], elements[0].index); },
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false }, title: { display: !!title, text: title, font: { size: 13, weight: '600' } },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 12, boxPadding: 4, callbacks: { label: (ctx) => `${ctx.parsed.y}${onPointClick ? ' (click for details)' : ''}` } },
      },
      scales: { y: { ticks: { precision: 0, font: { size: 11 } }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
      elements: { point: { radius: 4, hoverRadius: 9, hoverBorderWidth: 3 } },
      interaction: { intersect: false, mode: 'index' },
    };
    return (
      <DashboardCard className={`animate-chart-entrance ${className}`.trim()}>
        <h3 className="font-bold text-lg text-gray-900 mb-4">{title}</h3>
        <div style={{ height }}><Line data={chartData} options={options} /></div>
        {onPointClick && <p className="text-[10px] text-slate-400 mt-2 text-center italic">Click a point to drill down</p>}
      </DashboardCard>
    );
};

// ─── SimpleLineChart (alias for GradientAreaChart) ─────
export const SimpleLineChart = GradientAreaChart;

// ─── Donut Chart (with drill-down) ─────────────────────
export const DonutChart = ({ data, title, height = 240, className = '', onSliceClick, showLegend = true }) => {
    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    const labels = data.map((d) => d.label || d.name);
    const values = data.map((d) => d.value || d.count || 0);
    const chartData = {
      labels,
      datasets: [{ data: values, backgroundColor: GRADIENT_COLORS, borderColor: '#fff', borderWidth: 3, hoverBorderColor: '#fff', hoverBorderWidth: 4, hoverOffset: 8 }],
    };
    const options = {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      onClick: (event, elements) => { if (elements.length > 0 && onSliceClick) onSliceClick(data[elements[0].index], elements[0].index); },
      animation: { duration: 1000, easing: 'easeOutQuart', animateRotate: true },
      plugins: {
        legend: { display: showLegend, position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 11 } } },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 12, callbacks: { label: (ctx) => { const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0; return `${ctx.label}: ${ctx.parsed} (${pct}%)${onSliceClick ? ' — click to drill' : ''}`; } } },
      },
    };
    return (
      <DashboardCard className={`animate-chart-entrance ${className}`.trim()}>
        <h3 className="font-bold text-lg text-gray-900 mb-4">{title}</h3>
        <div className="relative" style={{ height }}>
          <Doughnut data={chartData} options={options} />
          {total > 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center"><p className="text-2xl font-bold text-slate-800">{total}</p><p className="text-[10px] text-slate-400 uppercase">Total</p></div></div>}
        </div>
        {onSliceClick && <p className="text-[10px] text-slate-400 mt-1 text-center italic">Click a slice to drill down</p>}
      </DashboardCard>
    );
};