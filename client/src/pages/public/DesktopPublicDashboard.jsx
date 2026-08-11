import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import DashboardLayout from '../../layout/DashboardLayout';
import { LoadingSpinner } from '../../components/Common';

// ─── SessionStorage Cache Helpers ──────────────────────────
const CACHE_KEY = 'lifelink:public:dashboard';
const CACHE_TTL_MS = 120_000; // 2 minutes

function getCachedData() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function setCachedData(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore quota errors */ }
}

import HomeTab from './tabs/HomeTab';
import AiHealthTab from './tabs/AiHealthTab';
import AiRecordsTab from './tabs/AiRecordsTab';
import FindDonorsTab from './tabs/FindDonorsTab';
import RequestsTab from './tabs/RequestsTab';
import DonationsTab from './tabs/DonationsTab';
import LifeTimeline from '../../components/LifeTimeline';

const DesktopPublicDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sosStats, setSosStats] = useState({ recent_critical_alerts: 0, total_sos_calls: 0 });

  const publicSidebarItems = useMemo(() => ([
    { key: 'home', label: 'Home', icon: 'fa-home' },
    { key: 'ai_health', label: 'AI Health', icon: 'fa-heartbeat' },
    { key: 'find_donors', label: 'Find Donors', icon: 'fa-search' },
    { key: 'requests', label: 'Requests', icon: 'fa-hand-holding-medical' },
    { key: 'ai_records', label: 'AI Records', icon: 'fa-file-medical-alt' },
    { key: 'donations', label: 'User Activity', icon: 'fa-gift' },
  ]), []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiFetch(`/api/notifications/${user.id}`, { method: 'GET', ttlMs: 30000 });
      if (res.ok) setSosStats(res.data?.stats || {});
    } catch (err) {
      console.error('Notifications fetch error:', err);
    }
  }, [user?.id]);

  // Guard against setState on unmounted component
  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!user?.id) return;

    // Try cache first
    if (!skipCache) {
      const cached = getCachedData();
      if (cached) {
        if (isMountedRef.current) { setData(cached); setLoading(false); }
        // Still refresh in background
        fetchData(true);
        return;
      }
    }

    if (isMountedRef.current) setLoading(true);
    try {
      // Parallelize API calls
      const [dashboardRes, donorsRes] = await Promise.all([
        apiFetch(`/api/dashboard/public/${user.id}/full`, { method: 'GET', timeoutMs: 8000 }),
        apiFetch('/api/donors', { method: 'GET', timeoutMs: 8000 }),
      ]);

      if (!dashboardRes.ok) throw new Error(dashboardRes.data?.detail || dashboardRes.data?.error || 'Dashboard fetch failed');

      const dashboardData = dashboardRes.data || {};
      const donorsData = Array.isArray(donorsRes.data) ? donorsRes.data : [];

      const mergedHistory = [
        ...(dashboardData.resourceRequests || []).map((item) => ({ ...item, category: 'Request', date: item.createdAt })),
        ...(dashboardData.alerts || []).map((item) => ({ ...item, category: 'SOS Alert', date: item.createdAt, status: item.status })),
        ...(dashboardData.donationHistory || []).map((item) => ({ ...item, category: 'Donation', date: item.donationDate, status: 'Completed' })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      const enriched = {
        ...dashboardData,
        fullHistory: mergedHistory,
        allDonors: donorsData.filter((donor) => String(donor.user_id || donor._id || donor.id) !== String(user.id)).slice(0, 200),
      };

      if (isMountedRef.current) {
        setData(enriched);
        setCachedData(enriched);
      }
      fetchNotifications(); // Fire and forget — don't await
    } catch (err) {
      console.error(err);
      // Fallback to cache on network error
      const cached = getCachedData();
      if (cached && isMountedRef.current) setData(cached);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    // Only preload endpoints NOT already fetched by fetchData (avoid duplication)
    Promise.allSettled([
      apiFetch('/api/health/records/' + user.id, { method: 'GET', timeoutMs: 8000 }),
      apiFetch(`/api/notifications/${user.id}`, { method: 'GET', timeoutMs: 8000 }),
    ]);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelect = (key) => {
    setActiveTab(key);
  };

  const renderContent = () => {
    if (loading && !data) return <LoadingSpinner />;
    if (!data) return <p className="text-center p-4">No Data Available</p>;

    switch (activeTab) {
      case 'home':
        return <HomeTab user={user} data={data} sosStats={sosStats} fetchData={fetchData} fetchNotifications={fetchNotifications} />;
      case 'ai_health':
        return <AiHealthTab />;
      case 'find_donors':
        return <FindDonorsTab user={user} data={data} />;
      case 'requests':
        return <RequestsTab user={user} onRequestSuccess={fetchData} />;
      case 'ai_records':
        return <AiRecordsTab user={user} />;
      case 'donations':
        return <DonationsTab user={user} data={data} />;
      case 'history':
        return <LifeTimeline user={user} />;
      default:
        return <p className="text-center p-4">Select a module from the sidebar.</p>;
    }
  };

  return (
    <DashboardLayout
      sidebarItems={publicSidebarItems}
      activeItem={activeTab}
      onSelect={handleSelect}
      user={user}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default DesktopPublicDashboard;
