import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalICULiveMonitoring = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [riskScores, setRiskScores] = useState({});
    const [icuSearch, setIcuSearch] = useState('');
    const [icuSortBy, setIcuSortBy] = useState('createdAt');
    const [icuSortDir, setIcuSortDir] = useState('desc');

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            if (!hospitalId) {
                setPatients([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const icuQuery = buildQuery({
                    hospitalId,
                    search: icuSearch,
                    sort_by: icuSortBy,
                    sort_dir: icuSortDir
                });
                const res = await apiFetch(`/api/hospital-ops/icu/patients${icuQuery}`, { method: 'GET' });
                const data = res.ok ? (res.data?.data || []) : [];
                if (isActive) {
                    setPatients(data);
                }
            } catch (err) {
                if (isActive) {
                    setPatients([]);
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
    }, [hospitalId, icuSearch, icuSortBy, icuSortDir]);

    const assessRisk = async (patient) => {
        const id = patient._id || patient.id;
        const res = await apiFetch('/api/hospital-ops/icu/risk', {
            method: 'POST',
            body: JSON.stringify({ oxygen: patient.oxygen, heartRate: patient.heartRate })
        });
        if (res.ok) {
            setRiskScores((prev) => ({ ...prev, [id]: res.data }));
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ICU Live Monitoring</h3>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    className="p-2 border rounded w-full"
                    placeholder="Search ICU patients"
                    value={icuSearch}
                    onChange={(e) => setIcuSearch(e.target.value)}
                />
                <select
                    className="p-2 border rounded"
                    value={icuSortBy}
                    onChange={(e) => setIcuSortBy(e.target.value)}
                >
                    <option value="createdAt">Newest</option>
                    <option value="name">Name</option>
                    <option value="oxygen">Oxygen</option>
                    <option value="heartRate">Heart Rate</option>
                    <option value="status">Status</option>
                </select>
                <select
                    className="p-2 border rounded"
                    value={icuSortDir}
                    onChange={(e) => setIcuSortDir(e.target.value)}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
                    {patients.map((patient) => (
                        <div key={patient._id || patient.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{patient.name}</p>
                                    <p className="text-xs text-gray-500">{patient._id || patient.id} • BP {patient.bp}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill text={patient.status} color={patient.status === 'Critical' ? 'red' : 'green'} />
                                    <button className="text-xs text-indigo-600" onClick={() => assessRisk(patient)}>Assess</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <p className="text-xs text-gray-500">Oxygen {patient.oxygen}%</p>
                                    <ProgressBar value={patient.oxygen} colorClass={patient.oxygen < 92 ? 'bg-red-500' : 'bg-green-500'} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Heart Rate {patient.heartRate} bpm</p>
                                    <ProgressBar value={Math.min(patient.heartRate, 140) / 1.4} colorClass="bg-indigo-500" />
                                </div>
                            </div>
                            {riskScores[patient._id || patient.id] && (
                                <div className="mt-3 text-xs text-gray-600">
                                    Risk: <span className="font-semibold">{riskScores[patient._id || patient.id].riskLevel}</span> ({riskScores[patient._id || patient.id].riskScore})
                                    <ExplainabilityPanel meta={riskScores[patient._id || patient.id].meta} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </DashboardCard>
    );
};
