# Odpaliště u hráče, složené devítky a nový postup zakládání kola

## Kontext

Dnes má kolo **jedno odpaliště pro všechny**. `SetupScreen` drží jediné
`teeId`, z něj se poskládá jediné CR/SR do `RoundCourse` a `createRound()`
přepíše `Player.teeId` u všech hráčů stejnou hodnotou (`src/types.ts:319`).
Realita je jiná: muži hrají ze žlutých, ženy z červených, a rozdílná norma
odpaliště je přesně to, co má hru vyrovnat.

Kolik to dělá – Colony Golf East, hráčka s indexem 30,1:

| odpaliště            | CR / SR    | hrací HCP |
| -------------------- | ---------- | --------- |
| červené (její)       | 68,6 / 122 | **28**    |
| žluté (dnešní model) | 72,9 / 132 | **35**    |

Sedm ran rozdílu, tedy o dva Stablefordovy body na skoro každé druhé jamce.
Člen `(CR − par)` ve vzorci WHS je právě ten, který hráče mezi odpališti
srovnává – bez vlastní normy u hráče se počítá nesmysl.

Druhá část zadání je pořadí kroků: **kolo má začít volbou hřiště** a hráči se
mají zadávat až proti němu (bez hřiště není z čeho vybrat odpaliště).
Preferované odpaliště se má pamatovat u hráče vedle HCP.

Třetí část je **složené kolo ze dvou devítek** (Ropice v Golfshotu: první
devítka Ocelová, druhá Werková). V katalogu je dnes pět devítijamkových hřišť
a všechna mají devítijamkovou normu (např. Spa Golf Club CR 32,5 / SR 124 /
par 34) – složit z nich osmnáctku jde, jen to aplikace neumí.

### Co dělají ostatní

- **Golfshot** (přiložené fotografie): _Round Setup_ je rozcestník – Facility →
  Course → **Tee Box** (výchozí pro kolo) → seznam hráčů se šipkou u každého →
  Round Options, dole trvale _Start Round_. V detailu hráče (_Add Golfer_) je
  jméno, pohlaví, **handicap i Tee Box** – odpaliště je vlastnost hráče. Výběr
  odpaliště ukazuje u každé řádky **CR/SR a délku**. U Ropice má zvlášť
  _Front Nine_ + _Tee Box_ a _Back Nine_ + _Back Tee Box_.
- **Hole19**: klepnutí na fotku hráče otevře jeho odpaliště a handicap.
- **Golfify, Squabbit, Golf Genius**: výchozí odpaliště pro flight
  - individuální přiřazení, handicapy přes normy jednotlivých odpališť.

Společný vzorec: **jedno výchozí odpaliště pro kolo + přepis u hráče**. To
přebíráme, jen zkracujeme cestu – místo drill-downu do detailu hráče stačí
klepnout na jeho barevný štítek přímo v řádku.

### Odsouhlasená rozhodnutí

1. **Pánské a dámské normy u jednoho odpaliště se teď nedělají.** Zůstává jedno
   CR/SR na odpaliště; volba odpaliště u hráče pokrývá běžný případ.
2. **Postup:** hřiště jako první obrazovka, pak jedna rolovatelná obrazovka.
3. **Zadání odpaliště:** barevný štítek přímo v řádku hráče.
4. **Složené devítky jsou součástí této změny.**

---

## Návrh obrazovek

### 1. Nové kolo začíná hřištěm

`CoursePickerScreen` (už umí hledání, GPS, oblíbená, katalog, ruční zadání) se
stane první obrazovkou nového kola. Dostane režim „start kola": přibude
přeskočení a spodní odkazy, které jsou dnes na `SetupScreen` – jinak by se
z první obrazovky nedalo do archivu ani na účet.

```
┌──────────────────────────────────────┐
│ Nové kolo · Kde se hraje?         🇨🇿 │
│ [ Hledat podle názvu nebo klubu    ] │
│ [📍 Nejbližší] [Země ▾]              │
│ ★ Colony Golf – East   18 j. · s normou
│   Colony Golf – West   18 j. · s normou
│   Spa Golf Club         9 j. · s normou
│ … 307 hřišť v katalogu               │
├──────────────────────────────────────┤
│ Nové hřiště ručně · Hrát bez hřiště  │
│ Archiv · Záloha · Účet               │
└──────────────────────────────────────┘
```

„Hrát bez hřiště" vede rovnou na krok 2 se skrytou sekcí odpališť – kolo se
založí přesně jako dnes (samé čtyřky, bez handicapů).

### 2. Nastavení kola

`SetupScreen` zůstává jedna rolovatelná obrazovka (navigace je v aplikaci
záměrně plochá, viz komentář v `src/App.tsx`), jen se přeskládá: nahoru
hřiště, pak hráči s odpališti, teprve pak hra a sázka.

```
┌──────────────────────────────────────┐
│ ← Nové kolo                       🇨🇿 │
├──────────────────────────────────────┤
│ HŘIŠTĚ                               │
│ ┌──────────────────────────────────┐ │
│ │ Colony Golf – East            ➤  │ │
│ │ 18 jamek · par 73                │ │
│ └──────────────────────────────────┘ │
│ Odpaliště pro všechny                │
│ [⬜Bílá][🟨Žlutá ✓][🟦Modrá][🟥Červená]│
│                                      │
│ HRÁČI                    [2] [3] [4] │
│ ┌──────────────────────────────────┐ │
│ │ Martin                           │ │
│ │ HCP [18,4]   [🟨 Žlutá ▾]  21 ran│ │
│ ├──────────────────────────────────┤ │
│ │ Eva                              │ │
│ │ HCP [30,1]   [🟥 Červená ▾] 28 ran│ │
│ └──────────────────────────────────┘ │
│ Uložení: [Petr · 12,3 · 🟨] [Jana …] │
│ ☑ Hrát netto (s handicapem)          │
│ ( Index | Rány )                     │
│                                      │
│ HRA                                  │
│ [Skins] [Match] [Best Agg] [Stablef.]│
│ Dvojice · Sázka · Počet jamek        │
├──────────────────────────────────────┤
│            Začít kolo                │
└──────────────────────────────────────┘
```

Podstatné body:

- **Odpaliště pro všechny** je hromadná volba (Golfshot _Tee Box_). Změna
  přepíše všechny hráče, kterým se odpaliště zatím neměnilo ručně; hráče
  s vlastní volbou nechá být.
- **Štítek odpaliště v řádku hráče** je jedno klepnutí, ne drill-down. Barvy
  jsou už hotové (`tee-option-*` v `src/styles.css`).
- **Vpravo je vidět výsledek** – kolik ran hráč dostane, počítáno z **jeho**
  odpaliště.
- Dnešní samostatná sekce handicapů se sloučí do řádků hráčů; jméno se dnes
  zbytečně opakuje na dvou místech.

### 3. Devítijamkové hřiště → druhá devítka

Když má vybrané hřiště 9 jamek, přestane být přepínač počtu jamek zamčený
a při volbě 18 se objeví řádek s druhou devítkou (výchozí je **tatáž devítka
podruhé**, což je nejběžnější způsob, jak se na devítce hraje osmnáctka):

```
│ HŘIŠTĚ                               │
│ ┌──────────────────────────────────┐ │
│ │ Spa Golf Club                 ➤  │ │
│ │ 9 jamek · par 34                 │ │
│ └──────────────────────────────────┘ │
│ Počet jamek   ( 9 | 18 ✓ )           │
│ Druhá devítka  [ Spa Golf Club  ▾ ]  │
│   → 18 jamek · par 68 · CR 65,0 / SR 124
```

Nabídka druhé devítky přednostně ukáže devítky **stejného klubu**, pak ostatní
devítky v telefonu a odkaz na plný výběr hřiště.

### 4. List s výběrem odpaliště hráče

Modální list, otevře ho štítek v řádku hráče:

```
┌──────────────────────────────────────┐
│ Odpaliště – Eva                    ✕ │
│ ⬜ Bílá     6404 m  CR 74,3 / SR 132  38 ran
│ 🟨 Žlutá    6178 m  CR 72,9 / SR 132  35 ran
│ 🟦 Modrá    5926 m  CR 71,4 / SR 128  32 ran
│ ⬛ Černá    5731 m  bez normy         30 ran
│ 🟥 Červená  5418 m  CR 68,6 / SR 122  28 ran ✓
│ 🟧 Oranžová 5195 m  CR 67,4 / SR 119  27 ran
├──────────────────────────────────────┤
│      Použít pro všechny hráče        │
└──────────────────────────────────────┘
```

Norma a délka jako v Golfshotu, navíc **rovnou přepočet na rány** – to je ta
informace, kvůli které se odpaliště vybírá, a nikdo ji tam nemá. Odpaliště bez
normy se označí, protože se z něj handicap dopočítat nedá.

---

## Datový model

### `src/types.ts`

```ts
/** Odpaliště tak, jak si ho nese odehrané kolo (hluboká kopie). */
export interface RoundTee {
  id: string
  name: string
  courseRating?: number
  slopeRating?: number
  par?: number
  distance?: number
}

export interface RoundCourse {
  // …beze změny: id, name, teeId, teeName, courseRating, slopeRating, par, strokeIndex
  /** Všechna odpaliště hřiště – kvůli hráčům, kteří hrají z různých. */
  tees?: RoundTee[]
  /** Popis složeného kola; čísla výš jsou už poskládaná za obě devítky. */
  composite?: { frontName: string; backName: string; frontId?: string; backId?: string }
}
```

Dosavadní pole na úrovni kola **zůstávají** a plní se výchozím odpalištěm:
archivní kola se tím nemění a kód, který je čte, funguje dál. `tees` je pole
objektů bez vnořených polí a `composite` je prostá mapa řetězců, takže na zákaz
„pole uvnitř pole" ve Firestore (`src/sync/document.ts`) nic nenaráží.

`Player.teeId` už existuje (`src/types.ts:28`) – jen se konečně bude plnit
zvlášť pro každého hráče. `CreateRoundOptions` dostane
`playerTeeIds?: (string | undefined)[]`; `createRound()` použije
`playerTeeIds[i] ?? course.teeId`.

### `src/handicap.ts`

```ts
/** Odpaliště hráče; u starších kol spadne na odpaliště celého kola. */
export function playerTee(round: Round, playerId: PlayerId): RoundTee | undefined

/** Hrací handicap z normy odpaliště hráče; jinak index zaokrouhlený na rány. */
export function playerCourseHandicap(
  handicapIndex: number,
  tee: { courseRating?: number; slopeRating?: number; par?: number } | undefined,
  fallbackPar: number,
): number
```

`courseHandicap()`, `strokesForHole()` ani rozdělení ran podle SI se nemění –
stroke index je vlastnost jamky, ne odpaliště, a člen `(CR − par)` vyrovná
odpaliště sám. `playerCourseHandicap()` je vytažená logika z dnešní
`playingHandicapFor()` (`src/screens/SetupScreen.tsx:305`), ať ji jde použít
i v listu odpališť a otestovat bez UI.

### `src/courses/composite.ts` (nový)

Skládání dvou devítek je čistá funkce nad `Course`, ne stav obrazovky:

```ts
export function composeNines(front: Course, back: Course): Course
```

Pravidla (obojí je běžná praxe WHS a sedí na data v katalogu):

- `pars` = pary přední ++ zadní devítky, `holeCount` 18.
- `strokeIndex`: SI obou devítek se srovná přes stávající
  `normalizeStrokeIndex(si, 9)` a proloží – přední devítka dostane lichá čísla
  (`2k − 1`), zadní sudá (`2k`). Bez proložení by v kole byla dvě SI 1.
- **Odpaliště se párují podle id** (barvy). Pro každou barvu, kterou mají obě
  devítky: `CR = CR₁ + CR₂`, `SR = round((SR₁ + SR₂) / 2)`,
  `par = par₁ + par₂`, `distance = d₁ + d₂`. Chybí-li norma u jedné devítky,
  složené odpaliště zůstane bez normy – aplikace pak nabídne zadání v ranách,
  jak to dnes dělá u neocejchovaných odpališť.
- Tatáž devítka dvakrát je platný vstup (nejběžnější případ).
- Výsledek je obyčejný `Course`, takže výběr odpališť, `coursePar()`,
  `findTee()` i celé zakládání kola fungují beze změny. Do `RoundCourse`
  se navíc zapíše `composite` s názvy obou devítek.

### `src/storage.ts` – zapamatované odpaliště hráče

```ts
export interface RosterEntry {
  id: string
  name: string
  handicapIndex?: number
  /** Preferované odpaliště ('yellow', 'red', …); použije se, když ho hřiště má. */
  preferredTeeId?: string
}
```

- `addToRoster(names, handicapIndexes, teeIds)` – třetí parametr volitelný,
  stejné pravidlo „prázdná hodnota nepřepíše uloženou" jako u indexu
  (`src/storage.ts:352`).
- `setRosterTee(entryId, teeId)` po vzoru `setRosterHandicap()`.
- `useRosterEntry()` doplní jméno, HCP **i odpaliště**; štítek hráče v nabídce
  ukáže „Petr · HCP 12,3 · 🟨".
- Ids odpališť jsou v katalogu barvy, takže preference přejde i na jiné hřiště.
  Když ho hřiště nemá, použije se výchozí odpaliště kola.

Návazně: `mergeRosters()` (`src/backup.ts:124`) musí `preferredTeeId` přenášet
(dnes kopíruje jen jméno a index) a typ `roster` v `src/sync/sync.ts:129` se
rozšíří o obě volitelná pole. `normalizeRound()` (`src/storage.ts:82`)
zkopíruje `tees` i `composite`, pokud jsou.

---

## Zásahy do obrazovek

| Soubor                               | Co se mění                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                        | stav `setupStage: 'course' \| 'setup'`; nové kolo startuje výběrem hřiště, „bez hřiště" i výběr vedou na `setup`    |
| `src/screens/CoursePickerScreen.tsx` | volitelné props pro režim startu (přeskočení, odkazy Archiv/Záloha/Účet, přepínač jazyka) a pro výběr druhé devítky |
| `src/screens/SetupScreen.tsx`        | přeskládání sekcí, řádky hráčů s HCP a štítkem odpaliště, hromadná volba, druhá devítka, `SetupDraft`               |
| `src/screens/TeeSheet.tsx` (nový)    | modální výběr odpaliště s CR/SR, délkou a přepočtem na rány + „použít pro všechny"                                  |
| `src/screens/Scorecard.tsx`          | odpaliště u hlavičky hráče, když se hraje z různých; u složeného kola názvy devítek nad OUT/IN                      |
| `src/screens/ResultsScreen.tsx`      | odpaliště v detailu řádku, ať je z výsledku poznat, kdo odkud hrál                                                  |
| `src/styles.css`                     | řádek hráče, štítek odpaliště, modální list (rozšíření stávajících `tee-option-*`)                                  |
| `src/i18n/cs.ts` + `en.ts`           | nové klíče; bez anglického překladu build neprojde                                                                  |

`SetupDraft` se rozšíří o `playerTeeIds: string[]`, `teeTouched: boolean[]`
(kdo si odpaliště změnil ručně) a `secondNineId?: string`, aby návrat
z podobrazovky nic neztratil.

Nové klíče i18n (přibližně): `setup.teeForAll`, `setup.teeFor`,
`setup.playerTee`, `setup.useForAll`, `setup.mixedTees`, `setup.teeNotRated`,
`setup.skipCourse`, `setup.whereToPlay`, `setup.savedPlayerWithTee`,
`setup.secondNine`, `setup.sameNineTwice`, `setup.compositeSummary`,
`tee.sheetTitle`, `tee.strokesFromTee`.

### Drobná optimalizace navíc

`netScoring` se dnes vždy vrací na vypnuto. Bude se pamatovat v `loadSettings()`
stejně jako sázka – kdo hraje netto, hraje ho pořád.

---

## Co se vědomě nedělá

- **Pánské a dámské normy u jednoho odpaliště.** Skutečné karty je mají (černé
  odpaliště na Colony Golf má jen dámskou normu, proto je v katalogu bez CR/SR).
  Znamenalo by to pohlaví u hráče, dvě dvojice CR/SR v `CourseTee` **i
  v katalogu** a dohledání druhé sady čísel u 307 hřišť. Samostatná změna.
- **Různé odpaliště na každé devítce zvlášť.** Hráč volí barvu, ta se na obou
  devítkách spáruje podle id. Kdo hraje žlutou, hraje ji celé kolo.
- **Různý par jamky podle odpaliště.** `Course.pars` zůstává jedno pole; do
  vzorce vstupuje celkový par odpaliště (`tee.par`), který rozdíl podchytí.

---

## Postup

1. Model: `RoundTee`, `RoundCourse.tees` a `composite`, `playerTeeIds`
   v `createRound()`, `normalizeRound()`.
2. `handicap.ts`: `playerTee()`, `playerCourseHandicap()` + testy.
3. `courses/composite.ts`: `composeNines()` + testy.
4. `storage.ts`: `preferredTeeId`, `addToRoster()` s odpališti, `setRosterTee()`;
   návazně `backup.ts` a `sync/sync.ts` + testy.
5. `SetupScreen`: přeskládání, řádky hráčů, hromadná volba, `TeeSheet`,
   druhá devítka.
6. `App.tsx` + `CoursePickerScreen`: start kola na výběru hřiště.
7. Zobrazení odpaliště a názvů devítek ve `Scorecard` a `ResultsScreen`.
8. Překlady, styly, dokumentace (`docs/architecture.md`, `docs/decisions.md` –
   „odpaliště je vlastnost hráče, ne kola" –, `docs/plan.md`), CHANGELOG,
   `npm run bump:minor` → 0.26.0.

## Ověření

- `npm run check` (typy + testy + formát, přesně jako CI).
- Nové testy:
  - `handicap.test.ts` – dva hráči z různých odpališť dostanou různé rány;
    `playerTee()` u kola bez `course.tees` spadne na odpaliště kola; kontrolní
    příklad Colony East (index 18,4 ze žlutých = 21 ran, index 30,1
    z červených = 28 ran, ze žlutých 35).
  - `courses/composite.test.ts` – SI se proloží na 1..18 bez duplicit, CR se
    sečte a SR zprůměruje (Spa Golf Club 2× → CR 65,0 / SR 124 / par 68),
    odpaliště bez normy u jedné devítky zůstane bez normy.
  - `storage.test.ts` – roster si pamatuje odpaliště a prázdná hodnota ho
    nepřepíše; `backup.test.ts` – `mergeRosters()` ho nezahodí.
  - `types.test.ts` – `createRound()` rozdá hráčům jejich `teeId`.
- V prohlížeči (dev server + Playwright, chromium je v
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`): kolo na Colony East,
  Martin žlutá / Eva červená – ověřit rány v řádku, tečky na jamce
  a Stablefordovy body proti ručnímu výpočtu; a kolo na Spa Golf Clubu složené
  ze dvou devítek – ověřit 18 jamek, pary a stroke indexy.
- Zpětná kompatibilita: kolo z archivu odehrané před změnou se musí počítat
  stejně jako dřív; kolo **bez hřiště** musí jít pořád založit.
