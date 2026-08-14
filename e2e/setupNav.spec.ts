import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  currentRound,
  expectSetupStep,
  isLandscapeScorecard,
  openSetup,
  PAIRING_TITLE,
  startRound,
  swipeBack,
} from './helpers'

/**
 * Pohyb mezi kroky zakládání kola a návrat k nim z rozehraného kola.
 *
 * Jde o data, ne o rozvržení: zpět/swipe nesmí přepsat ani ztratit nic, co už
 * je zadané - ani rozepsané kolo, ani rozehranou hru se zapsaným skóre.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
})

/** Založí kolo čtyř pojmenovaných hráčů; končí na zápisu skóre. */
async function startFlight(page: Page): Promise<void> {
  await openSetup(page, 'players')
  await page.locator('.segmented .segment', { hasText: '4' }).first().click()
  const names = ['Mac', 'Michal', 'Alex', 'Petr']
  for (const [index, name] of names.entries()) {
    await page.locator('.name-input').nth(index).fill(name)
  }
  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'game')
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.app-header h1')).toHaveText(PAIRING_TITLE)
  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'bet')
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
}

test('krok zpět nechá zadaná jména na místě', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'gesto se ovládá prstem, na desktopu se nesleduje',
  )
  await openSetup(page, 'players')
  await page.locator('.name-input').first().fill('Alexandra Pániková')
  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'game')

  // Zpět gestem i tlačítkem musí skončit stejně - na kroku hráčů s jménem.
  await swipeBack(page)
  await expectSetupStep(page, 'players')
  await expect(page.locator('.name-input').first()).toHaveValue('Alexandra Pániková')

  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'game')
  await page.locator('.app-header .icon-button').click()
  await expectSetupStep(page, 'players')
  await expect(page.locator('.name-input').first()).toHaveValue('Alexandra Pániková')
})

test('zpět z rozehraného kola nezakládá kolo nové', async ({ page }) => {
  await startRound(page)
  const before = await currentRound(page)

  // Kroky zakládání patřily kolu, které už běží. Kdyby se z historie vrátily,
  // „Začít kolo" by rozehrané kolo i se skóre přepsalo prázdným.
  for (let i = 0; i < 3; i += 1) {
    await page.goBack()
    await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
  }

  const after = await currentRound(page)
  expect(after.id, 'zpět z rozehraného kola založilo jiné kolo').toBe(before.id)
})

test('dvojice se dají změnit i po zahájení kola', async ({ page }) => {
  await startFlight(page)
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  // Zápis na první jamce, který změna dvojic nesmí smazat.
  await page.locator('.player-row').first().locator('.score-value').click()
  const before = await currentRound(page)
  expect(before.teams.map((team) => team.playerIds)).toEqual([
    ['p1', 'p2'],
    ['p3', 'p4'],
  ])

  await page
    .locator('.content .link-row .link-button', { hasText: PAIRING_TITLE })
    .click()
  await expectSetupStep(page, 'game')
  await page.locator('.secondary-button').first().click()
  await expect(page.locator('.app-header h1')).toHaveText(PAIRING_TITLE)
  await page.locator('.game-card').nth(2).click()
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()

  const after = await currentRound(page)
  expect(after.id).toBe(before.id)
  expect(after.teams.map((team) => team.playerIds)).toEqual([
    ['p1', 'p4'],
    ['p2', 'p3'],
  ])
  // Nepřekročitelné pravidlo: zapsané skóre se nikdy nemaže.
  expect(after.scores).toEqual(before.scores)
})

test('šipka zpět vede z první jamky na nastavení kola', async ({ page }) => {
  await startFlight(page)
  test.skip(await isLandscapeScorecard(page), 'na šířku zapisuje scorekarta')

  // Na první jamce není kam listovat, takže šipka místo toho otevře kroky.
  const back = page.locator('.hole-nav .nav-arrow').first()
  await expect(back).toBeEnabled()
  await back.click()
  await expectSetupStep(page, 'game')

  // Z druhé jamky listuje dál po jamkách jako dosud.
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-header')).toBeVisible()
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-number')).toHaveText('2')
  await page.locator('.hole-nav .nav-arrow').first().click()
  await expect(page.locator('.hole-number')).toHaveText('1')
})
