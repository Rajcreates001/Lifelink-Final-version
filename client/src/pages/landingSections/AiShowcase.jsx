import React, { useState } from 'react';
import { useScrollIn } from './hooks';
import { AI_CAPABILITIES } from './constants';

const AiShowcase = () => {
    const [entered, ref] = useScrollIn();
    const [modalItem, setModalItem] = useState(null);
    return (
        <section id="ai-engine" ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Artificial Intelligence</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">LifeLink AI Engine</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Powered by <strong className="text-gray-700">12 specialized AI models</strong> working in concert. Click any capability to see how it works.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AI_CAPABILITIES.map((cap, i) => (
                        <div key={cap.title}
                            onClick={() => setModalItem(cap)}
                            className={`group landing-glass rounded-2xl p-5 flex items-start gap-4 hover:-translate-y-1 cursor-pointer transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.08}s` }}>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                                style={{ background: `${cap.color}15`, color: cap.color }}>
                                <i className={`fas ${cap.icon}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-bold text-gray-900 text-sm">{cap.title}</h4>
                                    {cap.metrics && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                            style={{ background: `${cap.color}12`, color: cap.color }}>
                                            {cap.metrics}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cap.desc}</p>
                                {/* Detail badges */}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {cap.details.slice(0, 2).map((d) => (
                                        <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{d}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="ai" />
        </section>
    );
};

// ─── ANIMATED PROCESS FLOW ─────────────────────────────

export default AiShowcase;
