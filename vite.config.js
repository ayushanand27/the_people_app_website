import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Vitest bundles its own internal Vite/esbuild version, which doesn't always
  // inherit the automatic JSX runtime that @vitejs/plugin-react configures for
  // the real app build — without this, .jsx test files see "React is not
  // defined" even though `npm run build`/`dev` are unaffected.
  esbuild: {
    jsx: 'automatic',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only precache this app's own build output — never intercept Supabase
      // API/Realtime requests, so auth/data/websocket behavior is unaffected.
      workbox: {
        navigateFallbackDenylist: [/^\/admin/],
      },
      manifest: {
        name: 'The People App',
        short_name: 'The People App',
        description: 'Discover people, local shops, events, and city communities across India.',
        theme_color: '#FF85B3',
        background_color: '#FFF0F5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    env: {
      VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
