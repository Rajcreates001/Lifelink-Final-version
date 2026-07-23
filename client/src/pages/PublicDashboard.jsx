import React from 'react';
import { useIsDesktop } from './public/helpers';
import DesktopPublicDashboard from './public/DesktopPublicDashboard';
import MobilePublicDashboard from './public/MobilePublicDashboard';

const PublicDashboard = () => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopPublicDashboard /> : <MobilePublicDashboard />;
};

export default PublicDashboard;
