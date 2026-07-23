import React from 'react';

const ResponsiveNavbar = ({
  title = 'LifeLink',
  subtitle,
  onLogoClick,
  onMenuClick,
  onSearchToggle,
  isSearchOpen,
}) => (
  <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#E5E7EB]">
    <div className="flex items-center justify-between h-14 px-4">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="p-2 rounded-[12px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 active:scale-90"
      >
        <i className="fas fa-bars text-lg"></i>
      </button>

      <button onClick={onLogoClick} className="flex items-center gap-2.5 group">
        <div className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white p-2 rounded-[10px] shadow-md" style={{ boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
          <i className="fas fa-heartbeat text-base"></i>
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900 leading-tight">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.08em]">
              {subtitle}
            </p>
          )}
        </div>
      </button>

      <button
        type="button"
        aria-label="Toggle search"
        aria-pressed={isSearchOpen}
        onClick={onSearchToggle}
        className={`p-2 rounded-[12px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 active:scale-90 ${isSearchOpen ? 'bg-gray-100 text-[#2563EB]' : ''}`}
      >
        <i className="fas fa-magnifying-glass text-lg"></i>
      </button>
    </div>
  </header>
);

export default ResponsiveNavbar;
