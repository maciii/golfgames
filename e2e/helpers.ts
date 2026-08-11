import { expect, type Page } from '@playwright/test'

/**
 * Pomocníci pro testy rozvržení.
 *
 * Měří se vlastnosti, které platí na každém displeji a v každém prohlížeči -
 * ne konkrétní pixely. Screenshotové porovnání by mezi Chromiem, WebKitem
 * a Geckem hlásilo rozdíly v antialiasingu a testy by musel někdo pořád
 * přepisovat.
 */

/** Nejmenší rozumný dotykový cíl. WCAG 2.2 chce 24 px, Apple i Google 44. */
export const MIN_TAP_SIZE = 44

/**
 * Stránka se nesmí posouvat do stran.
 *
 * Vodorovný posuv znamená, že něco přeteklo z displeje - na telefonu je to
 * nejčastější a nejotravnější chyba rozvržení. Jeden pixel tolerance kryje
 * zaokrouhlení při neceločíselném device pixel ratio.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  expect(
    scrollWidth,
    `stránka přetéká o ${scrollWidth - clientWidth} px do šířky`,
  ).toBeLessThanOrEqual(clientWidth + 1)
}

/**
 * Žádný viditelný prvek nesmí trčet za pravý okraj.
 *
 * Doplňuje kontrolu posuvu: prvek může přetéct i tam, kde stránku neposune
 * (třeba uvnitř kontejneru s `overflow: hidden`), a stejně bude uříznutý.
 * Prvky s vlastním vodorovným posuvem se přeskakují - u scorekarty je to záměr.
 */
export async function expectNothingClipped(page: Page): Promise<void> {
  const offenders = await page.evaluate(() => {
    const limit = document.documentElement.clientWidth
    const found: string[] = []

    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      // Vlastní posuv uvnitř prvku je legitimní řešení širokého obsahu.
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue
      if (element.closest('.scorecard-wrap')) continue

      const box = element.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      if (box.right > limit + 1) {
        const name = element.className || element.tagName.toLowerCase()
        found.push(`${name} (right ${Math.round(box.right)} > ${limit})`)
      }
    }

    return [...new Set(found)].slice(0, 10)
  })

  expect(offenders, `prvky přetékají za pravý okraj:\n${offenders.join('\n')}`).toEqual(
    [],
  )
}

/** Prvek je vidět celý ve výřezu a dá se na něj klepnout prstem. */
export async function expectTappable(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first()
  await expect(element).toBeVisible()

  const box = await element.boundingBox()
  expect(box, `${selector} nemá rozměry`).not.toBeNull()
  expect(
    box!.height,
    `${selector} je nižší než ${MIN_TAP_SIZE} px`,
  ).toBeGreaterThanOrEqual(MIN_TAP_SIZE - 1)

  const viewport = page.viewportSize()
  if (viewport) {
    expect(box!.x, `${selector} začíná mimo displej`).toBeGreaterThanOrEqual(-1)
    expect(box!.x + box!.width, `${selector} končí mimo displej`).toBeLessThanOrEqual(
      viewport.width + 1,
    )
  }
}

/**
 * Hřiště uložené rovnou do úložiště.
 *
 * Kroky, které se ptají na odpaliště nebo handicap, bez hřiště nemají co
 * ukázat - a stahovat kvůli tomu katalog by testy pověsilo na síť.
 */
const PREVIEW_COURSE = {
  id: 'local:e2e',
  name: 'Testovací hřiště',
  country: 'CZ',
  holeCount: 18,
  pars: [4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4],
  strokeIndex: [5, 1, 17, 7, 11, 3, 15, 9, 13, 6, 2, 18, 8, 12, 4, 16, 10, 14],
  tees: [
    { id: 'yellow', name: 'Žlutá', courseRating: 71.2, slopeRating: 128, par: 71 },
    { id: 'red', name: 'Červená', courseRating: 70.1, slopeRating: 124, par: 71 },
  ],
  source: 'manual',
  origin: 'private',
}

/** Uloží testovací hřiště a načte appku znovu, ať ho vidí. */
export async function seedCourse(page: Page): Promise<void> {
  await page.evaluate((course) => {
    window.localStorage.setItem('golfgames.courses.v1', JSON.stringify([course]))
  }, PREVIEW_COURSE)
  await page.reload()
  await expect(page.locator('.screen')).toBeVisible()
}

/** Nové kolo na testovacím hřišti; končí na kroku odpališť. */
export async function openSetupWithCourse(page: Page): Promise<void> {
  await seedCourse(page)
  await openCoursePicker(page)
  await page
    .locator('.course-item-main')
    .filter({ hasText: PREVIEW_COURSE.name })
    .first()
    .click()
  await expectSetupStep(page, 'tee')
}

/**
 * Kroky zakládání kola po výběru hřiště, v pořadí, ve kterém se procházejí.
 *
 * Krok 1 je výběr hřiště (`CoursePickerScreen`) a ten má vlastní pomocníky -
 * jde z něj odbočit na hru bez hřiště, takže se nechová jako ostatní kroky.
 */
export const SETUP_STEPS = ['tee', 'players', 'game', 'bet'] as const
export type SetupStep = (typeof SETUP_STEPS)[number]

/**
 * Nadpis kroku v obou jazycích. Testy běží v češtině (viz `playwright.config.ts`),
 * ale příliš to nestojí za to, aby se rozbily po přepnutí výchozího jazyka.
 */
const STEP_TITLE: Record<SetupStep, RegExp> = {
  tee: /Odpaliště a jamky|Tees and holes/i,
  players: /Hráči|Players/i,
  game: /Hra a dvojice|Game and teams/i,
  bet: /Sázka|Stake/i,
}

/** Čeká, až je vidět daný krok zakládání kola. */
export async function expectSetupStep(page: Page, step: SetupStep): Promise<void> {
  await expect(page.locator('.app-header h1')).toHaveText(STEP_TITLE[step])
}

/**
 * Z domovské obrazovky na výběr hřiště - první krok nového kola.
 *
 * Appka od rozhodnutí #28 začíná domovskou obrazovkou, ne rovnou hřištěm.
 */
export async function openCoursePicker(page: Page): Promise<void> {
  await page.locator('.home-new-round').click()
  await expect(page.locator('.course-list')).toBeVisible()
}

/**
 * Přeskočí výběr hřiště a otevře zakládání kola na zvoleném kroku.
 *
 * Bez hřiště vypadají kroky stejně jako s ním (jen bez odpališť), takže se
 * testy rozvržení nemusí spoléhat na stažený katalog - ten na CI ani nemusí
 * být dostupný.
 */
export async function openSetup(page: Page, step: SetupStep = 'players'): Promise<void> {
  await openCoursePicker(page)
  await page
    .locator('.app-footer .link-button', { hasText: /bez hřiště|without a course/i })
    .click()
  await expectSetupStep(page, 'tee')

  const target = SETUP_STEPS.indexOf(step)
  for (let i = 0; i < target; i += 1) {
    await page.locator('.app-footer .primary-button').click()
    const next = SETUP_STEPS[i + 1]
    if (next) await expectSetupStep(page, next)
  }
}

/**
 * Založí kolo s výchozím nastavením a počká na obrazovku zápisu skóre.
 *
 * Na telefonu na šířku převezme zápis živá scorekarta, takže se čeká na jednu
 * ze dvou možných obrazovek.
 */
export async function startRound(page: Page): Promise<void> {
  await openSetup(page, 'bet')
  await page.locator('.app-footer .primary-button').click()
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
}

/** Hraje se zápis skóre na šířku jako scorekarta? */
export async function isLandscapeScorecard(page: Page): Promise<boolean> {
  return page.locator('.landscape-scorecard').isVisible()
}

/**
 * Otevře scorekartu z rozehraného kola.
 *
 * Na šířku je scorekarta rovnou místo zápisu skóre; na výšku se na ni jde
 * odkazem na průběžné výsledky pod zápisem.
 */
export async function openScorecard(page: Page): Promise<void> {
  if (!(await isLandscapeScorecard(page))) {
    await page.locator('.content .link-row .link-button').first().click()
  }
  await expect(page.locator('.scorecard').first()).toBeVisible()
}

/**
 * Přejede prstem od levého okraje doprava - gesto „zpět".
 *
 * Playwright umí klepnutí, ne tah, takže se dotykové události posílají ručně.
 * Testuje se tím obsluha gesta, ne systémové gesto prohlížeče - to
 * v nainstalované PWA stejně žádné není, o což tady jde.
 */
export async function swipeBack(
  page: Page,
  options: { fromX?: number; toX?: number; y?: number } = {},
): Promise<void> {
  const { fromX = 5, toX = 160, y = 400 } = options
  await page.evaluate(
    ({ fromX, toX, y }) => {
      const target = document.elementFromPoint(fromX, y) ?? document.body

      // WebKit neumí `new Touch()` (Illegal constructor) a `TouchEvent` se
      // konstruktorem nedá postavit všude stejně. Obsluha gesta čte jen
      // `touches.length`, `clientX/clientY` a `target`, takže stačí obyčejná
      // událost s dopsanými poli - a funguje ve všech třech enginech.
      const send = (type: string, x: number, ended: boolean) => {
        const point = { clientX: x, clientY: y, identifier: 1, target }
        const event = new Event(type, { bubbles: true, cancelable: true })
        Object.assign(event, {
          touches: ended ? [] : [point],
          targetTouches: ended ? [] : [point],
          changedTouches: [point],
        })
        target.dispatchEvent(event)
      }

      send('touchstart', fromX, false)
      send('touchmove', (fromX + toX) / 2, false)
      send('touchmove', toX, false)
      send('touchend', toX, true)
    },
    { fromX, toX, y },
  )
}

/** Rozehrané kolo tak, jak ho appka uložila - kontrola, co ze zakládání vzešlo. */
export async function currentRound(page: Page): Promise<{ holeCount: number }> {
  const raw = await page.evaluate(() =>
    window.localStorage.getItem('golfgames.currentRound.v1'),
  )
  expect(raw, 'rozehrané kolo není v úložišti').not.toBeNull()
  return JSON.parse(raw!) as { holeCount: number }
}
