import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { LanguageSwitcherInline } from '../ui/LanguageSwitcher';

// Icon color mapping per spec
const ICON_COLORS = {
    home: 'text-blue-500',
    ai_health: 'text-emerald-500',
    find_donors: 'text-red-500',
    requests: 'text-orange-500',
    ai_records: 'text-purple-500',
    donations: 'text-cyan-500',
    notifications: 'text-amber-500',
    ai: 'text-purple-400',
    profile: 'text-blue-400',
};

const Sidebar = ({
    items = [],
    activeKey,
    onSelect,
    user,
    onProfile,
    onNotifications,
    onHistory,
    onLogout,
    onSwitchRole,
    hasUnread,
    onLogoClick,
    className = '',
}) => {
    const { isDark, toggleTheme } = useTheme();
    const isNotificationsActive = activeKey === 'notifications';
    const isProfileActive = activeKey === 'profile';
    const isHistoryActive = activeKey === 'history';

    return (
        <aside className={`w-full lg:w-72 lg:h-screen lg:overflow-y-auto lg:sticky lg:top-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-[#E5E7EB] dark:border-slate-700/50 flex flex-col transition-all duration-300 ${className}`}
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.02), 4px 0 24px rgba(0,0,0,0.04), 8px 0 48px rgba(0,0,0,0.02)' }}>
            {/* ─── Glass gradient overlay for depth ──────────────── */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/20 dark:from-slate-800/40 dark:to-slate-900/20 pointer-events-none" aria-hidden="true"></div>

            {/* ─── Logo Section ─────────────────────────────── */}
            <div className="relative px-5 py-5 border-b border-[#E5E7EB] animate-fade-in shrink-0">
                <button onClick={onLogoClick} className="flex items-center gap-3.5 text-left group w-full">
                    <div className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white p-2.5 rounded-[14px] shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" style={{ boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
                        <i className="fas fa-heartbeat text-xl"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#2563EB] transition-colors duration-300">LifeLink</h1>
                        <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold uppercase tracking-[0.08em]">
                            {user?.role ? `${user.role} portal` : 'Portal'}{user?.subRole ? ` • ${user.subRole}` : ''}
                        </p>
                    </div>
                </button>
            </div>

            {/* ─── Primary Navigation ── vertically centered flex region ── */}
            <nav className="relative flex-1 flex flex-col px-3 overflow-y-auto" style={{ minHeight: 0 }}>
                <div className="flex flex-col gap-5 py-8 mt-auto mb-auto">
                {items.map((item, index) => {
                    const isActive = activeKey === item.key;
                    const iconColor = ICON_COLORS[item.key] || 'text-gray-500';
                    const activeIconColor = isActive ? 'text-white' : iconColor;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onSelect?.(item.key)}
                            style={{ animationDelay: `${index * 40}ms` }}
                            className={`w-full flex items-center gap-3.5 px-4 h-[56px] rounded-[14px] text-sm font-semibold text-left transition-all duration-200 ease-out animate-fade-in-up relative overflow-hidden group ${
                                isActive
                                    ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg hover:from-[#1D4ED8] hover:to-[#6D28D9] shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-700/50 hover:-translate-y-0.5 hover:scale-[1.02]'
                            } active:scale-[0.98]`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {/* Active: left accent bar with glow */}
                            {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white/70 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] animate-sidebar-pulse"></span>
                            )}
                            {/* Active: subtle 3D inset effect */}
                            {isActive && (
                                <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[14px] pointer-events-none"></span>
                            )}
                            {/* Icon with animated hover */}
                            <i className={`fas ${item.icon} text-[18px] w-6 text-center transition-all duration-300 ${activeIconColor} ${
                                isActive ? '' : 'group-hover:scale-110 group-hover:animate-icon-bounce'
                            }`}></i>
                            <span className="flex-1 relative z-10">{item.label}</span>
                            {isActive && (
                                <span className="w-2 h-2 rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.6)] animate-pulse-slow"></span>
                            )}
                        </button>
                    );
                })}
                </div>
            </nav>

            {/* ─── Bottom Section ──────────────────────────── */}
            <div className="relative px-3 py-3 border-t border-[#E5E7EB] space-y-1 shrink-0">
                {/* Quick Actions separator */}
                <div className="px-4 pb-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Quick Actions</p>
                </div>

                {onNotifications && (
                    <button
                        onClick={onNotifications}
                        className={`w-full flex items-center justify-between px-4 h-[42px] rounded-[12px] text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] group ${
                            isNotificationsActive
                                ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <i className={`fas fa-bell text-[16px] w-5 text-center transition-all duration-300 ${
                                isNotificationsActive ? 'text-white' : 'text-amber-500 group-hover:scale-110'
                            }`}></i>
                            Notifications
                        </span>
                        {hasUnread && (
                            <span className={`h-2.5 w-2.5 rounded-full border-2 animate-pulse-slow ${
                                isNotificationsActive ? 'border-[#2563EB] bg-white' : 'border-white bg-[#DC2626] shadow-[0_0_6px_rgba(220,38,38,0.5)]'
                            }`}></span>
                        )}
                    </button>
                )}

                {onHistory && (
                    <button
                        onClick={onHistory}
                        className={`w-full flex items-center gap-3 px-4 h-[42px] rounded-[12px] text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] group ${
                            isHistoryActive
                                ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                        }`}
                    >                            <i className={`fas fa-history text-[16px] w-5 text-center transition-all duration-300 ${
                            isHistoryActive ? 'text-white' : 'text-indigo-500 group-hover:scale-110'
                        }`}></i>
                        Life Timeline
                    </button>
                )}

                {/* ─── Dark Mode Toggle ───────────────────── */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 h-[42px] rounded-[12px] text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-700/50 transition-all duration-200 ease-out active:scale-[0.98] group"
                >
                    <i className={`fas ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-400'} text-[16px] w-5 text-center transition-all duration-300 group-hover:scale-110`}></i>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>

                {/* ─── Language Switcher ─────────────────── */}
                <LanguageSwitcherInline />

                {onProfile && (
                    <button
                        onClick={onProfile}
                        className={`w-full flex items-center gap-3 px-4 h-[42px] rounded-[12px] text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] group ${
                            isProfileActive
                                ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-md'
                                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
                            isProfileActive ? 'bg-white text-[#2563EB] scale-110' : 'bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white'
                        }`}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="truncate">{user?.name || 'User'}</span>
                    </button>
                )}

                {/* ─── Premium Logout ───────────────────────── */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 h-[42px] rounded-[12px] text-sm font-semibold text-[#DC2626] bg-red-50/60 hover:bg-red-100/80 transition-all duration-200 ease-out active:scale-[0.98] group mt-1"
                    >
                        <i className="fas fa-sign-out-alt text-[16px] w-5 text-center text-red-500 group-hover:translate-x-0.5 transition-transform duration-200 group-hover:scale-110"></i>
                        Logout
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
