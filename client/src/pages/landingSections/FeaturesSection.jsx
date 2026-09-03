import React, { useState } from 'react';
import { useScrollIn } from './hooks';
import { FEATURES } from './constants';
import DetailModal from './DetailModal';

const FeaturesSection = () => {
    const [entered, ref] = useScrollIn();
    const [modalItem, setModalItem] = useState(null);
    return (
        <section id="features" ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Core Capabilities</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Intelligent Healthcare Platform</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Access <strong className="text-gray-700">12 powerful capabilities</strong> designed to transform every aspect of emergency response. Click any card to explore.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map((f, i) => (
                        <div key={f.title}
                            onClick={() => setModalItem(f)}
                            className={`group landing-glass rounded-2xl p-6 sm:p-7 hover:-translate-y-2 cursor-pointer transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                                    style={{ background: f.bg, color: f.color }}>
                                    <i className={`fas ${f.icon}`}></i>
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                                    View Details <i className="fas fa-arrow-right text-[8px]"></i>
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">{f.desc}</p>
                            {/* Mini feature badges */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {f.subFeatures.slice(0, 3).map((sf) => (
                                    <span key={sf} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                        {sf}
                                    </span>
                                ))}
                                {f.subFeatures.length > 3 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                                        +{f.subFeatures.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="feature" />
        </section>
    );
};

// ─── PORTAL SECTION ─────────────────────────────────────

export default FeaturesSection;
