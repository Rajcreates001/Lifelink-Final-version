import React, { useState } from 'react';
import { buildQuery, _nowLabel } from './helpers';

export const HospitalLiveEmergencyFeed = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [surgeInsight, setSurgeInsight] = useState(null);
    const [triageResults, setTriageResults] = useState({});
    const [triageLoading, setTriageLoading] = useState({});
    const [imagingForms, setImagingForms] = useState({});

    // Real-time emergency feed via WebSocket
    const {
        feed: realtimeFeed,
        isConnected: wsConnected,
    } = useEmergencyFeed();

    // Merge WebSocket feed items into alerts
    useEffect(() => {
        if (realtimeFeed.length === 0) return;
        setAlerts((prev) => {
            const existingIds = new Set(prev.map((a) => a._id || a.id));
            const newItems = realtimeFeed.filter(
                (item) => !existingIds.has(item._id || item.id || item.alertId)
            );
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev].slice(0, 50);
        });
    }, [realtimeFeed]);

    const [dispatchForms, setDispatchForms] = useState({});
    const [dispatchStatus, setDispatchStatus] = useState('');
    const [feedSearch, setFeedSearch] = useState('');
    const [feedSortBy, setFeedSortBy] = useState('createdAt');
    const [feedSortDir, setFeedSortDir] = useState('desc');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (!hospitalId) {
                    setAlerts([]);
                    return;
                }
                const feedQuery = buildQuery({
                    hospitalId,
                    search: feedSearch,
                    sort_by: feedSortBy,
                    sort_dir: feedSortDir
                });
                const [res, surgeRes] = await Promise.all([
                    apiFetch(`/api/hospital-ops/emergency/feed${feedQuery}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/ceo/ai-insights?hospitalId=${hospitalId}`, { method: 'GET' })
                ]);
                setAlerts(res.ok ? (res.data?.data || []) : []);
                setSurgeInsight(surgeRes.ok ? surgeRes.data : null);
            } catch (err) {
                setAlerts([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [hospitalId, feedSearch, feedSortBy, feedSortDir]);

    const updateStatus = async (alertId, status) => {
        setAlerts((prev) => prev.map((item) => item._id === alertId || item.id === alertId ? { ...item, status } : item));
        try {
            await apiFetch(`/api/hospital-ops/emergency/feed/${alertId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        } catch (err) {
            // Keep optimistic update
        }
    };

    const runTriage = async (alert) => {
        const alertId = alert._id || alert.id;
        if (!alertId) return;
        setTriageLoading((prev) => ({ ...prev, [alertId]: true }));
        try {
            const res = await apiFetch('/api/hospital/triage', {
                method: 'POST',
                body: JSON.stringify({
                    symptoms: alert.symptoms || alert.message || 'Emergency',
                    severity_hint: alert.severity,
                })
            });
            if (res.ok) {
                setTriageResults((prev) => ({ ...prev, [alertId]: res.data }));
            }
        } finally {
            setTriageLoading((prev) => ({ ...prev, [alertId]: false }));
        }
    };

    const saveImaging = async (alertId) => {
        const form = imagingForms[alertId];
        if (!form?.modality && !form?.bodyPart && !form?.priority) return;
        await apiFetch(`/api/hospital-ops/emergency/feed/${alertId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                imagingMeta: {
                    modality: form.modality,
                    bodyPart: form.bodyPart,
                    priority: form.priority,
                }
            })
        });
        setAlerts((prev) => prev.map((item) => (item._id || item.id) === alertId ? {
            ...item,
            imagingMeta: {
                modality: form.modality,
                bodyPart: form.bodyPart,
                priority: form.priority,
            }
        } : item));
    };

    const dispatchAmbulance = async (alertId) => {
        const form = dispatchForms[alertId];
        if (!form?.ambulanceId || !hospitalId) return;
        setDispatchStatus('Dispatching ambulance...');
        try {
            const res = await apiFetch('/api/hospital-ops/emergency/dispatch', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    ambulanceId: form.ambulanceId,
                    eventId: alertId,
                    pickup: form.pickup || 'Emergency pickup',
                    destination: form.destination || 'Hospital',
                    etaMinutes: form.etaMinutes ? Number(form.etaMinutes) : undefined,
                })
            });
            setDispatchStatus(res.ok ? 'Dispatch created.' : 'Dispatch failed.');
        } catch (err) {
            setDispatchStatus('Dispatch failed.');
        }
        setTimeout(() => setDispatchStatus(''), 4000);
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">Live Emergency Feed</h3>
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
                    <p className="text-sm text-gray-500">Incoming SOS and triage updates.</p>
                </div>
                <span className="text-xs text-gray-400">Updated {_nowLabel()}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search emergencies"
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={feedSortBy}
                    onChange={(e) => setFeedSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="severity">Severity</option>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={feedSortDir}
                    onChange={(e) => setFeedSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {surgeInsight && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <p className="text-xs text-gray-500">Emergency surge risk</p>
                        <p className="text-lg font-bold text-gray-900">{surgeInsight.emergency_spike_risk || 'Low'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <p className="text-xs text-gray-500">Predicted inflow</p>
                        <p className="text-lg font-bold text-gray-900">{surgeInsight.predicted_inflow || 0}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <p className="text-xs text-gray-500">Bed strategy</p>
                        <p className="text-xs font-semibold text-gray-700">{surgeInsight.bed_allocation_strategy || 'Maintain standard allocation'}</p>
                    </div>
                </div>
            )}
            {dispatchStatus && (
                <div className="text-xs text-indigo-600 mb-3">{dispatchStatus}</div>
            )}
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                    {alerts.length === 0 ? (
                        <div className="text-sm text-gray-500">No alerts at the moment.</div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert._id || alert.id} className="border rounded-lg p-3 bg-white/70">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-800">{alert.message || 'Emergency alert'}</p>
                                        <p className="text-xs text-gray-500">{alert.locationDetails || alert.location || 'Unknown location'}</p>
                                        {alert.imagingMeta && (
                                            <p className="text-xs text-slate-500">Imaging: {alert.imagingMeta.modality || 'N/A'} {alert.imagingMeta.bodyPart ? `• ${alert.imagingMeta.bodyPart}` : ''}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusPill text={alert.severity || 'High'} color={alert.severity === 'Critical' ? 'red' : 'yellow'} />
                                        <StatusPill text={alert.status || 'Pending'} color={alert.status === 'Resolved' ? 'green' : 'blue'} />
                                        <button className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors duration-150" onClick={() => updateStatus(alert._id || alert.id, 'Resolved')}>Resolve</button>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
                                    <div className="border rounded p-2">
                                        <p className="text-xs text-gray-500 mb-1">AI triage assist</p>
                                        {triageResults[alert._id || alert.id] ? (
                                            <p className="text-xs text-gray-700">Predicted severity: {triageResults[alert._id || alert.id].predicted_severity || 'Pending'}</p>
                                        ) : (
                                            <button
                                                className="text-xs text-indigo-600"
                                                onClick={() => runTriage(alert)}
                                                disabled={triageLoading[alert._id || alert.id]}
                                            >
                                                {triageLoading[alert._id || alert.id] ? 'Analyzing...' : 'Run AI triage'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="border rounded p-2">
                                        <p className="text-xs text-gray-500 mb-1">Imaging metadata</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="Modality"
                                                value={imagingForms[alert._id || alert.id]?.modality || ''}
                                                onChange={(e) => setImagingForms((prev) => ({
                                                    ...prev,
                                                    [alert._id || alert.id]: { ...prev[alert._id || alert.id], modality: e.target.value }
                                                }))}
                                            />
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="Body part"
                                                value={imagingForms[alert._id || alert.id]?.bodyPart || ''}
                                                onChange={(e) => setImagingForms((prev) => ({
                                                    ...prev,
                                                    [alert._id || alert.id]: { ...prev[alert._id || alert.id], bodyPart: e.target.value }
                                                }))}
                                            />
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="Priority"
                                                value={imagingForms[alert._id || alert.id]?.priority || ''}
                                                onChange={(e) => setImagingForms((prev) => ({
                                                    ...prev,
                                                    [alert._id || alert.id]: { ...prev[alert._id || alert.id], priority: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <button className="mt-2 text-xs text-indigo-600" onClick={() => saveImaging(alert._id || alert.id)}>Save imaging</button>
                                    </div>
                                    <div className="border rounded p-2">
                                        <p className="text-xs text-gray-500 mb-1">Dispatch ambulance</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="Ambulance ID"
                                                value={dispatchForms[alert._id || alert.id]?.ambulanceId || ''}
                                                onChange={(e) => setDispatchForms((prev) => ({
                                                    ...prev,
                                                    [alert._id || alert.id]: { ...prev[alert._id || alert.id], ambulanceId: e.target.value }
                                                }))}
                                            />
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="Pickup"
                                                value={dispatchForms[alert._id || alert.id]?.pickup || ''}
                                                onChange={(e) => setDispatchForms((prev) => ({
                                                    ...prev,
                                                    [alert._id || alert.id]: { ...prev[alert._id || alert.id], pickup: e.target.value }
                                                }))}
                                            />
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="ETA (min)"
                                                value={dispatchForms[alert._id || alert.id]?.etaMinutes || ''}
                                                onChange={(e) => setDispatchForms((prev) => ({
                                                    ...prev,
                                                    [alert._id || alert.id]: { ...prev[alert._id || alert.id], etaMinutes: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <button className="mt-2 text-xs text-indigo-600" onClick={() => dispatchAmbulance(alert._id || alert.id)}>Dispatch</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </DashboardCard>
    );
};
