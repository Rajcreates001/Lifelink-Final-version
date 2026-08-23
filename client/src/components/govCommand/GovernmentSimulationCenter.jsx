import React, { useState } from 'react';
import { impactColor, buildSimulationGraph } from './helpers';

export const GovernmentSimulationCenter = () => {
    const [sessionId, setSessionId] = useState('');
    const [phaseForm, setPhaseForm] = useState({ name: '', intensity: 'medium', count: 40, duration: 25 });
    const [phases, setPhases] = useState([]);
    const [afterAction, setAfterAction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('control');

    const [history, setHistory] = useState(() => {
        const cached = localStorage.getItem('gov_simulation_history');
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                return [];
            }
        }
        return [
            { id: 'sim-1', action: 'Multi-phase run', detail: '3 phases, medium intensity', status: 'complete', time: 'Earlier today' },
            { id: 'sim-2', action: 'After-action report', detail: 'Critical count improved 12%', status: 'report', time: 'Yesterday' },
        ];
    });
    const demoPhases = useMemo(() => ([
        { name: 'Stability Check', intensity: 'low', count: 22, duration: 12 },
        { name: 'Surge Wave', intensity: 'high', count: 58, duration: 28 },
        { name: 'Recovery', intensity: 'medium', count: 40, duration: 22 },
    ]), []);
    const activePhases = useMemo(() => (
        phases.length > 0 ? phases : demoPhases
    ), [phases, demoPhases]);
    const phaseSeries = useMemo(() => (
        activePhases.map((phase, index) => ({
            label: phase.name || `Phase ${index + 1}`,
            value: Number(phase.count) || 0,
        }))
    ), [activePhases]);
    const simulationGraph = useMemo(() => buildSimulationGraph(activePhases, afterAction), [activePhases, afterAction]);

    const pushHistory = (entry) => {
        setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 25);
            localStorage.setItem('gov_simulation_history', JSON.stringify(next));
            return next;
        });
    };

    const addPhase = () => {
        if (!phaseForm.name) return;
        setPhases((prev) => [...prev, { ...phaseForm }]);
        setPhaseForm({ name: '', intensity: 'medium', count: 40, duration: 25 });
    };

    const startSession = async () => {
        const res = await apiFetch('/v2/government/simulation/start', { method: 'POST', body: JSON.stringify({ intensity: 'medium' }) });
        if (res.ok) {
            setSessionId(res.data?.session_id || '');
            pushHistory({
                id: `sim-${Date.now()}`,
                action: 'Session started',
                detail: `Session ${res.data?.session_id || 'active'}`,
                status: 'running',
                time: new Date().toLocaleString(),
            });
        }
    };

    const runMultiPhase = async () => {
        setLoading(true);
        try {

            let id = sessionId;
            if (!id) {
                const res = await apiFetch('/v2/government/simulation/start', { method: 'POST', body: JSON.stringify({ intensity: 'medium' }) });
                id = res.ok ? res.data?.session_id : '';
                setSessionId(id || '');
            }
            if (!id) return;
            await apiFetch('/v2/government/simulation/multi-phase', {
                method: 'POST',
                body: JSON.stringify({ session_id: id, phases, auto_close: false }),
            });
            pushHistory({
                id: `sim-${Date.now()}`,
                action: 'Multi-phase run',
                detail: `${phases.length} phases · ${phases.reduce((sum, phase) => sum + (Number(phase.count) || 0), 0)} incidents`,
                status: 'complete',
                time: new Date().toLocaleString(),
            });
        } finally {
            setLoading(false);
        }
    };

    const stopSession = async () => {
        if (!sessionId) return;
        await apiFetch(`/v2/government/simulation/stop/${sessionId}`, { method: 'POST' });
        pushHistory({
            id: `sim-${Date.now()}`,
            action: 'Session stopped',
            detail: `Session ${sessionId}`,
            status: 'stopped',
            time: new Date().toLocaleString(),
        });
    };

    const generateReport = async () => {
        if (!sessionId) return;
        const res = await apiFetch(`/v2/government/simulation/after-action/${sessionId}`, { method: 'POST' });
        if (res.ok) {
            setAfterAction(res.data?.report || null);
            if (res.data?.report) {
                localStorage.setItem('gov_simulation_report', JSON.stringify(res.data.report));
            }
            pushHistory({
                id: `sim-${Date.now()}`,
                action: 'After-action report',
                detail: `Critical ${res.data?.report?.summary?.critical || 0} · Gap ${res.data?.report?.summary?.response_gap_minutes || 0}m`,
                status: 'report',
                time: new Date().toLocaleString(),
            });
        }
    };

    useEffect(() => {
        if (afterAction) return;
        try {
            const cached = localStorage.getItem('gov_simulation_report');
            if (cached) {
                setAfterAction(JSON.parse(cached));
            }
        } catch (error) {
            // ignore cache errors
        }
    }, [afterAction]);

    return (
        <div className="space-y-6">
            <DashboardCard>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Simulation Control</p>
                        <p className="text-lg font-bold text-slate-800">Multi-phase scenario orchestration</p>
                    </div>
                    <div className="flex gap-2">
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
                        <button className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={startSession}>
                            Start Session
                        </button>
                        <button className="px-3 py-2 text-xs font-bold bg-rose-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={stopSession}>
                            Stop
                        </button>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Session ID: {sessionId || 'Not started'}</p>
            </DashboardCard>

            {activeTab === 'history' ? (
                <DashboardCard>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Simulation History</h3>
                    {history.length === 0 ? (
                        <p className="text-sm text-slate-500">No simulation history logged yet.</p>
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
                                            text={item.status === 'report' ? 'Report' : item.status === 'running' ? 'Running' : item.status === 'stopped' ? 'Stopped' : 'Complete'}
                                            color={item.status === 'report' ? 'blue' : item.status === 'running' ? 'yellow' : item.status === 'stopped' ? 'gray' : 'green'}
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

            <DashboardCard>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Phase Builder</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <input
                        className="border rounded p-2 text-sm"
                        placeholder="Phase name"
                        value={phaseForm.name}
                        onChange={(event) => setPhaseForm({ ...phaseForm, name: event.target.value })}
                    />
                    <select
                        className="border rounded p-2 text-sm"
                        value={phaseForm.intensity}
                        onChange={(event) => setPhaseForm({ ...phaseForm, intensity: event.target.value })}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="extreme">Extreme</option>
                    </select>
                    <input
                        className="border rounded p-2 text-sm"
                        type="number"
                        placeholder="Incident count"
                        value={phaseForm.count}
                        onChange={(event) => setPhaseForm({ ...phaseForm, count: Number(event.target.value) })}
                    />
                    <input
                        className="border rounded p-2 text-sm"
                        type="number"
                        placeholder="Duration (min)"
                        value={phaseForm.duration}
                        onChange={(event) => setPhaseForm({ ...phaseForm, duration: Number(event.target.value) })}
                    />
                </div>
                <button className="px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={addPhase}>
                    Add Phase
                </button>
                {activePhases.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {activePhases.map((phase, idx) => (
                            <div key={`${phase.name}-${idx}`} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-slate-800">{phase.name}</p>
                                    <StatusPill text={phase.intensity} color={impactColor(phase.intensity)} />
                                </div>
                                <p className="text-xs text-slate-500">{phase.count} incidents · {phase.duration} min</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded" onClick={runMultiPhase} disabled={loading || activePhases.length === 0}>
                        {loading ? 'Running...' : 'Run Multi-Phase'}
                    </button>
                    <button className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded" onClick={generateReport}>
                        Generate After-Action
                    </button>
                </div>
            </DashboardCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Scenario Graph</h3>
                    <div className="h-[260px] border rounded-lg bg-white">
                        {simulationGraph.nodes.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                Add phases to generate the orchestration graph.
                            </div>
                        ) : (
                            <ReactFlow
                                nodes={simulationGraph.nodes}
                                edges={simulationGraph.edges}
                                fitView
                                nodesDraggable={false}
                                nodesConnectable={false}
                                zoomOnScroll={false}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <Background color="#e2e8f0" gap={18} />
                                <Controls showInteractive={false} />
                            </ReactFlow>
                        )}
                    </div>
                </DashboardCard>
                <SimpleLineChart
                    title="Phase Pressure"
                    data={phaseSeries.length ? phaseSeries : [{ label: 'Phase 1', value: 0 }]}
                    lineColor="rgba(14, 116, 144, 0.9)"
                />
            </div>

            {afterAction && (
                <DashboardCard>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-slate-900 mb-0">After-Action Report</h3>
                        <ReportDownloadButton
                            endpoint="/api/reports/simulation/after-action"
                            data={{ summary: afterAction.summary, recommendations: afterAction.recommendations }}
                            filename="simulation_after_action_report.pdf"
                            label="Download PDF"
                            variant="danger"
                            size="sm"
                            icon="fa-file-pdf"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-slate-500">Total Incidents</p>
                            <p className="text-2xl font-bold text-slate-900">{afterAction.summary?.total || 0}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Critical</p>
                            <p className="text-2xl font-bold text-rose-600">{afterAction.summary?.critical || 0}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Response Gap</p>
                            <p className="text-2xl font-bold text-slate-900">{afterAction.summary?.response_gap_minutes || 0}m</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold uppercase text-slate-500">Recommendations</p>
                        <ul className="list-disc pl-4 text-sm text-slate-600 mt-2">
                            {afterAction.recommendations?.map((item, idx) => (
                                <li key={`${item}-${idx}`}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </DashboardCard>
            )}
                </>
            ) : null}
        </div>
    );
};
