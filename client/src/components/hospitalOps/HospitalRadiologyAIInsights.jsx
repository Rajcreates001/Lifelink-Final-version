import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DashboardCard } from '../Common';

// Typical radiology findings so the panel can be demonstrated without typing.
const SAMPLE_NOTES = [
    {
        label: 'CT Chest — viral pneumonia',
        text: 'CT chest: bilateral ground-glass opacities in both lower lobes with mild pleural effusion. No pneumothorax. SpO2 89% on room air. Findings suggest viral (COVID-19) pneumonia.',
    },
    {
        label: 'CT Head — road accident',
        text: 'Non-contrast CT head after road traffic accident: small acute subdural haematoma over the left parietal region, 6 mm midline shift, no skull fracture. GCS 12. BP 150/95.',
    },
    {
        label: 'X-ray — femur fracture',
        text: 'X-ray right thigh: displaced mid-shaft fracture of the right femur with mild soft tissue swelling. Heart rate 118, haemoglobin 9.8 g/dL after blood loss.',
    },
    {
        label: 'Ultrasound — abdomen',
        text: 'Ultrasound abdomen: enlarged liver with fatty infiltration, gallbladder normal, no free fluid. Fasting glucose 182 mg/dL, cholesterol 245 mg/dL.',
    },
];

const riskColor = (level) => (
    level === 'Critical' || level === 'High' ? 'bg-red-100 text-red-700'
        : level === 'Moderate' || level === 'Medium' ? 'bg-amber-100 text-amber-700'
            : 'bg-emerald-100 text-emerald-700'
);

export const HospitalRadiologyAIInsights = () => {
    const [text, setText] = useState(SAMPLE_NOTES[0].text);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const analyze = useCallback(async (reportText, label = 'Manual entry') => {
        if (!reportText.trim()) return;
        setLoading(true);
        try {
            const res = await apiFetch('/api/analyze_report', {
                method: 'POST',
                body: JSON.stringify({ report_text: reportText })
            });
            const data = res.ok ? res.data : { error: res.data?.error || 'Analysis failed' };
            setResult(data);
            if (!data.error) {
                setHistory((h) => [{ label, level: data.risk_level, score: data.risk_score, at: new Date().toLocaleTimeString() }, ...h].slice(0, 6));
            }
        } catch (err) {
            setResult({ error: 'Analysis failed' });
        } finally {
            setLoading(false);
        }
    }, []);

    // Show a worked example on first open.
    useEffect(() => { analyze(SAMPLE_NOTES[0].text, SAMPLE_NOTES[0].label); }, [analyze]);

    const handleAnalyze = (e) => {
        e.preventDefault();
        analyze(text);
    };

    return (
        <div className="space-y-4">
            <DashboardCard className="animate-fade-in-up delay-100">
                <h3 className="text-lg font-bold text-gray-900 mb-1">AI Scan Insights</h3>
                <p className="text-xs text-gray-500 mb-4">Paste a radiology report or pick a sample. The NLP model extracts conditions, vitals and a risk score.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {SAMPLE_NOTES.map((s) => (
                        <button
                            key={s.label}
                            type="button"
                            onClick={() => { setText(s.text); analyze(s.text, s.label); }}
                            className="text-xs px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleAnalyze} className="space-y-3">
                    <textarea
                        className="w-full p-3 border rounded min-h-[110px] text-sm"
                        placeholder="Paste scan notes for AI summary"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button className="bg-purple-600 text-white rounded px-4 py-2" type="submit" disabled={loading}>
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </form>
            </DashboardCard>

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <DashboardCard className="lg:col-span-2">
                        {result.error ? (
                            <p className="text-sm text-red-600">{result.error}</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-gray-800">{result.summary}</p>
                                    <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${riskColor(result.risk_level)}`}>
                                        {result.risk_level || 'Unknown'} · {result.risk_score ?? 0}/100
                                    </span>
                                </div>
                                {result.detected_conditions?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">Detected conditions</p>
                                        <div className="space-y-1.5">
                                            {result.detected_conditions.map((c) => {
                                                const conf = result.disease_confidences?.[c] ?? 0;
                                                return (
                                                    <div key={c} className="flex items-center gap-2 text-sm">
                                                        <span className="w-32 text-gray-700">{c}</span>
                                                        <div className="flex-1 h-2 rounded bg-gray-100"><div className="h-2 rounded bg-purple-500" style={{ width: `${Math.min(100, conf)}%` }} /></div>
                                                        <span className="w-10 text-right text-xs text-gray-500">{conf}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {result.risk_flags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {result.risk_flags.map((f) => <span key={f} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-100">{f}</span>)}
                                    </div>
                                )}
                                {result.next_steps?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">Suggested next steps</p>
                                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                                            {result.next_steps.map((s) => <li key={s}>{s}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </DashboardCard>
                    <DashboardCard>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Analyses this session</p>
                        {history.length === 0 ? <p className="text-sm text-gray-400">None yet</p> : (
                            <div className="space-y-2">
                                {history.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1.5">
                                        <div>
                                            <p className="text-gray-800">{h.label}</p>
                                            <p className="text-[11px] text-gray-400">{h.at}</p>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${riskColor(h.level)}`}>{h.level} {h.score}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {result?.extracted_metrics && Object.keys(result.extracted_metrics).length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Extracted values</p>
                                {Object.entries(result.extracted_metrics).map(([k, v]) => (
                                    <p key={k} className="text-sm text-gray-700"><span className="capitalize">{k.replace(/_/g, ' ')}</span>: <b>{String(v)}</b></p>
                                ))}
                            </div>
                        )}
                    </DashboardCard>
                </div>
            )}
        </div>
    );
};
