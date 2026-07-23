/**
 * LifeLink Data Export Utilities
 *
 * Provides client-side CSV and Excel export for any tabular data.
 * Uses dynamic import() for optional xlsx dependency.
 *
 * Usage:
 *   import { exportCSV, exportExcel } from '../utils/dataExport';
 *   exportCSV(myData, { filename: 'report.csv' });
 */

/**
 * Export data as CSV file and trigger download.
 */
export function exportCSV(data, options = {}) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const {
    filename = 'export.csv',
    columns,
    columnLabels = {},
    formatValue,
  } = options;

  const cols = columns || Object.keys(data[0]);

  // Header row
  const headerRow = cols
    .map((col) => columnLabels[col] || col)
    .map(escapeCSV)
    .join(',');

  // Resolve nested property paths (e.g., 'patient.name' -> row.patient.name)
  const getNestedValue = (obj, path) => {
    if (!path.includes('.')) return obj[path];
    return path.split('.').reduce((o, key) => (o !== null && o !== undefined ? o[key] : undefined), obj);
  };

  // Data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = getNestedValue(row, col);
        if (formatValue) {
          const formatted = formatValue(value, col, row);
          if (formatted !== undefined) return escapeCSV(formatted);
        }
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return escapeCSV(JSON.stringify(value));
        return escapeCSV(String(value));
      })
      .join(',')
  );

  const csv = [headerRow, ...rows].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

/**
 * Export data as Excel (XLSX) file.
 * Falls back to CSV if xlsx package is not available.
 */
export async function exportExcel(data, options = {}) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const {
    filename = 'export.xlsx',
    sheetName = 'Sheet1',
    columns,
    columnLabels = {},
  } = options;

  try {
    const XLSX = await import('xlsx');

    const cols = columns || Object.keys(data[0]);
    const headerRow = cols.map((col) => columnLabels[col] || col);
    const getNestedValue = (obj, path) => {
      if (!path.includes('.')) return obj[path];
      return path.split('.').reduce((o, key) => (o !== null && o !== undefined ? o[key] : undefined), obj);
    };

    const dataRows = data.map((row) =>
      cols.map((col) => {
        const value = getNestedValue(row, col);
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      })
    );

    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([buffer], { type: 'application/octet-stream' }), filename);
  } catch {
    console.warn('xlsx not available, falling back to CSV');
    exportCSV(data, { ...options, filename: filename.replace('.xlsx', '.csv') });
  }
}

/**
 * Convenience function to trigger export with format selection.
 */
export function triggerExport({ data, filename = 'export', format = 'csv' }) {
  if (format === 'xlsx') {
    exportExcel(data, { filename: `${filename}.xlsx` });
  } else {
    exportCSV(data, { filename: `${filename}.csv` });
  }
}

// ── Helpers ────────────────────────────────────────────────

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
