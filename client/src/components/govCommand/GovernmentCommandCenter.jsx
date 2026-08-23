import React, { useState } from 'react';
import { impactColor, formatNumber } from './helpers';

export const GovernmentCommandCenter = () => {
    const [overview, setOverview] = useState({ hospitals: 0, ambulances: 0, emergencies: 0 });
    const [decisions, setDecisions] = useState([]);
    const [anomaly, setAnomaly] = useState(null);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const cacheKey = 'gov_command_cache';

    const load = async (withSpinner = false) => {
        const showSpinner = withSpinner === true;
        if (showSpinner) setLoading(true);
        try {
            const [overviewRes, decisionRes, anomalyRes] = await Promise.all([
                apiFetch('/v2/government/command/overview', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
                apiFetch('/v2/government/decision/engine', { method: 'POST' }),
                apiFetch('/v2/government/predictions/anomaly', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
            ]);
            setOverview(overviewRes.ok ? overviewRes.data : { hospitals: 0, ambulances: 0, emergencies: 0 });
            setDecisions(decisionRes.ok ? (decisionRes.data?.decisions || []) : []);
            setAnomaly(anomalyRes.ok ? anomalyRes.data?.prediction : null);
            localStorage.setItem(cacheKey, JSON.stringify({
                overview: overviewRes.ok ? overviewRes.data : { hospitals: 0, ambulances: 0, emergencies: 0 },
                decisions: decisionRes.ok ? (decisionRes.data?.decisions || []) : [],
                anomaly: anomalyRes.ok ? anomalyRes.data?.prediction : null,
            }));

            const counts = overviewRes.ok ? overviewRes.data : null;
            if (counts && counts.hospitals === 0 && counts.ambulances === 0 && counts.emergencies === 0) {
                const seeded = sessionStorage.getItem('gov_seed_done');
                if (!seeded) {
                    sessionStorage.setItem('gov_seed_done', '1');
                    await apiFetch('/v2/government/command/seed', { method: 'POST', body: JSON.stringify({}) });
                    const seededOverview = await apiFetch('/v2/government/command/overview', { method: 'GET' });
                    if (seededOverview.ok) {
                        setOverview(seededOverview.data);
                    }
                }
            }
        } catch (err) {
            // preserve cached data on refresh errors
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await apiFetch('/v2/government/command/seed', { method: 'POST', body: JSON.stringify({}) });
            await load();
        } finally {
            setSeeding(false);
        }
    };

    useEffect(() => {
        let hasCache = false;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                setOverview(parsed.overview || { hospitals: 0, ambulances: 0, emergencies: 0 });
                setDecisions(parsed.decisions || []);
                setAnomaly(parsed.anomaly || null);
                setLoading(false);
                hasCache = true;
            }
        } catch (error) {
            // ignore cache errors
        }
        load(!hasCache);
    }, []);

    return (
        <div className="space-y-6">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Command Overview</p>
                        <p className="text-lg font-bold text-slate-800">System snapshot with AI decisions</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={() => load(true)}>
                            Refresh
                        </button>
                        <button className="px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60" onClick={handleSeed} disabled={seeding}>
                            {seeding ? 'Seeding...' : 'Seed Data'}
                        </button>
                    </div>
                </div>
            </DashboardCard>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <DashboardCard className="animate-fade-in-up delay-200">
                        <p className="text-xs font-bold uppercase text-slate-500">Hospitals</p>
                        <p className="text-3xl font-black text-slate-900">{formatNumber(overview.hospitals)}</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-300">
                        <p className="text-xs font-bold uppercase text-slate-500">Ambulances</p>
                        <p className="text-3xl font-black text-slate-900">{formatNumber(overview.ambulances)}</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-400">
                        <p className="text-xs font-bold uppercase text-slate-500">Active Emergencies</p>
                        <p className="text-3xl font-black text-slate-900">{formatNumber(overview.emergencies)}</p>
                    </DashboardCard>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard className="animate-chart-entrance chart-delay-2">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">Decision Engine</h3>
                        <ExportButton data={decisions} filename="gov_decisions" label="Export" columns={['event','location','reason','suggested_action','impact']} columnLabels={{ event: 'Event', location: 'Location', reason: 'Reason', suggested_action: 'Action', impact: 'Impact' }} />
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
                                            <p className="text-xs text-slate-500">{item.location || 'Zone'} · {item.reason}</p>
                                        </div>
                                        <StatusPill text={item.impact} color={impactColor(item.impact)} />
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2">{item.suggested_action}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardCard>
                <DashboardCard className="animate-chart-entrance chart-delay-3">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Anomaly Intelligence</h3>
                    {!anomaly ? (
                        <p className="text-sm text-slate-500">No anomalies detected in the last 24 hours.</p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">Detected spikes at:</p>
                            <div className="flex flex-wrap gap-2">
                                {anomaly.anomaly_hours?.map((hour) => (
                                    <span key={hour} className="px-2 py-1 text-xs rounded-full bg-rose-100 text-rose-700 font-semibold">
                                        {hour}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </DashboardCard>
            </div>

            {/* Reports Section */}
            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Download Reports</h3>
                        <p className="text-sm text-slate-500">Generate and download PDF reports.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <ReportDownloadButton
                        endpoint="/api/reports/government/incident"
                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}
                        filename="gov_incident_report.pdf"
                        label="Incident Report"
                        variant="primary"
                        size="sm"
                        icon="fa-file-alt"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/government/resource"
                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}
                        filename="gov_resource_report.pdf"
                        label="Resource Report"
                        variant="secondary"
                        size="sm"
                        icon="fa-boxes"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/simulation/after-action"
                        data={{ summary: { total: 0 }, recommendations: [] }}
                        filename="gov_simulation_report.pdf"
                        label="Simulation Report"
                        variant="secondary"
                        size="sm"
                        icon="fa-atom"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/hospital/daily-ops"
                        data={{ hospital_id: "national", report_date: new Date().toISOString().split("T")[0] }}
                        filename="gov_daily_ops_report.pdf"
                        label="Daily Ops"
                        variant="ghost"
                        size="sm"
                        icon="fa-calendar-day"
                    />
                </div>
            </DashboardCard>
        </div>
    );
};
