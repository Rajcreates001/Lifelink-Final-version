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
 *
 * @returns {{ data, loading, error, refetch, setData }}
 */
export function useApiData(url, options = {}) {
    const {
        method = 'GET',
        body = null,
        enabled = true,
        pollInterval = 0,
        cacheKey = null,
        transform = null,
        deps = [],
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!enabled || !url) return;

        // Cancel previous request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const fetchOptions = { method };
            if (body && method !== 'GET') {
                fetchOptions.body = JSON.stringify(body);
            }

            const res = await apiFetch(url, fetchOptions);

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
            if (mountedRef.current) setLoading(false);
        }
    }, [url, method, body, enabled, transform, ...deps]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        fetchData();
        return () => { mountedRef.current = false; };
    }, [fetchData]);

    // Polling
    useEffect(() => {
        if (!pollInterval || !enabled) return;
        const interval = setInterval(fetchData, pollInterval);
        return () => clearInterval(interval);
    }, [pollInterval, fetchData, enabled]);

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

    const mutate = useCallback(async (body) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch(url, { method, body: JSON.stringify(body) });
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
