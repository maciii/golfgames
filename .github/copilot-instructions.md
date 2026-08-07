# Pokyny pro GitHub Copilot

Golfová PWA pro zápis skóre po jamkách pro 1–4 hráče podle zvolené hry (React 19, TypeScript 7, Vite 8).
Vlastní backend nemá – data drží `localStorage`, jedinou serverovou částí je
nepovinná záloha do Firestore. Rozhraní je česky a anglicky.

Kompletní pokyny jsou v [`AGENTS.md`](../AGENTS.md) – tenhle soubor je jejich
zkrácená verze. Když si nejsi jistý, **proč** je něco takhle, odpověď je
v [`docs/decisions.md`](../docs/decisions.md).

## Základní pravidla

- Pravidla her patří **jen** do `src/games/` (rozhraní `GameDefinition`).
  Komponenty v `src/screens/` o konkrétní hře nevědí nic; vykreslují i
  scorecardové dekorace a souhrny, které hra poskytne.
- `Round` v `src/types.ts` je jediný zdroj pravdy a musí zůstat
  serializovatelný do JSON.
- Kolo si při založení dělá **hlubokou kopii** nastavení, aby změna předvoleb
  nepřepočítala archivní kola.
- `scores[player][hole] === null` znamená buď nehranou, nebo **vzdanou** jamku
  – rozhoduje `isHoleStarted()`. Ve výpočtech se vzdaná hodnota reprezentuje
  jako `CONCEDED` (`Infinity`).
- Extra bod (bonus) se počítá podle konkrétní hry: týmovým hrám celé dvojici,
  individuálním hrám hráči, který ho uhrál.
- **Uživatelské texty patří do `src/i18n/`, ne do komponent.** Kód
  a identifikátory zůstávají anglicky.
- Hraný výřez hřiště (půlka osmnáctky, devítky resortu v pořadí) i norma
  odpaliště pro něj se počítají **jen** v `src/courses/layout.ts`.
- Komentáře vysvětlují **proč**, ne co.

## Testování UI

- Všechny browser, Playwright, screenshotové a lokální preview testy prováděj
  v režimu mobilního telefonu: výchozí viewport `390x844`, touch/mobile
  emulace. Pro funkce určené na šířku použij mobilní landscape; desktop není
  hlavní testovací profil.
- Mobilní viewport nastav před první akcí v aplikaci a zachovej ho na
  screenshotech. Výpočetní Vitest testy viewport nemají, takže se toto pravidlo
  týká testů přes browser nebo lokální preview.

## Texty a jazyky

- Nový text = klíč v `src/i18n/cs.ts` **a** překlad v `en.ts`. Český katalog je
  zdroj pravdy pro typ `MessageKey`, `en.ts` je `Record<MessageKey, Message>`,
  takže chybějící překlad neprojde překladem.
- Množné číslo se zapisuje jako objekt (`{ one, few, other }`), ne jako text –
  kategorie vybírá `Intl.PluralRules` podle jazyka.
- V komponentě `const t = useT()`, mimo komponenty `t()` ze `src/i18n`.
- Texty her a bonusů se skládají z id (`games.<id>.name`, `bonus.<id>.name`).
  TypeScript takový klíč neověří – hlídá to `src/i18n/i18n.test.ts`, který
  projde registr her, bonusů i kategorií výsledku.
- Formátování částek, data a řazení jmen se řídí `getLocale()` / `localeTag()`,
  ne natvrdo zapsaným `'cs-CZ'`.

## Synchronizace

- Přihlášení je **nepovinné**. Bez konfigurace Firebase se o účtu nikde nemluví
  a aplikace musí zůstat plně funkční.
- Firebase se načítá dynamickým `import()` až při přihlášení a je vynechaná
  z předcachování service workerem. **Statický `import` z `firebase/*` mimo
  `src/sync/` tohle rozbije.**
- Firestore neumí pole uvnitř pole, a `Round.bonuses` pole polí je. Převod
  zajišťuje `src/sync/document.ts`; další takové pole musí projít stejnou
  cestou, jinak přijde `invalid-argument`.
- Firebase běží výhradně na bezplatném plánu **Spark**. Blaze se nikdy
  nezapíná.

## Styl kódu

- Prettier: bez středníků, jednoduché uvozovky, šířka 90 znaků.
- TypeScript ve striktním režimu včetně `noUncheckedIndexedAccess` – indexování
  vrací `T | undefined`, počítej s `?? fallback`. Type predicate širší než typ
  prvku TypeScript 7 odmítne (typický problém u `.filter()` – použij
  `flatMap` vracející `[]`).
- Bez ESLintu (`typescript-eslint` zatím nepodporuje TypeScript 7).
- Runtime závislosti jsou `react`, `react-dom` a `firebase`; další nepřidávej.

## Před commitem

```bash
npm run check   # typy + testy + kontrola formátování, přesně jako v CI
```

Změna pravidel hry nebo výpočtu peněz vyžaduje test v `src/games/*.test.ts`
nebo `src/money.test.ts` a záznam v `CHANGELOG.md`. Komponenty se netestují.
Testy, které ověřují konkrétní znění textu, si musí nastavit jazyk přes
`setActiveLocale('cs')` – Node jinak detekuje angličtinu.
