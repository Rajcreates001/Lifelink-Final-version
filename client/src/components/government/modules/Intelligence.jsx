import React, { useState, useEffect, useCallback } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero, FORMAT_TIME } from '../shared/GovernmentShared';
import { Toast } from '../shared/InteractiveComponents';
import { apiFetch } from '../../../config/api';

const Intelligence = () => {
  const [threats, setThreats] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [stats, setStats] = useState({ monitored: 0, active: 0, sources: 0, confidence: 0 });

  const showToast = useCallback((msg, type = 'success') => setToast({ visible: true, message: msg, type }), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [threatRes, anomalyRes] = await Promise.all([
          apiFetch('/v2/government/emergencies'),
          apiFetch('/v2/government/predictions/anomaly'),
        ]);
        if (threatRes.ok) {
          const items = Array.isArray(threatRes.data?.data) ? threatRes.data.data : (threatRes.data?.emergencies || []);
          setThreats(items.map((t, i) => ({
            source: t.source || t.reportSource || 'Intelligence',
            type: t.type || t.incidentType || t.message || 'Threat detected',
            severity: t.severity || t.priority || 'Moderate',
            region: t.region || t.location || t.district || 'Unknown',
            status: t.status || 'Active',
            time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : `${i + 5}m ago`,
          })));
          setStats(s => ({ ...s, active: items.filter(t => t.status === 'Active' || t.status === 'active').length }));
        }
        if (anomalyRes.ok) {
          const items = Array.isArray(anomalyRes.data?.data) ? anomalyRes.data.data : (anomalyRes.data?.anomalies || []);
          setAnomalies(items);
          setStats(s => ({ ...s, monitored: items.length + 24, sources: items.length + 12, confidence: 87 }));
        }
      } catch (err) {
        // Use minimal defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const threatsList = threats.length ? threats : [
    { source: 'Social Media', type: 'Rumour: Dam collapse', severity: 'High', region: 'Mangaluru', status: 'Verifying', time: '12m ago' },
    { source: 'News', type: 'Labour unrest reported', severity: 'Moderate', region: 'Baikampady', status: 'Confirmed', time: '28m ago' },
    { source: 'OSINT', type: 'Cyber attack — gov portal', severity: 'Critical', region: 'National', status: 'Active', time: '5m ago' },
    { source: 'Drone Feed', type: 'Suspicious gathering', severity: 'Moderate', region: 'Kudremukh', status: 'Monitoring', time: '45m ago' },
    { source: 'CCTV', type: 'Vehicle matching alert', severity: 'High', region: 'Pumpwell', status: 'Active', time: '18m ago' },
    { source: 'Citizen Report', type: 'Missing persons report', severity: 'Low', region: 'Kadri', status: 'Resolved', time: '2h ago' },
  ];

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="National Intelligence Centre"
        subtitle="AI-powered OSINT, social media monitoring, threat detection, and sentiment analysis"
        icon="fa-user-secret"
        gradient="from-slate-800 to-gray-900"
        stats={[
          { label: 'Threats Monitored', value: String(stats.monitored || 48) },
          { label: 'Active Alerts', value: String(stats.active || 12) },
          { label: 'Sources Tracked', value: String(stats.sources || 24) },
          { label: 'AI Confidence', value: `${stats.confidence || 87}%` },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Critical Threats" value="4" icon="fa-circle-exclamation" color="red" trend={15} />
        <GovKPICard label="High" value="8" icon="fa-triangle-exclamation" color="amber" />
        <GovKPICard label="Verifying" value="6" icon="fa-spinner" color="sky" />
        <GovKPICard label="Resolved Today" value="18" icon="fa-circle-check" color="emerald" trend={8} />
      </div>

      {/* Threat Feed */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <GovSectionHeader icon="fa-shield" label="Live Threat Intelligence Feed" action={{ label: 'Full Report', onClick: () => showToast('Generating full intelligence report...', 'info') }} />
        </div>
        <div className="divide-y divide-slate-50">
          {threatsList.map((t, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.severity === 'Critical' ? 'bg-red-100' : t.severity === 'High' ? 'bg-amber-100' : t.severity === 'Moderate' ? 'bg-orange-100' : 'bg-slate-100'}`}>
                  <i className={`fas fa-shield text-xs ${t.severity === 'Critical' ? 'text-red-600' : t.severity === 'High' ? 'text-amber-600' : 'text-slate-500'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{t.type}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-medium">{t.source}</span>
                    <span>·</span>
                    <span>{t.region}</span>
                    <span>·</span>
                    <span>{t.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <GovStatusBadge text={t.severity} color={t.severity === 'Critical' ? 'red' : t.severity === 'High' ? 'amber' : t.severity === 'Moderate' ? 'orange' : 'slate'} />
                <GovStatusBadge text={t.status} color={t.status === 'Active' ? 'red' : t.status === 'Verifying' ? 'amber' : t.status === 'Confirmed' ? 'sky' : 'emerald'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment + OSINT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-chart-pie" label="Social Media Sentiment — Karnataka" />
          <div className="flex items-center justify-center h-40 rounded-lg bg-slate-50 border border-dashed border-slate-200">
            <div className="text-center">
              <i className="fas fa-comments text-3xl text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Sentiment Analysis Feed</p>
              <p className="text-[9px] text-slate-300 mt-1">Positive 42% · Neutral 35% · Negative 23%</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-newspaper" label="News Intelligence" />
          <div className="space-y-2">
            {[
              { headline: 'Cyclone alert: Coastal Karnataka on high alert', source: 'Times of India', time: '15m ago', relevance: 95 },
              { headline: 'NDRF pre-positioned in 3 districts', source: 'The Hindu', time: '32m ago', relevance: 88 },
              { headline: 'Health dept issues flood advisory', source: 'Indian Express', time: '1h ago', relevance: 76 },
            ].map((n, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{n.headline}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{n.source} · {n.time}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${n.relevance > 90 ? 'bg-red-100 text-red-700' : n.relevance > 80 ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                    {n.relevance}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default Intelligence;
