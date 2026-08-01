# Změny

Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování ze [sémantického verzování](https://semver.org/lang/cs/).

Patch verzi zvedá `scripts/bump-version.mjs` automaticky při každém lokálním
buildu, takže čísla patch verzí mezi záznamy nejsou souvislá. Zapisují se sem
jen verze s věcnou změnou.

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
