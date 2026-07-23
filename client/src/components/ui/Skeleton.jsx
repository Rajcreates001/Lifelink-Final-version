import React from 'react';

const Skeleton = ({ className = '', variant = 'text' }) => {
    const variants = {
        text: 'h-4 w-full rounded-[8px]',
        card: 'h-48 w-full rounded-[18px]',
        circle: 'h-12 w-12 rounded-full',
        chart: 'h-64 w-full rounded-[14px]',
        stat: 'h-24 w-full rounded-[14px]',
    };

    return (
        <div
            className={`
                relative overflow-hidden
                bg-gray-100
                ${variants[variant] || variants.text}
                ${className}
            `.trim()}
            role="status"
            aria-label="Loading"
        >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
    );
};

export default Skeleton;
