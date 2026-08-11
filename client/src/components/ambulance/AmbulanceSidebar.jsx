import React from 'react';

// ── Module Definitions ─────────────────────────────────────────────
export const AMBULANCE_MODULES = [
  {
    group: 'Command',
    items: [
      { key: 'mission-overview', label: 'Mission Overview', icon: 'fa-gauge-high' },
      { key: 'patient-twin', label: 'Digital Patient Twin', icon: 'fa-heartbeat' },
      { key: 'navigation-ai', label: 'Navigation AI', icon: 'fa-route' },
      { key: 'hospital-ai', label: 'Hospital AI', icon: 'fa-hospital' },
      { key: 'communication', label: 'Communication', icon: 'fa-radio' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { key: 'predictions', label: 'Predictions', icon: 'fa-chart-line' },
      { key: 'recommendations', label: 'Recommendations', icon: 'fa-wand-magic-sparkles' },
      { key: 'equipment', label: 'Equipment', icon: 'fa-kit-medical' },
    ],
  },
  {
    group: 'Logs & Analysis',
    items: [
      { key: 'activity-feed', label: 'Activity Feed', icon: 'fa-timeline' },
      { key: 'reports', label: 'Reports', icon: 'fa-file-alt' },
    ],
  },
  {
    group: 'Training',
    items: [
      { key: 'simulation', label: 'Simulation', icon: 'fa-play' },
      { key: 'settings', label: 'Settings', icon: 'fa-cog' },
    ],
  },
];

const AmbulanceSidebar = ({ activeModule, onModuleChange, collapsed, onToggleCollapse }) => {
  return (
    <div className={`relative flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} shrink-0`}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all duration-200"
      >
        <i className={`fas fa-chevron-left text-[10px] transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Header branding */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-200 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <i className="fas fa-truck-medical text-sm" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 font-display leading-tight">LifeLink</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Ambulance Command</p>
          </div>
        )}
      </div>

      {/* Module navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {AMBULANCE_MODULES.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">{group.group}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((mod) => {
                const isActive = activeModule === mod.key;
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => onModuleChange(mod.key)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      collapsed ? 'justify-center px-0' : ''
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-700 border border-sky-200 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                    title={collapsed ? mod.label : undefined}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <i className={`fas ${mod.icon} text-xs`} />
                    </div>
                    {!collapsed && <span className="truncate">{mod.label}</span>}
                    {isActive && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-slate-200">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-700">Mission Active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbulanceSidebar;
