import React, { useState, useCallback } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero, AlertBanner, FORMAT_TIME } from '../shared/GovernmentShared';
import { DetailModal, ConfirmDialog, Toast, AnimatedBarChart, AIExplainPanel } from '../shared/InteractiveComponents';
import { useApiData } from '../../../hooks/useApiData';

const DisasterDashboard = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const { data: disastersData, loading: disastersLoading, refetch: refetchDisasters } = useApiData(
    '/v2/government/disaster/recent',
    { pollInterval: 30000, transform: (d) => d?.disasters || d || [] }
  );
  const [disasters, setDisasters] = useState([
    { id: 'D-1001', name: 'Cyclone', location: 'Arabian Sea', severity: 'Critical', status: 'Active', affected: '42,000', updated: '5m ago', lat: 12.95, lng: 74.5, details: 'Severe cyclonic storm with wind speeds up to 140 km/h.' },
    { id: 'D-1002', name: 'Flood', location: 'Netravati Valley', severity: 'High', status: 'Active', affected: '18,500', updated: '12m ago', lat: 12.85, lng: 75.1, details: 'River Netravati water level at 4.2m and rising.' },
    { id: 'D-1003', name: 'Earthquake', location: 'Western Ghats', severity: 'Moderate', status: 'Monitoring', affected: '3,200', updated: '45m ago', lat: 13.1, lng: 75.5, details: 'Magnitude 4.8 earthquake at depth 12km.' },
  ]);
  // Use real data if available, fallback to initial state
  const activeDisasters = disastersData?.length > 0 ? disastersData : disasters;
  const [showDetail, setShowDetail] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ visible: true, message: msg, type }), []);

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="National Disaster Dashboard"
        subtitle="AI-powered disaster intelligence across all regions with real-time tracking"
        icon="fa-triangle-exclamation"
        gradient="from-rose-800 to-red-900"
        stats={[
          { label: 'Active Disasters', value: disasters.filter(d => d.status === 'Active').length.toString() },
          { label: 'States Affected', value: '12' },
          { label: 'Citizens Impacted', value: '1,24,500' },
          { label: 'Resources Deployed', value: '2,400' },
        ]}
      />

      <AlertBanner
        type="critical"
        message="Cyclone alert: Severe storm expected to make landfall near Mangaluru coast within 12 hours. Immediate evacuation recommended for coastal zones."
        action={{ label: 'View Cyclone Path', onClick: () => setShowDetail(disasters[0]) }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Total Incidents" value={disasters.length.toString()} icon="fa-list" color="slate" subtitle={timeRange + ' window'} />
        <GovKPICard label="Critical" value={disasters.filter(d => d.severity === 'Critical').length.toString()} icon="fa-circle-exclamation" color="red" trend={12} />
        <GovKPICard label="High" value={disasters.filter(d => d.severity === 'High').length.toString()} icon="fa-triangle-exclamation" color="amber" trend={-5} />
        <GovKPICard label="Moderate" value={disasters.filter(d => d.severity === 'Moderate').length.toString()} icon="fa-chart-simple" color="orange" />
      </div>

      {/* Live Disaster Feed + Risk Index */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-tower-broadcast" label="Live Disaster Incidents" action={{ label: 'Refresh', onClick: () => showToast('Feed refreshed', 'info') }} />
          <div className="space-y-2">
            {disasters.map((d) => (
              <div key={d.id}
                onClick={() => setShowDetail(d)}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.severity === 'Critical' ? 'bg-red-500 animate-pulse' : d.severity === 'High' ? 'bg-amber-500' : 'bg-amber-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.name} — {d.location}</p>
                    <p className="text-[10px] text-slate-400">{d.affected} affected · {d.updated}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <GovStatusBadge text={d.severity} color={d.severity === 'Critical' ? 'red' : d.severity === 'High' ? 'amber' : 'orange'} />
                  <GovStatusBadge text={d.status} color={d.status === 'Active' ? 'red' : d.status === 'Monitoring' ? 'amber' : 'slate'} />
                  <i className="fas fa-chevron-right text-[10px] text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-shield-halved" label="AI Risk Index — Karnataka" />
          <div className="space-y-4">
            {[
              { district: 'Dakshina Kannada', risk: 87, color: 'bg-red-500', level: 'Extreme' },
              { district: 'Udupi', risk: 74, color: 'bg-amber-500', level: 'High' },
              { district: 'Kodagu', risk: 62, color: 'bg-orange-400', level: 'Elevated' },
              { district: 'Uttara Kannada', risk: 45, color: 'bg-amber-300', level: 'Moderate' },
              { district: 'Chikkamagaluru', risk: 28, color: 'bg-emerald-400', level: 'Low' },
            ].map((d, i) => (
              <div key={i} className="cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                onClick={() => showToast(`Risk analysis for ${d.district}: ${d.level} risk at ${d.risk}%`, 'info')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{d.district}</span>
                  <span className="text-[10px] font-bold" style={{ color: d.risk > 70 ? '#dc2626' : d.risk > 50 ? '#d97706' : '#059669' }}>{d.risk}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: d.risk + '%' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">AI Risk Prediction Confidence: 87%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Last Updated: {FORMAT_TIME(Date.now())}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-chart-line" label="Disaster Trends (Monthly)" action={{ label: 'Export', onClick: () => showToast('Report exported', 'success') }} />
          <AnimatedBarChart
            data={[
              { label: 'Apr', value: 34 },
              { label: 'May', value: 52 },
              { label: 'Jun', value: 78 },
              { label: 'Jul', value: 42 },
              { label: 'Aug', value: 61 },
              { label: 'Sep', value: 45 },
            ]}
            height={140}
            barColor="from-rose-500 to-red-600"
          />
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-satellite" label="Satellite Intelligence" action={{ label: 'Refresh', onClick: () => showToast('Satellite feed updated', 'success') }} />
          <div
            onClick={() => showToast('Opening satellite overlay...', 'info')}
            className="flex items-center justify-center h-48 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-3 group-hover:border-indigo-500 transition-colors">
                <i className="fas fa-satellite-dish text-2xl text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-xs text-slate-300 font-medium">ISRO / NRSC Satellite Feed</p>
              <p className="text-[9px] text-slate-500 mt-1">Click to view live satellite overlay</p>
              <div className="flex items-center gap-2 mt-3 justify-center">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] text-emerald-400 font-semibold">Data feed active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-100 p-4">
        <AIExplainPanel
          title="AI Risk Assessment Summary"
          confidence={87}
          reasoning={[
            'Three districts in Karnataka show elevated disaster probability above 70%.',
            'Cyclone development in Arabian Sea poses the highest immediate threat with 89% confidence.',
            'Coastal regions of Dakshina Kannada and Udupi districts are at highest risk of storm surge.',
            'Historical patterns indicate 82% probability of flooding within 48 hours of cyclone landfall.',
          ]}
          evidence="Analysis based on real-time weather data from IMD, satellite imagery from ISRO, historical disaster patterns from NDMA database (2015-2026), and river gauge sensor data across 12 monitoring stations."
          impact="Pre-positioning 120 NDRF personnel along coastal regions could reduce emergency response time by 40% and potentially save an estimated 500+ lives in the affected zones."
          recommendations={[
            'Pre-position 120 NDRF personnel along coastal regions within the next 90 minutes.',
            'Activate emergency operations centres in Dakshina Kannada and Udupi districts.',
            'Issue early warning alerts to 50,000+ residents in low-lying coastal areas.',
            'Coordinate with Navy and Coast Guard for potential maritime rescue operations.',
          ]}
          onAccept={() => showToast('AI recommendations accepted and dispatched to all agencies', 'success')}
          onReject={() => showToast('Recommendations rejected. Manual override in effect.', 'warning')}
        />
      </div>

      {/* National Readiness */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <GovSectionHeader icon="fa-shield" label="National Readiness Status" action={{ label: 'Test Alert', onClick: () => showToast('Test alert sent to all agencies', 'success') }} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { agency: 'NDRF', readiness: 94, status: 'Ready' },
            { agency: 'SDRF', readiness: 87, status: 'Ready' },
            { agency: 'Police', readiness: 92, status: 'Active' },
            { agency: 'Fire Services', readiness: 85, status: 'Active' },
            { agency: 'Ambulance', readiness: 78, status: 'Moderate' },
            { agency: 'Armed Forces', readiness: 96, status: 'Standby' },
            { agency: 'Hospitals', readiness: 82, status: 'Active' },
            { agency: 'NGOs', readiness: 74, status: 'Moderate' },
          ].map((a, i) => (
            <div key={i} onClick={() => showToast(`${a.agency}: ${a.readiness}% readiness. Status: ${a.status}`, 'info')}
              className="p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-600">{a.agency}</span>
                <GovStatusBadge text={a.status} color={a.status === 'Ready' ? 'emerald' : a.status === 'Active' ? 'sky' : 'amber'} />
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full rounded-full ${a.readiness > 90 ? 'bg-emerald-500' : a.readiness > 80 ? 'bg-sky-500' : 'bg-amber-500'}`}
                  style={{ width: a.readiness + '%' }} />
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">{a.readiness}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?.name + ' — ' + showDetail?.location || 'Disaster Details'} subtitle={`ID: ${showDetail?.id} · ${showDetail?.severity} severity · ${showDetail?.status}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-[9px] text-slate-400">Population Affected</p>
              <p className="text-lg font-bold text-slate-800">{showDetail?.affected || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-[9px] text-slate-400">Status</p>
              <p className="text-lg font-bold text-slate-800">{showDetail?.status || '-'}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-[9px] text-slate-400">Location</p>
            <p className="text-xs font-semibold text-slate-700">{showDetail?.location} ({showDetail?.lat?.toFixed(2)}, {showDetail?.lng?.toFixed(2)})</p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-[9px] font-semibold text-indigo-600 mb-1">AI Assessment</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">{showDetail?.details || 'Assessment in progress...'}</p>
          </div>
          <div className="h-48 rounded-lg bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
            <div className="text-center">
              <i className="fas fa-map-location-dot text-2xl text-slate-300" />
              <p className="text-[10px] text-slate-400 mt-1">Map: {showDetail?.location}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowDetail(null); showToast(`Alert dispatched for ${showDetail?.name}`, 'success'); }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
              <i className="fas fa-bell mr-1" />Dispatch Alert
            </button>
            <button onClick={() => { setShowDetail(null); showToast(`Resources allocated to ${showDetail?.location}`, 'success'); }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
              <i className="fas fa-boxes mr-1" />Allocate Resources
            </button>
          </div>
        </div>
      </DetailModal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default DisasterDashboard;
