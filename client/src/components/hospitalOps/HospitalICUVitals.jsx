import React, { useState, useEffect } from 'react';
import { _nowLabel } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner } from '../Common';

export const HospitalICUVitals = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [stats, setStats] = useState(null);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                if (isActive) {
                    setStats(null);
                    setLoading(false);
                }
                return;
            }
            try {
                const [res, pres] = await Promise.all([
                    apiFetch(`/api/hospital-ops/icu/vitals?hospitalId=${hospitalId}`, { method: 'GET' }),
                    apiFetch(`/api/hospital-ops/icu/patients?hospitalId=${hospitalId}`, { method: 'GET', timeoutMs: 12000 }).catch(() => ({ ok: false })),
                ]);
                if (res.ok && isActive) {
                    setStats(res.data);
                }
                if (pres.ok && isActive) {
                    const rows = pres.data?.data || [];
                    // Lowest oxygen first: the patients who need attention now.
                    setPatients([...rows].sort((a, b) => (Number(a.oxygen) || 100) - (Number(b.oxygen) || 100)).slice(0, 12));
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

    if (loading) {
        return (
            <DashboardCard>
                <LoadingSpinner />
            </DashboardCard>
        );
    }

    const safeStats = stats || {
        average_oxygen: 0,
        average_heart_rate: 0,
        critical_patients: 0,
        patient_count: 0,
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ICU Vitals Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DashboardCard className="animate-fade-in-up delay-200">
                    <p className="text-xs text-gray-500">Average O2</p>
                    <p className="text-2xl font-bold text-gray-900">{safeStats.average_oxygen}%</p>
                </DashboardCard>
                <DashboardCard className="animate-fade-in-up delay-300">
                    <p className="text-xs text-gray-500">Avg Heart Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{safeStats.average_heart_rate} bpm</p>
                </DashboardCard>
                <DashboardCard className="animate-fade-in-up delay-400">
                    <p className="text-xs text-gray-500">Critical Patients</p>
                    <p className="text-2xl font-bold text-red-600">{safeStats.critical_patients}</p>
                </DashboardCard>
            </div>
            {patients.length > 0 && (
                <div className="mt-5">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Patients needing attention (lowest SpO2 first) · {safeStats.patient_count || patients.length} in ICU</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b">
                                    <th className="py-2 pr-3">Patient</th>
                                    <th className="py-2 pr-3">SpO2</th>
                                    <th className="py-2 pr-3">Heart rate</th>
                                    <th className="py-2 pr-3">BP</th>
                                    <th className="py-2 pr-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((p) => {
                                    const o2 = Number(p.oxygen);
                                    const hr = Number(p.heartRate);
                                    const crit = o2 < 90 || hr > 120 || String(p.status).toLowerCase() === 'critical';
                                    return (
                                        <tr key={p._id || p.id || p.name} className="border-b border-gray-100">
                                            <td className="py-2 pr-3 font-medium text-gray-800">{p.name || 'Patient'}</td>
                                            <td className={`py-2 pr-3 font-semibold ${o2 < 90 ? 'text-red-600' : o2 < 94 ? 'text-amber-600' : 'text-emerald-600'}`}>{Number.isFinite(o2) ? `${o2}%` : '-'}</td>
                                            <td className={`py-2 pr-3 ${hr > 120 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{Number.isFinite(hr) ? `${hr} bpm` : '-'}</td>
                                            <td className="py-2 pr-3 text-gray-700">{p.bp || p.bloodPressure || '-'}</td>
                                            <td className="py-2 pr-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${crit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{crit ? 'Critical' : (p.status || 'Stable')}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className="mt-4 text-sm text-gray-500">Last refreshed {_nowLabel()}</div>
        </DashboardCard>
    );
};
