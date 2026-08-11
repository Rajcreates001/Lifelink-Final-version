import React, { useState } from 'react';

const Settings = ({ onAction }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    voice_alerts: true,
    dark_mode: false,
    auto_document: true,
    language: 'english',
    offline_mode: false,
    high_contrast: false,
    accessibility: false,
  });

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <i className="fas fa-cog text-xl" />
          </div>
          <div>
            <p className="text-lg font-bold">Mission Settings</p>
            <p className="text-xs text-slate-300 mt-0.5">Configure preferences for your ambulance response workspace.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preferences */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-sliders text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Preferences</span>
          </div>
          <div className="space-y-3">
            {[
              { key: 'notifications', label: 'Notifications', desc: 'Receive real-time alerts during missions' },
              { key: 'voice_alerts', label: 'Voice Alerts', desc: 'Spoken alerts for critical updates' },
              { key: 'auto_document', label: 'Auto Documentation', desc: 'Automatically transcribe and log communications' },
              { key: 'offline_mode', label: 'Offline Mode', desc: 'Operate with cached data when connectivity is limited' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <p className="text-[9px] text-slate-400">{item.desc}</p>
                </div>
                <button type="button" onClick={() => toggle(item.key)}
                  className={`relative w-10 h-5 rounded-full transition-all ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${settings[item.key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Display & Language */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-palette text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Display & Language</span>
          </div>
          <div className="space-y-3">
            {[
              { key: 'dark_mode', label: 'Dark Mode', desc: 'Use dark theme for low-light environments' },
              { key: 'high_contrast', label: 'High Contrast', desc: 'Enhanced contrast for better readability' },
              { key: 'accessibility', label: 'Accessibility Mode', desc: 'Screen reader optimized, larger targets' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <p className="text-[9px] text-slate-400">{item.desc}</p>
                </div>
                <button type="button" onClick={() => toggle(item.key)}
                  className={`relative w-10 h-5 rounded-full transition-all ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${settings[item.key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Language</p>
              <div className="flex gap-2">
                {['english', 'kannada', 'hindi'].map((lang) => (
                  <button key={lang} type="button" onClick={() => setSettings(prev => ({ ...prev, language: lang }))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                      settings.language === lang ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security & Session */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-shield text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Security & Session</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5"><span className="text-slate-500">Session Status</span><span className="font-semibold text-emerald-600"><i className="fas fa-circle text-[6px] mr-1.5 animate-pulse" />Active</span></div>
            <div className="flex justify-between py-1.5"><span className="text-slate-500">Device</span><span className="font-semibold text-slate-700">Ambulance A1 Terminal</span></div>
            <div className="flex justify-between py-1.5"><span className="text-slate-500">Connection</span><span className="font-semibold text-emerald-600">GovNet Secure</span></div>
            <div className="flex justify-between py-1.5"><span className="text-slate-500">Last Sync</span><span className="font-semibold text-slate-700">Just now</span></div>
            <div className="flex justify-between py-1.5"><span className="text-slate-500">Audit Logging</span><span className="font-semibold text-emerald-600"><i className="fas fa-check-circle mr-0.5" />Active</span></div>
          </div>
        </div>

        {/* AI Preferences */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-robot text-indigo-500 text-sm" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase">AI Preferences</span>
          </div>
          <div className="space-y-3">
            {[
              { key: 'auto_recommend', label: 'Auto Recommendations', desc: 'AI shows recommendations without manual request', value: true },
              { key: 'voice_navigation', label: 'Voice Navigation', desc: 'Spoken turn-by-turn navigation instructions', value: true },
              { key: 'predictive_alerts', label: 'Predictive Alerts', desc: 'AI alerts you to predicted events before they happen', value: false },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-indigo-100 last:border-b-0">
                <div>
                  <p className="text-xs font-semibold text-indigo-900">{item.label}</p>
                  <p className="text-[9px] text-indigo-500">{item.desc}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-semibold ${item.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {item.value ? 'On' : 'Off'}
                </span>
              </div>
            ))}
            <button type="button" onClick={() => onAction?.('reset_ai')}
              className="w-full py-2 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold hover:bg-slate-200 active:scale-95 transition-all">
              <i className="fas fa-rotate-left mr-1" />Reset AI Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
