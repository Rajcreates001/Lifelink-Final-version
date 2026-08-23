import React, { useState } from 'react';
import { _nowLabel } from './helpers';

export const HospitalICUVitals = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [stats, setStats] = useState(null);
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
                const res = await apiFetch(`/api/hospital-ops/icu/vitals?hospitalId=${hospitalId}`, { method: 'GET' });
                if (res.ok && isActive) {
                    setStats(res.data);
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
            <div className="mt-4 text-sm text-gray-500">Last refreshed {_nowLabel()}</div>
        </DashboardCard>
    );
};
