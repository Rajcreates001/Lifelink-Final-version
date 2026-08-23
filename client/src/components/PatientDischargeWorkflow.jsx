import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from './Common';

const DISCHARGE_TYPES = [
    { value: 'standard', label: 'Standard Discharge', color: 'green' },
    { value: 'emergency', label: 'Emergency Discharge', color: 'red' },
    { value: 'against_medical_advice', label: 'Against Medical Advice', color: 'yellow' },
    { value: 'transfer', label: 'Transfer to Another Hospital', color: 'blue' },
];

const PatientDischargeWorkflow = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [discharging, setDischarging] = useState(false);
    const [stats, setStats] = useState(null);
    const [dischargeForm, setDischargeForm] = useState({
        discharge_type: 'standard',
        condition_at_discharge: 'stable',
        discharge_summary: '',
        medications: [{ name: '', dosage: '', frequency: '' }],
        follow_up_date: '',
        follow_up_instructions: '',
        transport_arranged: false,
        notes: '',
    });
    const [dischargeResult, setDischargeResult] = useState(null);
    const [activeTab, setActiveTab] = useState('patients');

    // Load patients and stats
    useEffect(() => {
        if (!hospitalId) return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const [patientsRes, statsRes] = await Promise.all([
                    apiFetch(`/api/dashboard/hospital/patients/${hospitalId}`),
                    apiFetch(`/api/hospital-ops/discharge/stats?hospital_id=${hospitalId}&days=30`),
                ]);
                if (active) {
                    const pts = patientsRes.ok ? (patientsRes.data?.data || patientsRes.data || []) : [];
                    // Filter to admitted patients only
                    const admitted = Array.isArray(pts)
                        ? pts.filter(p => p.status !== 'discharged')
                        : [];
                    setPatients(admitted);
                    setStats(statsRes.ok ? statsRes.data : null);
                }
            } catch {
                if (active) { setPatients([]); setStats(null); }
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [hospitalId]);

    // Check readiness when patient selected
    useEffect(() => {
        if (!selectedPatient) { setReadiness(null); return; }
        const check = async () => {
            const res = await apiFetch('/api/hospital-ops/discharge/readiness', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: selectedPatient._id || selectedPatient.id,
                    hospital_id: hospitalId,
                }),
            });
            setReadiness(res.ok ? res.data : null);
        };
        check();
    }, [selectedPatient, hospitalId]);

    const handleAddMedication = () => {
        setDischargeForm(prev => ({
            ...prev,
            medications: [...prev.medications, { name: '', dosage: '', frequency: '' }],
        }));
    };

    const handleRemoveMedication = (idx) => {
        setDischargeForm(prev => ({
            ...prev,
            medications: prev.medications.filter((_, i) => i !== idx),
        }));
    };

    const handleMedicationChange = (idx, field, value) => {
        setDischargeForm(prev => ({
            ...prev,
            medications: prev.medications.map((m, i) => i === idx ? { ...m, [field]: value } : m),
        }));
    };

    const processDischarge = async () => {
        if (!selectedPatient) return;
        setDischarging(true);
        try {
            const payload = {
                patient_id: selectedPatient._id || selectedPatient.id,
                hospital_id: hospitalId,
                discharge_type: dischargeForm.discharge_type,
                condition_at_discharge: dischargeForm.condition_at_discharge,
                discharge_summary: dischargeForm.discharge_summary || undefined,
                medications_prescribed: dischargeForm.medications.filter(m => m.name),
                follow_up_date: dischargeForm.follow_up_date || undefined,
                follow_up_instructions: dischargeForm.follow_up_instructions || undefined,
                transport_arranged: dischargeForm.transport_arranged,
                notes: dischargeForm.notes || undefined,
            };
            const res = await apiFetch('/api/hospital-ops/discharge/process', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setDischargeResult(res.data);
                // Remove patient from list
                setPatients(prev => prev.filter(p => (p._id || p.id) !== selectedPatient._id && (p._id || p.id) !== selectedPatient.id));
                setSelectedPatient(null);
                setReadiness(null);
                setActiveTab('result');
            }
        } finally {
            setDischarging(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DashboardCard className="animate-fade-in-up delay-100">
                        <p className="text-xs text-gray-500">Total Patients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_patients || 0}</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-200">
                        <p className="text-xs text-gray-500">Discharged</p>
                        <p className="text-2xl font-bold text-green-600">{stats.discharged_patients || 0}</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-300">
                        <p className="text-xs text-gray-500">Active</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.active_patients || 0}</p>
                    </DashboardCard>
                    <DashboardCard className="animate-fade-in-up delay-400">
                        <p className="text-xs text-gray-500">Discharge Rate</p>
                        <p className="text-2xl font-bold text-indigo-600">{stats.discharge_rate_percent || 0}%</p>
                    </DashboardCard>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {['patients', 'discharge', 'result'].map(tab => (
                    <button
                        key={tab}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            activeTab === tab
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTab(tab)}
                        disabled={tab === 'discharge' && !selectedPatient}
                    >
                        {tab === 'patients' ? 'Patient List' : tab === 'discharge' ? 'Discharge Form' : 'Discharge Result'}
                    </button>
                ))}
            </div>

            {loading ? <LoadingSpinner /> : (
                <>
                    {/* Patient List Tab */}
                    {activeTab === 'patients' && (
                        <DashboardCard className="animate-fade-in-up">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Patients Pending Discharge</h3>
                            {patients.length === 0 ? (
                                <div className="text-sm text-gray-500">No patients currently admitted.</div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                    {patients.map(patient => (
                                        <div
                                            key={patient._id || patient.id}
                                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                                selectedPatient?._id === patient._id
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-gray-200 hover:border-gray-400'
                                            }`}
                                            onClick={() => { setSelectedPatient(patient); setActiveTab('discharge'); }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{patient.name || 'Patient'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {patient.diagnosis || patient.condition || 'No diagnosis'} • Age {patient.age || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StatusPill
                                                        text={patient.severity || 'Medium'}
                                                        color={patient.severity === 'Critical' ? 'red' : patient.severity === 'High' ? 'yellow' : 'green'}
                                                    />
                                                    <StatusPill text={patient.status || 'Admitted'} color="blue" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DashboardCard>
                    )}

                    {/* Discharge Form Tab */}
                    {activeTab === 'discharge' && selectedPatient && (
                        <div className="space-y-4">
                            {/* Readiness Assessment */}
                            {readiness && (
                                <DashboardCard className={`animate-fade-in-up ${readiness.is_ready ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-gray-800">Discharge Readiness</h4>
                                        <span className={`text-2xl font-bold ${readiness.is_ready ? 'text-green-600' : 'text-red-600'}`}>
                                            {readiness.readiness_score}%
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {readiness.factors?.map((factor, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <span className={factor.includes('normal') || factor.includes('adequate') || factor.includes('within') ? 'text-green-600' : 'text-amber-600'}>
                                                    {factor.includes('normal') || factor.includes('adequate') || factor.includes('within') ? '✓' : '⚠'}
                                                </span>
                                                <span>{factor}</span>
                                            </div>
                                        ))}
                                        {readiness.blockers?.map((blocker, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-red-600">
                                                <span>✗</span>
                                                <span>{blocker}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-3">{readiness.recommendation}</p>
                                </DashboardCard>
                            )}

                            {/* Discharge Form */}
                            <DashboardCard className="animate-fade-in-up delay-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    Discharge: {selectedPatient.name || 'Patient'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Type</label>
                                        <select
                                            className="w-full p-2 border rounded"
                                            value={dischargeForm.discharge_type}
                                            onChange={e => setDischargeForm(prev => ({ ...prev, discharge_type: e.target.value }))}
                                        >
                                            {DISCHARGE_TYPES.map(dt => (
                                                <option key={dt.value} value={dt.value}>{dt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Condition at Discharge</label>
                                        <select
                                            className="w-full p-2 border rounded"
                                            value={dischargeForm.condition_at_discharge}
                                            onChange={e => setDischargeForm(prev => ({ ...prev, condition_at_discharge: e.target.value }))}
                                        >
                                            <option value="stable">Stable</option>
                                            <option value="improved">Improved</option>
                                            <option value="unchanged">Unchanged</option>
                                            <option value="critical">Critical (AMA/Transfer)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Summary</label>
                                    <textarea
                                        className="w-full p-3 border rounded text-sm"
                                        rows="4"
                                        placeholder="Enter discharge summary..."
                                        value={dischargeForm.discharge_summary}
                                        onChange={e => setDischargeForm(prev => ({ ...prev, discharge_summary: e.target.value }))}
                                    />
                                </div>

                                {/* Medications */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">Medications Prescribed</label>
                                        <button
                                            type="button"
                                            className="text-xs text-indigo-600 hover:text-indigo-800"
                                            onClick={handleAddMedication}
                                        >
                                            + Add Medication
                                        </button>
                                    </div>
                                    {dischargeForm.medications.map((med, idx) => (
                                        <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                                            <input
                                                className="p-2 border rounded text-sm"
                                                placeholder="Medication name"
                                                value={med.name}
                                                onChange={e => handleMedicationChange(idx, 'name', e.target.value)}
                                            />
                                            <input
                                                className="p-2 border rounded text-sm"
                                                placeholder="Dosage"
                                                value={med.dosage}
                                                onChange={e => handleMedicationChange(idx, 'dosage', e.target.value)}
                                            />
                                            <div className="flex gap-1">
                                                <input
                                                    className="p-2 border rounded text-sm flex-1"
                                                    placeholder="Frequency"
                                                    value={med.frequency}
                                                    onChange={e => handleMedicationChange(idx, 'frequency', e.target.value)}
                                                />
                                                {dischargeForm.medications.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="text-red-500 hover:text-red-700 px-2"
                                                        onClick={() => handleRemoveMedication(idx)}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Follow-up */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border rounded"
                                            value={dischargeForm.follow_up_date}
                                            onChange={e => setDischargeForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Transport Arranged</label>
                                        <label className="flex items-center gap-2 p-2">
                                            <input
                                                type="checkbox"
                                                checked={dischargeForm.transport_arranged}
                                                onChange={e => setDischargeForm(prev => ({ ...prev, transport_arranged: e.target.checked }))}
                                            />
                                            <span className="text-sm">Patient has arranged transport</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Instructions</label>
                                    <textarea
                                        className="w-full p-3 border rounded text-sm"
                                        rows="3"
                                        placeholder="Enter follow-up instructions..."
                                        value={dischargeForm.follow_up_instructions}
                                        onChange={e => setDischargeForm(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        className="w-full p-3 border rounded text-sm"
                                        rows="2"
                                        placeholder="Additional notes..."
                                        value={dischargeForm.notes}
                                        onChange={e => setDischargeForm(prev => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        className="bg-green-600 text-white px-6 py-2 rounded font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                                        onClick={processDischarge}
                                        disabled={discharging || (readiness && !readiness.is_ready)}
                                    >
                                        {discharging ? 'Processing...' : 'Process Discharge'}
                                    </button>
                                    <button
                                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors hover:bg-gray-300"
                                        onClick={() => { setSelectedPatient(null); setReadiness(null); setActiveTab('patients'); }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </DashboardCard>
                        </div>
                    )}

                    {/* Discharge Result Tab */}
                    {activeTab === 'result' && dischargeResult && (
                        <DashboardCard className="animate-fade-in-up border-green-300 bg-green-50">
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">✅</div>
                                <h3 className="text-xl font-bold text-green-800 mb-2">Patient Discharged Successfully</h3>
                                <p className="text-sm text-green-700 mb-4">{dischargeResult.message}</p>
                                <div className="text-left max-w-md mx-auto bg-white rounded p-4 border border-green-200">
                                    <p className="text-sm"><strong>Type:</strong> {dischargeResult.discharge_record?.discharge_type}</p>
                                    <p className="text-sm"><strong>Condition:</strong> {dischargeResult.discharge_record?.condition_at_discharge}</p>
                                    <p className="text-sm"><strong>Summary:</strong></p>
                                    <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-1">
                                        {dischargeResult.discharge_record?.discharge_summary}
                                    </pre>
                                </div>
                                <button
                                    className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded text-sm"
                                    onClick={() => { setDischargeResult(null); setActiveTab('patients'); }}
                                >
                                    Back to Patient List
                                </button>
                            </div>
                        </DashboardCard>
                    )}
                </>
            )}
        </div>
    );
};

export default PatientDischargeWorkflow;
