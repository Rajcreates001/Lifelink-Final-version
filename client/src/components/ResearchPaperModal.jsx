/**
 * ResearchPaperModal — Simplified Enterprise Split-View Paper Details
 *
 * PDF preview area is minimal: only a clean viewer frame with no custom toolbar.
 * All PDF controls (zoom, page, download, print, fullscreen) are provided by the
 * embedded PDF.js viewer. No duplicate controls. No cache badge. No technical fluff.
 *
 * Key features kept:
 * - True 55/45 split layout with equal-height panels
 * - Fixed height, NEVER grows vertically
 * - Horizontal expansion 900px → 1500px when Preview is clicked
 * - Left panel: sticky header + independent scrollable content
 * - Right panel: clean PDF viewer frame (no custom toolbar)
 * - Glass divider with subtle shadow
 * - Animated neon document cards with left accent strip
 * - PDF loading skeleton with shimmer
 * - Crossfade document switching (300ms) with no white flash
 * - Premium opening/closing animations
 * - Full keyboard trap + ESC to close preview then modal
 * - Error handling: "Unable to preview" with Download + Retry
 * - Responsive: desktop 55/45, tablet 60/40, mobile stacked
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Constants ───────────────────────────────────────────
const DEFAULT_MODAL_WIDTH = 900;
const EXPANDED_MODAL_WIDTH = 1500;
const FIXED_MODAL_HEIGHT = 780;
const ANIMATION_DURATION = 350;
const CROSSFADE_DURATION = 300;
const MODAL_BORDER_RADIUS = 16;

// ─── PdfViewer Component ─────────────────────────────────
const PdfViewer = ({ file, label, color, isVisible, onLoaded }) => {
  const [viewState, setViewState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isVisible || !file) return;
    setViewState('loading');
    setProgress(0);

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 9 + 3;
        return next >= 92 ? 92 : next;
      });
    }, 160);

    const loadTime = 500 + Math.random() * 500;
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setProgress(100);
      setViewState('ready');
      onLoaded?.();
    }, loadTime);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timerRef.current);
    };
  }, [file, isVisible, onLoaded]);

  if (!isVisible) return null;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Loading Skeleton (fades out when ready) */}
      {viewState !== 'ready' && (
        <div
          className={`absolute inset-0 z-10 rounded-[10px] overflow-hidden transition-opacity duration-[400ms] ease-out ${
            viewState === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/98">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}
            >
              <i className="fas fa-file-pdf text-xl" style={{ color }} />
            </div>
            <div className="w-48 h-1.5 rounded-full overflow-hidden mb-3 bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-200 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                  boxShadow: `0 0 6px ${color}40`,
                }}
              />
            </div>
            <p className="text-[11px] font-medium" style={{ color: `${color}aa` }}>
              {progress < 90 ? 'Preparing document...' : 'Almost ready...'}
            </p>
            <div className="mt-6 w-[65%] space-y-2.5">
              {[85, 55, 70, 40, 80, 50].map((w, i) => (
                <div
                  key={i}
                  className="h-3 rounded pdf-shimmer"
                  style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF iframe */}
      <iframe
        src={file}
        className={`w-full flex-1 rounded-[10px] transition-all duration-[400ms] ease-out`}
        style={{
          minHeight: 0,
          height: '100%',
          opacity: viewState === 'ready' ? 1 : 0,
        }}
        title={label}
        onError={() => setViewState('error')}
      />

      {/* Error State */}
      {viewState === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/98 backdrop-blur-sm rounded-[10px]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-red-50" style={{ color }}>
            <i className="fas fa-file-excel text-xl" />
          </div>
          <p className="text-[14px] font-semibold text-gray-700 mb-1">Unable to preview this document</p>
          <p className="text-[12px] text-gray-400 mb-4">Try downloading the file or refresh the preview</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(file, '_blank')}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <i className="fas fa-download mr-1.5" /> Download
            </button>
            <button
              onClick={() => setViewState('loading')}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-200 active:scale-95"
            >
              <i className="fas fa-redo mr-1.5" /> Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Modal Component ─────────────────────────────────────
const ResearchPaperModal = ({ isOpen, onClose, item }) => {
  // ─── State ─────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prevPreviewDoc, setPrevPreviewDoc] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState('closed');

  const modalRef = useRef(null);
  const prevBtnRef = useRef(null);
  const closeTimerRef = useRef(null);
  const switchTimerRef = useRef(null);
  const animTimerRef = useRef(null);

  const isExpanded = previewDoc !== false;
  const hasDocuments = item?.documents?.length > 0;
  const currentDoc = hasDocuments && previewDoc !== false ? item.documents[previewDoc] : null;
  const accentColor = item?.color || '#2563EB';

  // ─── Cleanup timers ─────────────────────────────────---
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // ─── Handle document switching ─────────────────────────
  const handlePreviewToggle = useCallback((di) => {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);

    if (previewDoc === di) {
      setAnimState('closing-preview');
      closeTimerRef.current = setTimeout(() => {
        setPreviewDoc(false);
        setPrevPreviewDoc(false);
        setAnimState('open');
      }, ANIMATION_DURATION);
    } else if (previewDoc === false) {
      setPreviewDoc(di);
      setAnimState('expanding');
      closeTimerRef.current = setTimeout(() => {
        setAnimState('open');
      }, ANIMATION_DURATION);
    } else {
      setSwitching(true);
      setPrevPreviewDoc(previewDoc);
      requestAnimationFrame(() => {
        setPreviewDoc(di);
        switchTimerRef.current = setTimeout(() => {
          setSwitching(false);
          setPrevPreviewDoc(false);
        }, CROSSFADE_DURATION);
      });
    }
  }, [previewDoc]);

  // ─── Crossfade helpers ─────────────────────────────
  const showPrevDoc = switching && prevPreviewDoc !== false && item?.documents?.[prevPreviewDoc];
  const prevDoc = showPrevDoc ? item.documents[prevPreviewDoc] : null;

  // ─── Copy citation ─────────────────────────────────
  const handleCopyCitation = useCallback(() => {
    if (!item?.citation) return;
    navigator.clipboard.writeText(item.citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [item]);

  // ─── Modal open/close animation ─────────────────────
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      animTimerRef.current = setTimeout(() => setAnimState('open'), 20);
      setTimeout(() => prevBtnRef.current?.focus(), 150);
    } else {
      setAnimState('closing');
      closeTimerRef.current = setTimeout(() => {
        setMounted(false);
        setPreviewDoc(false);
        setPrevPreviewDoc(false);
        setCopied(false);
        setSwitching(false);
        setAnimState('closed');
      }, 300 + ANIMATION_DURATION);
    }
  }, [isOpen]);

  // ─── Keyboard handlers ─────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isExpanded && previewDoc !== false) {
          handlePreviewToggle(previewDoc);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExpanded, previewDoc, handlePreviewToggle, onClose]);

  // ─── Block body scroll ────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      const prevPr = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        document.body.style.overflow = prev;
        document.body.style.paddingRight = prevPr;
      };
    }
  }, [isOpen]);

  if (!mounted) return null;

  const isClosing = animState === 'closing';
  const modalWidth = isExpanded ? EXPANDED_MODAL_WIDTH : DEFAULT_MODAL_WIDTH;
  const leftWidth = isExpanded ? '55%' : '100%';
  const rightWidth = isExpanded ? '45%' : '0%';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      role="dialog"
      aria-modal="true"
      aria-label={item?.title || 'Research Paper Details'}
    >
      {/* ─── Backdrop ────────────────────────────────── */}
      <div
        className="absolute inset-0 transition-all duration-[400ms] ease-out"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          backgroundColor: `rgba(0,0,0,${isClosing ? 0 : 0.50})`,
          opacity: isClosing ? 0 : 1,
        }}
        onClick={() => {
          if (isExpanded && previewDoc !== false) handlePreviewToggle(previewDoc);
          else onClose();
        }}
        aria-hidden="true"
      />

      {/* ─── Modal Container ─────────────────────────── */}
      <div
        ref={modalRef}
        className="relative flex flex-col overflow-hidden"
        style={{
          width: modalWidth,
          maxWidth: 'calc(100vw - 48px)',
          height: FIXED_MODAL_HEIGHT,
          maxHeight: 'calc(100vh - 48px)',
          borderRadius: MODAL_BORDER_RADIUS,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isExpanded
            ? '0 30px 80px rgba(0,0,0,0.30), 0 10px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.15)'
            : '0 25px 60px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.15)',
          transition: `width ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out, transform 400ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow ${ANIMATION_DURATION}ms ease-out`,
          opacity: isClosing ? 0 : 1,
          transform: isClosing ? 'scale(0.96) translateY(12px)' : 'scale(1) translateY(0)',
          transformOrigin: 'center center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Modal close button (hidden when preview expanded) ── */}
        {!isExpanded && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close modal"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        )}

        {/* ─── Inner shadow overlay (top) ──────────── */}
        <div className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)' }} />

        {/* ─── Main Content ──────────────────────────── */}
        <div className="flex flex-1 min-h-0 relative">
          {/* ─── LEFT PANEL ─────────────────────────────────── */}
          <div
            className="research-split-left flex-shrink-0 flex flex-col min-h-0 transition-all duration-[350ms] ease-in-out"
            style={{ width: leftWidth, transitionDuration: `${ANIMATION_DURATION}ms` }}
          >
            <div className="shrink-0 px-7 pt-7 pb-0">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shrink-0 shadow-sm relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  <i className={`fas ${item?.icon || 'fa-book-open'} relative z-[1]`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                      {item?.title || 'Paper Details'}
                    </h2>
                    {item?.badge && (
                      <span
                        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${item.badgeColor}18, ${item.badgeColor}10)`,
                          color: item.badgeColor,
                          border: `1px solid ${item.badgeColor}25`,
                          boxShadow: `inset 0 1px 0 ${item.badgeColor}15`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.badgeColor, boxShadow: `0 0 4px ${item.badgeColor}60` }} />
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item?.desc && <p className="text-[13px] text-gray-500 leading-relaxed mt-1">{item.desc}</p>}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-7 pt-5 pb-4">
              <div className="flex flex-wrap gap-2 mb-7">
                {item?.authors && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50/70 border border-gray-100/80 shadow-sm">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">By</span>
                    <span className="text-[11px] font-semibold text-gray-700">{item.authors.join(', ')}</span>
                  </div>
                )}
                {item?.date && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50/70 border border-gray-100/80 shadow-sm">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Date</span>
                    <span className="text-[11px] font-semibold text-gray-700">{item.date}</span>
                  </div>
                )}
              </div>
              {item?.details && item.details.length > 0 && (
                <div className="mb-7">
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
                    <span className="w-4 h-[2px] rounded-full" style={{ backgroundColor: `${accentColor}40` }} />
                    Key Details
                  </h3>
                  <ul className="space-y-2.5">
                    {item.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 shadow-sm" style={{ backgroundColor: accentColor, boxShadow: `0 0 4px ${accentColor}40` }} />
                        <span className="text-[13px] text-gray-600 leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {item?.citation && (
                <div className="mb-7">
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
                    <span className="w-4 h-[2px] rounded-full" style={{ backgroundColor: `${accentColor}40` }} />
                    Citation
                  </h3>
                  <div
                    className="group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md"
                    style={{ borderColor: `${accentColor}20`, backgroundColor: `${accentColor}04` }}
                    onClick={handleCopyCitation} role="button" tabIndex={0}
                    aria-label="Copy citation to clipboard"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCopyCitation(); }}
                  >
                    <p className="text-[12px] text-gray-600 leading-relaxed pr-10">{item.citation}</p>
                    <div
                      className="absolute top-3.5 right-3.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: copied ? `${accentColor}15` : `${accentColor}08`,
                        color: copied ? accentColor : '#9CA3AF',
                        boxShadow: copied ? `0 2px 8px ${accentColor}25` : 'none',
                      }}
                    >
                      <i className={`fas ${copied ? 'fa-check-circle' : 'fa-copy'} text-xs transition-all duration-200`}
                        style={{ transform: copied ? 'scale(1.1)' : 'scale(1)' }} />
                    </div>
                    {copied && (
                      <div className="absolute -bottom-8 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-semibold animate-fade-in-up"
                        style={{ backgroundColor: `${accentColor}10`, color: accentColor, border: `1px solid ${accentColor}20` }}
                      >
                        <i className="fas fa-check-circle text-[9px]" /> Copied
                      </div>
                    )}
                  </div>
                </div>
              )}
              {hasDocuments && (
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
                    <span className="w-4 h-[2px] rounded-full" style={{ backgroundColor: `${accentColor}40` }} />
                    Documents
                    <span className="text-gray-300 font-normal tracking-normal">({item.documents.length})</span>
                  </h3>
                  <div className="space-y-2.5">
                    {item.documents.map((doc, di) => {
                      const isActive = previewDoc === di;
                      const docAccent = doc.color || accentColor;
                      return (
                        <div key={di}
                          className={`group relative rounded-xl border transition-all duration-200 ${isActive ? '' : 'hover:shadow-md hover:-translate-y-0.5'}`}
                          style={{
                            borderColor: isActive ? `${docAccent}50` : '#E5E7EB',
                            backgroundColor: isActive ? `${docAccent}06` : '#FFFFFF',
                            boxShadow: isActive ? `0 0 0 1px ${docAccent}15, 0 4px 16px ${docAccent}10` : '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          {isActive && (
                            <div className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{
                                border: `1.5px solid ${docAccent}40`,
                                boxShadow: `inset 0 0 12px ${docAccent}15, 0 0 12px ${docAccent}10`,
                                animation: 'docNeonPulse 2.5s ease-in-out infinite',
                              }}
                            />
                          )}
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                              style={{ backgroundColor: docAccent, boxShadow: `0 0 6px ${docAccent}50` }} />
                          )}
                          {isActive && (
                            <div className="absolute -top-[10px] right-3 z-10">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-semibold shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${docAccent}, ${docAccent}dd)`,
                                  color: '#FFFFFF',
                                  boxShadow: `0 2px 8px ${docAccent}40`,
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse-slow" />
                                Previewing
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3.5 p-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${isActive ? 'scale-110' : ''}`}
                              style={{
                                background: isActive ? `linear-gradient(135deg, ${docAccent}, ${docAccent}cc)` : `${docAccent}10`,
                                color: isActive ? '#FFFFFF' : docAccent,
                                boxShadow: isActive ? `0 4px 12px ${docAccent}30` : 'none',
                              }}
                            >
                              <i className="fas fa-file-pdf text-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-800 truncate">{doc.label}</p>
                              <p className="text-[11px] text-gray-400 font-medium mt-0.5">PDF &middot; {doc.size}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button ref={di === 0 ? prevBtnRef : null}
                                onClick={() => handlePreviewToggle(di)}
                                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${isActive ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 hover:shadow-sm'}`}
                                style={{
                                  backgroundColor: isActive ? accentColor : 'transparent',
                                  boxShadow: isActive ? `0 2px 10px ${accentColor}40` : undefined,
                                }}
                                aria-label={isActive ? 'Close preview' : 'Preview document'}
                                aria-pressed={isActive}
                              >
                                <i className={`fas ${isActive ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                              </button>
                              <a href={doc.file} download
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                aria-label={`Download ${doc.label}`}>
                                <i className="fas fa-download text-xs" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="h-3" />
            </div>
          </div>

          {/* ─── GLASS DIVIDER ──────────────────────────── */}
          <div
            className={`research-divider relative flex-shrink-0 transition-all duration-[350ms] ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ width: isExpanded ? '1px' : '0px', transitionDuration: `${ANIMATION_DURATION}ms` }}
          >
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gray-200/80 to-transparent" />
            <div className="absolute inset-y-[15%] left-[1px] w-[1px] bg-gradient-to-b from-transparent via-white/60 to-transparent" />
            <div className="absolute inset-y-[10%] left-[-4px] w-[9px] bg-gradient-to-r from-black/[0.03] via-black/[0.02] to-transparent pointer-events-none" />
          </div>

          {/* ─── RIGHT PANEL: PDF Preview (no custom toolbar — PDF.js handles all controls) ── */}
          <div
            className={`research-split-right flex-shrink-0 flex flex-col min-h-0 transition-all duration-[350ms] ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{
              width: rightWidth,
              transitionDuration: `${ANIMATION_DURATION}ms`,
              transform: isExpanded ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.98)',
            }}
          >
            {/* ── PDF Content Area (full height — no toolbar, more space for the viewer) ── */}
            <div className="flex-1 min-h-0 p-4 relative">
              {/* Viewer frame — clean, premium container */}
              <div className="absolute inset-4 pdf-viewer-frame">
                {/* Crossfade: previous document fading out */}
                {switching && prevDoc && (
                  <div key={`prev-${prevPreviewDoc}`} className="absolute inset-0 z-10"
                    style={{ animation: 'prevPdfExit 300ms ease-in-out forwards' }}
                  >
                    <PdfViewer
                      file={prevDoc.file}
                      label={prevDoc.label}
                      color={prevDoc.color || accentColor}
                      isVisible={true}
                    />
                  </div>
                )}

                {/* Current PDF */}
                <div
                  key={`curr-${previewDoc}`}
                  className={`absolute inset-0 ${switching ? 'animate-next-pdf-enter' : ''}`}
                  style={{ opacity: switching ? 0 : 1, transform: switching ? 'translateX(24px)' : 'translateX(0)' }}
                >
                  <PdfViewer
                    file={currentDoc?.file}
                    label={currentDoc?.label}
                    color={currentDoc?.color || accentColor}
                    isVisible={!switching || prevPreviewDoc !== previewDoc}
                  />
                </div>
              </div>

              {/* Empty state */}
              {!currentDoc && (
                <div className="absolute inset-4 flex flex-col items-center justify-center text-gray-300 rounded-[10px]" style={{ backgroundColor: `${accentColor}04` }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${accentColor}08`, color: `${accentColor}30` }}>
                    <i className="fas fa-file-pdf text-2xl" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Select a document to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Inner shadow overlay (bottom) ─────────── */}
        <div className="absolute bottom-0 left-0 right-0 h-6 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)' }} />
      </div>

      {/* ─── Global Styles ──────────────────────────────── */}
      <style>{`
        /* ── Custom Scrollbar (thin, soft gray) ── */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 8px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #D1D5DB transparent; overscroll-behavior: contain; }

        /* ── PDF Viewer Frame (clean premium container, no toolbar) ── */
        .pdf-viewer-frame {
          border-radius: 12px;
          overflow: hidden;
          background: #FAFBFC;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.9),
            0 2px 8px rgba(0,0,0,0.04),
            0 0 0 1px rgba(0,0,0,0.02);
        }

        /* ── Crossfade Animations ── */
        @keyframes prevPdfExit {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-24px); }
        }
        @keyframes nextPdfEnter {
          0% { opacity: 0; transform: translateX(24px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-next-pdf-enter {
          animation: nextPdfEnter ${CROSSFADE_DURATION}ms ease-in-out forwards;
        }

        /* ── Document Card Neon Pulse ── */
        @keyframes docNeonPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }

        /* ── PDF Shimmer ── */
        .pdf-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: pdfLineShimmer 1.8s ease-in-out infinite;
        }
        @keyframes pdfLineShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* ── Responsive overrides ── */
        @media (max-width: 1024px) {
          .research-split-left { width: 60% !important; }
          .research-split-right { width: 40% !important; }
        }
        @media (max-width: 768px) {
          .research-split-left,
          .research-split-right { width: 100% !important; }
          .research-split-right {
            position: fixed !important;
            inset: 0 !important;
            z-index: 50 !important;
            background: white !important;
            transform: translateX(100%) !important;
            transition: transform 300ms ease !important;
          }
          .research-split-right.open { transform: translateX(0) !important; }
          .research-divider { display: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ResearchPaperModal;
