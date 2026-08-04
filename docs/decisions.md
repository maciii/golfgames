# Rozhodnutí a jejich důvody

Záznam toho, **proč** je projekt takový, jaký je. Kód říká co se děje, tenhle
dokument říká, jaká volba za tím byla a co ji může změnit.

Formát každého záznamu: kontext → rozhodnutí → důsledek. Když se rozhodnutí
mění, přepíše se záznam a věcná změna se popíše v [`../CHANGELOG.md`](../CHANGELOG.md).

---

## 1. Platforma: PWA na GitHub Pages

**Kontext.** Aplikace má běžet na iPhonu. Zadání znělo jednoznačně: nic se
nesmí platit, žádné placené služby.

**Rozhodnutí.** Progressive Web App hostovaná na GitHub Pages, přidaná na
plochu přes Safari.

**Proč ne nativní iOS aplikace.** Distribuce vyžaduje Apple Developer Program
za 99 USD/rok. To je přímý rozpor se zadáním.

**Co tím získáváme navíc.** Funguje bez signálu (na hřišti běžné), spoluhráči
si ji otevřou odkazem bez instalace, oprava je online za pár minut bez App
Store review.

**Co tím ztrácíme.** Žádné push notifikace na iOS bez přidání na plochu, žádný
přístup k systémovým funkcím, uložiště je jen `localStorage`.

---

## 2. Data zůstávají v telefonu

**Rozhodnutí.** Žádný backend, žádné účty, žádná synchronizace. Všechno
v `localStorage`.

**Proč.** Server znamená provozní náklady (rozpor se zadáním) a přihlašování
znamená překážku před prvním zápisem skóre. Kolo golfu má jedno zařízení,
které zapisuje – sdílení mezi telefony není potřeba.

**Důsledek.** Data se nepřenesou mezi telefony a smazání dat prohlížeče je
smaže.

**Jak se to vyvinulo.** Přesně tohle začalo vadit. Odpovědí je záloha do
souboru (bod 2b) a nepovinná synchronizace přes účet Google (bod 2c). Původní
rozhodnutí ale platí dál pro nepřihlášeného uživatele - ten má pořád všechno
jen v telefonu a nic neodchází ven.

---

## 2b. Záloha do souboru dřív než cloud

**Rozhodnutí.** Než přijde synchronizace, umí aplikace stáhnout všechna data
jako jeden JSON a načíst ho zpátky.

**Proč zrovna tohle jako první.** Je to pár hodin práce, okamžitě řeší
nejhorší scénář (ztráta telefonu) a nezávisí na žádné cizí službě. Zároveň to
zůstává únikovým východem, kdyby se cloudové řešení někdy ukázalo jako slepá
ulička.

**Sloučit vs. nahradit.** Výchozí je slučování, protože obnova nikdy nesmí nic
smazat. Při shodě id vyhrává novější kolo (podle data ukončení) a rozehraná hra
zůstává ta místní – jinak by obnova mohla zahodit rozehrané kolo. Režim
„nahradit vše" existuje pro nové zařízení, kde je předchozí stav prázdný
a slučování by nedávalo smysl.

**Odmítnutí místo tichého poškození.** Cizí soubor, poškozený JSON i záloha
z novější verze skončí hláškou. Napůl přečtená záloha je horší než žádná.

---

## 2c. Synchronizace: Firebase, ale localStorage zůstává zdrojem pravdy

**Rozhodnutí.** Nepovinná záloha do Firestore přes přihlášení účtem Google,
na bezplatném plánu Spark.

**Proč Firebase.** Přihlášení Googlem používá jen scope `openid email profile`,
což je nesensitivní údaj a nevyžaduje ověřovací proces aplikace u Google -
na rozdíl od varianty s Google Drive, kde by scope `drive.appdata` znamenal
ověření a bez něj limit ~100 uživatelů. Spark plán je bez platební karty: při
vyčerpání kvóty operace selžou, faktura nepřijde nikdy. To přesně odpovídá
podmínce, že projekt nesmí nic stát.

**Zvažované alternativy.** Supabase odpadlo kvůli uspávání projektu po 7 dnech
nečinnosti - u aplikace používané párkrát měsíčně by sync nefungoval zrovna
tehdy, kdy je potřeba. Cloudflare Workers + D1 mají skvělé limity, ale
přihlášení Googlem by se muselo naprogramovat včetně ověřování tokenů, což je
víc kódu a víc odpovědnosti za bezpečnost.

**Zdrojem pravdy zůstává `localStorage`.** Cloud je zrcadlo, ne primární
úložiště. Zápis skóre proto zůstává okamžitý a offline, výpadek cloudu nemůže
rozbít probíhající kolo a celý dosavadní kód her se nemusel měnit.

**SDK se načítá až při přihlášení.** Dynamickým importem a s vynecháním
z předcachování service workerem. Nepřihlášený uživatel tak nestáhne ani bajt
navíc - to je podmínka toho, že se pro něj nic nemění.

---

## 2d. Konflikty: vyhrává poslední zápis

**Rozhodnutí.** Kola se párují podle `id`, rozhoduje `updatedAt`. Nic se nikdy
nezahazuje - výsledek je vždy sjednocení obou stran.

**Proč ne něco chytřejšího.** Slučování po jamkách by řešilo případ, kdy dva
lidé zapisují stejné kolo na dvou telefonech. To se ale nestává - kolo zapisuje
jeden člověk na jednom zařízení. Za tu vzácnost nestojí složitost, kterou by
bylo potřeba udržovat u každé nové hry.

**`updatedAt` zvedá jen skutečná změna dat.** Listování jamkami ne. Kdyby ano,
zařízení, na kterém se jen kouká do výsledků, by přebilo zápis z toho, kde se
zrovna hraje - a to je přímá cesta ke ztrátě skóre.

---

## 3. Model kola je společný, hry jsou zásuvné

**Rozhodnutí.** Jeden `Round` pro všechny hry; hra je objekt implementující
`GameDefinition`, který z uložených ran spočítá výsledek.

**Proč.** Hry se liší jen vyhodnocením, ne tím, co se zapisuje. Zápis skóre,
archiv, scorekarta i peněžní vyrovnání tak vzniknou jednou pro všechny.

**Důsledek.** Přidání hry je jeden soubor plus zápis do registru. Hra, která
by potřebovala zapisovat něco jiného než rány na jamce, se do modelu nevejde
a znamenala by změnu `Round` (a tím pádem `npm run bump:major`).

---

## 4. Best Aggregate se počítá bodově, ne na rány

**Kontext.** První verze sčítala rány dvojic. To bylo špatně.

**Rozhodnutí.** Na každé jamce se dvojici připisují body: 1 za nižší lepší míč
(BEST), 1 za nižší součet, 1 za birdie, 3 za eagle. Vyhrává nejvyšší součet
bodů.

**Důsledek.** Hra je vždy pro 4 hráče ve dvou dvojicích – ve dvou nemá bodování
na co navazovat.

---

## 5. Chybějící zápis na rozehrané jamce = vzdaná jamka

**Kontext.** Prázdná buňka může znamenat „ještě jsme tam nedošli" i „hráč
jamku vzdal". Původně se obojí přeskakovalo, což zvýhodňovalo toho, kdo
nedohrál.

**Rozhodnutí.** Rozlišuje se podle toho, jestli na jamce zapsal **aspoň jeden**
hráč (`isHoleStarted()`). Nikdo nezapsal → jamka se nehrála a nepočítá se.
Někdo zapsal → jamka běží a komu chybí zápis, ten ji vzdal.

**Důsledky podle her.** Best Aggregate: dvojice přichází o součet (bere ho
soupeř), lepší míč jí zůstává, dokud ho drží aspoň jeden partner. Skins: vzdaný
hráč se o skin ucházet nemůže. Match play: vzdanou jamku prohrává.

**Implementace.** Sentinel `CONCEDED = Infinity` v porovnáních – prohraje
s čímkoli zapsaným, ale dvě vzdané hodnoty vyjdou jako shoda.

---

## 6. Součet dvojice počítá zbylého partnera

**Kontext.** Když jeden z dvojice jamku vzdá, dřívější verze škrtla celý
součet dvojice.

**Rozhodnutí.** Součet se počítá z ran těch, kdo dohráli. Přednost má ale
dvojice s víc dohranými míči; při stejném počtu rozhoduje nižší součet
(`aggregateWins()`).

**Proč zrovna takhle.** Kdyby rozhodoval jen nižší součet, dvojice by si
škrtnutím špatného míče polepšila – jeden míč je vždycky míň ran než dva.

---

## 7. Peníze u dvojic platí každý hráč zvlášť

**Kontext.** Původní verze převáděla rozdíl jednou za celou dvojici, což byla
poloviční částka oproti tomu, jak se hra hraje.

**Rozhodnutí.** Rozdíl bodů × hodnota bodu platí **každý hráč prohrávající
dvojice svému protějšku** ve vítězné dvojici. Protějšky se párují podle pořadí
ve dvojici.

**Příklad ze zadání.** 10 bodů vs 3 body = rozdíl 7. Při 10 Kč za bod platí
Hráč 3 sedmdesát korun Hráči 1 a Hráč 4 sedmdesát korun Hráči 2; vítězná
dvojice dostane dohromady 140 Kč.

**Důsledek.** Pořadí hráčů v `team.playerIds` má význam – určuje protějšky.

---

## 8. Extra bod získává celá dvojice

**Rozhodnutí.** Bonus (bunker, water, barkie, arnie, longest, nearest…)
uhraný jedním hráčem se počítá **celé jeho dvojici**, ne jen jemu.

**Platnost.** Explicitně i pro hry, které se přidají později. Je to pravidlo
hry, ne detail implementace Best Aggregate.

---

## 9. Extra bod se násobí podle výsledku na jamce

**Rozhodnutí.** Hodnota bonusu platí za par. Lepší výsledek ji násobí podle
konfigurovatelných násobičů (výchozí birdie ×2, eagle ×3, albatros ×10,
condor ×1000). Bogey a horší = žádný extra bod.

**Proč konfigurovatelné.** Násobiče byly nejdřív pevné. Různé party to hrají
jinak a hodnota se dá měnit bez zásahu do kódu.

**Výjimka.** Longest a Nearest se nenásobí – o jejich přiznání rozhoduje
potvrzovací pravidlo (bod 10), takže by násobení bylo dvojí bonus za totéž.

---

## 10. Potvrzování Longest a Nearest

**Rozhodnutí.** Ve výchozím stavu zapnuté: hráč, který Longest nebo Nearest
zapsal, musí jamku dohrát na **par nebo líp**. Horší výsledek posílá bod
soupeřově dvojici.

**Proč.** Tak se to hraje – nejdelší odpal nebo nejbližší rána, po které
následuje zkažená jamka, se nepočítá jako zásluha.

**V UI.** Značka `L` / `N` u jména je zeleně, když bod zůstává vlastní dvojici,
červeně, když propadá soupeřům, a tlumeně, dokud hráč jamku nezapsal
(`exclusiveBonusOutcome()`).

**Exkluzivita.** Longest a Nearest může mít na jamce jen jeden hráč;
`toggleBonus()` ho ostatním automaticky odebere. Longest se nabízí jen na
pětiparových jamkách, Nearest na tříparových.

---

## 11. Double násobí, nepřidává

**Rozhodnutí.** Extra bod `double` je jediný typu `multiplier` – nepřidává
body, ale zdvojnásobí výsledek celé jamky pro obě dvojice. Každý zápis násobí
zvlášť, takže tři doubly na jamce znamenají osminásobek.

**Skládání s dvojnásobnou jamkou.** Dvojnásobná 9./18. jamka a zvolený double
se násobí mezi sebou – dohromady čtyřnásobek. Volba „Nenásobit extra body"
nechává extra body v základní hodnotě, i když se zbytek jamky násobí.

---

## 12. Volby bodování patří ke hře, sázka ke kolu

**Rozhodnutí.** Hodnoty extra bodů, násobiče, Double Best i dvojnásobné
závěrečné jamky se ukládají **per hra** (`golfgames.gameOptions.v1`). Měna
a hodnota bodu se ukládají jako naposledy použité nastavení kola.

**Proč.** Best Aggregate a Skins mají jiné extra body a nemá smysl si je
přepisovat navzájem. Sázka se naopak mění spíš podle party než podle hry.

**Klíčový důsledek.** Kolo si při založení dělá **hlubokou kopii** nastavení.
Změna předvoleb po odehrání kola nepřepočítá archiv – historické kolo se
navždy počítá tak, jak se hrálo. `ResultsScreen` proto umí vypsat sekci
„Bodování kola" i u archivního záznamu.

---

## 13. Zápis skóre: par doprostřed, birdie a bogey na tlačítka

**Kontext.** První verze zapisovala `+` par a `−` birdie.

**Rozhodnutí.** Z prázdné buňky zapíše `−` **birdie**, `+` **bogey**, klepnutí
doprostřed **par**. Mazání se přesunulo na přidržení čísla (500 ms).

**Proč.** Tři nejčastější výsledky jsou tak každý na jedno klepnutí. Krátké
klepnutí bylo potřeba pro par, takže mazání dostalo vlastní gesto.

---

## 14. Kolo jde uložit nedohrané

**Kontext.** Hru ukončí bouřka a zápis by se jinak zahodil.

**Rozhodnutí.** Odkaz „Ukončit kolo" funguje na kterékoli jamce. Před uložením
aplikace vypíše, co chybí, a rozliší vzdané jamky od nehraných; uložení je
potřeba potvrdit.

**Proč potvrzení.** Uživatel chce ve většině případů zapsat všechno a ocení,
když ho aplikace na chybějící jamky upozorní. Tichému uložení nekompletního
kola se tím předchází.

---

## 15. Značky výsledku v šesti kategoriích

**Rozhodnutí.** Eagle a lepší žlutě (kroužek s dvojitým obrysem), birdie
červeně (kroužek), par modře (čtvereček), bogey zeleně (čtvereček), dvojbogey
šedě (dvojitý obrys), trojbogey a horší černě (trojitý obrys). Barvy vychází
z předlohy zobrazování skóre na turnajových webech.

**Tvar nese informaci i bez barvy** – podpar do kroužku, nadpar do čtverečku –
takže scorekarta zůstane čitelná i pro barvoslepé.

**Obrysy se kreslí dovnitř** (`inset` box-shadow). Kdyby rostly ven, značky
s vícenásobným obrysem by byly větší než ostatní a rozhazovaly mřížku
scorekarty.

**Jedna odchylka od předlohy.** Mezery v trojitém obrysu u černé jsou světlé.
Kdyby měly barvu podkladu, černá značka by s tmavým motivem aplikace splynula.

---

## 16. Testuje se matematika, ne React

**Rozhodnutí.** Testy pokrývají pravidla her, peněžní vyrovnání a výpočty nad
modelem. Komponenty se netestují.

**Proč.** Chyba v bodování je nejdražší a nejhůř viditelná – projeví se až
sporem na devatenácté jamce. Chyba v UI je vidět hned při prvním použití.

**Konvence.** Nad každou fixturou je komentář s modelovou situací, ať je
z výsledku poznat, co se vlastně počítalo. Testy základních pravidel používají
`BASE_OPTIONS` s vypnutými nadstavbami, aby měřily to, co tvrdí.

---

## 17. Bez ESLintu

**Rozhodnutí.** Kontrolu zajišťuje `tsc` ve striktním režimu (včetně
`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`) a Prettier.

**Proč.** `typescript-eslint` podporuje jen TypeScript `<6.1`, projekt běží na
TypeScriptu 7. Degradovat překladač kvůli lintu nedává smysl.

**Kdy to změnit.** Až `typescript-eslint` TypeScript 7 podpoří.

---

## 18. Verze se zvedá při každém buildu

**Rozhodnutí.** `scripts/bump-version.mjs` zvedne patch verzi před každým
lokálním buildem; v CI se přeskakuje. Verze se vpéká do bundlu a zobrazuje
v patičce aplikace.

**Proč.** Po instalaci na plochu není jinak poznat, jestli má telefon
poslední verzi. Číslo v patičce to řekne na první pohled.

**Důsledek.** Čísla patch verzí mezi záznamy v changelogu nejsou souvislá –
zapisují se jen verze s věcnou změnou.

---

## 19. Vlastní doména golf.kubecka.cz

**Rozhodnutí.** Aplikace běží na vlastní subdoméně (`public/CNAME`), takže se
servíruje z kořene a `base` je `/`.

**Důsledek.** Bez vlastní domény by GitHub Pages potřebovaly `base:
'/golfgames/'`. Přepnout jde přes `BASE_PATH=/golfgames/ npm run build`.

Postup nastavení DNS a Pages je v [`deployment.md`](deployment.md).

---

## 21. Vlastní i18n místo knihovny

**Rozhodnutí.** Češtinu a angličtinu drží `src/i18n/` - vlastních ~250 řádků
místo `i18next` nebo podobné knihovny.

**Proč.** Textů je pár stovek a potřebujeme z i18n jen dvě věci: dosazení
proměnných a množná čísla. Pravidla množných čísel umí prohlížeč sám
(`Intl.PluralRules`), takže knihovna by přinesla hlavně velikost a vlastní
konfiguraci.

**Co tím získáváme navíc.** Typovou pojistku: český katalog je zdrojem pravdy
pro `MessageKey` a anglický je `Record<MessageKey, Message>`. Chybějící překlad
je proto **chyba překladu**, ne text, který v aplikaci tiše zůstane česky. To
běžná knihovna nenabízí.

**Kde to nestačí.** Klíče skládané z id (`games.<id>.name`) TypeScript ověřit
neumí - jejich existenci proto hlídá test, který projde všechny registrované
hry, bonusy i kategorie výsledku.

**Angličtina jako výchozí.** Aplikaci může otevřít kdokoli; čeština se zvolí,
jen když ji má uživatel v prohlížeči. Uložená volba má vždy přednost.

**Jazyk drží i modul, nejen React.** Formát částek, datum kola a řazení jmen
hráčů se dějí mimo komponenty, takže by jinak zůstaly v jednom jazyce natvrdo.

---

## Otevřené otázky

Věci, o kterých padlo rozhodnutí je odložit:

- **Handicapy.** Zapisuje se jen hrubé skóre. Netto výsledky by znamenaly HCP
  u hráče, HCP jamky (SI) a přepočet ve všech hrách.
- **Rozdělení Longest/Nearest u her jednotlivců.** Potvrzovací pravidlo mluví
  o „soupeřově dvojici", takže dnes dává smysl jen u týmových her.
- **Export a import dat.** Zatím nepotřebné, ale je to nejlevnější náhrada
  synchronizace, kdyby jednou byla potřeba.
- **Extra body v ostatních hrách.** Model je připravený, vyhodnocuje je zatím
  jen Best Aggregate.
- **Další jazyky.** Přidání je jen nový katalog vedle `cs.ts` a `en.ts`; kód
  se měnit nemusí. Zatím na ně není poptávka.
- **Další měny.** Sázka umí Kč a €. S angličtinou by dávaly smysl i libry
  a dolary - je to jen rozšíření `Currency` a výchozích hodnot.
