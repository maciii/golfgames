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
  build: {
    rolldownOptions: {
      output: {
        // Firebase dostane vlastní pojmenovaný chunk, aby ho šlo vynechat
        // z předcachování service workerem (viz workbox.globIgnores níž).
        codeSplitting: {
          groups: [{ name: 'firebase', test: /node_modules[\\/]@?firebase/ }],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fairsome',
        short_name: 'Fairsome',
        // Manifest je statický, takže nese neutrální angličtinu; jazyk
        // samotné aplikace se přepíná v jejím nastavení.
        description: 'Hole by hole golf scoring for several game formats',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        // Při zápisu se používá výška, ale otočení na šířku je rychlý
        // náhled scorekarty. Pevné portrait by ho v nainstalované PWA blokovalo.
        orientation: 'any',
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
        // Firebase se nepředcachuje. Naprostá většina uživatelů hraje bez
        // přihlášení a nemá důvod stahovat SDK, které nikdy nepoužije;
        // přihlášenému se načte ze sítě v okamžiku, kdy ho potřebuje - a to
        // stejně jde jen online.
        globIgnores: ['**/firebase*.js'],
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
