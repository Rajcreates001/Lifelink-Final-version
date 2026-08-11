import React from 'react';

// ─── Role-Specific Mission Config ──────────────────────────
const ROLE_MISSION_CONFIG = {
  national_admin: {
    badge: 'NATIONAL COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg',
    gradient: 'from-amber-600 to-yellow-600',
    icon: 'fa-crown',
    prefix: 'NCC',
    alert: 'National',
  },
  state_admin: {
    badge: 'STATE OPERATIONS CENTER',
    badgeClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg',
    gradient: 'from-sky-600 to-blue-700',
    icon: 'fa-flag',
    prefix: 'SOC',
    alert: 'State',
  },
  district_admin: {
    badge: 'DISTRICT COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg',
    gradient: 'from-emerald-600 to-teal-700',
    icon: 'fa-building',
    prefix: 'DCC',
    alert: 'District',
  },
  police: {
    badge: 'POLICE COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg',
    gradient: 'from-blue-800 to-indigo-900',
    icon: 'fa-shield',
    prefix: 'PCC',
    alert: 'Police',
  },
  fire: {
    badge: 'FIRE COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-red-600 to-orange-700 text-white shadow-lg',
    gradient: 'from-red-700 to-orange-800',
    icon: 'fa-fire-extinguisher',
    prefix: 'FCC',
    alert: 'Fire',
  },
  ndma: {
    badge: 'DISASTER COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-red-700 to-rose-800 text-white shadow-lg',
    gradient: 'from-red-800 to-rose-900',
    icon: 'fa-shield-halved',
    prefix: 'NDMA',
    alert: 'Disaster',
  },
  ndrf: {
    badge: 'RESPONSE COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-orange-700 to-red-800 text-white shadow-lg',
    gradient: 'from-orange-800 to-red-900',
    icon: 'fa-helmet-safety',
    prefix: 'NDRF',
    alert: 'Response',
  },
  default: {
    badge: 'COMMAND CENTER',
    badgeClass: 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg',
    gradient: 'from-slate-700 to-gray-800',
    icon: 'fa-tower-broadcast',
    prefix: 'CMD',
    alert: 'Operational',
  },
};

// ─── AI EMOJI / Avatar per role ────────────────────────────
const AI_AVATARS = {
  national_admin: '🇮🇳',
  state_admin: '🏛️',
  district_admin: '🏢',
  police: '🚔',
  fire: '🚒',
  ndma: '⛑️',
  ndrf: '🛟',
  health: '🏥',
  ambulance: '🚑',
  default: '🎯',
};

// ─── Main Layout ─────────────────────────────────────────
const MissionControlLayout = ({
  role = 'default',
  orgName = 'Command Center',
  orgDesc = '',
  status = 'Operational',
  online = 0,
  staff = 0,
  aiHealth = 0,
  children,
  headerExtra,
  leftPanel,
  rightPanel,
}) => {
  const config = ROLE_MISSION_CONFIG[role] || ROLE_MISSION_CONFIG.default;
  const aiAvatar = AI_AVATARS[role] || AI_AVATARS.default;
  const hours = new Date().getHours();
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const greeting = hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Background Grid ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-900/10 to-transparent rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-gradient-to-br from-cyan-900/10 to-transparent rounded-full blur-[120px]" />
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mc-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mc-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOP COMMAND RIBBON                                        ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <header className="shrink-0 bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50">
          {/* Alert Banner */}
          <div className="h-6 bg-gradient-to-r from-amber-600/90 via-red-600/90 to-rose-600/90 flex items-center justify-center text-[10px] font-bold text-white tracking-wider gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {config.alert} EMERGENCY OPERATIONS — {dateStr} — {timeStr} IST
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>

          {/* Main Ribbon */}
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Left: Org Identity */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                <i className={`fas ${config.icon} text-sm`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.badgeClass}`}>
                    {config.badge}
                  </span>
                </div>
                <h1 className="text-sm font-bold text-white truncate max-w-[240px]">{orgName}</h1>
              </div>
            </div>

            {/* Center: Live Status */}
            <div className="hidden md:flex items-center gap-4 text-[10px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">{timeStr} IST</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1">
                <i className="fas fa-users text-slate-500" />
                {online}/{staff} online
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1">
                <i className="fas fa-brain text-slate-500" />
                AI {aiHealth}%
              </span>
              <span className="text-slate-600">|</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                status === 'Operational' ? 'bg-emerald-500/20 text-emerald-400' :
                status === 'Busy' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>{status}</span>
            </div>

            {/* Right: AI Copilot Badge + Actions */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-700/50 text-[10px] text-slate-300 border border-slate-600/50">
                <span className="text-xs">{aiAvatar}</span>
                AI Operations Officer
              </span>
              {headerExtra}
            </div>
          </div>
        </header>

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  MAIN CONTENT — Three-panel mission layout                  ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Quick Actions / Mission Summary */}
          {leftPanel && (
            <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-slate-800/40 border-r border-slate-700/30 overflow-y-auto">
              {leftPanel}
            </aside>
          )}

          {/* Center: Main Content Area */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="max-w-7xl mx-auto space-y-4">
              {children}
            </div>
          </main>

          {/* Right Panel: AI Copilot / Live Feed */}
          {rightPanel && (
            <aside className="hidden xl:flex flex-col w-80 shrink-0 bg-slate-800/40 border-l border-slate-700/30 overflow-y-auto">
              {rightPanel}
            </aside>
          )}
        </div>

        {/* ── Footer Status Bar ── */}
        <footer className="shrink-0 h-6 bg-slate-800/90 border-t border-slate-700/30 flex items-center justify-between px-4 text-[9px] text-slate-500">
          <span className="flex items-center gap-2">
            <i className="fas fa-shield-halved text-emerald-500" />
            LifeLink — {config.prefix} — Secured
          </span>
          <span className="flex items-center gap-2">
            <i className="fas fa-sync-alt text-emerald-500 text-[8px]" />
            Auto-Sync Active
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            Last Sync: {timeStr}
          </span>
        </footer>
      </div>
    </div>
  );
};

export { ROLE_MISSION_CONFIG, AI_AVATARS };
export default MissionControlLayout;
