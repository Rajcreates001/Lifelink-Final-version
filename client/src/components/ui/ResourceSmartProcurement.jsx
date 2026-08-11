import React, { useState } from 'react';

const orders = [
  { id: 'PO-2024-01', item: 'PPE Kits', qty: 400, supplier: 'ShieldCo', price: '$4,200', delivery: '2 days', risk: 'Low', priority: 'High', reason: 'Stock below threshold, demand rising 24%' },
  { id: 'PO-2024-02', item: 'O Negative Blood', qty: 80, supplier: 'BloodBank', price: '$12,400', delivery: '1 day', risk: 'Medium', priority: 'Critical', reason: 'Emergency reserve at 30%. Predicted shortage within 6 days.' },
  { id: 'PO-2024-03', item: 'Emergency Drugs', qty: 200, supplier: 'PharmaQuick', price: '$8,600', delivery: '3 days', risk: 'Low', priority: 'High', reason: 'Seasonal demand increase +18% expected' },
  { id: 'PO-2024-04', item: 'Syringes', qty: 1000, supplier: 'MedSupply', price: '$1,800', delivery: '5 days', risk: 'Very Low', priority: 'Medium', reason: 'Routine restock - 22 days remaining' },
];

const ResourceSmartProcurement = () => {
  const [selected, setSelected] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-truck text-orange-500" />Smart Procurement AI</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {orders.map((o) => (
          <div key={o.id} onClick={() => setSelected(selected === o.id ? null : o.id)}
            className={`px-3 py-2 rounded-xl border cursor-pointer transition-all ${
              selected === o.id ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-700 truncate">{o.item}</p>
                <p className="text-[8px] text-slate-400">{o.supplier} · {o.qty} units</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                  o.priority === 'Critical' ? 'bg-red-100 text-red-600' : o.priority === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>{o.priority}</span>
                <span className="text-[9px] font-bold text-emerald-600">{o.price}</span>
              </div>
            </div>
            {selected === o.id && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] space-y-1 animate-fade-in">
                <p><span className="text-slate-400">AI reason:</span> <span className="text-slate-600">{o.reason}</span></p>
                <p><span className="text-slate-400">Delivery:</span> {o.delivery} · <span className="text-slate-400">Risk:</span> {o.risk}</p>
                <div className="flex gap-1 mt-1">
                  <button className="flex-1 text-[9px] font-bold text-white bg-emerald-600 py-1 rounded hover:bg-emerald-700 active:scale-95 transition-all">Approve</button>
                  <button className="flex-1 text-[9px] font-bold text-slate-600 bg-slate-100 py-1 rounded hover:bg-slate-200 active:scale-95 transition-all">Modify</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceSmartProcurement;
