import React, { useState, useMemo } from 'react';

/**
 * EnterpriseModuleShell — universal AI-native module wrapper.
 *
 * Provides every module with:
 *  - Executive Summary (AI-generated)
 *  - Live KPIs (top metrics row)
 *  - AI Insights panel (intelligent suggestions)
 *  - Prediction engine (forecasts with confidence)
 *  - Smart recommendations (actionable items)
 *  - Activity feed (recent events)
 *  - Floating action workflows (quick action FAB + modal)
 *
 * Usage:
 *   <EnterpriseModuleShell
 *     title="Revenue Intelligence"
 *     icon="fa-coins"
 *     gradient="from-emerald-600 to-teal-700"
 *     kpis={[...]}
 *     insights={[...]}
 *     predictions={[...]}
 *     recommendations={[...]}
 *     activities={[...]}
 *     actions={[...]}
 *     onAction={(action) => handleAction(action)}
 *   >
 *     (children - main module content)
 *   </EnterpriseModuleShell>
 */

// ── Helper components ──────────────────────────────────────────────

const KPIWave = ({ value, label, icon, color, trend, trendLabel, format }) => {
  const displayVal = useMemo(() => {
    if (typeof format === 'function') return format(value);
    if (value == null) return '—';
    return value;
  }, [value, format]);

  const trendIcon = trend > 0 ? 'fa-arrow-up' : trend < 0 ? 'fa-arrow-down' : 'fa-minus';
  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="group relative rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-${color}-50 text-${color}-600`}>
          <i className={`fas ${icon} text-sm`} />
        </div>
        {trend != null && (
          <span className={`flex items-center gap-1 text-[11px] font-semibold ${trendColor}`}>
            <i className={`fas ${trendIcon} text-[10px]`} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 font-display tracking-tight">{displayVal}</p>
      <p className="text-[11px] font-medium text-slate-400 mt-0.5">{label}</p>
      {trendLabel && (
        <p className="text-[10px] text-slate-400 mt-0.5">{trendLabel}</p>
      )}
      {/* Hover detail */}
      <div className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

const InsightCard = ({ insight, index }) => {
  const colors = ['sky', 'amber', 'emerald', 'violet', 'rose'];
  const color = colors[index % colors.length];
  const confidence = insight.confidence ?? 75;

  return (
    <div className={`rounded-xl bg-${color}-50/60 border border-${color}-200/50 p-3 hover:bg-${color}-50/90 transition-colors duration-200`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
          <i className={`fas ${insight.icon || 'fa-lightbulb'} text-xs`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800">{insight.title}</p>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{insight.description}</p>
          {insight.action && (
            <button
              type="button"
              onClick={insight.action.onClick}
              className={`mt-2 text-[10px] font-bold text-${color}-700 bg-white px-2.5 py-1 rounded-lg border border-${color}-200 hover:bg-${color}-100 active:scale-95 transition-all duration-200`}
            >
              {insight.action.label}
            </button>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col items-center">
          <span className={`text-[18px] font-bold text-${color}-600`}>{confidence}%</span>
          <span className="text-[8px] text-slate-400 uppercase tracking-wider">confidence</span>
        </div>
      </div>
      <div className="mt-2 w-full h-1 rounded-full bg-white/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-${color}-400 transition-all duration-1000`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
};

const PredictionCard = ({ prediction, index }) => {
  const directions = ['fa-arrow-trend-up', 'fa-arrow-trend-down', 'fa-minus'];
  const dirColors = ['text-emerald-500', 'text-red-500', 'text-slate-400'];
  const dirIdx = prediction.trend === 'up' ? 0 : prediction.trend === 'down' ? 1 : 2;

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3 hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{prediction.label}</p>
        <i className={`fas ${directions[dirIdx]} ${dirColors[dirIdx]} text-sm`} />
      </div>
      <p className="text-xl font-bold text-slate-900 font-display">{prediction.value}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-400">{prediction.period || 'Next 24h'}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
          {prediction.confidence}% confidence
        </span>
      </div>
    </div>
  );
};

const RecommendationCard = ({ rec, index, onExecute }) => {
  const colors = ['sky', 'amber', 'emerald', 'violet', 'rose', 'indigo'];
  const color = colors[index % colors.length];
  const impactColors = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
  const impactClass = impactColors[rec.impact] || impactColors.medium;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all duration-200">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
        <i className={`fas ${rec.icon || 'fa-wand-magic-sparkles'} text-xs`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold text-slate-800">{rec.title}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactClass}`}>
            {rec.impact?.toUpperCase() || 'MEDIUM'}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">{rec.description}</p>
        {rec.action && (
          <button
            type="button"
            onClick={() => onExecute?.(rec)}
            className="mt-1.5 text-[10px] font-semibold text-sky-600 hover:text-sky-800 transition-colors duration-150"
          >
            <i className="fas fa-play text-[8px] mr-1" />
            {rec.action}
          </button>
        )}
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const timeAgo = useMemo(() => {
    if (!activity.timestamp) return '';
    const diff = Date.now() - new Date(activity.timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [activity.timestamp]);

  const statusDot = activity.status === 'success' ? 'bg-emerald-500' :
    activity.status === 'warning' ? 'bg-amber-500' :
    activity.status === 'error' ? 'bg-red-500' : 'bg-slate-400';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
      <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${statusDot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700">{activity.message}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{activity.user || 'System'} • {timeAgo}</p>
      </div>
      {activity.meta && (
        <span className="flex-shrink-0 text-[10px] font-medium text-slate-400">{activity.meta}</span>
      )}
    </div>
  );
};

const FloatingActionButton = ({ actions, onAction }) => {
  const [open, setOpen] = useState(false);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3">
      {/* Action menu */}
      {open && (
        <div className="flex flex-col gap-2 animate-fade-in-up">
          {actions.map((action, i) => (
            <button
              key={action.key || i}
              type="button"
              onClick={() => {
                setOpen(false);
                onAction?.(action);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:-translate-x-1 transition-all duration-200 text-xs font-semibold text-slate-700 whitespace-nowrap"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <i className={`fas ${action.icon || 'fa-bolt'} text-sm`} style={{ color: action.color || '#6366f1' }} />
              {action.label}
            </button>
          ))}
        </div>
      )}
      {/* Main FAB */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 ${
          open ? 'bg-red-500 rotate-45' : 'bg-gradient-to-tr from-indigo-600 to-violet-600'
        } text-white`}
      >
        <i className="fas fa-plus text-xl" />
      </button>
    </div>
  );
};

const ExecutiveSummary = ({ summary }) => {
  if (!summary) return null;
  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 border border-indigo-100/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <i className="fas fa-brain text-sm" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">AI Executive Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed">{typeof summary === 'string' ? summary : summary?.text || ''}</p>
          {summary.confidence != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-white/80 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-400" style={{ width: `${summary.confidence}%` }} />
              </div>
              <span className="text-[10px] font-medium text-indigo-500">{summary.confidence}% confidence</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Section Toggle ────────────────────────────────────────────────

const CollapsibleSection = ({ title, icon, defaultOpen = true, children, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <i className={`fas ${icon} text-slate-400 text-xs`} />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
          {badge != null && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{badge}</span>
          )}
        </div>
        <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

// ── Main EnterpriseModuleShell ──────────────────────────────────────

const EnterpriseModuleShell = ({
  title = 'Module',
  icon = 'fa-cube',
  gradient = 'from-sky-600 to-blue-700',
  subtitle,
  kpis,
  insights,
  predictions,
  recommendations,
  activities,
  actions,
  executiveSummary,
  loading,
  onAction,
  onRefresh,
  children,
}) => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className={`rounded-2xl bg-gradient-to-r ${gradient} px-5 py-4 text-white shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <i className={`fas ${icon} text-lg`} />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display">{title}</h1>
              {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
              >
                <i className="fas fa-sync-alt text-xs" />
              </button>
            )}
            <span className="text-[10px] font-medium bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">
              <i className="fas fa-sync-alt text-[8px] mr-1 animate-pulse" />Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Executive Summary ───────────────────────────────────── */}
      {executiveSummary && <ExecutiveSummary summary={executiveSummary} />}

      {/* ── Live KPIs ────────────────────────────────────────────── */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {kpis.map((kpi, i) => {
            const { key: _kpiKey, ...kpiRest } = kpi;
            return <KPIWave key={_kpiKey || i} {...kpiRest} />;
          })}
        </div>
      )}

      {/* ── AI Insights ──────────────────────────────────────────── */}
      {insights && insights.length > 0 && (
        <CollapsibleSection title="AI Insights" icon="fa-lightbulb" badge={insights.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <InsightCard key={insight.key || i} insight={insight} index={i} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Predictions ─────────────────────────────────────────── */}
      {predictions && predictions.length > 0 && (
        <CollapsibleSection title="Predictions & Forecasts" icon="fa-chart-line" badge={predictions.length}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {predictions.map((pred, i) => (
              <PredictionCard key={pred.key || i} prediction={pred} index={i} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Main Content (children) ──────────────────────────────── */}
      {children && (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Loading module data...</p>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      )}

      {/* ── Recommendations ──────────────────────────────────────── */}
      {recommendations && recommendations.length > 0 && (
        <CollapsibleSection title="Smart Recommendations" icon="fa-wand-magic-sparkles" badge={recommendations.length} defaultOpen={false}>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={rec.key || i} rec={rec} index={i} onExecute={onAction} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Activity Feed ────────────────────────────────────────── */}
      {activities && activities.length > 0 && (
        <CollapsibleSection title="Activity Feed" icon="fa-timeline" badge={activities.length} defaultOpen={false}>
          <div className="divide-y divide-slate-100">
            {activities.map((act, i) => (
              <ActivityItem key={act.key || i} activity={act} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Floating Action Button ───────────────────────────────── */}
      <FloatingActionButton actions={actions} onAction={onAction} />
    </div>
  );
};

export default EnterpriseModuleShell;
