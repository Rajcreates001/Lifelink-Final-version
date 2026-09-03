// Production: set VITE_API_URL in Vercel to your Render backend URL (e.g. https://your-app.onrender.com)
// Development: falls back to localhost:3001 if not set
const raw = import.meta.env.VITE_API_URL;
const devFallback = 'http://localhost:3001';
export const API_BASE_URL =
  typeof raw === 'string' && raw.trim() !== ''
    ? raw.replace(/\/+$/, '') // strip trailing slashes
    : import.meta.env.DEV
      ? devFallback
      : '';

export const getAuthToken = () => (
  sessionStorage.getItem('lifelink_token')
);

const responseCache = new Map();
const inflightRequests = new Map();
const DEFAULT_TTL_MS = 120000;
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_CACHE_SIZE = 200;


export const apiFetch = async (path, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_BASE_URL}${path}`;

  const useCache = method === 'GET' && options.cache !== 'no-store' && options.cache !== false;
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_TTL_MS;
  const cacheKey = options.cacheKey || `${method}:${url}`;
  const staleWhileRevalidate = options.staleWhileRevalidate !== false;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cacheEntry = useCache ? responseCache.get(cacheKey) : null;
  if (cacheEntry) {
    const age = Date.now() - cacheEntry.timestamp;
    if (age <= ttlMs) {
      return { ...cacheEntry.value, fromCache: true };
    }
    if (staleWhileRevalidate && !inflightRequests.has(cacheKey)) {
      const refreshPromise = performFetch().finally(() => inflightRequests.delete(cacheKey));
      inflightRequests.set(cacheKey, refreshPromise);
    }
    if (staleWhileRevalidate) {
      return { ...cacheEntry.value, fromCache: true, stale: true };
    }
  }

  if (useCache && inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  const fetchPromise = performFetch();
  if (useCache) {
    inflightRequests.set(cacheKey, fetchPromise);
  }
  const result = await fetchPromise;
  if (useCache) {
    inflightRequests.delete(cacheKey);
  }
  return result;

  async function performFetch() {
    const controller = new AbortController();
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    // Only pass valid RequestInit properties to fetch().
    // Custom properties like cacheKey, ttlMs, staleWhileRevalidate, timeoutMs
    // are apiFetch-specific and must NOT be spread into fetch().
    const { cacheKey: _ck, ttlMs: _ttl, staleWhileRevalidate: _swr,
            timeoutMs: _tm, cache: rawCache, ...fetchInit } = options;
    // Map apiFetch `cache: false` to the valid 'no-store' enum value.
    const fetchCache = rawCache === false ? 'no-store' : (rawCache || undefined);

    try {
      const res = await fetch(url, {
        ...fetchInit,
        ...(fetchCache ? { cache: fetchCache } : {}),
        headers,
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Surface the real backend error — never fabricate a success response.
        const detail = data && typeof data === 'object' ? (data.detail || data.message || data.error) : undefined;
        const error = typeof detail === 'string' && detail.trim() !== ''
          ? detail
          : `Request failed with status ${res.status}${res.statusText ? ` (${res.statusText})` : ''}`;
        console.error(`[apiFetch] ${method} ${path} → ${res.status}: ${error}`, data);
        return { ok: false, status: res.status, statusText: res.statusText, data, error };
      }

      const payload = { ok: true, status: res.status, data };

      if (useCache) {
        // Evict oldest entries when cache exceeds size limit
        if (responseCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = responseCache.keys().next().value;
          responseCache.delete(oldestKey);
        }
        responseCache.set(cacheKey, { timestamp: Date.now(), value: payload });
      }
      if (method !== 'GET') {
        responseCache.clear();
      }

      return payload;
    } catch (err) {
      // Network failure, timeout, or aborted request — log it so it is never silent.
      console.error(`[apiFetch] ${method} ${path} → network error: ${err && err.message ? err.message : err}`);
      throw err;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
};
