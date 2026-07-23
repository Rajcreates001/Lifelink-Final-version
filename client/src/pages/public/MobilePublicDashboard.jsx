import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileModal from '../../components/ProfileModal';
import NotificationMenu from '../../components/NotificationMenu';
import MobileDrawer from '../../components/layout/MobileDrawer';
import PublicShell from './PublicShell';
import HomeScreen from './HomeScreen';
import SmartSosScreen from './SmartSosScreen';
import FindHospitalScreen from './FindHospitalScreen';
import QuickHealthCheckScreen from './QuickHealthCheckScreen';
import DonorMatchScreen from './DonorMatchScreen';
import FamilyMonitoringScreen, { MobileAiChatScreen } from './FamilyMonitoringScreen';
import { modules } from './helpers';

export const MobilePublicMenu = ({ open, onClose, onProfile, onNotifications, onFamily, onLogout }) => (
  <MobileDrawer open={open} onClose={onClose}>
    <div className="h-full flex flex-col">
      <div className="px-5 py-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2 rounded-lg shadow">
            <i className="fas fa-heartbeat text-lg"></i>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-display">LifeLink</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Public portal</p>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-2">
        <button onClick={onNotifications} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100">
          <i className="fas fa-bell"></i>
          Notifications
        </button>
        <button onClick={onFamily} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100">
          <i className="fas fa-users"></i>
          Family Monitoring
        </button>
      </div>
      <div className="px-4 py-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2 rounded-lg">
              <i className="fas fa-user"></i>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Profile</p>
              <p className="text-sm font-semibold text-slate-900">LifeLink</p>
            </div>
          </div>
          <button onClick={onProfile} className="text-xs font-semibold text-sky-600">Open</button>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100">
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  </MobileDrawer>
);

const MobilePublicDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { module } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const activeModule = useMemo(() => {
    const key = (module || 'home').toLowerCase();
    return modules.find((item) => item.key === key) ? key : 'home';
  }, [module]);

  useEffect(() => {
    if (!module) {
      navigate('/dashboard/public/home', { replace: true });
      return;
    }
    const key = module.toLowerCase();
    if (!modules.find((item) => item.key === key)) {
      navigate('/dashboard/public/home', { replace: true });
    }
  }, [module, navigate]);

  const goHome = () => navigate('/dashboard/public/home');
  const onSelect = (key) => navigate(`/dashboard/public/${key}`);

  const rightSlot = (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      className="h-9 w-9 rounded-full border border-slate-200 text-slate-600"
      aria-label="Open menu"
    >
      <i className="fas fa-bars"></i>
    </button>
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    setMenuOpen(false);
    setShowProfile(true);
  };

  const handleNotifications = () => {
    setMenuOpen(false);
    setShowNotifications(true);
  };

  const handleFamily = () => {
    setMenuOpen(false);
    navigate('/dashboard/public/family');
  };

  const renderScreenWithMenu = (screen) => (
    <>
      {screen}
      <MobilePublicMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onProfile={handleProfile}
        onNotifications={handleNotifications}
        onFamily={handleFamily}
        onLogout={handleLogout}
      />
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-4">
          <div className="relative max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="absolute -top-10 right-0 text-white text-xl"
              aria-label="Close notifications"
            >
              <i className="fas fa-times"></i>
            </button>
            <NotificationMenu variant="panel" onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      )}
    </>
  );

  if (activeModule === 'home') {
    return renderScreenWithMenu(
      <PublicShell title="LifeLink" onBack={null} rightSlot={rightSlot}>
        <HomeScreen onSelect={onSelect} />
      </PublicShell>
    );
  }

  if (activeModule === 'sos') {
    return renderScreenWithMenu(<SmartSosScreen user={user} onBack={goHome} rightSlot={rightSlot} />);
  }
  if (activeModule === 'hospital') {
    return renderScreenWithMenu(<FindHospitalScreen onBack={goHome} rightSlot={rightSlot} />);
  }
  if (activeModule === 'health') {
    return renderScreenWithMenu(<QuickHealthCheckScreen user={user} onBack={goHome} rightSlot={rightSlot} />);
  }
  if (activeModule === 'donor') {
    return renderScreenWithMenu(<DonorMatchScreen user={user} onBack={goHome} rightSlot={rightSlot} />);
  }
  if (activeModule === 'family') {
    return renderScreenWithMenu(<FamilyMonitoringScreen user={user} onBack={goHome} rightSlot={rightSlot} />);
  }
  if (activeModule === 'ai_chat') {
    return renderScreenWithMenu(<MobileAiChatScreen onBack={goHome} rightSlot={rightSlot} moduleKey="public_mobile" />);
  }

  return renderScreenWithMenu(
    <PublicShell title="LifeLink" onBack={goHome} rightSlot={rightSlot}>
      <p className="text-sm text-slate-500">Select a module from the menu.</p>
    </PublicShell>
  );
};

export default MobilePublicDashboard;
