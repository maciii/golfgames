import { expect, test } from '@playwright/test'
import { isLandscapeScorecard } from './helpers'

/**
 * Tečky HCP musí ukazovat **všechny** rány, které hráč na jamce dostává.
 *
 * Zápis skóre je zastropovával na tři, takže hráč s indexem 54 (hrací
 * handicap 61, tedy čtyři rány na nejtěžších jamkách) vypadal, že má proti
 * soupeři o ránu menší výhodu, než s jakou se opravdu počítá - a dělená jamka
 * pak vypadala jako chyba v bodování. Scorekarta je vypisovala celé, takže si
 * dvě obrazovky téhož kola protiřečily.
 */

/** Kolo se dvěma jamkovkami, kde Alex hraje s hracím handicapem 61. */
const NET_ROUND = {
  id: 'e2e-net-dots',
  gameId: 'singles-matches',
  createdAt: '2026-08-13T07:00:00.000Z',
  updatedAt: '2026-08-13T07:00:00.000Z',
  players: [
    { id: 'p1', name: 'Alex', handicapIndex: 54, playingHandicap: 61 },
    { id: 'p2', name: 'Mac', handicapIndex: 12.2, playingHandicap: 12 },
    { id: 'p3', name: 'Čiko', handicapIndex: 24, playingHandicap: 26 },
    { id: 'p4', name: 'Michal', handicapIndex: 18, playingHandicap: 19 },
  ],
  teams: [
    { id: 't1', playerIds: ['p1', 'p2'] },
    { id: 't2', playerIds: ['p3', 'p4'] },
  ],
  holeCount: 18,
  // První jamka je par 3 se stroke indexem 5 - tam dostává Alex čtyři rány.
  pars: [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  scores: {
    p1: [6, ...Array(17).fill(null)],
    p2: [3, ...Array(17).fill(null)],
    p3: [4, ...Array(17).fill(null)],
    p4: [4, ...Array(17).fill(null)],
  },
  bonuses: {
    p1: Array.from({ length: 18 }, () => []),
    p2: Array.from({ length: 18 }, () => []),
    p3: Array.from({ length: 18 }, () => []),
    p4: Array.from({ length: 18 }, () => []),
  },
  currentHole: 0,
  netScoring: true,
  course: {
    name: 'Testovací hřiště',
    strokeIndex: [5, 1, 17, 7, 11, 3, 15, 9, 13, 6, 2, 18, 8, 12, 4, 16, 10, 14],
  },
  settings: {
    currency: 'CZK',
    pointValue: 10,
    options: {
      doubleBest: 0,
      doubleClosingHoles: false,
      bonusValues: {},
      resultMultipliers: {},
    },
  },
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Appka po startu ukládá stav rozehraného kola, takže bez kola klíč rovnou
  // maže - seedovat se smí teprve, když je první obrazovka vykreslená.
  await expect(page.locator('.screen')).toBeVisible()
  await page.evaluate((round) => {
    window.localStorage.setItem('golfgames.currentRound.v1', JSON.stringify(round))
  }, NET_ROUND)
  await page.reload()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
})

test('zápis skóre ukáže všechny rány, které hráč na jamce dostává', async ({ page }) => {
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  const alex = page.locator('.player-row', { hasText: 'Alex' }).first()
  await expect(alex.locator('.player-mark.strokes')).toHaveText('••••')

  const mac = page.locator('.player-row', { hasText: 'Mac' }).first()
  await expect(mac.locator('.player-mark.strokes')).toHaveText('•')

  // Titulek u teček počítal správně i dřív - tečky ho teď nesmí popřít.
  await expect(alex.locator('.player-mark.strokes')).toHaveAttribute(
    'title',
    /4 rány|4 strokes/,
  )
})

test('zápis skóre a scorekarta ukazují stejný počet ran', async ({ page }) => {
  // Na šířku zapisuje živá scorekarta, která přepínač referenčních teček
  // nemá - porovnávat jde jen tam, kde jsou obě obrazovky.
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  const entryDots = await page
    .locator('.player-row', { hasText: 'Alex' })
    .first()
    .locator('.player-mark.strokes')
    .textContent()
  await page.locator('.content .link-row .link-button').first().click()

  // Scorekarta umí tečky vůči hřišti i vůči nejlepšímu hráči; porovnává se
  // režim hřiště, protože ten ukazuje skutečně přidělené rány.
  await page.locator('.scorecard-control .segment').first().click()

  const cardDots = page
    .locator('.scorecard tbody tr')
    .first()
    .locator('.scorecard-hcp-dots')
    .first()
  await expect(cardDots).toHaveText('••••')
  expect(entryDots, 'zápis skóre a scorekarta se rozešly').toBe('••••')
})
