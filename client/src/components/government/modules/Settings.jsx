import React, { useState, useEffect } from 'react';
import { GovSectionHeader, GovModuleHero } from '../shared/GovernmentShared';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../config/api';

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState({
    darkMode: false, notifications: true, autoSync: true, commandModeDefault: false, compactView: true,
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiFetch('/v2/gov/auth/profile');
        if (res.ok) setProfile(res.data);
      } catch (err) { /* use defaults */ }
    };
    loadProfile();
  }, []);

  const displayName = profile?.name || user?.name || user?.fullName || 'Admin User';
  const displayEmail = profile?.email || user?.email || 'admin@lifelink.gov.in';
  const displayRole = profile?.role || user?.role || user?.subRole || 'National Admin';
  const displayOrg = profile?.organization || user?.organization || 'NDMA';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="space-y-5">
      <GovModuleHero
        title="Workspace Settings"
        subtitle="Manage your profile, security, AI preferences, and session settings"
        icon="fa-gear"
        gradient="from-slate-700 to-slate-800"
        stats={[
          { label: 'Active Sessions', value: '2' },
          { label: 'Security Score', value: '92%' },
          { label: 'Audit Logs', value: '1,247' },
          { label: 'API Keys', value: '4' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-user" label="Profile" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">{initials}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-[10px] text-slate-400">{displayOrg}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Full Name', value: displayName },
                { label: 'Email', value: displayEmail },
                { label: 'Role', value: displayRole },
                { label: 'Organization', value: displayOrg },
              ].map((f, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[10px] text-slate-400">{f.label}</span>
                  <span className="text-[10px] font-medium text-slate-700">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-sliders" label="Preferences" />
          <div className="space-y-3">
            {[
              { key: 'darkMode', label: 'Dark Mode' },
              { key: 'notifications', label: 'Notifications' },
              { key: 'autoSync', label: 'Auto-Sync' },
              { key: 'commandModeDefault', label: 'Command Mode Default' },
              { key: 'compactView', label: 'Compact View' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{p.label}</span>
                <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${preferences[p.key] ? 'bg-indigo-600' : 'bg-slate-200'}`} onClick={() => setPreferences(prev => ({ ...prev, [p.key]: !prev[p.key] }))}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${preferences[p.key] ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security + Sessions */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-shield" label="Security" />
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">Active Sessions</p>
              <div className="mt-2 space-y-1.5">
                {[
                  { device: 'Chrome — Windows', ip: '192.168.1.42', time: 'Active now' },
                  { device: 'Safari — macOS', ip: '10.0.0.15', time: '2h ago' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-medium text-slate-600">{s.device}</p>
                      <p className="text-[8px] text-slate-400">{s.ip}</p>
                    </div>
                    <span className="text-[8px] text-slate-400">{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">MFA Status</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <i className="fas fa-check-circle" /> Two-factor enabled
              </p>
            </div>
            <button onClick={() => window.open('/api/v2/system/audit-logs', '_blank')} className="w-full px-3 py-1.5 text-[10px] font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
              <i className="fas fa-history mr-1" /> View Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <GovSectionHeader icon="fa-robot" label="AI Configuration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { model: 'Risk Prediction', status: 'Active', version: 'v3.2.1', accuracy: 94 },
            { model: 'Resource Optimization', status: 'Active', version: 'v2.8.0', accuracy: 89 },
            { model: 'Sentiment Analysis', status: 'Active', version: 'v4.1.3', accuracy: 87 },
            { model: 'Computer Vision', status: 'Beta', version: 'v1.5.0', accuracy: 82 },
          ].map((m, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-600">{m.model}</span>
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
              </div>
              <p className="text-[9px] text-slate-400">v{m.version} · {m.accuracy}% accuracy</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
