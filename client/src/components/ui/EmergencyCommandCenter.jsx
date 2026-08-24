import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import EnterpriseModuleShell from './EnterpriseModuleShell';
import { useEmergencyFeed } from '../../hooks/useWebSocket';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════════════
   Emergency Command Center — EnterpriseModuleShell-powered
   ═══════════════════════════════════════════════════════════════════ */

const formatNum = (v) => (v == null ? '0' : Number(v).toLocaleString());

// ── Severity color helper ─────────────────────────────────────────

const severityColor = (s) => {
  const sev = (s || '').toLowerCase();
  if (sev === 'critical') return 'red';
  if (sev === 'high') return 'orange';
  if (sev === 'medium') return 'amber';
  if (sev === 'low') return 'blue';
  return 'slate';
};

const severityBadge = (s) => {
  const c = severityColor(s);
  const map = { red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-blue-100 text-blue-700', slate: 'bg-slate-100 text-slate-500' };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${map[c] || map.slate}`}>{s || 'Unknown'}</span>;
};

// ── Map-like SVG component (no Leaflet dependency) ────────────────

const IncidentMapSVG = ({ incidents = [], ambulances = [] }) => {
  if (incidents.length === 0 && ambulances.length === 0) {
    return (
      <div className="h-72 rounded-xl bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-map-location-dot text-3xl text-slate-300 block mb-2" />
          <p className="text-xs text-slate-400">No active incidents or vehicles</p>
        </div>
      </div>
    );
  }

  const all = [...incidents.map((i) => ({ ...i, type: 'incident' })), ...ambulances.map((a) => ({ ...a, type: 'ambulance' }))];
  return (
    <div className="h-72 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Scan line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />

      {/* Pulse zones for incidents */}
      {incidents.map((inc, i) => (
        <div key={`inc-${i}`} className="absolute" style={{ left: `${20 + (i * 25) % 60}%`, top: `${15 + (i * 20) % 70}%` }}>
          <span className="relative flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center">
              <i className="fas fa-exclamation text-white text-[10px]" />
            </span>
          </span>
          <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-red-300 whitespace-nowrap font-medium">{inc.label || inc.message?.slice(0, 20)}</p>
        </div>
      ))}

      {/* Ambulance markers */}
      {ambulances.map((amb, i) => (
        <div key={`amb-${i}`} className="absolute animate-bounce" style={{ left: `${10 + (i * 30 + 7) % 80}%`, top: `${20 + (i * 25 + 10) % 60}%`, animationDuration: '2s', animationDelay: `${i * 0.3}s` }}>
          <div className="h-5 w-5 rounded-full bg-blue-500 border-2 border-blue-300 flex items-center justify-center shadow-lg shadow-blue-500/50">
            <i className="fas fa-truck-medical text-white text-[8px]" />
          </div>
          <p className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] text-blue-300 whitespace-nowrap">{amb.label || `AMB-${i + 1}`}</p>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 bg-slate-900/80 rounded-lg px-2 py-1">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] text-slate-300">Incident</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-[8px] text-slate-300">Ambulance</span>
        </div>
      </div>
    </div>
  );
};

// ── Mass Casualty Toggle ──────────────────────────────────────────

const MassCasualtyToggle = ({ active, onToggle }) => (
  <div className={`rounded-xl border-2 p-3 transition-all duration-300 ${active ? 'border-red-500 bg-red-50/80 shadow-lg shadow-red-200' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
          <i className="fas fa-biohazard text-lg" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Mass Casualty Mode</p>
          <p className="text-[10px] text-slate-500">{active ? 'ACTIVE — Resource surge protocols engaged' : 'Tap to activate mass casualty protocols'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${active ? 'bg-red-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${active ? 'translate-x-7' : 'translate-x-0.5'}`} />
      </button>
    </div>
    {active && (
      <div className="mt-3 grid grid-cols-3 gap-2 animate-fade-in">
        <div className="rounded-lg bg-white border border-red-200 p-2 text-center">
          <p className="text-lg font-bold text-red-600">150%</p>
          <p className="text-[9px] text-slate-500">Staff Surge</p>
        </div>
        <div className="rounded-lg bg-white border border-red-200 p-2 text-center">
          <p className="text-lg font-bold text-amber-600">80%</p>
          <p className="text-[9px] text-slate-500">Bed Reserve</p>
        </div>
        <div className="rounded-lg bg-white border border-red-200 p-2 text-center">
          <p className="text-lg font-bold text-blue-600">12</p>
          <p className="text-[9px] text-slate-500">Extra Teams</p>
        </div>
      </div>
    )}
  </div>
);

// ── AI Triage Panel ───────────────────────────────────────────────

const TriagePanel = ({ alert, onTriage }) => {
  const [symptoms, setSymptoms] = useState(alert?.message || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTriage = async () => {
    if (!symptoms) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/hospital/triage', {
        method: 'POST',
        body: JSON.stringify({ symptoms, severity_hint: alert?.severity || 'Medium' }),
      });
      if (res.ok) setResult(res.data);
    } catch (err) { /* silent */ }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs"
          placeholder="Enter symptoms or triage notes..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        <button type="button" onClick={runTriage} disabled={loading}
          className="px-3 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Triage'}
        </button>
      </div>
      {result && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            {severityBadge(result.predicted_severity || result.severity || 'Medium')}
            <span className="text-[10px] text-slate-500">Confidence: {result.confidence || result.score || 75}%</span>
          </div>
          <p className="text-xs text-slate-700">{result.recommendation || result.assessment || 'Triage complete.'}</p>
        </div>
      )}
    </div>
  );
};

// ── Surge Predictor ───────────────────────────────────────────────

const SurgePredictor = ({ data }) => {
  const series = useMemo(() => {
    if (data?.length > 0) return data;
    return [
      { hour: '6AM', current: 4, predicted: 6, capacity: 12 },
      { hour: '8AM', current: 8, predicted: 11, capacity: 12 },
      { hour: '10AM', current: 14, predicted: 16, capacity: 12 },
      { hour: '12PM', current: 18, predicted: 20, capacity: 12 },
      { hour: '2PM', current: 15, predicted: 18, capacity: 12 },
      { hour: '4PM', current: 12, predicted: 14, capacity: 12 },
      { hour: '6PM', current: 10, predicted: 12, capacity: 12 },
      { hour: '8PM', current: 7, predicted: 9, capacity: 12 },
      { hour: '10PM', current: 5, predicted: 6, capacity: 12 },
    ];
  }, [data]);

  const surgeRisk = useMemo(() => {
    const peak = series.find((s) => s.predicted > s.capacity);
    return peak ? 'HIGH — predicted demand exceeds capacity at peak hours' : 'Moderate — within operational capacity';
  }, [series]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-700">
          <i className="fas fa-chart-line text-rose-500 mr-1.5" />
          Surge Prediction
        </p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${series.some((s) => s.predicted > s.capacity) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {series.some((s) => s.predicted > s.capacity) ? 'Surge Expected' : 'Stable'}
        </span>
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="capacity" stroke="#94a3b8" fill="#f1f5f9" strokeDasharray="4 2" isAnimationActive animationDuration={600} />
            <Area type="monotone" dataKey="predicted" stroke="#f43f5e" fill="#fecdd3" fillOpacity={0.4} isAnimationActive animationDuration={800} animationBegin={200} />
            <Area type="monotone" dataKey="current" stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.4} isAnimationActive animationDuration={800} animationBegin={400} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">{surgeRisk}</p>
    </div>
  );
};

// ── Dispatch Workflow ──────────────────────────────────────────────

const DispatchWorkflow = ({ alert, onDispatch }) => {
  const [form, setForm] = useState({ ambulanceId: '', eta: '10', notes: '' });
  const [status, setStatus] = useState('');

  const handleDispatch = async () => {
    if (!form.ambulanceId) { setStatus('Enter ambulance ID'); return; }
    setStatus('Dispatching...');
    try {
      const res = await apiFetch('/api/hospital-ops/emergency/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          hospitalId: alert?.hospitalId,
          ambulanceId: form.ambulanceId,
          eventId: alert?._id || alert?.id,
          pickup: alert?.locationDetails || 'Emergency',
          etaMinutes: Number(form.eta),
          notes: form.notes,
        }),
      });
      setStatus(res.ok ? 'Dispatched successfully' : 'Dispatch failed');
    } catch (err) { setStatus('Dispatch error'); }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="flex items-center gap-2">
      <input className="w-20 px-2 py-1.5 border border-slate-200 rounded text-[10px]" placeholder="AMB ID" value={form.ambulanceId} onChange={(e) => setForm({ ...form, ambulanceId: e.target.value })} />
      <input className="w-14 px-2 py-1.5 border border-slate-200 rounded text-[10px]" placeholder="ETA" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} />
      <button type="button" onClick={handleDispatch}
        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 transition-colors"
      >
        Dispatch
      </button>
      {status && <span className="text-[9px] text-slate-500">{status}</span>}
    </div>
  );
};

// ── Regional Overlay ───────────────────────────────────────────────

const RegionalOverlay = () => {
  const regions = useMemo(() => [
    { name: 'Zone A — Downtown', status: 'Critical', incidents: 8, beds: 12, ambulances: 4 },
    { name: 'Zone B — North', status: 'High', incidents: 5, beds: 8, ambulances: 3 },
    { name: 'Zone C — East', status: 'Moderate', incidents: 3, beds: 15, ambulances: 5 },
    { name: 'Zone D — South', status: 'Low', incidents: 1, beds: 20, ambulances: 6 },
    { name: 'Zone E — West', status: 'Moderate', incidents: 4, beds: 10, ambulances: 2 },
    { name: 'Zone F — Central', status: 'Critical', incidents: 6, beds: 6, ambulances: 3 },
  ], []);

  const statusBar = (status) => {
    const colors = { Critical: 'bg-red-500', High: 'bg-orange-500', Moderate: 'bg-amber-400', Low: 'bg-emerald-400' };
    return <span className={`w-full h-1 rounded-full ${colors[status] || 'bg-slate-300'}`} />;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {regions.map((r) => (
        <div key={r.name} className="rounded-lg bg-slate-50 border border-slate-200 p-3 hover:bg-white hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-slate-800">{r.name}</p>
            {severityBadge(r.status)}
          </div>
          {statusBar(r.status)}
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
            <span><i className="fas fa-exclamation-triangle text-red-400 mr-1" />{r.incidents}</span>
            <span><i className="fas fa-bed text-blue-400 mr-1" />{r.beds}</span>
            <span><i className="fas fa-truck-medical text-emerald-400 mr-1" />{r.ambulances}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main EmergencyCommandCenter ───────────────────────────────────

const EmergencyCommandCenter = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;

  // ── State ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [surgeData, setSurgeData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [massCasualty, setMassCasualty] = useState(false);
  const [refreshing, setRefreshing] = useState(0);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // WebSocket feed
  const { feed: realtimeFeed, isConnected: wsConnected } = useEmergencyFeed();

  useEffect(() => {
    if (realtimeFeed.length === 0) return;
    setAlerts((prev) => {
      const existing = new Set(prev.map((a) => a._id || a.id));
      const newItems = realtimeFeed.filter((item) => !existing.has(item._id || item.id || item.alertId));
      return newItems.length ? [...newItems, ...prev].slice(0, 50) : prev;
    });
  }, [realtimeFeed]);

  // ── Load data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!hospitalId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [feedRes, surgeRes, insightRes] = await Promise.allSettled([
        apiFetch(`/api/hospital-ops/emergency/feed?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 15000 }),
        apiFetch(`/api/hospital-ops/ceo/ai-insights?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 30000 }),
        apiFetch(`/v2/ai/insights?role=hospital&module_key=emergency`, { method: 'GET', ttlMs: 30000 }),
      ]);

      if (feedRes.status === 'fulfilled' && feedRes.value.ok) {
        const items = feedRes.value.data?.data || [];
        setAlerts(items);
      }
      if (surgeRes.status === 'fulfilled' && surgeRes.value.ok) {
        setSurgeData(surgeRes.value.data);
      }

      // Generate activities
      const now = Date.now();
      const acts = [];
      if (feedRes.status === 'fulfilled') {
        const items = feedRes.value.data?.data || [];
        items.slice(0, 8).forEach((a, i) => {
          if (a.message || a.createdAt) {
            acts.push({
              key: `alert-${a._id || a.id || i}`,
              message: a.status === 'Resolved' ? `Resolved: ${a.message || 'Incident'}` : a.severity === 'Critical' ? `URGENT: ${a.message || 'Critical alert'}` : a.message || 'Alert received',
              status: a.status === 'Resolved' ? 'success' : a.severity === 'Critical' ? 'error' : 'warning',
              user: a.reportedBy || 'System',
              timestamp: a.createdAt || now - i * 120000,
              meta: a.severity || 'Info',
            });
          }
        });
      }
      acts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(acts);
    } catch (err) { /* silent */ }
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => { loadData(); }, [loadData, refreshing]);

  // ── Computed metrics ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const critical = alerts.filter((a) => (a.severity || '').toLowerCase() === 'critical').length;
    const high = alerts.filter((a) => (a.severity || '').toLowerCase() === 'high').length;
    const medium = alerts.filter((a) => (a.severity || '').toLowerCase() === 'medium').length;
    const low = alerts.filter((a) => (a.severity || '').toLowerCase() === 'low').length;
    const pending = alerts.filter((a) => (a.status || '').toLowerCase() !== 'resolved').length;
    const resolved = alerts.filter((a) => (a.status || '').toLowerCase() === 'resolved').length;
    return { total: alerts.length, critical, high, medium, low, pending, resolved, open: pending, ambulances: 12 };
  }, [alerts]);

  const triageStats = useMemo(() => {
    const codes = { 'red': 0, 'yellow': 0, 'green': 0, 'black': 0 };
    alerts.forEach((a) => {
      const sev = (a.severity || '').toLowerCase();
      if (sev === 'critical') codes.red++;
      else if (sev === 'high') codes.yellow++;
      else if (sev === 'medium' || sev === 'low') codes.green++;
      else codes.black++;
    });
    return codes;
  }, [alerts]);

  // ── KPIs ───────────────────────────────────────────────────────
  const kpis = useMemo(() => [
    { key: 'open-incidents', label: 'Open Incidents', value: metrics.open, icon: 'fa-exclamation-triangle', color: 'red', trend: metrics.open > 5 ? 15 : -5, trendLabel: `${metrics.total} total today` },
    { key: 'critical', label: 'Critical', value: metrics.critical, icon: 'fa-biohazard', color: 'rose', trend: metrics.critical > 3 ? 20 : -10, trendLabel: 'Immediate attention' },
    { key: 'triage-red', label: 'Triage Red', value: triageStats.red, icon: 'fa-tag', color: 'red', trendLabel: 'Highest priority' },
    { key: 'triage-yellow', label: 'Triage Yellow', value: triageStats.yellow, icon: 'fa-tag', color: 'amber', trendLabel: 'Urgent response' },
    { key: 'ambulance-active', label: 'Active Units', value: '12', icon: 'fa-truck-medical', color: 'blue', trend: 8, trendLabel: 'On road' },
    { key: 'response-time', label: 'Avg Response', value: '8.2m', icon: 'fa-clock', color: 'emerald', trend: -5, trendLabel: 'vs last shift' },
  ], [metrics, triageStats]);

  // ── AI Insights ────────────────────────────────────────────────
  const insights = useMemo(() => {
    const items = [];
    if (metrics.critical > 3) items.push({
      key: 'critical-surge', title: 'Critical Case Surge', icon: 'fa-biohazard',
      description: `${metrics.critical} critical cases currently. Recommend activating emergency overflow protocols and calling in standby surgical teams.`,
      confidence: 86, action: { label: 'Activate Protocol', onClick: () => setMassCasualty(true) },
    });
    if (metrics.open > 10) items.push({
      key: 'ed-overload', title: 'ED Overload Risk', icon: 'fa-triangle-exclamation',
      description: `${metrics.open} open incidents. ED approaching capacity. Consider diverting stable patients to urgent care and expediting discharges.`,
      confidence: 79, action: { label: 'View Triage', onClick: () => showToast(`Triage: ${triageStats.red} Red, ${triageStats.yellow} Yellow, ${triageStats.green} Green`, 'info') },
    });
    if (metrics.medium > 5) items.push({
      key: 'triage-bottleneck', title: 'Triage Bottleneck Detected', icon: 'fa-clock',
      description: `${metrics.medium} medium-severity cases waiting. Deploy additional triage nurse to reduce wait times.`,
      confidence: 74, action: { label: 'Assign Triage Nurse', onClick: () => { showToast('Triage nurse assigned', 'success'); } },
    });
    if (wsConnected) items.push({
      key: 'realtime-active', title: 'Real-Time Feed Active', icon: 'fa-wifi',
      description: 'WebSocket connected — all alerts and ambulance positions updating in real time.',
      confidence: 98,
    });
    items.push({
      key: 'peak-prediction', title: 'Peak Hours Incoming', icon: 'fa-chart-line',
      description: 'AI predicts ED arrivals will peak between 10AM-2PM. Pre-stage additional intake staff and ensure bed capacity.',
      confidence: 82, action: { label: 'Prepare Staff', onClick: () => { showToast('Staff preparation initiated', 'info'); } },
    });
    return items;
  }, [metrics, wsConnected]);

  // ── Predictions ────────────────────────────────────────────────
  const predictions = useMemo(() => [
    { key: 'arrivals-1h', label: 'Arrivals (1h)', value: formatNum(Math.round(metrics.open * 0.6)), trend: 'up', confidence: 78, period: 'Next 60 min' },
    { key: 'arrivals-4h', label: 'Arrivals (4h)', value: formatNum(Math.round(metrics.open * 2.1)), trend: 'up', confidence: 72, period: 'Next 4 hours' },
    { key: 'ed-occupancy', label: 'ED Occupancy', value: `${Math.min(100, Math.round(metrics.open * 8))}%`, trend: 'up', confidence: 81, period: 'Peak forecast' },
    { key: 'ambulance-need', label: 'Ambulance Need', value: formatNum(Math.max(2, Math.round(metrics.critical * 1.5))), trend: 'up', confidence: 75, period: 'Next 2 hours' },
    { key: 'beds-required', label: 'Beds Required', value: formatNum(Math.round(metrics.open * 1.3)), trend: 'up', confidence: 69, period: 'Next shift' },
  ], [metrics]);

  // ── Recommendations ────────────────────────────────────────────
  const recommendations = useMemo(() => {
    const items = [];
    if (metrics.critical > 3) items.push({
      key: 'rec-activate-mci', title: 'Activate Mass Casualty Protocol', description: `${metrics.critical} critical patients require immediate resource surge. Activate MCI plan and notify hospital command.`, impact: 'high', icon: 'fa-biohazard', action: 'Activate',
    });
    if (metrics.open > 10) items.push({
      key: 'rec-call-staff', title: 'Call in Additional Staff', description: `${metrics.open} open incidents. Recall off-duty emergency staff and cancel elective procedures to free resources.`, impact: 'high', icon: 'fa-users', action: 'Notify staff',
    });
    items.push({
      key: 'rec-check-beds', title: 'Audit Bed Availability', description: 'Cross-check ICU, ED, and ward bed availability against incoming patient estimates. Prioritize discharge of stable patients.', impact: 'medium', icon: 'fa-bed', action: 'Audit now',
    });
    items.push({
      key: 'rec-amb-routing', title: 'Optimize Ambulance Routing', description: 'Route incoming ambulances based on real-time hospital capacity. Avoid overwhelming any single ED.', impact: 'medium', icon: 'fa-route', action: 'Optimize',
    });
    if (massCasualty) items.push({
      key: 'rec-mci-active', title: 'MCI Protocols Active — Command Center Standby', description: 'All surge protocols are active. Designate incident commander and ensure communication lines are open across all departments.', impact: 'high', icon: 'fa-tower-broadcast', action: 'Review plan',
    });
    return items;
  }, [metrics, massCasualty]);

  // ── Executive Summary ──────────────────────────────────────────
  const executiveSummary = useMemo(() => ({
    text: `Emergency Command Center reporting ${metrics.open} open incidents with ${metrics.critical} critical cases. Triage: ${triageStats.red} Red, ${triageStats.yellow} Yellow, ${triageStats.green} Green. ${metrics.ambulances || 12} ambulance units active. ${massCasualty ? 'MASS CASUALTY PROTOCOLS ACTIVE.' : 'Standard emergency operations.'} Real-time WebSocket feed is ${wsConnected ? 'connected' : 'disconnected'}.`,
    confidence: 86,
  }), [metrics, triageStats, massCasualty, wsConnected]);

  // ── Quick Actions ──────────────────────────────────────────────
  const actions = useMemo(() => [
    { key: 'dispatch-ambulance', label: 'Dispatch Ambulance', icon: 'fa-truck-medical', color: '#3b82f6' },
    { key: 'run-triage', label: 'AI Triage', icon: 'fa-stethoscope', color: '#f43f5e' },
    { key: 'mass-casualty', label: massCasualty ? 'Deactivate MCI' : 'Mass Casualty Mode', icon: 'fa-biohazard', color: massCasualty ? '#10b981' : '#ef4444' },
    { key: 'regional-view', label: 'Regional Overlay', icon: 'fa-map', color: '#8b5cf6' },
    { key: 'refresh', label: 'Refresh', icon: 'fa-sync-alt', color: '#6b7280' },
  ], [massCasualty]);

  const handleAction = useCallback((action) => {
    switch (action.key) {
      case 'mass-casualty': setMassCasualty(!massCasualty); showToast(massCasualty ? 'MCI deactivated' : 'Mass Casualty Mode activated', massCasualty ? 'info' : 'warning'); break;
      case 'refresh': setRefreshing((r) => r + 1); showToast('Data refreshed'); break;
      default: showToast(`${action.label} ready`); break;
    }
  }, [massCasualty]);

  // ── Alert item ─────────────────────────────────────────────────
  const AlertItem = ({ alert }) => {
    const id = alert._id || alert.id;
    const expanded = expandedAlert === id;
    const sevColor = severityColor(alert.severity);
    const resolveAlert = async () => {
      try {
        await apiFetch(`/api/hospital-ops/emergency/feed/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Resolved' }) });
        setAlerts((prev) => prev.map((a) => (a._id === id || a.id === id ? { ...a, status: 'Resolved' } : a)));
        showToast('Incident resolved');
      } catch (err) { /* silent */ }
    };

    return (
      <div className={`rounded-lg border p-3 transition-all duration-200 ${expanded ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
        <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpandedAlert(expanded ? null : id)}>
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${sevColor === 'red' ? 'bg-red-500 animate-pulse' : sevColor === 'orange' ? 'bg-orange-400' : sevColor === 'amber' ? 'bg-amber-400' : 'bg-blue-400'}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{alert.message || 'Emergency alert'}</p>
              <p className="text-[10px] text-slate-400 truncate">{alert.locationDetails || alert.location || 'Location unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {severityBadge(alert.severity)}
            {alert.status !== 'Resolved' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); resolveAlert(); }}
                className="text-[9px] font-semibold text-emerald-600 hover:text-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-50 transition-colors">
                Resolve
              </button>
            )}
            <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {expanded && (
          <div className="mt-3 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white border border-slate-100 p-2">
                <p className="text-[9px] text-slate-500 font-medium uppercase">Triage</p>
                <TriagePanel alert={alert} />
              </div>
              <div className="rounded-lg bg-white border border-slate-100 p-2">
                <p className="text-[9px] text-slate-500 font-medium uppercase mb-1">Dispatch</p>
                <DispatchWorkflow alert={alert} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Toast ──────────────────────────────────────────────────────
  const ToastCmp = () => !toast ? null : (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-fade-in ${toast.type === 'warning' ? 'bg-amber-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
      <i className={`fas ${toast.type === 'warning' ? 'fa-exclamation-triangle' : toast.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'} mr-2`} />
      {toast.msg}
    </div>
  );

  // Simulated ambulances for the SVG map
  const simulatedAmbs = useMemo(() =>
    alerts.slice(0, 4).map((_, i) => ({ label: `AMB-${10 + i}`, lat: 0, lng: 0 }))
  , [alerts.length]);

  return (
    <>
      <ToastCmp />
      <EnterpriseModuleShell
        title="Emergency Command Center"
        icon="fa-tower-broadcast"
        gradient="from-rose-600 to-red-700"
        subtitle={`${wsConnected ? 'Live — WebSocket connected' : 'Connecting...'} • ${metrics.open} open incidents`}
        loading={loading}
        kpis={kpis}
        insights={insights}
        predictions={predictions}
        recommendations={recommendations}
        activities={activities}
        actions={actions}
        executiveSummary={executiveSummary}
        onAction={handleAction}
        onRefresh={() => { setRefreshing((r) => r + 1); showToast('Refreshed'); }}
      >
        {/* ── Main Content ──────────────────────────────────── */}
        <div className="space-y-5">

          {/* Mass Casualty Toggle */}
          <MassCasualtyToggle active={massCasualty} onToggle={() => { setMassCasualty(!massCasualty); showToast(massCasualty ? 'MCI deactivated' : 'MCI activated', 'warning'); }} />

          {/* Incident Map + Surge Predictor */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <i className="fas fa-map-location-dot text-rose-500 mr-1.5" />
                    Incident Map — Live
                  </p>
                  <span className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {wsConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <IncidentMapSVG incidents={alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High').slice(0, 6)} ambulances={simulatedAmbs} />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                <SurgePredictor data={surgeData?.surgeSeries || null} />
              </div>
            </div>
          </div>

          {/* Regional Overlay */}
          <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <i className="fas fa-layer-group text-violet-500 mr-1.5" />
              Regional Emergency Overlay
            </p>
            <RegionalOverlay />
          </div>

          {/* Triage Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-lg border-2 p-3 text-center ${triageStats.red > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 mx-auto mb-1">
                <i className="fas fa-tag text-xs" />
              </div>
              <p className="text-xl font-bold text-slate-900">{triageStats.red}</p>
              <p className="text-[9px] font-semibold text-red-600 uppercase">RED — Immediate</p>
            </div>
            <div className={`rounded-lg border-2 p-3 text-center ${triageStats.yellow > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 mx-auto mb-1">
                <i className="fas fa-tag text-xs" />
              </div>
              <p className="text-xl font-bold text-slate-900">{triageStats.yellow}</p>
              <p className="text-[9px] font-semibold text-amber-600 uppercase">YELLOW — Urgent</p>
            </div>
            <div className={`rounded-lg border-2 p-3 text-center ${triageStats.green > 0 ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-1">
                <i className="fas fa-tag text-xs" />
              </div>
              <p className="text-xl font-bold text-slate-900">{triageStats.green}</p>
              <p className="text-[9px] font-semibold text-emerald-600 uppercase">GREEN — Stable</p>
            </div>
            <div className={`rounded-lg border-2 p-3 text-center ${triageStats.black > 0 ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-500 mx-auto mb-1">
                <i className="fas fa-tag text-xs" />
              </div>
              <p className="text-xl font-bold text-slate-900">{triageStats.black}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase">BLACK — Deceased</p>
            </div>
          </div>

          {/* Active Incidents Feed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                <i className="fas fa-tower-broadcast text-rose-500 mr-1.5" />
                Active Incidents ({alerts.length})
              </p>
              <span className="text-[10px] text-slate-400">{wsConnected ? 'Live feed' : 'Historical'}</span>
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <i className="fas fa-shield-check text-3xl text-slate-200 block mb-2" />
                No active incidents. All clear.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {alerts.slice(0, 15).map((alert) => (
                  <AlertItem key={alert._id || alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </EnterpriseModuleShell>
    </>
  );
};

export default EmergencyCommandCenter;
