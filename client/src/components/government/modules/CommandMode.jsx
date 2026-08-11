import React, { useState, useCallback } from 'react';
import { GovStatusBadge, GovSectionHeader, FORMAT_TIME } from '../shared/GovernmentShared';
import { DetailModal, Toast, ConfirmDialog, AIExplainPanel } from '../shared/InteractiveComponents';

const CommandMode = () => {
  const [messages, setMessages] = useState([
    { from: 'NDMA Director', msg: 'Cyclone update: Path shifted 50km south. Adjust evacuation zones.', time: '2m ago', direct: true },
    { from: 'Air Force', msg: '2× C-130J on standby at Mangaluru airbase. Ready for airlift.', time: '5m ago', direct: true },
    { from: 'Navy', msg: 'INS Sahyadri deployed to coastal zone. Rescue teams ready.', time: '8m ago', direct: true },
    { from: 'State Control', msg: 'Evacuation of coastal villages 60% complete. ETA 4 hours.', time: '12m ago', direct: true },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [alertFilter, setAlertFilter] = useState('All');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ visible: true, message: msg, type }), []);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    setMessages(prev => [{ from: 'Command Centre', msg: chatInput, time: 'Just now', direct: true }, ...prev]);
    setChatInput('');
    showToast('Message sent on secure channel', 'success');
  }, [chatInput, showToast]);

  const executeCommand = useCallback((action) => {
    setShowConfirm({
      title: action === 'Emergency Broadcast' ? 'Send National Broadcast?' : `Execute: ${action}?`,
      message: `This will ${action.toLowerCase()}. All authorized personnel will be notified immediately.`,
      confirmLabel: action === 'Emergency Broadcast' ? 'Broadcast Now' : 'Execute',
    });
  }, []);

  const confirmCommand = useCallback(() => {
    setShowConfirm(null);
    showToast('Command executed successfully. All agencies notified.', 'success');
  }, [showToast]);

  const missions = [
    { mission: 'Cyclone Landfall Prep', priority: 'P0-Critical', commander: 'NDMA Director', agencies: 'NDRF, Navy, Police', status: 'Active' },
    { mission: 'Flood Rescue Ops', priority: 'P1-High', commander: 'State Control', agencies: 'SDRF, Army, Fire', status: 'Active' },
    { mission: 'Medical Emergency Airlift', priority: 'P1-High', commander: 'Air Force', agencies: 'IAF, Ambulance', status: 'Standing' },
    { mission: 'Infrastructure Assessment', priority: 'P2-Normal', commander: 'PWD', agencies: 'NHAI, Municipal', status: 'Planning' },
  ];

  return (
    <div className="space-y-5 text-white">
      {/* Hero - Dark Command Theme */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white shadow-2xl border border-red-900/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center border border-red-500/30">
                <i className="fas fa-tower-broadcast text-2xl text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold">National Emergency Command Mode</h1>
                  <span className="px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/30 text-[10px] font-bold text-red-400 animate-pulse">● ACTIVE</span>
                </div>
                <p className="text-sm text-white/60 mt-1">National-level emergency operations — all agencies reporting</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
            <div><p className="text-[10px] font-semibold text-white/50 uppercase">Critical Incidents</p><p className="text-lg font-bold mt-0.5 text-red-400">3</p></div>
            <div><p className="text-[10px] font-semibold text-white/50 uppercase">Agencies Online</p><p className="text-lg font-bold mt-0.5 text-emerald-400">12/12</p></div>
            <div><p className="text-[10px] font-semibold text-white/50 uppercase">Personnel Standby</p><p className="text-lg font-bold mt-0.5 text-blue-400">5,200</p></div>
            <div><p className="text-[10px] font-semibold text-white/50 uppercase">Last Updated</p><p className="text-lg font-bold mt-0.5 text-slate-400">{FORMAT_TIME(Date.now())}</p></div>
          </div>
        </div>
      </div>

      {/* Command KPIs — solid dark cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Emergency Priority', value: 'Level 1', icon: 'fa-bolt', bg: 'bg-red-500/20 text-red-400' },
          { label: 'Command Authority', value: 'National', icon: 'fa-shield-halved', bg: 'bg-amber-500/20 text-amber-400' },
          { label: 'AI Decision Confidence', value: '94%', icon: 'fa-robot', bg: 'bg-blue-500/20 text-blue-400' },
          { label: 'National Readiness', value: '96%', icon: 'fa-chart-line', bg: 'bg-emerald-500/20 text-emerald-400' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}><i className={`fas ${k.icon} text-sm`} /></div>
              <div><p className="text-[10px] font-semibold text-slate-400 uppercase">{k.label}</p><p className="text-xl font-bold text-white">{k.value}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Mission Table — solid dark card */}
        <div className="lg:col-span-2 rounded-xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><i className="fas fa-list text-slate-400 text-xs" /><span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Active Command Missions</span></div>
            <div className="flex gap-2">
              {['All', 'Critical', 'High', 'Normal'].map((f) => (
                <button key={f} onClick={() => setAlertFilter(f)}
                  className={`text-[9px] font-semibold px-2 py-1 rounded transition-all ${alertFilter === f ? 'bg-red-600/30 text-red-300 border border-red-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {missions.filter(m => alertFilter === 'All' || m.priority.includes(alertFilter === 'Critical' ? 'P0' : alertFilter === 'High' ? 'P1' : 'P2')).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors cursor-pointer" onClick={() => showToast(`Viewing: ${m.mission} (${m.commander})`, 'info')}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.priority.includes('P0') ? 'bg-red-500 animate-pulse' : m.priority.includes('P1') ? 'bg-amber-500' : 'bg-blue-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{m.mission}</p>
                    <p className="text-[10px] text-white/40">{m.commander} · {m.agencies}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${m.priority.includes('P0') ? 'bg-red-600/20 text-red-400 border-red-500/30' : m.priority.includes('P1') ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'}`}>
                  {m.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Command Actions — solid dark card */}
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
          <GovSectionHeader icon="fa-bolt" label="Command Actions" />
          <div className="space-y-2">
            {[
              { action: 'Emergency Broadcast', icon: 'fa-tower-broadcast', color: 'bg-red-600 hover:bg-red-500' },
              { action: 'Deploy Military', icon: 'fa-shield', color: 'bg-green-700 hover:bg-green-600' },
              { action: 'Activate NDRF', icon: 'fa-helmet-safety', color: 'bg-orange-600 hover:bg-orange-500' },
              { action: 'Launch Evacuation', icon: 'fa-people-arrows', color: 'bg-amber-600 hover:bg-amber-500' },
              { action: 'Request Air Support', icon: 'fa-jet-fighter', color: 'bg-blue-700 hover:bg-blue-600' },
              { action: 'National Alert', icon: 'fa-bell', color: 'bg-red-700 hover:bg-red-600' },
            ].map((a, i) => (
              <button key={i} onClick={() => executeCommand(a.action)}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-white text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95">
                <i className={`fas ${a.icon}`} />{a.action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Command Chat + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
          <GovSectionHeader icon="fa-comments" label="Command Chat — Secure Channel" />
          <div className="space-y-2 h-48 overflow-y-auto mb-3 pr-1">
            {messages.map((c, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/[0.03]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-blue-400">{c.from}</span>
                  <span className="text-[8px] text-white/30">{c.time}</span>
                </div>
                <p className="text-[11px] text-white/70">{c.msg}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:border-red-500/50 transition-colors"
              placeholder="Send command message..." />
            <button onClick={sendMessage}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors"><i className="fas fa-paper-plane" /></button>
            <button onClick={() => setShowAIModal(true)}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors"><i className="fas fa-robot" /></button>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 shadow-lg">
          <GovSectionHeader icon="fa-timeline" label="Command Decision Timeline" action={{ label: 'AI Brief', onClick: () => setShowAIModal(true) }} />
          <div className="space-y-3">
            {[
              { decision: 'National Emergency Declared', by: 'Cabinet Secretary', time: '32m ago', impact: 'All agencies activated' },
              { decision: 'Coastal Evacuation Ordered', by: 'NDMA', time: '28m ago', impact: '12 villages notified' },
              { decision: 'Medical Corps Deployed', by: 'Health Ministry', time: '22m ago', impact: '8 field hospitals' },
              { decision: 'Air Force Sortie Approved', by: 'Defence Ministry', time: '15m ago', impact: '2 aircraft airborne' },
            ].map((d, i) => (
              <div key={i} className="flex gap-3 cursor-pointer hover:bg-white/[0.03] p-1.5 rounded-lg transition-colors" onClick={() => showToast(`${d.decision} — ${d.impact}`, 'info')}>
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {i < 3 && <div className="w-px h-8 bg-white/10" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">{d.decision}</p>
                  <p className="text-[9px] text-white/40">{d.by} · {d.time}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{d.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog open={!!showConfirm} onClose={() => setShowConfirm(null)} onConfirm={confirmCommand}
        title={showConfirm?.title || ''} message={showConfirm?.message || ''}
        confirmLabel={showConfirm?.confirmLabel || 'Execute'} confirmColor="bg-red-600 hover:bg-red-500" />

      <DetailModal open={showAIModal} onClose={() => setShowAIModal(false)} title="AI Command Brief" subtitle="Real-time intelligence summary">
        <AIExplainPanel
          title="Strategic Command Assessment"
          confidence={92}
          reasoning={[
            'Cyclone trajectory shifted 50km south — evacuation zones updated accordingly.',
            'All 12 agencies are online and responding. Coordination efficiency at 88%.',
            'Critical infrastructure in projected impact zone assessed at moderate risk.',
          ]}
          evidence="Based on real-time data from IMD weather satellites, ISRO imagery, and ground sensor networks across Karnataka coastal region."
          impact="Current response timeline is within acceptable parameters. Estimated 85% evacuation completion within 6 hours."
          recommendations={['Maintain current alert level', 'Pre-position additional rescue teams in southern coastal sectors', 'Activate emergency broadcast system for remaining zones']}
        />
      </DetailModal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default CommandMode;
