import React, { useState } from 'react';

export const GovernmentVerificationCenter = ({ subRole }) => {
    const [pending, setPending] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [pendingPage, setPendingPage] = useState(1);
    const [verifiedHospitalPage, setVerifiedHospitalPage] = useState(1);
    const [waitingHospitalPage, setWaitingHospitalPage] = useState(1);
    const [verifiedAmbulancePage, setVerifiedAmbulancePage] = useState(1);
    const [waitingAmbulancePage, setWaitingAmbulancePage] = useState(1);
    const isDistrict = String(subRole || '').toLowerCase() === 'district_admin';
    const cacheKey = 'gov_verification_cache';

    const loadAll = async (withSpinner = false) => {
        if (withSpinner) setLoading(true);
        try {
            const [hospitalRes, ambulanceRes, pendingRes] = await Promise.all([
                apiFetch(`/v2/government/resources/hospitals?limit=${VERIFICATION_FETCH_LIMIT}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
                apiFetch(`/v2/government/resources/ambulances?limit=${VERIFICATION_FETCH_LIMIT}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
                isDistrict ? apiFetch('/v2/government/verification/pending', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }) : Promise.resolve(null),
            ]);
            setHospitals(hospitalRes.ok ? (hospitalRes.data?.data || []) : []);
            setAmbulances(ambulanceRes.ok ? (ambulanceRes.data?.data || []) : []);
            setPending(isDistrict && pendingRes?.ok ? (pendingRes.data?.data || []) : []);
            localStorage.setItem(cacheKey, JSON.stringify({
                hospitals: hospitalRes.ok ? (hospitalRes.data?.data || []) : [],
                ambulances: ambulanceRes.ok ? (ambulanceRes.data?.data || []) : [],
                pending: isDistrict && pendingRes?.ok ? (pendingRes.data?.data || []) : [],
            }));
        } finally {
            if (withSpinner) setLoading(false);
        }
    };

    useEffect(() => {
        let hasCache = false;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                setHospitals(parsed.hospitals || []);
                setAmbulances(parsed.ambulances || []);
                setPending(parsed.pending || []);
                setLoading(false);
                hasCache = true;
            }
        } catch (error) {
            // ignore cache failures
        }
        setPendingPage(1);
        setVerifiedHospitalPage(1);
        setWaitingHospitalPage(1);
        setVerifiedAmbulancePage(1);
        setWaitingAmbulancePage(1);
        loadAll(!hasCache);
    }, [isDistrict]);

    const approveRequest = async (id) => {
        const res = await apiFetch(`/v2/government/verification/${id}/approve`, { method: 'POST' });
        if (res.ok) {
            await loadAll(true);
        }
    };

    const rejectRequest = async (id) => {
        const res = await apiFetch(`/v2/government/verification/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ notes: 'Rejected by compliance team.' }),
        });
        if (res.ok) {
            await loadAll(true);
        }
    };

    const pendingIndex = useMemo(() => new Set(pending.map((item) => `${item.entity_type}:${item.entity_id}`)), [pending]);
    const hospitalMap = useMemo(() => new Map(hospitals.map((item) => [item.id, item])), [hospitals]);
    const ambulanceMap = useMemo(() => new Map(ambulances.map((item) => [item.id, item])), [ambulances]);
    const pendingDetails = useMemo(() => (
        pending.map((item) => {
            const entity = item.entity_type === 'hospital'
                ? hospitalMap.get(item.entity_id)
                : ambulanceMap.get(item.entity_id);
            return { ...item, entity };
        })
    ), [pending, hospitalMap, ambulanceMap]);

    const verifiedHospitals = useMemo(() => hospitals.filter((item) => item.verified), [hospitals]);
    const waitingHospitals = useMemo(() => hospitals.filter((item) => !item.verified), [hospitals]);
    const verifiedAmbulances = useMemo(() => ambulances.filter((item) => item.verified), [ambulances]);
    const waitingAmbulances = useMemo(() => ambulances.filter((item) => !item.verified), [ambulances]);

    const visiblePending = useMemo(() => pendingDetails.slice(0, pendingPage * VERIFICATION_PAGE_SIZE), [pendingDetails, pendingPage]);
    const visibleVerifiedHospitals = useMemo(
        () => verifiedHospitals.slice(0, Math.min(VERIFICATION_RENDER_LIMIT, verifiedHospitalPage * VERIFICATION_PAGE_SIZE)),
        [verifiedHospitals, verifiedHospitalPage]
    );
    const visibleWaitingHospitals = useMemo(
        () => waitingHospitals.slice(0, Math.min(VERIFICATION_RENDER_LIMIT, waitingHospitalPage * VERIFICATION_PAGE_SIZE)),
        [waitingHospitals, waitingHospitalPage]
    );
    const visibleVerifiedAmbulances = useMemo(
        () => verifiedAmbulances.slice(0, Math.min(VERIFICATION_RENDER_LIMIT, verifiedAmbulancePage * VERIFICATION_PAGE_SIZE)),
        [verifiedAmbulances, verifiedAmbulancePage]
    );
    const visibleWaitingAmbulances = useMemo(
        () => waitingAmbulances.slice(0, Math.min(VERIFICATION_RENDER_LIMIT, waitingAmbulancePage * VERIFICATION_PAGE_SIZE)),
        [waitingAmbulances, waitingAmbulancePage]
    );

    const statusFor = (entity, type) => {
        if (entity?.verified) return { label: 'Verified', color: 'green' };
        const key = `${type}:${entity?.id}`;
        if (pendingIndex.has(key)) return { label: 'Pending', color: 'yellow' };
        return { label: 'Unverified', color: 'gray' };
    };

    const openDetails = (entity, type, request = null) => {
        if (!entity && !request) return;
        setSelected({ type, entity, request });
    };

    return (
        <div className="space-y-6">
            <DashboardCard>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Verification Center</h3>
                        <p className="text-xs text-slate-500">Track pending requests and verified assets.</p>
                    </div>
                    <button className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={() => loadAll(true)}>
                        Refresh
                    </button>
                </div>
            </DashboardCard>

            {isDistrict && (
                <DashboardCard>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">Pending Approvals</h3>
                        <ExportButton data={pending} filename="gov_pending_approvals" label="Export" columns={['entity_id','entity_type','notes','createdAt']} columnLabels={{ entity_id: 'Entity ID', entity_type: 'Type', notes: 'Notes', createdAt: 'Created' }} formatValue={(v, col) => col === 'createdAt' && v ? new Date(v).toLocaleString() : undefined} />
                    </div>
                    {loading ? (
                        <LoadingSpinner />
                    ) : pending.length === 0 ? (
                        <p className="text-sm text-slate-500">No pending verifications.</p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {visiblePending.map((item) => {
                                const entityLabel = item.entity?.name || item.entity?.code || item.entity_id;
                                const status = statusFor(item.entity || { id: item.entity_id }, item.entity_type);
                                return (
                                    <div key={item.id} className="border rounded-lg p-4 bg-white hover:border-slate-300 transition">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-800">{entityLabel}</p>
                                                <p className="text-xs text-slate-500">{item.entity_type} · {item.entity_id}</p>
                                            </div>
                                            <StatusPill text={status.label} color={status.color} />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">{item.notes || 'No notes provided.'}</p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <button className="text-xs font-semibold text-slate-700" onClick={() => openDetails(item.entity, item.entity_type, item)}>
                                                View details
                                            </button>
                                            <button className="text-xs font-semibold text-green-600" onClick={() => approveRequest(item.id)}>
                                                Approve
                                            </button>
                                            <button className="text-xs font-semibold text-rose-600" onClick={() => rejectRequest(item.id)}>
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {pendingDetails.length > visiblePending.length && (
                        <div className="mt-4 flex justify-center">
                            <button
                                className="text-xs font-semibold text-slate-600 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
                                onClick={() => setPendingPage((prev) => prev + 1)}
                            >
                                Load more
                            </button>
                        </div>
                    )}
                </DashboardCard>
            )}

            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Verified Hospitals</h3>
                    <ExportButton data={verifiedHospitals} filename="gov_verified_hospitals" label="Export" columns={['name','city','state','beds_available','beds_total','load_score']} columnLabels={{ name: 'Name', city: 'City', state: 'State', beds_available: 'Beds Available', beds_total: 'Total Beds', load_score: 'Load Score' }} formatValue={(v, col) => col === 'load_score' && v ? `${Math.round(v * 100)}%` : undefined} />
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : verifiedHospitals.length === 0 ? (
                    <p className="text-sm text-slate-500">No verified hospitals yet.</p>
                ) : (
                    <div className="max-h-[320px] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleVerifiedHospitals.map((item) => (
                            <div
                                key={item.id}
                                className="border rounded-lg p-4 bg-white hover:border-slate-300 transition cursor-pointer"
                                onClick={() => openDetails(item, 'hospital')}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        <p className="text-xs text-slate-500">{item.city}, {item.state}</p>
                                    </div>
                                    <StatusPill text="Verified" color="green" />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Beds: {item.beds_available}/{item.beds_total} · Load {Math.round((item.load_score || 0) * 100)}%</p>
                            </div>
                        ))}
                    </div>
                )}
                {verifiedHospitals.length > visibleVerifiedHospitals.length && (
                    <div className="mt-3 flex justify-center">
                        <button
                            className="text-xs font-semibold text-slate-600 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
                            onClick={() => setVerifiedHospitalPage((prev) => prev + 1)}
                        >
                            Load more
                        </button>
                    </div>
                )}
            </DashboardCard>

            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Hospitals Waiting for Verification</h3>
                    <ExportButton data={waitingHospitals} filename="gov_hospitals_waiting" label="Export" columns={['name','city','state','beds_available','beds_total']} columnLabels={{ name: 'Name', city: 'City', state: 'State', beds_available: 'Beds Available', beds_total: 'Total Beds' }} />
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : waitingHospitals.length === 0 ? (
                    <p className="text-sm text-slate-500">All hospitals are verified.</p>
                ) : (
                    <div className="max-h-[320px] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleWaitingHospitals.map((item) => {
                            const status = statusFor(item, 'hospital');
                            return (
                                <div
                                    key={item.id}
                                    className="border rounded-lg p-4 bg-white hover:border-slate-300 transition cursor-pointer"
                                    onClick={() => openDetails(item, 'hospital')}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.city}, {item.state}</p>
                                        </div>
                                        <StatusPill text={status.label} color={status.color} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Beds: {item.beds_available}/{item.beds_total} · Load {Math.round((item.load_score || 0) * 100)}%</p>
                                </div>
                            );
                        })}
                    </div>
                )}
                {waitingHospitals.length > visibleWaitingHospitals.length && (
                    <div className="mt-3 flex justify-center">
                        <button
                            className="text-xs font-semibold text-slate-600 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
                            onClick={() => setWaitingHospitalPage((prev) => prev + 1)}
                        >
                            Load more
                        </button>
                    </div>
                )}
            </DashboardCard>

            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Verified Ambulances</h3>
                    <ExportButton data={verifiedAmbulances} filename="gov_verified_ambulances" label="Export" columns={['code','status','lat','lng']} columnLabels={{ code: 'Code', status: 'Status', lat: 'Latitude', lng: 'Longitude' }} formatValue={(v, col) => (col === 'lat' || col === 'lng') && v ? v.toFixed(3) : undefined} />
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : verifiedAmbulances.length === 0 ? (
                    <p className="text-sm text-slate-500">No verified ambulances yet.</p>
                ) : (
                    <div className="max-h-[320px] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleVerifiedAmbulances.map((item) => (
                            <div
                                key={item.id}
                                className="border rounded-lg p-4 bg-white hover:border-slate-300 transition cursor-pointer"
                                onClick={() => openDetails(item, 'ambulance')}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.code}</p>
                                        <p className="text-xs text-slate-500">Status: {item.status}</p>
                                    </div>
                                    <StatusPill text="Verified" color="green" />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Lat {item.lat?.toFixed(3)} · Lng {item.lng?.toFixed(3)}</p>
                            </div>
                        ))}
                    </div>
                )}
                {verifiedAmbulances.length > visibleVerifiedAmbulances.length && (
                    <div className="mt-3 flex justify-center">
                        <button
                            className="text-xs font-semibold text-slate-600 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
                            onClick={() => setVerifiedAmbulancePage((prev) => prev + 1)}
                        >
                            Load more
                        </button>
                    </div>
                )}
            </DashboardCard>

            <DashboardCard>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Ambulances Waiting for Verification</h3>
                    <ExportButton data={waitingAmbulances} filename="gov_ambulances_waiting" label="Export" columns={['code','status','lat','lng']} columnLabels={{ code: 'Code', status: 'Status', lat: 'Latitude', lng: 'Longitude' }} formatValue={(v, col) => (col === 'lat' || col === 'lng') && v ? v.toFixed(3) : undefined} />
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : waitingAmbulances.length === 0 ? (
                    <p className="text-sm text-slate-500">All ambulances are verified.</p>
                ) : (
                    <div className="max-h-[320px] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleWaitingAmbulances.map((item) => {
                            const status = statusFor(item, 'ambulance');
                            return (
                                <div
                                    key={item.id}
                                    className="border rounded-lg p-4 bg-white hover:border-slate-300 transition cursor-pointer"
                                    onClick={() => openDetails(item, 'ambulance')}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">{item.code}</p>
                                            <p className="text-xs text-slate-500">Status: {item.status}</p>
                                        </div>
                                        <StatusPill text={status.label} color={status.color} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Lat {item.lat?.toFixed(3)} · Lng {item.lng?.toFixed(3)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
                {waitingAmbulances.length > visibleWaitingAmbulances.length && (
                    <div className="mt-3 flex justify-center">
                        <button
                            className="text-xs font-semibold text-slate-600 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
                            onClick={() => setWaitingAmbulancePage((prev) => prev + 1)}
                        >
                            Load more
                        </button>
                    </div>
                )}
            </DashboardCard>

            {selected && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Verification Detail</p>
                                <h4 className="text-lg font-bold text-slate-900">{selected.entity?.name || selected.entity?.code || selected.request?.entity_id}</h4>
                            </div>
                            <button className="text-slate-400 hover:text-slate-700" onClick={() => setSelected(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                                <div>
                                    <p className="text-xs uppercase text-slate-400">Entity Type</p>
                                    <p className="font-semibold">{selected.type}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-slate-400">Entity ID</p>
                                    <p className="font-semibold">{selected.entity?.id || selected.request?.entity_id}</p>
                                </div>
                                {selected.type === 'hospital' && selected.entity && (
                                    <>
                                        <div>
                                            <p className="text-xs uppercase text-slate-400">Location</p>
                                            <p className="font-semibold">{selected.entity.city}, {selected.entity.state}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-slate-400">Beds</p>
                                            <p className="font-semibold">{selected.entity.beds_available}/{selected.entity.beds_total}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-slate-400">Load Score</p>
                                            <p className="font-semibold">{Math.round((selected.entity.load_score || 0) * 100)}%</p>
                                        </div>
                                    </>
                                )}
                                {selected.type === 'ambulance' && selected.entity && (
                                    <>
                                        <div>
                                            <p className="text-xs uppercase text-slate-400">Status</p>
                                            <p className="font-semibold">{selected.entity.status}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-slate-400">Coordinates</p>
                                            <p className="font-semibold">{selected.entity.lat?.toFixed(3)}, {selected.entity.lng?.toFixed(3)}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {selected.request?.notes && (
                                <div className="bg-slate-50 border rounded-lg p-3 text-sm text-slate-600">
                                    <p className="text-xs uppercase text-slate-400">Request Notes</p>
                                    <p className="mt-1">{selected.request.notes}</p>
                                </div>
                            )}
                            {isDistrict && selected.request && (
                                <div className="flex gap-2">
                                    <button className="px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded" onClick={() => approveRequest(selected.request.id)}>
                                        Approve
                                    </button>
                                    <button className="px-3 py-2 text-xs font-bold bg-rose-600 text-white rounded" onClick={() => rejectRequest(selected.request.id)}>
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
