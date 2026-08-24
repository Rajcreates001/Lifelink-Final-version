import React, { Suspense, useCallback, useMemo, useState, lazy, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import DashboardLayout from '../layout/DashboardLayout';
import MobileDrawer from '../components/layout/MobileDrawer';

import LogoutConfirmDialog from '../components/ui/LogoutConfirmDialog';
import NotificationHub from '../components/NotificationHub';
import GovernmentProfileModal from '../components/GovernmentProfileModal';
import { useWebSocket } from '../hooks/useWebSocket';

// ── Lazy-loaded module workspace components ────────────────
const DisasterDashboard = lazy(() => import('../components/government/modules/DisasterDashboard'));
const ResponseCenter = lazy(() => import('../components/government/modules/ResponseCenter'));
const LiveMonitoring = lazy(() => import('../components/government/modules/LiveMonitoring'));
const SimulationCenter = lazy(() => import('../components/government/modules/SimulationCenter'));
const AIMLLab = lazy(() => import('../components/government/modules/AIMLLab'));
const CommandMode = lazy(() => import('../components/government/modules/CommandMode'));
const Resources = lazy(() => import('../components/government/modules/Resources'));
const Intelligence = lazy(() => import('../components/government/modules/Intelligence'));
const Reports = lazy(() => import('../components/government/modules/Reports'));
const Settings = lazy(() => import('../components/government/modules/Settings'));

// ── Module registry — one component per workspace ──────────
const MODULE_COMPONENT_MAP = {
  'disaster-dashboard': DisasterDashboard,
  'response-center': ResponseCenter,
  'live-monitoring': LiveMonitoring,
  'simulation': SimulationCenter,
  'ai-lab': AIMLLab,
  'command-mode': CommandMode,
  'resources': Resources,
  'intelligence': Intelligence,
  'reports': Reports,
  'settings': Settings,
};

const MODULE_KEYS = [
  'disaster-dashboard', 'response-center', 'live-monitoring',
  'simulation', 'ai-lab', 'command-mode',
  'resources', 'intelligence', 'reports', 'settings',
];

const moduleLabels = {
  'disaster-dashboard': { label: 'Disaster Dashboard', icon: 'fa-triangle-exclamation' },
  'response-center': { label: 'Response Center', icon: 'fa-handshake' },
  'live-monitoring': { label: 'Live Monitoring', icon: 'fa-satellite-dish' },
  'simulation': { label: 'Simulation Center', icon: 'fa-atom' },
  'ai-lab': { label: 'AI/ML Lab', icon: 'fa-robot' },
  'command-mode': { label: 'Command Mode', icon: 'fa-tower-broadcast' },
  'resources': { label: 'Resource Management', icon: 'fa-boxes-stacked' },
  'intelligence': { label: 'Intelligence', icon: 'fa-user-secret' },
  'reports': { label: 'Reports', icon: 'fa-file-lines' },
  'settings': { label: 'Settings', icon: 'fa-gear' },
};

// ── Fallback shown during module Suspense loading ──────────
const ModuleFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
      <p className="text-xs text-slate-500 font-medium">Loading workspace...</p>
    </div>
  </div>
);

// ── GovernmentDashboard — modular dispatcher ────────────────
const GovernmentDashboard = () => {
  const navigate = useNavigate();
  const { module: activeModule } = useParams();
  const { user, loading, performLogout } = useAuth();

  const [showLogout, setShowLogout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMobileModules, setShowMobileModules] = useState(false);

  // Real-time WebSocket for government dashboard updates
  const { isConnected: wsConnected, lastMessage: wsMessage } = useWebSocket('government', {
    onMessage: (data) => {
      if (data?.type === 'disaster' || data?.type === 'alert') {
        // Trigger module refresh on real-time events
        console.log('[Gov WS] Real-time update:', data.type);
      }
    },
  });

  // Resolve default module
  const resolvedModule = activeModule && MODULE_COMPONENT_MAP[activeModule] ? activeModule : 'disaster-dashboard';
  const ModuleComponent = MODULE_COMPONENT_MAP[resolvedModule] || DisasterDashboard;

  // Track which modules have been visited — for first visit Suspense
  const visitedModules = useRef(new Set());
  useEffect(() => {
    visitedModules.current.add(resolvedModule);
  }, [resolvedModule]);

  // Build sidebar items from module registry
  const sidebarItems = useMemo(() =>
    MODULE_KEYS.map((key) => ({
      key,
      label: moduleLabels[key].label,
      icon: moduleLabels[key].icon,
      isActive: key === resolvedModule,
      onClick: () => navigate(`/dashboard/government/${key}`),
    })),
    [resolvedModule, navigate]
  );

  // Logout handler — uses performLogout (context-aware for portal roles)
  const handleLogout = useCallback(() => {
    setShowLogout(false);
    const route = performLogout();
    navigate(route, { replace: true });
  }, [performLogout, navigate]);

  // Exit workspace — back to role selection (preserves portal auth)
  const handleExitWorkspace = useCallback(() => {
    navigate('/dashboard/government/roles', { replace: true });
  }, [navigate]);

  // ── Shared DashboardLayout wrapper ────────────────
  const dashboardContent = (
    <DashboardLayout
      sidebarTitle="Government Command"
      sidebarItems={sidebarItems}
      activeItem={resolvedModule}
      onSelect={(key) => navigate(`/dashboard/government/${key}`)}
      user={user}
      loading={loading}
      onLogout={() => setShowLogout(true)}
      onProfile={() => setShowProfile(true)}
      onNotifications={() => setShowNotifications(true)}

      onExitWorkspace={handleExitWorkspace}
      onToggleMobile={() => {
        setMobileOpen(!mobileOpen);
        if (!mobileOpen) setShowMobileModules(true);
      }}
      mobileOpen={mobileOpen}
      headerExtra={
        <div className="flex items-center gap-2">
          <NotificationHub
            show={showNotifications}
            onClose={() => setShowNotifications(false)}
            onToggle={() => setShowNotifications(!showNotifications)}
          />
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-5">
        {/* State preservation: render all visited modules, only show active */}
        {MODULE_KEYS.map((key) => {
          const Comp = MODULE_COMPONENT_MAP[key];
          const isVisited = visitedModules.current.has(key);
          const isActive = key === resolvedModule;
          // First visit: lazy-load via Suspense; subsequent: direct render
          if (!isVisited && !isActive) return null;
          const wrapped = isActive && !isVisited ? (
            <Suspense fallback={<ModuleFallback />}>
              <Comp />
            </Suspense>
          ) : (
            <Comp />
          );
          return (
            <div key={key} style={{ display: isActive ? 'block' : 'none' }}>
              {wrapped}
            </div>
          );
        })}

      </div>
    </DashboardLayout>
  );

  // ── Mobile drawer for module navigation ──────────────
  const mobileModules = (
    <MobileDrawer open={showMobileModules} onClose={() => setShowMobileModules(false)} title="Modules">
      <div className="space-y-1 p-3">
        {sidebarItems.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setShowMobileModules(false);
              item.onClick();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              item.isActive
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <i className={`fas ${item.icon} w-4 text-center text-sm ${item.isActive ? 'text-indigo-500' : ''}`} />
            {item.label}
          </button>
        ))}
      </div>
    </MobileDrawer>
  );

  return (
    <>
      {dashboardContent}
      {mobileModules}
      <GovernmentProfileModal open={showProfile} onClose={() => setShowProfile(false)} user={user} />
      <LogoutConfirmDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        userName={user?.name}
        userRole={user?.subRole || user?.role}
      />
    </>
  );
};

export default GovernmentDashboard;
