import React, { useEffect, useState } from 'react';
import { useScrollIn } from './hooks';
import { TIMELINE_STEPS } from './constants';

const EmergencyTimeline = () => {
    const [entered, ref] = useScrollIn();
    const [activeStep, setActiveStep] = useState(0);
    const [paused, setPaused] = useState(false);
    const [particles, setParticles] = useState([]);
    const [prevStep, setPrevStep] = useState(0);

    // Auto-advance with pause on hover
    useEffect(() => {
        if (!entered || paused) return;
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % TIMELINE_STEPS.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [entered, paused]);

    // Particle burst on step change
    useEffect(() => {
        if (!entered) return;
        const newParticles = Array.from({ length: 3 }, (_, i) => ({
            id: `${Date.now()}-${i}`,
            tx: `${30 + i * 15}px`,
            ty: `${-20 - i * 10}px`,
            size: `${3 + i * 2}px`,
        }));
        setParticles((p) => [...p.slice(-6), ...newParticles]);
        const timer = setTimeout(() => {
            setParticles((p) => p.filter((pt) => !newParticles.find((n) => n.id === pt.id)));
        }, 800);
        return () => clearTimeout(timer);
    }, [activeStep, entered]);

    const currentColor = TIMELINE_STEPS[activeStep].color;

    return (
        <section
            ref={ref}
            className="py-20 sm:py-28 relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-600">Emergency Workflow</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">From SOS to Admission</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">Every second counts. See how LifeLink transforms the emergency response chain — <strong className="text-gray-700">from citizen alert to hospital admission in under 4 minutes.</strong></p>
                </div>

                {/* Timeline Controls */}
                <div className={`flex items-center justify-center gap-4 mb-6 transition-all duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                        <span className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${paused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${paused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            </span>
                            <span className={`text-[11px] font-semibold ${paused ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {paused ? 'Paused' : 'Live'}
                            </span>
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-[11px] text-gray-500 font-medium">
                            Step <span className="font-bold text-gray-700">{activeStep + 1}</span> of {TIMELINE_STEPS.length}
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-[11px] text-gray-400">
                            <i className={`fas ${paused ? 'fa-play' : 'fa-pause'} mr-1`}></i>
                            {paused ? 'Hover to resume' : 'Hover to pause'}
                        </span>
                    </div>
                </div>

                {/* Timeline */}
                <div className={`max-w-5xl mx-auto transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="relative pt-2">
                        {/* Progress bar with traveling glow dot */}
                        <div className="absolute top-[64px] left-[60px] right-[60px] h-[3px] bg-gray-100 rounded-full hidden sm:block overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-800 ease-out relative"
                                style={{
                                    width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`,
                                    background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626)',
                                }}>
                                {/* Traveling glow dot */}
                                <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px]"
                                    style={{ animation: 'pulseGlowTravel 1.5s ease-in-out infinite' }}>
                                    <div className="w-full h-full rounded-full bg-white shadow-lg"
                                        style={{ boxShadow: `0 0 12px ${currentColor}, 0 0 24px ${currentColor}60` }}>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Particles */}
                        {particles.map((p) => (
                            <div key={p.id}
                                className="absolute z-20 rounded-full pointer-events-none"
                                style={{
                                    left: `${((activeStep) / (TIMELINE_STEPS.length - 1)) * 85 + 7.5}%`,
                                    top: '22px',
                                    width: p.size,
                                    height: p.size,
                                    background: currentColor,
                                    opacity: 0.7,
                                    animation: 'timelineParticle 0.8s ease-out forwards',
                                    '--tx': p.tx,
                                    '--ty': p.ty,
                                    boxShadow: `0 0 6px ${currentColor}`,
                                }}
                            />
                        ))}

                        {/* Step nodes grid */}
                        <div className="grid sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-2">
                            {TIMELINE_STEPS.map((step, i) => {
                                const isActive = i <= activeStep;
                                const isCurrent = i === activeStep;
                                const isPrev = i === activeStep - 1;
                                return (
                                    <div
                                        key={step.step}
                                        className="flex flex-col items-center text-center group"
                                        onClick={() => {
                                            setActiveStep(i);
                                            setPrevStep(i);
                                            setPaused(true);
                                            setTimeout(() => setPaused(false), 3000);
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            animation: entered && isCurrent ? `nodeEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` : 'none',
                                            animationDelay: entered && isCurrent ? `${i * 0.03}s` : '0s',
                                        }}
                                    >
                                        {/* Icon container with aurora ring */}
                                        <div className="relative mb-2">
                                            {/* Aura ring behind active node */}
                                            {isCurrent && (
                                                <div className="absolute inset-0 animate-aura-pulse"
                                                    style={{
                                                        borderRadius: '50%',
                                                        boxShadow: `0 0 20px ${step.color}30, 0 0 40px ${step.color}20`,
                                                        transform: 'scale(1.4)',
                                                    }}
                                                />
                                            )}

                                            {/* Step number badge on top */}
                                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white z-10 transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                                                style={{
                                                    background: `linear-gradient(135deg, ${step.color}, ${step.color}bb)`,
                                                    color: 'white',
                                                    boxShadow: isCurrent ? `0 0 8px ${step.color}60` : 'none',
                                                }}>
                                                {step.step}
                                            </div>

                                            {/* Main icon */}
                                            <div className={`relative w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-xl transition-all duration-600 ${isCurrent ? 'scale-110' : isActive ? 'scale-100' : 'scale-95'}`}
                                                style={{
                                                    background: isActive
                                                        ? `linear-gradient(135deg, ${step.color}, ${step.color}99)`
                                                        : 'rgba(255,255,255,0.55)',
                                                    boxShadow: isCurrent
                                                        ? `0 8px 32px ${step.color}50, inset 0 1px 0 ${step.color}30`
                                                        : isActive ? `0 4px 12px ${step.color}20` : 'none',
                                                    border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                                                    color: isActive ? 'white' : '#9CA3AF',
                                                    transform: isCurrent ? 'scale(1.1)' : isActive ? 'scale(1)' : 'scale(0.95)',
                                                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                }}>
                                                <i className={`fas ${step.icon}`} style={{
                                                    filter: isCurrent ? 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' : 'none',
                                                }}></i>
                                                {/* Live indicator on current */}
                                                {isCurrent && (
                                                    <span className="absolute -bottom-1 -left-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                                                    </span>
                                                )}
                                            </div>

                                        </div>

                                        {/* NOW badge — static between icon and title */}
                                        {isCurrent && (
                                            <div className="mt-1 flex items-center justify-center gap-1 animate-fade-in-up">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                                    style={{
                                                        background: `${step.color}12`,
                                                        color: step.color,
                                                    }}>
                                                    NOW
                                                </span>
                                            </div>
                                        )}

                                        {/* Title */}
                                        <p className={`text-[11px] font-semibold leading-tight transition-all duration-400 mt-1 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
                                            style={{
                                                transitionDelay: isCurrent ? '0.1s' : '0s',
                                            }}>
                                            {step.title}
                                        </p>

                                        {/* Description - crossfade on current */}
                                        <p className={`text-[10px] leading-relaxed hidden lg:block transition-all duration-500 ${isCurrent ? 'text-gray-600 opacity-100' : isActive ? 'text-gray-400 opacity-70' : 'text-gray-300 opacity-40'}`}
                                            style={{
                                                transitionDelay: isCurrent ? '0.15s' : '0s',
                                                maxWidth: '100px',
                                                margin: '0 auto',
                                            }}>
                                            {step.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Connection arrows between nodes (visible on larger screens) */}
                        <div className="hidden lg:flex justify-between px-[2%] mt-4 mb-2">
                            {TIMELINE_STEPS.slice(0, -1).map((step, i) => (
                                <div key={i} className="flex-1 flex justify-center">
                                    <i className={`fas fa-chevron-right text-[10px] transition-all duration-500 ${i < activeStep ? 'opacity-100' : 'opacity-20'}`}
                                        style={{
                                            color: i < activeStep ? step.color : '#D1D5DB',
                                            animation: i === activeStep - 1 ? 'arrowGlow 1.2s ease-in-out infinite' : 'none',
                                        }}>
                                    </i>
                                </div>
                            ))}
                        </div>

                        {/* Step detail bar */}
                        <div className={`mt-6 p-4 rounded-xl transition-all duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}
                            style={{
                                background: `${currentColor}06`,
                                border: `1px solid ${currentColor}20`,
                            }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${currentColor}, ${currentColor}aa)`,
                                        color: 'white',
                                        boxShadow: `0 4px 12px ${currentColor}30`,
                                    }}>
                                    <i className={`fas ${TIMELINE_STEPS[activeStep].icon}`}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-900">{TIMELINE_STEPS[activeStep].title}</span>
                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                            Step {activeStep + 1}/{TIMELINE_STEPS.length}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-gray-600 mt-0.5">{TIMELINE_STEPS[activeStep].desc}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 shrink-0">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    In Progress
                                </div>
                            </div>
                        </div>

                        {/* Completion summary */}
                        {activeStep === TIMELINE_STEPS.length - 1 && (
                            <div className="mt-6 animate-step-enter-slide">
                                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-transparent border border-emerald-200/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-lg">
                                            <i className="fas fa-check-circle"></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-emerald-800">Emergency Lifecycle Complete</p>
                                            <p className="text-[11px] text-emerald-600 mt-0.5">
                                                From citizen SOS to hospital admission in <strong>under 4 minutes</strong> — compared to 40-60 minutes with traditional systems.
                                            </p>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-1.5">
                                            <i className="fas fa-arrow-trend-up text-emerald-500"></i>
                                            <span className="text-[11px] font-bold text-emerald-700">93% Faster</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── TECH STACK ──────────────────────────────────────

export default EmergencyTimeline;
