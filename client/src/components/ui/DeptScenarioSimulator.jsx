import React, { useState } from 'react';

const DeptScenarioSimulator = () => {
  const [params, setParams] = useState({ hireDoctors: 0, hireNurses: 0, addBeds: 0, reduceSurgeries: 0 });
  const [results, setResults] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const handleChange = (key, value) => setParams((p) => ({ ...p, [key]: Number(value) || 0 }));

  const runSim = () => {
    setSimulating(true);
    setTimeout(() => {
      const baseWait = 24;
      const wait = Math.max(5, baseWait - params.hireDoctors * 3 - params.hireNurses * 1 + params.addBeds * 0.5);
      const rev = 284500 + params.hireDoctors * 12000 + params.hireNurses * 4000 - params.reduceSurgeries * 8000;
      const sat = Math.min(100, Math.max(40, 72 + params.hireDoctors * 3 + params.hireNurses * 1.5));
      const occ = Math.min(95, Math.max(50, 81 - params.addBeds * 2 - params.reduceSurgeries * 0.5));
      const mortality = Math.max(0.5, 2.1 - params.hireDoctors * 0.1 - params.hireNurses * 0.05);
      const cost = 180000 + params.hireDoctors * 15000 + params.hireNurses * 5000 + params.addBeds * 3000;
      setResults({ wait: Math.round(wait), revenue: Math.round(rev), satisfaction: Math.round(sat), occupancy: Math.round(occ), mortality: mortality.toFixed(1), cost: Math.round(cost), confidence: 0.85 + Math.random() * 0.1 });
      setSimulating(false);
    }, 1500);
  };

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-flask text-indigo-500"></i>Scenario Simulator</h3>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { key: 'hireDoctors', label: 'Hire Doctors', icon: 'fa-user-md' },
            { key: 'hireNurses', label: 'Hire Nurses', icon: 'fa-user-nurse' },
            { key: 'addBeds', label: 'Add Beds', icon: 'fa-bed' },
            { key: 'reduceSurgeries', label: 'Reduce Surgeries', icon: 'fa-scalpel' },
          ].map((f) => (
            <div key={f.key} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/50 border border-slate-100">
              <i className={'fas ' + f.icon + ' text-indigo-400 text-[10px]'}></i>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-semibold text-slate-500">{f.label}</p>
                <input type="number" value={params[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-transparent border-none outline-none p-0" placeholder="0" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={runSim} disabled={simulating} className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          {simulating ? <><i className="fas fa-spinner animate-spin"></i>Simulating...</> : <><i className="fas fa-play"></i>Run Scenario</>}
        </button>
        {results && (
          <div className="mt-3 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
              {[
                { label: 'Wait Time', value: results.wait, unit: ' min', c: results.wait > 30 ? 'text-red-600' : results.wait > 20 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Revenue', value: results.revenue, prefix: '$', c: 'text-emerald-600' },
                { label: 'Satisfaction', value: results.satisfaction, unit: '%', c: results.satisfaction > 80 ? 'text-emerald-600' : results.satisfaction > 60 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Occupancy', value: results.occupancy, unit: '%', c: results.occupancy > 90 ? 'text-red-600' : results.occupancy > 75 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Mortality', value: results.mortality, unit: '%', c: results.mortality > 3 ? 'text-red-600' : 'text-emerald-600' },
                { label: 'Cost', value: results.cost, prefix: '$', c: 'text-slate-600' },
              ].map((r, i) => (
                <div key={i} className="bg-white/50 rounded-lg px-2 py-1.5 border border-slate-100">
                  <p className="text-[8px] text-slate-400">{r.label}</p>
                  <p className={'text-sm font-bold ' + r.c}>{r.prefix || ''}{typeof r.value === 'number' ? r.value.toLocaleString() : r.value}{r.unit}</p>
                </div>
              ))}
            </div>
            <div className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-1.5">
              <i className="fas fa-robot text-indigo-400 text-[8px]"></i>
              <span className="text-[9px] text-indigo-700 font-medium">AI confidence: {Math.round(results.confidence * 100)}%. {results.occupancy > 85 ? 'Consider additional resources.' : 'Scenario looks viable.'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeptScenarioSimulator;
