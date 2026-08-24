import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import DashboardLayout from '../layout/DashboardLayout';
import LogoutConfirmDialog from '../components/ui/LogoutConfirmDialog';
import { apiFetch } from '../config/api';
import MobileDrawer from '../components/layout/MobileDrawer';
import LifelinkAiChat from '../components/LifelinkAiChat';
import NotificationHub from '../components/NotificationHub';
import HospitalProfileModal from '../components/HospitalProfileModal';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslation } from 'react-i18next';

// ─── Lazy-loaded module components (code-split per module) ───
const HospitalOverview = React.lazy(() => import('../components/HospitalOverview'));
const HospitalAnalytics = React.lazy(() => import('../components/HospitalAnalytics'));
const HospitalPatients = React.lazy(() => import('../components/HospitalPatients'));
const HospitalResources = React.lazy(() => import('../components/HospitalResources'));
const HospitalCommunications = React.lazy(() => import('../components/HospitalCommunications'));
const AmbulanceETARoute = React.lazy(() => import('../components/AmbulanceETARoute'));
const HospitalBedManagement = React.lazy(() => import('../components/HospitalBedManagement'));
const RevenueIntelligence = React.lazy(() => import('../components/ui/RevenueIntelligence'));
const EmergencyCommandCenter = React.lazy(() => import('../components/ui/EmergencyCommandCenter'));
const PatientDischargeWorkflow = React.lazy(() => import('../components/PatientDischargeWorkflow'));
const StaffSchedulingModule = React.lazy(() => import('../components/StaffSchedulingModule'));

// Hospital ops barrel — lazy-load individual modules
const HospitalDepartmentAnalytics = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalDepartmentAnalytics })));
const HospitalFinanceOverview = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalFinanceOverview })));
const HospitalStaffManagement = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalStaffManagement })));
const HospitalReports = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalReports })));
const HospitalBillingSystem = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalBillingSystem })));
const HospitalRevenueAnalytics = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalRevenueAnalytics })));
const HospitalInsuranceClaims = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalInsuranceClaims })));
const HospitalLiveEmergencyFeed = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalLiveEmergencyFeed })));
const HospitalOPDScheduling = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalOPDScheduling })));
const HospitalDoctorManagement = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalDoctorManagement })));
const HospitalOPDQueue = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalOPDQueue })));
const HospitalConsultationRecords = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalConsultationRecords })));
const HospitalICULiveMonitoring = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalICULiveMonitoring })));
const HospitalICUAlerts = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalICUAlerts })));
const HospitalICUVitals = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalICUVitals })));
const HospitalICURiskPanel = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalICURiskPanel })));
const HospitalRadiologyRequests = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalRadiologyRequests })));
const HospitalRadiologyReportUpload = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalRadiologyReportUpload })));
const HospitalRadiologyAIInsights = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalRadiologyAIInsights })));
const HospitalOTSurgeryScheduling = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalOTSurgeryScheduling })));
const HospitalOTStaffAllocation = React.lazy(() => import('../components/hospitalOps').then(m => ({ default: m.HospitalOTStaffAllocation })));

// ─── Module loading skeleton ─────────────────────────────────
const ModuleSkeleton = () => (
    <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
            <p className="text-xs text-slate-500 font-medium">Loading module...</p>
        </div>
    </div>
);

const LazyModule = ({ children }) => (
    <Suspense fallback={<ModuleSkeleton />}>{children}</Suspense>
);

const hospitalModuleSets = {
    ceo: [
        { key: 'global-overview', label: 'Global Overview', icon: 'fa-chart-pie', render: () => <LazyModule><HospitalOverview /></LazyModule> },
        { key: 'ai-insights', label: 'AI Insights', icon: 'fa-brain', render: () => <LazyModule><HospitalAnalytics /></LazyModule> },
        { key: 'department-analytics', label: 'Department Analytics', icon: 'fa-chart-line', render: () => <LazyModule><HospitalDepartmentAnalytics /></LazyModule> },
        { key: 'bed-management', label: 'Bed Management', icon: 'fa-bed', render: () => <LazyModule><HospitalBedManagement /></LazyModule> },
        { key: 'resource-management', label: 'Resource Management', icon: 'fa-warehouse', render: () => <LazyModule><HospitalResources /></LazyModule> },
        { key: 'ambulance-coordination', label: 'Ambulance Coordination', icon: 'fa-ambulance', render: ({ user }) => (
            <LazyModule><AmbulanceETARoute
                currentHospitalId={user?._id || user?.id}
                currentHospitalName={user?.name}
                hospitalLocation={{ lat: 12.9716, lng: 77.5946 }}
            /></LazyModule>
        ) },
        { key: 'finance-overview', label: 'Finance Overview', icon: 'fa-coins', render: () => <LazyModule><HospitalFinanceOverview /></LazyModule> },
        { key: 'staff-management', label: 'Staff Management', icon: 'fa-user-nurse', render: () => <LazyModule><HospitalStaffManagement /></LazyModule> },
        { key: 'reports', label: 'Reports', icon: 'fa-file-alt', render: () => <LazyModule><HospitalReports /></LazyModule> },
        { key: 'multi-hospital-network', label: 'Multi-Hospital Network', icon: 'fa-network-wired', render: ({ user }) => (
            <LazyModule><HospitalCommunications
                currentHospitalId={user?._id || user?.id}
                currentHospitalName={user?.name}
            /></LazyModule>
        ) },
        { key: 'patient-discharge', label: 'Patient Discharge', icon: 'fa-right-from-bracket', render: () => <LazyModule><PatientDischargeWorkflow /></LazyModule> },
        { key: 'staff-scheduling', label: 'Staff Scheduling', icon: 'fa-calendar-days', render: () => <LazyModule><StaffSchedulingModule /></LazyModule> },
    ],
    emergency: [
        { key: 'emergency-command-center', label: 'Emergency Command Center', icon: 'fa-tower-broadcast', render: () => <LazyModule><EmergencyCommandCenter /></LazyModule> },
    ],
    finance: [
        { key: 'revenue-intelligence', label: 'Revenue Intelligence', icon: 'fa-coins', render: () => <LazyModule><RevenueIntelligence /></LazyModule> },
    ],
    opd: [
        { key: 'appointment-scheduling', label: 'Appointment Scheduling', icon: 'fa-calendar-check', render: () => <LazyModule><HospitalOPDScheduling /></LazyModule> },
        { key: 'doctor-management', label: 'Doctor Management', icon: 'fa-user-doctor', render: () => <LazyModule><HospitalDoctorManagement /></LazyModule> },
        { key: 'patient-queue', label: 'Patient Queue', icon: 'fa-list-check', render: () => <LazyModule><HospitalOPDQueue /></LazyModule> },
        { key: 'consultation-records', label: 'Consultation Records', icon: 'fa-notes-medical', render: () => <LazyModule><HospitalConsultationRecords /></LazyModule> },
    ],
    icu: [
        { key: 'live-patient-monitoring', label: 'Live Patient Monitoring', icon: 'fa-heart-pulse', render: () => <LazyModule><HospitalICULiveMonitoring /></LazyModule> },
        { key: 'critical-alerts', label: 'Critical Alerts', icon: 'fa-bell', render: () => <LazyModule><HospitalICUAlerts /></LazyModule> },
        { key: 'ai-risk-prediction', label: 'AI Risk Prediction', icon: 'fa-brain', render: () => <LazyModule><HospitalICURiskPanel /></LazyModule> },
        { key: 'vitals-dashboard', label: 'Vitals Dashboard', icon: 'fa-wave-square', render: () => <LazyModule><HospitalICUVitals /></LazyModule> },
    ],
    radiology: [
        { key: 'scan-requests', label: 'Scan Requests', icon: 'fa-x-ray', render: () => <LazyModule><HospitalRadiologyRequests /></LazyModule> },
        { key: 'report-upload', label: 'Report Upload', icon: 'fa-file-upload', render: () => <LazyModule><HospitalRadiologyReportUpload /></LazyModule> },
        { key: 'ai-scan-insights', label: 'AI Scan Insights', icon: 'fa-robot', render: () => <LazyModule><HospitalRadiologyAIInsights /></LazyModule> },
    ],
    ot: [
        { key: 'surgery-scheduling', label: 'Surgery Scheduling', icon: 'fa-user-nurse', render: () => <LazyModule><HospitalOTSurgeryScheduling /></LazyModule> },
        { key: 'staff-allocation', label: 'Staff Allocation', icon: 'fa-users', render: () => <LazyModule><HospitalOTStaffAllocation /></LazyModule> },
        { key: 'equipment-tracking', label: 'Equipment Tracking', icon: 'fa-briefcase-medical', render: () => <LazyModule><HospitalResources /></LazyModule> },
    ],
    default: [
        { key: 'global-overview', label: 'Global Overview', icon: 'fa-chart-pie', render: () => <LazyModule><HospitalOverview /></LazyModule> },
    ],
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
        setIsDesktop(media.matches);
        return () => media.removeEventListener?.('change', handler);
    }, []);

    return isDesktop;
};

const DesktopHospitalDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    const navigate = useNavigate();
    const { module } = useParams();
    const [activeTab, setActiveTab] = useState('');
    const [refreshKeys, setRefreshKeys] = useState({});

    const subRole = user?.subRole?.toLowerCase();
    const moduleSet = useMemo(() => {
        const sets = hospitalModuleSets[t] || hospitalModuleSets;
        return sets[subRole] || sets.default;
    }, [subRole, t]);
    const allowedTabs = useMemo(() => moduleSet.map((item) => item.key), [moduleSet]);
    const defaultTab = allowedTabs[0] || 'overview';
    const moduleKey = (module || defaultTab).toLowerCase();

    useEffect(() => {
        if (user?.role === 'hospital' && !user?.subRole) {
            navigate('/dashboard/hospital/roles');
        }
    }, [user?.role, user?.subRole, navigate]);

    useEffect(() => {
        if (!module) {
            navigate(`/dashboard/hospital/${defaultTab}`, { replace: true });
            setActiveTab(defaultTab);
            return;
        }

        if (!allowedTabs.includes(moduleKey)) {
            navigate(`/dashboard/hospital/${defaultTab}`, { replace: true });
            setActiveTab(defaultTab);
            return;
        }

        setActiveTab(moduleKey);
    }, [module, moduleKey, allowedTabs, defaultTab, navigate]);

    useEffect(() => {
        if (!user?._id && !user?.id) return;
        const preloadKey = `hospital_preload_${subRole || 'default'}`;
        if (sessionStorage.getItem(preloadKey)) return;
        sessionStorage.setItem(preloadKey, '1');

        const paramsFor = (moduleKey) => {
            const params = new URLSearchParams({ role: 'hospital', module_key: moduleKey });
            if (subRole) params.set('sub_role', subRole);
            return params.toString();
        };

        const moduleKeys = moduleSet.map((item) => item.key);
        const insightCalls = moduleKeys.map((key) =>
            apiFetch(`/v2/ai/insights?${paramsFor(key)}`, {
                method: 'GET',
                ttlMs: 60000,
                staleWhileRevalidate: true,
            })
        );

        const hospitalId = user?._id || user?.id;
        const coreCalls = [
            apiFetch('/api/hospital-ops/preload', {
                method: 'POST',
                body: JSON.stringify({ hospitalId, scale: 320 })
            }),
            apiFetch(`/api/hospital-ops/ceo/global-metrics?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            apiFetch(`/api/hospital-ops/emergency/feed?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            apiFetch(`/api/hospital-ops/ceo/ai-insights?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
        ];

        Promise.allSettled(insightCalls.concat(coreCalls));
    }, [subRole, moduleSet, user?._id, user?.id]);

    const handleSelect = (key) => {
        if (key === 'profile' || key === 'notifications') {
            setActiveTab(key);
            return;
        }
        navigate(`/dashboard/hospital/${key}`);
    };

    const handleRefresh = () => {
        setRefreshKeys((prev) => ({
            ...prev,
            [activeTab]: (prev[activeTab] || 0) + 1,
        }));
    };

    const renderContent = () => {
        const activeModule = moduleSet.find((item) => item.key === activeTab) || moduleSet[0];
        if (!activeModule) return null;
        const refreshKey = refreshKeys[activeModule.key] || 0;
        return (
            <div className="space-y-6" key={`${activeModule.key}-${refreshKey}`}>
                {activeModule.render({ user })}
            </div>
        );
    };

    const sidebarItems = moduleSet.map(({ key, label, icon }) => ({ key, label, icon }));

    return (
        <DashboardLayout
            sidebarItems={sidebarItems}
            activeItem={activeTab}
            onSelect={handleSelect}
            onRefresh={handleRefresh}
            refreshLabel="Refresh module"
        >
            <div className="min-h-[60vh] animate-fade-in">
                {renderContent()}
            </div>
        </DashboardLayout>
    );
};

const MobileHospitalDashboard = () => {
    const { user, logout } = useAuth();

    const navigate = useNavigate();
    const { module } = useParams();
    const [activeTab, setActiveTab] = useState('');
    const [refreshKeys, setRefreshKeys] = useState({});
    const [menuOpen, setMenuOpen] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Real-time WebSocket for hospital updates
    const { isConnected: wsConnected, lastMessage: wsMessage } = useWebSocket('hospital', {
        onMessage: (data) => {
            if (data?.type === 'alert' || data?.type === 'update') {
                setRefreshKeys((prev) => ({ ...prev, [data.module || 'overview']: Date.now() }));
            }
        },
    });
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const subRole = user?.subRole?.toLowerCase();
    const moduleSet = useMemo(() => hospitalModuleSets[subRole] || hospitalModuleSets.default, [subRole]);
    const allowedTabs = useMemo(() => moduleSet.map((item) => item.key), [moduleSet]);
    const defaultTab = allowedTabs[0] || 'overview';
    const moduleKey = (module || defaultTab).toLowerCase();

    useEffect(() => {
        if (user?.role === 'hospital' && !user?.subRole) {
            navigate('/dashboard/hospital/roles');
        }
    }, [user?.role, user?.subRole, navigate]);

    useEffect(() => {
        if (!module) {
            navigate(`/dashboard/hospital/${defaultTab}`, { replace: true });
            setActiveTab(defaultTab);
            return;
        }

        if (!allowedTabs.includes(moduleKey)) {
            navigate(`/dashboard/hospital/${defaultTab}`, { replace: true });
            setActiveTab(defaultTab);
            return;
        }

        setActiveTab(moduleKey);
    }, [module, moduleKey, allowedTabs, defaultTab, navigate]);

    useEffect(() => {
        if (!user?._id && !user?.id) return;
        const preloadKey = `hospital_preload_${subRole || 'default'}`;
        if (sessionStorage.getItem(preloadKey)) return;
        sessionStorage.setItem(preloadKey, '1');

        const paramsFor = (moduleKey) => {
            const params = new URLSearchParams({ role: 'hospital', module_key: moduleKey });
            if (subRole) params.set('sub_role', subRole);
            return params.toString();
        };

        const moduleKeys = moduleSet.map((item) => item.key);
        const insightCalls = moduleKeys.map((key) =>
            apiFetch(`/v2/ai/insights?${paramsFor(key)}`, {
                method: 'GET',
                ttlMs: 60000,
                staleWhileRevalidate: true,
            })
        );

        const hospitalId = user?._id || user?.id;
        const coreCalls = [
            apiFetch('/api/hospital-ops/preload', {
                method: 'POST',
                body: JSON.stringify({ hospitalId, scale: 320 })
            }),
            apiFetch(`/api/hospital-ops/ceo/global-metrics?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            apiFetch(`/api/hospital-ops/emergency/feed?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            apiFetch(`/api/hospital-ops/ceo/ai-insights?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
        ];

        Promise.allSettled(insightCalls.concat(coreCalls));
    }, [subRole, moduleSet, user?._id, user?.id]);

    const handleRefresh = () => {
        setRefreshKeys((prev) => ({
            ...prev,
            [activeTab]: (prev[activeTab] || 0) + 1,
        }));
    };

    const renderContent = () => {
        const activeModule = moduleSet.find((item) => item.key === activeTab) || moduleSet[0];
        if (!activeModule) return null;
        const refreshKey = refreshKeys[activeModule.key] || 0;
        return (
            <div className="space-y-4" key={`${activeModule.key}-${refreshKey}`}>
                {activeModule.render({ user })}
            </div>
        );
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        logout();
        const orgKey = user?.department_key || user?.subRole;
        if (orgKey) {
            navigate(`/hospital/${orgKey}`, { replace: true });
        } else {
            navigate('/hospital', { replace: true });
        }
    };

    const activeLabel = moduleSet.find((item) => item.key === activeTab)?.label || 'Hospital';

    if (showChat) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
                    <button type="button" onClick={() => setShowChat(false)} className="text-slate-500">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white">
                            <i className="fas fa-heartbeat"></i>
                        </span>
                        <span className="text-sm font-semibold text-slate-900">LifeLink AI</span>
                    </div>
                    <button type="button" onClick={() => setMenuOpen(true)} className="text-slate-500">
                        <i className="fas fa-bars"></i>
                    </button>
                </div>
                <div className="px-4 py-4">
                    <LifelinkAiChat variant="page" moduleKey={`hospital_${activeTab || 'dashboard'}_mobile`} />
                </div>
                <MobileHospitalMenu
                    open={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    onSelect={(key) => {
                        setMenuOpen(false);
                        if (key === 'chat') return;
                        if (key === 'profile') {
                            setShowProfile(true);
                            return;
                        }
                        if (key === 'notifications') {
                            setShowNotifications(true);
                            return;
                        }
                        navigate(`/dashboard/hospital/${key}`);
                    }}
                    onLogout={handleLogout}
                />
                {showProfile && <HospitalProfileModal onClose={() => setShowProfile(false)} />}
                <LogoutConfirmDialog
                    open={showLogoutConfirm}
                    onClose={() => setShowLogoutConfirm(false)}
                    onConfirm={handleLogoutConfirm}
                    userName={user?.name || user?.fullName || 'User'}
                    userRole={user?.subRole || user?.role || 'Hospital Staff'}
                />
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
                            <NotificationHub variant="panel" onClose={() => setShowNotifications(false)} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 animate-fade-in">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
                <div className="flex items-center justify-between px-4 py-3">
                    <button type="button" onClick={() => setMenuOpen(true)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg p-2 transition-all duration-200">
                        <i className="fas fa-bars"></i>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white">
                            <i className="fas fa-heartbeat"></i>
                        </span>
                        <div className="text-left">
                            <p className="text-[10px] text-slate-400 uppercase">LifeLink</p>
                            <p className="text-sm font-semibold text-slate-900">Hospital</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setShowChat(true)} className="text-slate-600">
                        <i className="fas fa-robot"></i>
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto px-4 pb-3">
                    {moduleSet.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => navigate(`/dashboard/hospital/${tab.key}`)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ${
                                activeTab === tab.key
                                    ? 'bg-sky-600 text-white border-sky-600'
                                    : 'bg-white text-slate-600 border-slate-200'
                            }`}
                        >
                            <i className={`fas ${tab.icon}`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                        <p className="text-[10px] uppercase text-slate-400">Current module</p>
                        <p className="text-sm font-semibold text-slate-900">{activeLabel}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg"
                    >
                        Refresh
                    </button>
                </div>
                {renderContent()}
            </div>

            <MobileHospitalMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onSelect={(key) => {
                    setMenuOpen(false);
                    if (key === 'chat') {
                        setShowChat(true);
                        return;
                    }
                    if (key === 'profile') {
                        setShowProfile(true);
                        return;
                    }
                    if (key === 'notifications') {
                        setShowNotifications(true);
                        return;
                    }
                    navigate(`/dashboard/hospital/${key}`);
                }}
                onLogout={handleLogout}
            />
            {showProfile && <HospitalProfileModal onClose={() => setShowProfile(false)} />}
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
                        <NotificationHub variant="panel" onClose={() => setShowNotifications(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

const MobileHospitalMenu = ({ open, onClose, onSelect, onLogout }) => (
    <MobileDrawer open={open} onClose={onClose}>
        <div className="h-full flex flex-col">
            <div className="px-5 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2 rounded-lg shadow">
                        <i className="fas fa-heartbeat text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 font-display">LifeLink</h1>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Hospital portal</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                <button onClick={() => onSelect?.('chat')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100">
                    <i className="fas fa-robot"></i>
                    LifeLink AI
                </button>
            </div>
            <div className="px-4 py-4 border-t border-slate-200 space-y-2">
                <button onClick={() => onSelect?.('notifications')} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100">
                    <i className="fas fa-bell"></i>
                    Notifications
                </button>
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
                    <button onClick={() => onSelect?.('profile')} className="text-xs font-semibold text-sky-600">Open</button>
                </div>
                <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100">
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            </div>
        </div>
    </MobileDrawer>
);

const HospitalDashboard = () => {
    const isDesktop = useIsDesktop();
    return isDesktop ? <DesktopHospitalDashboard /> : <MobileHospitalDashboard />;
};

export default HospitalDashboard;