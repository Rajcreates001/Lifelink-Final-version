import React, { useState, useRef, useEffect } from 'react';

const decisionActions = [
  { icon: 'fa-bed', label: 'Reallocate beds', desc: 'Optimize bed distribution across departments', confidence: 0.92 },
  { icon: 'fa-users', label: 'Optimize staffing', desc: 'AI-recommended shift adjustments for tonight', confidence: 0.88 },
  { icon: 'fa-chart-line', label: 'Predict admissions', desc: 'Forecast tomorrow\'s admission volume by department', confidence: 0.94 },
  { icon: 'fa-file-alt', label: 'Generate report', desc: 'Create executive summary for morning briefing', confidence: 0.97 },
  { icon: 'fa-tools', label: 'Schedule maintenance', desc: 'Prioritize equipment maintenance based on usage', confidence: 0.85 },
  { icon: 'fa-bell', label: 'Notify department heads', desc: 'Alert relevant departments about detected bottlenecks', confidence: 0.91 },
];

const naturalResponses = {
  'icu': 'ICU is overloaded at 91% occupancy with 8 critical patients. Root causes: 3 post-surgery complications, 2 emergency admissions from Accident Block, 1 cardiac arrest. Recommended actions: Transfer 2 stable patients to General Ward, activate 1 additional ICU nurse. Predicted relief in 4-6 hours.',
  'emergency': 'Emergency department is managing 18 active cases with 3 critical. Current wait time is 12 minutes. Incoming: 4 ambulances within next 15 minutes. Suggestion: Activate overflow team and prepare 3 additional beds.',
  'revenue': "Yesterday's revenue was $284,500 (target: $320,000). Variance of -11.1%. Primary cause: 14% reduction in elective surgeries due to equipment maintenance. Insurance claims processing delay of 2.3 days. Suggestion: Fast-track 12 pending claims worth $85,000.",
  'default': "I've analyzed the hospital's current state. Key findings: \n\n1. **Emergency** queue predicted to exceed capacity in 47 minutes - activate overflow team (98% confidence)\n2. **ICU** occupancy at 91% - transfer 2 stable patients to General Ward\n3. **Revenue leakage** of $38K detected in equipment rental billing\n\nWould you like me to deep-dive into any specific area?",
};

const ExecutiveDecisionCenter = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const inputRef = useRef(null);

  const handleAsk = (question) => {
    setActiveQuestion(question);
    setIsAnalyzing(true);
    setResponse(null);
    setQuery(question);

    // Simulate AI analysis
    setTimeout(() => {
      const q = question.toLowerCase();
      let answer;
      if (q.includes('icu') || q.includes('overload') || q.includes('overloaded') || q.includes('capacity')) {
        answer = naturalResponses.icu;
      } else if (q.includes('emergency') || q.includes('queue') || q.includes('wait')) {
        answer = naturalResponses.emergency;
      } else if (q.includes('revenue') || q.includes('finance') || q.includes('cost') || q.includes('money')) {
        answer = naturalResponses.revenue;
      } else {
        answer = naturalResponses.default;
      }
      setResponse(answer);
      setIsAnalyzing(false);
    }, 1800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    handleAsk(query.trim());
  };

  const frequentQuestions = [
    'Why is ICU overloaded?',
    'Predict tomorrow\'s emergency volume',
    'What caused yesterday\'s revenue drop?',
    'Which department needs more nurses?',
    'Generate board meeting report',
  ];

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-brain text-violet-500"></i>
            Executive Decision Center
          </h3>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">
            <i className="fas fa-robot text-[8px]"></i>
            AI Powered
          </span>
        </div>
      </div>

      <div className="p-3">
        {/* Natural language input */}
        <form onSubmit={handleSubmit} className="relative mb-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-300 transition-all duration-200">
            <div className="pl-3 pr-0">
              <i className="fas fa-search text-slate-400 text-xs"></i>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about hospital operations..."
              className="flex-1 py-2.5 px-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 bg-transparent border-none outline-none"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !query.trim()}
              className="px-3 py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-1">
                  <i className="fas fa-spinner animate-spin text-[10px]"></i>
                  Analyzing
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <i className="fas fa-arrow-right text-[10px]"></i>
                  Ask AI
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {frequentQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              disabled={isAnalyzing}
              className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* AI Response */}
        {isAnalyzing && (
          <div className="px-3 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-200 flex items-center justify-center">
                <i className="fas fa-robot text-[10px] text-violet-600"></i>
              </div>
              <div className="flex-1">
                <div className="h-2.5 bg-violet-200 rounded w-3/4 mb-1.5"></div>
                <div className="h-2 bg-violet-100 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        )}

        {response && !isAnalyzing && (
          <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 animate-fade-in mb-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="fas fa-robot text-[10px] text-violet-600"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-medium">{response}</p>
                <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="px-1.5 py-0.5 rounded bg-white text-indigo-500 font-semibold border border-indigo-100">
                    <i className="fas fa-brain text-[7px] mr-0.5"></i>
                    92% confidence
                  </span>
                  <span>Sources: 4 internal databases</span>
                  <span>• 124ms response</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Decision Actions Grid */}
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-2">
            <i className="fas fa-bolt text-amber-400 text-[9px] mr-1"></i>
            Would you like me to...
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {decisionActions.map((action, idx) => (
              <button
                key={idx}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 active:scale-95 transition-all duration-200 text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-200 transition-colors">
                  <i className={`fas ${action.icon} text-xs`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-700 truncate">{action.label}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-slate-400 truncate">{action.desc}</span>
                    <span className="text-[8px] font-bold text-indigo-500">{Math.round(action.confidence * 100)}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDecisionCenter;
