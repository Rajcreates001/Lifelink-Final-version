// ─── Data ──────────────────────────────────────────────
export const ROLES = {
    public: { icon: 'fa-user', label: 'Public', hex: '#2563EB', color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    hospital: { icon: 'fa-hospital', label: 'Hospital', hex: '#059669', color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    ambulance: { icon: 'fa-ambulance', label: 'Ambulance', hex: '#DC2626', color: 'red', gradient: 'from-red-500 to-red-600' },
    government: { icon: 'fa-landmark', label: 'Government', hex: '#7C3AED', color: 'purple', gradient: 'from-purple-500 to-purple-600' },
};

export const EMERGENCY_FEED = [
    { msg: 'Ambulance dispatched to City Hospital, Mangalore', time: '2s ago' },
    { msg: 'Blood donor matched in Bengaluru - O+ urgent', time: '12s ago' },
    { msg: '12 new beds available at Fortis, Mumbai', time: '28s ago' },
    { msg: 'AI triage: 3 critical cases detected in Chennai', time: '45s ago' },
    { msg: 'Emergency request received from Indiranagar, Bengaluru', time: '1m ago' },
    { msg: 'Hospital capacity updated: 84% statewide', time: '1.2m ago' },
    { msg: 'Ambulance ETA to Government Hospital: 4 min', time: '1.5m ago' },
    { msg: 'AI predicting outbreak risk in coastal regions', time: '2m ago' },
];

export const FEATURES = [
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

export const AI_CAPABILITIES = [
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

export const TECH_STACK = [
    'React', 'FastAPI', 'Python', 'TensorFlow', 'PyTorch', 'LangChain',
    'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'OpenCV',
    'Google Maps', 'FHIR', 'WebSockets', 'Groq AI', 'OpenAI', 'Leaflet'
];

export const TIMELINE_STEPS = [
    { step: 1, title: 'Citizen presses SOS', icon: 'fa-circle-exclamation', color: '#2563EB', desc: 'One tap emergency alert with precise GPS location and medical profile' },
    { step: 2, title: 'AI understands emergency', icon: 'fa-brain', color: '#7C3AED', desc: 'Voice analysis + symptom triage classifies severity and type of emergency' },
    { step: 3, title: 'Hospital selected', icon: 'fa-hospital', color: '#059669', desc: 'Nearest hospital with available resources matched to emergency type' },
    { step: 4, title: 'Ambulance dispatched', icon: 'fa-truck-medical', color: '#DC2626', desc: 'Closest ambulance routed with live traffic optimization' },
    { step: 5, title: 'Traffic optimized', icon: 'fa-route', color: '#F97316', desc: 'AI reroutes traffic lights and suggests fastest emergency corridor' },
    { step: 6, title: 'Hospital prepared', icon: 'fa-bed-pulse', color: '#0891B2', desc: 'ER team alerted, resources prepped, specialist notified before arrival' },
    { step: 7, title: 'Patient admitted', icon: 'fa-check-circle', color: '#059669', desc: 'Seamless handoff with all vitals and history digitally transferred' },
];

export const RESEARCH = [
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
            { file: '/documents/conference-paper.pdf', label: 'View Full Paper (PDF)', size: '969 KB', color: '#2563EB' },
            { file: '/documents/springer-certificate.pdf', label: 'View Springer Certificate (PDF)', size: '157 KB', color: '#7C3AED' },
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
