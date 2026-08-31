import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, getAuthToken, API_BASE_URL } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from '../Common';
import ReportDownloadButton from '../ReportDownloadButton';

export const HospitalReports = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [reports, setReports] = useState([]);
    const [ingestedReports, setIngestedReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [workingKey, setWorkingKey] = useState(null);
    const [ingestForm, setIngestForm] = useState({ name: '', category: 'General', content: '' });
    const [ingesting, setIngesting] = useState(false);
    const [ingestSearch, setIngestSearch] = useState('');
    const [ingestSortBy, setIngestSortBy] = useState('generatedAt');
    const [ingestSortDir, setIngestSortDir] = useState('desc');

    const load = async () => {
        if (!hospitalId) {
            setReports([]);
            setIngestedReports([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const ingestQuery = buildQuery({
                hospitalId,
                search: ingestSearch,
                sort_by: ingestSortBy,
                sort_dir: ingestSortDir
            });
            const [res, ingestRes] = await Promise.all([
                apiFetch(`/api/hospital-ops/reports?hospitalId=${hospitalId}`, { method: 'GET' }),
                apiFetch(`/api/hospital-ops/reports/ingested${ingestQuery}`, { method: 'GET' })
            ]);
            setReports(res.ok ? (res.data?.data || []) : []);
            setIngestedReports(ingestRes.ok ? (ingestRes.data?.data || []) : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [hospitalId, ingestSearch, ingestSortBy, ingestSortDir]);

    const handleGenerate = async (reportKey) => {
        if (!hospitalId || !reportKey) return;
        setWorkingKey(reportKey);
        try {
            const res = await apiFetch('/api/hospital-ops/reports/generate', {
                method: 'POST',
                body: JSON.stringify({ hospitalId, reportKey })
            });
            if (res.ok) {
                await load();
            }
        } finally {
            setWorkingKey(null);
        }
    };

    const handleDownload = async (report) => {
        if (!report?.id) return;
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/api/hospital-ops/reports/${report.id}/download`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const safeName = (report.name || 'report').toLowerCase().replace(/\s+/g, '_');
        anchor.href = url;
        anchor.download = `${safeName}.txt`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };

    const handleIngest = async () => {
        if (!hospitalId || !ingestForm.name || !ingestForm.content) return;
        setIngesting(true);
        try {
            const res = await apiFetch('/api/hospital-ops/reports/ingest', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalId,
                    name: ingestForm.name,
                    category: ingestForm.category,
                    content: ingestForm.content
                })
            });
            if (res.ok) {
                setIngestedReports((prev) => [res.data, ...prev]);
                setIngestForm({ name: '', category: 'General', content: '' });
            }
        } finally {
            setIngesting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* PDF Report Generation */}
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">PDF Reports</h3>
                        <p className="text-sm text-gray-500">Generate professional PDF reports with full formatting.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ReportDownloadButton
                        endpoint="/api/reports/hospital/daily-ops"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`daily_ops_${hospitalId}.pdf`}
                        label="Daily Operations"
                        variant="primary"
                        size="sm"
                        icon="fa-calendar-day"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/hospital/financial"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`financial_report_${hospitalId}.pdf`}
                        label="Financial Report"
                        variant="secondary"
                        size="sm"
                        icon="fa-chart-line"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/hospital/compliance"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`compliance_${hospitalId}.pdf`}
                        label="Compliance"
                        variant="secondary"
                        size="sm"
                        icon="fa-shield-alt"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/hospital/incident"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`incident_report_${hospitalId}.pdf`}
                        label="Incident Report"
                        variant="danger"
                        size="sm"
                        icon="fa-exclamation-triangle"
                    />
                    <ReportDownloadButton
                        endpoint="/api/reports/hospital/resource"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`resource_report_${hospitalId}.pdf`}
                        label="Resource Usage"
                        variant="secondary"
                        size="sm"
                        icon="fa-boxes"
                    />
                </div>
            </DashboardCard>

            <DashboardCard className="animate-fade-in-up delay-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Reports Center</h3>
                {loading ? (
                    <LoadingSpinner />
                ) : reports.length === 0 ? (
                    <div className="text-sm text-gray-500">No reports available yet.</div>
                ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                        {reports.map((report) => (
                            <div key={report.reportKey || report.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-800">{report.name}</p>
                                    <p className="text-xs text-gray-500">
                                        Last generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : 'Not generated'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill text={report.status || 'Draft'} color={report.status === 'Ready' ? 'green' : 'yellow'} />
                                    <button className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors duration-150" onClick={() => handleGenerate(report.reportKey)}
                                        disabled={workingKey === report.reportKey}
                                    >
                                        {workingKey === report.reportKey ? 'Generating...' : 'Generate'}
                                    </button>
                                    <button
                                        className={`text-xs ${report.status === 'Ready' ? 'text-gray-700' : 'text-gray-400'}`}
                                        onClick={() => handleDownload(report)}
                                        disabled={report.status !== 'Ready'}
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DashboardCard>

            <DashboardCard className="animate-fade-in-up delay-300">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Ingest External Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                        className="p-2 border rounded"
                        placeholder="Report name"
                        value={ingestForm.name}
                        onChange={(e) => setIngestForm({ ...ingestForm, name: e.target.value })}
                    />
                    <input
                        className="p-2 border rounded"
                        placeholder="Category"
                        value={ingestForm.category}
                        onChange={(e) => setIngestForm({ ...ingestForm, category: e.target.value })}
                    />
                    <button
                        className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                        onClick={handleIngest}
                        disabled={ingesting}
                    >
                        {ingesting ? 'Ingesting...' : 'Ingest Report'}
                    </button>
                </div>
                <textarea
                    className="w-full p-3 border rounded text-sm"
                    placeholder="Paste report content here..."
                    rows="4"
                    value={ingestForm.content}
                    onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                />
            </DashboardCard>

            <DashboardCard className="animate-fade-in-up delay-400">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Ingested Reports</h3>
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                    <input
                        className="p-2 border rounded w-full"
                        placeholder="Search ingested reports"
                        value={ingestSearch}
                        onChange={(e) => setIngestSearch(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded"
                        value={ingestSortBy}
                        onChange={(e) => setIngestSortBy(e.target.value)}
                    >
                        <option value="generatedAt">Newest</option>
                        <option value="name">Name</option>
                        <option value="category">Category</option>
                        <option value="status">Status</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={ingestSortDir}
                        onChange={(e) => setIngestSortDir(e.target.value)}
                    >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
                {ingestedReports.length === 0 ? (
                    <div className="text-sm text-gray-500">No ingested reports yet.</div>
                ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                        {ingestedReports.slice(0, 6).map((report) => (
                            <div key={report._id || report.id} className="border rounded p-3">
                                <p className="font-semibold text-gray-800">{report.name || 'Report'}</p>
                                <p className="text-xs text-gray-500">{report.category || 'General'} • {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'Recent'}</p>
                                {report.summary && (
                                    <p className="text-sm text-gray-600 mt-2">{report.summary}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DashboardCard>
        </div>
    );
};
