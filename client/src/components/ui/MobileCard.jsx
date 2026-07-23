import React from 'react';

const MobileCard = ({ children, className = '', animate = false }) => (
    <div
        className={`
            rounded-[18px] border border-[#E5E7EB] bg-white p-4 sm:p-5 
            min-w-0 max-w-full overflow-hidden break-words
            transition-all duration-200 ease-out
            shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)]
            active:scale-[0.99]
            ${animate ? 'animate-fade-in-up' : ''}
            ${className}
        `.trim()}
    >
        {children}
    </div>
);

export default MobileCard;
