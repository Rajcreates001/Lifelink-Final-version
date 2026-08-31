import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner } from '../Common';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export const HospitalRevenueAnalytics = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expense, setExpense] = useState({ category: 'Supplies', amount: '' });

    const load = async () => {
        if (!hospitalId) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/api/hospital-ops/finance/revenue?hospitalId=${hospitalId}`, { method: 'GET' });
            setSummary(res.ok ? res.data : null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [hospitalId]);

    const addExpense = async () => {
        if (!hospitalId || !expense.amount) return;
        await apiFetch('/api/hospital-ops/finance/expenses', {
            method: 'POST',
            body: JSON.stringify({ hospitalId, category: expense.category, amount: Number(expense.amount) })
        });
        setExpense({ category: 'Supplies', amount: '' });
        load();
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Analytics</h3>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="border rounded p-3">
                            <p className="text-xs text-gray-500">Total Revenue</p>
                            <p className="text-xl font-bold text-gray-900">₹{summary?.totalRevenue || 0}</p>
                        </div>
                        <div className="border rounded p-3">
                            <p className="text-xs text-gray-500">Total Expenses</p>
                            <p className="text-xl font-bold text-gray-900">₹{summary?.totalExpenses || 0}</p>
                        </div>
                        <div className="border rounded p-3">
                            <p className="text-xs text-gray-500">Profit</p>
                            <p className="text-xl font-bold text-gray-900">₹{summary?.profit || 0}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Department Breakdown</p>
                        <div className="space-y-2">
                            {(summary?.departmentBreakdown || []).map((dept) => (
                                <div key={dept.department} className="flex items-center justify-between border rounded p-2">
                                    <span className="text-sm text-gray-700">{dept.department}</span>
                                    <span className="text-sm font-semibold text-gray-900">₹{dept.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-48 overflow-hidden animate-chart-entrance chart-delay-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={summary?.dailySeries || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2}
                                        isAnimationActive={true} animationDuration={1200} animationBegin={200} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-48 overflow-hidden animate-chart-entrance chart-delay-3">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={summary?.monthlySeries || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2}
                                        isAnimationActive={true} animationDuration={1200} animationBegin={500} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className="p-2 border rounded" placeholder="Expense category" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} />
                <input className="p-2 border rounded" type="number" placeholder="Amount" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} />
                <button className="bg-slate-900 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={addExpense}>Add Expense</button>
            </div>
        </DashboardCard>
    );
};
