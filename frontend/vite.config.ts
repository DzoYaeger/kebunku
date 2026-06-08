import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Kebunku — Manajemen Kebun & Arus Kas',
        short_name: 'Kebunku',
        description: 'PWA offline-first manajemen kebun dan arus kas untuk pekebun.',
        theme_color: '#198754',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Langsung aktifkan SW baru tanpa menunggu tab ditutup.
        skipWaiting: true,
        clientsClaim: true,
        // Hapus cache dari versi lama secara otomatis.
        cleanupOutdatedCaches: true,
        // Cache GET API agar data tetap terbaca offline (sumber kebenaran tetap server).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy ke API Laravel saat dev.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ionic': [
            'react',
            'react-dom',
            '@ionic/react',
            '@ionic/react-router',
            'ionicons',
            'react-router',
            'react-router-dom',
          ],
          'vendor-data': ['dexie', 'axios', 'zustand', 'uuid'],
        },
      },
    },
  },
});
