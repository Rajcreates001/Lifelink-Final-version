import React from 'react';

const assets = [
  { name: 'MRI-1', health: 92, usage: 88, wear: 34, maintenance: 90, downtime: 8, priority: 'Low', life: '4.2y', energy: 'A', costEff: 86, conf: 95 },
  { name: 'MRI-2', health: 68, usage: 96, wear: 72, maintenance: 55, downtime: 22, priority: 'High', life: '1.8y', energy: 'C', costEff: 62, conf: 88 },
  { name: 'CT-1', health: 88, usage: 82, wear: 42, maintenance: 85, downtime: 6, priority: 'Low', life: '5.1y', energy: 'B', costEff: 91, conf: 94 },
  { name: 'Ventilator-A', health: 95, usage: 74, wear: 28, maintenance: 92, downtime: 3, priority: 'Low', life: '6.0y', energy: 'A', costEff: 94, conf: 97 },
  { name: 'X-Ray-1', health: 78, usage: 91, wear: 58, maintenance: 70, downtime: 14, priority: 'Medium', life: '2.5y', energy: 'B', costEff: 75, conf: 90 },
];

const ResourceHealthEngine = () => {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-heart-pulse text-teal-500" />Resource Health Engine</h3>
      </div>
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pb-2 font-semibold">Asset</th>
              <th className="text-center pb-2 font-semibold">Health</th>
              <th className="text-center pb-2 font-semibold">Usage</th>
              <th className="text-center pb-2 font-semibold">Wear</th>
              <th className="text-center pb-2 font-semibold">Maint</th>
              <th className="text-center pb-2 font-semibold">Downtime</th>
              <th className="text-center pb-2 font-semibold">Priority</th>
              <th className="text-right pb-2 font-semibold">Life</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.name} className="border-t border-slate-100">
                <td className="py-2 font-bold text-slate-700">{a.name}</td>
                <td className="text-center py-2"><span className={`px-1.5 py-0.5 rounded ${a.health >= 85 ? 'bg-emerald-100 text-emerald-700' : a.health >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{a.health}</span></td>
                <td className="text-center py-2">{a.usage}%</td>
                <td className="text-center py-2">{a.wear}%</td>
                <td className="text-center py-2"><span className={`px-1.5 py-0.5 rounded ${a.maintenance >= 80 ? 'bg-emerald-100 text-emerald-700' : a.maintenance >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{a.maintenance}</span></td>
                <td className="text-center py-2">{a.downtime}%</td>
                <td className="text-center py-2"><span className={`px-1.5 py-0.5 rounded font-bold ${a.priority === 'High' ? 'bg-red-100 text-red-700' : a.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.priority}</span></td>
                <td className="text-right py-2 font-mono text-slate-600">{a.life}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResourceHealthEngine;
