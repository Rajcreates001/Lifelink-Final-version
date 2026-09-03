import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, getAuthToken } from '../config/api';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

// ── LifeLink AI uses dedicated /v2/lifelink-ai/ endpoints — COMPLETELY separate from public AI ──
const AI_API = '/v2/lifelink-ai';

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `lai-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeMessage = (message) => ({
  id: message.id || createId(),
  role: message.role || 'assistant',
  content: message.content || '',
  createdAt: message.createdAt || message.created_at || new Date().toISOString(),
  attachments: message.attachments || [],
  sourceQuery: message.sourceQuery || message.source_query || '',
  confidence: Number.isFinite(message.confidence) ? message.confidence : null,
  webResults: message.webResults || message.web_results || [],
  report: message.report || null,
  charts: message.charts || [],
  references: message.references || message.references_field || [],
  reasoning: message.reasoning || [],
  clarifying: message.clarifying || [],
  orchestration: message.orchestration || null,
  metadata: message.metadata || message.extra_data || null,
  followUp: message.followUp || message.follow_up || null,
});

const parseUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return { href: url.href, domain: url.hostname.replace(/^www\./, '') };
  } catch { return null; }
};

/* ═══════════════════════════════════════════════════════════════════════
   MODULE CONFIGURATION — context-aware AI personality per page
   ═══════════════════════════════════════════════════════════════════════ */

const MODULE_CONFIG = {
  'ai_health': {
    title: 'Health Intelligence',
    icon: '🩺',
    gradient: 'from-cyan-500 to-blue-600',
    accent: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    description: 'Clinical risk analysis & health prediction',
    thinkingSteps: [
      'Reading patient vitals',
      'Comparing with WHO ranges',
      'Checking hypertension risk',
      'Analyzing historical trends',
      'Searching compatible interventions',
      'Generating health assessment',
    ],
    knowledgeSources: ['WHO Guidelines', 'American Heart Association', 'Clinical History'],
  },
  'find_donors': {
    title: 'Blood Matching Intelligence',
    icon: '🩸',
    gradient: 'from-red-500 to-rose-600',
    accent: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    description: 'Donor compatibility & availability analysis',
    thinkingSteps: [
      'Scanning donor database',
      'Checking blood type compatibility',
      'Evaluating distance & availability',
      'Ranking optimal matches',
      'Estimating travel times',
      'Finalizing recommendations',
    ],
    knowledgeSources: ['Blood Group Compatibility Chart', 'Donor Registry', 'Response History'],
  },
  'requests': {
    title: 'Emergency Coordination',
    icon: '🚑',
    gradient: 'from-amber-500 to-orange-600',
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Emergency triage & resource optimization',
    thinkingSteps: [
      'Analyzing emergency severity',
      'Checking nearby hospital capacity',
      'Estimating response times',
      'Optimizing resource allocation',
      'Predicting patient inflow',
      'Generating coordination plan',
    ],
    knowledgeSources: ['Emergency Protocols', 'Hospital Registry', 'Response Metrics'],
  },
  'ai_records': {
    title: 'Clinical Document Intelligence',
    icon: '📄',
    gradient: 'from-purple-500 to-violet-600',
    accent: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    description: 'Medical report analysis & diagnosis extraction',
    thinkingSteps: [
      'Extracting clinical entities',
      'Analyzing lab values',
      'Cross-referencing medical codes',
      'Identifying risk factors',
      'Summarizing findings',
      'Generating clinical report',
    ],
    knowledgeSources: ['ICD-10 Codes', 'Lab Reference Ranges', 'Clinical Guidelines'],
  },
  'donations': {
    title: 'Activity Intelligence',
    icon: '📊',
    gradient: 'from-emerald-500 to-teal-600',
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Behavior prediction & engagement analysis',
    thinkingSteps: [
      'Analyzing user activity patterns',
      'Calculating engagement scores',
      'Predicting future behavior',
      'Identifying trends',
      'Generating recommendations',
      'Compiling insights',
    ],
    knowledgeSources: ['Activity History', 'Behavior Model', 'Engagement Analytics'],
  },
};

const DEFAULT_MODULE = {
  title: 'Medical AI Copilot',
  icon: '🧠',
  gradient: 'from-indigo-500 to-purple-600',
  accent: 'text-indigo-600',
  bg: 'bg-indigo-50',
  border: 'border-indigo-200',
  description: 'Intelligent healthcare assistance',
  thinkingSteps: [
    'Analyzing your request',
    'Searching knowledge base',
    'Evaluating available data',
    'Generating response',
    'Verifying accuracy',
    'Finalizing recommendations',
  ],
  knowledgeSources: ['LifeLink Knowledge Base', 'Medical Guidelines', 'Patient Data'],
};

const getModuleConfig = (key) => {
  const clean = (key || '').toLowerCase().replace(/[^a-z_]/g, '');
  return MODULE_CONFIG[clean] || DEFAULT_MODULE;
};

/* ═══════════════════════════════════════════════════════════════════════
   AI THINKING PANEL — animated analysis steps
   ═══════════════════════════════════════════════════════════════════════ */

const ThinkingPanel = ({ steps, visible }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!visible) { setCurrentStep(0); return; }
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) return prev;
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [visible, steps.length]);

  if (!visible) return null;

  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 mb-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-slow" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-slow" style={{ animationDelay: '300ms' }} />
          <span className="w-2 h-2 rounded-full bg-indigo-300 animate-pulse-slow" style={{ animationDelay: '600ms' }} />
        </div>
        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">AI is analyzing...</span>
      </div>
      <div className="space-y-1.5">
        {steps.slice(0, currentStep + 1).map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${
              i === currentStep ? 'opacity-100 translate-x-0' : 'opacity-60 translate-x-0'
            } ${i < currentStep ? 'text-green-600' : i === currentStep ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            {i < currentStep ? (
              <span className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center text-[8px]">✓</span>
            ) : i === currentStep ? (
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] animate-pulse-slow">●</span>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center text-[8px]">○</span>
            )}
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   EXPLAIN MODAL — step-by-step AI reasoning
   ═══════════════════════════════════════════════════════════════════════ */

const ExplainModal = ({ message, onClose }) => {
  if (!message) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,20,35,0.45)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-zoom-in p-5">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🧠</span>
          <h3 className="text-sm font-bold text-slate-800">AI Reasoning</h3>
          {message.confidence && (
            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
              message.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
              message.confidence >= 0.6 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {Math.round(message.confidence * 100)}% confidence
            </span>
          )}
        </div>

        <div className="space-y-3">
          {message.reasoning?.length > 0 ? (
            message.reasoning.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-[12px] text-slate-700 leading-5">{step}</p>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">No detailed reasoning available for this response.</p>
          )}

          {message.references?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Knowledge Sources</h4>
              <div className="flex flex-wrap gap-1.5">
                {message.references.map((ref, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                    {ref.title || ref.detail || `Source ${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {message.confidence !== null && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confidence Breakdown</h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 font-medium">Overall</span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      message.confidence >= 0.8 ? 'bg-emerald-500' :
                      message.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(message.confidence || 0) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-700 w-10 text-right">{Math.round((message.confidence || 0) * 100)}%</span>
              </div>
              {(message.confidence || 0) < 0.6 && (
                <p className="mt-2 text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠️ AI confidence is low. Consider consulting a medical professional for verification.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   KNOWLEDGE SOURCES MODAL
   ═══════════════════════════════════════════════════════════════════════ */

const KnowledgeSourcesModal = ({ sources, onClose }) => (
  sources ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,20,35,0.45)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-zoom-in p-5">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📚</span>
          <h3 className="text-sm font-bold text-slate-800">Knowledge Sources</h3>
        </div>
        <div className="space-y-2">
          {sources.map((source, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">✓</span>
              <span className="text-[12px] font-medium text-slate-700">{source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null
);

/* ═══════════════════════════════════════════════════════════════════════
   MINI BAR CHART (preserved from original)
   ═══════════════════════════════════════════════════════════════════════ */

const MiniBarChart = ({ title, data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value || 0));
  return (
    <div className="w-full">
      {title && <p className="text-[10px] font-semibold text-slate-500 mb-1">{title}</p>}
      <div className="flex items-end gap-1.5 h-12">
        {data.map((point, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all duration-500"
              style={{ height: `${((point.value || 0) / maxVal) * 100}%`, minHeight: 4 }}
            />
            <span className="text-[8px] text-slate-400">{point.label || point.monthKey || point.dayKey?.slice(5) || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — LifeLink AI Copilot
   ═══════════════════════════════════════════════════════════════════════ */

const LifeLinkAICopilot = ({ variant = 'panel', onClose, location, moduleKey = 'general' }) => {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [error, setError] = useState('');
  const [showExplain, setShowExplain] = useState(null);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [roleContext, setRoleContext] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ── Shared government role keyword detection ──
  const govKeywords = ['government', 'police', 'fire', 'ndma', 'ndrf', 'sdrf', 'state_', 'district_', 'national_', 'ministry', 'municipal', 'disaster', 'ambulance_authority', 'ambulance_dispatch', 'public_health', 'central_'];
  const isGovernment = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    const subRole = (user?.subRole || '').toLowerCase();
    const roleLabel = (roleContext?.user?.role_label || '').toLowerCase();
    return govKeywords.some(kw => role.includes(kw) || subRole.includes(kw) || roleLabel.includes(kw));
  }, [user?.role, user?.subRole, roleContext?.user?.role_label]);

  const moduleConfig = useMemo(() => getModuleConfig(moduleKey), [moduleKey]);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);

  // ── Derive AI context from backend role context ──
  const aiContext = useMemo(() => {
    const roleCtx = roleContext?.user || {};
    const base = {
      currentModule: roleContext?.current_module || moduleConfig.title,
      moduleIcon: moduleConfig.icon,
      lastAnalysis: activeConversation?.updatedAt || null,
      messageCount: activeConversation?.messages?.length || 0,
      userName: roleCtx?.role_label || user?.subRole || user?.role || 'User',
      userRole: roleCtx?.scope || user?.role || 'enterprise',
      focus: roleContext?.role?.description || moduleConfig.description,
    };
    return base;
  }, [moduleKey, user, roleContext, activeConversation, moduleConfig]);

  // ── Role-aware dynamic suggestions ──
  const dynamicSuggestions = useMemo(() => {
    if ((activeConversation?.messages || []).length > 0 || loadingContext) return [];
    const roleLabel = (roleContext?.user?.role_label || '').toLowerCase();
    const suggestions = [];

    // ── Government portal suggestions ──
    if (isGovernment) {
      suggestions.push(
        { text: 'Summarize active emergencies in Karnataka', icon: '🚨', priority: 1 },
        { text: 'Show resource allocation across all districts', icon: '📦', priority: 2 },
        { text: 'Predict flood risk for Mangaluru region', icon: '🌊', priority: 3 },
        { text: 'Recommend inter-agency response coordination', icon: '🤝', priority: 4 },
        { text: 'Analyze hospital capacity in Dakshina Kannada', icon: '🏥', priority: 5 },
        { text: 'Generate national situation report', icon: '📋', priority: 6 },
      );
    } else if (roleLabel.includes('ceo') || roleLabel.includes('executive')) {
      suggestions.push(
        { text: 'Generate an executive revenue summary', icon: '📊', priority: 1 },
        { text: 'Analyze department performance this week', icon: '🏢', priority: 2 },
        { text: 'Predict bed occupancy for tomorrow', icon: '🛏️', priority: 3 },
        { text: 'Show critical alerts across all departments', icon: '🚨', priority: 4 },
      );
    } else if (roleLabel.includes('physician') || roleLabel.includes('doctor')) {
      suggestions.push(
        { text: 'Show my assigned patient status', icon: '🩺', priority: 1 },
        { text: 'Check medication interactions for current patients', icon: '💊', priority: 2 },
        { text: 'Recommend diagnosis based on symptoms', icon: '🔬', priority: 3 },
        { text: 'Generate a patient handoff summary', icon: '📋', priority: 4 },
      );
    } else if (roleLabel.includes('finance')) {
      suggestions.push(
        { text: 'Show this month revenue vs expenses', icon: '💰', priority: 1 },
        { text: 'List pending insurance claims', icon: '📄', priority: 2 },
        { text: 'Generate budget forecast for next quarter', icon: '📈', priority: 3 },
        { text: 'Analyze department-wise spending', icon: '📊', priority: 4 },
      );
    } else if (roleLabel.includes('nurse')) {
      suggestions.push(
        { text: 'Show my assigned patients and vitals', icon: '❤️', priority: 1 },
        { text: 'List medications due this shift', icon: '💊', priority: 2 },
        { text: 'Display shift handoff notes', icon: '📋', priority: 3 },
      );
    } else if (roleLabel.includes('admin') || roleLabel.includes('system')) {
      suggestions.push(
        { text: 'Show system health and performance', icon: '⚙️', priority: 1 },
        { text: 'List security alerts from last 24 hours', icon: '🔒', priority: 2 },
        { text: 'Generate infrastructure utilization report', icon: '📊', priority: 3 },
      );
    } else {
      suggestions.push(
        { text: 'Summarize today\'s hospital activity', icon: '📊', priority: 1 },
        { text: 'Check resource availability', icon: '📦', priority: 2 },
        { text: 'Show recent notifications and alerts', icon: '🔔', priority: 3 },
        { text: 'Generate a quick status report', icon: '📋', priority: 4 },
      );
    }
    return suggestions;
  }, [roleContext, activeConversation, loadingContext]);

  // ── Load enterprise AI context from isolated backend ──
  useEffect(() => {
    if (authLoading || !user?.id) return;
    const loadInitialData = async () => {
      setLoadingContext(true);
      try {
        // 1. Load role context
        const ctxRes = await apiFetch(`${AI_API}/context?current_module=${moduleKey}`, { cache: false });
        if (ctxRes.ok && ctxRes.data?.context) {
          setRoleContext(ctxRes.data.context);
        }

        // 2. Load conversations (only this user's, filtered by hospital + role)
        const convRes = await apiFetch(`${AI_API}/conversations?limit=20&offset=0`, { cache: false });
        if (convRes.ok && convRes.data?.conversations) {
          const list = convRes.data.conversations.map((item) => ({
            id: item.id,
            title: item.title,
            createdAt: item.created_at || item.createdAt,
            updatedAt: item.updated_at || item.updatedAt,
            messages: [],
            messageCount: item.message_count || item.messageCount || 0,
            module: item.module,
            mode: item.mode,
            isPinned: item.is_pinned || false,
          }));
          setConversations(list);
          if (list.length > 0) setActiveId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load LifeLink AI context:', err);
      }
      setLoadingContext(false);
    };
    loadInitialData();
  }, [user?.id, authLoading, moduleKey]);

  // ── Load messages when active conversation changes ──
  useEffect(() => {
    if (!activeId || !user?.id) return;
    const loadMessages = async () => {
      try {
        const res = await apiFetch(`${AI_API}/conversations/${activeId}`, { cache: false });
        if (res.ok && res.data?.conversation) {
          const msgs = (res.data.conversation.messages || []).map(normalizeMessage);
          setConversations((prev) => prev.map((c) =>
            c.id === activeId ? { ...c, messages: msgs, messageCount: msgs.length } : c
          ));
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    // Only load if we haven't already loaded messages for this conversation
    const current = conversations.find((c) => c.id === activeId);
    if (!current || current.messages.length === 0) {
      loadMessages();
    }
  }, [activeId, user?.id, conversations.length]);

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConversation?.messages?.length, loading]);

  const updateConversation = useCallback((convId, updater) => {
    setConversations((prev) => prev.map((c) => (c.id === convId ? updater(c) : c)));
  }, []);

  // ── Send message to isolated LifeLink AI backend ──
  const handleSend = useCallback(async (overrideText) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed && attachments.length === 0) return;

    setInput('');
    setAttachments([]);
    setError('');
    setLoading(true);

    try {
      const payload = {
        query: trimmed || 'Analyze the attached files and provide insights.',
        conversation_id: activeId || null,
        module: moduleKey,
        web_search: false,
        attachments: attachments.map((item) => ({ name: item.name, type: item.type, size: item.size, text: item.text })),
      };

      // Optimistically add user message
      const tempUserMsg = normalizeMessage({ role: 'user', content: trimmed || 'Analyze the attached files.', attachments });
      if (activeId) {
        updateConversation(activeId, (c) => ({
          ...c,
          messages: [...c.messages, tempUserMsg],
          messageCount: c.messageCount + 1,
        }));
      }

      const res = await apiFetch(`${AI_API}/ask`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 35000 });
      if (!res.ok) throw new Error(res.data?.detail || res.data?.error || 'LifeLink AI response failed');

      const data = res.data || {};

      // Update conversation from server response
      if (data.conversation) {
        const serverConv = data.conversation;
        const msgs = (serverConv.messages || []).map(normalizeMessage);
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === serverConv.id);
          const conv = {
            id: serverConv.id,
            title: serverConv.title || trimmed.slice(0, 32),
            createdAt: serverConv.created_at || serverConv.createdAt || new Date().toISOString(),
            updatedAt: serverConv.updated_at || serverConv.updatedAt || new Date().toISOString(),
            messages: msgs,
            messageCount: msgs.length,
            module: serverConv.module || moduleKey,
            mode: serverConv.mode || 'chat',
          };
          if (!exists) {
            setActiveId(serverConv.id);
            return [conv, ...prev];
          }
          return prev.map((c) => (c.id === serverConv.id ? conv : c));
        });
        if (!conversations.some((c) => c.id === serverConv.id)) {
          setActiveId(serverConv.id);
        }
      }

      // Refresh context after send
      const ctxRes = await apiFetch(`${AI_API}/context?current_module=${moduleKey}`, { cache: false });
      if (ctxRes.ok && ctxRes.data?.context) {
        setRoleContext(ctxRes.data.context);
      }
    } catch (err) {
      setError(err.message || 'LifeLink AI request failed.');
      // Add error message to conversation
      if (activeId) {
        updateConversation(activeId, (c) => ({
          ...c,
          messages: [...c.messages, normalizeMessage({ role: 'assistant', content: 'AI response failed. Please retry.' })],
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [input, attachments, activeId, moduleKey, conversations]);

  // ── New conversation ──
  const handleNewConversation = useCallback(async () => {
    setShowHistory(false);
    setInput('');
    setAttachments([]);
    setError('');
    try {
      const res = await apiFetch(`${AI_API}/conversations`, {
        method: 'POST',
        body: JSON.stringify({ module: moduleKey, mode: 'chat' }),
      });
      if (res.ok && res.data?.conversation) {
        const conv = res.data.conversation;
        const newConv = {
          id: conv.id,
          title: conv.title || 'New conversation',
          createdAt: conv.created_at || conv.createdAt,
          updatedAt: conv.updated_at || conv.updatedAt,
          messages: [],
          messageCount: 0,
          module: conv.module || moduleKey,
          mode: conv.mode || 'chat',
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveId(conv.id);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }, [moduleKey]);

  // ── Search conversations ──
  const handleSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) return;
    setSearchQuery(q);
    setShowHistory(true);
    try {
      const res = await apiFetch(`${AI_API}/conversations/search`, {
        method: 'POST',
        body: JSON.stringify({ query: q, limit: 10 }),
      });
      if (res.ok && res.data?.results) {
        // Results are shown in the history panel
        return res.data.results;
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
    return [];
  }, []);

  // ── Delete conversation ──
  const handleDeleteConversation = useCallback(async (convId, e) => {
    e?.stopPropagation();
    try {
      await apiFetch(`${AI_API}/conversations/${convId}`, { method: 'DELETE' });
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== convId);
        if (activeId === convId && next.length > 0) setActiveId(next[0].id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeId]);

  // ── File handling ──
  const handleFileChange = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const next = [];
    for (const file of files) {
      let text = '';
      try {
        if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) text = await file.text();
      } catch { text = ''; }
      if (text.length > 4000) text = `${text.slice(0, 4000)}...`;
      next.push({ id: createId(), name: file.name, type: file.type || 'application/octet-stream', size: file.size || 0, text });
    }
    setAttachments((prev) => prev.concat(next));
    event.target.value = '';
  }, []);

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ── Message component ──
  // ── Role Context Strip ──
  const RoleContextStrip = () => {
    if (!roleContext?.user) return null;
    const u = roleContext.user;
    const role = roleContext.role || {};
    return (
      <div className="shrink-0 px-3.5 py-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-slow" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Authenticated as</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">👤</span>
            <span className="text-[10px] text-slate-700 font-semibold">{u.role_label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">{isGovernment ? '🏛️' : '🏥'}</span>
            <span className="text-[10px] text-slate-600 truncate">{u.scope}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">🎯</span>
            <span className="text-[10px] text-slate-600 truncate">{isGovernment ? (role.description || 'Government official') : (role.description || 'Hospital staff')}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[9px] text-slate-400">
              {role.can_access_clinical ? '🩺' : ''} {role.can_access_finance ? '💰' : ''} {role.can_access_admin ? '⚙️' : ''}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Conversation History Panel ──
  const HistoryPanel = () => (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); }}
          placeholder="Search conversations..."
          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* New Chat Button */}
      <button
        onClick={handleNewConversation}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New conversation
      </button>

      {/* Conversation List */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => { setActiveId(conv.id); setShowHistory(false); }}
            className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
              conv.id === activeId
                ? 'bg-indigo-100 border border-indigo-200'
                : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-semibold truncate ${conv.id === activeId ? 'text-indigo-800' : 'text-slate-800'}`}>
                {conv.title}
              </p>
              <p className="text-[9px] text-slate-400">
                {conv.messageCount || 0} msgs · {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : ''}
              </p>
            </div>
            <button
              onClick={(e) => handleDeleteConversation(conv.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-all"
              title="Delete conversation"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        {conversations.length === 0 && !loadingContext && (
          <div className="p-4 text-center">
            <p className="text-[11px] text-slate-400">No conversations yet</p>
            <button onClick={handleNewConversation} className="mt-2 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">
              Start a new conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const MessageCard = ({ message }) => {
    const [showFullReasoning, setShowFullReasoning] = useState(false);

    if (message.role !== 'assistant') {
      return (
        <div className="flex justify-end mb-3 animate-fade-in-up">
          <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md">
            <p className="text-[12px] leading-5 whitespace-pre-wrap break-words">{typeof message.content === 'string' ? message.content : typeof message.content === 'object' ? JSON.stringify(message.content, null, 2) : String(message.content ?? '')}</p>
            {message.attachments?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.attachments.map((att, i) => (
                  <span key={i} className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300">📎 {att.name}</span>
                ))}
              </div>
            )}
            {message.sourceQuery && (
              <div className="mt-1 text-[8px] text-slate-400 italic">Sourced from: {message.sourceQuery.slice(0, 40)}...</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-3 animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
          {/* AI Header */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
            <span className="text-sm">{moduleConfig.icon}</span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Insight</span>
            {message.confidence !== null && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold ${
                message.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                message.confidence >= 0.6 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>
                {Math.round(message.confidence * 100)}% conf.
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-3.5 py-2.5">
            <p className="text-[12px] text-slate-800 leading-5 whitespace-pre-wrap break-words">{typeof message.content === 'string' ? message.content : typeof message.content === 'object' ? JSON.stringify(message.content, null, 2) : String(message.content ?? '')}</p>

            {/* Follow-up */}
            {message.followUp && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-[11px] text-indigo-700">{typeof message.followUp === 'string' ? message.followUp : JSON.stringify(message.followUp)}</p>
              </div>
            )}

            {/* Clarifying questions */}
            {message.clarifying?.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Clarifying questions:</p>
                {message.clarifying.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)} className="w-full text-left px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-700 hover:bg-amber-100 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Report */}
            {message.report && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-800">{message.report.title || 'AI Report'}</p>
                <p className="mt-1 text-[11px] text-slate-600">{message.report.summary}</p>
                {message.report.highlights?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {message.report.highlights.map((h, i) => (
                      <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                        <span className="text-indigo-500 mt-0.5">●</span> {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Charts */}
            {message.charts?.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {message.charts.map((chart, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <MiniBarChart title={chart.title} data={chart.data || []} />
                  </div>
                ))}
              </div>
            )}

            {/* Reasoning (collapsible) */}
            {message.reasoning?.length > 0 && (
              <div className="mt-2.5">
                <button
                  onClick={() => setShowFullReasoning(!showFullReasoning)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>{showFullReasoning ? '▼' : '▶'} Why this recommendation?</span>
                </button>
                {showFullReasoning && (
                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1.5">
                    {message.reasoning.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orchestration actions */}
            {message.orchestration?.actions?.length > 0 && (
              <div className="mt-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">⚡ Proposed Actions</p>
                {message.orchestration.actions.map((action, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
                    <span className="text-[11px] text-amber-800">{action.type || 'Action'}: {action.summary || action.status || 'Queued'}</span>
                    <button onClick={() => alert(`Approved: ${action.type || 'Action'} - ${action.summary || action.status || 'Queued'}`)} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded-lg bg-white/60 hover:bg-white">Approve</button>
                  </div>
                ))}
              </div>
            )}

            {/* References */}
            {message.references?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {message.references.map((ref, i) => {
                  const refUrl = ref?.url || (ref?.detail ? ref.detail.match(/https?:\/\/\S+/i)?.[0] : null);
                  const parsed = parseUrl(refUrl);
                  return (
                    <span key={i} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-medium border border-emerald-100">
                      📚 {ref.title || parsed?.domain || 'Source'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 border-t border-slate-100 bg-slate-50/50">
            <button onClick={() => setShowExplain(message)} className="flex items-center gap-1 text-[9px] font-medium text-slate-500 hover:text-indigo-600 transition-colors">
              🧠 Explain
            </button>
            {message.reasoning?.length > 0 && (
              <button onClick={() => setShowFullReasoning(!showFullReasoning)} className="flex items-center gap-1 text-[9px] font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                📖 Reasoning
              </button>
            )}
            {message.confidence !== null && (
              <span className="ml-auto flex items-center gap-1 text-[9px] text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  message.confidence >= 0.8 ? 'bg-emerald-500' : message.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                {Math.round(message.confidence * 100)}% confident
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  const hasMessages = (activeConversation?.messages || []).length > 0;

  // ── Role-aware authentication label (aligned with backend _get_portal_scope) ──
  const portalLabel = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    const subRole = (user?.subRole || '').toLowerCase();
    const combined = subRole ? `${role}_${subRole}` : role;
    const checkStr = `${role} ${subRole} ${combined}`;
    // Government roles
    if (govKeywords.some(kw => checkStr.includes(kw))) {
      return 'Authenticating government identity';
    }
    if (role.includes('ambulance') || subRole.includes('ambulance')) {
      return 'Authenticating emergency responder identity';
    }
    if (role === 'public' || role === 'citizen' || subRole === 'public' || subRole === 'citizen') {
      return 'Authenticating citizen identity';
    }
    if (role.includes('ngo') || subRole.includes('ngo') || role === 'red_cross' || subRole.includes('red_cross')) {
      return 'Authenticating NGO identity';
    }
    return 'Authenticating hospital identity';
  }, [user?.role, user?.subRole]);

  if (loadingContext) {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
          <p className="text-[11px] text-slate-500">Loading LifeLink AI context...</p>
          <p className="text-[9px] text-slate-400">{portalLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        {/* ── HEADER ── */}
        <div className={`shrink-0 bg-gradient-to-r ${moduleConfig.gradient} p-3.5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white text-sm shadow-sm">
                {moduleConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-bold text-white">{moduleConfig.title}</h2>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-[8px] font-bold text-white border border-white/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-slow" />
                    {roleContext?.user?.role_label || 'ENTERPRISE'}
                  </span>
                </div>
                <p className="text-[10px] text-white/70">{roleContext?.role?.description || moduleConfig.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title="Conversation history"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {onClose && (
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* AI Summary Strip */}
          {hasMessages && (
            <div className="mt-2.5 flex items-center gap-4 bg-white/10 rounded-xl px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-white/80">Role</span>
                <span className="text-[11px] font-bold text-emerald-300">{roleContext?.user?.scope || 'Enterprise'}</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-[9px] text-white/70">
                {activeConversation?.messages?.length || 0} exchanges
              </span>
              <div className="w-px h-4 bg-white/20" />
              <button
                onClick={() => setShowKnowledge(true)}
                className="text-[9px] font-medium text-white/80 hover:text-white underline underline-offset-2"
              >
                📚 Sources
              </button>
            </div>
          )}
        </div>

        {/* ── ROLE CONTEXT STRIP ── */}
        <RoleContextStrip />

        {/* ── MESSAGE AREA / HISTORY ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1 scrollbar-none">
          {showHistory ? <HistoryPanel /> : <>
            {/* Thinking Panel */}
            {loading && <ThinkingPanel steps={moduleConfig.thinkingSteps} visible={loading} />}

            {/* Empty State */}
            {!hasMessages && !loading && (
              <div className="flex flex-col items-center justify-center h-full py-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-3xl mb-3 shadow-sm">
                  {moduleConfig.icon}
                </div>
                <h3 className="text-[13px] font-bold text-slate-700 mb-1">{moduleConfig.title}</h3>
                <p className="text-[11px] text-slate-500 text-center max-w-[240px] mb-4">
                  I'm monitoring your {moduleKey.replace(/_/g, ' ')} module. Ask me anything or select a suggestion below.
                </p>

                {/* Dynamic Suggestions */}
                <div className="w-full space-y-1.5">
                  {dynamicSuggestions.slice(0, 4).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(suggestion.text)}
                      className="w-full text-left flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm transition-all duration-200 group"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <span className="text-base">{suggestion.icon}</span>
                      <span className="text-[11px] text-slate-600 group-hover:text-indigo-700 font-medium flex-1">{suggestion.text}</span>
                      <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {hasMessages && (activeConversation?.messages || []).map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-600 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
          </>}
        </div>

        {/* ── INPUT AREA ── */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-3.5 py-2.5">
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((item) => (
                <span key={item.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[9px] text-slate-600">
                  📎 {item.name}
                  <button onClick={() => removeAttachment(item.id)} className="text-slate-400 hover:text-red-500 ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                rows={1}
                placeholder="Ask LifeLink AI..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-[12px] leading-5 resize-none outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                style={{ minHeight: 36, maxHeight: 80 }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                }}
              />
              <label className="absolute right-2 bottom-2 p-1 rounded-lg text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <input type="file" multiple accept=".txt,.md,.csv,.json" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={loading ? 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' : 'M5 12h14M12 5l7 7-7 7'} />
              </svg>
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[9px] text-slate-400">
              {moduleConfig.title} · Medical AI Copilot
            </span>
            <span className="text-[9px] text-slate-400">
              Enter to send · Shift+Enter for new line
            </span>
          </div>
        </div>
      </div>

      {/* Portals */}
      {showExplain && <ExplainModal message={showExplain} onClose={() => setShowExplain(null)} />}
      {showKnowledge && <KnowledgeSourcesModal sources={moduleConfig.knowledgeSources} onClose={() => setShowKnowledge(false)} />}
    </>
  );
};

export default LifeLinkAICopilot;
