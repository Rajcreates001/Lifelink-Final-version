import React, { useState } from 'react';
import EnterpriseModal from './EnterpriseModal';

const LOGOUT_PHASES = ['Finalizing session...', 'Synchronizing workspace...', 'Sync Complete', 'Signing Out...'];

const LogoutConfirmDialog = ({ open, onClose, onConfirm, userName, userRole, workspaceName, variant = 'government' }) => {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutPhase, setSignOutPhase] = useState(0);

  const handleConfirm = () => {
    setSigningOut(true);
    setSignOutPhase(0);
    const phaseTimers = [600, 600, 500, 600];
    let totalDelay = 0;
    [0, 1, 2, 3].forEach((phase, i) => {
      setTimeout(() => {
        setSignOutPhase(phase);
        if (phase === 3) {
          setTimeout(() => {
            onConfirm?.();
          }, 400);
        }
      }, totalDelay);
      totalDelay += phaseTimers[i];
    });
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <EnterpriseModal
      open={open}
      onClose={() => { if (!signingOut) onClose?.(); }}
      variant={variant}
      size="md"
      title="Sign Out of Your Workspace?"
      subtitle="All your work has been securely synchronized. You can safely continue later."
      showCloseBtn={!signingOut}
      closeOnEsc={!signingOut}
      closeOnClickOutside={!signingOut}
      headerFixed={true}
      footerFixed={true}
      hideFooter={false}
      confirmText="Sign Out"
      cancelText="Cancel"
      confirmDisabled={signingOut}
      loading={signingOut}
      onConfirm={handleConfirm}
      statusBadge={workspaceName || undefined}
      icon={
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      }
    >
      {/* User Card */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
          {(userName || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{userName || 'User'}</p>
          <p className="text-[10px] text-slate-500 truncate">{userRole || 'Active session'}</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse shrink-0" />
      </div>

      {/* Sync Checklist */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Workspace Synced</p>
          <span className="text-[9px] font-medium text-emerald-600">All Synced</span>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
          {['Dashboard', 'Reports', 'Notifications', 'Assignments', 'AI Conversations', 'Preferences'].map((item) => (
            <span key={item} className="flex items-center gap-1 text-[10px] text-slate-600">
              <svg className="w-2.5 h-2.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          Last Sync: <span className="font-semibold text-slate-500">{timeStr}</span>
          <span className="mx-1 text-slate-300">|</span>
          <span className="text-emerald-600 font-medium">Workspace Synced</span>
        </div>
      </div>

      {/* Sign out animation override - show phases inside loading */}
      {signingOut && (
        <div className="text-center text-xs text-slate-500 py-1">
          {LOGOUT_PHASES[signOutPhase]}
        </div>
      )}
    </EnterpriseModal>
  );
};

export default LogoutConfirmDialog;
