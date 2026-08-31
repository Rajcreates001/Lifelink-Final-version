import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill, ProgressBar } from '../Common';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export const HospitalOPDScheduling = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [appointments, setAppointments] = useState([]);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rescheduleTimes, setRescheduleTimes] = useState({});
    const [appointmentSearch, setAppointmentSearch] = useState('');
    const [appointmentSortBy, setAppointmentSortBy] = useState('createdAt');
    const [appointmentSortDir, setAppointmentSortDir] = useState('desc');
    const [form, setForm] = useState({
        patient: '',
        doctor: '',
        time: '',
        appointmentType: 'New',
        channel: 'Walk-in',
        expectedDurationMinutes: '20',
        reason: '',
        notes: '',
    });

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setAppointments([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const appointmentQuery = buildQuery({
                    hospitalId,
                    search: appointmentSearch,
                    sort_by: appointmentSortBy,
                    sort_dir: appointmentSortDir
                });
                const [res, insightRes] = await Promise.all([
                    apiFetch(`/api/hospital-ops/opd/appointments${appointmentQuery}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/opd/appointments/insights?hospitalId=${hospitalId}`, { method: 'GET' })
                ]);
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setAppointments(data);
                    setInsights(insightRes.ok ? insightRes.data : null);
                }
            } catch (err) {
                if (isActive) {
                    setAppointments([]);
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
    }, [hospitalId, appointmentSearch, appointmentSortBy, appointmentSortDir]);

    const refreshInsights = async () => {
        if (!hospitalId) return;
        const res = await apiFetch(`/api/hospital-ops/opd/appointments/insights?hospitalId=${hospitalId}`, { method: 'GET' });
        setInsights(res.ok ? res.data : null);
    };

    const handleAdd = async () => {
        if (!form.patient || !form.doctor || !form.time || !hospitalId) return;
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/opd/appointments', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    patient: form.patient,
                    doctor: form.doctor,
                    time: form.time,
                    status: 'Scheduled',
                    appointmentType: form.appointmentType,
                    channel: form.channel,
                    expectedDurationMinutes: Number(form.expectedDurationMinutes || 20),
                    reason: form.reason,
                    notes: form.notes,
                })
            });
            if (res.ok) {
                setAppointments((prev) => [res.data, ...prev]);
                refreshInsights();
                setForm({
                    patient: '',
                    doctor: '',
                    time: '',
                    appointmentType: 'New',
                    channel: 'Walk-in',
                    expectedDurationMinutes: '20',
                    reason: '',
                    notes: '',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };
    const demandScore = insights?.demandScore || 0;
    const seasonCoverageScore = insights?.seasonCoverageScore || 0;
    const weekdayVolume = insights?.weekdayVolume || [];
    const seasonCoverage = insights?.seasonCoverage || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">OPD Demand Monitor</h3>
                        <p className="text-sm text-gray-500">Live appointment pressure and seasonality coverage.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Live refresh
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="border rounded p-3">
                        <p className="text-xs text-gray-500">Next 7 days</p>
                        <p className="text-2xl font-bold text-gray-900">{insights?.next7Days || 0}</p>
                        <p className="text-xs text-gray-400">Peak day: {insights?.peakDay || 'Mon'}</p>
                    </div>
                    <div className="border rounded p-3">
                        <p className="text-xs text-gray-500">Demand score</p>
                        <p className="text-2xl font-bold text-gray-900">{demandScore}</p>
                        <ProgressBar value={demandScore} colorClass="bg-indigo-500" />
                    </div>
                    <div className="border rounded p-3">
                        <p className="text-xs text-gray-500">Seasonality coverage</p>
                        <p className="text-2xl font-bold text-gray-900">{seasonCoverageScore}%</p>
                        <ProgressBar value={seasonCoverageScore} colorClass="bg-emerald-500" />
                    </div>
                </div>
                {weekdayVolume.length ? (
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekdayVolume}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">No appointment volume signals yet.</div>
                )}
                {seasonCoverage.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {seasonCoverage.map((item) => (
                            <span key={item.label} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                {item.label}: {item.value}
                            </span>
                        ))}
                    </div>
                ) : null}
            </DashboardCard>

            <DashboardCard>
                <h3 className="text-lg font-bold text-gray-900 mb-4">OPD Scheduling</h3>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                        className="p-2 border rounded w-full"
                        placeholder="Search appointments"
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded"
                        value={appointmentSortBy}
                        onChange={(e) => setAppointmentSortBy(e.target.value)}
                    >
                        <option value="createdAt">Newest</option>
                        <option value="time">Time</option>
                        <option value="status">Status</option>
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={appointmentSortDir}
                        onChange={(e) => setAppointmentSortDir(e.target.value)}
                    >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <input className="p-2 border rounded" placeholder="Patient" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} />
                    <input className="p-2 border rounded" placeholder="Doctor" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
                    <input className="p-2 border rounded" placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                    <button className="bg-blue-600 text-white rounded" onClick={handleAdd} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Add'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <select className="p-2 border rounded" value={form.appointmentType} onChange={(e) => setForm({ ...form, appointmentType: e.target.value })}>
                        <option>New</option>
                        <option>Follow-up</option>
                        <option>Procedure</option>
                    </select>
                    <select className="p-2 border rounded" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                        <option>Walk-in</option>
                        <option>Online</option>
                        <option>Referral</option>
                    </select>
                    <input
                        className="p-2 border rounded"
                        type="number"
                        placeholder="Duration (mins)"
                        value={form.expectedDurationMinutes}
                        onChange={(e) => setForm({ ...form, expectedDurationMinutes: e.target.value })}
                    />
                    <input
                        className="p-2 border rounded"
                        placeholder="Reason"
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    />
                </div>
                <textarea
                    className="w-full border rounded p-2 text-sm mb-4"
                    placeholder="Notes"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                        {appointments.length === 0 ? (
                            <div className="text-sm text-gray-500">No appointments logged.</div>
                        ) : (
                            appointments.map((item) => (
                                <div key={item._id || item.id} className="border rounded p-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">{item.patient}</p>
                                            <p className="text-xs text-gray-500">{item.doctor} • {item.time}</p>
                                            <p className="text-xs text-gray-400">{item.appointmentType || 'New'} • {item.channel || 'Walk-in'} • {item.expectedDurationMinutes || 20} mins</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusPill text={item.status || 'Scheduled'} color={item.status === 'Completed' ? 'green' : item.status === 'Canceled' ? 'red' : 'blue'} />
                                            <input
                                                className="border rounded px-2 py-1 text-xs"
                                                placeholder="New time"
                                                value={rescheduleTimes[item._id || item.id] || ''}
                                                onChange={(e) => setRescheduleTimes((prev) => ({ ...prev, [item._id || item.id]: e.target.value }))}
                                            />
                                            <button
                                                className="text-xs text-indigo-600"
                                                onClick={async () => {
                                                    const id = item._id || item.id;
                                                    const newTime = rescheduleTimes[id];
                                                    const payload = newTime ? { status: 'Rescheduled', time: newTime } : { status: 'Rescheduled' };
                                                    setAppointments((prev) => prev.map((row) => (row._id || row.id) === id ? { ...row, ...payload } : row));
                                                    await apiFetch(`/api/hospital-ops/opd/appointments/${id}`, {
                                                        method: 'PATCH',
                                                        body: JSON.stringify(payload)
                                                    });
                                                    refreshInsights();
                                                }}
                                            >
                                                Reschedule
                                            </button>
                                            <button
                                                className="text-xs text-green-600"
                                                onClick={async () => {
                                                    const id = item._id || item.id;
                                                    setAppointments((prev) => prev.map((row) => (row._id || row.id) === id ? { ...row, status: 'Completed' } : row));
                                                    await apiFetch(`/api/hospital-ops/opd/appointments/${id}`, {
                                                        method: 'PATCH',
                                                        body: JSON.stringify({ status: 'Completed' })
                                                    });
                                                    refreshInsights();
                                                }}
                                            >
                                                Complete
                                            </button>
                                            <button
                                                className="text-xs text-red-600"
                                                onClick={async () => {
                                                    const id = item._id || item.id;
                                                    await apiFetch(`/api/hospital-ops/opd/appointments/${id}`, { method: 'DELETE' });
                                                    setAppointments((prev) => prev.filter((row) => (row._id || row.id) !== id));
                                                    refreshInsights();
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DashboardCard>
        </div>
    );
};
