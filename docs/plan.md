# Nový plán

Tento plán je otevřený pro další směr projektu. Před první implementací sem
patří konkrétní cíl, rozhodnutí a ověřitelný výsledek.

## Cíl

Doplnit zbylé jamkovkové varianty pro čtyři hráče: Foursome (dvojice jedním
míčem) a dvě samostatné jamkovky 1 na 1 v jednom flightu.

## Úkoly

- [x] Vytáhnout jádro jamkovky do `src/games/match.ts`
- [x] Přidat Foursome se zápisem jednoho skóre na dvojici a HCP z poloviny součtu
- [x] Přidat dvě jamkovky 1 na 1 s vyrovnáním peněz za každý zápas zvlášť
- [x] Upravit zápis skóre, scorekartu a volbu soupeřů v zakládání kola
- [x] Testy pravidel, handicapu dvojice a peněz obou her
- [x] Doplnit překlady, dokumentaci, changelog a rozhodnutí #33 a #34
- [x] Odladit v Playwrightu na telefonních profilech a spustit kompletní kontrolu

## Rozhodnutí

- Společný míč se ukládá **oběma partnerům**; model kola se nemění a starý
  archiv nepotřebuje migraci (rozhodnutí #33).
- `Round.teams` u dvou jamkovek znamená soupeře jednoho zápasu, ne partnery
  (`pairingKind: 'opponents'`).
- Nezávislé zápasy se vyrovnávají přes `settleGroups()`, ne `settleRound()`;
  rozehraná jamka je vlastnost zápasu, ne flightu (rozhodnutí #34).

## Ověření

- `npx vitest run src/games/foursome.test.ts src/games/singlesMatches.test.ts`
- `npx playwright test games4 --project=phone-chrome-android --project=phone-safari-ios`
- `npm run check`
- `npx vite build`
