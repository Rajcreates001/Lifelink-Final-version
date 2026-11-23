import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import MobileDrawer from '../components/layout/MobileDrawer';
import LogoutConfirmDialog from '../components/ui/LogoutConfirmDialog';
import ProfileModal from '../components/ProfileModal';
import AmbulanceMissionHeader from '../components/ambulance/AmbulanceMissionHeader';

// ─── Lazy-loaded module workspace components ─────────────────
// Each module is a fully independent workspace — no shared shell.
const MissionOverview = lazy(() => import('../components/ambulance/modules/MissionOverview'));
const PatientTwin = lazy(() => import('../components/ambulance/modules/PatientTwin'));
const NavigationAI = lazy(() => import('../components/ambulance/modules/NavigationAI'));
const HospitalAI = lazy(() => import('../components/ambulance/modules/HospitalAI'));
const Communication = lazy(() => import('../components/ambulance/modules/Communication'));
const Predictions = lazy(() => import('../components/ambulance/modules/Predictions'));
const Recommendations = lazy(() => import('../components/ambulance/modules/Recommendations'));
const ActivityFeed = lazy(() => import('../components/ambulance/modules/ActivityFeed'));
const Resources = lazy(() => import('../components/ambulance/modules/Resources'));
const Reports = lazy(() => import('../components/ambulance/modules/Reports'));
const Simulation = lazy(() => import('../components/ambulance/modules/Simulation'));
const Settings = lazy(() => import('../components/ambulance/modules/Settings'));
const GPSTracking = lazy(() => import('../components/ambulance/GPSTrackingSimulator'));

// ─── Module Metadata ──────────────────────────────────────────
// ─── Module Route Keys (must match user's spec exactly) ─────
// These keys become the URL path: /dashboard/ambulance/:module
const MODULE_KEYS = [
  'mission-overview',
  'digital-patient-twin',
  'navigation-ai',
  'hospital-ai',
  'communication',
  'predictions',
  'recommendations',
  'resources',
  'activity',
  'reports',
  'simulation',
  'gps-tracking',
  'settings',
];

const moduleLabels = {
  'mission-overview': 'Mission Overview',
  'digital-patient-twin': 'Digital Patient Twin',
  'navigation-ai': 'Navigation AI',
  'hospital-ai': 'Hospital AI',
  'communication': 'Communication',
  'predictions': 'Predictions',
  'recommendations': 'Recommendations',
  'resources': 'Resources',
  'activity': 'Activity Feed',
  'reports': 'Reports',
  'simulation': 'Simulation',
  'gps-tracking': 'GPS Tracking',
  'settings': 'Settings',
};

const moduleIcons = {
  'mission-overview': 'fa-gauge-high',
  'digital-patient-twin': 'fa-heartbeat',
  'navigation-ai': 'fa-route',
  'hospital-ai': 'fa-hospital',
  'communication': 'fa-radio',
  'predictions': 'fa-chart-line',
  'recommendations': 'fa-wand-magic-sparkles',
  'resources': 'fa-kit-medical',
  'activity': 'fa-timeline',
  'reports': 'fa-file-alt',
  'simulation': 'fa-play',
  'gps-tracking': 'fa-satellite-dish',
  'settings': 'fa-cog',
};

const sidebarItems = Object.entries(moduleLabels).map(([key, label]) => ({
  key, label, icon: moduleIcons[key] || 'fa-cube',
}));

// ─── Module Component Router ─────────────────────────────────
// Each module is its own dedicated workspace with unique layout,
// KPIs, charts, data, and workflows — NO shared shell content.
const MODULE_COMPONENT_MAP = {
  'mission-overview': MissionOverview,
  'digital-patient-twin': PatientTwin,
  'navigation-ai': NavigationAI,
  'hospital-ai': HospitalAI,
  'communication': Communication,
  'predictions': Predictions,
  'recommendations': Recommendations,
  'resources': Resources,
  'activity': ActivityFeed,
  'reports': Reports,
  'simulation': Simulation,
  'gps-tracking': GPSTracking,
  'settings': Settings,
};

const ModuleFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-600" />
      <p className="text-xs text-slate-500 font-medium">Loading workspace...</p>
    </div>
  </div>
);

// ─── Hook: Fetch real ambulance mission data from API ────────
const useAmbulanceMissionData = () => {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [incident, setIncident] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [toIncident, setToIncident] = useState(null);
  const [toHospital, setToHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let firstLoad = true;
    const fetchMissionData = async () => {
      // Only the first load shows the spinner; later polls refresh in place so a
      // newly assigned SOS appears without reloading the page.
      if (firstLoad) setLoading(true);
      firstLoad = false;
      try {
        const statusRes = await apiFetch('/api/ambulance/emergency-status');
        const hospitalsRes = await apiFetch('/api/government-ops/hospitals');

        if (!active) return;

        const statusData = statusRes.ok ? statusRes.data : null;
        const mission = statusData?.activeMission ?? null;

        // ── Vehicle: prefer backend activeMission.vehicle (joined from the ambulance doc +
        //    its currentLocation). That already contains speed/fuel, but when the backend row
        //    is an orphan (no linked vehicle doc) those fields are null — fall back to the GPS
        //    simulator telemetry for the same vehicle so the dashboard still shows real numbers.
        const vehicleFromBackend = mission?.vehicle ? {
          label: mission.vehicle.label || mission.vehicle.vehicleId || user?.name || 'Ambulance A1',
          lat: mission.vehicle.currentLat ?? 12.9141,
          lng: mission.vehicle.currentLng ?? 74.8560,
          address: mission.vehicle.currentAddress || 'En route',
          speedKph: mission.vehicle.speedKph ?? null,
          fuelLevel: mission.vehicle.fuelLevel ?? null,
          equipment: [],
          _backendVehicleId: mission.vehicle.vehicleId || null,
        } : {
          label: user?.name || 'Ambulance A1',
          lat: 12.9141,
          lng: 74.8560,
          address: 'En route',
          speedKph: null,
          fuelLevel: null,
          equipment: [],
          _backendVehicleId: mission?.vehicle?.vehicleId || null,
        };          setVehicle(vehicleFromBackend);
          // If the backend vehicle doc had no telemetry (orphan assignment), try the GPS
          // simulator for the same vehicle so speed/fuel come from a real source.
          const backendHadTelemetry = mission?.vehicle?.speed != null || mission?.vehicle?.fuel != null || mission?.vehicle?.speedKph != null || mission?.vehicle?.fuelLevel != null;
          if (!backendHadTelemetry) {
            try {
              const gpsCode = vehicleFromBackend._backendVehicleId || mission?.vehicle?.vehicleId || vehicleFromBackend.label || 'Ambulance A1';
              const gpsRes = await apiFetch(`/api/gps-tracking/ambulance/${encodeURIComponent(gpsCode)}`, { method: 'GET', timeoutMs: 5000, cache: 'no-store' });
              if (gpsRes.ok && gpsRes.data) {
                const gps = gpsRes.data;
                setVehicle((prev) => ({
                  ...prev,
                  speedKph: gps.speedKmh ?? gps.speedKph ?? prev.speedKph,
                  speed: gps.speedKmh ?? gps.speedKph ?? prev.speed,
                  fuelLevel: gps.fuelLevel ?? prev.fuelLevel,
                  fuel: gps.fuelLevel ?? prev.fuel,
                  lat: gps.lat ?? gps.latitude ?? prev.lat,
                  lng: gps.lng ?? gps.longitude ?? prev.lng,
                }));
              }
            } catch { /* simulator not running */ }
          }

        // ── Incident + ETAs: from backend activeMission (already enriched with
        //    SOS alert, routing ETAs and GCS estimate in list_assignments).
        if (mission?.assignment) {
          const a = mission.assignment;
          // Incident context: prefer the backend-joined SOS alert (patient name, severity,
          // mechanism, coords, GCS vitals) which the emergency-status route now resolves from the
          // linked alert doc + patient profile. When the assignment was created without a linked
          // SOS alert, fall back to the assignment's own fields so the dashboard never shows a
          // blank mission just because the row was created directly by the dispatcher.
          const alertIncident = mission.incident;
          const patientNameRaw = (alertIncident?.patientName ?? a.patient ?? a.patientName ?? a.patient_name ?? null);
          setIncident({
            label: (alertIncident?.label ?? a.emergencyType ?? a.sos_message ?? a.incidentType ?? a.type ?? 'Emergency call') || 'Emergency call',
            lat: alertIncident?.lat ?? a.incidentLat ?? a.pickupLat ?? (a.pickup?.lat) ?? 12.9172,
            lng: alertIncident?.lng ?? a.incidentLng ?? a.pickupLng ?? (a.pickup?.lng) ?? 74.8559,
            address: (alertIncident?.address ?? a.incidentAddress ?? a.pickupAddress ?? a.pickup?.address ?? 'Location pending') || 'Location pending',
            severity: (alertIncident?.severity ?? a.severity ?? a.emergencyType ?? 'Critical') || 'Critical',
            patientName: String(patientNameRaw ?? '').trim() || 'Patient',
            age: a.patientAge ?? a.age ?? null,
            gcs: a.gcs ?? alertIncident?.vitals?.gcs ?? null,
            gcsSource: a.gcsSource || null,
            mechanism: (alertIncident?.mechanism ?? a.emergencyType ?? a.sos_message ?? a.mechanism ?? a.incidentType ?? 'Road Traffic Accident') || 'Road Traffic Accident',
          });
          // Vehicle -> incident: use the backend figures when present, otherwise the
          // straight-line distance from the vehicle's live position at ~35 km/h urban speed.
          const iLat = Number(alertIncident?.lat ?? a.incidentLat);
          const iLng = Number(alertIncident?.lng ?? a.incidentLng);
          const vLat = Number(mission.vehicle?.currentLat);
          const vLng = Number(mission.vehicle?.currentLng);
          let crowKm = null;
          if ([iLat, iLng, vLat, vLng].every(Number.isFinite)) {
            const rad = (d) => (d * Math.PI) / 180;
            const h = Math.sin(rad(iLat - vLat) / 2) ** 2 + Math.cos(rad(vLat)) * Math.cos(rad(iLat)) * Math.sin(rad(iLng - vLng) / 2) ** 2;
            crowKm = Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 1.3 * 10) / 10;
          }
          const etaMinutesRaw = a.etaToIncident ?? (crowKm != null ? (crowKm / 35) * 60 : null);
          const distanceKmRaw = a.distanceToIncident ?? crowKm;
          const etaMinutes = Number.isFinite(Number(etaMinutesRaw)) ? Math.max(1, Math.round(Number(etaMinutesRaw))) : (mission.vehicle ? 6 : null);
          const distanceKm = Number.isFinite(Number(distanceKmRaw)) ? Number(distanceKmRaw) : (mission.vehicle ? 2.4 : null);
          setToIncident({ etaMinutes, distanceKm, traffic: a.traffic || { level: 'Unknown', adjustedMinutes: null, baseMinutes: null } });
          const etaHospitalRaw = a.etaToHospital ?? a.eta_minutes ?? null;
          const distanceHospitalRaw = a.hospitalDistance ?? a.distance_km ?? null;
          const etaHospital = Number.isFinite(Number(etaHospitalRaw)) ? Math.max(1, Math.round(Number(etaHospitalRaw))) : (mission.vehicle ? 18 : null);
          const distanceHospital = Number.isFinite(Number(distanceHospitalRaw)) ? Number(distanceHospitalRaw) : (mission.vehicle ? 3.1 : null);
          setToHospital({ etaMinutes: etaHospital, distanceKm: distanceHospital, traffic: a.trafficToHospital || { level: 'Unknown', adjustedMinutes: null, baseMinutes: null } });
        } else {
          setIncident({ label: 'No active mission', lat: 12.9172, lng: 74.8559, address: 'Awaiting assignment', severity: 'Low', patientName: '—', age: null, gcs: null, mechanism: '—' });
          setToIncident({ etaMinutes: null, distanceKm: null, traffic: { level: 'Unknown', adjustedMinutes: null, baseMinutes: null } });
          setToHospital({ etaMinutes: null, distanceKm: null, traffic: { level: 'Unknown', adjustedMinutes: null, baseMinutes: null } });
        }

        // ── Hospital: from the assignment's joined hospital doc when available,
        //    otherwise from the hospitals list. The backend emergency-status route now
        //    returns the joined hospital only indirectly (via assignment.hospital_id), so
        //    we resolve the hospital doc here just like the backend does.
        const hospitalsResData = hospitalsRes.ok ? (hospitalsRes.data?.data || hospitalsRes.data?.hospitals || []) : [];
        const hospArray = Array.isArray(hospitalsResData) ? hospitalsResData : [];
        // The assigned hospital (by id) wins; the first listed hospital is only a
        // fallback when there is no assignment at all.
        const assignedHospId = mission?.assignment?.hospital_id || mission?.assignment?.destinationHospitalId || null;
        const assignedHosp = assignedHospId ? hospArray.find((h) => String(h.id || h._id) === String(assignedHospId)) : null;
        const targetHospital = mission?.assignment?.hospital || assignedHosp || (assignedHospId ? null : hospArray[0]) || null;
        let resolvedHospital = targetHospital ? {
          label: targetHospital.name || targetHospital.hospitalName || 'Nearest Hospital',
          lat: targetHospital.lat ?? targetHospital.latitude ?? 12.8698,
          lng: targetHospital.lng ?? targetHospital.longitude ?? 74.8430,
          address: targetHospital.address || (typeof targetHospital.location === 'string' ? targetHospital.location : ''),
          icuBeds: targetHospital.icuBeds ?? targetHospital.icu_beds ?? 0,
          traumaReady: !!targetHospital.traumaReady,
          distance: null,
          eta: null,
        } : { label: 'Nearest Hospital', lat: 12.8698, lng: 74.8430, address: '', icuBeds: 0, traumaReady: false, distance: null, eta: null };

        if (mission?.assignment) {
          const a = mission.assignment;
          const hospId = a.hospital_id || a.hospital || a.destinationHospitalId || null;
          if (hospId && !(targetHospital && (targetHospital.name || targetHospital.hospitalName))) {
            try {
              const hospRes = await apiFetch(`/api/government-ops/hospital/${encodeURIComponent(String(hospId))}`, { method: 'GET', timeoutMs: 3000 });
              if (hospRes.ok && hospRes.data) {
                const h = hospRes.data;
                resolvedHospital = {
                  label: h.name || h.hospitalName || 'Nearest Hospital',
                  lat: h.lat ?? h.latitude ?? 12.8698,
                  lng: h.lng ?? h.longitude ?? 74.8430,
                  address: h.address || (typeof h.location === 'string' ? h.location : ''),
                  icuBeds: h.icuBeds ?? h.icu_beds ?? 0,
                  traumaReady: !!h.traumaReady,
                  distance: null,
                  eta: null,
                };
              }
            } catch { /* hospital lookup optional */ }
          }
          resolvedHospital.distance = Number.isFinite(Number(a.hospitalDistance ?? a.distance_km)) ? Number(a.hospitalDistance ?? a.distance_km) : resolvedHospital.distance;
          resolvedHospital.eta = Number.isFinite(Number(a.etaToHospital ?? a.eta_minutes)) ? Math.max(1, Math.round(Number(a.etaToHospital ?? a.eta_minutes))) : resolvedHospital.eta;
        }
        setHospital(resolvedHospital);


      } catch (err) {
        if (active) {
          // Error fallback: keep a real mission shell if the backend returned one before the
          // failure, otherwise show an honest empty state. Never fabricate KPIs — those stay null
          // so the panel shows '--' rather than a misleading zero.
          setVehicle((prev) => prev || { label: user?.name || 'Ambulance A1', lat: 12.9141, lng: 74.8560, address: 'En route', speedKph: null, fuelLevel: null, equipment: [] });
          setIncident((prev) => (!prev || prev.label === 'No active mission') ? { label: 'No active mission', lat: 12.9172, lng: 74.8559, address: 'Awaiting assignment', severity: 'Low', patientName: '—', age: null, gcs: null, mechanism: '—' } : prev);
          setToIncident((prev) => prev || { etaMinutes: null, distanceKm: null, traffic: { level: 'Unknown', adjustedMinutes: null, baseMinutes: null } });
          setToHospital((prev) => prev || { etaMinutes: null, distanceKm: null, traffic: { level: 'Unknown', adjustedMinutes: null, baseMinutes: null } });
          setHospital((prev) => prev || { label: 'Nearest Hospital', lat: 12.8698, lng: 74.8430, address: '', icuBeds: 0, traumaReady: false, distance: null, eta: null });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchMissionData();
    const poll = setInterval(fetchMissionData, 15000);
    return () => { active = false; clearInterval(poll); };
  }, [user]);

  return { vehicle, incident, hospital, toIncident, toHospital, loading };
};

const useIsDesktop = () => {
  const getMatches = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  };
  const [isDesktop, setIsDesktop] = useState(getMatches);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(min-width: 1024px)');
    const handler = (event) => setIsDesktop(event.matches);
    media.addEventListener?.('change', handler);
    return () => media.removeEventListener?.('change', handler);
  }, []);
  return isDesktop;
};

// ─── Desktop ─────────────────────────────────────────────────
const DesktopAmbulanceDashboard = () => {
  const navigate = useNavigate();
  const { module: urlModule } = useParams();
  const { vehicle, incident, hospital, toIncident, toHospital, _loading } = useAmbulanceMissionData();
  const activeModule = urlModule && moduleLabels[urlModule] ? urlModule : 'mission-overview';
  const [triageOpen, setTriageOpen] = useState(false);
  const [triageInput, setTriageInput] = useState('');
  const [toast, setToast] = useState(null);
  const [missionStart] = useState(() => new Date().toISOString());
  // Track visited modules: only visited modules stay mounted (state
  // preservation), the rest are NOT rendered. Previously ALL 13 modules were
  // mounted at once — each a full charts+map workspace — which made the
  // first dashboard paint extremely heavy and the whole app laggy.
  // Computed during render (Set union) instead of an effect to avoid a
  // setState-in-effect cascade.
  const [mountedModules, setMountedModules] = useState(() => new Set(['mission-overview']));
  if (!mountedModules.has(activeModule)) {
    const next = new Set(mountedModules);
    next.add(activeModule);
    setMountedModules(next);
  }
  const visited = mountedModules;

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAction = useCallback((action) => {
    if (action && typeof action === 'string') {
      showToast(`Action: ${action.replace(/_/g, ' ')}`, 'success');
    } else {
      showToast('Action executed', 'success');
    }
  }, [showToast]);

  const ModuleComponent = MODULE_COMPONENT_MAP[activeModule] || MissionOverview;

  return (
    <DashboardLayout sidebarItems={sidebarItems} activeItem={activeModule}
      onSelect={(key) => navigate(`/dashboard/ambulance/${key}`, { replace: false })}
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border bg-emerald-50 border-emerald-200 text-emerald-800 animate-slide-in-right">
          <i className="fas fa-check-circle" />
          <span className="text-xs font-semibold">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <i className="fas fa-times text-[10px]" />
          </button>
        </div>
      )}

      {/* Sticky Mission Header */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-slate-50/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <AmbulanceMissionHeader
          patientName={incident?.patientName || '—'}
          severity={incident?.severity || 'Low'}
          eta={toHospital?.etaMinutes != null ? String(toHospital.etaMinutes) : '—'}
          incidentLabel={incident?.label || 'No active mission'}
          vehicleLabel={vehicle?.label || 'Ambulance'}
          speedKph={vehicle?.speedKph}
          missionStart={missionStart}
        />
      </div>

      {/* Module Label */}
      <div className="mb-4 mt-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspace</p>
        <h2 className="text-lg font-bold text-slate-900 font-display">{moduleLabels[activeModule] || 'Mission Overview'}</h2>
      </div>

      {/* ✨ Dedicated Module Workspaces — visited modules stay mounted (hidden
          via CSS) to preserve state (search text, accepted recommendations);
          never-visited modules are not rendered at all, keeping the dashboard
          light and responsive. */}
      <div className="relative">
        {MODULE_KEYS.map((key) => {
          if (!visited.has(key)) return null;
          const Comp = MODULE_COMPONENT_MAP[key] || MissionOverview;
          const isActive = key === activeModule;
          return (
            <div key={key} className={isActive ? '' : 'hidden'}>
              <Suspense fallback={<ModuleFallback />}>
                <Comp
                  vehicle={vehicle || {}}
                  incident={incident || {}}
                  hospital={hospital || {}}
                  toIncident={toIncident || {}}
                  toHospital={toHospital || {}}
                  missionStart={missionStart}
                  patientStatus="Critical"
                  goldenHour
                  onAction={handleAction}
                  onOpenTriage={() => { setTriageOpen(true); }}
                />
              </Suspense>
            </div>
          );
        })}
      </div>

      {/* Triage Modal (shared across modules that need it) */}
      {triageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setTriageOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <i className="fas fa-stethoscope text-indigo-500" />
                <span className="text-sm font-bold text-slate-800">AI Triage Assessment</span>
              </div>
              <button type="button" onClick={() => setTriageOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">Enter symptoms, vitals, or mechanism for AI triage:</p>
            <textarea value={triageInput} onChange={(e) => setTriageInput(e.target.value)} className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={3} placeholder="e.g. GCS 10, HR 122, BP 92/58, suspected internal hemorrhage..." />
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setTriageOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="button" onClick={() => { showToast('AI Triage assessment submitted', 'success'); setTriageOpen(false); }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">Run Triage</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// ─── Mobile ──────────────────────────────────────────────────
const MobileAmbulanceDashboard = () => {
  const { user, performLogout } = useAuth();
  const navigate = useNavigate();
  const { module: urlModule } = useParams();
  const { vehicle, incident, hospital, toIncident, toHospital } = useAmbulanceMissionData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const activeModule = urlModule && moduleLabels[urlModule] ? urlModule : 'mission-overview';
  const [missionStart] = useState(() => new Date().toISOString());
  const [toast, setToast] = useState(null);
  // Same visited-module optimization as desktop — on mobile, mounting all 13
  // workspaces at once made scrolling and module switching visibly janky.
  const [mountedModules, setMountedModules] = useState(() => new Set(['mission-overview']));
  if (!mountedModules.has(activeModule)) {
    const next = new Set(mountedModules);
    next.add(activeModule);
    setMountedModules(next);
  }
  const visited = mountedModules;

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAction = useCallback((action) => {
    showToast(typeof action === 'string' ? `Action: ${action.replace(/_/g, ' ')}` : 'Action executed', 'success');
  }, [showToast]);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    const redirectRoute = performLogout();
    navigate(redirectRoute, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs font-semibold animate-slide-in-right">
          <i className="fas fa-check-circle" />{toast.message}
        </div>
      )}

      {/* Mobile Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={() => setMenuOpen(true)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg p-2 transition-all">
            <i className="fas fa-bars" />
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white">
              <i className="fas fa-truck-medical" />
            </span>
            <div className="text-left">
              <p className="text-xs text-slate-400 uppercase">LifeLink</p>
              <p className="text-sm font-semibold text-slate-900">{moduleLabels[activeModule] || 'Ambulance Command'}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
          </span>
        </div>
        {/* Module selector pills */}
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 scrollbar-hide">
          {Object.entries(moduleLabels).slice(0, 6).map(([key, label]) => (
            <button key={key} type="button" onClick={() => navigate(`/dashboard/ambulance/${key}`)}
              className={`whitespace-nowrap text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                activeModule === key
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Mobile Mission Header */}
      <div className="bg-slate-50/95 backdrop-blur border-b border-slate-200 px-3 py-2">
        <AmbulanceMissionHeader
          patientName={incident?.patientName || '—'}
          severity={incident?.severity || 'Low'}
          eta={toHospital?.etaMinutes != null ? String(toHospital.etaMinutes) : '—'}
          incidentLabel={incident?.label || 'No active mission'}
          vehicleLabel={vehicle?.label || 'Ambulance'}
          speedKph={vehicle?.speedKph}
          missionStart={missionStart}
        />
      </div>

      {/* ✨ Module Content — visited modules stay mounted for state, others are
          not rendered (the desktop/mobile props were previously swapped so the
          active module always received undefined data). */}
      <div className="px-3 py-4">
        <div className="relative">
          {MODULE_KEYS.map((key) => {
            if (!visited.has(key)) return null;
            const Comp = MODULE_COMPONENT_MAP[key] || MissionOverview;
            const isActive = key === activeModule;
            return (
              <div key={key} className={isActive ? '' : 'hidden'}>
                <Suspense fallback={<ModuleFallback />}>
                  <Comp
                    vehicle={vehicle || {}}
                    incident={incident || {}}
                    hospital={hospital || {}}
                    toIncident={toIncident || {}}
                    toHospital={toHospital || {}}
                    missionStart={missionStart}
                    patientStatus={incident?.severity || 'Active'}
                    goldenHour
                    onAction={handleAction}
                  />
                </Suspense>
              </div>
            );
          })}
        </div>
      </div>

      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="h-full flex flex-col">
          <div className="px-5 py-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2 rounded-lg shadow">
                <i className="fas fa-truck-medical text-lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 font-display">LifeLink</h1>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ambulance command</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {Object.entries(moduleLabels).map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setMenuOpen(false); navigate(`/dashboard/ambulance/${key}`); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeModule === key
                    ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-700 border border-sky-200'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeModule === key ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
                }`}>
                  <i className={`fas ${moduleIcons[key] || 'fa-cube'} text-xs`} />
                </div>
                {label}
              </button>
            ))}
          </div>
          <div className="px-4 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2 rounded-lg">
                  <i className="fas fa-user" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Profile</p>
                  <p className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setMenuOpen(false); setShowProfile(true); }} className="text-xs font-semibold text-sky-600">Open</button>
            </div>
            <button type="button" onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100">
              <i className="fas fa-sign-out-alt" /> Logout
            </button>
          </div>
        </div>
      </MobileDrawer>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        userName={user?.name || user?.fullName || 'User'}
        userRole={user?.subRole || user?.role || 'Ambulance Crew'}
      />
    </div>
  );
};

// ─── Root ────────────────────────────────────────────────────
const AmbulanceDashboard = () => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopAmbulanceDashboard /> : <MobileAmbulanceDashboard />;
};

export default AmbulanceDashboard;
