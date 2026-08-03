# Golf Games

Zápis golfového skóre po jamkách pro 2–4 hráče a vyhodnocení různých typů
golfových her – včetně extra bodů a peněžního vyrovnání sázky.

Aplikace je **PWA** – běží v prohlížeči, na iPhonu i Androidu se přidá na
plochu a chová se jako běžná aplikace. Funguje offline a bez účtu; data
zůstávají v telefonu, dokud se sám nepřihlásíš kvůli záloze do cloudu.

**Živá verze:** https://golf.kubecka.cz

## Hry

| Hra                | Hráči              | Princip                                         |
| ------------------ | ------------------ | ----------------------------------------------- |
| **Best Aggregate** | 4 (dvě dvojice)    | Body za lepší míč, nižší součet, birdie a eagle |
| **Skins**          | 2–4 jednotlivci    | Každá jamka je skin, shoda ho přenáší do další  |
| **Match play**     | 2 nebo 4 (dvojice) | Zápas na jamky, ne na rány                      |

Přesné vyhodnocení včetně okrajových situací popisuje
[`docs/games.md`](docs/games.md).

## Co aplikace umí

- **Zápis po jamkách** na jedno klepnutí – prostřední tlačítko vloží par,
  `+` bogey, `−` birdie, další klepnutí posouvají po ránách; par 3/4/5 se
  nastavuje u každé jamky přímo při hře
- **Extra body** – double, longest, nearest, bunker, double bunker, water,
  barkie, arnie. Hodnoty se nastavují zvlášť pro každou hru, lepší výsledek
  je násobí (birdie ×2, eagle ×3…) a bonus vždy získává celá dvojice
- **Longest a Nearest s potvrzením** – kdo je zapsal, musí jamku dohrát na par
  nebo líp, jinak bod propadá soupeřům; barva značky u jména to hlásí průběžně
- **Průběžné výsledky** – pořadí se počítá i uprostřed kola
- **Barevné značky výsledků** v šesti stupních od eagle po trojbogey, ve
  scorekartě i při zápisu; scorekarta má u týmových her sloupec bodů dvojice
  za každou jamku
- **Sázka a peněžní vyrovnání** – hodnota bodu v Kč nebo €, volitelně
  dvojnásobná 9. a 18. jamka; na konci je vidět, kdo komu kolik platí –
  u dvojic po hráčích, každý svému protějšku
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
- **Seznam hráčů** – spoluhráči se ukládají sami, při dalším kole se jen
  vyberou klepnutím
- **Offline provoz** – service worker předcachuje celou aplikaci, signál
  není potřeba
- **Rozehrané kolo přežije** zavření aplikace i restart telefonu

## Instalace do telefonu

**iPhone**

1. Otevřít adresu aplikace v **Safari** (jiné prohlížeče na iOS instalaci na
   plochu nenabízejí).
2. Tlačítko _Sdílet_ → **Přidat na plochu**.
3. Spouštět z ikony – aplikace běží na celou obrazovku bez adresního řádku.

**Android**

1. Otevřít adresu v **Chrome**.
2. Přijmout nabídku _Nainstalovat aplikaci_, nebo v nabídce ⋮ zvolit
   **Přidat na plochu**.
3. Aplikace se nainstaluje jako WebAPK s vlastní ikonou v seznamu aplikací.

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

## Dokumentace

| Dokument                                       | Obsah                                                   |
| ---------------------------------------------- | ------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | jak je aplikace poskládaná, datový model, rozhraní hry  |
| [`docs/games.md`](docs/games.md)               | pravidla her, extra body, peněžní vyrovnání             |
| [`docs/decisions.md`](docs/decisions.md)       | proč je to takhle – rozhodnutí a jejich důvody          |
| [`docs/deployment.md`](docs/deployment.md)     | nasazení, vlastní doména, časté problémy                |
| [`docs/sync.md`](docs/sync.md)                 | účet, synchronizace a nastavení Firebase                |
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
