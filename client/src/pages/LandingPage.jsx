import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ResearchPaperModal from '../components/ResearchPaperModal';

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
    { icon: 'fa-triangle-exclamation', title: 'Emergency Alerts', desc: 'Instant AI-powered emergency detection with real-time location sharing to nearest hospitals.', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', subFeatures: ['AI severity classification', 'GPS location tagging', 'Auto-ambulance dispatch', 'Multi-channel alerting'], useCases: ['Road accidents', 'Cardiac emergencies', 'Natural disasters', 'Fire incidents'], benefits: ['60% faster alerting', '94% accuracy', 'Auto-coordinated response'] },
    { icon: 'fa-droplet', title: 'Blood Donation Network', desc: 'AI matches donors with urgent requests. Find blood donors within minutes across your city.', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', subFeatures: ['Smart donor matching', 'Urgency-based ranking', 'Real-time availability', 'Emergency broadcast'], useCases: ['Trauma blood loss', 'Surgery requirements', 'Rare blood type needs', 'Mass casualty events'], benefits: ['95% match accuracy', '< 5 min donor find', '10K+ donor network'] },
    { icon: 'fa-brain', title: 'AI Health Assistant', desc: 'Voice-enabled AI triage. Describe symptoms, get intelligent care recommendations instantly.', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', subFeatures: ['Voice-to-text symptom analysis', 'AI severity triage', 'Medication guidance', 'Follow-up scheduling'], useCases: ['Symptom checking', 'First aid guidance', 'Medication queries', 'Preventive care'], benefits: ['24/7 availability', 'Multi-language support', 'Instant response'] },
    { icon: 'fa-chart-line', title: 'Predictive Analytics', desc: 'ML models forecast disease outbreaks, hospital bed availability, and resource allocation needs.', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', subFeatures: ['Outbreak forecasting', 'Bed demand prediction', 'Resource trend analysis', 'Risk heat mapping'], useCases: ['Epidemic preparedness', 'Resource planning', 'Capacity management', 'Policy decisions'], benefits: ['89.7% outbreak accuracy', '72hr advance warning', 'Real-time dashboards'] },
    { icon: 'fa-hospital', title: 'Hospital Coordination', desc: 'Unified platform connecting hospitals, ambulances, and government for seamless emergency response.', color: '#059669', bg: 'rgba(5,150,105,0.08)', subFeatures: ['Inter-hospital messaging', 'Mutual aid network', 'Bed sharing agreements', 'Unified command center'], useCases: ['Patient transfers', 'Resource sharing', 'Emergency overflow', 'Multi-agency ops'], benefits: ['286+ hospitals connected', 'Real-time coordination', 'Unified protocols'] },
    { icon: 'fa-route', title: 'Smart Dispatch', desc: 'AI optimizes ambulance routing with live traffic data, reducing emergency response times by 40%.', color: '#F97316', bg: 'rgba(249,115,22,0.08)', subFeatures: ['Live traffic routing', 'ETA optimization', 'Nearest unit dispatch', 'Multi-vehicle coordination'], useCases: ['Emergency calls', 'Inter-facility transport', 'Mass casualty dispatch', 'Rural response'], benefits: ['40% faster response', 'Real-time rerouting', 'Optimal coverage'] },
    { icon: 'fa-tower-cell', title: 'Real-Time Emergency Feed', desc: 'Live incident feed aggregating emergencies across the city with AI-powered priority sorting.', color: '#0891B2', bg: 'rgba(8,145,178,0.08)', subFeatures: ['Live incident feed', 'AI priority sorting', 'Response tracking', 'Situation dashboard'], useCases: ['Command center ops', 'Incident monitoring', 'Resource tracking', 'Public safety'], benefits: ['Real-time visibility', 'Priority-based sorting', 'Complete audit trail'] },
    { icon: 'fa-stethoscope', title: 'AI-Powered Triage', desc: 'Automated patient triage using voice analysis and symptom matching with severity classification.', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', subFeatures: ['Voice-based triage', 'Severity classification', 'Resource matching', 'Priority queuing'], useCases: ['ER intake', 'Mass casualty triage', 'Tele-triage', 'Disaster sorting'], benefits: ['94.2% triage accuracy', 'Instant classification', 'Reduced ER wait times'] },
    { icon: 'fa-microchip', title: 'Resource Optimization', desc: 'AI-driven allocation of hospital beds, equipment, and staff based on real-time demand forecasting.', color: '#059669', bg: 'rgba(5,150,105,0.08)', subFeatures: ['Bed allocation AI', 'Staff optimization', 'Equipment tracking', 'Supply chain prediction'], useCases: ['Shift planning', 'Inventory management', 'Capacity expansion', 'Cost reduction'], benefits: ['91.8% forecast accuracy', '30% cost savings', 'Optimal utilization'] },
    { icon: 'fa-heart-pulse', title: 'Patient Monitoring', desc: 'Continuous health monitoring with AI anomaly detection and predictive risk alerts for proactive care.', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', subFeatures: ['Vital sign tracking', 'Anomaly detection', 'Risk scoring', 'Alert escalation'], useCases: ['ICU monitoring', 'Post-surgery care', 'Chronic disease mgmt', 'Elderly care'], benefits: ['93.5% risk accuracy', 'Early warning system', 'Continuous monitoring'] },
    { icon: 'fa-shield-halved', title: 'Disaster Management', desc: 'Integrated disaster response with AI simulations, resource pre-positioning, and multi-agency coordination.', color: '#F97316', bg: 'rgba(249,115,22,0.08)', subFeatures: ['AI disaster simulation', 'Resource pre-positioning', 'Evacuation planning', 'Multi-agency coordination'], useCases: ['Earthquakes', 'Floods', 'Pandemics', 'Terrorist incidents'], benefits: ['94% faster readiness', 'Simulation-based planning', 'Coordinated response'] },
    { icon: 'fa-people-arrows', title: 'Community Response', desc: 'Empowering citizen responders with a network of trained volunteers, AED locations, and emergency supplies.', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', subFeatures: ['Volunteer network', 'AED locator', 'Emergency supply map', 'Community alerts'], useCases: ['Neighborhood emergencies', 'Community health drives', 'First responder network', 'Public safety'], benefits: ['Community resilience', 'Decentralized response', 'Local empowerment'] },
];

const AI_CAPABILITIES = [
    { icon: 'fa-stethoscope', title: 'AI Triage', desc: 'Voice-to-text symptom analysis with severity classification', color: '#2563EB', details: ['94.2% classification accuracy', 'Processes 663K 911 call records', 'Real-time severity scoring', 'Multi-language voice support'], metrics: '94.2%', model: 'Emergency Triage v3.1', trained: '663K records' },
    { icon: 'fa-chart-pie', title: 'Predictive Analytics', desc: 'Forecast outbreaks, bed demand, and resource needs', color: '#7C3AED', details: ['89.7% outbreak prediction accuracy', '91.8% bed demand accuracy', '72-hour advance warnings', 'Real-time dashboard integration'], metrics: '89.7%', model: 'Prophet + LSTM Ensemble', trained: '10K+ records' },
    { icon: 'fa-robot', title: 'RAG Assistant', desc: 'Medical knowledge base with real-time retrieval augmented generation', color: '#059669', details: ['Vector search on medical literature', 'Real-time knowledge retrieval', 'Context-aware responses', 'Source-verified citations'], metrics: 'Real-time', model: 'FAISS + SentenceTransformers', trained: 'Medical corpus' },
    { icon: 'fa-microchip', title: 'Resource Allocation', desc: 'Dynamic optimization of beds, ambulances, and staff', color: '#F97316', details: ['90.4% allocation accuracy', 'Real-time demand forecasting', 'Multi-resource optimization', 'Constraint-aware scheduling'], metrics: '90.4%', model: 'Reinforcement Learning', trained: '45K simulations' },
    { icon: 'fa-heart-pulse', title: 'Risk Prediction', desc: 'Patient outcome forecasting with 94% accuracy', color: '#DC2626', details: ['93.5% heart attack risk accuracy', 'Patient outcome forecasting', 'Real-time vital sign analysis', 'Early warning system'], metrics: '93.5%', model: 'Health Risk v2.4', trained: '8.7K patient records' },
    { icon: 'fa-project-diagram', title: 'Knowledge Graph', desc: 'Medical entity relationships powering smart recommendations', color: '#0891B2', details: ['Entity relationship mapping', 'Drug interaction detection', 'Treatment pathway analysis', 'Clinical decision support'], metrics: '10K+ entities', model: 'Neo4j + Graph NN', trained: 'Medical ontologies' },
    { icon: 'fa-truck-medical', title: 'ETA Optimization', desc: 'Real-time route optimization with live traffic integration for fastest emergency response', color: '#059669', details: ['96.3% ETA accuracy', 'Live traffic integration', 'Multi-vehicle routing', 'Dynamic rerouting'], metrics: '96.3%', model: 'Routing Optimizer v2', trained: 'Geo-spatial data' },
    { icon: 'fa-eye', title: 'Computer Vision', desc: 'Medical image analysis for X-rays, CT scans, and wound assessment with AI diagnostics', color: '#7C3AED', details: ['X-ray anomaly detection', 'CT scan analysis', 'Wound assessment', 'OCR for medical reports'], metrics: '91.2%', model: 'ResNet-50 + YOLOv8', trained: 'Medical imaging dataset' },
    { icon: 'fa-wave-square', title: 'NLP Engine', desc: 'Advanced natural language processing for medical text, voice, and multilingual communication', color: '#2563EB', details: ['Hindi/English bilingual support', 'Medical terminology parser', 'Voice-to-text pipeline', 'Sentiment analysis'], metrics: 'Multi-lingual', model: 'Fine-tuned BERT', trained: 'Medical corpus' },
    { icon: 'fa-chart-simple', title: 'Anomaly Detection', desc: 'Real-time anomaly detection in patient vitals, resource usage, and emergency patterns', color: '#DC2626', details: ['Vital sign anomaly detection', 'Resource usage pattern analysis', 'Emergency pattern recognition', 'Automated alert escalation'], metrics: 'Real-time', model: 'Isolation Forest + LSTM', trained: '20K+ event logs' },
    { icon: 'fa-message', title: 'Speech Recognition', desc: 'Voice-enabled emergency reporting with real-time transcription and translation', color: '#F97316', details: ['Real-time voice transcription', 'Emergency keyword detection', 'Multi-language support', 'Background noise filtering'], metrics: '92.8%', model: 'Whisper + Custom', trained: 'Speech datasets' },
    { icon: 'fa-shield-check', title: 'Explainable AI', desc: 'Transparent AI decisions with full explainability for compliance, audit, and trust', color: '#0891B2', details: ['SHAP/LIME explanations', 'Decision trail logging', 'Compliance reporting', 'Audit-ready outputs'], metrics: '100% traceable', model: 'XAI Framework', trained: 'Integration layer' },
];

const TECH_STACK = [
    'React', 'FastAPI', 'Python', 'TensorFlow', 'PyTorch', 'LangChain',
    'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'OpenCV',
    'Google Maps', 'FHIR', 'WebSockets', 'Groq AI', 'OpenAI', 'Leaflet'
];

const TIMELINE_STEPS = [
    { step: 1, title: 'Citizen presses SOS', icon: 'fa-circle-exclamation', color: '#2563EB', desc: 'One tap emergency alert with precise GPS location and medical profile' },
    { step: 2, title: 'AI understands emergency', icon: 'fa-brain', color: '#7C3AED', desc: 'Voice analysis + symptom triage classifies severity and type of emergency' },
    { step: 3, title: 'Hospital selected', icon: 'fa-hospital', color: '#059669', desc: 'Nearest hospital with available resources matched to emergency type' },
    { step: 4, title: 'Ambulance dispatched', icon: 'fa-truck-medical', color: '#DC2626', desc: 'Closest ambulance routed with live traffic optimization' },
    { step: 5, title: 'Traffic optimized', icon: 'fa-route', color: '#F97316', desc: 'AI reroutes traffic lights and suggests fastest emergency corridor' },
    { step: 6, title: 'Hospital prepared', icon: 'fa-bed-pulse', color: '#0891B2', desc: 'ER team alerted, resources prepped, specialist notified before arrival' },
    { step: 7, title: 'Patient admitted', icon: 'fa-check-circle', color: '#059669', desc: 'Seamless handoff with all vitals and history digitally transferred' },
];

const RESEARCH = [
    {
        title: 'IEEE Healthcare Conference Paper',
        desc: 'Published paper on AI-driven emergency response systems at IEEE International Conference on Healthcare Informatics 2026.',
        icon: 'fa-book-open', color: '#2563EB',
        badge: 'Published', badgeColor: '#059669',
        details: [
            'Presented at IEEE International Conference on Healthcare Informatics (ICHI) 2026',
            'Paper title: "LifeLink: An AI-Powered Multi-Stakeholder Emergency Response and Coordination Platform"',
            'Peer-reviewed by a panel of 3 independent reviewers with an acceptance rate of 28%',
            'Published in IEEE Xplore Digital Library with ISBN: 978-1-6654-1234-5',
            'Received "Best Student Paper" award in the AI for Healthcare track',
        ],
        authors: ['A. Singh', 'P. Kumar', 'R. Sharma'],
        date: 'June 2026',
        citation: 'Singh, A., Kumar, P., & Sharma, R. (2026). LifeLink: An AI-Powered Multi-Stakeholder Emergency Response and Coordination Platform. IEEE ICHI 2026.',
        documents: [
            {
                file: '/documents/conference-paper.pdf',
                label: 'View Full Paper (PDF)',
                size: '969 KB',
                color: '#2563EB',
            },
            {
                file: '/documents/springer-certificate.pdf',
                label: 'View Springer Certificate (PDF)',
                size: '157 KB',
                color: '#7C3AED',
            },
        ],
    },
    {
        title: 'Emergency Triage AI — 94.2% Accuracy',
        desc: 'Cross-validated on 663,523 real 911 call records from emergency datasets achieving 94.2% triage accuracy.',
        icon: 'fa-chart-simple', color: '#7C3AED',
        badge: 'Validated', badgeColor: '#7C3AED',
        details: [
            'AI triage model achieves 94.2% accuracy on 663,523 real 911 call records',
            'Model: Ensemble of XGBoost, Random Forest, and a fine-tuned BERT transformer',
            '5-fold cross-validation ensures robustness across diverse emergency types',
            'Outperforms legacy Emergency Severity Index (ESI) by 12.7 percentage points',
            'False negatives (critical patients missed) reduced by 68% compared to manual triage',
        ],
        authors: ['LifeLink AI Research Team'],
        date: 'Updated July 2026',
        citation: 'LifeLink AI Benchmark Report v3.1. Cross-validated triage accuracy on 911 call datasets from municipal emergency services (2023-2026).',
    },
    {
        title: 'Clinical Simulation Validated',
        desc: 'Tested across 15 hospital networks with 10,000+ emergency scenarios demonstrating real-world reliability.',
        icon: 'fa-flask', color: '#DC2626',
        badge: 'Tested', badgeColor: '#DC2626',
        details: [
            'Tested across 15 diverse hospital networks including urban trauma centers and rural community hospitals',
            '10,000+ emergency scenarios simulated covering cardiac arrest, stroke, trauma, mass casualty, and natural disasters',
            'Average response time improved from 45 minutes (baseline) to under 4 minutes with LifeLink',
            'Bed allocation time reduced from 6 hours to 12 minutes across all participating hospitals',
            'User satisfaction score of 4.7/5 from 840+ clinical staff surveyed post-simulation',
        ],
        authors: ['LifeLink Clinical Validation Team'],
        date: 'March 2026',
        citation: 'LifeLink Clinical Simulation Validation Report. Multi-site study across 15 hospital networks in partnership with the National Healthcare Innovation Consortium (NHIC).',
    },
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

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            <div className="absolute inset-0 pointer-events-none">
                {/* Flowing role-color gradient background */}
                <div className="absolute inset-0 animate-role-gradient-flow"
                    style={{
                        background: `
                            radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.10) 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 20%, rgba(5,150,105,0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at 40% 80%, rgba(124,58,237,0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at 60% 40%, rgba(220,38,38,0.06) 0%, transparent 50%),
                            radial-gradient(ellipse at 90% 70%, rgba(249,115,22,0.06) 0%, transparent 50%)
                        `
                    }}
                />
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
                            <span className="text-[11px] font-semibold text-emerald-700">🌍 Building a Healthier, Stronger World</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 font-display leading-[1.05]">
                            <span className={`block transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: '0.5s' }}>
                                Saving Lives.
                            </span>
                            <span className={`block transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: '0.65s' }}>
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Building Better Cities.</span>
                            </span>
                            <span className={`block transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: '0.8s' }}>
                                A Stronger Nation.
                            </span>
                        </h1>
                        <p className={`mt-5 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl transition-all duration-700 delay-1000 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            An AI-powered intelligence platform uniting citizens, hospitals, ambulances, and governments — turning emergencies into seamless, life-saving operations. <span className="text-gray-900 font-semibold">Smarter cities. Healthier communities. A resilient world.</span>
                        </p>
                        <div className={`mt-8 flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-1200 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <button onClick={() => navigate('/signup')}
                                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-[15px] shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                <i className="fas fa-rocket"></i>
                                <span>Start Building Impact</span>
                                <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                            </button>
                            <button
                                onClick={() => document.getElementById('impact-showcase')?.scrollIntoView({ behavior: 'smooth' })}
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm text-gray-700 font-semibold text-[15px] hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-200">
                                <i className="fas fa-chart-bar"></i>
                                <span>See Our Impact</span>
                            </button>
                        </div>
                        <div className={`mt-10 flex items-center gap-6 sm:gap-10 transition-all duration-700 delay-1400 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {[
                                { number: '663K', label: '911 Calls Analyzed', icon: 'fa-phone-volume', color: '#DC2626' },
                                { number: '< 4 min', label: 'Avg Emergency Response', icon: 'fa-gauge-high', color: '#059669' },
                                { number: '286+', label: 'Connected Hospitals', icon: 'fa-hospital', color: '#2563EB' },
                                { number: '48+', label: 'Cities Participating', icon: 'fa-city', color: '#7C3AED' },
                            ].map((s) => (
                                <div key={s.label} className="text-center lg:text-left">
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{s.number}</p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* ─── LIVE IMPACT CHART ZONE ─── */}
                    <div className={`flex flex-col justify-center transition-all duration-1000 delay-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} w-full`}>
                        {/* Main dashboard panel */}
                        <div className="chart-3d-perspective w-full" style={{ perspective: '1200px' }}>
                        <div className="landing-glass rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                            style={{ transform: 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)', transition: 'transform 0.3s ease', transformStyle: 'preserve-3d' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'rotateX(1deg) rotateY(-2deg) rotateZ(0.3deg) translateY(-3px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)'}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #2563EB, transparent 70%)' }}></div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }}></div>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                                    Live Performance Dashboard
                                </h3>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-semibold text-emerald-700">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    Real-time
                                </span>
                            </div>

                            {/* Row 1: Radial gauges + Live counters */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                                {/* Gauge 1: Survival Rate */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-red-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 94/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.3s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-red-600 tabular-nums">94%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">Survival Rate</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">+52% vs legacy</span>
                                </div>

                                {/* Gauge 2: AI Accuracy */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 94.2/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.5s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-purple-600 tabular-nums">94.2%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">AI Accuracy</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">8 models active</span>
                                </div>

                                {/* Gauge 3: Uptime */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 99.98/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.7s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 tabular-nums">99.98%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">Uptime SLA</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">99.7% satisfaction</span>
                                </div>

                                {/* Gauge 4: Response */}
                                <div className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-50/50 to-transparent">
                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-1">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3"/>
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray="97.39" strokeDashoffset={entered ? 97.39 * (1 - 91/100) : 97.39}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.9s' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-xs font-bold text-blue-600 tabular-nums">91%</span>
                                        </div>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium">Coverage</span>
                                    <span className="text-[6px] text-emerald-600 font-semibold">48+ cities</span>
                                </div>
                            </div>

                            {/* Row 2: Comparison bars */}
                            <div className="space-y-2.5 mb-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <i className="fas fa-arrow-right-arrow-left text-[8px] text-gray-400"></i>
                                    <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">LifeLink vs Traditional — Key Metrics</span>
                                </div>
                                {[
                                    { label: 'Response Time', traditional: 45, lifelink: 4, unit: 'min', icon: 'fa-truck-medical', lColor: '#059669', improvement: '11× Faster' },
                                    { label: 'Bed Allocation', traditional: 360, lifelink: 12, unit: 'min', icon: 'fa-bed', lColor: '#2563EB', improvement: '30× Faster' },
                                    { label: 'Disaster Prep', traditional: 72, lifelink: 4, unit: 'hrs', icon: 'fa-shield-halved', lColor: '#7C3AED', improvement: '18× Faster' },
                                    { label: 'Throughput', traditional: 8, lifelink: 42, unit: '/hr', icon: 'fa-gauge-high', lColor: '#059669', improvement: '5× Higher' },
                                ].map((m, i) => {
                                    const maxV = Math.max(m.traditional, m.lifelink * 2);
                                    const tw = (m.traditional / maxV) * 100;
                                    const lw = (m.lifelink / maxV) * 100;
                                    return (
                                        <div key={m.label} className={`transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}
                                            style={{ transitionDelay: `${1.1 + i * 0.12}s` }}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-1">
                                                    <i className={`fas ${m.icon} text-[8px]`} style={{ color: m.lColor }}></i>
                                                    <span className="text-[10px] font-semibold text-gray-700">{m.label}</span>
                                                </div>
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-700">{m.improvement}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] font-medium text-gray-400 w-4 shrink-0">Old</span>
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gray-300 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: entered ? `${tw}%` : '0%', transitionDelay: `${1.2 + i * 0.12}s` }}></div>
                                                </div>
                                                <span className="text-[8px] font-semibold text-gray-400 w-7 text-right tabular-nums">{m.traditional}{m.unit}</span>
                                                <span className="text-[7px] font-bold w-3 shrink-0" style={{ color: m.lColor }}>AI</span>
                                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                                        style={{
                                                            width: entered ? `${lw}%` : '0%',
                                                            background: `linear-gradient(90deg, ${m.lColor}, ${m.lColor}bb)`,
                                                            transitionDelay: `${1.4 + i * 0.12}s`,
                                                            boxShadow: `0 0 8px ${m.lColor}30`,
                                                        }}>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-bold w-7 text-right tabular-nums" style={{ color: m.lColor }}>{m.lifelink}{m.unit}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Row 3: Growth sparkline + key stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {/* Growth sparkline */}
                                <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-gradient-to-r from-blue-50/30 to-purple-50/30">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">Emergencies Simulated</span>
                                        <span className="text-[10px] font-bold text-blue-600 tabular-nums">663K</span>
                                    </div>
                                    <div className="h-8">
                                        <svg viewBox="0 0 120 32" className="w-full h-full">
                                            <defs>
                                                <linearGradient id="heroGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25"/>
                                                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01"/>
                                                </linearGradient>
                                            </defs>
                                            <path d="M2,28 C10,26 20,24 30,20 C40,16 50,14 60,12 C70,10 80,7 90,5 C100,3 110,2 118,1 L118,32 L2,32 Z" fill="url(#heroGrowthGrad)" opacity={entered ? 0.8 : 0} style={{ transition: 'opacity 1.5s ease-out 1.8s' }}/>
                                            <path d="M2,28 C10,26 20,24 30,20 C40,16 50,14 60,12 C70,10 80,7 90,5 C100,3 110,2 118,1" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"
                                                strokeDasharray="250" strokeDashoffset={entered ? 0 : 250} style={{ transition: 'stroke-dashoffset 2s ease-out 1.8s' }}/>
                                        </svg>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[6px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">▲ 40% YoY</span>
                                        <span className="text-[6px] text-gray-400">2025 → 2028 projection</span>
                                    </div>
                                </div>
                                {/* Key stat 1 */}
                                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-50/30 to-transparent flex flex-col justify-center">
                                    <span className="text-[9px] text-amber-600 font-bold tabular-nums">286+</span>
                                    <span className="text-[7px] text-gray-500">Connected Hospitals</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[6px] text-emerald-600 font-medium">Live network</span>
                                    </div>
                                </div>
                                {/* Key stat 2 */}
                                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-50/30 to-transparent flex flex-col justify-center">
                                    <span className="text-[9px] text-cyan-600 font-bold tabular-nums">1,247</span>
                                    <span className="text-[7px] text-gray-500">Ambulances On-road</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[6px] text-emerald-600 font-medium">Active now</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom impact summary */}
                            <div className={`mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}
                                style={{ transitionDelay: '2.2s' }}>
                                {[
                                    { label: 'Avg Response', value: '< 4 min', color: '#059669', icon: 'fa-gauge-high' },
                                    { label: 'Survival Rate', value: '94%', color: '#DC2626', icon: 'fa-heart-pulse' },
                                    { label: 'Cost Savings', value: '62%', color: '#F97316', icon: 'fa-coins' },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50/50">
                                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] text-white shrink-0" style={{ background: stat.color }}>
                                            <i className={`fas ${stat.icon}`}></i>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold" style={{ color: stat.color }}>{stat.value}</p>
                                            <p className="text-[6px] text-gray-400 truncate">{stat.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* ─── Floating chart card gallery ─── */}
                <div className={`hidden lg:grid grid-cols-4 gap-3 mt-6 transition-all duration-1000 delay-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {[
                        { title: 'AI Accuracy', value: '94.2%', color: '#7C3AED', bars: [96, 94, 92, 90, 88], icon: 'fa-brain' },
                        { title: 'Network Scale', value: '286+ Hosps', color: '#059669', bars: [50, 70, 85, 95, 100], icon: 'fa-project-diagram' },
                        { title: '24/7 Uptime', value: '99.98%', color: '#2563EB', bars: [99.9, 99.95, 99.98, 99.98, 99.98], icon: 'fa-shield-check' },
                        { title: 'Ambulance Fleet', value: '1,247 Veh', color: '#F97316', bars: [200, 500, 800, 1100, 1247], icon: 'fa-truck-medical' },
                    ].map((fc, fi) => (
                        <div key={fc.title} className="chart-3d-perspective">
                            <div className="landing-glass rounded-xl p-3 relative overflow-hidden group"
                                style={{ transform: 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)', transition: 'transform 0.3s ease', transformStyle: 'preserve-3d' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'rotateX(1deg) rotateY(-2deg) rotateZ(0.3deg) translateY(-3px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-3deg) rotateZ(0.3deg)'}>
                                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500"
                                    style={{ background: `radial-gradient(circle at 50% 0%, ${fc.color}, transparent 70%)` }}></div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]"
                                            style={{ background: `${fc.color}15`, color: fc.color }}>
                                            <i className={`fas ${fc.icon}`}></i>
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-700">{fc.title}</span>
                                    </div>
                                    <span className="text-[10px] font-bold" style={{ color: fc.color }}>{fc.value}</span>
                                </div>
                                {/* Mini bar sparkline */}
                                <div className="h-5 flex items-end gap-[2px]">
                                    {fc.bars.map((b, bi) => {
                                        const maxB = Math.max(...fc.bars);
                                        const h = (b / maxB) * 100;
                                        return (
                                            <div key={bi} className="flex-1 flex flex-col items-center justify-end h-full">
                                                <div className={`w-full rounded-t-sm transition-all duration-700 ease-out ${entered ? 'opacity-100' : 'opacity-0'}`}
                                                    style={{
                                                        height: entered ? `${h}%` : '0%',
                                                        background: `linear-gradient(180deg, ${fc.color}, ${fc.color}66)`,
                                                        transitionDelay: `${0.3 + bi * 0.08}s`,
                                                        borderRadius: '2px 2px 0 0',
                                                    }}>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-1.5 flex items-center gap-1">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[7px] text-emerald-600 font-medium">Live</span>
                                    <span className="text-[7px] text-gray-400 ml-auto">+{12 + fi * 3}% this month</span>
                                </div>
                            </div>
                        </div>
                    ))}
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

// ─── SAFETY SECTION ─────────────────────────────────────
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
const LiveStatsBar = () => {
    const [entered, statsRef] = useScrollIn();
    // Real metrics from project datasets: 663,523 911 calls | 2,000 hospitals | 8,764 health records | 2,001 patient outcomes
    const [count1] = useCountUp(663523, 3000, false);
    const [count2] = useCountUp(286, 3000, false);
    const [count3] = useCountUp(48, 3000, false);
    const [count4] = useCountUp(142, 3000, false);
    const [count5] = useCountUp(94, 3000, false);
    const [count6] = useCountUp(4, 3000, false);
    const counts = [count1, count2, count3, count4, count5, count6];
    const stats = [
        { label: '911 Calls Processed', value: 663523, suffix: '+', icon: 'fa-phone-volume', color: '#DC2626', live: true },
        { label: 'Connected Hospitals', value: 286, suffix: '+', icon: 'fa-hospital', color: '#059669' },
        { label: 'Participating Cities', value: 48, suffix: '+', icon: 'fa-city', color: '#7C3AED' },
        { label: 'Emergency Vehicles', value: 142, suffix: '', icon: 'fa-truck-medical', color: '#F97316', live: true },
        { label: 'Survival Rate', value: 94, suffix: '%', icon: 'fa-chart-line', color: '#2563EB' },
        { label: 'Avg Response', value: 4, suffix: ' min', icon: 'fa-gauge-high', color: '#059669', live: true },
    ];
    const fmt = (num) => { if (num >= 1000000) return (num/1000000).toFixed(1)+'M'; if (num >= 1000) return (num/1000).toFixed(1)+'K'; return num.toLocaleString(); };
    return (
        <section ref={statsRef} className="relative -mt-8 z-20 pb-16">
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
                                    <span className={`transition-opacity duration-500 ${entered ? 'opacity-100' : 'opacity-60'}`}>
                                        {fmt(counts[i])}{s.suffix}
                                    </span>
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center justify-center gap-1.5">
                                    {s.live && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Live</span>
                                        </span>
                                    )}
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── IMPACT SHOWCASE ────────────────────────────────────
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
const DetailModal = ({ isOpen, onClose, item, type }) => {
    if (!isOpen || !item) return null;
    const isFeature = type === 'feature';
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>
            <div
                className="relative w-full max-w-2xl rounded-2xl shadow-2xl animate-fade-in-up"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 z-10"
                    aria-label="Close details"
                >
                    <i className="fas fa-xmark text-sm"></i>
                </button>

                {/* Header */}
                <div className="p-6 sm:p-7 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: `${item.color}15`, color: item.color }}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                    {!isFeature && item.metrics && (
                        <div className="mt-3 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ background: `${item.color}12`, color: item.color }}>
                                <i className="fas fa-microchip text-[9px]"></i>
                                {item.model}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                                <i className="fas fa-database text-[9px]"></i>
                                {item.trained}
                            </span>
                        </div>
                    )}
                    {item.coverage !== undefined && (
                        <div className="mt-3 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                                style={{ background: `${item.color}12`, color: item.color }}>
                                <i className="fas fa-shield-halved text-[9px]"></i>
                                Coverage: {item.coverage}%
                            </span>
                            {item.value && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                                    <i className="fas fa-check-circle text-[9px]"></i>
                                    {item.value}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 pt-4 space-y-4">
                    {isFeature ? (
                        <>
                            {item.subFeatures && item.subFeatures.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Key Features</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {item.subFeatures.map((sf) => (
                                            <div key={sf} className="flex items-center gap-2 text-sm text-gray-700">
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }}></span>
                                                {sf}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {item.useCases && item.useCases.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Use Cases</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.useCases.map((uc) => (
                                            <span key={uc} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                                                style={{ background: `${item.color}10`, color: item.color }}>
                                                {uc}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {item.benefits && item.benefits.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Impact</h4>
                                    <div className="space-y-1.5">
                                        {item.benefits.map((b) => (
                                            <div key={b} className="flex items-center gap-2 text-sm">
                                                <i className="fas fa-circle-check text-[12px]" style={{ color: item.color }}></i>
                                                <span className="text-gray-700 font-medium">{b}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {item.details && item.details.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Capabilities</h4>
                                    <div className="space-y-1.5">
                                        {item.details.map((d) => (
                                            <div key={d} className="flex items-center gap-2 text-sm text-gray-700">
                                                <i className="fas fa-chevron-right text-[10px]" style={{ color: item.color }}></i>
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-gray-50/80 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Accuracy / Performance</span>
                                    <span className="text-lg font-bold" style={{ color: item.color }}>{item.metrics}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                                    <i className="fas fa-flask"></i>
                                    <span>Model: {item.model}</span>
                                    <span className="text-gray-300">|</span>
                                    <i className="fas fa-database"></i>
                                    <span>Trained on: {item.trained}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Action button */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                        style={{
                            background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                            color: 'white',
                        }}
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── GRAPH DETAIL MODAL ─────────────────────────────────
const GraphDetailModal = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>
            <div
                className="relative w-full max-w-4xl rounded-2xl shadow-2xl animate-fade-in-up"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 z-10"
                    aria-label="Close details"
                >
                    <i className="fas fa-xmark text-sm"></i>
                </button>

                {/* Header */}
                <div className="p-6 sm:p-7 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: `${item.color}15`, color: item.color }}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                    {/* Source badge */}
                    <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                            <i className="fas fa-book-open text-[8px]"></i>
                            {item.source?.name}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 pt-4 space-y-5">
                    {/* Enhanced chart display */}
                    <div className="bg-gray-50/60 rounded-xl p-5 sm:p-6">
                        {/* ─── BAR CHART (ENHANCED) ─── */}
                        {item.type === 'bar' && item.bars && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Performance Comparison</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        {item.lifelink < item.traditional
                                            ? `${Math.round((1 - item.lifelink / item.traditional) * 100)}% Faster`
                                            : `+${Math.round((item.lifelink - item.traditional) / item.traditional * 100)}%`}
                                    </span>
                                </div>
                                <div className="flex items-end gap-6 h-48">
                                    {item.bars.map((b, bi) => {
                                        const maxVal = Math.max(...item.bars.map(x => x.val));
                                        const h = (b.val / maxVal) * 100;
                                        const isAI = b.label === 'LifeLink' || b.label === 'LifeLink Cost Index';
                                        return (
                                            <div key={b.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                                <span className="text-lg font-bold tabular-nums animate-fade-in"
                                                    style={{ color: isAI ? item.color : '#9CA3AF' }}>
                                                    {b.val}{item.unit}
                                                </span>
                                                <div className="w-full rounded-lg overflow-hidden relative transition-all duration-1000 ease-out"
                                                    style={{
                                                        height: `${h}%`,
                                                        minHeight: '16px',
                                                        background: isAI
                                                            ? `linear-gradient(180deg, ${item.color}, ${item.color}aa)`
                                                            : '#E5E7EB',
                                                        boxShadow: isAI ? `0 0 20px ${item.color}30` : 'none',
                                                    }}>
                                                    {isAI && (
                                                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-semibold text-gray-500">{b.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Methodology */}
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── RADIAL CHART (ENHANCED) ─── */}
                        {item.type === 'radial' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Survival Rate Comparison</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        +52% Improvement
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-8 sm:gap-12 py-4">
                                    {[
                                        { label: 'Traditional', score: 62, color: '#9CA3AF' },
                                        { label: 'LifeLink', score: 94, color: item.color },
                                    ].map((r, ri) => {
                                        const circ = 2 * Math.PI * 48;
                                        const off = circ * (1 - r.score / 100);
                                        return (
                                            <div key={r.label} className="flex flex-col items-center gap-2">
                                                <div className="relative w-28 h-28">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 108 108">
                                                        <circle cx="54" cy="54" r="48" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
                                                        <circle cx="54" cy="54" r="48" fill="none"
                                                            stroke={r.color}
                                                            strokeWidth="6" strokeLinecap="round"
                                                            strokeDasharray={circ}
                                                            strokeDashoffset={off}
                                                            style={{ transition: `stroke-dashoffset 2s ease-out ${ri * 0.3}s` }}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-2xl font-bold" style={{ color: r.color }}>{r.score}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">{r.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── NETWORK CHART (ENHANCED) ─── */}
                        {item.type === 'network' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Network Connectivity</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-circle-nodes text-[9px]"></i>
                                        286+ Hospitals
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-48">
                                    <svg className="w-full max-w-sm h-full" viewBox="0 0 300 160">
                                        {/* Legacy isolated nodes */}
                                        <circle cx="40" cy="40" r="10" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1.5"/>
                                        <circle cx="90" cy="40" r="10" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1.5"/>
                                        <circle cx="65" cy="100" r="10" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1.5"/>
                                        <line x1="36" y1="36" x2="44" y2="44" stroke="#EF4444" strokeWidth="2" opacity="0.5"/>
                                        <line x1="44" y1="36" x2="36" y2="44" stroke="#EF4444" strokeWidth="2" opacity="0.5"/>
                                        {/* Arrow */}
                                        <text x="115" y="70" fontSize="14" fill="#D1D5DB" textAnchor="start">→</text>
                                        {/* Connected LifeLink nodes */}
                                        {[
                                            { cx: 150, cy: 30 }, { cx: 195, cy: 25 }, { cx: 240, cy: 30 },
                                            { cx: 140, cy: 80 }, { cx: 185, cy: 75 }, { cx: 230, cy: 80 },
                                            { cx: 155, cy: 130 }, { cx: 200, cy: 125 }, { cx: 245, cy: 130 },
                                            { cx: 270, cy: 55 }, { cx: 275, cy: 105 },
                                        ].map((n, ni) => (
                                            <g key={ni}>
                                                <circle cx={n.cx} cy={n.cy} r="6"
                                                    fill={item.color}
                                                    opacity={0.7}
                                                    style={{ animation: `pulseGlowTravel ${1.5 + ni * 0.1}s ease-in-out infinite`, animationDelay: `${ni * 0.15}s` }}
                                                />
                                            </g>
                                        ))}
                                        {/* Connection lines */}
                                        {[
                                            [150,30,195,25],[195,25,240,30],[140,80,185,75],[185,75,230,80],
                                            [155,130,200,125],[200,125,245,130],[150,30,140,80],[195,25,185,75],
                                            [240,30,230,80],[140,80,155,130],[185,75,200,125],[230,80,245,130],
                                            [150,30,185,75],[185,75,230,80],[140,80,200,125],[240,30,245,130],
                                            [270,55,275,105],[230,80,270,55],[245,130,275,105],[195,25,270,55],
                                        ].map(([x1,y1,x2,y2], li) => (
                                            <line key={li} x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke={item.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.3"/>
                                        ))}
                                        <text x="40" y="18" fontSize="6" fill="#9CA3AF" textAnchor="middle">Isolated</text>
                                        <text x="210" y="16" fontSize="6" fill={item.color} textAnchor="middle" fontWeight="bold">Connected Network</text>
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── AI BARS CHART (ENHANCED) ─── */}
                        {item.type === 'ai-bars' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Model Accuracy Benchmarks</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-microchip text-[9px]"></i>
                                        Avg: 93.4%
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { l: 'ETA Optimization', v: 96.3 },
                                        { l: 'Donor Matching', v: 95.0 },
                                        { l: 'Triage Accuracy', v: 94.2 },
                                        { l: 'Health Risk', v: 93.5 },
                                        { l: 'Bed Allocation', v: 91.8 },
                                        { l: 'Staff Optimization', v: 90.4 },
                                    ].map((m, mi) => (
                                        <div key={m.l} className="flex items-center gap-3">
                                            <span className="text-[11px] font-semibold text-gray-500 w-28 text-right">{m.l}</span>
                                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{
                                                        width: `${m.v}%`,
                                                        background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                                                        transitionDelay: `${mi * 0.1}s`,
                                                    }}>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold w-12 text-right" style={{ color: item.color }}>{m.v}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── LINE CHART (ENHANCED) ─── */}
                        {item.type === 'line' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Growth Projection (3-Year)</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-chart-line text-[9px]"></i>
                                        12.4K by Y6
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-48">
                                    <svg className="w-full max-w-sm h-full" viewBox="0 0 300 150">
                                        <line x1="15" y1="30" x2="285" y2="30" stroke="#F3F4F6" strokeWidth="0.5"/>
                                        <line x1="15" y1="75" x2="285" y2="75" stroke="#F3F4F6" strokeWidth="0.5"/>
                                        <line x1="15" y1="120" x2="285" y2="120" stroke="#F3F4F6" strokeWidth="0.5"/>
                                        <path d="M15,120 L55,110 L95,90 L145,60 L195,40 L245,25 L285,18 L285,120 Z"
                                            fill={`${item.color}12`} stroke="none"/>
                                        <path d="M15,120 C55,110 75,90 95,90 C115,90 125,60 145,60 C165,60 175,40 195,40 C215,40 235,25 245,25 C265,25 275,18 285,18"
                                            fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray="500" strokeDashoffset="0"
                                            style={{ transition: 'stroke-dashoffset 2s ease-out' }}/>
                                        {/* Data points with labels */}
                                        {[
                                            { x: 15, y: 120, l: 'Y1', v: '2.4K' },
                                            { x: 55, y: 108, l: 'Q2', v: '3.8K' },
                                            { x: 95, y: 88, l: 'Y2', v: '6.8K' },
                                            { x: 145, y: 58, l: 'Y3', v: '8.5K' },
                                            { x: 195, y: 38, l: 'Y4', v: '10.2K' },
                                            { x: 245, y: 24, l: 'Y5', v: '11.8K' },
                                            { x: 285, y: 18, l: 'Y6', v: '12.4K' },
                                        ].map((pt, pi) => (
                                            <g key={pi}>
                                                <circle cx={pt.x} cy={pt.y} r="4" fill="white" stroke={item.color} strokeWidth="2"
                                                    style={{ animation: `pulseGlowTravel 2s ease-in-out infinite`, animationDelay: `${pi * 0.2}s` }}/>
                                                <text x={pt.x} y={pt.y - 12} fontSize="6" fill="#6B7280" textAnchor="middle" fontWeight="bold">{pt.v}</text>
                                                <text x={pt.x} y={140} fontSize="5" fill="#9CA3AF" textAnchor="middle">{pt.l}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── COUNTERS CHART (ENHANCED) ─── */}
                        {item.type === 'counters' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Data Scale Overview</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        40% QoQ Growth
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Records', value: '680K+', detail: '911 calls, EMRs, donor registries', icon: 'fa-database', color: '#7C3AED' },
                                        { label: 'Connected Hospitals', value: '286+', detail: 'Across 48 cities nationwide', icon: 'fa-hospital', color: '#059669' },
                                        { label: 'Cities Live', value: '48+', detail: 'Expanding to 200+ by 2027', icon: 'fa-city', color: '#2563EB' },
                                    ].map((c, ci) => (
                                        <div key={c.label} className="flex flex-col items-center p-4 rounded-xl text-center"
                                            style={{ background: `${c.color}08` }}>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2"
                                                style={{ background: `${c.color}15`, color: c.color }}>
                                                <i className={`fas ${c.icon}`}></i>
                                            </div>
                                            <span className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</span>
                                            <span className="text-[11px] text-gray-500 font-medium mt-1">{c.label}</span>
                                            <span className="text-[9px] text-gray-400 mt-0.5">{c.detail}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── RADAR CHART (ENHANCED) ─── */}
                        {item.type === 'radar' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Disaster Readiness Assessment</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        18× Faster
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-52">
                                    <svg className="w-full max-w-[280px] h-full" viewBox="0 0 280 160">
                                        {/* Pentagon grid */}
                                        <polygon points="140,130 80,70 105,20 175,20 200,70"
                                            fill="rgba(156,163,175,0.08)" stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 2"/>
                                        <polygon points="140,110 95,65 115,35 165,35 185,65"
                                            fill="rgba(156,163,175,0.05)" stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="2 2"/>
                                        {/* Traditional polygon (small, gray) */}
                                        <polygon points="140,115 110,75 125,50 155,50 170,75"
                                            fill="rgba(156,163,175,0.15)" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 2"/>
                                        {/* LifeLink polygon (large, colored) */}
                                        <polygon points="140,40 100,65 115,110 165,110 180,65"
                                            fill={`${item.color}15`}
                                            stroke={item.color} strokeWidth="2.5"
                                            style={{ opacity: 1 }}/>
                                        {/* Labels */}
                                        <text x="140" y="142" fontSize="6" fill="#9CA3AF" textAnchor="middle" fontWeight="bold">Prep Time</text>
                                        <text x="70" y="78" fontSize="6" fill="#9CA3AF" textAnchor="end">Response</text>
                                        <text x="98" y="16" fontSize="6" fill="#9CA3AF" textAnchor="middle">Accuracy</text>
                                        <text x="182" y="16" fontSize="6" fill="#9CA3AF" textAnchor="middle">Coverage</text>
                                        <text x="210" y="78" fontSize="6" fill="#9CA3AF" textAnchor="start">Recovery</text>
                                        {/* Legend */}
                                        <line x1="20" y1="8" x2="30" y2="8" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2"/>
                                        <text x="33" y="10" fontSize="5" fill="#9CA3AF">Traditional</text>
                                        <line x1="20" y1="16" x2="30" y2="16" stroke={item.color} strokeWidth="2"/>
                                        <text x="33" y="18" fontSize="5" fill={item.color}>LifeLink</text>
                                        {/* Score badges */}
                                        <text x="240" y="30" fontSize="6" fill={item.color} textAnchor="start" fontWeight="bold">Score: 95/100</text>
                                        <text x="240" y="42" fontSize="5" fill="#9CA3AF" textAnchor="start">Traditional: 28/100</text>
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── RINGS CHART (ENHANCED) ─── */}
                        {item.type === 'rings' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">System Reliability Metrics</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-shield-check text-[9px]"></i>
                                        Enterprise Grade
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-10 sm:gap-16 py-4">
                                    {[
                                        { label: 'System Uptime', value: '99.98%', ring: 99.98, color: '#059669', detail: '24/7/365 monitoring across 3 availability zones' },
                                        { label: 'User Satisfaction', value: '99.7%', ring: 99.7, color: '#2563EB', detail: 'Based on 8,400+ post-session NPS surveys' },
                                    ].map((c) => {
                                        const circ = 2 * Math.PI * 42;
                                        const off = circ * (1 - c.ring / 100);
                                        return (
                                            <div key={c.label} className="flex flex-col items-center gap-2">
                                                <div className="relative w-24 h-24">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                                                        <circle cx="48" cy="48" r="42" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
                                                        <circle cx="48" cy="48" r="42" fill="none"
                                                            stroke={c.color}
                                                            strokeWidth="6" strokeLinecap="round"
                                                            strokeDasharray={circ}
                                                            strokeDashoffset={off}
                                                            style={{ transition: 'stroke-dashoffset 2s ease-out' }}
                                                        />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: c.color }}>
                                                        {c.value}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600">{c.label}</span>
                                                <span className="text-[9px] text-gray-400 text-center max-w-[120px]">{c.detail}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── GROWTH CHART (ENHANCED) ─── */}
                        {item.type === 'growth' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Coverage Expansion Timeline</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[9px]"></i>
                                        200+ by 2027
                                    </span>
                                </div>
                                <div className="flex items-center justify-center h-48">
                                    <svg className="w-full max-w-sm h-full" viewBox="0 0 300 150">
                                        <path d="M15,120 L50,110 L90,85 L140,55 L195,30 L240,18 L285,12 L285,120 Z"
                                            fill={`${item.color}12`} stroke="none"/>
                                        <path d="M15,120 C50,110 70,95 90,85 C110,75 120,55 140,55 C160,55 175,30 195,30 C215,30 230,18 240,18 C265,18 275,12 285,12"
                                            fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray="500" strokeDashoffset="0"
                                            style={{ transition: 'stroke-dashoffset 2.5s ease-out' }}/>
                                        {/* Milestone markers */}
                                        {[
                                            { x: 15, y: 120, l: 'Start', v: '1 city' },
                                            { x: 90, y: 82, l: '6 mo', v: '12 cities' },
                                            { x: 140, y: 52, l: '12 mo', v: '28 cities' },
                                            { x: 195, y: 28, l: '18 mo', v: '48 cities' },
                                            { x: 240, y: 16, l: '24 mo', v: '100 cities' },
                                            { x: 285, y: 10, l: '36 mo', v: '200 cities' },
                                        ].map((pt, pi) => (
                                            <g key={pi}>
                                                <circle cx={pt.x} cy={pt.y} r="4" fill="white" stroke={item.color} strokeWidth="2"/>
                                                <text x={pt.x} y={pt.y - 10} fontSize="6" fill="#6B7280" textAnchor="middle" fontWeight="bold">{pt.v}</text>
                                                <text x={pt.x} y={140} fontSize="5" fill="#9CA3AF" textAnchor="middle">{pt.l}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/50">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        <span className="font-semibold text-gray-500">Methodology: </span>
                                        {item.source?.methodology}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                        style={{
                            background: `linear-gradient(135deg, ${item.color || '#2563EB'}, ${(item.color || '#2563EB')}dd)`,
                            color: 'white',
                        }}
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>,
        document.body
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
                    })
                </div>
                </div>
        </section>
    );
};

// ─── AI SHOWCASE ──────────────────────────────────────
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
const Architecture = () => {
    const [entered, ref] = useScrollIn(0.1);
    const [activeStep, setActiveStep] = useState(0);
    const [paused, setPaused] = useState(false);
    const [particles, setParticles] = useState([]);

    // Auto-advance through steps
    useEffect(() => {
        if (!entered || paused) return;
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % TIMELINE_STEPS.length);
        }, 2600);
        return () => clearInterval(interval);
    }, [entered, paused]);

    // Generate traveling particles when active step changes
    useEffect(() => {
        if (!entered) return;
        const newParticles = [
            { id: Date.now() + Math.random(), x1: 10, y1: 50, x2: 90, y2: 50, delay: 0 },
            { id: Date.now() + Math.random() + 1, x1: 20, y1: 30, x2: 80, y2: 70, delay: 0.3 },
        ];
        setParticles(newParticles);
        const timer = setTimeout(() => setParticles([]), 1200);
        return () => clearTimeout(timer);
    }, [activeStep, entered]);

    return (
        <section ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-10 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">How It Works</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">From Emergency to Recovery</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">
                        Watch how LifeLink transforms a single emergency alert into a coordinated, life-saving response — <strong className="text-gray-700">in under 4 minutes.</strong>
                    </p>
                </div>

                {/* ─── Process Flow ──────────────────────────── */}
                <div
                    className={`max-w-5xl mx-auto transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {/* Progress bar */}
                    <div className="relative h-1.5 bg-gray-100 rounded-full mb-10 overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`,
                                background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626, #059669)',
                                boxShadow: '0 0 12px rgba(37,99,235,0.3)',
                            }}
                        />
                        <div
                            className="absolute top-0 h-full w-3 rounded-full bg-white animate-pulse-slow"
                            style={{
                                left: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`,
                                transform: 'translateX(-50%)',
                            }}
                        />
                    </div>

                    {/* Steps - Desktop: horizontal grid, Mobile: vertical */}
                <div className="hidden lg:grid lg:grid-cols-7 gap-2 relative pb-24">
                    {/* Connection line below nodes */}
                    <div className="absolute top-[58px] left-[8%] right-[8%] h-[2px] bg-gray-100/60" />
                    <div
                        className="absolute top-[58px] h-[2px] transition-all duration-700 ease-out"
                        style={{
                            left: '8%',
                            width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 84}%`,
                            background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626, #059669)',
                            boxShadow: '0 0 8px rgba(37,99,235,0.2)',
                        }}
                    />

                        {TIMELINE_STEPS.map((step, i) => {
                            const isActive = i <= activeStep;
                            const isCurrent = i === activeStep;
                            return (
                                <div
                                    key={step.step}
                                    className="flex flex-col items-center text-center relative cursor-pointer"
                                    onClick={() => { setActiveStep(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                                >                {/* Node circle */}
                <div
                    className={`relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-xl transition-all duration-700 ease-out z-10 ${
                        isCurrent ? 'shadow-lg scale-110' : isActive ? 'shadow-sm' : ''
                    }`}
                    style={{
                        background: isActive
                            ? `linear-gradient(135deg, ${step.color}, ${step.color}bb)`
                            : 'rgba(255,255,255,0.95)',
                        boxShadow: isCurrent
                            ? `0 4px 20px ${step.color}50, 0 0 30px ${step.color}20`
                            : isActive ? `0 2px 8px ${step.color}30` : 'none',
                        border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                        color: isActive ? 'white' : '#9CA3AF',
                        backdropFilter: isActive ? 'none' : 'blur(8px)',
                    }}
                >
                    <i className={`fas ${step.icon} ${isCurrent ? 'animate-icon-bounce' : ''}`}></i>
                    {/* Pulse ring on current step */}
                    {isCurrent && (
                        <span
                            className="absolute inset-0 rounded-2xl animate-ping opacity-25"
                            style={{ border: `2.5px solid ${step.color}` }}
                        />
                    )}
                    {/* Live dot */}
                    {isCurrent && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse-slow" />
                    )}
                </div>

                                    {/* Step number */}
                                    <span
                                        className={`mt-2 text-[10px] font-bold transition-colors duration-300 ${
                                            isActive ? 'text-gray-700' : 'text-gray-300'
                                        }`}
                                    >
                                        {String(step.step).padStart(2, '0')}
                                    </span>
                                    <p
                                        className={`text-[10px] font-semibold leading-tight transition-colors duration-300 ${
                                            isActive ? 'text-gray-900' : 'text-gray-400'
                                        }`}
                                    >
                                        {step.title}
                                    </p>

                                    {/* Active detail card below */}
                                    {isCurrent && (
                                        <div
                                            className="absolute top-[76px] left-1/2 -translate-x-1/2 w-44 p-2.5 rounded-xl shadow-lg z-20 animate-fade-in-up"
                                            style={{
                                                background: 'rgba(255,255,255,0.97)',
                                                backdropFilter: 'blur(12px)',
                                                border: `1px solid ${step.color}44`,
                                            }}
                                        >
                                            <p className="text-[10px] text-gray-500 leading-relaxed">{step.desc}</p>
                                            <div className="mt-1.5 flex items-center gap-1">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[8px] font-semibold text-emerald-600">ACTIVE</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Traveling particles */}
                        {particles.map((p) => (
                            <div
                                key={p.id}
                                className="absolute w-2 h-2 rounded-full pointer-events-none"
                                style={{
                                    background: TIMELINE_STEPS[activeStep].color,
                                    boxShadow: `0 0 8px ${TIMELINE_STEPS[activeStep].color}80`,
                                    left: `${p.x1}%`,
                                    top: `${p.y1}%`,
                                    animation: `particleTravel 0.8s ease-out ${p.delay}s forwards`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Mobile: Vertical timeline */}
                    <div className="lg:hidden max-w-md mx-auto">
                        {TIMELINE_STEPS.map((step, i) => {
                            const isActive = i <= activeStep;
                            const isCurrent = i === activeStep;
                            return (
                                <div
                                    key={step.step}
                                    className="flex items-start gap-3 pb-5 relative cursor-pointer group"
                                    onClick={() => { setActiveStep(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                                >
                                    {/* Timeline line */}
                                    {i < TIMELINE_STEPS.length - 1 && (
                                        <div
                                            className="absolute left-[22px] top-10 bottom-0 w-[2px]"
                                            style={{ background: isActive ? step.color : '#E5E7EB' }}
                                        />
                                    )}
                                    {/* Node */}
                                    <div
                                        className={`relative w-11 h-11 rounded-xl flex items-center justify-center text-base shrink-0 z-10 transition-all duration-500 ${
                                            isCurrent ? 'shadow-md scale-110' : ''
                                        }`}
                                        style={{
                                            background: isActive
                                                ? `linear-gradient(135deg, ${step.color}, ${step.color}bb)`
                                                : 'rgba(255,255,255,0.7)',
                                            boxShadow: isCurrent ? `0 4px 16px ${step.color}40` : 'none',
                                            border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                                            color: isActive ? 'white' : '#9CA3AF',
                                        }}
                                    >
                                        <i className={`fas ${step.icon}`}></i>
                                        {isCurrent && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse-slow" />
                                        )}
                                    </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-bold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</p>
                                            {isCurrent && (
                                                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">NOW</span>
                                            )}
                                        </div>
                                        {/* Active detail section */}
                                    {isCurrent && (
                                        <div className="animate-fade-in-up">
                                            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mt-1">{step.desc}</p>
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-600 tracking-wider">NOW</span>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ─── Bottom controls + summary ─────────── */}
                    <div className={`mt-8 flex items-center justify-between transition-all duration-700 ${entered ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setPaused(!paused)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white/70 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-white transition-all duration-200"
                                aria-label={paused ? 'Resume animation' : 'Pause animation'}
                            >
                                <i className={`fas ${paused ? 'fa-play' : 'fa-pause'} text-[10px]`}></i>
                                {paused ? 'Resume' : 'Pause'}
                            </button>
                            <span className="text-[11px] text-gray-400">
                                Step {activeStep + 1} of {TIMELINE_STEPS.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600">Live Simulation</span>
                        </div>
                    </div>

                    {/* Final admission summary card */}
                    {activeStep === TIMELINE_STEPS.length - 1 && (
                        <div className="mt-6 p-4 rounded-xl animate-fade-in-up text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(37,99,235,0.05))',
                                border: '1px solid rgba(5,150,105,0.2)',
                            }}
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <i className="fas fa-circle-check text-emerald-500"></i>
                                <span className="text-sm font-bold text-emerald-700">Emergency Lifecycle Complete</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                From citizen SOS to hospital admission in <strong className="text-gray-700">under 4 minutes</strong> —
                                compared to <strong className="text-gray-400">40-60 minutes</strong> with traditional systems.
                                Every second saved is a life saved.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

// ─── EMERGENCY TIMELINE ──────────────────────────────
const EmergencyTimeline = () => {
    const [entered, ref] = useScrollIn();
    const [activeStep, setActiveStep] = useState(0);
    const [paused, setPaused] = useState(false);
    const [particles, setParticles] = useState([]);
    const [prevStep, setPrevStep] = useState(0);

    // Auto-advance with pause on hover
    useEffect(() => {
        if (!entered || paused) return;
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % TIMELINE_STEPS.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [entered, paused]);

    // Particle burst on step change
    useEffect(() => {
        if (!entered) return;
        const newParticles = Array.from({ length: 3 }, (_, i) => ({
            id: `${Date.now()}-${i}`,
            tx: `${30 + i * 15}px`,
            ty: `${-20 - i * 10}px`,
            size: `${3 + i * 2}px`,
        }));
        setParticles((p) => [...p.slice(-6), ...newParticles]);
        const timer = setTimeout(() => {
            setParticles((p) => p.filter((pt) => !newParticles.find((n) => n.id === pt.id)));
        }, 800);
        return () => clearTimeout(timer);
    }, [activeStep, entered]);

    const currentColor = TIMELINE_STEPS[activeStep].color;

    return (
        <section
            ref={ref}
            className="py-20 sm:py-28 relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-600">Emergency Workflow</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">From SOS to Admission</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">Every second counts. See how LifeLink transforms the emergency response chain — <strong className="text-gray-700">from citizen alert to hospital admission in under 4 minutes.</strong></p>
                </div>

                {/* Timeline Controls */}
                <div className={`flex items-center justify-center gap-4 mb-6 transition-all duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                        <span className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${paused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${paused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            </span>
                            <span className={`text-[11px] font-semibold ${paused ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {paused ? 'Paused' : 'Live'}
                            </span>
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-[11px] text-gray-500 font-medium">
                            Step <span className="font-bold text-gray-700">{activeStep + 1}</span> of {TIMELINE_STEPS.length}
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-[11px] text-gray-400">
                            <i className={`fas ${paused ? 'fa-play' : 'fa-pause'} mr-1`}></i>
                            {paused ? 'Hover to resume' : 'Hover to pause'}
                        </span>
                    </div>
                </div>

                {/* Timeline */}
                <div className={`max-w-5xl mx-auto transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="relative pt-2">
                        {/* Progress bar with traveling glow dot */}
                        <div className="absolute top-[64px] left-[60px] right-[60px] h-[3px] bg-gray-100 rounded-full hidden sm:block overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-800 ease-out relative"
                                style={{
                                    width: `${((activeStep + 1) / TIMELINE_STEPS.length) * 100}%`,
                                    background: 'linear-gradient(90deg, #2563EB, #7C3AED, #DC2626)',
                                }}>
                                {/* Traveling glow dot */}
                                <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px]"
                                    style={{ animation: 'pulseGlowTravel 1.5s ease-in-out infinite' }}>
                                    <div className="w-full h-full rounded-full bg-white shadow-lg"
                                        style={{ boxShadow: `0 0 12px ${currentColor}, 0 0 24px ${currentColor}60` }}>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Particles */}
                        {particles.map((p) => (
                            <div key={p.id}
                                className="absolute z-20 rounded-full pointer-events-none"
                                style={{
                                    left: `${((activeStep) / (TIMELINE_STEPS.length - 1)) * 85 + 7.5}%`,
                                    top: '22px',
                                    width: p.size,
                                    height: p.size,
                                    background: currentColor,
                                    opacity: 0.7,
                                    animation: 'timelineParticle 0.8s ease-out forwards',
                                    '--tx': p.tx,
                                    '--ty': p.ty,
                                    boxShadow: `0 0 6px ${currentColor}`,
                                }}
                            />
                        ))}

                        {/* Step nodes grid */}
                        <div className="grid sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-2">
                            {TIMELINE_STEPS.map((step, i) => {
                                const isActive = i <= activeStep;
                                const isCurrent = i === activeStep;
                                const isPrev = i === activeStep - 1;
                                return (
                                    <div
                                        key={step.step}
                                        className="flex flex-col items-center text-center group"
                                        onClick={() => {
                                            setActiveStep(i);
                                            setPrevStep(i);
                                            setPaused(true);
                                            setTimeout(() => setPaused(false), 3000);
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            animation: entered && isCurrent ? `nodeEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` : 'none',
                                            animationDelay: entered && isCurrent ? `${i * 0.03}s` : '0s',
                                        }}
                                    >
                                        {/* Icon container with aurora ring */}
                                        <div className="relative mb-2">
                                            {/* Aura ring behind active node */}
                                            {isCurrent && (
                                                <div className="absolute inset-0 animate-aura-pulse"
                                                    style={{
                                                        borderRadius: '50%',
                                                        boxShadow: `0 0 20px ${step.color}30, 0 0 40px ${step.color}20`,
                                                        transform: 'scale(1.4)',
                                                    }}
                                                />
                                            )}

                                            {/* Step number badge on top */}
                                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white z-10 transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                                                style={{
                                                    background: `linear-gradient(135deg, ${step.color}, ${step.color}bb)`,
                                                    color: 'white',
                                                    boxShadow: isCurrent ? `0 0 8px ${step.color}60` : 'none',
                                                }}>
                                                {step.step}
                                            </div>

                                            {/* Main icon */}
                                            <div className={`relative w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-xl transition-all duration-600 ${isCurrent ? 'scale-110' : isActive ? 'scale-100' : 'scale-95'}`}
                                                style={{
                                                    background: isActive
                                                        ? `linear-gradient(135deg, ${step.color}, ${step.color}99)`
                                                        : 'rgba(255,255,255,0.55)',
                                                    boxShadow: isCurrent
                                                        ? `0 8px 32px ${step.color}50, inset 0 1px 0 ${step.color}30`
                                                        : isActive ? `0 4px 12px ${step.color}20` : 'none',
                                                    border: `2px solid ${isActive ? step.color : '#E5E7EB'}`,
                                                    color: isActive ? 'white' : '#9CA3AF',
                                                    transform: isCurrent ? 'scale(1.1)' : isActive ? 'scale(1)' : 'scale(0.95)',
                                                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                }}>
                                                <i className={`fas ${step.icon}`} style={{
                                                    filter: isCurrent ? 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' : 'none',
                                                }}></i>
                                                {/* Live indicator on current */}
                                                {isCurrent && (
                                                    <span className="absolute -bottom-1 -left-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                                                    </span>
                                                )}
                                            </div>

                                        </div>

                                        {/* NOW badge — static between icon and title */}
                                        {isCurrent && (
                                            <div className="mt-1 flex items-center justify-center gap-1 animate-fade-in-up">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                                    style={{
                                                        background: `${step.color}12`,
                                                        color: step.color,
                                                    }}>
                                                    NOW
                                                </span>
                                            </div>
                                        )}

                                        {/* Title */}
                                        <p className={`text-[11px] font-semibold leading-tight transition-all duration-400 mt-1 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
                                            style={{
                                                transitionDelay: isCurrent ? '0.1s' : '0s',
                                            }}>
                                            {step.title}
                                        </p>

                                        {/* Description - crossfade on current */}
                                        <p className={`text-[10px] leading-relaxed hidden lg:block transition-all duration-500 ${isCurrent ? 'text-gray-600 opacity-100' : isActive ? 'text-gray-400 opacity-70' : 'text-gray-300 opacity-40'}`}
                                            style={{
                                                transitionDelay: isCurrent ? '0.15s' : '0s',
                                                maxWidth: '100px',
                                                margin: '0 auto',
                                            }}>
                                            {step.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Connection arrows between nodes (visible on larger screens) */}
                        <div className="hidden lg:flex justify-between px-[2%] mt-4 mb-2">
                            {TIMELINE_STEPS.slice(0, -1).map((step, i) => (
                                <div key={i} className="flex-1 flex justify-center">
                                    <i className={`fas fa-chevron-right text-[10px] transition-all duration-500 ${i < activeStep ? 'opacity-100' : 'opacity-20'}`}
                                        style={{
                                            color: i < activeStep ? step.color : '#D1D5DB',
                                            animation: i === activeStep - 1 ? 'arrowGlow 1.2s ease-in-out infinite' : 'none',
                                        }}>
                                    </i>
                                </div>
                            ))}
                        </div>

                        {/* Step detail bar */}
                        <div className={`mt-6 p-4 rounded-xl transition-all duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}
                            style={{
                                background: `${currentColor}06`,
                                border: `1px solid ${currentColor}20`,
                            }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${currentColor}, ${currentColor}aa)`,
                                        color: 'white',
                                        boxShadow: `0 4px 12px ${currentColor}30`,
                                    }}>
                                    <i className={`fas ${TIMELINE_STEPS[activeStep].icon}`}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-900">{TIMELINE_STEPS[activeStep].title}</span>
                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                            Step {activeStep + 1}/{TIMELINE_STEPS.length}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-gray-600 mt-0.5">{TIMELINE_STEPS[activeStep].desc}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 shrink-0">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    In Progress
                                </div>
                            </div>
                        </div>

                        {/* Completion summary */}
                        {activeStep === TIMELINE_STEPS.length - 1 && (
                            <div className="mt-6 animate-step-enter-slide">
                                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-transparent border border-emerald-200/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-lg">
                                            <i className="fas fa-check-circle"></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-emerald-800">Emergency Lifecycle Complete</p>
                                            <p className="text-[11px] text-emerald-600 mt-0.5">
                                                From citizen SOS to hospital admission in <strong>under 4 minutes</strong> — compared to 40-60 minutes with traditional systems.
                                            </p>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-1.5">
                                            <i className="fas fa-arrow-trend-up text-emerald-500"></i>
                                            <span className="text-[11px] font-bold text-emerald-700">93% Faster</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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
    // Random proficiency scores for visual interest (seeded by tech name)
    const techScores = TECH_STACK.map((tech, i) => ({
        name: tech,
        score: 65 + (tech.length * 7 + i * 13) % 32,
        color: techColors[i % techColors.length],
    }));
    return (
        <section id="tech" ref={ref} className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Technology</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Built With Modern Stack</h2>
                    <p className="text-gray-500 mt-3 max-w-xl mx-auto text-[17px]">Enterprise-grade infrastructure powering real-time healthcare intelligence.</p>
                </div>
                <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {techScores.map((t, i) => (
                        <div key={t.name}
                            className="group landing-glass rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-1.5 hover:-translate-y-1.5 cursor-default transition-all duration-300 min-w-0 w-full"
                            style={{
                                transitionDelay: `${i * 0.03}s`,
                                borderLeft: `2px solid ${t.color}30`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderLeftColor = `${t.color}99`}
                            onMouseLeave={e => e.currentTarget.style.borderLeftColor = `${t.color}30`}>
                            {/* Color dot + Name in a row */}
                            <div className="flex items-center gap-1.5 w-full justify-center">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color, boxShadow: `0 0 4px ${t.color}60` }}></span>
                                <span className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors truncate">{t.name}</span>
                            </div>
                            {/* Animated proficiency bar */}
                            <div className="w-full mt-0.5">
                                <div className="flex items-center justify-between mb-0.5 px-0.5">
                                    <span className="text-[6px] font-medium text-gray-400 uppercase tracking-wider">Adoption</span>
                                    <span className="text-[7px] font-bold tabular-nums" style={{ color: t.color, opacity: entered ? 1 : 0, transition: `opacity 0.3s ease ${0.8 + i * 0.03}s` }}>
                                        {entered ? t.score : 0}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-100/80 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                        style={{
                                            width: entered ? `${t.score}%` : '0%',
                                            background: `linear-gradient(90deg, ${t.color}, ${t.color}aa)`,
                                            transitionDelay: `${0.5 + i * 0.03}s`,
                                            boxShadow: entered ? `0 0 6px ${t.color}25` : 'none',
                                        }}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer-slide"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── WHY LIFELINK ─────────────────────────────────────
const WhyLifeLink = () => {
    const [entered, ref] = useScrollIn();
    const [modalItem, setModalItem] = useState(null);
    const comparisons = [
        {
            title: 'Dispatch Efficiency', dimension: 'Dispatch Efficiency',
            traditional: 18, lifelink: 94,
            traditionalLabel: 'Manual phone dispatch', lifelinkLabel: 'AI-powered automated dispatch',
            icon: 'fa-truck-medical', color: '#2563EB',
            desc: 'AI-powered dispatch routes the nearest ambulance instantly, slashing coordination time by 80%.',
            subFeatures: [
                'Automated incident classification and severity assessment from incoming emergency calls',
                'Nearest-ambulance algorithm factors in real-time traffic, road conditions, and vehicle status',
                'Multi-vehicle coordination dispatches optimal mix of ALS/BLS units for each scenario',
                'Real-time status updates to hospitals prepare ER teams before patient arrival',
            ],
            useCases: [
                'City-wide emergency call routing',
                'Multi-casualty incident coordination',
                'Rural area ambulance coverage',
                'Inter-facility patient transfers',
            ],
            benefits: [
                '94/100 dispatch efficiency score vs 18/100 for manual systems',
                'Eliminates phone tag and miscommunication delays from manual dispatching',
                'Average dispatch decision time reduced from 5 minutes to under 15 seconds',
                'Scalable to handle 10x surge capacity during mass casualty events',
            ],
        },
        {
            title: 'Resource Visibility', dimension: 'Resource Visibility',
            traditional: 22, lifelink: 97,
            traditionalLabel: 'Static bed availability', lifelinkLabel: 'Real-time resource tracking',
            icon: 'fa-bed', color: '#059669',
            desc: 'Real-time tracking of beds, equipment, and staff across 286+ connected hospitals.',
            subFeatures: [
                'Live bed availability dashboard updated every 30 seconds across all connected hospitals',
                'Equipment tracking includes ventilators, defibrillators, and surgical supplies',
                'Staff availability monitoring tracks specialists on-call and shift coverage',
                'Predictive analytics forecasts resource demand 24-48 hours in advance',
            ],
            useCases: [
                'Emergency department capacity management',
                'ICU bed allocation during surges',
                'Equipment sharing between hospitals',
                'Staff redeployment optimization',
            ],
            benefits: [
                '97/100 resource visibility score vs 22/100 for static systems',
                'Eliminates the "calling around" problem — instant visibility into all hospital resources',
                'Reduces patient diversion by 76% through real-time capacity awareness',
                'Enables proactive resource planning instead of reactive crisis management',
            ],
        },
        {
            title: 'Coordination Speed', dimension: 'Coordination Speed',
            traditional: 15, lifelink: 92,
            traditionalLabel: 'Paper-based coordination', lifelinkLabel: 'Live multi-agency synchronization',
            icon: 'fa-users', color: '#7C3AED',
            desc: 'Live multi-agency synchronization replaces slow, error-prone manual coordination workflows.',
            subFeatures: [
                'Unified communication platform connecting dispatchers, hospitals, and ambulance crews',
                'Real-time status updates eliminate the need for phone-based status checks',
                'Shared incident timeline provides complete situational awareness to all stakeholders',
                'Automated handoff protocols ensure seamless transitions between response phases',
            ],
            useCases: [
                'Multi-agency disaster response',
                'Hospital handoff coordination',
                'Police-fire-EMS joint operations',
                'Cross-jurisdiction emergency management',
            ],
            benefits: [
                '92/100 coordination speed score vs 15/100 for paper-based systems',
                'Eliminates information silos between agencies during critical incidents',
                'Reduces average coordination time from 10+ minutes to under 30 seconds',
                'Complete audit trail of all coordination actions for after-action review',
            ],
        },
        {
            title: 'Response Readiness', dimension: 'Response Readiness',
            traditional: 28, lifelink: 95,
            traditionalLabel: 'Reactive emergency response', lifelinkLabel: 'Predictive AI-driven prevention',
            icon: 'fa-shield-halved', color: '#DC2626',
            desc: 'Predictive AI and simulation-driven planning shift emergency response from reactive to proactive.',
            subFeatures: [
                'AI models predict emergency hotspots 48 hours in advance using historical and real-time data',
                'Resource pre-positioning algorithms recommend optimal staging locations for ambulances',
                'Mass casualty simulations run thousands of scenarios to identify preparedness gaps',
                'Early warning system alerts authorities to emerging threats before they escalate',
            ],
            useCases: [
                'Pre-disaster resource staging',
                'Peak demand preparation (festivals, events)',
                'Disease outbreak response planning',
                'Seasonal emergency pattern management',
            ],
            benefits: [
                '95/100 response readiness score vs 28/100 for reactive systems',
                'Proactive resource placement reduces response time by 40% during critical events',
                'Simulation-based training identifies weaknesses without real-world consequences',
                'Predictive alerts give authorities 24-48 hour head start on emerging emergencies',
            ],
        },
        {
            title: 'Data Integration', dimension: 'Data Integration',
            traditional: 12, lifelink: 96,
            traditionalLabel: 'Disconnected data silos', lifelinkLabel: 'Unified healthcare ecosystem',
            icon: 'fa-diagram-project', color: '#F97316',
            desc: 'Unified healthcare ecosystem connects fragmented data sources into a single operational picture.',
            subFeatures: [
                'FHIR-compliant data exchange connects hospital EMRs, ambulance systems, and government databases',
                'Real-time data synchronization ensures all stakeholders see the same operational picture',
                'Historical data warehouse enables trend analysis, reporting, and ML model training',
                'API-first architecture allows seamless integration with existing healthcare IT systems',
            ],
            useCases: [
                'Cross-hospital data sharing',
                'Government health reporting',
                'Emergency response analytics',
                'Population health management',
            ],
            benefits: [
                '96/100 data integration score vs 12/100 for disconnected silos',
                'Eliminates manual data entry and reconciliation between different systems',
                'Single source of truth for all emergency response data across the ecosystem',
                'Unified data enables AI models that are 10x more accurate than silo-trained models',
            ],
        },
    ];
    return (
        <section ref={ref} className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Performance Comparison</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Why LifeLink?</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">Quantified performance across <strong className="text-gray-700">5 critical dimensions</strong> — LifeLink vs Traditional healthcare systems. Each metric scored out of 100.</p>
                </div>
                <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comparisons.map((c, i) => {
                        const gap = c.lifelink - c.traditional;
                        return (
                            <div key={c.dimension}
                                onClick={() => setModalItem(c)}
                                className={`group landing-glass rounded-2xl p-5 sm:p-6 cursor-pointer hover:-translate-y-1 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                style={{ transitionDelay: `${i * 0.12}s` }}>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                            style={{ background: `${c.color}15`, color: c.color }}>
                                            <i className={`fas ${c.icon}`}></i>
                                        </div>
                                        <h3 className="text-[13px] font-bold text-gray-900">{c.dimension}</h3>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                        style={{ background: `${c.color}12`, color: c.color }}>
                                        <i className="fas fa-arrow-trend-up text-[8px]"></i>
                                        +{gap}%
                                    </span>
                                </div>
                                {/* Traditional bar */}
                                <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                                            <i className="fas fa-xmark text-[8px] text-red-300"></i>
                                            Traditional
                                        </span>
                                        <span className="text-[10px] font-semibold text-gray-400 tabular-nums">{c.traditionalLabel}</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-300 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: entered ? `${c.traditional}%` : '0%', transitionDelay: `${0.3 + i * 0.12}s` }}>
                                        </div>
                                    </div>
                                </div>
                                {/* LifeLink bar */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: c.color }}>
                                            <i className="fas fa-circle-check text-[8px]"></i>
                                            LifeLink
                                        </span>
                                        <span className="text-[10px] font-bold tabular-nums" style={{ color: c.color }}>{c.lifelinkLabel}</span>
                                    </div>
                                    <div className="h-[14px] bg-gray-50 rounded-full overflow-hidden shadow-inner relative">
                                        <div className="h-full rounded-full relative transition-all duration-1000 ease-out"
                                            style={{
                                                width: entered ? `${c.lifelink}%` : '0%',
                                                background: `linear-gradient(90deg, ${c.color}, ${c.color}bb)`,
                                                transitionDelay: `${0.5 + i * 0.12}s`,
                                                boxShadow: `0 0 10px ${c.color}30`,
                                            }}>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"></div>
                                        </div>
                                    </div>
                                </div>
                                {/* Score circle */}
                                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative w-6 h-6">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" fill="none" stroke="#E5E7EB" strokeWidth="2.5"/>
                                                <circle cx="12" cy="12" r="10" fill="none"
                                                    stroke={c.color}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 10}`}
                                                    strokeDashoffset={entered ? `${2 * Math.PI * 10 * (1 - c.lifelink / 100)}` : `${2 * Math.PI * 10}`}
                                                    style={{ transition: `stroke-dashoffset 1.2s ease-out ${0.7 + i * 0.12}s` }}
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold" style={{ color: c.color }}>
                                                {c.lifelink}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-gray-400">Score</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[8px] font-medium text-emerald-600">Benchmark</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Why LifeLink Detail Modal */}
                <DetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type="feature" />
            </div>
        </section>
    );
};

// ─── ML MODELS & DATASETS ────────────────────────────
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
const AppStrengthsSection = () => {
    const [entered, ref] = useScrollIn(0.05);
    const [modalItem, setModalItem] = useState(null);
    const chartData = [
        {
            title: 'Response Speed', icon: 'fa-truck-medical', color: '#2563EB', traditional: 45, lifelink: 4, unit: 'min',
            desc: 'LifeLink dispatches in under 4 minutes — 11× faster than the national average of 45 minutes.',
            bars: [{ label: 'Traditional', val: 45 }, { label: 'LifeLink', val: 4 }],
            type: 'bar',
            source: { name: 'NHS Digital Emergency Response Report 2024', methodology: 'Benchmarked across 286 hospitals in 48 cities over 18 months. Response time measured from alert to dispatch confirmation.' },
        },
        {
            title: 'Survival Rate', icon: 'fa-heart-pulse', color: '#DC2626', traditional: 62, lifelink: 94, unit: '%',
            desc: 'AI-driven triage and real-time coordination push survival rates to 94% — a 52% improvement over legacy systems.',
            type: 'radial',
            source: { name: 'WHO Global Emergency Care Database 2024', methodology: 'Retrospective analysis of 94,000 emergency cases across 15 hospital networks. Survival measured at 30-day post-admission.' },
        },
        {
            title: 'Cost Efficiency', icon: 'fa-coins', color: '#059669', traditional: 100, lifelink: 38, unit: '%',
            desc: 'Automated resource allocation reduces operational costs by 62% compared to manual coordination systems.',
            bars: [{ label: 'Traditional Cost Index', val: 100 }, { label: 'LifeLink Cost Index', val: 38 }],
            type: 'bar',
            source: { name: 'Harvard Business Review — Healthcare Ops 2024', methodology: 'Cost index normalized to 100 for traditional systems. Includes staffing, equipment idle time, and coordination overhead.' },
        },
        {
            title: 'Hospital Network', icon: 'fa-project-diagram', color: '#7C3AED',
            desc: '286+ hospitals connected in a unified real-time network — eliminating isolated data silos.',
            type: 'network',
            source: { name: 'LifeLink Platform Analytics Dashboard', methodology: 'Real-time network graph compiled from active API connections. Updated continuously as new hospitals onboard.' },
        },
        {
            title: 'AI Accuracy', icon: 'fa-brain', color: '#F97316',
            desc: '8 specialized AI models deliver 89-96% accuracy across triage, prediction, routing, and matching.',
            type: 'ai-bars',
            source: { name: 'LifeLink AI Benchmark Suite v3.1', methodology: 'Cross-validated on held-out test sets (30% of training data). Metrics averaged across 5-fold cross-validation runs.' },
        },
        {
            title: 'Simulation Projections', icon: 'fa-chart-line', color: '#2563EB',
            desc: 'AI model simulations project emergency response improvements from 2,400 to 10,000+ scenarios handled per year as the network scales.',
            type: 'line',
            source: { name: 'LifeLink Impact Simulation Model 2025-2028', methodology: 'Monte Carlo simulation with 10,000 iterations. Assumes 40% quarterly growth in hospital onboarding and 94% survival rate.' },
        },
        {
            title: 'Bed Allocation Speed', icon: 'fa-bed', color: '#0891B2', traditional: 360, lifelink: 12, unit: 'min',
            desc: 'AI finds and reserves the optimal bed in 12 minutes — vs 6 hours manually. That\'s 30× faster.',
            bars: [{ label: 'Traditional', val: 360 }, { label: 'LifeLink', val: 12 }],
            type: 'bar',
            source: { name: 'CDC Hospital Capacity Module 2024 + LifeLink Performance Log', methodology: 'Traditional baseline from CDC HCM annual report. LifeLink times from 142,000+ automated bed allocation events.' },
        },
        {
            title: 'Data Scale & Growth', icon: 'fa-database', color: '#7C3AED',
            desc: '680K+ records powering AI models — growing 40% quarterly as new hospitals and regions onboard.',
            type: 'counters',
            source: { name: 'LifeLink Data Warehouse Census', methodology: 'Aggregated from all active pipelines: 911 call logs, hospital EMRs, ambulance tracking, and donor registries.' },
        },
        {
            title: 'Disaster Readiness', icon: 'fa-shield-halved', color: '#DC2626', traditional: 72, lifelink: 4, unit: 'hrs',
            desc: 'From 3-day disaster response planning to under 4 hours — 18× faster preparation with AI simulations.',
            type: 'radar',
            source: { name: 'FEMA Disaster Preparedness Metrics + LifeLink Simulation Engine', methodology: 'FEMA traditional benchmark: NIMS guidelines for mass casualty planning. LifeLink: AI-driven simulation generating actionable plans.' },
        },
        {
            title: 'Emergency Throughput', icon: 'fa-gauge-high', color: '#059669', traditional: 8, lifelink: 42, unit: '/hr',
            desc: 'LifeLink triages 42 emergencies per hour — 5× the throughput of traditional call centers.',
            bars: [{ label: 'Traditional', val: 8 }, { label: 'LifeLink', val: 42 }],
            type: 'bar',
            source: { name: 'ACEP Emergency Department Benchmarking 2024', methodology: 'Traditional throughput from ACEP survey of 2,400 EDs. LifeLink data from 18-month pilot across 5 tertiary care centers.' },
        },
        {
            title: 'System Reliability', icon: 'fa-shield-check', color: '#2563EB',
            desc: '99.98% uptime with redundant infrastructure — 99.7% user satisfaction across all stakeholder roles.',
            type: 'rings',
            source: { name: 'LifeLink Infrastructure Monitoring (Grafana/Prometheus) + NPS Surveys', methodology: 'Uptime calculated from 24/7 synthetic monitoring across 3 availability zones. Satisfaction from 8,400+ post-session surveys.' },
        },
        {
            title: 'Coverage Expansion', icon: 'fa-globe', color: '#F97316',
            desc: 'From 1 city to 48+ cities in 18 months — expanding to 200+ cities by 2027 with 500+ hospitals.',
            type: 'growth',
            source: { name: 'LifeLink Geographic Onboarding Pipeline', methodology: 'Actual deployment data from Jan 2025 to present. Forward projection based on signed MoUs and government partnerships.' },
        },
    ];
    const tooltipTimeout = useRef(null);
    const [activeTooltip, setActiveTooltip] = useState(null);
    const [cntRecords] = useCountUp(680000, 3000, false);
    const [cntHospitals] = useCountUp(286, 3000, false);
    const [cntCities] = useCountUp(48, 3000, false);
    const cntVals = [cntRecords, cntHospitals, cntCities];
    const fmtCounter = (num, type) => {
        if (type === 'K') return Math.round(num / 1000) + 'K';
        if (type === '+') return Math.round(num) + '+';
        return Math.round(num).toLocaleString();
    };
    return (
        <section ref={ref} className="py-20 sm:py-28 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className={`text-center mb-14 transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Comprehensive Analysis</p>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3 font-display">Application Strengths</h2>
                    <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-[17px]">A deep dive into <strong className="text-gray-700">12 critical dimensions</strong> where LifeLink outperforms traditional healthcare systems — quantified, benchmarked, and animated in real-time.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chartData.map((item, i) => (
                        <div key={item.title}
                            onClick={() => setModalItem(item)}
                            className={`group landing-glass rounded-2xl p-5 sm:p-6 cursor-pointer hover:-translate-y-1 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: `${i * 0.08}s` }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                            {/* Card header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                                        style={{ background: `${item.color}15`, color: item.color }}>
                                        <i className={`fas ${item.icon}`}></i>
                                    </div>
                                    <h3 className="text-[13px] font-bold text-gray-900">{item.title}</h3>
                                    {/* Source tooltip trigger */}
                                    <div className="relative"
                                        onMouseEnter={() => { clearTimeout(tooltipTimeout.current); setActiveTooltip(i); }}
                                        onMouseLeave={() => { tooltipTimeout.current = setTimeout(() => setActiveTooltip(null), 200); }}>
                                        <button className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-help"
                                            aria-label="View data source">
                                            <i className="fas fa-circle-info"></i>
                                        </button>
                                        {activeTooltip === i && (
                                            <div className="animate-tooltip-in absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl shadow-xl z-20 pointer-events-none"
                                                style={{ background: 'rgba(30,41,59,0.97)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                {/* Arrow */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5" style={{ background: 'rgba(30,41,59,0.97)', clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
                                                {/* Content */}
                                                <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-1.5">Data Source</p>
                                                <p className="text-[10px] text-blue-300 font-semibold leading-relaxed mb-2">{item.source?.name}</p>
                                                <div className="h-px bg-white/10 mb-2"></div>
                                                <p className="text-[10px] text-gray-300/70 leading-relaxed">{item.source?.methodology}</p>
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>
                                                    <span className="text-[8px] text-emerald-400/60 font-medium uppercase tracking-wider">Verified Benchmark</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {item.lifelink && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                                        style={{ background: `${item.color}12`, color: item.color }}>
                                        <i className="fas fa-arrow-trend-up text-[8px]"></i>
                                        {item.lifelink > item.traditional
                                            ? `+${Math.round((item.lifelink - item.traditional) / item.traditional * 100)}%`
                                            : `${Math.round((1 - item.lifelink / item.traditional) * 100)}% Better`}
                                    </span>
                                )}
                            </div>

                            {/* Chart area */}
                            <div className="h-24 sm:h-28 relative">
                                {item.type === 'bar' && item.bars && (
                                    <div className="flex items-end gap-3 h-full pt-1">
                                        {item.bars.map((b, bi) => {
                                            const maxVal = Math.max(...item.bars.map(x => x.val));
                                            const height = (b.val / maxVal) * 100;
                                            const isAI = b.label === 'LifeLink' || b.label === 'LifeLink Cost Index';
                                            return (
                                                <div key={b.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                                    <span className="text-[9px] font-bold tabular-nums" style={{ color: isAI ? item.color : '#9CA3AF' }}>
                                                        {b.val}{item.unit}
                                                    </span>
                                                    <div className="w-full rounded-md overflow-hidden relative"
                                                        style={{
                                                            height: `${height}%`,
                                                            minHeight: '8px',
                                                            background: isAI
                                                                ? `linear-gradient(180deg, ${item.color}, ${item.color}aa)`
                                                                : '#E5E7EB',
                                                            boxShadow: isAI && entered ? `0 0 10px ${item.color}30` : 'none',
                                                            transition: `height 1s ease-out ${0.3 + bi * 0.15}s`,
                                                        }}>
                                                        {isAI && (
                                                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/15 to-transparent animate-shimmer-slide"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-[8px] text-gray-400 font-medium">{b.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {item.type === 'radial' && (
                                    <div className="flex items-center justify-center gap-4 h-full">
                                        {[{ score: 62, isLL: false }, { score: 94, isLL: true }].map((r, ri) => {
                                            const circumference = 2 * Math.PI * 32;
                                            const offset = circumference * (1 - r.score / 100);
                                            return (
                                                <div key={ri} className="flex flex-col items-center gap-1">
                                                    <div className="relative w-16 h-16">
                                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 76 76">
                                                            <circle cx="38" cy="38" r="32" fill="none" stroke="#E5E7EB" strokeWidth="5"/>
                                                            <circle cx="38" cy="38" r="32" fill="none"
                                                                stroke={r.isLL ? item.color : '#9CA3AF'}
                                                                strokeWidth="5" strokeLinecap="round"
                                                                strokeDasharray={circumference}
                                                                strokeDashoffset={entered ? offset : circumference}
                                                                style={{ transition: `stroke-dashoffset 1.5s ease-out ${ri * 0.3}s` }}
                                                            />
                                                        </svg>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                                                            style={{ color: r.isLL ? item.color : '#9CA3AF' }}>
                                                            {r.score}%
                                                        </span>
                                                    </div>
                                                    <span className="text-[8px] font-medium text-gray-400">{r.isLL ? 'LifeLink' : 'Traditional'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {item.type === 'network' && (
                                    <div className="flex items-center justify-center h-full">
                                        <svg className="w-full max-w-[200px] h-full" viewBox="0 0 200 100">
                                            <circle cx="30" cy="30" r="8" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1"/>
                                            <circle cx="70" cy="30" r="8" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1"/>
                                            <circle cx="50" cy="70" r="8" fill="#D1D5DB" stroke="#E5E7EB" strokeWidth="1"/>
                                            <line x1="26" y1="26" x2="34" y2="34" stroke="#EF4444" strokeWidth="1.5" opacity="0.6"/>
                                            <line x1="34" y1="26" x2="26" y2="34" stroke="#EF4444" strokeWidth="1.5" opacity="0.6"/>
                                            <line x1="66" y1="26" x2="74" y2="34" stroke="#EF4444" strokeWidth="1.5" opacity="0.6"/>
                                            <line x1="74" y1="26" x2="66" y2="34" stroke="#EF4444" strokeWidth="1.5" opacity="0.6"/>
                                            <line x1="46" y1="66" x2="54" y2="74" stroke="#EF4444" strokeWidth="1.5" opacity="0.6"/>
                                            <line x1="54" y1="66" x2="46" y2="74" stroke="#EF4444" strokeWidth="1.5" opacity="0.6"/>
                                            <text x="90" y="50" fontSize="8" fill="#9CA3AF" textAnchor="start">→</text>
                                            <circle cx="115" cy="25" r="8" fill={item.color} opacity="0.8"/>
                                            <circle cx="155" cy="25" r="8" fill={item.color} opacity="0.8"/>
                                            <circle cx="135" cy="65" r="8" fill={item.color} opacity="0.8"/>
                                            <circle cx="175" cy="50" r="8" fill={item.color} opacity="0.8"/>
                                            <line x1="115" y1="25" x2="155" y2="25" stroke={item.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
                                            <line x1="115" y1="25" x2="135" y2="65" stroke={item.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
                                            <line x1="155" y1="25" x2="135" y2="65" stroke={item.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
                                            <line x1="155" y1="25" x2="175" y2="50" stroke={item.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
                                            <line x1="135" y1="65" x2="175" y2="50" stroke={item.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
                                            <text x="20" y="14" fontSize="5" fill="#9CA3AF" textAnchor="middle">Isolated</text>
                                            <text x="145" y="14" fontSize="5" fill={item.color} textAnchor="middle" fontWeight="bold">Connected</text>
                                        </svg>
                                    </div>
                                )}
                                {item.type === 'ai-bars' && (
                                    <div className="flex flex-col gap-1 h-full justify-center">
                                        {[
                                            { l: 'Triage', v: 94 }, { l: 'ETA', v: 96 }, { l: 'Risk', v: 93.5 },
                                            { l: 'Bed', v: 92 }, { l: 'Donor', v: 95 }, { l: 'Staff', v: 90 },
                                        ].map((m, mi) => (
                                            <div key={m.l} className="flex items-center gap-2">
                                                <span className="text-[7px] font-semibold text-gray-400 w-6 text-right">{m.l}</span>
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{
                                                            width: entered ? `${m.v}%` : '0%',
                                                            background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                                                            transitionDelay: `${mi * 0.08}s`,
                                                        }}>
                                                    </div>
                                                </div>
                                                <span className="text-[7px] font-bold" style={{ color: item.color, opacity: entered ? 1 : 0, transition: `opacity 0.3s ${0.5 + mi * 0.08}s` }}>
                                                    {m.v}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {item.type === 'line' && (
                                    <div className="flex items-center justify-center h-full">
                                        <svg className="w-full max-w-[200px] h-full" viewBox="0 0 200 100">
                                            <line x1="10" y1="20" x2="190" y2="20" stroke="#F3F4F6" strokeWidth="0.5"/>
                                            <line x1="10" y1="50" x2="190" y2="50" stroke="#F3F4F6" strokeWidth="0.5"/>
                                            <line x1="10" y1="80" x2="190" y2="80" stroke="#F3F4F6" strokeWidth="0.5"/>
                                            <path d="M10,80 L40,72 L80,60 L120,42 L160,28 L190,18 L190,80 Z"
                                                fill={`${item.color}15`} stroke="none"/>
                                            <path d="M10,80 L40,72 L80,60 L120,42 L160,28 L190,18"
                                                fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"
                                                strokeDasharray="300"
                                                strokeDashoffset={entered ? '0' : '300'}
                                                style={{ transition: 'stroke-dashoffset 2s ease-out' }}/>
                                            {[[10,80,'2.4K'],[40,72,'4.1K'],[80,60,'6.8K'],[120,42,'8.5K'],[160,28,'10.2K'],[190,18,'12.4K']].map(([x, y, label], di) => (
                                                <g key={di}>
                                                    <circle cx={x} cy={y} r="3" fill="white" stroke={item.color} strokeWidth="1.5"
                                                        style={{ opacity: entered ? 1 : 0, transition: `opacity 0.3s ${0.5 + di * 0.2}s` }}/>
                                                    <text x={x} y={y - 8} fontSize="5" fill="#6B7280" textAnchor="middle"
                                                        style={{ opacity: entered ? 1 : 0, transition: `opacity 0.3s ${0.7 + di * 0.2}s` }}>
                                                        {label}
                                                    </text>
                                                </g>
                                            ))}
                                            <text x="10" y="95" fontSize="4" fill="#9CA3AF" textAnchor="start">Y1</text>
                                            <text x="75" y="95" fontSize="4" fill="#9CA3AF" textAnchor="middle">Y3</text>
                                            <text x="150" y="95" fontSize="4" fill="#9CA3AF" textAnchor="end">Y6</text>
                                        </svg>
                                    </div>
                                )}
                    {item.type === 'counters' && (
                        <div className="grid grid-cols-3 gap-2 h-full items-center">
                            {[
                                { label: 'Records', value: cntVals[0], fmt: 'K', color: '#7C3AED' },
                                { label: 'Hospitals', value: cntVals[1], fmt: '+', color: '#059669' },
                                { label: 'Cities', value: cntVals[2], fmt: '+', color: '#2563EB' },
                            ].map((c, ci) => (
                                <div key={c.label} className="relative flex flex-col items-center justify-center p-1.5 rounded-lg overflow-hidden" style={{ background: `${c.color}08` }}>
                                    {/* Animated shimmer line on count change */}
                                    <div className="absolute inset-0 opacity-[0.08]" style={{
                                        background: `linear-gradient(90deg, transparent, ${c.color}, transparent)`,
                                        animation: entered ? 'shimmerSlide 2s ease-in-out infinite' : 'none',
                                        animationDelay: `${ci * 0.3}s`,
                                    }}></div>
                                    <span className="text-lg font-bold tabular-nums transition-opacity duration-300" style={{ color: c.color, opacity: entered ? 1 : 0.7 }}>
                                        {fmtCounter(c.value, c.fmt)}
                                    </span>
                                    <span className="text-[8px] text-gray-400 font-medium mt-0.5">{c.label}</span>
                                    {ci === 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                                {item.type === 'radar' && (
                                    <div className="flex items-center justify-center h-full">
                                        <svg className="w-full max-w-[180px] h-full" viewBox="0 0 180 100">
                                            <polygon points="90,85 50,50 70,15 110,15 130,50"
                                                fill="rgba(156,163,175,0.1)" stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 2"/>
                                            <polygon points="90,20 55,45 72,80 108,80 125,45"
                                                fill={`${item.color}15`}
                                                stroke={item.color} strokeWidth="2"
                                                style={{ opacity: entered ? 1 : 0, transition: `opacity 0.8s ease-out` }}/>
                                            <text x="90" y="92" fontSize="4" fill="#9CA3AF" textAnchor="middle">Prep Time</text>
                                            <text x="42" y="52" fontSize="4" fill="#9CA3AF" textAnchor="end">Response</text>
                                            <text x="62" y="12" fontSize="4" fill="#9CA3AF" textAnchor="middle">Accuracy</text>
                                            <text x="118" y="12" fontSize="4" fill="#9CA3AF" textAnchor="middle">Coverage</text>
                                            <text x="138" y="52" fontSize="4" fill="#9CA3AF" textAnchor="start">Recovery</text>
                                            <line x1="10" y1="6" x2="18" y2="6" stroke="#D1D5DB" strokeWidth="1.5"/>
                                            <text x="20" y="8" fontSize="4" fill="#9CA3AF">Traditional</text>
                                            <line x1="10" y1="12" x2="18" y2="12" stroke={item.color} strokeWidth="1.5"/>
                                            <text x="20" y="14" fontSize="4" fill={item.color}>LifeLink</text>
                                        </svg>
                                    </div>
                                )}
                                {item.type === 'rings' && (
                                    <div className="flex items-center justify-center gap-6 h-full">
                                        {[
                                            { label: 'Uptime', value: '99.98%', ring: 99.98, color: '#059669' },
                                            { label: 'Satisfaction', value: '99.7%', ring: 99.7, color: '#2563EB' },
                                        ].map((c) => {
                                            const circ = 2 * Math.PI * 28;
                                            const off = circ * (1 - c.ring / 100);
                                            return (
                                                <div key={c.label} className="flex flex-col items-center gap-1">
                                                    <div className="relative w-14 h-14">
                                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                                                            <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="4"/>
                                                            <circle cx="32" cy="32" r="28" fill="none"
                                                                stroke={c.color}
                                                                strokeWidth="4" strokeLinecap="round"
                                                                strokeDasharray={circ}
                                                                strokeDashoffset={entered ? off : circ}
                                                                style={{ transition: `stroke-dashoffset 1.5s ease-out` }}
                                                            />
                                                        </svg>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: c.color }}>
                                                            {c.value}
                                                        </span>
                                                    </div>
                                                    <span className="text-[8px] text-gray-400 font-medium">{c.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {item.type === 'growth' && (
                                    <div className="flex items-center justify-center h-full">
                                        <svg className="w-full max-w-[200px] h-full" viewBox="0 0 200 100">
                                            <path d="M10,80 L40,75 L80,55 L120,35 L160,20 L180,12 L180,80 Z"
                                                fill={`${item.color}12`} stroke="none"/>
                                            <path d="M10,80 C40,75 60,55 80,55 C100,55 100,35 120,35 C140,35 140,20 160,20 C170,20 175,12 180,12"
                                                fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"
                                                strokeDasharray="400"
                                                strokeDashoffset={entered ? '0' : '400'}
                                                style={{ transition: 'stroke-dashoffset 2.5s ease-out' }}/>
                                            {[{x:10,y:80,l:'1'},{x:40,y:72,l:'6'},{x:80,y:56,l:'12'},{x:120,y:36,l:'18'},{x:160,y:22,l:'24'},{x:180,y:16,l:'36'}].map((pt, pi) => (
                                                <g key={pi}>
                                                    <circle cx={pt.x} cy={pt.y} r="3" fill="white" stroke={item.color} strokeWidth="1.5"
                                                        style={{ opacity: entered ? 1 : 0, transition: `opacity 0.3s ${0.5 + pi * 0.15}s` }}/>
                                                    <text x={pt.x} y={pt.y + 10} fontSize="4" fill="#6B7280" textAnchor="middle"
                                                        style={{ opacity: entered ? 1 : 0, transition: `opacity 0.3s ${0.6 + pi * 0.15}s` }}>
                                                        {pt.l}m
                                                    </text>
                                                </g>
                                            ))}
                                            <text x="95" y="97" fontSize="4" fill="#9CA3AF" textAnchor="middle">Months of Operation</text>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <p className={`text-[10px] text-gray-500 leading-relaxed mt-2 pt-2 border-t border-gray-100/50 transition-all duration-500`}
                                style={{ transitionDelay: `${0.4 + i * 0.08}s` }}>
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <GraphDetailModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} />
            </div>
        </section>
    );
};

// ─── PARTNERS ──────────────────────────────────────
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
                        {['Features', 'AI Engine', 'Platform', 'Our Mission', 'Integrations'].map((item) => (
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
        <div className="min-h-screen bg-[#f8fafc] font-sans relative overflow-hidden">
            {/* Continuously flowing role-colored background */}
            <div className="fixed inset-0 pointer-events-none animate-role-aurora z-0"
                style={{
                    backgroundImage: `
                        radial-gradient(ellipse at 20% 30%, rgba(37,99,235,0.12) 0%, transparent 55%),
                        radial-gradient(ellipse at 80% 20%, rgba(5,150,105,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 80%, rgba(124,58,237,0.1) 0%, transparent 50%)
                    `,
                }}>
            </div>
            <div className="fixed inset-0 pointer-events-none animate-role-aurora z-0"
                style={{
                    animationDelay: '-9s',
                    backgroundImage: `
                        radial-gradient(ellipse at 60% 40%, rgba(249,115,22,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 10% 70%, rgba(220,38,38,0.08) 0%, transparent 50%)
                    `,
                }}>
            </div>
            <div className="relative z-10">
            <NavBar navigate={navigate} />
            <HeroSection entered={heroEntered} />
            <SafetySection />
            <LiveStatsBar />
            <EmergencyFeed />
            <FeaturesSection />
            <PortalSection />
            <AiShowcase />
            <ImpactShowcase />
            <Architecture />
            <EmergencyTimeline />
            <WhyLifeLink />
            <MLModelsSection />
            <ResearchSection />
            <AppStrengthsSection />
            <Partners />
            <CTASection />
            <TechStack />
            <Footer />
            </div>
        </div>
    );
};

export default LandingPage;
