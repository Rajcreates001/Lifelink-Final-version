import React from 'react';

const wards = [
  { name: 'ICU', operational: 72, clinical: 88, cleaning: 91, utilization: 86, safety: 94, trend: '+2%' },
  { name: 'Emergency', operational: 68, clinical: 82, cleaning: 75, utilization: 89, safety: 91, trend: '-3%' },
  { name: 'General', operational: 85, clinical: 92, cleaning: 88, utilization: 77, safety: 96, trend: '+1%' },
  { name: 'Pediatrics', operational: 91, clinical: 95, cleaning: 94, utilization: 58, safety: 98, trend: '+4%' },
  { name: 'Surgery', operational: 78, clinical: 90, cleaning: 82, utilization: 79, safety: 93, trend: '-1%' },
];

const BedHealthScore = () => {
  const categories = ['Operational', 'Clinical', 'Cleaning', 'Utilization', 'Safety'];
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-heart-circle-check text-teal-500" />Ward Health Scores</h3>
      </div>
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pb-2 font-semibold">Ward</th>
              {categories.map(c => <th key={c} className="text-center pb-2 font-semibold">{c}</th>)}
              <th className="text-right pb-2 font-semibold">Trend</th>
            </tr>
          </thead>
          <tbody>
            {wards.map((w) => {
              const avg = Math.round((w.operational + w.clinical + w.cleaning + w.utilization + w.safety) / 5);
              return (
                <tr key={w.name} className="border-t border-slate-100">
                  <td className="py-2 font-bold text-slate-700">{w.name}</td>
                  <td className="text-center py-2"><span className={`px-1.5 py-0.5 rounded ${w.operational >= 80 ? 'bg-emerald-100 text-emerald-700' : w.operational >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{w.operational}</span></td>
                  <td className="text-center py-2">{w.clinical}</td>
                  <td className="text-center py-2">{w.cleaning}</td>
                  <td className="text-center py-2"><span className={`px-1.5 py-0.5 rounded ${w.utilization >= 80 ? 'bg-amber-100 text-amber-700' : w.utilization >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>{w.utilization}%</span></td>
                  <td className="text-center py-2">{w.safety}</td>
                  <td className={`text-right py-2 font-bold ${w.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{w.trend}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[8px] text-slate-400">
          <span>AI Confidence: 92%</span>
          <span>Overall Health: <span className="font-bold text-emerald-600">84%</span></span>
        </div>
      </div>
    </div>
  );
};

export default BedHealthScore;
