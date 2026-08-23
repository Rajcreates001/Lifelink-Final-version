import React, { useState } from 'react';
import { buildQuery } from './helpers';

export const HospitalStaffManagement = () => {
    const { user } = useAuth();
    const hospitalId = user?._id || user?.id;
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', department: 'Emergency', role: 'Nurse', availability: true });
    const [skillSummary, setSkillSummary] = useState(null);
    const [optimizer, setOptimizer] = useState(null);
    const [staffSearch, setStaffSearch] = useState('');
    const [staffSortBy, setStaffSortBy] = useState('createdAt');
    const [staffSortDir, setStaffSortDir] = useState('desc');

    const fetchStaff = async () => {
        if (!hospitalId) {
            setStaff([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const staffQuery = buildQuery({
                hospitalId,
                search: staffSearch,
                sort_by: staffSortBy,
                sort_dir: staffSortDir
            });
            const [res, skillRes, optimizerRes] = await Promise.all([
                apiFetch(`/api/hospital-ops/staff${staffQuery}`, { method: 'GET' }),
                apiFetch(`/api/hospital-ops/staff/skills/summary?hospitalId=${hospitalId}`, { method: 'GET' }),
                apiFetch(`/api/hospital-ops/staff/optimizer?hospitalId=${hospitalId}`, { method: 'GET' })
            ]);
            const items = res.ok ? (res.data?.data || []) : [];
            setStaff(items.map((item) => ({
                id: item._id || item.id,
                name: item.name || 'Staff',
                department: item.department || 'General',
                role: item.role || 'Doctor',
                availability: item.availability !== false
            })));
            setSkillSummary(skillRes.ok ? skillRes.data : null);
            setOptimizer(optimizerRes.ok ? optimizerRes.data : null);
        } catch (err) {
            setStaff([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [hospitalId, staffSearch, staffSortBy, staffSortDir]);

    const handleAdd = () => {
        if (!newStaff.name) return;
        apiFetch('/api/hospital-ops/staff', {
            method: 'POST',
            body: JSON.stringify({
                hospitalId,
                name: newStaff.name,
                department: newStaff.department,
                role: newStaff.role,
                availability: newStaff.availability
            })
        }).then((res) => {
            if (res.ok) {
                setStaff((prev) => [{
                    id: res.data._id || res.data.id,
                    name: res.data.name,
                    department: res.data.department,
                    role: res.data.role,
                    availability: res.data.availability !== false
                }, ...prev]);
            }
        });
        setNewStaff({ name: '', department: 'Emergency', role: 'Nurse', availability: true });
    };

    const handleToggle = (id) => {
        setStaff((prev) => {
            const target = prev.find((item) => item.id === id);
            const nextAvailability = target ? !target.availability : true;
            apiFetch(`/api/hospital-ops/staff/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ availability: nextAvailability })
            });
            return prev.map((item) => item.id === id ? { ...item, availability: nextAvailability } : item);
        });
    };

    const handleRemove = (id) => {
        setStaff((prev) => prev.filter((item) => item.id !== id));
        apiFetch(`/api/hospital-ops/staff/${id}`, { method: 'DELETE' });
    };

    const handleSave = async () => {
        if (!hospitalId) return;
        setSaving(true);
        try {
            await Promise.all(
                staff.map((item) => apiFetch(`/api/hospital-ops/staff/${item.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: item.name,
                        department: item.department,
                        availability: item.availability,
                        role: item.role
                    })
                }))
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <DashboardCard className="animate-fade-in-up delay-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Staff Management</h3>
                    <ExportButton data={staff} filename="hospital_staff" label="Export" columns={['name','department','role','availability']} columnLabels={{ name: 'Name', department: 'Department', role: 'Role', availability: 'Available' }} formatValue={(v, col) => col === 'availability' ? (v ? 'Yes' : 'No') : undefined} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        className="p-2 border rounded"
                        placeholder="Name"
                        value={newStaff.name}
                        onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    />
                    <select
                        className="p-2 border rounded"
                        value={newStaff.department}
                        onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    >
                        <option>Emergency</option>
                        <option>ICU</option>
                        <option>OPD</option>
                        <option>Radiology</option>
                        <option>Surgery</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    >
                        <option>Doctor</option>
                        <option>Nurse</option>
                        <option>Technician</option>
                        <option>Support</option>
                    </select>
                    <button
                        type="button"
                        className="bg-indigo-600 text-white rounded px-4"
                        onClick={handleAdd}
                    >
                        Add Staff
                    </button>
                </div>
            </DashboardCard>

            <DashboardCard className="animate-fade-in-up delay-200">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-800">Active Staff</h4>
                    <button
                        type="button"
                        className="text-xs bg-slate-900 text-white px-3 py-2 rounded transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                        className="p-2 border rounded w-full"
                        placeholder="Search staff"
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded"
                        value={staffSortBy}
                        onChange={(e) => setStaffSortBy(e.target.value)}
                    >
                        <option value="createdAt">Newest</option>
                        <option value="name">Name</option>
                        <option value="department">Department</option>
                        <option value="role">Role</option>
                        <option value="availability">Availability</option>
                    </select>
                    <select
                        className="p-2 border rounded"
                        value={staffSortDir}
                        onChange={(e) => setStaffSortDir(e.target.value)}
                    >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                        {staff.length === 0 ? (
                            <div className="text-sm text-gray-500">No staff records loaded.</div>
                        ) : (
                            staff.map((item) => (
                                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-lg bg-white/70">
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.department} • {item.role}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusPill text={item.availability ? 'Available' : 'Off Duty'} color={item.availability ? 'green' : 'gray'} />
                                        <button className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors duration-150" onClick={() => handleToggle(item.id)}>Toggle</button>
                                        <button className="text-xs text-red-500 hover:text-red-700 transition-colors duration-150" onClick={() => handleRemove(item.id)}>Remove</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DashboardCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard className="animate-fade-in-up delay-300">
                    <h4 className="font-bold text-gray-800 mb-3">Skill Mix Summary</h4>
                    {!skillSummary ? (
                        <div className="text-sm text-gray-500">No skill tags recorded yet.</div>
                    ) : (
                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
                            {(skillSummary.skills || []).length === 0 ? (
                                <div className="text-sm text-gray-500">No skills captured.</div>
                            ) : (
                                skillSummary.skills.slice(0, 6).map((item) => (
                                    <div key={item.skill} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                                        <span className="text-gray-600">{item.skill}</span>
                                        <span className="font-semibold text-gray-900">{item.count}</span>
                                    </div>
                                ))
                            )}
                            {(skillSummary.recommendations || []).length > 0 && (
                                <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                    {skillSummary.recommendations.join(' ')}
                                </div>
                            )}
                        </div>
                    )}
                </DashboardCard>

                <DashboardCard className="animate-fade-in-up delay-400">
                    <h4 className="font-bold text-gray-800 mb-3">Staff Optimizer</h4>
                    {!optimizer ? (
                        <div className="text-sm text-gray-500">No optimizer insights yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {(optimizer.recommendations || []).map((rec, idx) => (
                                <div key={`${rec.department}-${idx}`} className="border rounded px-3 py-2 text-sm">
                                    <p className="font-semibold text-gray-800">{rec.department}</p>
                                    <p className="text-xs text-gray-500">{rec.action} • {rec.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardCard>
            </div>
        </div>
    );
};
