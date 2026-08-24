import React from 'react';

/**
 * ResponsiveGrid — Drop-in responsive grid for dashboard cards.
 *
 * Props:
 *   cols: { sm, md, lg, xl } — column counts at each breakpoint
 *   gap: spacing between items (default: 4)
 *   className: additional classes
 */
const ResponsiveGrid = ({ children, cols = {}, gap = 4, className = '' }) => {
    const sm = cols.sm || 1;
    const md = cols.md || 2;
    const lg = cols.lg || 3;
    const xl = cols.xl || 4;

    return (
        <div className={`
            grid
            grid-cols-${sm}
            md:grid-cols-${md}
            lg:grid-cols-${lg}
            xl:grid-cols-${xl}
            gap-${gap}
            ${className}
        `}>
            {children}
        </div>
    );
};

/**
 * ResponsiveCard — Card with responsive padding and max-width.
 */
export const ResponsiveCard = ({ children, className = '', padding = true }) => (
    <div className={`
        bg-white rounded-xl border border-gray-100 shadow-sm
        ${padding ? 'p-3 sm:p-4 lg:p-6' : ''}
        transition-shadow hover:shadow-md
        ${className}
    `}>
        {children}
    </div>
);

/**
 * ResponsiveTable — Scrollable table for mobile.
 */
export const ResponsiveTable = ({ children, className = '' }) => (
    <div className={`overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 ${className}`}>
        <div className="min-w-full">
            {children}
        </div>
    </div>
);

/**
 * ResponsiveHeader — Dashboard header with responsive text and layout.
 */
export const ResponsiveHeader = ({ title, subtitle, actions, className = '' }) => (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
        <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
);

/**
 * ResponsiveTabs — Tab bar that scrolls horizontally on mobile.
 */
export const ResponsiveTabs = ({ tabs, activeTab, onChange, className = '' }) => (
    <div className={`flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto ${className}`}>
        {tabs.map((tab) => (
            <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={`
                    flex-shrink-0 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                    ${activeTab === tab.key
                        ? 'bg-white shadow text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }
                `}
            >
                {tab.icon && <i className={`fas ${tab.icon} mr-1`}></i>}
                {tab.label}
                {tab.count !== undefined && (
                    <span className="ml-1 text-[10px] bg-gray-200 rounded-full px-1.5 py-0.5">
                        {tab.count}
                    </span>
                )}
            </button>
        ))}
    </div>
);

/**
 * MobileDrawer — Slide-in drawer for mobile navigation.
 */
export const MobileDrawer = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
            <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl transform transition-transform">
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="font-bold text-gray-900">Menu</span>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </>
    );
};

/**
 * MobileNav — Bottom navigation bar for mobile.
 */
export const MobileNav = ({ items, activeKey, onChange }) => (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-2">
            {items.slice(0, 5).map((item) => (
                <button
                    key={item.key}
                    onClick={() => onChange(item.key)}
                    className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition-colors ${
                        activeKey === item.key ? 'text-indigo-600' : 'text-gray-500'
                    }`}
                >
                    <i className={`fas ${item.icon} text-lg`}></i>
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    </nav>
);

export default ResponsiveGrid;
