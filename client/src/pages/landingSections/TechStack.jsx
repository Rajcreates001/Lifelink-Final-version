import React from 'react';
import { useScrollIn } from './hooks';
import { TECH_STACK } from './constants';

const TechStack = () => {
    const [entered, ref] = useScrollIn();
    const techColors = ['#2563EB', '#059669', '#DC2626', '#7C3AED', '#F97316', '#0891B2', '#F59E0B', '#EC4899'];
    // Random proficiency scores for visual interest (seeded by tech name)
    const techScores = TECH_STACK.map((tech, i) => ({
        name: tech,
        score: 65 + (tech.length * 7 + i * 13) % 32,
        color: techColors[i % techColors.length],
    }));
    return (
        <section id="tech" ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Technology</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Built With Modern Stack</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Enterprise-grade infrastructure powering real-time healthcare intelligence.</p>
                </div>
                <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {techScores.map((t, i) => (
                        <div key={t.name}
                            className="group landing-glass rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-1.5 hover:-translate-y-1.5 cursor-default transition-all duration-300 min-w-0 w-full"
                            style={{
                                transitionDelay: `${i * 0.03}s`,
                                borderLeft: `2px solid ${t.color}30`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderLeftColor = `${t.color}99`}
                            onMouseLeave={e => e.currentTarget.style.borderLeftColor = `${t.color}30`}>
                            {/* Color dot + Name in a row */}
                            <div className="flex items-center gap-1.5 w-full justify-center">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color, boxShadow: `0 0 4px ${t.color}60` }}></span>
                                <span className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors truncate">{t.name}</span>
                            </div>
                            {/* Animated proficiency bar */}
                            <div className="w-full mt-0.5">
                                <div className="flex items-center justify-between mb-0.5 px-0.5">
                                    <span className="text-[6px] font-medium text-gray-400 uppercase tracking-wider">Adoption</span>
                                    <span className="text-[7px] font-bold tabular-nums" style={{ color: t.color, opacity: entered ? 1 : 0, transition: `opacity 0.3s ease ${0.8 + i * 0.03}s` }}>
                                        {entered ? t.score : 0}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-100/80 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                        style={{
                                            width: entered ? `${t.score}%` : '0%',
                                            background: `linear-gradient(90deg, ${t.color}, ${t.color}aa)`,
                                            transitionDelay: `${0.5 + i * 0.03}s`,
                                            boxShadow: entered ? `0 0 6px ${t.color}25` : 'none',
                                        }}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer-slide"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── WHY LIFELINK ─────────────────────────────────────

export default TechStack;
