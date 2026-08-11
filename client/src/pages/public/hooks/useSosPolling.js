import { useEffect } from 'react';
import { apiFetch } from '../../../config/api';

/**
 * useSosPolling — Polls the SOS status endpoint at a regular interval while a SOS is active.
 *
 * @param {string|null} sosId - The SOS ID to poll, or null to disable polling
 * @param {(data: object) => void} onUpdate - Callback fired with each poll response
 * @param {number} intervalMs - Polling interval in ms (default 4000)
 */
export function useSosPolling(sosId, onUpdate, intervalMs = 4000) {
  useEffect(() => {
    if (!sosId || !onUpdate) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/v2/public/sos/${sosId}`, { method: 'GET', timeoutMs: 12000 });
        if (res.ok) onUpdate(res.data);
      } catch {
        // Polling errors are non-fatal; the next interval will retry
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [sosId, onUpdate, intervalMs]);
}
