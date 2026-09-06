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
users/{uid}/prefs/app          hráči, sázka, volby bodování a smazaná kola
```

Jedno kolo = jeden dokument, bez mapování na tabulky.

**Jedna výjimka: Firestore neumí pole uvnitř pole.** `Round.bonuses` je
`bonuses[hráč][jamka] = seznam bonusů`, tedy pole polí, a přímý zápis skončí
chybou `invalid-argument`. V dokumentu se proto jamky ukládají jako mapa:

```
v aplikaci   bonuses.p1 = [[], ['longest'], []]
v dokumentu  bonuses.p1 = { "1": ['longest'] }
```

**Druhá past se stejnou chybou: `undefined`.** Firestore ho odmítá v jakémkoli
poli a shodí tím **celý zápis**, ne jen problémovou hodnotu. Do dat se přitom
dostane záměrně – `normalizeCourse()` zapisuje `loops: undefined`, aby přebilo
poškozené smyčky z uložené kopie. Kola tím netrpí, protože `toDocument()` je
posílá přes JSON, které `undefined` zahodí samo; dokument předvoleb se skládá
z živých objektů, takže projde `forFirestore()`.

Převod tam i zpět je v [`src/sync/document.ts`](../src/sync/document.ts) jako
čisté funkce s testy. Přibude-li do modelu další pole polí, musí projít stejnou
cestou.

Rozehrané kolo není nic zvláštního – je to obyčejné kolo bez `finishedAt`.
Na novém zařízení se pozná právě podle toho (`pickCurrentRound()`).

Smazané kolo je výjimka z běžného slučování – ať už jde o zahození rozehraného
kola, nebo o smazání v archivu. Jeho id se uloží jako tombstone do `prefs/app`
(`deletedRoundIds`) a dokument kola se smaže. Tombstone zůstává i po smazání
dokumentu, aby zařízení, které ještě má starou lokální kopii, kolo znovu
nenahrálo. Bez přihlášení se tombstone drží jen v `localStorage`; po návratu
signálu se synchronizace zopakuje.

Stejně se chová seznam hráčů. Slučuje se sjednocením, takže smazaný hráč se
bez tombstonu vrátil z cloudu při první synchronizaci. Jeho záznam je ale
v `deletedPlayerKeys` vedený **podle jména** (bez ohledu na velikost písmen),
ne podle `id`: to si každé zařízení generuje samo, takže stejný hráč má na dvou
telefonech dvě různá id a tombstone podle id by na druhém neplatil – páruje se
tak i `mergeRosters()`. Odehraná kola smazaného hráče zůstávají v archivu
netknutá; mizí jen z nabídky spoluhráčů. Přidání hráče zpátky (ručně nebo
založením kola) tombstone ruší.

Obnova ze zálohy tombstone **přebíjí**. Id všech kol ze souboru se zapíšou do
`golfgames.revivedRounds.v1` a `activeDeletedIds()` je před slučováním ze
seznamu tombstonů vyškrtne – včetně toho v cloudu, který se pak přepíše. Bez
toho by obnovené kolo při první synchronizaci zase zmizelo a nešlo by ho vrátit
nikdy. Seznam je dočasný: po úspěšné synchronizaci se vyprázdní.

## Slučování a konflikty

Kola se párují podle `id` a rozhoduje `updatedAt`: **vyhrává novější zápis**.
Při shodě časů zůstává místní verze. Běžná synchronizace nic nezahazuje –
výsledek je vždy sjednocení obou stran. Výjimkou je pouze explicitní potvrzení
uživatele, že chce rozehrané kolo zahodit; to se přenese tombstonem na všechna
zařízení.

`Round.updatedAt` zvedá `touchRound()` jen při **skutečné změně dat** (skóre,
extra body, par, ukončení kola). Listování jamkami ho záměrně nezvedá: jinak
by zařízení, na kterém se jen kouká, přebilo zápis z toho, kde se hraje.

Kola z verzí před zavedením synchronizace `updatedAt` nemají; `normalizeRound()`
jim ho doplní z data ukončení (u nedohraných ze založení).

Slučovací logika je v [`src/sync/merge.ts`](../src/sync/merge.ts) jako čisté
funkce bez jediného odkazu na Firebase, takže ji pokrývají běžné testy.

## Kdy se zapisuje

| Událost                           | Co se stane                                                                 |
| --------------------------------- | --------------------------------------------------------------------------- |
| Přihlášení                        | stáhnou se všechna vzdálená kola, sloučí s místními, rozdíl se nahraje      |
| Start aplikace s účtem            | totéž, aby se zachytily změny z jiného zařízení                             |
| Změna zápisu                      | kolo se zařadí do fronty a odešle **s odkladem 10 s**                       |
| Smazání kola (archiv i rozehrané) | uloží se tombstone, místní kolo zmizí hned, cloudový dokument se smaže      |
| Smazání hráče ze seznamu          | uloží se tombstone na jméno, hráč zmizí i v cloudu; kola v archivu zůstanou |
| Obnova ze zálohy                  | tombstony obnovených kol a hráčů se zruší a hned se synchronizuje           |
| Odchod z aplikace                 | fronta se odešle hned (`visibilitychange`)                                  |
| Návrat signálu                    | synchronizace zopakuje i čekající mazání (`online`)                         |

Odklad je důležitý kvůli kvótám: bez něj by osmnáctijamkové kolo znamenalo
osmnáct zápisů, s ním vyjde na jednotky. Denní limit bezplatného plánu je tak
mimo dosah i při velkém počtu hráčů.

Neodeslané změny čekají v `golfgames.syncQueue.v1`, takže přežijí i zavření
aplikace bez signálu. Čekající zahození kol je v
`golfgames.deletedRounds.v1`; při další synchronizaci má přednost před
nahráním kola. Opačný seznam `golfgames.revivedRounds.v1` drží kola vrácená
ze zálohy a má přednost před tombstonem. Hráči mají stejnou dvojici seznamů
(`golfgames.deletedPlayers.v1` a `golfgames.revivedPlayers.v1`), jen klíčem
není id, ale jméno.

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
4. **Vytvořit databázi:** Build → Firestore Database → _Create database_.
   Authentication a Firestore jsou dva samostatné produkty - zapnutím
   přihlášení databáze nevznikne a synchronizace by selhávala.

   | Volba    | Co zvolit            | Proč                                                                         |
   | -------- | -------------------- | ---------------------------------------------------------------------------- |
   | Název    | nechat `(default)`   | `getFirestore(app)` sahá na výchozí databázi; pojmenovanou by nenašel        |
   | Umístění | `eur3 (europe-west)` | data zůstanou v EU. **Umístění nejde později změnit**                        |
   | Režim    | _Production mode_    | test mode pustí na 30 dní k datům kohokoli; vlastní pravidla máme připravená |

5. Nasadit pravidla ze [`firestore.rules`](../firestore.rules) (viz
   [Zabezpečení](#zabezpečení)).
6. Konfigurace do GitHub jako `VITE_FIREBASE_API_KEY`,
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

## Přihlášení a blokování vyskakovacích oken

Tohle je nejkřehčí místo celé synchronizace a stojí za to mu rozumět.

**Pravidlo prohlížečů:** vyskakovací okno smí otevřít jen kód běžící přímo
v obsluze klepnutí. Jakékoli čekání na síť mezitím gesto „spotřebuje" a okno
se zablokuje. Safari je v tomhle nejpřísnější.

Do cesty se přitom pletou **dvě** čekání:

1. **Naše** – dynamický import Firebase SDK. Řeší `preloadAuth()`, které SDK
   načte už při otevření obrazovky účtu. Tlačítko je do té doby vypnuté
   s popiskem „Připravuji přihlášení…".
2. **Firebase** – SDK si před otevřením okna samo ověřuje původ stránky proti
   autorizovaným doménám, což je další síťový požadavek. Proto `preloadAuth()`
   volá i `getRedirectResult()`, které tuhle přípravu udělá dopředu.

Teprve pak `signInWithGoogle()` otevírá okno **synchronně**, bez jediného
`await` před sebou. Funkce proto záměrně není `async`.

Když okno přesto zablokuje nastavení prohlížeče, zkusí se **přesměrování**.
To ale prochází doménou `*.firebaseapp.com`, takže ho v Safari trápí blokování
úložiště třetích stran – je to poslední záchrana, ne spolehlivá cesta.

### Definitivní řešení, pokud iOS zlobí dál

Přestěhovat hosting na **Firebase Hosting** (na plánu Spark zdarma)
a nastavit `authDomain` na `golf.kubecka.cz`. Tím je přihlášení celé
first-party: odpadá ověřování původu i blokování úložiště, funguje popup
i přesměrování a z přihlašovací obrazovky Google zmizí `firebaseapp.com`.
Cenou je přesun nasazení z GitHub Pages.

## Velikost stahovaných dat

Firebase SDK se načítá dynamickým importem a má vlastní chunk, který je
**vynechaný z předcachování** service workerem (`globIgnores` ve
`vite.config.ts`). Nepřihlášený uživatel ho tedy nestáhne ani přes offline
cache – přihlášenému se načte ze sítě, což stejně jde jen online.

Předcachovaná velikost aplikace tím zůstává na ~324 kB, prakticky stejně jako
před zavedením synchronizace.

## Časté problémy

| Projev                            | Příčina                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Sekce účtu se vůbec nezobrazí     | build nemá konfiguraci Firebase (chybí tajemství)                                     |
| „Synchronizace se nepovedla"      | nevytvořená databáze, nenasazená pravidla, nebo chybějící doména v Authorized domains |
| Přihlášení se otevře a hned zavře | vyskakovací okno zablokované; aplikace zkusí přesměrování                             |
| Data z druhého zařízení nenaskočí | synchronizace běží při startu a po přihlášení – pomůže „Synchronizovat teď"           |

## Smazání účtu

Tlačítko na obrazovce Účet smaže **všechna data v cloudu i samotný účet**.
Kola v zařízení zůstávají – smazání účtu neznamená, že hráč přijde o to, co má
u sebe. Před smazáním se hodí stáhnout zálohu do souboru.

Firebase u citlivých operací vyžaduje nedávné přihlášení; když chybí, aplikace
uživatele nejdřív znovu přihlásí a operaci zopakuje.
