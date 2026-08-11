import React, { useState } from 'react';

const TIMELINE_EVENTS = [
  { time: '00:00', event: 'Mission dispatched', type: 'mission' },
  { time: '00:30', event: 'Ambulance en route', type: 'vehicle' },
  { time: '03:15', event: 'Traffic alert: Moderate congestion', type: 'alert' },
  { time: '05:45', event: 'Vitals update: HR 122, SpO₂ 88%', type: 'medical' },
  { time: '07:00', event: 'Arrived at pickup location', type: 'mission' },
  { time: '08:30', event: 'Patient loaded — C-spine immobilised', type: 'medical' },
  { time: '09:15', event: 'Departed to hospital', type: 'vehicle' },
  { time: '11:00', event: 'Hospital confirmed: Trauma team ready', type: 'communication' },
  { time: '12:30', event: 'Police escort activated', type: 'communication' },
  { time: '14:00', event: 'Approaching hospital — ETA 2 min', type: 'vehicle' },
  { time: '16:00', event: 'Arrived at ER — Handover initiated', type: 'mission' },
];

const Simulation = ({ onAction }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Mission Replay</p>
            <p className="text-lg font-bold">Simulation & Training Mode</p>
            <p className="text-xs text-white/70 mt-1">Review mission timeline, AI decisions, and practice response scenarios.</p>
          </div>
          <span className="text-[8px] font-semibold px-2 py-1 rounded-full bg-white/20">v1.0</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setIsPlaying(!isPlaying); if (!isPlaying) onAction?.('play'); else onAction?.('pause'); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}>
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`} />
            </button>
            <div className="flex items-center gap-1.5">
              {[0.5, 1, 2, 4].map((s) => (
                <button key={s} type="button" onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                    speed === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                  }`}>{s}x</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); onAction?.('step_back'); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"><i className="fas fa-backward-step mr-1" />Step</button>
            <button type="button" onClick={() => { setCurrentStep(Math.min(TIMELINE_EVENTS.length - 1, currentStep + 1)); onAction?.('step_forward'); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"><i className="fas fa-forward-step mr-1" />Step</button>
          </div>
        </div>

        {/* Timeline Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all" style={{ width: `${(currentStep / TIMELINE_EVENTS.length) * 100}%` }} />
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl bg-white border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <i className="fas fa-timeline text-slate-400 text-xs" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Simulation Timeline</span>
        </div>
        <div className="p-3 space-y-1 max-h-[320px] overflow-y-auto">
          {TIMELINE_EVENTS.map((ev, i) => {
            const isActive = i === currentStep;
            const isPast = i < currentStep;
            const typeDot = ev.type === 'mission' ? 'bg-sky-500' :
              ev.type === 'vehicle' ? 'bg-amber-500' :
              ev.type === 'medical' ? 'bg-red-500' :
              ev.type === 'alert' ? 'bg-amber-400' :
              ev.type === 'communication' ? 'bg-emerald-500' : 'bg-slate-400';
            return (
              <div key={i} onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                  isActive ? 'bg-indigo-50 border border-indigo-200' :
                  isPast ? 'opacity-60' : 'hover:bg-slate-50'
                }`}>
                <div className="flex flex-col items-center">
                  <span className={`w-2 h-2 rounded-full ${typeDot} ${isActive ? 'ring-2 ring-indigo-200' : ''}`} />
                  {i < TIMELINE_EVENTS.length - 1 && <div className="w-px h-4 bg-slate-200" />}
                </div>
                <span className="text-[9px] font-bold text-slate-400 w-12">{ev.time}</span>
                <p className={`text-xs ${isActive ? 'font-semibold text-indigo-700' : 'text-slate-600'}`}>{ev.event}</p>
                {isActive && <span className="ml-auto text-[8px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">CURRENT</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Mode */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
        <div className="flex items-center gap-3">
          <i className="fas fa-graduation-cap text-2xl text-emerald-200" />
          <div className="flex-1">
            <p className="text-sm font-bold">Training Mode</p>
            <p className="text-xs text-white/70 mt-1">Practice decision-making with branching scenarios. Score your response time and accuracy against AI benchmarks.</p>
          </div>
          <button type="button" onClick={() => onAction?.('start_training')}
            className="px-4 py-2 rounded-lg bg-white text-emerald-700 text-xs font-bold hover:bg-emerald-50 active:scale-95 transition-all">
            Start Training
          </button>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
