import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollIn } from './hooks';
import { ROLES } from './constants';

const PortalSection = () => {
    const [entered, ref] = useScrollIn();
    const navigate = useNavigate();
    const [hoveredPortal, setHoveredPortal] = useState(null);
    const PORTAL_DETAILS = {
        public: { features: ['SOS Emergency', 'Health Check', 'Blood Donor Match', 'AI Assistant'], stats: '1M+ Active Users' },
        hospital: { features: ['Emergency Intake', 'Bed Management', 'Staff Coordination', 'Patient Analytics'], stats: '286 Connected' },
        ambulance: { features: ['Live Tracking', 'Smart Dispatch', 'ETA Optimization', 'Route Planning'], stats: '142 Vehicles' },
        government: { features: ['City Analytics', 'Policy Dashboard', 'Resource Oversight', 'Emergency Maps'], stats: '48 Authorities' },
    };
    return (
        <section id="portals" ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Portal Access</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Choose Your Workspace</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Dedicated experiences for every stakeholder in the healthcare ecosystem.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {Object.entries(ROLES).map(([key, role], i) => {
                        const det = PORTAL_DETAILS[key];
                        const isHovered = hoveredPortal === key;
                        return (
                            <div key={key}
                                onMouseEnter={() => setHoveredPortal(key)}
                                onMouseLeave={() => setHoveredPortal(null)}
                                onClick={() => navigate('/signup')}
                                className="group relative overflow-hidden rounded-2xl p-6 sm:p-7 cursor-pointer transition-all duration-500"
                                style={{
                                    transitionDelay: `${i * 0.12}s`,
                                    opacity: entered ? 1 : 0,
                                    transform: entered ? 'translateY(0)' : 'translateY(40px)',
                                    background: isHovered ? `linear-gradient(135deg, ${role.hex}15, ${role.hex}08)` : 'rgba(255,255,255,0.75)',
                                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                                    border: `1px solid ${isHovered ? role.hex + '44' : 'rgba(255,255,255,0.3)'}`,
                                    boxShadow: isHovered ? `0 12px 40px ${role.hex}20` : '0 4px 20px rgba(0,0,0,0.04)',
                                }}>
                                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-opacity duration-300"
                                    style={{ background: `linear-gradient(90deg, ${role.hex}, ${role.hex}88)`, opacity: isHovered ? 1 : 0.3 }} />
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 transition-all duration-300 ${isHovered ? 'scale-110 -rotate-3' : ''}`}
                                    style={{ background: `${role.hex}15`, color: role.hex }}>
                                    <i className={`fas ${role.icon}`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{role.label} Portal</h3>
                                <div className="mt-3 space-y-1.5">
                                    {det.features.map((feat) => (
                                        <div key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                                            <i className="fas fa-circle-check text-[10px]" style={{ color: role.hex }}></i>
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold" style={{ color: role.hex }}>{det.stats}</span>
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}
                                        style={{ color: role.hex }}>
                                        Open Workspace <i className="fas fa-arrow-right text-[10px]"></i>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </div>
        </section>
    );
};

// ─── AI SHOWCASE ──────────────────────────────────────

export default PortalSection;
