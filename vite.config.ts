import { readFileSync } from 'node:fs'
// defineConfig z vitest/config, aby prošla i sekce `test`.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Aplikace běží na vlastní doméně (public/CNAME), takže se servíruje
// z kořene. Bez vlastní domény by GitHub Pages potřebovaly '/golfgames/'.
const base = process.env.BASE_PATH ?? '/'

// Verze se čte z package.json a vpéká do bundlu, aby ji šlo zobrazit v UI.
// Zvedá ji scripts/bump-version.mjs při každém lokálním buildu.
const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  version: string
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
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
        // Celá aplikace je offline-first: bez signálu na hřišti musí jít
        // zapisovat skóre.
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
