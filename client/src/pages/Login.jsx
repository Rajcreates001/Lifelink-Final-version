import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

const CREDENTIALS = {
    public: { email: 'public.001@lifelink.demo', hospitalId: '', password: 'Demo@2026!' },
    hospital: { email: '', hospitalId: 'HOSP-1001', password: 'Demo@2026!' },
    ambulance: { email: 'ambulance.002@lifelink.demo', hospitalId: '', password: 'Demo@2026!' },
    government: { email: 'government.001@lifelink.demo', hospitalId: '', password: 'Demo@2026!' },
};

// ─── Design Token Helpers ─────────────────────────────
const ROLE_META = {
    public: {
        icon: 'fa-user', label: 'Public',
        hue: 'blue', hex: '#2563EB',
        hexLight: 'rgba(37,99,235,0.08)',
        hexFlow: 'rgba(37,99,235,0.22)',
        hexBorder: 'rgba(37,99,235,0.13)',
        borderGradient: 'from-blue-400 via-blue-500 to-blue-600',
        shadowColor: 'rgba(37,99,235,0.25)',
        ring: 'rgba(37,99,235,0.15)',
    },
    hospital: {
        icon: 'fa-hospital', label: 'Hospital',
        hue: 'emerald', hex: '#059669',
        hexLight: 'rgba(5,150,105,0.08)',
        hexFlow: 'rgba(5,150,105,0.22)',
        hexBorder: 'rgba(5,150,105,0.13)',
        borderGradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
        shadowColor: 'rgba(5,150,105,0.25)',
        ring: 'rgba(5,150,105,0.15)',
    },
    ambulance: {
        icon: 'fa-ambulance', label: 'Ambulance',
        hue: 'red', hex: '#DC2626',
        hexLight: 'rgba(220,38,38,0.08)',
        hexFlow: 'rgba(220,38,38,0.22)',
        hexBorder: 'rgba(220,38,38,0.13)',
        borderGradient: 'from-red-400 via-red-500 to-red-600',
        shadowColor: 'rgba(220,38,38,0.25)',
        ring: 'rgba(220,38,38,0.15)',
    },
    government: {
        icon: 'fa-landmark', label: 'Government',
        hue: 'purple', hex: '#7C3AED',
        hexLight: 'rgba(124,58,237,0.08)',
        hexFlow: 'rgba(124,58,237,0.22)',
        hexBorder: 'rgba(124,58,237,0.13)',
        borderGradient: 'from-purple-400 via-purple-500 to-purple-600',
        shadowColor: 'rgba(124,58,237,0.25)',
        ring: 'rgba(124,58,237,0.15)',
    },
};

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', hospitalId: '', password: '', role: 'public' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rippleId, setRippleId] = useState(0);
    const defaults = useMemo(() => CREDENTIALS, []);
    const currentRole = ROLE_META[formData.role] || ROLE_META.public;

    // Cross-fade: track previous role's hexFlow so old wave layer fades out smoothly
    const [fadingHexFlow, setFadingHexFlow] = useState(null);
    const prevHexFlowRef = useRef(currentRole.hexFlow);
    useEffect(() => {
        const prev = prevHexFlowRef.current;
        if (prev !== currentRole.hexFlow) {
            setFadingHexFlow(prev);
            prevHexFlowRef.current = currentRole.hexFlow;
            const timer = setTimeout(() => setFadingHexFlow(null), 550);
            return () => clearTimeout(timer);
        }
    }, [currentRole.hexFlow]);

    useEffect(() => {
        try {
            const storedRole = sessionStorage.getItem('lifelink_login_role');
            if (storedRole) {
                setFormData((prev) => ({ ...prev, role: storedRole }));
                sessionStorage.removeItem('lifelink_login_role');
            }
        } catch (error) {}
    }, []);

    useEffect(() => {
        const creds = defaults[formData.role] || defaults.public;
        setFormData((prev) => ({ ...prev, email: creds.email, hospitalId: creds.hospitalId, password: creds.password }));
    }, [formData.role, defaults]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRipple = useCallback(() => {
        setRippleId((prev) => prev + 1);
        setTimeout(() => setRippleId(0), 800);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!API_BASE_URL) {
                setError('API URL not configured. Set VITE_API_URL in client/.env (e.g. http://localhost:3001) and restart Vite.');
                return;
            }
            if (formData.role === 'hospital' && !formData.hospitalId.trim()) {
                setError('Hospital ID is required for hospital login.');
                return;
            }
            if (formData.role !== 'hospital' && !formData.email.trim()) {
                setError('Email is required for this portal.');
                return;
            }
            const payload = {
                password: formData.password,
                role: formData.role,
                ...(formData.role === 'hospital'
                    ? { hospitalId: formData.hospitalId.trim() }
                    : { email: formData.email.trim() })
            };
            const res = await fetch(`${API_BASE_URL}/v2/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || data.error || data.message || 'Login failed');
            }
            if (!data.user || !data.user.role || !data.token) {
                throw new Error('Invalid server response: missing user or token.');
            }
            const userRole = data.user.role.toLowerCase();
            const userForSession = (userRole === 'hospital' || userRole === 'government')
                ? { ...data.user, subRole: null }
                : data.user;
            login(userForSession, data.token);
            if (userRole === 'hospital') {
                navigate('/dashboard/hospital/roles');
            } else if (userRole === 'government') {
                navigate('/dashboard/government/roles');
            } else if (userRole === 'ambulance') {
                navigate('/dashboard/ambulance');
            } else {
                navigate('/dashboard/public');
            }
        } catch (err) {
            const msg = err.message || '';
            setError(msg === 'Failed to fetch'
                ? 'Cannot reach server. Ensure the backend is running on http://localhost:3001.'
                : msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-4 font-sans relative overflow-hidden bg-gradient-to-br from-[#f0f5ff] via-[#faf5ff] to-[#f5f0ff]">
            {/* ─── Premium Aurora Background ──────────────────── */}
            {/* Large flowing aurora blobs */}
            <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[45%] rounded-full bg-gradient-to-br from-blue-400/15 via-indigo-400/15 to-blue-300/10 blur-[120px] animate-aurora pointer-events-none" aria-hidden="true"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[35%] h-[40%] rounded-full bg-gradient-to-br from-purple-400/15 via-violet-400/15 to-purple-300/10 blur-[120px] animate-aurora pointer-events-none" aria-hidden="true" style={{ animationDelay: '-7s' }}></div>
            <div className="absolute top-[30%] right-[-5%] w-[25%] h-[30%] rounded-full bg-gradient-to-br from-emerald-300/10 via-teal-300/10 to-cyan-300/8 blur-[100px] animate-aurora pointer-events-none" aria-hidden="true" style={{ animationDelay: '-14s' }}></div>

            {/* Floating glass particles */}
            <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-white/40 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true"></div>
            <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-blue-300/40 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true" style={{ animationDelay: '-2s', animationDuration: '8s' }}></div>
            <div className="absolute top-[35%] right-[35%] w-1 h-1 rounded-full bg-purple-300/30 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true" style={{ animationDelay: '-4s', animationDuration: '10s' }}></div>
            <div className="absolute top-[70%] left-[25%] w-2.5 h-2.5 rounded-full bg-emerald-200/30 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true" style={{ animationDelay: '-6s', animationDuration: '7s' }}></div>

            {/* Subtle heartbeat SVG line */}
            <svg className="absolute bottom-[18%] left-0 w-full h-[60px] opacity-[0.025] pointer-events-none" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,30 L200,30 L240,30 L260,10 L280,50 L300,30 L340,30 L380,30 L400,10 L420,50 L440,30 L480,30 L520,30 L540,10 L560,50 L580,30 L620,30 L660,30 L680,10 L700,50 L720,30 L760,30 L800,30 L820,10 L840,50 L860,30 L900,30 L1200,30"
                    fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="120" className="animate-heartbeat-line" />
            </svg>

            {/* ─── Glass Card Container ─────────────────────────── */}
            <div
                className="w-full max-w-[520px] animate-fade-in-up z-10 overflow-hidden relative backdrop-blur-[var(--glass-blur)]"
                style={{
                    borderRadius: 'var(--radius-card)',
                    animationDuration: '0.7s',
                    '--auth-focus': currentRole.hex,
                }}
            >
                {/* Card body with glass + animated role-colored wave + pulsing border glow */}
                <div
                    className="relative rounded-[var(--radius-card)] overflow-hidden animate-border-glow-pulse"
                    style={{
                        background: `linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)`,
                        backdropFilter: 'blur(16px)',
                        border: '1.5px solid',
                        borderColor: currentRole.hexBorder,
                        transition: 'border-color 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.6s cubic-bezier(0.4,0,0.2,1)',
                    }}
                >
                    {/* Cross-fade wave overlays — old layer fades out while new layer appears */}
                    {/* Layer 1: deep flow (current) */}
                    <div className="absolute inset-0 pointer-events-none animate-color-flow"
                        style={{
                            background: `radial-gradient(ellipse at 30% 20%, ${currentRole.hexFlow} 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, ${currentRole.hexFlow} 0%, transparent 55%)`,
                        }}
                    ></div>
                    {/* Layer 1: deep flow (previous — fading out) */}
                    {fadingHexFlow && (
                        <div className="absolute inset-0 pointer-events-none animate-color-flow animate-color-fade-out"
                            style={{
                                background: `radial-gradient(ellipse at 30% 20%, ${fadingHexFlow} 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, ${fadingHexFlow} 0%, transparent 55%)`,
                            }}
                        ></div>
                    )}
                    {/* Layer 2: breathing accent pulse (current) */}
                    <div className="absolute inset-0 pointer-events-none animate-color-breathe"
                        style={{
                            background: `radial-gradient(ellipse at 50% 50%, ${currentRole.hexFlow} 0%, transparent 60%)`,
                        }}
                    ></div>
                    {/* Layer 2: breathing accent pulse (previous — fading out) */}
                    {fadingHexFlow && (
                        <div className="absolute inset-0 pointer-events-none animate-color-breathe animate-color-fade-out"
                            style={{
                                background: `radial-gradient(ellipse at 50% 50%, ${fadingHexFlow} 0%, transparent 60%)`,
                            }}
                        ></div>
                    )}

                    {/* Inner content */}
                    <div className="relative p-7 sm:p-8">
                        {/* ─── Back Button Row ─────────────────────── */}
                        <div className="mb-5 flex items-center justify-between animate-fade-in delay-100">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all duration-200 group py-1.5 pr-2 -ml-1"
                                aria-label="Go back to home page"
                            >
                                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100/80 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all duration-200 backdrop-blur-sm">
                                    <i className="fas fa-arrow-left text-[11px]"></i>
                                </span>
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            <div className="text-[11px] font-semibold text-gray-400 tracking-wide flex items-center gap-1.5">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-[8px] animate-heartbeat">
                                    <i className="fas fa-heart-pulse"></i>
                                </span>
                                LifeLink
                            </div>
                        </div>

                        {/* ─── Header ─────────────────────────────── */}
                        <div className="text-center mb-6 animate-fade-in-up delay-150">
                            {/* Floating heartbeat logo */}
                            <div
                                className="w-[72px] h-[72px] mx-auto mb-4 rounded-[20px] flex items-center justify-center text-white text-[30px] animate-heartbeat relative"
                                style={{
                                    background: `linear-gradient(135deg, ${currentRole.hex}, ${currentRole.hex}dd)`,
                                    boxShadow: `0 12px 32px ${currentRole.shadowColor}`,
                                    transition: 'background 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.6s cubic-bezier(0.4,0,0.2,1)',
                                }}
                                aria-hidden="true"
                            >
                                <i className="fas fa-heart-pulse"></i>
                                {/* Inner glass reflection */}
                                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                            </div>
                            {/* Heading - 48px */}
                            <h2 className="text-[48px] font-bold text-gray-900 tracking-tight leading-[1.05]">
                                Welcome Back
                            </h2>
                            {/* Subtitle - 18px */}
                            <p className="text-[18px] text-gray-500 leading-snug mt-2 font-[450]">
                                Select your portal to continue
                            </p>
                        </div>

                        {/* ─── Icon-First Portal Selector ──────────── */}
                        <div className="flex items-center gap-2.5 mb-6 animate-fade-in-up delay-200" role="radiogroup" aria-label="Select portal">
                            {['public', 'hospital', 'ambulance', 'government'].map((r) => {
                                const role = ROLE_META[r];
                                const isActive = formData.role === r;
                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        role="radio"
                                        aria-checked={isActive}
                                        onClick={() => setFormData({ ...formData, role: r })}
                                        className={`portal-pill ${isActive ? 'shadow-md' : 'hover:shadow-sm'}`}
                                        style={{
                                            backgroundColor: isActive ? `${role.hexLight}` : 'rgba(255,255,255,0.9)',
                                            borderColor: isActive ? role.hex : '#E5E7EB',
                                            color: isActive ? role.hex : '#6B7280',
                                        }}
                                        aria-label={`Login as ${role.label}`}
                                    >
                                        <i className={`fas ${role.icon} text-[18px]`}></i>
                                        <span className="text-[13px] font-semibold">{role.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ─── Error Box ──────────────────────────── */}
                        {error && (
                            <div
                                className="mb-4 p-3.5 bg-red-50/90 backdrop-blur-sm text-[#DC2626] text-sm font-semibold rounded-[var(--radius-input)] border border-red-200 flex items-start gap-3 animate-shake"
                                role="alert"
                                aria-live="polite"
                            >
                                <i className="fas fa-exclamation-circle text-lg mt-0.5 flex-shrink-0"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ─── Login Form ─────────────────────────── */}
                        <form onSubmit={handleSubmit} className="animate-fade-in-up delay-300">
                            {/* Conditional: Hospital ID or Email */}
                            {formData.role === 'hospital' ? (
                                <div className="mb-4">
                                    <label className="auth-label">Hospital Registration ID</label>
                                    <div className="relative group">
                                        <i className={`fas fa-hospital-symbol absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none transition-colors duration-200 ${
                                            formData.role === 'hospital' ? 'text-emerald-500 group-focus-within:text-emerald-500' : 'text-gray-400'
                                        }`}></i>
                                        <input
                                            name="hospitalId"
                                            type="text"
                                            required
                                            className="auth-input"
                                            placeholder="HOSP-XXXX"
                                            value={formData.hospitalId}
                                            onChange={handleChange}
                                            aria-label="Hospital Registration ID"
                                            style={{
                                                '--border-light': '#E5E7EB',
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <label className="auth-label">Email Address</label>
                                    <div className="relative group">
                                        <i className={`fas fa-envelope absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none transition-all duration-200 ${
                                            formData.role === 'public' ? 'text-blue-500 group-focus-within:text-blue-500' :
                                            formData.role === 'ambulance' ? 'text-orange-500 group-focus-within:text-orange-500' :
                                            formData.role === 'government' ? 'text-purple-500 group-focus-within:text-purple-500' :
                                            'text-gray-400'
                                        }`}></i>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            className="auth-input"
                                            placeholder="name@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            aria-label="Email Address"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Password */}
                            <div className="mb-5">
                                <label className="auth-label">Password</label>
                                <div className="relative group">
                                    <i className={`fas fa-lock absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none transition-colors duration-200`}
                                        style={{ color: currentRole.hex }}
                                    ></i>
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="auth-input pr-12"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        aria-label="Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-[14px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* ─── Premium Login Button ───────────── */}
                            <button
                                type="submit"
                                disabled={loading}
                                onClick={handleRipple}
                                className={`relative w-full h-[52px] overflow-hidden rounded-[var(--radius-button)] flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 group ${
                                    loading ? '' : 'hover:shadow-lg'
                                }`}
                                style={{
                                    background: loading
                                        ? `linear-gradient(135deg, ${currentRole.hex}, ${currentRole.hex}bb)`
                                        : `linear-gradient(135deg, ${currentRole.hex}, ${currentRole.hex}dd)`,
                                    boxShadow: loading
                                        ? `0 4px 14px ${currentRole.shadowColor}`
                                        : `0 4px 14px ${currentRole.shadowColor}, 0 0 0 0 rgba(0,0,0,0)`,
                                    transition: 'background 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                                }}
                                aria-label={loading ? 'Processing login' : 'Login securely'}
                            >
                                {/* Glass shine overlay */}
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></span>
                                {/* Neon edge glow */}
                                <span className="absolute inset-0 rounded-[var(--radius-button)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{ boxShadow: `inset 0 0 0 1px ${currentRole.ring}` }}
                                ></span>

                                {rippleId > 0 && (
                                    <span key={rippleId} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none animate-shine-sweep"></span>
                                )}
                                {loading ? (
                                    <><i className="fas fa-spinner fa-spin text-white"></i> <span className="text-white text-[16px] font-semibold">Processing...</span></>
                                ) : (
                                    <>
                                        <i className="fas fa-arrow-right-to-bracket text-white text-[15px] group-hover:translate-x-0.5 transition-transform duration-200"></i>
                                        <span className="text-white text-[16px] font-semibold">Login Securely</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* ─── Footer ─────────────────────────────── */}
                        <div className="mt-5 text-center pt-4 border-t border-[#E5E7EB]/60 animate-fade-in delay-500">
                            <p className="text-[14px] text-gray-500">
                                New here?{' '}
                                <Link
                                    to="/signup"
                                    className="font-semibold hover:underline transition-all duration-200"
                                    style={{ color: currentRole.hex }}
                                >
                                    Create an account <i className="fas fa-arrow-right text-xs ml-0.5"></i>
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
