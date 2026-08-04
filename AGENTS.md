# Pokyny pro AI asistenty

Tenhle soubor je vstupní bod pro AI asistenty (Claude Code, GitHub Copilot,
Cursor a spol.) a zároveň rychlé shrnutí pro člověka, který projekt vidí
poprvé. Čti ho celý, než začneš měnit kód.

## Co to je

PWA pro zápis golfového skóre po jamkách pro 2–4 hráče a vyhodnocení různých
golfových her (Best Aggregate, Skins, Match play) včetně peněžního vyrovnání
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

## Nejčastější zdroje chyb

- **Vzdaná vs. nehraná jamka.** `scores[player][hole] === null` znamená buď
  „ještě jsme tam nedošli", nebo „hráč jamku vzdal". Rozhoduje
  `isHoleStarted()`: když na jamce zapsal aspoň jeden hráč, jamka běží a komu
  zápis chybí, ten ji vzdal. Každá nová hra to musí ošetřit. Ve výpočtech se
  vzdaná hodnota reprezentuje jako `CONCEDED` (`Infinity`).
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
- **Nesahej na hotový build.** `dist/` je v `.gitignore` a generuje ho CI.
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
