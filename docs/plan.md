# Nový plán

Tento plán je otevřený pro další směr projektu. Před první implementací sem
patří konkrétní cíl, rozhodnutí a ověřitelný výsledek.

## Cíl

Dvojice na vlastní obrazovce, pohyb mezi kroky zakládání kola bez ztráty dat
a čitelný zápis skóre i s dlouhými jmény a dvěma zápasy ve flightu.

## Úkoly

- [x] Vytáhnout dvojice a změnu hry z obrazovek do `src/roundSetup.ts`
- [x] Volba dvojic jako vlastní krok (`SetupPairingScreen`), odkaz na ni v kroku Hra
- [x] Hru a dvojice jde otevřít i z rozehraného kola, změna se uplatní hned
- [x] Zpět/swipe z rozehraného kola nesmí přistát na kroku, který už neplatí
- [x] Dlouhé jméno nesmí vytlačit tečky HCP a značky v řádku hráče
- [x] Hlavička jamky: jeden řádek na zápas, dormie u svého zápasu, krátká jména
- [x] Testy `roundSetup`, hlavičky dvou jamkovek a krátkého jména
- [x] Playwright: `e2e/setupNav.spec.ts` a úprava kroků v existujících testech
- [x] Dokumentace, rozhodnutí #35 a #36, nepřekročitelné pravidlo 11

## Rozhodnutí

- **Zapsané skóre se nikdy nesmaže** - nové nepřekročitelné pravidlo 11
  v `AGENTS.md`. Změna nastavení kolo přepočítá, nemaže.
- Krok zakládání platí jen pro svůj stav; `NavSnapshot.setupRoundId` odlišuje
  rozepsané nové kolo od úpravy rozehraného (rozhodnutí #35).
- V rozehraném kole čtou obrazovky kroků přímo `Round`, ne rozepsaný stav -
  nemají se s čím rozejít.
- V hlavičce jamky je jeden řádek na zápas s krátkým jménem vedoucího;
  soupeře ukazuje blok zápasu (rozhodnutí #36).

## Co zbývá

- **Jména, handicapy a odpaliště v rozehraném kole.** Kroky Hráči a Odpaliště
  staví hrací handicapy z katalogu hřišť a z výřezu devítek, který si kolo
  nepamatuje - viz otevřené otázky v `docs/decisions.md`.
- **Sázka v rozehraném kole.** Změna `pointValue` je bezpečná (peníze se
  počítají až při zobrazení), chybí jen krok v úpravě nastavení kola.

## Ověření

- `npx vitest run src/roundSetup.test.ts src/games/singlesMatches.test.ts src/types.test.ts`
- `npx playwright test setupNav games4 responsive --project=phone-chrome-android`
- `npm run check`
- `npm run test:e2e:phone`
