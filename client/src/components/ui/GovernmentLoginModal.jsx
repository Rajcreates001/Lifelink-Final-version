import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';

// ─── Demo Users per Organization ──────────────────────────────
const DEMO_USERS = {
  ndma: [
    { name: 'Rajesh Kumar', email: 'ndma.director@lifelink.demo', password: 'LifeLink@123', role: 'Director' },
    { name: 'Priya Sharma', email: 'ndma.ops@lifelink.demo', password: 'LifeLink@123', role: 'Operations Officer' },
    { name: 'Anil Reddy', email: 'ndma.analyst@lifelink.demo', password: 'LifeLink@123', role: 'Disaster Analyst' },
  ],
  ministry_health: [
    { name: 'Dr. Suresh Patel', email: 'health.secretary@lifelink.demo', password: 'LifeLink@123', role: 'Health Secretary' },
    { name: 'Meena Iyer', email: 'health.director@lifelink.demo', password: 'LifeLink@123', role: 'Operations Director' },
  ],
  national_emergency: [
    { name: 'Vikram Singh', email: 'necc.admin@lifelink.demo', password: 'LifeLink@123', role: 'Command Administrator' },
    { name: 'Neha Gupta', email: 'necc.coordinator@lifelink.demo', password: 'LifeLink@123', role: 'Emergency Coordinator' },
  ],
  police: [
    { name: 'ACP Rohit Nayak', email: 'police.commissioner@lifelink.demo', password: 'LifeLink@123', role: 'Commissioner' },
    { name: 'SI Harish Shetty', email: 'police.deputy@lifelink.demo', password: 'LifeLink@123', role: 'Deputy Commissioner' },
  ],
  fire: [
    { name: 'Ramesh Gowda', email: 'fire.chief@lifelink.demo', password: 'LifeLink@123', role: 'Chief Fire Officer' },
    { name: 'Vinod Rao', email: 'fire.commander@lifelink.demo', password: 'LifeLink@123', role: 'Regional Commander' },
  ],
  ndrf: [
    { name: 'Col. Arjun Menon', email: 'ndrf.commandant@lifelink.demo', password: 'LifeLink@123', role: 'Commandant' },
    { name: 'Sanjay Tiwari', email: 'ndrf.ops@lifelink.demo', password: 'LifeLink@123', role: 'Operations Officer' },
  ],
  district_collector: [
    { name: 'Meera Rao', email: 'dc.rao@lifelink.demo', password: 'LifeLink@123', role: 'District Collector' },
    { name: 'Anjali Hegde', email: 'dc.hegde@lifelink.demo', password: 'LifeLink@123', role: 'Deputy Collector' },
  ],
  state_health: [
    { name: 'Dr. Prakash', email: 'shd.commissioner@lifelink.demo', password: 'LifeLink@123', role: 'Health Commissioner' },
    { name: 'Kavita Joshi', email: 'shd.director@lifelink.demo', password: 'LifeLink@123', role: 'Medical Director' },
  ],
};

const DEMO_FALLBACK = [
  { name: 'Administrator', email: 'admin@lifelink.demo', password: 'LifeLink@123', role: 'Administrator' },
  { name: 'Operations Staff', email: 'ops@lifelink.demo', password: 'LifeLink@123', role: 'Operations' },
];

const tierConfig = {
  national: { label: 'NATIONAL COMMAND', gradient: 'from-amber-400 to-yellow-500', icon: 'fa-crown', bg: 'bg-amber-50' },
  state: { label: 'STATE COMMAND', gradient: 'from-sky-400 to-blue-500', icon: 'fa-flag', bg: 'bg-sky-50' },
  district: { label: 'DISTRICT COMMAND', gradient: 'from-emerald-400 to-teal-500', icon: 'fa-building', bg: 'bg-emerald-50' },
};

const GovernmentLoginModal = ({ org, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const users = useMemo(() => DEMO_USERS[org.key] || DEMO_FALLBACK, [org.key]);
  const selectedUser = users[selectedUserIndex] || users[0];
  const tier = tierConfig[org.level];

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/v2/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: selectedUser.email,
          password: selectedUser.password,
          role: 'government',
        }),
      });

      if (!res.ok) {
        // Demo mode: use local credentials directly
        const userData = {
          name: selectedUser.name,
          email: selectedUser.email,
          role: 'government',
          subRole: org.key,
          designation: selectedUser.role,
          organization: org.title,
          department: org.desc,
        };
        // Store service token in localStorage for workspace flow
        const serviceToken = 'demo-' + Date.now();
        localStorage.setItem('lifelink_token', serviceToken);
        sessionStorage.setItem('lifelink_token', serviceToken);
        login(userData, serviceToken);
        onSuccess(userData, serviceToken);
        onClose();
        setLoading(false);
        return;
      }

      const { user: userData, token } = res.data;
      if (!userData || !token) {
        throw new Error('Invalid server response');
      }
      login(userData, token);
      onSuccess(userData, token);
      onClose();
    } catch (err) {
      // Fallback to demo login
      const userData = {
        name: selectedUser.name,
        email: selectedUser.email,
        role: 'government',
        subRole: org.key,
        designation: selectedUser.role,
        organization: org.title,
        department: org.desc,
      };
      const serviceToken = 'demo-' + Date.now();
      localStorage.setItem('lifelink_token', serviceToken);
      sessionStorage.setItem('lifelink_token', serviceToken);
      login(userData, serviceToken);
      onSuccess(userData, serviceToken);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [selectedUser, org, login, onSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className={`relative bg-gradient-to-br ${tier?.gradient || 'from-indigo-600 to-purple-700'} px-6 pt-6 pb-8 text-white`}>
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <i className="fas fa-times text-xs" />
          </button>
          <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="login-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0L0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <i className={`fas ${org.icon || 'fa-building'} text-2xl`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold font-display">{org.title}</h2>
              <p className="text-xs text-white/80 mt-0.5">Government of India · LifeLink Platform</p>
              {tier && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase tracking-wider">
                  <i className={`fas ${tier.icon} text-[8px]`} /> {tier.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="px-6 py-5 space-y-4">
          {/* Demo User Selector */}
          {users.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                <i className="fas fa-users mr-1" /> Select Demo User
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{selectedUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedUser.role} · {selectedUser.email}</p>
                  </div>
                  <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white border border-slate-200 shadow-xl z-10 overflow-hidden animate-fade-in-down">
                    {users.map((u, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelectedUserIndex(i); setUserDropdownOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 transition-colors ${
                          i === selectedUserIndex ? 'bg-indigo-50' : ''
                        } ${i !== users.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === selectedUserIndex
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${i === selectedUserIndex ? 'text-indigo-700' : 'text-slate-700'}`}>{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.role}</p>
                        </div>
                        {i === selectedUserIndex && <i className="fas fa-check text-indigo-500 text-xs" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500">
              <i className="fas fa-envelope text-slate-300 text-xs" />
              <span className="font-mono text-slate-700">{selectedUser.email}</span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500">
              <i className="fas fa-lock text-slate-300 text-xs" />
              <span className="font-mono text-slate-700">{'•'.repeat(selectedUser.password.length)}</span>
            </div>
          </div>

          {/* Remember Device */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Remember this device</span>
          </label>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <i className="fas fa-exclamation-circle" /> {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white text-sm font-bold hover:shadow-lg hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Authenticating...
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right-to-bracket" />
                Sign In to {org.shortTitle || org.title}
              </>
            )}
          </button>

          {/* Enterprise Footer */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-center gap-4 text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><i className="fas fa-shield-halved text-emerald-500" /> GovNet Verified</span>
              <span className="flex items-center gap-1"><i className="fas fa-robot text-indigo-400" /> LifeLink AI Secure</span>
              <span className="flex items-center gap-1"><i className="fas fa-lock text-amber-500" /> Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernmentLoginModal;
