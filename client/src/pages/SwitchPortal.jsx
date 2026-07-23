import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';


const portals = [
    { key: 'public', title: 'Public', desc: 'Health dashboard, SOS, AI assistant', icon: 'fa-user-shield' },
    { key: 'hospital', title: 'Hospital', desc: 'Emergency intake, resources, analytics', icon: 'fa-hospital' },
    { key: 'ambulance', title: 'Ambulance', desc: 'Dispatch, tracking, route optimization', icon: 'fa-ambulance' },
    { key: 'government', title: 'Government', desc: 'City analytics, policies, oversight', icon: 'fa-landmark' },
];

const SwitchPortal = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const currentRole = user?.role?.toLowerCase();

    if (currentRole) {
        if (currentRole === 'hospital') {
            navigate('/dashboard/hospital/roles', { replace: true });
            return null;
        }
        if (currentRole === 'government') {
            navigate('/dashboard/government/roles', { replace: true });
            return null;
        }
        if (currentRole === 'ambulance') {
            navigate('/dashboard/ambulance/roles', { replace: true });
            return null;
        }
    }

    const handlePortal = (role) => {
        const targetRole = String(role || '').toLowerCase();
        if (!targetRole) return;

        if (targetRole === currentRole) {
            if (targetRole === 'hospital') {
                navigate(user?.subRole ? '/dashboard/hospital' : '/dashboard/hospital/roles');
                return;
            }
            if (targetRole === 'government') {
                navigate(user?.subRole ? '/dashboard/government' : '/dashboard/government/roles');
                return;
            }
            if (targetRole === 'ambulance') {
                navigate(user?.subRole ? '/dashboard/ambulance' : '/dashboard/ambulance/roles');
                return;
            }
            navigate('/dashboard/public');
            return;
        }
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 font-sans relative overflow-hidden">
            {/* Animated background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 blur-3xl animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-purple-200/30 to-pink-200/30 blur-3xl animate-float delay-500"></div>

            <Card className="max-w-4xl w-full animate-zoom-in border border-white/50 z-10" style={{ animationDuration: '0.7s' }}>
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full rounded-t-2xl"></div>
                <div className="p-6 sm:p-8">
                <div className="mb-4 flex items-center justify-between animate-fade-in delay-100">
                    <button
                        onClick={() => navigate('/dashboard')}
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
                    <p className="text-xs font-bold uppercase text-slate-500">Switch Portal</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 font-display mt-2">Choose your workspace</h2>
                    <p className="text-slate-600 mt-2">Switch portals without being logged out.</p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                    {portals.map((portal) => (
                        <button
                            key={portal.key}
                            type="button"
                            onClick={() => handlePortal(portal.key)}
                            className="flex-1 min-w-[120px] max-w-[220px] text-center bg-white/80 backdrop-blur p-3 sm:p-4 rounded-xl shadow-md border border-white/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="text-sky-500 text-lg sm:text-xl mb-1.5">
                                <i className={`fas ${portal.icon}`}></i>
                            </div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{portal.title} Portal</h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">{portal.desc}</p>
                            {portal.key === currentRole && (
                                <p className="text-[10px] text-emerald-600 mt-1.5 font-semibold">Current portal</p>
                            )}
                        </button>
                    ))}
                </div>
                </div>
            </Card>
        </div>
    );
};

export default SwitchPortal;
