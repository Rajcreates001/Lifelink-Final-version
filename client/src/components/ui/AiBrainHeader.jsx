import React, { useState, useEffect } from 'react';

const statusItems = [
  { label: 'AI Status', value: 'Active', icon: 'fa-brain', color: 'text-emerald-400' },
  { label: 'Reasoning Model', value: 'LifeLink v4.2', icon: 'fa-microchip', color: 'text-indigo-400' },
  { label: 'Prediction Engine', value: 'Online', icon: 'fa-chart-line', color: 'text-sky-400' },
  { label: 'Knowledge Graph', value: '42,816 nodes', icon: 'fa-project-diagram', color: 'text-purple-400' },
  { label: 'Live Context', value: '1.2M records', icon: 'fa-database', color: 'text-teal-400' },
  { label: 'Inference Speed', value: '48ms avg', icon: 'fa-bolt', color: 'text-amber-400' },
  { label: 'Overall Confidence', value: '94%', icon: 'fa-check-circle', color: 'text-emerald-400' },
  { label: 'Systems Online', value: '18/18', icon: 'fa-wifi', color: 'text-green-400' },
];

const externalSources = [
  { name: 'WHO', status: 'connected' },
  { name: 'CDC', status: 'connected' },
  { name: 'Govt Alerts', status: 'connected' },
  { name: 'Weather', status: 'connected' },
  { name: 'Traffic', status: 'connected' },
  { name: 'Disease Surveillance', status: 'connected' },
];

const AnimatedCounter = ({ value, suffix = '', duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const startTime = Date.now();
    let raf;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{display}{suffix}</span>;
};

const AiBrainHeader = () => {
  const [thinkingTasks, setThinkingTasks] = useState(4);
  const [spike, setSpike] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setThinkingTasks(2 + Math.round(Math.random() * 6));
      setSpike((p) => !p);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 shadow-2xl animate-fade-in-up">
      {/* Animated background orbs */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-slow" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-purple-500/10 blur-3xl animate-pulse-slower" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-500/5 blur-3xl animate-float" />

      <div className="relative z-10 px-4 py-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
                <i className="fas fa-brain text-white text-xl"></i>
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">LifeLink AI Intelligence Engine</h2>
              <p className="text-[10px] text-indigo-300/70 flex items-center gap-2">
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Reasoning</span>
                <span>\u2022</span>
                <span>Predicting</span>
                <span>\u2022</span>
                <span>Learning</span>
                <span className="text-[9px] text-indigo-400/60">v4.2</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <i className="fas fa-microchip text-indigo-400 text-xs"></i>
            <span className="text-[9px] text-indigo-300 font-semibold">{thinkingTasks} reasoning tasks</span>
            <span className={`w-1.5 h-1.5 rounded-full ${spike ? 'bg-emerald-400' : 'bg-indigo-400'} transition-colors duration-300`}></span>
          </div>
        </div>

        {/* Main status grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {statusItems.map((item, idx) => (
            <div key={idx} className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="flex items-center gap-1.5 mb-0.5">
                <i className={`fas ${item.icon} ${item.color} text-[10px]`}></i>
                <p className="text-[8px] text-indigo-300/60 uppercase tracking-wider">{item.label}</p>
              </div>
              <p className={`text-xs sm:text-sm font-bold ${item.color}`}>
                {item.value.includes('%') ? <AnimatedCounter value={parseInt(item.value)} suffix="%" /> : item.value}
              </p>
            </div>
          ))}
        </div>

        {/* External sources bar */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[9px] text-indigo-300/70 font-semibold uppercase tracking-wider">External Sources</span>
          {externalSources.map((src, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 text-[9px] text-indigo-300/80">
              <span className={`w-1.5 h-1.5 rounded-full ${src.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {src.name}
            </span>
          ))}
          <span className="text-[9px] text-indigo-400/60 ml-auto">All systems nominal</span>
        </div>
      </div>
    </div>
  );
};

export default AiBrainHeader;
