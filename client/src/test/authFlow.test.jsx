import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// ─── Module under test ───────────────────────────────────────
import { apiFetch, API_BASE_URL } from '../config/api';

const TOKEN = 'old-access-token';
const NEW_TOKEN = 'new-access-token';
const REFRESH = 'refresh-token-1';
const NEW_REFRESH = 'refresh-token-2';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

const seedSession = () => {
    sessionStorage.setItem('lifelink_token', TOKEN);
    sessionStorage.setItem('lifelink_refresh_token', REFRESH);
};

beforeEach(() => {
    sessionStorage.clear();
    seedSession();
});

afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
});

// Record fetch calls SNAPSHOT-STYLE (url/auth/body read at call time).
// apiFetch mutates and reuses its headers object across the retry, so
// asserting on the live object afterwards would read the mutated value.
const recordingFetch = (handler) => {
    const calls = [];
    const mock = vi.fn((url, init = {}) => {
        calls.push({
            url: String(url),
            method: init.method || 'GET',
            auth: init.headers ? init.headers.Authorization : undefined,
            body: init.body,
        });
        return handler(url, init, calls.length);
    });
    return { mock, calls };
};

describe('apiFetch 401 → refresh → retry flow', () => {
    it('retries once with a fresh token after a 401, then succeeds', async () => {
        const { mock, calls } = recordingFetch((url, _init, n) => {
            if (n === 1) return Promise.resolve(jsonResponse({ detail: 'Token expired' }, 401));
            if (url.endsWith('/v2/auth/refresh')) {
                return Promise.resolve(jsonResponse({ token: NEW_TOKEN, refreshToken: NEW_REFRESH }));
            }
            return Promise.resolve(jsonResponse({ ok: true, data: 42 }));
        });
        vi.stubGlobal('fetch', mock);

        const result = await apiFetch('/v2/users/me', { cache: false });

        expect(result.ok).toBe(true);
        expect(result.data).toEqual({ ok: true, data: 42 });

        expect(calls).toHaveLength(3);
        // Call 1: original request with the old token
        expect(calls[0].url).toBe(`${API_BASE_URL}/v2/users/me`);
        expect(calls[0].auth).toBe(`Bearer ${TOKEN}`);
        // Call 2: refresh endpoint, POST with the refresh token
        expect(calls[1].url).toBe(`${API_BASE_URL}/v2/auth/refresh`);
        expect(calls[1].method).toBe('POST');
        expect(JSON.parse(calls[1].body)).toEqual({ refreshToken: REFRESH });
        // Call 3: retried request carries the NEW token
        expect(calls[2].auth).toBe(`Bearer ${NEW_TOKEN}`);

        // Rotation: the new refresh token was persisted for next time
        expect(sessionStorage.getItem('lifelink_token')).toBe(NEW_TOKEN);
        expect(sessionStorage.getItem('lifelink_refresh_token')).toBe(NEW_REFRESH);
    });

    it('is single-flight: concurrent 401s trigger exactly one refresh', async () => {
        const { mock, calls } = recordingFetch((url, init) => {
            if (url.endsWith('/v2/auth/refresh')) {
                return new Promise((resolve) =>
                    setTimeout(() => resolve(jsonResponse({ token: NEW_TOKEN })), 20));
            }
            if (init.headers && init.headers.Authorization === `Bearer ${NEW_TOKEN}`) {
                return Promise.resolve(jsonResponse({ ok: true }));
            }
            return Promise.resolve(jsonResponse({ detail: 'expired' }, 401));
        });
        vi.stubGlobal('fetch', mock);

        // Both requests hit 401 while no refresh has happened yet; only one
        // refresh call may be in flight — the second waits for its result.
        const [a, b] = await Promise.all([
            apiFetch('/v2/users/me', { cache: false }),
            apiFetch('/v2/users/other', { cache: false }),
        ]);

        expect(a.ok).toBe(true);
        expect(b.ok).toBe(true);
        const refreshCalls = calls.filter((c) => c.url.endsWith('/v2/auth/refresh'));
        expect(refreshCalls).toHaveLength(1);
    });

    it('gives up without retrying when the refresh itself fails', async () => {
        const { mock, calls } = recordingFetch((url) => {
            if (url.endsWith('/v2/auth/refresh')) {
                return Promise.resolve(jsonResponse({ detail: 'revoked' }, 401));
            }
            return Promise.resolve(jsonResponse({ detail: 'unauthorized' }, 401));
        });
        vi.stubGlobal('fetch', mock);

        const result = await apiFetch('/v2/users/me', { cache: false });

        expect(result.ok).toBe(false);
        expect(result.status).toBe(401);
        // Exactly one original API call + one refresh attempt — no retry loop.
        expect(calls).toHaveLength(2);
        expect(calls[0].url).toBe(`${API_BASE_URL}/v2/users/me`);
        expect(calls[1].url).toBe(`${API_BASE_URL}/v2/auth/refresh`);
    });

    it('does not attempt refresh when no refresh token exists', async () => {
        sessionStorage.removeItem('lifelink_refresh_token');
        const { mock, calls } = recordingFetch(() =>
            Promise.resolve(jsonResponse({ detail: 'unauthorized' }, 401)));
        vi.stubGlobal('fetch', mock);

        const result = await apiFetch('/v2/users/me', { cache: false });

        expect(result.ok).toBe(false);
        expect(calls).toHaveLength(1);
    });
});

describe('AuthContext logout revocation', () => {
    it('clearAuth posts the refresh token to /v2/auth/logout and clears the session', async () => {
        vi.resetModules();
        const { mock, calls } = recordingFetch(() =>
            Promise.resolve(jsonResponse({ ok: true })));
        vi.stubGlobal('fetch', mock);

        const { AuthProvider, useAuth } = await import('../context/AuthContext');

        let contextValue;
        const Probe = () => {
            contextValue = useAuth();
            return <div>probe</div>;
        };
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByText('probe')).toBeInTheDocument());

        act(() => {
            contextValue.clearAuth();
        });

        await waitFor(() => {
            expect(calls.some((c) => c.url.endsWith('/v2/auth/logout'))).toBe(true);
        });
        const logoutCall = calls.find((c) => c.url.endsWith('/v2/auth/logout'));
        expect(logoutCall.method).toBe('POST');
        expect(JSON.parse(logoutCall.body)).toEqual({ refreshToken: REFRESH });
        expect(logoutCall.auth).toBe(`Bearer ${TOKEN}`);

        expect(sessionStorage.getItem('lifelink_token')).toBeNull();
        expect(sessionStorage.getItem('lifelink_refresh_token')).toBeNull();
        expect(sessionStorage.getItem('lifelink_user')).toBeNull();
    });
});
