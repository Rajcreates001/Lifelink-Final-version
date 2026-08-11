import React, { useState, useMemo } from 'react';

const initialRanks = [
  { rank: 1, name: 'Cardiology', score: 94, efficiency: 92, satisfaction: 88, cost: 82, revenue: 128000, mortality: 1.2, confidence: 93, trend: 'up', color: 'text-emerald-500' },
  { rank: 2, name: 'Orthopedics', score: 91, efficiency: 88, satisfaction: 85, cost: 76, revenue: 96000, mortality: 0.8, confidence: 91, trend: 'up', color: 'text-emerald-500' },
  { rank: 3, name: 'OPD', score: 86, efficiency: 84, satisfaction: 78, cost: 70, revenue: 72000, mortality: 0.3, confidence: 88, trend: 'stable', color: 'text-sky-500' },
  { rank: 4, name: 'General Ward', score: 82, efficiency: 80, satisfaction: 82, cost: 74, revenue: 84000, mortality: 1.8, confidence: 86, trend: 'up', color: 'text-emerald-500' },
  { rank: 5, name: 'Surgery', score: 78, efficiency: 76, satisfaction: 72, cost: 68, revenue: 112000, mortality: 2.1, confidence: 84, trend: 'down', color: 'text-amber-500' },
  { rank: 6, name: 'ICU', score: 74, efficiency: 70, satisfaction: 65, cost: 72, revenue: 145000, mortality: 3.4, confidence: 82, trend: 'down', color: 'text-amber-500' },
  { rank: 7, name: 'Emergency', score: 68, efficiency: 62, satisfaction: 58, cost: 64, revenue: 156000, mortality: 2.8, confidence: 79, trend: 'down', color: 'text-red-500' },
  { rank: 8, name: 'Radiology', score: 65, efficiency: 58, satisfaction: 55, cost: 60, revenue: 92000, mortality: 0.1, confidence: 76, trend: 'down', color: 'text-red-500' },
];

const DeptPerformanceRanking = () => {
  const [ranks] = useState(initialRanks);
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-trophy text-amber-400"></i>AI Performance Ranking</h3>
          <span className="text-[10px] text-slate-400"><i className="fas fa-sync-alt text-[8px] mr-1"></i>Live ranking</span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {ranks.map((r, idx) => (
          <div key={r.name}>
            <div onClick={() => setExpanded(expanded === idx ? null : idx)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 cursor-pointer transition-all border border-transparent hover:border-slate-100">
              <span className={'w-5 text-center text-[10px] font-bold ' + (idx < 3 ? 'text-amber-500' : 'text-slate-400')}>#{r.rank}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">{r.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={'text-xs font-extrabold ' + r.color}>{r.score}</span>
                    <i className={'fas fa-arrow-' + (r.trend === 'up' ? 'up' : r.trend === 'down' ? 'down' : 'right') + ' text-[8px] ' + (r.trend === 'up' ? 'text-emerald-500' : r.trend === 'down' ? 'text-red-500' : 'text-slate-400')}></i>
                    <span className="text-[8px] text-indigo-500 font-semibold">{r.confidence}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[8px] text-slate-400">
                  <span>Efficiency: {r.efficiency}%</span>
                  <span>Satisfaction: {r.satisfaction}%</span>
                </div>
              </div>
              <i className={'fas fa-chevron-down text-[8px] text-slate-400 transition-transform ' + (expanded === idx ? 'rotate-180' : '')}></i>
            </div>
            {expanded === idx && (
              <div className="ml-6 mr-2 px-2.5 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1 animate-fade-in">
                <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-600">
                  <div><span className="text-slate-400">Cost Eff:</span> <span className="font-semibold text-slate-700">{r.cost}%</span></div>
                  <div><span className="text-slate-400">Revenue:</span> <span className="font-semibold text-emerald-600">${(r.revenue / 1000).toFixed(1)}K</span></div>
                  <div><span className="text-slate-400">Mortality:</span> <span className="font-semibold text-slate-700">{r.mortality}%</span></div>
                  <div><span className="text-slate-400">AI Conf:</span> <span className="font-semibold text-indigo-600">{r.confidence}%</span></div>
                </div>
                <div className="mt-1.5 flex items-center gap-1"><i className="fas fa-robot text-indigo-400 text-[7px]"></i><span className="text-[8px] text-indigo-700 font-medium">{r.name === 'Radiology' ? 'Recommend process review and equipment maintenance scheduling.' : r.name === 'Emergency' ? 'Recommend overflow team activation and staff reallocation.' : r.name === 'ICU' ? 'Recommend patient transfer to General Ward to reduce load.' : 'Performance stable. Continue current protocols.'}</span></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeptPerformanceRanking;
