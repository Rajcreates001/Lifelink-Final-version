import React, { useEffect, useState } from 'react';
import { useScrollIn } from './hooks';
import { TIMELINE_STEPS } from './constants';

const Architecture = () => {
    const [entered, ref] = useScrollIn(0.1);
    const [activeStep, setActiveStep] = useState(0);
    const [paused, setPaused] = useState(false);
    const [particles, setParticles] = useState([]);

    // Auto-advance through steps
    useEffect(() => {
        if (!entered || paused) return;
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % TIMELINE_STEPS.length);
        }, 2600);
        return () => clearInterval(interval);
    }, [entered, paused]);

    // Generate traveling particles when active step changes
    useEffect(() => {
        if (!entered) return;
        const newParticles = [
            { id: Date.now() + Math.random(), x1: 10, y1: 50, x2: 90, y2: 50, delay: 0 },
            { id: Date.now() + Math.random() + 1, x1: 20, y1: 30, x2: 80, y2: 70, delay: 0.3 },
        ];
        setParticles(newParticles);
        const timer = setTimeout(() => setParticles([]), 1200);
        return () => clearTimeout(timer);
    }, [activeStep, entered]);

    return (
        <section ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-10 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">How It Works</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">From Emergency to Recovery</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">
                        Watch how LifeLink transforms a single emergency alert into a coordinated, life-saving response — <strong className="text-gray-700">in under 4 minutes.</strong>
                    </p>
                </div>

                {/* ─── Process Flow ──────────────────────────── */}
                <div
                    className={`max-w-5xl mx-auto transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {/* Progress bar */}
                    <div className="relative h-1.5 bg-gray-100 rounded-full mb-10 overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`,
                                background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626, #059669)',
                                boxShadow: '0 0 12px rgba(37,99,235,0.3)',
                            }}
                        />
                        <div
                            className="absolute top-0 h-full w-3 rounded-full bg-white animate-pulse-slow"
                            style={{
                                left: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`,
                                transform: 'translateX(-50%)',
                            }}
                        />
                    </div>

                    {/* Steps - Desktop: horizontal grid, Mobile: vertical */}
                <div className="hidden lg:grid lg:grid-cols-7 gap-2 relative pb-24">
                    {/* Connection line below nodes */}
                    <div className="absolute top-[58px] left-[8%] right-[8%] h-[2px] bg-gray-100/60" />
                    <div
                        className="absolute top-[58px] h-[2px] transition-all duration-700 ease-out"
                        style={{
                            left: '8%',
                            width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 84}%`,
                            background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626, #059669)',
                            boxShadow: '0 0 8px rgba(37,99,235,0.2)',
                        }}
                    />

                        {TIMELINE_STEPS.map((step, i) => {
                            const isActive = i <= activeStep;
                            const isCurrent = i === activeStep;
                            return (
                                <div
                                    key={step.step}
                                    className="flex flex-col items-center text-center relative cursor-pointer"
                                    onClick={() => { setActiveStep(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                                >                {/* Node circle */}
                <div
                    className={`relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-xl transition-all duration-700 ease-out z-10 ${
                        isCurrent ? 'shadow-lg scale-110' : isActive ? 'shadow-sm' : ''
                    }`}
                    style={{
                        background: isActive
                            ? `linear-gradient(135deg, ${step.color}, ${step.color}bb)`
                            : 'rgba(255,255,255,0.95)',
                        boxShadow: isCurrent
                            ? `0 4px 20px ${step.color}50, 0 0 30px ${step.color}20`
                            : isActive ? `0 2px 8px ${step.color}30` : 'none',
                        border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                        color: isActive ? 'white' : '#9CA3AF',
                        backdropFilter: isActive ? 'none' : 'blur(8px)',
                    }}
                >
                    <i className={`fas ${step.icon} ${isCurrent ? 'animate-icon-bounce' : ''}`}></i>
                    {/* Pulse ring on current step */}
                    {isCurrent && (
                        <span
                            className="absolute inset-0 rounded-2xl animate-ping opacity-25"
                            style={{ border: `2.5px solid ${step.color}` }}
                        />
                    )}
                    {/* Live dot */}
                    {isCurrent && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse-slow" />
                    )}
                </div>

                                    {/* Step number */}
                                    <span
                                        className={`mt-2 text-[10px] font-bold transition-colors duration-300 ${
                                            isActive ? 'text-gray-700' : 'text-gray-300'
                                        }`}
                                    >
                                        {String(step.step).padStart(2, '0')}
                                    </span>
                                    <p
                                        className={`text-[10px] font-semibold leading-tight transition-colors duration-300 ${
                                            isActive ? 'text-gray-900' : 'text-gray-400'
                                        }`}
                                    >
                                        {step.title}
                                    </p>

                                    {/* Active detail card below */}
                                    {isCurrent && (
                                        <div
                                            className="absolute top-[76px] left-1/2 -translate-x-1/2 w-44 p-2.5 rounded-xl shadow-lg z-20 animate-fade-in-up"
                                            style={{
                                                background: 'rgba(255,255,255,0.97)',
                                                backdropFilter: 'blur(12px)',
                                                border: `1px solid ${step.color}44`,
                                            }}
                                        >
                                            <p className="text-[10px] text-gray-500 leading-relaxed">{step.desc}</p>
                                            <div className="mt-1.5 flex items-center gap-1">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[8px] font-semibold text-emerald-600">ACTIVE</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Traveling particles */}
                        {particles.map((p) => (
                            <div
                                key={p.id}
                                className="absolute w-2 h-2 rounded-full pointer-events-none"
                                style={{
                                    background: TIMELINE_STEPS[activeStep].color,
                                    boxShadow: `0 0 8px ${TIMELINE_STEPS[activeStep].color}80`,
                                    left: `${p.x1}%`,
                                    top: `${p.y1}%`,
                                    animation: `particleTravel 0.8s ease-out ${p.delay}s forwards`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Mobile: Vertical timeline */}
                    <div className="lg:hidden max-w-md mx-auto">
                        {TIMELINE_STEPS.map((step, i) => {
                            const isActive = i <= activeStep;
                            const isCurrent = i === activeStep;
                            return (
                                <div
                                    key={step.step}
                                    className="flex items-start gap-3 pb-5 relative cursor-pointer group"
                                    onClick={() => { setActiveStep(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                                >
                                    {/* Timeline line */}
                                    {i < TIMELINE_STEPS.length - 1 && (
                                        <div
                                            className="absolute left-[22px] top-10 bottom-0 w-[2px]"
                                            style={{ background: isActive ? step.color : '#E5E7EB' }}
                                        />
                                    )}
                                    {/* Node */}
                                    <div
                                        className={`relative w-11 h-11 rounded-xl flex items-center justify-center text-base shrink-0 z-10 transition-all duration-500 ${
                                            isCurrent ? 'shadow-md scale-110' : ''
                                        }`}
                                        style={{
                                            background: isActive
                                                ? `linear-gradient(135deg, ${step.color}, ${step.color}bb)`
                                                : 'rgba(255,255,255,0.7)',
                                            boxShadow: isCurrent ? `0 4px 16px ${step.color}40` : 'none',
                                            border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                                            color: isActive ? 'white' : '#9CA3AF',
                                        }}
                                    >
                                        <i className={`fas ${step.icon}`}></i>
                                        {isCurrent && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse-slow" />
                                        )}
                                    </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-bold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</p>
                                            {isCurrent && (
                                                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">NOW</span>
                                            )}
                                        </div>
                                        {/* Active detail section */}
                                    {isCurrent && (
                                        <div className="animate-fade-in-up">
                                            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mt-1">{step.desc}</p>
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-600 tracking-wider">NOW</span>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ─── Bottom controls + summary ─────────── */}
                    <div className={`mt-8 flex items-center justify-between transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setPaused(!paused)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white/70 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-white transition-all duration-200"
                                aria-label={paused ? 'Resume animation' : 'Pause animation'}
                            >
                                <i className={`fas ${paused ? 'fa-play' : 'fa-pause'} text-[10px]`}></i>
                                {paused ? 'Resume' : 'Pause'}
                            </button>
                            <span className="text-[11px] text-gray-400">
                                Step {activeStep + 1} of {TIMELINE_STEPS.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600">Live Simulation</span>
                        </div>
                    </div>

                    {/* Final admission summary card */}
                    {activeStep === TIMELINE_STEPS.length - 1 && (
                        <div className="mt-6 p-4 rounded-xl animate-fade-in-up text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(37,99,235,0.05))',
                                border: '1px solid rgba(5,150,105,0.2)',
                            }}
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <i className="fas fa-circle-check text-emerald-500"></i>
                                <span className="text-sm font-bold text-emerald-700">Emergency Lifecycle Complete</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                From citizen SOS to hospital admission in <strong className="text-gray-700">under 4 minutes</strong> —
                                compared to <strong className="text-gray-400">40-60 minutes</strong> with traditional systems.
                                Every second saved is a life saved.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

// ─── EMERGENCY TIMELINE ──────────────────────────────

export default Architecture;
