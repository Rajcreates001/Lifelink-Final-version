import React, { useState, useEffect } from 'react';
import { buildQuery } from './helpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import { DashboardCard, LoadingSpinner, StatusPill, ProgressBar } from '../Common';

export const HospitalOPDQueue = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [queue, setQueue] = useState([]);
    const [avgWait, setAvgWait] = useState(0);
    const [queuePressure, setQueuePressure] = useState(0);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ patientName: '', reason: '', priority: 'Normal', assignedDoctor: '' });
    const [assignmentDrafts, setAssignmentDrafts] = useState({});
    const [queueSearch, setQueueSearch] = useState('');
    const [queueSortBy, setQueueSortBy] = useState('createdAt');
    const [queueSortDir, setQueueSortDir] = useState('asc');

    const loadQueue = async (isActive) => {
        if (!hospitalId) {
            if (isActive) setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const queueQuery = buildQuery({
                hospitalId,
                search: queueSearch,
                sort_by: queueSortBy,
                sort_dir: queueSortDir
            });
            const res = await apiFetch(`/api/hospital-ops/opd/queue${queueQuery}`, { method: 'GET' });
            if (res.ok && isActive) {
                setQueue(res.data?.data || []);
                setAvgWait(res.data?.avgWaitMinutes || 0);
                setQueuePressure(res.data?.queuePressure || 0);
            }
        } finally {
            if (isActive) setLoading(false);
        }
    };

    useEffect(() => {
        let isActive = true;
        loadQueue(isActive);
        return () => { isActive = false; };
    }, [hospitalId, queueSearch, queueSortBy, queueSortDir]);

    const handleAdd = async () => {
        if (!hospitalId || !form.patientName) return;
        const res = await apiFetch('/api/hospital-ops/opd/queue', {
            method: 'POST',
            body: JSON.stringify({
                hospitalId,
                patientName: form.patientName,
                reason: form.reason,
                priority: form.priority,
                assignedDoctor: form.assignedDoctor
            })
        });
        if (res.ok) {
            setQueue((prev) => [...prev, res.data]);
            setForm({ patientName: '', reason: '', priority: 'Normal', assignedDoctor: '' });
        }
    };

    const updateQueue = async (id, status) => {
        setQueue((prev) => prev.map((item) => (item._id || item.id) === id ? { ...item, status } : item));
        await apiFetch(`/api/hospital-ops/opd/queue/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        loadQueue(true);
    };

    const saveAssignment = async (id) => {
        const assignedDoctor = assignmentDrafts[id];
        if (assignedDoctor === undefined) return;
        setQueue((prev) => prev.map((item) => (item._id || item.id) === id ? { ...item, assignedDoctor } : item));
        await apiFetch(`/api/hospital-ops/opd/queue/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ assignedDoctor })
        });
        loadQueue(true);
    };

    const handleRemove = async (id) => {
        await apiFetch(`/api/hospital-ops/opd/queue/${id}`, { method: 'DELETE' });
        setQueue((prev) => prev.filter((item) => (item._id || item.id) !== id));
        loadQueue(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">OPD Queue Live Monitor</h3>
                        <p className="text-sm text-gray-500">Average wait: {avgWait} minutes</p>
                    </div>
                    <div className="text-xs text-gray-400">Pressure {queuePressure}%</div>
                </div>
                <ProgressBar value={queuePressure} colorClass="bg-rose-500" />
            </DashboardCard>

            <DashboardCard>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <input className="p-2 border rounded" placeholder="Patient" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
                    <input className="p-2 border rounded" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                    <select className="p-2 border rounded" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                        <option>Normal</option>
                        <option>High</option>
                        <option>Critical</option>
                    </select>
                    <button className="bg-indigo-600 text-white rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95" onClick={handleAdd}>Add</button>
                </div>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                        className="p-2 border rounded w-full"
                        placeholder="Search queue"
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded"
                        value={queueSortBy}
                        onChange={(e) => setQueueSortBy(e.target.value)}
                    >
                        <option value="createdAt">Check-in</option>
                        <option value="priority">Priority</option>
                        <option value="status">Status</option>
                        <option value="patientName">Patient</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={queueSortDir}
                        onChange={(e) => setQueueSortDir(e.target.value)}
                    >
                        <option value="asc">Asc</option>
                        <option value="desc">Desc</option>
                    </select>
                </div>
                <input
                    className="p-2 border rounded w-full mb-4"
                    placeholder="Assign doctor"
                    value={form.assignedDoctor}
                    onChange={(e) => setForm({ ...form, assignedDoctor: e.target.value })}
                />
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                        {queue.length === 0 ? (
                            <div className="text-sm text-gray-500">Queue is empty.</div>
                        ) : (
                            queue.map((item) => (
                                <div key={item._id || item.id} className="border rounded p-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">{item.patientName}</p>
                                            <p className="text-xs text-gray-500">{item.reason || 'General'} • {item.priority}</p>
                                            <p className="text-xs text-gray-400">
                                                ETA {item.predictedWaitMinutes || 0} min • Check-in {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : 'N/A'}
                                            </p>
                                            {item.assignedDoctor && (
                                                <p className="text-xs text-indigo-500">Assigned: {item.assignedDoctor}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusPill text={item.status || 'Waiting'} color={item.status === 'In Service' ? 'blue' : item.status === 'Completed' ? 'green' : 'yellow'} />
                                            <button className="text-xs text-indigo-600" onClick={() => updateQueue(item._id || item.id, 'In Service')}>Serve</button>
                                            <button className="text-xs text-green-600" onClick={() => updateQueue(item._id || item.id, 'Completed')}>Complete</button>
                                            <button className="text-xs text-amber-600" onClick={() => updateQueue(item._id || item.id, 'Canceled')}>Cancel</button>
                                            <button className="text-xs text-red-600" onClick={() => handleRemove(item._id || item.id)}>Delete</button>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex gap-2">
                                            <input
                                                className="border rounded px-2 py-1 text-xs w-full"
                                                placeholder="Assign doctor"
                                                value={assignmentDrafts[item._id || item.id] ?? item.assignedDoctor ?? ''}
                                                onChange={(e) => setAssignmentDrafts((prev) => ({
                                                    ...prev,
                                                    [item._id || item.id]: e.target.value
                                                }))}
                                            />
                                            <button
                                                className="text-xs text-indigo-600"
                                                onClick={() => saveAssignment(item._id || item.id)}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DashboardCard>
        </div>
    );
};
