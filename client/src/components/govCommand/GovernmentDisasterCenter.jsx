import React, { useState } from 'react';
import { severityColor, severityScore, buildDisasterGraph } from './helpers';

export const GovernmentDisasterCenter = () => {
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ type: 'manual', zone: 'Zone A', severity: 'High', reason: '' });
    const [broadcastMessage, setBroadcastMessage] = useState('Evacuate priority zones and activate disaster response.');
    const [center, setCenter] = useState([12.9716, 77.5946]);
    const [activeTab, setActiveTab] = useState('control');
    const [actionLog, setActionLog] = useState(null);
    const [history, setHistory] = useState(() => {
        const cached = localStorage.getItem('gov_disaster_history');
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                return [];
            }
        }
        return [
            { id: 'hist-1', action: 'Cluster Scan', detail: 'No cluster above threshold', status: 'clear', time: 'Earlier today' },
            { id: 'hist-2', action: 'Manual Trigger', detail: 'Flood warning in Zone B', status: 'alert', time: 'Yesterday' },
            { id: 'hist-3', action: 'Broadcast', detail: 'Evacuation notice pushed', status: 'broadcast', time: '2 days ago' },
        ];
    });

    const disasterGraph = useMemo(() => buildDisasterGraph(recent), [recent]);
    const trendData = useMemo(() => {
        const items = recent.slice(0, 7).reverse();
        if (!items.length) return [{ label: 'T-0', value: 0 }];
        return items.map((item, idx) => ({
            label: `T-${items.length - idx}`,
            value: severityScore(item.severity),
        }));
    }, [recent]);

    const pushHistory = (entry) => {
        setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 25);
            localStorage.setItem('gov_disaster_history', JSON.stringify(next));
            return next;
        });
    };

    const loadRecent = async () => {
        setLoading(true);
        const res = await apiFetch('/v2/government/disaster/recent', { method: 'GET' });
        setRecent(res.ok ? (res.data?.data || []) : []);
        setLoading(false);
    };

    useEffect(() => {
        loadRecent();
        navigator.geolocation.getCurrentPosition(
            (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
            () => null,
        );
    }, []);

    const detectCluster = async () => {
        const res = await apiFetch('/v2/government/disaster/detect', { method: 'POST' });
        if (res.ok) {
            const entry = res.data?.disaster
                ? { id: `hist-${Date.now()}`, action: 'Cluster Scan', detail: `Cluster detected: ${res.data.disaster.type} (${res.data.disaster.severity})`, status: 'alert', time: new Date().toLocaleString() }
                : { id: `hist-${Date.now()}`, action: 'Cluster Scan', detail: 'No cluster above threshold', status: 'clear', time: new Date().toLocaleString() };
            setActionLog(entry);
            pushHistory(entry);
            loadRecent();
        }
    };

    const triggerManual = async () => {
        const res = await apiFetch('/v2/government/disaster/trigger', {
            method: 'POST',
            body: JSON.stringify({ ...form, lat: center[0], lng: center[1] }),
        });
        if (res.ok) {
            const entry = {
                id: `hist-${Date.now()}`,
                action: 'Manual Trigger',
                detail: `${form.type || 'Manual'} · ${form.zone} · ${form.severity}`,
                status: 'alert',
                time: new Date().toLocaleString(),
            };
            setActionLog(entry);
            pushHistory(entry);
            loadRecent();
        }
    };

    const broadcast = async () => {
        const res = await apiFetch('/v2/government/disaster/broadcast', {
            method: 'POST',
            body: JSON.stringify({ message: broadcastMessage }),
        });
        if (res.ok) {
            const entry = {
                id: `hist-${Date.now()}`,
                action: 'Broadcast',
                detail: broadcastMessage,
                status: 'broadcast',
                time: new Date().toLocaleString(),
            };
            setActionLog(entry);
            pushHistory(entry);
        }
    };

    return (
        <div className="space-y-6">
            <DashboardCard>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Disaster Management</p>
                        <p className="text-lg font-bold text-slate-800">Detect clusters, trigger events, broadcast actions.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className={`px-3 py-2 text-xs font-bold rounded ${activeTab === 'control' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                            onClick={() => setActiveTab('control')}
                        >
                            Control
                        </button>
                        <button
                            className={`px-3 py-2 text-xs font-bold rounded ${activeTab === 'history' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                        <button className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded" onClick={() => loadRecent()}>
                            Refresh
                        </button>
                    </div>
                </div>
            </DashboardCard>

            {activeTab === 'history' ? (
                <DashboardCard>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Action History</h3>
                    {history.length === 0 ? (
                        <p className="text-sm text-slate-500">No disaster activity logged yet.</p>
                    ) : (
                        <div className="max-h-[360px] overflow-y-auto pr-2 space-y-3">
                            {history.map((item) => (
                                <div key={item.id} className="border rounded-lg p-3 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">{item.action}</p>
                                            <p className="text-xs text-slate-500">{item.detail}</p>
                                        </div>
                                        <StatusPill
                                            text={item.status === 'broadcast' ? 'Broadcast' : item.status === 'alert' ? 'Alert' : 'Clear'}
                                            color={item.status === 'alert' ? 'red' : item.status === 'broadcast' ? 'blue' : 'green'}
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-2">{item.time}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardCard>
            ) : null}

            {activeTab === 'control' ? (
                <>
                    {actionLog && (
                        <DashboardCard>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Last Action Result</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-800">{actionLog.action}</p>
                                    <p className="text-xs text-slate-500">{actionLog.detail}</p>
                                </div>
                                <StatusPill
                                    text={actionLog.status === 'broadcast' ? 'Broadcast' : actionLog.status === 'alert' ? 'Alert' : 'Clear'}
                                    color={actionLog.status === 'alert' ? 'red' : actionLog.status === 'broadcast' ? 'blue' : 'green'}
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">{actionLog.time}</p>
                        </DashboardCard>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Cluster Detection</h3>
                    <p className="text-sm text-slate-500 mb-3">Run detection on active emergencies to identify disaster zones.</p>
                    <button className="px-3 py-2 text-xs font-bold bg-rose-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={detectCluster}>
                        Detect Disaster Cluster
                    </button>
                </DashboardCard>
                <DashboardCard>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Manual Trigger</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <input
                            className="border rounded p-2 text-sm"
                            placeholder="Disaster type"
                            value={form.type}
                            onChange={(event) => setForm({ ...form, type: event.target.value })}
                        />
                        <input
                            className="border rounded p-2 text-sm"
                            placeholder="Zone"
                            value={form.zone}
                            onChange={(event) => setForm({ ...form, zone: event.target.value })}
                        />
                        <select
                            className="border rounded p-2 text-sm"
                            value={form.severity}
                            onChange={(event) => setForm({ ...form, severity: event.target.value })}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                        <textarea
                            className="border rounded p-2 text-sm"
                            rows="2"
                            placeholder="Reason"
                            value={form.reason}
                            onChange={(event) => setForm({ ...form, reason: event.target.value })}
                        />
                        <button className="px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={triggerManual}>
                            Trigger Disaster
                        </button>
                    </div>
                </DashboardCard>
                    </div>

                    <DashboardCard>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Broadcast Alert</h3>
                        <div className="flex flex-col gap-2">
                            <textarea
                                className="border rounded p-2 text-sm"
                                rows="2"
                                value={broadcastMessage}
                                onChange={(event) => setBroadcastMessage(event.target.value)}
                            />
                            <button className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={broadcast}>
                                Broadcast Message
                            </button>
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Recent Disasters</h3>
                        {loading ? (
                            <LoadingSpinner />
                        ) : recent.length === 0 ? (
                            <p className="text-sm text-slate-500">No disaster events logged.</p>
                        ) : (
                            <div className="max-h-[320px] overflow-y-auto pr-2 space-y-2">
                                {recent.map((item) => (
                                    <div key={item.id} className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-800">{item.disaster_type}</p>
                                                <p className="text-xs text-slate-500">{item.zone} · {item.started_at}</p>
                                            </div>
                                            <StatusPill text={item.severity} color={severityColor(item.severity)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardCard>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DashboardCard>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">Disaster Graph</h3>
                            <div className="h-[240px] border rounded-lg bg-white">
                                {disasterGraph.nodes.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                        Disaster signals will appear after events are logged.
                                    </div>
                                ) : (
                                    <ReactFlow
                                        nodes={disasterGraph.nodes}
                                        edges={disasterGraph.edges}
                                        fitView
                                        nodesDraggable={false}
                                        nodesConnectable={false}
                                        zoomOnScroll={false}
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        <Background color="#e2e8f0" gap={16} />
                                        <Controls showInteractive={false} />
                                    </ReactFlow>
                                )}
                            </div>
                        </DashboardCard>
                        <SimpleLineChart title="Severity Trend" data={trendData} lineColor="rgba(244, 63, 94, 0.9)" />
                    </div>

                    <DashboardCard className="p-0 overflow-hidden">
                        <div className="h-[420px] w-full">
                            <MapContainer center={center} zoom={7} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {recent.map((item) => (
                                    item.lat && item.lng ? (
                                        <Marker key={item.id} position={[item.lat, item.lng]}>
                                            <Popup>
                                                <div className="text-xs">
                                                    <p className="font-semibold">{item.disaster_type}</p>
                                                    <p>{item.zone}</p>
                                                    <p>Severity: {item.severity}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ) : null
                                ))}
                            </MapContainer>
                        </div>
                    </DashboardCard>
                </>
            ) : null}
        </div>
    );
};
