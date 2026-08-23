import React from 'react';

const Partners = () => (
    <section className="py-16 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Deployed Across Every Frontier</p>
            <p className="text-center text-sm text-gray-400 mb-8 max-w-lg mx-auto">From bustling metros to remote villages — LifeLink connects every corner of the healthcare ecosystem.</p>
            <div className="relative overflow-hidden">
                <div className="flex animate-logo-wall gap-16 items-center">
                    {[...Array(2)].map((_, outer) => (
                        <React.Fragment key={outer}>
                            {[
                                { icon: 'fa-city', label: 'Metropolitan Hubs', color: '#2563EB' },
                                { icon: 'fa-house-chimney-medical', label: 'Rural Healthcare', color: '#059669' },
                                { icon: 'fa-route', label: 'Emergency Corridors', color: '#F97316' },
                                { icon: 'fa-landmark', label: 'Government Operations', color: '#7C3AED' },
                                { icon: 'fa-hospital', label: 'Hospital Chains', color: '#DC2626' },
                                { icon: 'fa-people-arrows', label: 'Community Networks', color: '#0891B2' },
                                { icon: 'fa-microchip', label: 'Smart City Grids', color: '#2563EB' },
                                { icon: 'fa-tents', label: 'Disaster Response', color: '#F97316' },
                            ].map((partner) => (
                                <div key={partner.label + outer} className="flex items-center gap-3 shrink-0 group">
                                    <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
                                        style={{ color: partner.color }}>
                                        <i className={`fas ${partner.icon} text-lg`}></i>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-500 whitespace-nowrap transition-colors duration-300 group-hover:text-gray-700">{partner.label}</span>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

// ─── CTA SECTION ─────────────────────────────────────

export default Partners;
