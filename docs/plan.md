# Nový plán

Tento plán je otevřený pro další směr projektu. Před první implementací sem
patří konkrétní cíl, rozhodnutí a ověřitelný výsledek.

## Cíl

Doplnit a ověřit hru Levá-Pravá pro čtyři hráče: na každé jamce určit dvojice
podle prvních ran, potom zapsat skóre a připsat body jednotlivě.

## Úkoly

- [x] Přidat per-jamkové přiřazení stran do serializovatelného kola
- [x] Přidat obecný hook setupu jamky a zablokovat skóre do jeho dokončení
- [x] Implementovat bodování Levá-Pravá znovupoužitím pravidel Best + Součet
- [x] Přidat testy dynamických dvojic a individuálních součtů
- [x] Doplnit překlady, dokumentaci a changelog
- [x] Spustit kompletní kontrolu a produkční build

## Rozhodnutí

- Dvojice se ukládají jako `Round.holePairings`, mapa `jamka -> hráč ->
left/right`, aby zůstala data JSON i Firestore kompatibilní.
- Levá-Pravá nepoužívá statické `Round.teams`; přiřazení se na každé jamce
  ověří a z něj se vytvoří dočasné dvě dvojice pro výpočet.
- Oprava dvojice po zápisu smaže skóre a bonusy dané jamky, aby archiv nikdy
  nemíchal výsledek se starým složením.

## Ověření

- `npx vitest run src/games/leftRight.test.ts`
- `npm run check`
- `npx vite build`
