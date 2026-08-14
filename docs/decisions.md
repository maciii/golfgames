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

**Rozhodnutí.** Kola se párují podle `id`, rozhoduje `updatedAt`. Běžná
synchronizace nic nezahazuje - výsledek je vždy sjednocení obou stran. Když
uživatel výslovně potvrdí zahození rozehraného kola, uloží se tombstone do
společných předvoleb a vzdálený dokument se smaže.

**Proč ne něco chytřejšího.** Slučování po jamkách by řešilo případ, kdy dva
lidé zapisují stejné kolo na dvou telefonech. To se ale nestává - kolo zapisuje
jeden člověk na jednom zařízení. Za tu vzácnost nestojí složitost, kterou by
bylo potřeba udržovat u každé nové hry.

**`updatedAt` zvedá jen skutečná změna dat.** Listování jamkami ne. Kdyby ano,
zařízení, na kterém se jen kouká do výsledků, by přebilo zápis z toho, kde se
zrovna hraje - a to je přímá cesta ke ztrátě skóre.

**Proč tombstone.** Samotné smazání dokumentu nestačí: zařízení, které ještě
má starou lokální kopii, by ji při příštím slučování znovu nahrálo. Tombstone
proto zůstává v `users/{uid}/prefs/app` a filtruje kolo před slučováním na
každém zařízení.

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

## 4. Best + Součet se počítá bodově, ne na rány

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

**Důsledky podle her.** Best + Součet: dvojice přichází o součet (bere ho
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

## 8. Příjemce extra bodu určuje hra

**Rozhodnutí.** Bonus (bunker, water, barkie, arnie, longest, nearest…)
uhraný jedním hráčem připadne příjemci, kterého deklaruje konkrétní hra.
V týmových hrách se počítá celé jeho dvojici, ve Skins hráči, který ho uhrál.

**Proč.** Skins není týmová hra a její extra body by při připsání dvojici
neměly žádného správného příjemce. Rozsah je proto součástí
`GameDefinition.scoringOptions`, ne detail obrazovky nebo implementace jedné
hry.

---

## 9. Extra bod se násobí podle výsledku na jamce

**Rozhodnutí.** Hodnota bonusu platí za par. Lepší výsledek ji násobí podle
konfigurovatelných násobičů (výchozí birdie ×2, eagle ×3, albatros ×10,
condor ×1000). Bogey a horší = žádný extra bod.

**Proč konfigurovatelné.** Násobiče byly nejdřív pevné. Různé party to hrají
jinak a hodnota se dá měnit bez zásahu do kódu.

**Výjimka.** Longest a Nearest se nenásobí – o jejich přiznání rozhoduje
potvrzovací pravidlo (bod 10), takže by násobení bylo dvojí bonus za totéž.
Pravidlo násobení platí pro týmového i hráčského příjemce.

---

## 10. Potvrzování Longest a Nearest

**Rozhodnutí.** Potvrzování je volitelné samostatně pro Longest i Nearest a ve
výchozím stavu je zapnuté. Když je zapnuté, hráč, který bonus zapsal, musí jamku
dohrát na **par nebo líp**. V týmové hře horší výsledek posílá bod soupeřově
dvojici; ve Skins se bonus při horším výsledku nezapočítá. Po vypnutí
příslušného přepínače se bonus přizná bez této podmínky.

**Proč.** Tak se to hraje – nejdelší odpal nebo nejbližší rána, po které
následuje zkažená jamka, se nepočítá jako zásluha.

**V UI.** Značka `L` / `N` u jména je zeleně, když bod zůstává vlastní straně,
červeně, když v týmové hře propadá soupeřům, a tlumeně, dokud hráč jamku
nezapsal (`exclusiveBonusOutcome()`).

**Exkluzivita.** Longest a Nearest může mít na jamce jen jeden hráč;
`toggleBonus()` ho ostatním automaticky odebere. Longest se nabízí jen na
pětiparových jamkách, Nearest na tříparových.

---

## 11. Dvojnásobná sázka násobí, nepřidává

**Rozhodnutí.** Volba `double` (v UI „Dvojnásobná sázka") je jediná typu
`multiplier` – nepřidává body, ale zdvojnásobí sázku celé jamky. Každý zápis
násobí zvlášť, takže tři volby na jamce znamenají osminásobek.

**Skládání s dvojnásobnou jamkou.** Dvojnásobná 9./18. jamka a zvolený double
se násobí mezi sebou – dohromady čtyřnásobek. Volba „Nenásobit extra body"
nechává extra body v základní hodnotě, i když se zbytek jamky násobí.

---

## 12. Volby bodování patří ke hře, sázka ke kolu

**Rozhodnutí.** Hodnoty extra bodů, násobiče, Double Best i dvojnásobné
závěrečné jamky se ukládají **per hra** (`golfgames.gameOptions.v1`). Měna
a hodnota bodu se ukládají jako naposledy použité nastavení kola.

**Proč.** Best + Součet a Skins mají jiné extra body a nemá smysl si je
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
červeně (kroužek), par modře (čtvereček), bogey zeleně (čtvereček), Doble
šedě (dvojitý obrys), Triple černě (trojitý obrys). Barvy vychází
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

## 20. Vlastní i18n místo knihovny

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

## 21. Match play po matematickém rozhodnutí

**Rozhodnutí.** Zápas se rozhodne na první jamce, po které je náskok větší
než počet zbývajících jamek. Stav se pak nemění, i když aplikace dovolí
zapsat další jamky. Ty se označí jako „mimo hru" a neovlivní výsledek ani
vyrovnání.

**Proč.** To odpovídá Rule 3.2a Pravidel golfu: zápas je vyhraný, jakmile
jedna strana vede o více jamek, než kolik jich zbývá. Uživatel může pozdější
skóre zachovat pro úplnou scorekartu, ale nesmí zpětně změnit oficiální
výsledek zápasu.

**V UI.** Hlavička zápisu ukazuje průběžné `UP`/`DOWN`, zbývající jamky,
`dormie`, konečný výsledek nebo stav „mimo hru". Herní kontrakt to poskytuje
přes `headerSummary(round, hole)`.

---

## 22. Dvě varianty vyrovnání jednotlivců

**Rozhodnutí.** U jednotlivců se jako výchozí zobrazuje **Celková výhra**
a pod ní **Konkrétní jednotlivé platby**. Přepínač nabídne také
**Optimalizované platby**, které hledají stejné zůstatky s nejmenším počtem
převodů.

**Proč.** Přímý rozpis zachovává intuitivní pravidlo, že každý bod se
vyrovnává vůči každému soupeři. Některé skupiny ale chtějí po skončení kola
provést co nejméně plateb. Proto jsou obě interpretace viditelné a uživatel
nemusí volit mezi průhledností a praktičností.

**Důsledek.** `Settlement.kind === 'balances'` obsahuje `rows` s čistými
zůstatky, `transfers` s přímými platbami a `optimizedTransfers` s minimálním
počtem plateb. Optimalizace nemění žádný zůstatek, pouze slučuje převody.

---

## 23. Landscape je živý přehled scorekarty

**Rozhodnutí.** Při rozehraném kole telefon na šířku nahradí ovládání zápisu
živou scorekartou pouze pro čtení. Návrat na výšku okamžitě vrátí zápis na
stejné jamce.

**Proč.** Na šířku se tabulka vejde výrazně lépe než velká tlačítka pro zápis;
naopak přímé úpravy buněk by přidaly malé ovladače a riziko nechtěného zápisu.
Aktuální jamka se proto ve scorekartě zvýrazní a automaticky posune do středu.

---

## 24. Stablefordové tečky ukazují relativní HCP

**Rozhodnutí.** HCP index se pamatuje u uloženého hráče a při výběru do
Stablefordu se předvyplní. Tečky ve scorekartě ukazují rozdíl hracího HCP
hráče vůči nejnižšímu hracímu HCP ve flightu, rozdělený podle stroke indexu.

**Proč.** Samotné Stablefordové body se počítají z vlastního plného HCP vůči
paru. Relativní tečky jsou jen srozumitelná informace pro společnou hru a
neměly by nenápadně měnit už zavedené bodování.

---

## 25. Resort je víc hřišť, hřiště je víc devítek

**Rozhodnutí.** Dvě hřiště jednoho areálu jsou v katalogu **dva záznamy**
(Čeladná Old a New). Devítky jednoho hřiště jsou `loops` uvnitř jednoho
záznamu a kolo se z nich při zakládání **skládá v pořadí**, protože Forest +
River je jiná osmnáctka než River + Forest. Skládat se musí jen hřiště nad
osmnáct jamek; kratší se dá hrát celé a devítky jsou u něj volba navíc.
Poskládané kolo má nejvýš osmnáct jamek.

**Proč.** Hřiště se v areálu vybírá jménem („hrajeme New Course"), takže patří
do nabídky jako samostatná položka. Devítka se ale sama nevybírá, ta se páruje —
a klub každou dvojici normuje zvlášť. Tři devítky by jako devět záznamů
kombinací nabídku zaplevelily a stejná data by v ní ležela devětkrát; jako tři
smyčky se skládají přesně tak, jak se hrají.

**Důsledky.** Norma kombinace se počítá z devítkových norem (CR se sčítá, SR
průměruje podle jamek). Proti tabulce klubu to může minout o jednotku slope,
protože se zaokrouhluje z už zaokrouhlených čísel — na hracím handicapu je to
desetina rány, a proti tomu stojí, že katalog nemusí držet devět skoro
shodných scorekaret na jeden resort. Stroke index se mezi devítkami prostřídá
(první lichý, druhý sudý), jinak by hráč dostal všechny rány na první devítce.

---

## 26. Odpaliště je vlastnost hráče, ne kola

**Rozhodnutí.** Kolo si drží **výchozí odpaliště** a hráč z něj může mít
vlastní. Hrací handicap se počítá z normy jeho odpaliště; kolo nese celou
nabídku (`RoundCourse.tees`), aby šlo dohledat i zpětně. Volba je v řádku
hráče jedno klepnutí, ne zanoření do detailu.

**Proč.** Muži hrají ze žlutých, ženy z červených, a rozdílná norma odpaliště
je přesně to, co má hru vyrovnat — člen `CR − par` ve vzorci WHS. S jedním
odpalištěm pro všechny se počítá nesmysl: na Colony Golf East vyjde hráčce
s indexem 30,1 z červených 28 ran, ale ze žlutých 35. Sedm ran je dva
Stablefordovy body na skoro každé druhé jamce.

**Proč ne pánské a dámské normy u jednoho odpaliště.** Skutečné karty je mají
(černé odpaliště na Colony Golf má jen dámskou normu, proto je v katalogu bez
CR a SR). Znamenalo by to pohlaví u hráče, dvě dvojice CR/SR v `CourseTee`
a hlavně dohledání druhé sady čísel u tří stovek hřišť v katalogu. Volba
odpaliště u hráče pokrývá běžný případ; tohle je samostatná změna.

**Důsledky.** Prázdná volba u hráče neznamená „žádné odpaliště", ale „jako celé
kolo" — hromadná volba se tak propíše sama a nikde se nemusí pamatovat, komu
se odpaliště měnilo ručně. Seznam hráčů si preferovanou barvu pamatuje vedle
handicapu; barvy jsou v katalogu stejné napříč hřišti, takže preference platí
i tam, kde hráč ještě nehrál. Na scorekartě se odpaliště ukazuje jen tehdy,
když se u hráčů liší.

---

## 27. Navigace: History API místo bezstavového přepínače

**Kontext.** `App.tsx` přepínal obrazovky jediným `useState<View>` a do
historie prohlížeče nikdy nic nezapisoval - tak znělo předchozí rozhodnutí,
zapsané přímo v komentáři u `AppShell`: „Router tu není záměrně - navigace je
plochá a router by byl zbytečná váha." Dávalo to smysl, dokud byla appka
v podstatě lineární tok. Jenže swipe zpět na iPhonu, gesto/tlačítko zpět na
Androidu i tlačítko zpět v desktop prohlížeči berou krok z historie
_prohlížeče_, ne appky - a protože appka do ní nikdy nic nezapsala, první
gesto zpět appku vždycky rovnou opustilo, klidně uprostřed zapisování skóre.

**Rozhodnutí.** Každá změna viditelné obrazovky (`view`) a otevřeného kola
v archivu (`openArchiveId`) se zapíše přes `history.pushState`; `popstate` tu
samou dvojici obnoví (`NavSnapshot` v `App.tsx`). Žádný routovací balíček -
jen `pushState`/`popState` napojené na existující `setView`/`setOpenArchiveId`.
Tlačítka „Zpět" v obrazovkách teď volají `window.history.back()` místo
přímého přepínání stavu, takže tlačítko i gesto zpět dělají přesně totéž a
appku pustí zpátky jen k obrazovce, na které uživatel opravdu byl.

**Proč jen `view` a `openArchiveId`.** Zbytek stavu (`selectedCourseId`,
`setupDraft`, `settingsGameId`, `editingCourseId`) je rozepsaná data, ne
pozice v appce - kdyby zpět přepisovalo i je, ztratil by se rozepsaný draft
při návratu z podobrazovky, přesně to, co `setupDraft` v kořeni appky záměrně
chrání (bod 3). `settingsGameId` a `editingCourseId` navíc obrazovka čte, jen
když `view` sedí na dané podobrazovce, takže zůstat jim chvíli neaktuální po
odchodu nevadí.

**Gesto zpět si appka obsluhuje sama (`src/swipeBack.ts`).** Zápis do historie
sám o sobě nestačí: nainstalovaná PWA běží ve `display: standalone`, kde iOS
ani Android nedávají appce systémové gesto zpět a není tam ani lišta
prohlížeče se šipkou. V prohlížeči gesto funguje, v appce na ploše ne - a
protože se appka na plochu instalovat má, byla každá obrazovka bez tlačítka
Zpět slepá ulička. Tažení od levého okraje proto poslouchá appka sama a mapuje
ho na `history.back()`. Gesto se vypíná na výchozí obrazovce (odtud by
znamenalo opuštění appky) a nespustí se, když tah začne uvnitř něčeho, co se
samo posouvá do stran - scorekarta na telefonu sahá až k okraji displeje.

**Tlačítko Zpět má i první krok nového kola.** `CoursePickerScreen` ho zprvu
schovával s odůvodněním, že v prvním kroku není kam se vracet. To neplatí:
vede se sem z domovské obrazovky, kde je menu s účtem, zálohou i archivem -
bez tlačítka se z výběru hřiště nedalo dostat nikam.

**Důsledek.** Appku teď zpět opustí jedině z kořenové obrazovky - odkudkoli
jinde naviguje o krok zpátky uvnitř appky. Bude to důležité i při zabalení
appky do Capacitoru/TWA pro App Store a Google Play, kde nativní
tlačítko/gesto zpět mapuje přímo na historii WebView - bez zapsaných kroků by
jedno gesto zavřelo celou appku stejně, jako to dnes dělá v prohlížeči.

---

## 28. Domovská obrazovka a menu

**Kontext.** Appka dřív začínala rovnou výběrem hřiště - logické pro start
kola, ale appka neměla žádné místo, které by odpovědělo na „co chci s appkou
udělat" dřív, než se rozhodne za uživatele. Zápis skóre je odteď zpětně
navigovatelný (bod 27), takže přidání kořenové obrazovky navíc nic nerozbije -
jen se za ni posune to, co dřív bylo první.

**Rozhodnutí.** `HomeScreen` je nová skutečná první obrazovka, zobrazí se
kdykoli není rozehrané kolo. Dělí zbytek appky podle frekvence použití: co se
dělá skoro pokaždé (nová hra, poslední odehraná hra, oblíbení hráči a hřiště)
je přímo na ní; co se dělá zřídka a záměrně (procházet a spravovat hřiště,
spravovat hráče, záloha, účet) je za `MenuSheet`. `CoursePickerScreen` byl do
teď jen krok zakládání kola - dostal `mode` prop (`'start' | 'browse'`), aby
šel použít i pro čisté procházení hřišť z menu (vede na `CourseEditScreen`
místo do `SetupScreen`, a nenabízí volbu „bez hřiště", která by tam neznamenala
nic).

**Menu je list (`MenuSheet`), ne obrazovka v historii.** Appka podobné listy
už měla (`TeeSheet`, `BonusSheet`) - jde o stejný vzor, otevře a zavře ho
lokální stav `HomeScreen`, ne `history.pushState`. Zpět z otevřeného menu ho
tak jen zavře jako kteroukoli jinou vrstvu nad appkou, ne že by musel
projíždět vlastním krokem historie.

**Oblíbení hráči.** `RosterEntry` dostal `favorite?: boolean` - stejný vzor
jako `preferredTeeId`, ne samostatný klíč jako `favoriteCourses` (roster žije
celý v jednom místě, netřeba ho zvlášť indexovat). Nová obrazovka
`PlayersScreen` je první místo, kde jde seznam hráčů spravovat mimo zakládání
kola - přidat, smazat, upravit HCP a zvýraznit na domovské obrazovce.

**Vyhledávání hráčů z ČGF/Týčka zůstává mimo appku.** ČGF zrušilo veřejnou
databázi hráčů kvůli GDPR už v roce 2018 a nenabízí k ní žádné API; napojení
Týčka na jejich data je uzavřené partnerství, ne otevřené rozhraní pro cizí
appky. Appka proto zůstává u vlastního lokálního seznamu - není co napojit bez
toho, aby se z projektu stal oficiální partner ČGF, což je obchodní krok, ne
kód.

**`CoursePickerScreen` už odkazy na archiv/zálohu/účet ve spodním panelu
nemá.** Ty samé položky teď má `HomeScreen` v menu, odkud se do zakládání kola
vstupuje - ponechat je na obou místech by byla čistá duplicita. Zůstává jen
„Hrát bez hřiště" (`onSkip`), protože to je akce specifická pro zakládání
kola, ne pro appku jako celek.

**Co se vědomě nedělá.** Karta „Pokračovat" v rozehraném kole na domovskou
obrazovku nepatří - appka při rozehraném kole vede rovnou do `PlayScreen`
(`viewForRound()`), Home se zobrazí, jen když kolo neexistuje, takže by karta
nikdy neměla co zobrazit.

---

## 29. Zakládání kola rozdělené na kroky

**Kontext.** `SetupScreen` byl jeden formulář na 1150 řádků - hřiště,
odpaliště, výřez, hráči, handicapy, hra, dvojice i sázka na jedné dlouhé
obrazovce. Šlo to, dokud appka neměla zpětnou navigaci (rozhodnutí #27) -
každé zanoření znamenalo riziko ztráty rozepsaných dat. S History API riziko
zmizelo, takže nic nebránilo rozdělit zakládání kola na kroky, jak appka
dělá u domovské obrazovky a menu (#28).

**Rozhodnutí.** Pět kroků: hřiště (`CoursePickerScreen`, beze změny) →
odpaliště a jamky (`SetupTeeScreen`) → hráči (`SetupPlayersScreen`) → hra
a dvojice (`SetupGameScreen`) → sázka (`SetupBetScreen`, tady se kolo i
zakládá). Navigace je lineární se zpětnou vazbou přes History API - žádné
tečky ani přehled kroků, zpět/swipe vrací přesně o krok s vyplněnými
hodnotami. Rozepsaný stav kola (jména, hra, odpaliště, sázka...) žije přímo
v `AppShell`, ne v odděleném „draftu" jedné obrazovky - kroky se mezi sebou
přepínají stejně jako kterákoli jiná obrazovka appky a nikdy se neodpojí,
takže není co ztratit ani co explicitně pamatovat.

**Počet hráčů už neurčuje hra, ale naopak.** Dřív se v jedné obrazovce
vybírala hra a počet hráčů se jí musel přizpůsobit. V krokovém pořadí přijdou
hráči dřív než hra, takže se to muselo otočit: `SetupPlayersScreen` nabízí
vždycky 1 až 4 hráče a `SetupGameScreen` z `GAMES` přefiltruje jen ty, co
zvolený počet podporují (`playerCounts.includes(playerCount)`). Změna počtu
hráčů v kroku zpátky proto při návratu do kroku Hra může vyřadit dřív
vybranou hru - `SetupGameScreen` na to hlídá efektem, který v tom případě
vybere první dostupnou.

**Sdílená logika hřiště žije v `setupCourse.ts`.** Odvození hřiště, výřezu
a odpaliště (`resolveCourseSetup()`) potřebují tři různé kroky (odpaliště,
hráči, sázka) i finální sestavení kola - bez společného místa by se ta samá
logika musela počítat čtyřikrát. Je to čistá funkce nad seznamem hřišť, žádný
React ani `storage.ts` uvnitř, takže jde otestovat i použít odkudkoli.

**Proč `CoursePickerScreen` zůstává mimo krokové obrazovky.** Byl to už
hotový, samostatný krok dřív, než začalo rozdělení - není důvod ho po vzoru
ostatních kroků přejmenovávat na `SetupCourseScreen`, jen aby seděl jmenný
vzor. Používá se navíc i mimo zakládání kola (`mode="browse"` z menu, #28),
takže je logicky správně mimo `Setup*` rodinu obrazovek.

**Hrát bez sázky.** `money.ts` už dřív bral `pointValue <= 0` jako „bez
sázky" (`settleRound()` vrátí `kind: 'none'`, sekce se skryje) - chyběl jen
srozumitelný přepínač. `SetupBetScreen` teď nabízí „Hrát bez sázky", který
schová měnu a hodnotu bodu a nastaví `pointValue` na 0; zapnutí/vypnutí
přepínače si navíc pamatuje poslední nenulovou hodnotu, ať se při zrušení
sázky nezadává znova.

**Zahození rozehraného kola je odkaz, ne tlačítko.** `ResultsScreen` u
nedohraného kola nabízel dřív dvě rovnocenná tlačítka - „Zpět do hry" a „Nové
kolo", které ale u nedohraného kola ve skutečnosti znamenalo „zahoď rozehrané
kolo" a rovnou to potvrzovalo dialogem. Jediná očekávaná akce u průběžných
výsledků je pokračovat ve hře, proto je teď „Zpět do hry" jediné plnohodnotné
tlačítko a zahození je podřazený odkaz „Zahodit rozehrané kolo" s jasnějším
potvrzením. U dohraného kola (kolo je bezpečně v archivu) zůstávají „Upravit
skóre" a „Nové kolo" rovnocenná tlačítka jako dřív - tam žádné riziko ztráty
dat není.

## 30. Appka se jmenuje Fairsome

**Kontext.** Pracovní jméno „Golf Games" popisovalo, co appka dělá, ale
nedalo se pod ním nic postavit: je to obecné spojení, na ploše telefonu
vypadá jako složka a v katalogu hřišť i v zálohách se objevovalo jako
značka, kterou nikdo nezvolil.

**Rozhodnutí.** Appka se jmenuje **Fairsome**. Dva překrývající se kruhy ve
wordmarku narážejí na „-some" (twosome, foursome - běžná golfová slova pro
počet hráčů ve skupině), „Fair" na fairway i na poctivou hru.

**Kde všude jméno je.** Manifest PWA (`name`, `short_name` ve
`vite.config.ts` - tohle je to, co telefon nabídne při ukládání na plochu),
`<title>` a `apple-mobile-web-app-title` v `index.html`, úvodní obrazovka
před načtením appky, texty v `src/i18n/` (nabídka instalace, chybová hláška
u zálohy, kredit katalogu hřišť), obrazovka soukromí a `public/soukromi.html`.
Wordmark na `HomeScreen` je jediné místo, kde jméno není text, ale značka.

**Co se nepřejmenovává.** `BACKUP_FORMAT` v `backup.ts` zůstává
`'golfgames-backup'` - je to marker uvnitř souboru zálohy a přejmenování by
znamenalo, že appka odmítne všechny dosud vytvořené zálohy. Jméno souboru
(`fairsome-zaloha-*.json`) se změnit smí, protože import se řídí markerem,
ne názvem. Repozitář, npm balíček ani doména se nepřejmenovávají - je to
zbytečný zásah do nasazení za nulový přínos pro uživatele.

## 31. Archivní kolo se opravuje na místě

**Kontext.** Detail odehraného kola (`ResultsScreen` s `readOnly`) byl jen ke
čtení. Opravit skóre šlo jedině u kola, které bylo zároveň to rozehrané -
tlačítkem „Upravit skóre", které kolu smaže `finishedAt` a vrátí ho do zápisu.
Jenže hraje se o peníze a skóre se dopočítává i po hře: přehlédnutý zápis,
špatně sečtená jamka, dodatečně přiznaný Longest. Kdo mezitím založil další
kolo, měl archiv zamčený.

**Rozhodnutí.** Detail archivního kola nabízí „Upravit skóre" a otevře **ten
samý `PlayScreen`** jako na hřišti (`editing` prop). Opravuje se skóre, extra
body, par i setup jamky - stejná pravidla, stejné ovládání, žádná druhá
obrazovka na to samé.

**Zapisuje se přímo do archivu, ne do rozehraného kola.** Na hřišti se dá
dohrávat jedno kolo a zpětně opravovat jiné; kdyby oprava zabrala slot
rozehraného kola, přišlo by se o rozehranou hru. `App.tsx` proto posílá změny
přes `updateRound()`, které míří buď na `round`, nebo na záznam v archivu -
podle toho, jestli je otevřená oprava. Které kolo se opravuje, se **neukládá
do vlastního stavu**, ale odvozuje z `view === 'archiveEdit'` a
`openArchiveId`; jinak by se po zpět/swipe (obnovuje se jen `NavSnapshot`)
editace rozešla s tím, co je vidět. Když je opravované kolo zároveň to
rozehrané (typicky právě dohraná hra), zapíše se do obojího - jinak by se po
restartu appky vrátila neopravená verze.

**`archiveRound()` se na opravu nepoužívá.** Staví kolo na začátek archivu,
což je správné při ukládání dohraného kola, ale u opravy by se rok stará hra
vytáhla na první místo v archivu a na domovskou obrazovku jako „poslední
odehraná". Oprava proto jde přes `updateArchivedRound()`, které kolo přepíše
na jeho místě.

**Kolo zůstává dohrané.** Oprava `finishedAt` nemaže, takže se kolo nikdy
nevrátí do stavu „rozehrané" a v archivu ani v peněžním vyrovnání nezmizí.
Tlačítko v patičce se proto nejmenuje „Ukončit kolo", ale „Hotovo, zpět do
archivu" - ukládá se průběžně a není co potvrzovat. Chybějící jamky se u
opravy nevypisují: u odehraného kola je to informace bez rozhodnutí.

**Ukládá se každá změna, ne až odchod.** Stejné pravidlo jako u rozehraného
kola - appku může telefon zabít kdykoli a data drží jen `localStorage`.
Synchronizaci se oprava hlásí jen když se opravdu změnila data
(`updatedAt`), takže listování jamkami v archivu nic do cloudu neposílá.

## 32. Obrazovka je vysoká jako displej, roluje se obsah

**Kontext.** Obrazovka byla vysoká podle obsahu, posouvala se celá stránka
a patička s hlavním tlačítkem se držela dole přes `position: sticky`.
V prohlížeči to fungovalo. V nainstalované PWA na iOS ne: při tažení prstem
se patička odlepila, zůstala stát doprostřed displeje a překryla obsah pod
sebou. Sticky patička je na iOS posouvaná kompozitorem podle omezení
spočítaného při layoutu, takže jakákoli změna výšky dokumentu pod rukou
(přepnutí způsobu vyrovnání, dorolování na konec) ji nechá na místě, kde
zůstat nemá.

**Rozhodnutí.** `.screen` je vysoká `100dvh` s `overflow: hidden` a roluje se
jen `.content` uvnitř. Hlavička i patička jsou obyčejné položky flexu, které
nemá co posunout - pod nimi se nikdy nic neposouvá. Je to rozvržení
aplikace, ne webové stránky, což je přesně to, co appka na hřišti má být.

**Co to mění.** Hlavička zůstává vidět pořád, takže tlačítko zpět v jejím
levém rohu je dosažitelné i uprostřed dlouhé scorekarty - dřív odrolovalo
z displeje. Nová obrazovka vždycky začíná na svém začátku (dřív si stránka
nesla posuv z té předchozí). V prohlížeči zůstane lišta s adresou trvale
rozbalená, protože stránka nemá čím rolovat - v nainstalované PWA, což je
cílový režim, žádná není.

**Kdo o posuvu ví.** `window.scrollY` je vždycky nula. Obnovení posuvu při
návratu z podobrazovky zakládání kola proto čte `scrollTop` na `.content`
(`contentScroller()` v `App.tsx`) a testy rozvržení mají
`scrollContentToEnd()` v `e2e/helpers.ts`. Kontrola vodorovného přetečení měří
kromě stránky i `.content` - přeteklý prvek by roztáhl do šířky jeho, ne
stránku, a test by o něm mlčel.

## 33. Společný míč se ukládá oběma partnerům

**Kontext.** Foursome hraje dvojice jedním míčem, takže na jamku má jediné
skóre. `Round.scores` je ale mapa **po hráčích** a je to invariant, na kterém
stojí archiv, synchronizace i všechny ostatní hry.

**Zvažované varianty.** Nové pole `Round.teamScores` by znamenalo migraci
uložených kol a majoritní verzi kvůli jedné hře. Uložit skóre jen prvnímu
partnerovi je horší: chybějící zápis u druhého znamená v celé aplikaci
„vzdaná jamka“, takže by partner vzdával každou jamku kola a předčasně
ukončené kolo by hlásilo nesmysly.

**Rozhodnutí.** Hodnota se ukládá **oběma partnerům**. Zajišťuje to
`App.setScore()` podle `GameDefinition.sharedBall`, takže se o to nestará ani
hra, ani obrazovka - a mazání zápisu přidržením funguje stejně. Data zůstávají
ve stejném tvaru, takže starý archiv i cloud fungují bez migrace.

**Co z toho plyne pro UI.** Dva stejné sloupce ve scorekartě by z karty dělaly
hádanku („hrál každý pět, nebo dvojice jednou pět?“), takže při `sharedBall`
má dvojice jeden sloupec pojmenovaný po ní a jeden řádek v zápisu skóre.
Celkové rány dvojice se čtou přes prvního partnera - jsou u obou stejné.

**Netto** dvojice stojí na `pairPlayingHandicap()`: polovina součtu hracích
handicapů obou partnerů, zaokrouhlená na celé rány (WHS pro foursome). Půl
rány na jamce neexistuje, proto se zaokrouhluje handicap, ne výsledek.

## 34. Dva zápasy v jednom flightu se nemíchají

**Kontext.** Čtyři hráči v jednom flightu často hrají dvě samostatné jamkovky
1 na 1. Appka do té doby umožňovala jen hry, ve kterých celý flight hraje
jednu hru.

**Rozhodnutí.** Nová hra „Dvě jamkovky 1 na 1“ používá `Round.teams` jako
**soupeře jednoho zápasu**, ne jako partnery (`pairingKind: 'opponents'`).
Model kola se tím nemění a zakládání kola používá stejnou volbu dvojic, jen
pod jménem Soupeři a se čtením „Mac vs. Michal“.

**Peníze každý zápas zvlášť.** `settleRound()` počítá zůstatky každý proti
každému, což by ve dvou nezávislých zápasech znamenalo platby přes hry, které
spolu nemají nic společného. Hra proto deklaruje `settlementGroups()` a
vyrovnání spočítá `settleGroups()` - každá skupina sama za sebe, výsledky se
slepí do jednoho přehledu. Tvar výsledku zůstává stejný, takže obrazovka
výsledků nic dalšího neřeší.

**Rozehraná jamka je vlastnost zápasu, ne flightu.** Konvence „na jamce
zapsal aspoň jeden hráč, tedy jamka běží a komu zápis chybí, ten ji vzdal“
platí v celé aplikaci a pro jednu společnou hru je správná. U dvou zápasů by
ale zápis prvního udělal ze druhého vzdanou jamku pro oba jeho hráče, dokud
nezapíšou. Jamka proto běží podle dvou hráčů daného zápasu.

**Pořadí ve výsledkové tabulce** je podle vyhraných jamek celého flightu, i
když se dva zápasy poměřovat nedají. Je to jediné pořadí, které mají výsledky
a archiv společné, a skutečný výsledek zápasu je hned u řádku (`1 UP`, `AS`)
včetně jména soupeře. Dvě samostatné tabulky by tuhle informaci rozdělily a
peněžní vyrovnání by ztratilo jediný podklad.

## 35. Dvojice mají vlastní krok a jdou změnit i v rozehraném kole

**Kontext.** Volba dvojic byla sekce pod seznamem her v kroku „Hra a dvojice"
(#29). Na telefonu se pod sedm her nevešla bez rolování, a hlavně: jakmile
kolo začalo, nedalo se k ní vrátit. Přitom se dvojice na jamce mění častěji
než cokoli jiného - někdo dojde později, hráči se přeskupí po první devítce.

Zpět z rozehraného kola navíc **mazalo data**. Kroky zakládání zůstaly
v historii prohlížeče, ale `startRound()` po založení rozepsané kolo uklidí,
takže zpět/swipe přistálo na kroku s prázdnými jmény a výchozí hrou - a
tlačítko „Začít kolo" pak rozehrané kolo i se zapsaným skóre přepsalo novým
prázdným. Gesto zpět a tlačítko zpět na tom byly stejně, protože obojí končí
v `history.back()`.

**Rozhodnutí.** Tři věci dohromady:

1. **Dvojice jsou vlastní krok** (`SetupPairingScreen`), v řadě kroků mezi
   hrou a sázkou. Objeví se jen tam, kde je co dělit (čtyři hráči a hra ve
   dvojicích), takže u dvou hráčů řada kroků zůstává stejná. Krok „Hra"
   ukazuje zvolené dvojice na řádku a odkazuje na ně.
2. **Kroky se dají otevřít i z rozehraného kola** - odkazem „Dvojice"
   (u dvou jamkovek „Soupeři", u her jednotlivců „Hra") pod zápisem skóre,
   nebo šipkou zpět u čísla jamky: na první jamce není kam listovat, takže
   místo nečinné šipky vede na nastavení kola.
   Obrazovky pak nečtou rozepsané kolo, ale **přímo `Round`**: volba se
   uplatní hned na kolo a nemá s čím se rozejít. Patička nekončí krokem
   „Další", ale „Zpět ke hře".
3. **Krok zakládání platí jen pro svůj stav.** `NavSnapshot` si nese
   `setupRoundId`: `null` znamená rozepsané nové kolo (platí jen dokud žádné
   jiné neexistuje), id znamená úpravu nastavení toho kola (platí, dokud kolo
   běží). Neplatný krok z historie skončí tam, kam patří stav kola - zápis
   skóre, výsledky, domovská obrazovka. Krok v historii zůstává, takže další
   zpět pokračuje dál a appka jde nakonec opustit.

**Změna dvojic přepočítá kolo od začátku a nikdy nesmaže skóre.** Všechny hry
počítají výsledek ze `Round.scores` až při zobrazení, takže „přepočítat" tady
neznamená žádnou migraci dat: stačí přepsat `Round.teams` a výsledek i peníze
se spočítají znovu, i pro jamky zapsané dřív. Zapsané skóre je při tom
nedotknutelné (nepřekročitelné pravidlo 11 v `AGENTS.md`) - `applyRoundGame()`
mění jen `gameId`, `teams` a nastavení bodování nové hry.

**Změna hry ano, změna hráčů a hřiště ne.** Hra se v rozehraném kole měnit dá
(„říkali jsme skins, ale hrajeme jamkovku") a je to bezpečné - skóre zůstává,
dvojice se podle nové hry postaví nebo zruší. Jména, handicapy, odpaliště,
hřiště a počet jamek se zatím měnit nedají: obrazovky hráčů a odpališť staví
handicapy z katalogu hřišť a z výřezu devítek, který si kolo nepamatuje
(`Round.course` je snímek, ne volba). Ubrání hráče by navíc znamenalo smazat
jeho skóre, což pravidlo 11 zakazuje. Je to otevřená otázka níž, ne opomenutí.

**Proč `PAIRINGS` a přepočet nejsou v obrazovce.** `src/roundSetup.ts` drží
rozdělení hráčů do dvojic, jejich čtení z kola (`pairingIndexOf()`) i změnu
nastavení rozehraného kola. Dřív byla tabulka dvojic v `SetupGameScreen` a
uplatňovala se v `SetupBetScreen` - dvě obrazovky se tak musely shodnout na
významu jednoho indexu. Teď je to čistá funkce nad `Round`, otestovaná
v `roundSetup.test.ts`, a obrazovky ji jen volají.

## 36. Krátké jméno a jeden řádek na zápas v hlavičce jamky

**Kontext.** Hlavička jamky ukazovala u dvou jamkovek ve flightu „kdo s kým
hraje → kdo vede": `Alexandra vs. M… → Alexandra 2 UP`. S opravdovými jmény
se to uřízlo na obojí straně a poznámka pod stavy (`dormie · zbývají 2 jamky`)
patřila jednomu z zápasů, ale nebylo poznat kterému. Dlouhé jméno navíc
v řádku hráče vytlačilo tečky handicapu a zisk z jamky úplně mimo displej,
protože jméno i značky byly v jednom oříznutém prvku.

**Rozhodnutí.** V hlavičce je jeden řádek na zápas: `Alexandra 2 UP dormie`.
Soupeře ukazuje blok zápasu pod tím, takže se v hlavičce nemusí opakovat -
a stav zápasu se naopak přestal opakovat v bloku. Poznámka je součástí řádku
zápasu (`HeaderSummary.entries[].note`), zbývající jamky platí pro celý flight
a zůstávají jednou pod nimi.

**Jméno se zkracuje, informace ne.** `shortPlayerName()` bere první slovo
jména (a při shodě přidá iniciálu dalšího), protože „Alexandra" je čitelnější
než „Alexandra Pánik…". V řádku hráče se zkracuje jen text jména; tečky
handicapu, značky bonusů a zisk z jamky mají `flex: 0 0 auto` a nezmizí nikdy -
právě ony jsou při zápisu skóre ta informace, kvůli které se na řádek koukáš.

**Odkazy pod zápisem skóre jsou kratší.** Přidání odkazu na nastavení kola by
řádek odkazů zalomilo na dva a zápis čtyř hráčů by přerostl displej
(nepřekročitelné pravidlo 10). Místo výjimky z pravidla se zkrátily popisky:
„Výsledky", „Dvojice", „Ukončit", „Účet". Čtyři odkazy se tak vejdou na jeden
řádek i se zapsaným skóre - dřív se na dva lámaly už tři.

## 37. Extra body jako vedlejší sázka

**Kontext.** O extra body (Longest, Nearest, bunker, voda, barkie, arnie) se
dalo hrát jen u her, které samy rozdávají body: Best + Součet, Levá-Pravá
a Skins si je počítaly do svého skóre. Jamkovka, Foursome, dvě jamkovky,
Stableford ani Dots je nenabízely vůbec, protože do jejich jednotek přičíst
nejdou - bunker přilepený k vyhraným jamkám by rozbil stav zápasu (`2 UP` už
by neznamenalo dvě jamky) a ve Stablefordu by tvrdil, že hráč nastřílel body
proti paru. Na hřišti se přitom o Longest hraje bez ohledu na to, jaká hra
zrovna běží.

**Rozhodnutí.** Extra body se od téhle verze nabízejí **u každé hry**. Tam,
kde je hra neumí vzít do svého bodování, jsou **vedlejší sázka**
(`src/games/sideBets.ts`):

1. **Vlastní tabulka „Extra body"** ve výsledcích. Hlavní tabulka zůstává tím,
   co spočítala hra - pořadí v jamkovce drží vyhrané jamky, ne bunkery.
2. **Body vstupují do peněžního vyrovnání** té samé hry přes nový
   `GameDefinition.settlementParties()`. Hodnota bodu je v kole jedna, takže
   vyhraná jamka a extra bod mají stejnou cenu; u dvou jamkovek ve flightu se
   sázka vyrovnává v rámci zápasu (rozhodnutí #34 platí dál), u dvojic mezi
   dvojicemi.
3. **Výchozí hodnoty jsou nulové.** `loadGameOptions()` je u her s vedlejší
   sázkou nastaví na nulu, takže dokud si někdo hodnotu nezadá, appka se chová
   úplně jako dřív - tlačítko s hvězdičkou se u zápisu skóre ani nenabídne.
   Hry, které extra body počítaly odjakživa, si nechávají hodnoty z katalogu,
   aby se nikomu nezměnilo rozehrané ani archivní kolo.

**Proč ne přičtení do hlavní tabulky.** Bylo by to o jeden soubor méně, ale
tabulka by lhala: `rankRows()` řadí podle `row.value`, takže hráč, který zápas
prohrál a nasbíral bunkery, by v jamkovce skončil první. `valueLabel` navíc
u jamkovky ukazuje `2 UP` - text a číslo by si přestaly odpovídat.

**Proč jedna hodnota bodu na všechno.** Kolo má jedinou sázku (`pointValue`),
takže „jamka za 50 a Longest za 100" by znamenalo druhou hodnotu v modelu
kola a migraci. Stejného výsledku se dosáhne hodnotou extra bodu: Longest za
dvojnásobek jamky je prostě `2`.

**Volba „Uplatňovat HCP" a co všechno je bonus za výsledek.** Násobič za
výsledek stál odjakživa na brutto výsledku (viz nejčastější zdroje chyb
v `AGENTS.md`), zatímco body za birdie a eagle v Best + Součtu se počítaly
netto. Dvě různá pravidla pro „co je birdie" v jedné hře nikdo neuhádne -
otázka „proč má dvojice tři body, když nikdo nedal birdie?" přišla hned při
prvním netto kole. Volba `multipliersWithHandicap` (v nastavení bodování hry
pod násobiči, **výchozí vypnuto**) proto rozhoduje o **všech** bonusech za
výsledek: birdie a eagle dvojice, násobič extra bodů i „birdie" u smetení
v Dots. Rozhoduje o tom jediná funkce `bonusDiffToPar()` v `handicap.ts`;
každý další výpočet bonusu se musí ptát jí. Kvůli tomu se `playerBonusPoints()`
přestěhoval z `types.ts` do `handicap.ts`: osobní par se bez rozdělení ran
spočítat nedá.

**Co volba nemění.** Kdo jamku vyhrál - `BEST`, součet, skin, jamkovka, pořadí
v Dots, body ve Stablefordu - se v netto kole počítá z netto ran vždycky. Netto
je způsob, jak hrát proti sobě s různým handicapem; bonus za výsledek je
naopak odměna za skutečně zahranou jamku, a právě tam se hráči rozcházejí.

**Archiv si nechává pravidlo, se kterým se hrálo.** Dohrané kolo bez volby
v uložených datech se hrálo v době, kdy se birdie počítalo netto vždycky -
`normalizeRound()` mu proto volbu doplní jako zapnutou. Nová výchozí hodnota
platí pro kola založená potom. Bez toho by se archivu zpětně změnily body
i peníze, které jsou dávno vyrovnané.

**Rozpis bodů u jamky.** Aby se stejná otázka nemusela luštit znovu, dodává hra
`holeBreakdown()`: každý zdroj bodů zvlášť, s číslem, ze kterého se rozhodovalo,
a s nulami u bonusů, které se nepočítaly. V řádku u jamky zůstávají jen tři
čísla (BEST, součet, body) a modré „i" vedle nich otevře celý rozpis - názvy
jako „Bunker (sandie)" řádek zalomily na dva a zápis skóre pak u čtyř hráčů
přerostl displej. Obrazovka o pravidlech pořád nic neví - jen vykreslí, co
dostane.

**Nepotvrzený Longest u vedlejší sázky propadá.** V týmové hře přechází na
soupeřovu dvojici, ale ve Stablefordu nebo Dots žádná soupeřova strana není -
a rozdávat propadlý bod „všem ostatním" by z vedlejší sázky udělalo další
pravidlo. Výpočet je proto stejný jako u Skins, které to řeší od začátku.

---

## Otevřené otázky

Věci, o kterých padlo rozhodnutí je odložit:

- **Kolo delší než osmnáct jamek.** Resort s 27 jamkami by šlo odehrát celý,
  ale hry počítají s dvojnásobnou devátou a osmnáctou jamkou a peníze s jedním
  kolem. Skládání je proto zastropované na osmnáctce.
- **Devítka hraná dvakrát.** ČGF normuje i „Forest & Forest" a devítková
  hřiště mívají osmnáctijamkovou normu na dvě kola. Aplikace to umí, když
  hřiště devítky deklaruje; u obyčejné devítky se zatím hraje devět jamek.
- **Extra body v dalších hrách.** Best + Součet a Skins je vyhodnocují,
  Match play je záměrně nepoužívá. Nová hra musí rozsah deklarovat přes
  `GameDefinition.scoringOptions`.
- **Změna hráčů a hřiště v rozehraném kole.** Hra a dvojice se změnit dají
  (#35), jména, handicapy a odpaliště ne. Kolo si nepamatuje volbu devítek ani
  odkaz do katalogu hřišť, ze kterých se hrací handicapy počítaly, takže by se
  musely brát ze snímku `Round.course` - a ubrání hráče by znamenalo smazat
  jeho skóre, což pravidlo 11 zakazuje.
- **Sdílená kola mezi hráči.** Synchronizace dnes zálohuje data jednoho účtu.
  Aby viděli kolo všichni zúčastnění, potřebovalo by se řešit pozvání,
  oprávnění a souběžný zápis – to je řádově větší úloha než dnešní zrcadlo.
- **Vlastní hosting Firebase.** Přesun z GitHub Pages na Firebase Hosting by
  z přihlašovací obrazovky Google odstranil doménu `firebaseapp.com`. Pořád
  zdarma, ale je to zásah do celého nasazovacího řetězce.
- **Další jazyky.** Přidání je jen nový katalog vedle `cs.ts` a `en.ts`; kód
  se měnit nemusí. Zatím na ně není poptávka.
- **Další měny.** Sázka umí Kč a €. S angličtinou by dávaly smysl i libry
  a dolary - je to jen rozšíření `Currency` a výchozích hodnot.
