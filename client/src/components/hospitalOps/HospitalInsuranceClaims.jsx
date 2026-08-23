import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalInsuranceClaims = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ invoiceId: '', insurer: '', amount: '' });
    const [claimSearch, setClaimSearch] = useState('');
    const [claimSortBy, setClaimSortBy] = useState('createdAt');
    const [claimSortDir, setClaimSortDir] = useState('desc');

    const load = async () => {
        if (!hospitalId) return;
        setLoading(true);
        try {
            const claimQuery = buildQuery({
                hospitalId,
                search: claimSearch,
                sort_by: claimSortBy,
                sort_dir: claimSortDir
            });
            const res = await apiFetch(`/api/hospital-ops/finance/claims${claimQuery}`, { method: 'GET' });
            setClaims(res.ok ? (res.data?.data || []) : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [hospitalId, claimSearch, claimSortBy, claimSortDir]);

    const createClaim = async () => {
        if (!hospitalId || !form.invoiceId || !form.amount) return;
        const res = await apiFetch('/api/hospital-ops/finance/claims', {
            method: 'POST',
            body: JSON.stringify({ hospitalId, invoiceId: form.invoiceId, insurer: form.insurer, amount: Number(form.amount) })
        });
        if (res.ok) {
            setClaims((prev) => [res.data, ...prev]);
            setForm({ invoiceId: '', insurer: '', amount: '' });
        }
    };

    const updateClaim = async (id, status) => {
        await apiFetch(`/api/hospital-ops/finance/claims/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        setClaims((prev) => prev.map((claim) => (claim._id || claim.id) === id ? { ...claim, status } : claim));
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Insurance Claims</h3>
                <ExportButton data={claims} filename="hospital_insurance_claims" label="Export" columns={['insurer','invoiceId','amount','status','createdAt']} columnLabels={{ insurer: 'Insurer', invoiceId: 'Invoice', amount: 'Amount', status: 'Status', createdAt: 'Date' }} formatValue={(v, col) => col === 'createdAt' && v ? new Date(v).toLocaleDateString() : col === 'amount' && v ? `₹${v}` : undefined} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <input className="p-2 border rounded" placeholder="Invoice ID" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} />
                <input className="p-2 border rounded" placeholder="Insurer" value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} />
                <input className="p-2 border rounded" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <button className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={createClaim}>Create Claim</button>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search claims"
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={claimSortBy}
                    onChange={(e) => setClaimSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="amount">Amount</option>
                    <option value="status">Status</option>
                    <option value="insurer">Insurer</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={claimSortDir}
                    onChange={(e) => setClaimSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {claims.length === 0 ? (
                        <div className="text-sm text-gray-500">No claims filed.</div>
                    ) : (
                        claims.map((claim) => (
                            <div key={claim._id || claim.id} className="border rounded p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{claim.insurer || 'Insurer'}</p>
                                    <p className="text-xs text-gray-500">Invoice {claim.invoiceId} • ₹{claim.amount}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill text={claim.status || 'Submitted'} color={claim.status === 'Approved' ? 'green' : 'yellow'} />
                                    <button className="text-xs text-green-600 hover:text-green-800 transition-colors duration-150" onClick={() => updateClaim(claim._id || claim.id, 'Approved')}>Approve</button>
                                    <button className="text-xs text-red-600 hover:text-red-800 transition-colors duration-150" onClick={() => updateClaim(claim._id || claim.id, 'Rejected')}>Reject</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </DashboardCard>
    );
};
