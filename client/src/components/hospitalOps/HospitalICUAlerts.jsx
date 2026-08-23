import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalICUAlerts = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alertSearch, setAlertSearch] = useState('');
    const [alertSortBy, setAlertSortBy] = useState('createdAt');
    const [alertSortDir, setAlertSortDir] = useState('desc');

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setAlerts([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const alertQuery = buildQuery({
                    hospitalId,
                    search: alertSearch,
                    sort_by: alertSortBy,
                    sort_dir: alertSortDir
                });
                const res = await apiFetch(`/api/hospital-ops/icu/alerts${alertQuery}`, { method: 'GET' });
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setAlerts(data);
                }
            } catch (err) {
                if (isActive) {
                    setAlerts([]);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [hospitalId, alertSearch, alertSortBy, alertSortDir]);

    const updateStatus = async (id, status) => {
        setAlerts((prev) => prev.map((alert) => (alert._id || alert.id) === id ? { ...alert, status } : alert));
        try {
            await apiFetch(`/api/hospital-ops/icu/alerts/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        } catch (err) {
            // Keep optimistic update
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ICU Critical Alerts</h3>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search alerts"
                    value={alertSearch}
                    onChange={(e) => setAlertSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={alertSortBy}
                    onChange={(e) => setAlertSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="severity">Severity</option>
                    <option value="status">Status</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={alertSortDir}
                    onChange={(e) => setAlertSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {alerts.map((alert) => (
                        <div key={alert._id || alert.id} className="flex items-center justify-between border rounded p-3">
                            <div>
                                <p className="font-semibold text-gray-800">{alert.message}</p>
                                <p className="text-xs text-gray-500">{alert.status || 'Active'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusPill text={alert.severity} color={alert.severity === 'Critical' ? 'red' : 'yellow'} />
                                <button className="text-xs text-indigo-600" onClick={() => updateStatus(alert._id || alert.id, 'Resolved')}>
                                    Resolve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
