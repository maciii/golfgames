# Změny

Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování ze [sémantického verzování](https://semver.org/lang/cs/).

Patch verzi zvedá `scripts/bump-version.mjs` automaticky při každém lokálním
buildu, takže čísla patch verzí mezi záznamy nejsou souvislá. Zapisují se sem
jen verze s věcnou změnou.

## [0.40.4] – 2026-08-10

### Přidáno

- **Wordmark „Fairsome" na Home.** Zatím jen kosmetická značka místo
  textu „Golf Games" na jednom místě - o skutečném jméně appky se ještě
  rozhoduje.

### Změněno

- **Tlačítko Zpět je teď ikona vedle titulku, ne osamocený text nebo
  velké tlačítko dole.** Sjednoceno na 11 obrazovkách: Hřiště, Hráči,
  Archiv, Účet, Záloha dat, Zásady soukromí, Úprava hřiště a všechny
  čtyři kroky zakládání kola.
- **Vlajky jazyků jsou nakreslené, ne emoji.** Na Windows se emoji
  vlajek zobrazovaly jen jako dvoupísmenný kód (CZ/GB), protože je
  systémový emoji font nemá - stejná třída chyby jako dřív u srdíčka
  a hvězdičky.
- **Výběr země ve výběru hřiště má vlastní seznam místo nativního
  `<select>`.** Rozbalený nativní seznam kreslí na Windows/Chrome
  systém včetně modrého zvýraznění, které CSS nejde přebarvit - teď je
  to stejný princip jako `TeeSheet` u odpališť.

## [0.40.3] – 2026-08-10

### Změněno

- **Oblíbená hřiště na Domů i ve výběru hřiště mají zhuštěný přehled.**
  Místo velkých boxů přes celou šířku je teď nahoře řádek srdíčkových
  pilulek jen se jménem hřiště - tap rovnou vybere. Ve výběru hřiště mizí
  při hledání, ať nezabírá místo dvojmo.
- **Oblíbení hráči v kroku Hráči mají vlastní krabičku.** Dřív splývali se
  seznamem všech uložených hráčů pod nimi a hvězdička byla textový znak
  ★, který se na různých systémech vykresloval jinak - teď je to stejná
  nakreslená ikona jako zbytek appky.
- **Odpaliště hráče značí vlaječka, ne kolečko.** Velké barevné kolečko u
  jména hráče splývalo s ostatními kulatými prvky; teď je tam barevná
  vlaječka na tónovaném podkladu, jasněji odkazuje na teebox.
- **Krok Sázka je jedna karta, ne volně poskládané prvky.** Měna, hodnota
  bodu a nápověda k nim teď drží opticky pohromadě.

### Opraveno

- **Výběr odpaliště v dialogu vyžadoval zavřít dialog zvlášť.** Klepnutí
  na barvu teď rovnou vybere a dialog zavře - nebyl důvod to potvrzovat
  druhým krokem.

## [0.40.2] – 2026-08-10

### Změněno

- **Číslo verze je vidět jen v menu.** Dřív se opakovalo v patičce skoro
  každé obrazovky, kde bylo zbytečné a matlo (vypadalo, jako by appka mohla
  mít na různých obrazovkách jinou verzi). Stav zálohy (zálohováno/
  synchronizuji/bez připojení) v posledním kroku zakládání kola zůstává.

## [0.40.1] – 2026-08-10

### Opraveno

- **Kolo bez hřiště se vždycky založilo na osmnáct jamek.** Volba 6, 9 nebo
  12 jamek v kroku Odpaliště a jamky se do založeného kola nedostala - krok
  Sázka počítal délku kola s natvrdo psanou osmnáctkou místo se zvolenou
  hodnotou. Hlídá to teď e2e test.
- **HCP index se v kroku Hráči zobrazoval jinak než jinde v appce.** Sjednocení
  z 0.40.0 minulo krok Hráči, takže tam u uloženého hráče svítilo „30.1", kde
  Domů i obrazovka Hráči píšou „30,1". Oba kroky zakládání kola teď používají
  stejné `parseHandicapIndex`/`formatHandicapIndex` jako zbytek appky.

### Změněno

- **Testy rozhraní odpovídají krokovému zakládání kola.** Sada v `e2e/`
  pořád vedla appku přes jednu obrazovku nastavení, která od 0.40.0
  neexistuje, takže od domovské obrazovky (0.39.0) neprocházela. Rozvržení
  se teď kontroluje v každém z pěti kroků zvlášť a přibyl test na to, že
  zpět prochází kroky pozpátku.
- **Rozdělení čtyř hráčů do dvojic žije na jednom místě.** Krok Hra
  a zakládání kola měly každý vlastní kopii téže tabulky; hráči by při
  rozejití dostali jiné dvojice, než jaké si vybrali.

## [0.40.0] – 2026-08-10

### Přidáno

- **Zakládání kola rozdělené na kroky.** Místo jednoho dlouhého formuláře teď
  appka vede pěti obrazovkami: hřiště → odpaliště a jamky → hráči → hra
  a dvojice → sázka. Krok Hráči je teď nezávislý na hře - vybírá se v něm
  1 až 4 hráči a krok Hra podle toho nabídne jen hry, které se s tolika
  hráči dají hrát (dřív to bylo naopak). Zpět/swipe mezi kroky navigují
  přesně o krok zpátky s vyplněnými hodnotami, appku opustí jen z domovské
  obrazovky.
- **Hrát bez sázky.** Appka uměla nulovou sázku tiše schovat, jen k tomu
  chyběl srozumitelný přepínač. Krok Sázka ho teď má - schová měnu
  a hodnotu bodu a appka spočítá jen výsledek hry.
- **Oblíbení hráči v kroku Hráči.** Hráči označení hvězdičkou v `Hráči`
  z menu jdou přidat do kola jedním klepnutím, nahoře nad běžným seznamem
  uložených hráčů.

### Změněno

- **Odpaliště pro všechny je jeden select box.** Šest velkých dlaždic
  nahradil kompaktní výběr s titulkem - u hřiště s víc odpališti to ušetří
  hodně místa.
- **Řádek hráče je na jednom řádku.** Odpaliště je teď jen barevná kulička
  vedle jména, ne celý štítek s textem - klepnutí na ni pořád otevře plný
  výběr s délkou, normou a přepočtem na rány.
- **Tlačítka u rozehraného kola.** "Zpět do hry" je teď jediné zřetelné
  tlačítko u průběžných výsledků; zahození rozehraného kola je vzácná
  a nevratná akce, proto je z rovnocenného tlačítka "Nové kolo" teď
  podřazený odkaz "Zahodit rozehrané kolo" s jasnějším potvrzením.
- **Pořadí na domovské obrazovce.** Oblíbená hřiště jsou teď hned pod
  Novou hrou, pod nimi oblíbení hráči a naposledy poslední odehraná hra.

### Opraveno

- **Oblíbená hřiště na domovské obrazovce se řídila stažením, ne srdíčkem.**
  Hřiště označené jako oblíbené, ale ještě nestažené do telefonu, se na
  domovské obrazovce vůbec neukázalo. Označení srdíčkem teď hřiště rovnou
  stáhne, takže se oblíbenost řídí opravdu jen srdíčkem.
- **Srdíčko oblíbeného hřiště se na některých systémech deformovalo.**
  Textový znak ♥/♡ nahradila nakreslená ikona, která vypadá všude stejně.
  Stejnou cestou (kreslené ikony) jde i menu.
- **HCP index se ukládal nejednotně podle toho, jestli se zadala tečka,
  nebo čárka.** Appka teď vždycky zobrazí stejný tvar bez ohledu na to, co
  hráč napsal - sjednocení žije jako sdílená funkce v `handicap.ts`.

## [0.39.1] – 2026-08-10

### Opraveno

- **Menu odpovídá schválenému návrhu.** První verze byla jen textový seznam
  odshora - teď je to výsuvný panel zleva s ikonkami a počty uložených
  položek u Hřišť, Hráčů a Archivu, přesně podle mockupu.
- **Zakládání kola už nenabízí zdvojené odkazy.** `CoursePickerScreen` ve
  spodním panelu přestal nabízet Archiv/Zálohu/Účet - stejné položky má
  domovská obrazovka v menu, odkud se do zakládání kola vstupuje. Zůstává jen
  „Hrát bez hřiště", které je specifické pro zakládání kola.

## [0.39.0] – 2026-08-10

### Přidáno

- **Domovská obrazovka.** Appka teď začíná skutečnou úvodní obrazovkou místo
  rovnou výběrem hřiště: velké tlačítko Nová hra, poslední odehraná hra
  s výsledkem, krátký seznam oblíbených hráčů a oblíbená hřiště, ze kterých
  jde spustit založení kola rovnou s předvyplněným hřištěm.
- **Hlavní menu.** Vše, co se používá zřídka a záměrně, je teď za jedním
  menu (ikona vlevo nahoře na domovské obrazovce): Nová hra, Hřiště, Hráči,
  Archiv, Záloha dat, Účet.
- **Hřiště jde procházet i mimo zakládání kola.** Položka Hřiště v menu
  otevře stejný výběr hřiště jako při zakládání kola, ale klepnutí na hřiště
  vede na jeho úpravu, ne do nastavení kola — hodí se na správu katalogu
  a oblíbených bez toho, aby appka nutila založit hru.
- **Obrazovka Hráči.** Nová správa uložených spoluhráčů: přidání, smazání,
  úprava handicapového indexu a zvýraznění hráče pro domovskou obrazovku.
  Appka se vědomě nenapojuje na ČGF ani Týčko — ČGF zrušilo veřejnou databázi
  hráčů kvůli GDPR už v roce 2018 a Týčko má na svá data jen uzavřené
  partnerství, ne otevřené API.

## [0.38.0] – 2026-08-10

### Přidáno

- **Zpět a swipe teď navigují v appce, ne z ní ven.** Appka dřív do historie
  prohlížeče nezapisovala nic, takže první gesto zpět appku vždycky rovnou
  opustilo — klidně uprostřed zapisování skóre. Každá obrazovka i otevřené
  kolo v archivu se teď zapisují přes `history.pushState`; appku zpět opustí
  jedině z úvodní obrazovky, jinde vždycky naviguje o krok zpátky uvnitř
  appky. Viz rozhodnutí #27 v `docs/decisions.md`.

## [0.37.2] – 2026-08-10

### Opraveno

- **Synchronizace předvoleb padala na `invalid-argument`.** Do dokumentu
  s hřišti, seznamem hráčů a nastavením se posílala hřiště tak, jak je drží
  aplikace — a `normalizeCourse()` v nich nechává `loops: undefined`, aby
  přebilo poškozené smyčky z uložené kopie. Firestore ale `undefined` odmítá
  a shodí **celý zápis**, takže se nepřenášela ani hřiště, ani spoluhráči, ani
  sázka. Kola se synchronizovala dál — ta jdou přes JSON, které `undefined`
  zahodí samo. Nově se dokument předvoleb čistí stejně (`forFirestore()`).
  Chyba je v aplikaci od 7. srpna.

## [0.37.1] – 2026-08-10

### Opraveno

- **Zápis skóre se roztáhl na dvojnásobek a začal rolovat.** Řádek hráče
  v zakládání kola dostal v 0.37.0 stejný název třídy jako řádek v zápisu
  skóre (`.player-row`) a podsunul mu svislé rozvržení: jméno a stepper se
  postavily pod sebe, řádek narostl ze 72 na 178 px a obrazovka přerostla
  displej o 401 px. Třídy zakládání kola teď nesou předponu `setup-`.

## [0.37.0] – 2026-08-10

### Přidáno

- **Každý hráč si vybírá vlastní odpaliště.** V řádku hráče je barevný štítek;
  klepnutí otevře list s délkou, normou a hlavně s tím, **kolik ran z daného
  odpaliště dostane** — to je informace, kvůli které se odpaliště vybírá.
  Hrací handicap se pak počítá z jeho normy, ne z jedné společné: na Colony
  Golf East dostane hráčka s indexem 30,1 z červených 28 ran místo 35 ze
  žlutých. Odpaliště pro celé kolo se dá pořád nastavit jedním klepnutím
  a tlačítko „Použít pro všechny hráče" ho srovná zpátky.
- **Kolo začíná výběrem hřiště.** Bez hřiště není z čeho vybrat odpaliště ani
  počítat handicapy, takže se nastavení otevírá až proti němu. Hrát bez hřiště
  jde dál — odkazem na první obrazovce.
- **Osmnáctka ze dvou devítek.** Devítijamkové hřiště jde zahrát dvakrát dokola
  nebo spojit s jinou devítkou; pary, stroke indexy i norma se z obou složí.
- **Seznam hráčů si pamatuje odpaliště.** Vedle handicapu, takže se u známého
  spoluhráče vyplní obojí najednou.
- Na scorekartě je u jména vidět odpaliště, když se hráči nehrají ze stejného.

### Změněno

- Nastavení kola je přeskládané: nahoře hřiště, pak hráči i s handicapem
  a odpalištěm v jednom řádku, teprve pak hra a sázka. Samostatná sekce
  handicapů zmizela — jméno se zbytečně opakovalo na dvou místech.

## [0.36.0] – 2026-08-10

### Přidáno

- **Základ pro odpaliště u jednotlivých hráčů.** Kolo si nese celou nabídku
  odpališť hřiště a hráč může mít vlastní; hrací handicap se pak počítá z jeho
  normy, ne z jedné společné. Rozdíl je velký — na Colony Golf East vyjde
  hráčce s indexem 30,1 z červených 28 ran, ze žlutých 35. Seznam hráčů si
  odpaliště pamatuje vedle handicapu a přenáší ho přes zálohu i cloud.
- **Skládání osmnáctky ze dvou devítek.** Devítka se běžně hraje dvakrát
  dokola nebo se spojí s jinou; nové `composeNines()` z nich udělá obyčejné
  osmnáctijamkové hřiště. Normu skládá tentýž kód jako u resortů (CR se sčítá,
  SR průměruje, stroke indexy se proloží), takže Spa Golf Club dvakrát dá
  CR 65,0 / SR 124 / par 68. Devítka, kterou klub normuje jako dvě kola dokola
  (Gloria Verde), se napřed zkrátí, aby se norma nezapočítala dvakrát.

**Zatím se tím nic nemění v ovládání** — obrazovky pořád nabízejí jedno
odpaliště pro celé kolo. Tahle verze je model a výpočty, na kterých to teprve
vznikne.

### Opraveno

- Seznam hráčů se přes cloud přenášel bez handicapových indexů; po přihlášení
  na jiném zařízení chyběly.

## [0.35.0] – 2026-08-09

### Opraveno

- **Samostatná devítka na resortu dávala skoro dvojnásobek ran.** Hrací
  handicap krátil index i rozdíl `CR − par` jedním společným podílem. To sedí
  na devítku hranou z osmnáctijamkové normy, ale ne na devítku, která má
  vlastní devítkovou normu — tam podíl vyšel 1, index se nezkrátil vůbec
  a proti devítkové normě dal skoro dvojnásobek. Na Kácově vycházelo z devítky
  Forest a indexu 18 celkem 26 ran místo čtrnácti. `courseHandicap()` teď bere
  hrané jamky a normované jamky zvlášť: index krátí vždycky podílem hraných
  jamek proti osmnáctce, `CR − par` jen tehdy, když norma pokrývá víc jamek,
  než se hraje. Týkalo se to osmi hřišť v katalogu, mimo jiné obou devítek
  Čeladné, Karlštejna, Kaskády a Ropice. Odehraná kola se nepřepočítají —
  hrací handicap si kolo ukládá při založení.

## [0.34.0] – 2026-08-06

### Přidáno

- **Resorty s víc hřišti a víc devítkami.** Areál, který má dvě osmnáctky, je
  v katalogu dvěma hřišti (Čeladná Old Course a New Course), a hřiště s víc
  než osmnácti jamkami nese pojmenované devítky. Kolo se z nich při zakládání
  **skládá v pořadí, ve kterém se hrají** — Forest + River je jiná osmnáctka
  než River + Forest, s jinými pary, jiným stroke indexem i jinou normou.
  Vybraná část se ukáže u hřiště („Kácov · Forest + River“) a uloží se ke kolu.
- **Devítkové normy odpališť.** Norma kombinace se skládá z norem devítek: CR
  se sčítá, SR průměruje podle počtu jamek. Na Kácově tak z Forest 38,0/149
  a River 35,9/129 vyjde 73,9/139, jak to má normovací tabulka ČGF.
- **Hřiště o jiném počtu jamek než 9 a 18.** Kolo bez hřiště jde založit na 6,
  9, 12 nebo 18 jamek a v zadání hřiště jdou zadat i 27 a 36 jamek; hřiště nad
  osmnáct jamek se rozdělí na pojmenované devítky, které se dají přejmenovat.
- Ve výběru hřiště je u resortu vidět, na kolik devítek se dělí.

### Opraveno

- **Norma odpaliště se vztahuje k hraným jamkám.** Nové pole `holeCount`
  u odpaliště říká, kolika jamek se norma týká, takže devítka s podepsanou
  osmnáctijamkovou normou už nedá zhruba dvojnásobný hrací handicap.
- **Stroke index složené osmnáctky se mezi devítkami prostřídá** (první lichý,
  druhý sudý). Slepené devítky s vlastním SI 1–9 by daly hráči všechny rány na
  první devítce.
- Katalog hřišť opravil resorty, které v něm byly jedním hřištěm: Kácov,
  Karlštejn, Brno Kaskáda, Darovanský dvůr a Ropice mají 27 jamek ve třech
  devítkách, Čeladná a Konopiště se rozpadly na svá hřiště a stejně tak
  zahraniční resorty (Emirates, Belek, Vale de Lobo, PGA Catalunya a další).

## [0.33.0] – 2026-08-06

### Přidáno

- **Dots – nová hra pro tři hráče.** Na každé jamce se mezi tři hráče dělí
  pevný počet bodů podle pořadí. Dvě varianty se přepínají v nastavení
  bodování: **Nine Dot** dělí 9 bodů (5-3-1, při shodách 4-4-1 / 5-2-2 /
  3-3-3) a **Six Dot** 6 bodů (4-2-0, 3-3-0, 4-1-1, 2-2-2). O pořadí na jamce
  rozhoduje netto skóre, body jsou vidět ve scorekartě i v hlavičce zápisu.
- **Dvě volitelné nadstavby Dots** (obě výchozí vypnuté): výhra jamky o dvě
  a víc ran bere všechny body jamky, a zahraná na birdie a lepší je
  zdvojnásobí – tedy 9/18, resp. 6/12 bodů.
- **Body za jamku u jména hráče.** Při zápisu skóre je vedle jména vidět, kolik
  bodů hráči právě zapisovaná jamka vynesla; vítěz jamky je zvýrazněný. Celkový
  stav zůstává nad tím v hlavičce jamky. Platí pro Dots i Stableford – u her
  jednotlivců to dosud nebylo kde vidět.

### Změněno

- **Stableford u jména neopakuje rozdané rány.** Byly tam dvakrát: jako tečky
  i jako štítek. Zůstávají tečky.

## [0.32.0] – 2026-08-06

### Změněno

- **Brutto zůstává brutto.** Zavedený golfový pojem se v českých textech
  nepřekládá – místo „hrubě“ a „hrubý par“ je všude `brutto`, symetricky
  k `netto`, které se nepřekládalo nikdy. Anglické texty dál používají `gross`
  a `net`. Změna se týká i dokumentace a komentářů, aby projekt mluvil jedním
  slovníkem.

## [0.31.0] – 2026-08-06

### Přidáno

- **Responzivní rozvržení pro všechny displeje.** Aplikace zůstává stavěná na
  telefon, ale na širokém displeji se drží v centrovaném sloupci místo aby se
  roztáhla přes celou obrazovku. Na tabletu se jména hráčů, odpaliště a karty
  her skládají do mřížky, na úzkém telefonu (320 px) se zmenšují odsazení
  a přepínač jazyka. Nízký displej na šířku má stlačené odsazení, aby se
  ovládání vešlo na výšku.
- **Testy rozvržení v Playwrightu.** `e2e/responsive.spec.ts` ověřuje ve
  WebKitu, Chromiu i Gecku a v devíti profilech od iPhonu SE po desktop, že nic
  nepřetéká z displeje, ovládání má dotykovou velikost, scorekarta se posouvá
  uvnitř svého rámu a patička zůstává na dohled. Spouští se
  `npm run test:e2e`, mimo CI.

## [0.30.2] – 2026-08-06

### Opraveno

- **Popisy Best + Součet.** Text v aplikaci už neuvádí pevné body za birdie a
  eagle; další body a násobení správně odkazují na nastavení hry.

## [0.30.1] – 2026-08-05

### Opraveno

- **Název instalace PWA.** Přidání aplikace na plochu nyní používá název
  `Golf Games` místo zkráceného názvu `Golf` na Androidu i iOS.

## [0.30.0] – 2026-08-05

### Přidáno

- **Přidání Golf Games na plochu.** Na úvodní obrazovce lze PWA nainstalovat
  nativním dialogem na Androidu; na iPhonu aplikace zobrazí krátký návod Safari.
  Po instalaci se nabídka skryje.

## [0.29.7] – 2026-08-05

### Změněno

- **Přejmenování hry v češtině.** Best Aggregate se v českém rozhraní a
  dokumentaci nyní zobrazuje jako **Best + Součet**. Anglický název zůstává
  Best Aggregate.

## [0.29.6] – 2026-08-05

### Změněno

- **Viditelná rezervace skinu.** Při zapnutém potvrzení parem se u banku
  zobrazuje hráč, jehož výhra čeká na potvrzení na další jamce.

## [0.29.5] – 2026-08-05

### Změněno

- **Rámeček dvojice ve scorekartě.** Označení Levá-Pravá nyní obepíná skóre i
  bodový sloupec daného hráče jako jeden širší obdélník.
- **Skins s potvrzením parem.** Volitelná varianta vyžaduje, aby vítěz jamky
  na následující jamce zahrál alespoň par; jinak se skin vrátí do banku.

## [0.29.4] – 2026-08-05

### Změněno

- **Označení dvojice ve scorekartě.** Rámeček Levá-Pravá je nyní tenčí a má
  stejnou žlutou barvu jako Eagle.

## [0.29.3] – 2026-08-05

### Změněno

- **Přepočet po změně dvojic.** V Levá-Pravá lze dvojici změnit kdykoli po
  zapsání jamky; skóre a bonusy zůstanou zachované a body se přepočítají podle
  nového složení.

## [0.29.2] – 2026-08-05

### Změněno

- **Dvojice ve scorekartě.** Levá-Pravá barevným rámečkem buněk označuje první
  dvojici, která spolu hrála na konkrétní jamce; složení se mění podle jamky.

## [0.29.1] – 2026-08-05

### Změněno

- **Rychlejší volba dvojic v Levá-Pravá.** Na každé jamce jsou tři tlačítka
  s hotovými kombinacemi hráčů; celé složení dvojice se vybere jedním klepnutím.
- **Název varianty.** Levá-Pravá se v nabídce i dokumentaci označuje také jako
  Kraje-Středy.
- **Opravený komentář bodování.** Popis Best + Součet už neslibuje osobní par
  pro Nearest, který se potvrzuje hrubě.

## [0.29.0] – 2026-08-05

### Změněno

- **Osobní PAR potvrzuje jen Longest.** Volba se přejmenovala na _Potvrzovat
  Longest osobním PARem_ a na Nearest se už nevztahuje – ten se v kole s HCP
  potvrzuje vždycky hrubým parem. Nearest je rána na tříparovou jamku, kde
  délka hřiště slabšího hráče netrestá, takže na ni handicap nepatří.

## [0.28.0] – 2026-08-05

### Přidáno

- **Levá-Pravá.** Nová hra pro čtyři hráče používá pravidla Best + Součet,
  ale dvojice se určují z prvních ran na každé jamce zvlášť. Body se připisují
  oběma členům aktuální dvojice a ve výsledcích se vedou jednotlivě.
- **Setup jamky před zápisem.** Herní pravidla mohou dodat obecný výběr, který
  musí být hotový před zadáním skóre; Levá-Pravá ho používá pro volbu levé a
  pravé strany.

## [0.27.0] – 2026-08-05

### Přidáno

- **Potvrzovat osobním PARem.** Nová volba v nastavení bodování hry (výchozí
  zapnutá): v kole s HCP se Longest a Nearest potvrzují parem jamky včetně
  ran, které na ní hráč dostává. Slabší hráč tak bonus uhraje bogeyem na
  jamce, kde má tečku. Vypnutím se vrátí potvrzování hrubým parem; hrubého
  kola se volba netýká.

### Opraveno

- **Extra body se v kole s HCP nenafukují.** Násobič podle výsledku se bral
  z netto skóre, takže hráč s tečkou na jamce dostal za bunker na par dva body
  místo jednoho a se dvěma tečkami tři. Nově rozhoduje hrubý výsledek –
  handicap mění, kdo jamku vyhrál, ne to, jak se zahrála.
- **Skins s HCP.** O skin se nově soutěží netto. Když všichni zahrají jamku na
  čtyři rány a jeden z nich na ní má tečku, skin bere on; dřív byla jamka
  dělená a skin se přenášel dál.
- **Match play s HCP.** Jamka se rozhoduje netto, u four-ballu včetně lepšího
  míče dvojice. Dřív se i v kole s HCP porovnávaly hrubé rány.
- **Značka Longestu ukazuje, co se opravdu započítá.** Barva `L` a `N` u jména
  při zápisu se v netto kole řídila hrubým parem, zatímco body se přidělovaly
  podle netto – značka tak mohla svítit červeně u bonusu, který dvojici
  zůstal.

Přepočet se týká i archivních kol hraných s HCP: jejich body se po aktualizaci
spočítají podle opravených pravidel.

## [0.26.0] – 2026-08-05

### Přidáno

- **Devítka z osmnáctijamkového hřiště.** U hřiště s 18 jamkami se v zadání
  kola vybírá, jestli se hraje celé kolo, první devítka (1–9), nebo druhá
  (10–18). Kolo si vezme pary a stroke indexy právě z vybraných jamek.
- **Číslování jamek podle hřiště.** Druhá devítka se čísluje 10–18 při zápisu
  skóre, ve scorekartě, ve výběru extra bodů, ve výpisu vyhraných jamek
  u Skins i v hlášce o chybějících zápisech. V archivu je u takového kola
  vidět rozsah, například „9 jamek (10–18)“.
- **Handicap na půlku kola.** Hrací handicap se u devítky počítá z poloviny
  normy odpaliště; ručně zadaný počet ran zůstává, jak ho hráč napsal.
- **Dvojnásobná závěrečná jamka** padne u první devítky na jamku 9 a u druhé
  na jamku 18, tedy vždy na poslední hranou.
- **Uvedení zdroje dat.** Výběr hřiště má v patičce větu o tom, že hřiště
  pocházejí z otevřeného katalogu Golf Games pod licencí ODbL, a odkaz na
  projekt, kde jdou opravit. U hřiště se zobrazuje jeho `attribution`, pokud
  ho má. ODbL vyžaduje uvést zdroj tam, kde se data používají – mít ho jen
  v README katalogu nestačilo.

### Odebráno

- `data/hriste.json`, `scripts/check-courses.mjs`, `npm run check:courses`
  a `docs/import-hrist.md`. Od osamostatnění katalogu to byla druhá kopie téže
  sady, kterou nic nedrželo v souladu – kontrola tvrdila výsledek o zastaralých
  datech. Zdrojem pravdy je katalog, ruční zadání hřiště zůstává pojistkou pro
  místa bez signálu.
- `contrib/` s balíkem pro OpenGolfAPI. Přispívat data zpět se nakonec
  nerozhodlo; balík byl navíc z doby před osamostatněním katalogu, takže by se
  stejně musel vygenerovat znovu.

## [0.25.1] – 2026-08-05

### Opraveno

- **HCP se ukládá pro všechny hry.** HCP indexy zadané při založení kola se
  ukládají do seznamu hráčů a znovu se předvyplní i u Match Play, Skins a Best
  Aggregate.
- **Archiv ukazuje režim HCP.** Přehled kol nově uvádí, zda se hrálo `s HCP`
  (netto), nebo `bez HCP` (hrubě).

## [0.25.0] – 2026-08-05

### Opraveno

- **Netto Best + Součet.** Při zapnutém HCP se pro `BEST`, `Součet`,
  `Double Best` i birdie/eagle body odečítají rány každého hráče podle jeho
  hracího handicapu a stroke indexu jamky.

## [0.24.0] – 2026-08-05

### Změněno

- **Kompaktní hlavička Match Play.** Stav se zobrazuje barevnými hodnotami
  `UP` a `DOWN`; třetí řádek ukazuje zbývající jamky, `dormie` nebo výsledek
  `3&1` místo dlouhé věty vedle čísla jamky.
- **Vyhrané jamky Match Play ve scorekartě.** Vítězné buňky se označují
  stejně jako vyhrané skiny; u four-ballu se zvýrazní oba hráči vítězné dvojice.
- **Netto Best + Součet.** Při zapnutém HCP se pro `BEST`, `Součet`, `Double
Best` i bonusové výsledky odečítají rány podle HCP hráčů a stroke indexu.
- **Barevné číslo jamky podle paru.** Par 3 je červený, par 4 zelený, par 5
  modrý a par 6 černý; u definovaného hřiště jsou parové volby zamčené.
- **Hlavička zápisu je stručnější.** Pod číslem jamky se už nezobrazuje
  celkový počet jamek kola.

## [0.23.0] – 2026-08-05

### Přidáno

- **Přepínač HCP teček ve scorekartě.** U každé netto hry lze vedle názvu
  scorekarty zvolit tečky podle plného HCP hřiště nebo podle rozdílu vůči
  nejlepšímu hráči.

### Změněno

- **Odpaliště jsou kompaktnější.** Zmenšila se jejich tlačítka a vzorníky,
  velikost textu zůstala stejná.

## [0.22.2] – 2026-08-05

### Změněno

- **Délka odpaliště ve výběru.** Pod názvem odpaliště se nově zobrazuje délka
  v metrech malým textem, pokud ji katalog nebo vlastní hřiště obsahuje.

## [0.22.1] – 2026-08-05

### Opraveno

- **Černá odpaliště jsou lépe viditelná.** Volba má kontrastní světlý rámeček
  a bílý obrys vzorníku, takže nezaniká na tmavém pozadí.

## [0.22.0] – 2026-08-05

### Přidáno

- **Řazení hřišť podle polohy.** Výběr hřiště se standardně řadí od
  nejbližšího; tlačítkem vedle hledání lze přepnout na skupiny a abecedu.
- **Oblíbená hřiště.** Hřiště lze označit srdíčkem, oblíbená se ve skupinovém
  řazení zobrazí před staženými kopiemi.
- **Filtr zemí.** Seznam hřišť lze omezit na jednu zemi.

## [0.21.0] – 2026-08-05

### Změněno

- **Návrat z výběru hřiště zachová pozici stránky na mobilu.** Úvodní
  nastavení se po návratu nevrátí na začátek.
- **Úprava katalogového hřiště vytváří soukromý klon.** Původní katalogová
  kopie zůstane zachovaná a další aktualizace katalogu ji mohou dál obnovovat.

## [0.20.0] – 2026-08-05

### Přidáno

- **Rozlišení hřišť v pickeru.** Katalogová nabídka, lokálně stažená kopie a
  vlastní soukromé hřiště mají odlišné barevné odznaky.
- **Automatická aktualizace katalogových kopií.** Při otevření výběru se
  uložené kopie porovnají s centrální scorekartou a novější verze se stáhnou.

## [0.19.0] – 2026-08-05

### Změněno

- **Nastavení nového kola přežije výběr hřiště.** Zadaní hráči, hra, počet
  hráčů, handicapy i další volby zůstanou zachované po návratu z podobrazovky.
- **Odpaliště jsou vidět najednou.** Každé odpaliště má vlastní barevné tlačítko
  a žluté se předvolí, pokud ho hřiště nabízí.

## [0.18.1] – 2026-08-05

### Opraveno

- **Zahození rozehraného kola se synchronizuje.** Potvrzené „Nové kolo“ už
  nesmaže jen místní kopii; cloudové kolo se odstraní a tombstone zabrání jeho
  návratu při refreshi nebo na jiném zařízení.

## [0.18.0] – 2026-08-05

### Přidáno

- **Stableford pro jednoho hráče.** Stableford lze nově založit i jako
  individuální kolo bez soupeřů.

### Změněno

- **Názvy odpališť respektují jazyk aplikace.** Standardní katalogová odpaliště
  se v češtině zobrazují česky a v angličtině anglicky; vlastní názvy zůstávají.

## [0.17.0] – 2026-08-05

### Opraveno

- **Obnovení přihlášeného kola po refreshi.** Synchronizace už nemůže mezitím
  přepsat právě stažené kolo starým stavem z prvního vykreslení aplikace.

### Přidáno

- **Scorekarta po otočení telefonu.** Při rozehraném kole se na dotykovém
  telefonu po otočení na šířku zobrazí živá scorekarta místo ovládání zápisu.
  Aktuální jamka se zvýrazní a po otočení zpět se vrátí běžný zápis bez změny
  skóre.
- **Stableford a HCP v seznamu hráčů.** Uložený HCP index se ve Stablefordu
  ukazuje vedle jména a po výběru hráče se předvyplní; platný nově zadaný index
  se uloží i pro nového hráče.
- **Stablefordové tečky ve scorekartě.** Netto scorekarta označuje rány k
  dobru proti nejnižšímu hracímu handicapu ve flightu, rozdělené podle stroke
  indexu jamky. Tečky jsou jen informační a nemění bodování.

## [0.16.1] – 2026-08-05

### Opraveno

- **Obnovení stránky u dohraného kola už neskočí zpátky do zapisování skóre.**
  Obrazovka se nikam neukládá a po refreshi se odvozuje ze stavu kola, jenže
  se odvozovala jen při návratu z podobrazovky, ne při startu – dohrané kolo
  tak skončilo na první jamce a vypadalo to jako rozjetá nová hra.

### Změněno

- Bez `VITE_COURSES_URL` se čte **publikovaný katalog projektu**, ne adresa na
  doméně aplikace. Fork tak má hřiště k dispozici bez jediného nastavení –
  stejné pravidlo jako u chybějící konfigurace Firebase. Proměnná zůstává pro
  případ, že má aplikace číst jiný katalog.
- GitHub akce na aktuální majory (`checkout` a `setup-node` v7,
  `upload-pages-artifact` a `deploy-pages` v5); ty předchozí cílily na Node 20.

## [0.16.0] – 2026-08-05

### Změněno

- **Katalog hřišť se odstěhoval do vlastního repozitáře**
  [`maciii/golfgames-courses`](https://github.com/maciii/golfgames-courses)
  a publikuje se z vlastních GitHub Pages. Aplikace na něj míří přes
  `VITE_COURSES_URL` a data už sama nestaví – oprava stroke indexu tím přestala
  být důvodem k nasazení aplikace.

### Odebráno

- `scripts/build-catalog.mjs` a krok v `prebuild`, které katalog generovaly do
  `public/courses/`. Byly dočasné, než katalog dostane vlastní adresu.
- `npm run catalog` – patří k odstraněnému skriptu.
- Složka `catalog/` s obsahem nového repozitáře; teď žije tam.

Bez `VITE_COURSES_URL` se výběr hřiště obejde bez serveru – hledá v hřištích
uložených v zařízení a ruční zadání funguje dál. [`data/hriste.json`](data/hriste.json)
v repozitáři zůstává jako sada k ručnímu importu ze zálohy.

## [0.15.0] – 2026-08-05

### Přidáno

- **Katalog hřišť.** Výběr hřiště hledá zároveň v tom, co je v telefonu,
  i v katalogu na serveru; klepnutím se scorekarta stáhne a uloží natrvalo.
  Import hřišť ze souboru tím přestal být potřeba.
- Katalog se **nestahuje při startu** – rejstřík (41 kB) se načte teprve při
  otevření výběru hřiště a není v předcache service workeru.
- Když katalog nejde načíst, výběr funguje dál nad hřišti v telefonu a řekne
  proč: zvlášť chybějící připojení, neodpovídající adresa a nesrozumitelný
  obsah.
- [`catalog/`](catalog/) – obsah samostatného repozitáře `golfgames-courses`
  (build, kontrola dat, workflow), popis je v [`docs/katalog.md`](docs/katalog.md).

### Změněno

- Adresu katalogu určuje `VITE_COURSES_URL`. Bez ní se čte z domény aplikace,
  kam se katalog generuje při buildu z `data/hriste.json` – přechod na
  samostatné Pages je pak jedna proměnná.

## [0.14.2] – 2026-08-05

### Přidáno

- **Výběr hřiště má vlastní obrazovku s hledáním.** Vyhledává se podle názvu,
  klubu i země a nezáleží na diakritice – „karlstejn" najde Karlštejn.
  Rozbalovací nabídka přestala stačit ve chvíli, kdy si šlo naimportovat
  tři stovky hřišť.
- `data/hriste.json` – sada 307 hřišť (107 českých, 21 slovenských) k importu
  přes _Záloha dat → Obnovit ze zálohy_, viz [`data/README.md`](data/README.md).
- `npm run check:courses` – kontrola sady hřišť; odděluje chyby, které by
  rozbily výpočty, od podezření k ověření.

## [0.14.1] – 2026-08-04

### Opraveno

- **Course Rating nešel zadat jako desetinné číslo.** Pole se řídilo přímo
  číslem z modelu, takže se rozepsaná hodnota „71." hned převedla na 71
  a tečka zmizela dřív, než šlo dopsat desetinnou část. Normy odpališť se
  teď drží jako text a do modelu jde rozparsovaná hodnota; funguje desetinná
  tečka i čárka.

### Přidáno

- [`docs/import-hrist.md`](docs/import-hrist.md) – návod a vzor pro hromadné
  nahrání vlastní databáze hřišť souborem ve formátu zálohy.

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
  taková jamka přeskakovala. Nově dvojice v Best + Součet přichází o součet
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

- **Best + Součet se počítá bodově, ne na rány.** Dvojice získává 1 bod za
  lepší míč, 1 bod za nižší součet, 1 bod za birdie a 3 body za eagle;
  vyhrává nejvyšší počet bodů. Původní vyhodnocení podle součtu ran bylo
  chybné.
- Best + Součet je nově vždy pro 4 hráče (dřív šlo hrát i ve dvou).
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
