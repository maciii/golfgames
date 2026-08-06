import { defineConfig, devices } from '@playwright/test'

/**
 * Konfigurace e2e testů rozhraní.
 *
 * Testuje se responzivita, ne pravidla her - ta pokrývá Vitest a je to
 * levnější i spolehlivější. Tady jde o jedinou otázku: vejde se rozhraní do
 * displeje a jde ovládat prstem?
 *
 * **Telefon je hlavní profil** (viz `AGENTS.md`). Projekty `phone-*` běží první
 * a jsou to ty, které musí projít vždycky; větší displeje se ověřují navíc,
 * aby appka mimo telefon nevypadala rozbitě.
 *
 * Playwright nespouští skutečné operační systémy - emuluje jejich prohlížeče.
 * WebKit odpovídá Safari na iOS a macOS, Chromium Chrome na Androidu, Windows
 * i Linuxu, Firefox Gecko napříč platformami. Rozdíly v renderování a v tom,
 * co který engine podporuje (`dvh`, `env()`, `color-mix`), se tím pokryjí;
 * ryze systémové chování (sdílení, instalace na plochu) ne.
 */

/**
 * Testuje se proti vývojovému serveru, ne proti buildu: rozvržení je v obou
 * případech stejné CSS a `npm run build` by navíc při každém spuštění zvedl
 * patch verzi (`prebuild`), což do testu nepatří.
 */
const PORT = 5174

export default defineConfig({
  testDir: './e2e',
  // Rozvržení je deterministické, takže opakování by jen schovalo blikající test.
  retries: 0,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Jazyk se pevně nastaví na češtinu: texty jsou delší než anglické, takže
    // je to horší případ pro rozvržení, a testy nezávisí na jazyce systému.
    locale: 'cs-CZ',
  },

  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    // --- telefony: hlavní profil ------------------------------------------
    {
      name: 'phone-safari-ios',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'phone-chrome-android',
      use: { ...devices['Pixel 7'] },
    },
    {
      // Firefox neumí `isMobile` ani dotyk, takže se emuluje aspoň rozměrem -
      // pro kontrolu rozvržení to stačí, gesta se testují na dvou profilech výš.
      name: 'phone-firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
    },
    {
      // Nejmenší displej, se kterým se v praxi počítá (iPhone SE).
      name: 'phone-small',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'phone-landscape',
      use: { ...devices['iPhone 13 landscape'] },
    },

    // --- větší displeje: kontrola navíc -----------------------------------
    {
      name: 'tablet-safari-ipados',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'desktop-safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
