import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import NotificationDetailModal from './NotificationDetailModal';
import NotificationToastContainer, { showToast } from './NotificationToast';

// ─── Constants ───────────────────────────────────────────────────────────
const NOTIFICATION_TYPES = {
    sos_alert: { label: 'Emergency Alert', icon: '🚑', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', glow: 'rgba(239,68,68,0.2)' },
    critical: { label: 'Critical Alert', icon: '⚠️', gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', glow: 'rgba(249,115,22,0.2)' },
    emergency: { label: 'Emergency', icon: '🚨', gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', glow: 'rgba(225,29,72,0.2)' },
    medical: { label: 'Medical Update', icon: '📄', gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', glow: 'rgba(59,130,246,0.2)' },
    donor: { label: 'Donor Match', icon: '❤️', gradient: 'from-purple-500 to-fuchsia-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', glow: 'rgba(168,85,247,0.2)' },
    hospital: { label: 'Hospital Update', icon: '🏥', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', glow: 'rgba(16,185,129,0.2)' },
    system: { label: 'System', icon: '⚙️', gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', glow: 'rgba(100,116,139,0.2)' },
    ai: { label: 'AI Recommendation', icon: '🧠', gradient: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', glow: 'rgba(99,102,241,0.2)' },
    success: { label: 'Completed', icon: '✅', gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', glow: 'rgba(34,197,94,0.2)' },
    message: { label: 'Message', icon: '💬', gradient: 'from-teal-500 to-cyan-600', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', glow: 'rgba(20,184,166,0.2)' },
    notification: { label: 'Notification', icon: '📡', gradient: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', glow: 'rgba(14,165,233,0.2)' },
};

const FILTERS = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'critical', label: 'Critical', icon: '🔴' },
    { key: 'emergency', label: 'Emergency', icon: '🚨' },
    { key: 'medical', label: 'Medical', icon: '📄' },
    { key: 'donor', label: 'Donor', icon: '❤️' },
    { key: 'hospital', label: 'Hospital', icon: '🏥' },
    { key: 'ai', label: 'AI Insights', icon: '🧠' },
    { key: 'system', label: 'System', icon: '⚙️' },
];

const PRIORITY_COLORS = {
    Critical: { bar: '#DC2626', text: 'text-red-600', bg: 'bg-red-100' },
    High: { bar: '#F97316', text: 'text-orange-600', bg: 'bg-orange-100' },
    Medium: { bar: '#EAB308', text: 'text-yellow-600', bg: 'bg-yellow-100' },
    Low: { bar: '#22C55E', text: 'text-green-600', bg: 'bg-green-100' },
};

// ─── Helper Functions ───────────────────────────────────────────────────

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

const computePriorityScore = (item) => {
    const severityMap = { Critical: 95, High: 80, Medium: 60, Low: 30, Info: 20 };
    const base = severityMap[item.severity] || 30;
    const ageHours = (Date.now() - new Date(item.time || Date.now()).getTime()) / 3600000;
    const recency = Math.max(0, 20 - ageHours);
    const typeBoost = item.type === 'sos_alert' || item.type === 'critical' ? 15 : item.type === 'emergency' ? 10 : 0;
    return Math.min(100, Math.max(5, base + recency + typeBoost));
};

const getAiExplanation = (item) => {
    const type = normalizeType(item.type);
    switch (type) {
        case 'sos_alert':
        case 'emergency':
        case 'critical':
            return `AI detected that your ${item.severity?.toLowerCase() || 'emergency'} request matches ${item.metadata?.hospital || 'nearby hospitals'} with an estimated response of ${item.metadata?.eta_minutes || 'under 10'} minutes.`;
        case 'medical':
            return `AI analyzed your recent health data and identified ${item.metadata?.condition || 'a change in your vitals'}. ${item.metadata?.recommendation || 'Consider reviewing the details for more information.'}`;
        case 'donor':
            return `AI matched you with ${item.metadata?.donor_name || 'a compatible donor'} (${item.metadata?.blood_group || 'matching blood type'}) located ${item.metadata?.distance || 'nearby'}.`;
        case 'hospital':
            return `AI prioritized this hospital update based on ${item.severity?.toLowerCase() || 'current'} operational status and patient impact.`;
        case 'ai':
            return `AI generated this insight from analyzing ${item.metadata?.data_source || 'recent system data'} with ${item.metadata?.confidence || 'high'} confidence.`;
        case 'system':
            return `System notification based on ${item.metadata?.event || 'monitored'} platform conditions.`;
        default:
            return `AI analyzed this event using contextual data and determined it requires your attention. Confidence: ${item.metadata?.confidence || 'high'}.`;
    }
};

const getActions = (item) => {
    const type = normalizeType(item.type);
    const actions = [];
    if (type === 'sos_alert' || type === 'emergency' || type === 'critical') {
        actions.push({ label: 'View Details', icon: '👁️', action: 'details' });
        actions.push({ label: 'Navigate', icon: '🗺️', action: 'navigate' });
        actions.push({ label: 'Call', icon: '📞', action: 'call' });
        actions.push({ label: 'Dismiss', icon: '✕', action: 'dismiss' });
    } else if (type === 'donor') {
        actions.push({ label: 'View Donor', icon: '👤', action: 'details' });
        actions.push({ label: 'Contact', icon: '📞', action: 'call' });
        actions.push({ label: 'Accept', icon: '✅', action: 'accept' });
        actions.push({ label: 'Dismiss', icon: '✕', action: 'dismiss' });
    } else if (type === 'medical') {
        actions.push({ label: 'View Details', icon: '👁️', action: 'details' });
        actions.push({ label: 'Open AI Analysis', icon: '🧠', action: 'ai' });
        actions.push({ label: 'Share', icon: '📤', action: 'share' });
    } else if (type === 'hospital') {
        actions.push({ label: 'View Details', icon: '👁️', action: 'details' });
        actions.push({ label: 'Contact', icon: '📞', action: 'call' });
        actions.push({ label: 'Navigate', icon: '🗺️', action: 'navigate' });
    } else if (type === 'ai') {
        actions.push({ label: 'View Analysis', icon: '🧠', action: 'details' });
        actions.push({ label: 'Share', icon: '📤', action: 'share' });
        actions.push({ label: 'Dismiss', icon: '✕', action: 'dismiss' });
    } else {
        actions.push({ label: 'View Details', icon: '👁️', action: 'details' });
        actions.push({ label: 'Dismiss', icon: '✕', action: 'dismiss' });
    }
    return actions;
};

// ── Map frontend notification type to backend item_type for API calls ──
const TYPE_TO_BACKEND = {
    sos_alert: 'alert', emergency: 'alert', critical: 'alert', alert: 'alert',
    request: 'request', resource: 'request', donor: 'request',
    message: 'message', hospital: 'message', system: 'message',
    medical: 'message', notification: 'message', ai: 'message', success: 'message',
};

const groupByDate = (items) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const groups = { today: [], yesterday: [], earlier: [] };
    items.forEach((item) => {
        const t = new Date(item.time || Date.now()).getTime();
        if (t >= today) groups.today.push(item);
        else if (t >= yesterday) groups.yesterday.push(item);
        else groups.earlier.push(item);
    });
    return groups;
};

const generateTimeline = (item) => {
    const now = Date.now();
    const eventTime = new Date(item.time || now).getTime();
    const type = normalizeType(item.type);
    const steps = [
        { icon: '📡', label: 'Event Detected', time: new Date(eventTime - 120000).toISOString(), status: 'completed' },
        { icon: '🧠', label: 'AI Analysis', time: new Date(eventTime - 60000).toISOString(), status: 'completed' },
    ];
    if (type === 'sos_alert' || type === 'emergency' || type === 'critical') {
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
        steps.push({ icon: '✅', label: 'Completed', time: null, status: 'pending' });
    }
    return steps;
};

// ─── Notification Card Component ─────────────────────────────────────────

const NotificationCard = ({ item, index, onOpenDetails, onDismiss }) => {
    const type = normalizeType(item.type);
    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.notification;
    const priority = computePriorityScore(item);
    const pc = priority >= 80 ? PRIORITY_COLORS.Critical : priority >= 60 ? PRIORITY_COLORS.High : priority >= 40 ? PRIORITY_COLORS.Medium : PRIORITY_COLORS.Low;
    const actions = getActions(item);
    const isCritical = type === 'sos_alert' || type === 'emergency' || type === 'critical';

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
                ${config.border} ${config.bg} bg-opacity-40
                hover:shadow-xl hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_${config.glow}]
                ${isCritical ? 'animate-breathing-red-glow' : ''}
                ${item.isRead ? 'opacity-70' : 'border-l-4'}`}
            style={{
                animationDelay: `${index * 80}ms`,
                animation: `slideInUp 0.5s ease-out ${index * 80}ms both`,
                ...(isCritical && !item.isRead ? {
                    boxShadow: `0 0 20px ${config.glow}, inset 0 0 20px ${config.glow}`,
                } : {}),
            }}
            onClick={() => onOpenDetails?.(item)}
        >
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-[0.03] pointer-events-none`} />

            {/* Content */}
            <div className="relative p-4 sm:p-5">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-xl shadow-lg flex-shrink-0
                        ${isCritical ? 'animate-icon-glow' : 'group-hover:scale-110'} transition-transform duration-300`}>
                        <span className="relative z-10">{config.icon}</span>
                        {isCritical && (
                            <span className="absolute inset-0 rounded-xl animate-ping-slow opacity-30" style={{ background: config.glow }} />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 truncate">{item.title || config.label}</h4>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.msg || item.message || ''}</p>
                            </div>
                            {/* AI Priority Badge */}
                            <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg ${pc.bg}`}>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">AI</span>
                                <span className={`text-xs font-bold ${pc.text}`}>{priority}%</span>
                            </div>
                        </div>

                        {/* Severity & Meta Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            {item.severity && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${pc.bg} ${pc.text}`}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pc.bar }} />
                                    {item.severity}
                                </span>
                            )}
                            {item.metadata?.eta_minutes && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/70 text-gray-600">
                                    🚀 ETA {item.metadata.eta_minutes} min
                                </span>
                            )}
                            {item.metadata?.distance && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/70 text-gray-600">
                                    📍 {item.metadata.distance} km
                                </span>
                            )}
                            {item.metadata?.hospital && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/70 text-gray-600">
                                    🏥 {item.metadata.hospital}
                                </span>
                            )}
                            {item.metadata?.blood_group && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/70 text-gray-600">
                                    🩸 {item.metadata.blood_group}
                                </span>
                            )}
                            {!item.isRead && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg animate-pulse-slow">
                                    ● New
                                </span>
                            )}
                        </div>

                        {/* AI Explanation */}
                        <div className="mt-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100/50">
                            <div className="flex items-start gap-2">
                                <span className="text-xs mt-0.5">🤖</span>
                                <div>
                                    <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">AI Analysis</p>
                                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{getAiExplanation(item)}</p>
                                </div>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${priority}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-indigo-600">AI Confidence {priority}%</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            {actions.map((act, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (act.action === 'dismiss') onDismiss?.(item);
                                        else if (act.action === 'details') onOpenDetails?.(item);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200
                                        ${act.action === 'dismiss'
                                            ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                            : act.action === 'call'
                                                ? 'text-green-600 bg-green-50 hover:bg-green-100 hover:shadow-md'
                                                : act.action === 'navigate'
                                                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 hover:shadow-md'
                                                    : 'text-gray-600 bg-white hover:bg-gray-50 hover:shadow-md'}
                                        hover:-translate-y-0.5 active:scale-95`}
                                >
                                    <span>{act.icon}</span>
                                    <span>{act.label}</span>
                                </button>
                            ))}
                            <span className="text-[10px] text-gray-400 ml-auto">
                                {new Date(item.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Timeline Component ────────────────────────────────────────────────

const NotificationTimeline = ({ steps }) => (
    <div className="relative pl-8 space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-gray-200 rounded-full" />
        {steps.map((step, i) => (
            <div key={i} className="relative pb-6 last:pb-0">
                {/* Node */}
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
                {/* Content */}
                <div className="ml-2">
                    <p className={`text-xs font-bold ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
                        {step.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                        {step.time ? new Date(step.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                </div>
            </div>
        ))}
    </div>
);

// ─── Main NotificationHub Component ────────────────────────────────────

const NotificationHub = ({ onClose, onMarkRead, variant = 'panel' }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [lastSynced, setLastSynced] = useState(null);
    const [newNotification, setNewNotification] = useState(null);
    const intervalRef = useRef(null);
    const listRef = useRef(null);
    const prevNotificationsRef = useRef([]);
    const readKey = user?.id ? `lifelink:lastReadTime:${user.id}` : 'lifelink:lastReadTime';

    // ── Fetch Notifications ──
    const fetchNotifications = useCallback(async () => {
        if (!user?.id) { setLoading(false); return; }
        try {
            const { data, ok } = await apiFetch(`/api/notifications/${user.id}`, { method: 'GET' });
            const payload = ok && data?.notifications ? data.notifications : [];
            const lastRead = localStorage.getItem(readKey);
            const lastReadDate = lastRead ? new Date(lastRead) : new Date(0);

            // Check for new notifications since last fetch (using ref to avoid stale closure)
            const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));

            const merged = (payload || []).map((item) => {
                const type = normalizeType(item.type || item.source);
                const metadata = item.metadata || {};
                return {
                    id: item.id || item._id,
                    type,
                    title: item.title || NOTIFICATION_TYPES[type]?.label || 'Notification',
                    msg: item.message || item.msg || item.title || '',
                    time: item.timestamp || item.createdAt || new Date().toISOString(),
                    severity: item.severity || 'Info',
                    severity_score: item.severity_score ?? metadata.severity_score ?? 'N/A',
                    ambulance_type: item.ambulance_type || metadata.ambulance_type || 'Standard',
                    route: metadata.route,
                    actionLabel: metadata.actionLabel || undefined,
                    metadata,
                    isRead: new Date(item.timestamp || item.createdAt || new Date().toISOString()) <= lastReadDate,
                };
            });

            // Sort by AI priority score (highest first)
            merged.sort((a, b) => computePriorityScore(b) - computePriorityScore(a));

            // Check for new items
            const newItems = merged.filter(n => !prevIds.has(n.id));
            if (newItems.length > 0 && prevNotificationsRef.current.length > 0) {
                setNewNotification(newItems[0]);
                setTimeout(() => setNewNotification(null), 3000);
            }

            setNotifications(merged);
            prevNotificationsRef.current = merged;
            setLastSynced(new Date().toISOString());
        } catch (err) {
            console.error('Notification fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, readKey]);

    useEffect(() => {
        fetchNotifications();
        intervalRef.current = setInterval(fetchNotifications, 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchNotifications]);

    // ── Mark All as Read ──
    const handleMarkAllAsRead = () => {
        const now = new Date().toISOString();
        localStorage.setItem(readKey, now);
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        if (onMarkRead) onMarkRead();
        showToast('✅ All notifications marked as read.', 'success');
    };

    // ── Mark Single as Read ──
    const handleMarkSingleAsRead = (item) => {
        setNotifications((prev) => prev.map((n) =>
            n.id === item.id ? { ...n, isRead: true } : n
        ));
    };

    // ── Dismiss with undo support ──
    const handleDismiss = async (item) => {
        const dismissedItem = item;
        setNotifications(prev => prev.filter(n => n.id !== item.id));
        if (selectedNotification?.id === item.id) setSelectedNotification(null);

        // Try API, but optimistically remove from UI
        try {
            const backendType = TYPE_TO_BACKEND[item.type] || 'alert';
            const res = await apiFetch(`/api/dashboard/notification/${backendType}/${item.id}`, { method: 'DELETE' });
            if (!res.ok) {
                // Restore on failure
                setNotifications(prev => [...prev, dismissedItem]);
                showToast('❌ Failed to dismiss notification.', 'error');
                return;
            }
        } catch (err) {
            console.error('Dismiss failed', err);
            // Keep UI optimistic — don't revert on network error
        }
    };

    // ── Archive ──
    const handleArchive = async (item) => {
        const archivedItem = item;
        setNotifications(prev => prev.filter(n => n.id !== item.id));
        try {
            const backendType = TYPE_TO_BACKEND[item.type] || 'alert';
            const res = await apiFetch(`/api/dashboard/notification/${backendType}/${item.id}/archive`, { method: 'PUT' });
            if (!res.ok) {
                setNotifications(prev => [...prev, archivedItem]);
                showToast('❌ Failed to archive notification.', 'error');
            }
        } catch (err) {
            showToast('❌ Failed to archive notification.', 'error');
        }
    };

    // ── Click Handler ──
    const handleNotificationClick = (item) => {
        setSelectedNotification(item);
    };

    // ── Filter & Search ──
    const filtered = useMemo(() => {
        let items = notifications;
        if (activeFilter !== 'all') {
            items = items.filter(n => n.type === activeFilter || (activeFilter === 'critical' && (n.type === 'sos_alert' || n.type === 'emergency' || n.severity === 'Critical')));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(n =>
                (n.title || '').toLowerCase().includes(q) ||
                (n.msg || '').toLowerCase().includes(q) ||
                (n.severity || '').toLowerCase().includes(q) ||
                (n.type || '').toLowerCase().includes(q) ||
                JSON.stringify(n.metadata || {}).toLowerCase().includes(q)
            );
        }
        return items;
    }, [notifications, activeFilter, searchQuery]);

    // ── Group by date ──
    const grouped = useMemo(() => groupByDate(filtered), [filtered]);

    // ── Stats ──
    const stats = useMemo(() => {
        const unread = notifications.filter(n => !n.isRead).length;
        const critical = notifications.filter(n => n.severity === 'Critical' || n.type === 'sos_alert' || n.type === 'emergency').length;
        const today = grouped.today.length;
        return { unread, critical, today };
    }, [notifications, grouped]);

    // ── Smart Summary ──
    const summary = useMemo(() => {
        const emergencies = notifications.filter(n => n.type === 'sos_alert' || n.type === 'emergency').length;
        const donors = notifications.filter(n => n.type === 'donor').length;
        const hospitals = notifications.filter(n => n.type === 'hospital').length;
        const etas = notifications
            .map(n => n.metadata?.eta_minutes)
            .filter(Boolean)
            .map(Number);
        const avgEta = etas.length > 0 ? Math.round(etas.reduce((a, b) => a + b, 0) / etas.length) : null;
        const avgConfidence = notifications.length > 0
            ? Math.round(notifications.reduce((sum, n) => sum + computePriorityScore(n), 0) / notifications.length)
            : 0;
        return { emergencies, donors, hospitals, avgEta, avgConfidence };
    }, [notifications]);

    // ── Empty State ──
    if (!loading && notifications.length === 0) {
        return (
            <div className="w-full max-w-4xl mx-auto animate-fade-in">
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 animate-pulse-slow" />
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-xl">
                            📡
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Notifications</h3>
                    <p className="text-sm text-gray-500 max-w-md leading-relaxed">
                        LifeLink AI is continuously monitoring your healthcare network. Everything looks good.
                    </p>
                    <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
                        Last AI scan {lastSynced ? new Date(lastSynced).toLocaleTimeString() : 'just now'}
                    </div>
                    <button
                        onClick={fetchNotifications}
                        className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
            {/* ── New Notification Toast ── */}
            {newNotification && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in-right" onClick={() => { setNewNotification(null); handleNotificationClick(newNotification); }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg">📬</div>
                        <div>
                            <p className="text-xs font-bold text-indigo-600">New Notification</p>
                            <p className="text-sm text-gray-700 font-medium">{newNotification.title}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 shadow-2xl">
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-purple-500 to-pink-500" />
                <div className="relative">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl sm:text-2xl font-bold text-white">LifeLink AI Notification Center</h2>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                                    <span className="text-[10px] font-bold text-emerald-300 tracking-wider">LIVE</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400">Live Emergency Intelligence · AI Monitoring Active</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">
                                {lastSynced ? `Synced ${new Date(lastSynced).toLocaleTimeString()}` : 'Connecting...'}
                            </span>
                            <button
                                onClick={handleMarkAllAsRead}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all duration-200 active:scale-95"
                            >
                                Mark all read
                            </button>
                            {onClose && (
                                <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                        {[
                            { label: 'Unread', value: stats.unread, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-500/10' },
                            { label: 'Critical', value: stats.critical, color: 'from-red-400 to-rose-500', bg: 'bg-red-500/10' },
                            { label: 'New Today', value: stats.today, color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-500/10' },
                            { label: 'Total', value: notifications.length, color: 'from-purple-400 to-fuchsia-500', bg: 'bg-purple-500/10' },
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} rounded-xl p-3 border border-white/5 backdrop-blur-sm`}>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                                <p className={`text-2xl sm:text-3xl font-bold mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent animate-count-up`}>
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Smart Summary ── */}
            {notifications.length > 0 && (
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📊</span>
                        <h3 className="text-sm font-bold text-indigo-800">Today's Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { icon: '🚨', label: 'Emergencies', value: summary.emergencies },
                            { icon: '❤️', label: 'Donor Matches', value: summary.donors },
                            { icon: '🏥', label: 'Hospitals Responded', value: summary.hospitals },
                            { icon: '🧠', label: 'AI Confidence', value: `${summary.avgConfidence}%` },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/60 rounded-xl p-3 backdrop-blur-sm border border-white/80">
                                <span className="text-lg">{s.icon}</span>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
                                    <p className="text-sm font-bold text-gray-800">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {summary.avgEta && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 font-medium">
                            <span>🚀</span>
                            <span>Average ETA: ~{summary.avgEta} minutes</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Search ── */}
            <div className="mb-4">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        type="text"
                        placeholder="Search notifications... (hospital, blood, ETA, donor, critical)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="mb-5 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2 pb-2 min-w-max">
                    {FILTERS.map((filter) => {
                        const isActive = activeFilter === filter.key;
                        return (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200'
                                    } active:scale-95`}
                            >
                                <span>{filter.icon}</span>
                                <span>{filter.label}</span>
                                {isActive && (
                                    <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-500 opacity-20 animate-pulse-slow" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Loading State ── */}
            {loading && (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                    <div className="h-8 bg-gray-100 rounded-xl w-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Notification List ── */}
            {!loading && (
                <div ref={listRef} className="space-y-6">
                    {filtered.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-sm">No notifications match this filter.</p>
                        </div>
                    )}

                    {/* Today */}
                    {grouped.today.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today</span>
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] text-gray-400">{grouped.today.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {grouped.today.map((item, i) => (
                                    <NotificationCard key={item.id} item={item} index={i} onOpenDetails={handleNotificationClick} onDismiss={handleDismiss} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Yesterday */}
                    {grouped.yesterday.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 mt-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Yesterday</span>
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] text-gray-400">{grouped.yesterday.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {grouped.yesterday.map((item, i) => (
                                    <NotificationCard key={item.id} item={item} index={i} onOpenDetails={handleNotificationClick} onDismiss={handleDismiss} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Earlier */}
                    {grouped.earlier.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 mt-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Earlier</span>
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] text-gray-400">{grouped.earlier.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {grouped.earlier.map((item, i) => (
                                    <NotificationCard key={item.id} item={item} index={i} onOpenDetails={handleNotificationClick} onDismiss={handleDismiss} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Global Notification Detail Modal ── */}
            {selectedNotification && (
                <NotificationDetailModal
                    item={selectedNotification}
                    isOpen={Boolean(selectedNotification)}
                    onClose={() => setSelectedNotification(null)}
                    onDismiss={handleDismiss}
                    onMarkAsRead={handleMarkSingleAsRead}
                    onArchive={handleArchive}
                />
            )}

            {/* ── Toast Container ── */}
            <NotificationToastContainer />
        </div>
    );
};

export default NotificationHub;
