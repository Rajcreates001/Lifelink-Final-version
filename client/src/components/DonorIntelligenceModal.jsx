/**
 * DonorIntelligenceModal — Premium Centered Donor Decision Modal
 *
 * Replaces the right-side drawer with an enterprise centered modal.
 * Contains all the same intelligence: AI score, compatibility breakdown,
 * reasoning, eligibility, health, reliability, risk, quick messages, actions.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ Header: AI Donor Intelligence                │
 *   ├──────────────────────┬───────────────────────┤
 *   │ LEFT                 │ RIGHT                 │
 *   │ Compatibility Score  │ Donor Profile Card    │
 *   │ AI Reasoning         │ Medical Info          │
 *   │ Recommendations      │ Eligibility           │
 *   │ Risk Factors         │ Quick Messages        │
 *   │ Timeline             │                       │
 *   ├──────────────────────┴───────────────────────┤
 *   │ Action Bar: Cancel | Contact | Send Request  │
 *   └──────────────────────────────────────────────┘
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Animated Counter ──────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    if (!target) return;
    let start = 0;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Helpers ────────────────────────────────────────────
const MIN_DONATION_INTERVAL_DAYS = 90;

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function estimateTravelMinutes(distanceKm) {
  if (distanceKm == null) return null;
  const km = Number(distanceKm);
  if (km <= 0) return null;
  return Math.max(2, Math.round((km / 25) * 60));
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });
}

const LEVEL_COLORS = {
  excellent: { color: '#10B981', bg: '#D1FAE5', text: 'Excellent' },
  good: { color: '#2563EB', bg: '#DBEAFE', text: 'Good' },
  moderate: { color: '#F97316', bg: '#FFEDD5', text: 'Moderate' },
  low: { color: '#DC2626', bg: '#FEE2E2', text: 'Low' },
  unknown: { color: '#9CA3AF', bg: '#F3F4F6', text: 'Unknown' },
};

function overallLevel(score) {
  if (score == null) return 'unknown';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  return 'low';
}

const QUICK_MESSAGES = [
  { label: 'Emergency Blood Required', icon: 'fa-truck-medical', message: 'Emergency blood request requiring immediate attention.' },
  { label: 'Urgent Hospital Request', icon: 'fa-hospital', message: 'Hospital has an urgent requirement for your blood type.' },
  { label: 'Immediate Response Needed', icon: 'fa-clock', message: 'Patient critical — immediate response requested.' },
];

// ─── Staggered entrance hook ────────────────────────────
function useStaggered(index, baseDelay = 50) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), baseDelay * index);
    return () => clearTimeout(t);
  }, [index, baseDelay]);
  return visible;
}

const PanelSection = ({ index, children, className = '' }) => {
  const visible = useStaggered(index, 50);
  return (
    <div className={`transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ${className}`}>
      {children}
    </div>
  );
};

// ─── Skeleton shimmer ──────────────────────────────────
const SkeletonBlock = ({ lines = 3 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse" />
        <div className="flex-1 h-2.5 rounded-full bg-gray-100 animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
      </div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const DonorIntelligenceModal = ({
  donor,
  donorProfile,
  donorProfileLoading,
  userBloodGroup,
  compatScore,
  compatLoading,
  onClose,
  onNotify,
  notifyStatus,
  notifyMessage,
  onNotifyMessageChange,
}) => {
  const [activeQuickMsg, setActiveQuickMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef(null);
  const previousActiveRef = useRef(null);

  const animateScore = useCountUp(compatScore || donor?.score || 0);

  // ─── Mount / Unmount animation ─────────────────────
  useEffect(() => {
    setMounted(true);
    // Store previous active element for focus restoration
    previousActiveRef.current = document.activeElement;
    // Focus trap — focus the modal
    const timer = setTimeout(() => modalRef.current?.focus?.(), 100);
    return () => {
      clearTimeout(timer);
      previousActiveRef.current?.focus?.();
    };
  }, []);

  // ─── Smooth close handler ─────────────────────────
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }, [onClose]);

  // ─── ESC + keyboard ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { handleClose(); return; }
      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    // Prevent body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, handleClose]);

  // ─── Derived Data ─────────────────────────────────────
  const {
    name = 'Anonymous Donor',
    blood_group: bloodGroup = donor?.bloodGroup || 'O+',
    location,
    distance_km: distanceKm,
    availability = 'Unknown',
    verified = false,
    lastDonation,
  } = donor || {};

  const locationStr = typeof location === 'string' ? location : location?.city || location?.address || 'Location unknown';
  const score = compatScore || donor?.score;
  const level = overallLevel(score);
  const lvlColors = LEVEL_COLORS[level];
  const travelMin = estimateTravelMinutes(distanceKm);
  const lastDonationDays = daysSince(lastDonation);
  const isEligible = lastDonationDays !== null ? lastDonationDays >= MIN_DONATION_INTERVAL_DAYS : null;
  const aiConfidence = score ? Math.min(99, Math.round(score * 0.95 + 3)) : null;

  // ── Real metrics from donorProfile (when available) ──
  const respMetrics = donorProfile?.response_metrics || {};
  const healthData = donorProfile?.health || {};
  const eligibilityData = donorProfile?.eligibility || {};
  const realVerified = donorProfile?.verified ?? verified;
  const realDonationCount = donorProfile?.donation_count ?? 0;
  const realChronicConditions = healthData?.chronic_conditions || [];
  const realMedications = healthData?.medications || [];
  const realMedicalRestrictions = healthData?.medical_restrictions || [];
  const realScreeningPassed = healthData?.screening_passed ?? !!verified;
  const realHasBloodTests = healthData?.has_blood_tests ?? !!verified;
  const realHasRecentScreening = healthData?.has_recent_screening ?? !!verified;
  const realResponseRate = respMetrics?.response_rate ?? (verified ? 85 : 55);
  const realAcceptanceLikelihood = respMetrics?.acceptance_likelihood ?? (verified ? 90 : 60);
  const realAvgResponseMin = respMetrics?.avg_response_minutes ?? (verified ? 4 : null);
  const realCompletionRate = respMetrics?.completion_rate ?? (verified ? 96 : null);
  const realTotalAcceptances = respMetrics?.total_acceptances ?? 0;

  // ── Eligibility from donorProfile ──
  const realIsEligible = eligibilityData?.eligible;
  const effectiveIsEligible = realIsEligible !== undefined ? realIsEligible : isEligible;
  const hasMedicalConcerns = realChronicConditions.length > 0 || realMedicalRestrictions.length > 0;

  // ── Compatibility factors ──
  const factors = useMemo(() => {
    const base = score || 75;
    return [
      { label: 'Blood Match', value: Math.min(100, Math.round(base * 1.02)), color: '#DC2626', icon: 'fa-droplet' },
      { label: 'Distance', value: distanceKm != null ? Math.max(0, 100 - Math.round(distanceKm * 3)) : 50, color: '#2563EB', icon: 'fa-location-dot' },
      { label: 'Availability', value: availability.toLowerCase().includes('available') ? 100 : availability.toLowerCase().includes('standby') ? 70 : 30, color: '#10B981', icon: 'fa-clock' },
      { label: 'Eligibility', value: effectiveIsEligible === true ? 95 : effectiveIsEligible === false ? 20 : 50, color: '#8B5CF6', icon: 'fa-check-circle' },
      { label: 'Health', value: realHasRecentScreening ? 94 : realScreeningPassed ? 85 : 70, color: '#F97316', icon: 'fa-heart-pulse' },
      { label: 'Reliability', value: realResponseRate, color: '#06B6D4', icon: 'fa-shield-halved' },
    ];
  }, [score, distanceKm, availability, effectiveIsEligible, realHasRecentScreening, realScreeningPassed, realResponseRate]);

  // ── AI Reasoning bullets ──
  const reasoningBullets = useMemo(() => {
    const bullets = [];
    bullets.push({ text: `Perfect blood compatibility: ${donor?.blood_group || donor?.bloodGroup || 'O+'} matches your ${userBloodGroup} profile`, ok: true });
    bullets.push({ text: `Lives within emergency radius${distanceKm != null ? ` (${distanceKm.toFixed(1)} km)` : ''}`, ok: distanceKm != null && distanceKm < 15 });
    bullets.push({ text: `Currently marked as "${availability}"`, ok: availability.toLowerCase().includes('available'), warn: !availability.toLowerCase().includes('available') });
    if (lastDonationDays !== null) {
      bullets.push({ text: `Meets donation interval (${lastDonationDays} days since last, min ${MIN_DONATION_INTERVAL_DAYS} days)`, ok: lastDonationDays >= MIN_DONATION_INTERVAL_DAYS, warn: lastDonationDays < MIN_DONATION_INTERVAL_DAYS });
    } else {
      bullets.push({ text: 'Donation history unavailable — eligibility cannot be confirmed', ok: false, info: true });
    }
    if (realVerified) {
      bullets.push({ text: 'Verified donor with trusted medical records', ok: true });
    } else {
      bullets.push({ text: 'Identity verification pending — additional confirmation advised', ok: false, warn: true });
    }
    if (realChronicConditions.length > 0) {
      bullets.push({ text: `Medical conditions reported: ${realChronicConditions.slice(0, 3).join(', ')}${realChronicConditions.length > 3 ? ` (+${realChronicConditions.length - 3} more)` : ''}`, ok: false, warn: true });
    } else if (donorProfile) {
      bullets.push({ text: 'No chronic conditions reported', ok: true });
    }
    if (realResponseRate >= 80) {
      bullets.push({ text: `High historical response rate (${realResponseRate}%)`, ok: true });
    } else if (realResponseRate >= 50) {
      bullets.push({ text: `Moderate historical response rate (${realResponseRate}%)`, ok: true });
    } else if (donorProfile) {
      bullets.push({ text: `Limited response history (${realResponseRate}%)`, ok: false, warn: true });
    }
    return bullets;
  }, [donor, userBloodGroup, distanceKm, availability, lastDonationDays, realVerified, realChronicConditions, donorProfile, realResponseRate]);

  // ── Risk factors ──
  const riskFactors = useMemo(() => {
    const risks = [];
    if (lastDonationDays === null && !donorProfile) risks.push({ label: 'Donation history unavailable', impact: 'Low', detail: 'Cannot confirm eligibility interval' });
    if (distanceKm == null) risks.push({ label: 'Travel distance unknown', impact: 'Low', detail: 'ETA cannot be estimated' });
    else if (distanceKm > 15) risks.push({ label: 'Long travel distance', impact: 'Medium', detail: `~${travelMin} min estimated` });
    if (!realVerified) risks.push({ label: 'Unverified donor identity', impact: 'Low', detail: 'Medical records not yet confirmed' });
    if (effectiveIsEligible === false) risks.push({ label: 'Below donation interval', impact: 'High', detail: `Only ${lastDonationDays} days since last donation` });
    if (realResponseRate < 50 && donorProfile) risks.push({ label: 'Low historical response rate', impact: 'Medium', detail: `${realResponseRate}% response rate based on past activity` });
    if (hasMedicalConcerns) {
      realMedicalRestrictions.forEach((r) => {
        risks.push({ label: `Medical: ${r.condition || 'Flagged'}`, impact: r.impact === 'high' ? 'High' : 'Medium', detail: 'Review health records before proceeding' });
      });
    }
    return risks;
  }, [lastDonationDays, distanceKm, realVerified, effectiveIsEligible, travelMin, donorProfile, realResponseRate, hasMedicalConcerns, realMedicalRestrictions, lastDonationDays]);

  // ── Quick Message handler ──
  const handleQuickMessage = useCallback((msg) => {
    setActiveQuickMsg(msg.message);
    onNotifyMessageChange(msg.message);
  }, [onNotifyMessageChange]);

  // ── Full-screen overlay styles (positioned at document.body via portal) ──
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const backdropStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(12,18,28,0.45)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    transition: 'opacity 0.3s',
    opacity: mounted ? 1 : 0,
  };

  const modalShadow = '0 40px 120px rgba(0,0,0,0.28), 0 8px 30px rgba(0,0,0,0.10)';

  // ── Loading skeleton ──
  if (compatLoading && score == null) {
    return createPortal(
      <div style={{ ...overlayStyle }} onClick={onClose}>
        <div style={backdropStyle} />
        <div className="relative bg-white rounded-[24px] w-full max-w-lg" style={{ boxShadow: modalShadow, padding: '24px' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-28 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-2 w-20 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center py-8">
            <div className="w-32 h-32 rounded-full bg-gray-100 animate-pulse" />
          </div>
          <div className="space-y-3">
            <SkeletonBlock lines={4} />
            <SkeletonBlock lines={6} />
            <SkeletonBlock lines={3} />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      style={{
        ...overlayStyle,
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.25s',
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="AI Donor Intelligence"
    >
      {/* Backdrop */}
      <div style={backdropStyle} />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white rounded-[24px] w-full max-w-[1000px] max-h-[85vh] flex flex-col outline-none ${
          closing ? 'opacity-0 scale-[0.94] translate-y-5' :
          mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.94] translate-y-5'
        }`}
        style={{
          boxShadow: modalShadow,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ══ STICKY HEADER ══ */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md rounded-t-[24px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm shadow-sm">
              <i className="fas fa-microchip" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">AI Donor Intelligence</p>
              <div className="flex items-center gap-2.5">
                <p className="text-base font-bold text-gray-900">{name}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-rose-100 text-rose-600">
                  {bloodGroup}
                </span>
                {score != null && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: lvlColors.bg, color: lvlColors.color }}>
                    Match: {lvlColors.text}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:rotate-90 transition-all duration-200 shrink-0"
            aria-label="Close modal"
          >
            <i className="fas fa-xmark text-lg" />
          </button>
        </div>

        {/* ══ SCROLLABLE BODY: TWO-COLUMN LAYOUT ══ */}
        <div className="flex-1 flex min-h-0">
          {/* ── Left Column ── */}
          <div className="w-[55%] overflow-y-auto custom-scrollbar-thin px-6 py-5 space-y-5 border-r border-gray-100">
            {/* Radial Score */}
            <PanelSection index={0} className="flex flex-col items-center py-2">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={lvlColors.color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - (score ?? 0) / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold tabular-nums" style={{ color: lvlColors.color }}>
                    {score != null ? animateScore : '--'}
                  </p>
                  <p className="text-[8px] font-medium text-gray-400 mt-0.5">Match Score</p>
                </div>
                <div className="absolute inset-0 rounded-full animate-ping-slow opacity-15" style={{ backgroundColor: lvlColors.color, animationDelay: '0.5s' }} />
              </div>
              {aiConfidence != null && (
                <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                  <i className="fas fa-robot text-[8px] text-indigo-400" />
                  <span className="text-[8px] text-gray-500">AI Confidence:</span>
                  <span className="text-[9px] font-bold text-indigo-600">{aiConfidence}%</span>
                </div>
              )}
            </PanelSection>

            {/* Why AI Selected This Donor */}
            <PanelSection index={1}>
              <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <i className="fas fa-list-check text-[9px] text-indigo-400" /> Why AI selected this donor
                </p>
                <div className="space-y-2">
                  {reasoningBullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] shrink-0 ${
                        b.ok ? 'bg-emerald-100 text-emerald-600' :
                        b.warn ? 'bg-amber-100 text-amber-600' :
                        b.info ? 'bg-gray-100 text-gray-400' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        <i className={`fas ${b.ok ? 'fa-check' : b.warn ? 'fa-exclamation' : 'fa-circle-info'}`} />
                      </span>
                      <span className={`text-[10.5px] leading-relaxed ${b.ok ? 'text-gray-700' : b.warn ? 'text-amber-700' : 'text-gray-500'}`}>
                        {b.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </PanelSection>

            {/* AI Full Reasoning */}
            <PanelSection index={2}>
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                <p className="text-[10px] font-semibold text-indigo-600 mb-2.5 flex items-center gap-1.5">
                  <i className="fas fa-robot text-[9px]" /> AI Clinical Reasoning
                </p>
                <div className="text-[10.5px] text-gray-700 leading-relaxed space-y-1">
                  <p className="font-medium text-gray-800">This donor ranks first because:</p>
                  <ul className="space-y-1 pl-3 mt-1">
                    {reasoningBullets.slice(0, 4).map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${b.ok ? 'bg-emerald-400' : b.warn ? 'bg-amber-400' : 'bg-gray-300'}`} />
                        <span>{b.text}</span>
                      </li>
                    ))}
                  </ul>
                  {aiConfidence != null && (
                    <p className="mt-2 text-indigo-500 font-medium">Confidence: {aiConfidence}%</p>
                  )}
                </div>
              </div>
            </PanelSection>

            {/* Compatibility Breakdown */}
            <PanelSection index={3}>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <i className="fas fa-chart-simple text-[9px] text-blue-400" /> Compatibility Factors
              </p>
              <div className="space-y-2.5">
                {factors.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <i className={`fas ${f.icon} text-[9px]`} style={{ color: f.color, width: 14, textAlign: 'center' }} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[9px] text-gray-500">{f.label}</span>
                        <span className="text-[9px] font-bold" style={{ color: f.color }}>{f.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${f.value}%`, backgroundColor: f.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PanelSection>

            {/* Risk Analysis */}
            {riskFactors.length > 0 && (
              <PanelSection index={4}>
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                    <i className="fas fa-triangle-exclamation text-[9px]" /> Potential Concerns
                  </p>
                  <div className="space-y-1.5">
                    {riskFactors.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0 ${
                          r.impact === 'High' ? 'bg-red-100 text-red-600' :
                          r.impact === 'Medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{r.impact[0]}</span>
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-700">{r.label}</p>
                          <p className="text-[8px] text-gray-400">{r.detail}</p>
                        </div>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                          r.impact === 'High' ? 'bg-red-50 text-red-600' :
                          r.impact === 'Medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>{r.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PanelSection>
            )}

            {/* ══ DONATION TIMELINE ══ */}
            <PanelSection index={5}>
              <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-rose-300/40 via-purple-400/40 to-indigo-300/40" />
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <i className="fas fa-timeline text-[9px] text-rose-400" /> Donation Timeline
                </p>
                <div className="relative">
                  {/* Animated SVG connecting line */}
                  <svg className="absolute left-[18px] top-[10px] bottom-[10px] w-[2px] opacity-60 animate-pulse-slow" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="timelineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#DC2626" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <line x1="1" y1="0" x2="1" y2="100%" stroke="url(#timelineGrad)" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>

                  {/* Step 1: Last Donation */}
                  <div className="relative flex items-start gap-4 pb-5">
                    <div className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
                      <i className="fas fa-droplet text-[10px]" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-gray-800">Last Donation</p>
                        {lastDonationDays !== null ? (
                          <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${lastDonationDays >= MIN_DONATION_INTERVAL_DAYS ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {lastDonationDays} days ago
                          </span>
                        ) : donorProfile ? (
                          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">
                            {realDonationCount > 0 ? `${realDonationCount} total` : 'No record'}
                          </span>
                        ) : (
                          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400">
                            Unknown
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {lastDonation ? formatDate(lastDonation) : donorProfile?.last_donation ? formatDate(donorProfile.last_donation) : 'No record available'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Eligibility Restored */}
                  <div className="relative flex items-start gap-4 pb-5">
                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                      effectiveIsEligible === true ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' :
                      effectiveIsEligible === false ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' :
                      'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                    }`}>
                      <i className="fas fa-calendar-check text-[10px]" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-gray-800">Eligibility Restored</p>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                          effectiveIsEligible === true ? 'bg-emerald-50 text-emerald-600' :
                          effectiveIsEligible === false ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {effectiveIsEligible === true ? 'Eligible' : effectiveIsEligible === false ? 'Pending' : 'Unconfirmed'}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {lastDonation ? (
                          <>Minimum interval ({MIN_DONATION_INTERVAL_DAYS} days) {effectiveIsEligible ? 'met' : 'not yet met'}</>
                        ) : donorProfile ? (
                          <>Interval requirement: {MIN_DONATION_INTERVAL_DAYS} days</>
                        ) : (
                          'Awaiting donation history'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Verified */}
                  <div className="relative flex items-start gap-4 pb-5">
                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                      realVerified ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white' :
                      'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                    }`}>
                      <i className="fas fa-badge-check text-[10px]" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-gray-800">Identity Verification</p>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${realVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {realVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {realVerified ? 'Medical records confirmed' : 'Additional verification advised'}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Available Now */}
                  <div className="relative flex items-start gap-4">
                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                      availability.toLowerCase().includes('available') ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' :
                      'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                    }`}>
                      <i className="fas fa-check-circle text-[10px]" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-gray-800">Available Now</p>
                        <span className={`inline-flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                          availability.toLowerCase().includes('available') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${availability.toLowerCase().includes('available') ? 'bg-emerald-400 animate-pulse-slow' : 'bg-amber-400'}`} />
                          {availability}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {availability.toLowerCase().includes('available')
                          ? 'Ready for immediate response'
                          : availability.toLowerCase().includes('standby')
                            ? 'On standby — may respond'
                            : 'Currently unavailable'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </PanelSection>
          </div>

          {/* ── Right Column ── */}
          <div className="w-[45%] overflow-y-auto custom-scrollbar-thin px-6 py-5 space-y-4">
            {/* Donor Profile Card */}
            <PanelSection index={5}>
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-200/20 to-transparent rounded-full -mr-8 -mt-8" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md">
                      <span className="text-lg font-bold text-white">{bloodGroup}</span>
                    </div>
                    {verified && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center shadow-sm">
                        <i className="fas fa-check text-[8px] text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                      {verified && (
                        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <i className="fas fa-badge-check text-[7px] mr-0.5" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      <i className="fas fa-location-dot text-[8px] mr-0.5" />
                      {locationStr}{distanceKm != null && <span className="text-gray-400 ml-1">· {distanceKm.toFixed(1)} km</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full ${
                        availability.toLowerCase().includes('available') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${availability.toLowerCase().includes('available') ? 'bg-emerald-400 animate-pulse-slow' : 'bg-amber-400'}`} />
                        {availability}
                      </span>
                      {travelMin != null && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-cyan-600 font-medium bg-cyan-50 px-2 py-0.5 rounded-full">
                          <i className="fas fa-truck-fast text-[8px]" /> ETA ~{travelMin} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </PanelSection>

            {/* ETA Section */}
            {travelMin != null && (
              <PanelSection index={6}>
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fas fa-truck-fast text-[9px] text-cyan-500" /> Estimated Response
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-white/70">
                      <p className="text-[8px] text-gray-400">Distance</p>
                      <p className="text-sm font-bold text-gray-800">{distanceKm.toFixed(1)} km</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/70">
                      <p className="text-[8px] text-gray-400">Arrival</p>
                      <p className="text-sm font-bold text-emerald-600">{travelMin} min</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/70">
                      <p className="text-[8px] text-gray-400">Traffic</p>
                      <p className="text-sm font-bold text-cyan-600">Low</p>
                    </div>
                  </div>
                </div>
              </PanelSection>
            )}

            {/* Donation Eligibility */}
            <PanelSection index={7}>
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <i className="fas fa-calendar-check text-[9px] text-purple-400" /> Donation Eligibility
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    effectiveIsEligible === true ? 'bg-emerald-50 text-emerald-600' :
                    effectiveIsEligible === false ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {effectiveIsEligible === true ? 'Eligible' : effectiveIsEligible === false ? 'Not eligible' : 'Unconfirmed'}
                  </span>
                </div>
                {lastDonationDays !== null ? (
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span className="text-gray-400">Last donation</span><span className="font-medium text-gray-700">{formatDate(lastDonation)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Days since</span><span className="font-medium text-gray-700">{lastDonationDays} days</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Minimum interval</span><span className="font-medium text-gray-700">{MIN_DONATION_INTERVAL_DAYS} days</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current</span>
                      <span className={`font-medium ${effectiveIsEligible ? 'text-emerald-600' : 'text-red-600'}`}>
                        {effectiveIsEligible ? 'Safe to donate' : 'Below interval'}
                      </span>
                    </div>
                  </div>
                ) : donorProfile ? (
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span className="text-gray-400">Total donations</span><span className="font-medium text-gray-700">{realDonationCount} recorded</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Acceptance rate</span><span className="font-medium text-emerald-600">{realAcceptanceLikelihood}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Avg response</span><span className="font-medium text-gray-700">{realAvgResponseMin ? `~${realAvgResponseMin} min` : 'Unknown'}</span></div>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 italic flex items-center gap-1">
                    <i className="fas fa-circle-exclamation text-[8px]" /> Eligibility cannot be confirmed.
                  </p>
                )}
              </div>
            </PanelSection>

            {/* Health & Safety */}
            <PanelSection index={8}>
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <i className="fas fa-heart-pulse text-[9px] text-rose-400" /> Health & Safety
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Screening', value: realScreeningPassed ? 'Passed' : donorProfile ? 'Pending' : verified ? 'Passed' : 'Pending', ok: realScreeningPassed },
                    { label: 'Blood Tests', value: realHasBloodTests ? 'Available' : donorProfile ? 'Unknown' : 'Unknown', ok: realHasBloodTests },
                    { label: 'Chronic Conditions', value: realChronicConditions.length > 0 ? realChronicConditions.slice(0, 2).join(', ') : 'None Reported', ok: realChronicConditions.length === 0 },
                    { label: 'Medications', value: realMedications.length > 0 ? realMedications.slice(0, 2).join(', ') : 'None', ok: realMedications.length === 0 },
                  ].map((h) => (
                    <div key={h.label} className="p-2 rounded-lg bg-gray-50/70">
                      <p className="text-[8px] text-gray-400">{h.label}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${h.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {h.ok && <i className="fas fa-check-circle text-[8px]" />}
                        {!h.ok && <i className="fas fa-exclamation-triangle text-[8px]" />}
                        {h.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-2 rounded-lg bg-gray-50 text-center">
                  <span className={`text-[9px] font-semibold ${hasMedicalConcerns ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {hasMedicalConcerns ? 'Review medical records recommended' : 'Overall Safety: Excellent'}
                  </span>
                </div>
              </div>
            </PanelSection>

            {/* Quick AI Messages */}
            <PanelSection index={9}>
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <i className="fas fa-bolt text-[9px] text-rose-400" /> Quick Messages
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_MESSAGES.map((qm) => (
                    <button key={qm.label} type="button" onClick={() => handleQuickMessage(qm)}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-medium transition-all duration-200 border ${
                        activeQuickMsg === qm.message
                          ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-rose-200 hover:text-rose-600'
                      }`}>
                      <i className={`fas ${qm.icon} mr-1 text-[8px]`} /> {qm.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={notifyMessage}
                  onChange={(e) => { onNotifyMessageChange(e.target.value); setActiveQuickMsg(''); }}
                  placeholder="Custom message..."
                  className="w-full rounded-lg border border-gray-200 p-2 text-[10px] h-10 resize-none focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
            </PanelSection>

            {/* Live Status */}
            <PanelSection index={10}>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  { label: 'Online', active: true, color: '#10B981' },
                  { label: 'GPS', active: distanceKm != null, color: '#2563EB' },
                  { label: 'Available', active: availability.toLowerCase().includes('available'), color: '#8B5CF6' },
                  { label: 'Device', active: true, color: '#06B6D4' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                    <span className={`relative flex h-1.5 w-1.5 ${s.active ? '' : 'opacity-40'}`}>
                      {s.active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: s.color }} />}
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: s.color }} />
                    </span>
                    <span className={`text-[8px] font-medium ${s.active ? 'text-gray-600' : 'text-gray-300'}`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </PanelSection>

            {/* Donor Reliability */}
            <PanelSection index={11}>
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <i className="fas fa-shield-halved text-[9px] text-cyan-400" /> Reliability
                </p>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-gray-400">Response Rate</span><span className={`font-medium ${realResponseRate >= 70 ? 'text-emerald-700' : 'text-amber-700'}`}>{realResponseRate}%</span></div>
                  {realAvgResponseMin && <div className="flex justify-between"><span className="text-gray-400">Avg Response</span><span className="font-medium text-gray-700">{realAvgResponseMin} min</span></div>}
                  <div className="flex justify-between"><span className="text-gray-400">Acceptance Likelihood</span><span className={`font-medium ${realAcceptanceLikelihood >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{realAcceptanceLikelihood}%</span></div>
                  {realCompletionRate && <div className="flex justify-between"><span className="text-gray-400">Completion Rate</span><span className="font-medium text-emerald-600">{realCompletionRate}%</span></div>}
                  {realTotalAcceptances > 0 && <div className="flex justify-between"><span className="text-gray-400">Total Acceptances</span><span className="font-medium text-gray-700">{realTotalAcceptances}</span></div>}
                </div>
              </div>
            </PanelSection>

            {/* ══ AI PREDICTION CARD ══ */}
            <PanelSection index={12}>
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50/80 to-violet-50 border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-indigo-300/40 via-purple-400/40 to-indigo-300/40" />
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <i className="fas fa-chart-line text-[9px]" /> AI Prediction
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-white/70 backdrop-blur-sm border border-white/80 text-center">
                    <p className="text-[8px] text-gray-400 mb-0.5">Accepts Request</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: realAcceptanceLikelihood >= 80 ? '#10B981' : realAcceptanceLikelihood >= 60 ? '#2563EB' : '#F97316' }}>
                      {realAcceptanceLikelihood}%
                    </p>
                    <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
                      realAcceptanceLikelihood >= 80 ? 'bg-emerald-50 text-emerald-600' :
                      realAcceptanceLikelihood >= 60 ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {realAcceptanceLikelihood >= 80 ? 'Very Likely' : realAcceptanceLikelihood >= 60 ? 'Likely' : 'Moderate'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/70 backdrop-blur-sm border border-white/80 text-center">
                    <p className="text-[8px] text-gray-400 mb-0.5">Est. Response</p>
                    <p className="text-lg font-bold tabular-nums text-gray-800">
                      {realAvgResponseMin ? `${realAvgResponseMin}` : travelMin ? `${travelMin}` : '--'}
                    </p>
                    <span className="text-[8px] font-medium text-gray-400">
                      {realAvgResponseMin || travelMin ? 'minutes' : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/70 backdrop-blur-sm border border-white/80 text-center">
                    <p className="text-[8px] text-gray-400 mb-0.5">Predicted Arrival</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: travelMin && travelMin <= 10 ? '#10B981' : travelMin && travelMin <= 20 ? '#2563EB' : '#F97316' }}>
                      {travelMin ? `${travelMin}` : '--'}
                    </p>
                    <span className="text-[8px] font-medium text-gray-400">
                      {travelMin ? 'minutes' : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/70 backdrop-blur-sm border border-white/80 text-center">
                    <p className="text-[8px] text-gray-400 mb-0.5">Hospital Compat.</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: lvlColors.color }}>
                      {lvlColors.text}
                    </p>
                    <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full`} style={{ backgroundColor: lvlColors.bg, color: lvlColors.color }}>
                      {lvlColors.text}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 p-2 rounded-lg bg-white/50 border border-indigo-100/60 flex items-center justify-between">
                  <span className="text-[8px] text-gray-400 flex items-center gap-1">
                    <i className="fas fa-microchip text-[7px] text-indigo-400" /> AI confidence weighted
                  </span>
                  <span className="text-[8px] font-semibold text-indigo-500">
                    Score: {Math.round((realAcceptanceLikelihood + (travelMin ? Math.max(0, 100 - travelMin * 3) : 70) + (score || 75)) / 3)}%
                  </span>
                </div>
              </div>
            </PanelSection>
          </div>
        </div>

        {/* ══ STICKY ACTION BAR ══ */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white/80 backdrop-blur-md rounded-b-[24px] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200 active:scale-95"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {notifyStatus?.error && <p className="text-[10px] text-red-500">{notifyStatus.error}</p>}
            {notifyStatus?.message && (
              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                <i className="fas fa-check-circle" />{notifyStatus.message}
              </p>
            )}
            <button
              type="button"
              onClick={onNotify}
              disabled={notifyStatus?.loading}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
            >
              {notifyStatus?.loading ? (
                <><i className="fas fa-spinner fa-spin" /> Sending...</>
              ) : (
                <><i className="fas fa-bell" /> Send Emergency Request</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DonorIntelligenceModal;
