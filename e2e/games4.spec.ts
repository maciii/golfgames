import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  currentRound,
  expectNoHorizontalOverflow,
  expectNothingClipped,
  expectTappable,
  isLandscapeScorecard,
  openSetup,
  PAIRING_TITLE,
  scrollContentToEnd,
} from './helpers'

/**
 * Hry pro čtyři hráče na jamky: Foursome a dvě jamkovky 1 na 1.
 *
 * Pravidla a body pokrývá Vitest; tady jde o zápis skóre, který je u obou her
 * jiný než u ostatních - Foursome má jeden řádek na dvojici a dvě jamkovky
 * dva samostatné bloky.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
})

const PLAYERS = ['Mac', 'Michal', 'Alex', 'Petr']

/** Založí kolo bez hřiště se čtyřmi pojmenovanými hráči a zvolenou hrou. */
async function startFourPlayerRound(page: Page, gameName: RegExp): Promise<void> {
  await openSetup(page, 'players')
  await page.locator('.segmented .segment', { hasText: '4' }).first().click()
  const names = page.locator('.name-input')
  for (const [index, name] of PLAYERS.entries()) await names.nth(index).fill(name)
  await page.locator('.app-footer .primary-button').click()

  await page.locator('.game-card', { hasText: gameName }).first().click()
  // Hra -> dvojice -> sázka -> start; dvojice mají u čtyř hráčů vlastní krok.
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.app-header h1')).toHaveText(PAIRING_TITLE)
  await page.locator('.app-footer .primary-button').click()
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
}

test('Foursome zapisuje jedno skóre na dvojici', async ({ page }) => {
  await startFourPlayerRound(page, /Foursome/)
  test.skip(await isLandscapeScorecard(page), 'zápis skóre je na šířku scorekarta')

  // Dvojice hraje jedním míčem, takže jsou dva řádky, ne čtyři.
  const rows = page.locator('.player-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('Mac + Michal')
  await expect(rows.nth(1)).toContainText('Alex + Petr')

  await rows.first().locator('.score-value').click()
  await rows.nth(1).locator('.score-value').click()
  await rows.nth(1).locator('.step-button').last().click()

  // Jedno číslo dvojice se ukládá oběma partnerům - `Round.scores` je po
  // hráčích, takže jinak by druhý partner vypadal, že jamku vzdal.
  const round = await currentRound(page)
  expect(round.scores.p1?.[0]).toBe(4)
  expect(round.scores.p2?.[0]).toBe(4)
  expect(round.scores.p3?.[0]).toBe(5)
  expect(round.scores.p4?.[0]).toBe(5)

  // Stav zápasu se počítá z jediného míče dvojice.
  await expect(page.locator('.game-header-summary')).toContainText('1 UP')
})

test('Foursome má ve scorekartě jeden sloupec na dvojici', async ({ page }) => {
  await startFourPlayerRound(page, /Foursome/)
  const rows = page.locator('.player-row')
  if (!(await isLandscapeScorecard(page))) {
    await rows.first().locator('.score-value').click()
    await rows.nth(1).locator('.score-value').click()
    await page.locator('.content .link-row .link-button').first().click()
  }

  const headers = page.locator('.scorecard thead .player-col .col-name')
  await expect(headers).toHaveCount(2)
  await expect(headers.first()).toHaveText('Mac + Michal')
})

test('dvě jamkovky drží každý zápas ve vlastním bloku', async ({ page }) => {
  await startFourPlayerRound(page, /Dvě jamkovky/)
  test.skip(await isLandscapeScorecard(page), 'zápis skóre je na šířku scorekarta')

  // Dva zápasy = dva bloky, v každém dva soupeři.
  const blocks = page.locator('.team-block')
  await expect(blocks).toHaveCount(2)
  await expect(blocks.first().locator('.team-name')).toHaveText('Mac vs. Michal')
  await expect(blocks.nth(1).locator('.team-name')).toHaveText('Alex vs. Petr')
  await expect(page.locator('.player-row')).toHaveCount(4)

  // Zápis v prvním zápase nesmí rozhodnout jamku ve druhém.
  const first = blocks.first()
  await first.locator('.player-row').first().locator('.score-value').click()
  await first.locator('.player-row').nth(1).locator('.score-value').click()
  await first.locator('.player-row').nth(1).locator('.step-button').last().click()

  // Stav zápasu je v hlavičce jamky, u každého zápasu na svém řádku - v bloku
  // by se s dlouhými jmény jen lámal na dva řádky.
  const header = page.locator('.game-header-summary .game-header-entry')
  await expect(header.first()).toContainText('Mac')
  await expect(header.first()).toContainText('1 UP')
  await expect(header.nth(1)).toContainText('AS')
})

test('dvě jamkovky vyrovnávají peníze zvlášť za každý zápas', async ({ page }) => {
  await startFourPlayerRound(page, /Dvě jamkovky/)
  test.skip(await isLandscapeScorecard(page), 'zápis skóre je na šířku scorekarta')

  // Mac bere jamku Michalovi, Alex a Petr ji dělí.
  const rows = page.locator('.player-row')
  for (const index of [0, 1, 2, 3]) {
    await rows.nth(index).locator('.score-value').click()
  }
  await rows.nth(1).locator('.step-button').last().click()

  await page.locator('.content .link-row .link-button').first().click()
  await expect(page.locator('.app-header h1')).toBeVisible()

  await expect(page.locator('.section', { hasText: 'Zápasy ve flightu' })).toBeVisible()

  // Zůstatek má každý ze čtyř hráčů, ale platba je jen jedna: v druhém zápase
  // je jamka dělená, takže si Alex s Petrem nemají co platit - a přes zápasy
  // se neplatí vůbec.
  await expect(page.locator('.settlement-arrow')).toHaveCount(1)
  const transfer = page.locator('.settlement-row', {
    has: page.locator('.settlement-arrow'),
  })
  await expect(transfer).toContainText('Michal')
  await expect(transfer).toContainText('Mac')
  await expect(transfer).toContainText('10 Kč')
})

test('zápis obou nových her se vejde do displeje', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'pravidlo o jedné obrazovce platí pro telefon',
  )
  await startFourPlayerRound(page, /Dvě jamkovky/)
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')
  // Na iPhonu SE se čtyři hráči nevejdou ani u ostatních her, viz AGENTS.md.
  const viewport = page.viewportSize()
  test.fixme(
    (viewport?.height ?? 0) < 700,
    'na displeji pod 700 px se čtyři hráči zatím nevejdou',
  )

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
  await expectTappable(page, '.app-footer .primary-button')

  const scrolled = await scrollContentToEnd(page)
  expect(scrolled, 'zápis dvou jamkovek přerostl displej').toBe(0)
})
