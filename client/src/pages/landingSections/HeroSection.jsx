import React from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSection = ({ entered }) => {
    const navigate = useNavigate();

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            <div className="absolute inset-0 pointer-events-none">
                {/* Flowing role-color gradient background */}
                <div className="absolute inset-0 animate-role-gradient-flow"
                    style={{
                        background: `
                            radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.10) 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 20%, rgba(5,150,105,0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at 40% 80%, rgba(124,58,237,0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at 60% 40%, rgba(220,38,38,0.06) 0%, transparent 50%),
                            radial-gradient(ellipse at 90% 70%, rgba(249,115,22,0.06) 0%, transparent 50%)
                        `
                    }}
                />
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-400/10 to-purple-400/10 blur-[140px] animate-morph-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-br from-emerald-300/10 via-teal-300/10 to-cyan-300/10 blur-[140px] animate-morph-blob" style={{ animationDelay: '-6s' }}></div>
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-purple-300/10 via-pink-300/10 to-blue-300/10 blur-[120px] animate-morph-blob" style={{ animationDelay: '-10s' }}></div>
                <div className="absolute inset-0 opacity-[0.03] animate-grid-flow"
                    style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-white/30 blur-[1px] animate-float-slow"
                        style={{
                            width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`,
                            top: `${10 + Math.random() * 80}%`, left: `${5 + Math.random() * 90}%`,
                            animationDelay: `-${Math.random() * 8}s`, animationDuration: `${6 + Math.random() * 6}s`,
                        }} />
                ))}
            </div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-left">
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200/50 mb-6 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">🌍 Building a Healthier, Stronger World</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 font-display leading-[1.05]">
                            <span className={`block transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: '0.5s' }}>
                                Saving Lives.
                            </span>
                            <span className={`block transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: '0.65s' }}>
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Building Better Cities.</span>
                            </span>
                            <span className={`block transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: '0.8s' }}>
                                A Stronger Nation.
                            </span>
                        </h1>
                        <p className={`mt-5 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl transition-all duration-700 delay-1000 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            An AI-powered intelligence platform uniting citizens, hospitals, ambulances, and governments — turning emergencies into seamless, life-saving operations. <span className="text-gray-900 font-semibold">Smarter cities. Healthier communities. A resilient world.</span>
                        </p>
                        <div className={`mt-8 flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-1200 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <button onClick={() => navigate('/signup')}
                                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-[15px] shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                <i className="fas fa-rocket"></i>
                                <span>Start Building Impact</span>
                                <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                            </button>
                            <button
                                onClick={() => document.getElementById('impact-showcase')?.scrollIntoView({ behavior: 'smooth' })}
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm text-gray-700 font-semibold text-[15px] hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-200">
                                <i className="fas fa-chart-bar"></i>
                                <span>See Our Impact</span>
                            </button>
                        </div>
                        <div className={`mt-10 flex items-center gap-6 sm:gap-10 transition-all duration-700 delay-1400 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {[
                                { number: '663K', label: '911 Calls Analyzed', icon: 'fa-phone-volume', color: '#DC2626' },
                                { number: '< 4 min', label: 'Avg Emergency Response', icon: 'fa-gauge-high', color: '#059669' },
                                { number: '286+', label: 'Connected Hospitals', icon: 'fa-hospital', color: '#2563EB' },
                                { number: '48+', label: 'Cities Participating', icon: 'fa-city', color: '#7C3AED' },
                            ].map((s) => (
                                <div key={s.label} className="text-center lg:text-left">
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{s.number}</p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* ─── LIVE IMPACT CHART ZONE ─── */}
                    <div className={`flex flex-col justify-center transition-all duration-1000 delay-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} w-full`}>
                        {/* Main dashboard panel */}
                        <div className="chart-3d-perspective w-full" style={{ perspective: '1200px' }}>
                        <div className="landing-glass rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                            style={{ transform: 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)', transition: 'transform 0.3s ease', transformStyle: 'preserve-3d' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'rotateX(1deg) rotateY(-2deg) rotateZ(0.3deg) translateY(-3px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)'}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #2563EB, transparent 70%)' }}></div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }}></div>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                                    Live Performance Dashboard
                                </h3>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-semibold text-emerald-700">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    Real-time
                                </span>
                            </div>

                            {/* Row 1: Radial gauges + Live counters */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                                {/* Gauge 1: Survival Rate */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-red-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 94/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.3s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-red-600 tabular-nums">94%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">Survival Rate</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">+52% vs legacy</span>
                                </div>

                                {/* Gauge 2: AI Accuracy */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 94.2/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.5s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-purple-600 tabular-nums">94.2%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">AI Accuracy</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">8 models active</span>
                                </div>

                                {/* Gauge 3: Uptime */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 99.98/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.7s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 tabular-nums">99.98%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">Uptime SLA</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">99.7% satisfaction</span>
                                </div>

                                {/* Gauge 4: Response */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 91/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.9s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-blue-600 tabular-nums">91%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">Coverage</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">48+ cities</span>
                                </div>
                            </div>

                            {/* Row 2: Comparison bars */}
                            <div className="space-y-2.5 mb-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <i className="fas fa-arrow-right-arrow-left text-[8px] text-gray-400"></i>
                                    <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">LifeLink vs Traditional — Key Metrics</span>
                                </div>
                                {[
                                    { label: 'Response Time', traditional: 45, lifelink: 4, unit: 'min', icon: 'fa-truck-medical', lColor: '#059669', improvement: '11× Faster' },
                                    { label: 'Bed Allocation', traditional: 360, lifelink: 12, unit: 'min', icon: 'fa-bed', lColor: '#2563EB', improvement: '30× Faster' },
                                    { label: 'Disaster Prep', traditional: 72, lifelink: 4, unit: 'hrs', icon: 'fa-shield-halved', lColor: '#7C3AED', improvement: '18× Faster' },
                                    { label: 'Throughput', traditional: 8, lifelink: 42, unit: '/hr', icon: 'fa-gauge-high', lColor: '#059669', improvement: '5× Higher' },
                                ].map((m, i) => {
                                    const maxV = Math.max(m.traditional, m.lifelink * 2);
                                    const tw = (m.traditional / maxV) * 100;
                                    const lw = (m.lifelink / maxV) * 100;
                                    return (
                                        <div key={m.label} className={`transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}
                                            style={{ transitionDelay: `${1.1 + i * 0.12}s` }}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-1">
                                                    <i className={`fas ${m.icon} text-[8px]`} style={{ color: m.lColor }}></i>
                                                    <span className="text-[10px] font-semibold text-gray-700">{m.label}</span>
                                                </div>
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-700">{m.improvement}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] font-medium text-gray-400 w-4 shrink-0">Old</span>
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gray-300 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: entered ? `${tw}%` : '0%', transitionDelay: `${1.2 + i * 0.12}s` }}></div>
                                                </div>
                                                <span className="text-[8px] font-semibold text-gray-400 w-7 text-right tabular-nums">{m.traditional}{m.unit}</span>
                                                <span className="text-[7px] font-bold w-3 shrink-0" style={{ color: m.lColor }}>AI</span>
                                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                                        style={{
                                                            width: entered ? `${lw}%` : '0%',
                                                            background: `linear-gradient(90deg, ${m.lColor}, ${m.lColor}bb)`,
                                                            transitionDelay: `${1.4 + i * 0.12}s`,
                                                            boxShadow: `0 0 8px ${m.lColor}30`,
                                                        }}>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-bold w-7 text-right tabular-nums" style={{ color: m.lColor }}>{m.lifelink}{m.unit}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Row 3: Growth sparkline + key stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {/* Growth sparkline */}
                                <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-gradient-to-r from-blue-50/30 to-purple-50/30">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Emergencies Simulated</span>
                                        <span className="text-[10px] font-bold text-blue-600 tabular-nums">663K</span>
                                    </div>
                                    <div className="h-8">
                                        <svg viewBox="0 0 120 32" className="w-full h-full">
                                            <defs>
                                                <linearGradient id="heroGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25"/>
                                                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01"/>
                                                </linearGradient>
                                            </defs>
                                            <path d="M2,28 C10,26 20,24 30,20 C40,16 50,14 60,12 C70,10 80,7 90,5 C100,3 110,2 118,1 L118,32 L2,32 Z" fill="url(#heroGrowthGrad)" opacity={entered ? 0.8 : 0} style={{ transition: 'opacity 1.5s ease-out 1.8s' }}/>
                                            <path d="M2,28 C10,26 20,24 30,20 C40,16 50,14 60,12 C70,10 80,7 90,5 C100,3 110,2 118,1" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"
                                                strokeDasharray="250" strokeDashoffset={entered ? 0 : 250} style={{ transition: 'stroke-dashoffset 2s ease-out 1.8s' }}/>
                                        </svg>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[6px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">▲ 40% YoY</span>
                                        <span className="text-[6px] text-gray-400">2025 → 2028 projection</span>
                                    </div>
                                </div>
                                {/* Key stat 1 */}
                                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-50/30 to-transparent flex flex-col justify-center">
                                    <span className="text-[9px] text-amber-600 font-bold tabular-nums">286+</span>
                                    <span className="text-[7px] text-gray-500">Connected Hospitals</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[6px] text-emerald-600 font-medium">Live network</span>
                                    </div>
                                </div>
                                {/* Key stat 2 */}
                                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-50/30 to-transparent flex flex-col justify-center">
                                    <span className="text-[9px] text-cyan-600 font-bold tabular-nums">1,247</span>
                                    <span className="text-[7px] text-gray-500">Ambulances On-road</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[6px] text-emerald-600 font-medium">Active now</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom impact summary */}
                            <div className={`mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}
                                style={{ transitionDelay: '2.2s' }}>
                                {[
                                    { label: 'Avg Response', value: '< 4 min', color: '#059669', icon: 'fa-gauge-high' },
                                    { label: 'Survival Rate', value: '94%', color: '#DC2626', icon: 'fa-heart-pulse' },
                                    { label: 'Cost Savings', value: '62%', color: '#F97316', icon: 'fa-coins' },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50/50">
                                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] text-white shrink-0" style={{ background: stat.color }}>
                                            <i className={`fas ${stat.icon}`}></i>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold" style={{ color: stat.color }}>{stat.value}</p>
                                            <p className="text-[6px] text-gray-400 truncate">{stat.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* ─── Floating chart card gallery ─── */}
                <div className={`hidden lg:grid grid-cols-4 gap-3 mt-6 transition-all duration-1000 delay-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {[
                        { title: 'AI Accuracy', value: '94.2%', color: '#7C3AED', bars: [96, 94, 92, 90, 88], icon: 'fa-brain' },
                        { title: 'Network Scale', value: '286+ Hosps', color: '#059669', bars: [50, 70, 85, 95, 100], icon: 'fa-project-diagram' },
                        { title: '24/7 Uptime', value: '99.98%', color: '#2563EB', bars: [99.9, 99.95, 99.98, 99.98, 99.98], icon: 'fa-shield-check' },
                        { title: 'Ambulance Fleet', value: '1,247 Veh', color: '#F97316', bars: [200, 500, 800, 1100, 1247], icon: 'fa-truck-medical' },
                    ].map((fc, fi) => (
                        <div key={fc.title} className="chart-3d-perspective">
                            <div className="landing-glass rounded-xl p-3 relative overflow-hidden group"
                                style={{ transform: 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)', transition: 'transform 0.3s ease', transformStyle: 'preserve-3d' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'rotateX(1deg) rotateY(-2deg) rotateZ(0.3deg) translateY(-3px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)'}>
                                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500"
                                    style={{ background: `radial-gradient(circle at 50% 0%, ${fc.color}, transparent 70%)` }}></div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]"
                                            style={{ background: `${fc.color}15`, color: fc.color }}>
                                            <i className={`fas ${fc.icon}`}></i>
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-700">{fc.title}</span>
                                    </div>
                                    <span className="text-[10px] font-bold" style={{ color: fc.color }}>{fc.value}</span>
                                </div>
                                {/* Mini bar sparkline */}
                                <div className="h-5 flex items-end gap-[2px]">
                                    {fc.bars.map((b, bi) => {
                                        const maxB = Math.max(...fc.bars);
                                        const h = (b / maxB) * 100;
                                        return (
                                            <div key={bi} className="flex-1 flex flex-col items-center justify-end h-full">
                                                <div className={`w-full rounded-t-sm transition-all duration-700 ease-out ${entered ? 'opacity-100' : 'opacity-0'}`}
                                                    style={{
                                                        height: entered ? `${h}%` : '0%',
                                                        background: `linear-gradient(180deg, ${fc.color}, ${fc.color}66)`,
                                                        transitionDelay: `${0.3 + bi * 0.08}s`,
                                                        borderRadius: '2px 2px 0 0',
                                                    }}>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-1.5 flex items-center gap-1">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[7px] text-emerald-600 font-medium">Live</span>
                                    <span className="text-[7px] text-gray-400 ml-auto">+{12 + fi * 3}% this month</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-float">
                <div className="w-6 h-10 rounded-full border-2 border-gray-300/50 flex justify-center pt-2">
                    <div className="w-1 h-2 rounded-full bg-gray-400 animate-pulse-slow"></div>
                </div>
            </div>
        </section>
    );
};

// ─── SAFETY SECTION ─────────────────────────────────────

export default HeroSection;
