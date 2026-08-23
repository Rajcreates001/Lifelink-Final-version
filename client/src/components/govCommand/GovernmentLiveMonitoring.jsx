import React, { useState } from 'react';
import { severityColor, formatNumber, buildSeverityData, normalizeFeed, normalizeHospitals, pickCenter } from './helpers';

export const GovernmentLiveMonitoring = () => {
    const [summary, setSummary] = useState(null);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hospitals, setHospitals] = useState([]);
    const refreshInFlightRef = useRef(false);
    const mountedRef = useRef(false);
    const cacheKey = 'gov_live_cache';
    const disableLiveRefresh = true;

    // Real-time emergency feed via WebSocket
    const {
        feed: realtimeFeed,
        isConnected: wsConnected,
    } = useEmergencyFeed();

    // Merge WebSocket feed items into the polling feed
    useEffect(() => {
        if (realtimeFeed.length === 0) return;
        setFeed((prev) => {
            const existingIds = new Set(prev.map((a) => a.id || a._id));
            const newItems = realtimeFeed.filter(
                (item) => !existingIds.has(item.id || item._id || item.alertId)
            )
            .map((item) => ({
                ...item,
                id: item.id || item._id || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                lat: Number(item.lat ?? item.latitude) || 12.9716,
                lng: Number(item.lng ?? item.longitude) || 77.5946,
                occurred_at: item.occurred_at || new Date().toISOString(),
                type: item.message || item.type || 'Emergency alert',
                severity: item.severity || 'High',
            }));
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev].slice(0, FEED_LIMIT);
        });
    }, [realtimeFeed]);

    const hospitalLoadData = useMemo(() => (
        hospitals.slice(0, 6).map((item) => ({
            label: item.name?.slice(0, 12) || 'Hospital',
            value: Math.round((item.load_score || 0) * 100),
        }))
    ), [hospitals]);

    const severityData = useMemo(() => buildSeverityData(feed), [feed]);
    const mapFeed = useMemo(() => feed.slice(0, MAX_MAP_POINTS), [feed]);
    const mapHospitals = useMemo(() => hospitals.slice(0, MAX_MAP_POINTS), [hospitals]);
    const feedCenter = useMemo(() => pickCenter(mapFeed), [mapFeed]);
    const hospitalCenter = useMemo(() => pickCenter(mapHospitals), [mapHospitals]);

    const load = async (withSpinner = false) => {
        const showSpinner = withSpinner === true;
        if (refreshInFlightRef.current) {
            if (showSpinner) setLoading(false);
            return;
        }
        refreshInFlightRef.current = true;
        if (showSpinner) {
            setLoading(true);
        }
        try {
            const [summaryRes, feedRes, hospitalsRes] = await Promise.all([
                apiFetch('/v2/government/monitoring/summary', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
                apiFetch(`/v2/government/monitoring/feed?limit=${FEED_LIMIT}&window_minutes=${FEED_WINDOW_MINUTES}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
                apiFetch(`/v2/government/resources/hospitals?limit=${HOSPITAL_LIMIT}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            ]);
            if (!mountedRef.current) return;
            setSummary(summaryRes.ok ? summaryRes.data : null);
            const feedData = feedRes.ok ? (feedRes.data?.data || []) : [];
            const normalizedFeed = normalizeFeed(feedData, FEED_LIMIT);
            setFeed(normalizedFeed);
            const hospitalData = hospitalsRes.ok ? (hospitalsRes.data?.data || []) : [];
            const normalizedHospitals = normalizeHospitals(hospitalData, HOSPITAL_LIMIT);
            setHospitals(normalizedHospitals);
            localStorage.setItem(cacheKey, JSON.stringify({
                summary: summaryRes.ok ? summaryRes.data : null,
                feed: normalizedFeed,
                hospitals: normalizedHospitals,
            }));

            if (summaryRes.ok && summaryRes.data?.active_emergencies === 0 && !sessionStorage.getItem('gov_seed_done')) {
                sessionStorage.setItem('gov_seed_done', '1');
                await apiFetch('/v2/government/command/seed', { method: 'POST', body: JSON.stringify({}) });
                const seededSummary = await apiFetch('/v2/government/monitoring/summary', { method: 'GET' });
                if (seededSummary.ok) {
                    if (!mountedRef.current) return;
                    setSummary(seededSummary.data);
                }
                const seededFeed = await apiFetch(`/v2/government/monitoring/feed?limit=${FEED_LIMIT}&window_minutes=${FEED_WINDOW_MINUTES}`, { method: 'GET' });
                if (seededFeed.ok) {
                    setFeed(normalizeFeed(seededFeed.data?.data || [], FEED_LIMIT));
                }
                const seededHospitals = await apiFetch(`/v2/government/resources/hospitals?limit=${HOSPITAL_LIMIT}`, { method: 'GET' });
                if (seededHospitals.ok) {
                    setHospitals(normalizeHospitals(seededHospitals.data?.data || [], HOSPITAL_LIMIT));
                }
            }
        } catch (err) {
            // preserve cached data on refresh errors
        } finally {
            refreshInFlightRef.current = false;
            if (showSpinner && mountedRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        let hasCache = false;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                setSummary(parsed.summary || null);
                setFeed(normalizeFeed(parsed.feed || [], FEED_LIMIT));
                setHospitals(normalizeHospitals(parsed.hospitals || [], HOSPITAL_LIMIT));
                setLoading(false);
                hasCache = true;
            }
        } catch (error) {
            // ignore cache failures
        }
        load(!hasCache);
        const interval = disableLiveRefresh ? null : setInterval(() => {
            load(false);
        }, 90000);
        return () => {
            mountedRef.current = false;
            if (interval) clearInterval(interval);
        };
    }, []);

    return (
        <div className="space-y-6">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-500">Live Monitoring</p>
                            <p className="text-lg font-bold text-slate-800">Operational feed and system health</p>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                wsConnected
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                    wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                            />
                            {wsConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                </div>
            </DashboardCard>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <DashboardCard className="animate-fade-in-up delay-400">
                        <p className="text-xs font-bold uppercase text-slate-500">Active Emergencies</p>
                        <p className="text-3xl font-black text-slate-900">{formatNumber(summary?.active_emergencies)}</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-300">
                        <p className="text-xs font-bold uppercase text-slate-500">Avg Response</p>
                        <p className="text-3xl font-black text-slate-900">{formatNumber(summary?.avg_response_minutes)}m</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-400">
                        <p className="text-xs font-bold uppercase text-slate-500">Resource Utilization</p>
                        <p className="text-3xl font-black text-slate-900">{formatNumber(summary?.resource_utilization)}%</p>
                    </DashboardCard>
                </div>
            )}

            <DashboardCard>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Incident Feed</h3>
                {feed.length === 0 ? (
                    <p className="text-sm text-slate-500">No incidents in the feed.</p>
                ) : (
                    <div className="max-h-[320px] overflow-y-auto pr-2 space-y-3">
                        {feed.map((item) => (
                            <div key={item.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.type}</p>
                                        <p className="text-xs text-slate-500">{item.lat?.toFixed(3)}, {item.lng?.toFixed(3)}</p>
                                    </div>
                                    <StatusPill text={item.severity} color={severityColor(item.severity)} />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{item.occurred_at}</p>
                            </div>
                        ))}
                    </div>
                )}
            </DashboardCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleBarChart title="Severity Distribution" data={severityData} barColorClass="bg-red-500" className={wsConnected ? 'animate-border-glow' : ''} />
                <DashboardCard className="p-0 overflow-hidden">
                    <div className="h-[380px] w-full">
                        <MapContainer center={feedCenter} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {mapFeed.map((item) => (
                                <Circle
                                    key={item.id || `${item.lat}-${item.lng}-${item.occurred_at || ''}`}
                                    center={[item.lat, item.lng]}
                                    radius={item.severity === 'Critical' ? 3500 : item.severity === 'High' ? 2500 : 1800}
                                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3 }}
                                />
                            ))}
                        </MapContainer>
                    </div>
                </DashboardCard>
            </div>

            <DashboardCard className="p-0 overflow-hidden">
                <div className="h-[420px] w-full">
                    <MapContainer center={hospitalCenter} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {mapHospitals.map((item) => (
                            <Marker key={item.id || `${item.lat}-${item.lng}-${item.name || ''}`} position={[item.lat, item.lng]}>
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-semibold">{item.name}</p>
                                        <p>Beds: {item.beds_available}/{item.beds_total}</p>
                                        <p>Load: {Math.round(item.load_score * 100)}%</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </DashboardCard>

            <SimpleBarChart title="Top Hospital Load" data={hospitalLoadData} barColorClass="bg-sky-500" className={wsConnected ? 'animate-border-glow' : ''} />

            {/* Reports Section */}
            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Download Reports</h3>
                        <p className="text-sm text-slate-500">Export monitoring snapshot as PDF.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ReportDownloadButton
                        endpoint="/api/reports/government/incident"
                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}
                        filename="monitoring_incident_report.pdf"
                        label="Incident Snapshot"
                        variant="primary"
                        size="sm"
                        icon="fa-file-alt"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/government/resource"
                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}
                        filename="monitoring_resource_report.pdf"
                        label="Resource Snapshot"
                        variant="secondary"
                        size="sm"
                        icon="fa-boxes"
                    />
                </div>
            </DashboardCard>

            {/* Heat Map — Emergency Density */}
            <DashboardCard>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">Emergency Heat Map</h3>
                        {wsConnected && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-fade-in">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live
                            </span>
                        )}
                    </div>
                </div>
                <HeatMapView
                    incidents={realtimeFeed.length > 0 ? realtimeFeed.slice(0, 50) : feed.slice(0, 50)}
                    center={[12.9716, 77.5946]}
                    zoom={11}
                    height="420px"
                />
            </DashboardCard>

            {/* Emergency Hotspots */}
            <EmergencyHotspotMap />
        </div>
    );
};
