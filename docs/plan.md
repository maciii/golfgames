# Nový plán

Tento plán je otevřený pro další směr projektu. Před první implementací sem
patří konkrétní cíl, rozhodnutí a ověřitelný výsledek.

## Cíl

Umožnit dodatečnou opravu odehraného kola: z detailu archivního kola otevřít
zápis skóre, opravit ho a uložit zpátky do archivu bez dopadu na rozehrané
kolo.

## Úkoly

- [x] Přepsat archivní kolo na jeho místě (`updateArchivedRound()`)
- [x] Nasměrovat změny skóre přes jeden `updateRound()` v `App.tsx`
- [x] Otevřít `PlayScreen` v režimu opravy z detailu archivního kola
- [x] Doplnit překlady, dokumentaci, changelog a rozhodnutí #31
- [x] Přidat testy archivu a e2e průchod opravou na telefonních profilech
- [x] Spustit kompletní kontrolu a produkční build

## Rozhodnutí

- Oprava jde do archivu, ne do slotu rozehraného kola - na hřišti se dá
  dohrávat jedno kolo a zpětně opravovat jiné.
- Opravované kolo se neukládá do vlastního stavu; odvozuje se z `view` a
  `openArchiveId`, aby po zpět/swipe sedělo s tím, co je vidět.
- Kolo zůstává dohrané (`finishedAt` se nemaže), takže z archivu ani z
  peněžního vyrovnání nezmizí.

## Ověření

- `npx vitest run src/storage.test.ts`
- `npx playwright test archiveEdit --project=phone-chrome-android --project=phone-safari-ios --project=phone-landscape`
- `npm run check`
- `npx vite build`
