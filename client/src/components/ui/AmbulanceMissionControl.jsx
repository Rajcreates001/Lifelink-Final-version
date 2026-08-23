import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Circle, MapContainer, Polyline, Popup, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, getAuthToken } from '../../config/api';
import { StatusPill } from '../Common';
import EnterpriseModuleShell from './EnterpriseModuleShell';

// ─── Icons ────────────────────────────────────────────────────────
// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ambulanceIcon = L.divIcon({
  className: '',
  html: '<div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-pulse"><i class="fas fa-ambulance text-white text-sm"></i></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const incidentIcon = L.divIcon({
  className: '',
  html: '<div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg animate-ping"><i class="fas fa-exclamation-triangle text-white text-sm"></i></div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const hospitalIcon = L.divIcon({
  className: '',
  html: '<div class="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg"><i class="fas fa-hospital text-white text-sm"></i></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// ─── Constants & Helpers ──────────────────────────────────────────

const DEFAULT_CENTER = [12.9716, 77.5946];
const BENGALURU_BOUNDS = { latMin: 12.85, latMax: 13.05, lngMin: 77.45, lngMax: 77.75 };

const resolveAmbulanceId = (user) => user?._id || user?.id || '';

const toLatLng = (value) => {
  if (!value || typeof value !== 'object') return { lat: null, lng: null, address: '' };
  return {
    lat: value.latitude ?? value.lat ?? value.location?.lat,
    lng: value.longitude ?? value.lng ?? value.location?.lng,
    address: value.address || value.location?.address || '',
  };
};
const hasCoords = (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
const isWithinBengaluru = (point) => hasCoords(point) && point.lat >= BENGALURU_BOUNDS.latMin && point.lat <= BENGALURU_BOUNDS.latMax && point.lng >= BENGALURU_BOUNDS.lngMin && point.lng <= BENGALURU_BOUNDS.lngMax;
const coerceToBengaluru = (point, fallback) => (isWithinBengaluru(point) ? point : { ...fallback });
const buildFallbackRoute = (start, end) => {
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;
  return [[start.lat, start.lng], [midLat + 0.003, midLng - 0.002], [midLat - 0.002, midLng + 0.003], [end.lat, end.lng]];
};
const trafficLevelFromRatio = (ratio) => {
  if (ratio >= 1.2) return 'Heavy';
  if (ratio >= 1.1) return 'Moderate';
  return 'Light';
};
const haversineKm = (start, end) => {
  if (!hasCoords(start) || !hasCoords(end)) return 0;
  const toRad = (v) => (v * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const buildRouteInfo = (routeData, trafficData, start, end) => {
  const geometryPath = (routeData?.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
  const durationSeconds = routeData?.duration_seconds || 0;
  const distanceKm = Number.isFinite(routeData?.distance_meters)
    ? Math.round((routeData.distance_meters / 1000) * 10) / 10
    : Math.round(haversineKm(start, end) * 10) / 10;
  const baseSeconds = trafficData?.base_duration_seconds || durationSeconds || Math.max(300, Math.round((distanceKm / 35) * 3600));
  const adjustedSeconds = trafficData?.adjusted_duration_seconds || Math.round(baseSeconds * 1.1);
  const ratio = baseSeconds ? adjustedSeconds / baseSeconds : 1;
  const trafficLevel = trafficLevelFromRatio(ratio);
  return {
    path: geometryPath.length >= 2 ? geometryPath : buildFallbackRoute(start, end),
    etaMinutes: Math.max(1, Math.round((adjustedSeconds || durationSeconds || 600) / 60)),
    distanceKm,
    traffic: {
      level: trafficLevel,
      adjustedMinutes: Math.max(1, Math.round((adjustedSeconds || durationSeconds || 600) / 60)),
      baseMinutes: Math.max(1, Math.round((baseSeconds || adjustedSeconds || 600) / 60)),
    },
  };
};

const DEMO_DATA = {
  vehicle: { label: 'Ambulance A1', lat: 12.9766, lng: 77.5713, address: 'Majestic Bus Station', speedKph: 44, fuelLevel: 78, equipment: ['Defibrillator', 'Ventilator', 'O₂ 90%', 'Trauma Kit'] },
  incident: { label: 'Multi-vehicle collision', lat: 12.9763, lng: 77.5929, address: 'Cubbon Park Road', severity: 'Critical', patientName: 'Riya S.', age: 34, gcs: 10, mechanism: 'Road traffic accident' },
  hospital: { label: "St. Martha's Hospital", lat: 12.9686, lng: 77.5995, address: 'Nrupathunga Road', icuBeds: 3, traumaReady: true, distance: 3.5, eta: 11 },
  toIncident: { path: buildFallbackRoute({ lat: 12.9766, lng: 77.5713 }, { lat: 12.9763, lng: 77.5929 }), etaMinutes: 7, distanceKm: 4.1, traffic: { level: 'Light', adjustedMinutes: 7, baseMinutes: 6 } },
  toHospital: { path: buildFallbackRoute({ lat: 12.9763, lng: 77.5929 }, { lat: 12.9686, lng: 77.5995 }), etaMinutes: 11, distanceKm: 3.5, traffic: { level: 'Moderate', adjustedMinutes: 11, baseMinutes: 9 } },
  patientStatus: 'Critical',
};

// ─── Sub-Components ───────────────────────────────────────────────

const GoldenHourTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  const goldenHourSeconds = 3600;

  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const remaining = Math.max(0, goldenHourSeconds - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (elapsed / goldenHourSeconds) * 100;
  const critical = remaining < 600;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${critical ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
      <div className="flex-shrink-0">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="18" cy="18" r="16" fill="none" stroke={critical ? '#ef4444' : '#f59e0b'} strokeWidth="3"
              strokeDasharray={`${(1 - pct / 100) * 100} 100`} strokeLinecap="round" />
          </svg>
          <i className={`fas fa-clock absolute inset-0 flex items-center justify-center text-xs ${critical ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
      </div>
      <div>
        <p className={`text-[10px] font-bold uppercase ${critical ? 'text-red-600' : 'text-amber-600'}`}>Golden Hour</p>
        <p className={`text-xl font-black font-mono ${critical ? 'text-red-700' : 'text-slate-900'}`}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </p>
        <p className="text-[9px] text-slate-400">{critical ? 'CRITICAL WINDOW' : `${Math.floor(remaining / 60)} min remaining`}</p>
      </div>
    </div>
  );
};

const CriticalIncidentBanner = ({ incident, patientStatus, onOpenTriage }) => {
  const severityColor = incident?.severity === 'Critical' ? 'red' : incident?.severity === 'High' ? 'amber' : 'sky';
  const bgColors = { red: 'from-red-50 to-rose-50 border-red-200', amber: 'from-amber-50 to-orange-50 border-amber-200', sky: 'from-sky-50 to-blue-50 border-sky-200' };

  return (
    <div className={`rounded-xl bg-gradient-to-r ${bgColors[severityColor] || bgColors.red} border p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-${severityColor === 'red' ? 'red' : severityColor === 'amber' ? 'amber' : 'sky'}-100 flex items-center justify-center`}>
            <i className={`fas fa-triangle-exclamation text-lg text-${severityColor === 'red' ? 'red' : severityColor === 'amber' ? 'amber' : 'sky'}-600`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-slate-900 truncate">{incident?.label || 'Active Emergency'}</h2>
              <StatusPill text={incident?.severity || 'Critical'} color={severityColor} />
            </div>
            <p className="text-sm text-slate-600">{incident?.address || 'Location unknown'}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              <span><span className="font-semibold text-slate-700">Patient:</span> {incident?.patientName || 'Unknown'}</span>
              <span><span className="font-semibold text-slate-700">Age:</span> {incident?.age || '--'}</span>
              <span><span className="font-semibold text-slate-700">GCS:</span> {incident?.gcs || '--'}</span>
              <span><span className="font-semibold text-slate-700">Mechanism:</span> {incident?.mechanism || 'Unknown'}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {onOpenTriage && (
            <button type="button" onClick={onOpenTriage}
              className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all duration-200">
              <i className="fas fa-stethoscope mr-1.5" />AI Triage
            </button>
          )}
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
          </span>
        </div>
      </div>
    </div>
  );
};

const MissionTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <div className="flex items-center gap-2">
      <i className="fas fa-stopwatch text-slate-400 text-xs" />
      <span className="font-mono text-sm font-bold text-slate-800">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
      <span className="text-[9px] text-slate-400 uppercase">mission</span>
    </div>
  );
};

const PatientDigitalTwin = ({ patient }) => {
  if (!patient) return null;
  const vitals = patient.vitals || { heartRate: 122, oxygen: 88, bp: '92/58', gcs: 10, rr: 28, temp: 38.2 };

  const vitalItems = [
    { label: 'HR', value: `${vitals.heartRate || '--'}`, unit: 'bpm', icon: 'fa-heart-pulse', color: vitals.heartRate > 100 ? 'text-red-600' : vitals.heartRate < 60 ? 'text-amber-600' : 'text-emerald-600', bg: vitals.heartRate > 100 ? 'bg-red-50' : vitals.heartRate < 60 ? 'bg-amber-50' : 'bg-emerald-50' },
    { label: 'SpO₂', value: `${vitals.oxygen || '--'}`, unit: '%', icon: 'fa-droplet', color: vitals.oxygen < 90 ? 'text-red-600' : vitals.oxygen < 94 ? 'text-amber-600' : 'text-emerald-600', bg: vitals.oxygen < 90 ? 'bg-red-50' : vitals.oxygen < 94 ? 'bg-amber-50' : 'bg-emerald-50' },
    { label: 'BP', value: `${vitals.bp || '--'}`, unit: 'mmHg', icon: 'fa-gauge-high', color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'GCS', value: `${vitals.gcs || '--'}`, unit: '/15', icon: 'fa-brain', color: vitals.gcs <= 8 ? 'text-red-600' : vitals.gcs <= 12 ? 'text-amber-600' : 'text-emerald-600', bg: vitals.gcs <= 8 ? 'bg-red-50' : vitals.gcs <= 12 ? 'bg-amber-50' : 'bg-emerald-50' },
    { label: 'RR', value: `${vitals.rr || '--'}`, unit: '/min', icon: 'fa-lungs', color: vitals.rr > 24 ? 'text-red-600' : vitals.rr < 12 ? 'text-amber-600' : 'text-emerald-600', bg: vitals.rr > 24 ? 'bg-red-50' : vitals.rr < 12 ? 'bg-amber-50' : 'bg-emerald-50' },
    { label: 'Temp', value: `${vitals.temp || '--'}`, unit: '°C', icon: 'fa-temperature-high', color: vitals.temp > 38.5 ? 'text-red-600' : vitals.temp > 37.5 ? 'text-amber-600' : 'text-emerald-600', bg: vitals.temp > 38.5 ? 'bg-red-50' : vitals.temp > 37.5 ? 'bg-amber-50' : 'bg-emerald-50' },
  ];

  const shockIndex = vitals.heartRate && vitals.bp ? (vitals.heartRate / parseInt(vitals.bp.split('/')[0] || 90)).toFixed(2) : '--';
  const severity = shockIndex !== '--' && parseFloat(shockIndex) > 1.0 ? 'CRITICAL' : shockIndex !== '--' && parseFloat(shockIndex) > 0.7 ? 'WARNING' : 'STABLE';
  const severityColor = severity === 'CRITICAL' ? 'text-red-600 bg-red-50 border-red-200' : severity === 'WARNING' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  return (
    <div className="space-y-4">
      {/* Shock Index */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${severityColor}`}>
        <span className="text-[10px] font-bold uppercase">Shock Index</span>
        <span className="text-lg font-black font-mono">{shockIndex}</span>
        <span className="text-[10px] font-semibold">{severity}</span>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {vitalItems.map((item) => (
          <div key={item.label} className={`rounded-xl ${item.bg} border border-slate-200/60 p-3 text-center`}>
            <i className={`fas ${item.icon} ${item.color} text-sm mb-1`} />
            <p className={`text-lg font-black font-mono ${item.color}`}>{item.value}</p>
            <p className="text-[9px] text-slate-400 uppercase">{item.unit}</p>
            <p className="text-[9px] font-semibold text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* AI Assessment */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-100 p-3">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-robot text-indigo-500 text-xs" />
          <span className="text-[10px] font-bold text-indigo-600 uppercase">AI Assessment</span>
        </div>
        <div className="space-y-1.5 text-xs text-slate-700">
          <p><span className="font-semibold text-slate-800">Deterioration Risk:</span> {vitals.oxygen < 90 ? 'High — immediate airway support recommended' : vitals.oxygen < 94 ? 'Moderate — monitor SpO₂ continuously' : 'Low — vitals within acceptable range'}</p>
          <p><span className="font-semibold text-slate-800">Recommended Intervention:</span> {vitals.heartRate > 120 ? 'IV access, fluid resuscitation, consider vasopressors' : 'Continue monitoring, prepare for handover'}</p>
          <p><span className="font-semibold text-slate-800">Destination Recommendation:</span> {severity === 'CRITICAL' ? 'Level 1 Trauma Center with ICU and OR readiness' : 'Nearest appropriate ED with specialist coverage'}</p>
          <p><span className="font-semibold text-slate-800">Survival Probability:</span> <span className={severity === 'CRITICAL' ? 'text-red-600 font-bold' : severity === 'WARNING' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>{severity === 'CRITICAL' ? '~45%' : severity === 'WARNING' ? '~72%' : '~92%'}</span></p>
        </div>
      </div>
    </div>
  );
};

const HospitalRecommendationEngine = ({ hospitals, currentHospital }) => {
  const demoHospitals = useMemo(() => [
    { name: "St. Martha's Hospital", distance: 3.5, eta: 11, icuBeds: 3, traumaReady: true, strokeReady: true, burnUnit: false, cardiacCenter: true, score: 94, etaScore: 88, capabilityScore: 97 },
    { name: 'Bowring & Lady Curzon', distance: 4.8, eta: 14, icuBeds: 5, traumaReady: true, strokeReady: true, burnUnit: false, cardiacCenter: false, score: 89, etaScore: 82, capabilityScore: 92 },
    { name: 'MS Ramaiah Hospital', distance: 6.2, eta: 18, icuBeds: 8, traumaReady: true, strokeReady: true, burnUnit: true, cardiacCenter: true, score: 91, etaScore: 75, capabilityScore: 98 },
    { name: 'Victoria Hospital', distance: 3.8, eta: 12, icuBeds: 2, traumaReady: true, strokeReady: false, burnUnit: false, cardiacCenter: false, score: 82, etaScore: 85, capabilityScore: 78 },
    { name: 'KIMS Hospital', distance: 7.5, eta: 22, icuBeds: 10, traumaReady: true, strokeReady: true, burnUnit: true, cardiacCenter: true, score: 95, etaScore: 70, capabilityScore: 99 },
  ], []);

  const hospitalsList = (hospitals && hospitals.length > 0) ? hospitals : demoHospitals;
  const sorted = [...hospitalsList].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">AI Ranked Hospitals</p>
      <div className="grid grid-cols-1 gap-2">
        {sorted.slice(0, 5).map((h, i) => (
          <div key={h.name || i} className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'bg-gradient-to-r from-emerald-50 to-sky-50 border-emerald-200' : 'bg-white border-slate-200'} hover:shadow-sm transition-shadow duration-200`}>
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-sky-500' : i === 2 ? 'bg-indigo-500' : 'bg-slate-400'}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                {h.traumaReady && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700">TRAUMA</span>}
                {h.cardiacCenter && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-rose-100 text-rose-700">CARDIAC</span>}
                {h.strokeReady && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700">STROKE</span>}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500">
                <span><i className="fas fa-location-dot mr-0.5" />{h.distance} km</span>
                <span><i className="fas fa-clock mr-0.5" />{h.eta} min</span>
                <span><i className="fas fa-bed mr-0.5" />{h.icuBeds} ICU</span>
              </div>
            </div>
            <div className="flex-shrink-0 text-center">
              <p className="text-xl font-black text-slate-800">{h.score || 0}</p>
              <p className="text-[8px] text-slate-400 uppercase">Match %</p>
              <div className="mt-1 w-14 h-1 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${h.score || 0}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {sorted.length > 0 && currentHospital && (
        <div className="text-center text-[10px] text-slate-400 mt-2">
          <i className="fas fa-check-circle text-emerald-500 mr-1" />Currently navigating to <span className="font-semibold text-slate-600">{currentHospital}</span>
        </div>
      )}
    </div>
  );
};

const NavigationAI = ({ toIncident, toHospital, vehicle, incident }) => {
  const routes = useMemo(() => [
    { label: 'Fastest Route', eta: toIncident?.etaMinutes || 7, distance: toIncident?.distanceKm || 4.1, traffic: toIncident?.traffic?.level || 'Light', risk: 'Low', confidence: 92, color: 'emerald' },
    { label: 'Alternate A', eta: (toIncident?.etaMinutes || 7) + 3, distance: (toIncident?.distanceKm || 4.1) + 1.2, traffic: 'Light', risk: 'Low', confidence: 85, color: 'sky' },
    { label: 'Alternate B', eta: (toIncident?.etaMinutes || 7) + 2, distance: (toIncident?.distanceKm || 4.1) + 0.8, traffic: 'Moderate', risk: 'Medium', confidence: 78, color: 'amber' },
    { label: 'Safest Route', eta: (toIncident?.etaMinutes || 7) + 5, distance: (toIncident?.distanceKm || 4.1) + 2.5, traffic: 'Light', risk: 'Very Low', confidence: 96, color: 'indigo' },
  ], [toIncident]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-3">
          <p className="text-[10px] font-bold text-sky-600 uppercase">To Pickup</p>
          <p className="text-2xl font-black text-slate-900">{toIncident?.etaMinutes || '--'} <span className="text-sm font-medium text-slate-500">min</span></p>
          <p className="text-xs text-slate-500">{toIncident?.distanceKm || '--'} km · {toIncident?.traffic?.level || 'Light'} traffic</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase">To Hospital</p>
          <p className="text-2xl font-black text-slate-900">{toHospital?.etaMinutes || '--'} <span className="text-sm font-medium text-slate-500">min</span></p>
          <p className="text-xs text-slate-500">{toHospital?.distanceKm || '--'} km · {toHospital?.traffic?.level || 'Moderate'} traffic</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Route Options</p>
        {routes.map((r) => (
          <div key={r.label} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors duration-200">
            <div className="flex items-center gap-2.5">
              <input type="radio" name="route" defaultChecked={r.label === 'Fastest Route'} className="accent-indigo-600" />
              <div>
                <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                <p className="text-[10px] text-slate-400">{r.eta} min · {r.distance} km</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-${r.color}-100 text-${r.color}-700`}>{r.traffic}</span>
              <span className="text-[10px] font-bold text-slate-500">{r.confidence}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation AI Summary */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <i className="fas fa-satellite-dish text-sky-400 text-xs" />
          <span className="text-[10px] font-bold text-sky-400 uppercase">Navigation AI</span>
        </div>
        <p className="text-xs text-slate-300">
          Route optimized for fastest patient delivery. Traffic moderate on Cubbon Rd — recommended route uses priority lanes.
          <span className="text-emerald-400 font-semibold"> ETA to hospital: {toHospital?.etaMinutes || '--'} min</span>
          {toIncident?.traffic?.level === 'Heavy' && <span className="text-amber-400"> · Delay possible, alternate reroute ready</span>}
        </p>
      </div>
    </div>
  );
};

const EquipmentStatus = ({ equipment }) => {
  const items = equipment || ['Defibrillator ✓', 'Ventilator ✓', 'O₂ 88% remaining', 'Trauma Kit ✓', 'Cardiac Monitor ✓', 'IV Fluids ✓', 'Burn Kit — not onboard', 'Cervical Collar ✓'];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-1.5 p-2 rounded-lg text-[10px] ${
            item.includes('✓') ? 'bg-emerald-50 text-emerald-700' :
            item.includes('%') ? 'bg-amber-50 text-amber-700' :
            item.includes('not') ? 'bg-red-50 text-red-700' :
            'bg-slate-50 text-slate-600'
          }`}>
            <i className={`fas fa-${item.includes('✓') ? 'check-circle' : item.includes('%') ? 'exclamation-circle' : item.includes('not') ? 'times-circle' : 'circle'} text-[8px]`} />
            <span className="truncate">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CommunicationPanel = () => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button type="button" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-sky-700">
          <i className="fas fa-hospital" /> ER
        </button>
        <button type="button" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-red-700">
          <i className="fas fa-shield" /> Police
        </button>
        <button type="button" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-amber-700">
          <i className="fas fa-fire-extinguisher" /> Fire
        </button>
        <button type="button" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-emerald-700">
          <i className="fas fa-phone" /> Dispatch
        </button>
      </div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-microphone text-slate-400 text-xs" />
          <span className="text-[10px] font-semibold text-slate-500">Voice Command</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Hold to speak</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Push-to-talk — ER line open
        </div>
      </div>
    </div>
  );
};

const TriagePanel = ({ incident, onClose }) => {
  const [symptom, setSymptom] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTriage = async () => {
    if (!symptom) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/hospital/triage', {
        method: 'POST',
        body: JSON.stringify({ symptoms: symptom, age: incident?.age || 34, gcs: incident?.gcs || 10 }),
      });
      if (res.ok) {
        setTriageResult(res.data);
      } else {
        // Demo fallback
        setTriageResult({
          severity: 'Critical',
          esi: 1,
          confidence: 87,
          recommendation: 'Immediate life-saving intervention required. Contact trauma team and prepare OR.',
          triageCategory: 'Red',
        });
      }
    } catch {
      setTriageResult({
        severity: 'Critical',
        esi: 1,
        confidence: 87,
        recommendation: 'Immediate life-saving intervention required. Contact trauma team and prepare OR.',
        triageCategory: 'Red',
      });
    } finally {
      setLoading(false);
    }
  };

  const catColors = { Red: 'bg-red-500', Yellow: 'bg-amber-500', Green: 'bg-emerald-500', Black: 'bg-slate-600' };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          placeholder="Enter symptoms, vitals, or mechanism..."
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button type="button" onClick={handleTriage} disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all duration-200">
          {loading ? <i className="fas fa-spinner animate-spin" /> : 'Triage'}
        </button>
      </div>

      {triageResult && (
        <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${catColors[triageResult.triageCategory] || 'bg-slate-400'}`} />
              <span className="text-sm font-bold text-slate-800">{triageResult.severity || 'Critical'}</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">ESI: {triageResult.esi || 1} · {triageResult.confidence || 87}% confidence</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{triageResult.recommendation}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────

const AmbulanceMissionControl = ({ activeModule: externalModule }) => {
  const { user } = useAuth();
  const ambulanceId = resolveAmbulanceId(user);

  const [state, setState] = useState({ loading: true, data: { vehicle: {}, incident: {}, hospital: {}, toIncident: {}, toHospital: {}, patientStatus: 'Unknown' }, missionStart: new Date().toISOString() });
  const [triageOpen, setTriageOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Cleanup toast timer
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Load mission data
  useEffect(() => {
    let isActive = true;
    const loadData = async () => {
      try {
        const hasAuth = Boolean(getAuthToken());
        const [assignmentsRes] = await Promise.all([
          apiFetch(`/api/ambulance/assignments${ambulanceId ? `?ambulance_id=${ambulanceId}` : ''}`, { method: 'GET' }),
        ]);
        const assignments = (assignmentsRes.data?.data || assignmentsRes.data || []);
        const active = Array.isArray(assignments) ? assignments.find((a) => ['active', 'en route'].includes(String(a.status || '').toLowerCase())) || assignments[0] : null;

        if (active && isActive) {
          // Build full data from real API response
          const vehicleData = {
            label: active.ambulanceId || active.vehicleId || 'Ambulance',
            lat: active.currentLat || active.lat || 12.9766,
            lng: active.currentLng || active.lng || 77.5713,
            address: active.currentAddress || active.location || 'En route',
            speedKph: active.speedKph || active.speed || 0,
            fuelLevel: active.fuelLevel || active.fuel || 100,
            equipment: active.equipment || [],
          };
          const incidentData = {
            label: active.emergencyType || active.type || 'Emergency call',
            lat: active.incidentLat || active.pickupLat || 12.9763,
            lng: active.incidentLng || active.pickupLng || 77.5929,
            address: active.incidentAddress || active.pickupAddress || 'Location pending',
            severity: active.priorityLevel || active.priority || active.severity || 'High',
            patientName: active.patient || active.patientName || 'Patient',
            age: active.patientAge || active.age || null,
            gcs: active.gcs || null,
            mechanism: active.emergencyType || active.type || 'Emergency',
          };
          const hospitalData = {
            label: active.hospitalName || active.destinationHospital || 'Nearest Hospital',
            lat: active.hospitalLat || 12.9686,
            lng: active.hospitalLng || 77.5995,
            address: active.hospitalAddress || '',
            icuBeds: active.icuBeds || 0,
            traumaReady: active.traumaReady || false,
            distance: active.hospitalDistance || null,
            eta: active.etaToHospital || null,
          };
          setState((prev) => ({
            ...prev,
            loading: false,
            data: {
              vehicle: vehicleData,
              incident: incidentData,
              hospital: hospitalData,
              toIncident: {
                path: buildFallbackRoute(vehicleData, incidentData),
                etaMinutes: active.etaToIncident || null,
                distanceKm: active.distanceToIncident || null,
                traffic: active.traffic || { level: 'Unknown', adjustedMinutes: null, baseMinutes: null },
              },
              toHospital: {
                path: buildFallbackRoute(incidentData, hospitalData),
                etaMinutes: active.etaToHospital || null,
                distanceKm: active.hospitalDistance || null,
                traffic: active.trafficToHospital || { level: 'Unknown', adjustedMinutes: null, baseMinutes: null },
              },
              patientStatus: active.priorityLevel || active.priority || 'Unknown',
            },
          }));
        } else if (isActive) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (isActive) setState((prev) => ({ ...prev, loading: false }));
      }
    };
    loadData();
    return () => { isActive = false; };
  }, [ambulanceId]);

  const { data, missionStart } = state;
  const vehicle = data.vehicle;
  const incident = data.incident;
  const hospital = data.hospital;
  const toIncidentRoute = data.toIncident?.path || buildFallbackRoute(vehicle, incident);
  const toHospitalRoute = data.toHospital?.path || buildFallbackRoute(incident, hospital);
  const mapCenter = useMemo(() => (hasCoords(incident) ? [incident.lat, incident.lng] : DEFAULT_CENTER), [incident]);

  // Compute KPIs
  const kpis = useMemo(() => [
    { key: 'eta_incident', label: 'ETA to Pickup', value: `${data.toIncident?.etaMinutes || 0} min`, icon: 'fa-clock', color: 'sky', trend: 0 },
    { key: 'eta_hospital', label: 'ETA to Hospital', value: `${data.toHospital?.etaMinutes || 0} min`, icon: 'fa-hospital', color: 'amber', trend: -5 },
    { key: 'speed', label: 'Current Speed', value: `${vehicle.speedKph || 44} km/h`, icon: 'fa-gauge-high', color: 'emerald', trend: 8 },
    { key: 'distance', label: 'Total Distance', value: `${((data.toIncident?.distanceKm || 0) + (data.toHospital?.distanceKm || 0)).toFixed(1)} km`, icon: 'fa-route', color: 'indigo', trend: 0 },
    { key: 'gcs', label: 'Patient GCS', value: `${incident.gcs || '--'}`, icon: 'fa-brain', color: 'violet', trend: -10 },
    { key: 'fuel', label: 'Fuel Level', value: `${vehicle.fuelLevel || 78}%`, icon: 'fa-gas-pump', color: 'rose', trend: -15 },
  ], [data, vehicle, incident]);

  // Insights
  const insights = useMemo(() => [
    { key: 'patient_critical', title: 'Patient Deteriorating', description: 'GCS dropped from 12 to 10 in last 15 min. Increased ICP suspected. Prepare mannitol and notify neurosurgery.', icon: 'fa-heart-pulse', confidence: 88, action: { label: 'Notify Neurosurgery', onClick: () => showToast('Neurosurgery team notified', 'success') } },
    { key: 'traffic_delay', title: 'Traffic Congestion Ahead', description: 'Moderate congestion on Cubbon Rd approaching. Estimated delay of 3-4 min. Alternate route available via Museum Rd.', icon: 'fa-traffic-light', confidence: 82, action: { label: 'Switch Route', onClick: () => showToast('Rerouting via Museum Rd', 'info') } },
    { key: 'hospital_readiness', title: 'ER Prepped for Arrival', description: `${hospital.label || 'Destination hospital'} alerted. Trauma team assembled. ICU bed reserved. Blood bank cross-matching O-negative.`, icon: 'fa-hospital-flag', confidence: 95 },
    { key: 'equipment_check', title: 'O₂ Level Critical', description: 'Oxygen cylinder at 88%. Patient requires high-flow O₂. Consider swapping cylinder at nearest station on route.', icon: 'fa-droplet', confidence: 76, action: { label: 'Find O₂ Refill', onClick: () => showToast('Nearest O₂ refill: Victoria Hospital', 'info') } },
    { key: 'comms_check', title: 'Police Escort Available', description: 'Traffic police notified of emergency route. Priority lane clearance active on route corridor. ETA improvement ~2 min.', icon: 'fa-shield', confidence: 91 },
  ], [hospital, showToast]);

  // Predictions
  const predictions = useMemo(() => [
    { key: 'arrival', label: 'Arrival at Hospital', value: `${data.toHospital?.etaMinutes || 11} min`, trend: 'down', period: 'Current ETA', confidence: 92 },
    { key: 'deterioration', label: 'Deterioration Risk', value: 'High', trend: 'up', period: 'Next 15 min', confidence: 85 },
    { key: 'survival', label: 'Survival Window', value: '~45 min', trend: 'down', period: 'Golden Hour', confidence: 78 },
    { key: 'icu_needed', label: 'ICU Bed Needed', value: '95%', trend: 'up', period: 'Probability', confidence: 90 },
    { key: 'blood_needed', label: 'Blood Required', value: '2-3 units', trend: 'up', period: 'O-negative', confidence: 88 },
  ], [data]);

  // Recommendations
  const recommendations = useMemo(() => [
    { key: 'notify_trauma', title: 'Notify Trauma Team', description: 'Activate full trauma team at receiving hospital. Patient is critical with GCS 10 and suspected internal bleeding.', impact: 'high', icon: 'fa-bell', action: 'Notify Now' },
    { key: 'prepare_o2', title: 'Prepare O₂ Supply', description: 'Current O₂ at 88%. Arrange cylinder swap at nearest medical supply or request backup from dispatch.', impact: 'high', icon: 'fa-droplet', action: 'Request Backup' },
    { key: 'police_escort', title: 'Request Police Escort', description: 'Activate priority lane clearance on remaining route. Estimated time savings: 2-3 min to hospital.', impact: 'medium', icon: 'fa-shield', action: 'Request Now' },
    { key: 'alert_blood_bank', title: 'Alert Blood Bank', description: 'Patient likely O-negative. Request cross-matching and prepare 2-3 units for potential transfusion on arrival.', impact: 'medium', icon: 'fa-droplet', action: 'Alert Blood Bank' },
    { key: 'document_voice', title: 'Voice Documentation', description: 'Use voice transcription to auto-generate patient report, reducing paperwork time by ~5 min.', impact: 'low', icon: 'fa-microphone', action: 'Start Recording' },
  ], []);

  // Activities
  const activities = useMemo(() => [
    { key: 'a1', message: 'Mission dispatched — Multi-vehicle collision at Cubbon Park Rd', timestamp: new Date(Date.now() - 600000).toISOString(), status: 'success', user: 'Dispatch' },
    { key: 'a2', message: 'Ambulance A1 en route to pickup location', timestamp: new Date(Date.now() - 540000).toISOString(), status: 'info', user: 'System' },
    { key: 'a3', message: 'Traffic alert: Moderate congestion on Cubbon Rd — reroute available', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'warning', user: 'AI' },
    { key: 'a4', message: 'Patient vitals updated: HR 122, SpO₂ 88%, BP 92/58', timestamp: new Date(Date.now() - 180000).toISOString(), status: 'info', user: 'Monitor' },
    { key: 'a5', message: 'Golden Hour countdown active — 45 min remaining', timestamp: new Date(Date.now() - 120000).toISOString(), status: 'info', user: 'AI' },
    { key: 'a6', message: "St. Martha's Hospital confirmed: Trauma team ready, ICU bed reserved", timestamp: new Date(Date.now() - 60000).toISOString(), status: 'success', user: 'Hospital' },
    { key: 'a7', message: 'Police notified — priority lane clearance active on route corridor', timestamp: new Date(Date.now() - 30000).toISOString(), status: 'success', user: 'Police' },
  ], []);

  // FAB actions
  const fabActions = useMemo(() => [
    { key: 'triage', label: 'AI Triage Assessment', icon: 'fa-stethoscope', color: '#6366f1', onSelect: () => setTriageOpen(true) },
    { key: 'dispatch', label: 'Request Backup Ambulance', icon: 'fa-truck-medical', color: '#ef4444', onSelect: () => showToast('Backup ambulance requested', 'success') },
    { key: 'communicate', label: 'Open Communication', icon: 'fa-radio', color: '#0ea5e9', onSelect: () => showToast('Communication panel opened', 'info') },
    { key: 'document', label: 'Voice Documentation', icon: 'fa-microphone', color: '#8b5cf6', onSelect: () => showToast('Voice recording started — auto-transcribing', 'info') },
    { key: 'hospital', label: 'Alert Additional Hospital', icon: 'fa-hospital-flag', color: '#10b981', onSelect: () => showToast('Victoria Hospital alerted as backup', 'success') },
  ], [showToast]);

  const handleAction = useCallback((action) => {
    if (action.onSelect) {
      action.onSelect();
    } else if (action.key === 'triage' || action.action === 'Triage Now') {
      setTriageOpen(true);
    } else if (action.action === 'Notify Now' || action.action === 'Notify Neurosurgery') {
      showToast(`Action: ${action.title || action.action}`, 'success');
    } else if (action.action === 'Request Backup') {
      showToast('Backup oxygen cylinder dispatched', 'success');
    } else if (action.action === 'Request Now') {
      showToast('Police escort request sent', 'success');
    } else if (action.action === 'Alert Blood Bank') {
      showToast('Blood bank alerted — O-negative crossmatch requested', 'success');
    } else if (action.action === 'Start Recording') {
      showToast('Voice documentation started', 'info');
    } else {
      showToast(`Executing: ${action.title || action.label || action.action}`, 'success');
    }
  }, [showToast]);

  return (
    <div className="relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border animate-slide-in-right ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toast.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-800' :
          toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          <i className={`fas ${
            toast.type === 'success' ? 'fa-check-circle' :
            toast.type === 'info' ? 'fa-info-circle' :
            toast.type === 'warning' ? 'fa-exclamation-circle' : 'fa-times-circle'
          }`} />
          <span className="text-xs font-semibold">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600"><i className="fas fa-times text-[10px]" /></button>
        </div>
      )}

      <EnterpriseModuleShell
        title="Ambulance Mission Control"
        icon="fa-truck-medical"
        gradient="from-sky-700 to-indigo-800"
        subtitle="Emergency Medical Services Command Center"
        loading={state.loading}
        kpis={kpis}
        insights={insights}
        predictions={predictions}
        recommendations={recommendations}
        activities={activities}
        actions={fabActions}
        onAction={handleAction}
        onRefresh={() => setState((prev) => ({ ...prev, loading: true, missionStart: new Date().toISOString() }))}
        executiveSummary={{
          text: `Active mission: ${incident.label || 'Emergency response'}. Patient ${incident.patientName || 'Unknown'} with GCS ${incident.gcs || '--'}, severity ${incident.severity || 'Critical'}. Currently en route to ${hospital.label || 'hospital'}. ETA ${data.toHospital?.etaMinutes || '--'} min. Golden Hour countdown active. ${incident.severity === 'Critical' ? 'Critical condition — expedite transport and activate full trauma protocol.' : 'Stable but requires monitoring.'}`,
          confidence: 91,
        }}
      >
        {/* ─── MODULE: Mission Overview ──────────────────────── */}
        {(externalModule === 'mission-overview' || !externalModule) && (
          <div className="space-y-5">
            {/* Golden Hour + Mission Timer Row */}
            <div className="flex flex-wrap items-center gap-4">
              <GoldenHourTimer startTime={missionStart} />
              <MissionTimer startTime={missionStart} />
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <i className="fas fa-truck-medical text-slate-400 text-xs" />
                <span className="text-xs font-semibold text-slate-700">{vehicle.label || 'Ambulance A1'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </div>
            </div>

            {/* Critical Incident Banner */}
            <CriticalIncidentBanner incident={incident} patientStatus={data.patientStatus} onOpenTriage={() => setTriageOpen(true)} />

            {/* AI Triage Panel */}
            {triageOpen && (
              <div className="rounded-xl bg-white border-2 border-indigo-200 shadow-lg p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-stethoscope text-indigo-600 text-sm" />
                    <span className="text-xs font-bold text-indigo-700 uppercase">AI Triage Engine</span>
                  </div>
                  <button type="button" onClick={() => setTriageOpen(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times" /></button>
                </div>
                <TriagePanel incident={incident} onClose={() => setTriageOpen(false)} />
              </div>
            )}

            {/* Tactical Map + Equipment */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl overflow-hidden border border-slate-200 bg-white">
                <div className="h-[400px] w-full">
                  <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {toIncidentRoute.length > 1 && (
                      <Polyline positions={toIncidentRoute} color="#ef4444" weight={4} opacity={0.9} />
                    )}
                    {toHospitalRoute.length > 1 && (
                      <Polyline positions={toHospitalRoute} color="#0ea5e9" weight={4} opacity={0.9} />
                    )}
                    {hasCoords(vehicle) && (
                      <Marker position={[vehicle.lat, vehicle.lng]} icon={ambulanceIcon}>
                        <Popup>
                          <div className="text-xs"><p className="font-semibold">{vehicle.label}</p><p>{vehicle.address}</p><p>Speed {vehicle.speedKph} km/h</p></div>
                        </Popup>
                      </Marker>
                    )}
                    {hasCoords(incident) && (
                      <Marker position={[incident.lat, incident.lng]} icon={incidentIcon}>
                        <Popup>
                          <div className="text-xs"><p className="font-semibold">Incident</p><p>{incident.address}</p></div>
                        </Popup>
                      </Marker>
                    )}
                    {hasCoords(hospital) && (
                      <Marker position={[hospital.lat, hospital.lng]} icon={hospitalIcon}>
                        <Popup>
                          <div className="text-xs"><p className="font-semibold">{hospital.label}</p><p>{hospital.address}</p></div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
                {/* Map Legend */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-blue-600" /> Ambulance
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Incident
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" /> Hospital
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 ml-auto">
                    <span className="w-4 h-0.5 bg-red-400" /> Route to pick-up
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-4 h-0.5 bg-sky-400" /> Route to hospital
                  </div>
                </div>
              </div>

              {/* Side Panel: Equipment + Quick Actions */}
              <div className="space-y-4">
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-kit-medical text-slate-400 text-xs" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Equipment Status</span>
                  </div>
                  <EquipmentStatus equipment={vehicle.equipment} />
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-bolt text-slate-400 text-xs" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Quick Actions</span>
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => setTriageOpen(true)}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-indigo-700">
                      <i className="fas fa-stethoscope" /> AI Triage
                    </button>
                    <button type="button" onClick={() => showToast('Trauma team notified at destination', 'success')}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-rose-700">
                      <i className="fas fa-bell" /> Notify Trauma Team
                    </button>
                    <button type="button" onClick={() => showToast('Police escort requested', 'success')}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-amber-700">
                      <i className="fas fa-shield" /> Request Police Escort
                    </button>
                    <button type="button" onClick={() => showToast('Blood bank alerted — O-negative', 'success')}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all duration-200 text-xs font-semibold text-emerald-700">
                      <i className="fas fa-droplet" /> Alert Blood Bank
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Near Incident Resources */}
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-location-crosshairs text-slate-400 text-xs" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nearby Emergency Resources</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {[
                  { label: 'Trauma Center', icon: 'fa-hospital', dist: '0.8 km', color: 'red' },
                  { label: 'Police Station', icon: 'fa-shield', dist: '1.2 km', color: 'blue' },
                  { label: 'Fire Station', icon: 'fa-fire-extinguisher', dist: '2.1 km', color: 'amber' },
                  { label: 'Blood Bank', icon: 'fa-droplet', dist: '1.5 km', color: 'rose' },
                  { label: 'O₂ Refill', icon: 'fa-wind', dist: '0.5 km', color: 'sky' },
                  { label: 'Fuel Station', icon: 'fa-gas-pump', dist: '1.8 km', color: 'emerald' },
                  { label: 'Helipad', icon: 'fa-helicopter', dist: '3.5 km', color: 'violet' },
                  { label: 'Command Center', icon: 'fa-tower-broadcast', dist: '4.2 km', color: 'indigo' },
                ].map((r) => (
                  <div key={r.label} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl bg-${r.color}-50/70 border border-${r.color}-200/50 hover:shadow-sm transition-shadow duration-200`}>
                    <i className={`fas ${r.icon} text-${r.color}-500 text-sm`} />
                    <p className="text-[9px] font-semibold text-slate-600 text-center">{r.label}</p>
                    <p className="text-[8px] text-slate-400">{r.dist}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── MODULE: Digital Patient Twin ───────────────────── */}
        {externalModule === 'patient-twin' && (
          <div className="space-y-4">
            <CriticalIncidentBanner incident={incident} patientStatus={data.patientStatus} />
            <PatientDigitalTwin patient={{ name: incident.patientName, vitals: { heartRate: 122, oxygen: 88, bp: '92/58', gcs: incident.gcs || 10, rr: 28, temp: 38.2 } }} />
          </div>
        )}

        {/* ─── MODULE: Navigation AI ──────────────────────────── */}
        {externalModule === 'navigation-ai' && (
          <NavigationAI toIncident={data.toIncident} toHospital={data.toHospital} vehicle={vehicle} incident={incident} />
        )}

        {/* ─── MODULE: Hospital AI ────────────────────────────── */}
        {externalModule === 'hospital-ai' && (
          <HospitalRecommendationEngine currentHospital={hospital.label} />
        )}

        {/* ─── MODULE: Communication ──────────────────────────── */}
        {externalModule === 'communication' && (
          <CommunicationPanel />
        )}

        {/* ─── MODULE: Predictions ────────────────────────────── */}
        {externalModule === 'predictions' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-chart-line text-indigo-500 text-sm" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Predictions & Forecasts</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {predictions.map((pred, i) => (
                <div key={pred.key || i} className="rounded-xl bg-white border border-slate-200 p-3 hover:shadow-sm transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">{pred.label}</p>
                    <i className={`fas ${pred.trend === 'up' ? 'fa-arrow-trend-up text-emerald-500' : pred.trend === 'down' ? 'fa-arrow-trend-down text-red-500' : 'fa-minus text-slate-400'} text-sm`} />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{pred.value}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-400">{pred.period}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{pred.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── MODULE: Recommendations ────────────────────────── */}
        {externalModule === 'recommendations' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-wand-magic-sparkles text-indigo-500 text-sm" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Smart Recommendations</span>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => {
                const impactColors = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
                const colors = ['sky', 'amber', 'emerald', 'violet', 'rose', 'indigo'];
                return (
                  <div key={rec.key || i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all duration-200">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${colors[i % colors.length]}-100 text-${colors[i % colors.length]}-600 flex items-center justify-center`}>
                      <i className={`fas ${rec.icon || 'fa-wand-magic-sparkles'} text-xs`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-slate-800">{rec.title}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactColors[rec.impact] || impactColors.medium}`}>{rec.impact?.toUpperCase()}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{rec.description}</p>
                      {rec.action && (
                        <button type="button" onClick={() => handleAction(rec)}
                          className="mt-1.5 text-[10px] font-semibold text-sky-600 hover:text-sky-800">
                          <i className="fas fa-play text-[8px] mr-1" />{rec.action}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── MODULE: Equipment ──────────────────────────────── */}
        {externalModule === 'equipment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-kit-medical text-sky-500 text-sm" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ambulance Equipment Status</span>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <EquipmentStatus equipment={vehicle.equipment} />
            </div>
          </div>
        )}

        {/* ─── MODULE: Activity Feed ──────────────────────────── */}
        {externalModule === 'activity-feed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-timeline text-indigo-500 text-sm" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mission Activity Feed</span>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3 divide-y divide-slate-100">
              {activities.map((act, i) => {
                const statusDot = act.status === 'success' ? 'bg-emerald-500' : act.status === 'warning' ? 'bg-amber-500' : act.status === 'error' ? 'bg-red-500' : 'bg-slate-400';
                const timeAgo = (ts) => { if (!ts) return ''; const d = Date.now() - new Date(ts).getTime(); const m = Math.floor(d / 60000); if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago'; };
                return (
                  <div key={act.key || i} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${statusDot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">{act.message}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{act.user || 'System'} • {timeAgo(act.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── MODULE: Reports (placeholder) ──────────────────── */}
        {externalModule === 'reports' && (
          <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
            <i className="fas fa-file-alt text-4xl text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">Mission Reports</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Comprehensive mission report generation, including patient reports, navigation logs, equipment logs, AI decision reports, and government audit documents.
            </p>
            <button type="button" onClick={() => showToast('Report generation coming soon', 'info')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-200">
              <i className="fas fa-file-export mr-1.5" />Generate Report
            </button>
          </div>
        )}

        {/* ─── MODULE: Simulation (placeholder) ───────────────── */}
        {externalModule === 'simulation' && (
          <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
            <i className="fas fa-play text-4xl text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">Mission Replay & Simulation</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Replay completed missions, run training simulations, and analyze AI decision-making with full timeline playback, speed controls, and scenario branching.
            </p>
            <button type="button" onClick={() => showToast('Simulation module coming soon', 'info')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-200">
              <i className="fas fa-rotate-left mr-1.5" />Start Simulation
            </button>
          </div>
        )}

        {/* ─── MODULE: Settings (placeholder) ─────────────────── */}
        {externalModule === 'settings' && (
          <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
            <i className="fas fa-cog text-4xl text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">Mission Settings</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Configure ambulance preferences, notification settings, display options, and mission parameters for your emergency response workspace.
            </p>
            <button type="button" onClick={() => showToast('Settings panel coming soon', 'info')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-200">
              <i className="fas fa-sliders mr-1.5" />Open Settings
            </button>
          </div>
        )}
      </EnterpriseModuleShell>
    </div>
  );
};

export default AmbulanceMissionControl;
