# Pokyny pro GitHub Copilot

Golfová PWA pro zápis skóre po jamkách (React 19, TypeScript 7, Vite 8, bez
backendu). Kompletní pokyny jsou v [`AGENTS.md`](../AGENTS.md) – tenhle soubor
je jejich zkrácená verze pro Copilot.

## Základní pravidla

- Pravidla her patří **jen** do `src/games/` (rozhraní `GameDefinition`).
  Komponenty v `src/screens/` o konkrétní hře nevědí nic.
- `Round` v `src/types.ts` je jediný zdroj pravdy a musí zůstat
  serializovatelný do JSON.
- Kolo si při založení dělá **hlubokou kopii** nastavení, aby změna předvoleb
  nepřepočítala archivní kola.
- `scores[player][hole] === null` znamená buď nehranou, nebo **vzdanou** jamku
  – rozhoduje `isHoleStarted()`. Ve výpočtech se vzdaná hodnota reprezentuje
  jako `CONCEDED` (`Infinity`).
- Extra bod (bonus) uhraný jedním hráčem se počítá **celé dvojici**.
- Uživatelské texty česky, kód a identifikátory anglicky.
- Komentáře vysvětlují **proč**, ne co.

## Styl kódu

- Prettier: bez středníků, jednoduché uvozovky, šířka 90 znaků.
- TypeScript ve striktním režimu včetně `noUncheckedIndexedAccess` – indexování
  vrací `T | undefined`, počítej s `?? fallback`.
- Bez ESLintu (`typescript-eslint` zatím nepodporuje TypeScript 7).
- Runtime závislosti jsou jen `react` a `react-dom`; nové nepřidávej.

## Před commitem

```bash
npm run check   # typy + testy + kontrola formátování, přesně jako v CI
```

Změna pravidel hry nebo výpočtu peněz vyžaduje test v `src/games/*.test.ts`
nebo `src/money.test.ts` a záznam v `CHANGELOG.md`. Komponenty se netestují.
