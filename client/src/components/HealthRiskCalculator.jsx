/**
 * HealthRiskCalculator — Premium AI Health Intelligence Center
 *
 * Enterprise clinical intake workflow:
 *   Patient Information → AI Understands → AI Predicts → AI Explains
 *
 * Layout (top to bottom):
 *   AI Status Bar (floating)
 *   Patient Input (Grouped Cards)
 *   Upload Medical Report
 *   Voice Input
 *   Analyze Button (sticky)
 *   AI Thinking Panel
 *   Prediction Results (Score + Vitals + Explanation)
 *   Recommendations + Insights
 *   Health Timeline
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { DashboardCard, ProgressBar, GradientAreaChart } from './Common';

// ─── Expanded Symptom Dictionary ──────────────────────────
const SYMPTOM_DICT = [
  'Chest Pain', 'Fever', 'Fatigue', 'Headache', 'Dizziness', 'Blurred Vision',
  'Breathing Difficulty', 'Swelling', 'Vomiting', 'Nausea', 'Cough', 'Back Pain',
  'Joint Pain', 'Palpitations', 'Numbness', 'Chills', 'Heartburn', 'Hearing Loss',
  'Shortness of Breath', 'Sore Throat', 'Muscle Aches', 'Loss of Appetite',
  'Abdominal Pain', 'Constipation', 'Diarrhea', 'Insomnia', 'Anxiety',
  'Rash', 'Itching', 'Weight Loss', 'Weight Gain', 'Excessive Thirst',
  'Frequent Urination', 'Blood in Urine', 'Vision Changes', 'Tinnitus',
  'Chest Tightness', 'Wheezing', 'Snoring', 'Night Sweats', 'Hot Flashes',
  'Nosebleed', 'Hair Loss', 'Brittle Nails', 'Cold Hands', 'Numbness in Fingers',
  'Swollen Ankles', 'Leg Cramps', 'Difficulty Swallowing', 'Hoarseness',
];

// ─── Symptom Synonyms (for fuzzy matching) ───────────────
const SYMPTOM_SYNONYMS = {
  'chest': ['Chest Pain', 'Chest Tightness'],
  'heart': ['Chest Pain', 'Palpitations', 'Chest Tightness'],
  'breath': ['Breathing Difficulty', 'Shortness of Breath', 'Wheezing'],
  'head': ['Headache', 'Dizziness', 'Blurred Vision', 'Vision Changes'],
  'stomach': ['Abdominal Pain', 'Nausea', 'Vomiting', 'Constipation', 'Diarrhea'],
  'fever': ['Fever', 'Chills', 'Night Sweats'],
  'weight': ['Weight Loss', 'Weight Gain'],
  'skin': ['Rash', 'Itching', 'Hair Loss'],
  'sleep': ['Insomnia', 'Fatigue', 'Night Sweats'],
  'thirst': ['Excessive Thirst', 'Frequent Urination'],
};

// ─── AI Analysis Steps ──────────────────────────────────
const ANALYSIS_STEPS = [
  { icon: 'fa-heart-pulse', text: 'Analyzing heart rate patterns...', delay: 300 },
  { icon: 'fa-weight', text: 'Checking BMI classification...', delay: 800 },
  { icon: 'fa-droplet', text: 'Evaluating blood pressure trends...', delay: 1300 },
  { icon: 'fa-calendar', text: 'Comparing age-related risk factors...', delay: 1800 },
  { icon: 'fa-person-walking', text: 'Assessing lifestyle impact...', delay: 2300 },
  { icon: 'fa-notes-medical', text: 'Running prediction model...', delay: 2800 },
  { icon: 'fa-chart-line', text: 'Generating health insights...', delay: 3400 },
  { icon: 'fa-file-prescription', text: 'Compiling recommendations...', delay: 4000 },
];

// ─── Risk Color ──────────────────────────────────────────
const riskColor = (level) => ({
  Critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  High: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  Moderate: { color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
  Low: { color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
}[level] || { color: '#6B7280', bg: 'rgba(107,114,128,0.08)' });

// ─── Labeled Input ─────────────────────────────────────
const LabeledInput = ({ label, name, type, placeholder, icon, value, onChange, hint, aiComment }) => {
  const hasComment = !!aiComment;
  const isHigh = hasComment && (aiComment.includes('High') || aiComment.includes('Above'));
  const isWarning = hasComment && (aiComment.includes('Elevated') || aiComment.includes('Slightly') || aiComment.includes('Low'));
  const tint = isHigh ? 'rgba(220,38,38,0.04)' : isWarning ? 'rgba(249,115,22,0.04)' : hasComment ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.6)';
  const borderTint = isHigh ? 'rgba(220,38,38,0.15)' : isWarning ? 'rgba(249,115,22,0.15)' : hasComment ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.06)';
  return (
    <div className="p-4 rounded-xl transition-all duration-200" style={{ backgroundColor: tint, border: `1px solid ${borderTint}` }}>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2">
        <i className={`fas ${icon} text-[11px] text-gray-400`} />{label}
        {hint && <span className="text-[9px] font-normal text-gray-400 ml-auto">{hint}</span>}
      </label>
      <input name={name} type={type} placeholder={placeholder}
        value={value} onChange={onChange}
        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200"
        style={{ boxShadow: isHigh ? '0 0 0 1.5px rgba(220,38,38,0.3)' : isWarning ? '0 0 0 1.5px rgba(249,115,22,0.3)' : '' }}
      />
      {aiComment && (
        <p className={`text-[10px] mt-1.5 flex items-center gap-1 ${isHigh ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-emerald-500'}`}>
          <i className="fas fa-robot text-[8px]" /> {aiComment}
        </p>
      )}
    </div>
  );
};

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

// ─── Main Component ─────────────────────────────────────
const HealthRiskCalculator = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    age: '45', bmi: '28.5', blood_pressure: '140', heart_rate: '75',
    has_condition: '1', lifestyle_factor: 'Sedentary', symptoms: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [showAiThinking, setShowAiThinking] = useState(false);
  const [symptomChips, setSymptomChips] = useState([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const recRef = useRef(null);
  const stepsTimerRef = useRef(null);

  useEffect(() => { setMounted(true); return () => { if (stepsTimerRef.current) clearTimeout(stepsTimerRef.current); }; }, []);

  // ─── Speech Recognition Setup ─────────────────────────
  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SR && !recRef.current) {
      recRef.current = new SR();
      recRef.current.continuous = false;
      recRef.current.interimResults = true;
      recRef.current.lang = 'en-US';
    }
  }, []);

  // ─── History Loading ──────────────────────────────────
  const historyKey = useMemo(() => (user?.id ? `lifelink:health-risk:${user.id}` : 'lifelink:health-risk'), [user?.id]);

  const loadHistory = async () => {
    if (!user?.id) return;
    try {
      const res = await apiFetch(`/api/health/risk/history/${user.id}`, { method: 'GET' });
      if (res.ok && Array.isArray(res.data?.data)) {
        setHistory(res.data.data.map((item) => ({
          id: item._id || item.id, date: item.createdAt, risk_level: item.risk_level,
          risk_score: item.risk_score, bmi: item.payload?.bmi, blood_pressure: item.payload?.blood_pressure,
          heart_rate: item.payload?.heart_rate, lifestyle: item.payload?.lifestyle_factor
        })));
        return;
      }
    } catch (err) { /* fallback */ }
    try {
      const stored = localStorage.getItem(historyKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch (err) { setHistory([]); }
  };

  useEffect(() => { loadHistory(); }, [historyKey]);

  // ─── Helpers ──────────────────────────────────────────
  const numeric = (val, fallback = 0) => { const p = Number(val); return Number.isFinite(p) ? p : fallback; };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!showAiThinking && ['age', 'bmi', 'blood_pressure', 'heart_rate'].includes(name) && value) {
      setShowAiThinking(true);
      setActiveStep(-1);
      let step = 0;
      const runSteps = () => {
        if (step < ANALYSIS_STEPS.length - 1) {
          setActiveStep(step);
          step++;
          stepsTimerRef.current = setTimeout(runSteps, ANALYSIS_STEPS[step]?.delay || 500);
        } else {
          setActiveStep(ANALYSIS_STEPS.length - 1);
        }
      };
      setTimeout(runSteps, 400);
    }
  };

  // ─── Computed Vitals ──────────────────────────────────
  const bmiCategory = useMemo(() => {
    const b = numeric(formData.bmi);
    if (b >= 30) return 'Obese'; if (b >= 25) return 'Overweight'; if (b >= 18.5) return 'Normal'; return 'Underweight';
  }, [formData.bmi]);

  const bpCategory = useMemo(() => {
    const bp = numeric(formData.blood_pressure);
    if (bp >= 140) return 'High'; if (bp >= 120) return 'Elevated'; return 'Normal';
  }, [formData.blood_pressure]);

  const hrComment = useMemo(() => {
    const hr = numeric(formData.heart_rate);
    if (hr > 100) return 'High — elevated resting rate';
    if (hr < 60) return 'Low — bradycardia range';
    return 'Normal range';
  }, [formData.heart_rate]);

  const bmiComment = useMemo(() => {
    const cat = bmiCategory;
    if (cat === 'Obese') return 'High — consult nutritionist';
    if (cat === 'Overweight') return 'Slightly elevated';
    if (cat === 'Underweight') return 'Low — monitor nutrition';
    return 'Healthy range';
  }, [bmiCategory]);

  const bpComment = useMemo(() => {
    if (bpCategory === 'High') return 'High — monitor regularly';
    if (bpCategory === 'Elevated') return 'Elevated — reduce sodium';
    return 'Normal range';
  }, [bpCategory]);

  // ─── Risk Drivers & Guidance ──────────────────────────
  const riskDrivers = useMemo(() => {
    const d = [];
    if (numeric(formData.age) >= 60) d.push('Age 60+');
    if (numeric(formData.bmi) >= 30) d.push('BMI over 30');
    if (numeric(formData.blood_pressure) >= 140) d.push('High blood pressure');
    if (numeric(formData.heart_rate) >= 100) d.push('High resting heart rate');
    if (formData.has_condition === '1') d.push('Existing condition');
    if (['Sedentary', 'Unhealthy'].includes(formData.lifestyle_factor)) d.push('Lifestyle risk');
    return d;
  }, [formData]);

  const recommendations = useMemo(() => {
    const tips = [];
    if (bmiCategory === 'Obese' || bmiCategory === 'Overweight') tips.push({ text: 'Increase daily movement with short walks', priority: 'High', icon: 'fa-person-walking' });
    if (bpCategory === 'High') tips.push({ text: 'Reduce sodium and monitor BP twice weekly', priority: 'High', icon: 'fa-heart-circle-check' });
    if (formData.lifestyle_factor === 'Sedentary') tips.push({ text: 'Add 30 minutes of moderate activity daily', priority: 'Medium', icon: 'fa-clock' });
    if (numeric(formData.heart_rate) > 100) tips.push({ text: 'Practice deep breathing to lower resting HR', priority: 'Medium', icon: 'fa-lungs' });
    if (formData.has_condition === '1') tips.push({ text: 'Keep medications accessible and track adherence', priority: 'High', icon: 'fa-prescription-bottle' });
    if (numeric(formData.age) > 55) tips.push({ text: 'Schedule annual cardiac screening', priority: 'Medium', icon: 'fa-calendar-check' });
    tips.push({ text: 'Stay hydrated and maintain balanced nutrition', priority: 'Low', icon: 'fa-glass-water' });
    return tips;
  }, [bmiCategory, bpCategory, formData.lifestyle_factor, formData.has_condition, formData.heart_rate, formData.age]);

  // ─── Radar Data ───────────────────────────────────────
  const radarData = useMemo(() => {
    const age = numeric(formData.age);
    const bmi = numeric(formData.bmi);
    const bp = numeric(formData.blood_pressure);
    const hr = numeric(formData.heart_rate);
    const normAge = Math.min(100, (age / 80) * 100);
    const normBMI = Math.min(100, (bmi / 35) * 100);
    const normBP = Math.min(100, (bp / 180) * 100);
    const normHR = Math.min(100, (hr / 120) * 100);
    const normLifestyle = formData.lifestyle_factor === 'Healthy' ? 20 : formData.lifestyle_factor === 'Average' ? 50 : 80;
    return [
      { label: 'Age', value: Math.round(normAge), color: '#6366F1' },
      { label: 'BMI', value: Math.round(normBMI), color: '#F97316' },
      { label: 'BP', value: Math.round(normBP), color: '#DC2626' },
      { label: 'Heart', value: Math.round(normHR), color: '#EC4899' },
      { label: 'Lifestyle', value: Math.round(normLifestyle), color: '#10B981' },
    ];
  }, [formData]);

  // ─── Risk Score ───────────────────────────────────────
  const riskScore = useMemo(() => {
    if (!result) return null;
    const score = numeric(result.risk_score || result.riskScore, null);
    if (score !== null) return Math.round(score);
    return result.risk_level === 'High' ? 78 : 32;
  }, [result]);

  const scoreColor = useMemo(() => {
    if (riskScore === null) return { color: '#9CA3AF', bg: '#F3F4F6' };
    if (riskScore >= 70) return { color: '#DC2626', bg: '#FEE2E2' };
    if (riskScore >= 40) return { color: '#F97316', bg: '#FFEDD5' };
    return { color: '#10B981', bg: '#D1FAE5' };
  }, [riskScore]);

  // ─── Submit ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowAiThinking(true);
    setActiveStep(-1);
    let step = 0;
    const runSteps = () => {
      if (step < ANALYSIS_STEPS.length) {
        setActiveStep(step);
        step++;
        stepsTimerRef.current = setTimeout(runSteps, ANALYSIS_STEPS[step]?.delay || 400);
      }
    };
    setTimeout(runSteps, 200);
    try {
      const res = await apiFetch('/v2/ml/health-risk', {
        method: 'POST', body: JSON.stringify({ ...formData, user_id: user?.id || null, fast: true }), timeoutMs: 15000
      });
      if (!res.ok) {
        const fallback = await apiFetch('/api/predict_health_risk', {
          method: 'POST', body: JSON.stringify({ ...formData, user_id: user?.id || null })
        });
        if (!fallback.ok) throw new Error(fallback.data?.error || fallback.data?.detail || 'Prediction failed');
        setResult(fallback.data || {});
      } else {
        setResult(res.data || {});
      }
      loadHistory();
      setActiveStep(ANALYSIS_STEPS.length - 1);
    } catch (err) {
      alert('Prediction Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAiInsight = async () => {
    if (!formData.symptoms && !result) return;
    setAiLoading(true);
    try {
      const query = `Provide a brief condition prediction and early warning advice for symptoms: ${formData.symptoms || 'none'}; vitals: age ${formData.age}, bmi ${formData.bmi}, bp ${formData.blood_pressure}, hr ${formData.heart_rate}.`;
      const res = await apiFetch('/v2/agents/ask', { method: 'POST', body: JSON.stringify({ query }) });
      if (res.ok) setAiInsight(res.data?.answer || 'No additional insights found.');
      else setAiInsight('AI insights unavailable right now.');
    } catch { setAiInsight('AI insights unavailable right now.'); }
    finally { setAiLoading(false); }
  };

  const handleSaveAssessment = () => {
    if (!result) return;
    setSaveMessage('Assessment saved ✓');
    setTimeout(() => setSaveMessage(''), 2000);
    loadHistory();
  };

  // ─── Voice Input ──────────────────────────────────────
  const toggleRecording = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (isRecording) { rec.stop(); setIsRecording(false); return; }
    setIsRecording(true);
    rec.start();
    rec.onresult = (event) => {
      const t = event.results[0][0].transcript;
      setVoiceTranscript(t);
      setFormData((prev) => ({ ...prev, symptoms: prev.symptoms ? `${prev.symptoms}, ${t}` : t }));
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
  };

  // ─── Symptom Chips ────────────────────────────────────
  const toggleSymptomChip = (symptom) => {
    setSymptomChips((prev) => {
      const exists = prev.includes(symptom);
      const next = exists ? prev.filter((s) => s !== symptom) : [...prev, symptom];
      setFormData((fd) => ({ ...fd, symptoms: next.join(', ') }));
      return next;
    });
  };
  const filteredSymptoms = useMemo(() => {
    if (!symptomInput) return SYMPTOM_DICT;
    return SYMPTOM_DICT.filter((s) => s.toLowerCase().includes(symptomInput.toLowerCase()));
  }, [symptomInput]);

  // ─── File Upload ──────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadStatus('Uploading...');
    setTimeout(() => { setUploadStatus('AI analysis complete (demo mode)'); }, 1500);
  };

  // ─── Counters ─────────────────────────────────────────
  const animatedScore = useCountUp(riskScore ?? 0);
  const healthyDays = useCountUp(history.length > 0 ? Math.round(history.filter((h) => h.risk_level !== 'High').length / history.length * 100) : 0);

  // ─── History Chart Data ───────────────────────────────
  const historyChartData = useMemo(() => {
    const items = history.slice(-12);
    return items.map((h) => ({ label: new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: h.risk_score || 50 }));
  }, [history]);

  return (
    <div className="space-y-6">
      {/* ═══ FLOATING AI STATUS BAR ═══ */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm border border-indigo-100/60 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold text-gray-700">AI Ready</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Clinical Model', value: 'Loaded', color: '#10B981' },
            { label: 'Knowledge Base', value: 'Ready', color: '#6366F1' },
            { label: 'OCR', value: 'Available', color: '#06B6D4' },
            { label: 'Speech', value: 'Ready', color: '#8B5CF6' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/70 border border-gray-100">
              <span className="text-[8px] text-gray-400">{s.label}:</span>
              <span className="text-[8px] font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PATIENT INPUT — FULL WIDTH ═══ */}
      <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <DashboardCard>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-stethoscope" /></div>
              <div><p className="font-bold text-gray-800 text-sm">Patient Information</p><p className="text-[10px] text-gray-400">Enter health metrics — AI predicts instantly</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleRecording}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isRecording ? 'bg-red-100 text-red-500 shadow-[0_0_12px_rgba(220,38,38,0.2)]' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                title={isRecording ? 'Stop recording' : 'Voice input symptoms'}>
                <i className={`fas fa-microphone ${isRecording ? 'animate-pulse-slow' : ''}`} />
              </button>
            </div>
          </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledInput label="Age" name="age" type="number" placeholder="45" icon="fa-calendar" value={formData.age} onChange={handleChange} hint="Years" aiComment={numeric(formData.age) >= 60 ? 'Above 60 — monitor closely' : ''} />
                <LabeledInput label="BMI" name="bmi" type="number" placeholder="28.5" icon="fa-weight" value={formData.bmi} onChange={handleChange} hint="18.5-24.9" aiComment={bmiComment} />
                <LabeledInput label="Systolic BP" name="blood_pressure" type="number" placeholder="120" icon="fa-heartbeat" value={formData.blood_pressure} onChange={handleChange} hint="<120 mmHg" aiComment={bpComment} />
                <LabeledInput label="Heart Rate" name="heart_rate" type="number" placeholder="75" icon="fa-heart" value={formData.heart_rate} onChange={handleChange} hint="60-100 BPM" aiComment={hrComment} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2"><i className="fas fa-notes-medical text-[11px] text-gray-400" /> Existing Conditions</label>
                  <select name="has_condition" value={formData.has_condition} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none cursor-pointer">
                    <option value="1">Yes (Diabetes, Hypertension, etc.)</option>
                    <option value="0">No / None</option>
                  </select>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2"><i className="fas fa-person-walking text-[11px] text-gray-400" /> Lifestyle</label>
                  <select name="lifestyle_factor" value={formData.lifestyle_factor} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none cursor-pointer">
                    <option value="Sedentary">Sedentary (Low Activity)</option>
                    <option value="Average">Average</option>
                    <option value="Healthy">Active / Athletic</option>
                    <option value="Unhealthy">Unhealthy Habits</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <label className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2"><i className="fas fa-notes-medical text-[11px] text-gray-400" /> Symptoms<span className="text-[9px] font-normal text-gray-400 ml-auto">Click to add</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {filteredSymptoms.map((s) => (
                    <button key={s} type="button" onClick={() => toggleSymptomChip(s)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 border ${symptomChips.includes(s) ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-600'}`}>
                      {s}{symptomChips.includes(s) && <i className="fas fa-check ml-1 text-[8px]" />}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type="text" value={symptomInput} onChange={(e) => setSymptomInput(e.target.value)} placeholder="Type to search symptoms..." className="w-full px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  {symptomInput && filteredSymptoms.length === 0 && (
                    <button type="button" onClick={() => { toggleSymptomChip(symptomInput); setSymptomInput(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 font-semibold hover:text-blue-700">+ Add</button>
                  )}
                </div>
                {voiceTranscript && <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1"><i className="fas fa-voice-lock text-[9px] text-emerald-500" /> "{voiceTranscript}"</p>}
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <label className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2"><i className="fas fa-file-upload text-[11px] text-gray-400" /> Medical Report Upload<span className="text-[9px] font-normal text-gray-400 ml-auto">PDF, Image</span></label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-dashed border-gray-300 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                  <i className="fas fa-cloud-upload-alt text-gray-400" />
                  <span className="text-xs text-gray-500">{uploadedFile ? uploadedFile.name : 'Drop or click to upload report'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.dcm" onChange={handleFileUpload} className="hidden" />
                </label>
                {uploadStatus && <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1"><i className="fas fa-circle-check text-emerald-400" /> {uploadStatus}</p>}
              </div>
              <button type="submit" disabled={loading}
                className={`mt-5 w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-[0.98] ${loading ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-[0_0_25px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 shadow-lg'}`}>
                {loading ? <span className="flex items-center justify-center gap-2"><i className="fas fa-spinner fa-spin" /> AI Running Analysis...</span> : <span className="flex items-center justify-center gap-2"><i className="fas fa-robot" /> Calculate Health Risk</span>}
              </button>
            </form>
          </DashboardCard>
        </div>

      {/* ═══ TOP ROW: AI Score + Vitals Radar + AI Thinking ═══ */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* AI HEALTH SCORE */}
        <DashboardCard className="flex flex-col items-center justify-center py-8">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Health Score</p>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor.color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - (riskScore ?? 0) / 100)}`}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums transition-colors duration-700" style={{ color: scoreColor.color }}>
                {riskScore !== null ? animatedScore : '--'}
              </p>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">{riskScore === null ? 'No data' : riskScore >= 70 ? 'Critical' : riskScore >= 40 ? 'Moderate' : 'Good'}</p>
            </div>
            <div className="absolute inset-0 rounded-full animate-ping-slow opacity-20" style={{ backgroundColor: scoreColor.color, animationDelay: '1s' }} />
          </div>
          {riskScore !== null && (
            <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
              <span className="text-[10px] text-gray-500">Healthy days:</span>
              <span className="text-xs font-bold text-emerald-600">{healthyDays}%</span>
            </div>
          )}
        </DashboardCard>

        {/* VITALS RADAR */}
        <DashboardCard className="py-6">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">Vitals Overview</p>
          <div className="px-4">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {radarData.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <div className="relative w-full h-12 rounded-lg overflow-hidden" style={{ backgroundColor: `${item.color}12` }}>
                    <div className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-700" style={{ height: `${item.value}%`, backgroundColor: `${item.color}25` }} />
                  </div>
                  <span className="text-[9px] font-medium text-gray-400">{item.label}</span>
                  <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 space-y-2">
            {[
              { label: 'BMI', value: formData.bmi, cat: bmiCategory, cls: bmiCategory === 'Obese' || bmiCategory === 'Overweight' ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50' },
              { label: 'BP', value: `${formData.blood_pressure} mmHg`, cat: bpCategory, cls: bpCategory === 'High' ? 'text-red-600 bg-red-50' : bpCategory === 'Elevated' ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50' },
              { label: 'HR', value: `${formData.heart_rate} BPM`, cat: numeric(formData.heart_rate) > 100 ? 'High' : numeric(formData.heart_rate) < 60 ? 'Low' : 'Normal', cls: numeric(formData.heart_rate) > 100 ? 'text-red-600 bg-red-50' : numeric(formData.heart_rate) < 60 ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50' },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50/50">
                <span className="text-[11px] text-gray-500">{r.label}: {r.value}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.cls}`}>{r.cat}</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* AI THINKING PANEL */}
        <DashboardCard className="py-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <i className="fas fa-brain text-[9px] text-indigo-500" /> AI Analysis Engine
            </p>
            {(showAiThinking || loading) && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
            )}
          </div>
          <div className="px-4 space-y-1.5">
            {ANALYSIS_STEPS.map((step, i) => (
              <div key={step.text} className={`flex items-center gap-2.5 transition-all duration-300 ${i <= activeStep ? 'opacity-100' : 'opacity-20'}`}
                style={{ transform: i <= activeStep ? 'translateX(0)' : 'translateX(-8px)' }}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] transition-all duration-300 ${i < activeStep ? 'bg-emerald-100 text-emerald-600' : i === activeStep ? 'bg-indigo-100 text-indigo-600 animate-pulse-slow' : 'bg-gray-100 text-gray-400'}`}>
                  <i className={`fas ${i < activeStep ? 'fa-check' : step.icon}`} />
                </div>
                <span className={`text-[11px] transition-colors duration-300 ${i <= activeStep ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{step.text}</span>
                {i === activeStep && (
                  <span className="inline-flex gap-0.5 ml-auto">
                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </span>
                )}
              </div>
            ))}
            {!showAiThinking && !loading && <p className="text-xs text-gray-400 italic pt-2">Enter vitals above to start analysis...</p>}
          </div>
        </DashboardCard>
      </div>

      {/* RESULTS SECTION */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-chart-line" /></div>
                <p className="font-bold text-gray-800 text-sm">AI Prediction</p>
              </div>
              <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${riskScore >= 70 ? 'bg-red-50 text-red-600' : riskScore >= 40 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{result.risk_level} Risk</span>
            </div>
            {riskScore !== null && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Risk Score</span><span className="font-bold" style={{ color: scoreColor.color }}>{riskScore}%</span></div>
                <ProgressBar value={Math.min(100, Math.max(0, riskScore))} colorClass={scoreColor.color === '#DC2626' ? 'bg-red-500' : scoreColor.color === '#F97316' ? 'bg-orange-500' : 'bg-emerald-500'} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-100"><p className="text-gray-400">BMI</p><p className="font-semibold text-gray-800">{formData.bmi} ({bmiCategory})</p></div>
              <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-100"><p className="text-gray-400">BP</p><p className="font-semibold text-gray-800">{formData.blood_pressure} ({bpCategory})</p></div>
            </div>
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Risk Drivers</p>
              {riskDrivers.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {riskDrivers.map((d) => (<span key={d} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">{d}</span>))}
                </div>
              ) : <p className="text-[10px] text-gray-400">No significant risk drivers.</p>}
            {result?.drivers?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {result.drivers.map((d) => (
                  <span key={`ml-${d}`} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">{d}</span>
                ))}
              </div>
            )}
            </div>
            {result?.explanation && (
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <p className="text-[10px] font-semibold text-indigo-600 mb-1 flex items-center gap-1"><i className="fas fa-robot text-[9px]" /> AI Explanation</p>
                <p className="text-xs text-gray-600">{result.explanation}</p>
              </div>
            )}
          </DashboardCard>
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-list-check" /></div>
                <p className="font-bold text-gray-800 text-sm">Recommendations</p>
              </div>
              <span className="text-[9px] text-gray-400">{recommendations.length} items</span>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-gray-50 ${rec.priority === 'High' ? 'bg-red-50/30 border border-red-100/50' : rec.priority === 'Medium' ? 'bg-amber-50/30 border border-amber-100/50' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] shrink-0 ${rec.priority === 'High' ? 'bg-red-100 text-red-600' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}><i className={`fas ${rec.icon}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700">{rec.text}</p>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${rec.priority === 'High' ? 'text-red-500 bg-red-50' : rec.priority === 'Medium' ? 'text-amber-500 bg-amber-50' : 'text-gray-400 bg-gray-100'}`}>{rec.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-lightbulb" /></div>
                <p className="font-bold text-gray-800 text-sm">AI Insights</p>
              </div>
              <button type="button" onClick={handleAiInsight} disabled={aiLoading} className="text-[10px] font-semibold text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50">
                {aiLoading ? <><i className="fas fa-spinner fa-spin mr-1" /> Analyzing...</> : 'Generate \u2192'}
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 min-h-[80px]">
              {aiInsight ? <p className="text-xs text-gray-600 leading-relaxed">{aiInsight}</p> : (
                <div className="text-center">
                  <i className="fas fa-robot text-2xl text-purple-200 mb-2" />
                  <p className="text-[11px] text-gray-400">Generate AI insights based on your vitals and symptoms.</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={handleSaveAssessment} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"><i className="fas fa-floppy-disk mr-1" /> Save Assessment</button>
              {saveMessage && <span className="text-[10px] text-emerald-600 font-semibold animate-fade-in">{saveMessage}</span>}
            </div>
            {result?.meta && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Model Details</p>
                {Number.isFinite(result.meta.confidence) && (
                  <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-gray-500">Confidence</span><span className="text-[10px] font-bold text-emerald-600">{Math.round(result.meta.confidence * 100)}%</span></div>
                )}
                {Array.isArray(result.meta.reasoning) && result.meta.reasoning.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[9px] text-gray-400 mb-1">Reasoning</p>
                    <ul className="space-y-0.5">
                      {result.meta.reasoning.map((r, i) => (<li key={i} className="flex gap-1.5 text-[10px] text-gray-600"><span className="text-gray-300 shrink-0">•</span><span>{r}</span></li>))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </DashboardCard>
        </div>
      )}

      {/* HEALTH TIMELINE */}
      {history.length > 0 && (
        <DashboardCard className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white text-xs shadow-sm"><i className="fas fa-clock-rotate-left" /></div>
              <div><p className="font-bold text-gray-800 text-sm">Health Timeline</p><p className="text-[10px] text-gray-400">{history.length} assessments</p></div>
            </div>
          </div>
          {historyChartData.length > 1 && (
            <div className="mb-6"><GradientAreaChart data={historyChartData} title="Risk Score Trend" height={160} lineColor="rgba(99,102,241,0.8)" /></div>
          )}
          <div className="space-y-2">
            {history.slice(-6).reverse().map((entry, i) => {
              const colors = riskColor(entry.risk_level);
              return (
                <div key={entry.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-gray-50 animate-fade-in-up`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: colors.bg, color: colors.color }}><i className="fas fa-file-medical" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{entry.risk_level} Risk</p>
                    <p className="text-[10px] text-gray-400">{new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}{entry.bmi && ` \u2022 BMI ${entry.bmi}`}{entry.blood_pressure && ` \u2022 BP ${entry.blood_pressure}`}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold" style={{ color: colors.color }}>{entry.risk_score ?? '--'}</span>
                    <div className="mt-0.5"><span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors.color }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>
      )}
    </div>
  );
};

export default HealthRiskCalculator;