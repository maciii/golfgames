# Fairsome

Zápis golfového skóre po jamkách pro 1–4 hráče podle zvolené hry a vyhodnocení různých typů
golfových her – včetně extra bodů a peněžního vyrovnání sázky.

Aplikace je **PWA** – běží v prohlížeči, na iPhonu i Androidu se přidá na
plochu a chová se jako běžná aplikace. Funguje offline a bez účtu; data
zůstávají v telefonu, dokud se sám nepřihlásíš kvůli záloze do cloudu.

**Živá verze:** https://golf.kubecka.cz

## Hry

| Hra                           | Hráči                             | Princip                                         |
| ----------------------------- | --------------------------------- | ----------------------------------------------- |
| **Best + Součet**             | 4 (dvě dvojice)                   | Body za lepší míč, nižší součet, birdie a eagle |
| **Levá-Pravá (Kraje-Středy)** | 4 (dynamické dvojice)             | Best + Součet, nové dvojice na každé jamce      |
| **Skins**                     | 2–4 jednotlivci                   | Skiny a extra body pro každého hráče            |
| **Match play**                | 2 jednotlivci, nebo 4 v dvojicích | Zápas na jamky, ne na rány                      |
| **Stableford**                | 1–4 jednotlivci                   | Body za jamku, hrubě i netto s handicapem       |
| **Dots (Nine/Six Dot)**       | 3 jednotlivci                     | Body za pořadí na jamce                         |

Přesné vyhodnocení včetně okrajových situací popisuje
[`docs/games.md`](docs/games.md).

## Co aplikace umí

- **Zápis po jamkách** na jedno klepnutí – prostřední tlačítko vloží par,
  `+` bogey, `−` birdie, další klepnutí posouvají po ránách; par 3/4/5 se
  nastavuje u každé jamky přímo při hře
- **Extra body** – dvojnásobná sázka, longest, nearest, bunker, double bunker,
  water, barkie, arnie. Volby se nastavují zvlášť pro každou hru; týmové hry
  připisují bonus celé dvojici, Skins hráči, který ho uhrál
- **Levá-Pravá (Kraje-Středy)** – před každou jamkou se jedním klepnutím vybere
  jedna ze tří kombinací dvojic. Dvojice lze kdykoli změnit a skóre se podle
  nového složení okamžitě přepočítá; scorekarta označí skóre i body vybrané
  dvojice společným žlutým rámečkem
- **Skins s potvrzením parem** – volitelná varianta vyžaduje, aby vítěz jamky
  zahrál na další jamce alespoň par; čekající výhra se zobrazí jako „Rezervuje:
  hráč“ a při bogey se vrátí do banku
- **Volitelné potvrzení Longestu a Nearestu** – každý bonus má vlastní
  přepínač. Když je potvrzení zapnuté, v týmových hrách při horším výsledku
  bod propadá soupeřům a ve Skins se bonus nezapočítá; v kole s HCP se
  potvrzení Longestu řídí osobním parem a Nearest hrubým parem. Po vypnutí se
  bonus přizná bez podmínky potvrzení.
- **Průběžné výsledky** – pořadí se počítá i uprostřed kola
- **Průběžné skóre v hlavičce** – každá hra ukazuje svůj stav u aktuální jamky;
  Match play navíc hlásí náskok, dormie, zbývající jamky a jamky mimo hru po
  rozhodnutí zápasu
- **Barevné značky výsledků** v šesti stupních od eagle po Triple, ve
  scorekartě i při zápisu; scorekarta má u týmových her sloupec bodů dvojice
  za každou jamku a Skins označuje vítězný skin žlutým rámečkem celé buňky
  přímo u hráčova výsledku
- **Sázka a peněžní vyrovnání** – hodnota bodu v Kč nebo €, volitelně
  dvojnásobná 9. a 18. jamka; na konci je vidět **Celková výhra**, konkrétní
  platby mezi hráči a volitelně jejich optimalizovaná varianta s méně převody
- **Vzdané jamky se počítají** – chybějící zápis na rozehrané jamce znamená,
  že ji hráč nedohrál, a jeho strana o ni přichází
- **Kolo přerušené počasím** jde uložit i nedohrané; aplikace předtím vypíše,
  které jamky chybí
- **Archiv odehraných kol** – dohraná kola se ukládají i s nastavením, se
  kterým se hrála, takže historické výsledky sedí i po změně předvoleb
- **Záloha dat do souboru** – celý obsah aplikace se stáhne jako jeden JSON
  a jde ho načíst zpátky; obnova umí zálohu buď sloučit se současnými daty,
  nebo jimi vše nahradit
- **Nepovinná záloha do cloudu** – po přihlášení účtem Google se kola průběžně
  zálohují a jsou dostupná z dalších zařízení. Bez přihlášení se nemění vůbec
  nic: aplikace nenaváže spojení a všechno zůstává v telefonu
- **Hřiště a handicapy** – kolo začíná výběrem hřiště, ať je z čeho počítat.
  Hřiště se dá vzít z katalogu nebo zadat ručně i s pary jamek, stroke indexem
  a odpališti (CR a SR) a zůstane v telefonu. Kolo pak jde hrát netto: rány se
  rozdělí podle obtížnosti jamek, hrací handicap se dopočítá z indexu podle
  WHS, nebo se zadá rovnou v ranách
- **Vlastní odpaliště pro každého hráče** – muž ze žlutých, žena z červených.
  Klepnutí na barevný štítek u jména otevře výběr s délkou, normou a hlavně
  s tím, kolik ran z daného odpaliště hráč dostane. Rozdíl je velký: index
  30,1 znamená 28 ran z červených, ale 35 ze žlutých
- **Osmnáctka ze dvou devítek** – devítijamkové hřiště jde zahrát dvakrát
  dokola nebo spojit s jinou devítkou; pary, stroke indexy i norma se složí
- **Seznam hráčů** – spoluhráči se ukládají sami, při dalším kole se jen
  vyberou klepnutím; pamatuje se i jejich handicapový index a odpaliště
- **Offline provoz** – service worker předcachuje celou aplikaci, signál
  není potřeba
- **Česky i anglicky** – jazyk se vybere podle prohlížeče a přepíná se
  vlajkami v pravém horním rohu; datum, částky i řazení jmen se řídí volbou
- **Rozehrané kolo přežije** zavření aplikace i restart telefonu

## Instalace do telefonu

**iPhone**

1. Otevřít adresu aplikace v **Safari** (jiné prohlížeče na iOS instalaci na
   plochu nenabízejí).
2. Na úvodní obrazovce klepnout na **Přidat Fairsome na plochu**.
3. V návodu aplikace klepnout na _Sdílet_ → **Přidat na plochu**.
4. Spouštět z ikony – aplikace běží na celou obrazovku bez adresního řádku.

**Android**

1. Otevřít adresu v **Chrome**.
2. Na úvodní obrazovce klepnout na **Přidat Fairsome na plochu**.
3. Potvrdit nativní nabídku instalace. Když se nezobrazí, otevřít nabídku ⋮ a
   zvolit **Instalovat aplikaci** nebo **Přidat na plochu**.
4. Aplikace se nainstaluje jako WebAPK s názvem **Fairsome** a vlastní ikonou.

Tlačítko se v nainstalované aplikaci nezobrazuje náhodou – instalace přidá ikonu
na plochu, otevře aplikaci bez adresního řádku a zachová offline provoz.

## Proč PWA

Distribuce nativní iOS aplikace vyžaduje Apple Developer Program za
99 USD/rok. PWA to obchází a navíc dává věci, které se na hřišti hodí:
funguje bez signálu, sdílí se odkazem bez instalace u spoluhráčů a oprava je
online během pár minut bez App Store review.

## Vývoj

```bash
npm install
npm run dev      # vývojový server
npm run test     # testy pravidel her
npm run check    # typy + testy + formát (co běží v CI)
npm run build    # zvedne verzi, zkontroluje typy a postaví dist/
```

Vyžaduje Node 22 (viz `.nvmrc`).

Aplikace se rozjede i bez jakéhokoli nastavení – jen bez sekce s účtem.
Pro vývoj synchronizace zkopíruj `.env.example` do `.env.local` a doplň údaje
z konzole Firebase (postup v [`docs/sync.md`](docs/sync.md)).

## Dokumentace

| Dokument                                       | Obsah                                                   |
| ---------------------------------------------- | ------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | jak je aplikace poskládaná, datový model, rozhraní hry  |
| [`docs/games.md`](docs/games.md)               | pravidla her, extra body, peněžní vyrovnání             |
| [`docs/decisions.md`](docs/decisions.md)       | proč je to takhle – rozhodnutí a jejich důvody          |
| [`docs/deployment.md`](docs/deployment.md)     | nasazení, vlastní doména, časté problémy                |
| [`docs/sync.md`](docs/sync.md)                 | účet, synchronizace a nastavení Firebase                |
| [`docs/katalog.md`](docs/katalog.md)           | katalog hřišť, jeho adresa a chování v aplikaci         |
| [`docs/plan.md`](docs/plan.md)                 | co zbývá udělat a rozhodnutí, na kterých to stojí       |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | příkazy, struktura projektu, konvence                   |
| [`AGENTS.md`](AGENTS.md)                       | pokyny pro AI asistenty a rychlý úvod pro nové vývojáře |
| [`CHANGELOG.md`](CHANGELOG.md)                 | historie změn                                           |

## Nasazení

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
při každém pushi zkontroluje typy, pustí testy a postaví aplikaci; z větve
`main` ji publikuje na GitHub Pages na doménu `golf.kubecka.cz`.

Podrobnosti včetně nastavení DNS a řešení prázdné stránky jsou
v [`docs/deployment.md`](docs/deployment.md).

## Licence

[MIT](LICENSE)
