/**
 * WorkspaceAuthModal — Enterprise Login Gateway
 *
 * Complete redesign replacing the simple workspace password dialog with
 * a secure enterprise authentication portal.
 *
 * Features:
 * - Hospital Email + Password fields
 * - Remember Me checkbox
 * - Forgot Password link
 * - Emergency Access link
 * - Development auto-fill (fetched from backend)
 * - 10-step animated login sequence
 * - Enterprise RBAC-driven workspace entry
 */
import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';

// ─── Login Animation Steps ─────────────────────────────────
const LOGIN_STEPS = [
  { label: 'Authenticating Identity', icon: 'fa-user-shield' },
  { label: 'Checking Hospital Directory', icon: 'fa-hospital' },
  { label: 'Loading Permissions', icon: 'fa-lock' },
  { label: 'Loading Department Context', icon: 'fa-building' },
  { label: 'Connecting LifeLink AI', icon: 'fa-brain' },
  { label: 'Preparing Workspace', icon: 'fa-cubes' },
  { label: 'Loading Patient Database', icon: 'fa-database' },
  { label: 'Synchronizing Knowledge Graph', icon: 'fa-share-nodes' },
  { label: 'Securing Connection', icon: 'fa-shield-halved' },
  { label: 'Launching Workspace', icon: 'fa-rocket' },
];

// ─── Department Theme Colors ──────────────────────────────
const THEME_COLORS = {
  ceo: { gradient: 'from-blue-600 to-indigo-700', icon: 'fa-crown', bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-500/30' },
  emergency: { gradient: 'from-red-600 to-rose-700', icon: 'fa-ambulance', bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-500/30' },
  icu: { gradient: 'from-purple-600 to-violet-700', icon: 'fa-heart-pulse', bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-500/30' },
  opd: { gradient: 'from-sky-600 to-cyan-700', icon: 'fa-user-doctor', bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-500/30' },
  radiology: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-x-ray', bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-500/30' },
  finance: { gradient: 'from-emerald-600 to-teal-700', icon: 'fa-coins', bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500/30' },
  ot: { gradient: 'from-rose-600 to-pink-700', icon: 'fa-user-nurse', bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-500/30' },
  laboratory: { gradient: 'from-teal-600 to-cyan-700', icon: 'fa-flask', bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-500/30' },
  pharmacy: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-tablets', bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-500/30' },
  blood_bank: { gradient: 'from-red-500 to-rose-600', icon: 'fa-droplet', bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-500/30' },
  admin: { gradient: 'from-slate-600 to-gray-700', icon: 'fa-shield-halved', bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-500/30' },
};

const WorkspaceAuthModal = ({ department, onClose, onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginPhase, setLoginPhase] = useState('idle'); // idle | authenticating | success
  const [currentStep, setCurrentStep] = useState(0);
  const [devCreds, setDevCreds] = useState(null);
  const [devMode, setDevMode] = useState(false);

  // Fetch development credentials on mount
  useEffect(() => {
    const fetchDevCreds = async () => {
      try {
        const res = await apiFetch('/v2/enterprise/auth/dev-creds', { method: 'GET', ttlMs: 60000 });
        if (res.ok && res.data?.development_mode && Array.isArray(res.data?.credentials)) {
          setDevCreds(res.data.credentials);
          setDevMode(true);
        }
      } catch { /* non-critical */ }
    };
    fetchDevCreds();
  }, []);

  // Find ALL dev credentials for this department (support multiple users per department)
  const devCredsForDept = devCreds?.filter(c => c.department === department?.key) || [];
  const [selectedCredIndex, setSelectedCredIndex] = useState(0);
  const devCred = devCredsForDept.length > 0 ? devCredsForDept[selectedCredIndex] : null;
  const isDevMode = devMode && devCredsForDept.length > 0;

  // Auto-fill dev credentials by index
  const handleAutoFill = useCallback((index) => {
    const cred = devCredsForDept[index];
    if (cred) {
      setSelectedCredIndex(index);
      setEmail(cred.email);
      setPassword(cred.password);
    }
  }, [devCredsForDept]);

  // Auto-fill first credential on mount
  useEffect(() => {
    if (devCredsForDept.length > 0) {
      setEmail(devCredsForDept[0].email);
      setPassword(devCredsForDept[0].password);
      setSelectedCredIndex(0);
    }
  }, [devCredsForDept]);

  // Login animation
  const startLoginAnimation = useCallback(async () => {
    setLoginPhase('authenticating');
    setCurrentStep(0);
    const totalDuration = 2800;
    const stepInterval = totalDuration / LOGIN_STEPS.length;

    for (let i = 0; i < LOGIN_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, stepInterval));
      setCurrentStep(i + 1);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your hospital email and password.');
      return;
    }

    // Start animation + actual login in parallel
    await startLoginAnimation();

    try {
      // First, ensure enterprise auth is bootstrapped
      await apiFetch('/v2/enterprise/auth/bootstrap', {
        method: 'POST', timeoutMs: 15000,
      });

      // Actually login
      const res = await apiFetch('/v2/enterprise/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember }),
        timeoutMs: 15000,
      });

      if (!res.ok) {
        const msg = res.data?.detail || res.data?.error || 'Authentication failed';
        setError(msg);
        setLoginPhase('idle');
        return;
      }

      const { token, user, workspaces, permissions } = res.data;

      // Determine which workspace to enter
      let targetWorkspace = workspaces?.find(w => w.department_key === department?.key);

      if (!targetWorkspace && workspaces?.length === 1) {
        targetWorkspace = workspaces[0];
      }

      if (!targetWorkspace) {
        setError('You do not have permission to access this workspace.');
        setLoginPhase('idle');
        return;
      }

      // Verify workspace access with backend
      const verifyRes = await apiFetch('/v2/enterprise/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ department_key: targetWorkspace.department_key }),
        timeoutMs: 10000,
      });

      if (!verifyRes.ok) {
        setError(verifyRes.data?.detail || 'Workspace access denied');
        setLoginPhase('idle');
        return;
      }

      setLoginPhase('success');

      // Build enterprise user object
      const enterpriseUser = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: 'hospital',
        subRole: targetWorkspace.department_key,
        enterprise_role: targetWorkspace.role_name,
        department_key: targetWorkspace.department_key,
        department_name: targetWorkspace.department_name,
        enterprise_token: token,
        permissions,
      };

      // Complete login
      onLogin(targetWorkspace.department_key, enterpriseUser, token);
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.');
      setLoginPhase('idle');
    }
  };

  if (!department) return null;

  const theme = THEME_COLORS[department.key] || THEME_COLORS.admin;

  // ── Render login animation screen ──
  if (loginPhase === 'authenticating' || loginPhase === 'success') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-lg animate-fade-in">
        <div className="w-full max-w-sm text-center">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 animate-bounce-subtle`}>
            <i className={`fas ${department.icon || 'fa-building'} text-3xl`} />
          </div>

          <div className="space-y-2.5 mb-6">
            {LOGIN_STEPS.map((step, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${
                  isCurrent ? 'opacity-100 translate-x-0' : isDone ? 'opacity-50 -translate-x-2' : 'opacity-20 translate-x-2'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDone || isCurrent ? `bg-gradient-to-br ${theme.gradient} text-white` : 'bg-slate-700 text-slate-500'
                  } text-xs transition-all duration-300`}>
                    {isDone ? <i className="fas fa-check" /> : <i className={`fas ${step.icon}`} />}
                  </div>
                  <div className="text-left flex-1">
                    <p className={`text-sm font-semibold ${isDone || isCurrent ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </p>
                  </div>
                  {isCurrent && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-200 ease-out`}
              style={{ width: `${Math.min((currentStep / LOGIN_STEPS.length) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {loginPhase === 'success' ? '✓ Authenticated' : 'Authenticating...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Render login form ──
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" />

      <div
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />

        <div className="p-6">
          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all">
            <i className="fas fa-xmark text-sm" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shadow-lg flex-shrink-0`}>
              <i className={`fas ${department.icon || 'fa-building'} text-2xl`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-xl font-bold text-slate-900 font-display">{department.title}</h2>
                {department.status && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    department.status === 'Operational' ? 'bg-emerald-100 text-emerald-700' :
                    department.status === 'Busy' ? 'bg-amber-100 text-amber-700' :
                    department.status === 'Maintenance' ? 'bg-slate-100 text-slate-600' :
                    department.status === 'Restricted' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1 h-1 rounded-full inline-block mr-1 ${
                      department.status === 'Operational' ? 'bg-emerald-500' :
                      department.status === 'Busy' ? 'bg-amber-500' :
                      department.status === 'Maintenance' ? 'bg-slate-400' :
                      department.status === 'Restricted' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    {department.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{department.desc}</p>
            </div>
          </div>

          {/* Department role & email display — supports multiple users per department */}
          {devCredsForDept.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                  <i className="fas fa-flask mr-1" />Development Accounts ({devCredsForDept.length})
                </p>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[9px] font-bold">DEV</span>
              </div>
              {/* User selector pills */}
              <div className="flex flex-wrap gap-1.5">
                {devCredsForDept.map((cred, idx) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => handleAutoFill(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                      idx === selectedCredIndex
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <i className={`fas fa-user-circle ${idx === selectedCredIndex ? 'text-white' : 'text-indigo-400'}`} />
                    {cred.name}
                  </button>
                ))}
              </div>
              {devCred && (
                <p className="text-[10px] text-indigo-400 mt-1.5">
                  <i className="fas fa-envelope mr-1" />{devCred.email}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-shake">
              <i className="fas fa-circle-exclamation text-sm" />
              {error}
            </div>
          )}

          {/* Enterprise Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hospital Email */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                <i className="fas fa-envelope mr-1 text-indigo-400" />
                User Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder-slate-400"
                placeholder="doctor.emergency@lifelink.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                <i className="fas fa-lock mr-1 text-indigo-400" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder-slate-400"
                  placeholder="•••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-indigo-600 rounded w-4 h-4"
              />
              <span>Remember this device</span>
            </label>

            {/* Forgot Password & Emergency Access */}
            <div className="flex justify-between text-xs">
              <button type="button" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                <i className="fas fa-key mr-1" />
                Forgot Password?
              </button>
              <button type="button" className="text-amber-600 hover:text-amber-800 font-medium transition-colors">
                <i className="fas fa-lock-open mr-1" />
                Emergency Access
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || loginPhase === 'authenticating'}
              className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${theme.gradient} text-white text-sm font-bold hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Authenticating...</>
              ) : (
                <><i className="fas fa-arrow-right-to-bracket" /> Login to Workspace</>
              )}
            </button>

            {/* Cancel */}
            <div className="text-center">
              <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
                Cancel
              </button>
            </div>
          </form>

          {/* Dev auto-fill indicator */}
          {isDevMode && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  <i className="fas fa-flask text-amber-400 mr-1" />
                  Development mode — credentials pre-filled
                </span>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  <i className="fas fa-rotate mr-1" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Security indicator */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
            <span><i className="fas fa-shield-halved text-emerald-500 mr-1" />Enterprise Authentication</span>
            <span className="text-emerald-600 font-medium">Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceAuthModal;
