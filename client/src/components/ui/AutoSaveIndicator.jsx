import React, { useEffect, useState } from 'react';

// ─── Auto-save messages (rotated subtly) ─────────────────────
const MESSAGES = [
  { icon: 'fa-check-circle', label: 'Auto Saved' },
  { icon: 'fa-check-circle', label: 'All Changes Saved' },
  { icon: 'fa-cloud-upload-alt', label: 'Workspace Synced' },
  { icon: 'fa-shield-halved', label: 'Securely Saved' },
];

const AutoSaveIndicator = ({ className = '' }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cycle message every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const msg = MESSAGES[msgIndex];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-0.5'
      } ${className}`}
    >
      <span className="relative flex w-2 h-2">
        <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping-slow opacity-40" />
        <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
      </span>
      <i className={`fas ${msg.icon} text-emerald-500 text-[9px]`} />
      <span className="text-emerald-600">{msg.label}</span>
    </span>
  );
};

export default AutoSaveIndicator;
