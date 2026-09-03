import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import WorkspaceAuthModal from '../components/ui/WorkspaceAuthModal';
import WorkspaceTransition from '../components/ui/WorkspaceTransition';
import LogoutConfirmDialog from '../components/ui/LogoutConfirmDialog';

// ─── Department Definitions ──────────────────────────────────
const DEPARTMENTS = [
  { key: 'ceo', title: 'CEO Office', desc: 'Executive hospital management', icon: 'fa-crown', category: 'administrative', staff: 12, online: 8, status: 'Operational', aiHealth: 96, floor: '5th Floor' },
  { key: 'finance', title: 'Finance', desc: 'Billing, revenue & accounting', icon: 'fa-coins', category: 'administrative', staff: 18, online: 14, status: 'Operational', aiHealth: 92, floor: '4th Floor' },
  { key: 'emergency', title: 'Emergency', desc: 'Acute care & trauma response', icon: 'fa-ambulance', category: 'clinical', staff: 42, online: 28, status: 'Busy', aiHealth: 84, floor: 'Ground Floor' },
  { key: 'opd', title: 'OPD', desc: 'Outpatient consultations', icon: 'fa-user-doctor', category: 'clinical', staff: 28, online: 22, status: 'Operational', aiHealth: 94, floor: '1st Floor' },
  { key: 'icu', title: 'ICU', desc: 'Critical care & monitoring', icon: 'fa-heart-pulse', category: 'clinical', staff: 36, online: 24, status: 'Busy', aiHealth: 78, floor: '2nd Floor' },
  { key: 'radiology', title: 'Radiology', desc: 'Imaging & diagnostic scans', icon: 'fa-x-ray', category: 'diagnostics', staff: 14, online: 10, status: 'Operational', aiHealth: 90, floor: '3rd Floor' },
  { key: 'ot', title: 'OT', desc: 'Operation theatre management', icon: 'fa-user-nurse', category: 'clinical', staff: 20, online: 16, status: 'Operational', aiHealth: 88, floor: '2nd Floor' },
  { key: 'laboratory', title: 'Laboratory', desc: 'Diagnostic testing', icon: 'fa-flask', category: 'diagnostics', staff: 16, online: 12, status: 'Operational', aiHealth: 95, floor: '3rd Floor' },
  { key: 'pharmacy', title: 'Pharmacy', desc: 'Medication management', icon: 'fa-tablets', category: 'support', staff: 10, online: 8, status: 'Operational', aiHealth: 97, floor: 'Ground Floor' },
  { key: 'blood_bank', title: 'Blood Bank', desc: 'Blood donation & supply', icon: 'fa-droplet', category: 'support', staff: 8, online: 6, status: 'Operational', aiHealth: 91, floor: 'Ground Floor' },
  { key: 'admin', title: 'System Administration', desc: 'Platform management & AI configuration', icon: 'fa-shield-halved', category: 'administrative', staff: 6, online: 4, status: 'Operational', aiHealth: 99, floor: '5th Floor' },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'fa-grid' },
  { key: 'clinical', label: 'Clinical', icon: 'fa-heart-pulse' },
  { key: 'administrative', label: 'Admin', icon: 'fa-building' },
  { key: 'diagnostics', label: 'Diagnostics', icon: 'fa-microscope' },
  { key: 'support', label: 'Support', icon: 'fa-handshake' },
];

const QUICK_ACCESS = [
  { key: 'emergency', icon: 'fa-ambulance', label: 'Emergency', gradient: 'from-red-500 to-rose-600' },
  { key: 'icu', icon: 'fa-heart-pulse', label: 'ICU', gradient: 'from-purple-500 to-violet-600' },
  { key: 'radiology', icon: 'fa-x-ray', label: 'Radiology', gradient: 'from-amber-500 to-orange-600' },
  { key: 'ot', icon: 'fa-user-nurse', label: 'OT', gradient: 'from-rose-500 to-pink-600' },
  { key: 'ceo', icon: 'fa-crown', label: 'CEO', gradient: 'from-blue-500 to-indigo-600' },
  { key: 'finance', icon: 'fa-coins', label: 'Finance', gradient: 'from-emerald-500 to-teal-600' },
  { key: 'admin', icon: 'fa-shield-halved', label: 'Admin', gradient: 'from-slate-600 to-gray-700' },
];

const statusConfig = {
  Operational: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Busy: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  Maintenance: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  Offline: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const themeColors = {
  ceo: { gradient: 'from-blue-600 to-indigo-700', icon: 'fa-crown', light: 'bg-blue-50', text: 'text-blue-600' },
  finance: { gradient: 'from-emerald-600 to-teal-700', icon: 'fa-coins', light: 'bg-emerald-50', text: 'text-emerald-600' },
  emergency: { gradient: 'from-red-600 to-rose-700', icon: 'fa-ambulance', light: 'bg-red-50', text: 'text-red-600' },
  icu: { gradient: 'from-purple-600 to-violet-700', icon: 'fa-heart-pulse', light: 'bg-purple-50', text: 'text-purple-600' },
  opd: { gradient: 'from-sky-600 to-cyan-700', icon: 'fa-user-doctor', light: 'bg-sky-50', text: 'text-sky-600' },
  radiology: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-x-ray', light: 'bg-amber-50', text: 'text-amber-600' },
  ot: { gradient: 'from-rose-600 to-pink-700', icon: 'fa-user-nurse', light: 'bg-rose-50', text: 'text-rose-600' },
  laboratory: { gradient: 'from-teal-600 to-cyan-700', icon: 'fa-flask', light: 'bg-teal-50', text: 'text-teal-600' },
  pharmacy: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-tablets', light: 'bg-green-50', text: 'text-green-600' },
  blood_bank: { gradient: 'from-red-500 to-rose-600', icon: 'fa-droplet', light: 'bg-red-50', text: 'text-red-600' },
  admin: { gradient: 'from-slate-600 to-gray-700', icon: 'fa-shield-halved', light: 'bg-slate-50', text: 'text-slate-600' },
};

// ─── Background ─────────────────────────────────────────────
const WorkspaceGatewayBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50" />
    <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-indigo-200/15 to-purple-200/15 blur-[120px]" />
    <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-sky-200/15 to-indigo-200/15 blur-[120px]" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="ws-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#ws-grid)"/>
    </svg>
  </div>
);

// ─── Main Component ─────────────────────────────────────────
const HospitalRoleSelect = () => {
  const { login, user, performGatewayLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalDept, setAuthModalDept] = useState(null);
  const [transitionDept, setTransitionDept] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const allowSwitch = new URLSearchParams(location.search).get('switch') === '1';

  // Redirect if already has a subRole
  useEffect(() => {
    if (!allowSwitch && user?.subRole && user?.role === 'hospital') {
      navigate('/dashboard/hospital', { replace: true });
    }
  }, [allowSwitch, user?.subRole, user?.role, navigate]);

  // Store enterprise token from WorkspaceAuthModal login for use in select-role
  const enterpriseTokenRef = React.useRef(null);

  const handleSelect = useCallback(async (subRole, enterpriseUser, enterpriseToken) => {
    setLoading(true);
    setError('');
    try {
      // If we have an enterprise token from WorkspaceAuthModal, store it and use it
      if (enterpriseToken) {
        enterpriseTokenRef.current = enterpriseToken;
        sessionStorage.setItem('lifelink_token', enterpriseToken);
      }

      const useToken = enterpriseToken || enterpriseTokenRef.current || sessionStorage.getItem('lifelink_token') || '';

      const { ok, data } = await apiFetch('/v2/auth/select-role', {
        method: 'POST',
        body: JSON.stringify({ subRole }),
        headers: useToken ? { Authorization: `Bearer ${useToken}` } : {},
      });
      if (!ok) {
        // If select-role fails with enterprise token, try to use enterprise user data directly
        if (enterpriseUser && enterpriseToken) {
          login(enterpriseUser, enterpriseToken);
          const dept = DEPARTMENTS.find((d) => d.key === subRole);
          setAuthModalDept(null);
          setTransitionDept(dept || { key: subRole, title: subRole, icon: 'fa-building' });
          return;
        }
        setError(data?.detail || data?.error || 'Authentication failed');
        setLoading(false);
        return;
      }
      const nextUser = { ...data.user, role: 'hospital', subRole: data.user?.subRole || subRole };
      const token = data.token || enterpriseToken || sessionStorage.getItem('lifelink_token') || '';
      login(nextUser, token);
      // Start transition animation
      const dept = DEPARTMENTS.find((d) => d.key === subRole);
      setAuthModalDept(null);
      setTransitionDept(dept || { key: subRole, title: subRole, icon: 'fa-building' });
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }, [login, navigate]);

  const handleTransitionComplete = useCallback(() => {
    setTransitionDept(null);
    navigate('/dashboard/hospital');
  }, [navigate]);

  const handleCardClick = useCallback((dept) => {
    // If user is already authenticated (has a token and subRole is not set yet),
    // skip the enterprise auth modal and directly select the role.
    const existingToken = sessionStorage.getItem('lifelink_token');
    if (existingToken && user?.role === 'hospital' && !user?.subRole) {
      handleSelect(dept.key);
    } else {
      setAuthModalDept(dept);
    }
  }, [user, handleSelect]);

  const handleEscape = useCallback((e) => {
    if (authModalDept && e.key === 'Escape') setAuthModalDept(null);
  }, [authModalDept]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const filteredDepts = useMemo(() => {
    let list = DEPARTMENTS;
    if (activeCategory !== 'all') list = list.filter((d) => d.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.desc.toLowerCase().includes(q) ||
        d.key.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(false);
    const redirectRoute = performGatewayLogout();
    navigate(redirectRoute, { replace: true });
  }, [navigate, performGatewayLogout]);

  // No AI recommendation — each role has unique workspace permissions

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const timeDisplay = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const shiftLabel = hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : 'Night';

  return (
    <div className="min-h-screen relative">
      <WorkspaceGatewayBg />

      {transitionDept ? (
        <WorkspaceTransition department={transitionDept} onComplete={handleTransitionComplete} />
      ) : (
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Minimal Header: Hospital Workspace + Sign Out */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-sm">
                <i className="fas fa-heartbeat text-sm" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 font-display">Hospital Workspace</p>
                <p className="text-[10px] text-slate-400">{user?.name || 'Dr. Rajesh Kumar'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-[0.97] transition-all duration-200"
            >
              <i className="fas fa-sign-out-alt text-[11px]" />
              Sign Out
            </button>
          </div>

          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fade-in-down">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <i className="fas fa-heartbeat text-lg" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">LifeLink Hospital</p>
                <h1 className="text-sm font-bold text-slate-900 font-display">
                  {greeting}, <span className="text-indigo-600">{user?.name || 'Dr. Rajesh Kumar'}</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span><i className="far fa-calendar mr-1.5" />{dateDisplay}</span>
              <span><i className="far fa-clock mr-1.5" />{timeDisplay}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">{shiftLabel} Shift</span>
            </div>
          </div>

          {/* Page heading */}
          <div className="mb-5 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold"><i className="fas fa-robot mr-1" />LifeLink AI</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold"><i className="fas fa-check mr-1" />Secured</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">Department Workspace Gateway</h2>
            <p className="text-sm text-slate-500">Select your department and securely enter its intelligent workspace</p>
          </div>

          {/* Search + Category Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 animate-fade-in-up">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search departments, specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all placeholder-slate-400 shadow-sm"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    activeCategory === cat.key
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <i className={`fas ${cat.icon} text-[10px]`} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department Cards Grid */}
          {filteredDepts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 animate-fade-in">
              <i className="fas fa-search text-4xl mb-3 opacity-30" />
              <p className="text-sm font-medium">No departments found matching "{searchQuery}"</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className="mt-2 text-xs text-indigo-600 font-semibold hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 animate-fade-in-up">
              {filteredDepts.map((dept, idx) => {
                const theme = themeColors[dept.key] || themeColors.ceo;
                const status = statusConfig[dept.status] || statusConfig.Operational;
                return (
                  <div
                    key={dept.key}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    onClick={() => handleCardClick(dept)}
                    className="relative group cursor-pointer animate-fade-in-up"
                  >
                    <div className={`
                      relative overflow-hidden rounded-xl border transition-all duration-200 p-4
                      border-slate-200/70 bg-white/80 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5
                      active:scale-[0.98]
                    `}>

                      {/* Top accent */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />

                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                          <i className={`fas ${dept.icon} text-lg`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{dept.title}</h3>
                          <p className="text-[11px] text-slate-400 truncate">{dept.desc}</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">{dept.floor}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500"><i className="fas fa-users text-[10px] mr-1" />{dept.online}/{dept.staff}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${status.bg} ${status.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {dept.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          AI {dept.aiHealth}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Access */}
          <div className="mt-6 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Access</h3>
              <div className="flex-1 h-px bg-slate-200/60" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {QUICK_ACCESS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleCardClick(DEPARTMENTS.find((d) => d.key === item.key))}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/60 border border-slate-200/50 hover:bg-white hover:shadow-sm hover:border-slate-300 active:scale-95 transition-all duration-200 flex-shrink-0"
                >
                  <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center text-[10px]`}>
                    <i className={`fas ${item.icon}`} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error toast */}
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium shadow-lg shadow-red-500/10 animate-slide-in-up flex items-center gap-2">
              <i className="fas fa-circle-exclamation" />
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600"><i className="fas fa-xmark" /></button>
            </div>
          )}

          {/* Auth Modal */}
          {authModalDept && (
            <WorkspaceAuthModal
              department={authModalDept}
              onClose={() => setAuthModalDept(null)}
              onLogin={handleSelect}
              loading={loading}
            />
          )}

          {/* Logout Confirmation Dialog */}
          <LogoutConfirmDialog
            open={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            onConfirm={handleLogoutConfirm}
            userName={user?.name || 'Dr. Rajesh Kumar'}
            userRole="Hospital Staff"
            workspaceName="Hospital Workspace"
            variant="hospital"
          />
        </div>
      )}
    </div>
  );
};

export default HospitalRoleSelect;
