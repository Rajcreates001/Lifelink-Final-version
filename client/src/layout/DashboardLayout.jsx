import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationHub from '../components/NotificationHub';
import LifeTimeline from '../components/LifeTimeline';
import LogoutConfirmDialog from '../components/ui/LogoutConfirmDialog';
import ResponsiveNavbar from '../components/layout/ResponsiveNavbar';
import ResponsiveSidebar from '../components/layout/ResponsiveSidebar';
import SearchBar from '../components/ui/SearchBar';
import SearchEngine from '../components/SearchEngine';
import { apiFetch } from '../config/api';
import LifeLinkAICopilot from '../components/LifeLinkAICopilot';
import AutoSaveIndicator from '../components/ui/AutoSaveIndicator';
import LogoutToast from '../components/ui/LogoutToast';

import ProfileEditModal from '../components/ProfileEditModal';

const DashboardLayout = ({ children, sidebarItems = [], activeItem, onSelect, onRefresh, refreshLabel = 'Refresh', onAiChat, ...rest }) => {
    const { user, logout, performLogout } = useAuth();
    const navigate = useNavigate();

    const [hasUnread, setHasUnread] = useState(false);

    const [searchMode, setSearchMode] = useState('quick');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');
    const searchCacheRef = useRef(new Map());
    const searchCacheTtlMs = 300000;
    const [searchLocation, setSearchLocation] = useState(null);

    const readStoredSearchCache = () => {
        try {
            const key = user?.id ? `lifelink:search-cache:${user.id}` : 'lifelink:search-cache:guest';
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : {};
        } catch (err) {
            return {};
        }
    };

    const writeStoredSearchCache = (cache) => {
        try {
            const key = user?.id ? `lifelink:search-cache:${user.id}` : 'lifelink:search-cache:guest';
            localStorage.setItem(key, JSON.stringify(cache));
        } catch (err) {
            // ignore storage failures
        }
    };

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showLogoutToast, setShowLogoutToast] = useState(false);

    useEffect(() => {
        const checkUnread = async () => {
            if (!user?.id) return;
            try {
                const res = await apiFetch(`/api/dashboard/public/${user.id}/full`, { method: 'GET', ttlMs: 30000 });
                const data = res.data || {};
                const readKey = user?.id ? `lifelink:lastReadTime:${user.id}` : 'lifelink:lastReadTime';
                const lastRead = localStorage.getItem(readKey);
                const lastReadDate = lastRead ? new Date(lastRead) : new Date(0);
                const allItems = [...(data.alerts || []), ...(data.resourceRequests || [])];
                const hasNew = allItems.some(item => new Date(item.createdAt) > lastReadDate);
                setHasUnread(hasNew);
            } catch (err) {
                console.error(err);
            }
        };
        if (user?.role !== 'government') checkUnread();
    }, [user?.id, user?.role]);

    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setSearchLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setSearchLocation(null),
            { enableHighAccuracy: true }
        );
    }, []);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        const redirectRoute = performLogout();
        setShowLogoutToast(true);
        navigate(redirectRoute, { replace: true });
    };

    const handleSelect = (key) => {
        onSelect?.(key);
        setIsDrawerOpen(false);
    };

    const handleProfile = () => setShowProfileEditModal(true);
    const handleNotifications = () => handleSelect('notifications');
    const handleHistory = () => handleSelect('history');

    // Switch Role removed — each user stays in their assigned workspace



    const handleSearch = async (overrideText) => {
        const trimmed = (overrideText ?? searchQuery).trim();
        if (!trimmed) return;
        const cacheKey = `${searchMode}:${trimmed.toLowerCase()}`;
        const cached = searchCacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < searchCacheTtlMs) {
            setSearchResult(cached.result);
            setSearchError('');
            return;
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            const offlineCache = readStoredSearchCache();
            const offlineMatch = offlineCache[cacheKey];
            if (offlineMatch) {
                setSearchResult({ ...offlineMatch, offline: true });
                setSearchError('');
                return;
            }
            if (searchMode === 'db') {
                const entries = Object.values(offlineCache).filter((item) => item?.mode === 'db');
                const aggregate = { users: [], alerts: [], ambulances: [], hospitals: [] };
                entries.forEach((entry) => {
                    const results = entry?.data?.results || {};
                    Object.keys(aggregate).forEach((key) => {
                        const items = Array.isArray(results[key]) ? results[key] : [];
                        aggregate[key] = aggregate[key].concat(items);
                    });
                });
                const term = trimmed.toLowerCase();
                const filterItems = (items) => items.filter((item) => JSON.stringify(item).toLowerCase().includes(term)).slice(0, 5);
                setSearchResult({
                    mode: 'db',
                    offline: true,
                    data: {
                        query: trimmed,
                        results: {
                            users: filterItems(aggregate.users),
                            alerts: filterItems(aggregate.alerts),
                            ambulances: filterItems(aggregate.ambulances),
                            hospitals: filterItems(aggregate.hospitals),
                        }
                    }
                });
                setSearchError('');
                return;
            }
            const aiFallback = {
                mode: 'ai',
                offline: true,
                data: {
                    answer: 'Offline mode: cached intelligence is unavailable. Reconnect to ask LifeLink AI.'
                }
            };
            setSearchResult(aiFallback);
            setSearchError('');
            return;
        }
        setSearchLoading(true);
        setSearchError('');
        setSearchResult(null);
        try {
            const path = '/v2/search';
            const payload = {
                query: trimmed,
                mode: searchMode,
                latitude: searchLocation?.lat || null,
                longitude: searchLocation?.lng || null,
                max_results: 20,
            };
            const { ok, data, status } = await apiFetch(path, {
                method: 'POST',
                body: JSON.stringify(payload),
                timeoutMs: 30000,
            });
            if (!ok) {
                const message = data.detail || data.error || `Search failed (${status})`;
                setSearchError(message);
            } else {
                setSearchResult(data);
                searchCacheRef.current.set(cacheKey, { timestamp: Date.now(), result: data });
                const stored = readStoredSearchCache();
                stored[cacheKey] = data;
                writeStoredSearchCache(stored);
            }
        } catch (err) {
            const message = err?.name === 'AbortError' || /aborted/i.test(err?.message || '')
                ? 'Search timed out. Try again with a shorter query.'
                : (err.message || 'Search failed');
            setSearchError(message);
        } finally {
            setSearchLoading(false);
        }
    };

    const isNotificationsTab = activeItem === 'notifications';
    // Switch Role permanently removed — consistent enterprise authentication
    const subtitle = user?.role ? `${user.role} portal${user?.subRole ? ` • ${user.subRole}` : ''}` : 'Portal';

    return (
        <div className="gradient-background-universal min-h-screen">
            <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden">
                <ResponsiveSidebar
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    user={user}
                    items={sidebarItems}
                    activeKey={activeItem}
                    onSelect={handleSelect}
                    onLogoClick={() => {
                        setIsDrawerOpen(false);
                        navigate('/');
                    }}
                    onLogout={handleLogout}
                    onProfile={handleProfile}
                    onNotifications={handleNotifications}
                    onHistory={handleHistory}
                    hasUnread={hasUnread}
                />
                <div className="relative flex-1 min-w-0">
                    <main className={`flex-1 min-w-0 flex flex-col lg:h-screen transition-all duration-500 ease-out ${isAiPanelOpen ? 'lg:mr-[360px]' : ''}`}>
                        <ResponsiveNavbar
                            title="LifeLink"
                            subtitle={subtitle}
                            onLogoClick={() => navigate('/')}
                            onMenuClick={() => setIsDrawerOpen(true)}
                            onSearchToggle={() => setIsMobileSearchOpen((prev) => !prev)}
                            isSearchOpen={isMobileSearchOpen}
                        />

                        {isMobileSearchOpen && (
                            <div className="lg:hidden bg-white/90 backdrop-blur-lg border-b border-[#E5E7EB] px-4 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <SearchBar
                                            mode="db"
                                            showModeToggle={false}
                                            query={searchQuery}
                                            onQueryChange={setSearchQuery}
                                            onSubmit={handleSearch}
                                            loading={searchLoading}
                                        />
                                    </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAiPanelOpen((prev) => !prev);
                                        onAiChat?.();
                                    }}
                                    className="group text-xs font-semibold text-gray-700 border border-[#E5E7EB] px-3 py-2 rounded-lg shrink-0 flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.15)] hover:border-[#7C3AED]/20 bg-white/80 backdrop-blur-sm"
                                >
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white text-[10px] group-hover:animate-ai-sparkle">
                                        <i className="fas fa-heartbeat"></i>
                                    </span>
                                    <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent font-semibold">LifeLink AI</span>
                                </button>
                                    {onRefresh && (
                                        <button
                                            type="button"
                                            onClick={onRefresh}
                                            className="text-xs font-semibold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white px-3 py-2 rounded-lg hover:shadow-lg hover:from-[#1D4ED8] hover:to-[#6D28D9] shrink-0 transition-all duration-200 active:scale-95 shadow-md hover:-translate-y-0.5"
                                        >
                                            <i className="fas fa-rotate mr-1.5 transition-transform duration-500 hover:rotate-180"></i>
                                            {refreshLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="hidden lg:block sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-[#E5E7EB] shrink-0">
                            <div className="px-6 sm:px-8 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <SearchBar
                                            mode="db"
                                            showModeToggle={false}
                                            query={searchQuery}
                                            onQueryChange={setSearchQuery}
                                            onSubmit={handleSearch}
                                            loading={searchLoading}
                                        />
                                    </div>

                                    {/* ── Reassuring Auto-Save Indicator ── */}
                                    {user && <AutoSaveIndicator className="hidden xl:inline-flex shrink-0" />}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAiPanelOpen((prev) => !prev);
                                        onAiChat?.();
                                    }}
                                    className="group text-xs font-semibold text-gray-700 border border-[#E5E7EB] px-3 py-2 rounded-lg shrink-0 flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 animate-breathing-glow shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.15)] hover:border-[#7C3AED]/20 bg-white/80 backdrop-blur-sm"
                                >
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white text-[10px] group-hover:animate-ai-sparkle">
                                        <i className="fas fa-heartbeat"></i>
                                    </span>
                                    <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent font-semibold">LifeLink AI</span>
                                </button>
                                    {onRefresh && (
                                        <button
                                            type="button"
                                            onClick={onRefresh}
                                            className="text-xs font-semibold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white px-3 py-2 rounded-lg hover:shadow-lg hover:from-[#1D4ED8] hover:to-[#6D28D9] shrink-0 transition-all duration-200 active:scale-95 shadow-md hover:-translate-y-0.5"
                                        >
                                            <i className="fas fa-rotate mr-1.5 transition-transform duration-500 hover:rotate-180"></i>
                                            {refreshLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 lg:overflow-y-auto" key={activeItem || 'default'}>
                            <div className="animate-page-enter">
                            {isNotificationsTab ? (
                                <div className="w-full animate-fade-in-up">
                                    <NotificationHub variant="panel" onMarkRead={() => setHasUnread(false)} />
                                </div>
                            ) : activeItem === 'history' ? (
                                <div className="w-full animate-fade-in-up">
                                    <LifeTimeline user={user} />
                                </div>
                            ) : (
                                <>
                                    {(searchResult || searchLoading || searchError) && (
                                        <SearchEngine
                                            query={searchQuery}
                                            result={searchResult}
                                            loading={searchLoading}
                                            error={searchError}
                                            searchMode={searchMode}
                                            onModeChange={setSearchMode}
                                            onClear={() => { setSearchResult(null); setSearchError(''); }}
                                            onFollowUp={(q) => { setSearchQuery(q); handleSearch(q); }}
                                            moduleKey={activeItem || 'general'}
                                        />
                                    )}
                                    <div className="animate-fade-in-up">
                                        {children}
                                    </div>
                                </>
                            )}
                            </div>
                        </div>
                    </main>
                    <aside
                        className={`hidden lg:flex flex-col absolute right-0 top-0 h-full w-[360px] bg-white/95 backdrop-blur-lg border-l border-[#E5E7EB] shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isAiPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
                    >
                        <div className="p-4 h-full">
                            <LifeLinkAICopilot
                                variant="panel"
                                onClose={() => setIsAiPanelOpen(false)}
                                location={searchLocation}
                                moduleKey={activeItem || 'dashboard'}
                            />
                        </div>
                    </aside>
                </div>
            </div>
            {isAiPanelOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-sm animate-fade-in">
                    <div className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-2xl p-4 animate-slide-in-right">
                        <LifeLinkAICopilot
                            variant="panel"
                            onClose={() => setIsAiPanelOpen(false)}
                            location={searchLocation}
                            moduleKey={activeItem || 'dashboard'}
                        />
                    </div>
                </div>
            )}

            {/* Profile Edit Modal — rendered as portal floating above everything */}
            {showProfileEditModal && (
                <ProfileEditModal onClose={() => setShowProfileEditModal(false)} />
            )}

            {/* Logout Confirmation Dialog */}
            <LogoutConfirmDialog
                open={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogoutConfirm}
                userName={user?.name || user?.fullName || 'User'}
                userRole={user?.subRole || user?.role || 'Active session'}
                workspaceName={user?.subRole ? `${user?.department_name || user?.subRole}` : undefined}
            />

            {/* Reassuring post-logout toast notification */}
            <LogoutToast
                open={showLogoutToast}
                onClose={() => setShowLogoutToast(false)}
            />
        </div>
    );
};

export default DashboardLayout;