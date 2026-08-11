import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import EnterpriseModal from './ui/EnterpriseModal';

const GovernmentProfileModal = ({ open, onClose }) => {
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
        zone: '',
        badgeId: '',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            department: user?.location || '',
            zone: '',
            badgeId: '',
            password: ''
        });
    }, [user]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.password) delete payload.password;

            const { ok, status, data } = await apiFetch(`/api/dashboard/profile/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (!ok) throw new Error(data?.message || 'Update failed (' + status + ')');

            localStorage.setItem('user', JSON.stringify({ ...user, ...data.user }));
            setMsg('Official Profile Updated');
            setTimeout(() => { window.location.reload(); }, 1000);
        } catch (err) {
            setMsg('Update Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <EnterpriseModal
            open={open}
            onClose={onClose}
            variant="government"
            size="md"
            title="Authority Profile"
            subtitle="Government of India - National Emergency Platform"
            showCloseBtn={true}
            closeOnEsc={true}
            closeOnClickOutside={true}
            headerFixed={true}
            footerFixed={false}
            hideFooter={true}
            icon={
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {msg && (
                    <div className={'p-3 rounded-xl text-center text-sm font-bold ' + (msg.includes('Updated') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                        {msg}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Officer Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Official Email</label>
                        <input name="email" value={formData.email} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                        <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Health Ministry" className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zone</label>
                        <input name="zone" value={formData.zone} onChange={handleChange} placeholder="e.g. South Zone" className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Badge ID</label>
                        <input name="badgeId" value={formData.badgeId} onChange={handleChange} placeholder="e.g. GOVT-8821" className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all font-mono" />
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Update Password</label>
                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep current password" className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all" />
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50">{loading ? 'Updating Records...' : 'Save Official Details'}</button>
                </div>
            </form>
        </EnterpriseModal>
    );
};

export default GovernmentProfileModal;
