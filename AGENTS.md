# Pokyny pro AI asistenty

Tenhle soubor je vstupní bod pro AI asistenty (Claude Code, GitHub Copilot,
Cursor a spol.) a zároveň rychlé shrnutí pro člověka, který projekt vidí
poprvé. Čti ho celý, než začneš měnit kód.

## Co to je

PWA pro zápis golfového skóre po jamkách pro 1–4 hráče podle zvolené hry a vyhodnocení různých
golfových her (Best + Součet, Skins, Match play) včetně peněžního vyrovnání
sázky. React 19 + TypeScript 7 + Vite 8, hostovaná zdarma na GitHub Pages.
Vlastní backend nemá – data drží `localStorage` a jedinou serverovou částí je
**nepovinná** záloha do Firestore po přihlášení účtem Google. Uživatelské
rozhraní je česky a anglicky.

## Kde je co napsané

Než začneš řešit netriviální změnu, přečti si příslušný dokument – většina
otázek už má odpověď:

| Dokument                                       | Co v něm najdeš                                           |
| ---------------------------------------------- | --------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | vrstvy, datový model, invarianty, rozhraní hry, kde co je |
| [`docs/games.md`](docs/games.md)               | pravidla her a bodování do detailu, extra body, peníze    |
| [`docs/decisions.md`](docs/decisions.md)       | **proč** je to takhle a co by změnu ospravedlnilo         |
| [`docs/deployment.md`](docs/deployment.md)     | GitHub Pages, vlastní doména, časté problémy              |
| [`docs/sync.md`](docs/sync.md)                 | účet, synchronizace, nastavení Firebase                   |
| [`docs/katalog.md`](docs/katalog.md)           | katalog hřišť, jeho adresa a chování v aplikaci           |
| [`docs/plan.md`](docs/plan.md)                 | **co zbývá udělat** a rozhodnutí, na kterých to stojí     |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | příkazy, struktura, konvence, verzování                   |
| [`CHANGELOG.md`](CHANGELOG.md)                 | historie věcných změn                                     |

## Pracovní postup

```bash
npm install
npm run dev      # vývojový server
npm run check    # typy + testy + formát – tohle musí projít před commitem
```

1. Změna kódu.
2. **Testy k pravidlům her a výpočtům jsou povinné.** UI se netestuje.
3. `npm run check` musí projít (přesně tohle běží v CI).
4. Věcnou změnu zapiš do `CHANGELOG.md` a zvedni verzi
   (`npm run bump:minor` u nové funkce, `bump:major` u nekompatibilní změny
   uložených dat; patch se zvedá sám při buildu).
5. Když se mění pravidlo hry nebo chování, aktualizuj i `docs/games.md`;
   když se mění důvod nějakého rozhodnutí, `docs/decisions.md`.

### Testování rozhraní

- Všechny browser, Playwright, screenshotové a lokální preview testy prováděj
  v režimu mobilního telefonu, výchozí viewport je `390x844` s touch/mobile
  emulací. Testy orientované na šířku použijí mobilní landscape, nikdy desktop
  viewport jako hlavní testovací profil.
- Mobilní viewport nastav ještě před první akcí v aplikaci a zachovej ho i při
  pořizování screenshotů. Čistě výpočetní Vitest testy viewport nemají a toto
  pravidlo se na ně nevztahuje.
- Hotová sada je v `e2e/` (`npm run test:e2e:phone` pro telefonní profily,
  `npm run test:e2e` pro celou matici včetně tabletu a desktopu). Telefonní
  profily jsou ty, které musí projít; větší displeje jsou kontrola navíc.
  Prohlížeče se stahují jednorázově přes `npm run test:e2e:install`.

## Nepřekročitelná pravidla

Tohle nejsou preference, ale věci, které v projektu drží konzistenci:

1. **Nic placeného.** Žádné SaaS, žádné placené API, žádné závislosti
   s předplatným. Celý projekt musí jít provozovat zdarma. Firebase běží
   **výhradně na bezplatném plánu Spark** - Blaze se nikdy nezapíná, protože
   při vyčerpání kvóty mají operace selhat, ne začít stát peníze.
2. **Pravidla her žijí jen v `src/games/`.** Obrazovky o konkrétní hře nic
   nevědí – vykreslí, co dostanou z `computeStandings()`, `holeSummary()`,
   `headerSummary()` a scorecardových hooků.
3. **`Round` je jediný zdroj pravdy** a musí zůstat serializovatelný do JSON.
   Změna jeho tvaru znamená migraci v `storage.normalize()` a majoritní verzi.
4. **Kolo si nese vlastní kopii nastavení.** Nikdy do `round.settings` nedávej
   referenci na sdílený objekt – rozbilo by to přepočet archivních kol.
5. **Prázdné skóre má dva významy** (nehraná vs. vzdaná jamka), viz níž.
6. **Příjemce extra bodu určuje hra.** U týmových her ho získává celá dvojice,
   u individuálních her hráč, který ho uhrál. Nová hra to musí deklarovat
   v `GameDefinition.scoringOptions` a podle toho bonus vyhodnotit.
7. **Uživatelské texty patří do `src/i18n/`.** Do komponent se nepíšou.
   Nový text znamená klíč v `cs.ts` a překlad v `en.ts` - `en.ts` je typovaný
   jako `Record<MessageKey, Message>`, takže chybějící překlad neprojde
   překladem. Kód a identifikátory zůstávají anglicky.
8. **Komentáře vysvětlují proč, ne co.** Co dělá řádek, je vidět z kódu.
9. **Nepřidávej závislosti bez důvodu.** Runtime závislosti jsou dneska
   `react`, `react-dom` a `firebase` a je to záměr. Firebase je navíc jediná,
   která se nedostane do hlavního bundlu (viz níž).
10. **Zápis skóre se musí vejít na jednu obrazovku.** Na jamce se hraje jednou
    rukou, často v rukavici – rolovat za dalším hráčem je při zápisu čtyř
    skóre nepoužitelné. `PlayScreen` proto na telefonním viewportu nesmí
    přerůst výšku displeje. Hlídá to test `e2e/responsive.spec.ts`; když ho
    nová úprava shodí, není to chyba testu. **Známá výjimka:** na displeji
    pod 700 px (iPhone SE) se čtyři hráči nevejdou zhruba o 200 px už dlouho;
    test to drží jako `fixme`, aby se na to nezapomnělo.

11. **Zapsané skóre se nikdy nesmaže.** Jediný, kdo smí zápis na jamce zrušit,
    je hráč sám (přidržení čísla v zápisu skóre). Žádná jiná změna - dvojice,
    hra, soupeři, par, nastavení bodování, oprava archivního kola - nesmí
    `Round.scores` vyprázdnit ani zkrátit. Když nové nastavení znamená jiný
    výsledek, kolo se **přepočítá** ze zapsaného skóre; hry ho počítají až při
    zobrazení, takže přepočet nic ukládat nemusí. Hraje se o peníze a zápis
    z jamky se zpětně nedohledá.

## Nejčastější zdroje chyb

- **Vzdaná vs. nehraná jamka.** `scores[player][hole] === null` znamená buď
  „ještě jsme tam nedošli", nebo „hráč jamku vzdal". Rozhoduje
  `isHoleStarted()`: když na jamce zapsal aspoň jeden hráč, jamka běží a komu
  zápis chybí, ten ji vzdal. Každá nová hra to musí ošetřit. Ve výpočtech se
  vzdaná hodnota reprezentuje jako `CONCEDED` (`Infinity`).
- **Netto rozhoduje o vítězi jamky, ne o tom, co je birdie.** Kdo jamku vyhrál
  (skin, `BEST`, součet, match play, pořadí v Dots), se počítá z `netScoreAt()`
  vždycky - to je pravidlo hry. **Bonus za výsledek** (birdie a eagle v Best +
  Součtu a Levé-Pravé, násobič extra bodů, birdie ke smetení v Dots) se ale bere
  z **brutto** ran, jinak by hráč s tečkou dostal za bunker na par dva body.
  Rozhoduje o tom jediná funkce `bonusDiffToPar()` v `handicap.ts` a volba
  **Uplatňovat HCP** (`multipliersWithHandicap`, výchozí vypnuto), která ji
  přepne na osobní par. Každý nový výpočet bonusu za výsledek se musí ptát jí,
  ne `diffToPar()` ani `netDiffToPar()` napřímo. Potvrzení **Longestu** má
  vlastní volbu (`exclusiveBonusOutcome()`); Nearest se potvrzuje vždycky brutto.
- **Číslo jamky není `hole + 1`.** Kolo se nehraje vždycky na celé hřiště:
  osmnáctku jde hrát jen na jednu devítku a resort s 27 jamkami osmnáctku
  teprve skládá ze dvou svých devítek. Kolo pak má `holeCount` hraných jamek,
  výřez parů a SI a `startHole` podle hrané části. Číslo pro hráče dává
  výhradně `holeNumber(round, hole)` - v UI, ve výpisech jamek i v pravidle
  o dvojnásobné 9. a 18. jamce.
- **Názvy tříd v CSS jsou globální.** `src/styles.css` je jediný stylopis bez
  modulů, takže obecné jméno jako `.player-row` si dvě obrazovky snadno
  přebijou – a projeví se to až na té, kterou zrovna nikdo nezkoumá. Řádek
  hráče v zakládání kola se proto jmenuje `.setup-player-row`; zápis skóre měl
  `.player-row` dřív. Nová obecně znějící třída patří k obrazovce předponou.
- **Výřez hřiště počítá jen `src/courses/layout.ts`.** Obrazovky si pary,
  stroke index ani normu odpaliště pro hranou část neodvozují samy - jinak by
  výběr jamek a hrací handicap tvrdily každý něco jiného. Na pořadí devítek
  záleží (Forest + River je jiná osmnáctka než River + Forest) a stroke index
  se mezi nimi prostřídá.
- **`noUncheckedIndexedAccess` je zapnuté.** Indexování pole vrací
  `T | undefined`, proto je v kódu tolik `?? fallback`. Neobcházej to
  přetypováním; TypeScript 7 navíc odmítne type predicate, který je širší než
  skutečný typ prvku (typický problém u `.filter()` – použij `flatMap`).
- **Nové pole v `GameOptions`** musí přibýt do `DEFAULT_GAME_OPTIONS`
  **a** do merge v `storage.normalize()` / `loadGameOptions()`, jinak stará
  uložená kola spadnou na `undefined`.
- **Pořadí hráčů v `team.playerIds` má význam** – peněžní vyrovnání dvojic
  páruje protějšky podle indexu (první platí prvnímu).
- **První sekce z `computeStandings()` je podkladem pro peníze.** Její
  `row.value` se předává do `settleRound()` jako počet jednotek; u Skins je
  to součet skinů a přiznaných extra bodů.
- **Společný míč se ukládá oběma partnerům.** U hry, která deklaruje
  `sharedBall` (Foursome), má dvojice na jamku jedno skóre, ale `Round.scores`
  zůstává po hráčích - hodnotu zapíše `App.setScore()` obou partnerům
  (rozhodnutí #33). Netto dvojice počítá `pairPlayingHandicap()`, ne handicap
  jednotlivce.
- **Dva zápasy v jednom kole si nemíchají peníze.** Hra s `settlementGroups()`
  se vyrovnává po skupinách přes `settleGroups()`; `settleRound()` by počítal
  každého proti každému (rozhodnutí #34).
- **Stránka se neposouvá, posouvá se `.content`.** Obrazovka je vysoká jako
  displej (rozhodnutí #32), takže `window.scrollY` je vždycky nula
  a `window.scrollTo()` nic nedělá. Nový kód pracuje se `scrollTop` na
  `.content`; hlavička a patička se posouvat nemají.
- **Oprava archivního kola nejde přes `archiveRound()`.** Ta staví kolo na
  začátek archivu, takže by oprava loňské hry z ní udělala „poslední
  odehranou". Zpětná editace používá `updateArchivedRound()` a míří do
  archivu, ne do rozehraného kola (rozhodnutí #31).
- **Nesahej na hotový build.** `dist/` je v `.gitignore` a generuje ho CI.
- **Firestore odmítá `undefined`** a shodí tím celý zápis chybou
  `invalid-argument`. `normalizeCourse()` ho do hřiště zapisuje záměrně
  (`loops: undefined` přebíjí poškozené smyčky), takže všechno, co jde do
  Firestoru mimo `toDocument()`, musí projít `forFirestore()`.
- **Firestore neumí pole uvnitř pole.** `Round.bonuses` je
  `bonuses[hráč][jamka]`, tedy pole polí, a přímý zápis skončí chybou
  `invalid-argument`. Převod do mapové podoby a zpět je v `src/sync/document.ts`.
  Když do modelu přibude další pole polí, musí projít stejnou cestou.
- **Firebase se nesmí dostat do hlavního bundlu.** Načítá se dynamickým
  importem až při přihlášení a je vynechané z předcachování service workerem.
  Statický `import` z `firebase/*` mimo `src/sync/` tohle rozbije.
- **Texty her a bonusů se skládají z id** (`games.<id>.name`,
  `bonus.<id>.name`). TypeScript takový klíč neověří, hlídá to test
  v `i18n.test.ts` - při přidání hry nebo bonusu ho nech projít.
- **Jazyk drží i modul, nejen React.** Funkce mimo komponenty (peníze, datum,
  řazení jmen) čtou `getLocale()` / `localeTag()`. Testy, které ověřují
  konkrétní znění, si jazyk nastaví přes `setActiveLocale('cs')`.
- **`updatedAt` na kole zvedá jen skutečná změna dat** (`touchRound()`).
  Listování jamkami ne - jinak by prohlížející zařízení přebilo to hrající.

## Struktura ve zkratce

```
src/
  types.ts     model kola + výpočty společné všem hrám (bonusy, značky, násobiče)
  storage.ts   localStorage: rozehrané kolo, archiv, hráči, předvolby
  money.ts     přepočet bodů na peníze
  backup.ts    export a import dat do souboru JSON
  pwa.ts       detekce standalone režimu a instalace PWA na plochu
  swipeBack.ts tažení od levého okraje jako „zpět" (v PWA není systémové)
  sync/        nepovinná záloha do Firestore (líné načtení SDK)
  i18n/        překlady: cs.ts je zdroj pravdy pro klíče, en.ts musí sedět
  games/       pravidla her (GameDefinition), registr v index.ts
  screens/     UI; žádné texty natvrdo, všechno přes useT()
docs/          architektura, pravidla, rozhodnutí, nasazení, synchronizace
scripts/       zvedání verze, generátor PWA ikon
firestore.rules  pravidla zabezpečení databáze (nasazují se z konzole Firebase)
```

## Kontext, který z kódu není vidět

- Aplikace se ovládá **jednou rukou na hřišti**, často v rukavici a na slunci.
  Velká tlačítka, žádná klávesnice, plochá navigace bez routeru – všechno je
  podřízené tomuhle.
- **Offline provoz je požadavek, ne bonus.** Na hřišti nemusí být signál.
- **Nepřihlášený uživatel je výchozí případ, ne okrajový.** Přihlášení nikdy
  nesmí být podmínkou čehokoli a nikam se netlačí. Když chybí konfigurace
  Firebase, aplikace o účtu ani nemluví a je plně funkční – takhle se dá
  postavit i z forku bez jediného tajemství.
- Data drží `localStorage` a cloud je jen zrcadlo. Když se výpadek cloudu
  projeví na rozehraném kole, je to chyba v návrhu, ne v síti.
- Hraje se o peníze, takže **chyba v bodování je nejdražší chyba v projektu**.
  Proto testy pokrývají matematiku a ne komponenty.
