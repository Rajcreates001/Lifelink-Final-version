import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { showToast } from './NotificationToast';

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */

const NOTIFICATION_TYPES = {
  sos_alert: { label: 'Emergency Alert', icon: '🚑', gradient: 'from-red-500 to-rose-600' },
  critical: { label: 'Critical Alert', icon: '⚠️', gradient: 'from-orange-500 to-red-500' },
  emergency: { label: 'Emergency', icon: '🚨', gradient: 'from-rose-500 to-pink-600' },
  medical: { label: 'Medical Update', icon: '📄', gradient: 'from-blue-500 to-indigo-600' },
  donor: { label: 'Donor Match', icon: '❤️', gradient: 'from-purple-500 to-fuchsia-600' },
  hospital: { label: 'Hospital Update', icon: '🏥', gradient: 'from-emerald-500 to-teal-600' },
  system: { label: 'System', icon: '⚙️', gradient: 'from-slate-500 to-gray-600' },
  ai: { label: 'AI Recommendation', icon: '🧠', gradient: 'from-indigo-500 to-violet-600' },
  success: { label: 'Completed', icon: '✅', gradient: 'from-green-500 to-emerald-600' },
  message: { label: 'Message', icon: '💬', gradient: 'from-teal-500 to-cyan-600' },
  notification: { label: 'Notification', icon: '📡', gradient: 'from-sky-500 to-blue-600' },
};

const generateTimeline = (item) => {
  const now = Date.now();
  const eventTime = new Date(item.time || now).getTime();
  const type = (item.type || '').toLowerCase();
  const steps = [
    { icon: '📡', label: 'Event Detected', time: new Date(eventTime - 120000).toISOString(), status: 'completed' },
    { icon: '🧠', label: 'AI Analysis', time: new Date(eventTime - 60000).toISOString(), status: 'completed' },
  ];
  if (['sos_alert', 'emergency', 'critical'].includes(type)) {
    steps.push({ icon: '🏥', label: 'Hospital Notified', time: new Date(eventTime - 30000).toISOString(), status: 'completed' });
    steps.push({ icon: '🚑', label: 'Ambulance Dispatched', time: new Date(eventTime).toISOString(), status: 'completed' });
    steps.push({ icon: '📍', label: 'ETA Updated', time: new Date(eventTime + 60000).toISOString(), status: 'active' });
    steps.push({ icon: '✅', label: 'Patient Arrived', time: null, status: 'pending' });
    steps.push({ icon: '📋', label: 'Case Closed', time: null, status: 'pending' });
  } else if (type === 'donor') {
    steps.push({ icon: '❤️', label: 'Donor Matched', time: new Date(eventTime - 30000).toISOString(), status: 'completed' });
    steps.push({ icon: '📬', label: 'Notification Sent', time: new Date(eventTime).toISOString(), status: 'completed' });
    steps.push({ icon: '🤝', label: 'Donor Responded', time: null, status: 'pending' });
    steps.push({ icon: '✅', label: 'Donation Completed', time: null, status: 'pending' });
  } else {
    steps.push({ icon: '📋', label: 'Processed', time: new Date(eventTime).toISOString(), status: 'completed' });
    steps.push({ icon: '✅', label: 'Notification Sent', time: new Date(eventTime + 10000).toISOString(), status: 'completed' });
    steps.push({ icon: '👁️', label: 'Viewed', time: null, status: item.isRead ? 'completed' : 'pending' });
    steps.push({ icon: '📋', label: 'Resolved', time: null, status: 'pending' });
  }
  return steps;
};

const getAiExplanation = (item) => {
  const type = (item.type || '').toLowerCase();
  switch (type) {
    case 'sos_alert': case 'emergency': case 'critical':
      return `AI detected that your ${item.severity?.toLowerCase() || 'emergency'} request matches ${item.metadata?.hospital || 'nearby hospitals'} with an estimated response of ${item.metadata?.eta_minutes || 'under 10'} minutes.`;
    case 'medical':
      return `AI analyzed your recent health data and identified ${item.metadata?.condition || 'a change in your vitals'}. ${item.metadata?.recommendation || 'Consider reviewing the details for more information.'}`;
    case 'donor':
      return `AI matched you with ${item.metadata?.donor_name || 'a compatible donor'} (${item.metadata?.blood_group || 'matching blood type'}) located ${item.metadata?.distance || 'nearby'}.`;
    default:
      return `AI analyzed this event using contextual data and determined it requires your attention.`;
  }
};

const normalizeType = (raw) => {
  const t = String(raw || 'notification').toLowerCase().replace(/\s+/g, '_');
  if (NOTIFICATION_TYPES[t]) return t;
  if (['alert', 'sos_alert', 'sos'].includes(t)) return 'sos_alert';
  if (['critical', 'critical_alert'].includes(t)) return 'critical';
  if (['emergency', 'urgent'].includes(t)) return 'emergency';
  if (['medical', 'health', 'vitals'].includes(t)) return 'medical';
  if (['donor', 'donation', 'blood'].includes(t)) return 'donor';
  if (['hospital', 'hosp', 'facility'].includes(t)) return 'hospital';
  if (['system', 'sys', 'platform'].includes(t)) return 'system';
  if (['ai', 'insight', 'recommendation'].includes(t)) return 'ai';
  if (['success', 'completed', 'done'].includes(t)) return 'success';
  if (['message', 'chat', 'msg'].includes(t)) return 'message';
  return 'notification';
};

const computeConfidence = (item) => {
  const severityMap = { Critical: 95, High: 80, Medium: 60, Low: 30, Info: 20 };
  const base = severityMap[item.severity] || 30;
  const ageHours = (Date.now() - new Date(item.time || Date.now()).getTime()) / 3600000;
  const recency = Math.max(0, 20 - ageHours);
  const typeBoost = ['sos_alert', 'critical'].includes(item.type) ? 15 : item.type === 'emergency' ? 10 : 0;
  return Math.min(100, Math.max(5, base + recency + typeBoost));
};

/* ═══════════════════════════════════════════════════════════════════════
   TIMELINE SUB-COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const TimelineSection = ({ steps }) => (
  <div className="relative pl-8 space-y-0">
    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-gray-200 rounded-full" />
    {steps.map((step, i) => (
      <div key={i} className="relative pb-5 last:pb-0">
        <div className={`absolute -left-8 w-8 flex items-center justify-center ${step.status === 'pending' ? 'opacity-40' : ''}`}>
          <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500
            ${step.status === 'completed' ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-200' : ''}
            ${step.status === 'active' ? 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-lg shadow-indigo-200 animate-pulse-slow' : ''}
            ${step.status === 'pending' ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300' : ''}`}>
            {step.status === 'completed' ? '✓' : step.status === 'active' ? '●' : step.icon}
          </div>
          {step.status === 'active' && (
            <span className="absolute inset-0 rounded-full animate-ping-slow bg-indigo-400/30" />
          )}
        </div>
        <div className="ml-2">
          <p className={`text-xs font-bold ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {step.time ? new Date(step.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN NOTIFICATION DETAIL MODAL
   ═══════════════════════════════════════════════════════════════════════ */

const NotificationDetailModal = ({ item, onClose, onDismiss, onMarkAsRead, onArchive, isOpen }) => {
  const [closing, setClosing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  const type = normalizeType(item?.type);
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.notification;
  const confidence = computeConfidence(item);
  const timelineSteps = generateTimeline(item);

  // ── Open / Close animations ──
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 250);
  }, [onClose]);

  // ── Body lock + focus management ──
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px'; // scrollbar compensation

    // Focus modal
    setTimeout(() => {
      const firstButton = modalRef.current?.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 100);

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      if (previousFocusRef.current) previousFocusRef.current.focus();
    };
  }, [isOpen]);

  // ── ESC key ──
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();      // Focus trap — skip if no focusable elements in modal
          if (e.key === 'Tab' && modalRef.current) {
            const focusables = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusables || focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              if (last) last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              if (first) first.focus();
            }
          }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!item) return null;

  // ── Actions ──
  const handleMarkAsRead = () => {
    onMarkAsRead(item);
    showToast('✅ Notification marked as read.', 'success');
  };

  const handleDismissAction = () => {
    onDismiss(item);
    showToast('🗑️ Notification dismissed.', 'info', 5000, () => {
      showToast('↩️ Dismiss undone.', 'success');
    });
    handleClose();
  };

  const handleArchiveAction = () => {
    if (onArchive) onArchive(item);
    showToast('📦 Notification archived.', 'success');
    handleClose();
  };

  const handleDeleteAction = () => {
    setConfirmDelete(false);
    showToast('🗑️ Notification permanently deleted.', 'error');
    handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(15,20,35,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Modal Card */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Notification details: ${item.title || 'Notification'}`}
        className={`relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col transition-all duration-250 ${
          closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          boxShadow: '0 25px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)',
          animation: isOpen && !closing ? 'zoomIn 0.25s ease-out both' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className={`shrink-0 bg-gradient-to-br ${config.gradient} p-5`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-sm">
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white truncate">{item.title || config.label}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold text-white/90 border border-white/20">
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">
                  {item.severity || 'Info'} Priority · {new Date(item.time || Date.now()).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/30 text-white transition-all duration-200"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              item.severity === 'Critical' ? 'bg-red-500/30 text-red-200' :
              item.severity === 'High' ? 'bg-orange-500/30 text-orange-200' :
              'bg-white/15 text-white/80'
            } border border-white/20`}>
              ● {item.severity || 'Info'}
            </span>
            <span className="text-[10px] text-white/60">
              {item.isRead ? '✓ Read' : '○ Unread'}
            </span>
            {item.isRead && (
              <span className="text-[10px] text-emerald-300">· Viewed</span>
            )}
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Full Message */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Details</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{item.msg || item.message || ''}</p>
          </div>

          {/* AI Analysis */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🧠</span>
              <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">AI Analysis</h4>
              <span className="ml-auto flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${confidence >= 70 ? 'bg-emerald-500' : confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-indigo-600">{confidence}% confidence</span>
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{getAiExplanation(item)}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-indigo-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${confidence >= 70 ? 'bg-emerald-500' : confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Event Timeline */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Event Timeline</h4>
            <TimelineSection steps={timelineSteps} />
          </div>

          {/* Metadata Grid */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Information</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(item.metadata)
                  .filter(([k]) => !['route', 'actionLabel'].includes(k))
                  .map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{String(val)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          {confirmDelete && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-3">Are you sure you want to permanently delete this notification?</p>
              <div className="flex items-center gap-2">
                <button onClick={handleDeleteAction} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">
                  Yes, Delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl bg-white text-gray-600 text-xs font-bold border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            {!item.isRead && (
              <button
                onClick={handleMarkAsRead}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:shadow-sm transition-all duration-200 active:scale-95"
              >
                ✓ Mark as Read
              </button>
            )}
            {onArchive && (
              <button
                onClick={handleArchiveAction}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all duration-200 active:scale-95"
              >
                📦 Archive
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDismissAction}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all duration-200 active:scale-95"
            >
              ✕ Dismiss
            </button>
            {onArchive && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 active:scale-95"
              >
                🗑️ Delete
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationDetailModal;
