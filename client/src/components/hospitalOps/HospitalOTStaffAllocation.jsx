import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalOTStaffAllocation = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [form, setForm] = useState({ department: 'Surgery', patient_load: 'High', shift: 'Day' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [allocationSearch, setAllocationSearch] = useState('');
    const [allocationSortBy, setAllocationSortBy] = useState('createdAt');
    const [allocationSortDir, setAllocationSortDir] = useState('desc');

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                return;
            }
            try {
                const allocationQuery = buildQuery({
                    hospitalId,
                    search: allocationSearch,
                    sort_by: allocationSortBy,
                    sort_dir: allocationSortDir
                });
                const res = await apiFetch(`/api/hospital-ops/ot/allocations${allocationQuery}`, { method: 'GET' });
                if (res.ok && isActive) {
                    setHistory(res.data?.data || []);
                }
            } catch (err) {
                // Keep empty history
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [hospitalId, allocationSearch, allocationSortBy, allocationSortDir]);

    const handleAllocate = async () => {
        if (!hospitalId) {
            setResult({ error: 'Hospital not available' });
            return;
        }
        setLoading(true);
        try {
            const res = await apiFetch('/api/hospital-ops/ot/allocations', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    department: form.department,
                    patient_load: form.patient_load,
                    shift: form.shift
                })
            });
            const data = res.data || {};
            if (!res.ok || data.error) {
                setResult({ error: data.error || 'Allocation failed' });
            } else {
                setResult(data);
                setHistory((prev) => [data, ...prev]);
            }
        } catch (err) {
            setResult({ error: 'Allocation failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">OT Staff Allocation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select className="p-2 border rounded" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    <option>Surgery</option>
                    <option>ICU</option>
                    <option>Emergency</option>
                </select>
                <select className="p-2 border rounded" value={form.patient_load} onChange={(e) => setForm({ ...form, patient_load: e.target.value })}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>
                <select className="p-2 border rounded" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                    <option>Day</option>
                    <option>Evening</option>
                    <option>Night</option>
                </select>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search allocations"
                    value={allocationSearch}
                    onChange={(e) => setAllocationSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={allocationSortBy}
                    onChange={(e) => setAllocationSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="department">Department</option>
                    <option value="patient_load">Patient Load</option>
                    <option value="shift">Shift</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={allocationSortDir}
                    onChange={(e) => setAllocationSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            <button className="bg-purple-600 text-white rounded px-4 py-2" onClick={handleAllocate} disabled={loading}>
                {loading ? 'Allocating...' : 'Allocate Staff'}
            </button>
            {result && (
                <div className="mt-4 border rounded p-3 bg-white/70">
                    {result.error ? (
                        <p className="text-sm text-red-600">{result.error}</p>
                    ) : (
                        <p className="text-sm text-gray-800">{result.allocation_decision || 'Allocation ready.'}</p>
                    )}
                </div>
            )}
            {history.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto pr-2">
                    {history.slice(0, 4).map((item) => (
                        <div key={item._id || item.id} className="border rounded p-2 text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">{item.department}</span> • {item.shift} • {item.patient_load}
                            <div>{item.allocation_decision}</div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
