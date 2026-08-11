import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
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

// ─── Shared Demo Mission Data ────────────────────────────────
const DEMO_VEHICLE = { label: 'Ambulance A1', lat: 12.9766, lng: 77.5713, address: 'Majestic Bus Station', speedKph: 44, fuelLevel: 78, equipment: ['Defibrillator', 'Ventilator', 'O₂ 90%', 'Trauma Kit'] };
const DEMO_INCIDENT = { label: 'Multi-vehicle collision', lat: 12.9763, lng: 77.5929, address: 'Cubbon Park Road', severity: 'Critical', patientName: 'Riya S.', age: 34, gcs: 10, mechanism: 'Road traffic accident' };
const DEMO_HOSPITAL = { label: "St. Martha's Hospital", lat: 12.9686, lng: 77.5995, address: 'Nrupathunga Road', icuBeds: 3, traumaReady: true, distance: 3.5, eta: 11 };
const DEMO_TO_INCIDENT = { etaMinutes: 7, distanceKm: 4.1, traffic: { level: 'Light', adjustedMinutes: 7, baseMinutes: 6 } };
const DEMO_TO_HOSPITAL = { etaMinutes: 11, distanceKm: 3.5, traffic: { level: 'Moderate', adjustedMinutes: 11, baseMinutes: 9 } };

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
    setIsDesktop(media.matches);
    return () => media.removeEventListener?.('change', handler);
  }, []);
  return isDesktop;
};

// ─── Desktop ─────────────────────────────────────────────────
const DesktopAmbulanceDashboard = () => {
  const navigate = useNavigate();
  const { module: urlModule } = useParams();
  // Read active module from URL — supports direct linking, bookmarks, browser back/forward
  const activeModule = urlModule && moduleLabels[urlModule] ? urlModule : 'mission-overview';
  const [triageOpen, setTriageOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [missionStart] = useState(() => new Date().toISOString());

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
          patientName={DEMO_INCIDENT.patientName}
          severity={DEMO_INCIDENT.severity}
          eta={String(DEMO_TO_HOSPITAL.etaMinutes)}
          incidentLabel={DEMO_INCIDENT.label}
          vehicleLabel={DEMO_VEHICLE.label}
          speedKph={DEMO_VEHICLE.speedKph}
          missionStart={missionStart}
        />
      </div>

      {/* Module Label */}
      <div className="mb-4 mt-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspace</p>
        <h2 className="text-lg font-bold text-slate-900 font-display">{moduleLabels[activeModule] || 'Mission Overview'}</h2>
      </div>

      {/* ✨ Dedicated Module Workspaces — all rendered but only active is visible.
          This preserves component state across module switches (e.g. search query,
          accepted/rejected recommendations, form inputs). */}
      <div className="relative">
        {MODULE_KEYS.map((key) => {
          const Comp = MODULE_COMPONENT_MAP[key] || MissionOverview;
          const isActive = key === activeModule;
          return (
            <div key={key} className={isActive ? '' : 'hidden'}>
              {isActive ? (
                <Suspense fallback={<ModuleFallback />}>
                  <Comp
                    vehicle={DEMO_VEHICLE}
                    incident={DEMO_INCIDENT}
                    hospital={DEMO_HOSPITAL}
                    toIncident={DEMO_TO_INCIDENT}
                    toHospital={DEMO_TO_HOSPITAL}
                    missionStart={missionStart}
                    patientStatus="Critical"
                    goldenHour
                    onAction={handleAction}
                    onOpenTriage={() => { setTriageOpen(true); }}
                  />
                </Suspense>
              ) : (
                <Comp
                  vehicle={DEMO_VEHICLE}
                  incident={DEMO_INCIDENT}
                  hospital={DEMO_HOSPITAL}
                  toIncident={DEMO_TO_INCIDENT}
                  toHospital={DEMO_TO_HOSPITAL}
                  missionStart={missionStart}
                  patientStatus="Critical"
                  goldenHour
                  onAction={handleAction}
                  onOpenTriage={() => { setTriageOpen(true); }}
                />
              )}
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
            <textarea className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={3} placeholder="e.g. GCS 10, HR 122, BP 92/58, suspected internal hemorrhage..." />
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Read active module from URL — supports direct linking, bookmarks, browser back/forward
  const activeModule = urlModule && moduleLabels[urlModule] ? urlModule : 'mission-overview';
  const [missionStart] = useState(() => new Date().toISOString());
  const [toast, setToast] = useState(null);

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
          patientName={DEMO_INCIDENT.patientName}
          severity={DEMO_INCIDENT.severity}
          eta={String(DEMO_TO_HOSPITAL.etaMinutes)}
          incidentLabel={DEMO_INCIDENT.label}
          vehicleLabel={DEMO_VEHICLE.label}
          speedKph={DEMO_VEHICLE.speedKph}
          missionStart={missionStart}
        />
      </div>

      {/* ✨ Module Content — all rendered for state preservation */}
      <div className="px-3 py-4">
        <div className="relative">
          {MODULE_KEYS.map((key) => {
            const Comp = MODULE_COMPONENT_MAP[key] || MissionOverview;
            const isActive = key === activeModule;
            return (
              <div key={key} className={isActive ? '' : 'hidden'}>
                {isActive ? (
                  <Suspense fallback={<ModuleFallback />}>
                    <Comp
                      vehicle={DEMO_VEHICLE}
                      incident={DEMO_INCIDENT}
                      hospital={DEMO_HOSPITAL}
                      toIncident={DEMO_TO_INCIDENT}
                      toHospital={DEMO_TO_HOSPITAL}
                      missionStart={missionStart}
                      patientStatus="Critical"
                      goldenHour
                      onAction={handleAction}
                    />
                  </Suspense>
                ) : (
                  <Comp
                    vehicle={DEMO_VEHICLE}
                    incident={DEMO_INCIDENT}
                    hospital={DEMO_HOSPITAL}
                    toIncident={DEMO_TO_INCIDENT}
                    toHospital={DEMO_TO_HOSPITAL}
                    missionStart={missionStart}
                    patientStatus="Critical"
                    goldenHour
                    onAction={handleAction}
                  />
                )}
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
