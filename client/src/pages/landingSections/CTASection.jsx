import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollIn } from './hooks';

const CTASection = () => {
    const [entered, ref] = useScrollIn();
    const navigate = useNavigate();
    return (
        <section ref={ref} className="py-24 sm:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"></div>
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[80%] rounded-full bg-white/5 blur-[100px]"></div>
            <div className="absolute bottom-[-30%] right-[-10%] w-[50%] h-[80%] rounded-full bg-white/5 blur-[100px]"></div>
            <div className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center relative z-10 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
                    <i className="fas fa-heart text-white/80 text-xs"></i>
                    <span className="text-[11px] font-semibold text-white/80">Completely Free — Because Lives Don't Come at a Cost</span>
                </div>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-[1.1]">Built for Impact, Not for Profit</h2>
                <p className="text-lg sm:text-xl text-blue-100 mt-5 max-w-2xl mx-auto leading-relaxed">LifeLink is <strong className="text-white">100% free</strong> for every hospital, ambulance service, government authority, and citizen. No hidden fees, no premium tiers, no paywalls. <strong className="text-white">When seconds save lives — charging for access isn't just wrong, it's unforgivable.</strong></p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button onClick={() => navigate('/signup')}
                        className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-[15px] shadow-2xl hover:shadow-3xl hover:-translate-y-0.5 transition-all duration-200">
                        <i className="fas fa-rocket text-blue-600"></i>
                        <span>Launch LifeLink</span>
                        <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                    </button>
                    <button onClick={() => document.getElementById('ai-engine')?.scrollIntoView({ behavior: 'smooth' })}
                        className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-200">
                        <i className="fas fa-brain"></i>
                        <span>Explore AI Engine</span>
                    </button>
                    <button onClick={() => document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' })}
                        className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-200">
                        <i className="fas fa-flask"></i>
                        <span>View Research</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

// ─── FOOTER ──────────────────────────────────────────

export default CTASection;
