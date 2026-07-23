import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../../config/api';
import { ExplainabilityPanel } from '../../components/Common';
import PublicShell from './PublicShell';
import { SpeechRecognition } from './helpers';

const SmartSosScreen = ({ user, onBack, rightSlot }) => {
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Locating you...');
  const [message, setMessage] = useState('');
  const [vitals, setVitals] = useState({ heart_rate: '', blood_pressure: '', oxygen: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sosId, setSosId] = useState(null);
  const [status, setStatus] = useState(null);
  const [meta, setMeta] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeEta, setRouteEta] = useState(null);
  const [assistantSteps, setAssistantSteps] = useState([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [triggeredAt, setTriggeredAt] = useState(null);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Location not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('Location ready');
      },
      () => setLocationStatus('Enable location to continue'),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!recognitionRef.current && SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
    }
  }, []);

  useEffect(() => {
    if (!sosId) return;
    const interval = setInterval(async () => {
      const res = await apiFetch(`/v2/public/sos/${sosId}`, { method: 'GET', timeoutMs: 12000 });
      if (res.ok) {
        setStatus(res.data);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sosId]);

  useEffect(() => {
    const ambulanceCoords = status?.ambulance?.location || status?.ambulance?.currentLocation;
    if (!location || !ambulanceCoords?.lat || !ambulanceCoords?.lng) return;
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${ambulanceCoords.lng},${ambulanceCoords.lat};${location.lng},${location.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route) return;
        const coords = route.geometry?.coordinates || [];
        setRoutePath(coords.map((point) => [point[1], point[0]]));
        if (route.duration) {
          setRouteEta(Math.max(1, Math.round(route.duration / 60)));
        }
      } catch (err) {
        // Ignore routing failures
      }
    };
    fetchRoute();
  }, [location, status]);

  const handleSubmit = async () => {
    if (!location) {
      setError('Location is required to dispatch help.');
      return;
    }
    setSubmitting(true);
    setError('');
    setAssistantSteps([]);
    try {
      const res = await apiFetch('/v2/public/sos', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          message: message || 'Emergency',
          latitude: location.lat,
          longitude: location.lng,
          vitals,
          fast: true
        }),
        timeoutMs: 20000
      });
      if (!res.ok) {
        setError(res.data?.detail || res.data?.error || 'SOS failed');
        return;
      }
      setSosId(res.data.sos_id);
      setStatus(res.data);
      setMeta(res.data);
      setTriggeredAt(new Date());
    } catch (err) {
      setError('Could not send SOS. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }
    recognition.start();
    setIsRecording(true);
    recognition.onresult = (event) => {
      const nextText = event.results[0][0].transcript;
      setMessage(nextText);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
  };

  const handleAssistant = async () => {
    if (!message) return;
    setAssistantLoading(true);
    try {
      const query = `Provide step-by-step emergency guidance for: ${message}. Keep it short and actionable.`;
      const res = await apiFetch('/v2/agents/ask', {
        method: 'POST',
        body: JSON.stringify({ query, latitude: location?.lat, longitude: location?.lng })
      });
      if (res.ok) {
        const answer = res.data?.answer || '';
        const steps = answer
          .split(/\n|\.|\*/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 6);
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

  const ambulance = status?.ambulance || {};
  const hospital = status?.hospital || {};
  const ambulanceCoords = status?.ambulance?.location || status?.ambulance?.currentLocation;
  const hospitalCoords = hospital?.location || {};
  const hospitalLat = hospital?.lat ?? hospitalCoords?.lat;
  const hospitalLng = hospital?.lng ?? hospitalCoords?.lng;
  const severityLevel = status?.severity?.severity_level || status?.severity || meta?.severity?.severity_level || 'High';
  const survivalWindow = severityLevel === 'Critical' ? 20 : severityLevel === 'High' ? 45 : severityLevel === 'Moderate' ? 90 : 120;
  const rankedHospitals = meta?.ranked_hospitals || [];
  const bestHospital = rankedHospitals?.[0];
  const hospitalInfo = status?.hospital || meta?.hospital || bestHospital || {};
  const resolvedHospitalName = hospitalInfo?.name || hospitalInfo?.hospital_name || bestHospital?.name || 'City Medical Center';
  const resolvedEta = status?.eta_minutes || hospitalInfo?.eta_minutes || bestHospital?.eta_minutes || routeEta || 8;
  const explainMeta = meta?.meta || meta?.severity?.meta || null;
  const hospitalReason = bestHospital
    ? `Top AI score (${bestHospital.ml_score?.toFixed?.(2) || '0.0'}), beds ${bestHospital.beds_available}/${bestHospital.beds_total}, ${bestHospital.distance_km} km away.`
    : `Closest available facility with emergency readiness${hospitalInfo?.distance_km ? `, ${hospitalInfo.distance_km} km away` : ''}.`;
  const timeline = [
    { label: 'SOS triggered', time: triggeredAt ? triggeredAt.toLocaleTimeString() : 'Now' },
    { label: 'AI severity detected', time: severityLevel },
    { label: ambulance?.id ? 'Ambulance assigned' : 'Ambulance locating', time: ambulance?.code || 'Pending' },
    { label: 'ETA tracking', time: `${resolvedEta} min` },
    { label: 'Family notified', time: 'Auto alert sent' },
  ];

  return (
    <PublicShell title="Smart SOS" onBack={onBack} rightSlot={rightSlot}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-rose-600 text-white p-5 animate-fade-in-up">
          <p className="text-sm text-rose-100">{locationStatus}</p>
          <h2 className="text-2xl font-bold mt-2">Tap to dispatch help</h2>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 w-full bg-white text-rose-600 font-bold py-4 rounded-2xl text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? 'Sending SOS...' : 'Send SOS'}
          </button>
        </div>

        <div className="space-y-3 animate-fade-in-up delay-100">
          <label className="text-xs font-semibold text-slate-500">Symptoms (optional)</label>
          {SpeechRecognition && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-full rounded-2xl border border-slate-200 py-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${isRecording ? 'bg-rose-50 text-rose-600 animate-pulse-slow' : 'bg-white text-slate-600'}`}
            >
              {isRecording ? 'Listening… tap to stop' : 'Voice SOS input'}
            </button>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
            placeholder="e.g., chest pain, difficulty breathing"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-rose-200"
              placeholder="HR"
              value={vitals.heart_rate}
              onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-rose-200"
              placeholder="BP"
              value={vitals.blood_pressure}
              onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-rose-200"
              placeholder="O2 %"
              value={vitals.oxygen}
              onChange={(e) => setVitals({ ...vitals, oxygen: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {status && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 break-words animate-fade-in-up delay-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">Status</p>
              <span className="text-xs font-bold text-emerald-600">{status.status || 'pending'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="break-words">
                <p className="text-slate-500">Hospital</p>
                <p className="font-semibold text-slate-900 break-words whitespace-normal">{resolvedHospitalName}</p>
              </div>
              <div className="break-words">
                <p className="text-slate-500">ETA</p>
                <p className="font-semibold text-slate-900">{resolvedEta ? `${resolvedEta} min` : 'Calculating...'}</p>
              </div>
              <div className="break-words">
                <p className="text-slate-500">Ambulance</p>
                <p className="font-semibold text-slate-900 break-words whitespace-normal">{ambulance?.code || 'Dispatching'}</p>
              </div>
              <div className="break-words">
                <p className="text-slate-500">Severity</p>
                <p className="font-semibold text-slate-900">{severityLevel}</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs break-words">
              <p className="text-slate-500">Why this hospital?</p>
              <p className="font-semibold text-slate-900 whitespace-normal break-words">{hospitalReason}</p>
              <p className="text-slate-500 mt-2">Estimated survival window</p>
              <p className="font-semibold text-slate-900">{survivalWindow} minutes</p>
            </div>
            {hospitalInfo?.beds_available !== undefined && (
              <div className="rounded-xl border border-slate-200 p-3 text-xs break-words">
                <p className="text-slate-500">Hospital details</p>
                <div className="flex flex-wrap items-center justify-between mt-2 gap-2">
                  <span className="text-slate-500">Beds</span>
                  <span className="font-semibold text-slate-900">{hospitalInfo.beds_available}/{hospitalInfo.beds_total}</span>
                </div>
                {hospitalInfo.rating && (
                  <div className="flex flex-wrap items-center justify-between mt-1 gap-2">
                    <span className="text-slate-500">Rating</span>
                    <span className="font-semibold text-slate-900">{hospitalInfo.rating} ★</span>
                  </div>
                )}
                {hospitalInfo.distance_km && (
                  <div className="flex flex-wrap items-center justify-between mt-1 gap-2">
                    <span className="text-slate-500">Distance</span>
                    <span className="font-semibold text-slate-900">{hospitalInfo.distance_km} km</span>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-xl border border-slate-200 p-3 break-words">
              <p className="text-xs font-semibold text-slate-700 mb-2">Emergency Timeline</p>
              <div className="space-y-2">
                {timeline.map((item) => (
                  <div key={item.label} className="flex flex-wrap items-center justify-between text-xs gap-2 break-words">
                    <span className="text-slate-500 break-words whitespace-normal">{item.label}</span>
                    <span className="font-semibold text-slate-900 break-words whitespace-normal">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <ExplainabilityPanel meta={explainMeta} />
            <div className="rounded-xl border border-slate-200 p-3 break-words">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">AI Emergency Assistant</p>
                <button
                  type="button"
                  onClick={handleAssistant}
                  disabled={assistantLoading}
                  className="text-xs font-semibold text-indigo-600"
                >
                  {assistantLoading ? 'Generating…' : 'Get guidance'}
                </button>
              </div>
              {assistantSteps.length > 0 ? (
                <ul className="mt-2 text-xs text-slate-600 space-y-1 break-words">
                  {assistantSteps.map((step) => (
                    <li key={step} className="break-words whitespace-normal">• {step}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 mt-2">Tap to generate step-by-step instructions.</p>
              )}
            </div>
          </div>
        )}

        {location && (ambulanceCoords || hospitalLat) && (
          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <MapContainer center={[location.lat, location.lng]} zoom={12} scrollWheelZoom={false} style={{ height: '260px', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[location.lat, location.lng]} />
              {hospitalLat && hospitalLng && <Marker position={[hospitalLat, hospitalLng]} />}
              {ambulanceCoords?.lat && ambulanceCoords?.lng && <Marker position={[ambulanceCoords.lat, ambulanceCoords.lng]} />}
              {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#ef4444', weight: 4 }} />}
            </MapContainer>
          </div>
        )}
      </div>
    </PublicShell>
  );
};

export default SmartSosScreen;
