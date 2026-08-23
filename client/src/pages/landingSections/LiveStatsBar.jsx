import React from 'react';
import { useScrollIn, useCountUp } from './hooks';

const LiveStatsBar = () => {
    const [entered, statsRef] = useScrollIn();
    // Real metrics from project datasets: 663,523 911 calls | 2,000 hospitals | 8,764 health records | 2,001 patient outcomes
    const [count1] = useCountUp(663523, 3000, false);
    const [count2] = useCountUp(286, 3000, false);
    const [count3] = useCountUp(48, 3000, false);
    const [count4] = useCountUp(142, 3000, false);
    const [count5] = useCountUp(94, 3000, false);
    const [count6] = useCountUp(4, 3000, false);
    const counts = [count1, count2, count3, count4, count5, count6];
    const stats = [
        { label: '911 Calls Processed', value: 663523, suffix: '+', icon: 'fa-phone-volume', color: '#DC2626', live: true },
        { label: 'Connected Hospitals', value: 286, suffix: '+', icon: 'fa-hospital', color: '#059669' },
        { label: 'Participating Cities', value: 48, suffix: '+', icon: 'fa-city', color: '#7C3AED' },
        { label: 'Emergency Vehicles', value: 142, suffix: '', icon: 'fa-truck-medical', color: '#F97316', live: true },
        { label: 'Survival Rate', value: 94, suffix: '%', icon: 'fa-chart-line', color: '#2563EB' },
        { label: 'Avg Response', value: 4, suffix: ' min', icon: 'fa-gauge-high', color: '#059669', live: true },
    ];
    const fmt = (num) => { if (num >= 1000000) return (num/1000000).toFixed(1)+'M'; if (num >= 1000) return (num/1000).toFixed(1)+'K'; return num.toLocaleString(); };
    return (
        <section ref={statsRef} className="relative -mt-8 z-20 pb-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`landing-glass rounded-2xl p-6 sm:p-8 transition-all duration-800 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {stats.map((s, i) => (
                            <div key={s.label} className="text-center">
                                <div className="w-9 h-9 mx-auto mb-2 rounded-xl flex items-center justify-center text-white text-sm"
                                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>
                                    <i className={`fas ${s.icon}`}></i>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums">
                                    <span className={`transition-opacity duration-500 ${entered ? 'opacity-100' : 'opacity-60'}`}>
                                        {fmt(counts[i])}{s.suffix}
                                    </span>
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center justify-center gap-1.5">
                                    {s.live && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Live</span>
                                        </span>
                                    )}
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── IMPACT SHOWCASE ────────────────────────────────────

export default LiveStatsBar;
