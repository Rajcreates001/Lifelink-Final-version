import React, { useState } from 'react';

const Communication = ({ incident, onAction }) => {
  const [activeChannel, setActiveChannel] = useState('hospital');
  const [messageText, setMessageText] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);

  const channels = [
    { key: 'hospital', label: 'Hospital ER', icon: 'fa-hospital', color: 'sky', status: 'Connected' },
    { key: 'police', label: 'Police Control', icon: 'fa-shield', color: 'blue', status: 'Connected' },
    { key: 'fire', label: 'Fire Services', icon: 'fa-fire-extinguisher', color: 'amber', status: 'Standby' },
    { key: 'dispatch', label: 'Dispatch Center', icon: 'fa-tower-broadcast', color: 'emerald', status: 'Connected' },
    { key: 'ndrf', label: 'NDRF', icon: 'fa-helmet-safety', color: 'orange', status: 'Available' },
    { key: 'control', label: 'Control Room', icon: 'fa-tower-cell', color: 'violet', status: 'Connected' },
  ];

  return (
    <div className="space-y-5">
      {/* Active Communication Header */}
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Active Channel</p>
            <p className="text-lg font-bold">{channels.find(c => c.key === activeChannel)?.label || 'Hospital ER'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/80">Connected · Secure line</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMicActive(!micActive)} className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${micActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white/20 hover:bg-white/30'}`}>
              <i className={`fas fa-microphone${micActive ? '' : '-slash'} text-white`} />
            </button>
            <button type="button" onClick={() => setVideoActive(!videoActive)} className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${videoActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white/20 hover:bg-white/30'}`}>
              <i className={`fas fa-video${videoActive ? '' : '-slash'} text-white`} />
            </button>
            <button type="button" onClick={() => onAction?.('end-call')} className="w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-all">
              <i className="fas fa-phone-slash text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Communication Channels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {channels.map((ch) => (
          <button key={ch.key} type="button" onClick={() => setActiveChannel(ch.key)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
              activeChannel === ch.key
                ? 'bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              activeChannel === ch.key ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <i className={`fas ${ch.icon} text-sm`} />
            </div>
            <p className={`text-[10px] font-semibold ${activeChannel === ch.key ? 'text-sky-700' : 'text-slate-600'}`}>{ch.label}</p>
            <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
              ch.status === 'Connected' ? 'bg-emerald-100 text-emerald-700' :
              ch.status === 'Standby' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-500'
            }`}>{ch.status}</span>
          </button>
        ))}
      </div>

      {/* Chat / Transcript Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Chat */}
        <div className="rounded-xl bg-white border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-comments text-slate-400 text-xs" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Live Chat</span>
            </div>
            <span className="text-[8px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Encrypted</span>
          </div>
          <div className="h-52 overflow-y-auto p-3 space-y-2">
            {[
              { sender: 'ER', msg: 'Trauma team ready. Bed 4 reserved.', time: '2 min ago' },
              { sender: 'You', msg: 'Patient GCS 10, suspected internal bleeding. ETA 11 min.', time: '1 min ago' },
              { sender: 'ER', msg: 'Understood. Preparing OR-2. Neurosurgeon on call.', time: '30 sec ago' },
              { sender: 'Police', msg: 'Priority lane clearance active on Cubbon Rd corridor.', time: 'Just now' },
            ].map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                  m.sender === 'You' ? 'bg-indigo-600 text-white rounded-br-sm' :
                  m.sender === 'ER' ? 'bg-emerald-100 text-slate-800 rounded-bl-sm' :
                  'bg-slate-100 text-slate-700 rounded-bl-sm'
                }`}>
                  <p className="font-semibold text-[9px] opacity-70 mb-0.5">{m.sender}</p>
                  <p>{m.msg}</p>
                  <p className="text-[8px] opacity-50 mt-0.5 text-right">{m.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 flex gap-2">
            <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..." className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" />
            <button type="button" onClick={() => { onAction?.('send_msg'); setMessageText(''); }}
              className="px-3 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 active:scale-95 transition-all">
              <i className="fas fa-paper-plane" />
            </button>
          </div>
        </div>

        {/* AI Speech Summary + Broadcast */}
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-robot text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase">AI Speech Summary</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Emergency crew en route with critical patient (GCS 10, suspected hemorrhage).
              Estimated arrival 11 minutes. Trauma team requested. Police escort active.
              Blood bank notified for O-negative cross-match.
            </p>
            <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-400">
              <i className="fas fa-language" /> Available in: English · Kannada · Hindi
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <i className="fas fa-bullhorn text-slate-400 text-xs" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Emergency Broadcast</span>
            </div>
            <div className="space-y-2">
              <button type="button" onClick={() => onAction?.('broadcast_all')}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 transition-all text-xs font-semibold text-red-700">
                <i className="fas fa-broadcast-tower" />Broadcast to All Channels
              </button>
              <button type="button" onClick={() => onAction?.('sos')}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all text-xs font-semibold text-amber-700">
                <i className="fas fa-triangle-exclamation" />SOS — Request Immediate Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communication;
