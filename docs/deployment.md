# Nasazení

Aplikace se buildí Vitem do `dist/` a publikuje na GitHub Pages přes GitHub
Actions. Hosting je zdarma, což je základní podmínka projektu.

## Jak to běží

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) na **každém
pushi** zkontroluje typy, pustí testy a kontrolu formátování a postaví
aplikaci. Z větve `main` navíc nahraje `dist/` jako Pages artefakt a nasadí ho.

```
push ──▶ typecheck ──▶ test ──▶ format:check ──▶ build ──┬─(main)─▶ deploy
                                                          └─(jiná větev)─▶ konec
```

Souběžné deploye jsou omezené `concurrency: pages`, aby si nepřepisovaly
výsledek.

## Nastavení repozitáře (jednorázově)

1. **Settings → Pages → Source: _GitHub Actions_.**
   Tohle je kritické. Při volbě _Deploy from a branch_ servíruje GitHub obsah
   kořene repozitáře přes Jekyll – tedy vývojové `index.html`, které načítá
   `/src/main.tsx`. Ten v produkci neexistuje a aplikace se zobrazí jako
   **prázdná stránka**.
2. **Settings → Pages → Custom domain: `golf.kubecka.cz`**, potvrdit
   a zaškrtnout **Enforce HTTPS** (certifikát se vystaví během pár minut až
   hodiny).
3. Větev `main` musí být povolená pro prostředí `github-pages`
   (Settings → Environments → github-pages → Deployment branches). Když není,
   deploy skončí hláškou `Branch "main" is not allowed to deploy to
github-pages due to environment protection rules`.

## Konfigurace Firebase při buildu

Synchronizace potřebuje čtyři proměnné prostředí. Build je bere ze **Secrets
i z Variables** (`${{ secrets.X || vars.X }}`), protože webová konfigurace
Firebase je veřejná z principu – zabezpečení stojí na `firestore.rules`, ne na
utajení klíče. Je proto jedno, kam si je uložíš.

| Proměnná                    |
| --------------------------- |
| `VITE_FIREBASE_API_KEY`     |
| `VITE_FIREBASE_AUTH_DOMAIN` |
| `VITE_FIREBASE_PROJECT_ID`  |
| `VITE_FIREBASE_APP_ID`      |

**Musí být na úrovni repozitáře** – Settings → Secrets and variables →
Actions, záložka _Secrets_ nebo _Variables_. Uložené v konkrétním
**Environment** je build job neuvidí, protože žádné prostředí nepoužívá.
Tohle je nejčastější chyba a projeví se tiše: aplikace se postaví a funguje,
jen v ní chybí přihlášení.

Poznat to jde bez hádání. Krok **Kontrola konfigurace Firebase** vypíše u každé
proměnné `vyplněno, N znaků`, nebo `CHYBÍ` (hodnoty se do logu nikdy netisknou,
jen délka). Totéž hlásí i obrazovka Účet přímo v aplikaci, když konfigurace
chybí.

Bez proměnných je build plně funkční, jen bez sekce s účtem – fork se tak dá
postavit bez jediného tajemství.

Lokálně se hodnoty berou z `.env.local` (vzor je v
[`.env.example`](../.env.example), `.env.local` je v `.gitignore`).

Zbytek nastavení Firebase – projekt, poskytovatel Google, autorizované domény,
databáze a pravidla – popisuje [`sync.md`](sync.md).

## DNS

U poskytovatele domény `kubecka.cz`:

| Typ     | Název  | Hodnota             |
| ------- | ------ | ------------------- |
| `CNAME` | `golf` | `maciii.github.io.` |

Soubor [`public/CNAME`](../public/CNAME) s obsahem `golf.kubecka.cz` se kopíruje
do `dist/` při každém buildu, takže se nastavení domény nesmaže při dalším
nasazení.

Ověření:

```bash
dig +short golf.kubecka.cz
curl -sI https://golf.kubecka.cz | head -1
```

## Base path

`vite.config.ts` bere base z proměnné prostředí:

```ts
const base = process.env.BASE_PATH ?? '/'
```

- **Vlastní doména** (současný stav): `/` – nic se nenastavuje.
- **Bez vlastní domény**, tedy `maciii.github.io/golfgames/`:
  ```bash
  BASE_PATH=/golfgames/ npm run build
  ```
- **Jiný hosting z kořene** (Cloudflare Pages, Netlify): `/`, funguje rovnou.

Base se propisuje i do PWA manifestu (`start_url`, `scope`) a do
`navigateFallback` service workeru, takže špatná hodnota se projeví hlavně
u aplikace přidané na plochu.

## Přidání na plochu

Na úvodní obrazovce je tlačítko **Přidat Fairsome na plochu**. Aplikace ho
zobrazuje jen mimo standalone režim a na mobilním profilu nebo v prohlížeči,
který podporuje instalaci PWA.

- **Android a podporované prohlížeče:** tlačítko otevře nativní instalační
  dialog přes `beforeinstallprompt`.
- **iPhone/iPad:** Safari nedovolí webu instalaci spustit programově, takže
  tlačítko zobrazí návod **Sdílet → Přidat na plochu**.
- Po instalaci nebo spuštění z ikony na ploše se nabídka skryje. Instalace
  otevře aplikaci bez adresního řádku a zachová její offline provoz.

## Aktualizace u uživatele

Service worker běží v režimu `autoUpdate`: po nasazení si aplikace stáhne novou
verzi na pozadí a použije ji při dalším spuštění. Ověřit, co má telefon
nainstalované, jde podle **čísla verze v patičce** aplikace.

Když se změna nepropíše, obvykle pomůže aplikaci zavřít a znovu spustit
(z plochy, ne jen přepnout). Tvrdý reset je smazat web z plochy a přidat ho
znovu – **pozor, `localStorage` s archivem přitom může zůstat, ale nemusí**,
takže to není krok pro půlku kola.

## Časté problémy

| Projev                                          | Příčina                                                       |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Prázdná bílá stránka                            | Pages servírují kořen repozitáře místo artefaktu (viz krok 1) |
| „Aplikaci se nepodařilo načíst"                 | skript se nenačetl – špatný `base`, nebo blokované soubory    |
| 404 na assety, aplikace bez stylů               | `base` neodpovídá adrese, na které to běží                    |
| Deploy skončí na `environment protection rules` | větev `main` není povolená pro prostředí `github-pages`       |
| Doména hlásí certifikát pro `github.io`         | Enforce HTTPS ještě nedoběhlo, případně chybí `public/CNAME`  |
| V aplikaci chybí přihlášení                     | proměnné `VITE_FIREBASE_*` nedorazily do buildu (viz výš)     |

Hláška „Aplikaci se nepodařilo načíst" je záměrná pojistka v
[`index.html`](../index.html): kdyby se hlavní skript nenačetl, uživatel uvidí
vysvětlení místo prázdné obrazovky. Je dvojjazyčná natvrdo – běží dřív, než se
načte aplikace, takže v ní zvolený jazyk ještě není k dispozici.

## Lokální ověření produkčního buildu

```bash
npm run build     # zvedne patch verzi, zkontroluje typy, postaví dist/
npm run preview   # naservíruje dist/ jako produkci
```

Když se buildí jen na ověření a nemá se zvedat verze, jde prebuild obejít:

```bash
npx vite build
```
