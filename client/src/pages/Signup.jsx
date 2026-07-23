import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

// ─── Identical Design Token System from Login ──────────
const ROLE_META = {
    public: {
        icon: 'fa-user', label: 'Public',
        hex: '#2563EB',
        hexLight: 'rgba(37,99,235,0.08)',
        hexFlow: 'rgba(37,99,235,0.22)',
        hexBorder: 'rgba(37,99,235,0.13)',
        shadowColor: 'rgba(37,99,235,0.25)',
        ring: 'rgba(37,99,235,0.15)',
    },
    hospital: {
        icon: 'fa-hospital', label: 'Hospital',
        hex: '#059669',
        hexLight: 'rgba(5,150,105,0.08)',
        hexFlow: 'rgba(5,150,105,0.22)',
        hexBorder: 'rgba(5,150,105,0.13)',
        shadowColor: 'rgba(5,150,105,0.25)',
        ring: 'rgba(5,150,105,0.15)',
    },
    ambulance: {
        icon: 'fa-ambulance', label: 'Ambulance',
        hex: '#DC2626',
        hexLight: 'rgba(220,38,38,0.08)',
        hexFlow: 'rgba(220,38,38,0.22)',
        hexBorder: 'rgba(220,38,38,0.13)',
        shadowColor: 'rgba(220,38,38,0.25)',
        ring: 'rgba(220,38,38,0.15)',
    },
    government: {
        icon: 'fa-landmark', label: 'Government',
        hex: '#7C3AED',
        hexLight: 'rgba(124,58,237,0.08)',
        hexFlow: 'rgba(124,58,237,0.22)',
        hexBorder: 'rgba(124,58,237,0.13)',
        shadowColor: 'rgba(124,58,237,0.25)',
        ring: 'rgba(124,58,237,0.15)',
    },
};

const Signup = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', phone: '', location: '',
        role: 'public', subRole: '', regNumber: '', hospitalType: 'General',
        departmentRole: '', governmentLevel: '', ambulanceBase: '', vehicleId: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!API_BASE_URL) {
                setError('API URL not configured. Set VITE_API_URL in client/.env and restart Vite.');
                return;
            }
            const res = await fetch(API_BASE_URL + '/v2/auth/signup', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Signup failed');
            if (formData.role === 'hospital') {
                alert('Registration Successful! Please wait for Government verification before logging in.');
                navigate('/login');
            } else if (formData.role === 'ambulance') {
                alert('Ambulance registration submitted. Awaiting Government verification.');
                navigate('/login');
            } else {
                alert('Account Created Successfully!');
                navigate('/login');
            }
        } catch (err) {
            const msg = err.message || '';
            setError(msg === 'Failed to fetch' ? 'Cannot reach server.' : msg);
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-4 font-sans relative overflow-hidden bg-gradient-to-br from-[#f0f5ff] via-[#faf5ff] to-[#f5f0ff]">
            {/* ─── Premium Aurora Background (identical to Login) ── */}
            <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[45%] rounded-full bg-gradient-to-br from-blue-400/15 via-indigo-400/15 to-blue-300/10 blur-[120px] animate-aurora pointer-events-none" aria-hidden="true"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[35%] h-[40%] rounded-full bg-gradient-to-br from-purple-400/15 via-violet-400/15 to-purple-300/10 blur-[120px] animate-aurora pointer-events-none" aria-hidden="true" style={{ animationDelay: '-7s' }}></div>
            <div className="absolute top-[30%] right-[-5%] w-[25%] h-[30%] rounded-full bg-gradient-to-br from-emerald-300/10 via-teal-300/10 to-cyan-300/8 blur-[100px] animate-aurora pointer-events-none" aria-hidden="true" style={{ animationDelay: '-14s' }}></div>

            {/* Floating glass particles */}
            <div className="absolute top-[25%] left-[12%] w-2 h-2 rounded-full bg-white/40 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true"></div>
            <div className="absolute top-[65%] right-[18%] w-1.5 h-1.5 rounded-full bg-blue-300/40 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true" style={{ animationDelay: '-2s', animationDuration: '8s' }}></div>
            <div className="absolute top-[40%] right-[30%] w-1 h-1 rounded-full bg-purple-300/30 blur-[1px] animate-float-slow pointer-events-none" aria-hidden="true" style={{ animationDelay: '-4s', animationDuration: '10s' }}></div>

            {/* Subtle heartbeat SVG */}
            <svg className="absolute bottom-[15%] left-0 w-full h-[40px] opacity-[0.02] pointer-events-none" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,20 L300,20 L350,20 L370,5 L390,35 L410,20 L460,20 L510,20 L530,5 L550,35 L570,20 L620,20 L1200,20"
                    fill="none" stroke="#2563EB" strokeWidth="1" strokeDasharray="80" className="animate-heartbeat-line" />
            </svg>

            {/* ─── Glass Card Container ─────────────────────────── */}
            <div className="w-full max-w-[720px] animate-fade-in-up z-10 overflow-hidden relative backdrop-blur-[var(--glass-blur)]"
                style={{ borderRadius: 'var(--radius-card)', animationDuration: '0.7s', '--auth-focus': currentRole.hex }}>
                
                {/* Card body with glass + animated role-colored wave + pulsing border glow */}
                <div
                    className="relative rounded-[var(--radius-card)] overflow-hidden animate-border-glow-pulse"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)',
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

                    <div className="relative p-7 sm:p-8">
                        {/* ─── Back Button Row ─────────────────────── */}
                        <div className="mb-4 flex items-center justify-between animate-fade-in delay-100">
                            <button type="button" onClick={() => navigate('/')}
                                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all duration-200 group py-1.5 pr-2 -ml-1"
                                aria-label="Go back to home page">
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
                        <div className="text-center mb-5 animate-fade-in-up delay-150">
                            <div
                                className="w-[72px] h-[72px] mx-auto mb-4 rounded-[20px] flex items-center justify-center text-white text-[30px] animate-heartbeat relative"
                                style={{
                                    background: `linear-gradient(135deg, ${currentRole.hex}, ${currentRole.hex}dd)`,
                                    boxShadow: `0 12px 32px ${currentRole.shadowColor}`,
                                    transition: 'background 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.6s cubic-bezier(0.4,0,0.2,1)',
                                }}
                                aria-hidden="true"
                            >
                                <i className="fas fa-heartbeat"></i>
                                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                            </div>
                            <h2 className="text-[48px] font-bold text-gray-900 tracking-tight leading-[1.05]">Create Account</h2>
                            <p className="text-[18px] text-gray-500 leading-snug mt-2 font-[450]">Join the LifeLink Network</p>
                        </div>

                        {/* ─── Error Box ──────────────────────────── */}
                        {error && (
                            <div className="mb-4 p-3.5 bg-red-50/90 backdrop-blur-sm text-[#DC2626] text-sm font-semibold rounded-[var(--radius-input)] border border-red-200 flex items-start gap-3 animate-shake" role="alert" aria-live="polite">
                                <i className="fas fa-exclamation-circle text-lg mt-0.5 flex-shrink-0"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ─── Icon-First Portal Selector (identical to Login) ── */}
                        <div className="mb-5 animate-fade-in-up delay-200">
                            <label className="auth-label">I am a...</label>
                            <div className="flex items-center gap-2.5" role="radiogroup" aria-label="Select role">
                                {['public', 'hospital', 'ambulance', 'government'].map((r) => {
                                    const role = ROLE_META[r];
                                    const isActive = formData.role === r;
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            role="radio"
                                            aria-checked={isActive}
                                            onClick={() => setFormData({ ...formData, role: r, subRole: '' })}
                                            className={`portal-pill capitalize ${isActive ? 'shadow-md' : 'hover:shadow-sm'}`}
                                            style={{
                                                backgroundColor: isActive ? `${role.hexLight}` : 'rgba(255,255,255,0.9)',
                                                borderColor: isActive ? role.hex : '#E5E7EB',
                                                color: isActive ? role.hex : '#6B7280',
                                            }}
                                            aria-label={`Sign up as ${role.label}`}
                                        >
                                            <i className={`fas ${role.icon} text-[18px]`}></i>
                                            <span className="text-[13px] font-semibold">{role.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ─── Form Grid ─────────────────────────── */}
                        <form onSubmit={handleSubmit} className="animate-fade-in-up delay-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                                {/* Name */}
                                <div>
                                    <label className="auth-label">{formData.role === 'hospital' ? 'Hospital Name' : 'Full Name'}</label>
                                    <div className="relative">
                                        <i className="fas fa-user absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                            style={{ color: currentRole.hex }}></i>
                                        <input name="name" type="text" required className="auth-input"
                                            placeholder={formData.role === 'hospital' ? "e.g. City General" : "e.g. John Doe"}
                                            value={formData.name} onChange={handleChange} aria-label="Full name" />
                                    </div>
                                </div>

                                {/* Conditional: subRole select or Phone */}
                                {(formData.role === 'government' || formData.role === 'ambulance') ? (
                                    <div>
                                        <label className="auth-label">{formData.role === 'government' ? 'Authority Level' : 'Ambulance Role'}</label>
                                        <div className="relative">
                                            <i className="fas fa-tag absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                                style={{ color: currentRole.hex }}></i>
                                            <select name="subRole" value={formData.subRole} onChange={handleChange}
                                                className="auth-input appearance-none cursor-pointer">
                                                <option value="">Select role</option>
                                                {formData.role === 'government' && ['national_admin', 'state_admin', 'district_admin', 'supervisory_authority'].map((r) => (
                                                    <option key={r} value={r}>{r.replace(/_/g, ' ').toUpperCase()}</option>
                                                ))}
                                                {formData.role === 'ambulance' && ['crew', 'dispatcher'].map((r) => (
                                                    <option key={r} value={r}>{r.toUpperCase()}</option>
                                                ))}
                                            </select>
                                            <i className="fas fa-chevron-down absolute right-[14px] top-1/2 -translate-y-1/2 text-gray-400 text-[11px] pointer-events-none"></i>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="auth-label">Phone</label>
                                        <div className="relative">
                                            <i className="fas fa-phone absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                                style={{ color: currentRole.hex }}></i>
                                            <input name="phone" type="text" className="auth-input" placeholder="+91..."
                                                value={formData.phone} onChange={handleChange} aria-label="Phone number" />
                                        </div>
                                    </div>
                                )}

                                {/* Email */}
                                <div>
                                    <label className="auth-label">Email Address</label>
                                    <div className="relative">
                                        <i className="fas fa-envelope absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                            style={{ color: currentRole.hex }}></i>
                                        <input name="email" type="email" required className="auth-input" placeholder="name@example.com"
                                            value={formData.email} onChange={handleChange} aria-label="Email address" />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="auth-label">Location</label>
                                    <div className="relative">
                                        <i className="fas fa-location-dot absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                            style={{ color: currentRole.hex }}></i>
                                        <input name="location" type="text" className="auth-input" placeholder="City"
                                            value={formData.location} onChange={handleChange} aria-label="Location" />
                                    </div>
                                </div>

                                {/* Password for public */}
                                {formData.role === 'public' && (
                                    <div className="sm:col-span-2">
                                        <label className="auth-label">Password</label>
                                        <div className="relative">
                                            <i className="fas fa-lock absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                                style={{ color: currentRole.hex }}></i>
                                            <input name="password" type="password" required className="auth-input" placeholder="••••••••"
                                                value={formData.password} onChange={handleChange} aria-label="Password" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ─── Conditional Panels (role-specific) ── */}
                            {formData.role === 'hospital' && (
                                <div className="mt-4 p-4 rounded-[var(--radius-input)] border animate-fade-in"
                                    style={{
                                        backgroundColor: currentRole.hexLight,
                                        borderColor: currentRole.hex + '44',
                                    }}>
                                    <h4 className="text-xs font-bold uppercase mb-3" style={{ color: currentRole.hex }}>Facility Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="auth-label">Registration Number</label>
                                            <input name="regNumber" type="text" required className="auth-input"
                                                placeholder="e.g. KA-MH-1029" value={formData.regNumber} onChange={handleChange} aria-label="Registration number" />
                                        </div>
                                        <div>
                                            <label className="auth-label">Facility Type</label>
                                            <select name="hospitalType" value={formData.hospitalType} onChange={handleChange}
                                                className="auth-input appearance-none cursor-pointer">
                                                <option>General</option>
                                                <option>Specialty</option>
                                                <option>Trauma Center</option>
                                                <option>Clinic</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="auth-label">Department Role</label>
                                            <input name="departmentRole" type="text" className="auth-input"
                                                placeholder="e.g. Emergency" value={formData.departmentRole} onChange={handleChange} aria-label="Department role" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.role === 'government' && (
                                <div className="mt-4 p-4 rounded-[var(--radius-input)] border animate-fade-in"
                                    style={{
                                        backgroundColor: currentRole.hexLight,
                                        borderColor: currentRole.hex + '44',
                                    }}>
                                    <h4 className="text-xs font-bold uppercase mb-3" style={{ color: currentRole.hex }}>Government Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="auth-label">Government Level</label>
                                            <input name="governmentLevel" type="text" className="auth-input"
                                                placeholder="e.g. State Admin" value={formData.governmentLevel} onChange={handleChange} aria-label="Government level" />
                                        </div>
                                        <div>
                                            <label className="auth-label">Password</label>
                                            <div className="relative">
                                                <i className="fas fa-lock absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                                    style={{ color: currentRole.hex }}></i>
                                                <input name="password" type="password" required className="auth-input"
                                                    placeholder="••••••••" value={formData.password} onChange={handleChange} aria-label="Password" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.role === 'ambulance' && (
                                <div className="mt-4 p-4 rounded-[var(--radius-input)] border animate-fade-in"
                                    style={{
                                        backgroundColor: currentRole.hexLight,
                                        borderColor: currentRole.hex + '44',
                                    }}>
                                    <h4 className="text-xs font-bold uppercase mb-3" style={{ color: currentRole.hex }}>Ambulance Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="auth-label">Base Location</label>
                                            <input name="ambulanceBase" type="text" className="auth-input"
                                                placeholder="e.g. Central Depot" value={formData.ambulanceBase} onChange={handleChange} aria-label="Ambulance base location" />
                                        </div>
                                        <div>
                                            <label className="auth-label">Vehicle ID</label>
                                            <input name="vehicleId" type="text" className="auth-input"
                                                placeholder="e.g. AMB-042" value={formData.vehicleId} onChange={handleChange} aria-label="Vehicle ID" />
                                        </div>
                                        <div>
                                            <label className="auth-label">Password</label>
                                            <div className="relative">
                                                <i className="fas fa-lock absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] w-[18px] text-center pointer-events-none"
                                                    style={{ color: currentRole.hex }}></i>
                                                <input name="password" type="password" required className="auth-input"
                                                    placeholder="••••••••" value={formData.password} onChange={handleChange} aria-label="Password" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── Create Account Button ───────────── */}
                            <div className="mt-5">
                                <button type="submit" disabled={loading}
                                    className="relative w-full h-[52px] overflow-hidden rounded-[var(--radius-button)] flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 group"
                                    style={{
                                        background: `linear-gradient(135deg, ${currentRole.hex}, ${currentRole.hex}dd)`,
                                        boxShadow: `0 4px 14px ${currentRole.shadowColor}`,
                                        transition: 'background 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                                    }}
                                    aria-label={loading ? 'Creating account' : 'Create account'}>
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></span>
                                    <span className="absolute inset-0 rounded-[var(--radius-button)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                        style={{ boxShadow: `inset 0 0 0 1px ${currentRole.ring}` }}
                                    ></span>
                                    {loading ? (
                                        <><i className="fas fa-spinner fa-spin text-white"></i> <span className="text-white text-[16px] font-semibold">Creating Account...</span></>
                                    ) : (
                                        <><i className="fas fa-user-plus text-white text-[15px] group-hover:scale-110 transition-transform duration-200"></i>
                                        <span className="text-white text-[16px] font-semibold">Create Account</span></>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* ─── Footer ─────────────────────────────── */}
                        <div className="mt-5 text-center pt-4 border-t border-[#E5E7EB]/60 animate-fade-in delay-500">
                            <p className="text-[14px] text-gray-500">
                                Already have an account?{' '}
                                <Link to="/login" className="font-semibold hover:underline transition-all duration-200"
                                    style={{ color: currentRole.hex }}>
                                    Login here <i className="fas fa-arrow-right text-xs ml-0.5"></i>
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
