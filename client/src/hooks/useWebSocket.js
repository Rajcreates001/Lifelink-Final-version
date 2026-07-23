/**
 * LifeLink Real-time WebSocket Hook
 *
 * Provides WebSocket connections to backend real-time channels:
 * - ambulance: live ambulance location updates
 * - hospital: hospital metrics updates
 * - alerts: emergency alerts
 * - government: government dashboard updates
 * - ai: AI insight streams
 *
 * Usage:
 *   const { isConnected, lastMessage } = useWebSocket('alerts', {
 *     onMessage: (data) => console.log('Alert:', data)
 *   });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
  : 'ws://localhost:3010';

const CHANNELS = {
  ambulance: `${WS_BASE}/v2/realtime/ws/ambulance`,
  hospital: `${WS_BASE}/v2/realtime/ws/hospital`,
  alerts: `${WS_BASE}/v2/realtime/ws/alerts`,
  government: `${WS_BASE}/v2/realtime/ws/government`,
  ai: `${WS_BASE}/v2/realtime/ws/ai`,
};

/**
 * Exponential backoff: 1s → 1.5s → 2.25s → 3.375s → 5.062s → max 15s
 * with ±20% jitter to prevent thundering herd on reconnect.
 */
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 15000;
const MAX_RECONNECT_ATTEMPTS = 20;
const BACKOFF_MULTIPLIER = 1.5;
const JITTER_FACTOR = 0.2;

function calculateBackoff(attempt) {
  const delay = Math.min(
    BASE_RECONNECT_MS * Math.pow(BACKOFF_MULTIPLIER, attempt),
    MAX_RECONNECT_MS
  );
  // Add ±20% jitter
  const jitter = delay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

/**
 * React hook for managing a WebSocket connection.
 *
 * @param {string} channel - One of: 'ambulance', 'hospital', 'alerts', 'government', 'ai'
 * @param {object} options
 * @param {function} [options.onMessage] - Called with parsed JSON data on each message
 * @param {function} [options.onStatusChange] - Called with connection status
 * @param {boolean} [options.enabled=true] - Enable/disable connection
 */
export function useWebSocket(channel, options = {}) {
  const {
    onMessage,
    onStatusChange,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !CHANNELS[channel]) return;

    const url = CHANNELS[channel];
    // Add auth token if available
    const token = sessionStorage.getItem('lifelink_token')
      || localStorage.getItem('lifelink_token');
    const wsUrl = token ? `${url}?token=${token}` : url;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        onStatusChange?.('connected');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch {
          // Plain text message
          setLastMessage({ text: event.data });
          onMessage?.({ text: event.data });
        }
      };

      ws.onerror = (err) => {
        if (!mountedRef.current) return;
        setError('WebSocket error');
        onStatusChange?.('error');
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        onStatusChange?.('disconnected');

        // Exponential backoff reconnection with jitter
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current += 1;
          const delay = calculateBackoff(reconnectAttemptRef.current);
          const maxAttempts = MAX_RECONNECT_ATTEMPTS;
          console.log(
            `[WS] Disconnected (code=${event.code}). ` +
            `Reconnecting in ${delay}ms ` +
            `(attempt ${reconnectAttemptRef.current}/${maxAttempts})`
          );
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          console.error(`[WS] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
          setError('Max reconnection attempts reached');
          onStatusChange?.('failed');
        }
      };
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
      onStatusChange?.('error');
    }
  }, [channel, enabled, onMessage, onStatusChange]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    lastMessage,
    error,
    send,
    disconnect,
    reconnect: connect,
  };
}

/**
 * Hook that subscribes to real-time emergency feed updates.
 * Replaces polling-based emergency feed.
 */
export function useEmergencyFeed(options = {}) {
  const [feed, setFeed] = useState([]);
  const { isConnected, lastMessage, error } = useWebSocket('alerts', {
    onMessage: (data) => {
      // Handle flat format: { type: 'new_alert', ...rest }
      // Handle nested format: { type: 'alert', payload: { ...rest } }
      // Handle typed format: { type: 'emergency_update', ... }
      if (data.type === 'emergency_update' || data.type === 'new_alert') {
        setFeed((prev) => [data, ...prev].slice(0, 50));
      } else if (data.type === 'alert' && data.payload) {
        setFeed((prev) => [data.payload, ...prev].slice(0, 50));
      }
      options.onMessage?.(data);
    },
    onStatusChange: options.onStatusChange,
    enabled: options.enabled !== false,
  });

  return { feed, isConnected, error, lastMessage };
}

/**
 * Hook that subscribes to real-time bed/ambulance updates for hospitals.
 */
export function useHospitalRealtime(options = {}) {
  const [updates, setUpdates] = useState([]);
  const { isConnected, lastMessage, error } = useWebSocket('hospital', {
    onMessage: (data) => {
      setUpdates((prev) => [data, ...prev].slice(0, 20));
      options.onMessage?.(data);
    },
    onStatusChange: options.onStatusChange,
    enabled: options.enabled !== false,
  });

  return { updates, isConnected, error, lastMessage };
}
