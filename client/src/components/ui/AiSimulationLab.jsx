import React, { useState } from 'react';

const defaultParams = {
  erStaff: 0,
  emergencyDelta: 0,
  staffDelta: 0,
  plannedDischarges: 0,
  icuBeds: 0,
  radiologyStaff: 0,
};

const AiSimulationLab = () => {
  const [params, setParams] = useState(defaultParams);
  const [results, setResults] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const handleChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const runSimulation = () => {
    setSimulating(true);
    setTimeout(() => {
      // Simulate AI prediction based on parameters
      const baseWait = 24;
      const waitTime = Math.max(5, baseWait - params.erStaff * 2 + params.emergencyDelta * 1.5);
      const mortality = Math.max(0.5, 2.1 - params.erStaff * 0.08 - params.plannedDischarges * 0.02);
      const revenue = 284500 + params.erStaff * 1200 + params.plannedDischarges * 800 - params.staffDelta * 300;
      const occupancy = Math.min(98, Math.max(40, 81 - params.plannedDischarges * 2 + params.emergencyDelta * 0.5));
      const satisfaction = Math.min(100, Math.max(40, 72 + params.erStaff * 1.5 - params.emergencyDelta * 0.8));
      const cost = 180000 + params.erStaff * 2500 + params.icuBeds * 3000 + params.radiologyStaff * 2000;

      setResults({
        waitTime: Math.round(waitTime),
        mortality: mortality.toFixed(1),
        revenue: Math.round(revenue),
        occupancy: Math.round(occupancy),
        satisfaction: Math.round(satisfaction),
        cost: Math.round(cost),
        confidence: 0.87 + Math.random() * 0.08,
      });
      setSimulating(false);
    }, 1500);
  };

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-flask text-indigo-500"></i>
            What-If Simulation Lab
          </h3>
          <span className="text-[10px] text-slate-400">
            <i className="fas fa-robot text-[8px] mr-1"></i>
            Predictive AI
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {[
            { key: 'erStaff', label: 'ER Staff Change', icon: 'fa-user-md', unit: 'people' },
            { key: 'emergencyDelta', label: 'Emergency Cases', icon: 'fa-triangle-exclamation', unit: 'delta' },
            { key: 'staffDelta', label: 'Staff Availability', icon: 'fa-user-nurse', unit: 'delta' },
            { key: 'plannedDischarges', label: 'Planned Discharges', icon: 'fa-door-open', unit: 'patients' },
            { key: 'icuBeds', label: 'ICU Beds Added', icon: 'fa-bed', unit: 'beds' },
            { key: 'radiologyStaff', label: 'Radiology Staff', icon: 'fa-x-ray', unit: 'people' },
          ].map((field) => (
            <div key={field.key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/50 border border-slate-100">
              <i className={`fas ${field.icon} text-indigo-400 text-xs`}></i>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-semibold text-slate-500 truncate">{field.label}</p>
                <input
                  type="number"
                  value={params[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-transparent border-none outline-none p-0 -ml-0.5"
                  placeholder="0"
                />
              </div>
              <span className="text-[8px] text-slate-400">{field.unit}</span>
            </div>
          ))}
        </div>

        <button
          onClick={runSimulation}
          disabled={simulating}
          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        >
          {simulating ? (
            <>
              <i className="fas fa-spinner animate-spin"></i>
              AI Simulating...
            </>
          ) : (
            <>
              <i className="fas fa-play"></i>
              Run Simulation
            </>
          )}
        </button>

        {results && (
          <div className="mt-3 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Predicted Outcomes</p>
              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[9px] font-bold border border-indigo-100">
                {Math.round(results.confidence * 100)}% AI confidence
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Avg Wait Time', value: results.waitTime, unit: ' min', color: results.waitTime > 30 ? 'text-red-600' : results.waitTime > 20 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Mortality Risk', value: results.mortality, unit: '%', color: results.mortality > 3 ? 'text-red-600' : 'text-emerald-600' },
                { label: 'Revenue', value: results.revenue, unit: '', color: 'text-emerald-600', prefix: '$' },
                { label: 'Occupancy', value: results.occupancy, unit: '%', color: results.occupancy > 90 ? 'text-red-600' : results.occupancy > 75 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Patient Satisf.', value: results.satisfaction, unit: '%', color: results.satisfaction > 80 ? 'text-emerald-600' : results.satisfaction > 60 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Operational Cost', value: results.cost, unit: '', color: 'text-slate-600', prefix: '$' },
              ].map((r, idx) => (
                <div key={idx} className="bg-white/50 rounded-lg px-3 py-2 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-medium">{r.label}</p>
                  <p className={`text-sm font-bold ${r.color}`}>{r.prefix || ''}{typeof r.value === 'number' ? r.value.toLocaleString() : r.value}{r.unit}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
              <i className="fas fa-robot text-indigo-400 text-[10px]"></i>
              <p className="text-[10px] text-indigo-700 font-medium">
                <strong>AI Insight:</strong> Based on current parameters, {results.occupancy > 85 ? 'consider increasing resources' : 'operations look stable'}. Confidence: {Math.round(results.confidence * 100)}%.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiSimulationLab;
