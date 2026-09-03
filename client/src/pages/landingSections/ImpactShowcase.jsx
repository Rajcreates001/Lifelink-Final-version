import React, { useState } from 'react';
import { useScrollIn } from './hooks';
import DetailModal from './DetailModal';

const ImpactShowcase = () => {
    const [entered, ref] = useScrollIn(0.1);
    const [modalItem, setModalItem] = useState(null);
    const impacts = [
        {
            title: 'Response Time', metric: 'Response Time',
            traditional: '40-60 min', lifelink: '< 4 min', improvement: '93% Faster', bar: 93,
            icon: 'fa-truck-medical', color: '#2563EB',
            desc: 'AI-optimized ambulance routing reduces emergency response from nearly an hour to under 4 minutes.',
            subFeatures: [
                'Real-time traffic-aware routing using live data feeds and historical patterns',
                'Nearest-ambulance dispatch algorithm minimizes travel distance and time',
                'Dynamic rerouting adapts to road closures, congestion, and weather conditions',
                'Priority corridor coordination with traffic signal preemption for emergency vehicles',
            ],
            useCases: [
                'Urban emergency response',
                'Rural ambulance dispatch',
                'Mass casualty triage transport',
                'Inter-facility patient transfer',
            ],
            benefits: [
                '93% faster response than traditional dispatch systems',
                'Average response time reduced from 45 min to < 4 min',
                'Real-time traffic rerouting saves critical minutes in golden hour',
                'Multi-agency coordination ensures closest available unit is always dispatched',
            ],
        },
        {
            title: 'Bed Allocation', metric: 'Bed Allocation',
            traditional: '4-8 hours', lifelink: '12 min', improvement: '97% Faster', bar: 97,
            icon: 'fa-bed', color: '#059669',
            desc: 'AI-powered bed matching assigns patients to the right hospital bed in minutes, not hours.',
            subFeatures: [
                'Real-time bed availability monitoring across all connected hospitals',
                'AI matching algorithm considers patient condition, specialist availability, and distance',
                'Automated discharge prediction frees beds proactively based on recovery forecasts',
                'Cross-hospital mutual aid network enables overflow routing during surges',
            ],
            useCases: [
                'Emergency department intake',
                'ICU capacity management',
                'Post-surgery bed planning',
                'Disaster surge overflow handling',
            ],
            benefits: [
                '97% faster bed allocation — from hours to 12 minutes',
                'Reduces ER boarding time and alleviates hallway crowding',
                'Optimizes bed utilization across entire hospital networks',
                'Mutual aid prevents patient diversion during peak demand',
            ],
        },
        {
            title: 'Patient Survival', metric: 'Patient Survival',
            traditional: '62%', lifelink: '94%', improvement: '+52% Higher', bar: 52,
            icon: 'fa-heart-pulse', color: '#DC2626',
            desc: 'AI-powered triage and rapid coordination dramatically improve patient survival outcomes.',
            subFeatures: [
                'AI triage classification with 94.2% accuracy using voice and symptom analysis',
                'Automated severity scoring ensures critical patients get priority resources',
                'Real-time vitals monitoring with anomaly detection for early intervention',
                'End-to-end coordination from SOS trigger through hospital handoff',
            ],
            useCases: [
                'Cardiac emergency response',
                'Trauma accident care',
                'Stroke rapid treatment',
                'Mass casualty triage',
            ],
            benefits: [
                '52% higher survival rate compared to traditional emergency response systems',
                'Every minute saved = 10% higher survival in cardiac arrest cases',
                'AI triage ensures critical patients are never overlooked in chaotic situations',
                'Continuous monitoring from ambulance to ER eliminates information gaps',
            ],
        },
        {
            title: 'Disaster Readiness', metric: 'Disaster Readiness',
            traditional: '48-72 hours', lifelink: '< 4 hours', improvement: '94% Faster', bar: 94,
            icon: 'fa-shield-halved', color: '#7C3AED',
            desc: 'AI simulation and resource pre-positioning slashes disaster response from days to hours.',
            subFeatures: [
                'AI-driven disaster simulation models run thousands of scenarios for preparedness planning',
                'Resource pre-positioning algorithms recommend optimal stockpiles and staging areas',
                'Multi-agency command center provides unified situational awareness',
                'Automated evacuation routing and shelter assignment during active disasters',
            ],
            useCases: [
                'Earthquake response coordination',
                'Flood evacuation management',
                'Pandemic resource allocation',
                'Terrorist incident response',
            ],
            benefits: [
                '94% faster disaster readiness — from 72 hours to under 4 hours',
                'Simulation-based planning identifies weaknesses before disaster strikes',
                'Pre-positioned resources ensure supplies reach affected areas immediately',
                'Unified command eliminates multi-agency communication delays',
            ],
        },
        {
            title: 'Hospital Coverage', metric: 'Hospital Coverage',
            traditional: 'Isolated', lifelink: 'Unified Network', improvement: '286+ Connected', bar: 85,
            icon: 'fa-hospital', color: '#F97316',
            desc: 'Connecting 286+ hospitals into a unified emergency response network across 48+ cities.',
            subFeatures: [
                'Inter-hospital communication platform for real-time coordination and patient transfers',
                'Unified bed, resource, and specialist availability dashboard across all connected hospitals',
                'Mutual aid agreements enable seamless patient overflow and resource sharing',
                'Standardized emergency protocols ensure consistent care across the network',
            ],
            useCases: [
                'Regional hospital network coordination',
                'Specialist referral and patient transfer',
                'Cross-city emergency resource sharing',
                'Telemedicine consultation bridging',
            ],
            benefits: [
                '286+ hospitals connected into one unified emergency response network',
                'Isolated hospitals transformed into collaborative care ecosystem',
                'Patients automatically routed to the best-equipped facility, not just the nearest',
                'Resource sharing eliminates redundant equipment and specialist shortages',
            ],
        },
        {
            title: 'Cost Efficiency', metric: 'Cost Efficiency',
            traditional: 'High overhead', lifelink: 'AI Optimized', improvement: '62% Savings', bar: 62,
            icon: 'fa-coins', color: '#0891B2',
            desc: 'AI-driven resource optimization reduces operational costs while improving care quality.',
            subFeatures: [
                'Predictive resource allocation reduces waste in staffing, supplies, and equipment',
                'Automated inventory management prevents stockouts and overstocking',
                'Smart scheduling optimizes staff shifts based on predicted patient inflow',
                'Reduced patient transfer costs through optimized inter-hospital routing',
            ],
            useCases: [
                'Hospital operational budgeting',
                'Supply chain optimization',
                'Staff scheduling and payroll',
                'Equipment utilization tracking',
            ],
            benefits: [
                '62% reduction in operational costs through AI-driven optimization',
                'Eliminates waste from overstocking, understaffing, and redundant equipment',
                'Predictive analytics prevents costly emergency supply chain disruptions',
                'ROI on LifeLink deployment typically achieved within 6-8 months',
            ],
        },
    ];
    return (                        <section id="impact-showcase" ref={ref} className="py-20 sm:py-28 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-purple-400/5 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-[25%] h-[25%] rounded-full bg-gradient-to-br from-emerald-300/5 via-teal-300/5 to-cyan-300/5 blur-[100px]"></div>
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            </div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Quantified Impact</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">The LifeLink Difference</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">
                        From minutes to seconds. From isolated to unified. <strong className="text-gray-700">LifeLink transforms emergency response across every dimension</strong> — saving lives, cutting costs, and building resilient communities.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {impacts.map((item, i) => {
                        return (
                            <div key={item.metric}
                                onClick={() => setModalItem(item)}
                                className={`group landing-glass rounded-2xl p-5 sm:p-6 cursor-pointer hover:-translate-y-1 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                                style={{ transitionDelay: `${i * 0.1}s` }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                                            style={{ background: `${item.color}15`, color: item.color }}>
                                            <i className={`fas ${item.icon}`}></i>
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900">{item.metric}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        {item.improvement}
                                    </span>
                                </div>
                                {/* 3D Comparison Bars */}
                                <div className="mt-4 space-y-3">
                                    {/* Traditional */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-medium text-gray-400 w-7">Old</span>
                                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-300 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: entered ? '100%' : '0%', transitionDelay: `${0.3 + i * 0.1}s` }}>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium w-24 text-right leading-tight">{item.traditional}</span>
                                    </div>
                                    {/* LifeLink */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 w-[72px] shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full animate-impact-pulse" style={{ background: item.color, boxShadow: `0 0 4px ${item.color}60` }}></span>
                                            <span className="text-[8px] font-bold" style={{ color: item.color }}>LifeLink</span>
                                        </div>                                        <div className="flex-1 h-[22px] bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full rounded-full relative transition-all duration-1000 ease-out"
                                                style={{
                                                    width: entered ? `${item.bar}%` : '0%',
                                                    background: `linear-gradient(90deg, ${item.color}, ${item.color}bb)`,
                                                    transitionDelay: `${0.5 + i * 0.1}s`,
                                                    boxShadow: `0 0 16px ${item.color}40`,
                                                    animation: entered ? 'impactPulse 2s ease-in-out infinite' : 'none',
                                                    animationDelay: `${0.7 + i * 0.1}s`,
                                                }}>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                            </div>
                                        </div>                                            <span className="text-[12px] font-bold w-24 text-right tabular-nums leading-tight" style={{ color: item.color }}>{item.lifelink}</span>
                                    </div>
                                </div>

                                {/* Impact ring indicator */}
                                <div className={`mt-3 pt-3 border-t border-gray-100 flex items-center justify-between transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}
                                    style={{ transitionDelay: `${0.9 + i * 0.1}s` }}>
                                    <div className="flex items-center gap-1.5">
                                        <div className="impact-ring w-4 h-4"></div>
                                        <span className="text-[9px] text-gray-400">Real-time benchmark</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[9px] font-semibold text-emerald-600">Live</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Impact Detail Modal */}
                <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="feature" />
            </div>
        </section>
    );
};

// ─── DETAIL MODAL ────────────────────────────────────────

export default ImpactShowcase;
