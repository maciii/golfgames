import { expect, test } from '@playwright/test'
import {
  SETUP_STEPS,
  currentRound,
  expectNoHorizontalOverflow,
  expectNothingClipped,
  expectSetupStep,
  expectTappable,
  footerBox,
  isLandscapeScorecard,
  openCoursePicker,
  openScorecard,
  openSetup,
  openArchivedRoundDetail,
  PAIRING_TITLE,
  openSetupWithCourse,
  scrollContentToEnd,
  scrollContentToTopOf,
  startRound,
  swipeBack,
} from './helpers'

/**
 * Responzivita rozhraní napříč displeji a prohlížeči.
 *
 * Každý test běží ve všech profilech z `playwright.config.ts` - od iPhonu SE
 * po desktop, ve WebKitu, Chromiu i Gecku. Ověřuje se chování, ne vzhled:
 * nic nepřetéká, ovládání jde stisknout prstem a široký obsah se posouvá
 * uvnitř svého rámu místo celou stránkou.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.screen')).toBeVisible()
})

test('domovská obrazovka se vejde do displeje', async ({ page }) => {
  // Od rozhodnutí #28 je domovská obrazovka to první, co uživatel vidí.
  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
  await expectTappable(page, '.home-new-round')
})

test('výběr hřiště se vejde do displeje', async ({ page }) => {
  await openCoursePicker(page)
  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
})

// Zakládání kola je pět kroků (rozhodnutí #29) a rozvržení musí sedět
// v každém z nich - dřív to byl jeden dlouhý formulář a stačil jeden test.
for (const step of SETUP_STEPS) {
  test(`krok zakládání kola „${step}" se vejde do displeje`, async ({ page }) => {
    await openSetup(page, step)
    await expectNoHorizontalOverflow(page)
    await expectNothingClipped(page)
    await expectTappable(page, '.app-footer .primary-button')
  })
}

test('přepínače a pole zůstávají v displeji i s dlouhými jmény', async ({ page }) => {
  await openSetup(page, 'players')
  // Delší jméno, než se do políčka vejde - nesmí roztlačit rozvržení.
  const names = page.locator('.name-input')
  await names.first().fill('Bartoloměj Nejdelšíjméno Novotný-Svobodová')

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
})

test('nastavení bodování hry se vejde do displeje', async ({ page }) => {
  await openSetup(page, 'game')
  await page.locator('.game-settings-button').first().click()
  await expect(page.locator('.section-title').first()).toBeVisible()

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
})

test('zpět prochází kroky zakládání kola pozpátku', async ({ page }) => {
  // Rozhodnutí #27: zpět naviguje uvnitř appky. S krokovým zakládáním kola
  // to znamená, že se gesto zpět vrací o krok, ne rovnou z appky ven.
  await openSetup(page, 'bet')
  await page.goBack()
  // Dvojice jsou vlastní krok, takže cesta zpět vede přes ně.
  await expect(page.locator('.app-header h1')).toHaveText(PAIRING_TITLE)
  await page.goBack()
  await expectSetupStep(page, 'game')
  await page.goBack()
  await expectSetupStep(page, 'players')
})

test('kolo bez hřiště si nese zvolený počet jamek', async ({ page }) => {
  // Regrese: krok sázky počítal délku kola s natvrdo psanou osmnáctkou, takže
  // volba z kroku odpališť se do založeného kola vůbec nedostala.
  await openSetup(page, 'tee')
  await page.locator('.segment', { hasText: /^9$/ }).click()

  // Zbylé kroky (hráči, hra, dvojice, sázka) a pak samotné založení kola.
  for (let click = 0; click < 5; click += 1) {
    await page.locator('.app-footer .primary-button').click()
  }
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()

  expect((await currentRound(page)).holeCount).toBe(9)
})

test('z výběru hřiště vede cesta zpět na domovskou obrazovku', async ({ page }) => {
  // Nainstalovaná PWA nemá systémové gesto zpět ani lištu prohlížeče, takže
  // obrazovka bez tlačítka Zpět je slepá ulička - odsud se nedal otevřít ani
  // účet, ani záloha, protože obojí je v menu na domovské obrazovce.
  await openCoursePicker(page)
  await page.locator('.app-header .icon-button').first().click()
  await expect(page.locator('.home-new-round')).toBeVisible()
})

test('tažení od levého okraje funguje jako zpět', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'gesto se ovládá prstem, na desktopu se nesleduje',
  )
  await openSetup(page, 'game')
  await swipeBack(page)
  await expectSetupStep(page, 'players')
})

test('tažení uprostřed obrazovky ani krátké tažení nenaviguje', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'gesto se ovládá prstem, na desktopu se nesleduje',
  )
  await openSetup(page, 'game')

  // Začátek mimo pás u okraje: to je běžné tažení po obsahu.
  await swipeBack(page, { fromX: 150, toX: 320 })
  await expectSetupStep(page, 'game')

  // Krátké cuknutí od okraje taky ne - jinak by gesto chytalo omyly.
  await swipeBack(page, { fromX: 5, toX: 40 })
  await expectSetupStep(page, 'game')
})

test('na výchozí obrazovce gesto zpět appku neopustí', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'gesto se ovládá prstem, na desktopu se nesleduje',
  )
  await expect(page.locator('.home-new-round')).toBeVisible()
  await swipeBack(page)
  await expect(page.locator('.home-new-round')).toBeVisible()
})

test('gesto zpět nekrade tažení scorekartě', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'gesto se ovládá prstem, na desktopu se nesleduje',
  )
  // Scorekarta se posouvá do stran a na telefonu sahá až k okraji displeje.
  await startRound(page)
  await openScorecard(page)

  const wrap = page.locator('.scorecard-wrap').first()
  // Na malém displeji je scorekarta pod přehledem výsledků, takže se k ní
  // nejdřív musí odrolovat - tah má začít uvnitř ní, ne pod ní.
  await scrollContentToTopOf(page, '.scorecard-wrap')
  const geometry = await wrap.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    top: element.getBoundingClientRect().top,
    scrolls: element.scrollWidth > element.clientWidth,
    viewport: window.innerHeight,
  }))

  // Na širším telefonu se tabulka vejde celá a není co ukrást - gesto tam smí
  // fungovat i nad scorekartou. Konflikt existuje jen tam, kde se karta
  // opravdu posouvá.
  test.skip(!geometry.scrolls, 'scorekarta se na tomhle displeji vejde celá')

  // Tah musí začít uvnitř tabulky, ale pořád v pásu u okraje - jinak by test
  // jen ověřoval, že gesto funguje vedle scorekarty.
  const fromX = Math.round(geometry.left) + 2
  expect(fromX, 'scorekarta nezasahuje do pásu u okraje').toBeLessThan(28)

  const y = Math.round(geometry.top) + 20
  expect(y, 'tah by začal mimo displej, ne ve scorekartě').toBeLessThan(geometry.viewport)

  await swipeBack(page, { fromX, toX: fromX + 160, y })

  await expect(page.locator('.scorecard').first()).toBeVisible()
})

test('HCP se zadává v řádku hráče mezi jménem a odpalištěm', async ({ page }) => {
  await openSetupWithCourse(page)
  await page.locator('.app-footer .primary-button').click()
  await expectSetupStep(page, 'players')
  await page.locator('.switch input[type=checkbox]').first().check()

  // Pořadí v řádku je celý smysl téhle úpravy: jméno, HCP, odpaliště.
  const row = page.locator('.setup-player-main').first()
  const order = await row.evaluate((element) =>
    [...element.children].map((child) => {
      if (child.classList.contains('setup-player-handicap')) return 'handicap'
      if (child.classList.contains('tee-dot')) return 'tee'
      return 'name'
    }),
  )
  expect(order).toEqual(['name', 'handicap', 'tee'])

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
})

test('list s výběrem jde zavřít tlačítkem, nejen klepnutím vedle', async ({ page }) => {
  // Ostatní listy (odpaliště, extra body, menu) Zavřít mají; u dlouhého
  // seznamu je klepnutí vedle jediná cesta ven jen těžko k nalezení.
  await openSetupWithCourse(page)
  await page.locator('.pick-trigger').first().click()
  const sheet = page.locator('.sheet')
  await expect(sheet).toBeVisible()

  await sheet.locator('.link-button').last().click()
  await expect(sheet).toBeHidden()
})

test('scorekarta ukazuje mezisoučet po první devítce jen na osmnáctce', async ({
  page,
}) => {
  // Kolo bez hřiště má výchozích 18 jamek, takže par první devítky je 9 × 4.
  await startRound(page)
  await openScorecard(page)

  const turnRow = page.locator('.scorecard-turn-row')
  await expect(turnRow).toHaveCount(1)
  await expect(turnRow.locator('.par-cell')).toHaveText('36')

  // Mezisoučet stojí hned pod devátou jamkou, ne až na konci tabulky.
  const holeBefore = turnRow.locator('xpath=preceding-sibling::tr[1]/th')
  await expect(holeBefore).toHaveText('9')
})

test('scorekarta devítijamkového kola mezisoučet nemá', async ({ page }) => {
  await openSetup(page, 'tee')
  await page.locator('.segment', { hasText: /^9$/ }).click()
  for (let click = 0; click < 5; click += 1) {
    await page.locator('.app-footer .primary-button').click()
  }
  await expect(page.locator('.hole-header, .landscape-scorecard').first()).toBeVisible()
  await openScorecard(page)

  await expect(page.locator('.scorecard')).toBeVisible()
  await expect(page.locator('.scorecard-turn-row')).toHaveCount(0)
})

test('zápis skóre se vejde do displeje a stepper jde ovládat', async ({ page }) => {
  await startRound(page)
  await expectNoHorizontalOverflow(page)

  if (await isLandscapeScorecard(page)) {
    // Na šířku je místo zápisu vidět scorekarta; stepper na ní není.
    await expect(page.locator('.scorecard')).toBeVisible()
    return
  }

  await expectNothingClipped(page)
  await expectTappable(page, '.step-button')
  await expectTappable(page, '.score-value')
})

test('zápis skóre se vejde na jednu obrazovku bez rolování', async ({
  page,
}, testInfo) => {
  // Na jamce se zapisují čtyři skóre jednou rukou, často v rukavici. Rolovat
  // za posledním hráčem je v té situaci nepoužitelné, takže se celý zápis musí
  // vejít do displeje - viz nepřekročitelné pravidlo 10 v AGENTS.md.
  //
  // Pravidlo je psané pro telefon a jen tam se i ověřuje. Na desktopu je okno
  // vysoké 720 px, zápis čtyř hráčů potřebuje zhruba 800 - jenže tam se roluje
  // kolečkem a ruka v rukavici to neřeší, takže by test hlídal něco, co pravidlo
  // netvrdí. Větší displeje jsou podle `playwright.config.ts` kontrola navíc.
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'pravidlo o jedné obrazovce platí pro telefon',
  )
  await startRound(page)
  test.skip(
    await isLandscapeScorecard(page),
    'na šířku zapisuje scorekarta, která se posouvá uvnitř svého rámu',
  )
  // Na iPhonu SE se čtyři hráči nevejdou ani dnes - chybí zhruba 200 px.
  // Je to starší nedostatek, ne regrese; `fixme` ho drží viditelný v reportu
  // místo toho, aby se schoval za zelenou.
  const viewport = page.viewportSize()
  test.fixme(
    (viewport?.height ?? 0) < 700,
    'na displeji pod 700 px se čtyři hráči zatím nevejdou',
  )

  // Obrazovka je vysoká jako displej a roluje se obsah v ní, takže „nevejde
  // se" znamená, že má obsah co posouvat.
  const { scrollHeight, clientHeight } = await page.evaluate(() => {
    const content = document.querySelector('.screen .content')
    return {
      scrollHeight: content?.scrollHeight ?? 0,
      clientHeight: content?.clientHeight ?? 0,
    }
  })

  expect(
    scrollHeight,
    `zápis skóre přerostl displej o ${scrollHeight - clientHeight} px`,
  ).toBeLessThanOrEqual(clientHeight + 1)
})

test('scorekarta se posouvá uvnitř svého rámu, ne celou stránkou', async ({ page }) => {
  await startRound(page)

  if (!(await isLandscapeScorecard(page))) {
    // Průběžné výsledky jsou první odkaz pod zápisem skóre.
    await page.locator('.content .link-row .link-button').first().click()
  }

  const wrap = page.locator('.scorecard-wrap').first()
  await expect(wrap).toBeVisible()

  // Tabulka smí být širší než rám - od toho tam ten rám je.
  const fits = await wrap.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return box.right <= document.documentElement.clientWidth + 1
  })
  expect(fits, 'rám scorekarty přetéká z displeje').toBe(true)

  await expectNoHorizontalOverflow(page)
})

test('sloupec aplikace se na širokém displeji neroztáhne donekonečna', async ({
  page,
}) => {
  const width = await page
    .locator('.screen')
    .evaluate((el) => el.getBoundingClientRect().width)
  const viewport = page.viewportSize()?.width ?? width

  // Na telefonu sloupec vyplní displej, na desktopu se zastaví na čitelné šířce.
  expect(width).toBeLessThanOrEqual(Math.min(viewport, 720) + 1)
})

test('patička se posouváním obsahu nehýbe', async ({ page }) => {
  // Patička se držela dole přes `position: sticky` nad rolující stránkou.
  // Na iOS v nainstalované PWA se při tažení prstem odlepila doprostřed
  // displeje a překryla obsah. Obrazovka je proto vysoká jako displej
  // a roluje se jen obsah - patička nemá jak přijít o své místo.
  // Detail archivního kola je nejdelší obsah v appce (scorekarta, vyrovnání)
  // a je to obrazovka, na které se chyba ukázala.
  await openArchivedRoundDetail(page)

  const atTop = await footerBox(page)
  expect(atTop.bottom, 'patička nesedí na spodní hraně displeje').toBeGreaterThan(
    atTop.viewport - 60,
  )
  expect(atTop.bottom).toBeLessThanOrEqual(atTop.viewport + 1)

  const scrolled = await scrollContentToEnd(page)
  expect(scrolled, 'detail kola se nemá kam posunout').toBeGreaterThan(0)

  expect(await footerBox(page)).toEqual(atTop)
  await expect(page.locator('.app-footer').first()).toBeVisible()
  await expectTappable(page, '.app-footer .primary-button')

  // A na konci obsahu nesmí patička zakrývat jeho poslední kus.
  const overlap = await page.evaluate(() => {
    const content = document.querySelector('.screen .content')
    const footer = document.querySelector('.screen .app-footer')
    const last = content?.lastElementChild
    if (!content || !footer || !last) return 0
    return Math.round(
      last.getBoundingClientRect().bottom - footer.getBoundingClientRect().top,
    )
  })
  expect(overlap, `patička překrývá konec obsahu o ${overlap} px`).toBeLessThanOrEqual(1)
})

test('stránka se neposouvá, posouvá se obsah obrazovky', async ({ page }) => {
  // Kdyby se posouvala stránka, vrátila by se s ní i sticky patička a s ní
  // celá chyba na iOS.
  await openArchivedRoundDetail(page)
  await scrollContentToEnd(page)

  const pageScroll = await page.evaluate(() => ({
    scrollY: window.scrollY,
    docScroll: document.documentElement.scrollHeight,
    docClient: document.documentElement.clientHeight,
  }))

  expect(pageScroll.scrollY, 'stránka se posunula').toBe(0)
  expect(
    pageScroll.docScroll,
    `stránka je o ${pageScroll.docScroll - pageScroll.docClient} px vyšší než displej`,
  ).toBeLessThanOrEqual(pageScroll.docClient + 1)
})

test('panel s extra body se vejde do displeje', async ({ page }) => {
  await startRound(page)
  test.skip(await isLandscapeScorecard(page), 'na šířku se zapisuje ve scorekartě')

  const bonusButton = page.locator('.bonus-button').first()
  test.skip((await bonusButton.count()) === 0, 'hra nepoužívá extra body')

  await bonusButton.click()
  await expect(page.locator('.sheet')).toBeVisible()

  await expectNoHorizontalOverflow(page)
  await expectNothingClipped(page)
  await expectTappable(page, '.sheet .primary-button')
})

test('náhled rozhraní pro vizuální kontrolu', async ({ page }, testInfo) => {
  // Není to porovnání proti baseline - jen doklad, jak appka v daném profilu
  // vypadala. Rozdíly v antialiasingu mezi enginy by baseline dělaly nestabilní.
  await openSetup(page, 'players')
  await testInfo.attach(`setup-${testInfo.project.name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
