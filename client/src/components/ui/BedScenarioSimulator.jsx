import React, { useEffect, useState, useRef } from 'react';

const BedScenarioSimulator = () => {
  const [params, setParams] = useState({ extraBeds: 20, extraStaff: 5, redirectPercent: 15, delayElective: false });
  const [results, setResults] = useState(null);
  const timeoutRef = useRef(null);
  const running = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const runSim = () => {
    if (running.current) return;
    running.current = true;
    setResults({ waiting: 'Simulating...', revenue: 0, mortality: 0, occupancy: 0, cost: 0, readiness: 0, confidence: 0 });
    timeoutRef.current = setTimeout(() => {
      const baseWait = 24;
      const waitReduction = Math.round(params.extraBeds * 0.8 + params.extraStaff * 2 + params.redirectPercent * 0.3);
      setResults({
        waiting: Math.max(5, baseWait - waitReduction) + ' min',
        revenue: '+' + Math.round(18 + params.extraBeds * 0.4 + params.extraStaff * 2.1) + '%',
        mortality: '-' + Math.round(4 + params.extraBeds * 0.15 + params.redirectPercent * 0.05) + '%',
        occupancy: Math.min(95, 71 + params.extraBeds * 0.8) + '%',
        cost: '+' + Math.round(3 + params.extraBeds * 0.6) + '%',
        readiness: Math.min(99, 81 + params.extraBeds * 0.4 + params.extraStaff * 1.5) + '%',
        confidence: 87 + Math.round(Math.random() * 8),
      });
      running.current = false;
    }, 1200);
  };

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-flask text-blue-500" />Scenario Simulator</h3>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><p className="text-[9px] text-slate-400 mb-1">Extra beds</p>
            <input type="range" min="0" max="60" value={params.extraBeds} onChange={e => setParams({ ...params, extraBeds: +e.target.value })}
              className="w-full accent-indigo-600" />
            <p className="text-right text-[10px] font-bold text-indigo-600">{params.extraBeds}</p>
          </div>
          <div><p className="text-[9px] text-slate-400 mb-1">Extra staff</p>
            <input type="range" min="0" max="20" value={params.extraStaff} onChange={e => setParams({ ...params, extraStaff: +e.target.value })}
              className="w-full accent-indigo-600" />
            <p className="text-right text-[10px] font-bold text-indigo-600">{params.extraStaff}</p>
          </div>
          <div><p className="text-[9px] text-slate-400 mb-1">Redirect %</p>
            <input type="range" min="0" max="50" value={params.redirectPercent} onChange={e => setParams({ ...params, redirectPercent: +e.target.value })}
              className="w-full accent-indigo-600" />
            <p className="text-right text-[10px] font-bold text-indigo-600">{params.redirectPercent}%</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-[9px] text-slate-500 cursor-pointer">
              <input type="checkbox" checked={params.delayElective} onChange={e => setParams({ ...params, delayElective: e.target.checked })} className="accent-indigo-600" />
              Delay elective
            </label>
          </div>
        </div>
        <button onClick={runSim} disabled={timeoutRef.current !== null}
          className="w-full text-[10px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 py-2 rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50">
          <i className="fas fa-play mr-1" /> Run Simulation
        </button>
        {results && results.waiting !== 'Simulating...' && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 animate-fade-in">
            <div className="text-center"><p className="text-[8px] text-slate-400">Wait</p><p className="text-xs font-bold text-emerald-600">{results.waiting}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Revenue</p><p className="text-xs font-bold text-emerald-600">{results.revenue}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Mortality</p><p className="text-xs font-bold text-emerald-600">{results.mortality}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Occupancy</p><p className="text-xs font-bold text-amber-600">{results.occupancy}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Cost</p><p className="text-xs font-bold text-amber-600">{results.cost}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Readiness</p><p className="text-xs font-bold text-emerald-600">{results.readiness}</p></div>
          </div>
        )}
        {results && results.waiting === 'Simulating...' && (
          <div className="text-center py-3">
            <div className="inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-[9px] text-slate-400 mt-1">AI analyzing scenario...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BedScenarioSimulator;
