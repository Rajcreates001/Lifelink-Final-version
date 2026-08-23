import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalOTSurgeryScheduling = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [surgeries, setSurgeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ patient: '', procedure: '', time: '' });
    const [surgerySearch, setSurgerySearch] = useState('');
    const [surgerySortBy, setSurgerySortBy] = useState('createdAt');
    const [surgerySortDir, setSurgerySortDir] = useState('desc');

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setSurgeries([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const surgeryQuery = buildQuery({
                    hospitalId,
                    search: surgerySearch,
                    sort_by: surgerySortBy,
                    sort_dir: surgerySortDir
                });
                const res = await apiFetch(`/api/hospital-ops/ot/surgeries${surgeryQuery}`, { method: 'GET' });
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setSurgeries(data);
                }
            } catch (err) {
                if (isActive) {
                    setSurgeries([]);
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
    }, [hospitalId, surgerySearch, surgerySortBy, surgerySortDir]);

    const handleAdd = async () => {
        if (!form.patient || !form.procedure || !form.time || !hospitalId) return;
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/ot/surgeries', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    patient: form.patient,
                    procedure: form.procedure,
                    time: form.time,
                    status: 'Scheduled'
                })
            });
            if (res.ok) {
                setSurgeries((prev) => [res.data, ...prev]);
                setForm({ patient: '', procedure: '', time: '' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">OT Surgery Scheduling</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <input className="p-2 border rounded" placeholder="Patient" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} />
                <input className="p-2 border rounded" placeholder="Procedure" value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} />
                <input className="p-2 border rounded" placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                <button className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={handleAdd} disabled={submitting}>
                    {submitting ? 'Scheduling...' : 'Schedule'}
                </button>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search surgeries"
                    value={surgerySearch}
                    onChange={(e) => setSurgerySearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={surgerySortBy}
                    onChange={(e) => setSurgerySortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="time">Time</option>
                    <option value="status">Status</option>
                    <option value="patient">Patient</option>
                    <option value="procedure">Procedure</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={surgerySortDir}
                    onChange={(e) => setSurgerySortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {surgeries.map((surgery) => (
                        <div key={surgery._id || surgery.id} className="border rounded p-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-800">{surgery.patient}</p>
                                <p className="text-xs text-gray-500">{surgery.procedure} • {surgery.time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusPill text={surgery.status || 'Scheduled'} color="blue" />
                                <button className="text-xs text-indigo-600" onClick={() => apiFetch(`/api/hospital-ops/ot/surgeries/${surgery._id || surgery.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: 'In Progress' })
                                })}>Start</button>
                                <button className="text-xs text-green-600" onClick={() => apiFetch(`/api/hospital-ops/ot/surgeries/${surgery._id || surgery.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: 'Completed' })
                                })}>Complete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
