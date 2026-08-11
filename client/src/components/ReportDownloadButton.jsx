/**
 * LifeLink Report Download Button
 *
 * Reusable component that generates and downloads PDF reports.
 * Uses the backend WeasyPrint-based report API.
 *
 * Usage:
 *   <ReportDownloadButton
 *     endpoint="/api/reports/hospital/daily-ops"
 *     data={hospitalMetrics}
 *     filename="daily_ops.pdf"
 *     label="Download Daily Ops Report"
 *     variant="primary"
 *   />
 */

import React, { useState } from 'react';
import { apiFetch } from '../config/api';

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-slate-200',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * @param {object} props
 * @param {string} props.endpoint - API endpoint to POST to (e.g., '/api/reports/hospital/daily-ops')
 * @param {object} props.data - Data payload to send to the report generator
 * @param {string} props.filename - Suggested filename for download
 * @param {string} [props.label='Download Report'] - Button label
 * @param {string} [props.variant='primary'] - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {string} [props.icon='fa-download'] - Font Awesome icon class
 * @param {boolean} [props.disabled=false] - Disable button
 * @param {function} [props.onComplete] - Called when download completes
 */
const ReportDownloadButton = ({
  endpoint,
  data,
  filename = 'report.pdf',
  label = 'Download Report',
  variant = 'primary',
  size = 'md',
  icon = 'fa-download',
  disabled = false,
  onComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    if (!endpoint || !data) {
      setError('Missing endpoint or data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // POST to backend API to generate report
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('lifelink_token') || localStorage.getItem('lifelink_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Report generation failed (${res.status})`);
      }

      // Get the PDF blob and trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLoading(false);
      onComplete?.();
    } catch (err) {
      console.error('Report download error:', err);
      setError(err.message || 'Failed to generate report');
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={handleDownload}
        disabled={disabled || loading}
        className={`
          inline-flex items-center gap-2 rounded-lg font-semibold
          transition-all duration-200
          hover:-translate-y-0.5 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${VARIANTS[variant] || VARIANTS.primary}
          ${SIZES[size] || SIZES.md}
        `}
      >
        {loading ? (
          <>
            <i className="fas fa-spinner fa-spin"></i>
            Generating...
          </>
        ) : (
          <>
            <i className={`fas ${icon}`}></i>
            {label}
          </>
        )}
      </button>
      {error && (
        <span className="mt-1 text-xs text-red-600">{error}</span>
      )}
    </div>
  );
};

export default ReportDownloadButton;
