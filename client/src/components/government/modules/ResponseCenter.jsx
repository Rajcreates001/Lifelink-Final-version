import React, { useState, useCallback } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero } from '../shared/GovernmentShared';
import { DetailModal, ConfirmDialog, Toast, AnimatedBarChart, AIExplainPanel } from '../shared/InteractiveComponents';

const ResponseCenter = () => {
  const [missions, setMissions] = useState([
    { id: 'M-1042', type: 'Flood Rescue', location: 'Netravati Valley', priority: 'Critical', agencies: ['NDRF', 'Police', 'Ambulance'], progress: 65, assigned: 'Team Alpha', updated: '2m ago', details: '12 villages submerged. 2,000 people stranded. Need boats and medical evacuation.' },
    { id: 'M-1043', type: 'Building Collapse', location: 'Kadri, Mangaluru', priority: 'Critical', agencies: ['Fire', 'NDRF', 'Ambulance'], progress: 40, assigned: 'Team Bravo', updated: '8m ago', details: '4-storey building collapsed. 23 people trapped. Rescue operation underway with structural engineers.' },
    { id: 'M-1044', type: 'Cyclone Evacuation', location: 'Coastal Belt', priority: 'High', agencies: ['SDRF', 'Police', 'Navy'], progress: 20, assigned: 'Team Charlie', updated: '15m ago', details: 'Systematic evacuation of 5,000 families from 8 coastal villages. 3 relief camps established.' },
    { id: 'M-1045', type: 'Chemical Spill', location: 'Baikampady Industrial', priority: 'High', agencies: ['Hazmat', 'Fire', 'Ambulance'], progress: 55, assigned: 'Team Delta', updated: '22m ago', details: '500m exclusion zone. 12 workers exposed. Hazmat containment under progress.' },
    { id: 'M-1046', type: 'Road Accident', location: 'NH-66, Surathkal', priority: 'Moderate', agencies: ['Police', 'Ambulance'], progress: 80, assigned: 'Team Echo', updated: '35m ago', details: 'Multi-vehicle collision. 8 injured. Traffic diverted via alternate route.' },
  ]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [agencyStatus, setAgencyStatus] = useState({ NDRF: 'Deployed', Police: 'Active', Fire: 'Active', Ambulance: 'Deployed', SDRF: 'Active', Navy: 'Standing' });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ visible: true, message: msg, type }), []);
  const dispatchAgency = useCallback((agency) => {
    setAgencyStatus(s => ({ ...s, [agency]: 'Deployed' }));
    showToast(`${agency} successfully deployed!`, 'success');
  }, [showToast]);
  const escalateMission = useCallback((mission) => {
    setShowConfirm({
      title: `Escalate ${mission.id}?`,
      message: `This will escalate "${mission.type}" to national priority level. Additional resources will be allocated from the central command reserve.`,
      confirmLabel: 'Escalate Mission',
    });
    setSelectedMission(mission);
  }, []);

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="National Response Centre"
        subtitle="AI-powered coordination of emergency response across all agencies"
        icon="fa-handshake"
        gradient="from-orange-700 to-red-800"
        stats={[
          { label: 'Active Missions', value: missions.filter(m => m.progress > 0 && m.progress < 100).length.toString() },
          { label: 'Agencies Deployed', value: Object.values(agencyStatus).filter(s => s === 'Deployed').length.toString() },
          { label: 'Personnel Active', value: '3,420' },
          { label: 'Avg Response', value: '8.2m' },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Pending" value={missions.filter(m => m.progress < 30).length.toString()} icon="fa-clock" color="amber" />
        <GovKPICard label="In Progress" value={missions.filter(m => m.progress >= 30 && m.progress < 80).length.toString()} icon="fa-spinner" color="sky" />
        <GovKPICard label="Completed Today" value="24" icon="fa-circle-check" color="emerald" trend={8} />
        <GovKPICard label="Escalated" value="3" icon="fa-arrow-up" color="red" trend={15} />
      </div>

      {/* Mission Queue */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <GovSectionHeader icon="fa-list" label="Active Incident Queue" action={{ label: 'Assign Mission', onClick: () => showToast('Opening mission assignment panel...', 'info') }} />
        </div>
        <div className="divide-y divide-slate-50">
          {missions.map((m) => (
            <div key={m.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedMission(m)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${m.priority === 'Critical' ? 'bg-red-500 animate-pulse' : m.priority === 'High' ? 'bg-amber-500' : 'bg-amber-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-400">{m.id}</span>
                      <span className="text-sm font-semibold text-slate-800">{m.type}</span>
                      <GovStatusBadge text={m.priority} color={m.priority === 'Critical' ? 'red' : m.priority === 'High' ? 'amber' : 'orange'} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{m.location}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {m.agencies.map((a) => (
                        <span key={a} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${agencyStatus[a] === 'Deployed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{a}</span>
                      ))}
                      <span className="text-[9px] text-slate-400 ml-auto">{m.updated}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-28">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-medium text-slate-500">Progress</span>
                    <span className="text-[9px] font-bold text-slate-600">{m.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${m.progress > 70 ? 'bg-emerald-500' : m.progress > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: m.progress + '%' }} />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 truncate">{m.assigned}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Dispatch + Agency Coordination */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-tower-broadcast" label="Quick Dispatch" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { agency: 'NDRF', icon: 'fa-helmet-safety', color: 'bg-orange-500', status: agencyStatus.NDRF },
              { agency: 'SDRF', icon: 'fa-shield', color: 'bg-amber-500', status: agencyStatus.SDRF },
              { agency: 'Police', icon: 'fa-shield-halved', color: 'bg-blue-600', status: agencyStatus.Police },
              { agency: 'Fire', icon: 'fa-fire-extinguisher', color: 'bg-red-500', status: agencyStatus.Fire },
              { agency: 'Ambulance', icon: 'fa-truck-medical', color: 'bg-emerald-500', status: agencyStatus.Ambulance },
              { agency: 'Navy', icon: 'fa-ship', color: 'bg-blue-700', status: agencyStatus.Navy },
            ].map((a, i) => (
              <button key={i} onClick={() => dispatchAgency(a.agency)}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-white text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 ${a.color}`}>
                <i className={`fas ${a.icon}`} />
                <span className="flex-1">{a.agency}</span>
                {a.status === 'Deployed' && <i className="fas fa-check-circle text-[10px]" />}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-chart-bar" label="Mission Performance" />
          <AnimatedBarChart
            data={missions.map(m => ({ label: m.id.replace('M-', ''), value: m.progress }))}
            height={140}
            barColor="from-orange-500 to-red-600"
          />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2 rounded-lg bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => showToast('Opening inter-agency chat...', 'info')}>
              <i className="fas fa-comments text-indigo-500 text-sm" />
              <p className="text-[8px] text-slate-500 mt-0.5">Inter-Agency Chat</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => showToast('Situation report generated', 'success')}>
              <i className="fas fa-file-alt text-emerald-500 text-sm" />
              <p className="text-[8px] text-slate-500 mt-0.5">Generate Report</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal open={!!selectedMission && !showConfirm} onClose={() => setSelectedMission(null)} title={selectedMission?.type || 'Mission Details'} subtitle={`${selectedMission?.id} · ${selectedMission?.location}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Priority</p>
              <GovStatusBadge text={selectedMission?.priority || '-'} color={selectedMission?.priority === 'Critical' ? 'red' : selectedMission?.priority === 'High' ? 'amber' : 'orange'} />
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Progress</p>
              <p className="text-lg font-bold text-slate-800">{selectedMission?.progress}%</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Team</p>
              <p className="text-xs font-bold text-slate-800">{selectedMission?.assigned}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-[9px] text-slate-400">Mission Details</p>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">{selectedMission?.details || 'No details available.'}</p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-[9px] font-semibold text-indigo-600 mb-1">AI Coordination Suggestion</p>
            <p className="text-[10px] text-slate-600">Based on current mission parameters, AI recommends deploying 2 additional {selectedMission?.agencies?.[0]} units to {selectedMission?.location}. Estimated impact: 25% reduction in response time.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => escalateMission(selectedMission)} className="flex-1 px-3 py-2 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors">
              <i className="fas fa-arrow-up mr-1" />Escalate
            </button>
            <button onClick={() => { setSelectedMission(null); showToast(`Mission ${selectedMission?.id} status updated`, 'success'); }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
              <i className="fas fa-check mr-1" />Update Status
            </button>
          </div>
        </div>
      </DetailModal>

      <ConfirmDialog open={!!showConfirm} onClose={() => setShowConfirm(null)} onConfirm={() => { setShowConfirm(null); showToast(`Mission escalated to national priority`, 'warning'); }}
        title={showConfirm?.title || ''} message={showConfirm?.message || ''} confirmLabel={showConfirm?.confirmLabel || 'Confirm'} />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default ResponseCenter;
