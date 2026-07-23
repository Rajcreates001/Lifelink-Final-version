import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import RoleCard from '../components/ui/RoleCard';
import Card from '../components/ui/Card';
import { apiFetch } from '../config/api';

const roles = [
    { key: 'dispatcher', title: 'Dispatcher', desc: 'Dispatch and routing controls', icon: 'fa-route' },
    { key: 'crew', title: 'Crew', desc: 'On-road operations and updates', icon: 'fa-truck-medical' },
];

const AmbulanceRoleSelect = () => {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const allowSwitch = new URLSearchParams(location.search).get('switch') === '1';

    useEffect(() => {
        if (!allowSwitch && user?.subRole && user?.role === 'ambulance') {
            navigate('/dashboard/ambulance', { replace: true });
        }
    }, [allowSwitch, user?.subRole, user?.role, navigate]);

    const handleSelect = async (subRole) => {
        setLoading(true);
        setError('');
        try {
            const { ok, data, status } = await apiFetch('/v2/auth/select-role', {
                method: 'POST',
                body: JSON.stringify({ subRole }),
            });
            if (!ok) {
                const message = data.detail || data.error || 'Role selection failed';
                if (status === 401) {
                    setError('Session expired. Please login again.');
                } else {
                    setError(message);
                }
                setLoading(false);
                return;
            }
            const nextUser = { ...data.user, role: 'ambulance', subRole: data.user?.subRole || subRole };
            const token = data.token || sessionStorage.getItem('lifelink_token') || localStorage.getItem('lifelink_token') || '';
            login(nextUser, token);
            navigate('/dashboard/ambulance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 font-sans relative overflow-hidden">
            {/* Animated background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 blur-3xl animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-purple-200/30 to-pink-200/30 blur-3xl animate-float delay-500"></div>

            <Card className="max-w-4xl w-full max-h-[calc(100vh-3rem)] overflow-y-auto sm:max-h-none sm:overflow-visible animate-zoom-in border border-white/50 z-10" style={{ animationDuration: '0.7s' }}>
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full rounded-t-2xl"></div>
                <div className="p-6 sm:p-8">
                <div className="mb-4 flex items-center justify-between animate-fade-in delay-100">
                    <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:gap-3 transition-all duration-300 group"
                    >
                        <i className="fas fa-arrow-left text-xs w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all duration-300"></i>
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="text-xs text-gray-400 font-medium">
                        <i className="fas fa-heart-pulse text-blue-400 mr-1"></i>
                        LifeLink
                    </div>
                </div>
                <div className="text-center mb-8 animate-fade-in-up delay-100">
                    <p className="text-xs font-bold uppercase text-slate-500">Ambulance Role Selection</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 font-display mt-2">Choose your role</h2>
                    <p className="text-slate-600 mt-2">Select your operations workspace.</p>
                </div>

                {error && <div className="mb-4 text-sm text-red-600 text-center">{error}</div>}

                <div className="flex flex-wrap gap-3 justify-center">
                    {roles.map((role) => (
                        <RoleCard
                            key={role.key}
                            title={role.title}
                            description={role.desc}
                            icon={role.icon}
                            onSelect={() => handleSelect(role.key)}
                        />
                    ))}
                </div>

                {loading && <p className="text-center text-sm text-slate-500 mt-6">Applying role...</p>}
                </div>
            </Card>
        </div>
    );
};

export default AmbulanceRoleSelect;
