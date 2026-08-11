import React from 'react';

const wasteItems = [
  { item: 'Expired Medicines', dept: 'Pharmacy', value: '$2,400', qty: '48 units', cause: 'Over-ordering', action: 'Adjust reorder thresholds', savings: '$1,200/mo', confidence: 94 },
  { item: 'Idle MRI-2', dept: 'Radiology', value: '$12,800/mo', qty: '22 hrs idle', cause: 'Duplicate scheduling', action: 'Consolidate booking system', savings: '$6,400/mo', confidence: 91 },
  { item: 'Duplicate PPE Orders', dept: 'Procurement', value: '$3,600', qty: '400 units', cause: 'Multiple dept orders', action: 'Centralize procurement', savings: '$2,800/mo', confidence: 96 },
  { item: 'Unused IV Kits', dept: 'General', value: '$1,800', qty: '120 kits', cause: 'Expired protocol', action: 'Update clinical guidelines', savings: '$900/mo', confidence: 88 },
];

const ResourceWasteDetection = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-trash-can text-rose-500" />Waste Detection</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {wasteItems.map((w, i) => (
          <div key={i} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-700">{w.item}</p>
                <p className="text-[8px] text-slate-400">{w.dept} · {w.qty}</p>
              </div>
              <span className="text-[9px] font-bold text-red-500">{w.value}</span>
            </div>
            <p className="text-[8px] text-indigo-500 mt-0.5">AI: {w.action} · Save {w.savings}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceWasteDetection;
