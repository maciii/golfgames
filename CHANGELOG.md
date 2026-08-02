# Změny

Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování ze [sémantického verzování](https://semver.org/lang/cs/).

Patch verzi zvedá `scripts/bump-version.mjs` automaticky při každém lokálním
buildu, takže čísla patch verzí mezi záznamy nejsou souvislá. Zapisují se sem
jen verze s věcnou změnou.

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
