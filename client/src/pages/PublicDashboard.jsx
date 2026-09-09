import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsDesktop } from './public/helpers';
import { preloadAll } from '../services/preloadService';
import DesktopPublicDashboard from './public/DesktopPublicDashboard';
import MobilePublicDashboard from './public/MobilePublicDashboard';

const PublicDashboard = () => {
  const isDesktop = useIsDesktop();
  const { user } = useAuth();

  // Warm every feature (Home, SOS, AI Health, Find Donors, Requests,
  // AI Records, User Activity) as soon as the portal mounts — works for
  // both desktop tabs and the mobile module screens.
  useEffect(() => {
    if (!user?.id) return;
    preloadAll(user.id);
  }, [user?.id]);

  return isDesktop ? <DesktopPublicDashboard /> : <MobilePublicDashboard />;
};

export default PublicDashboard;
