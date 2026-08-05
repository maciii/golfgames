# Architektura

Jak je aplikace poskládaná a proč. Dokument je psaný tak, aby po jeho přečtení
šlo v projektu pokračovat bez znalosti původní konverzace – ať už člověkem,
nebo AI asistentem.

Doplňující čtení:

- [`games.md`](games.md) – pravidla her a bodování do posledního detailu
- [`decisions.md`](decisions.md) – proč se věci dělaly zrovna takhle
- [`deployment.md`](deployment.md) – nasazení a vlastní doména
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) – příkazy, konvence, verzování

## Co to je

PWA pro zápis golfového skóre po jamkách pro 2–4 hráče a vyhodnocení různých
typů golfových her (Best Aggregate, Skins, Match play) včetně peněžního
vyrovnání sázky.

Klíčové vlastnosti prostředí, které tvarují všechna rozhodnutí:

- **Běží na telefonu přidaná na plochu** – na iPhonu v Safari, na Androidu
  v Chrome jako WebAPK. Ovládá se jednou rukou, často v rukavici a na slunci.
- **Bez placených služeb.** Hosting je GitHub Pages, data jsou v `localStorage`
  telefonu. Účet a záloha do cloudu jsou **nepovinné** – bez přihlášení
  aplikace nenaváže žádné spojení a chová se jako úplně offline aplikace.
- **Offline first.** Na hřišti nemusí být signál; service worker předcachuje
  celou aplikaci.

## Vrstvy

```
                 ┌────────────────────────────────────┐
   React         │ screens/  (UI, texty přes useT())  │
                 └───────────────┬────────────────────┘
                                 │ čte Round, volá callbacky
                 ┌───────────────▼────────────────────┐
   pravidla her  │ games/    (GameDefinition)         │
                 └───────────────┬────────────────────┘
                                 │ čte Round
                 ┌───────────────▼────────────────────┐
   model         │ types.ts   (Round + výpočty)       │
                 │ money.ts   (přepočet na peníze)    │
                 │ handicap.ts (netto, rozdělení ran) │
                 │ courses/   (model hřiště)          │
                 │ i18n/      (překlady, formátování) │
                 └───────────────┬────────────────────┘
                                 │
                 ┌───────────────▼────────────────────┐
   perzistence   │ storage.ts (localStorage)          │
                 │ backup.ts  (export/import JSON)    │
                 │ sync/      (nepovinně Firestore)   │
                 └────────────────────────────────────┘
```

Závislosti jdou vždy jen dolů. Konkrétně:

- **Obrazovka nikdy nepočítá pravidla hry.** Vykreslí, co jí vrátí
  `computeStandings()`, `holeSummary()`, `headerSummary()` a scorecardové
  dekorace hry. Jediná výjimka je `PlayScreen`, která zná obecné pojmy z
  `types.ts` (par, extra body, kategorie výsledku), ne ale pravidla konkrétní
  hry.
- **Hra nikdy nesahá do `localStorage`** ani nezná React.
- **`types.ts` nezná hry.** Obsahuje jen model kola a výpočty, které platí pro
  všechny hry.

## Datový model

Celý stav jednoho kola je jeden objekt `Round` (viz [`src/types.ts`](../src/types.ts)).
Je serializovatelný do JSON – tím pádem jde uložit do `localStorage` a archivu
beze změny tvaru.

```ts
interface Round {
  id: string // `${timestamp}-${random}`
  gameId: string // 'best-aggregate' | 'skins' | 'match-play'
  createdAt: string // ISO
  finishedAt?: string // chybí => kolo je rozehrané
  players: Player[] // id 'p1'..'p4'
  teams: Team[] // prázdné u her jednotlivců; id 't1', 't2'
  holeCount: number // 9 nebo 18
  pars: number[] // délka === holeCount
  scores: Record<PlayerId, (number | null)[]>
  bonuses: Record<PlayerId, BonusId[][]> // extra body na jamce
  currentHole: number // 0-based
  settings: RoundSettings // sázka + volby bodování, vlastní kopie
  updatedAt?: string // ISO; poslední skutečná změna dat, řídí synchronizaci
  course?: RoundCourse // hřiště, se kterým se hrálo - taky vlastní kopie
  netScoring?: boolean // hraje se na rány s handicapem?
}
```

`updatedAt` zvedá výhradně `touchRound()` při změně dat (skóre, par, bonus,
nastavení), ne při listování jamkami. Stará kola z verzí před synchronizací ho
nemají a `normalizeRound()` jim ho doplní jako `finishedAt ?? createdAt`.

### Invarianty, které je potřeba držet

1. **`scores[playerId][hole] === null` má dva různé významy.** Rozlišuje je
   `isHoleStarted()`: když na jamce nezapsal nikdo, jamka se ještě nehrála
   a nikomu se nezapočítá. Když někdo zapsal, jamka běží a komu zápis chybí,
   ten ji **vzdal**. Tohle je nejčastější zdroj chyb v bodování – každá nová
   hra to musí ošetřit.
2. **`round.settings` a `round.course` jsou hluboké kopie.** `createRound()`
   kopíruje i vnořené `bonusValues`, `resultMultipliers` a `strokeIndex`. Kolo
   si nastavení i hřiště nese s sebou, takže pozdější změna předvoleb ani
   přenormování hřiště nepřepočítá archivní kola. Nikdy nedávejte do kola
   referenci na sdílený objekt.
3. **`pars` má vždy délku `holeCount`** a hodnoty 3/4/5 (výchozí 4).
4. **Indexy jamek jsou v kódu 0-based, v UI 1-based.** Převádí se výhradně na
   hranici UI (`Jamka {hole + 1}`); výjimka je `RoundCompleteness`, které vrací
   rovnou 1-based čísla, protože slouží jen pro text hlášky.
5. **`teams[i].playerIds` má stabilní pořadí.** Peněžní vyrovnání dvojic páruje
   protějšky podle indexu (první platí prvnímu), takže přeházení pořadí změní,
   kdo komu platí.

### Sentinel `CONCEDED`

Vzdaná jamka se v porovnáních reprezentuje jako `Number.POSITIVE_INFINITY`
(`src/games/shared.ts`). Prohraje s jakýmkoli zapsaným skóre, ale dvě vzdané
hodnoty proti sobě vyjdou jako shoda – přesně jak se to má chovat. Do dat se
sentinel nikdy neukládá, existuje jen ve výpočtech.

## Rozhraní hry

Hra je jeden objekt implementující `GameDefinition`
([`src/games/types.ts`](../src/games/types.ts)):

| Člen                         | Povinné | K čemu                                       |
| ---------------------------- | ------- | -------------------------------------------- |
| `id`                         | ano     | identita hry; texty jsou v `src/i18n/`       |
| `playerCounts`               | ano     | povolené počty hráčů                         |
| `usesTeams(count)`           | ano     | hraje se při daném počtu ve dvojicích?       |
| `supportsDoubleHoles`        | ano     | dává smysl volba „9. a 18. za dvojnásobek"?  |
| `scoringOptions`             | ano     | které bonusy a volby mají v této hře význam  |
| `computeStandings(round)`    | ano     | výsledkové tabulky (jedna nebo víc)          |
| `holeSummary(round, hole)`   | ne      | shrnutí u právě zapisované jamky             |
| `headerSummary(round, hole)` | ne      | průběžné skóre a stav aktuální jamky         |
| `scorecardPlayerCell(...)`   | ne      | dekorace výsledku hráče (např. skin a bonus) |
| `scorecardPlayerTotal(...)`  | ne      | souhrn hry za celkovými ránami hráče         |
| `scorecardColumns(round)`    | ne      | vlastní sloupce ve scorekartě                |

Registr je [`src/games/index.ts`](../src/games/index.ts). `getGame()` při
neznámém `id` vrací výchozí hru, aby archiv s odstraněnou hrou nespadl.

**Kontrakt výsledkové tabulky:** první sekce z `computeStandings()` je zároveň
podkladem pro peněžní vyrovnání – `ResultsScreen` z ní bere `row.value` jako
„jednotky" (body, skiny, vyhrané jamky) a předá je `settleRound()`. Nová hra
proto musí mít v první sekci hodnotu, která dává smysl přepočítat na peníze.

**Řazení** obstarává `rankRows(rows, 'highest' | 'lowest')`: doplní pozice,
při shodě je sdílí (1, 1, 3) a strany bez jediné započítané jamky odsune na
konec, aby nikdo nevedl jen proto, že ještě nic nezapsal.

### Přidání hry v pěti krocích

1. Nový soubor `src/games/<hra>.ts` s objektem typu `GameDefinition`.
2. Zápis do pole `GAMES` v `src/games/index.ts`.
3. Testy `src/games/<hra>.test.ts` (fixtura `makeRound` je v `fixtures.ts`).
4. Kapitola v [`games.md`](games.md) včetně rozhodnutí tam, kde pravidla mlčí.
5. Záznam v [`../CHANGELOG.md`](../CHANGELOG.md) a `npm run bump:minor`.

Nic dalšího se nemění – zápis skóre, ukládání, archiv, scorekarta i peněžní
vyrovnání jsou společné. `scoringOptions` ale musí přesně deklarovat, které
volby hra používá a jestli extra body připadnou celé dvojici, nebo jednotlivci.

**Pozor na příjemce bonusu:** týmové hry připisují extra bod celé dvojici,
individuální hry hráči, který ho uhrál. Rozsah je součástí
`GameDefinition.scoringOptions`, ne předpoklad obrazovky.

## Extra body (bonusy)

Model je v `types.ts`, vyhodnocení v konkrétní hře. Best Aggregate používá
týmové bonusy, Skins hráčské bonusy a Match play extra body nepoužívá.

- `BONUSES` je seznam definic (`BonusDefinition`): `double`, `longest`,
  `nearest`, `bunker`, `doubleBunker`, `water`, `barkie`, `arnie`.
- `kind: 'points'` přidává body, `kind: 'multiplier'` (dvojnásobná sázka)
  násobí celou jamku.
- `onlyPar` omezuje nabídku na jamky daného paru (Longest na par 5, Nearest
  na par 3).
- `exclusive` znamená, že bonus na jamce drží jediný hráč – `toggleBonus()`
  ho ostatním automaticky odebere.
- `mark` je značka u jména při zápisu (`L`, `N`, `×2`).

Hodnoty jsou v `GameOptions.bonusValues` **per hra** (`storage.loadGameOptions`),
hodnota `0` znamená vypnuto a bonus se pak vůbec nenabídne
(`availableBonuses()`).

Násobení podle výsledku řeší `bonusMultiplier(diff, resultMultipliers)`:
par ×1, birdie/eagle/albatros/condor podle nastavení (výchozí 2/3/10/1000),
bogey a horší = 0. Longest a Nearest se **nenásobí** – o jejich přiznání
rozhoduje potvrzovací pravidlo (`exclusiveBonusOutcome()`), popsané
v [`games.md`](games.md#extra-body).

## Násobení jamky

Dvě nezávislé věci se násobí mezi sebou (`holeMultiplier()`):

1. **Dvojnásobná 9. a 18. jamka** – volba `doubleClosingHoles` v nastavení hry.
2. **Zvolená dvojnásobná sázka** – volba `double`, každý zápis násobí zvlášť
   (`doubleCallMultiplier()` = `2 ** početZápisů`).

Dvojnásobná jamka s jedním doublem je tedy za čtyřnásobek. Volba
`noDoubleBonuses` nechává extra body v základní hodnotě, i když se zbytek
jamky násobí.

## Perzistence

Všechno je v `localStorage` pod klíči s verzí:

| Klíč                        | Obsah                                       |
| --------------------------- | ------------------------------------------- |
| `golfgames.currentRound.v1` | rozehrané kolo (přežije zavření aplikace)   |
| `golfgames.archive.v1`      | až 100 odehraných kol, nejnovější první     |
| `golfgames.roster.v1`       | uložení spoluhráči                          |
| `golfgames.settings.v1`     | naposledy použitá sázka (předvyplnění)      |
| `golfgames.gameOptions.v1`  | volby bodování, mapa `gameId → GameOptions` |

Pravidla:

- **Zápis skóre je důležitější než ukládání.** Selhání `localStorage`
  (privátní režim, plná kvóta) se tiše ignoruje a hra běží dál.
- **Načtená data se normalizují** (`normalize()` v `storage.ts`): doplní se
  pole, která ve starších kolech chybí, a migrují se přesunutá pole. Když se
  do modelu přidá nová volba, patří do `DEFAULT_GAME_OPTIONS` **a** do merge
  v `normalize()`/`loadGameOptions()`, jinak stará kola spadnou na `undefined`.
- **Poškozený záznam se zahodí**, ne aby aplikace spadla (`isValidRound()`).
- Suffix `.v1` je připravený na nekompatibilní změnu tvaru dat; při ní se
  zvedne na `.v2` a přidá se převod (a `npm run bump:major`).

## Synchronizace (nepovinná)

Složka `src/sync/` přidává zálohu do Firestore přes účet Google. Je stavěná
tak, aby **nepřihlášeného uživatele nestála nic** - Firebase SDK se načítá
dynamickým importem až při přihlášení a je vynechané z předcachování service
workerem.

| Soubor               | Role                                                   |
| -------------------- | ------------------------------------------------------ |
| `firebase.ts`        | líné načtení SDK, konfigurace z `import.meta.env`      |
| `auth.ts`            | přihlášení Googlem (okno, při blokaci přesměrování)    |
| `merge.ts`           | **čisté funkce** slučování - jádro, které jde testovat |
| `sync.ts`            | pull/push, fronta neodeslaných změn                    |
| `AccountContext.tsx` | stav účtu pro celou aplikaci                           |

`localStorage` zůstává zdrojem pravdy; cloud je zrcadlo. Konflikty řeší
`updatedAt` (vyhrává novější), nic se nikdy nezahazuje. Podrobnosti včetně
nastavení projektu jsou v [`sync.md`](sync.md).

## Jazyky

`src/i18n/` drží češtinu a angličtinu. Vlastní řešení místo knihovny - textů je
pár stovek a potřebujeme z toho jen dosazení proměnných a množná čísla.

| Soubor      | Role                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| `cs.ts`     | **zdroj pravdy pro klíče** - typ `MessageKey` se odvozuje z něj          |
| `en.ts`     | `Record<MessageKey, Message>`, takže chybějící překlad je chyba překladu |
| `index.tsx` | kontext, `useT()`, detekce jazyka, `translate()`                         |
| `plural.ts` | výběr tvaru přes `Intl.PluralRules` (čeština má 1 / 2–4 / 5+)            |

Dvě věci, které se snadno přehlédnou:

- **Jazyk drží i modul, nejen React** (`getLocale()`, `localeTag()`). Potřebují
  ho funkce mimo komponenty - formát peněz, datum kola a řazení jmen hráčů.
  `setActiveLocale()` je nastaví; volá ji provider a testy.
- **Texty her a bonusů nejsou v kódu her.** `GameDefinition` má jen `id`
  a překlady se hledají pod `games.<id>.name`, `bonus.<id>.name` a podobně.
  Že takový klíč existuje, hlídá test - TypeScript to u skládaného klíče
  neověří.

Volba jazyka: uložená předvolba → jazyk prohlížeče → angličtina.

## Stav a navigace

`App.tsx` drží tři věci: rozehrané kolo, archiv a jméno viditelné obrazovky
(`'setup' | 'play' | 'results' | 'archive' | 'gameSettings'`). Router tu není
záměrně – navigace je plochá a router by byl jen váha navíc.

Kolo se ukládá `useEffect`em při každé změně, takže ho není potřeba ukládat
ručně z obrazovek. Všechny změny skóre jdou přes callbacky v `App.tsx`, které
`Round` mění **neměnně** (nové pole/objekt, ne mutace) – jinak by se React
nepřekreslil.

Tok jednoho kola:

```
SetupScreen ──start──▶ PlayScreen ──finish──▶ ResultsScreen ──▶ ArchiveScreen
     │                     │                       │
     │              (BonusSheet)            (Scorecard)
     └──▶ GameSettingsScreen
```

`ResultsScreen` slouží zároveň jako detail archivního kola (`readOnly`).

## Obrazovky

| Soubor                   | Co dělá                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `SetupScreen.tsx`        | hra, hráči, dvojice, sázka, počet jamek; vstup do nastavení hry                                  |
| `PlayScreen.tsx`         | zápis skóre po jamkách, značky, extra body, ukončení kola; na mobilu v landscape živá scorekarta |
| `BonusSheet.tsx`         | výběr extra bodů pro hráče na jamce                                                              |
| `GameSettingsScreen.tsx` | hodnoty extra bodů, násobiče za výsledek, další volby                                            |
| `ResultsScreen.tsx`      | pořadí, vyrovnání, scorekarta, konfigurace kola                                                  |
| `Scorecard.tsx`          | tabulka se značkami skóre a vlastními sloupci hry                                                |
| `ArchiveScreen.tsx`      | seznam odehraných kol                                                                            |
| `BackupScreen.tsx`       | stažení zálohy do souboru a obnova z něj                                                         |
| `AccountScreen.tsx`      | přihlášení, stav synchronizace, smazání účtu i dat                                               |
| `PrivacyScreen.tsx`      | zásady zpracování údajů                                                                          |

### Ovládání zápisu skóre

Vychází z toho, že aplikace se ovládá palcem jedné ruky:

- `−` z prázdné buňky zapíše **birdie**, `+` **bogey**, klepnutí doprostřed
  **par**. Tři nejčastější výsledky jsou tak na jedno klepnutí.
- Další klepnutí na `−`/`+` posouvají po ránách (rozsah 1 až `MAX_STROKES`).
- **Přidržení čísla** (500 ms) zápis smaže. Krátké klepnutí je obsazené parem,
  takže mazání potřebuje vlastní gesto; `longPress.fired` brání tomu, aby
  doběhlý `click` po smazání zapsal par zpátky.

## Značky výsledku

`scoreCategory(score, par)` vrací jednu ze šesti kategorií (`eagle`, `birdie`,
`par`, `bogey`, `double`, `triple`), která je zároveň názvem CSS třídy. Stejná
značka se používá ve scorekartě i při zápisu, takže barva výsledku je vidět
hned. Barvy jsou proměnné `--score-*` v `styles.css`, vícenásobné obrysy se
kreslí `inset` box-shadow **dovnitř**, aby všechny značky měly stejný vnější
rozměr a mřížka scorekarty zůstala pravidelná.

Značky u jména hráče (`.player-mark`) mají čtyři tóny: `own` (zeleně – bonus
zůstává vlastní dvojici), `opponent` (červeně – propadá soupeřům), `pending`
(tlumeně – hráč jamku ještě nezapsal) a `multiplier` (modře – `×2`).

## Peníze

[`src/money.ts`](../src/money.ts) je nezávislý na hrách; dostane „strany"
(`SettlementParty` s počtem jednotek) a vrátí `Settlement`:

- `kind: 'transfers'` – dvě stejně velké dvojice. Rozdíl bodů × hodnota bodu
  platí **každý hráč prohrávající dvojice zvlášť** svému protějšku.
- `kind: 'balances'` – jednotlivci. Obsahuje čisté zůstatky (`rows`), přímé
  převody mezi každou dvojicí (`transfers`) i optimalizované převody
  (`optimizedTransfers`), které zachovají stejné zůstatky s minimem plateb.
- `kind: 'none'` – bez sázky nebo bez soupeře; sekce se v UI skryje.

Ve výsledcích se u jednotlivců zobrazí nadpis **Celková výhra** a přepínač
mezi **Konkrétními jednotlivými platbami** a **Optimalizovanými platbami**.
Výchozí detailní varianta zachovává původní význam „každý soupeř zvlášť",
optimalizovaná varianta pouze slučuje převody.

Podrobný výpočet i příklad je v [`games.md`](games.md#jak-se-počítají-peníze).

## Build a nasazení

- **Vite 8 + React 19 + TypeScript 7** ve striktním režimu včetně
  `noUncheckedIndexedAccess` (proto je v kódu tolik `?? fallback` u indexování).
- **Verze** se čte z `package.json` a vpéká do bundlu (`define` ve
  `vite.config.ts` → `__APP_VERSION__` → `src/version.ts`); zobrazuje se
  v patičce aplikace. `scripts/bump-version.mjs` ji zvedá před každým lokálním
  buildem, v CI se přeskakuje.
- **PWA** zajišťuje `vite-plugin-pwa` (`registerType: 'autoUpdate'`), workbox
  předcachuje všechno a `navigateFallback` drží aplikaci funkční offline.
- **`base`** se bere z `BASE_PATH` (výchozí `/`), protože aplikace běží na
  vlastní doméně. Bez ní by GitHub Pages potřebovaly `/golfgames/`.
- **CI** (`.github/workflows/deploy.yml`) na každém pushi pustí typy, testy
  a formát; z větve `main` publikuje na GitHub Pages.

Detaily kolem domény a časté problémy jsou v [`deployment.md`](deployment.md).

## Testy

Testuje se **matematika, ne React**: pravidla her, vyrovnání peněz a výpočty
nad modelem. Chyba v bodování je nejdražší a nejhůř se hledá; chyba v UI je
vidět hned.

- `src/games/*.test.ts` – pravidla her
- `src/money.test.ts` – peněžní vyrovnání
- `src/types.test.ts` – model kola: vzdané vs. nehrané jamky, výpis jamek,
  přidělení Longestu a Nearestu
- `src/backup.test.ts` – slučování archivů a kontrola souboru se zálohou
- `src/sync/merge.test.ts` – slučování při synchronizaci (bez Firebase)
- `src/sync/document.test.ts` – tvar dokumentu pro Firestore
- `src/i18n/i18n.test.ts` – úplnost katalogů, množná čísla, dosazování

Fixtura `makeRound({ gameId, players, pars, scores, settings })`
(`src/games/fixtures.ts`) postaví kolo bez zbytečné ceremonie. Testy základních
pravidel používají `BASE_OPTIONS`, kde jsou volitelné nadstavby (Double Best,
dvojnásobné jamky) vypnuté – jinak by test tvrdil něco jiného, než měří.

## Kde co hledat

| Chci změnit…                     | Soubor                                  |
| -------------------------------- | --------------------------------------- |
| bodování Best Aggregate          | `src/games/bestAggregate.ts`            |
| chování vzdané jamky             | `src/games/shared.ts` + konkrétní hra   |
| seznam extra bodů, jejich značky | `src/types.ts` (`BONUSES`)              |
| výchozí hodnoty a násobiče       | `src/types.ts` (`DEFAULT_GAME_OPTIONS`) |
| přepočet bodů na peníze          | `src/money.ts`                          |
| rozdělení ran a netto výsledky   | `src/handicap.ts`                       |
| model hřiště a jeho kontrola     | `src/courses/types.ts`                  |
| zadání hřiště                    | `src/screens/CourseEditScreen.tsx`      |
| barvy a tvary značek skóre       | `src/styles.css` (`--score-*`, `.mark`) |
| co se ukládá do telefonu         | `src/storage.ts`                        |
| tvar souboru se zálohou          | `src/backup.ts`                         |
| slučování při synchronizaci      | `src/sync/merge.ts`                     |
| co a kdy se posílá do cloudu     | `src/sync/sync.ts`                      |
| přihlášení Googlem               | `src/sync/auth.ts`                      |
| tvar dokumentu ve Firestore      | `src/sync/document.ts`                  |
| texty aplikace                   | `src/i18n/cs.ts`, `src/i18n/en.ts`      |
| ovládání zápisu skóre            | `src/screens/PlayScreen.tsx`            |
| obsah nastavení bodování         | `src/screens/GameSettingsScreen.tsx`    |
