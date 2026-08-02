# Jak na vývoj

## Rozjetí

```bash
npm install
npm run dev
```

Vyžaduje Node 22 (viz `.nvmrc`).

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

## Verzování

Patch verzi zvedá `scripts/bump-version.mjs`, který se pouští automaticky
před každým buildem (`prebuild`). V CI se přeskakuje – běh na serveru nemá
kam změnu commitnout.

Větší změny se zvedají ručně:

```bash
npm run bump:minor   # nová hra, nová obrazovka
npm run bump:major   # nekompatibilní změna uložených dat
```

Verze se vpéká do bundlu (`vite.config.ts` → `define`) a zobrazuje v patičce
aplikace. Věcné změny patří do [`CHANGELOG.md`](CHANGELOG.md).

## Struktura

```
src/
  types.ts            datový model kola (hráči, dvojice, skóre) + výpočty
  storage.ts          localStorage: rozehrané kolo, archiv, hráči, předvolby
  money.ts            přepočet bodů na peníze a formátování částek
  version.ts          verze vpečená při buildu
  games/              pravidla jednotlivých her
    types.ts          rozhraní GameDefinition + řazení pořadí
    shared.ts         výpočty sdílené víc hrami (lepší míč, součet dvojice)
    bestAggregate.ts  Best Aggregate
    skins.ts          Skins
    matchPlay.ts      Match play
    fixtures.ts       pomocník pro testy
    index.ts          registr her
  screens/
    SetupScreen.tsx   volba hry, hráčů, dvojic a počtu jamek
    PlayScreen.tsx    zápis skóre po jamkách
    ResultsScreen.tsx pořadí, vyrovnání a scorecard (i pro archivní kola)
    Scorecard.tsx     tabulka se značkami skóre a sloupci hry
    ArchiveScreen.tsx seznam odehraných kol
scripts/
  bump-version.mjs    zvedání verze
  gen-icons.mjs       generátor PWA ikon (bez závislostí)
docs/
  games.md            pravidla her a jejich vyhodnocení
```

## Přidání hry

Popsané v [`docs/games.md`](docs/games.md#přidání-další-hry). Ve zkratce:
nový soubor v `src/games/`, zápis do registru, testy, odstavec v dokumentaci.

## Konvence

- Formátuje Prettier (`.prettierrc.json`): bez středníků, jednoduché
  uvozovky, šířka 90 znaků.
- Uživatelské texty jsou česky, kód a identifikátory anglicky.
- Komentáře vysvětlují **proč**, ne co – co dělá řádek, je vidět z kódu.
- Pravidla her žijí výhradně v `src/games/`. Obrazovky o konkrétní hře nic
  nevědí, jen vykreslí, co dostanou z `computeStandings()`.

## Proč tu není ESLint

`typescript-eslint` zatím podporuje jen TypeScript `<6.1`, projekt běží na
TypeScriptu 7. Degradovat překladač kvůli lintu nedává smysl, takže kontrolu
zajišťuje `tsc` ve striktním režimu (včetně `noUnusedLocals`,
`noUnusedParameters` a `noUncheckedIndexedAccess`) plus Prettier. Až
`typescript-eslint` TypeScript 7 podpoří, dá se doplnit.

## Testy

Testují se **pravidla her**, ne React komponenty – tam je hodnota za peníze
nejvyšší a chyba v bodování je nejdražší. Pomocník `makeRound`
z `src/games/fixtures.ts` postaví kolo s předvyplněnými pary a skóre.

Každý test popisuje modelovou situaci v komentáři nad fixturou, ať je
z výsledku poznat, co se vlastně počítalo.
