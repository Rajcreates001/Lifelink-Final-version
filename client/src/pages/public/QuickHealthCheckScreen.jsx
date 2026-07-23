import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import MobileCard from '../../components/ui/MobileCard';
import PublicShell from './PublicShell';

const QuickHealthCheckScreen = ({ user, onBack, rightSlot }) => {
  const [form, setForm] = useState({ heart_rate: '', blood_pressure: '', oxygen: '', symptoms: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [docText, setDocText] = useState('');
  const [docName, setDocName] = useState('');
  const [docError, setDocError] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      const res = await apiFetch(`/api/health/risk/history/${user.id}`, { method: 'GET' });
      if (res.ok && Array.isArray(res.data?.data)) {
        setHistory(res.data.data.slice(0, 6));
      }
    };
    loadHistory();
  }, [user?.id]);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    const res = await apiFetch('/v2/ml/health-risk', {
      method: 'POST',
      body: JSON.stringify({
        heart_rate: form.heart_rate,
        blood_pressure: form.blood_pressure,
        oxygen: form.oxygen,
        symptoms: form.symptoms,
        user_id: user?.id || null,
        fast: true
      }),
      timeoutMs: 15000
    });
    if (res.ok) {
      setResult(res.data);
    }
    setLoading(false);
  };

  const handleAiAdvice = async () => {
    setAiLoading(true);
    try {
      const reportSnippet = docText ? `\n\nAttached report excerpt:\n${docText.slice(0, 2000)}` : '';
      const query = `Provide a short condition prediction and early warning tips for symptoms: ${form.symptoms || 'none'}, vitals: HR ${form.heart_rate}, BP ${form.blood_pressure}, O2 ${form.oxygen}.${reportSnippet}`;
      const res = await apiFetch('/v2/agents/ask', { method: 'POST', body: JSON.stringify({ query }) });
      if (res.ok) {
        setAiAdvice(res.data?.answer || 'No additional insights available.');
      } else {
        setAiAdvice('AI insights unavailable right now.');
      }
    } catch (err) {
      setAiAdvice('AI insights unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDocUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDocError('');
    setDocName(file.name);
    try {
      if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) {
        const text = await file.text();
        if (!text.trim()) {
          setDocError('Unable to extract text from this file. Try a text-based report.');
          setDocText('');
          return;
        }
        setDocText(text);
      } else {
        setDocError('Only text-based documents can be analyzed in mobile view right now.');
        setDocText('');
      }
    } catch (err) {
      setDocError('Unable to read this file.');
      setDocText('');
    }
  };

  return (
    <PublicShell title="Quick Health Check" onBack={onBack} rightSlot={rightSlot}>
      <div className="space-y-4">
        <MobileCard className="animate-fade-in-up delay-100">
          <p className="text-sm font-semibold text-slate-700">Digital Health ID</p>
          <div className="mt-2 text-xs text-slate-500">
            <p>Name: <span className="font-semibold text-slate-800">{user?.name || 'User'}</span></p>
            <p>Blood Group: <span className="font-semibold text-slate-800">{user?.bloodGroup || 'Not set'}</span></p>
            <p>Location: <span className="font-semibold text-slate-800">{user?.location || 'Unknown'}</span></p>
          </div>
        </MobileCard>
        <div className="grid grid-cols-1 gap-3 animate-fade-in-up delay-200">
          <input className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-200" placeholder="Heart rate" value={form.heart_rate} onChange={(e) => setForm({ ...form, heart_rate: e.target.value })} />
          <input className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-200" placeholder="Blood pressure" value={form.blood_pressure} onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })} />
          <input className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-200" placeholder="Oxygen %" value={form.oxygen} onChange={(e) => setForm({ ...form, oxygen: e.target.value })} />
          <textarea className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-200" rows={3} placeholder="Symptoms" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
        </div>
        <button onClick={handleSubmit} disabled={loading} className="w-full rounded-2xl bg-emerald-600 text-white font-bold py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-60">
          {loading ? 'Analyzing...' : 'Check Risk'}
        </button>
        {result && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 animate-fade-in-up delay-300">
            <p className="text-sm font-semibold text-slate-700">Risk Level</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{result.risk_level}</p>
            <p className="text-xs text-slate-500 mt-1">Score: {result.risk_score}</p>
          </div>
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 animate-fade-in-up delay-400">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">AI Condition Insight</p>
            <button onClick={handleAiAdvice} disabled={aiLoading} className="text-xs font-semibold text-emerald-600 transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              {aiLoading ? 'Analyzing…' : 'Generate'}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-full cursor-pointer transition-all duration-200 hover:bg-slate-200 active:scale-95">
              Upload report
              <input type="file" className="hidden" accept=".txt,.md,.csv,.json" onChange={handleDocUpload} />
            </label>
            {docName && <span className="text-[11px] text-slate-500">{docName}</span>}
          </div>
          {docError && <p className="text-xs text-rose-600 mt-2 animate-shake">{docError}</p>}
          <p className="text-xs text-slate-500 mt-2">{aiAdvice || 'Generate a quick AI suggestion for your symptoms.'}</p>
        </div>
        {history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 animate-fade-in-up delay-500">
            <p className="text-sm font-semibold text-slate-700">Health Trend</p>
            <div className="flex items-end gap-2 mt-3">
              {history.map((entry, idx) => (
                <div key={entry._id || entry.id} className="flex-1 animate-bar-rise" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div
                    className="w-full bg-emerald-200 rounded-sm transition-all duration-500 hover:bg-emerald-400"
                    style={{ height: `${Math.min(80, Math.max(12, entry.risk_score || 20))}px` }}
                  ></div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Last {history.length} checks</p>
          </div>
        )}
      </div>
    </PublicShell>
  );
};

export default QuickHealthCheckScreen;
