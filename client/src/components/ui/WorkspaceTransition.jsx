import React, { useEffect, useRef, useState } from 'react';

const STEPS = [
  { icon: 'fa-building', label: 'Preparing', detail: '{department} Workspace' },
  { icon: 'fa-database', label: 'Loading', detail: 'Patient Database' },
  { icon: 'fa-brain', label: 'Connecting', detail: 'AI Models' },
  { icon: 'fa-triangle-exclamation', label: 'Loading', detail: 'Active Cases' },
  { icon: 'fa-users', label: 'Synchronizing', detail: 'Staff Directory' },
  { icon: 'fa-check-circle', label: 'Ready', detail: 'Redirecting...' },
];

const WorkspaceTransition = ({ department, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const completeRef = useRef(null);

  useEffect(() => {
    if (!department) return;
    setCurrentStep(0);
    setProgress(0);

    const totalDuration = 3500;
    const interval = 80;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + (interval / totalDuration) * 100, 100);
        const stepIndex = Math.min(Math.floor((next / 100) * STEPS.length), STEPS.length - 1);
        setCurrentStep(stepIndex);
        if (next >= 100) {
          clearInterval(timer);
          completeRef.current = setTimeout(() => onComplete?.(), 400);
        }
        return next;
      });
    }, interval);

    return () => {
      clearInterval(timer);
      if (completeRef.current) clearTimeout(completeRef.current);
    };
  }, [department?.key]);

  if (!department) return null;

  const themeColors = {
    ceo: 'from-blue-600 to-indigo-700', emergency: 'from-red-600 to-rose-700',
    icu: 'from-purple-600 to-violet-700', opd: 'from-sky-600 to-cyan-700',
    radiology: 'from-amber-600 to-orange-700', finance: 'from-emerald-600 to-teal-700',
    ot: 'from-rose-600 to-pink-700',
  };
  const gradient = themeColors[department.key] || 'from-indigo-600 to-purple-700';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-sm text-center">
        {/* Department icon */}
        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 animate-bounce-subtle`}>
          <i className={`fas ${department.icon || 'fa-building'} text-3xl`} />
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {STEPS.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${
              i === currentStep ? 'opacity-100 translate-x-0' : i < currentStep ? 'opacity-40 -translate-x-2' : 'opacity-20 translate-x-2'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                i <= currentStep ? `bg-gradient-to-br ${gradient} text-white` : 'bg-slate-700 text-slate-500'
              } text-xs transition-all duration-300`}>
                {i < currentStep ? <i className="fas fa-check" /> : <i className={`fas ${step.icon}`} />}
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${i <= currentStep ? 'text-white' : 'text-slate-500'}`}>
                  {step.label} {step.detail.replace('{department}', department.title)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-100 ease-out`} style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-2 font-medium">LifeLink AI loading workspace...</p>
      </div>
    </div>
  );
};

export default WorkspaceTransition;
