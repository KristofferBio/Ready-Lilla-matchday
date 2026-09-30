import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: '/Ready-Lilla-matchday/',
  plugins: [
    ...(mode === 'e2e' ? [{
      name: 'e2e-network-safety',
      transformIndexHtml: html => html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="connect-src \'self\' http://127.0.0.1:8085 ws://127.0.0.1:8085; img-src \'self\' data:;" />'),
    }] : []),
    react(),
    tailwindcss(),
    VitePWA({
      // Updates wait until all app windows close, rather than interrupting a match.
      registerType: 'prompt',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/Ready-Lilla-matchday/',
        name: 'Ready Lilla – Kampstøtte',
        short_name: 'Kampstøtte',
        description: 'Tropp, oppsett og bytter for Ready Lilla og Ready Grønn.',
        lang: 'nb',
        start_url: '/Ready-Lilla-matchday/',
        scope: '/Ready-Lilla-matchday/',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#581c87',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/Ready-Lilla-matchday\//],
        // Cache the app only; Firebase handles its own data and network traffic.
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ],
}))
