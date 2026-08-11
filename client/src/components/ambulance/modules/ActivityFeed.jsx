import React, { useState } from 'react';

const ALL_ACTIVITIES = [
  { id: 'a1', message: 'Mission dispatched — Multi-vehicle collision at Cubbon Park Rd', timestamp: new Date(Date.now() - 600000).toISOString(), status: 'success', user: 'Dispatch Center', category: 'mission' },
  { id: 'a2', message: 'Ambulance A1 en route to pickup location', timestamp: new Date(Date.now() - 540000).toISOString(), status: 'info', user: 'System', category: 'vehicle' },
  { id: 'a3', message: 'Traffic alert: Moderate congestion on Cubbon Rd — reroute available', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'warning', user: 'AI Navigation', category: 'navigation' },
  { id: 'a4', message: 'Patient vitals updated: HR 122, SpO₂ 88%, BP 92/58', timestamp: new Date(Date.now() - 180000).toISOString(), status: 'info', user: 'Patient Monitor', category: 'medical' },
  { id: 'a5', message: 'Golden Hour countdown active — 45 min remaining', timestamp: new Date(Date.now() - 120000).toISOString(), status: 'info', user: 'AI System', category: 'mission' },
  { id: 'a6', message: "St. Martha's Hospital confirmed: Trauma team ready, ICU bed reserved", timestamp: new Date(Date.now() - 60000).toISOString(), status: 'success', user: 'Hospital', category: 'communication' },
  { id: 'a7', message: 'Police notified — priority lane clearance active on route corridor', timestamp: new Date(Date.now() - 30000).toISOString(), status: 'success', user: 'Police Control', category: 'communication' },
  { id: 'a8', message: 'O₂ level at 88% — requesting backup cylinder', timestamp: new Date(Date.now() - 15000).toISOString(), status: 'warning', user: 'Equipment Monitor', category: 'medical' },
  { id: 'a9', message: 'Voice documentation started — auto-transcribing', timestamp: new Date(Date.now() - 5000).toISOString(), status: 'info', user: 'AI Assistant', category: 'system' },
  { id: 'a10', message: 'Trauma team ready at receiving hospital', timestamp: new Date(Date.now() - 2000).toISOString(), status: 'success', user: 'Hospital ER', category: 'communication' },
];

const FORMAT_TIME = (ts) => {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

const FILTERS = [
  { key: 'all', label: 'All Events', icon: 'fa-list' },
  { key: 'medical', label: 'Medical', icon: 'fa-heart-pulse' },
  { key: 'communication', label: 'Communications', icon: 'fa-radio' },
  { key: 'navigation', label: 'Navigation', icon: 'fa-route' },
  { key: 'vehicle', label: 'Vehicle', icon: 'fa-truck-medical' },
  { key: 'mission', label: 'Mission', icon: 'fa-flag' },
  { key: 'system', label: 'System', icon: 'fa-cog' },
];

const ActivityFeed = ({ onAction }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = ALL_ACTIVITIES.filter(a => {
    if (activeFilter !== 'all' && a.category !== activeFilter) return false;
    if (searchQuery && !a.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-slate-800">{ALL_ACTIVITIES.length}</p>
          <p className="text-[9px] text-slate-400 uppercase">Total Events</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{ALL_ACTIVITIES.filter(a => a.status === 'success').length}</p>
          <p className="text-[9px] text-emerald-600 uppercase">Successful</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{ALL_ACTIVITIES.filter(a => a.status === 'warning').length}</p>
          <p className="text-[9px] text-amber-600 uppercase">Warnings</p>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-center">
          <p className="text-lg font-bold text-sky-700">{ALL_ACTIVITIES.filter(a => a.status === 'info').length}</p>
          <p className="text-[9px] text-sky-600 uppercase">Information</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity feed..." className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setActiveFilter(f.key)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                activeFilter === f.key
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}>
              <i className={`fas ${f.icon} text-[9px]`} />{f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <i className="fas fa-search text-2xl text-slate-300 mb-2" />
            <p className="text-xs text-slate-500">No events match your filter</p>
          </div>
        ) : (
          filtered.map((act) => {
            const statusDot = act.status === 'success' ? 'bg-emerald-500' :
              act.status === 'warning' ? 'bg-amber-500' :
              act.status === 'error' ? 'bg-red-500' : 'bg-slate-400';
            return (
              <div key={act.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">{act.message}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {act.user} · {FORMAT_TIME(act.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${
                    act.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                    act.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-sky-100 text-sky-700'
                  }`}>{act.status}</span>
                  <button type="button" onClick={() => onAction?.('view_' + act.id)}
                    className="text-[9px] text-slate-400 hover:text-slate-600 p-1">
                    <i className="fas fa-ellipsis-vertical" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Export */}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onAction?.('export_csv')}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
          <i className="fas fa-file-export mr-1" />Export CSV
        </button>
        <button type="button" onClick={() => onAction?.('export_pdf')}
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
          <i className="fas fa-file-pdf mr-1" />Export PDF
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;
