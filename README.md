# Golf Games

Zápis golfového skóre po jamkách pro 2–4 hráče a vyhodnocení různých typů her.

## Hry

**Best Aggregate** – hraje se ve dvojicích. Na každé jamce se zapisují rány
obou partnerů a počítají se dva výsledky: **lepší míč** (nižší z obou ran) a
**součet obou**. Obojí se sčítá přes celé kolo a vede se jako dvě samostatné
tabulky. Počítá se hrubé skóre, handicap se zatím neuplatňuje.

Při čtyřech hráčích se vybírá, kdo hraje s kým; dva hráči tvoří jednu dvojici
bez soupeře.

Aplikace je **PWA** – běží v prohlížeči, na iPhonu se přes Safari přidá na
plochu a chová se jako běžná aplikace. Funguje offline, žádný účet, žádný
server: veškerá data zůstávají v telefonu.

## Proč PWA

Distribuce nativní iOS aplikace vyžaduje Apple Developer Program za 99 USD/rok.
PWA to obchází a navíc dává věci, které se na hřišti hodí:

- **Offline** – service worker předcachuje celou appku, signál není potřeba.
- **Rozehrané kolo přežije** zavření appky i restart telefonu (`localStorage`).
- **Sdílení odkazem** – spoluhráči si nic neinstalují.
- **Nasazení pushem** – oprava je online za pár minut, žádná App Store review.

## Instalace na iPhone

1. Otevřít adresu aplikace v **Safari** (jiné prohlížeče na iOS instalaci na
   plochu nenabízejí).
2. Tlačítko *Sdílet* → **Přidat na plochu**.
3. Spouštět z ikony – appka běží na celou obrazovku bez adresního řádku.

## Vývoj

```bash
npm install
npm run dev        # vývojový server
npm run build      # typecheck + produkční build do dist/
npm run preview    # náhled produkčního buildu
npm run icons      # přegenerování PWA ikon do public/
```

## Nasazení

Workflow `.github/workflows/deploy.yml` staví aplikaci při každém pushi
a z větve `main` ji publikuje na GitHub Pages.

Jednorázově je potřeba v repozitáři nastavit **Settings → Pages → Source:
GitHub Actions**. Pro hosting z kořene domény (Cloudflare Pages, Netlify)
se buildí s `BASE_PATH=/`:

```bash
BASE_PATH=/ npm run build
```

## Struktura

```
src/
  types.ts            datový model kola (hráči, týmy, skóre) + výpočty
  storage.ts          perzistence v localStorage
  games/              pravidla jednotlivých her
    types.ts          rozhraní GameDefinition + řazení pořadí
    bestAggregate.ts  Best Aggregate
    index.ts          registr her
  screens/
    SetupScreen.tsx   volba hry, hráčů, dvojic a počtu jamek
    PlayScreen.tsx    zápis skóre po jamkách
    ResultsScreen.tsx pořadí + scorecard
scripts/gen-icons.mjs generátor PWA ikon (bez závislostí)
```

### Přidání další hry

1. Nový soubor v `src/games/` implementující `GameDefinition`.
2. Zaregistrovat ho v `src/games/index.ts`.

Zbytek aplikace – zápis skóre, ukládání i výsledková tabulka – je společný
pro všechny hry.
