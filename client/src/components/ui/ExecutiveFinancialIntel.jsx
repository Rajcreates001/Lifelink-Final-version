import React, { useState, useEffect } from 'react';

const initialFinancialData = {
  todayRevenue: 284500,
  expectedRevenue: 320000,
  insuranceClaims: 84,
  pendingPayments: 1240000,
  revenueLeakage: 38000,
  avgCostPerPatient: 1240,
  resourceWaste: 4.2,
  monthlyForecast: 7850000,
  departmentProfitability: [
    { dept: 'Emergency', revenue: 142000, cost: 98000, profit: 44000 },
    { dept: 'ICU', revenue: 98000, cost: 72000, profit: 26000 },
    { dept: 'Cardiology', revenue: 124000, cost: 74000, profit: 50000 },
    { dept: 'Radiology', revenue: 88000, cost: 62000, profit: 26000 },
    { dept: 'Surgery', revenue: 210000, cost: 134000, profit: 76000 },
    { dept: 'Pharmacy', revenue: 156000, cost: 112000, profit: 44000 },
  ],
};

const ExecutiveFinancialIntel = () => {
  const [data, setData] = useState(initialFinancialData);
  const [expandedDept, setExpandedDept] = useState(null);

  // Simulate live drift
  useEffect(() => {
    const t = setInterval(() => {
      setData((prev) => ({
        ...prev,
        todayRevenue: prev.todayRevenue + Math.round((Math.random() - 0.4) * 2000),
        insuranceClaims: Math.max(60, prev.insuranceClaims + Math.round((Math.random() - 0.5) * 3)),
        revenueLeakage: Math.max(10000, prev.revenueLeakage + Math.round((Math.random() - 0.5) * 1000)),
        resourceWaste: Math.max(1, +(prev.resourceWaste + (Math.random() - 0.5) * 0.3).toFixed(1)),
      }));
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const formatCurrency = (val) =>
    val >= 1000000
      ? `$${(val / 1000000).toFixed(1)}M`
      : val >= 1000
        ? `$${(val / 1000).toFixed(0)}K`
        : `$${val.toLocaleString()}`;

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <i className="fas fa-coins text-emerald-500"></i>
            Financial Intelligence
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">
            <i className="fas fa-sync-alt text-[8px] mr-1"></i>Live
          </span>
        </div>
      </div>

      <div className="p-3">
        {/* Top-level financial metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="bg-white/60 rounded-xl border border-white/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Today's Revenue</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(data.todayRevenue)}</p>
            <p className="text-[10px] text-slate-400">Expected: {formatCurrency(data.expectedRevenue)}</p>
          </div>
          <div className="bg-white/60 rounded-xl border border-white/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Insurance Claims</p>
            <p className="text-lg font-bold text-blue-600">{data.insuranceClaims}</p>
            <p className="text-[10px] text-slate-400">Pending processing</p>
          </div>
          <div className="bg-white/60 rounded-xl border border-white/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Pending Payments</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(data.pendingPayments)}</p>
            <p className="text-[10px] text-slate-400">
              <i className="fas fa-exclamation-triangle text-amber-500 text-[8px] mr-0.5"></i>
              Revenue leakage: {formatCurrency(data.revenueLeakage)}
            </p>
          </div>
          <div className="bg-white/60 rounded-xl border border-white/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Monthly Forecast</p>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(data.monthlyForecast)}</p>
            <p className="text-[10px] text-slate-400">
              Avg cost/patient: {formatCurrency(data.avgCostPerPatient)}
            </p>
          </div>
        </div>

        {/* Department profitability */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Department Profitability</p>
            <span className="text-[10px] text-slate-400 font-medium">
              <i className="fas fa-lightbulb text-amber-400 text-[8px] mr-1"></i>
              AI suggests: Optimize Radiology procurement
            </span>
          </div>
          <div className="space-y-1.5">
            {data.departmentProfitability.map((dept, idx) => {
              const margin = dept.revenue > 0 ? Math.round((dept.profit / dept.revenue) * 100) : 0;
              const maxRevenue = Math.max(...data.departmentProfitability.map((d) => d.revenue));
              const barWidth = (dept.revenue / maxRevenue) * 100;
              const isExpanded = expandedDept === idx;

              return (
                <div key={dept.dept}>
                  <div
                    onClick={() => setExpandedDept(isExpanded ? null : idx)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-slate-700">{dept.dept}</span>
                        <span className={`text-[10px] font-bold ${
                          margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {margin}% margin
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            margin >= 30 ? 'bg-emerald-400' : margin >= 15 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-slate-400">
                          Rev: {formatCurrency(dept.revenue)} | Cost: {formatCurrency(dept.cost)}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-600">
                          {formatCurrency(dept.profit)}
                        </span>
                      </div>
                    </div>
                    <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}></i>
                  </div>

                  {isExpanded && (
                    <div className="ml-3 mr-3 px-3 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100/50 mb-1.5 animate-fade-in">
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        <i className="fas fa-robot text-indigo-400"></i>
                        <span>
                          <strong>AI Insight:</strong> {dept.dept} shows{' '}
                          {margin >= 30
                            ? 'strong profitability. Consider increasing capacity.'
                            : margin >= 15
                              ? 'moderate margins. Review supply chain costs.'
                              : 'low margins. Recommend cost optimization audit.'
                          }
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-white text-indigo-500 font-semibold border border-indigo-100">
                          Confidence: {75 + Math.round(Math.random() * 20)}%
                        </span>
                        <span>Suggested: {dept.dept === 'Radiology' ? 'Negotiate equipment lease' : 'Review staffing ratios'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Suggestion strip */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50">
          <i className="fas fa-wand-magic-sparkles text-amber-500 text-sm"></i>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-amber-800">
              AI Financial Suggestion
            </p>
            <p className="text-[10px] text-amber-700">
              Revenue leakage of {formatCurrency(data.revenueLeakage)} detected in equipment rental billing. 
              Cross-check 12 pending claims against insurance policy coverage to recover ~$22K.
            </p>
          </div>
          <button onClick={() => alert('Opening financial review: Cross-checking 12 pending claims against insurance policy coverage.')} className="text-[10px] font-bold text-amber-700 bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all duration-200 whitespace-nowrap">
            Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveFinancialIntel;
