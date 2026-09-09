/**
 * preloadService — Public-portal data preload / warm-up.
 *
 * Goal: when the public dashboard mounts, every feature tab (Home, AI Health,
 * Find Donors, Requests, AI Records, User Activity) should already have its
 * data in flight or cached — so switching tabs renders instantly instead of
 * showing a spinner while the request starts cold.
 *
 * How it works:
 *  - `preloadPublicData(userId)` fires every GET the tabs depend on, in
 *    parallel, through `apiFetch`. apiFetch already dedupes identical GETs
 *    (in-flight map + response cache), so tab components calling the same
 *    endpoints later join the warm requests for free.
 *  - `preloadLocationData()` warms the location-dependent endpoints
 *    (nearby hospitals, AI donor matching) as soon as geolocation resolves,
 *    without waiting for a tab to mount.
 *  - Every request is fire-and-forget: failures are logged and swallowed —
 *    preloading must never break the dashboard.
 *
 * `getPreload()` exposes the resolved promises so tabs can await warm data
 * directly instead of re-fetching.
 */
import { apiFetch } from '../config/api';

// ─── Preload registry ────────────────────────────────────
const preloads = new Map();

const track = (key, promiseFactory) => {
  // Replace any stale preload from a previous session/user.
  const promise = promiseFactory().catch((err) => {
    console.warn(`[preload] ${key} failed (non-fatal):`, err?.message || err);
    return null;
  });
  preloads.set(key, promise);
  return promise;
};

export const getPreload = (key) => preloads.get(key) || null;

// ─── Location-independent warm-up ────────────────────────
export const preloadPublicData = (userId) => {
  if (!userId) return;

  // Dashboard Home + User Activity (DonationsTab) + History timeline.
  track('dashboard', () => apiFetch(`/api/dashboard/public/${userId}/full`, { method: 'GET', timeoutMs: 10000 }));

  // Find Donors tab (donor directory fallback) + DonorMatchScreen.
  track('donors', () => apiFetch('/api/donors', { method: 'GET', timeoutMs: 10000 }));

  // AI Records tab — document history.
  track('healthRecords', () => apiFetch(`/api/health/records/${userId}`, { method: 'GET', timeoutMs: 10000 }));

  // Home tab — notifications/stats hub.
  track('notifications', () => apiFetch(`/api/notifications/${userId}`, { method: 'GET', timeoutMs: 10000 }));

  // Home tab — public data-health panel.
  track('publicHealth', () => apiFetch('/v2/public/health/summary', { method: 'GET', ttlMs: 60000, timeoutMs: 12000 }));

  // AI Health tab — risk-assessment history.
  track('healthRiskHistory', () => apiFetch(`/api/health/risk/history/${userId}`, { method: 'GET', timeoutMs: 10000 }));

  // Public module registry (SOS screen + feature gating).
  track('modules', () => apiFetch('/v2/public/modules', { method: 'GET', timeoutMs: 10000 }));
};

// ─── Location-dependent warm-up ──────────────────────────
export const preloadLocationData = (location) => {
  if (!location?.lat || !location?.lng) return;

  // Find Hospital screen + Home tab hospital explorer.
  track('nearbyHospitals', () =>
    apiFetch(`/v2/hospital/nearby?lat=${location.lat}&lng=${location.lng}&limit=5&radius_km=50&include_eta=true`, { method: 'GET', timeoutMs: 12000 })
  );

  // Find Donors tab — AI-ranked matches (uses a neutral recipient group; the
  // tab refines with the user's real blood group when its own effect runs).
  track('donorMatches', () =>
    apiFetch('/v2/public/donors/match', {
      method: 'POST',
      body: JSON.stringify({ blood_group: 'O+', urgency: 'medium', latitude: location.lat, longitude: location.lng }),
      timeoutMs: 15000,
    })
  );
};

// ─── One-shot bootstrap ──────────────────────────────────
export const preloadAll = (userId) => {
  preloadPublicData(userId);

  // Warm location data as soon as the browser reports a position; the tabs
  // share the same cached responses once their own geolocation resolves.
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => preloadLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* location denied — tabs handle their own fallbacks */ },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
};

export default { preloadAll, preloadPublicData, preloadLocationData, getPreload };
