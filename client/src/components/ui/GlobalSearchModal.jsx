import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../config/api';

/**
 * GlobalSearchModal — Ctrl+K / Cmd+K global search across all dashboards.
 * Searches patients, hospitals, ambulances, incidents, and more.
 * Categorized results with keyboard navigation.
 */

const ENTITY_ICONS = {
  patient: { icon: 'fa-user-injured', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  hospital: { icon: 'fa-hospital', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  ambulance: { icon: 'fa-truck-medical', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/40' },
  incident: { icon: 'fa-triangle-exclamation', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  alert: { icon: 'fa-bell', color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/40' },
  staff: { icon: 'fa-user-nurse', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  report: { icon: 'fa-file-alt', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  default: { icon: 'fa-circle', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const getEntityStyle = (type) => ENTITY_ICONS[type] || ENTITY_ICONS.default;

const QuickAction = ({ icon, label, shortcut, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all duration-150 group"
  >
    <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-xs group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
      <i className={`fas ${icon} text-slate-400 group-hover:text-indigo-500`} />
    </span>
    <span className="flex-1 text-left font-medium">{label}</span>
    {shortcut && (
      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded">
        {shortcut}
      </kbd>
    )}
  </button>
);

const GlobalSearchModal = ({ open, onClose, userRole }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lifelink_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selected = listRef.current.children[selectedIndex];
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, results.length]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = useCallback(async (searchQuery) => {
    setLoading(true);
    try {
      const res = await apiFetch('/v2/search', {
        method: 'POST',
        body: JSON.stringify({
          query: searchQuery,
          mode: 'quick',
          max_results: 15,
        }),
      });
      if (res.ok && res.data) {
        const rawResults = [];
        // Parse categorized results
        const data = res.data;
        if (data.results) {
          Object.entries(data.results).forEach(([category, items]) => {
            if (Array.isArray(items)) {
              items.forEach((item) => {
                rawResults.push({
                  id: item._id || item.id || `${category}-${rawResults.length}`,
                  type: category.replace(/s$/, ''), // plural -> singular
                  title: item.name || item.title || item.patientName || item.patient || item.message || 'Untitled',
                  subtitle: item.address || item.location || item.status || item.role || item.emergencyType || '',
                  detail: item.description || item.condition || item.type || '',
                  route: getRouteForEntity(category, item, userRole),
                });
              });
            }
          });
        }
        // Add AI answer if available
        if (data.answer || data.ai_summary) {
          rawResults.unshift({
            id: 'ai-answer',
            type: 'default',
            title: 'AI Summary',
            subtitle: data.answer || data.ai_summary || '',
            detail: '',
            route: null,
            isAiAnswer: true,
          });
        }
        setResults(rawResults.slice(0, 15));
        setSelectedIndex(0);
      }
    } catch (err) {
      // Search failed silently
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  const getRouteForEntity = (category, item, role) => {
    const base = role === 'hospital' ? '/dashboard/hospital'
      : role === 'government' ? '/dashboard/government'
      : role === 'ambulance' ? '/dashboard/ambulance'
      : '/dashboard/public';

    switch (category.toLowerCase()) {
      case 'hospitals': return `${base}/resource-management`;
      case 'alerts':
      case 'incidents': return `${base}/emergency-command-center`;
      case 'ambulances': return `${base}/ambulance-coordination`;
      case 'users': return `${base}/staff-management`;
      default: return null;
    }
  };

  const handleSelectResult = (result) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    try { localStorage.setItem('lifelink_recent_searches', JSON.stringify(newRecent)); } catch { /* ignore */ }

    if (result.route) {
      navigate(result.route);
    }
    onClose();
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'emergency': navigate('/dashboard/hospital/emergency-command-center'); break;
      case 'patients': navigate('/dashboard/hospital/global-overview'); break;
      case 'ambulances': navigate('/dashboard/ambulance/mission-overview'); break;
      case 'reports': navigate('/dashboard/hospital/reports'); break;
      default: break;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[640px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-down-fade"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
          <i className="fas fa-search text-slate-400 dark:text-slate-500 text-sm" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-200 border-t-indigo-600" />
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded">
            ESC
          </kbd>
        </div>

        {/* Results or Quick Actions */}
        <div className="max-h-[400px] overflow-y-auto" ref={listRef}>
          {query.trim().length < 2 ? (
            /* Quick Actions when no query */
            <div className="p-3">
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('search.recent')}</p>
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(search)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left"
                    >
                      <i className="fas fa-clock-rotate-left text-xs text-slate-300 dark:text-slate-600" />
                      {search}
                    </button>
                  ))}
                </div>
              )}
              <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('search.quick_actions')}</p>
              <QuickAction icon="fa-triangle-exclamation" label={t('search.emergency_command')} shortcut="E" onClick={() => handleQuickAction('emergency')} />
              <QuickAction icon="fa-user-injured" label={t('search.patient_overview')} shortcut="P" onClick={() => handleQuickAction('patients')} />
              <QuickAction icon="fa-truck-medical" label={t('search.ambulance_tracking')} shortcut="A" onClick={() => handleQuickAction('ambulances')} />
              <QuickAction icon="fa-file-alt" label={t('hospital.reports')} shortcut="R" onClick={() => handleQuickAction('reports')} />
            </div>
          ) : results.length > 0 ? (
            /* Search Results */
            <div className="p-2">
              {results.map((result, i) => {
                const style = getEntityStyle(result.type);
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-100 ${
                      i === selectedIndex
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg}`}>
                      <i className={`fas ${style.icon} text-xs ${style.color}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {result.isAiAnswer && <span className="text-indigo-500 mr-1">✨</span>}
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{result.subtitle}</p>
                      )}
                      {result.detail && !result.isAiAnswer && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{result.detail}</p>
                      )}
                      {result.isAiAnswer && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 font-medium uppercase flex-shrink-0 mt-1">{result.type}</span>
                  </button>
                );
              })}
            </div>
          ) : !loading ? (
            /* No Results */
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <i className="fas fa-search text-3xl text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('search.no_results')} "{query}"</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">{t('search.try_searching')}</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px]">↑↓</kbd> {t('search.navigate')}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px]">↵</kbd> {t('search.select')}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px]">esc</kbd> {t('search.close')}</span>
          </div>
          <span className="text-[10px] text-slate-300 dark:text-slate-600">{t('search.powered_by')}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
