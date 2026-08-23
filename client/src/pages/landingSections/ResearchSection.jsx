import React, { useState } from 'react';
import { useScrollIn } from './hooks';
import { RESEARCH } from './constants';
import ResearchPaperModal from '../../components/ResearchPaperModal';

const ResearchSection = () => {
    const [entered, ref] = useScrollIn();
    const [modalItem, setModalItem] = useState(null);
    const researchData = RESEARCH.map((item, i) => ({ ...item }));
    return (
        <section ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Research & Recognition</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Driven by Science</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Peer-reviewed research, validated benchmarks, and industry recognition.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
                    {researchData.map((item, i) => (
                        <div key={item.title}
                            onClick={() => setModalItem(item)}
                            className={`group landing-glass rounded-2xl p-6 text-center cursor-pointer hover:-translate-y-2 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                                style={{ background: `${item.color || '#2563EB'}15`, color: item.color || '#2563EB' }}>
                                <i className={`fas ${item.icon}`}></i>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{item.desc}</p>
                            {item.badge && (
                                <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                                    style={{ background: `${item.badgeColor}12`, color: item.badgeColor }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.badgeColor }}></span>
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Research Detail Modal */}
                <ResearchPaperModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} />
            </div>
        </section>
    );
};

// ─── APP STRENGTHS ──────────────────────────────────

export default ResearchSection;
