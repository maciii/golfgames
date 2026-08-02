# Golf Games

Zápis golfového skóre po jamkách pro 2–4 hráče a vyhodnocení různých typů
golfových her.

Aplikace je **PWA** – běží v prohlížeči, na iPhonu se přes Safari přidá na
plochu a chová se jako běžná aplikace. Funguje offline, žádný účet, žádný
server: veškerá data zůstávají v telefonu.

**Živá verze:** https://maciii.github.io/golfgames/

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
- **Průběžné výsledky** – pořadí se počítá i uprostřed kola
- **Scorecard** se značkami podle golfové konvence – birdie v kroužku, bogey
  ve čtverečku – a u týmových her se sloupcem bodů dvojice za každou jamku
- **Sázka a peněžní vyrovnání** – hodnota bodu v Kč nebo €, volitelně
  dvojnásobná 9. a 18. jamka; na konci je vidět, kdo komu kolik platí –
  u dvojic po hráčích, každý svému protějšku
- **Vzdané jamky se počítají** – chybějící zápis na rozehrané jamce znamená,
  že ji hráč nedohrál, a jeho strana o ni přichází
- **Kolo přerušené počasím** jde uložit i nedohrané; aplikace předtím vypíše,
  které jamky chybí
- **Archiv odehraných kol** – dohraná kola se ukládají a jde se k nim vracet
- **Seznam hráčů** – spoluhráči se ukládají sami, při dalším kole se jen
  vyberou klepnutím
- **Offline provoz** – service worker předcachuje celou aplikaci, signál
  není potřeba
- **Rozehrané kolo přežije** zavření aplikace i restart telefonu

## Instalace na iPhone

1. Otevřít adresu aplikace v **Safari** (jiné prohlížeče na iOS instalaci na
   plochu nenabízejí).
2. Tlačítko _Sdílet_ → **Přidat na plochu**.
3. Spouštět z ikony – aplikace běží na celou obrazovku bez adresního řádku.

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
npm run build    # zvedne verzi, zkontroluje typy a postaví dist/
```

Podrobnosti, strukturu projektu a konvence popisuje
[`CONTRIBUTING.md`](CONTRIBUTING.md). Historie změn je
v [`CHANGELOG.md`](CHANGELOG.md).

## Nasazení

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
při každém pushi zkontroluje typy, pustí testy a postaví aplikaci; z větve
`main` ji publikuje na GitHub Pages.

> **Nastavení Pages:** v repozitáři musí být _Settings → Pages → Source:_
> **GitHub Actions**. Při volbě _Deploy from a branch_ servíruje GitHub
> vývojovou šablonu z kořene repozitáře a aplikace se zobrazí jako prázdná
> stránka.

Pro hosting z kořene domény (Cloudflare Pages, Netlify) se buildí
s `BASE_PATH=/`:

```bash
BASE_PATH=/ npm run build
```

## Licence

[MIT](LICENSE)
