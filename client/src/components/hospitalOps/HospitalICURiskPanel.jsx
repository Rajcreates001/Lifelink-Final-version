import React, { useState } from 'react';

export const HospitalICURiskPanel = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [patients, setPatients] = useState([]);
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) return;
            setLoading(true);
            try {
                const res = await apiFetch(`/api/hospital-ops/icu/patients?hospitalId=${hospitalId}`, { method: 'GET' });
                const data = res.ok ? (res.data?.data || []) : [];
                if (!isActive) return;
                setPatients(data);
                const riskResults = await Promise.all(
                    data.map(async (patient) => {
                        const riskRes = await apiFetch('/api/hospital-ops/icu/risk', {
                            method: 'POST',
                            body: JSON.stringify({ oxygen: patient.oxygen, heartRate: patient.heartRate })
                        });
                        return {
                            patient,
                            risk: riskRes.ok ? riskRes.data : { riskScore: 0, riskLevel: 'Low' }
                        };
                    })
                );
                setRisks(riskResults.sort((a, b) => (b.risk.riskScore || 0) - (a.risk.riskScore || 0)));
            } finally {
                if (isActive) setLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [hospitalId]);

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI ICU Risk Prediction</h3>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                    {risks.length === 0 ? (
                        <div className="text-sm text-gray-500">No ICU patients available.</div>
                    ) : (
                        risks.slice(0, 6).map((item) => (
                            <div key={item.patient._id || item.patient.id} className="border rounded p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{item.patient.name}</p>
                                    <p className="text-xs text-gray-500">O2 {item.patient.oxygen}% • HR {item.patient.heartRate} bpm</p>
                                </div>
                                <StatusPill text={`${item.risk.riskLevel} (${item.risk.riskScore})`} color={item.risk.riskLevel === 'Critical' ? 'red' : item.risk.riskLevel === 'High' ? 'yellow' : 'green'} />
                            </div>
                        ))
                    )}
                </div>
            )}
        </DashboardCard>
    );
};
