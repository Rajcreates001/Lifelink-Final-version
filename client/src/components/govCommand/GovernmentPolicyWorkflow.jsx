import React, { useState } from 'react';
import { impactColor } from './helpers';

export const GovernmentPolicyWorkflow = () => {
    const [decisions, setDecisions] = useState([]);
    const [anomaly, setAnomaly] = useState(null);
    const [policyActions, setPolicyActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [policyPage, setPolicyPage] = useState(1);
    const cacheKey = 'gov_policy_cache';
    const seedKey = 'gov_policy_seeded';

    const load = async (withSpinner = false) => {
        const showSpinner = withSpinner === true;
        if (showSpinner) {
            setLoading(true);
        }
        try {
            const [decisionRes, anomalyRes] = await Promise.all([
                apiFetch('/v2/government/decision/engine', { method: 'POST', timeoutMs: 12000 }),
                apiFetch('/v2/government/predictions/anomaly', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            ]);
            setDecisions(decisionRes.ok ? (decisionRes.data?.decisions || []) : []);
            setAnomaly(anomalyRes.ok ? anomalyRes.data?.prediction : null);
            const policyRes = await apiFetch(`/v2/government/policy/actions?limit=${POLICY_RENDER_LIMIT}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true });
            let nextPolicyItems = policyRes.ok ? (policyRes.data?.data || []) : [];
            setPolicyActions(nextPolicyItems);

            if (!nextPolicyItems.length && (decisionRes.data?.decisions || []).length && !sessionStorage.getItem(seedKey)) {
                sessionStorage.setItem(seedKey, '1');
                const seedPayloads = (decisionRes.data?.decisions || []).slice(0, 2).map((item) => ({
                    title: item.event,
                    action: item.suggested_action,
                    impact: item.impact,
                    status: 'Draft',
                }));
                const created = await Promise.all(seedPayloads.map((payload) => (
                    apiFetch('/v2/government/policy/actions', { method: 'POST', body: JSON.stringify(payload) })
                )));
                const createdItems = created.filter((res) => res.ok).map((res) => res.data);
                if (createdItems.length) {
                    nextPolicyItems = createdItems;
                    setPolicyActions(createdItems);
                }
            }

            sessionStorage.setItem(cacheKey, JSON.stringify({
                decisions: decisionRes.ok ? (decisionRes.data?.decisions || []) : [],
                anomaly: anomalyRes.ok ? anomalyRes.data?.prediction : null,
                policyActions: nextPolicyItems,
            }));
        } finally {
            if (showSpinner) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                setDecisions(parsed.decisions || []);
                setAnomaly(parsed.anomaly || null);
                setPolicyActions(parsed.policyActions || []);
                setLoading(false);
            }
        } catch (error) {
            return;
        }
        setPolicyPage(1);
        load(true);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            load(false);
        }, POLICY_REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    const addPolicyAction = async (decision) => {
        const res = await apiFetch('/v2/government/policy/actions', {
            method: 'POST',
            body: JSON.stringify({
                title: decision.event,
                action: decision.suggested_action,
                impact: decision.impact,
                status: 'Draft',
            }),
        });
        if (res.ok) {
            setPolicyActions((prev) => [res.data, ...prev]);
        }
    };

    const updatePolicyStatus = async (id, status) => {
        const res = await apiFetch(`/v2/government/policy/actions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            setPolicyActions((prev) => prev.map((item) => (item.id === id ? res.data : item)));
        }
    };

    const visiblePolicyActions = useMemo(
        () => policyActions.slice(0, Math.min(POLICY_RENDER_LIMIT, policyPage * POLICY_PAGE_SIZE)),
        [policyActions, policyPage]
    );

    return (
        <div className="space-y-6">
            <DashboardCard>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Policy Workflow</p>
                        <p className="text-lg font-bold text-slate-800">Translate AI insights into governance actions.</p>
                    </div>
                    <button className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={() => load(true)}>
                        Refresh
                    </button>
                </div>
            </DashboardCard>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DashboardCard>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-slate-900">Decision-to-Policy</h3>
                            <ExportButton data={decisions} filename="gov_decision_to_policy" label="Export" columns={['event','reason','suggested_action','impact']} columnLabels={{ event: 'Event', reason: 'Reason', suggested_action: 'Action', impact: 'Impact' }} />
                        </div>
                        {decisions.length === 0 ? (
                            <p className="text-sm text-slate-500">No decisions generated yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {decisions.map((item, idx) => (
                                    <div key={`${item.event}-${idx}`} className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-800">{item.event}</p>
                                                <p className="text-xs text-slate-500">{item.reason}</p>
                                            </div>
                                            <StatusPill text={item.impact} color={impactColor(item.impact)} />
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-sm text-slate-600">{item.suggested_action}</p>
                                            <button className="text-xs font-semibold text-indigo-600" onClick={() => addPolicyAction(item)}>
                                                Create Policy Action
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardCard>
                    <DashboardCard>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Anomaly Watch</h3>
                        {!anomaly ? (
                            <p className="text-sm text-slate-500">No anomalies detected.</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600">Anomalous hours flagged:</p>
                                <div className="flex flex-wrap gap-2">
                                    {anomaly.anomaly_hours?.map((hour) => (
                                        <span key={hour} className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-semibold">
                                            {hour}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </DashboardCard>
                </div>
            )}
            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Policy Workflow Board</h3>
                    <ExportButton data={policyActions} filename="gov_policy_workflow" label="Export" columns={['title','action','impact','status']} columnLabels={{ title: 'Title', action: 'Action', impact: 'Impact', status: 'Status' }} />
                </div>
                    {policyActions.length === 0 ? (
                    <p className="text-sm text-slate-500">No policy actions created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {visiblePolicyActions.map((item) => (
                            <div key={item.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.title}</p>
                                        <p className="text-xs text-slate-500">{item.action}</p>
                                    </div>
                                    <StatusPill text={item.status} color={item.status === 'Approved' ? 'green' : 'yellow'} />
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button className="text-xs text-indigo-600" onClick={() => updatePolicyStatus(item.id, 'In Review')}>
                                        Send to Review
                                    </button>
                                    <button className="text-xs text-green-600" onClick={() => updatePolicyStatus(item.id, 'Approved')}>
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                    {policyActions.length > visiblePolicyActions.length && (
                        <div className="mt-3 flex justify-center">
                            <button
                                className="text-xs font-semibold text-slate-600 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
                                onClick={() => setPolicyPage((prev) => prev + 1)}
                            >
                                Load more
                            </button>
                        </div>
                    )}
            </DashboardCard>
        </div>
    );
};
