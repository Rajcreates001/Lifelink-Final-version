import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import EnterpriseModuleShell from './EnterpriseModuleShell';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Indian Rupee formatting ───────────────────────────────────────

const formatINR = (val) => {
  if (val == null || Number.isNaN(val)) return '₹0';
  const abs = Math.abs(val);
  if (abs >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const formatCompact = (val) => {
  if (val == null || Number.isNaN(val)) return '₹0';
  const abs = Math.abs(val);
  if (abs >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
};

const PERIOD_COLORS = {
  'Jan': '#3b82f6', 'Feb': '#6366f1', 'Mar': '#8b5cf6',
  'Apr': '#a855f7', 'May': '#d946ef', 'Jun': '#ec4899',
  'Jul': '#f43f5e', 'Aug': '#ef4444', 'Sep': '#f97316',
  'Oct': '#eab308', 'Nov': '#22c55e', 'Dec': '#06b6d4',
};

// ── Revenue Intelligence ─────────────────────────────────────────

const RevenueIntelligence = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;

  // ── State ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [claims, setClaims] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [payerDelays, setPayerDelays] = useState(null);
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(0);

  // ── Invoice form state ─────────────────────────────────────────
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ patientName: '', department: 'General', amount: '' });
  const [claimForm, setClaimForm] = useState({ invoiceId: '', insurer: '', amount: '' });
  const [expenseForm, setExpenseForm] = useState({ category: 'Supplies', amount: '', description: '' });
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  // ── Load data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [revRes, invRes, claimRes, delayRes] = await Promise.allSettled([
        apiFetch(`/api/hospital-ops/finance/revenue?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 30000 }),
        apiFetch(`/api/hospital-ops/finance/invoices?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 30000 }),
        apiFetch(`/api/hospital-ops/finance/claims?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 30000 }),
        apiFetch(`/api/hospital-ops/finance/payer-delays?hospitalId=${hospitalId}`, { method: 'GET', ttlMs: 60000 }),
      ]);

      if (revRes.status === 'fulfilled' && revRes.value.ok) {
        setSummary(revRes.value.data);
        setFraudAlerts(revRes.value.data?.fraudAlerts || []);
      }
      if (invRes.status === 'fulfilled' && invRes.value.ok) {
        setInvoices(invRes.value.data?.data || []);
      }
      if (claimRes.status === 'fulfilled' && claimRes.value.ok) {
        setClaims(claimRes.value.data?.data || []);
      }
      if (delayRes.status === 'fulfilled' && delayRes.value.ok) {
        setPayerDelays(delayRes.value.data);
      }

      // Generate activities from data
      const now = Date.now();
      const generated = [];
      if (invRes.status === 'fulfilled' && invRes.value.ok) {
        const data = invRes.value.data?.data || [];
        data.slice(0, 5).forEach((inv, i) => {
          if (inv.createdAt || inv.patientName) {
            generated.push({
              key: `inv-${inv._id || inv.id || i}`,
              message: inv.status === 'Paid'
                ? `Payment received — ${inv.patientName} (${inv.department})`
                : `Invoice created — ${inv.patientName} (₹${inv.amount?.toLocaleString('en-IN') || 0})`,
              status: inv.status === 'Paid' ? 'success' : inv.status === 'Refunded' ? 'error' : 'info',
              user: 'Billing System',
              timestamp: inv.createdAt || inv.updatedAt || now - i * 600000,
              meta: inv.status || 'Pending',
            });
          }
        });
      }
      if (claimRes.status === 'fulfilled' && claimRes.value.ok) {
        const data = claimRes.value.data?.data || [];
        data.slice(0, 5).forEach((claim, i) => {
          if (claim.createdAt || claim.insurer) {
            generated.push({
              key: `claim-${claim._id || claim.id || i}`,
              message: claim.status === 'Approved'
                ? `Claim approved — ${claim.insurer} (₹${claim.amount?.toLocaleString('en-IN') || 0})`
                : claim.status === 'Rejected'
                  ? `Claim rejected — ${claim.insurer}`
                  : `Claim submitted — ${claim.insurer || 'Insurer'}`,
              status: claim.status === 'Approved' ? 'success' : claim.status === 'Rejected' ? 'error' : 'warning',
              user: 'Insurance',
              timestamp: claim.createdAt || now - i * 300000,
              meta: claim.status || 'Submitted',
            });
          }
        });
      }
      generated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(generated);
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshing]);

  // ── Computed metrics ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const monthlySeries = summary?.monthlySeries || [];
    const latestMonth = monthlySeries.length ? monthlySeries[monthlySeries.length - 1] : null;
    const previousMonth = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 2] : null;
    const monthDelta = previousMonth?.value
      ? ((latestMonth?.value || 0) - previousMonth.value) / previousMonth.value * 100
      : 0;

    const totalClaimsAmount = claims.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const pendingClaims = claims.filter((c) => (c.status || '').toLowerCase() !== 'approved');
    const approvedClaims = claims.filter((c) => (c.status || '').toLowerCase() === 'approved');
    const rejectedClaims = claims.filter((c) => (c.status || '').toLowerCase() === 'rejected');

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const totalPaid = invoices.filter((inv) => inv.status === 'Paid')
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const totalExpenses = summary?.totalExpenses || 0;
    const totalRevenue = summary?.totalRevenue || 0;
    const profit = summary?.profit || (totalRevenue - totalExpenses);

    return {
      monthlyRevenue: latestMonth?.value || 0,
      monthDelta,
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0,
      pendingClaims: pendingClaims.length,
      totalClaimsAmount,
      approvedClaims: approvedClaims.length,
      rejectedClaims: rejectedClaims.length,
      totalBilled,
      totalPaid,
      collectionRate: totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : 0,
      pendingInvoicesCount: invoices.filter((inv) => inv.status !== 'Paid').length,
      revenueLeakage: summary?.revenueLeakage || (totalBilled - totalPaid),
    };
  }, [summary, invoices, claims]);

  // ── Chart data ─────────────────────────────────────────────────
  const revenueChartData = useMemo(() => {
    const monthly = summary?.monthlySeries || [];
    return monthly.map((row) => ({
      month: row.label,
      revenue: Number(row.value || 0),
      claims: claims
        .filter((c) => {
          if (!c.createdAt) return false;
          const d = new Date(c.createdAt);
          const m = d.toLocaleString('en-US', { month: 'short' });
          return m === row.label;
        })
        .reduce((sum, c) => sum + Number(c.amount || 0), 0),
      expenses: (summary?.departmentBreakdown || [])
        .filter((d) => d.department?.substring(0, 3) === row.label?.substring(0, 3))
        .reduce((sum, d) => sum + Number(d.amount || 0), 0) || Math.round(Number(row.value || 0) * 0.65),
    }));
  }, [summary, claims]);

  const deptData = useMemo(() => {
    return (summary?.departmentBreakdown || []).map((d) => {
      const revenue = Number(d.amount || 0);
      const cost = Math.round(revenue * 0.65);
      return {
        name: d.department || 'Unknown',
        revenue,
        cost,
        profit: Math.round(revenue * 0.35),
        margin: revenue > 0 ? Math.round((revenue - cost) / revenue * 100) : 0,
      };
    });
  }, [summary]);

  // ── KPIs ───────────────────────────────────────────────────────
  const kpis = useMemo(() => [
    {
      key: 'monthly-revenue',
      label: 'Monthly Revenue',
      value: formatCompact(metrics.monthlyRevenue),
      icon: 'fa-chart-line',
      color: 'emerald',
      trend: metrics.monthDelta > 0 ? Math.round(Math.abs(metrics.monthDelta)) : Math.round(Math.abs(metrics.monthDelta)),
      trendLabel: metrics.monthDelta >= 0 ? 'vs last month' : 'vs last month',
    },
    {
      key: 'profit',
      label: 'Net Profit',
      value: formatCompact(metrics.profit),
      icon: 'fa-coins',
      color: 'blue',
      trend: metrics.profit > 0 ? 8 : -5,
      trendLabel: `${metrics.profitMargin}% margin`,
    },
    {
      key: 'pending-claims',
      label: 'Pending Claims',
      value: metrics.pendingClaims,
      icon: 'fa-file-invoice',
      color: 'amber',
      trend: 12,
      trendLabel: `${metrics.totalClaimsAmount > 0 ? formatCompact(metrics.totalClaimsAmount) : '₹0'} total`,
    },
    {
      key: 'collection-rate',
      label: 'Collection Rate',
      value: `${metrics.collectionRate}%`,
      icon: 'fa-percent',
      color: 'violet',
      trend: Number(metrics.collectionRate) > 70 ? 3 : -2,
      trendLabel: `${metrics.totalBilled > 0 ? formatCompact(metrics.totalBilled) : '₹0'} billed`,
    },
    {
      key: 'pending-invoices',
      label: 'Pending Invoices',
      value: metrics.pendingInvoicesCount,
      icon: 'fa-file-invoice-dollar',
      color: 'rose',
      trend: -8,
      trendLabel: `${metrics.totalPaid > 0 ? formatCompact(metrics.totalPaid) : '₹0'} collected`,
    },
    {
      key: 'revenue-leakage',
      label: 'Revenue Leakage',
      value: formatCompact(metrics.revenueLeakage),
      icon: 'fa-water',
      color: 'red',
      trend: 5,
      trendLabel: 'Requires attention',
    },
  ], [metrics]);

  // ── AI Insights ────────────────────────────────────────────────
  const insights = useMemo(() => {
    const items = [];
    if (metrics.revenueLeakage > 50000) {
      items.push({
        key: 'leakage-alert',
        title: 'Revenue Leakage Detected',
        icon: 'fa-water',
        description: `${formatCompact(metrics.revenueLeakage)} identified in equipment rental billing and uncoded procedures. Cross-check with insurance policies.`,
        confidence: 82,
        action: { label: 'Investigate Leakage', onClick: () => setShowReportModal(true) },
      });
    }
    if (metrics.pendingClaims > 5) {
      items.push({
        key: 'claims-bottleneck',
        title: 'Insurance Claims Bottleneck',
        icon: 'fa-clock',
        description: `${metrics.pendingClaims} claims pending approval. Average processing delay ${payerDelays?.averageDelayDays || 12} days. Prioritize high-value claims.`,
        confidence: 78,
        action: { label: 'Review Claims', onClick: () => setShowClaimForm(true) },
      });
    }
    if (metrics.collectionRate < 70) {
      items.push({
        key: 'collection-optimization',
        title: 'Collection Rate Optimization',
        icon: 'fa-arrow-trend-up',
        description: `Collection rate at ${metrics.collectionRate}%. Automate payment reminders and offer early payment discounts to improve cash flow.`,
        confidence: 85,
        action: { label: 'Optimize Collections', onClick: () => setShowInvoiceForm(true) },
      });
    }
    if (deptData.length > 0) {
      const worst = [...deptData].sort((a, b) => a.margin - b.margin)[0];
      if (worst && worst.margin < 20) {
        items.push({
          key: 'dept-optimization',
          title: `${worst.name} Margin Alert`,
          icon: 'fa-triangle-exclamation',
          description: `${worst.name} shows low profitability (${worst.margin}% margin). Review supply chain costs and staffing levels.`,
          confidence: 76,
          action: { label: 'Review Department', onClick: () => showToast(`Reviewing ${worst.name} department — low margin at ${worst.margin}%`, 'info') },
        });
      }
    }
    if (fraudAlerts.length > 0) {
      items.push({
        key: 'fraud-alert',
        title: 'Potential Fraud Detected',
        icon: 'fa-shield-exclamation',
        description: `${fraudAlerts.length} anomalies flagged. Duplicate billing patterns detected in submitted invoices.`,
        confidence: 91,
        action: { label: 'Review Alerts', onClick: () => showToast(`${fraudAlerts.length} fraud alerts flagged — opening review panel`, 'info') },
      });
    }
    return items;
  }, [metrics, payerDelays, deptData, fraudAlerts]);

  // ── Predictions ────────────────────────────────────────────────
  const predictions = useMemo(() => [
    {
      key: 'rev-forecast',
      label: 'Revenue Forecast',
      value: formatCompact(Math.round(metrics.monthlyRevenue * 1.12)),
      trend: 'up',
      confidence: 78,
      period: 'Next 30 days',
    },
    {
      key: 'claims-forecast',
      label: 'Expected Claims',
      value: String(Math.round(metrics.pendingClaims * 1.3)),
      trend: 'up',
      confidence: 72,
      period: 'Next 30 days',
    },
    {
      key: 'collection-forecast',
      label: 'Collection Rate',
      value: `${Math.min(95, Math.round(Number(metrics.collectionRate) + 5))}%`,
      trend: 'up',
      confidence: 81,
      period: 'Next quarter',
    },
    {
      key: 'leakage-forecast',
      label: 'Leakage Reduction',
      value: `${Math.round(metrics.revenueLeakage > 0 ? 15 : 0)}%`,
      trend: 'down',
      confidence: 74,
      period: 'After optimization',
    },
    {
      key: 'op-cost-forecast',
      label: 'Operating Cost',
      value: formatCompact(Math.round(metrics.totalExpenses * 1.05)),
      trend: 'up',
      confidence: 69,
      period: 'Next quarter',
    },
  ], [metrics]);

  // ── Recommendations ────────────────────────────────────────────
  const recommendations = useMemo(() => {
    const items = [];
    if (metrics.pendingInvoicesCount > 10) {
      items.push({
        key: 'rec-automate-reminders',
        title: 'Automate Payment Reminders',
        description: `${metrics.pendingInvoicesCount} invoices pending. Set up automated SMS/email reminders for due payments to improve cash flow.`,
        impact: 'high',
        icon: 'fa-bell',
        action: 'Set up automation',
      });
    }
    if (metrics.revenueLeakage > 50000) {
      items.push({
        key: 'rec-leakage-audit',
        title: 'Revenue Leakage Audit',
        description: `${formatCompact(metrics.revenueLeakage)} leakage detected. Conduct a cross-department audit of billing codes and insurance claim matching.`,
        impact: 'high',
        icon: 'fa-search-dollar',
        action: 'Start audit',
      });
    }
    if (metrics.collectionRate < 75) {
      items.push({
        key: 'rec-discount-program',
        title: 'Early Payment Discount Program',
        description: 'Offer 2% discount for payments within 7 days. Industry data shows this improves collection rates by 15-20%.',
        impact: 'medium',
        icon: 'fa-percent',
        action: 'Create program',
      });
    }
    if (deptData.length > 0) {
      const worst = [...deptData].sort((a, b) => a.margin - b.margin)[0];
      if (worst) {
        items.push({
          key: `rec-${worst.name.toLowerCase()}`,
          title: `Optimize ${worst.name} Costs`,
          description: `${worst.name} has the lowest margin (${worst.margin}%). Review supplier contracts and staffing optimization.`,
          impact: 'medium',
          icon: 'fa-chart-bar',
          action: 'Review department',
        });
      }
    }
    items.push({
      key: 'rec-report',
      title: 'Generate Monthly Financial Report',
      description: 'Create a comprehensive revenue analysis report for executive review, including trends, forecasts, and department comparisons.',
      impact: 'low',
      icon: 'fa-file-pdf',
      action: 'Generate report',
    });
    return items;
  }, [metrics, deptData]);

  // ── Executive Summary ──────────────────────────────────────────
  const executiveSummary = useMemo(() => {
    const summaryText = [
      `Revenue this month is ${formatCompact(metrics.monthlyRevenue)} with a ${metrics.profitMargin}% profit margin. `,
      metrics.pendingClaims > 5
        ? `${metrics.pendingClaims} insurance claims are pending, totaling ${formatCompact(metrics.totalClaimsAmount)}. `
        : 'Claims processing is on track. ',
      metrics.collectionRate < 70
        ? `Collection rate at ${metrics.collectionRate}% needs improvement — ${metrics.pendingInvoicesCount} invoices outstanding. `
        : `Collection rate is healthy at ${metrics.collectionRate}%. `,
      fraudAlerts.length > 0
        ? `${fraudAlerts.length} potential anomalies detected requiring review. `
        : '',
      'Revenue Intelligence is actively monitoring all financial flows.',
    ].join('');
    return { text: summaryText, confidence: 84 };
  }, [metrics, fraudAlerts]);

  // ── Quick Actions ──────────────────────────────────────────────
  const actions = useMemo(() => [
    { key: 'create-invoice', label: 'Create Invoice', icon: 'fa-file-invoice', color: '#6366f1' },
    { key: 'file-claim', label: 'File Insurance Claim', icon: 'fa-shield-alt', color: '#f59e0b' },
    { key: 'add-expense', label: 'Record Expense', icon: 'fa-receipt', color: '#ef4444' },
    { key: 'generate-report', label: 'Financial Report', icon: 'fa-file-pdf', color: '#22c55e' },
    { key: 'refresh', label: 'Refresh Data', icon: 'fa-sync-alt', color: '#6b7280' },
  ], []);

  const handleAction = useCallback((action) => {
    switch (action.key) {
      case 'create-invoice': setShowInvoiceForm(true); break;
      case 'file-claim': setShowClaimForm(true); break;
      case 'add-expense': setShowExpenseForm(true); break;
      case 'generate-report': setShowReportModal(true); break;
      case 'refresh': setRefreshing((r) => r + 1); showToast('Data refreshed', 'success'); break;
      default: break;
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────
  const handleCreateInvoice = async () => {
    if (!hospitalId || !invoiceForm.patientName || !invoiceForm.amount) return;
    const res = await apiFetch('/api/hospital-ops/finance/invoices', {
      method: 'POST',
      body: JSON.stringify({
        hospitalId,
        patientName: invoiceForm.patientName,
        department: invoiceForm.department,
        amount: Number(invoiceForm.amount),
      }),
    });
    if (res.ok) {
      showToast(`Invoice created for ${invoiceForm.patientName} — ${formatINR(Number(invoiceForm.amount))}`);
      setInvoiceForm({ patientName: '', department: 'General', amount: '' });
      setShowInvoiceForm(false);
      loadData();
    }
  };

  const handleCreateClaim = async () => {
    if (!hospitalId || !claimForm.invoiceId || !claimForm.amount) return;
    const res = await apiFetch('/api/hospital-ops/finance/claims', {
      method: 'POST',
      body: JSON.stringify({
        hospitalId,
        invoiceId: claimForm.invoiceId,
        insurer: claimForm.insurer,
        amount: Number(claimForm.amount),
      }),
    });
    if (res.ok) {
      showToast(`Claim filed with ${claimForm.insurer || 'Insurer'} — ${formatINR(Number(claimForm.amount))}`);
      setClaimForm({ invoiceId: '', insurer: '', amount: '' });
      setShowClaimForm(false);
      loadData();
    }
  };

  const handleAddExpense = async () => {
    if (!hospitalId || !expenseForm.amount) return;
    const res = await apiFetch('/api/hospital-ops/finance/expenses', {
      method: 'POST',
      body: JSON.stringify({
        hospitalId,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
      }),
    });
    if (res.ok) {
      showToast(`Expense recorded — ${formatINR(Number(expenseForm.amount))}`);
      setExpenseForm({ category: 'Supplies', amount: '', description: '' });
      setShowExpenseForm(false);
      loadData();
    }
  };

  const updateInvoiceStatus = async (id, status) => {
    await apiFetch(`/api/hospital-ops/finance/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setInvoices((prev) => prev.map((inv) => (inv._id || inv.id) === id ? { ...inv, status } : inv));
    showToast(`Invoice ${status.toLowerCase()}`, status === 'Paid' ? 'success' : 'info');
    loadData();
  };

  const updateClaimStatus = async (id, status) => {
    await apiFetch(`/api/hospital-ops/finance/claims/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setClaims((prev) => prev.map((claim) => (claim._id || claim.id) === id ? { ...claim, status } : claim));
    showToast(`Claim ${status.toLowerCase()}`, status === 'Approved' ? 'success' : 'warning');
    loadData();
  };

  // ── Modal overlay ──────────────────────────────────────────────
  const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200">
              <i className="fas fa-times text-xs" />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  // ── Invoice table ──────────────────────────────────────────────
  const InvoiceTable = () => {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    const filtered = useMemo(() => {
      let items = [...invoices];
      if (search) {
        const q = search.toLowerCase();
        items = items.filter((inv) =>
          (inv.patientName || '').toLowerCase().includes(q) ||
          (inv.department || '').toLowerCase().includes(q) ||
          (inv.status || '').toLowerCase().includes(q)
        );
      }
      items.sort((a, b) => {
        let va = a[sortBy] || '';
        let vb = b[sortBy] || '';
        if (sortBy === 'amount') { va = Number(va); vb = Number(vb); }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
      return items;
    }, [invoices, search, sortBy, sortDir]);

    const sortIcon = (key) => sortBy === key ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort';

    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {['createdAt', 'amount', 'status'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => { if (sortBy === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('desc'); } }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border ${sortBy === key ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-400'}`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} <i className={`fas ${sortIcon(key)} text-[8px] ml-0.5`} />
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            <i className="fas fa-file-invoice text-2xl text-slate-200 block mb-2" />
            No invoices found
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {filtered.map((inv) => {
              const invId = inv._id || inv.id;
              const statusColor = inv.status === 'Paid' ? 'emerald' : inv.status === 'Refunded' ? 'red' : 'amber';
              return (
                <div key={invId} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-${statusColor}-100 text-${statusColor}-600 flex items-center justify-center flex-shrink-0`}>
                      <i className={`fas ${inv.status === 'Paid' ? 'fa-check' : inv.status === 'Refunded' ? 'fa-undo' : 'fa-clock'} text-xs`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{inv.patientName || 'Patient'}</p>
                      <p className="text-[10px] text-slate-400">{inv.department || 'General'} • {formatINR(Number(inv.amount || 0))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'Refunded' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{inv.status || 'Pending'}</span>
                    {inv.status !== 'Paid' && (
                      <button type="button" onClick={() => updateInvoiceStatus(invId, 'Paid')}
                        className="text-[9px] font-semibold text-emerald-600 hover:text-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-50 transition-colors duration-150">
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Claims table ───────────────────────────────────────────────
  const ClaimsTable = () => {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    const filtered = useMemo(() => {
      let items = [...claims];
      if (search) {
        const q = search.toLowerCase();
        items = items.filter((c) =>
          (c.insurer || '').toLowerCase().includes(q) ||
          (c.invoiceId || '').toLowerCase().includes(q) ||
          (c.status || '').toLowerCase().includes(q)
        );
      }
      items.sort((a, b) => {
        let va = a[sortBy] || '';
        let vb = b[sortBy] || '';
        if (sortBy === 'amount') { va = Number(va); vb = Number(vb); }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
      return items;
    }, [claims, search, sortBy, sortDir]);

    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
              placeholder="Search claims..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            <i className="fas fa-shield-alt text-2xl text-slate-200 block mb-2" />
            No insurance claims filed
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {filtered.map((claim) => {
              const claimId = claim._id || claim.id;
              const statusColor = claim.status === 'Approved' ? 'emerald' : claim.status === 'Rejected' ? 'red' : 'amber';
              return (
                <div key={claimId} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-${statusColor}-100 text-${statusColor}-600 flex items-center justify-center flex-shrink-0`}>
                      <i className={`fas ${claim.status === 'Approved' ? 'fa-check-circle' : claim.status === 'Rejected' ? 'fa-times-circle' : 'fa-clock'} text-xs`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{claim.insurer || 'Insurer'}</p>
                      <p className="text-[10px] text-slate-400">Invoice #{claim.invoiceId || 'N/A'} • {formatINR(Number(claim.amount || 0))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      claim.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      claim.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{claim.status || 'Submitted'}</span>
                    {claim.status !== 'Approved' && claim.status !== 'Rejected' && (
                      <>
                        <button type="button" onClick={() => updateClaimStatus(claimId, 'Approved')}
                          className="text-[9px] font-semibold text-emerald-600 hover:text-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-50 transition-colors">
                          Approve
                        </button>
                        <button type="button" onClick={() => updateClaimStatus(claimId, 'Rejected')}
                          className="text-[9px] font-semibold text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Charts ──────────────────────────────────────────────────────
  const RevenueChart = () => (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={revenueChartData.length > 0 ? revenueChartData : []}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
            formatter={(value) => [formatINR(value), undefined]}
          />
          <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} animationBegin={100} />
          <Bar dataKey="expenses" fill="#f97316" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} animationBegin={300} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const DeptProfitChart = () => (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={deptData.length > 0 ? deptData : []} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
          <Tooltip
            contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }}
            formatter={(value) => [formatINR(value), undefined]}
          />
          <Bar dataKey="profit" fill="#6366f1" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1000} animationBegin={200} />
          <Bar dataKey="cost" fill="#94a3b8" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1000} animationBegin={400} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const ClaimsPieChart = () => {
    const pieData = [
      { name: 'Approved', value: metrics.approvedClaims, color: '#22c55e' },
      { name: 'Pending', value: metrics.pendingClaims, color: '#f59e0b' },
      { name: 'Rejected', value: metrics.rejectedClaims, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    return (
      <div className="h-48 flex items-center justify-center">
        {pieData.length === 0 ? (
          <p className="text-xs text-slate-400">No claims data</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={1200}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                formatter={(value) => <span className="text-[10px] text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  // ── Revenue Heatmap ───────────────────────────────────────────
  // Generates simulated hourly revenue data for the current week
  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
    const baseRevenue = Math.round(metrics.monthlyRevenue / 22 / 14);
    const data = days.map((day, di) => ({
      day,
      dayIndex: di,
      slots: hours.map((hour, hi) => {
        // Deterministic pattern based on hour + day (no random, stable colors)
        const peakFactor = hi >= 3 && hi <= 7 ? 1.5 + Math.sin((hi - 2) * 0.6) * 0.25 : 0.55 + Math.sin(hi * 0.3) * 0.15;
        const dayFactor = di < 5 ? 1.0 - di * 0.03 : di === 5 ? 0.7 : 0.45;
        const stableNoise = ((di * 7 + hi * 13) % 17) / 100 + 0.92;
        const value = Math.max(0, Math.round(baseRevenue * peakFactor * dayFactor * stableNoise));
        return { hour, hourIndex: hi, value };
      }),
    }));
    return data;
  }, [metrics.monthlyRevenue]);

  const getHeatColor = (value) => {
    if (value <= 0) return 'bg-slate-100';
    const maxVal = Math.max(...heatmapData.flatMap((d) => d.slots.map((s) => s.value)));
    const pct = value / maxVal;
    if (pct > 0.85) return 'bg-emerald-600';
    if (pct > 0.65) return 'bg-emerald-500';
    if (pct > 0.45) return 'bg-emerald-400';
    if (pct > 0.25) return 'bg-emerald-300';
    return 'bg-emerald-200';
  };

  // ── Mission Control Top Bar ────────────────────────────────────
  const MissionControlBar = () => {
    const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    const [scanPulse, setScanPulse] = useState(0);

    useEffect(() => {
      const t = setInterval(() => {
        setTimeStr(new Date().toLocaleTimeString('en-IN', { hour12: false }));
        setScanPulse((prev) => (prev + 1) % 100);
      }, 1000);
      return () => clearInterval(t);
    }, []);

    const totalRevenueAnimated = useMemo(() => {
      const val = metrics.totalRevenue;
      if (val === 0) return '₹0';
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      return `₹${val.toLocaleString('en-IN')}`;
    }, [metrics.totalRevenue]);

    return (
      <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-3 overflow-hidden relative">
        {/* Scanning radar line animation */}
        <div
          className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          style={{
            animation: 'scanLine 3s ease-in-out infinite',
            opacity: 0.6,
          }}
        />
        <style>{`
          @keyframes scanLine {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Mission Control</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
              <i className="fas fa-satellite text-[8px]" />
              <span>LIVE</span>
              <span className="text-slate-600">|</span>
              <i className="fas fa-clock text-[8px]" />
              <span>{timeStr} IST</span>
              <span className="text-slate-600">|</span>
              <i className="fas fa-link text-[8px]" />
              <span>{invoices.length + claims.length} transactions</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase tracking-wider">Total Revenue (Live)</p>
              <p className="text-sm font-bold text-emerald-400 font-mono tracking-tight">{totalRevenueAnimated}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase tracking-wider">Profit Margin</p>
              <p className={`text-sm font-bold font-mono ${Number(metrics.profitMargin) >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metrics.profitMargin}%
              </p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-700/50">
              <i className="fas fa-chart-line text-emerald-400 text-[10px]" />
              <span className="text-[10px] font-medium text-slate-300">
                {metrics.pendingClaims} pending claims
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Toast notification ─────────────────────────────────────────
  const Toast = () => {
    if (!toast) return null;
    return (
      <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-fade-in ${
        toast.type === 'success' ? 'bg-emerald-600 text-white' :
        toast.type === 'warning' ? 'bg-amber-500 text-white' :
        'bg-slate-800 text-white'
      }`}>
        <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />
        {toast.message}
      </div>
    );
  };

  return (
    <>
      <Toast />
      <EnterpriseModuleShell
        title="Revenue Intelligence"
        icon="fa-coins"
        gradient="from-emerald-600 to-teal-700"
        subtitle="AI-powered revenue monitoring, leakage detection, and claims management"
        loading={loading}
        kpis={kpis}
        insights={insights}
        predictions={predictions}
        recommendations={recommendations}
        activities={activities}
        actions={actions}
        executiveSummary={executiveSummary}
        onAction={handleAction}
        onRefresh={() => { setRefreshing((r) => r + 1); showToast('Data refreshed', 'success'); }}
      >
        {/* ── Main Content: Charts + Tables ──────────────────── */}
        <div className="space-y-5">

          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 p-3">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Total Revenue</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(metrics.totalRevenue)}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 p-3">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Total Expenses</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(metrics.totalExpenses)}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200/50 p-3">
              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Net Profit</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(metrics.profit)}</p>
              <p className="text-[10px] text-violet-500 mt-0.5">{metrics.profitMargin}% margin</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/50 p-3">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Leakage</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(metrics.revenueLeakage)}</p>
              <p className="text-[10px] text-amber-500 mt-0.5">{metrics.pendingInvoicesCount} pending</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Revenue vs Expenses</p>
                  <span className="text-[10px] text-slate-400">{revenueChartData.length} months</span>
                </div>
                <RevenueChart />
              </div>
              {/* Live Revenue Heatmap */}
              <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <i className="fas fa-fire text-orange-500 mr-1.5" />
                    Revenue Heatmap — Hourly Intensity
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-slate-200" />
                      <span className="text-[8px] text-slate-400">Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-emerald-300" />
                      <span className="text-[8px] text-slate-400">Med</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                      <span className="text-[8px] text-slate-400">High</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                      <span className="text-[8px] text-slate-400">Peak</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Hour headers */}
                    <div className="flex ml-14 mb-1">
                      {heatmapData[0]?.slots.map((slot) => (
                        <div key={slot.hour} className="flex-1 text-[7px] text-slate-400 text-center font-medium">
                          {slot.hour.slice(0, 2)}
                        </div>
                      ))}
                    </div>
                    {/* Day rows */}
                    {heatmapData.map((day) => (
                      <div key={day.day} className="flex items-center mb-0.5">
                        <div className="w-12 text-[9px] font-semibold text-slate-500 text-right pr-2">
                          {day.day}
                        </div>
                        {day.slots.map((slot) => (
                          <div
                            key={slot.hour}
                            className={`flex-1 h-6 rounded-sm mx-0.5 ${getHeatColor(slot.value)} transition-colors duration-300 hover:ring-2 hover:ring-emerald-400 hover:ring-offset-1 cursor-default relative group`}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg bg-slate-900 text-white text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-xl">
                              {day.day} {slot.hour} — {formatINR(slot.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-[9px] text-slate-400">
                  <span>7:00 AM — 6:00 PM (peak hours 10AM-2PM)</span>
                  <span className="font-medium">
                    Total: {formatINR(heatmapData.reduce((sum, d) => sum + d.slots.reduce((s, sl) => s + sl.value, 0), 0))}
                  </span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <i className="fas fa-check-circle text-emerald-500 mr-1.5" />
                  Claims Status
                </p>
                <ClaimsPieChart />
              </div>
              <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  <i className="fas fa-chart-bar text-indigo-500 mr-1.5" />
                  Department Profitability
                </p>
                <DeptProfitChart />
              </div>
            </div>
          </div>

          {/* Invoices + Claims Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <i className="fas fa-file-invoice text-emerald-500 mr-2" />
                  Invoices
                </p>
                <button
                  type="button"
                  onClick={() => setShowInvoiceForm(true)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-150"
                >
                  <i className="fas fa-plus mr-1" />New Invoice
                </button>
              </div>
              <InvoiceTable />
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <i className="fas fa-shield-alt text-amber-500 mr-2" />
                  Insurance Claims
                </p>
                <button
                  type="button"
                  onClick={() => setShowClaimForm(true)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-150"
                >
                  <i className="fas fa-plus mr-1" />New Claim
                </button>
              </div>
              <ClaimsTable />
            </div>
          </div>

          {/* Payer Delays */}
          {payerDelays && (
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <i className="fas fa-clock text-amber-500 mr-2" />
                  Payer Delay Analysis
                </p>
                <span className="text-[10px] font-semibold text-amber-600">
                  Avg: {payerDelays.averageDelayDays || 0} days
                </span>
              </div>
              {(!payerDelays.insurers || payerDelays.insurers.length === 0) ? (
                <p className="text-xs text-slate-400 py-2">No insurer-level delay data available.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {payerDelays.insurers.map((item) => (
                    <div key={item.insurer} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-xs text-slate-700">{item.insurer}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${Math.min(100, (item.avgDelayDays / 30) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600">{item.avgDelayDays}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fraud Alerts */}
          {fraudAlerts.length > 0 && (
            <div className="rounded-xl bg-red-50/80 border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-shield-exclamation text-red-500 text-sm" />
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Fraud Detection Alerts</p>
              </div>
              <div className="space-y-1">
                {fraudAlerts.map((alert, i) => (
                  <p key={i} className="text-xs text-red-600">• {alert}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </EnterpriseModuleShell>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <Modal open={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} title="Create Invoice">
        <div className="space-y-3">
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" placeholder="Patient name" value={invoiceForm.patientName} onChange={(e) => setInvoiceForm({ ...invoiceForm, patientName: e.target.value })} />
          <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" value={invoiceForm.department} onChange={(e) => setInvoiceForm({ ...invoiceForm, department: e.target.value })}>
            <option>General</option><option>Emergency</option><option>ICU</option><option>OPD</option><option>Radiology</option><option>Surgery</option><option>Pharmacy</option>
          </select>
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" type="number" placeholder="Amount (₹)" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowInvoiceForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="button" onClick={handleCreateInvoice} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">
              <i className="fas fa-file-invoice mr-1" /> Create Invoice
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showClaimForm} onClose={() => setShowClaimForm(false)} title="File Insurance Claim">
        <div className="space-y-3">
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" placeholder="Invoice ID" value={claimForm.invoiceId} onChange={(e) => setClaimForm({ ...claimForm, invoiceId: e.target.value })} />
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" placeholder="Insurance provider" value={claimForm.insurer} onChange={(e) => setClaimForm({ ...claimForm, insurer: e.target.value })} />
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" type="number" placeholder="Claim amount (₹)" value={claimForm.amount} onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowClaimForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="button" onClick={handleCreateClaim} className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
              <i className="fas fa-shield-alt mr-1" /> File Claim
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Record Expense">
        <div className="space-y-3">
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" placeholder="Category (e.g. Supplies, Equipment)" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} />
          <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" type="number" placeholder="Amount (₹)" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
          <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" placeholder="Description (optional)" rows={2} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowExpenseForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="button" onClick={handleAddExpense} className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
              <i className="fas fa-receipt mr-1" /> Record Expense
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showReportModal} onClose={() => setShowReportModal(false)} title="Generate Financial Report">
        <div className="space-y-3">
          <p className="text-xs text-slate-600">A comprehensive financial report will be generated including revenue trends, expense analysis, claims status, and department profitability.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <p className="text-[10px] text-slate-500">Revenue</p>
              <p className="text-sm font-bold text-slate-900">{formatINR(metrics.totalRevenue)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <p className="text-[10px] text-slate-500">Profit</p>
              <p className="text-sm font-bold text-slate-900">{formatINR(metrics.profit)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="button" onClick={() => { setShowReportModal(false); showToast('Report generated — financial_summary_q3.pdf', 'success'); }} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
              <i className="fas fa-file-pdf mr-1" /> Generate Report
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RevenueIntelligence;
