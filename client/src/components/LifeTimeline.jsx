import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../config/api';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */

const CATEGORY_CONFIG = {
  Emergency: { icon: '🚑', label: 'Emergency', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  'AI Health': { icon: '🩺', label: 'AI Health', gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  Donor: { icon: '🩸', label: 'Donor', gradient: 'from-red-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-800' },
  Profile: { icon: '👤', label: 'Profile', gradient: 'from-yellow-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  Uploads: { icon: '📄', label: 'Uploads', gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  Search: { icon: '🔍', label: 'Search', gradient: 'from-gray-500 to-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' },
  'AI Analysis': { icon: '🧠', label: 'AI Analysis', gradient: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  Notification: { icon: '🔔', label: 'Notification', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  Request: { icon: '🤝', label: 'Request', gradient: 'from-teal-500 to-emerald-600', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' },
  General: { icon: '📌', label: 'General', gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' },
};

const PAGE_SIZE = 20;

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFullDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ═══════════════════════════════════════════════════════════════════════
   ACTIVITY DETAIL MODAL — Portal Modal for viewing full context
   ═══════════════════════════════════════════════════════════════════════ */

const ActivityDetailModal = ({ activity, onClose }) => {
  const [closing, setClosing] = useState(false);
  const modalRef = useRef(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    if (!activity?.id) { setDetailLoading(false); return; }
    const fetchDetail = async () => {
      try {
        const res = await apiFetch(`/v2/history/${activity.user}/${activity.id}`);
        if (res.ok) setDetailData(res.data);
      } catch (err) { console.error('Failed to load activity detail:', err); }
      setDetailLoading(false);
    };
    fetchDetail();
  }, [activity?.id, activity?.user]);

  useEffect(() => {
    if (closing) return;
    const prev = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prev;
      document.body.style.paddingRight = prevPadding;
    };
  }, [closing]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const item = detailData || activity;
  if (!item && !detailLoading) return null;

  const catConf = CATEGORY_CONFIG[item?.category] || CATEGORY_CONFIG.General;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'rgba(15,20,35,0.5)', backdropFilter: 'blur(14px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-y-auto transition-all duration-200 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 bg-gradient-to-br ${catConf.gradient} p-6 rounded-t-3xl`}>
          <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-sm">
              {catConf.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{item.action ? item.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Activity Detail'}</h2>
              <p className="text-sm text-white/80">{item.description}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">{item.category}</span>
                <span className="text-[10px] text-white/70">{item.module}</span>
                <span className="text-[10px] text-white/70">{formatFullDate(item.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {/* Full Context Section */}
              {item?.full_context && (item.full_context.input || item.full_context.output) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Context</h3>
                  {item.full_context.input && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Input</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                        {typeof item.full_context.input === 'string' ? item.full_context.input : JSON.stringify(item.full_context.input, null, 2)}
                      </p>
                    </div>
                  )}
                  {item.full_context.output && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase mb-1">AI Output</p>
                      <p className="text-sm text-indigo-800 whitespace-pre-wrap break-words">
                        {typeof item.full_context.output === 'string' ? item.full_context.output : JSON.stringify(item.full_context.output, null, 2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Reasoning */}
              {item?.full_context?.ai_reasoning && item.full_context.ai_reasoning.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Reasoning</h3>
                  <div className="space-y-2">
                    {(Array.isArray(item.full_context.ai_reasoning) ? item.full_context.ai_reasoning : []).map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                        <span className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-700">{typeof step === 'string' ? step : step.detail || step.step || JSON.stringify(step)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {item?.full_context?.confidence != null && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Confidence</h3>
                    <span className="text-lg font-bold text-emerald-700">{Math.round(item.full_context.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000"
                      style={{ width: `${(item.full_context.confidence || 0) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Evidence / Recommendations */}
              {item?.full_context?.evidence && item.full_context.evidence.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evidence & Sources</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.full_context.evidence.map((ref, i) => (
                      <span key={i} className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                        📚 {ref.title || ref.detail || `Source ${i + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item?.full_context?.recommendations && item.full_context.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommendations</h3>
                  <div className="space-y-1.5">
                    {item.full_context.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                        <span className="text-amber-500 mt-0.5">💡</span>
                        <p className="text-sm text-amber-800">{typeof rec === 'string' ? rec : rec.detail || rec.text || JSON.stringify(rec)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Changed Fields (Profile Updates) */}
              {item?.changed_fields && item.changed_fields.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Changed Fields</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {item.changed_fields.map((field, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">{field}</p>
                        {item.previous_values?.[field] !== undefined && (
                          <p className="text-xs text-red-500 line-through mt-0.5">{String(item.previous_values[field])}</p>
                        )}
                        {item.new_values?.[field] !== undefined && (
                          <p className="text-xs text-green-600 font-medium">{String(item.new_values[field])}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              {item?.metadata && Object.keys(item.metadata).filter((k) => !['input','output','reasoning','ai_reasoning','confidence','evidence','references','recommendations','changed_fields','previous_values','new_values','route','actionLabel'].includes(k)).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metadata</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(item.metadata).filter(([k]) => !['input','output','reasoning','ai_reasoning','confidence','evidence','references','recommendations','changed_fields','previous_values','new_values','route','actionLabel'].includes(k)).map(([key, val]) => (
                      <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">{typeof val === 'object' ? JSON.stringify(val).slice(0, 60) : String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Events */}
              {item?.related_events && item.related_events.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Related Events</h3>
                  <div className="space-y-1.5">
                    {item.related_events.slice(0, 5).map((rel) => (
                      <div key={rel.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-lg">{CATEGORY_CONFIG[rel.category]?.icon || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{rel.description}</p>
                          <p className="text-[10px] text-slate-400">{formatFullDate(rel.timestamp)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_CONFIG[rel.category]?.badge || 'bg-slate-100 text-slate-700'}`}>
                          {rel.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white">
            <button onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all active:scale-[0.98]">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   FILTER BAR COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const FilterBar = ({ categories, selected, onSelect, counts }) => {
  const allCats = ['All', ...categories];
  return (
    <div className="flex flex-wrap gap-1.5">
      {allCats.map((cat) => {
        const isActive = selected === cat;
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`relative px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 border ${
              isActive
                ? `bg-gradient-to-r ${cfg?.gradient || 'from-indigo-500 to-purple-600'} text-white border-transparent shadow-md`
                : 'text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {cfg?.icon && <span>{cfg.icon}</span>}
              {cat}
              {counts?.[cat] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[cat]}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TIMELINE CARD
   ═══════════════════════════════════════════════════════════════════════ */

const TimelineCard = ({ event, index, onClick }) => {
  const cfg = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.General;

  return (
    <div
      className="group relative flex items-start gap-4 animate-fade-in-up cursor-pointer"
      style={{ animationDelay: `${Math.min(index * 60, 800)}ms` }}
      onClick={() => onClick(event)}
    >
      {/* Timeline Connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
          {cfg.icon}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-slate-200 to-transparent min-h-[24px]" />
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        <div className="relative p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group-hover:-translate-y-0.5">
          {/* Top Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badge}`}>
                  {event.category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{event.module}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 leading-snug">
                {event.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatTime(event.timestamp)}</span>
          </div>

          {/* Description */}
          <p className="text-[12px] text-slate-600 leading-relaxed mb-2">{event.description}</p>

          {/* Bottom Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            {event.ai_confidence != null && (
              <span className="flex items-center gap-1 text-[10px] font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  event.ai_confidence >= 0.8 ? 'bg-emerald-500' : event.ai_confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                AI {Math.round(event.ai_confidence * 100)}%
              </span>
            )}
            {event.severity && (
              <span className={`text-[10px] font-semibold ${
                event.severity === 'Critical' || event.severity === 'High' ? 'text-red-600' :
                event.severity === 'Medium' ? 'text-amber-600' : 'text-slate-500'
              }`}>
                {event.severity}
              </span>
            )}
            {event.status && event.status !== 'completed' && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                event.status === 'active' || event.status === 'assigned' ? 'bg-emerald-100 text-emerald-700' :
                event.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {event.status}
              </span>
            )}
            <span className="text-[10px] text-slate-400 ml-auto group-hover:text-indigo-500 transition-colors">
              Click to view details →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TIME GROUP FUNCTION
   ═══════════════════════════════════════════════════════════════════════ */

const groupByTime = (events) => {
  const groups = { Today: [], Yesterday: [], 'This Week': [], 'This Month': [], Older: [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  events.forEach((ev) => {
    const d = new Date(ev.timestamp);
    if (d >= today) groups.Today.push(ev);
    else if (d >= yesterday) groups.Yesterday.push(ev);
    else if (d >= weekAgo) groups['This Week'].push(ev);
    else if (d >= monthAgo) groups['This Month'].push(ev);
    else groups.Older.push(ev);
  });

  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
};

/* ═══════════════════════════════════════════════════════════════════════
   AI SUMMARY HEADER
   ═══════════════════════════════════════════════════════════════════════ */

const AiSummaryHeader = ({ summary, profileContext }) => {
  const total = summary?.total_events || 0;
  const categories = summary?.categories || {};
  const catEntries = Object.entries(categories).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📊</span>
            <h2 className="text-lg font-bold">LifeLink Life Timeline</h2>
          </div>
          <p className="text-sm text-white/80">Complete activity history with AI-powered insights</p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/30 text-[10px] font-bold text-white border border-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-slow" />
          AI Active
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/70 uppercase tracking-wider">Total Events</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        {catEntries.slice(0, 3).map(([cat, count]) => {
          const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.General;
          return (
            <div key={cat} className="bg-white/10 rounded-xl p-3">
              <p className="text-[10px] text-white/70 uppercase tracking-wider">{cfg.icon} {cat}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {profileContext?.blood_group && (
        <div className="mt-3 flex items-center gap-4 bg-white/10 rounded-xl px-4 py-2">
          <span className="text-[11px] text-white/80">🩸 Blood: <strong>{profileContext.blood_group}</strong></span>
          {profileContext.age && <span className="text-[11px] text-white/80">🎂 Age: <strong>{profileContext.age}</strong></span>}
          {profileContext.risk_conditions?.length > 0 && (
            <span className="text-[11px] text-white/80">⚠️ Conditions: <strong>{profileContext.risk_conditions.slice(0, 3).join(', ')}</strong></span>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — LifeTimeline
   ═══════════════════════════════════════════════════════════════════════ */

const LifeTimeline = ({ user: propUser }) => {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [summary, setSummary] = useState(null);
  const [profileContext, setProfileContext] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  const fetchHistory = useCallback(async (pageNum = 1, append = false) => {
    if (!user?.id) return;
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);

      const res = await apiFetch(`/v2/history/${user.id}?${params}`, { method: 'GET', timeoutMs: 10000 });
      if (!res.ok) throw new Error(res.data?.detail || 'Failed to load history');

      const data = res.data;
      if (append) {
        setEvents((prev) => [...prev, ...(data.events || [])]);
      } else {
        setEvents(data.events || []);
      }
      setSummary(data.summary || null);
      setProfileContext(data.profile_context || null);
      setHasMore((data.pagination?.page || 1) < (data.pagination?.total_pages || 1));
    } catch (err) {
      setError(err.message || 'Failed to load activity history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, selectedCategory, searchQuery]);

  // Fetch on mount and when filters change
  useEffect(() => {
    setPage(1);
    setEvents([]);
    fetchHistory(1, false);
  }, [fetchHistory]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, true);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setSearchQuery(searchInput);
  };

  const categories = useMemo(() => {
    if (!summary?.categories) return [];
    return Object.keys(summary.categories).sort();
  }, [summary]);

  const categoryCounts = useMemo(() => {
    if (!summary?.categories) return {};
    return summary.categories;
  }, [summary]);

  const groupedEvents = useMemo(() => groupByTime(events), [events]);
  const groupKeys = Object.keys(groupedEvents);

  return (
    <div className="max-w-5xl mx-auto">
      {/* AI Summary Header */}
      <AiSummaryHeader summary={summary} profileContext={profileContext} />

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search activity history... e.g. blood, donor, emergency, profile"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/50 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setSearchInput(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-indigo-600 hover:text-indigo-800">
              Clear
            </button>
          )}
        </form>

        {/* Filters */}
        <FilterBar
          categories={categories}
          selected={selectedCategory}
          onSelect={(cat) => { setSelectedCategory(cat); }}
          counts={categoryCounts}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2 mb-4">
          <span>⚠️</span> {error}
          <button onClick={() => fetchHistory(1, false)} className="ml-auto text-xs font-bold text-red-700 hover:text-red-800 underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-sm text-slate-500">Loading your Life Timeline...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && events.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-3xl mb-4">
            📜
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Activity Yet</h3>
          <p className="text-sm text-slate-500 text-center max-w-md">
            Your Life Timeline will populate as you interact with LifeLink AI, update your profile, search for donors, and use the application.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-slow" />
            <span className="text-xs text-slate-400 font-medium">LifeLink AI is continuously monitoring your activity</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!loading && events.length > 0 && (
        <>
          {groupKeys.map((groupKey) => (
            <div key={groupKey} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700">{groupKey}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{groupedEvents[groupKey].length} events</span>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
              </div>
              <div className="pl-1">
                {groupedEvents[groupKey].map((event, idx) => (
                  <TimelineCard
                    key={event.id || idx}
                    event={event}
                    index={idx}
                    onClick={(ev) => setSelectedActivity(ev)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center py-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Loading...
                  </span>
                ) : (
                  'Load More Events'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </div>
  );
};

export default LifeTimeline;
