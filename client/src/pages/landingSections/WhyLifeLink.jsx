import React, { useState } from 'react';
import { useScrollIn } from './hooks';

const WhyLifeLink = () => {
    const [entered, ref] = useScrollIn();
    const [modalItem, setModalItem] = useState(null);
    const comparisons = [
        {
            title: 'Dispatch Efficiency', dimension: 'Dispatch Efficiency',
            traditional: 18, lifelink: 94,
            traditionalLabel: 'Manual phone dispatch', lifelinkLabel: 'AI-powered automated dispatch',
            icon: 'fa-truck-medical', color: '#2563EB',
            desc: 'AI-powered dispatch routes the nearest ambulance instantly, slashing coordination time by 80%.',
            subFeatures: [
                'Automated incident classification and severity assessment from incoming emergency calls',
                'Nearest-ambulance algorithm factors in real-time traffic, road conditions, and vehicle status',
                'Multi-vehicle coordination dispatches optimal mix of ALS/BLS units for each scenario',
                'Real-time status updates to hospitals prepare ER teams before patient arrival',
            ],
            useCases: [
                'City-wide emergency call routing',
                'Multi-casualty incident coordination',
                'Rural area ambulance coverage',
                'Inter-facility patient transfers',
            ],
            benefits: [
                '94/100 dispatch efficiency score vs 18/100 for manual systems',
                'Eliminates phone tag and miscommunication delays from manual dispatching',
                'Average dispatch decision time reduced from 5 minutes to under 15 seconds',
                'Scalable to handle 10x surge capacity during mass casualty events',
            ],
        },
        {
            title: 'Resource Visibility', dimension: 'Resource Visibility',
            traditional: 22, lifelink: 97,
            traditionalLabel: 'Static bed availability', lifelinkLabel: 'Real-time resource tracking',
            icon: 'fa-bed', color: '#059669',
            desc: 'Real-time tracking of beds, equipment, and staff across 286+ connected hospitals.',
            subFeatures: [
                'Live bed availability dashboard updated every 30 seconds across all connected hospitals',
                'Equipment tracking includes ventilators, defibrillators, and surgical supplies',
                'Staff availability monitoring tracks specialists on-call and shift coverage',
                'Predictive analytics forecasts resource demand 24-48 hours in advance',
            ],
            useCases: [
                'Emergency department capacity management',
                'ICU bed allocation during surges',
                'Equipment sharing between hospitals',
                'Staff redeployment optimization',
            ],
            benefits: [
                '97/100 resource visibility score vs 22/100 for static systems',
                'Eliminates the "calling around" problem — instant visibility into all hospital resources',
                'Reduces patient diversion by 76% through real-time capacity awareness',
                'Enables proactive resource planning instead of reactive crisis management',
            ],
        },
        {
            title: 'Coordination Speed', dimension: 'Coordination Speed',
            traditional: 15, lifelink: 92,
            traditionalLabel: 'Paper-based coordination', lifelinkLabel: 'Live multi-agency synchronization',
            icon: 'fa-users', color: '#7C3AED',
            desc: 'Live multi-agency synchronization replaces slow, error-prone manual coordination workflows.',
            subFeatures: [
                'Unified communication platform connecting dispatchers, hospitals, and ambulance crews',
                'Real-time status updates eliminate the need for phone-based status checks',
                'Shared incident timeline provides complete situational awareness to all stakeholders',
                'Automated handoff protocols ensure seamless transitions between response phases',
            ],
            useCases: [
                'Multi-agency disaster response',
                'Hospital handoff coordination',
                'Police-fire-EMS joint operations',
                'Cross-jurisdiction emergency management',
            ],
            benefits: [
                '92/100 coordination speed score vs 15/100 for paper-based systems',
                'Eliminates information silos between agencies during critical incidents',
                'Reduces average coordination time from 10+ minutes to under 30 seconds',
                'Complete audit trail of all coordination actions for after-action review',
            ],
        },
        {
            title: 'Response Readiness', dimension: 'Response Readiness',
            traditional: 28, lifelink: 95,
            traditionalLabel: 'Reactive emergency response', lifelinkLabel: 'Predictive AI-driven prevention',
            icon: 'fa-shield-halved', color: '#DC2626',
            desc: 'Predictive AI and simulation-driven planning shift emergency response from reactive to proactive.',
            subFeatures: [
                'AI models predict emergency hotspots 48 hours in advance using historical and real-time data',
                'Resource pre-positioning algorithms recommend optimal staging locations for ambulances',
                'Mass casualty simulations run thousands of scenarios to identify preparedness gaps',
                'Early warning system alerts authorities to emerging threats before they escalate',
            ],
            useCases: [
                'Pre-disaster resource staging',
                'Peak demand preparation (festivals, events)',
                'Disease outbreak response planning',
                'Seasonal emergency pattern management',
            ],
            benefits: [
                '95/100 response readiness score vs 28/100 for reactive systems',
                'Proactive resource placement reduces response time by 40% during critical events',
                'Simulation-based training identifies weaknesses without real-world consequences',
                'Predictive alerts give authorities 24-48 hour head start on emerging emergencies',
            ],
        },
        {
            title: 'Data Integration', dimension: 'Data Integration',
            traditional: 12, lifelink: 96,
            traditionalLabel: 'Disconnected data silos', lifelinkLabel: 'Unified healthcare ecosystem',
            icon: 'fa-diagram-project', color: '#F97316',
            desc: 'Unified healthcare ecosystem connects fragmented data sources into a single operational picture.',
            subFeatures: [
                'FHIR-compliant data exchange connects hospital EMRs, ambulance systems, and government databases',
                'Real-time data synchronization ensures all stakeholders see the same operational picture',
                'Historical data warehouse enables trend analysis, reporting, and ML model training',
                'API-first architecture allows seamless integration with existing healthcare IT systems',
            ],
            useCases: [
                'Cross-hospital data sharing',
                'Government health reporting',
                'Emergency response analytics',
                'Population health management',
            ],
            benefits: [
                '96/100 data integration score vs 12/100 for disconnected silos',
                'Eliminates manual data entry and reconciliation between different systems',
                'Single source of truth for all emergency response data across the ecosystem',
                'Unified data enables AI models that are 10x more accurate than silo-trained models',
            ],
        },
    ];
    return (
        <section ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Performance Comparison</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Why LifeLink?</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">Quantified performance across <strong className="text-gray-700">5 critical dimensions</strong> — LifeLink vs Traditional healthcare systems. Each metric scored out of 100.</p>
                </div>
                <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comparisons.map((c, i) => {
                        const gap = c.lifelink - c.traditional;
                        return (
                            <div key={c.dimension}
                                onClick={() => setModalItem(c)}
                                className={`group landing-glass rounded-2xl p-5 sm:p-6 cursor-pointer hover:-translate-y-1 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                style={{ transitionDelay: `${i * 0.12}s` }}>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                            style={{ background: `${c.color}15`, color: c.color }}>
                                            <i className={`fas ${c.icon}`}></i>
                                        </div>
                                        <h3 className="text-[13px] font-bold text-gray-900">{c.dimension}</h3>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                        style={{ background: `${c.color}12`, color: c.color }}>
                                        <i className="fas fa-arrow-trend-up text-[8px]"></i>
                                        +{gap}%
                                    </span>
                                </div>
                                {/* Traditional bar */}
                                <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                                            <i className="fas fa-xmark text-[8px] text-red-300"></i>
                                            Traditional
                                        </span>
                                        <span className="text-[10px] font-semibold text-gray-400 tabular-nums">{c.traditionalLabel}</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-300 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: entered ? `${c.traditional}%` : '0%', transitionDelay: `${0.3 + i * 0.12}s` }}>
                                        </div>
                                    </div>
                                </div>
                                {/* LifeLink bar */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: c.color }}>
                                            <i className="fas fa-circle-check text-[8px]"></i>
                                            LifeLink
                                        </span>
                                        <span className="text-[10px] font-bold tabular-nums" style={{ color: c.color }}>{c.lifelinkLabel}</span>
                                    </div>
                                    <div className="h-[14px] bg-gray-50 rounded-full overflow-hidden shadow-inner relative">
                                        <div className="h-full rounded-full relative transition-all duration-1000 ease-out"
                                            style={{
                                                width: entered ? `${c.lifelink}%` : '0%',
                                                background: `linear-gradient(90deg, ${c.color}, ${c.color}bb)`,
                                                transitionDelay: `${0.5 + i * 0.12}s`,
                                                boxShadow: `0 0 10px ${c.color}30`,
                                            }}>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                        </div>
                                    </div>
                                </div>
                                {/* Score circle */}
                                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative w-6 h-6">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" fill="none" stroke="#E5E7EB" strokeWidth="2.5"/>
                                                <circle cx="12" cy="12" r="10" fill="none"
                                                    stroke={c.color}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 10}`}
                                                    strokeDashoffset={entered ? `${2 * Math.PI * 10 * (1 - c.lifelink / 100)}` : `${2 * Math.PI * 10}`}
                                                    style={{ transition: `stroke-dashoffset 1.2s ease-out ${0.7 + i * 0.12}s` }}
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold" style={{ color: c.color }}>
                                                {c.lifelink}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-gray-400">Score</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[8px] font-medium text-emerald-600">Benchmark</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Why LifeLink Detail Modal */}
                <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="feature" />
            </div>
        </section>
    );
};

// ─── ML MODELS & DATASETS ────────────────────────────

export default WhyLifeLink;
