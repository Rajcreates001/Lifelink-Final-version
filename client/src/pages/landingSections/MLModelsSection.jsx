import React, { useState } from 'react';
import { useScrollIn } from './hooks';
import { RESEARCH } from './constants';

const MLModelsSection = () => {
    const [entered, ref] = useScrollIn();
    const [modalItem, setModalItem] = useState(null);
    const mlModels = [
        { title: 'Emergency Triage Model', desc: '663K 911 call records — classifies emergency severity and dispatch priority', icon: 'fa-tower-cell', color: '#DC2626', metrics: '94.2%', model: 'XGBoost + LSTM Ensemble', trained: '663K 911 records', details: ['Built on real 911 emergency call transcripts from Pune & Bengaluru', 'LSTM networks analyze call urgency patterns in real-time', 'Severity classification (Critical/Moderate/Low) in under 200ms', 'A/B tested against human dispatchers with 94.2% agreement'] },
        { title: 'Hospital Resource Prediction', desc: '738 hospital profiles from Pune region — bed availability, resource allocation forecasts', icon: 'fa-hospital', color: '#059669', metrics: '91.8%', model: 'Prophet + Random Forest', trained: '738 hospital profiles', details: ['Aggregates bed occupancy data from 738 real hospital profiles', 'Prophet model captures weekly/seasonal demand patterns', 'Random Forest predicts resource shortages 72 hours in advance', 'Simulated surge scenarios validate allocation strategies'] },
        { title: 'Health Risk Assessment', desc: '8,764 patient health records — predicts heart attack risk and disease probability', icon: 'fa-heart-pulse', color: '#2563EB', metrics: '93.5%', model: 'Gradient Boosted Trees', trained: '8,764 patient records', details: ['Trained on anonymized patient records with 40+ clinical features', 'Identifies 23 key risk factors for cardiac events', 'Generates personalized risk scores with SHAP explanations', 'Validated against retrospective clinical outcomes data'] },
        { title: 'Outbreak Forecasting', desc: '2,000 disease outbreak records — predicts regional epidemic spread patterns', icon: 'fa-chart-line', color: '#F97316', metrics: '89.7%', model: 'Prophet + SIR Ensemble', trained: '2,000 outbreak records', details: ['Combines real outbreak logs with simulated epidemic spread models', 'SIR (Susceptible-Infected-Recovered) compartment modeling', 'Prophet captures seasonal and trend components separately', 'Generates 7-day advance warnings with 89.7% precision'] },
        { title: 'Bed Occupancy Prediction', desc: '1,000 patient stay records — forecasts hospital bed demand and length of stay', icon: 'fa-bed', color: '#7C3AED', metrics: '92.1%', model: 'LSTM Sequence Model', trained: '1,000 stay records', details: ['Sequence model trained on patient length-of-stay histories', 'Predicts daily bed demand per department with 92.1% accuracy', 'Simulated mass-casualty scenarios stress-test capacity planning', 'Real-time feed from hospital management systems for live updates'] },
        { title: 'Staff Allocation Model', desc: '2,000 shift allocation records — optimizes emergency department staffing', icon: 'fa-users', color: '#0891B2', metrics: '90.4%', model: 'Reinforcement Learning (Q-Learning)', trained: '2,000 shift records', details: ['Q-Learning agent trained on historical shift allocation data', 'Optimizes for minimum wait time and maximum coverage', 'Simulated high-demand scenarios test staffing resilience', 'Real-time adjustment based on current ER census and acuity'] },
        { title: 'Blood Donor Matching', desc: 'Donor availability dataset — AI matches donors to urgent requests in real-time', icon: 'fa-droplet', color: '#DC2626', metrics: '95.0%', model: 'KNN + Geospatial Ranker', trained: 'Donor availability dataset', details: ['Nearest-neighbor matching with blood-type compatibility rules', 'Geospatial ranking prioritizes donors within 15-minute radius', 'Real-time availability checks via SMS/app notification integration', 'Simulated emergency broadcasts test donor response rates'] },
        { title: 'Ambulance Routing & ETA', desc: 'Geospatial routing data — optimizes dispatch with live traffic integration', icon: 'fa-route', color: '#F97316', metrics: '96.3%', model: 'A* + Traffic Graph Network', trained: 'Geo-spatial routing data', details: ['A* pathfinding with real-time traffic layer from Google Maps', 'Historic traffic patterns from 6 months of Pune road data', 'Simulated emergency scenarios test route resilience under congestion', 'ETA optimized at 96.3% accuracy across 142 connected vehicles'] },
    ];
    return (
        <section ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Datasets & ML Models</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Trained on Real & Simulated Data</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">LifeLink's AI engine is powered by <strong className="text-gray-700">680,000+ records</strong> spanning emergency calls, hospital resources, patient health records, outbreak data, and geospatial routing — combining real-world datasets with simulated scenarios for robust AI training.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mlModels.map((m, i) => (
                        <div key={m.title}
                            onClick={() => setModalItem(m)}
                            className={`group landing-glass rounded-2xl p-5 hover:-translate-y-1 cursor-pointer transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.08}s` }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                    style={{ background: `${m.color}15`, color: m.color }}>
                                    <i className={`fas ${m.icon}`}></i>
                                </div>
                                <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md"
                                    style={{ background: `${m.color}12`, color: m.color }}>
                                    {m.metrics}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">{m.title}</h4>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{m.desc}</p>
                            {/* View details hint on hover */}
                            <div className="mt-3 pt-2 border-t border-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                                    <i className="fas fa-arrow-right text-[8px]"></i>
                                    View Details
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="ai" />
        </section>
    );
};

// ─── RESEARCH ──────────────────────────────────────

export default MLModelsSection;
