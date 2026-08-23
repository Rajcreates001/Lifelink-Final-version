import React, { useState } from 'react';

export const HospitalRadiologyAIInsights = () => {
    const [text, setText] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setLoading(true);
        try {
            const res = await apiFetch('/api/analyze_report', {
                method: 'POST',
                body: JSON.stringify({ report_text: text })
            });
            setResult(res.ok ? res.data : { error: res.data?.error || 'Analysis failed' });
        } catch (err) {
            setResult({ error: 'Analysis failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardCard className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI Scan Insights</h3>
            <form onSubmit={handleAnalyze} className="space-y-3">
                <textarea
                    className="w-full p-3 border rounded min-h-[120px]"
                    placeholder="Paste scan notes for AI summary"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button className="bg-purple-600 text-white rounded px-4 py-2" type="submit" disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze'}
                </button>
            </form>
            {result && (
                <div className="mt-4 border rounded p-3 bg-white/70">
                    {result.error ? (
                        <p className="text-sm text-red-600">{result.error}</p>
                    ) : (
                        <div>
                            <p className="font-semibold text-gray-800">{result.summary}</p>
                            <p className="text-xs text-gray-500">Risk: {result.risk_level || 'Unknown'} ({result.risk_score || 0})</p>
                        </div>
                    )}
                </div>
            )}
        </DashboardCard>
    );
};
