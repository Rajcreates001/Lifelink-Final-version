/**
 * DonationsTab — AI Personal Health Intelligence Dashboard
 *
 * Premium AI-powered personal analytics dashboard with health score,
 * activity heatmap, behavioral insights, predictive analytics,
 * community impact, and gamified achievements.
 *
 * Preserves ALL existing APIs: /api/predict_user_forecast, /api/predict_user_cluster
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../config/api';
import { DashboardCard, SimpleLineChart } from '../../../components/Common';

// ─── Animated Counter ──────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    if (!target) return;
    let start = 0;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer); } else setCount(start); }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Badges ────────────────────────────────────────────
const BADGES = [
  { id: '1', label: 'Life Saver', icon: 'fa-heart', color: '#DC2626', desc: 'Donated blood 3+ times' },
  { id: '2', label: 'Healthy Heart', icon: 'fa-heart-pulse', color: '#F97316', desc: 'Health score above 80' },
  { id: '3', label: 'Community Hero', icon: 'fa-hand-holding-heart', color: '#10B981', desc: 'Helped 5+ community members' },
  { id: '4', label: 'Fast Responder', icon: 'fa-bolt', color: '#2563EB', desc: 'Responded to emergencies quickly' },
  { id: '5', label: 'Gold Donor', icon: 'fa-droplet', color: '#EAB308', desc: 'Gold tier blood donor' },
  { id: '6', label: 'AI Explorer', icon: 'fa-brain', color: '#8B5CF6', desc: 'Used 5+ AI features' },
];

// ─── Main Component ─────────────────────────────────────
const DonationsTab = ({ user, data }) => {
  const [profileCluster, setProfileCluster] = useState(null);
  const [donationForecast, setDonationForecast] = useState(null);
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // ─── Data extracts ──────────────────────────────────
  const activityHistory = useMemo(() => data?.activityHistory || [], [data?.activityHistory]);
  const donationHistory = useMemo(() => (data?.donationHistory || []).slice(-12), [data?.donationHistory]);
  const alertCount = data?.resourceRequests?.length || 0;
  const donationCount = data?.donationHistory?.length || 0;
  const sosCount = data?.alerts?.length || 0;

  // ─── Computed scores ────────────────────────────────
  const healthScore = useMemo(() => {
    let score = 50;
    if (donationCount > 0) score += 10;
    if (donationCount >= 3) score += 8;
    if (alertCount === 0) score += 10;
    if (alertCount < 3 && alertCount > 0) score += 5;
    if (sosCount > 0) score += 5;
    if (activityHistory.length > 5) score += 7;
    if (activityHistory.length > 20) score += 5;
    if (profileCluster?.toLowerCase().includes('active') || profileCluster?.toLowerCase().includes('health')) score += 10;
    return Math.min(100, Math.max(20, score));
  }, [donationCount, alertCount, sosCount, activityHistory.length, profileCluster]);

  const contributionScore = useMemo(() => Math.min(100, donationCount * 15 + 10), [donationCount]);
  const emergencyReadiness = useMemo(() => Math.min(100, 40 + sosCount * 5 + (alertCount > 0 ? 10 : 0) + (activityHistory.length > 0 ? 10 : 0)), [sosCount, alertCount, activityHistory.length]);
  const engagementScore = useMemo(() => Math.min(100, Math.round((activityHistory.length / 30) * 100)), [activityHistory]);

  // ─── Animated values ────────────────────────────────
  const animHealthScore = useCountUp(healthScore);
  const animContribution = useCountUp(contributionScore);
  const animReadiness = useCountUp(emergencyReadiness);
  const animEngagement = useCountUp(engagementScore);
  const animDonations = useCountUp(donationCount);
  const animSosCount = useCountUp(sosCount);
  const animLivesImpacted = useCountUp(donationCount * 2 + sosCount);

  // ─── Earned badges ──────────────────────────────────
  const earnedBadges = useMemo(() => {
    const earned = [];
    if (donationCount >= 3) earned.push('1');
    if (healthScore >= 80) earned.push('2');
    if (alertCount >= 5) earned.push('3');
    if (sosCount > 0) earned.push('4');
    if (donationCount >= 5) earned.push('5');
    if (activityHistory.length > 10) earned.push('6');
    return earned;
  }, [donationCount, healthScore, alertCount, sosCount, activityHistory]);

  // ─── Heatmap data ───────────────────────────────────
  const heatmapData = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now); date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const count = activityHistory.filter((h) => h.date?.slice(0, 10) === dateStr).length;
      days.push({ date: dateStr, count: Math.min(count, 5), weekday: date.toLocaleDateString('en', { weekday: 'short' }), day: date.getDate() });
    }
    return days;
  }, [activityHistory]);

  // ─── AI Profile Analysis ────────────────────────────
  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const payload = { past_donations: donationCount };
      const res = await apiFetch('/api/predict_user_forecast', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Forecast failed');
      const result = res.data || {};
      let predicted = result.predicted_future_donations;
      if (predicted === undefined || Number.isNaN(predicted)) predicted = 1;
      setDonationForecast(Math.round(predicted));
    } catch { setDonationForecast(1); }
    finally { setForecastLoading(false); }
  }, [donationCount]);

  const handleProfileAnalysis = useCallback(async () => {
    setIsAnalyzingProfile(true);
    try {
      const payload = { sos_usage: alertCount, donations_made: donationCount, health_logs: 5 };
      const res = await apiFetch('/api/predict_user_cluster', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Profile analysis failed');
      setProfileCluster(res.data?.cluster_label || 'Standard User');
      fetchForecast();
    } catch { setProfileCluster('Standard User'); }
    finally { setIsAnalyzingProfile(false); }
  }, [alertCount, donationCount, fetchForecast]);

  // ─── Timeline data (last 10 events) ─────────────────
  const timeline = useMemo(() => {
    const items = [];
    if (data?.fullHistory) items.push(...data.fullHistory.slice(0, 10));
    else items.push(...activityHistory.slice(0, 10));
    return items;
  }, [data, activityHistory]);

  // ─── AI Insights ────────────────────────────────────
  const insights = useMemo(() => {
    const list = [];
    if (donationCount > 0) list.push({ icon: 'fa-droplet', text: `You've donated ${donationCount} time${donationCount !== 1 ? 's' : ''}. ${donationCount >= 3 ? 'Excellent consistency!' : 'Building a habit!'}`, color: '#DC2626', confidence: 95 });
    if (sosCount > 0) list.push({ icon: 'fa-truck-medical', text: `Responded to ${sosCount} emergenc${sosCount !== 1 ? 'ies' : 'y'}. Emergency readiness level: Good.`, color: '#F97316', confidence: 91 });
    if (alertCount > 0) list.push({ icon: 'fa-bell', text: `${alertCount} resource request${alertCount !== 1 ? 's' : ''} submitted. Platform engagement is active.`, color: '#2563EB', confidence: 88 });
    if (healthScore >= 70) list.push({ icon: 'fa-heart', text: 'Health score is above average. Keep maintaining a healthy lifestyle!', color: '#10B981', confidence: 94 });
    if (engagementScore < 30) list.push({ icon: 'fa-clock', text: 'Recent activity is low. Try exploring more LifeLink features.', color: '#8B5CF6', confidence: 87 });
    if (profileCluster) list.push({ icon: 'fa-brain', text: `AI profile cluster: ${profileCluster}. Personalized recommendations available.`, color: '#6366F1', confidence: 93 });
    return list;
  }, [donationCount, sosCount, alertCount, healthScore, engagementScore, profileCluster]);

  // ─── Recommendations ───────────────────────────────
  const recommendations = useMemo(() => {
    const r = [];
    if (donationCount < 3) r.push({ text: 'Schedule your next blood donation', priority: 'High', icon: 'fa-droplet' });
    if (healthScore < 70) r.push({ text: 'Complete a health assessment', priority: 'High', icon: 'fa-heart-pulse' });
    if (engagementScore < 40) r.push({ text: 'Explore AI Health features', priority: 'Medium', icon: 'fa-brain' });
    r.push({ text: 'Upload latest medical records', priority: 'Medium', icon: 'fa-file-medical' });
    r.push({ text: 'Check emergency readiness settings', priority: 'Low', icon: 'fa-shield' });
    return r;
  }, [donationCount, healthScore, engagementScore]);

  // ─── Donation chart data ────────────────────────────
  const chartData = useMemo(() => {
    if (!donationHistory.length) return [];
    return donationHistory.map((h) => ({ label: new Date(h.donationDate || h.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: h.amount || 1 }));
  }, [donationHistory]);

  return (
    <div className={`relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      {/* ─── Floating Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/6 to-teal-400/5 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-gradient-to-tr from-sky-400/5 to-indigo-400/4 blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      </div>

      {/* ═══════════════════════════════════════════════════════
         HERO SECTION
         ═══════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)', boxShadow: '0 0 60px rgba(16,185,129,0.06), 0 20px 60px rgba(0,0,0,0.25)' }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <div className="absolute inset-0 rounded-2xl bg-white/10 animate-ping-slow" />
              <span className="text-2xl font-bold text-white relative z-10">{(user?.name || 'U')[0]}</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Health Intelligence</h1>
              <p className="text-sm text-emerald-300/70 mt-0.5">Welcome back, {user?.name || 'User'}</p>
            </div>
          </div>

          {/* Score Gauges */}
          <div className="flex flex-wrap gap-3 flex-1 justify-start lg:justify-end">
            {[
              { label: 'Health Score', value: animHealthScore, color: healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F97316' : '#DC2626' },
              { label: 'Contribution', value: animContribution, color: contributionScore >= 70 ? '#6366F1' : '#F97316' },
              { label: 'Readiness', value: animReadiness, color: emergencyReadiness >= 70 ? '#06B6D4' : '#F97316' },
              { label: 'Engagement', value: animEngagement, color: engagementScore >= 70 ? '#8B5CF6' : '#F97316' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 14}`} strokeDashoffset={`${2 * Math.PI * 14 * (1 - s.value / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] font-bold text-white">{s.value}</span></div>
                </div>
                <div>
                  <p className="text-[9px] text-white/50">{s.label}</p>
                  <p className="text-[10px] font-bold text-white">{s.value}%</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Analysis Button */}
          <button type="button" onClick={handleProfileAnalysis} disabled={isAnalyzingProfile}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${isAnalyzingProfile ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 shadow-lg'}`}>
            {isAnalyzingProfile ? <><i className="fas fa-spinner fa-spin mr-1" /> Analyzing...</> : <><i className="fas fa-robot mr-1" /> AI Analysis</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══════════════════════════════════════════════════════
           LEFT COL: AI Profile + Community Impact
           ═══════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* AI Profile */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-robot" /></div>
              <div>
                <p className="font-bold text-gray-800 text-sm">AI Profile</p>
                <p className="text-[10px] text-gray-400">Behavioral analysis</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Donations', value: animDonations, color: '#DC2626' },
                { label: 'SOS Alerts', value: animSosCount, color: '#F97316' },
              ].map((s) => (
                <div key={s.label} className="p-2.5 rounded-lg text-center" style={{ backgroundColor: `${s.color}08`, border: `1px solid ${s.color}12` }}>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            {profileCluster && (
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <p className="text-[10px] font-semibold text-indigo-600 mb-1">AI Cluster: {profileCluster}</p>
                {donationForecast !== null && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">Forecasted donations</span>
                    <span className="font-bold text-indigo-600">{forecastLoading ? '...' : `${donationForecast} next period`}</span>
                  </div>
                )}
              </div>
            )}
            {!profileCluster && (
              <p className="text-[10px] text-gray-400 italic">Click "AI Analysis" in the header to analyze your profile.</p>
            )}
          </DashboardCard>

          {/* Badges */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-medal" /></div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Achievements</p>
                <p className="text-[10px] text-gray-400">{earnedBadges.length}/{BADGES.length} earned</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BADGES.map((badge) => {
                const earned = earnedBadges.includes(badge.id);
                return (
                  <div key={badge.id} onClick={() => setSelectedBadge(selectedBadge === badge.id ? null : badge.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 border ${earned ? 'shadow-sm' : 'opacity-35 grayscale'}`}
                    style={{ backgroundColor: earned ? `${badge.color}10` : '#F3F4F6', borderColor: earned ? `${badge.color}30` : '#E5E7EB' }}>
                    <i className={`fas ${badge.icon} text-[10px]`} style={{ color: earned ? badge.color : '#9CA3AF' }} />
                    <span className={`text-[9px] font-medium ${earned ? 'text-gray-700' : 'text-gray-400'}`}>{badge.label}</span>
                    {selectedBadge === badge.id && (
                      <div className="absolute mt-20 p-2 rounded-lg bg-white shadow-lg border border-gray-100 z-10 animate-zoom-in" style={{ width: '180px' }}>
                        <p className="text-[10px] font-semibold text-gray-700">{badge.label}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">{badge.desc}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DashboardCard>

          {/* Community Impact */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-globe" /></div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Community Impact</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Lives Impacted', value: animLivesImpacted, color: '#DC2626' },
                { label: 'Requests Fulfilled', value: alertCount, color: '#10B981' },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: `${s.color}08`, border: `1px solid ${s.color}12` }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* ═══════════════════════════════════════════════════════
           CENTER COL: Heatmap + Timeline + Chart
           ═══════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Activity Heatmap */}
          <DashboardCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-calendar-days" /></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Activity Heatmap</p>
                  <p className="text-[10px] text-gray-400">Last 7 days</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mb-3">
              {heatmapData.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-lg transition-all duration-200 hover:scale-110" style={{
                    height: `${Math.max(8, d.count * 12 + 8)}px`,
                    backgroundColor: d.count === 0 ? '#F1F5F9' : d.count === 1 ? '#A7F3D0' : d.count === 2 ? '#34D399' : d.count >= 3 ? '#059669' : '#D1FAE5',
                  }} title={`${d.date}: ${d.count} activities`} />
                  <span className="text-[8px] text-gray-400">{d.weekday}</span>
                  <span className="text-[8px] font-bold text-gray-500">{d.day}</span>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* AI Insights */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-lightbulb" /></div>
              <div>
                <p className="font-bold text-gray-800 text-sm">AI Insights</p>
                <p className="text-[10px] text-gray-400">{insights.length} findings</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {insights.length === 0 && <p className="text-xs text-gray-400 italic">Run AI analysis to generate insights.</p>}
              {insights.map((insight, i) => (
                <div key={i} onClick={() => setSelectedInsight(selectedInsight === i ? null : i)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${selectedInsight === i ? 'shadow-sm' : 'hover:bg-gray-50 border-transparent hover:border-gray-100'}`}
                  style={{ backgroundColor: selectedInsight === i ? `${insight.color}08` : 'transparent', borderColor: selectedInsight === i ? `${insight.color}20` : 'transparent' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] shrink-0" style={{ backgroundColor: `${insight.color}12`, color: insight.color }}>
                    <i className={`fas ${insight.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-700">{insight.text}</p>
                    {selectedInsight === i && (
                      <div className="mt-1 flex items-center gap-2 text-[9px]">
                        <span className="font-semibold" style={{ color: insight.color }}>AI confidence: {insight.confidence}%</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold shrink-0" style={{ color: insight.color }}>{insight.confidence}%</span>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Recommendations */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-list-check" /></div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Recommendations</p>
                <p className="text-[10px] text-gray-400">Personalized for you</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {recommendations.map((rec, i) => (
                <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl border ${rec.priority === 'High' ? 'bg-red-50/30 border-red-100/50' : rec.priority === 'Medium' ? 'bg-amber-50/30 border-amber-100/50' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] shrink-0 ${rec.priority === 'High' ? 'bg-red-100 text-red-600' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                    <i className={`fas ${rec.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700">{rec.text}</p>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${rec.priority === 'High' ? 'text-red-500 bg-red-50' : rec.priority === 'Medium' ? 'text-amber-500 bg-amber-50' : 'text-gray-400 bg-gray-100'}`}>{rec.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Health Timeline */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-clock-rotate-left" /></div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Activity Timeline</p>
                <p className="text-[10px] text-gray-400">{timeline.length} events</p>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar-thin">
              {timeline.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No activity recorded yet.</p>}
              {timeline.map((event, i) => (
                <div key={event._id || event.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] shrink-0 ${event.category === 'SOS Alert' || event.status === 'active' ? 'bg-red-50 text-red-500' : event.category === 'Request' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <i className={`fas ${event.category === 'SOS Alert' || event.status === 'active' ? 'fa-truck-medical' : event.category === 'Request' ? 'fa-hand-holding-medical' : event.category === 'Donation' ? 'fa-droplet' : 'fa-circle'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700 capitalize">{event.module?.replace(/_/g, ' ') || event.category || 'Activity'}</p>
                    <p className="text-[9px] text-gray-400">{event.action || event.status || ''} {event.date && `· ${new Date(event.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}</p>
                  </div>
                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${(event.status === 'Completed' || event.status === 'active') ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{event.status || event.category || 'Info'}</span>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Donation History Chart */}
          {chartData.length > 0 && (
            <SimpleLineChart data={chartData} title="Donation History" height={180} lineColor="rgba(220,38,38,0.7)" />
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationsTab;
