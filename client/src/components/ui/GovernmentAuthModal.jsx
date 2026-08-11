/**
 * GovernmentAuthModal — Enterprise Government Login Portal
 * =========================================================
 * 
 * Premium authentication modal for government organizations featuring:
 * - Multi-user selector (switch between demo users instantly)
 * - Pre-filled credentials from backend
 * - 10-step animated login sequence
 * - Organization branding with command hierarchy badges
 * - Emergency quick access
 * - Remember Me, Forgot Password, Emergency Access
 */

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';

// ─── Login Animation Steps ─────────────────────────────────
const LOGIN_STEPS = [
  { label: 'Authentiating Identity', icon: 'fa-user-shield' },
  { label: 'Verifying Government Clearance', icon: 'fa-shield-halved' },
  { label: 'Checking Organization Registry', icon: 'fa-building-columns' },
  { label: 'Loading Command Authorization', icon: 'fa-lock' },
  { label: 'Connecting National Network', icon: 'fa-network-wired' },
  { label: 'Loading Emergency Protocols', icon: 'fa-triangle-exclamation' },
  { label: 'Connecting LifeLink AI', icon: 'fa-brain' },
  { label: 'Synchronizing Intelligence Feed', icon: 'fa-satellite-dish' },
  { label: 'Preparing Workspace', icon: 'fa-cubes' },
  { label: 'Launching Command Center', icon: 'fa-rocket' },
];

// ─── Command Hierarchy Styles ────────────────────────────
const COMMAND_TIER = {
  national: {
    label: 'National Emergency Command Center',
    badge: 'NATIONAL COMMAND',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30',
    border: 'ring-2 ring-amber-400/50',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    labelClass: 'text-amber-600',
    accent: 'from-amber-500 to-yellow-600',
    icon: 'fa-tower-broadcast',
  },
  state: {
    label: 'State Emergency Operations Center',
    badge: 'STATE COMMAND',
    badgeClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
    border: 'ring-2 ring-blue-400/50',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    labelClass: 'text-blue-600',
    accent: 'from-sky-500 to-blue-600',
    icon: 'fa-flag',
  },
  district: {
    label: 'District Unified Command Center',
    badge: 'DISTRICT COMMAND',
    badgeClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30',
    border: 'ring-2 ring-emerald-400/50',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    labelClass: 'text-emerald-600',
    accent: 'from-emerald-500 to-teal-600',
    icon: 'fa-building',
  },
};

// ─── Organization Theme Colors ──────────────────────────────
const ORG_THEMES = {
  ministry_health: { gradient: 'from-sky-600 to-blue-700', icon: 'fa-landmark', bg: 'bg-sky-50', text: 'text-sky-600' },
  ndma: { gradient: 'from-red-700 to-rose-800', icon: 'fa-shield-halved', bg: 'bg-red-50', text: 'text-red-700' },
  ncdc: { gradient: 'from-cyan-600 to-blue-700', icon: 'fa-microscope', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  icmr: { gradient: 'from-purple-600 to-violet-700', icon: 'fa-flask', bg: 'bg-purple-50', text: 'text-purple-600' },
  nha: { gradient: 'from-indigo-600 to-purple-700', icon: 'fa-id-card', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  central_gov: { gradient: 'from-slate-700 to-gray-800', icon: 'fa-building-columns', bg: 'bg-slate-50', text: 'text-slate-700' },
  national_emergency: { gradient: 'from-rose-700 to-red-800', icon: 'fa-tower-broadcast', bg: 'bg-rose-50', text: 'text-rose-700' },
  blood_council: { gradient: 'from-red-600 to-rose-700', icon: 'fa-droplet', bg: 'bg-red-50', text: 'text-red-600' },
  state_health: { gradient: 'from-teal-600 to-cyan-700', icon: 'fa-flag', bg: 'bg-teal-50', text: 'text-teal-600' },
  state_disaster: { gradient: 'from-orange-600 to-red-700', icon: 'fa-triangle-exclamation', bg: 'bg-orange-50', text: 'text-orange-600' },
  state_emergency: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-phone', bg: 'bg-amber-50', text: 'text-amber-600' },
  state_medical: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-user-doctor', bg: 'bg-green-50', text: 'text-green-600' },
  state_surveillance: { gradient: 'from-sky-600 to-blue-700', icon: 'fa-chart-line', bg: 'bg-sky-50', text: 'text-sky-600' },
  central_surveillance: { gradient: 'from-sky-700 to-blue-800', icon: 'fa-satellite-dish', bg: 'bg-sky-50', text: 'text-sky-700' },
  district_collector: { gradient: 'from-blue-700 to-indigo-800', icon: 'fa-building', bg: 'bg-blue-50', text: 'text-blue-600' },
  district_health: { gradient: 'from-emerald-600 to-teal-700', icon: 'fa-hospital', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  district_emergency: { gradient: 'from-rose-600 to-red-700', icon: 'fa-tower-cell', bg: 'bg-rose-50', text: 'text-rose-600' },
  district_surveillance: { gradient: 'from-cyan-600 to-blue-700', icon: 'fa-eye', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  district_disaster: { gradient: 'from-amber-700 to-orange-800', icon: 'fa-helmet-safety', bg: 'bg-amber-50', text: 'text-amber-600' },
  police: { gradient: 'from-blue-800 to-indigo-900', icon: 'fa-shield', bg: 'bg-blue-100', text: 'text-blue-800' },
  police_control: { gradient: 'from-indigo-700 to-blue-800', icon: 'fa-tower-broadcast', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  traffic_police: { gradient: 'from-yellow-600 to-amber-700', icon: 'fa-traffic-light', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  cyber_crime: { gradient: 'from-violet-700 to-purple-800', icon: 'fa-laptop', bg: 'bg-violet-50', text: 'text-violet-600' },
  special_ops: { gradient: 'from-gray-700 to-slate-800', icon: 'fa-crosshairs', bg: 'bg-gray-50', text: 'text-gray-600' },
  intelligence: { gradient: 'from-slate-800 to-gray-900', icon: 'fa-user-secret', bg: 'bg-slate-50', text: 'text-slate-600' },
  fire: { gradient: 'from-red-600 to-orange-700', icon: 'fa-fire-extinguisher', bg: 'bg-red-50', text: 'text-red-600' },
  fire_control: { gradient: 'from-orange-600 to-red-700', icon: 'fa-tower-broadcast', bg: 'bg-orange-50', text: 'text-orange-600' },
  hazmat: { gradient: 'from-amber-600 to-yellow-700', icon: 'fa-biohazard', bg: 'bg-amber-50', text: 'text-amber-600' },
  ambulance_authority: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-truck-medical', bg: 'bg-green-50', text: 'text-green-600' },
  ambulance_dispatch: { gradient: 'from-emerald-600 to-green-700', icon: 'fa-map-location-dot', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  public_health: { gradient: 'from-cyan-600 to-teal-700', icon: 'fa-heart-pulse', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  epidemiology: { gradient: 'from-purple-600 to-pink-700', icon: 'fa-virus', bg: 'bg-purple-50', text: 'text-purple-600' },
  vaccination: { gradient: 'from-blue-500 to-cyan-600', icon: 'fa-syringe', bg: 'bg-blue-50', text: 'text-blue-600' },
  blood_bank_authority: { gradient: 'from-red-500 to-pink-600', icon: 'fa-droplet', bg: 'bg-red-50', text: 'text-red-500' },
  ndrf: { gradient: 'from-orange-700 to-red-800', icon: 'fa-helmet-safety', bg: 'bg-orange-50', text: 'text-orange-700' },
  sdrf: { gradient: 'from-amber-700 to-orange-800', icon: 'fa-shield-halved', bg: 'bg-amber-50', text: 'text-amber-700' },
  relief_coordination: { gradient: 'from-emerald-600 to-green-700', icon: 'fa-hand-holding-heart', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  municipal: { gradient: 'from-slate-600 to-gray-700', icon: 'fa-city', bg: 'bg-slate-50', text: 'text-slate-600' },
  municipal_health: { gradient: 'from-teal-600 to-green-700', icon: 'fa-broom', bg: 'bg-teal-50', text: 'text-teal-600' },
  water_supply: { gradient: 'from-sky-600 to-blue-700', icon: 'fa-water', bg: 'bg-sky-50', text: 'text-sky-600' },
  waste_management: { gradient: 'from-green-700 to-lime-800', icon: 'fa-trash-can', bg: 'bg-green-50', text: 'text-green-700' },
  food_corporation: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-truck', bg: 'bg-amber-50', text: 'text-amber-600' },
  transport: { gradient: 'from-blue-600 to-indigo-700', icon: 'fa-bus', bg: 'bg-blue-50', text: 'text-blue-600' },
  nhai: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-road', bg: 'bg-amber-50', text: 'text-amber-600' },
  railways: { gradient: 'from-blue-700 to-indigo-800', icon: 'fa-train', bg: 'bg-blue-50', text: 'text-blue-700' },
  airport: { gradient: 'from-sky-600 to-blue-700', icon: 'fa-plane', bg: 'bg-sky-50', text: 'text-sky-600' },
  port_authority: { gradient: 'from-blue-700 to-cyan-800', icon: 'fa-ship', bg: 'bg-blue-50', text: 'text-blue-700' },
  public_works: { gradient: 'from-yellow-600 to-amber-700', icon: 'fa-hard-hat', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  electricity: { gradient: 'from-yellow-500 to-amber-600', icon: 'fa-bolt', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  telecom: { gradient: 'from-violet-600 to-purple-700', icon: 'fa-signal', bg: 'bg-violet-50', text: 'text-violet-600' },
  imd: { gradient: 'from-cyan-500 to-sky-600', icon: 'fa-cloud-sun', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  animal_husbandry: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-horse-head', bg: 'bg-green-50', text: 'text-green-600' },
  pharma_supply: { gradient: 'from-teal-600 to-cyan-700', icon: 'fa-tablets', bg: 'bg-teal-50', text: 'text-teal-600' },
  medical_equipment: { gradient: 'from-indigo-600 to-purple-700', icon: 'fa-stethoscope', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  forest: { gradient: 'from-green-700 to-emerald-800', icon: 'fa-tree', bg: 'bg-green-50', text: 'text-green-700' },
  forest_fire: { gradient: 'from-red-600 to-orange-700', icon: 'fa-fire', bg: 'bg-red-50', text: 'text-red-600' },
  civil_defence: { gradient: 'from-amber-600 to-yellow-700', icon: 'fa-hard-hat', bg: 'bg-amber-50', text: 'text-amber-600' },
  red_cross: { gradient: 'from-red-600 to-rose-700', icon: 'fa-hand-holding-heart', bg: 'bg-red-50', text: 'text-red-600' },
  goonj: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-box-open', bg: 'bg-amber-50', text: 'text-amber-600' },
  seeds: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-seedling', bg: 'bg-green-50', text: 'text-green-600' },
  doctors_for_you: { gradient: 'from-sky-600 to-blue-700', icon: 'fa-stethoscope', bg: 'bg-sky-50', text: 'text-sky-600' },
  care_india: { gradient: 'from-blue-600 to-indigo-700', icon: 'fa-hands', bg: 'bg-blue-50', text: 'text-blue-600' },
  give_india: { gradient: 'from-purple-600 to-violet-700', icon: 'fa-gift', bg: 'bg-purple-50', text: 'text-purple-600' },
  akshaya_patra: { gradient: 'from-orange-500 to-red-600', icon: 'fa-utensils', bg: 'bg-orange-50', text: 'text-orange-600' },
  army_liaison: { gradient: 'from-green-800 to-emerald-900', icon: 'fa-shield', bg: 'bg-green-50', text: 'text-green-800' },
  air_force_liaison: { gradient: 'from-blue-700 to-indigo-800', icon: 'fa-jet-fighter', bg: 'bg-blue-50', text: 'text-blue-700' },
  navy_liaison: { gradient: 'from-blue-800 to-cyan-900', icon: 'fa-ship', bg: 'bg-blue-50', text: 'text-blue-800' },
  medical_corps: { gradient: 'from-red-700 to-rose-800', icon: 'fa-star-of-life', bg: 'bg-red-50', text: 'text-red-700' },
};

// ─── Level icons & badges ───────────────────────────────
const LEVEL_CONFIG = {
  national: { icon: 'fa-crown', label: 'National Authority', class: 'text-amber-500 bg-amber-50 border-amber-200' },
  state: { icon: 'fa-flag', label: 'State Authority', class: 'text-sky-500 bg-sky-50 border-sky-200' },
  district: { icon: 'fa-building', label: 'District Authority', class: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  department: { icon: 'fa-building-user', label: 'Department', class: 'text-slate-500 bg-slate-50 border-slate-200' },
  ngo: { icon: 'fa-hand-holding-heart', label: 'NGO', class: 'text-red-500 bg-red-50 border-red-200' },
  defence: { icon: 'fa-shield', label: 'Defence', class: 'text-green-500 bg-green-50 border-green-200' },
};


const GovernmentAuthModal = ({ department, onClose, onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginPhase, setLoginPhase] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [govCreds, setGovCreds] = useState(null);
  const [devMode, setDevMode] = useState(false);

  // Fetch government credentials on mount
  useEffect(() => {
    const fetchCreds = async () => {
      try {
        const res = await apiFetch('/v2/gov/auth/dev-creds', { method: 'GET', ttlMs: 60000 });
        if (res.ok && res.data?.development_mode && Array.isArray(res.data?.credentials)) {
          // Filter only credentials for this organization
          const orgCreds = res.data.credentials.filter(c => c.department === department?.key);
          if (orgCreds.length > 0) {
            setGovCreds(orgCreds);
            setDevMode(true);
          }
        }
      } catch { /* non-critical */ }
    };
    fetchCreds();
  }, [department?.key]);

  // Find credentials for this department
  const credsForDept = govCreds || [];
  const [selectedCredIndex, setSelectedCredIndex] = useState(0);
  const selectedCred = credsForDept.length > 0 ? credsForDept[selectedCredIndex] : null;

  // Auto-fill first credential on mount
  useEffect(() => {
    if (credsForDept.length > 0) {
      setEmail(credsForDept[0].email);
      setPassword(credsForDept[0].password);
      setSelectedCredIndex(0);
    }
  }, [credsForDept]);

  // Handle user selection from the dropdown
  const handleUserSelect = useCallback((index) => {
    const cred = credsForDept[index];
    if (cred) {
      setSelectedCredIndex(index);
      setEmail(cred.email);
      setPassword(cred.password);
    }
  }, [credsForDept]);

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
      setError('Please enter your government email and password.');
      return;
    }

    await startLoginAnimation();

    try {
      // Bootstrap ensures all orgs and users exist (safe no-op if not dev mode)
      const bootRes = await apiFetch('/v2/gov/auth/bootstrap', { method: 'POST', timeoutMs: 15000 });
      if (!bootRes.ok && bootRes.status !== 403) {
        // Non-403 errors may indicate DB issues; log but continue
        console.warn('Bootstrap warning:', bootRes);
      }

      // Actually login
      const res = await apiFetch('/v2/gov/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember }),
        timeoutMs: 15000,
      });

      if (!res.ok) {
        const msg = res.data?.detail || res.data?.error || 'Government authentication failed';
        setError(msg);
        setLoginPhase('idle');
        return;
      }

      const { token, user, workspaces, permissions, organization, ai_context } = res.data;

      setLoginPhase('success');

      // Build government user object
      const govUser = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: 'government',
        subRole: department?.key,
        government_role: workspaces?.[0]?.role_name || 'government_official',
        department_key: department?.key,
        department_name: department?.title,
        organization: organization,
        ai_context: ai_context,
        command_level: organization?.level || 'department',
        permissions,
        gov_token: token,
      };

      // Complete login
      onLogin(department?.key, govUser, token);
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.');
      setLoginPhase('idle');
    }
  };

  if (!department) return null;

  const orgKey = department.key;
  const theme = ORG_THEMES[orgKey] || { gradient: 'from-indigo-600 to-purple-700', icon: 'fa-building', bg: 'bg-indigo-50', text: 'text-indigo-600' };
  const orgLevel = department.level || 'department';
  const commandTier = COMMAND_TIER[orgLevel];
  const levelConfig = LEVEL_CONFIG[orgLevel] || LEVEL_CONFIG.department;

  // ── Render login animation screen ──
  if (loginPhase === 'authenticating' || loginPhase === 'success') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-lg animate-fade-in">
        <div className="w-full max-w-sm text-center">
          {/* Animated org icon */}
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20 animate-bounce-subtle`}>
            <i className={`fas ${department.icon || 'fa-building'} text-3xl`} />
          </div>

          {/* Command badge during auth */}
          {commandTier && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold mb-4 ${commandTier.badgeClass}`}>
              <i className={`fas ${commandTier.icon}`} />
              {commandTier.badge}
            </div>
          )}

          <h3 className="text-white font-bold text-sm mb-4">{department.title}</h3>

          {/* Steps */}
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

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-200 ease-out`}
              style={{ width: `${Math.min((currentStep / LOGIN_STEPS.length) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {loginPhase === 'success' ? '✓ Government Authentication Complete' : 'Authenticating...'}
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
        className={`relative w-full max-w-md animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-white/20 ${
          commandTier ? commandTier.glow : ''
        } ${commandTier ? commandTier.border : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Command tier accent bar */}
        {commandTier ? (
          <div className={`h-1.5 w-full bg-gradient-to-r ${commandTier.accent}`} />
        ) : (
          <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />
        )}

        <div className="p-6">
          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all">
            <i className="fas fa-xmark text-sm" />
          </button>

          {/* Header with command tier badge */}
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shadow-lg flex-shrink-0 relative`}>
              <i className={`fas ${department.icon || 'fa-building'} text-2xl`} />
              {commandTier && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                  <i className="fas fa-crown text-[10px] text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 font-display">{department.title}</h2>
              </div>
              <p className="text-xs text-slate-400 mb-1">{department.desc}</p>
              {/* Command hierarchy badge */}
              {commandTier && (
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${commandTier.badgeClass} animate-pulse-subtle`}>
                  <i className={`fas ${commandTier.icon} text-[9px]`} />
                  {commandTier.badge}
                </div>
              )}
              {!commandTier && (
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${levelConfig.class}`}>
                  <i className={`fas ${levelConfig.icon} text-[9px]`} />
                  {levelConfig.label}
                </div>
              )}
            </div>
          </div>

          {/* Demo user selector — shows all users for this org */}
          {credsForDept.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                  <i className="fas fa-users mr-1" />
                  Demo Users ({credsForDept.length})
                </p>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold">DEV</span>
              </div>
              {/* User selector — pill-style buttons */}
              <div className="flex flex-wrap gap-1.5">
                {credsForDept.map((cred, idx) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => handleUserSelect(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                      idx === selectedCredIndex
                        ? `bg-gradient-to-r ${theme.gradient} text-white shadow-sm`
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <i className={`fas fa-user-circle ${idx === selectedCredIndex ? 'text-white' : 'text-slate-400'}`} />
                    {cred.name}
                  </button>
                ))}
              </div>
              {selectedCred && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] text-indigo-400">
                    <i className="fas fa-envelope mr-1" />{selectedCred.email}
                  </p>
                  <p className="text-[10px] text-indigo-400">
                    <i className="fas fa-id-badge mr-1" />{selectedCred.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-shake">
              <i className="fas fa-circle-exclamation text-sm" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Government Email */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                <i className="fas fa-envelope mr-1 text-indigo-400" />
                Government Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder-slate-400"
                placeholder="name@gov.lifelink.demo"
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

            {/* Remember Me + Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-indigo-600 rounded w-4 h-4"
                />
                <span>Remember device</span>
              </label>
              <div className="flex gap-3 text-xs">
                <button type="button" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                  <i className="fas fa-key mr-1" />
                  Forgot Password?
                </button>
                <button type="button" className="text-amber-600 hover:text-amber-800 font-medium transition-colors">
                  <i className="fas fa-lock-open mr-1" />
                  Emergency Access
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loginPhase === 'authenticating'}
              className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${
                commandTier ? commandTier.accent : theme.gradient
              } text-white text-sm font-bold hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Authenticating...</>
              ) : (
                <><i className="fas fa-arrow-right-to-bracket" /> Access Government Workspace</>
              )}
            </button>

            {/* Cancel */}
            <div className="text-center">
              <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
                Cancel
              </button>
            </div>
          </form>

          {/* Dev mode indicator */}
          {devMode && credsForDept.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  <i className="fas fa-flask text-amber-400 mr-1" />
                  Development mode — {credsForDept.length} demo user{credsForDept.length > 1 ? 's' : ''} available
                </span>
                <button
                  type="button"
                  onClick={() => handleUserSelect(0)}
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
            <span>
              <i className="fas fa-shield-halved text-emerald-500 mr-1" />
              Government Authentication
            </span>
            <span className="text-emerald-600 font-medium">Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernmentAuthModal;
