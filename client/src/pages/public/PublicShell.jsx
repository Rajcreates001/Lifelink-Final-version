import React from 'react';

export const toneMap = {
  rose: 'ring-1 ring-rose-100',
  sky: 'ring-1 ring-sky-100',
  emerald: 'ring-1 ring-emerald-100',
  amber: 'ring-1 ring-amber-100',
  slate: 'ring-1 ring-slate-100'
};

export const ActionButton = ({ label, subtitle, onClick, tone }) => (
  <button
    onClick={onClick}
    className={`w-full min-h-[56px] text-left rounded-2xl p-5 shadow-sm border border-slate-200 bg-white active:scale-[0.98] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg group ${toneMap[tone]}`}
  >
    <p className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors duration-200">{label}</p>
    <p className="text-xs text-slate-500 mt-1 group-hover:text-slate-600 transition-colors duration-200">{subtitle}</p>
  </button>
);

const PublicShell = ({ title, onBack, rightSlot, children }) => (
  <div className="min-h-screen bg-slate-50 animate-fade-in">
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-9 w-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 hover:-translate-x-0.5 active:scale-90 transition-all duration-200"
              aria-label="Go back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow">
              <i className="fas fa-heartbeat"></i>
            </span>
            <div>
              <p className="text-[10px] uppercase text-slate-400">LifeLink</p>
              <p className="text-sm font-semibold text-slate-900 truncate font-display">{title}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
        </div>
      </div>
    </header>
    <main className="px-4 py-5 max-w-xl mx-auto">{children}</main>
  </div>
);

export default PublicShell;
