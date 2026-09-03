// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
  <App />,
)
