import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { DashboardCard, LoadingSpinner, StatusPill } from './Common';

const SHIFTS = ['Morning (6AM-2PM)', 'Afternoon (2PM-10PM)', 'Night (10PM-6AM'];
const DEPARTMENTS = ['Emergency', 'ICU', 'OPD', 'Radiology', 'Surgery', 'Cardiology', 'Neurology', 'General'];
const ROLES = ['Doctor', 'Nurse', 'Technician', 'Support Staff'];

const StaffSchedulingModule = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;

    const [schedule, setSchedule] = useState([]);
    const [staff, setStaff] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('schedule');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddShift, setShowAddShift] = useState(false);
    const [newShift, setNewShift] = useState({ staffId: '', shift: SHIFTS[0], department: 'Emergency', date: '' });
    const [optimizerResult, setOptimizerResult] = useState(null);
    const [optimizing, setOptimizing] = useState(false);

    // Filters
    const [filterDept, setFilterDept] = useState('All');
    const [filterShift, setFilterShift] = useState('All');

    const loadData = useCallback(async () => {
        if (!hospitalId) { setLoading(false); return; }
        setLoading(true);
        try {
            const [scheduleRes, staffRes, leaveRes] = await Promise.all([
                apiFetch(`/api/hospital-ops/schedule?hospitalId=${hospitalId}&date=${selectedDate}`, { method: 'GET' }),
                apiFetch(`/api/hospital-ops/staff?hospitalId=${hospitalId}`, { method: 'GET' }),
                apiFetch(`/api/hospital-ops/leave-requests?hospitalId=${hospitalId}`, { method: 'GET' }),
            ]);
            setSchedule(scheduleRes.ok ? (scheduleRes.data?.data || []) : []);
            setStaff(staffRes.ok ? (staffRes.data?.data || []) : []);
            setLeaveRequests(leaveRes.ok ? (leaveRes.data?.data || []) : []);
        } catch (err) {
            console.error('Failed to load scheduling data:', err);
        } finally {
            setLoading(false);
        }
    }, [hospitalId, selectedDate]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAddShift = async () => {
        if (!newShift.staffId || !hospitalId) return;
        try {
            const res = await apiFetch('/api/hospital-ops/schedule', {
                method: 'POST',
                body: JSON.stringify({ hospitalId, ...newShift, date: selectedDate }),
            });
            if (res.ok) {
                setSchedule((prev) => [...prev, res.data]);
                setShowAddShift(false);
                setNewShift({ staffId: '', shift: SHIFTS[0], department: 'Emergency', date: '' });
            }
        } catch (err) {
            console.error('Failed to add shift:', err);
        }
    };

    const handleApproveLeave = async (leaveId, status) => {
        try {
            const res = await apiFetch(`/api/hospital-ops/leave-requests/${leaveId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setLeaveRequests((prev) => prev.map((l) => (l._id || l.id) === leaveId ? { ...l, status } : l));
            }
        } catch (err) {
            console.error('Failed to update leave:', err);
        }
    };

    const runOptimizer = async () => {
        if (!hospitalId) return;
        setOptimizing(true);
        try {
            const res = await apiFetch('/api/hospital-ops/staff/optimizer', {
                method: 'POST',
                body: JSON.stringify({ hospitalId, date: selectedDate, department: filterDept !== 'All' ? filterDept : undefined }),
            });
            setOptimizerResult(res.ok ? res.data : null);
        } catch (err) {
            console.error('Optimizer failed:', err);
        } finally {
            setOptimizing(false);
        }
    };

    // Filter schedule
    const filteredSchedule = schedule.filter((s) => {
        if (filterDept !== 'All' && s.department !== filterDept) return false;
        if (filterShift !== 'All' && s.shift !== filterShift) return false;
        return true;
    });

    // Group by shift
    const shiftGroups = {};
    filteredSchedule.forEach((s) => {
        const key = s.shift || 'Unassigned';
        if (!shiftGroups[key]) shiftGroups[key] = [];
        shiftGroups[key].push(s);
    });

    const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');
    const approvedLeaves = leaveRequests.filter((l) => l.status === 'approved');

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <DashboardCard>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Staff Scheduling</h2>
                        <p className="text-sm text-gray-500">Manage shifts, leave requests, and AI-optimized staffing</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm" />
                        <button onClick={() => setShowAddShift(true)}
                            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors">
                            <i className="fas fa-plus mr-1"></i> Add Shift
                        </button>
                    </div>
                </div>
            </DashboardCard>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[
                    { key: 'schedule', label: 'Schedule', icon: 'fa-calendar' },
                    { key: 'leave', label: `Leave Requests (${pendingLeaves.length})`, icon: 'fa-calendar-times' },
                    { key: 'optimize', label: 'AI Optimizer', icon: 'fa-brain' },
                ].map((tab) => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                            activeTab === tab.key ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        <i className={`fas ${tab.icon} mr-1`}></i> {tab.label}
                    </button>
                ))}
            </div>

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <DashboardCard>
                        <div className="flex flex-wrap gap-3">
                            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm">
                                <option value="All">All Departments</option>
                                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm">
                                <option value="All">All Shifts</option>
                                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="ml-auto text-sm text-gray-500">
                                {filteredSchedule.length} staff scheduled
                            </div>
                        </div>
                    </DashboardCard>

                    {/* Shift Groups */}
                    {Object.entries(shiftGroups).map(([shiftName, members]) => (
                        <DashboardCard key={shiftName}>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">
                                <i className="fas fa-clock mr-2 text-indigo-500"></i>
                                {shiftName} ({members.length} staff)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {members.map((s, idx) => (
                                    <div key={s._id || s.id || idx} className="border rounded-lg p-3 bg-white/70 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-800">{s.staffName || s.name || 'Staff'}</p>
                                            <StatusPill text={s.status || 'Scheduled'} color="blue" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {s.department} • {s.role || 'Staff'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {members.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">No staff on this shift</p>
                            )}
                        </DashboardCard>
                    ))}

                    {Object.keys(shiftGroups).length === 0 && (
                        <DashboardCard>
                            <p className="text-center text-gray-500 py-8">No shifts scheduled for this date</p>
                        </DashboardCard>
                    )}
                </div>
            )}

            {/* Leave Requests Tab */}
            {activeTab === 'leave' && (
                <div className="space-y-4">
                    {/* Pending */}
                    <DashboardCard>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">
                            <i className="fas fa-clock mr-2 text-amber-500"></i>
                            Pending Requests ({pendingLeaves.length})
                        </h3>
                        {pendingLeaves.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No pending leave requests</p>
                        ) : (
                            <div className="space-y-2">
                                {pendingLeaves.map((l) => (
                                    <div key={l._id || l.id} className="flex items-center justify-between border rounded-lg p-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">{l.staffName || l.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {l.startDate} to {l.endDate} • {l.reason || 'No reason'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveLeave(l._id || l.id, 'approved')}
                                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                                                Approve
                                            </button>
                                            <button onClick={() => handleApproveLeave(l._id || l.id, 'rejected')}
                                                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardCard>

                    {/* Approved */}
                    {approvedLeaves.length > 0 && (
                        <DashboardCard>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">
                                <i className="fas fa-check-circle mr-2 text-green-500"></i>
                                Approved ({approvedLeaves.length})
                            </h3>
                            <div className="space-y-2">
                                {approvedLeaves.map((l) => (
                                    <div key={l._id || l.id} className="flex items-center justify-between border rounded-lg p-3 bg-green-50">
                                        <div>
                                            <p className="font-semibold text-gray-800">{l.staffName || l.name}</p>
                                            <p className="text-xs text-gray-500">{l.startDate} to {l.endDate}</p>
                                        </div>
                                        <StatusPill text="Approved" color="green" />
                                    </div>
                                ))}
                            </div>
                        </DashboardCard>
                    )}
                </div>
            )}

            {/* AI Optimizer Tab */}
            {activeTab === 'optimize' && (
                <DashboardCard>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                        <i className="fas fa-brain mr-2 text-purple-500"></i>
                        AI Staff Optimization
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Use AI to analyze current staffing levels and get optimization recommendations.
                    </p>
                    <button onClick={runOptimizer} disabled={optimizing}
                        className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
                        {optimizing ? <><i className="fas fa-spinner fa-spin mr-1"></i> Analyzing...</> : <><i className="fas fa-magic mr-1"></i> Run Optimizer</>}
                    </button>

                    {optimizerResult && (
                        <div className="mt-4 space-y-3">
                            {(optimizerResult.recommendations || []).map((rec, idx) => (
                                <div key={idx} className="border rounded-lg p-3 bg-purple-50">
                                    <p className="font-semibold text-gray-800">{rec.department || 'General'}</p>
                                    <p className="text-sm text-gray-600 mt-1">{rec.action || rec.recommendation}</p>
                                    {rec.reason && <p className="text-xs text-gray-500 mt-1">Reason: {rec.reason}</p>}
                                </div>
                            ))}
                            {optimizerResult.summary && (
                                <p className="text-sm text-gray-600 mt-2">{optimizerResult.summary}</p>
                            )}
                        </div>
                    )}
                </DashboardCard>
            )}

            {/* Add Shift Modal */}
            {showAddShift && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddShift(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Shift</h3>
                        <div className="space-y-3">
                            <select value={newShift.staffId} onChange={(e) => setNewShift({ ...newShift, staffId: e.target.value })}
                                className="w-full border rounded-lg p-2.5 text-sm">
                                <option value="">Select Staff</option>
                                {staff.map((s) => (
                                    <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.department})</option>
                                ))}
                            </select>
                            <select value={newShift.shift} onChange={(e) => setNewShift({ ...newShift, shift: e.target.value })}
                                className="w-full border rounded-lg p-2.5 text-sm">
                                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={newShift.department} onChange={(e) => setNewShift({ ...newShift, department: e.target.value })}
                                className="w-full border rounded-lg p-2.5 text-sm">
                                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowAddShift(false)} className="flex-1 border rounded-lg py-2.5 text-sm font-medium">Cancel</button>
                            <button onClick={handleAddShift} className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold">Add Shift</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffSchedulingModule;
