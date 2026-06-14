import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Client-rendered SPA. Backend traffic uses same-origin paths (/api, /auth, /ws);
// in dev we proxy them to the Go backend on :8080 so the session cookie and the
// WebSocket "just work". In prod the SPA is served same-origin behind the
// reverse proxy, so no API base URL is needed (matches the old PUBLIC_API_URL='').
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'TanteEmma',
        short_name: 'TanteEmma',
        description: 'Familien-Einkaufsliste – selbst gehostet',
        start_url: '/lists',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#d946ef',
        theme_color: '#d946ef',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // App shell cache-first; API/WS never precached (always network).
        navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/ws/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  publicDir: 'static',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: false },
      '/auth': { target: 'http://localhost:8080', changeOrigin: false },
      '/ws': { target: 'http://localhost:8080', ws: true, changeOrigin: false },
    },
  },
});
