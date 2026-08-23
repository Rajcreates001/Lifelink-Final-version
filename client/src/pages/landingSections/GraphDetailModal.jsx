import React from 'react';
import { createPortal } from 'react-dom';

const GraphDetailModal = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>
            <div
                className="relative w-full max-w-4xl rounded-2xl shadow-2xl animate-fade-in-up"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 z-10"
                    aria-label="Close details"
                >
                    <i className="fas fa-xmark text-sm"></i>
                </button>

                {/* Header */}
                <div className="p-6 sm:p-7 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: `${item.color}15`, color: item.color }}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                    {/* Source badge */}
                    <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                            <i className="fas fa-book-open text-[8px]"></i>
                            {item.source?.name}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 pt-4 space-y-5">
                    {/* Enhanced chart display */}
                    <div className="bg-gray-50/60 rounded-xl p-5 sm:p-6">
                        {/* ─── BAR CHART (ENHANCED) ─── */}
                        {item.type === 'bar' && item.bars && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Performance Comparison</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        {item.lifelink < item.traditional
                                            ? `${Math.round((1 - item.lifelink / item.traditional) * 100)}% Faster`
                                            : `+${Math.round((item.lifelink - item.traditional) / item.traditional * 100)}%`}
                                    </span>
                                </div>
                                <div className="flex items-end gap-6 h-48">
                                    {item.bars.map((b, bi) => {
                                        const maxVal = Math.max(...item.bars.map(x => x.val));
                                        const h = (b.val / maxVal) * 100;
                                        const isAI = b.label === 'LifeLink' || b.label === 'LifeLink Cost Index';
                                        return (
                                            <div key={b.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                                <span className="text-lg font-bold tabular-nums animate-fade-in"
                                                    style={{ color: isAI ? item.color : '#9CA3AF' }}>
                                                    {b.val}{item.unit}
                                                </span>
                                                <div className="w-full rounded-lg overflow-hidden relative transition-all duration-1000 ease-out"
                                                    style={{
                                                        height: `${h}%`,
                                                        minHeight: '16px',
                                                        background: isAI
                                                            ? `linear-gradient(180deg, ${item.color}, ${item.color}aa)`
                                                            : '#E5E7EB',
                                                        boxShadow: isAI ? `0 0 20px ${item.color}30` : 'none',
                                                    }}>
                                                    {isAI && (
                                                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-semibold text-gray-500">{b.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Methodology */}
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── RADIAL CHART (ENHANCED) ─── */}
                        {item.type === 'radial' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Survival Rate Comparison</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        +52% Improvement
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-8 sm:gap-12 py-4">
                                    {[
                                        { label: 'Traditional', score: 62, color: '#9CA3AF' },
                                        { label: 'LifeLink', score: 94, color: item.color },
                                    ].map((r, ri) => {
                                        const circ = 2 * Math.PI * 48;
                                        const off = circ * (1 - r.score / 100);
                                        return (
                                            <div key={r.label} className="flex flex-col items-center gap-2">
                                                <div className="relative w-28 h-28">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 108 108">
                                                        <circle cx="54" cy="54" r="48" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
                                                        <circle cx="54" cy="54" r="48" fill="none"
                                                            stroke={r.color}
                                                            strokeWidth="6" strokeLinecap="round"
                                                            strokeDasharray={circ}
                                                            strokeDashoffset={off}
                                                            style={{ transition: `stroke-dashoffset 2s ease-out ${ri * 0.3}s` }}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-2xl font-bold" style={{ color: r.color }}>{r.score}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">{r.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── NETWORK CHART (ENHANCED) ─── */}
                        {item.type === 'network' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Network Connectivity</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-circle-nodes text-[9px]"></i>
                                        286+ Hospitals
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-48">
                                    <svg className="w-full max-w-sm h-full" viewBox="0 0 300 160">
                                        {/* Legacy isolated nodes */}
                                        <circle cx="40" cy="40" r="10" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1.5"/>
                                        <circle cx="90" cy="40" r="10" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1.5"/>
                                        <circle cx="65" cy="100" r="10" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1.5"/>
                                        <line x1="36" y1="36" x2="44" y2="44" stroke="#EF4444" strokeWidth="2" opacity="0.5"/>
                                        <line x1="44" y1="36" x2="36" y2="44" stroke="#EF4444" strokeWidth="2" opacity="0.5"/>
                                        {/* Arrow */}
                                        <text x="115" y="70" fontSize="14" fill="#D1D5DB" textAnchor="start">→</text>
                                        {/* Connected LifeLink nodes */}
                                        {[
                                            { cx: 150, cy: 30 }, { cx: 195, cy: 25 }, { cx: 240, cy: 30 },
                                            { cx: 140, cy: 80 }, { cx: 185, cy: 75 }, { cx: 230, cy: 80 },
                                            { cx: 155, cy: 130 }, { cx: 200, cy: 125 }, { cx: 245, cy: 130 },
                                            { cx: 270, cy: 55 }, { cx: 275, cy: 105 },
                                        ].map((n, ni) => (
                                            <g key={ni}>
                                                <circle cx={n.cx} cy={n.cy} r="6"
                                                    fill={item.color}
                                                    opacity={0.7}
                                                    style={{ animation: `pulseGlowTravel ${1.5 + ni * 0.1}s ease-in-out infinite`, animationDelay: `${ni * 0.15}s` }}
                                                />
                                            </g>
                                        ))}
                                        {/* Connection lines */}
                                        {[
                                            [150,30,195,25],[195,25,240,30],[140,80,185,75],[185,75,230,80],
                                            [155,130,200,125],[200,125,245,130],[150,30,140,80],[195,25,185,75],
                                            [240,30,230,80],[140,80,155,130],[185,75,200,125],[230,80,245,130],
                                            [150,30,185,75],[185,75,230,80],[140,80,200,125],[240,30,245,130],
                                            [270,55,275,105],[230,80,270,55],[245,130,275,105],[195,25,270,55],
                                        ].map(([x1,y1,x2,y2], li) => (
                                            <line key={li} x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke={item.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.3"/>
                                        ))}
                                        <text x="40" y="18" fontSize="6" fill="#9CA3AF" textAnchor="middle">Isolated</text>
                                        <text x="210" y="16" fontSize="6" fill={item.color} textAnchor="middle" fontWeight="bold">Connected Network</text>
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── AI BARS CHART (ENHANCED) ─── */}
                        {item.type === 'ai-bars' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Model Accuracy Benchmarks</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-microchip text-[9px]"></i>
                                        Avg: 93.4%
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { l: 'ETA Optimization', v: 96.3 },
                                        { l: 'Donor Matching', v: 95.0 },
                                        { l: 'Triage Accuracy', v: 94.2 },
                                        { l: 'Health Risk', v: 93.5 },
                                        { l: 'Bed Allocation', v: 91.8 },
                                        { l: 'Staff Optimization', v: 90.4 },
                                    ].map((m, mi) => (
                                        <div key={m.l} className="flex items-center gap-3">
                                            <span className="text-[11px] font-semibold text-gray-500 w-28 text-right">{m.l}</span>
                                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{
                                                        width: `${m.v}%`,
                                                        background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                                                        transitionDelay: `${mi * 0.1}s`,
                                                    }}>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold w-12 text-right" style={{ color: item.color }}>{m.v}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── LINE CHART (ENHANCED) ─── */}
                        {item.type === 'line' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Growth Projection (3-Year)</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-chart-line text-[9px]"></i>
                                        12.4K by Y6
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-48">
                                    <svg className="w-full max-w-sm h-full" viewBox="0 0 300 150">
                                        <line x1="15" y1="30" x2="285" y2="30" stroke="#F3F4F6" strokeWidth="0.5"/>
                                        <line x1="15" y1="75" x2="285" y2="75" stroke="#F3F4F6" strokeWidth="0.5"/>
                                        <line x1="15" y1="120" x2="285" y2="120" stroke="#F3F4F6" strokeWidth="0.5"/>
                                        <path d="M15,120 L55,110 L95,90 L145,60 L195,40 L245,25 L285,18 L285,120 Z"
                                            fill={`${item.color}12`} stroke="none"/>
                                        <path d="M15,120 C55,110 75,90 95,90 C115,90 125,60 145,60 C165,60 175,40 195,40 C215,40 235,25 245,25 C265,25 275,18 285,18"
                                            fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray="500" strokeDashoffset="0"
                                            style={{ transition: 'stroke-dashoffset 2s ease-out' }}/>
                                        {/* Data points with labels */}
                                        {[
                                            { x: 15, y: 120, l: 'Y1', v: '2.4K' },
                                            { x: 55, y: 108, l: 'Q2', v: '3.8K' },
                                            { x: 95, y: 88, l: 'Y2', v: '6.8K' },
                                            { x: 145, y: 58, l: 'Y3', v: '8.5K' },
                                            { x: 195, y: 38, l: 'Y4', v: '10.2K' },
                                            { x: 245, y: 24, l: 'Y5', v: '11.8K' },
                                            { x: 285, y: 18, l: 'Y6', v: '12.4K' },
                                        ].map((pt, pi) => (
                                            <g key={pi}>
                                                <circle cx={pt.x} cy={pt.y} r="4" fill="white" stroke={item.color} strokeWidth="2"
                                                    style={{ animation: `pulseGlowTravel 2s ease-in-out infinite`, animationDelay: `${pi * 0.2}s` }}/>
                                                <text x={pt.x} y={pt.y - 12} fontSize="6" fill="#6B7280" textAnchor="middle" fontWeight="bold">{pt.v}</text>
                                                <text x={pt.x} y={140} fontSize="5" fill="#9CA3AF" textAnchor="middle">{pt.l}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── COUNTERS CHART (ENHANCED) ─── */}
                        {item.type === 'counters' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Data Scale Overview</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        40% QoQ Growth
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Records', value: '680K+', detail: '911 calls, EMRs, donor registries', icon: 'fa-database', color: '#7C3AED' },
                                        { label: 'Connected Hospitals', value: '286+', detail: 'Across 48 cities nationwide', icon: 'fa-hospital', color: '#059669' },
                                        { label: 'Cities Live', value: '48+', detail: 'Expanding to 200+ by 2027', icon: 'fa-city', color: '#2563EB' },
                                    ].map((c, ci) => (
                                        <div key={c.label} className="flex flex-col items-center p-4 rounded-xl text-center"
                                            style={{ background: `${c.color}08` }}>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2"
                                                style={{ background: `${c.color}15`, color: c.color }}>
                                                <i className={`fas ${c.icon}`}></i>
                                            </div>
                                            <span className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</span>
                                            <span className="text-[11px] text-gray-500 font-medium mt-1">{c.label}</span>
                                            <span className="text-[9px] text-gray-400 mt-0.5">{c.detail}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── RADAR CHART (ENHANCED) ─── */}
                        {item.type === 'radar' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Disaster Readiness Assessment</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        18× Faster
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-52">
                                    <svg className="w-full max-w-[280px] h-full" viewBox="0 0 280 160">
                                        {/* Pentagon grid */}
                                        <polygon points="140,130 80,70 105,20 175,20 200,70"
                                            fill="rgba(156,163,175,0.08)" stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 2"/>
                                        <polygon points="140,110 95,65 115,35 165,35 185,65"
                                            fill="rgba(156,163,175,0.05)" stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="2 2"/>
                                        {/* Traditional polygon (small, gray) */}
                                        <polygon points="140,115 110,75 125,50 155,50 170,75"
                                            fill="rgba(156,163,175,0.15)" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 2"/>
                                        {/* LifeLink polygon (large, colored) */}
                                        <polygon points="140,40 100,65 115,110 165,110 180,65"
                                            fill={`${item.color}15`}
                                            stroke={item.color} strokeWidth="2.5"
                                            style={{ opacity: 1 }}/>
                                        {/* Labels */}
                                        <text x="140" y="142" fontSize="6" fill="#9CA3AF" textAnchor="middle" fontWeight="bold">Prep Time</text>
                                        <text x="70" y="78" fontSize="6" fill="#9CA3AF" textAnchor="end">Response</text>
                                        <text x="98" y="16" fontSize="6" fill="#9CA3AF" textAnchor="middle">Accuracy</text>
                                        <text x="182" y="16" fontSize="6" fill="#9CA3AF" textAnchor="middle">Coverage</text>
                                        <text x="210" y="78" fontSize="6" fill="#9CA3AF" textAnchor="start">Recovery</text>
                                        {/* Legend */}
                                        <line x1="20" y1="8" x2="30" y2="8" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2"/>
                                        <text x="33" y="10" fontSize="5" fill="#9CA3AF">Traditional</text>
                                        <line x1="20" y1="16" x2="30" y2="16" stroke={item.color} strokeWidth="2"/>
                                        <text x="33" y="18" fontSize="5" fill={item.color}>LifeLink</text>
                                        {/* Score badges */}
                                        <text x="240" y="30" fontSize="6" fill={item.color} textAnchor="start" fontWeight="bold">Score: 95/100</text>
                                        <text x="240" y="42" fontSize="5" fill="#9CA3AF" textAnchor="start">Traditional: 28/100</text>
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── RINGS CHART (ENHANCED) ─── */}
                        {item.type === 'rings' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">System Reliability Metrics</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-shield-check text-[9px]"></i>
                                        Enterprise Grade
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-10 sm:gap-16 py-4">
                                    {[
                                        { label: 'System Uptime', value: '99.98%', ring: 99.98, color: '#059669', detail: '24/7/365 monitoring across 3 availability zones' },
                                        { label: 'User Satisfaction', value: '99.7%', ring: 99.7, color: '#2563EB', detail: 'Based on 8,400+ post-session NPS surveys' },
                                    ].map((c) => {
                                        const circ = 2 * Math.PI * 42;
                                        const off = circ * (1 - c.ring / 100);
                                        return (
                                            <div key={c.label} className="flex flex-col items-center gap-2">
                                                <div className="relative w-24 h-24">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                                                        <circle cx="48" cy="48" r="42" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
                                                        <circle cx="48" cy="48" r="42" fill="none"
                                                            stroke={c.color}
                                                            strokeWidth="6" strokeLinecap="round"
                                                            strokeDasharray={circ}
                                                            strokeDashoffset={off}
                                                            style={{ transition: 'stroke-dashoffset 2s ease-out' }}
                                                        />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: c.color }}>
                                                        {c.value}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600">{c.label}</span>
                                                <span className="text-[9px] text-gray-400 text-center max-w-[120px]">{c.detail}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── GROWTH CHART (ENHANCED) ─── */}
                        {item.type === 'growth' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Coverage Expansion Timeline</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        200+ by 2027
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-48">
                                    <svg className="w-full max-w-sm h-full" viewBox="0 0 300 150">
                                        <path d="M15,120 L50,110 L90,85 L140,55 L195,30 L240,18 L285,12 L285,120 Z"
                                            fill={`${item.color}12`} stroke="none"/>
                                        <path d="M15,120 C50,110 70,95 90,85 C110,75 120,55 140,55 C160,55 175,30 195,30 C215,30 230,18 240,18 C265,18 275,12 285,12"
                                            fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray="500" strokeDashoffset="0"
                                            style={{ transition: 'stroke-dashoffset 2.5s ease-out' }}/>
                                        {/* Milestone markers */}
                                        {[
                                            { x: 15, y: 120, l: 'Start', v: '1 city' },
                                            { x: 90, y: 82, l: '6 mo', v: '12 cities' },
                                            { x: 140, y: 52, l: '12 mo', v: '28 cities' },
                                            { x: 195, y: 28, l: '18 mo', v: '48 cities' },
                                            { x: 240, y: 16, l: '24 mo', v: '100 cities' },
                                            { x: 285, y: 10, l: '36 mo', v: '200 cities' },
                                        ].map((pt, pi) => (
                                            <g key={pi}>
                                                <circle cx={pt.x} cy={pt.y} r="4" fill="white" stroke={item.color} strokeWidth="2"/>
                                                <text x={pt.x} y={pt.y - 10} fontSize="6" fill="#6B7280" textAnchor="middle" fontWeight="bold">{pt.v}</text>
                                                <text x={pt.x} y={140} fontSize="5" fill="#9CA3AF" textAnchor="middle">{pt.l}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                        style={{
                            background: `linear-gradient(135deg, ${item.color || '#2563EB'}, ${(item.color || '#2563EB')}dd)`,
                            color: 'white',
                        }}
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};



// ─── EMERGENCY FEED ────────────────────────────────────

export default GraphDetailModal;
