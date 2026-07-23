import React from 'react';
import SearchBar from '../ui/SearchBar';

const Navbar = ({
    user,
    onLogoClick,
    onLogout,
    onProfile,
    onNotifications,
    hasUnread,
    searchProps,
}) => (
    <header
        className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-[#E5E7EB] animate-fade-in-down"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-[68px] gap-4">
                {/* Logo */}
                <button onClick={onLogoClick} className="flex items-center gap-3 group shrink-0">
                    <div className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white p-2 rounded-[12px] shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" style={{ boxShadow: '0 4px 14px rgba(37,99,235,0.2)' }}>
                        <i className="fas fa-heartbeat text-lg"></i>
                    </div>
                    <div className="text-left">
                        <h1 className="text-lg font-bold text-gray-900 group-hover:text-[#2563EB] transition-colors duration-300">LifeLink</h1>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.08em]">
                            {user?.role ? `${user.role} portal` : 'Portal'}{user?.subRole ? ` • ${user.subRole}` : ''}
                        </p>
                    </div>
                </button>

                {/* Search */}
                <div className="flex-1 max-w-xl hidden md:block">
                    <SearchBar {...searchProps} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onNotifications}
                        className="relative p-2.5 rounded-[12px] text-gray-400 hover:text-[#2563EB] hover:bg-blue-50 transition-all duration-200 active:scale-90"
                        aria-label="Notifications"
                    >
                        <i className="fas fa-bell text-lg"></i>
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-[#DC2626] rounded-full border-2 border-white animate-pulse-slow"></span>
                        )}
                    </button>

                    <button
                        onClick={onProfile}
                        className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 px-3 h-9 rounded-[12px] text-sm font-semibold text-gray-700 transition-all duration-200 active:scale-95 group"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform duration-200">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="hidden md:inline">{user?.name || 'User'}</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="text-[#DC2626] hover:text-[#B91C1C] p-2.5 rounded-[12px] hover:bg-red-50 transition-all duration-200 active:scale-90"
                        title="Logout"
                        aria-label="Logout"
                    >
                        <i className="fas fa-sign-out-alt text-lg"></i>
                    </button>
                </div>
            </div>
            {/* Mobile search */}
            <div className="md:hidden pb-3">
                <SearchBar {...searchProps} />
            </div>
        </div>
    </header>
);

export default Navbar;
