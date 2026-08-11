import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TOAST_MESSAGES = [
  {
    title: 'Signed out successfully',
    body: 'Your workspace has been securely saved. See you again soon.',
  },
  {
    title: 'You have signed out successfully',
    body: 'Everything is safely stored and ready when you return.',
  },
  {
    title: 'Session ended',
    body: 'All your work has been synchronized. You can continue seamlessly next time.',
  },
];

const LogoutToast = ({ open, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [message] = useState(() => TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)]);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    // Small delay for mount animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 400);
    }, 5000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed top-5 right-5 z-[400] transition-all duration-400 ease-out"
      style={{
        transform: visible ? 'translateX(0) translateY(0)' : 'translateX(120%) translateY(-10px)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden max-w-sm"
        style={{
          boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(16,185,129,0.1)',
        }}
      >
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />

        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{message.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{message.body}</p>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Auto-saved
              <span className="text-slate-300 mx-0.5">·</span>
              <i className="fas fa-cloud-upload-alt text-[9px]" />
              Synced
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(() => onClose?.(), 400);
            }}
            className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all shrink-0"
          >
            <i className="fas fa-xmark text-xs" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutToast;
