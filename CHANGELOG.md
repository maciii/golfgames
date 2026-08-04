# Změny

Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování ze [sémantického verzování](https://semver.org/lang/cs/).

Patch verzi zvedá `scripts/bump-version.mjs` automaticky při každém lokálním
buildu, takže čísla patch verzí mezi záznamy nejsou souvislá. Zapisují se sem
jen verze s věcnou změnou.

## [0.14.0] – 2026-08-04

### Přidáno

- **Hřiště.** Kolo se dá hrát na uloženém hřišti s pary jamek, stroke indexem
  a odpališti včetně Course Ratingu a Slope Ratingu. Hřiště se zadává ručně
  (obrazovka Nové hřiště) a ukládá se natrvalo, takže funguje i bez signálu.
  Stroke index se posouvá tlačítky, aby zůstal pořadím bez duplicit.
- **Handicapy a netto.** U kola jde zapnout hru na rány s handicapem. Zadává se
  buď handicapový index, ze kterého se podle WHS dopočítá hrací handicap
  z normy odpaliště, nebo rovnou počet ran. Rány se rozdělují podle stroke
  indexu jamky; plusový handicap je rány naopak vrací.
- **Stableford** jako čtvrtá hra: body za jamku podle výsledku vůči paru
  (par 2, birdie 3, eagle 4, bogey 1, dvojbogey a horší nic), hrubě i netto.
- Handicapový index se pamatuje u uloženého hráče, takže se nezadává
  před každým kolem znovu.
- Hřiště se ukládají do zálohy do souboru i do synchronizace k účtu.

### Změněno

- `Round` nese vlastní hlubokou kopii hřiště, se kterým se hrálo. Pozdější
  přenormování hřiště nebo oprava stroke indexu proto nepřepočítá archivní
  kola - stejný princip, jaký už platí pro nastavení bodování.
- Se zvoleným hřištěm určuje počet jamek hřiště, ne nastavení kola.

## [0.13.1] – 2026-08-04

### Změněno

- Nastavení bodování používá na mobilu dotykové ovladače `− / hodnota / +`;
  ruční desetinné zadání zůstává možné a po opuštění se normalizuje.
- Double Best je v nastavení bodování zařazený mezi Nearest a Bunker, tedy
  společně s hodnotami extra bodů.
- Popis potvrzování Longest a Nearest přesněji říká, že při výsledku horším
  než PAR bod propadá soupeřům.

## [0.13.0] – 2026-08-04

### Přidáno

- Jazyk se přepíná vlajkami v pravém horním rohu úvodní obrazovky.
- Každá hra má vlastní ozubené tlačítko nastavení; zobrazuje jen volby,
  které její pravidla skutečně používají.
- Skins nyní vyhodnocuje extra body pro jednotlivé hráče a zobrazuje je ve
  výsledcích i přímo za výsledkem hráče ve scorekartě.
- Individuální vyrovnání zobrazuje vedle čistých zůstatků i konkrétní platby
  mezi každou dvojicí hráčů a přepínač pro optimalizované platby s minimálním
  počtem převodů.
- Hlavička zápisu ukazuje průběžné skóre hry. Match play zobrazuje náskok,
  dormie, zbývající jamky a jamky mimo hru po matematickém rozhodnutí.

### Změněno

- Nastavení bodování používá na mobilu dotykové ovladače `− / hodnota / +`;
  ruční desetinné zadání zůstává možné a po opuštění se normalizuje.
- Double Best je v nastavení bodování zařazený mezi Nearest a Bunker, tedy
  společně s hodnotami extra bodů.
- České popisky výsledků používají názvy `Doble` a `Triple` místo výrazů
  Dvojbogey a Trojbogey.
- Skins scorecard jemně podbarvuje celé buňky všech jamek, jejichž skiny byly
  přidělené hráči, včetně předchozích jamek z přenášeného banku. Extra body
  zapisuje jako `+N` hned za výsledkem a ve spodním řádku pod součtem ran
  přidává `B`/`P`; nulové extra body se nezobrazují.
- Podbarvení přidělených skinů je výraznější, aby bylo v scorekartě snadno
  rozpoznatelné i na mobilu.
- Přidán i jemný vnitřní rámeček kolem podbarvených buněk s přiděleným skinem.
- Hráčské sloupce ve scorekartě mají střídavé decentní podbarvení pro snazší
  sledování výsledků napříč řádky.
- Průběžné skóre se v zápisu zobrazuje vedle čísla aktuální jamky místo v
  samostatném řádku pod navigací, takže hlavička zabírá méně místa.
- Bonus `double` se v rozhraní jmenuje **Dvojnásobná sázka / Double stake**;
  popis nově vysvětluje, že násobí sázku na jamce.
- Match play po rozhodující jamce další zapsané jamky do výsledku ani
  vyrovnání nezapočítává.

## [0.12.1] – 2026-08-04

### Změněno

- **Dokumentace dorovnaná na aktuální stav.** Pokyny pro GitHub Copilot byly
  pořád ve verzi před synchronizací a před jazyky (tvrdily „bez backendu",
  „texty česky" a jen dvě runtime závislosti). Nově popisují i18n, pravidla
  pro Firebase a plán Spark.
- `docs/deployment.md` popisuje konfiguraci Firebase při buildu včetně toho,
  proč proměnné uložené v Environment build job nevidí.
- Doplněno `updatedAt` do modelu kola v `docs/architecture.md`, chybějící
  soubory `sync/` a testy v `CONTRIBUTING.md`, otevřené otázky v
  `docs/decisions.md`.

## [0.12.0] – 2026-08-04

### Přidáno

- **Angličtina vedle češtiny.** Jazyk se vybere podle prohlížeče (uložená
  volba → jazyk prohlížeče → angličtina) a dá se přepnout na úvodní obrazovce.
  Přeložené je všechno včetně názvů a pravidel her, extra bodů, výsledkových
  tabulek, hlášek synchronizace i zásad zpracování údajů.
- Podle jazyka se řídí i **formát částek, datum kola a řazení jmen hráčů**;
  česká množná čísla mají správné tvary (1 jamka / 3 jamky / 5 jamek).

### Změněno

- Texty se přesunuly z komponent do `src/i18n/`. Český katalog je zdrojem
  pravdy pro klíče, anglický je typovaný jako `Record<MessageKey, Message>` –
  chybějící překlad tak neprojde překladem, místo aby v aplikaci zůstal česky.
- `GameDefinition` a `BonusDefinition` už nenesou texty, jen `id`; překlady se
  hledají pod `games.<id>.name`, `bonus.<id>.name` a podobně.
- Startovní stránka a manifest PWA jsou jazykově neutrální – běží dřív, než se
  aplikace načte, takže tam zvolený jazyk ještě není znám.

## [0.11.1] – 2026-08-04

### Opraveno

- **Synchronizace končila chybou `invalid-argument`.** Firestore neumí uložit
  pole uvnitř pole a `Round.bonuses` (extra body podle hráče a jamky) přesně
  takové je. V dokumentu se jamky nově ukládají jako mapa klíčovaná číslem
  jamky; převod tam i zpět je v `src/sync/document.ts` a hlídá ho deset testů
  včetně kontroly, že v dokumentu žádné pole v poli nezůstane.

## [0.11.0] – 2026-08-04

### Opraveno

- **Na iPhonu a iPadu nešlo přihlášení vůbec** – prohlížeč blokoval
  vyskakovací okno. Okno se otevíralo až po dynamickém načtení Firebase SDK
  a po síťovém ověření původu stránky, které SDK dělá samo; do té doby
  „uživatelské gesto" z klepnutí vypršelo. Nově se obojí připraví dopředu při
  otevření obrazovky účtu (tlačítko je do té doby vypnuté s popiskem
  „Připravuji přihlášení…") a okno se otevírá synchronně v obsluze klepnutí.
- **Chyba synchronizace se zahazovala** a hlásila jen „nepovedlo se".
  Nově obrazovka účtu vypíše konkrétní příčinu – nevytvořená databáze,
  nenasazená pravidla, vypršené přihlášení – včetně toho, kde to spravit.

### Změněno

- Otevření obrazovky účtu nově přednačte Firebase SDK. Kdo na účet nesáhne,
  nadále nestáhne nic; ověřeno v prohlížeči.

## [0.10.3] – 2026-08-04

### Přidáno

- **Veřejná stránka se zásadami zpracování údajů** na `/soukromi.html`.
  Google při nastavení přihlášení vyžaduje odkaz na veřejnou adresu, kterou
  obrazovka v aplikaci nemá. Obrazovka na ni teď odkazuje.

### Opraveno

- Build hlásil zastaralou volbu `advancedChunks`; nahrazena za `codeSplitting`.
  Firebase zůstává ve vlastním chunku mimo předcachování, velikost beze změny.

## [0.10.1] – 2026-08-03

### Opraveno

- **Odkaz na přihlášení nešel najít.** Byl jen na úvodní obrazovce, která se
  ukáže pouze bez rozehraného kola – s rozehranou hrou se k němu nedalo dostat
  vůbec. Nově je „Účet a záloha“ i u zápisu skóre a ve výsledcích.
- **Když chybí konfigurace cloudu, odkaz se skrýval bez vysvětlení.** Nově je
  vidět vždy a obrazovka účtu vypíše, které údaje buildu chyběly – jinak se
  nedalo poznat, proč přihlášení není k dispozici.

## [0.10.0] – 2026-08-03

### Přidáno

- **Nepovinná záloha do cloudu přes účet Google.** Po přihlášení se kola,
  seznam hráčů i nastavení bodování průběžně zálohují do Firestore a jsou
  dostupná z dalších zařízení. Na novém telefonu stačí se přihlásit.
- **Bez přihlášení se nemění vůbec nic.** Aplikace v takovém případě nenaváže
  spojení a Firebase SDK se ani nestáhne – je načítané dynamicky až při
  přihlášení a vynechané z předcachování service workerem. Předcachovaná
  velikost aplikace zůstala na ~324 kB.
- **Obrazovka „Účet"** se stavem synchronizace, ručním spuštěním, odhlášením
  a smazáním účtu i všech dat v cloudu.
- **Zásady zpracování údajů** dostupné z obrazovky účtu.
- Pravidla zabezpečení [`firestore.rules`](firestore.rules): ke svým datům se
  dostane výhradně přihlášený vlastník.

### Změněno

- Kolo si nese `updatedAt`, podle kterého se při synchronizaci pozná novější
  verze. Zvedá ho jen skutečná změna zápisu, ne listování jamkami – jinak by
  zařízení, na kterém se jen kouká, přebilo to, na kterém se hraje.
- Kola z dřívějších verzí `updatedAt` doplní z data ukončení, takže se archiv
  chová správně i po aktualizaci.

### Vývojářské

- Nová složka `src/sync/` rozdělená tak, aby slučovací logika (`merge.ts`)
  neměla s Firebase nic společného a dala se testovat bez sítě (13 testů).
- Konfigurace Firebase se plní při buildu z GitHub Secrets, viz `.env.example`;
  bez ní se aplikace postaví i spustí jako čistě místní.

## [0.9.0] – 2026-08-03

### Přidáno

- **Záloha dat do souboru a obnova z něj** – nová obrazovka „Záloha dat“
  dostupná z úvodní stránky. Stáhne jeden soubor JSON se vším (rozehrané kolo,
  archiv, seznam hráčů, nastavení bodování všech her) a umí ho načíst zpátky.
  První krok k tomu, aby data nebyla uvězněná v jednom telefonu.
- Obnova má dva režimy: **Sloučit** (výchozí) přidá kola ze zálohy k současným
  a nic nesmaže – při shodě id vyhrává novější kolo a rozehraná hra zůstává ta
  současná; **Nahradit vše** nastaví přesně stav ze zálohy, což se hodí na novém
  zařízení.
- Cizí nebo poškozený soubor se odmítne s vysvětlením místo tichého poškození
  dat. Záloha z novější verze aplikace se odmítne také.
- Kola ze starších verzí se při obnově automaticky doplní na aktuální tvar –
  procházejí stejnou normalizací jako data z úložiště.

### Vývojářské

- Nový modul [`src/backup.ts`](src/backup.ts) rozdělený na čisté funkce
  (slučování, kontrola souboru) a tenké obálky nad `localStorage`, plus 14 testů
  v `src/backup.test.ts`.
- `storage.ts` nově vystavuje `isValidRound()`, `normalizeRound()` a hromadné
  zápisy `saveArchive()`, `saveRoster()`, `saveAllGameOptions()`.

## [0.8.1] – 2026-08-03

### Opraveno

- **Změna paru jamky smaže Longest a Nearest, které na nový par nepatří.**
  Dřív zapsaný Longest zůstal na jamce i po opravě paru z 5 na jinou hodnotu
  (a stejně tak Nearest na trojce), takže se bonus počítal na jamce, kde ho
  vůbec nejde zvolit. Bonusy nezávislé na paru zůstávají beze změny.

## [0.8.0] – 2026-08-02

### Přidáno

- **Extra body u jamky** – double, longest, nearest, bunker, double bunker,
  water, barkie a arnie. Vybírají se tlačítkem u jména hráče a nabízejí se
  jen ty, které mají v nastavení hry nenulovou hodnotu. Longest se nabízí
  pouze na pětiparových jamkách, Nearest na tříparových.
- **Extra bod získává celá dvojice**, i když ho uhrál jen jeden z partnerů.
- **Obrazovka „Nastavení bodování hry"** – hodnoty extra bodů, násobiče za
  výsledek a další volby, ukládané **zvlášť pro každou hru**.
- **Konfigurovatelné násobiče za výsledek** – hodnota extra bodu platí za par
  a lepší výsledek ji násobí; výchozí je birdie ×2, eagle ×3, albatros ×10
  a condor ×1000. Bogey a horší extra bod nepřizná.
- **Potvrzování Longest a Nearest** (ve výchozím stavu zapnuté) – kdo bonus
  zapsal, musí jamku dohrát na par nebo líp, jinak bod propadá soupeřově
  dvojici. Značka `L` / `N` u jména je zeleně, když bod zůstává vlastní
  dvojici, červeně, když propadá soupeřům, a tlumeně, dokud hráč nezapsal.
- **Double Best** – volitelný bod navíc (výchozí 1) pro dvojici, jejíž oba
  míče byly lepší než oba míče soupeře.
- **Značka `×2`** u hráče, který na jamce zapsal double.
- **Kolo si nese vlastní kopii nastavení bodování.** Změna předvoleb tak
  nepřepočítá už odehraná kola a ve výsledcích archivního kola je vidět
  sekce „Bodování kola" s konfigurací, se kterou se hrálo.
- **Vlastní doména `golf.kubecka.cz`** (`public/CNAME`); aplikace se servíruje
  z kořene, base path jde přepnout přes `BASE_PATH`.
- Rozsáhlá dokumentace: [`docs/architecture.md`](docs/architecture.md),
  [`docs/decisions.md`](docs/decisions.md), [`docs/deployment.md`](docs/deployment.md),
  [`AGENTS.md`](AGENTS.md) a pokyny pro GitHub Copilot.

### Změněno

- **Volba „9. a 18. jamka za dvojnásobek" se přesunula** ze zadání kola do
  nastavení bodování hry a je nově **ve výchozím stavu zapnutá**.
- **Double se skládá s dvojnásobnou jamkou i sám se sebou** – každý zápis
  násobí zvlášť, takže dvojnásobná jamka s doublem je za čtyřnásobek.
  Volba „Nenásobit extra body" nechá extra body v základní hodnotě.
- **Součet dvojice počítá zbylého partnera.** Když jeden z dvojice jamku vzdá,
  sčítají se rány těch, kdo dohráli; přednost má ale dvojice s víc dohranými
  míči, aby si škrtnutím špatného míče nikdo nepolepšil.
- Popisek „Lepší míč" se ve shrnutí jamky zkrátil na „Best".
- Nearest má značku `N` (dřív `P`).

## [0.7.1] – 2026-08-02

### Změněno

- Par má modrý čtvereček stejně jako ostatní výsledky, ne jen barevné číslo.
- Trojbogey a horší má trojitý obrys místo dvojitého, takže se liší od
  dvojbogey i tvarem, nejen barvou.
- **Vícenásobné obrysy se kreslí dovnitř značky.** Dřív rostly ven, takže
  značky s dvojitým obrysem byly větší než ostatní a rozhazovaly mřížku
  scorekarty; teď mají všechny stejný vnější rozměr.

## [0.7.0] – 2026-08-02

### Změněno

- **Nová barevná škála výsledků na jamce**, nově v šesti stupních: eagle
  žlutě, birdie červeně, par modře, bogey zeleně, dvojbogey šedě a trojbogey
  a horší černě. Dřív se rozlišovalo jen pět stupňů ve dvou barvách.
- Stejné značky se používají i **při zápisu skóre**, ne jen ve scorekartě –
  barva výsledku je tak vidět hned při zadávání.
- Par nedostal barevný štítek, jen modré číslo; černá má světlý obrys, aby
  na tmavém pozadí nezanikla.

## [0.6.0] – 2026-08-02

### Opraveno

- **Vyrovnání u dvojic se počítalo v poloviční výši.** Rozdíl bodů přepočtený
  na peníze platí _každý_ hráč prohrávající dvojice svému protějšku, ne
  dvojice jako celek. Při rozdílu 7 bodů a desetikoruně za bod tedy platí
  70 Kč první hráč prvnímu soupeři a 70 Kč druhý hráč druhému; vítězná
  dvojice dostane 140 Kč. Dřív se přesouvalo jen 70 Kč.

### Změněno

- Vyrovnání u dvojic ukazuje konkrétní platby („Hráč 2 → Hráč 1 70 Kč“)
  místo zůstatku celé dvojice; protějšky se párují podle pořadí ve dvojici.
- Vyrovnání jednotlivců (Skins, match play dvou hráčů) zůstává jako zůstatek
  na hráče a počítá se beze změny.

## [0.5.0] – 2026-08-02

### Změněno

- **Chybějící zápis na rozehrané jamce se počítá jako vzdaná jamka.** Dřív se
  taková jamka přeskakovala. Nově dvojice v Best Aggregate přichází o součet
  (bere ho soupeř), ve Skins se vzdaný hráč o skin ucházet nemůže a v Match
  play jamku prohrává. Lepší míč dvojici zůstává, dokud ho drží aspoň jeden
  z partnerů.
- Jamka, na kterou se ještě nedošlo (nezapsal na ní nikdo), se nadále
  nezapočítává nikomu – aplikace obojí rozlišuje podle toho, jestli na jamce
  zapsal aspoň jeden hráč.

### Přidáno

- **Uložení předčasně ukončeného kola** – odkaz „Ukončit kolo“ u zápisu skóre
  funguje na kterékoli jamce, takže kolo přerušené počasím se dá uložit.
- Upozornění před uložením nekompletního kola vypíše chybějící jamky a
  rozliší vzdané od nehraných; uložení je potřeba potvrdit.
- Archiv u předčasně ukončeného kola ukazuje rozsah, například „5 z 18 jamek“.
- Vzdaný výsledek je při zápisu označený slovem „vzdáno“.

## [0.4.0] – 2026-08-02

### Přidáno

- **Sázka u každého kola** – měna (Kč / €) a hodnota jednoho bodu. Výchozí je
  10 Kč nebo 1 €, přepsat jde na libovolné číslo včetně desetinného.
  Předvolby se pamatují do dalšího kola.
- **Volba „9. a 18. jamka za dvojnásobek“** – násobí celý zisk z jamky včetně
  bonusů za birdie a eagle, u Skins hodnotu skinu v sázce. U devítijamkového
  kola se týká poslední jamky. Match play ji nenabízí, protože by rozbila
  stav zápasu.
- **Peněžní vyrovnání ve výsledcích** – prohrávající strana platí vítězné
  rozdíl bodů přepočtený na peníze. U tří a čtyř hráčů ve Skins se každý bod
  navíc inkasuje od každého soupeře zvlášť, takže součet částek je nula.
- Nový modul [`src/money.ts`](src/money.ts) s výpočtem vyrovnání a
  formátováním částek, pokrytý testy.

## [0.3.1] – 2026-08-01

### Změněno

- **Rychlejší zápis skóre.** Z prázdné buňky zapíše `+` bogey, `−` birdie
  a klepnutí doprostřed par – tři nejčastější výsledky jsou na jedno
  klepnutí. Dřív `+` zapsal par a `−` birdie.
- Mazání zápisu se přesunulo z klepnutí na **přidržení čísla** (půl sekundy),
  protože krátké klepnutí teď vkládá par.

## [0.3.0] – 2026-08-01

### Přidáno

- **Značky ve scorekartě** podle golfové konvence: birdie v kroužku, bogey
  ve čtverečku, eagle a dvojbogey s dvojitým orámováním. Podpar červeně,
  nadpar modře, par bez zvýraznění.
- **Body dvojice u každé jamky** – scorekarta má za každou dvojicí sloupec
  s body získanými na dané jamce, včetně celkového součtu v posledním řádku.
- Skins mají ve scorekartě sloupec s rozdanými skiny.
- Legenda značek pod scorekartou.

### Změněno

- Scorekarta je u týmových her seřazená po dvojicích a nad jejich sloupci má
  nadpis se jménem dvojice.
- Užší buňky a zkracování dlouhých jmen, aby se scorekarta vešla na šířku
  telefonu i s osmi sloupci.
- Scorekarta se přesunula do vlastní komponenty `src/screens/Scorecard.tsx`.

## [0.2.0] – 2026-08-01

### Přidáno

- **Skins** – hra jednotlivců pro 2 až 4 hráče s přenášením nerozdělených
  skinů do další jamky.
- **Match play** – zápas na jamky pro 2 hráče nebo 2 dvojice (four-ball),
  včetně stavů `2 UP`, `AS`, `dormie` a ukončení notací `3&2`.
- **Archiv odehraných kol** – dohraná kola se ukládají a jde se k nim vracet
  včetně kompletního scorecardu; záznamy lze mazat.
- **Seznam hráčů** – spoluhráči se ukládají sami a při zakládání kola se
  vybírají klepnutím místo přepisování jmen.
- **Zobrazení verze** v patičce aplikace.
- Testy pravidel všech tří her (25 testů).
- Dokumentace pravidel v [`docs/games.md`](docs/games.md) včetně rozhodnutí
  tam, kde zadání mlčelo.

### Změněno

- **Best Aggregate se počítá bodově, ne na rány.** Dvojice získává 1 bod za
  lepší míč, 1 bod za nižší součet, 1 bod za birdie a 3 body za eagle;
  vyhrává nejvyšší počet bodů. Původní vyhodnocení podle součtu ran bylo
  chybné.
- Best Aggregate je nově vždy pro 4 hráče (dřív šlo hrát i ve dvou).
- Eagle se ve scorecardu odlišuje vlastní barvou.

### Vývojářské

- Vitest pro testy, Prettier pro formátování, `.editorconfig` a `.nvmrc`.
- `npm run check` spustí kontrolu typů, testy i formátování.
- CI kromě buildu pouští i testy.

## [0.1.1] – 2026-08-01

### Opraveno

- Když se hlavní skript nenačte, zůstala prázdná stránka bez vysvětlení.
  Nově se zobrazí úvodní obrazovka a po několika sekundách srozumitelná
  hláška.

## [0.1.0] – 2026-08-01

### Přidáno

- První verze PWA: zápis skóre po jamkách pro 2–4 hráče, nastavení paru
  u každé jamky, scorecard a průběžné výsledky.
- Offline provoz přes service worker, rozehrané kolo přežije zavření
  aplikace.
- Nasazení na GitHub Pages přes GitHub Actions.
