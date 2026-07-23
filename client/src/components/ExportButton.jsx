/**
 * Reusable Export Button Component
 *
 * Wraps dataExport utilities with a dropdown for CSV/Excel format selection.
 *
 * Usage:
 *   <ExportButton data={myArray} filename="patients" label="Export" />
 *   <ExportButton data={myArray} filename="report" label="Download" columns={['id','name']} columnLabels={{ id: 'ID', name: 'Name' }} />
 */
import React, { useState } from 'react';
import { exportCSV, exportExcel } from '../utils/dataExport';

const ExportButton = ({
  data,
  filename = 'export',
  label = 'Export',
  columns,
  columnLabels = {},
  formatValue,
  sheetName = 'Sheet1',
  variant = 'default',
  size = 'sm',
  disabled = false,
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const doExport = async (format) => {
    if (!data || data.length === 0) return;
    setExporting(true);
    setShowMenu(false);
    try {
      if (format === 'xlsx') {
        await exportExcel(data, { filename: `${filename}.xlsx`, sheetName, columns, columnLabels });
      } else {
        exportCSV(data, { filename: `${filename}.csv`, columns, columnLabels, formatValue });
      }
    } finally {
      setExporting(false);
    }
  };

  const baseClasses = 'inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg transition-all duration-200';
  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    ghost: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50',
  };
  const sizeClasses = {
    xs: 'px-2 py-1',
    sm: 'px-2.5 py-1.5',
    md: 'px-3 py-2',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || exporting || !data || data.length === 0}
        className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${sizeClasses[size] || sizeClasses.sm} disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95`}
        title={!data || data.length === 0 ? 'No data to export' : `Export ${data.length} rows`}
      >
        {exporting ? (
          <i className="fas fa-spinner fa-spin"></i>
        ) : (
          <i className="fas fa-download"></i>
        )}
        <span className="hidden sm:inline">{exporting ? 'Exporting...' : label}</span>
        <i className={`fas fa-chevron-down text-[10px] transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}></i>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px] animate-fade-in">
            <button
              type="button"
              onClick={() => doExport('csv')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <i className="fas fa-file-csv text-green-600"></i>
              Export as CSV
            </button>
            <button
              type="button"
              onClick={() => doExport('xlsx')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <i className="fas fa-file-excel text-green-700"></i>
              Export as Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
