import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  currentRound,
  expectSetupStep,
  isLandscapeScorecard,
  openSetup,
  startRound,
} from './helpers'

/**
 * Extra body jako vedlejší sázka u hry, která si je nepočítá do svých bodů.
 *
 * Ověřuje se to, co je na nich nejsnáz rozbitelné: ve výchozím stavu se
 * o ně nehraje (nula znamená vypnuto), a když se zapnou, musí se objevit
 * v zápisu skóre i v penězích - aniž by se pomíchaly se stavem zápasu.
 */

/** Založí zápas dvou hráčů; volby bodování se seedují před zakládáním kola. */
async function startMatch(page: Page, bunkerValue: number): Promise<void> {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
  if (bunkerValue > 0) {
    await page.evaluate((value) => {
      window.localStorage.setItem(
        'golfgames.gameOptions.v1',
        JSON.stringify({ 'match-play': { bonusValues: { bunker: value } } }),
      )
    }, bunkerValue)
    await page.reload()
  }

  await openSetup(page, 'players')
  await page.locator('.segmented .segment', { hasText: '2' }).first().click()
  await page.locator('.name-input').nth(0).fill('Mac')
  await page.locator('.name-input').nth(1).fill('Alex')
  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'game')
  await page
    .locator('.game-card', { hasText: /Match play/ })
    .first()
    .click()
  // Dva hráči dvojice nemají, takže krok s dvojicemi se přeskočí.
  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'bet')
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
}

test('bez zadané hodnoty se o extra body nehraje', async ({ page }) => {
  await startMatch(page, 0)
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  // Nula znamená vypnuto, takže tlačítko extra bodů nemá co nabídnout.
  await expect(page.locator('.bonus-button')).toHaveCount(0)

  await page.locator('.player-row').first().locator('.score-value').click()
  await page.locator('.content .link-row .link-button').first().click()
  await expect(
    page.locator('.section-title').filter({ hasText: /Extra body/i }),
  ).toHaveCount(0)
})

test('zapnutý extra bod se zapíše a přidá do peněz', async ({ page }) => {
  await startMatch(page, 20)
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  await expect(page.locator('.bonus-button')).toHaveCount(2)

  // Mac zapíše par a k němu bunker, Alex bogey - Mac tedy bere jamku i bonus.
  await page.locator('.player-row').first().locator('.score-value').click()
  const alex = page.locator('.player-row').nth(1)
  await alex.locator('.score-value').click()
  await alex.locator('.step-button').last().click()

  await page.locator('.player-row').first().locator('.bonus-button').click()
  await page
    .locator('.sheet button', { hasText: /Bunker/i })
    .first()
    .click()
  await page
    .locator('.sheet button', { hasText: /Hotovo|Done/i })
    .first()
    .click()

  const round = await currentRound(page)
  expect(round.gameId).toBe('match-play')

  await page.locator('.content .link-row .link-button').first().click()
  await expect(
    page.locator('.section-title').filter({ hasText: /Extra body/i }),
  ).toHaveCount(1)

  // Stav zápasu zůstává na jamkách, ne na bodech z bunkeru.
  const match = page.locator('.section').filter({ hasText: /Stav zápasu/i })
  await expect(match).toContainText('1 UP')

  // Vyhraná jamka plus dvacet bodů po desetikoruně.
  await expect(page.locator('.settlement-row').first()).toContainText('210')
})

test('násobiče mají volbu Uplatňovat HCP a ve výchozím stavu je vypnutá', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
  await openSetup(page, 'game')

  // Nastavení bodování hry se otevírá ozubeným kolem u konkrétní hry.
  await page
    .locator('.game-choice', { hasText: /Best \+ Součet|Best \+ Aggregate/ })
    .locator('.game-settings-button')
    .click()
  await expect(page.locator('.app-header h1')).toHaveText(/Bodování|Scoring/i)

  const option = page
    .locator('.switch')
    .filter({ hasText: /Uplatňovat HCP|Apply handicap/i })
  await expect(option).toHaveCount(1)
  await expect(option.locator('input')).not.toBeChecked()

  // Volba se ukládá k dané hře, ať se kolo počítá podle toho, co je vidět.
  await option.locator('input').check()
  const stored = await page.evaluate(() => {
    const all = JSON.parse(
      window.localStorage.getItem('golfgames.gameOptions.v1') ?? '{}',
    ) as Record<string, { multipliersWithHandicap?: boolean }>
    return all['best-aggregate']?.multipliersWithHandicap
  })
  expect(stored).toBe(true)
})

test('modré „i" u shrnutí jamky otevře rozpis bodů', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
  // Best + Součet se čtyřmi hráči je výchozí hra, takže stačí projít kroky.
  await startRound(page)
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  // Dokud na jamce nikdo nezapsal, není co rozepisovat - a přesto se rozpis
  // nabízí, protože ukáže i nuly.
  await page.locator('.player-row').first().locator('.score-value').click()
  const info = page.locator('.team-header .info-button')
  await expect(info).toHaveCount(2)

  await info.first().click()
  const sheet = page.locator('.sheet')
  await expect(sheet).toContainText(/Rozpis bodů|Points breakdown/i)
  await expect(sheet).toContainText(/Best/i)
  await expect(sheet).toContainText(/Součet|Aggregate/i)
  await expect(sheet).toContainText(/Body za jamku|Points for the hole/i)

  await sheet.locator('.primary-button').click()
  await expect(sheet).toHaveCount(0)
})
