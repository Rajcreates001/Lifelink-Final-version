/**
 * LifeLink Service Worker
 * ========================
 * Offline-first caching strategy for PWA support.
 *
 * Strategy:
 * - Static assets (JS, CSS, images): Cache-first (fast loading)
 * - API calls: Network-first (fresh data)
 * - HTML pages: Network-first with cache fallback
 * - Fonts: Cache-first (rarely change)
 */

const CACHE_NAME = 'lifelink-v1';
const STATIC_CACHE = 'lifelink-static-v1';
const DYNAMIC_CACHE = 'lifelink-dynamic-v1';
const FONT_CACHE = 'lifelink-fonts-v1';

// Assets to pre-cache on install
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Cache duration limits
const MAX_DYNAMIC_CACHE = 50; // Max entries in dynamic cache
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing LifeLink Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRE_CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed (non-critical):', err);
        return self.skipWaiting();
      })
  );
});

// ─── Activate ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating LifeLink Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== FONT_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch Handler ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Route to appropriate caching strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isFont(url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
  } else if (isAPI(url)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// ─── Caching Strategies ─────────────────────────────────────

/**
 * Cache-first: Try cache, fall back to network.
 * Best for: Static assets, fonts, images
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first: Try network, fall back to cache.
 * Best for: API calls, HTML pages
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      trimCache(cacheName, MAX_DYNAMIC_CACHE);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/index.html');
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Helpers ────────────────────────────────────────────────

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)(\?.*)?$/.test(url.pathname);
}

function isFont(url) {
  return /\.(woff|woff2|ttf|eot)(\?.*)?$/.test(url.pathname);
}

function isAPI(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/v2/');
}

/**
 * Trim cache to max entries, removing oldest first.
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ─── Background Sync (for offline form submissions) ─────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const requests = await getAllFromStore(store);

    for (const req of requests) {
      try {
        await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        // Remove from pending after successful sync
        const deleteTx = db.transaction('pending', 'readwrite');
        deleteTx.objectStore('pending').delete(req.id);
      } catch (err) {
        console.warn('[SW] Sync failed for request:', req.id);
      }
    }
  } catch (err) {
    console.warn('[SW] Background sync error:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lifelink-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
    };
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Push Notifications ─────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from LifeLink',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open LifeLink' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'lifelink-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LifeLink', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
