import React, { useState } from 'react';

const categories = [
  { name: 'Medicines', stock: 3245, depletion: '18d', reorder: 1200, demand: '+12%', supplier: 'MedCorp', reserve: 600, alt: 'PharmaPlus', hist: '+8%' },
  { name: 'PPE', stock: 820, depletion: '12d', reorder: 400, demand: '+24%', supplier: 'ShieldCo', reserve: 200, alt: 'SafeGuard', hist: '+18%' },
  { name: 'Blood Products', stock: 148, depletion: '6d', reorder: 80, demand: '+8%', supplier: 'BloodBank', reserve: 40, alt: 'RedCross', hist: '+4%' },
  { name: 'IV Kits', stock: 2100, depletion: '22d', reorder: 600, demand: '+6%', supplier: 'MedSupply', reserve: 400, alt: 'HealthLine', hist: '+5%' },
  { name: 'Emergency Drugs', stock: 420, depletion: '14d', reorder: 200, demand: '+18%', supplier: 'PharmaQuick', reserve: 100, alt: 'MedFast', hist: '+15%' },
  { name: 'Surgical Kits', stock: 340, depletion: '20d', reorder: 120, demand: '+4%', supplier: 'SurgiTech', reserve: 80, alt: 'OpMed', hist: '+3%' },
];

const ResourceInventoryBrain = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-brain text-blue-500" />AI Inventory Brain</h3>
        <span className="text-[9px] text-slate-400">6 categories</span>
      </div>
      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
        {categories.map((c) => (
          <div key={c.name} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === c.name ? null : c.name)}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.depletion.startsWith('6') || c.depletion.startsWith('1') && parseInt(c.depletion) < 15 ? 'bg-red-500' : parseInt(c.depletion) <= 15 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate">{c.name}</p>
                  <p className="text-[8px] text-slate-400">{c.stock} units · Depletion in {c.depletion}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-indigo-600">{c.reorder}</span>
                <i className={`fas fa-chevron-down text-[8px] text-slate-400 transition-transform ${expanded === c.name ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {expanded === c.name && (
              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[9px] animate-fade-in">
                <div><span className="text-slate-400">Demand:</span> <span className="font-semibold text-slate-700">{c.demand}</span></div>
                <div><span className="text-slate-400">Supplier:</span> <span className="font-semibold text-slate-700">{c.supplier}</span></div>
                <div><span className="text-slate-400">Reserve:</span> <span className="font-semibold text-slate-700">{c.reserve}</span></div>
                <div><span className="text-slate-400">Alternative:</span> <span className="font-semibold text-slate-700">{c.alt}</span></div>
                <div><span className="text-slate-400">History:</span> <span className="font-semibold text-emerald-600">{c.hist}</span></div>
                <button onClick={() => alert('Reordering ' + c.name + ' from ' + c.supplier + '\nDemand: ' + c.demand + '\nReserve: ' + c.reserve)} className="col-span-2 text-[9px] font-bold text-white bg-indigo-600 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">Reorder Now</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceInventoryBrain;
