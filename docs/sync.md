# Účet a synchronizace

Jak funguje nepovinná záloha dat do cloudu přes účet Google. Rozhodnutí, proč
zrovna takhle, jsou v [`decisions.md`](decisions.md).

## Základní pravidlo

**`localStorage` zůstává zdrojem pravdy, cloud je zrcadlo.** Zápis skóre jde
vždycky nejdřív do zařízení a teprve pak se odešle. Výpadek sítě ani chyba
cloudu proto nemůže rozbít probíhající kolo a hra je stejně rychlá jako dřív.

**Bez přihlášení se nemění vůbec nic.** Aplikace nenaváže spojení, nestáhne
Firebase SDK a chová se jako čistě místní. Ověřuje se to i v prohlížeči –
u nepřihlášeného hráče neproletí za celé kolo jediný požadavek na Firebase.

## Co se ukládá

```
users/{uid}/rounds/{roundId}   celé kolo jako JSON
users/{uid}/prefs/app          hráči, sázka a volby bodování
```

Jedno kolo = jeden dokument. `Round` je serializovatelný do JSON, takže se
ukládá tak, jak je, bez mapování na tabulky.

Rozehrané kolo není nic zvláštního – je to obyčejné kolo bez `finishedAt`.
Na novém zařízení se pozná právě podle toho (`pickCurrentRound()`).

## Slučování a konflikty

Kola se párují podle `id` a rozhoduje `updatedAt`: **vyhrává novější zápis**.
Při shodě časů zůstává místní verze. Nic se nikdy nezahazuje – výsledek je
vždy sjednocení obou stran.

`Round.updatedAt` zvedá `touchRound()` jen při **skutečné změně dat** (skóre,
extra body, par, ukončení kola). Listování jamkami ho záměrně nezvedá: jinak
by zařízení, na kterém se jen kouká, přebilo zápis z toho, kde se hraje.

Kola z verzí před zavedením synchronizace `updatedAt` nemají; `normalizeRound()`
jim ho doplní z data ukončení (u nedohraných ze založení).

Slučovací logika je v [`src/sync/merge.ts`](../src/sync/merge.ts) jako čisté
funkce bez jediného odkazu na Firebase, takže ji pokrývají běžné testy.

## Kdy se zapisuje

| Událost                | Co se stane                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| Přihlášení             | stáhnou se všechna vzdálená kola, sloučí s místními, rozdíl se nahraje |
| Start aplikace s účtem | totéž, aby se zachytily změny z jiného zařízení                        |
| Změna zápisu           | kolo se zařadí do fronty a odešle **s odkladem 10 s**                  |
| Odchod z aplikace      | fronta se odešle hned (`visibilitychange`)                             |
| Návrat signálu         | fronta se odešle (`online`)                                            |

Odklad je důležitý kvůli kvótám: bez něj by osmnáctijamkové kolo znamenalo
osmnáct zápisů, s ním vyjde na jednotky. Denní limit bezplatného plánu je tak
mimo dosah i při velkém počtu hráčů.

Neodeslané změny čekají v `golfgames.syncQueue.v1`, takže přežijí i zavření
aplikace bez signálu.

## Zabezpečení

Pravidla v [`firestore.rules`](../firestore.rules) říkají jedinou věc: ke svým
datům se dostane výhradně přihlášený vlastník. Neexistuje dotaz, kterým by šlo
projít databázi napříč uživateli.

Pravidla je potřeba **nasadit ručně** – Firebase Console → Firestore Database →
Rules → vložit obsah souboru a publikovat.

## Nastavení projektu

1. Projekt ve Firebase na plánu **Spark** (bez platební karty – při vyčerpání
   kvóty operace selžou, faktura nepřijde nikdy).
2. Authentication → Sign-in method → **Google**.
3. Authentication → Settings → Authorized domains → `golf.kubecka.cz`.
4. Konfigurace do GitHub jako `VITE_FIREBASE_API_KEY`,
   `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
   a `VITE_FIREBASE_APP_ID`; workflow je předá buildu (viz `.env.example`).

   **Kam přesně:** Settings → Secrets and variables → **Actions** → záložka
   _Secrets_ nebo _Variables_. Workflow čte obě, takže je jedno která.
   Musí to být **na úrovni repozitáře**, ne uvnitř konkrétního _Environment_ -
   environmentové hodnoty vidí jen job, který ten environment deklaruje, a to
   build job nedělá.

   Jestli hodnoty dorazily, se pozná z logu nasazení: krok **Kontrola
   konfigurace Firebase** vypíše u každé položky „vyplněno" nebo „CHYBÍ"
   (hodnoty se netisknou, jen délka).

Údaje nejsou tajné – u Firebase jsou veřejné z principu a zabezpečení stojí na
pravidlech, ne na utajení klíče. V repozitáři nejsou proto, aby šlo projekt
přesměrovat jinam bez zásahu do kódu.

**Blaze se nikdy nezapíná.** Bezplatný plán je pojistka proti tomu, aby projekt
mohl začít stát peníze.

## Název aplikace na přihlašovací obrazovce Google

Text „Přihlášení do aplikace …" nepochází z kódu, ale z **OAuth consent
screen** v Google Cloud Console. Firebase tam při založení projektu dosadí
doménu `<projekt>.firebaseapp.com`, což vypadá cize.

Změna: Google Cloud Console → projekt Firebase → _APIs & Services_ →
_OAuth consent screen_ (novější rozhraní: _Branding_) → **App name**.
Vyplnit i _Application home page_ (`https://golf.kubecka.cz`) a _Privacy
policy link_ (`https://golf.kubecka.cz/soukromi.html`).

Změna názvu u nesensitivních scopů (a `openid email profile` mezi ně patří)
nevyžaduje ověření aplikace. **Nahrání loga ale ověření spustí**, takže logo
nechávej prázdné, dokud ověřením projít nechceš.

Doménu `golfgames-…firebaseapp.com` v adresním řádku přihlašovacího okna by
odstranila až **vlastní auth doména**, která vyžaduje servírovat cestu
`/__/auth/handler` z `golf.kubecka.cz`. To umí Firebase Hosting, ne GitHub
Pages – znamenalo by to přestěhovat hosting.

## Přihlášení na iOS a Androidu

Výchozí je **vyskakovací okno** – funguje na Androidu i v prohlížeči na
počítači. Když ho prohlížeč zablokuje (typicky iOS v režimu „přidáno na
plochu"), aplikace přepne na **přesměrování**.

Přesměrování prochází doménou `*.firebaseapp.com`, takže ho může trápit
blokování cookies třetích stran. Proto je jen záložní cestou a ne výchozí.

## Velikost stahovaných dat

Firebase SDK se načítá dynamickým importem a má vlastní chunk, který je
**vynechaný z předcachování** service workerem (`globIgnores` ve
`vite.config.ts`). Nepřihlášený uživatel ho tedy nestáhne ani přes offline
cache – přihlášenému se načte ze sítě, což stejně jde jen online.

Předcachovaná velikost aplikace tím zůstává na ~324 kB, prakticky stejně jako
před zavedením synchronizace.

## Časté problémy

| Projev                            | Příčina                                                                     |
| --------------------------------- | --------------------------------------------------------------------------- |
| Sekce účtu se vůbec nezobrazí     | build nemá konfiguraci Firebase (chybí tajemství)                           |
| „Synchronizace se nepovedla"      | většinou nenasazená pravidla nebo chybějící doména v Authorized domains     |
| Přihlášení se otevře a hned zavře | vyskakovací okno zablokované; aplikace zkusí přesměrování                   |
| Data z druhého zařízení nenaskočí | synchronizace běží při startu a po přihlášení – pomůže „Synchronizovat teď" |

## Smazání účtu

Tlačítko na obrazovce Účet smaže **všechna data v cloudu i samotný účet**.
Kola v zařízení zůstávají – smazání účtu neznamená, že hráč přijde o to, co má
u sebe. Před smazáním se hodí stáhnout zálohu do souboru.

Firebase u citlivých operací vyžaduje nedávné přihlášení; když chybí, aplikace
uživatele nejdřív znovu přihlásí a operaci zopakuje.
