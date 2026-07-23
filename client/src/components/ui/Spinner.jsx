import React from 'react';

const Spinner = ({ size = 'md', color = 'white', className = '' }) => {
    const sizes = {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-[3px]',
        xl: 'h-12 w-12 border-4',
    };

    const colors = {
        white: 'border-white/30 border-t-white',
        blue: 'border-blue-200 border-t-[#2563EB]',
        indigo: 'border-indigo-200 border-t-[#6366F1]',
        slate: 'border-slate-200 border-t-slate-600',
        gradient: 'border-transparent border-t-[#2563EB] border-r-[#7C3AED]',
        purple: 'border-purple-200 border-t-[#7C3AED]',
        red: 'border-red-200 border-t-[#DC2626]',
        green: 'border-emerald-200 border-t-[#059669]',
    };

    return (
        <div
            className={`
                animate-spin rounded-full 
                ${colors[color] || colors.white} 
                ${sizes[size] || sizes.md}
                ${className}
            `.trim()}
            role="status"
            aria-label="Loading"
        />
    );
};

export default Spinner;
