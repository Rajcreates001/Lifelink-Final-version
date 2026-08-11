import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ── Dedicated global portal root for ALL modals ──
// Renders outside #root so the modal sits above the entire application
const MODAL_ROOT = typeof document !== 'undefined'
  ? (document.getElementById('modal-root') || document.body)
  : null;

// ═══════════════════════════════════════════════════════════════════════
// ENTERPRISE MODAL — Universal Modal Framework for LifeLink
// ═══════════════════════════════════════════════════════════════════════
//
// Every popup in the application must use this component.
//
// Props:
//   open          (bool)       — Whether the modal is visible
//   onClose       (fn)         — Called when modal should close
//   onConfirm     (fn)         — Called when primary action confirmed
//   title         (string)     — Modal header title
//   subtitle      (string)     — Optional subtitle below title
//   size          (string)     — 'sm' | 'md' | 'lg' | 'xl' | 'full'
//   variant       (string)     — 'default' | 'government' | 'hospital' | 'ambulance' | 'admin' | 'citizen'
//   closeOnEsc    (bool)       — Allow ESC to close (default: true)
//   closeOnClickOutside (bool) — Allow click-outside to close (default: true)
//   showCloseBtn  (bool)       — Show X close button in header (default: true)
//   headerFixed   (bool)       — Keep header sticky (default: true)
//   footerFixed   (bool)       — Keep footer sticky (default: true)
//   maxHeight     (string)     — Custom max-height (default: '85vh')
//   width         (string)     — Custom max-width override
//   className     (string)     — Additional classes on the modal body
//   overlayClassName (string)  — Additional classes on the overlay
//   header        (ReactNode)  — Custom header (overrides title/subtitle)
//   footer        (ReactNode)  — Custom footer (overrides default Cancel/Confirm)
//   hideFooter    (bool)       — Hide footer entirely
//   confirmText   (string)     — Confirm button text (default: 'Confirm')
//   cancelText    (string)     — Cancel button text (default: 'Cancel')
//   confirmDisabled (bool)     — Disable confirm button
//   loading       (bool)       — Show loading state on confirm button
//   icon          (ReactNode)  — Icon to show in header
//   statusBadge   (string)     — Optional status badge text
//   children      (ReactNode)  — Modal body content
//   role          (string)     — ARIA role (default: 'dialog')
//   onOpen        (fn)         — Called after modal opens
//
// ═══════════════════════════════════════════════════════════════════════

// All modal close transitions use this consistent duration
const CLOSE_DURATION = 250;

const SIZE_MAP = {
  sm: 'max-w-[520px]',
  md: 'max-w-[760px]',
  lg: 'max-w-[1024px]',
  xl: 'max-w-[1280px]',
  full: 'max-w-[95vw]',
};

const VARIANT_STYLES = {
  default: {
    header: 'bg-gradient-to-br from-slate-700 to-slate-900',
    confirm: 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 shadow-lg shadow-slate-500/20 hover:shadow-slate-500/30',
    accent: 'from-slate-600 to-slate-800',
    icon: 'from-slate-600 to-slate-800',
  },
  government: {
    header: 'bg-gradient-to-br from-red-600 to-rose-700',
    confirm: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/20 hover:shadow-red-500/30',
    accent: 'from-red-500 to-rose-600',
    icon: 'from-red-600 to-rose-700',
  },
  hospital: {
    header: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    confirm: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30',
    accent: 'from-blue-500 to-indigo-600',
    icon: 'from-blue-600 to-indigo-700',
  },
  ambulance: {
    header: 'bg-gradient-to-br from-amber-600 to-orange-700',
    confirm: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30',
    accent: 'from-amber-500 to-orange-600',
    icon: 'from-amber-600 to-orange-700',
  },
  admin: {
    header: 'bg-gradient-to-br from-purple-600 to-violet-700',
    confirm: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30',
    accent: 'from-purple-500 to-violet-600',
    icon: 'from-purple-600 to-violet-700',
  },
  citizen: {
    header: 'bg-gradient-to-br from-emerald-600 to-teal-700',
    confirm: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30',
    accent: 'from-emerald-500 to-teal-600',
    icon: 'from-emerald-600 to-teal-700',
  },
};

const EnterpriseModal = ({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  size = 'md',
  variant = 'default',
  closeOnEsc = true,
  closeOnClickOutside = true,
  showCloseBtn = true,
  headerFixed = true,
  footerFixed = true,
  maxHeight = '85vh',
  width,
  className = '',
  overlayClassName = '',
  header: customHeader,
  footer: customFooter,
  hideFooter = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDisabled = false,
  loading = false,
  icon,
  statusBadge,
  children,
  role = 'dialog',
  onOpen,
}) => {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const bodyScrollRef = useRef(null);

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  // ── Mount / Unmount animation using CLOSE_DURATION constant ──
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setClosing(false);
        });
      });
    } else {
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, CLOSE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ── onOpen callback ──
  useEffect(() => {
    if (open && onOpen) onOpen();
  }, [open]);

  // ── Lock body scroll + set padding for scrollbar ──
  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [mounted]);

  // ── Save and restore focus ──
  useEffect(() => {
    if (mounted) {
      previousFocusRef.current = document.activeElement;
      // Focus the modal
      setTimeout(() => {
        if (modalRef.current) {
          const firstInput = modalRef.current.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (firstInput) firstInput.focus();
          else modalRef.current.focus();
        }
      }, 50);
    }
    return () => {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try { previousFocusRef.current.focus(); } catch (e) { /* ignore */ }
      }
    };
  }, [mounted]);

  // ── Keyboard handling ──
  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (e) => {
      // ESC close
      if (e.key === 'Escape' && closeOnEsc && onClose && !loading) {
        handleClose(e);
      }
      // Tab trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, closeOnEsc, loading, onClose]);

  // ── Close handler (after 50ms the parent receives onClose, triggering the
  //     open-prop effect which uses CLOSE_DURATION to complete the animation) ──
  const handleClose = useCallback((e) => {
    if (loading) return;
    e?.stopPropagation?.();
    setClosing(true);
    // Let the open-prop effect handle the unmount lifecycle
    // The parent will receive onClose() and set open=false,
    // which triggers the open-prop useEffect to complete the animation & unmount
    setTimeout(() => onClose?.(), 50);
  }, [loading, onClose]);

  // ── Overlay click ──
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && closeOnClickOutside && onClose && !loading) {
      handleClose(e);
    }
  }, [closeOnClickOutside, loading, onClose, handleClose]);

  // ── Confirm handler ──
  const handleConfirm = useCallback((e) => {
    if (loading || confirmDisabled) return;
    onConfirm?.(e);
  }, [loading, confirmDisabled, onConfirm]);

  if (!mounted && !open) return null;

  const sizeClass = width || SIZE_MAP[size] || SIZE_MAP.md;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-8 transition-all duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      } ${overlayClassName}`}
      style={{
        background: 'rgba(15,20,35,0.55)',
        backdropFilter: 'blur(18px) saturate(120%)',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',
      }}
      onClick={handleOverlayClick}
      onMouseDown={(e) => { if (e.target === e.currentTarget) e.stopPropagation(); }}
    >
      {/* ── Modal Card ── */}
      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-label={title || 'Modal dialog'}
        tabIndex={-1}
        className={`relative w-full ${sizeClass} bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          closing ? 'scale-90 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'
        } ${className}`}
        style={{
          maxHeight: maxHeight,
          boxShadow: '0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1) inset, 0 0 0 1px rgba(0,0,0,0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Custom or Default Header ── */}
        {customHeader ? (
          <div className={`shrink-0 ${headerFixed ? 'sticky top-0 z-10' : ''}`}>
            {customHeader}
          </div>
        ) : title ? (
          <div className={`shrink-0 ${styles.header} px-5 py-4 ${headerFixed ? 'sticky top-0 z-10' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {icon && (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${styles.icon} flex items-center justify-center text-white shadow-md shrink-0`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white truncate">{title}</h2>
                    {statusBadge && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white/90 border border-white/20 shrink-0">
                        {statusBadge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-sm text-white/70 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              {showCloseBtn && onClose && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all shrink-0 disabled:opacity-40"
                  aria-label="Close modal"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Body ── */}
        <div
          ref={bodyScrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: customHeader || title ? `calc(${maxHeight} - 128px)` : maxHeight }}
        >
          <div className="p-4 md:p-5 space-y-4">
            {children}
          </div>
        </div>

        {/* ── Custom or Default Footer ── */}
        {!hideFooter && (
          customFooter ? (
            <div className={`shrink-0 border-t border-gray-100 bg-gray-50/80 ${footerFixed ? 'sticky bottom-0 z-10' : ''}`}>
              {customFooter}
            </div>
          ) : (onClose || onConfirm) ? (
            <div className={`shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-3 ${footerFixed ? 'sticky bottom-0 z-10' : ''}`}>
              <div className="flex items-center gap-3 justify-end">
                {onClose && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                      loading
                        ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]'
                    }`}
                  >
                    {cancelText}
                  </button>
                )}
                {onConfirm && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading || confirmDisabled}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles.confirm}`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      confirmText
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>,
    MODAL_ROOT
  );
};

// ═══════════════════════════════════════════════════════════════════════
// PRESET: ConfirmDialog — Simple confirmation with Cancel / Confirm
// ═══════════════════════════════════════════════════════════════════════
export const ConfirmDialog = ({ message, detail, ...props }) => (
  <EnterpriseModal size="sm" {...props}>
    <div className="text-center py-2">
      {props.icon && (
        <div className="mb-3">{props.icon}</div>
      )}
      {message && (
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      )}
      {detail && (
        <p className="text-xs text-gray-400 mt-2">{detail}</p>
      )}
    </div>
  </EnterpriseModal>
);

// ═══════════════════════════════════════════════════════════════════════
// PRESET: InfoModal — Information display with close only
// ═══════════════════════════════════════════════════════════════════════
export const InfoModal = ({ message, ...props }) => (
  <EnterpriseModal size="sm" hideFooter={!props.onConfirm && !props.onClose && !props.hideFooter} cancelText="Close" {...props}>
    <div className="py-2">
      {props.icon && (
        <div className="flex justify-center mb-4">{props.icon}</div>
      )}
      {message && (
        <p className="text-sm text-gray-600 leading-relaxed text-center">{message}</p>
      )}
      {props.children}
    </div>
  </EnterpriseModal>
);

// ═══════════════════════════════════════════════════════════════════════
// PRESET: WarningModal — Warning/danger with prominent styling
// ═══════════════════════════════════════════════════════════════════════
export const WarningModal = ({ message, ...props }) => (
  <EnterpriseModal
    size="sm"
    variant="government"
    confirmText="I Understand"
    icon={
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    }
    {...props}
  >
    <div className="py-2">
      {message && (
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      )}
      {props.children}
    </div>
  </EnterpriseModal>
);

// ═══════════════════════════════════════════════════════════════════════
// PRESET: FormModal — Modal with form body, suitable for data entry
// ═══════════════════════════════════════════════════════════════════════
export const FormModal = (props) => (
  <EnterpriseModal size="lg" {...props} />
);

// ═══════════════════════════════════════════════════════════════════════
// PRESET: SideSheet — Slide-in panel from right
// ═══════════════════════════════════════════════════════════════════════
export const SideSheet = ({ open, onClose, ...props }) => {
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (sheetRef.current) sheetRef.current.style.transform = 'translateX(0)';
        });
      });
      const prevOverflow = document.body.style.overflow;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = '';
      };
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateX(100%)';
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const handleEsc = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [visible, onClose]);

  if (!visible && !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] transition-opacity duration-300"
      style={{
        background: visible ? 'rgba(15,20,35,0.45)' : 'rgba(15,20,35,0)',
        backdropFilter: visible ? 'blur(12px)' : 'blur(0px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="absolute top-0 right-0 h-full bg-white shadow-2xl overflow-hidden transition-transform duration-300 ease-out"
        style={{
          width: 'min(560px, 100vw)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          maxHeight: '100vh',
        }}
      >
        {/* Sheet Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">{props.title || 'Panel'}</h2>
            {props.subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{props.subtitle}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all shrink-0 ml-3"
              aria-label="Close panel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sheet Body */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
          <div className="p-4">
            {props.children}
          </div>
        </div>
      </div>
    </div>,
    MODAL_ROOT
  );
};

// ═══════════════════════════════════════════════════════════════════════
// PRESET: FullscreenModal — Full-screen immersive modal
// ═══════════════════════════════════════════════════════════════════════
export const FullscreenModal = ({ open, onClose, title, children, className = '' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 250);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const handleEsc = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [visible, onClose]);

  if (!visible && !open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex flex-col transition-all duration-250 ${
        open ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{ background: 'rgba(15,20,35,0.6)', backdropFilter: 'blur(20px) saturate(120%)' }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">{title || 'LifeLink'}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>,
    MODAL_ROOT
  );
};

export default EnterpriseModal;
