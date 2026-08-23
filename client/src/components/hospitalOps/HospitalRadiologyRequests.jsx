import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalRadiologyRequests = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ patient: '', scan: '' });
    const [requestSearch, setRequestSearch] = useState('');
    const [requestSortBy, setRequestSortBy] = useState('createdAt');
    const [requestSortDir, setRequestSortDir] = useState('desc');

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setRequests([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const requestQuery = buildQuery({
                    hospitalId,
                    search: requestSearch,
                    sort_by: requestSortBy,
                    sort_dir: requestSortDir
                });
                const res = await apiFetch(`/api/hospital-ops/radiology/requests${requestQuery}`, { method: 'GET' });
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setRequests(data);
                }
            } catch (err) {
                if (isActive) {
                    setRequests([]);
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
    }, [hospitalId, requestSearch, requestSortBy, requestSortDir]);

    const updateStatus = async (id, status) => {
        setRequests((prev) => prev.map((item) => (item._id || item.id) === id ? { ...item, status } : item));
        try {
            await apiFetch(`/api/hospital-ops/radiology/requests/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        } catch (err) {
            // Keep optimistic update
        }
    };

    const handleAdd = async () => {
        if (!hospitalId || !form.patient || !form.scan) return;
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/radiology/requests', {
                method: 'POST',
                body: JSON.stringify({ hospitalId, patient: form.patient, scan: form.scan, status: 'Queued' })
            });
            if (res.ok) {
                setRequests((prev) => [res.data, ...prev]);
                setForm({ patient: '', scan: '' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Scan Requests</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <input className="p-2 border rounded" placeholder="Patient" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} />
                <input className="p-2 border rounded" placeholder="Scan Type" value={form.scan} onChange={(e) => setForm({ ...form, scan: e.target.value })} />
                <button className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={handleAdd} disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Request'}
                </button>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search requests"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={requestSortBy}
                    onChange={(e) => setRequestSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="patient">Patient</option>
                    <option value="scan">Scan</option>
                    <option value="status">Status</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={requestSortDir}
                    onChange={(e) => setRequestSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {requests.map((req) => (
                        <div key={req._id || req.id} className="flex items-center justify-between border rounded p-3">
                            <div>
                                <p className="font-semibold text-gray-800">{req.patient}</p>
                                <p className="text-xs text-gray-500">{req.scan}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusPill text={req.status || 'Queued'} color={req.status === 'Completed' ? 'green' : 'yellow'} />
                                <button className="text-xs text-indigo-600" onClick={() => updateStatus(req._id || req.id, 'Completed')}>
                                    Mark Done
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
