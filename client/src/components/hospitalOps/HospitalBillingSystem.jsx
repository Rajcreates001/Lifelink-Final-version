import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from '../Common';
import ExportButton from '../ExportButton';

export const HospitalBillingSystem = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ patientName: '', department: 'General', amount: '' });
    const [fraudAlerts, setFraudAlerts] = useState([]);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceSortBy, setInvoiceSortBy] = useState('createdAt');
    const [invoiceSortDir, setInvoiceSortDir] = useState('desc');

    const load = async () => {
        if (!hospitalId) return;
        setLoading(true);
        try {
            const invoiceQuery = buildQuery({
                hospitalId,
                search: invoiceSearch,
                sort_by: invoiceSortBy,
                sort_dir: invoiceSortDir
            });
            const [invoiceRes, revenueRes] = await Promise.all([
                apiFetch(`/api/hospital-ops/finance/invoices${invoiceQuery}`, { method: 'GET' }),
                apiFetch(`/api/hospital-ops/finance/revenue?hospitalId=${hospitalId}`, { method: 'GET' })
            ]);
            setInvoices(invoiceRes.ok ? (invoiceRes.data?.data || []) : []);
            setFraudAlerts(revenueRes.ok ? (revenueRes.data?.fraudAlerts || []) : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [hospitalId, invoiceSearch, invoiceSortBy, invoiceSortDir]);

    const handleCreate = async () => {
        if (!hospitalId || !form.patientName || !form.amount) return;
        const res = await apiFetch('/api/hospital-ops/finance/invoices', {
            method: 'POST',
            body: JSON.stringify({
                hospitalId,
                patientName: form.patientName,
                department: form.department,
                amount: Number(form.amount)
            })
        });
        if (res.ok) {
            setInvoices((prev) => [res.data, ...prev]);
            setForm({ patientName: '', department: 'General', amount: '' });
        }
    };

    const updateInvoice = async (id, status) => {
        await apiFetch(`/api/hospital-ops/finance/invoices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        setInvoices((prev) => prev.map((inv) => (inv._id || inv.id) === id ? { ...inv, status } : inv));
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Billing System</h3>
                <ExportButton data={invoices} filename="hospital_invoices" label="Export" columns={['patientName','department','amount','status','createdAt']} columnLabels={{ patientName: 'Patient', department: 'Department', amount: 'Amount', status: 'Status', createdAt: 'Date' }} formatValue={(v, col) => col === 'createdAt' && v ? new Date(v).toLocaleDateString() : col === 'amount' && v ? `₹${v}` : undefined} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <input className="p-2 border rounded" placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
                <select className="p-2 border rounded" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    <option>General</option>
                    <option>Emergency</option>
                    <option>ICU</option>
                    <option>OPD</option>
                    <option>Radiology</option>
                </select>
                <input className="p-2 border rounded" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <button className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={handleCreate}>Generate Invoice</button>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search invoices"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={invoiceSortBy}
                    onChange={(e) => setInvoiceSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="amount">Amount</option>
                    <option value="status">Status</option>
                    <option value="department">Department</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={invoiceSortDir}
                    onChange={(e) => setInvoiceSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {invoices.length === 0 ? (
                        <div className="text-sm text-gray-500">No invoices yet.</div>
                    ) : (
                        invoices.map((inv) => (
                            <div key={inv._id || inv.id} className="border rounded p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{inv.patientName}</p>
                                    <p className="text-xs text-gray-500">{inv.department} • ₹{inv.amount}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill text={inv.status || 'Unpaid'} color={inv.status === 'Paid' ? 'green' : 'yellow'} />
                                    <button className="text-xs text-green-600 hover:text-green-800 transition-colors duration-150" onClick={() => updateInvoice(inv._id || inv.id, 'Paid')}>Mark Paid</button>
                                    <button className="text-xs text-red-600 hover:text-red-800 transition-colors duration-150" onClick={() => updateInvoice(inv._id || inv.id, 'Refunded')}>Refund</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {fraudAlerts.length > 0 && (
                <div className="mt-4 border rounded p-3 bg-red-50 text-red-700 text-sm">
                    <p className="font-semibold mb-2">Fraud Alerts</p>
                    {fraudAlerts.map((alert, idx) => (
                        <div key={`${alert}-${idx}`}>{alert}</div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
