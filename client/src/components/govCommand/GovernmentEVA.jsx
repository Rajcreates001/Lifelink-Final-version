import React, { useState } from 'react';

export const GovernmentEVA = () => {
    const [query, setQuery] = useState('');
    const [execute, setExecute] = useState(false);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAsk = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const res = await apiFetch('/v2/government/ai/ask', {
                method: 'POST',
                body: JSON.stringify({ query, execute }),
            });
            setResponse(res.ok ? res.data : null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <DashboardCard>
                <h3 className="text-lg font-bold text-slate-900 mb-2">EVA Assistant</h3>
                <p className="text-sm text-slate-500 mb-4">Ask EVA for operational guidance. Enable execute to log a decision.</p>
                <form onSubmit={handleAsk} className="space-y-3">
                    <textarea
                        className="w-full border rounded-lg p-3 text-sm"
                        rows="3"
                        placeholder="Ask EVA about resource allocation, hotspots, or readiness."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={execute} onChange={(event) => setExecute(event.target.checked)} />
                        Execute decision in command log
                    </label>
                    <button className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded" disabled={loading}>
                        {loading ? 'Thinking...' : 'Ask EVA'}
                    </button>
                </form>
            </DashboardCard>

            {response?.decision && (
                <DashboardCard>
                    <h4 className="text-md font-bold text-slate-900 mb-2">EVA Recommendation</h4>
                    <div className="space-y-2">
                        <p className="text-sm"><span className="font-semibold">Event:</span> {response.decision.event}</p>
                        <p className="text-sm"><span className="font-semibold">Reason:</span> {response.decision.reason}</p>
                        <p className="text-sm"><span className="font-semibold">Suggested Action:</span> {response.decision.suggested_action}</p>
                        <p className="text-sm"><span className="font-semibold">Impact:</span> {response.decision.impact}</p>
                        <p className="text-xs text-slate-500">Executed: {response.executed ? 'Yes' : 'No'}</p>
                    </div>
                </DashboardCard>
            )}

            {response?.results && (
                <DashboardCard>
                    <h4 className="text-md font-bold text-slate-900 mb-2">Search Results</h4>
                    <div className="space-y-3 text-sm text-slate-600">
                        {response.results.hospitals?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500">Hospitals</p>
                                {response.results.hospitals.map((item) => (
                                    <div key={item.id}>{item.name} · {item.city}</div>
                                ))}
                            </div>
                        )}
                        {response.results.ambulances?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500">Ambulances</p>
                                {response.results.ambulances.map((item) => (
                                    <div key={item.id}>{item.code} · {item.status}</div>
                                ))}
                            </div>
                        )}
                        {response.results.emergencies?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500">Emergencies</p>
                                {response.results.emergencies.map((item) => (
                                    <div key={item.id}>{item.type} · {item.severity}</div>
                                ))}
                            </div>
                        )}
                        {response.results.disasters?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500">Disasters</p>
                                {response.results.disasters.map((item) => (
                                    <div key={item.id}>{item.type} · {item.zone}</div>
                                ))}
                            </div>
                        )}
                        {response.results.policies?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500">Policies</p>
                                {response.results.policies.map((item) => (
                                    <div key={item.id}>{item.title} · {item.status}</div>
                                ))}
                            </div>
                        )}
                        {response.results.knowledge?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500">Knowledge Base</p>
                                {response.results.knowledge.map((item) => (
                                    <div key={item.id}>{item.title} · {item.module}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </DashboardCard>
            )}
        </div>
    );
};
