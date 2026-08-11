import React, { useState, useRef, useEffect } from 'react';

const scenarios = [
  { id: 'pandemic', label: 'Pandemic', icon: 'fa-virus', color: 'rose' },
  { id: 'mass-casualty', label: 'Mass Casualty', icon: 'fa-truck-medical', color: 'red' },
  { id: 'flu', label: 'Flu Outbreak', icon: 'fa-lungs', color: 'amber' },
  { id: 'heatwave', label: 'Heat Wave', icon: 'fa-sun', color: 'orange' },
  { id: 'power', label: 'Power Failure', icon: 'fa-bolt', color: 'yellow' },
  { id: 'earthquake', label: 'Earthquake', icon: 'fa-house-chimney-crack', color: 'purple' },
];

const ResourceScenarioSimulator = () => {
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState(null);
  const timeoutRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const runSim = () => {
    if (!selected || timeoutRef.current) return;
    setResults({ shortage: 'Simulating...', financial: 0, equip: 0, workforce: 0, cost: 0, readiness: 0, confidence: 0 });
    timeoutRef.current = setTimeout(() => {
      if (!mounted.current) return;
      setResults({
        shortage: Math.round(18 + Math.random() * 40) + '%',
        financial: '-' + Math.round(5 + Math.random() * 20) + '%',
        equip: Math.round(30 + Math.random() * 50) + '%',
        workforce: Math.round(10 + Math.random() * 30) + '%',
        cost: '+' + Math.round(8 + Math.random() * 25) + '%',
        readiness: Math.round(40 + Math.random() * 40) + '%',
        confidence: 82 + Math.round(Math.random() * 12),
      });
      timeoutRef.current = null;
    }, 1400);
  };

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-b border-white/20">
        <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2"><i className="fas fa-flask text-rose-500" />Scenario Simulator</h3>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {scenarios.map((s) => (
            <button key={s.id} onClick={() => { setSelected(s.id); setResults(null); }}
              className={`px-2 py-2 rounded-xl border text-center transition-all ${
                selected === s.id ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-white border-slate-100 hover:border-rose-200'
              }`}
            >
              <i className={`fas ${s.icon} text-${s.color}-500 text-sm`} />
              <p className="text-[8px] font-bold text-slate-600 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
        <button onClick={runSim} disabled={!selected || timeoutRef.current !== null}
          className="w-full text-[10px] font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 py-2 rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50">
          <i className="fas fa-play mr-1" />Simulate Scenario
        </button>
        {results && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 animate-fade-in">
            <div className="text-center"><p className="text-[8px] text-slate-400">Shortage</p><p className="text-xs font-bold text-rose-500">{results.shortage}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Revenue</p><p className="text-xs font-bold text-red-500">{results.financial}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Equipment</p><p className="text-xs font-bold text-amber-500">{results.equip}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Workforce</p><p className="text-xs font-bold text-amber-500">{results.workforce}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Cost</p><p className="text-xs font-bold text-red-500">{results.cost}</p></div>
            <div className="text-center"><p className="text-[8px] text-slate-400">Readiness</p><p className="text-xs font-bold text-emerald-500">{results.readiness}</p></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceScenarioSimulator;
