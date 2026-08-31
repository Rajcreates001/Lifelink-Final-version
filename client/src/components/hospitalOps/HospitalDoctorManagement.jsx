import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from '../Common';

export const HospitalDoctorManagement = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [doctors, setDoctors] = useState([]);
    const [coverage, setCoverage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', specialty: '', shift: 'Morning', schedule: '' });
    const [doctorSearch, setDoctorSearch] = useState('');
    const [doctorSortBy, setDoctorSortBy] = useState('createdAt');
    const [doctorSortDir, setDoctorSortDir] = useState('desc');

    const refreshCoverage = async () => {
        if (!hospitalId) return;
        const res = await apiFetch(`/api/hospital-ops/opd/doctors/coverage?hospitalId=${hospitalId}`, { method: 'GET' });
        setCoverage(res.ok ? res.data : null);
    };

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setDoctors([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const doctorQuery = buildQuery({
                    hospitalId,
                    search: doctorSearch,
                    sort_by: doctorSortBy,
                    sort_dir: doctorSortDir
                });
                const [res, coverageRes] = await Promise.all([
                    apiFetch(`/api/hospital-ops/opd/doctors${doctorQuery}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/opd/doctors/coverage?hospitalId=${hospitalId}`, { method: 'GET' })
                ]);
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setDoctors(data);
                    setCoverage(coverageRes.ok ? coverageRes.data : null);
                }
            } catch (err) {
                if (isActive) {
                    setDoctors([]);
                    setCoverage(null);
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
    }, [hospitalId, doctorSearch, doctorSortBy, doctorSortDir]);

    const handleAdd = async () => {
        if (!form.name || !form.specialty || !hospitalId) return;
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/opd/doctors', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    name: form.name,
                    specialty: form.specialty,
                    availability: true,
                    shift: form.shift,
                    schedule: form.schedule
                })
            });
            if (res.ok) {
                setDoctors((prev) => [res.data, ...prev]);
                setForm({ name: '', specialty: '', shift: 'Morning', schedule: '' });
                refreshCoverage();
            }
        } finally {
            setSubmitting(false);
        }
    };

    const toggle = async (id, availability) => {
        setDoctors((prev) => prev.map((doc) => (doc._id || doc.id) === id ? { ...doc, availability: !availability } : doc));
        try {
            await apiFetch(`/api/hospital-ops/opd/doctors/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ availability: !availability })
            });
            refreshCoverage();
        } catch (err) {
            // Keep optimistic update
        }
    };

    const handleRemove = async (id) => {
        await apiFetch(`/api/hospital-ops/opd/doctors/${id}`, { method: 'DELETE' });
        setDoctors((prev) => prev.filter((doc) => (doc._id || doc.id) !== id));
        refreshCoverage();
    };
    return (
        <div className="space-y-6 animate-fade-in">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Specialty Coverage</h3>
                        <p className="text-sm text-gray-500">Live roster balance and gap tracking.</p>
                    </div>
                    <div className="text-xs text-gray-400">Availability {coverage?.availabilityRate || 0}%</div>
                </div>
                {!coverage ? (
                    <div className="text-sm text-gray-500">No coverage signals yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            {(coverage.specialtyCoverage || []).map((item) => (
                                <div key={item.specialty} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                                    <span className="text-gray-600">{item.specialty}</span>
                                    <span className="font-semibold text-gray-900">{item.available}/{item.total}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {(coverage.shiftCoverage || []).map((item) => (
                                <div key={item.shift} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                                    <span className="text-gray-600">{item.shift}</span>
                                    <span className="font-semibold text-gray-900">{item.count}</span>
                                </div>
                            ))}
                            {(coverage.coverageGaps || []).length > 0 && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                    Coverage gaps: {coverage.coverageGaps.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DashboardCard>

            <DashboardCard>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Doctor Management</h3>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                        className="p-2 border rounded w-full"
                        placeholder="Search doctors"
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded"
                        value={doctorSortBy}
                        onChange={(e) => setDoctorSortBy(e.target.value)}
                    >
                        <option value="createdAt">Newest</option>
                        <option value="name">Name</option>
                        <option value="specialty">Specialty</option>
                        <option value="availability">Availability</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={doctorSortDir}
                        onChange={(e) => setDoctorSortDir(e.target.value)}
                    >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <input className="p-2 border rounded" placeholder="Doctor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="p-2 border rounded" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                    <select className="p-2 border rounded" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                        <option>Morning</option>
                        <option>Afternoon</option>
                        <option>Night</option>
                    </select>
                    <button className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={handleAdd} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Add Doctor'}
                    </button>
                </div>
                <input
                    className="p-2 border rounded w-full mb-4"
                    placeholder="Schedule (ex: Mon-Fri 9am-1pm)"
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                />
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                        {doctors.length === 0 ? (
                            <div className="text-sm text-gray-500">No doctors found.</div>
                        ) : (
                            doctors.map((doc) => (
                                <div key={doc._id || doc.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border rounded p-3">
                                    <div>
                                        <p className="font-semibold text-gray-800">{doc.name}</p>
                                        <p className="text-xs text-gray-500">{doc.specialty} • {doc.normalizedShift || doc.shift || 'Unassigned'}</p>
                                        {doc.schedule && <p className="text-xs text-gray-400">{doc.schedule}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusPill text={doc.availability ? 'Available' : 'Off Duty'} color={doc.availability ? 'green' : 'gray'} />
                                        <button className="text-xs text-indigo-600" onClick={() => toggle(doc._id || doc.id, doc.availability)}>
                                            Toggle
                                        </button>
                                        <button className="text-xs text-red-600" onClick={() => handleRemove(doc._id || doc.id)}>
                                            Remove
                                        </button>
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
