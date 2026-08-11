import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiFetch } from '../config/api';

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */

const SEARCH_MODES = [
  {
    key: 'quick',
    label: 'Quick Search',
    icon: '⚡',
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Fast AI-powered answers from internal & external sources',
    stages: [
      { label: 'Understanding query intent', icon: '🧠' },
      { label: 'Searching internal database', icon: '🗄️' },
      { label: 'Searching external sources', icon: '🌐' },
      { label: 'Generating AI response', icon: '✨' },
    ],
  },
  {
    key: 'deep',
    label: 'Deep Research',
    icon: '🔬',
    gradient: 'from-purple-500 to-violet-600',
    description: 'Comprehensive multi-source research with evidence ranking',
    stages: [
      { label: 'Analyzing query context', icon: '🔍' },
      { label: 'Searching internal knowledge base', icon: '📚' },
      { label: 'Scraping medical databases', icon: '🕸️' },
      { label: 'Validating against WHO/CDC guidelines', icon: '✅' },
      { label: 'Ranking evidence by trust score', icon: '📊' },
      { label: 'Generating structured analysis', icon: '📋' },
    ],
  },
  {
    key: 'clinical',
    label: 'Clinical Review',
    icon: '🩺',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Evidence-based clinical information with source verification',
    stages: [
      { label: 'Extracting medical entities', icon: '🏷️' },
      { label: 'Searching clinical publications', icon: '📰' },
      { label: 'Cross-referencing medical guidelines', icon: '📖' },
      { label: 'Verifying source authority', icon: '🛡️' },
      { label: 'Compiling clinical summary', icon: '📝' },
    ],
  },
  {
    key: 'compare',
    label: 'Compare Sources',
    icon: '📊',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Side-by-side comparison of information from multiple sources',
    stages: [
      { label: 'Identifying relevant sources', icon: '🔎' },
      { label: 'Extracting key information', icon: '📄' },
      { label: 'Aligning comparable data points', icon: '🔄' },
      { label: 'Building comparison table', icon: '📊' },
      { label: 'Generating comparative analysis', icon: '📋' },
    ],
  },
  {
    key: 'hospital',
    label: 'Hospital Intelligence',
    icon: '🏥',
    gradient: 'from-cyan-500 to-sky-600',
    description: 'Hospital data, capacity, and capability analysis',
    stages: [
      { label: 'Scanning hospital database', icon: '🏥' },
      { label: 'Checking bed availability', icon: '🛏️' },
      { label: 'Analyzing department capacity', icon: '📈' },
      { label: 'Verifying hospital credentials', icon: '✅' },
      { label: 'Generating hospital report', icon: '📋' },
    ],
  },
  {
    key: 'donor',
    label: 'Donor Intelligence',
    icon: '🩸',
    gradient: 'from-red-500 to-rose-600',
    description: 'Blood donor analysis, matching, and availability',
    stages: [
      { label: 'Analyzing blood type compatibility', icon: '🧬' },
      { label: 'Searching donor database', icon: '🗄️' },
      { label: 'Checking donor availability', icon: '📅' },
      { label: 'Estimating response times', icon: '⏱️' },
      { label: 'Ranking optimal matches', icon: '🏆' },
    ],
  },
];

const SOURCE_TRUST_SCORES = {
  WHO: { score: 100, label: 'World Health Organization', verified: true },
  CDC: { score: 99, label: 'Centers for Disease Control', verified: true },
  PubMed: { score: 98, label: 'PubMed Central', verified: true },
  NIH: { score: 98, label: 'National Institutes of Health', verified: true },
  'Government Hospital': { score: 95, label: 'Government Hospital Registry', verified: true },
  'Medical Journal': { score: 90, label: 'Peer-Reviewed Medical Journal', verified: true },
  'Clinical Trial': { score: 88, label: 'Clinical Trial Database', verified: true },
  'Hospital Portal': { score: 80, label: 'Hospital Public Portal', verified: true },
  'Medical News': { score: 70, label: 'Medical News Outlet', verified: false },
  'Health Blog': { score: 30, label: 'Personal Health Blog', verified: false },
  Unknown: { score: 50, label: 'Unverified Source', verified: false },
};

const getTrustInfo = (sourceName) => {
  const key = Object.keys(SOURCE_TRUST_SCORES).find((k) =>
    sourceName?.toLowerCase().includes(k.toLowerCase())
  );
  return SOURCE_TRUST_SCORES[key] || SOURCE_TRUST_SCORES.Unknown;
};

/* ═══════════════════════════════════════════════════════════════════════
   SEARCH PROGRESS COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const SearchProgress = ({ mode, visible }) => {
  const [currentStage, setCurrentStage] = useState(0);
  const stages = mode?.stages || SEARCH_MODES[0].stages;

  useEffect(() => {
    if (!visible) { setCurrentStage(0); return; }
    const timer = setInterval(() => {
      setCurrentStage((prev) => Math.min(prev + 1, stages.length - 1));
    }, 800);
    return () => clearInterval(timer);
  }, [visible, stages.length]);

  if (!visible) return null;

  return (
    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${mode?.gradient?.includes('emerald') ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse-slow`}
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Searching {currentStage < stages.length - 1 ? '...' : 'complete ✓'}
        </span>
        <span className="ml-auto text-[10px] text-slate-400 font-mono">
          {Math.round(((currentStage + 1) / stages.length) * 100)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${mode?.gradient || 'from-indigo-500 to-purple-600'} transition-all duration-500 ease-out`}
          style={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {stages.map((stage, i) => (
          <div
            key={stage.label}
            className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${
              i < currentStage ? 'text-emerald-600' : i === currentStage ? 'text-indigo-600 font-medium' : 'text-slate-400'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${
              i < currentStage ? 'bg-emerald-100 text-emerald-600' :
              i === currentStage ? 'bg-indigo-100 text-indigo-600 animate-pulse-slow' : 'bg-slate-100 text-slate-400'
            }`}>
              {i < currentStage ? '✓' : i === currentStage ? '○' : '○'}
            </span>
            <span className="text-[11px]">{stage.icon}</span>
            {stage.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TRUST BADGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const TrustBadge = ({ sourceName }) => {
  const trust = getTrustInfo(sourceName);
  const color = trust.score >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                trust.score >= 70 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${color}`}>
      {trust.verified ? '✓' : '⚠'} {trust.score}% {trust.verified ? 'Trusted' : 'Unverified'}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   CONFIDENCE GAUGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const ConfidenceGauge = ({ value, label = 'AI Confidence', size = 'sm' }) => {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? 'stroke-emerald-500' : pct >= 60 ? 'stroke-amber-500' : 'stroke-red-500';
  const trackColor = pct >= 80 ? 'stroke-emerald-100' : pct >= 60 ? 'stroke-amber-100' : 'stroke-red-100';
  const dim = size === 'sm' ? 32 : 48;
  const stroke = size === 'sm' ? 3 : 4;
  const r = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-1.5">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" className={trackColor} strokeWidth={stroke} />
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" className={`${color} transition-all duration-1000 ease-out`} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div>
        <span className={`font-bold ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>{pct}%</span>
        {label && <span className="text-[9px] text-slate-400 block">{label}</span>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   EVIDENCE CARD COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const EvidenceCard = ({ evidence, index }) => {
  const trust = getTrustInfo(evidence.source);
  return (
    <div className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">{index + 1}</span>
          <span className="text-[11px] font-semibold text-slate-800">{evidence.title || evidence.source || 'Evidence'}</span>
        </div>
        <TrustBadge sourceName={evidence.source} />
      </div>
      <p className="text-[11px] text-slate-600 leading-5 mb-2">{evidence.content || evidence.detail || evidence.snippet || ''}</p>
      <div className="flex items-center justify-between text-[9px] text-slate-400">
        <span>📅 {evidence.date || evidence.publicationDate || 'Recent'}</span>
        <span>🏛️ {evidence.organization || evidence.source || 'Unknown'}</span>
      </div>
      {evidence.url && (
        <a href={evidence.url} target="_blank" rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-indigo-600 hover:text-indigo-800 font-medium">
          🔗 View Source →
        </a>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SEARCH ENGINE COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const SearchEngine = ({
  query = '',
  result = null,
  loading = false,
  error = '',
  searchMode: externalMode,
  onModeChange,
  onClear,
  onFollowUp,
  moduleKey = 'general',
}) => {
  const [searchMode, setSearchModeInternal] = useState('quick');
  const [showSources, setShowSources] = useState(false);
  const scrollRef = useRef(null);

  // Use external mode if provided, otherwise use internal state
  const activeMode = externalMode || searchMode;
  const setActiveMode = onModeChange || setSearchModeInternal;

  const modeConfig = useMemo(() => SEARCH_MODES.find((m) => m.key === activeMode) || SEARCH_MODES[0], [activeMode]);

  // Scroll to top when new results arrive
  useEffect(() => {
    if (result && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [result]);

  const isOffline = result?.offline;

  // New backend returns HybridSearchResponse directly as the result
  const summary = result?.summary || {};
  const resultDataIntents = result?.intent || {};
  const resultItems = result?.results || [];
  const citations = result?.citations || [];
  const relatedQueries = result?.related_queries || [];
  const progressTrace = result?.progress_trace || [];
  const analytics = result?.analytics || {};

  // Extract structured fields from the new HybridSearchResponse format
  const executiveSummary = summary.executive_summary || summary.answer || '';
  const keyFindings = summary.key_findings || [];
  const evidences = citations || summary.sources_used || [];
  const recommendations = summary.recommendations || [];
  const confidence = summary.confidence || result?.confidence || null;
  const relatedTopics = relatedQueries || summary.follow_up || [];
  const sourceList = summary.sources_used || [];
  const entities = resultDataIntents.entities || [];

  // Detect mode: always treat as AI/hybrid mode since the new backend always returns a summary
  const isAiMode = true;
  const isDbMode = false;

  return (
    <div className="w-full animate-fade-in-up" ref={scrollRef}>
      {/* ── MODE SELECTOR ── */}
      <div className="mb-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 min-w-max p-1 bg-slate-100/80 rounded-2xl">
          {SEARCH_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all duration-200 whitespace-nowrap ${
                activeMode === mode.key
                  ? `bg-gradient-to-r ${mode.gradient} text-white shadow-md`
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-4xl mb-4 shadow-sm">
            🔍
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">LifeLink Intelligence Engine</h3>
          <p className="text-[13px] text-slate-500 max-w-md mb-6">
            Ask anything about patients, donors, hospitals, medical conditions, or research.
            AI searches internal databases and external medical sources simultaneously.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
            {[
              { q: 'Find all O-negative donors within 10 km', icon: '🩸' },
              { q: 'Show hospitals capable of kidney transplant', icon: '🏥' },
              { q: 'Summarize WHO hypertension guidelines', icon: '📖' },
              { q: 'Compare this patient with previous reports', icon: '📊' },
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(suggestion.q)}
                className="text-left flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200 text-[11px] text-slate-600 hover:text-indigo-700 font-medium"
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH PROGRESS ── */}
      {loading && <SearchProgress mode={modeConfig} visible={loading} />}

      {/* ── ERROR ── */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-[11px] text-red-700">
          <span>⚠️</span> {error}
          <button onClick={onClear} className="ml-auto text-[11px] font-medium text-red-600 hover:text-red-800">Clear</button>
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Offline banner */}
          {isOffline && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 flex items-center gap-2">
              <span>📡</span> Offline mode — showing cached results. Reconnect for live intelligence.
            </div>
          )}

          {/* AI Mode — Rich intelligence report */}
          {isAiMode && (
            <>
              {/* Executive Summary */}
              {executiveSummary && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🧠</span>
                    <h3 className="text-[13px] font-bold text-slate-800">AI Executive Summary</h3>
                    {confidence !== null && <ConfidenceGauge value={confidence} size="sm" />}
                  </div>
                  <p className="text-[12px] text-slate-700 leading-6 whitespace-pre-wrap">{executiveSummary}</p>
                </div>
              )}

              {/* Key Findings */}
              {keyFindings.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">🔑 Key Findings</h3>
                  <div className="space-y-2">
                    {keyFindings.map((finding, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${
                          finding.severity === 'critical' || finding.importance === 'high'
                            ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>{i + 1}</span>
                        <div>
                          <p className="text-[12px] text-slate-700 font-medium">{finding.title || finding.finding || finding}</p>
                          {finding.detail && <p className="text-[11px] text-slate-500 mt-0.5">{finding.detail}</p>}
                          {finding.confidence !== undefined && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className={`h-full rounded-full ${finding.confidence >= 0.8 ? 'bg-emerald-500' : finding.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${(finding.confidence || 0) * 100}%` }} />
                              </div>
                              <span className="text-[9px] text-slate-400">{Math.round((finding.confidence || 0) * 100)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Cards */}
              {evidences.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">📋 Evidence</h3>
                    <button onClick={() => setShowSources(!showSources)} className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800">
                      {showSources ? 'Hide' : 'Show'} sources
                    </button>
                  </div>
                  <div className="space-y-2">
                    {evidences.slice(0, showSources ? evidences.length : 3).map((evidence, i) => (
                      <EvidenceCard key={i} evidence={evidence} index={i} />
                    ))}
                    {evidences.length > 3 && !showSources && (
                      <button onClick={() => setShowSources(true)} className="w-full p-2 rounded-xl border border-dashed border-slate-200 text-[10px] text-indigo-600 font-medium hover:bg-indigo-50/50 transition-colors">
                        + Show {evidences.length - 3} more sources
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                  <h3 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-3">💡 Recommendations</h3>
                  <div className="space-y-2">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 border border-amber-100">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                        <div>
                          <p className="text-[11px] text-slate-700 font-medium">{rec.title || rec.recommendation || rec}</p>
                          {rec.detail && <p className="text-[10px] text-slate-500 mt-0.5">{rec.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Topics / Follow-up */}
              {relatedTopics.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">🔄 Related Topics</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedTopics.map((topic, i) => (
                      <button
                        key={i}
                        onClick={() => onFollowUp?.(typeof topic === 'string' ? topic : topic.question || topic.topic)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-medium hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                      >
                        {typeof topic === 'string' ? topic : topic.question || topic.topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Used */}
              {sourceList.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">📚 Sources Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {sourceList.map((source, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        <TrustBadge sourceName={typeof source === 'string' ? source : source.name || source.source} />
                        <span className="text-[10px] text-slate-600 font-medium">
                          {typeof source === 'string' ? source : source.name || source.source}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Entities */}
              {entities.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">🏷️ Medical Entities Detected</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {entities.map((entity, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-[9px] font-medium border"
                        style={{
                          backgroundColor: entity.type === 'disease' ? '#FEF3C7' : entity.type === 'drug' ? '#DBEAFE' : entity.type === 'procedure' ? '#D1FAE5' : '#F3E8FF',
                          borderColor: entity.type === 'disease' ? '#FDE68A' : entity.type === 'drug' ? '#BFDBFE' : entity.type === 'procedure' ? '#A7F3D0' : '#E9D5FF',
                          color: entity.type === 'disease' ? '#92400E' : entity.type === 'drug' ? '#1E40AF' : entity.type === 'procedure' ? '#065F46' : '#6B21A8',
                        }}
                      >
                        {entity.name || entity}
                        {entity.type && <span className="ml-1 opacity-60">· {entity.type}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* DB Mode — structured database results */}
          {isDbMode && !isAiMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Database Results · {Object.values(resultData.results || {}).reduce((sum, items) => sum + (items?.length || 0), 0)} matches
                </h3>
                <button onClick={onClear} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">Clear</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(resultData.results || {}).map(([key, items]) => (
                  <div key={key} className="p-3 rounded-xl bg-white border border-slate-200">
                    <h4 className="text-[11px] font-bold text-slate-600 capitalize mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {key}
                      <span className="text-[9px] text-slate-400 font-normal">({items?.length || 0})</span>
                    </h4>
                    <div className="space-y-1.5">
                      {items?.slice(0, 5).map((item) => (
                        <div key={item._id || item.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[11px] font-medium text-slate-700">{item.name || item.message || item.ambulanceId || 'Record'}</p>
                          <p className="text-[9px] text-slate-400 truncate">
                            {item.email || item.phone || (typeof item.location === 'string' ? item.location : item.location?.city || item.location?.address || item.registrationNumber || '')}
                          </p>
                        </div>
                      ))}
                      {(items?.length || 0) > 5 && (
                        <p className="text-[9px] text-indigo-600 font-medium text-center">+ {items.length - 5} more</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Action Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
            <span className="text-[10px] text-slate-500">
              {result?.query && <>Query: "<span className="font-medium text-slate-700">{result.query}</span>"</>}
              {confidence !== null && (
                <span className="ml-3">AI Confidence: <span className="font-bold text-slate-700">{Math.round(confidence * 100)}%</span></span>
              )}
            </span>
            <div className="flex gap-2">
              <button onClick={onClear} className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors">
                New Search
              </button>
              {relatedTopics.length > 0 && (
                <button onClick={() => onFollowUp?.(typeof relatedTopics[0] === 'string' ? relatedTopics[0] : relatedTopics[0]?.question)} className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  Continue Exploring →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchEngine;
