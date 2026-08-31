import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from '../Common';

export const HospitalRadiologyReportUpload = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ patient: '', scan: '', file: null });
    const [reportSearch, setReportSearch] = useState('');
    const [reportSortBy, setReportSortBy] = useState('createdAt');
    const [reportSortDir, setReportSortDir] = useState('desc');

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const reportQuery = buildQuery({
                    hospitalId,
                    search: reportSearch,
                    sort_by: reportSortBy,
                    sort_dir: reportSortDir
                });
                const res = await apiFetch(`/api/hospital-ops/radiology/reports${reportQuery}`, { method: 'GET' });
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setReports(data);
                }
            } catch (err) {
                if (isActive) {
                    setReports([]);
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
    }, [hospitalId, reportSearch, reportSortBy, reportSortDir]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.patient || !form.scan || !hospitalId) return;
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/radiology/reports', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    patient: form.patient,
                    scan: form.scan,
                    fileName: form.file?.name,
                    status: 'Uploaded'
                })
            });
            if (res.ok) {
                setReports((prev) => [res.data, ...prev]);
                setForm({ patient: '', scan: '', file: null });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Report Upload</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="p-2 border rounded" placeholder="Patient" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} />
                <input className="p-2 border rounded" placeholder="Scan Type" value={form.scan} onChange={(e) => setForm({ ...form, scan: e.target.value })} />
                <input className="p-2 border rounded" type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
                <button type="submit" className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" disabled={submitting}>
                    {submitting ? 'Uploading...' : 'Upload'}
                </button>
            </form>
            <div className="flex flex-col md:flex-row gap-2 mt-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search reports"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={reportSortBy}
                    onChange={(e) => setReportSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="patient">Patient</option>
                    <option value="scan">Scan</option>
                    <option value="status">Status</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={reportSortDir}
                    onChange={(e) => setReportSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 mt-4 max-h-[420px] overflow-y-auto pr-2">
                    {reports.map((rep) => (
                        <div key={rep._id || rep.id} className="flex items-center justify-between border rounded p-3">
                            <div>
                                <p className="font-semibold text-gray-800">{rep.patient}</p>
                                <p className="text-xs text-gray-500">{rep.scan}{rep.fileName ? ` • ${rep.fileName}` : ''}</p>
                            </div>
                            <StatusPill text={rep.status || 'Uploaded'} color="green" />
                        </div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
