import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, expectNothingClipped } from './helpers'

/**
 * Seznam hráčů: vejde se do řádku celý handicapový index?
 *
 * Jméno se dá zkrátit tečkami, ale useknuté číslo nikdo nepřečte - a přesně
 * to se dělo, když bylo pole na HCP užší než hodnota v něm.
 */

/** Nejširší hodnoty, které se do pole reálně dostanou. */
const ROSTER = [
  { id: 'p1', name: 'Adam Novotný', handicapIndex: 54 },
  { id: 'p2', name: 'Barbora Svobodová', handicapIndex: 30.1 },
  { id: 'p3', name: 'Cyril Dvořák', handicapIndex: -10.5 },
]

async function openPlayers(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.evaluate((roster) => {
    window.localStorage.setItem('golfgames.roster.v1', JSON.stringify(roster))
  }, ROSTER)
  await page.reload()
  await page.locator('button[aria-label="Menu"]').click()
  await page
    .locator('.menu-drawer-item', {
      has: page.locator('.menu-drawer-label', { hasText: /^Hráči$/ }),
    })
    .click()
  await expect(page.locator('.players-row')).toHaveCount(ROSTER.length)
}

test('handicap se v seznamu hráčů zobrazí celý', async ({ page }) => {
  await openPlayers(page)

  // scrollWidth > clientWidth znamená, že text v poli nemá kam a je uříznutý.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLInputElement>('.players-hcp')]
      .filter((input) => input.scrollWidth > input.clientWidth + 1)
      .map((input) => `${input.value} (${input.scrollWidth} > ${input.clientWidth})`),
  )

  expect(clipped, `HCP se do pole nevešel:\n${clipped.join('\n')}`).toEqual([])
})

test('řádek hráče se vejde do displeje', async ({ page }) => {
  await openPlayers(page)

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)

  // Jméno musí zůstat čitelné, i když HCP dostal víc místa.
  const name = await page.locator('.players-name').first().boundingBox()
  expect(name!.width, 'na jméno nezbylo místo').toBeGreaterThan(60)
})

test('náhled seznamu hráčů pro vizuální kontrolu', async ({ page }, testInfo) => {
  await openPlayers(page)
  await testInfo.attach(`players-${testInfo.project.name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
