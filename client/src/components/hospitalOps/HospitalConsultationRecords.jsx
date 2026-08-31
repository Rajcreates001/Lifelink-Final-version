import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill, ProgressBar } from '../Common';

export const HospitalConsultationRecords = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [records, setRecords] = useState([]);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ patient: '', doctor: '', notes: '', followUpDate: '' });
    const [consultSearch, setConsultSearch] = useState('');
    const [consultSortBy, setConsultSortBy] = useState('createdAt');
    const [consultSortDir, setConsultSortDir] = useState('desc');

    const refreshInsights = async () => {
        if (!hospitalId) return;
        const res = await apiFetch(`/api/hospital-ops/opd/consultations/insights?hospitalId=${hospitalId}`, { method: 'GET' });
        setInsights(res.ok ? res.data : null);
    };

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setRecords([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const consultQuery = buildQuery({
                    hospitalId,
                    search: consultSearch,
                    sort_by: consultSortBy,
                    sort_dir: consultSortDir
                });
                const [res, insightRes] = await Promise.all([
                    apiFetch(`/api/hospital-ops/opd/consultations${consultQuery}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/opd/consultations/insights?hospitalId=${hospitalId}`, { method: 'GET' })
                ]);
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setRecords(data);
                    setInsights(insightRes.ok ? insightRes.data : null);
                }
            } catch (err) {
                if (isActive) {
                    setRecords([]);
                    setInsights(null);
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
    }, [hospitalId, consultSearch, consultSortBy, consultSortDir]);

    const handleAdd = async () => {
        if (!form.patient || !form.doctor || !form.notes || !hospitalId) return;
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/opd/consultations', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    patient: form.patient,
                    doctor: form.doctor,
                    notes: form.notes,
                    status: 'Open',
                    followUpDate: form.followUpDate || null
                })
            });
            if (res.ok) {
                setRecords((prev) => [res.data, ...prev]);
                refreshInsights();
                setForm({ patient: '', doctor: '', notes: '', followUpDate: '' });
            }
        } finally {
            setSubmitting(false);
        }
    };
    const coverage = insights?.summaryCoverage || 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Consultation Insights</h3>
                        <p className="text-sm text-gray-500">AI summary coverage and follow-up signals.</p>
                    </div>
                    <div className="text-xs text-gray-400">Coverage {coverage}%</div>
                </div>
                {insights ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded p-3">
                            <p className="text-xs text-gray-500">Records analyzed</p>
                            <p className="text-2xl font-bold text-gray-900">{insights.total || 0}</p>
                        </div>
                        <div className="border rounded p-3">
                            <p className="text-xs text-gray-500">Follow-ups flagged</p>
                            <p className="text-2xl font-bold text-gray-900">{insights.followUps || 0}</p>
                        </div>
                        <div className="border rounded p-3">
                            <p className="text-xs text-gray-500">Summary coverage</p>
                            <p className="text-2xl font-bold text-gray-900">{coverage}%</p>
                            <ProgressBar value={coverage} colorClass="bg-sky-500" />
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">No consultation insights yet.</div>
                )}
                {(insights?.topKeywords || []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {insights.topKeywords.map((item) => (
                            <span key={item.label} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                {item.label}: {item.value}
                            </span>
                        ))}
                    </div>
                )}
            </DashboardCard>

            <DashboardCard>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Consultation Records</h3>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                        className="p-2 border rounded w-full"
                        placeholder="Search consultations"
                        value={consultSearch}
                        onChange={(e) => setConsultSearch(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded"
                        value={consultSortBy}
                        onChange={(e) => setConsultSortBy(e.target.value)}
                    >
                        <option value="createdAt">Newest</option>
                        <option value="date">Date</option>
                        <option value="status">Status</option>
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={consultSortDir}
                        onChange={(e) => setConsultSortDir(e.target.value)}
                    >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input className="p-2 border rounded" placeholder="Patient" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} />
                    <input className="p-2 border rounded" placeholder="Doctor" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
                    <input className="p-2 border rounded" placeholder="Follow-up date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
                </div>
                <textarea
                    className="w-full border rounded p-2 text-sm mb-3"
                    placeholder="Notes"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <button className="bg-blue-600 text-white rounded px-4 py-2" onClick={handleAdd} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Add Record'}
                </button>
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="space-y-3 mt-4 max-h-[520px] overflow-y-auto pr-2">
                        {records.length === 0 ? (
                            <div className="text-sm text-gray-500">No consultations yet.</div>
                        ) : (
                            records.map((record) => (
                                <div key={record._id || record.id} className="border rounded p-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">{record.patient}</p>
                                            <p className="text-xs text-gray-500">{record.doctor} • {record.date}</p>
                                            {record.followUpDate && (
                                                <p className="text-xs text-indigo-500">Follow-up: {record.followUpDate}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusPill text={record.status || 'Open'} color={record.status === 'Closed' ? 'green' : record.status === 'Follow-up' ? 'blue' : 'yellow'} />
                                            <button
                                                className="text-xs text-green-600"
                                                onClick={async () => {
                                                    const id = record._id || record.id;
                                                    setRecords((prev) => prev.map((row) => (row._id || row.id) === id ? { ...row, status: 'Closed' } : row));
                                                    await apiFetch(`/api/hospital-ops/opd/consultations/${id}`, {
                                                        method: 'PATCH',
                                                        body: JSON.stringify({ status: 'Closed' })
                                                    });
                                                    refreshInsights();
                                                }}
                                            >
                                                Close
                                            </button>
                                            <button
                                                className="text-xs text-indigo-600"
                                                onClick={async () => {
                                                    const id = record._id || record.id;
                                                    setRecords((prev) => prev.map((row) => (row._id || row.id) === id ? { ...row, status: 'Follow-up' } : row));
                                                    await apiFetch(`/api/hospital-ops/opd/consultations/${id}`, {
                                                        method: 'PATCH',
                                                        body: JSON.stringify({ status: 'Follow-up' })
                                                    });
                                                    refreshInsights();
                                                }}
                                            >
                                                Follow-up
                                            </button>
                                            <button
                                                className="text-xs text-red-600"
                                                onClick={async () => {
                                                    const id = record._id || record.id;
                                                    await apiFetch(`/api/hospital-ops/opd/consultations/${id}`, { method: 'DELETE' });
                                                    setRecords((prev) => prev.filter((row) => (row._id || row.id) !== id));
                                                    refreshInsights();
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">{record.notes}</p>
                                    {record.aiSummary && (
                                        <p className="text-xs text-slate-500 mt-2">AI summary: {record.aiSummary}</p>
                                    )}
                                    {record.followUpPlan && (
                                        <p className="text-xs text-amber-600 mt-1">{record.followUpPlan}</p>
                                    )}
                                    {(record.keywords || []).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {record.keywords.map((item) => (
                                                <span key={item} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{item}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DashboardCard>
        </div>
    );
};
