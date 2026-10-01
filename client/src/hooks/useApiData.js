import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../config/api';

/**
 * useApiData — Reusable hook for fetching data from backend APIs.
 *
 * @param {string} url - API endpoint path (e.g. '/api/hospital-ops/staff')
 * @param {object} options
 * @param {string} options.method - HTTP method (default: 'GET')
 * @param {object} options.body - Request body for POST/PUT/PATCH
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @param {number} options.pollInterval - Auto-refresh interval in ms (0 = no polling)
 * @param {string} options.cacheKey - Optional cache key for deduplication
 * @param {Function} options.transform - Transform response data before setting
 * @param {DependencyList} options.deps - Extra dependencies that trigger refetch
 * @param {boolean} options.silentPoll - Poll in the background without flipping
 *   the loading flag (prevents loading-spinner flicker every tick).
 *
 * @returns {{ data, loading, error, refetch, setData }}
 */
export function useApiData(url, options = {}) {
    const {
        method = 'GET',
        body = null,
        enabled = true,
        pollInterval = 0,
        _cacheKey = null,
        transform = null,
        deps = [],
        silentPoll = true,
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);
    const mountedRef = useRef(true);
    const pollTimerRef = useRef(null);

    // Serialize the request identity (url/body) without making it a new object
    // every render — a new `body` object literal in options used to recreate
    // `fetchData` on every render, and because the initial-fetch effect depends
    // on `fetchData`, that caused an INFINITE fetch loop (constant network
    // churn, rapid state oscillation, and heavy UI lag).
    const bodyKey = body == null ? '' : JSON.stringify(body);

    const fetchData = useCallback(async (opts = {}) => {
        if (!enabled || !url) return;

        // Skip if a request for the same url is already in flight
        if (abortRef.current) {
            if (opts?.force) {
                abortRef.current.abort();
            } else {
                return;
            }
        }
        const controller = new AbortController();
        abortRef.current = controller;

        if (!opts?.silent) setLoading(true);
        setError(null);

        try {
            const fetchOptions = { method };
            if (body && method !== 'GET') {
                fetchOptions.body = JSON.stringify(body);
            }

            const res = await apiFetch(url, { ...fetchOptions, signal: controller.signal });

            if (!mountedRef.current || controller.signal.aborted) return;

            if (res.ok) {
                let result = res.data;
                // Handle nested data (res.data.data pattern)
                if (result && typeof result === 'object' && result.data && !result.status) {
                    result = result.data;
                }
                if (transform) result = transform(result);
                setData(result);
            } else {
                setError(res.data?.error || `HTTP ${res.status}`);
            }
        } catch (err) {
            if (!mountedRef.current || err.name === 'AbortError') return;
            setError(err.message || 'Network error');
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
            if (mountedRef.current) setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-provided dep list is spread by design
    }, [url, method, bodyKey, enabled, transform, ...deps]);

    // Initial fetch — runs once per stable fetchData identity
    useEffect(() => {
        mountedRef.current = true;
        fetchData();
        return () => { mountedRef.current = false; };
    }, [fetchData]);

    // Polling via self-scheduling timeout (never overlaps requests) and
    // paused whenever the tab is hidden — background tabs kept hammering the
    // API every couple of seconds and starved the visible UI.
    useEffect(() => {
        if (!pollInterval || !enabled) return undefined;

        let stopped = false;

        const schedule = () => {
            if (stopped) return;
            pollTimerRef.current = setTimeout(async () => {
                if (typeof document !== 'undefined' && document.hidden) {
                    schedule(); // skip tick while tab is hidden
                    return;
                }
                await fetchData({ silent: silentPoll });
                schedule();
            }, pollInterval);
        };
        schedule();

        const onVisibility = () => {
            // Fire an immediate refresh when returning to a visible tab
            if (!document.hidden && pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
                fetchData({ silent: silentPoll }).then(schedule);
            }
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
        }

        return () => {
            stopped = true;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
            }
        };
    }, [pollInterval, enabled, fetchData, silentPoll]);

    return { data, loading, error, refetch: fetchData, setData };
}

/**
 * useApiMutation — Hook for POST/PUT/PATCH/DELETE operations.
 *
 * @returns {{ mutate, loading, error, data }}
 */
export function useApiMutation(url, options = {}) {
    const { method = 'POST', onSuccess, onError } = options;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(async (payload) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
            if (res.ok) {
                setData(res.data);
                onSuccess?.(res.data);
                return res.data;
            } else {
                const err = res.data?.error || `HTTP ${res.status}`;
                setError(err);
                onError?.(err);
                return null;
            }
        } catch (err) {
            setError(err.message);
            onError?.(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [url, method, onSuccess, onError]);

    return { mutate, loading, error, data };
}

export default useApiData;
