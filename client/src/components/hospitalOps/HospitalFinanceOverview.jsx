import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner } from '../Common';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export const HospitalFinanceOverview = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [summary, setSummary] = useState(null);
    const [claims, setClaims] = useState([]);
    const [payerDelays, setPayerDelays] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                if (isActive) {
                    setSummary(null);
                    setClaims([]);
                    setLoading(false);
                }
                return;
            }
            setLoading(true);
            try {
                const [revenueRes, claimsRes, delayRes] = await Promise.all([
                    apiFetch(`/api/hospital-ops/finance/revenue?hospitalId=${hospitalId}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/finance/claims?hospitalId=${hospitalId}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/finance/payer-delays?hospitalId=${hospitalId}`, { method: 'GET' })
                ]);
                if (isActive) {
                    setSummary(revenueRes.ok ? revenueRes.data : null);
                    setClaims(claimsRes.ok ? (claimsRes.data?.data || []) : []);
                    setPayerDelays(delayRes.ok ? delayRes.data : null);
                }
            } finally {
                if (isActive) setLoading(false);
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [hospitalId]);

    const monthlySeries = summary?.monthlySeries || [];
    const latestMonth = monthlySeries.length ? monthlySeries[monthlySeries.length - 1] : null;
    const previousMonth = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 2] : null;
    const monthDelta = previousMonth?.value
        ? ((latestMonth?.value || 0) - previousMonth.value) / previousMonth.value * 100
        : 0;

    const pendingClaims = claims.filter((claim) => (claim.status || '').toLowerCase() !== 'approved');
    const claimsByMonth = claims.reduce((acc, claim) => {
        const createdAt = claim.createdAt ? new Date(claim.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return acc;
        const label = createdAt.toLocaleString('en-US', { month: 'short' });
        acc[label] = (acc[label] || 0) + Number(claim.amount || 0);
        return acc;
    }, {});

    const chartData = monthlySeries.map((row) => ({
        month: row.label,
        revenue: Number(row.value || 0),
        claims: Number(claimsByMonth[row.label] || 0)
    }));

    const utilization = summary?.totalRevenue
        ? Math.round((Number(summary.totalExpenses || 0) / Number(summary.totalRevenue || 1)) * 100)
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DashboardCard className="animate-fade-in-up delay-100">
                            <p className="text-xs text-gray-500">Monthly Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">₹{latestMonth?.value || 0}</p>
                            <p className={`text-xs ${monthDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {monthDelta >= 0 ? '+' : ''}{monthDelta.toFixed(1)}% vs last month
                            </p>
                        </DashboardCard>
                        <DashboardCard className="animate-fade-in-up delay-200">
                            <p className="text-xs text-gray-500">Claims Pending</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingClaims.length}</p>
                            <p className="text-xs text-amber-600">Open claims in review</p>
                        </DashboardCard>
                        <DashboardCard className="animate-fade-in-up delay-300">
                            <p className="text-xs text-gray-500">Operating Cost</p>
                            <p className="text-2xl font-bold text-gray-900">₹{summary?.totalExpenses || 0}</p>
                            <p className="text-xs text-indigo-600">Utilization {utilization}%</p>
                        </DashboardCard>
                    </div>

                    <DashboardCard className="animate-chart-entrance chart-delay-2">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue vs Claims</h3>
                        {chartData.length === 0 ? (
                            <div className="text-sm text-gray-500">No finance activity yet.</div>
                        ) : (
                            <div className="h-72 overflow-hidden">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="revenue" fill="#16a34a" radius={[6, 6, 0, 0]}
                                            isAnimationActive={true} animationDuration={800} animationBegin={200} />
                                        <Bar dataKey="claims" fill="#f97316" radius={[6, 6, 0, 0]}
                                            isAnimationActive={true} animationDuration={800} animationBegin={400} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </DashboardCard>

                    <DashboardCard>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Payer Delay Insights</h3>
                        {!payerDelays ? (
                            <div className="text-sm text-gray-500">No payer delay data yet.</div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Average delay</span>
                                    <span className="font-semibold text-gray-900">{payerDelays.averageDelayDays || 0} days</span>
                                </div>
                                {(payerDelays.insurers || []).length === 0 ? (
                                    <div className="text-xs text-gray-400">No insurer-level delay data.</div>
                                ) : (
                                    payerDelays.insurers.map((item) => (
                                        <div key={item.insurer} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                                            <span className="text-gray-600">{item.insurer}</span>
                                            <span className="font-semibold text-gray-900">{item.avgDelayDays} days</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </DashboardCard>
                </>
            )}
        </div>
    );
};
