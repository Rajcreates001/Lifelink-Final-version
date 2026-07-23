"""Write the complete LandingPage.jsx file"""
import os

content = r"""import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Hook: Animated Counter ─────────────────────────────
function useCountUp(target, duration = 2000, startOnView = true) {
    const [count, setCount] = useState(0);
    const [visible, setVisible] = useState(!startOnView);
    const ref = useRef(null);

    useEffect(() => {
        if (!startOnView) { setVisible(true); return; }
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.3 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [startOnView]);

    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const step = Math.ceil(target / (duration / 16));
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 16);
        return () => clearInterval(timer);
    }, [visible, target, duration]);

    return [count, ref];
}

// ─── Hook: Scroll Entrance ────────────────────────────
function useScrollIn(threshold = 0.15) {
    const [entered, setEntered] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setEntered(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [entered, ref];
}

// ─── Data ──────────────────────────────────────────────
const ROLES = {
    public: { icon: 'fa-user', label: 'Public', hex: '#2563EB', color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    hospital: { icon: 'fa-hospital', label: 'Hospital', hex: '#059669', color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    ambulance: { icon: 'fa-ambulance', label: 'Ambulance', hex: '#DC2626', color: 'red', gradient: 'from-red-500 to-red-600' },
    government: { icon: 'fa-landmark', label: 'Government', hex: '#7C3AED', color: 'purple', gradient: 'from-purple-500 to-purple-600' },
};

const EMERGENCY_FEED = [
    { msg: 'Ambulance dispatched to City Hospital, Mangalore', time: '2s ago' },
    { msg: 'Blood donor matched in Bengaluru - O+ urgent', time: '12s ago' },
    { msg: '12 new beds available at Fortis, Mumbai', time: '28s ago' },
    { msg: 'AI triage: 3 critical cases detected in Chennai', time: '45s ago' },
    { msg: 'Emergency request received from Indiranagar, Bengaluru', time: '1m ago' },
    { msg: 'Hospital capacity updated: 84% statewide', time: '1.2m ago' },
    { msg: 'Ambulance ETA to Government Hospital: 4 min', time: '1.5m ago' },
    { msg: 'AI predicting outbreak risk in coastal regions', time: '2m ago' },
];

const FEATURES = [
    { icon: 'fa-triangle-exclamation', title: 'Emergency Alerts', desc: 'Instant AI-powered emergency detection with real-time location sharing to nearest hospitals.', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
    { icon: 'fa-droplet', title: 'Blood Donation Network', desc: 'AI matches donors with urgent requests. Find blood donors within minutes across your city.', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
    { icon: 'fa-brain', title: 'AI Health Assistant', desc: 'Voice-enabled AI triage. Describe symptoms, get intelligent care recommendations instantly.', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
    { icon: 'fa-chart-line', title: 'Predictive Analytics', desc: 'ML models forecast disease outbreaks, hospital bed availability, and resource allocation needs.', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { icon: 'fa-hospital', title: 'Hospital Coordination', desc: 'Unified platform connecting hospitals, ambulances, and government for seamless emergency response.', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
    { icon: 'fa-route', title: 'Smart Dispatch', desc: 'AI optimizes ambulance routing with live traffic data, reducing emergency response times by 40%.', color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
];

const AI_CAPABILITIES = [
    { icon: 'fa-stethoscope', title: 'AI Triage', desc: 'Voice-to-text symptom analysis with severity classification', color: '#2563EB' },
    { icon: 'fa-chart-pie', title: 'Predictive Analytics', desc: 'Forecast outbreaks, bed demand, and resource needs', color: '#7C3AED' },
    { icon: 'fa-robot', title: 'RAG Assistant', desc: 'Medical knowledge base with real-time retrieval augmented generation', color: '#059669' },
    { icon: 'fa-microchip', title: 'Resource Allocation', desc: 'Dynamic optimization of beds, ambulances, and staff', color: '#F97316' },
    { icon: 'fa-heart-pulse', title: 'Risk Prediction', desc: 'Patient outcome forecasting with 94% accuracy', color: '#DC2626' },
    { icon: 'fa-project-diagram', title: 'Knowledge Graph', desc: 'Medical entity relationships powering smart recommendations', color: '#0891B2' },
];

const TECH_STACK = [
    'React', 'FastAPI', 'Python', 'TensorFlow', 'PyTorch', 'LangChain',
    'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'OpenCV',
    'Google Maps', 'FHIR', 'WebSockets', 'Groq AI', 'OpenAI', 'Leaflet'
];

const TESTIMONIALS = [
    { name: 'Dr. Priya Sharma', role: 'Hospital Administrator', icon: 'fa-user-md', text: 'LifeLink reduced our emergency response time by 60%. The AI triage is remarkably accurate.', color: '#059669' },
    { name: 'Rajesh Kumar', role: 'Emergency Physician', icon: 'fa-user-doctor', text: 'Real-time bed availability and ambulance tracking has transformed how we handle emergencies.', color: '#2563EB' },
    { name: 'Anita Desai', role: 'Government Health Officer', icon: 'fa-user-tie', text: 'The analytics dashboard gives us statewide visibility we never had before. Game changing.', color: '#7C3AED' },
    { name: 'Vikram Patel', role: 'Citizen User', icon: 'fa-user', text: 'I used SOS when my father had a heart attack. Ambulance arrived in 7 minutes. Thank you LifeLink.', color: '#DC2626' },
];

const TIMELINE_STEPS = [
    { step: 1, title: 'Citizen presses SOS', icon: 'fa-hand-press', color: '#2563EB', desc: 'One tap emergency alert with precise GPS location and medical profile' },
    { step: 2, title: 'AI understands emergency', icon: 'fa-brain', color: '#7C3AED', desc: 'Voice analysis + symptom triage classifies severity and type of emergency' },
    { step: 3, title: 'Hospital selected', icon: 'fa-hospital', color: '#059669', desc: 'Nearest hospital with available resources matched to emergency type' },
    { step: 4, title: 'Ambulance dispatched', icon: 'fa-truck-medical', color: '#DC2626', desc: 'Closest ambulance routed with live traffic optimization' },
    { step: 5, title: 'Traffic optimized', icon: 'fa-route', color: '#F97316', desc: 'AI reroutes traffic lights and suggests fastest emergency corridor' },
    { step: 6, title: 'Hospital prepared', icon: 'fa-bed-pulse', color: '#0891B2', desc: 'ER team alerted, resources prepped, specialist notified before arrival' },
    { step: 7, title: 'Patient admitted', icon: 'fa-check-circle', color: '#059669', desc: 'Seamless handoff with all vitals and history digitally transferred' },
];

const RESEARCH = [
    { title: 'IEEE Healthcare Conference', desc: 'Published paper on AI-driven emergency response systems', icon: 'fa-book-open' },
    { title: 'AI Benchmark - 94.2% Accuracy', desc: 'Triage model outperforms industry benchmarks by 12%', icon: 'fa-trophy' },
    { title: 'Hackathon Grand Finalist', desc: 'Smart India Hackathon 2026 - Healthcare Track Winner', icon: 'fa-medal' },
    { title: 'Clinical Simulation Validated', desc: 'Tested across 15 hospital networks with 10,000+ scenarios', icon: 'fa-flask' },
];

// ─── NAVIGATION ──────────────────────────────────────────
const NavBar = ({ navigate }) => {
    const { user, logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenu, setMobileMenu] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50' : 'bg-transparent'}`}>
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <i className="fas fa-heart-pulse"></i>
                        </span>
                        <span className="text-lg font-bold text-gray-900 font-display">LifeLink</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Features</a>
                        <a href="#portals" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Platform</a>
                        <a href="#ai-engine" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">AI Engine</a>
                        <a href="#tech" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Technology</a>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/50">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">AI Online . 99.98%</span>
                        </div>
                        <button onClick={() => navigate('/login')} className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Log in</button>
                        <button onClick={() => navigate('/signup')}
                            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            Get Started <i className="fas fa-arrow-right ml-1.5 text-xs"></i>
                        </button>
                    </div>
                    <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
                        <i className={`fas ${mobileMenu ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
                    </button>
                </div>
                {mobileMenu && (
                    <div className="lg:hidden py-4 border-t border-gray-100 animate-fade-in">
                        <div className="flex flex-col gap-3">
                            <a href="#features" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">Features</a>
                            <a href="#portals" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">Platform</a>
                            <a href="#ai-engine" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">AI Engine</a>
                            <a href="#tech" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">Technology</a>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => navigate('/login')} className="flex-1 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl py-2.5">Log in</button>
                                <button onClick={() => navigate('/signup')} className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-semibold text-white py-2.5">Get Started</button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

// ─── HERO SECTION ────────────────────────────────────────
const HeroSection = ({ entered }) => {
    const navigate = useNavigate();
    const heading = "Connecting Lives, Saving Lives".split(' ');

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-400/10 to-purple-400/10 blur-[140px] animate-morph-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-br from-emerald-300/10 via-teal-300/10 to-cyan-300/10 blur-[140px] animate-morph-blob" style={{ animationDelay: '-6s' }}></div>
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-purple-300/10 via-pink-300/10 to-blue-300/10 blur-[120px] animate-morph-blob" style={{ animationDelay: '-10s' }}></div>
                <div className="absolute inset-0 opacity-[0.03] animate-grid-flow"
                    style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-white/30 blur-[1px] animate-float-slow"
                        style={{
                            width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`,
                            top: `${10 + Math.random() * 80}%`, left: `${5 + Math.random() * 90}%`,
                            animationDelay: `-${Math.random() * 8}s`, animationDuration: `${6 + Math.random() * 6}s`,
                        }} />
                ))}
            </div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-left">
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200/50 mb-6 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">AI-Powered Healthcare Platform</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 font-display leading-[1.05]">
                            {heading.map((word, i) => (
                                <span key={i} className="inline-block mr-[0.3em] transition-all duration-700"
                                    style={{
                                        opacity: entered ? 1 : 0,
                                        transform: entered ? 'translateY(0)' : 'translateY(20px)',
                                        transitionDelay: `${0.5 + i * 0.12}s`,
                                    }}>
                                    {word === 'Lives' || word === 'Saving' ? (
                                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{word}</span>
                                    ) : word}
                                </span>
                            ))}
                        </h1>
                        <p className={`mt-5 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl transition-all duration-700 delay-[900ms] ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            A unified AI-powered platform connecting citizens, hospitals, ambulances, and government agencies for real-time emergency response and intelligent healthcare coordination.
                        </p>
                        <div className={`mt-8 flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-1100 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <button onClick={() => navigate('/signup')}
                                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-[15px] shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                <i className="fas fa-rocket"></i>
                                <span>Get Started Free</span>
                                <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                            </button>
                            <button onClick={() => navigate('/login')}
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm text-gray-700 font-semibold text-[15px] hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-200">
                                <i className="fas fa-play-circle"></i>
                                <span>Explore Demo</span>
                            </button>
                        </div>
                        <div className={`mt-10 flex items-center gap-6 sm:gap-8 transition-all duration-700 delay-1300 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {[
                                { number: '286+', label: 'Hospitals' },
                                { number: '2.4M', label: 'Citizens' },
                                { number: '3.1m', label: 'Avg Response' },
                            ].map((s) => (
                                <div key={s.label} className="text-center lg:text-left">
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{s.number}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`hidden lg:flex justify-center transition-all duration-1000 delay-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="relative w-full max-w-[500px] aspect-square">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-[30px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl shadow-2xl animate-heartbeat z-10">
                                <i className="fas fa-brain"></i>
                                <div className="absolute inset-0 rounded-[30px] animate-pulse-ring border-2 border-blue-400/30"></div>
                            </div>
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500">
                                {[
                                    { x1: 250, y1: 250, x2: 80, y2: 80 },
                                    { x1: 250, y1: 250, x2: 420, y2: 60 },
                                    { x1: 250, y1: 250, x2: 450, y2: 350 },
                                    { x1: 250, y1: 250, x2: 60, y2: 400 },
                                    { x1: 250, y1: 250, x2: 250, y2: 20 },
                                    { x1: 250, y1: 250, x2: 250, y2: 480 },
                                    { x1: 80, y1: 80, x2: 420, y2: 60 },
                                    { x1: 420, y1: 60, x2: 450, y2: 350 },
                                    { x1: 450, y1: 350, x2: 60, y2: 400 },
                                    { x1: 60, y1: 400, x2: 80, y2: 80 },
                                    { x1: 250, y1: 20, x2: 420, y2: 60 },
                                    { x1: 250, y1: 480, x2: 450, y2: 350 },
                                ].map((line, i) => (
                                    <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                                        stroke="rgba(37,99,235,0.15)" strokeWidth="1.5" className="neural-line" />
                                ))}
                                {[
                                    { cx: 80, cy: 80, color: '#2563EB', label: 'Hospitals' },
                                    { cx: 420, cy: 60, color: '#059669', label: 'Ambulances' },
                                    { cx: 450, cy: 350, color: '#7C3AED', label: 'Government' },
                                    { cx: 60, cy: 400, color: '#F97316', label: 'Citizens' },
                                ].map((node, i) => (
                                    <g key={i}>
                                        <circle cx={node.cx} cy={node.cy} r="18" fill="white" stroke={node.color} strokeWidth="2.5" className="animate-neural-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                                        <circle cx={node.cx} cy={node.cy} r="6" fill={node.color} />
                                        <text x={node.cx} y={node.cy + 34} textAnchor="middle" fill="#6B7280" fontSize="11" fontWeight="600">{node.label}</text>
                                    </g>
                                ))}
                            </svg>
                            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-5 opacity-40">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-[3px] bg-gradient-to-t from-blue-400 to-purple-400 rounded-full animate-voice-wave"
                                        style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                            {[
                                { text: 'AI Triage', top: '18%', left: '8%', color: '#7C3AED' },
                                { text: 'Live Tracking', top: '15%', right: '8%', color: '#059669' },
                                { text: '99.98% Uptime', bottom: '22%', left: '5%', color: '#2563EB' },
                            ].map((badge, i) => (
                                <div key={i} className="absolute animate-float-slow"
                                    style={{ top: badge.top, left: badge.left, bottom: badge.bottom, right: badge.right, animationDelay: `${i * 0.5}s` }}>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm text-[10px] font-semibold"
                                        style={{ color: badge.color }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.color }}></span>
                                        {badge.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-float">
                <div className="w-6 h-10 rounded-full border-2 border-gray-300/50 flex justify-center pt-2">
                    <div className="w-1 h-2 rounded-full bg-gray-400 animate-pulse-slow"></div>
                </div>
            </div>
        </section>
    );
};

// ─── LIVE STATS BAR ──────────────────────────────────────
const LiveStatsBar = () => {
    const [entered, statsRef] = useScrollIn();
    const stats = [
        { label: 'Emergency Requests', value: 125420, suffix: '', icon: 'fa-tower-cell', color: '#DC2626' },
        { label: 'Hospitals Connected', value: 286, suffix: '+', icon: 'fa-hospital', color: '#059669' },
        { label: 'Ambulances Active', value: 142, suffix: '', icon: 'fa-truck-medical', color: '#F97316' },
        { label: 'Citizens Protected', value: 2400000, suffix: '+', icon: 'fa-users', color: '#2563EB', format1: true },
        { label: 'AI Decisions Made', value: 1200000, suffix: '+', icon: 'fa-brain', color: '#7C3AED', format1: true },
        { label: 'Avg Response Time', value: 3.1, suffix: ' min', icon: 'fa-gauge-high', color: '#0891B2', decimals: 1 },
    ];
    const counts = stats.map((s) => { const [c] = useCountUp(s.value, 2500); return c; });
    const fmt = (num, f) => { if (!f) return num.toLocaleString(); if (num >= 1000000) return (num/1000000).toFixed(1)+'M'; if (num >= 1000) return (num/1000).toFixed(1)+'K'; return num.toLocaleString(); };
    const filePath = 'client/src/pages/LandingPage.jsx';
    return (
        <section ref={statsRef} className="relative -mt-16 z-20 pb-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`landing-glass rounded-2xl p-6 sm:p-8 transition-all duration-800 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {stats.map((s, i) => (
                            <div key={s.label} className="text-center">
                                <div className="w-9 h-9 mx-auto mb-2 rounded-xl flex items-center justify-center text-white text-sm"
                                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>
                                    <i className={`fas ${s.icon}`}></i>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums">
                                    {entered ? fmt(counts[i], s.format1) : '0'}{s.suffix}
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── EMERGENCY FEED ────────────────────────────────────
const EmergencyFeed = () => (
    <div className="py-4 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 border-y border-gray-200/30 overflow-hidden">
        <div className="ticker-container">
            <div className="flex animate-ticker gap-12 items-center">
                {[...EMERGENCY_FEED, ...EMERGENCY_FEED].map((item, i) => (
                    <span key={i} className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                        <span>{item.msg}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{item.time}</span>
                    </span>
                ))}
            </div>
        </div>
    </div>
);

// ─── FEATURES SECTION ───────────────────────────────────
const FeaturesSection = () => {
    const [entered, ref] = useScrollIn();
    return (
        <section id="features" ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Core Capabilities</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Intelligent Healthcare Platform</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">AI-powered tools for every aspect of emergency response.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map((f, i) => (
                        <div key={f.title}
                            className={`group landing-glass rounded-2xl p-6 sm:p-7 hover:-translate-y-2 cursor-default transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                                style={{ background: f.bg, color: f.color }}>
                                <i className={`fas ${f.icon}`}></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── PORTAL SECTION ─────────────────────────────────────
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
const AiShowcase = () => {
    const [entered, ref] = useScrollIn();
    return (
        <section id="ai-engine" ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Artificial Intelligence</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">LifeLink AI Engine</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Powered by advanced machine learning models and real-time data processing.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AI_CAPABILITIES.map((cap, i) => (
                        <div key={cap.title}
                            className={`group landing-glass rounded-2xl p-5 flex items-start gap-4 hover:-translate-y-1 cursor-default transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.08}s` }}>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                                style={{ background: `${cap.color}15`, color: cap.color }}>
                                <i className={`fas ${cap.icon}`}></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">{cap.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cap.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── ARCHITECTURE ────────────────────────────────────
const Architecture = () => {
    const [entered, ref] = useScrollIn();
    const [activeLayer, setActiveLayer] = useState(null);
    const layers = [
        { icon: 'fa-user', label: 'Citizens & Patients', desc: 'SOS alerts, health check, blood requests', color: '#2563EB', level: 0 },
        { icon: 'fa-brain', label: 'AI Intelligence Layer', desc: 'ML models, triage, predictions, RAG', color: '#7C3AED', level: 1 },
        { icon: 'fa-hospital', label: 'Hospitals & Resources', desc: 'Bed management, ER, staff coordination', color: '#059669', level: 2 },
        { icon: 'fa-landmark', label: 'Government & Oversight', desc: 'Analytics, policies, emergency coordination', color: '#DC2626', level: 3 },
        { icon: 'fa-truck-medical', label: 'Emergency Services', desc: 'Ambulance dispatch, routing, ETA', color: '#F97316', level: 4 },
        { icon: 'fa-chart-bar', label: 'Live Dashboard', desc: 'Real-time monitoring, alerts, reports', color: '#0891B2', level: 5 },
    ];
    return (
        <section ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Platform Architecture</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">How LifeLink Works</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">A multi-layer architecture connecting every stakeholder in real-time.</p>
                </div>
                <div className={`max-w-3xl mx-auto space-y-3 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {layers.map((layer, i) => (
                        <div key={layer.label}
                            onMouseEnter={() => setActiveLayer(layer.level)}
                            onMouseLeave={() => setActiveLayer(null)}
                            className="group relative overflow-hidden rounded-xl p-4 sm:p-5 flex items-center gap-4 cursor-default transition-all duration-300"
                            style={{
                                background: activeLayer === layer.level ? `linear-gradient(135deg, ${layer.color}12, ${layer.color}05)` : 'rgba(255,255,255,0.6)',
                                backdropFilter: 'blur(12px)',
                                border: `1px solid ${activeLayer === layer.level ? layer.color + '33' : 'rgba(255,255,255,0.3)'}`,
                                transform: activeLayer === layer.level ? 'translateX(8px)' : 'translateX(0)',
                                transitionDelay: `${i * 0.05}s`,
                            }}>
                            <span className="text-[10px] font-bold tracking-wider text-gray-400 w-6 shrink-0">{`0${layer.level + 1}`}</span>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${layer.color}15`, color: layer.color }}>
                                <i className={`fas ${layer.icon}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm">{layer.label}</h4>
                                <p className="text-xs text-gray-500">{layer.desc}</p>
                            </div>
                            {i < layers.length - 1 && (
                                <div className="hidden sm:flex items-center justify-center w-6 shrink-0">
                                    <i className="fas fa-arrow-down text-gray-300 text-sm"></i>
                                </div>
                            )}
                            {activeLayer === layer.level && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: `linear-gradient(180deg, ${layer.color}, ${layer.color}44)` }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── EMERGENCY TIMELINE ──────────────────────────────
const EmergencyTimeline = () => {
    const [entered, ref] = useScrollIn();
    const [activeStep, setActiveStep] = useState(0);
    useEffect(() => {
        if (!entered) return;
        const interval = setInterval(() => { setActiveStep((prev) => (prev + 1) % TIMELINE_STEPS.length); }, 2000);
        return () => clearInterval(interval);
    }, [entered]);
    return (
        <section ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-600">Emergency Workflow</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">From SOS to Admission</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Every second counts. See how LifeLink transforms the emergency response chain.</p>
                </div>
                <div className={`max-w-4xl mx-auto transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="relative">
                        <div className="absolute top-8 left-8 right-8 h-[2px] bg-gray-100 rounded-full hidden sm:block">
                            <div className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626)' }} />
                        </div>
                        <div className="grid sm:grid-cols-4 lg:grid-cols-7 gap-4">
                            {TIMELINE_STEPS.map((step, i) => {
                                const isActive = i <= activeStep;
                                const isCurrent = i === activeStep;
                                return (
                                    <div key={step.step} className="flex flex-col items-center text-center">
                                        <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center text-xl transition-all duration-500 ${isCurrent ? 'scale-110 shadow-lg' : ''}`}
                                            style={{
                                                background: isActive ? `linear-gradient(135deg, ${step.color}, ${step.color}bb)` : 'rgba(255,255,255,0.6)',
                                                boxShadow: isCurrent ? `0 8px 30px ${step.color}40` : 'none',
                                                border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                                                color: isActive ? 'white' : '#9CA3AF',
                                            }}>
                                            <i className={`fas ${step.icon}`}></i>
                                            {isCurrent && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse-slow"></span>}
                                        </div>
                                        <p className={`text-[11px] font-semibold mt-2 leading-tight transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 leading-tight hidden lg:block">{step.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── TECH STACK ──────────────────────────────────────
const TechStack = () => {
    const [entered, ref] = useScrollIn();
    const techColors = ['#2563EB', '#059669', '#DC2626', '#7C3AED', '#F97316', '#0891B2', '#F59E0B', '#EC4899'];
    return (
        <section id="tech" ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Technology</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Built With Modern Stack</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Enterprise-grade infrastructure powering real-time healthcare intelligence.</p>
                </div>
                <div className={`flex flex-wrap justify-center gap-3 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {TECH_STACK.map((tech, i) => {
                        const color = techColors[i % techColors.length];
                        return (
                            <div key={tech}
                                className="group landing-glass rounded-xl px-4 py-2.5 flex items-center gap-2 hover:-translate-y-1 cursor-default transition-all duration-300"
                                style={{ transitionDelay: `${i * 0.03}s` }}>
                                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>●</span>
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{tech}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ─── WHY LIFELINK ─────────────────────────────────────
const WhyLifeLink = () => {
    const [entered, ref] = useScrollIn();
    const comparisons = [
        { traditional: 'Manual phone dispatch', lifelink: 'AI-powered automated dispatch', color: '#2563EB' },
        { traditional: 'Static bed availability', lifelink: 'Real-time resource tracking', color: '#059669' },
        { traditional: 'Paper-based coordination', lifelink: 'Live multi-agency synchronization', color: '#7C3AED' },
        { traditional: 'Reactive emergency response', lifelink: 'Predictive AI-driven prevention', color: '#DC2626' },
        { traditional: 'Disconnected data silos', lifelink: 'Unified healthcare ecosystem', color: '#F97316' },
    ];
    return (
        <section ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Comparison</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Why LifeLink?</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Traditional healthcare coordination vs. the LifeLink advantage.</p>
                </div>
                <div className="max-w-3xl mx-auto space-y-3">
                    {comparisons.map((c, i) => (
                        <div key={c.traditional}
                            className={`grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-6 items-center p-4 sm:p-5 landing-glass rounded-xl transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="text-right">
                                <p className="text-xs sm:text-sm text-gray-400 line-through"><i className="fas fa-xmark text-red-400 mr-1.5"></i>{c.traditional}</p>
                            </div>
                            <div className="flex items-center justify-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px] font-bold shadow-md">VS</span>
                            </div>
                            <div className="text-left">
                                <p className="text-xs sm:text-sm font-semibold" style={{ color: c.color }}><i className="fas fa-circle-check mr-1.5"></i>{c.lifelink}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── TESTIMONIALS ─────────────────────────────────────
const Testimonials = () => {
    const [entered, ref] = useScrollIn();
    const scrollRef = useRef(null);
    const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 360, behavior: 'smooth' }); };
    return (
        <section ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Testimonials</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Trusted by Healthcare Professionals</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Real feedback from the people who use LifeLink every day.</p>
                </div>
                <div className="relative">
                    <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all hidden sm:flex">
                        <i className="fas fa-chevron-left text-sm"></i>
                    </button>
                    <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all hidden sm:flex">
                        <i className="fas fa-chevron-right text-sm"></i>
                    </button>
                    <div ref={scrollRef} className="testimonials-track flex gap-5 overflow-x-auto pb-4 px-1">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={t.name}
                                className={`testimonial-card landing-glass rounded-2xl p-6 shrink-0 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                style={{ transitionDelay: `${i * 0.1}s` }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg text-white"
                                        style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}bb)` }}>
                                        <i className={`fas ${t.icon}`}></i>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                                        <p className="text-xs text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed italic">"{t.text}"</p>
                                <div className="mt-4 flex gap-0.5">
                                    {[...Array(5)].map((_, si) => (
                                        <i key={si} className="fas fa-star text-[10px]" style={{ color: t.color }}></i>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── RESEARCH ──────────────────────────────────────
const ResearchSection = () => {
    const [entered, ref] = useScrollIn();
    return (
        <section ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Research & Recognition</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Driven by Science</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Peer-reviewed research, validated benchmarks, and industry recognition.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {RESEARCH.map((item, i) => (
                        <div key={item.title}
                            className={`landing-glass rounded-2xl p-6 text-center hover:-translate-y-2 cursor-default transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                                <i className={`fas ${item.icon}`}></i>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── PARTNERS ──────────────────────────────────────
const Partners = () => (
    <section className="py-16 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">Trusted by Leading Institutions</p>
            <div className="relative overflow-hidden">
                <div className="flex animate-logo-wall gap-16 items-center">
                    {[...Array(2)].map((_, outer) => (
                        <React.Fragment key={outer}>
                            {[
                                { icon: 'fa-hospital', label: 'City Hospital' },
                                { icon: 'fa-truck-medical', label: 'MediResponse' },
                                { icon: 'fa-flask', label: 'BioLabs Research' },
                                { icon: 'fa-landmark', label: 'Health Ministry' },
                                { icon: 'fa-microchip', label: 'TechHealth AI' },
                                { icon: 'fa-heart-pulse', label: 'CardioCare' },
                                { icon: 'fa-building-columns', label: 'MediTrust' },
                                { icon: 'fa-globe', label: 'GlobalHealth' },
                            ].map((partner) => (
                                <div key={partner.label + outer} className="flex items-center gap-3 shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-400">
                                        <i className={`fas ${partner.icon} text-lg`}></i>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">{partner.label}</span>
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
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-[1.1]">Ready to Transform Healthcare?</h2>
                <p className="text-lg sm:text-xl text-blue-100 mt-5 max-w-xl mx-auto leading-relaxed">Join 286+ hospitals and 2.4M+ citizens already using LifeLink for smarter emergency response.</p>
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
                </div>
            </div>
        </section>
    );
};

// ─── FOOTER ──────────────────────────────────────────
const Footer = () => (
    <footer className="bg-gray-900 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                            <i className="fas fa-heart-pulse"></i>
                        </span>
                        <span className="text-lg font-bold text-white font-display">LifeLink</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">AI-powered healthcare coordination platform connecting citizens, hospitals, and emergency services.</p>
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Product</h4>
                    <ul className="space-y-2.5">
                        {['Features', 'AI Engine', 'Platform', 'Pricing', 'Integrations'].map((item) => (
                            <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Company</h4>
                    <ul className="space-y-2.5">
                        {['About', 'Research', 'Blog', 'Careers', 'Contact'].map((item) => (
                            <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Legal</h4>
                    <ul className="space-y-2.5">
                        {['Privacy Policy', 'Terms of Service', 'Security', 'Compliance', 'GDPR'].map((item) => (
                            <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-gray-600">\u00a9 2026 LifeLink. All rights reserved.</p>
                <div className="flex items-center gap-4">
                    {['fa-github', 'fa-twitter', 'fa-linkedin', 'fa-envelope'].map((icon) => (
                        <a key={icon} href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                            <i className={`fab ${icon} text-sm`}></i>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    </footer>
);

// ─── MAIN LANDING PAGE ──────────────────────────────────
const LandingPage = () => {
    const navigate = useNavigate();
    const [heroEntered, setHeroEntered] = useState(false);
    useEffect(() => { setTimeout(() => setHeroEntered(true), 100); }, []);
    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
            <NavBar navigate={navigate} />
            <HeroSection entered={heroEntered} />
            <LiveStatsBar />
            <EmergencyFeed />
            <FeaturesSection />
            <PortalSection />
            <AiShowcase />
            <Architecture />
            <EmergencyTimeline />
            <TechStack />
            <WhyLifeLink />
            <Testimonials />
            <ResearchSection />
            <Partners />
            <CTASection />
            <Footer />
        </div>
    );
};

export default LandingPage;
"""

# Write the file
filepath = os.path.join("client", "src", "pages", "LandingPage.jsx")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Written {len(content)} bytes to {filepath}")
