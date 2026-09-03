import React, { useState } from 'react';
import { useScrollIn } from './hooks';
import DetailModal from './DetailModal';

const SafetySection = () => {
    const [entered, ref] = useScrollIn(0.15);
    const [modalItem, setModalItem] = useState(null);
    const safetyPillars = [
        {
            title: 'End-to-End Encryption',
            label: 'End-to-End Encryption', value: 'AES-256', coverage: 100,
            desc: 'All data encrypted in transit & at rest', icon: 'fa-shield-halved', color: '#2563EB',
            subFeatures: [
                'AES-256 encryption for all data at rest — military-grade protection',
                'TLS 1.3 for all data in transit between clients, servers, and databases',
                'End-to-end encryption for sensitive patient health information (PHI)',
                'Hardware Security Module (HSM) integration for key management',
                'Zero-trust architecture with strict network segmentation',
            ],
            useCases: [
                'Patient health records in transit',
                'Real-time emergency communication',
                'Inter-hospital data sharing',
                'Government compliance reporting',
            ],
            benefits: [
                '100% of data encrypted — zero plaintext storage anywhere',
                'HIPAA-compliant encryption standards fully met',
                'Automated key rotation every 90 days without downtime',
                'Validated by 3rd-party penetration tests — 0 breaches since inception',
            ],
        },
        {
            title: 'Explainable AI',
            label: 'Explainable AI', value: '100% Traceable', coverage: 100,
            desc: 'Every AI decision logged with SHAP/LIME explanations', icon: 'fa-brain', color: '#7C3AED',
            subFeatures: [
                'SHAP (SHapley Additive exPlanations) for feature importance analysis',
                'LIME (Local Interpretable Model-agnostic Explanations) for individual predictions',
                'Every triage, dispatch, and resource allocation decision logged with full reasoning',
                'Audit trail includes model version, input features, confidence scores, and edge cases',
            ],
            useCases: [
                'Emergency triage severity scoring',
                'Hospital bed allocation recommendations',
                'Ambulance dispatch routing decisions',
                'Patient risk prediction and alerts',
            ],
            benefits: [
                '100% traceability on every AI decision — no black box',
                'Enables clinical staff to validate AI suggestions before acting',
                'Simplifies regulatory audits with complete decision trails',
                'Builds trust through transparent, understandable AI reasoning',
            ],
        },
        {
            title: 'Differential Privacy',
            label: 'Differential Privacy', value: 'ε=0.8', coverage: 92,
            desc: 'Statistical noise protects individual patient identities', icon: 'fa-eye-slash', color: '#059669',
            subFeatures: [
                'ε=0.8 privacy budget — strong privacy guarantee with minimal utility loss',
                'Laplace mechanism adds calibrated noise to all aggregate queries',
                'k-anonymity ensures each record is indistinguishable from at least k-1 others',
                'Privacy budget tracked and enforced per-user to prevent inference attacks',
            ],
            useCases: [
                'Population health analytics',
                'Disease outbreak pattern detection',
                'Hospital performance benchmarking',
                'Research dataset sharing',
            ],
            benefits: [
                'Individual patient identities mathematically guaranteed to remain hidden',
                'Enables secure data sharing for research without consent bottlenecks',
                'Complies with GDPR, HIPAA, and emerging AI privacy regulations',
                'Privacy budget resets ensure long-term usability without degradation',
            ],
        },
        {
            title: 'Blockchain Audit Trail',
            label: 'Blockchain Audit Trail', value: 'Immutable', coverage: 100,
            desc: 'Every emergency event recorded on tamper-proof ledger', icon: 'fa-link', color: '#F97316',
            subFeatures: [
                'Every emergency event hashed and anchored to a distributed ledger',
                'Tamper-evident chain: modifying one record invalidates all subsequent hashes',
                'Real-time event logging from SOS trigger through hospital handoff',
                'Cryptographic signatures verify authenticity of each event source',
            ],
            useCases: [
                'Emergency response timeline verification',
                'Regulatory compliance audits',
                'Insurance claim validation',
                'Legal evidence preservation',
            ],
            benefits: [
                'Immutable records prevent retrospective manipulation of emergency timelines',
                'Instant audit readiness — regulators can verify full event chains in seconds',
                'Eliminates disputes over response times, resource allocation, and handoffs',
                'Decentralized architecture ensures no single point of failure or manipulation',
            ],
        },
        {
            title: 'Federated Learning',
            label: 'Federated Learning', value: 'Local-Only', coverage: 88,
            desc: 'Model training happens on-device, data never leaves', icon: 'fa-microchip', color: '#0891B2',
            subFeatures: [
                'Model training occurs entirely on hospital premises — raw data never exported',
                'Only encrypted model gradient updates shared with central aggregation server',
                'Each hospital retains full data ownership and control at all times',
                'Models improve collectively without compromising institutional data sovereignty',
            ],
            useCases: [
                'Cross-hospital ML model training',
                'Distributed outbreak detection',
                'Privacy-preserving patient outcome prediction',
                'Multi-institution resource optimization',
            ],
            benefits: [
                'Hospitals never share raw patient data — zero data leakage risk',
                'Models trained on 10x more data than any single institution could provide',
                'Fully compliant with data localization laws and institutional policies',
                'Enables nationwide AI improvements while respecting local data governance',
            ],
        },
        {
            title: 'Compliance Ready',
            label: 'Compliance Ready', value: 'HIPAA+GDPR', coverage: 95,
            desc: 'Framework built for global healthcare regulations', icon: 'fa-file-shield', color: '#DC2626',
            subFeatures: [
                'HIPAA Privacy Rule: strict controls on PHI access, use, and disclosure',
                'GDPR: data subject rights, consent management, and cross-border safeguards',
                'SOC 2 Type II: annual independent audit of security, availability, and confidentiality',
                'Built-in Data Protection Impact Assessment (DPIA) workflow for new features',
            ],
            useCases: [
                'Government healthcare compliance mandates',
                'International health data transfers',
                'Hospital accreditation requirements',
                'Multi-jurisdiction emergency coordination',
            ],
            benefits: [
                'Simplified compliance for hospitals operating under multiple regulatory frameworks',
                'Pre-built compliance documentation reduces audit preparation by 70%',
                'Automated compliance checks flag potential violations before they occur',
                'Regular third-party audits ensure continuous alignment with evolving regulations',
            ],
        },
    ];
    const safetyMetrics = [
        { label: 'Security Score', value: 96, suffix: '%', color: '#059669', icon: 'fa-shield-check' },
        { label: 'Pen Tests Passed', value: 248, suffix: '+', color: '#2563EB', icon: 'fa-bug-slash' },
        { label: 'Data Breaches', value: 0, suffix: '', color: '#DC2626', icon: 'fa-ban' },
        { label: 'Audit Logs', value: '1.2M', suffix: '+', color: '#7C3AED', icon: 'fa-book' },
    ];
    return (
        <section ref={ref} className="relative z-10 py-12 sm:py-16 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-purple-400/5 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[25%] h-[25%] rounded-full bg-gradient-to-br from-emerald-300/5 via-teal-300/5 to-cyan-300/5 blur-[100px]"></div>
            </div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
                {/* Header */}
                <div className={`text-center mb-10 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-100 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-slow"></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Trust & Safety</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 font-display leading-tight">
                        Enterprise-Grade{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Safety & Security</span>
                    </h2>
                    <p className="mt-3 text-gray-500 max-w-2xl mx-auto text-[17px]">
                        Every life-saving decision is protected by multiple layers of security — from military-grade encryption to tamper-proof audit trails.
                    </p>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {safetyMetrics.map((m, i) => (
                        <div key={m.label}
                            className={`landing-glass rounded-xl p-4 text-center transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${0.2 + i * 0.08}s` }}>
                            <div className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center text-sm"
                                style={{ background: `${m.color}15`, color: m.color }}>
                                <i className={`fas ${m.icon}`}></i>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{m.value}{m.suffix}</p>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">{m.label}</p>
                        </div>
                    ))}
                </div>

                {/* Safety Pillars Grid with Progress Bars */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {safetyPillars.map((p, i) => (
                        <div key={p.label}
                            onClick={() => setModalItem(p)}
                            className={`group landing-glass rounded-xl p-4 sm:p-5 cursor-pointer hover:-translate-y-1 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${0.4 + i * 0.08}s` }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                                    style={{ background: `${p.color}15`, color: p.color }}>
                                    <i className={`fas ${p.icon}`}></i>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-gray-900 truncate">{p.label}</h3>
                                    <p className="text-[11px] font-semibold" style={{ color: p.color }}>{p.value}</p>
                                </div>
                                <span className="ml-auto text-[11px] font-bold tabular-nums" style={{ color: p.color }}>{p.coverage}%</span>
                            </div>
                            {/* Coverage bar */}
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full relative transition-all duration-1000 ease-out"
                                    style={{
                                        width: entered ? `${p.coverage}%` : '0%',
                                        background: `linear-gradient(90deg, ${p.color}, ${p.color}bb)`,
                                        transitionDelay: `${0.6 + i * 0.1}s`,
                                        boxShadow: `0 0 8px ${p.color}40`,
                                    }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{p.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Safety Detail Modal */}
                <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="feature" />

                {/* Bottom Safety Shield/Graph */}
                <div className={`mt-6 landing-glass rounded-xl p-4 sm:p-5 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: '1s' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Enterprise Security Compliance</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-semibold text-emerald-700 ml-auto">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Active Monitoring
                        </span>
                    </div>
                    {/* Compliance hex grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                            { std: 'AES-256', icon: 'fa-lock', color: '#2563EB' },
                            { std: 'TLS 1.3', icon: 'fa-shield', color: '#059669' },
                            { std: 'HIPAA', icon: 'fa-file-medical', color: '#7C3AED' },
                            { std: 'GDPR', icon: 'fa-file-contract', color: '#F97316' },
                            { std: 'SOC 2', icon: 'fa-clipboard-check', color: '#0891B2' },
                            { std: 'ISO 27001', icon: 'fa-certificate', color: '#DC2626' },
                        ].map((s) => (
                            <div key={s.std} className="flex flex-col items-center p-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors duration-200">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] mb-1"
                                    style={{ background: `${s.color}12`, color: s.color }}>
                                    <i className={`fas ${s.icon}`}></i>
                                </div>
                                <span className="text-[9px] font-semibold text-gray-600">{s.std}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── LIVE IMPACT BAR ─────────────────────────────────────

export default SafetySection;
