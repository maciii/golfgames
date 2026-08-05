# Jak na vývoj

## Rozjetí

```bash
npm install
npm run dev
```

Vyžaduje Node 22 (viz `.nvmrc`).

Než se pustíš do netriviální změny, projdi [`docs/architecture.md`](docs/architecture.md)
(jak je to poskládané) a [`docs/decisions.md`](docs/decisions.md) (proč).

## Skripty

| Příkaz               | Co dělá                                                |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | vývojový server s hot reloadem                         |
| `npm run build`      | zvedne patch verzi, zkontroluje typy a postaví `dist/` |
| `npm run preview`    | náhled produkčního buildu                              |
| `npm run test`       | testy pravidel her                                     |
| `npm run test:watch` | testy v watch režimu                                   |
| `npm run typecheck`  | jen kontrola typů                                      |
| `npm run format`     | přeformátuje zdrojáky Prettierem                       |
| `npm run check`      | typy + testy + kontrola formátování (co běží v CI)     |
| `npm run icons`      | přegeneruje PWA ikony do `public/`                     |

Build bez zvednutí verze (třeba jen na ověření): `npx vite build`.

## Verzování

Patch verzi zvedá `scripts/bump-version.mjs`, který se pouští automaticky
před každým buildem (`prebuild`). V CI se přeskakuje – běh na serveru nemá
kam změnu commitnout.

Větší změny se zvedají ručně:

```bash
npm run bump:minor   # nová hra, nová obrazovka, nová funkce
npm run bump:major   # nekompatibilní změna uložených dat
```

Verze se vpéká do bundlu (`vite.config.ts` → `define`) a zobrazuje v patičce
aplikace. Věcné změny patří do [`CHANGELOG.md`](CHANGELOG.md).

## Struktura

```
src/
  types.ts            datový model kola (hráči, dvojice, skóre, bonusy) + výpočty
  storage.ts          localStorage: rozehrané kolo, archiv, hráči, předvolby
  money.ts            přepočet bodů na peníze a formátování částek
  backup.ts           export a import dat do souboru JSON
  i18n/               překlady (čeština, angličtina)
    cs.ts             český katalog - zdroj pravdy pro klíče
    en.ts             anglický katalog
    index.tsx         kontext, useT(), detekce jazyka
    plural.ts         množná čísla přes Intl.PluralRules
  sync/               nepovinná záloha do Firestore přes účet Google
    firebase.ts       líné načtení SDK, kontrola konfigurace
    auth.ts           přihlášení Googlem (předehřátí kvůli blokování popupů)
    merge.ts          čisté funkce slučování
    document.ts       převod Round na dokument Firestore a zpět
    sync.ts           pull/push a fronta neodeslaných změn
    AccountContext.tsx  stav účtu a synchronizace pro celou aplikaci
  version.ts          verze vpečená při buildu
  pwa.ts              detekce standalone režimu a instalace PWA na plochu
  styles.css          jediný stylopis, barvy jako CSS proměnné
  games/              pravidla jednotlivých her
    types.ts          rozhraní GameDefinition + řazení pořadí
    shared.ts         výpočty sdílené víc hrami (lepší míč, součet dvojice)
    bestAggregate.ts  Best + Součet
    skins.ts          Skins
    matchPlay.ts      Match play
    fixtures.ts       pomocník pro testy
    index.ts          registr her
  screens/
    SetupScreen.tsx       volba hry, hráčů, dvojic, sázky a počtu jamek
    PlayScreen.tsx        zápis skóre po jamkách
    BonusSheet.tsx        výběr extra bodů pro hráče na jamce
    GameSettingsScreen.tsx nastavení bodování konkrétní hry
    ResultsScreen.tsx     pořadí, vyrovnání a scorecard (i pro archivní kola)
    Scorecard.tsx         tabulka se značkami, dekoracemi a souhrny hry
    ArchiveScreen.tsx     seznam odehraných kol
    BackupScreen.tsx      záloha dat do souboru a obnova z něj
    AccountScreen.tsx     přihlášení, stav synchronizace, smazání účtu
    PrivacyScreen.tsx     zásady zpracování údajů
firestore.rules       pravidla zabezpečení databáze (nasazují se z konzole)
.env.example          vzor konfigurace Firebase pro lokální vývoj
scripts/
  bump-version.mjs    zvedání verze
  gen-icons.mjs       generátor PWA ikon (bez závislostí)
docs/
  architecture.md     jak je aplikace poskládaná, datový model, invarianty
  sync.md             účet, synchronizace a nastavení Firebase
  games.md            pravidla her a jejich vyhodnocení
  decisions.md        rozhodnutí a jejich důvody
  deployment.md       nasazení, vlastní doména, časté problémy
```

## Přidání hry

Popsané v [`docs/games.md`](docs/games.md#přidání-další-hry) a podrobněji
v [`docs/architecture.md`](docs/architecture.md#rozhraní-hry). Ve zkratce:
nový soubor v `src/games/`, zápis do registru, testy, odstavec v dokumentaci.

## Konvence

- Formátuje Prettier (`.prettierrc.json`): bez středníků, jednoduché
  uvozovky, šířka 90 znaků.
- **Uživatelské texty patří do `src/i18n/`, ne do komponent.** Nový text =
  klíč v `cs.ts` a překlad v `en.ts`; bez druhého překladu build neprojde.
- Kód, identifikátory i komentáře jsou anglicky/česky jako dosud - překládají
  se jen texty, které uvidí uživatel.
- Komentáře vysvětlují **proč**, ne co – co dělá řádek, je vidět z kódu.
- Pravidla her žijí výhradně v `src/games/`. Obrazovky o konkrétní hře nic
  nevědí, jen vykreslí, co dostanou z `computeStandings()`.
- `Round` musí zůstat serializovatelný do JSON – ukládá se tak, jak je.
- Nové runtime závislosti jen s dobrým důvodem; zatím jsou to `react`,
  `react-dom` a `firebase`. Firebase se smí importovat **jen dynamicky
  a jen ze `src/sync/`** – statický import ji vtáhne do hlavního bundlu, který
  stahuje i nepřihlášený uživatel.

## Proč tu není ESLint

`typescript-eslint` zatím podporuje jen TypeScript `<6.1`, projekt běží na
TypeScriptu 7. Degradovat překladač kvůli lintu nedává smysl, takže kontrolu
zajišťuje `tsc` ve striktním režimu (včetně `noUnusedLocals`,
`noUnusedParameters` a `noUncheckedIndexedAccess`) plus Prettier. Až
`typescript-eslint` TypeScript 7 podpoří, dá se doplnit.

Pozor na dva důsledky striktního režimu:

- indexování pole vrací `T | undefined`, proto je v kódu tolik `?? fallback`;
- TypeScript 7 odmítne type predicate, který je širší než skutečný typ prvku –
  u filtrování `null` z pole je jednodušší `flatMap` vracející `[]`.

## Testy

Testují se **pravidla her a výpočty**, ne React komponenty – tam je hodnota za
peníze nejvyšší a chyba v bodování je nejdražší.

- `src/games/*.test.ts` – pravidla her
- `src/money.test.ts` – peněžní vyrovnání
- `src/types.test.ts` – model kola: vzdané vs. nehrané jamky, výpis jamek,
  přidělení Longestu a Nearestu
- `src/backup.test.ts` – slučování archivů a kontrola souboru se zálohou
- `src/sync/merge.test.ts` – slučování při synchronizaci
- `src/sync/document.test.ts` – tvar dokumentu pro Firestore (žádné pole
  uvnitř pole)
- `src/i18n/i18n.test.ts` – úplnost katalogů a chování překladu

Testy, které ověřují konkrétní znění textu, si musí nastavit jazyk
(`setActiveLocale('cs')` v `beforeAll`) – Node jinak hlásí angličtinu.

Pomocník `makeRound` z `src/games/fixtures.ts` postaví kolo s předvyplněnými
pary a skóre. Testy základních pravidel používají `BASE_OPTIONS` s vypnutými
nadstavbami (Double Best, dvojnásobné jamky), aby měřily to, co tvrdí.

Každý test popisuje modelovou situaci v komentáři nad fixturou, ať je
z výsledku poznat, co se vlastně počítalo.
