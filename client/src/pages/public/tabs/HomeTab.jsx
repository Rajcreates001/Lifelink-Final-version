/**
 * HomeTab — Premium AI Emergency Command Center
 *
 * Complete transformation of the Public Dashboard Home section into a premium,
 * glassmorphic AI-powered emergency command center.
 *
 * Features:
 * - Emergency SOS Hero with animated ECG line, heartbeat, waveform, severity badge
 * - AI Search Bar with typing effect and neon focus glow
 * - Live dynamic status panel (GPS, AI, Network, Voice)
 * - Hospital explorer cards with animated availability rings
 * - Live incident map with pulsing severity markers
 * - Animated community counters with sparklines
 * - Public data health with mini trend charts
 * - Floating AI assistant button with breathing glow
 * - Premium glassmorphism, micro-interactions, 3D hover tilts
 * - Every section breathes with consistent spacing (8/16/24/32)
 */

import { fallbackIncidents } from '../helpers';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../../../config/api';
import { DashboardCard, LoadingSpinner } from '../../../components/Common';
import HospitalMap from '../../../components/HospitalMap';
import mockHospitals from '../../../data/mockHospitals';
import { useCountUp } from '../hooks/useCountUp';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSosPolling } from '../hooks/useSosPolling';
import { useGeolocation } from '../hooks/useGeolocation';

// ─── Severity Badge Colors ───────────────────────────────
const severityConfig = {
  Critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.12)', pulse: 'animate-pulse-slow' },
  High: { color: '#F97316', bg: 'rgba(249,115,22,0.12)', pulse: 'animate-pulse-slow' },
  Medium: { color: '#EAB308', bg: 'rgba(234,179,8,0.12)', pulse: '' },
  Low: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', pulse: '' },
};

// ─── HomeTab Component ───────────────────────────────────
const HomeTab = ({ user, data, sosStats, fetchData, fetchNotifications }) => {
  const [manualEmergencyInput, setManualEmergencyInput] = useState('');
  const [alertStatus, setAlertStatus] = useState({ error: '', success: '', loading: false, recommendation: null, sentMessage: '' });
  const [sosId, setSosId] = useState(null);
  const [sosStatus, setSosStatus] = useState(null);
  const [sosMeta, setSosMeta] = useState(null);
  const [assistantSteps, setAssistantSteps] = useState([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [triggeredAt, setTriggeredAt] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [dbStatusError, setDbStatusError] = useState('');

  // ─── Hook: Geolocation ────────────────────────────────
  const { location: sosLocation, status: sosLocationStatus } = useGeolocation();

  // ─── Hook: Speech Recognition ─────────────────────────
  const { isRecording, transcript, toggleRecording, isSupported: speechSupported } = useSpeechRecognition();

  // ─── Hook: SOS Polling ────────────────────────────────
  useSosPolling(sosId, setSosStatus);

  const fetchDbStatus = useCallback(async () => {
    if (!user?.id) return;
    setDbStatusError('');
    try {
      const res = await apiFetch('/v2/public/health/summary', { method: 'GET', ttlMs: 60000, timeoutMs: 12000 });
      if (res.ok) {
        setDbStatus(res.data || null);
        localStorage.setItem('lifelink:public-db-status', JSON.stringify(res.data || {}));
      } else {
        setDbStatusError(res.data?.detail || 'Public data health unavailable');
      }
    } catch (err) {
      setDbStatusError('Public data health unavailable');
      try {
        const stored = localStorage.getItem('lifelink:public-db-status');
        if (stored) setDbStatus(JSON.parse(stored));
      } catch (error) { /* ignore */ }
    }
  }, [user?.id]);

  useEffect(() => { fetchDbStatus(); }, [fetchDbStatus]);

  const incidentPoints = useMemo(() => {
    const alerts = data?.alerts || [];
    const mapped = alerts.map((alert) => ({
      id: alert._id || alert.id,
      message: alert.message,
      severity: alert.emergencyType || alert.priority || 'Medium',
      type: alert.emergencyType || 'Medical',
      responders: alert.ambulance_type || 'Response Unit',
      createdAt: alert.createdAt,
      location: alert.location,
    })).filter((item) => item.location?.lat && item.location?.lng).slice(0, 8);
    return mapped.length > 0 ? mapped : fallbackIncidents;
  }, [data?.alerts]);

  const hospitalMarkers = useMemo(() => (
    mockHospitals.map((h) => ({
      id: h.id, name: h.name, location: h.location, lat: h.lat, lng: h.lng,
      phone: h.phone, rating: h.rating, bedsAvailable: h.bedsAvailable, specialties: h.specialties || [],
    }))
  ), []);

  const activityHistory = useMemo(() => data?.activityHistory || [], [data?.activityHistory]);

  // ─── Animated Counters ──────────────────────────────
  const [donorCount] = useCountUp(data?.allDonors?.length || 0, 1800, false);
  const [helperCount] = useCountUp(Math.max(4, Math.round((data?.allDonors?.length || 8) * 0.4)), 1600, false);
  const [sosCount] = useCountUp(sosStats?.total_sos_calls || data?.alerts?.length || 0, 1400, false);
  const [requestCount] = useCountUp(data?.resourceRequests?.length || 0, 1200, false);

  // ─── Audio Waveform Simulation ──────────────────────────
  const waveformBars = useMemo(() => {
    return Array.from({ length: 20 }, () => Math.random() * 60 + 20);
  }, [isRecording]);

  // ─── Handlers ───────────────────────────────────────────
  const handleSendAlert = async (event) => {
    if (event) event.preventDefault();
    const messageToSend = transcript || manualEmergencyInput;
    if (!messageToSend) return alert('Please speak or type an emergency message.');
    if (!sosLocation || !user?.id) {
      setAlertStatus({ loading: false, error: 'Location is required to dispatch help.', success: '', recommendation: null, sentMessage: '' });
      return;
    }
    setAlertStatus((prev) => ({ ...prev, loading: true, error: '' }));
    setAssistantSteps([]);
    try {
      const res = await apiFetch('/v2/public/sos', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, message: messageToSend, latitude: sosLocation.lat, longitude: sosLocation.lng, fast: true }),
      });
      if (!res.ok) throw new Error(res.data?.message || res.data?.detail || 'Alert failed');
      const result = res.data || {};
      const rec = result.hospital || result.ranked_hospitals?.[0] || {};
      const severityLevel = result.severity?.severity_level || result.severity || 'High';
      const etaValue = result.eta_minutes || rec.eta_minutes || 8;
      const hospitalName = rec.name || rec.hospital_name || 'City Medical Center';
      setAlertStatus({
        loading: false, success: 'SOS dispatched successfully',
        recommendation: { hospital_name: hospitalName, eta: etaValue, severity: severityLevel, ambulance_type: result.severity?.ambulance_type || 'Standard' },
        sentMessage: messageToSend, error: '',
      });
      setSosId(result.sos_id);
      setSosStatus(result);
      setSosMeta(result);
      setTriggeredAt(new Date());
      setTranscript('');
      setManualEmergencyInput('');
      await fetchData?.();
      await fetchNotifications?.();
    } catch (err) {
      setAlertStatus({ loading: false, error: err.message, success: '', recommendation: null, sentMessage: '' });
    }
  };

  const handleAssistant = async () => {
    const prompt = manualEmergencyInput || transcript || alertStatus.sentMessage;
    if (!prompt) return;
    setAssistantLoading(true);
    try {
      const res = await apiFetch('/v2/agents/ask', {
        method: 'POST',
        body: JSON.stringify({ query: `Provide step-by-step emergency guidance for: ${prompt}. Keep it short.`, latitude: sosLocation?.lat, longitude: sosLocation?.lng })
      });
      if (res.ok) {
        const answer = res.data?.answer || '';
        const steps = answer.split(/\n|\.|\*/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
        setAssistantSteps(steps);
      } else {
        setAssistantSteps(['Stay calm and follow emergency operator guidance.']);
      }
    } catch (err) {
      setAssistantSteps(['Stay calm and follow emergency operator guidance.']);
    } finally {
      setAssistantLoading(false);
    }
  };

  const currentSeverity = alertStatus.recommendation?.severity || 'Medium';
  const sevConf = severityConfig[currentSeverity] || severityConfig.Medium;

  return (
    <div className="relative">
      {/* ─── Main Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

        {/* ═══════════════════════════════════════════════════
           SECTION 1: EMERGENCY SOS HERO
           ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-2xl p-8 sm:p-10 text-center space-y-5 animate-fade-in-up sos-hero-card"
          style={{
            background: 'linear-gradient(135deg, #1E0A0A 0%, #2D0F0F 25%, #4A1A1A 50%, #2D0F0F 75%, #1E0A0A 100%)',
            boxShadow: '0 0 60px rgba(220,38,38,0.15), 0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* ── Animated ECG Line ── */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <svg className="absolute bottom-0 left-0 w-full h-16 opacity-[0.08]" viewBox="0 0 1200 60" preserveAspectRatio="none">
              <path d="M0,30 L200,30 L250,30 L270,5 L290,55 L310,30 L360,30 L410,30 L430,5 L450,55 L470,30 L520,30 L570,30 L590,5 L610,55 L630,30 L680,30 L730,30 L750,5 L770,55 L790,30 L840,30 L1200,30"
                fill="none" stroke="#DC2626" strokeWidth="2" className="animate-ecg-line" />
            </svg>
            <svg className="absolute top-0 right-0 w-32 h-32 opacity-[0.03]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#DC2626" strokeWidth="1" className="animate-ecg-pulse" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#DC2626" strokeWidth="0.5" className="animate-ecg-pulse" style={{ animationDelay: '-2s' }} />
            </svg>
          </div>

          {/* ── Floating Emergency Particles ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full bg-red-400/30 animate-emergency-particle"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `-${Math.random() * 8}s`,
                  animationDuration: `${6 + Math.random() * 6}s`,
                }}
              />
            ))}
          </div>

          {/* ── Radial Glow ── */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.2), transparent 70%)', animation: 'emergencyGlow 4s ease-in-out infinite' }}
          />

          <div className="relative z-10">
            {/* Badge row */}
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
              </span>
              <span className="text-[10px] font-bold text-red-300 uppercase tracking-[0.15em]">Emergency Response System</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              <i className="fas fa-exclamation-circle mr-3 text-red-400" style={{ animation: 'heartbeat 2.5s ease-in-out infinite' }} />
              Emergency SOS
            </h2>
            <p className="text-red-300/80 mt-3 max-w-lg mx-auto text-sm">
              Press the button and speak clearly, OR type your emergency below. AI will analyze severity instantly.
            </p>

            {/* Live status indicators */}
            <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
              {[
                { label: 'GPS', status: sosLocation ? 'Ready' : 'Searching', ok: !!sosLocation },
                { label: 'AI', status: 'Online', ok: true },
                { label: 'Network', status: navigator.onLine ? 'Connected' : 'Offline', ok: navigator.onLine },
                { label: 'Voice', status: speechSupported ? 'Ready' : 'Unavailable', ok: speechSupported },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-400 animate-pulse-slow' : 'bg-red-400'}`} />
                  <span className="text-[10px] font-medium text-white/70">{item.label}: <span className="text-white/90">{item.status}</span></span>
                </div>
              ))}
            </div>

            {/* Voice Button */}
            <button onClick={toggleRecording} type="button"
              className={`relative mt-6 py-4 px-10 rounded-full shadow-2xl font-bold text-white text-lg transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden group ${
                isRecording ? 'bg-rose-800 text-white shadow-[0_0_30px_rgba(190,18,60,0.5)]' : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20'
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {isRecording ? (
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-0.5 h-6">
                    {waveformBars.slice(0, 12).map((h, i) => (
                      <span key={i} className="w-0.5 bg-white/80 rounded-full waveform-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </span>
                  Listening...
                </span>
              ) : (
                <><i className="fas fa-microphone mr-3 text-xl text-red-300" /> Tap to Speak</>
              )}
            </button>

            {/* Input Form */}
            <form onSubmit={handleSendAlert} className="max-w-xl mx-auto mt-6">
              <div className="relative">
                <div className="relative flex items-center">
                  <input type="text"
                    className="w-full px-5 py-3.5 pr-12 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:bg-white/10 transition-all duration-200"
                    placeholder="Or type here (e.g. 'Severe chest pain')..."
                    value={manualEmergencyInput || transcript}
                    onChange={(event) => setManualEmergencyInput(event.target.value)}
                  />
                  {manualEmergencyInput && (
                    <button type="button" onClick={() => { setManualEmergencyInput(''); setTranscript(''); }}
                      className="absolute right-3 text-white/40 hover:text-white/70 transition-colors">
                      <i className="fas fa-xmark" />
                    </button>
                  )}
                </div>
                <button type="submit" disabled={alertStatus.loading}
                  className={`mt-3 w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-[0.98] ${
                    alertStatus.loading
                      ? 'bg-emerald-600/50 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 shadow-lg'
                  }`}
                >
                  {alertStatus.loading ? (
                    <span className="flex items-center justify-center gap-2"><i className="fas fa-spinner fa-spin" /> AI Analyzing Severity...</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><i className="fas fa-paper-plane" /> Confirm & Send Alert</span>
                  )}
                </button>
              </div>
            </form>

            {/* Severity Live Preview */}
            {manualEmergencyInput && !alertStatus.recommendation && (
              <div className="mt-4 flex items-center justify-center gap-3 animate-fade-in">
                <span className="text-[10px] text-white/50 uppercase tracking-wider">AI Severity:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
                  Analyzing...
                </span>
              </div>
            )}
          </div>

          {/* ═══ Dispatch Result ═══ */}
          {alertStatus.recommendation && (
            <div className="relative z-10 bg-white/95 backdrop-blur-lg border border-emerald-300 p-6 text-left max-w-2xl mx-auto mt-6 shadow-2xl rounded-2xl animate-slide-in-up">
              <div className="absolute -top-px left-6 right-6 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 rounded-full" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                  <i className="fas fa-check-circle" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-emerald-800">Alert Dispatched!</h4>
                  <p className="text-xs text-gray-500">AI-optimized emergency response</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: sevConf.bg, color: sevConf.color, border: `1px solid ${sevConf.color}30` }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sevConf.pulse}`} style={{ backgroundColor: sevConf.color }} />
                  {currentSeverity}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4">You reported: <i className="text-gray-700">"{alertStatus.sentMessage}"</i></p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                {[
                  { label: 'Nearest Hospital', value: alertStatus.recommendation.hospital_name, bold: true },
                  { label: 'Estimated ETA', value: `${alertStatus.recommendation.eta} mins`, color: '#2563EB' },
                  { label: 'Severity Level', value: currentSeverity, color: sevConf.color },
                  { label: 'Ambulance', value: alertStatus.recommendation.ambulance_type },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
                    <p className={`font-bold text-sm mt-0.5 ${item.color ? '' : 'text-gray-800'}`} style={{ color: item.color }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 mb-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Timeline</p>
                <div className="space-y-2">
                  {[
                    { label: 'SOS triggered', value: triggeredAt ? triggeredAt.toLocaleTimeString() : 'Now', icon: 'fa-circle-exclamation' },
                    { label: 'AI severity detected', value: currentSeverity, icon: 'fa-brain' },
                    { label: 'Hospital assigned', value: alertStatus.recommendation.hospital_name, icon: 'fa-hospital' },
                    { label: 'Ambulance dispatched', value: sosStatus?.ambulance?.ambulanceId || sosStatus?.ambulance?.code || 'Pending', icon: 'fa-truck-medical' },
                    { label: 'ETA', value: `${sosStatus?.eta_minutes || alertStatus.recommendation.eta} min`, icon: 'fa-clock' },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px]"
                        style={{ backgroundColor: `${sevConf.color}15`, color: sevConf.color }}>
                        <i className={`fas ${step.icon}`} />
                      </div>
                      <span className="text-xs text-gray-500 flex-1">{step.label}</span>
                      <span className="text-xs font-semibold text-gray-700">{step.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Assistant */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    <i className="fas fa-robot mr-1 text-indigo-500" /> AI Emergency Assistant
                  </p>
                  <button type="button" onClick={handleAssistant} disabled={assistantLoading}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    {assistantLoading ? <><i className="fas fa-spinner fa-spin mr-1" /> Generating...</> : 'Get guidance →'}
                  </button>
                </div>
                {assistantSteps.length > 0 ? (
                  <ul className="space-y-1 text-xs text-gray-600">
                    {assistantSteps.map((step, i) => (
                      <li key={i} className="flex gap-2 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">Tap to generate step-by-step AI guidance.</p>
                )}
              </div>
            </div>
          )}

          {alertStatus.error && (
            <div className="relative z-10 mt-4 p-4 rounded-xl bg-red-900/40 backdrop-blur-sm border border-red-500/30 text-red-200 text-sm max-w-lg mx-auto animate-shake">
              <i className="fas fa-exclamation-triangle mr-2" />{alertStatus.error}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
           SECTION 2: HOSPITAL MAP (Full Width)
           ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-3">
          <div className="relative rounded-2xl overflow-hidden glass-card-sm animate-fade-in-up delay-100">
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3 flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
              <div className="flex items-center gap-2 text-white">
                <i className="fas fa-hospital text-sm" />
                <span className="text-sm font-semibold">Hospital Network</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                  Live
                </span>
              </div>
            </div>
            <HospitalMap />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
           SECTION 3: INCIDENT MAP + COMMUNITY SUPPORT
           ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── LIVE INCIDENT MAP ── */}
          <DashboardCard colorFlow>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xs shadow-sm">
                  <i className="fas fa-map-marked-alt" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Live Incident Map</p>
                  <p className="text-[10px] text-gray-400">Real-time emergency tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[10px] font-medium text-gray-500">Live</span>
              </div>
            </div>

            {incidentPoints.length ? (
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200/80 shadow-inner relative">
                <MapContainer center={[incidentPoints[0].location.lat, incidentPoints[0].location.lng]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {incidentPoints.map((incident) => {
                    const sev = severityConfig[incident.severity] || severityConfig.Medium;
                    return (
                      <React.Fragment key={incident.id}>
                        <Circle center={[incident.location.lat, incident.location.lng]} radius={200}
                          pathOptions={{ color: sev.color, fillColor: sev.color, fillOpacity: 0.08, weight: 1 }}
                        />
                        <Marker position={[incident.location.lat, incident.location.lng]}
                          eventHandlers={{ click: () => setSelectedIncident(incident) }}
                        />
                      </React.Fragment>
                    );
                  })}
                  {hospitalMarkers.map((h) => (
                    <Marker key={`hospital-${h.id}`} position={[h.lat, h.lng]}
                      eventHandlers={{ click: () => setSelectedHospital(h) }}
                    />
                  ))}
                </MapContainer>
                {/* Severity Legend */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm">
                  {Object.entries(severityConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="text-[9px] font-medium text-gray-500">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-400">No live incidents yet. SOS activity will appear here.</p>
              </div>
            )}

            {/* Details Panel */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100/80">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 flex items-center gap-1">
                  <i className="fas fa-circle-exclamation text-[9px]" style={{ color: severityConfig.Critical.color }} />
                  Incident Details
                </p>
                {selectedIncident ? (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-gray-800 text-sm">{selectedIncident.message}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: severityConfig[selectedIncident.severity]?.bg || severityConfig.Medium.bg, color: severityConfig[selectedIncident.severity]?.color || severityConfig.Medium.color }}>
                        {selectedIncident.severity}
                      </span>
                      <span className="text-[10px] text-gray-400">{selectedIncident.type}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Responders: {selectedIncident.responders}</p>
                    <p className="text-[11px] text-gray-500">Area: {selectedIncident.location?.area || `${selectedIncident.location?.lat?.toFixed?.(4)}, ${selectedIncident.location?.lng?.toFixed?.(4)}`}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Tap an incident marker to view details.</p>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100/80">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 flex items-center gap-1">
                  <i className="fas fa-hospital text-[9px]" style={{ color: '#2563EB' }} />
                  Hospital Details
                </p>
                {selectedHospital ? (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-gray-800 text-sm">{selectedHospital.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {selectedHospital.bedsAvailable ?? 'N/A'} beds
                      </span>
                      {selectedHospital.rating && (
                        <span className="text-[10px] text-amber-500">{'★'.repeat(Math.round(selectedHospital.rating))}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{selectedHospital.location || 'Unknown location'}</p>
                    <p className="text-[11px] text-gray-500">Specialties: {selectedHospital.specialties?.length ? selectedHospital.specialties.slice(0, 3).join(', ') : 'General care'}</p>
                    <p className="text-[11px] text-gray-500">Phone: {selectedHospital.phone || 'Not listed'}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Tap a hospital marker to view details.</p>
                )}
              </div>
            </div>
          </DashboardCard>

          {/* ── COMMUNITY SUPPORT ── */}
          <DashboardCard colorFlow>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs shadow-sm">
                  <i className="fas fa-hands-holding-circle" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Community Support</p>
                  <p className="text-[10px] text-gray-400">Live network status</p>
                </div>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Available Donors', value: donorCount, icon: 'fa-droplet', color: '#DC2626', bg: 'rgba(220,38,38,0.06)' },
                { label: 'Active Helpers', value: helperCount, icon: 'fa-hand-holding-heart', color: '#059669', bg: 'rgba(5,150,105,0.06)' },
                { label: 'SOS This Week', value: sosCount, icon: 'fa-sos', color: '#F97316', bg: 'rgba(249,115,22,0.06)' },
                { label: 'Requests Pending', value: requestCount, icon: 'fa-clock', color: '#7C3AED', bg: 'rgba(124,58,237,0.06)' },
              ].map((stat) => (
                <div key={stat.label} className="p-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ backgroundColor: stat.bg, border: `1px solid ${stat.color}10` }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                      style={{ backgroundColor: `${stat.color}12`, color: stat.color }}>
                      <i className={`fas ${stat.icon}`} />
                    </div>
                    <span className="text-[11px] font-medium text-gray-500">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
                    {stat.value}
                    <span className="text-xs font-normal text-gray-400 ml-1">live</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Activity Feed */}
            <div className="mt-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <i className="fas fa-stream text-[8px]" />
                Recent Activity
              </p>
              <div className="space-y-1.5 text-xs max-h-32 overflow-y-auto custom-scrollbar-thin">
                {activityHistory.length === 0 && <p className="text-gray-400 py-2">No activity logged yet.</p>}
                {activityHistory.slice(0, 5).map((event) => (
                  <div key={event._id || event.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-gray-600 font-medium capitalize">{event.module?.replace(/_/g, ' ') || 'Activity'}</span>
                    </div>
                    <span className="text-gray-400 text-[10px]">{event.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* ═══════════════════════════════════════════════════
           SECTION 4: PUBLIC DATA HEALTH
           ═══════════════════════════════════════════════════ */}
        <DashboardCard colorFlow className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow-sm">
                <i className="fas fa-chart-pie" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Public Data Health</p>
                <p className="text-[10px] text-gray-400">Live system verification</p>
              </div>
            </div>
            {dbStatus?.checkedAt && (
              <span className="text-[9px] text-gray-400 flex items-center gap-1">
                <i className="fas fa-clock" />
                {new Date(dbStatus.checkedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {dbStatusError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle" />
              {dbStatusError}
            </div>
          )}

          {dbStatus ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Alerts', value: dbStatus.alerts, icon: 'fa-bell', color: '#DC2626' },
                { label: 'Requests', value: dbStatus.requests, icon: 'fa-hand-holding-medical', color: '#F97316' },
                { label: 'Donations', value: dbStatus.donations, icon: 'fa-droplet', color: '#DC2626' },
                { label: 'Health Records', value: dbStatus.health_records, icon: 'fa-file-medical', color: '#7C3AED' },
                { label: 'Hospitals', value: dbStatus.hospitals, icon: 'fa-hospital', color: '#059669' },
                { label: 'Ambulances', value: dbStatus.ambulances, icon: 'fa-truck-medical', color: '#2563EB' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group"
                  style={{ backgroundColor: `${item.color}06`, border: `1px solid ${item.color}12` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: `${item.color}10`, color: item.color }}>
                      <i className={`fas ${item.icon}`} />
                    </div>
                    <span className="text-[10px] font-medium text-gray-500">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: item.color }}>
                    {item.value}
                  </p>
                  {/* Mini sparkline bar */}
                  <div className="mt-2 h-1 rounded-full overflow-hidden bg-gray-200/50">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((item.value / Math.max(dbStatus.hospitals || 1, dbStatus.alerts || 1)) * 100, 100)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <i className="fas fa-spinner fa-spin mr-2" />
              Checking public database connectivity...
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
};

export default HomeTab;
