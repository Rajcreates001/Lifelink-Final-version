import React, { useState, useEffect } from 'react';

const initialAgents = [
  { id: 'emergency', name: 'Emergency Optimization Agent', status: 'thinking', tasks: 18, confidence: 0.92, icon: 'fa-ambulance', color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'radiology', name: 'Radiology Optimization Agent', status: 'analyzing', tasks: 12, confidence: 0.88, icon: 'fa-x-ray', color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'patient_risk', name: 'Patient Risk Agent', status: 'monitoring', tasks: 42, confidence: 0.94, icon: 'fa-heart-pulse', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'finance', name: 'Finance Agent', status: 'active', tasks: 8, confidence: 0.91, icon: 'fa-coins', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'resource', name: 'Resource Agent', status: 'idle', tasks: 6, confidence: 0.87, icon: 'fa-boxes', color: 'text-teal-500', bg: 'bg-teal-50' },
  { id: 'blood_bank', name: 'Blood Bank Agent', status: 'thinking', tasks: 4, confidence: 0.86, icon: 'fa-droplet', color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'icu', name: 'ICU Prediction Agent', status: 'active', tasks: 14, confidence: 0.93, icon: 'fa-bed', color: 'text-violet-500', bg: 'bg-violet-50' },
  { id: 'supply_chain', name: 'Supply Chain Agent', status: 'idle', tasks: 3, confidence: 0.85, icon: 'fa-truck', color: 'text-sky-500', bg: 'bg-sky-50' },
];

const statusConfig = {
  thinking: { label: 'Thinking', bg: 'bg-indigo-100 text-indigo-700', pulse: 'bg-indigo-500' },
  analyzing: { label: 'Analyzing', bg: 'bg-amber-100 text-amber-700', pulse: 'bg-amber-500' },
  monitoring: { label: 'Monitoring', bg: 'bg-emerald-100 text-emerald-700', pulse: 'bg-emerald-500' },
  active: { label: 'Active', bg: 'bg-blue-100 text-blue-700', pulse: 'bg-blue-500' },
  idle: { label: 'Idle', bg: 'bg-slate-100 text-slate-500', pulse: 'bg-slate-400' },
};

const AiAgentsPanel = () => {
  const [agents, setAgents] = useState(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    const t = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          tasks: Math.max(1, a.tasks + Math.round((Math.random() - 0.5) * 4)),
          confidence: Math.max(0.7, Math.min(0.99, a.confidence + (Math.random() - 0.5) * 0.04)),
          status: Math.random() > 0.7
            ? (['thinking', 'analyzing', 'monitoring', 'active', 'idle'])[Math.floor(Math.random() * 5)]
            : a.status,
        }))
      );
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const selected = selectedAgent ? agents.find((a) => a.id === selectedAgent) : null;

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-sky-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-robot text-cyan-500"></i>
            Live AI Agents
          </h3>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {agents.filter(a => a.status !== 'idle').length} active
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        {agents.map((agent) => {
          const sc = statusConfig[agent.status] || statusConfig.idle;
          const isSelected = selectedAgent === agent.id;

          return (
            <div key={agent.id}>
              <div
                onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isSelected ? 'bg-white border-indigo-200 shadow-sm' : 'bg-white/40 border-transparent hover:bg-white/60 hover:border-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg ${agent.bg} flex items-center justify-center ${agent.color} flex-shrink-0`}>
                  <i className={`fas ${agent.icon} text-xs`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-slate-700 truncate">{agent.name}</p>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${sc.bg}`}>
                      <span className={`w-1 h-1 rounded-full ${sc.pulse} ${agent.status !== 'idle' ? 'animate-pulse' : ''}`}></span>
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-400">{agent.tasks} tasks</span>
                    <span className="text-[9px] font-semibold text-indigo-500">{Math.round(agent.confidence * 100)}% confidence</span>
                  </div>
                </div>
                <i className={`fas fa-chevron-down text-[9px] text-slate-400 transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`}></i>
              </div>

              {isSelected && selected && (
                <div className="ml-10 mr-2 px-3 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1 animate-fade-in">
                  <p className="text-[10px] text-slate-600 mb-1.5">
                    <strong>Current Reasoning:</strong> Analyzing {selected.tasks} tasks with {Math.round(selected.confidence * 100)}% confidence. 
                    {selected.status === 'thinking' ? ' Processing new data...' : selected.status === 'analyzing' ? ' Running optimizations...' : ' Monitoring for changes...'}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-white text-indigo-500 font-semibold border border-indigo-100">
                      <i className="fas fa-brain text-[7px] mr-0.5"></i>
                      Last task: {Math.floor(Math.random() * 10)}s ago
                    </span>
                    <span>Accuracy: {88 + Math.floor(Math.random() * 8)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AiAgentsPanel;
