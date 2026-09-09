import { describe, it, expect, beforeEach } from 'vitest';
import { sweepStorageCaches, isCacheKey } from '../utils/storageSweeper';

const DAY = 24 * 60 * 60 * 1000;

const seed = (key, value, at) => {
    const payload = typeof value === 'object' ? { ...value, lastUpdated: at } : value;
    window.localStorage.setItem(key, JSON.stringify(payload));
};

describe('storageSweeper', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('keeps preferences untouched', () => {
        seed('lifelink_language', 'en', Date.now());
        seed('lifelink_recent_searches', ['a'], Date.now());
        const result = sweepStorageCaches();
        expect(result.swept).toBe(0);
        expect(window.localStorage.getItem('lifelink_language')).toBe(JSON.stringify('en'));
    });

    it('evicts entries beyond the per-namespace cap, newest kept', () => {
        for (let i = 0; i < 25; i += 1) {
            seed(`ambulance_history_${i}`, { data: i }, Date.now() - i * 1000);
        }
        const result = sweepStorageCaches({ maxEntries: 20 });
        expect(result.swept).toBe(5);
        expect(window.localStorage.getItem('ambulance_history_0')).not.toBeNull(); // newest
        expect(window.localStorage.getItem('ambulance_history_24')).toBeNull(); // oldest
    });

    it('drops entries older than maxAgeDays', () => {
        seed('gov_live_cache', { ok: true }, Date.now() - 40 * DAY);
        seed('gov_live_cache_2', { ok: true }, Date.now() - 1 * DAY);
        const result = sweepStorageCaches({ maxAgeDays: 30 });
        expect(result.swept).toBe(1);
        expect(window.localStorage.getItem('gov_live_cache')).toBeNull();
        expect(window.localStorage.getItem('gov_live_cache_2')).not.toBeNull();
    });

    it('handles corrupt JSON as oldest', () => {
        window.localStorage.setItem('hospital_overview_1', '{not json');
        seed('hospital_overview_2', { a: 1 }, Date.now());
        const result = sweepStorageCaches({ maxEntries: 1 });
        expect(result.swept).toBe(1);
        expect(window.localStorage.getItem('hospital_overview_1')).toBeNull();
        expect(window.localStorage.getItem('hospital_overview_2')).not.toBeNull();
    });

    it('caps namespaces independently', () => {
        for (let i = 0; i < 25; i += 1) seed(`ambulance_history_${i}`, {}, Date.now());
        for (let i = 0; i < 3; i += 1) seed(`gov_live_cache_${i}`, {}, Date.now());
        const result = sweepStorageCaches({ maxEntries: 20 });
        expect(result.swept).toBe(5);
        expect(result.namespaces).toBe(2);
    });

    it('isCacheKey covers the known namespaces and protects prefs', () => {
        expect(isCacheKey('ambulance_emergency_A-77')).toBe(true);
        expect(isCacheKey('lifelink:ask-cache:fever')).toBe(true);
        expect(isCacheKey('lifelink:family:u123')).toBe(true);
        expect(isCacheKey('lifelink_language')).toBe(false);
        expect(isCacheKey('lifelink_user')).toBe(false);
    });
});
