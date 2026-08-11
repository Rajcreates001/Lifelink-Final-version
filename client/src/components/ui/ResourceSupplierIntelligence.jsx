import React from 'react';

const suppliers = [
  { name: 'MedCorp', reliability: 94, delivery: 96, delay: 2.1, quality: 98, failure: 3, esg: 'A', financial: 92, contract: '12 mo', recommendation: 'Preferred' },
  { name: 'ShieldCo', reliability: 88, delivery: 92, delay: 3.4, quality: 94, failure: 6, esg: 'B+', financial: 85, contract: '6 mo', recommendation: 'Approved' },
  { name: 'PharmaQuick', reliability: 96, delivery: 98, delay: 1.2, quality: 99, failure: 1, esg: 'A+', financial: 97, contract: '24 mo', recommendation: 'Strategic' },
  { name: 'MedSupply', reliability: 82, delivery: 85, delay: 5.8, quality: 90, failure: 9, esg: 'B', financial: 78, contract: '3 mo', recommendation: 'Watch' },
];

const ResourceSupplierIntelligence = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-handshake text-emerald-500" />Supplier Intelligence</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
        {suppliers.map((s) => (
          <div key={s.name} className="px-3 py-2 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.recommendation === 'Strategic' ? 'bg-emerald-500' : s.recommendation === 'Preferred' ? 'bg-blue-500' : s.recommendation === 'Approved' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-slate-700">{s.name}</span>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                s.recommendation === 'Strategic' ? 'bg-emerald-100 text-emerald-700' : s.recommendation === 'Preferred' ? 'bg-blue-100 text-blue-700' : s.recommendation === 'Approved' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>{s.recommendation}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[8px] text-slate-400">
              <span>Reliability: {s.reliability}%</span>
              <span>Delivery: {s.delivery}%</span>
              <span>Quality: {s.quality}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceSupplierIntelligence;
