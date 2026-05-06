import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fitila-icon.png', 'fitila-icon-192.png', 'fitila-icon-512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/envato/**'],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            // Audios pédagogiques (classe-audio) → CacheFirst, 100 entrées, 30 jours
            urlPattern: /\/storage\/v1\/object\/sign\/classe-audio\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'classe-audio-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.hf\.space\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'FITILA - Plateforme Vocale Africaine',
        short_name: 'FITILA',
        description: 'Dictionnaire bariba-français, réseau social audio, création vidéo',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/fitila',
        categories: ['education', 'social', 'entertainment'],
        icons: [
          {
            src: '/fitila-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/fitila-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/fitila-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA || 'dev'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(process.env.VITE_BUILD_TIME || new Date().toISOString()),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'motion': ['framer-motion'],
          'icons': ['lucide-react'],
          'query': ['@tanstack/react-query'],
        },
        // Reduce initial chunk sizes for faster first paint
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    minify: 'esbuild',
  },
}));
