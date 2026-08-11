import React, { useState, useEffect, useCallback } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero, FORMAT_TIME } from '../shared/GovernmentShared';
import { DetailModal, Toast, AnimatedLineChart } from '../shared/InteractiveComponents';

const LiveMonitoring = () => {
  const [timeRefresh, setTimeRefresh] = useState(Date.now());
  const [wsConnected, setWsConnected] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [timeWindow, setTimeWindow] = useState('1m');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ visible: true, message: msg, type }), []);

  useEffect(() => {
    const t = setInterval(() => setTimeRefresh(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const sensors = [
    { id: 'S-001', name: 'River Gauge — Netravati', value: '4.2m', status: 'Normal', threshold: '5.0m', color: 'emerald', trend: '+0.3m/h', desc: 'Continuous monitoring of river water level. Rising trend observed due to upstream rainfall.' },
    { id: 'S-002', name: 'Rainfall — Mangaluru', value: '124mm', status: 'Watch', threshold: '150mm', color: 'amber', trend: '+18mm/h', desc: 'Heavy rainfall recorded in last 6 hours. 85% of monthly average already received.' },
    { id: 'S-003', name: 'Wind Speed — Coastal', value: '62km/h', status: 'Alert', threshold: '80km/h', color: 'red', trend: '+12km/h', desc: 'Gusting winds along coastal belt. Fishing boats advised to return to shore.' },
    { id: 'S-004', name: 'Dam Level — Tannirbhavi', value: '78%', status: 'Normal', threshold: '90%', color: 'emerald', trend: '+2%/h', desc: 'Steady increase in reservoir level. Gates will be opened if level exceeds 85%.' },
    { id: 'S-005', name: 'Air Quality — City', value: '142 AQI', status: 'Moderate', threshold: '200', color: 'orange', trend: '+15 AQI', desc: 'Particulate matter PM2.5 at moderate levels. Sensitive groups advised to limit outdoor activity.' },
    { id: 'S-006', name: 'Power Grid — District', value: '72% Load', status: 'Normal', threshold: '90%', color: 'emerald', trend: 'Stable', desc: 'Grid load within safe parameters. Backup generators on standby.' },
  ];

  const cameras = [
    { id: 'CAM-01', name: 'Pumpwell Junction', status: 'Online', type: 'Traffic', desc: 'Major intersection. 24/7 monitoring for traffic management and incident detection.' },
    { id: 'CAM-02', name: 'Kadri Circle', status: 'Online', type: 'Traffic', desc: 'City centre surveillance. High foot traffic area.' },
    { id: 'CAM-03', name: 'Hampankatta Market', status: 'Online', type: 'Public', desc: 'Market area monitoring. Crowd density analysis active.' },
    { id: 'CAM-04', name: 'NH-66 Surathkal', status: 'Online', type: 'Highway', desc: 'National highway surveillance. Speed monitoring and accident detection.' },
    { id: 'CAM-05', name: 'Mangaluru Airport', status: 'Online', type: 'Airport', desc: 'Airport perimeter and terminal surveillance.' },
    { id: 'CAM-06', name: 'Panambur Beach', status: 'Offline', type: 'Coastal', desc: 'Beach surveillance. Currently offline for maintenance.' },
  ];

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="Live Monitoring Centre"
        subtitle="Interactive real-time sensor, CCTV, drone, and IoT monitoring platform"
        icon="fa-satellite-dish"
        gradient="from-cyan-700 to-blue-800"
        stats={[
          { label: 'Sensors Online', value: sensors.filter(s => s.status !== 'Offline').length + '/6' },
          { label: 'Cameras Active', value: cameras.filter(c => c.status === 'Online').length + '/6' },
          { label: 'Alerts Active', value: '8' },
          { label: 'System Health', value: '98.2%' },
        ]}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs font-semibold text-slate-600">{wsConnected ? 'Live Feed Connected' : 'Disconnected'}</span>
          </div>
          <span className="text-[10px] text-slate-400">Last sync: {FORMAT_TIME(timeRefresh)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-400 mr-1">Window:</span>
          {['1m', '5m', '15m', '1h'].map((t) => (
            <button key={t} onClick={() => { setTimeWindow(t); showToast(`Time window set to ${t}`, 'info'); }}
              className={`text-[10px] font-semibold px-2 py-1 rounded transition-all ${timeWindow === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Critical Alerts" value="3" icon="fa-circle-exclamation" color="red" trend={20} />
        <GovKPICard label="Warnings" value="5" icon="fa-triangle-exclamation" color="amber" />
        <GovKPICard label="Sensors Reporting" value={sensors.filter(s => s.status !== 'Offline').length + '/6'} icon="fa-microchip" color="emerald" />
        <GovKPICard label="System Uptime" value="99.7%" icon="fa-chart-line" color="sky" />
      </div>

      {/* Interactive Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sensors.map((s) => (
          <div key={s.id} onClick={() => setSelectedSensor(s)}
            className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color === 'red' ? 'bg-red-500 animate-pulse' : s.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-semibold text-slate-500 truncate">{s.name}</span>
              </div>
              <GovStatusBadge text={s.status} color={s.color} />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-xl font-bold text-slate-900">{s.value}</span>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 block">Threshold: {s.threshold}</span>
                <span className={`text-[8px] font-medium ${s.trend.startsWith('+') ? 'text-red-500' : 'text-emerald-500'}`}>{s.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Camera Grid + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-video" label="CCTV & Drone Feeds" action={{ label: 'Refresh', onClick: () => showToast('Camera feeds refreshed', 'success') }} />
          <div className="grid grid-cols-2 gap-2">
            {cameras.map((c) => (
              <div key={c.id} onClick={() => c.status === 'Online' ? setSelectedCamera(c) : showToast('Camera offline', 'error')}
                className="relative rounded-lg bg-slate-900 h-24 flex items-center justify-center overflow-hidden cursor-pointer group hover:ring-2 hover:ring-indigo-500 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                <div className="relative z-10 text-center group-hover:scale-105 transition-transform">
                  <i className={`fas ${c.type === 'Traffic' ? 'fa-traffic-light' : c.type === 'Public' ? 'fa-building' : c.type === 'Highway' ? 'fa-road' : c.type === 'Airport' ? 'fa-plane' : 'fa-umbrella-beach'} text-white/30 text-lg mb-1`} />
                  <p className="text-[9px] text-white/60">{c.name}</p>
                  <span className={`text-[8px] font-semibold ${c.status === 'Online' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {c.status === 'Online' ? '● Live' : '○ Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-map" label="Live Situation Map" action={{ label: 'Open Full Map', onClick: () => showToast('Opening GIS map...', 'info') }} />
          <div className="relative h-56 rounded-lg bg-slate-900 overflow-hidden cursor-pointer group"
            onClick={() => showToast('Interactive map: Click sensors to see live data', 'info')}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800" />
            {/* Map Grid Overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="relative z-10 p-3 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-semibold text-emerald-400">Karnataka GIS Layer Active</span>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                  <i className="fas fa-location-dot text-red-400 text-sm" />
                  <span className="text-[9px] text-white/70">12.9716°N, 74.5946°E — Mangaluru</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[{ color: 'bg-red-500', label: 'Critical' }, { color: 'bg-amber-500', label: 'High' }, { color: 'bg-emerald-500', label: 'Normal' }].map((l, i) => (
                    <span key={i} className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${l.color}`} /><span className="text-[7px] text-white/50">{l.label}</span></span>
                  ))}
                </div>
                <span className="text-[8px] text-white/40">Click to interact</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IoT Device Status + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-wifi" label="IoT Sensor Health" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { name: 'River Sensors', ok: 12, total: 14 },
              { name: 'Weather Stations', ok: 18, total: 20 },
              { name: 'Air Quality', ok: 8, total: 8 },
              { name: 'Dam Monitors', ok: 6, total: 6 },
              { name: 'Traffic Cameras', ok: 22, total: 24 },
              { name: 'Seismic', ok: 4, total: 5 },
              { name: 'Radiation', ok: 3, total: 3 },
              { name: 'Water Quality', ok: 9, total: 10 },
            ].map((s, i) => (
              <div key={i} onClick={() => showToast(`${s.name}: ${s.ok}/${s.total} online`, 'info')}
                className="p-2 rounded-lg bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                <p className="text-[9px] font-semibold text-slate-500 mb-1 truncate">{s.name}</p>
                <p className="text-sm font-bold" style={{ color: s.ok === s.total ? '#059669' : s.ok > s.total * 0.7 ? '#d97706' : '#dc2626' }}>{s.ok}/{s.total}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-chart-line" label="Sensor Trend — River Level" />
          <AnimatedLineChart
            data={[
              { label: '00:00', value: 2.1 },
              { label: '04:00', value: 2.8 },
              { label: '08:00', value: 3.5 },
              { label: '12:00', value: 4.2 },
              { label: '16:00', value: 4.8 },
              { label: '20:00', value: 4.2 },
            ]}
            height={120}
            color="#0ea5e9"
          />
          <p className="text-[8px] text-slate-400 mt-1 text-center">Netravati River level (m) — last 24 hours</p>
        </div>
      </div>

      {/* Sensor Detail Modal */}
      <DetailModal open={!!selectedSensor} onClose={() => setSelectedSensor(null)} title={selectedSensor?.name || 'Sensor Details'} subtitle={`ID: ${selectedSensor?.id} · ${selectedSensor?.value}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Status</p>
              <GovStatusBadge text={selectedSensor?.status || '-'} color={selectedSensor?.color || 'slate'} />
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Current</p>
              <p className="text-lg font-bold text-slate-800">{selectedSensor?.value}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Threshold</p>
              <p className="text-xs font-bold text-slate-800">{selectedSensor?.threshold}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Trend</p>
              <p className="text-xs font-bold" style={{ color: selectedSensor?.trend?.startsWith('+') ? '#dc2626' : '#059669' }}>{selectedSensor?.trend}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-[9px] text-slate-400">Description</p>
            <p className="text-xs text-slate-700 mt-1">{selectedSensor?.desc || 'No description available.'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedSensor(null); showToast(`Alert threshold updated`, 'success'); }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors">
              <i className="fas fa-sliders mr-1" />Adjust Threshold
            </button>
            <button onClick={() => { setSelectedSensor(null); showToast(`Calibration initiated`, 'success'); }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
              <i className="fas fa-microchip mr-1" />Calibrate Sensor
            </button>
          </div>
        </div>
      </DetailModal>

      {/* Camera Detail Modal */}
      <DetailModal open={!!selectedCamera} onClose={() => setSelectedCamera(null)} title={selectedCamera?.name || 'Camera Feed'} subtitle={selectedCamera?.type || ''}>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-900 h-48 flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-video text-3xl text-white/30" />
              <p className="text-xs text-white/50 mt-2">Live feed: {selectedCamera?.name}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold">● REC</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-[9px] text-slate-400">Camera Description</p>
            <p className="text-xs text-slate-700 mt-1">{selectedCamera?.desc || ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => showToast('Recording started', 'success')} className="flex-1 px-3 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-500">
              <i className="fas fa-circle mr-1" />Record
            </button>
            <button onClick={() => showToast('Snapshot captured', 'success')} className="flex-1 px-3 py-2 text-xs font-bold bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              <i className="fas fa-camera mr-1" />Snapshot
            </button>
          </div>
        </div>
      </DetailModal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default LiveMonitoring;
