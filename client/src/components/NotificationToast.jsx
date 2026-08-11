import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

let toastIdCounter = 0;
let addToastExternal = null;

export const showToast = (message, type = 'success', duration = 4000, undoAction = null) => {
  if (addToastExternal) {
    addToastExternal({ id: ++toastIdCounter, message, type, duration, undoAction });
  }
};

const ToastItem = ({ toast, onRemove }) => {
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRemoving(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const iconMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const colorMap = {
    success: 'border-emerald-200 bg-emerald-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-amber-200 bg-amber-50',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-sm transition-all duration-300 ${
        colorMap[toast.type] || colorMap.success
      } ${removing ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-slide-in-right'}`}
    >
      <span className="text-lg">{iconMap[toast.type] || '✅'}</span>
      <p className="text-xs font-medium text-gray-700 flex-1">{toast.message}</p>
      {toast.undoAction && (
        <button
          onClick={() => { toast.undoAction(); onRemove(toast.id); }}
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
        >
          Undo
        </button>
      )}
      <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
    </div>
  );
};

const NotificationToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addToastExternal = addToast;
    return () => { addToastExternal = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>,
    document.body
  );
};

export default NotificationToastContainer;
