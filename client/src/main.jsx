// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { sweepStorageCaches } from './utils/storageSweeper'
// Leaflet styles once for every map (several map modules did not import them,
// so tiles scattered when such a module was the first map opened).
import 'leaflet/dist/leaflet.css'
// Font Awesome: self-hosted from npm so all `<i class="fas fa-...">` icons
// (navbar logo, dashboards, 916 usages) render under the CSP without a CDN.
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'

// ─── localStorage cache hygiene ────────────────────────────
// Evict stale/overflowing API cache entries once at boot. Preferences and
// auth keys are never touched. Must run before components read their caches.
sweepStorageCaches();

// ─── Register Service Worker for PWA ───────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);
        // Check for updates periodically
        setInterval(() => registration.update(), 60 * 60 * 1000); // every hour
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// ─── Prompt user to install PWA ────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // Store the event for later use
  window.__lifelinkInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] LifeLink installed successfully');
  window.__lifelinkInstallPrompt = null;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
