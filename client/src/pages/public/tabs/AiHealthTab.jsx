/**
 * AiHealthTab — AI Health Intelligence Center
 *
 * Premium enterprise-grade health assessment hub with live AI status,
 * animated brain visualization, and intelligent medical analytics.
 */
import React, { useEffect, useState } from 'react';
import HealthRiskCalculator from '../../../components/HealthRiskCalculator';

const STATUS_ITEMS = [
  { label: 'AI Engine', value: 'Active', color: '#10B981', pulse: true },
  { label: 'Model', value: 'LifeLink v3.2', color: '#6366F1' },
  { label: 'Accuracy', value: '94.7%', color: '#2563EB' },
  { label: 'Dataset', value: '3.8M Records', color: '#8B5CF6' },
  { label: 'Inference', value: '62 ms', color: '#06B6D4' },
];

const AiHealthTab = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="relative animate-fade-in">
      {/* ─── Floating Neural Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/8 to-purple-400/8 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-gradient-to-tr from-emerald-400/6 to-cyan-400/6 blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
        <svg className="absolute top-1/4 left-0 w-full h-32 opacity-[0.02]" viewBox="0 0 1200 60" preserveAspectRatio="none">
          <path d="M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30" fill="none" stroke="#2563EB" strokeWidth="1" className="animate-ecg-line" />
        </svg>
      </div>

      {/* ─── Header Card ─── */}
      <div className={`relative rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          boxShadow: '0 0 60px rgba(37,99,235,0.08), 0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Animated grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg animate-float">
              <div className="absolute inset-0 rounded-2xl bg-white/10 animate-ping-slow" style={{ animationDuration: '3s' }} />
              <i className="fas fa-brain text-white text-xl relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Health Intelligence Center</h1>
              <p className="text-sm text-blue-300/70 mt-1">Real-time predictive healthcare powered by AI</p>
            </div>
          </div>

          {/* Live Status Pills */}
          <div className="flex flex-wrap gap-2">
            {STATUS_ITEMS.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                {s.pulse && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                )}
                <span className="text-[10px] font-medium text-white/60">{s.label}:</span>
                <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Health Risk Calculator ─── */}
      <HealthRiskCalculator />
    </div>
  );
};

export default AiHealthTab;
