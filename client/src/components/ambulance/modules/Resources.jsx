import React from 'react';

const EQUIPMENT_ITEMS = [
  { name: 'Defibrillator', status: 'Ready', icon: 'fa-bolt', category: 'life_support', battery: 92, expiry: '2026-12' },
  { name: 'Ventilator', status: 'Ready', icon: 'fa-lungs', category: 'life_support', battery: 88, expiry: '2026-09' },
  { name: 'Oxygen Cylinder', status: 'Low — 88%', icon: 'fa-wind', category: 'medical_gas', capacity: 88, expiry: '2026-08' },
  { name: 'Trauma Kit', status: 'Ready', icon: 'fa-kit-medical', category: 'trauma', count: 2, expiry: '2027-03' },
  { name: 'Cardiac Monitor', status: 'Ready', icon: 'fa-heart-pulse', category: 'monitoring', battery: 95, expiry: '2026-11' },
  { name: 'IV Fluids (LR)', status: 'Ready — 4 bags', icon: 'fa-droplet', category: 'supplies', count: 4, expiry: '2027-01' },
  { name: 'Cervical Collar', status: 'Ready', icon: 'fa-bandage', category: 'immobilization', count: 3, expiry: '2027-06' },
  { name: 'Burn Kit', status: 'Not onboard', icon: 'fa-fire', category: 'trauma', count: 0, expiry: '—' },
  { name: 'Splint Set', status: 'Ready', icon: 'fa-hand', category: 'immobilization', count: 2, expiry: '2027-12' },
  { name: 'Suction Unit', status: 'Ready', icon: 'fa-vacuum', category: 'airway', battery: 76, expiry: '2026-10' },
  { name: 'Glucometer', status: 'Ready', icon: 'fa-droplet', category: 'diagnostics', battery: 80, expiry: '2026-07' },
  { name: 'AED', status: 'Ready', icon: 'fa-heart-circle-check', category: 'life_support', battery: 100, expiry: '2027-02' },
];

const CATEGORIES = [
  { key: 'all', label: 'All Items', icon: 'fa-cubes' },
  { key: 'life_support', label: 'Life Support', icon: 'fa-heart-pulse' },
  { key: 'trauma', label: 'Trauma', icon: 'fa-kit-medical' },
  { key: 'medical_gas', label: 'Medical Gas', icon: 'fa-wind' },
  { key: 'monitoring', label: 'Monitoring', icon: 'fa-gauge-high' },
  { key: 'supplies', label: 'Supplies', icon: 'fa-box' },
];

const Resources = ({ vehicle, onAction }) => {
  const [category, setCategory] = React.useState('all');

  const filtered = category === 'all' ? EQUIPMENT_ITEMS : EQUIPMENT_ITEMS.filter(e => e.category === category);

  const readyCount = EQUIPMENT_ITEMS.filter(e => e.status.startsWith('Ready')).length;
  const lowCount = EQUIPMENT_ITEMS.filter(e => e.status.startsWith('Low')).length;
  const missingCount = EQUIPMENT_ITEMS.filter(e => e.status === 'Not onboard').length;

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">{readyCount}</p>
          <p className="text-[9px] text-emerald-600 uppercase">Ready</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-xl font-bold text-amber-700">{lowCount}</p>
          <p className="text-[9px] text-amber-600 uppercase">Low / Warning</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center">
          <p className="text-xl font-bold text-red-700">{missingCount}</p>
          <p className="text-[9px] text-red-600 uppercase">Missing</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" onClick={() => setCategory(c.key)}
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
              category === c.key
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}>
            <i className={`fas ${c.icon} text-[9px]`} />{c.label}
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((item) => {
          const statusColor = item.status.startsWith('Ready') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            item.status.startsWith('Low') ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-red-50 border-red-200 text-red-700';
          return (
            <div key={item.name} className={`rounded-xl border p-3 ${statusColor}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 shadow-sm">
                  <i className={`fas ${item.icon} text-sm ${
                    item.status.startsWith('Ready') ? 'text-emerald-600' :
                    item.status.startsWith('Low') ? 'text-amber-600' :
                    'text-red-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{item.name}</p>
                  <p className="text-[9px] text-slate-500">
                    {item.battery ? `Battery: ${item.battery}% · ` : ''}
                    {item.count !== undefined ? `Qty: ${item.count} · ` : ''}
                    Exp: {item.expiry}
                  </p>
                </div>
                <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-white/70 ${
                  item.status.startsWith('Ready') ? 'text-emerald-700' :
                  item.status.startsWith('Low') ? 'text-amber-700' :
                  'text-red-700'
                }`}>{item.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Restock Suggestion */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-robot text-indigo-500 text-sm" />
          <span className="text-[10px] font-bold text-indigo-600 uppercase">AI Inventory Suggestion</span>
        </div>
        <p className="text-xs text-slate-700">
          Based on current mission profile (multi-trauma with suspected hemorrhage), consider restocking:
          <span className="font-semibold"> Burn Kit</span> (missing), <span className="font-semibold">O₂ Cylinder</span> (88%), and <span className="font-semibold">IV Fluids</span> (4 bags — 2 additional recommended).
        </p>
        <button type="button" onClick={() => onAction?.('restock')}
          className="mt-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 active:scale-95 transition-all">
          <i className="fas fa-truck mr-1" />Request Restock
        </button>
      </div>
    </div>
  );
};

export default Resources;
