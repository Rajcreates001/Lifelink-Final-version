// localStorage cache hygiene sweeper.
//
// Problem being solved: dozens of components cache API payloads in
// localStorage with no eviction policy. Caches are per-entity (per ambulance,
// per hospital, per search term), so keys accumulate unboundedly as users
// browse — multi-MB risk, staleness bugs, and quota errors on long sessions.
//
// Usage: call `sweepStorageCaches()` once at app boot (main.jsx), before any
// component reads its cache. It is cheap (< 1ms for a typical profile) and
// safe: it only touches keys in the cache namespaces below, never
// preferences like `lifelink_language` or auth/session data.
//
// Policy:
//  - maxEntries: keep only the N most recently written entries per namespace.
//    Timestamps are read from the cached payload's common wrapper fields
//    (`lastUpdated` / `timestamp` / `cachedAt`); entries without any
//    parseable timestamp are treated as oldest.
//  - maxAgeDays: entries older than this are dropped outright.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Namespaces of CACHE keys (not preferences, not auth). Keys are either
// exactly the prefix or `prefix` + separator + dynamic suffix.
const CACHE_NAMESPACES = [
    'ambulance_assignments',
    'ambulance_emergency',
    'ambulance_history',
    'ambulance_patient',
    'ambulance_emergency_status',
    'hospital_overview',
    'hospital_ai_',
    'gov_command_cache',
    'gov_live_cache',
    'gov_policy_cache',
    'gov_verification_cache',
    'gov_simulation_history',
    'gov_disaster_history',
    'lifelink:ask-cache:',
    'lifelink:family',
];

// Keys that must never be swept even if they start with a namespace above.
const PROTECTED_KEYS = new Set(['lifelink_language', 'lifelink_recent_searches']);

const TIMESTAMP_FIELDS = ['lastUpdated', 'timestamp', 'cachedAt'];

const extractTimestamp = (payload) => {
    if (!payload || typeof payload !== 'object') return null;
    for (const field of TIMESTAMP_FIELDS) {
        const value = payload[field];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            if (!Number.isNaN(parsed)) return parsed;
        }
    }
    return null;
};

export const isCacheKey = (key) =>
    !PROTECTED_KEYS.has(key) &&
    CACHE_NAMESPACES.some((ns) => key === ns || key.startsWith(ns));

export const sweepStorageCaches = ({
    storage = window.localStorage,
    now = Date.now(),
    maxEntries = 20,
    maxAgeDays = 30,
} = {}) => {
    if (!storage) return { swept: 0, namespaces: 0 };

    const maxAgeMs = maxAgeDays * ONE_DAY_MS;
    const byNamespace = new Map();

    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key || !isCacheKey(key)) continue;
        const namespace = CACHE_NAMESPACES.find((ns) => key === ns || key.startsWith(ns));
        if (!byNamespace.has(namespace)) byNamespace.set(namespace, []);
        let payload = null;
        try {
            payload = JSON.parse(storage.getItem(key));
        } catch {
            payload = null; // corrupt entry — treat as oldest
        }
        byNamespace.get(namespace).push({ key, at: extractTimestamp(payload) ?? 0 });
    }

    let swept = 0;
    for (const [namespace, entries] of byNamespace) {
        // Newest first; drop beyond the cap, then drop stale leftovers.
        entries.sort((a, b) => b.at - a.at);
        const overCap = entries.slice(maxEntries);
        const stale = entries
            .slice(0, maxEntries)
            .filter((entry) => entry.at > 0 && now - entry.at > maxAgeMs);
        for (const entry of [...overCap, ...stale]) {
            storage.removeItem(entry.key);
            swept += 1;
        }
        if (overCap.length + stale.length > 0) {
            // Namespace touched this run — future sweeps will re-evaluate.
            void namespace;
        }
    }
    return { swept, namespaces: byNamespace.size };
};

export default sweepStorageCaches;
