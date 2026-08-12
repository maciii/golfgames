import { expect, test } from '@playwright/test'
import {
  ARCHIVED_FIRST_SCORE,
  archivedRound,
  expectNoHorizontalOverflow,
  expectNothingClipped,
  expectTappable,
  isLandscapeScorecard,
  openArchivedRoundDetail,
  startRound,
} from './helpers'

/**
 * Dodatečná oprava odehraného kola.
 *
 * Skóre se počítá i po hře (někdo se přepočítá, někdo zapomene zapsat), takže
 * archiv nesmí být jen ke čtení. Opravy se ukládají rovnou do archivu a kolo
 * v něm zůstává na svém místě.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
})

/** Z detailu archivního kola do zápisu skóre. */
async function openEdit(page: import('@playwright/test').Page): Promise<void> {
  await openArchivedRoundDetail(page)
  await page.locator('.app-footer .secondary-button').click()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
}

test('oprava skóre se propíše do archivu', async ({ page }) => {
  await openEdit(page)
  // Na šířku převezme obrazovku živá scorekarta, ve které se nezapisuje.
  test.skip(await isLandscapeScorecard(page), 'zápis skóre je na šířku scorekarta')

  const before = await archivedRound(page)
  expect(before.scores.p1).toEqual(ARCHIVED_FIRST_SCORE)

  await page.locator('.player-row').first().locator('.step-button').last().click()

  // Hotovo vrací do detailu kola, kolo se neukončuje znovu.
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.app-header h1')).toHaveText(/Archivní kolo|Archived round/i)

  const after = await archivedRound(page)
  // Opravena je jen první jamka, zbytek kola se nesmí hnout.
  expect(after.scores.p1?.[0]).toBe((ARCHIVED_FIRST_SCORE[0] ?? 0) + 1)
  expect(after.scores.p1?.slice(1)).toEqual(ARCHIVED_FIRST_SCORE.slice(1))
  expect(after.updatedAt).not.toBe(before.updatedAt)
})

test('oprava archivního kola se vejde do displeje', async ({ page }) => {
  await openEdit(page)
  test.skip(await isLandscapeScorecard(page), 'zápis skóre je na šířku scorekarta')

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
  await expectTappable(page, '.app-footer .primary-button')
})

test('zpět z opravy vede do detailu kola, ne z appky', async ({ page }) => {
  await openEdit(page)

  await page.goBack()

  await expect(page.locator('.app-header h1')).toHaveText(/Archivní kolo|Archived round/i)
})

test('oprava právě dohraného kola se propíše i do rozehraného kola', async ({ page }) => {
  // Dohrané kolo je v úložišti dvakrát - v archivu a jako to naposledy
  // rozehrané. Když se rozejdou, po restartu appky se vrátí neopravená verze.
  page.on('dialog', (dialog) => void dialog.accept())
  await startRound(page)
  test.skip(await isLandscapeScorecard(page), 'zápis skóre je na šířku scorekarta')

  for (const row of await page.locator('.player-row').all()) {
    await row.locator('.step-button').last().click()
  }
  await page
    .locator('.content .link-row .link-button', { hasText: /Ukončit|Finish/i })
    .click()
  await expect(page.locator('.app-header h1')).toHaveText(/Výsledky|Results/i)

  await page
    .locator('.content .link-row .link-button', { hasText: /Archiv|Archive/i })
    .click()
  await page.locator('.archive-open').first().click()
  await page.locator('.app-footer .secondary-button').click()
  await page.locator('.player-row').first().locator('.step-button').last().click()
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.app-header h1')).toHaveText(/Archivní kolo|Archived round/i)

  const stored = await page.evaluate(() => {
    const current = JSON.parse(
      window.localStorage.getItem('golfgames.currentRound.v1') ?? 'null',
    )
    const archive = JSON.parse(
      window.localStorage.getItem('golfgames.archive.v1') ?? '[]',
    )
    return { current, archived: archive[0] }
  })

  expect(stored.current.id).toBe(stored.archived.id)
  expect(stored.current.scores).toEqual(stored.archived.scores)
  // Bogey ze zápisu (par + 1) a k tomu jedna rána z opravy.
  expect(stored.archived.scores.p1[0]).toBe(6)
})
