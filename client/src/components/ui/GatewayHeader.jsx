import React, { useState } from 'react';

const PORTAL_CONFIG = {
  government: {
    label: 'Government Gateway',
    badge: 'GovNet Secure',
    badgeGradient: 'from-amber-500 to-yellow-500',
    icon: 'fa-crown',
    iconGradient: 'from-amber-500 to-yellow-600',
    accent: 'text-amber-400',
  },
  hospital: {
    label: 'Hospital Workspace',
    badge: 'LifeLink Secure',
    badgeGradient: 'from-indigo-500 to-purple-600',
    icon: 'fa-heartbeat',
    iconGradient: 'from-indigo-600 to-purple-700',
    accent: 'text-indigo-400',
  },
};

const GatewayHeader = ({ portal = 'government', userName = 'User', onLogout, onSwitchOrg }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const config = PORTAL_CONFIG[portal] || PORTAL_CONFIG.government;

  return (
    <div className="relative z-20 mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Portal identity */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.iconGradient} text-white flex items-center justify-center shadow-lg`}>
            <i className={`fas ${config.icon} text-lg`} />
          </div>
          <div>
            <p className={`text-[10px] font-bold ${config.accent} uppercase tracking-wider`}>
              <i className="fas fa-shield-halved mr-1" />{config.label}
            </p>
            <h1 className="text-sm font-bold text-slate-900 font-display">{userName}</h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auto-save indicator */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto Saved
          </span>

          {/* Security badge */}
          <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full bg-gradient-to-r ${config.badgeGradient} text-[9px] font-bold text-white shadow-sm`}>
            <i className="fas fa-shield-halved mr-1" />{config.badge}
          </span>

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:shadow-sm active:scale-[0.95] transition-all duration-200">
            <i className="fas fa-bell text-sm" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center shadow-sm">3</span>
          </button>

          {/* Settings */}
          <button className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:shadow-sm active:scale-[0.95] transition-all duration-200">
            <i className="fas fa-cog text-sm" />
          </button>

          {/* Switch Organization */}
          {onSwitchOrg && (
            <button
              onClick={onSwitchOrg}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm active:scale-[0.97] transition-all duration-200"
            >
              <i className="fas fa-arrows-rotate text-[10px]" />
              Switch
            </button>
          )}

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.98] transition-all duration-200"
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.iconGradient} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                {(userName || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">{userName}</span>
              <i className={`fas fa-chevron-down text-[9px] text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-xl z-20 overflow-hidden animate-fade-in-down">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
                    <p className="text-[10px] text-slate-400">{config.label}</p>
                  </div>

                  <div className="p-1">
                    {onSwitchOrg && (
                      <button
                        onClick={() => { setProfileOpen(false); onSwitchOrg(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <i className="fas fa-arrows-rotate text-slate-400 w-4 text-center text-xs" />
                        Switch Organization
                      </button>
                    )}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <i className="fas fa-cog text-slate-400 w-4 text-center text-xs" />
                      Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <i className="fas fa-bell text-slate-400 w-4 text-center text-xs" />
                      Notifications
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-1">
                    <button
                      onClick={() => { setProfileOpen(false); onLogout?.(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-50 hover:text-red-700 transition-colors ${
                        portal === 'government' ? 'text-red-600' : 'text-red-600'
                      }`}
                    >
                      <i className="fas fa-sign-out-alt w-4 text-center text-xs" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Sign Out button — always visible */}
          <button
            onClick={onLogout}
            className={`hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 ${
              portal === 'government'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
            }`}
          >
            <i className="fas fa-sign-out-alt text-[11px]" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default GatewayHeader;
