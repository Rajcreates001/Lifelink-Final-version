import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: the client runs on :5000 while the backend runs on :3001.
// Without this proxy, all /api/* and /v2/* requests from the browser went to
// the Vite dev server and returned index.html (or failed), producing 404s
// ("Not Found") across dashboards right after login. In production nginx
// performs the same proxying (see client/nginx.conf).
const API_TARGET = (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_API_PROXY_TARGET) || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',     // ⭐ allow all network IPs
    port: 5000,
    strictPort: true,
    allowedHosts: true,  // ⭐ allow ALL hosts (ngrok fix)
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/v2': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true, // /v2/realtime/ws/* WebSocket upgrade passthrough
      },
      '/health': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
