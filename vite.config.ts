import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repo>/, jiné hostingy (Cloudflare, Netlify)
// z kořene. Přepíná se přes BASE_PATH při buildu.
const base = process.env.BASE_PATH ?? '/golfgames/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Golf Games',
        short_name: 'Golf',
        description: 'Zápis skóre po jamkách a vyhodnocení golfových her',
        lang: 'cs',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1c14',
        theme_color: '#0f1c14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Celá appka je offline-first: bez signálu na hřišti musí jít zapisovat.
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
