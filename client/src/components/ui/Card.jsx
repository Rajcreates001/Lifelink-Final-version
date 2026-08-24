import React from 'react';

const Card = ({ children, className = '', hoverable = false, animate = false, colorFlow = false }) => (
    <div
        className={`
            bg-white dark:bg-slate-800/80 p-6 rounded-[18px] border border-[#E5E7EB] dark:border-slate-700/50
            min-w-0 max-w-full overflow-hidden
            transition-all duration-200 ease-out
            shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)]
            ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer' : ''}
            ${animate ? 'animate-fade-in-up' : ''}
            ${className}
        `.trim()}
        style={colorFlow ? { position: 'relative', overflow: 'hidden' } : {}}
    >
        {/* Color flow animation overlay - opt-in via colorFlow prop */}
        {colorFlow && (
            <>
                <div
                    className="absolute inset-0 pointer-events-none animate-color-flow"
                    style={{
                        background: 'radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.10) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.10) 0%, transparent 55%)',
                    }}
                ></div>
                <div
                    className="absolute inset-0 pointer-events-none animate-color-breathe"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.08) 0%, transparent 60%)',
                    }}
                ></div>
            </>
        )}
        <div className="relative z-10">
            {children}
        </div>
    </div>
);

export default Card;
