# Pravidla her

Referenční popis toho, jak aplikace jednotlivé hry vyhodnocuje. Každá hra je
implementovaná v samostatném souboru v `src/games/` a pokrytá testy vedle něj.

Společné pro všechny hry:

- Zapisuje se **hrubé skóre** (počet ran). Handicapy se zatím nepoužívají.
- Par každé jamky se nastavuje při hře (3, 4 nebo 5), výchozí je 4.
- Průběžné pořadí se počítá jen z jamek, které už mají zápis, takže tabulka
  dává smysl i uprostřed kola.
- Kolo lze hrát na 9 nebo 18 jamek.

## Obsah

- [Vzdaná jamka vs. nehraná jamka](#vzdaná-jamka-vs-nehraná-jamka)
- [Předčasně ukončené kolo](#předčasně-ukončené-kolo)
- [Extra body](#extra-body)
- [Nastavení bodování hry](#nastavení-bodování-hry)
- [Sázka a peněžní vyrovnání](#sázka-a-peněžní-vyrovnání)
- [Značky výsledku na jamce](#značky-výsledku-na-jamce)
- [Best Aggregate](#best-aggregate) · [Skins](#skins) · [Match play](#match-play)
- [Přidání další hry](#přidání-další-hry)

## Vzdaná jamka vs. nehraná jamka

Chybějící zápis znamená dvě různé věci a aplikace je rozlišuje podle toho,
jestli na jamce zapsal **aspoň jeden** hráč:

| Stav jamky                 | Význam                 | Dopad na body              |
| -------------------------- | ---------------------- | -------------------------- |
| Nikdo nezapsal             | ještě se na ni nedošlo | nezapočítá se nikomu       |
| Někdo zapsal, někomu chybí | ten hráč jamku vzdal   | vzdaný hráč jamku prohrává |

Vzdaná jamka se tedy počítá, a to v neprospěch toho, kdo ji nedohrál:

- **Best Aggregate** – do součtu dvojice se počítají rány těch, kdo dohráli,
  ale přednost má dvojice s **víc dohranými míči**; při stejném počtu rozhoduje
  nižší součet. Škrtnutím špatného míče si tak dvojice nepomůže. **Lepší míč**
  jí zůstává, dokud ho drží aspoň jeden z partnerů; když vzdali oba, ztrácí
  i ten.
- **Skins** – kdo jamku vzdal, se o skin ucházet nemůže; skin bere nejnižší
  z těch, kdo dohráli.
- **Match play** – kdo jamku vzdal, ji prohrává.

Při zápisu je vzdaný výsledek označený slovem „vzdáno“.

## Předčasně ukončené kolo

Kolo jde uložit i nedohrané – třeba když hru ukončí počasí. Slouží k tomu
odkaz **Ukončit kolo** u zápisu skóre, dostupný na kterékoli jamce.

Před uložením aplikace vypíše, co chybí, a rozliší přitom obojí: jamky se
scházejícím zápisem (počítají se jako vzdané) a jamky, na které se vůbec
nedošlo (nezapočítají se). Uložení je pak potřeba potvrdit, aby kolo nešlo
ukončit omylem.

V archivu je u takového kola vidět rozsah, například „5 z 18 jamek“.

## Extra body

Vedle bodů za samotné skóre si hráč u jamky může zaškrtnout **extra body** –
bonusy za způsob, jakým jamku zahrál. Vybírají se tlačítkem s hvězdičkou
u jména hráče.

| Bonus                 | Značka | Výchozí | Kdy se nabízí | Za co                                          |
| --------------------- | ------ | ------- | ------------- | ---------------------------------------------- |
| **Dvojnásobná sázka** | `×2`   | zapnuto | vždy          | zdvojnásobí sázku na dané jamce                |
| **Longest**           | `L`    | 1 b.    | jen par 5     | nejdelší odpal; na jamce jen pro jednoho hráče |
| **Nearest**           | `N`    | 1 b.    | jen par 3     | nejbližší rána k jamce; jen pro jednoho hráče  |
| **Bunker (sandie)**   | –      | 1 b.    | vždy          | rána z bunkeru a přesto dobrý výsledek         |
| **Double bunker**     | –      | 3 b.    | vždy          | dva bunkery na jedné jamce                     |
| **Water**             | –      | 1 b.    | vždy          | míč ve vodě a přesto dobrý výsledek            |
| **Barkie**            | –      | 1 b.    | vždy          | trefa do stromu a přesto dobrý výsledek        |
| **Arnie**             | –      | 1 b.    | vždy          | dobrý výsledek, aniž by míč byl na fairwayi    |

Hodnota `0` znamená vypnuto – takový bonus se při zápisu vůbec nenabídne.

### Komu bonus připadne

Příjemce extra bodu určuje konkrétní hra. V týmových hrách se extra bod
uhraný jedním hráčem počítá celé jeho dvojici. Ve hře Skins, která se hraje
za jednotlivce, se počítá hráči, který ho uhrál. Nová hra tenhle rozsah
deklaruje v `GameDefinition.scoringOptions`.

### Násobení podle výsledku

Nastavená hodnota platí za **par**. Lepší výsledek ji násobí, horší než par
extra bod vůbec nepřizná:

| Výsledek na jamce | Násobič (výchozí) |
| ----------------- | ----------------- |
| Par               | ×1 (napevno)      |
| Birdie            | ×2                |
| Eagle             | ×3                |
| Albatros          | ×10               |
| Condor a lepší    | ×1000             |
| Bogey a horší     | ×0 – nepočítá se  |

Násobiče kromě paru jsou konfigurovatelné v nastavení bodování hry.

Příklad: bunker za 1 bod zahraný na birdie dá v Best Aggregate dvojici
2 body, ve Skins hráči 2 body; stejný bunker zahraný na bogey nedá nic.

### Longest a Nearest

Tyhle dva bonusy drží na jamce vždy jen **jeden hráč** – když ho zaškrtne
někdo další, prvnímu se odebere.

Jsou navázané na par jamky (Longest par 5, Nearest par 3). Když se par
jamky dodatečně opraví, zapsaný bonus se **smaže** – jinak by se počítal na
jamce, kde ho vůbec nejde zvolit. Zpětná oprava paru ho neobnoví, na správné
jamce se zaškrtne znovu.

Ve výchozím stavu se **potvrzují**: hráč musí jamku dohrát na par nebo líp.
V týmových hrách jinak bod propadá soupeřově dvojici. Ve Skins se při
horším výsledku bonus nepočítá, protože tam není soupeřova dvojice, které by
šel připsat. Potvrzování jde pro každý z nich zvlášť vypnout.

Značka u jména napoví, jak to dopadne:

| Barva značky | Význam                                |
| ------------ | ------------------------------------- |
| zelená       | bod zůstává vlastní dvojici           |
| červená      | bod propadá soupeřům                  |
| tlumená      | hráč jamku ještě nezapsal, není jasno |

Na rozdíl od ostatních bonusů se jejich hodnota **nenásobí** podle výsledku –
o přiznání rozhoduje právě potvrzovací pravidlo.

### Dvojnásobná sázka

**Dvojnásobná sázka** jako jediná nepřidává body, ale **násobí sázku celé
jamky**. Každý zápis násobí zvlášť, takže dva zápisy na jedné jamce znamenají
čtyřnásobek. S dvojnásobnou 9./18. jamkou se násobí dohromady.

Volba **Nenásobit extra body** nechá extra body v základní hodnotě, i když se
zbytek jamky násobí.

## Nastavení bodování hry

Obrazovka **Nastavení bodování hry** (odkaz pod výběrem hry) drží volby
**zvlášť pro každou hru** – Best Aggregate a Skins si je nepřepisují navzájem.

| Volba                         | Výchozí     | Popis                                            |
| ----------------------------- | ----------- | ------------------------------------------------ |
| Hodnoty extra bodů            | viz výš     | 0 = vypnuto                                      |
| Násobiče za výsledek          | 2/3/10/1000 | birdie, eagle, albatros, condor                  |
| Dvojnásobná sázka             | zapnuto     | volba, která násobí sázku na jamce               |
| 9. a 18. jamka za dvojnásobek | zapnuto     | jen u her, které to podporují                    |
| Nenásobit extra body          | vypnuto     | dvojnásobná jamka ani double nenásobí extra body |
| Potvrzovat Longest            | zapnuto     | při horším než par bod propadá soupeřům          |
| Potvrzovat Nearest            | zapnuto     | při horším než par bod propadá soupeřům          |
| Double Best                   | 1 b.        | jen Best Aggregate; bod za oba lepší míče        |

Nabídka voleb je **pro každou hru zvlášť**. U každé hry se otevírá ozubeným
tlačítkem přímo u její karty. Best Aggregate má týmové bonusy a Double Best,
Skins má hráčské bonusy a vlastní extra skóre, Match play další extra volby
nemá. Nastavení jedné hry proto nezobrazuje ani nemění volby jiné hry.

**Kolo si nastavení nese s sebou.** Při založení se dělá jeho kopie, takže
pozdější změna předvoleb nepřepočítá už odehraná kola v archivu. Ve výsledcích
je proto u každého kola sekce „Bodování kola“ s tím, jak se počítalo.

## Sázka a peněžní vyrovnání

Před kolem se nastavuje měna a hodnota jednoho bodu. Předvolby se pamatují do
dalšího kola, ale **každé kolo si nese vlastní kopii**.

| Volba        | Výchozí     | Poznámka                             |
| ------------ | ----------- | ------------------------------------ |
| Měna         | Kč          | přepínatelná na €                    |
| Hodnota bodu | 10 Kč / 1 € | libovolné číslo, i desetinné (0,5 €) |

Volba **9. a 18. jamka za dvojnásobek** je v nastavení bodování hry (ve
výchozím stavu zapnutá); u devítijamkového kola se týká poslední jamky.
Násobí **celý zisk z jamky**, tedy u Best Aggregate včetně bonusů za birdie
a eagle, u Skins hodnotu skinu i extra body v sázce. Match play volbu nenabízí – počítá se
na jamky a dvojnásobná jamka by rozbila stav zápasu i notaci `3&2`.

### Jak se počítají peníze

Výpočet je v [`src/money.ts`](../src/money.ts) a pokrytý testy. Vstupem je
první výsledková tabulka hry, takže funguje stejně pro body, skiny i vyhrané
jamky. Liší se podle toho, jestli se hraje ve dvojicích.

#### Dvojice (Best Aggregate, four-ball match play)

Spočítá se rozdíl bodů obou dvojic a přepočte se na peníze. Takhle
spočítanou částku pak platí **každý hráč prohrávající dvojice zvlášť** svému
protějšku ve vítězné dvojici – protějšky se párují podle pořadí ve dvojici,
takže první platí prvnímu a druhý druhému.

Příklad: dvojice Hráč 1 + Hráč 3 má 10 bodů, dvojice Hráč 2 + Hráč 4 tři
body. Rozdíl je 7 bodů, při desetikoruně za bod tedy 70 Kč:

| Platí  | Dostává | Částka |
| ------ | ------- | ------ |
| Hráč 2 | Hráč 1  | 70 Kč  |
| Hráč 4 | Hráč 3  | 70 Kč  |

Vítězná dvojice tedy dostane dohromady 140 Kč, každý z jejích hráčů 70 Kč.

#### Jednotlivci (Skins, match play dvou hráčů)

Každý bod navíc inkasuje hráč od každého soupeře zvlášť. Pro hráče `i` tedy

```
částka = hodnota bodu × (body_i × (počet hráčů − 1) − součet bodů ostatních)
```

Součet všech částek je vždy nula. Při dvou hráčích se výraz zjednoduší na
rozdíl bodů × hodnota bodu.

U jednotlivců výsledky zobrazí hlavní přehled jako **Celková výhra**. Pod ním
je přepínač mezi **Konkrétními jednotlivými platbami** a **Optimalizovanými
platbami**. Výchozí konkrétní rozpis ukáže každý převod mezi dvojicí hráčů.
Například při 5, 3 a 0 jednotkách a hodnotě 10 Kč za jednotku platí:

| Platí  | Dostává | Částka |
| ------ | ------- | ------ |
| Hráč 2 | Hráč 1  | 20 Kč  |
| Hráč 3 | Hráč 1  | 50 Kč  |
| Hráč 3 | Hráč 2  | 30 Kč  |

Čisté zůstatky jsou potom +70 Kč, +10 Kč a −80 Kč. Tím je vidět jak
celkový výsledek, tak jednotlivé dluhy. Volba **Optimalizované platby**
stejné zůstatky sloučí do nejmenšího možného počtu převodů:

| Platí  | Dostává | Částka |
| ------ | ------- | ------ |
| Hráč 3 | Hráč 1  | 70 Kč  |
| Hráč 3 | Hráč 2  | 10 Kč  |

Optimalizace tedy zachová stejné zůstatky, ale sníží počet plateb ze tří na
dvě.

## Značky výsledku na jamce

Výsledek každé jamky nese barvu i tvar. Stejné značky se používají ve
scorekartě i při zápisu skóre, takže je výsledek poznat hned.

| Výsledek      | Barva   | Tvar                         |
| ------------- | ------- | ---------------------------- |
| Eagle a lepší | žlutá   | kroužek s dvojitým obrysem   |
| Birdie        | červená | kroužek                      |
| Par           | modrá   | čtvereček                    |
| Bogey         | zelená  | čtvereček                    |
| Doble         | šedá    | čtvereček s dvojitým obrysem |
| Triple        | černá   | čtvereček s trojitým obrysem |

Tvar nese informaci i bez barvy (podpar do kroužku, nadpar do čtverečku),
takže scorekarta zůstane čitelná i pro barvoslepé.

Vícenásobné obrysy se kreslí **dovnitř** značky, takže všechny značky mají
stejný vnější rozměr a mřížka scorekarty zůstane pravidelná.

Jedna odchylka od předlohy kvůli tmavému motivu aplikace: mezery v trojitém
obrysu u černé jsou světlé. Kdyby měly barvu podkladu, černá značka by
s tmavým pozadím splynula a obrys by nebyl vidět.

Barvy jsou v `src/styles.css` jako proměnné `--score-*`, klasifikace
v `scoreCategory()` v [`src/types.ts`](../src/types.ts).

Hra může do scorekarty přidat vlastní sloupce (`scorecardColumns`) nebo
dekoraci hráčova výsledku (`scorecardPlayerCell`). Best Aggregate takhle
ukazuje body dvojice na každé jamce; Skins označuje vítěze skinu podbarvením
a rámečkem celé buňky a extra body zapisuje jako `+N` za výsledkem. Ve
spodním řádku pod součtem ran scorekarta Skins zobrazuje `B` v češtině a `P`
v angličtině. Nenulové extra body se zapisují jako `skiny + extra = celkem`;
pokud jsou nulové, zobrazí se jen počet skinů.

---

## Best Aggregate

**Hráči:** vždy 4, rozdělení do dvou dvojic
**Soubor:** [`src/games/bestAggregate.ts`](../src/games/bestAggregate.ts)

Bodovaná hra dvou dvojic. Na každé jamce se dvojici připisují body:

| Za co                                              | Body          |
| -------------------------------------------------- | ------------- |
| BEST – nižší lepší míč než soupeřova dvojice       | 1             |
| Součet – nižší součet ran obou partnerů            | 1             |
| Birdie kteréhokoli z partnerů                      | 1             |
| Eagle kteréhokoli z partnerů                       | 3             |
| **Double Best** – oba míče lepší než oba soupeřovy | 1 (volitelné) |
| **Extra body** – bunker, water, longest…           | dle nastavení |

Vyhrává dvojice s nejvyšším součtem bodů.

**Lepší míč** dvojice je nejnižší zapsaná rána některého z partnerů.
**Součet** je součet ran obou partnerů.

### Double Best

Volitelný bod navíc (výchozí 1, `0` = vypnuto) pro dvojici, jejíž **oba míče
byly lepší než oba míče soupeře** – tedy horší z jejích výsledků je lepší než
lepší ze soupeřových. Vzdaný míč se počítá jako nejhorší možný, takže dvojice
s nedohraným míčem Double Best nezíská.

### Násobení jamky

Body za BEST, součet, Double Best a bonusy za birdie/eagle násobí
[dvojnásobná jamka i dvojnásobná sázka](#dvojnásobná-sázka). Extra body se násobí také, pokud není
zapnutá volba „Nenásobit extra body“; Longest a Nearest se navíc nikdy nenásobí
podle výsledku.

### Rozhodnutí tam, kde pravidla mlčí

Tohle nebylo v zadání specifikované; pokud to hrajete jinak, dá se to změnit
v jednom souboru:

- **Shoda na jamce** – při stejném lepším míči nezíská bod za BEST nikdo,
  totéž platí pro součet. Jamka se tedy dělí a bod propadá.
- **Bonus za partnera zvlášť** – dvě birdie v jedné dvojici na jedné jamce
  znamenají 2 body.
- **Eagle a lepší** – albatros se boduje stejně jako eagle, tedy 3 body.
  (Týká se bodu za skóre; u extra bodů má albatros vlastní násobič.)
- **Bonus nezávisí na soupeři** – birdie a eagle se dvojici započítají bez
  ohledu na to, jak dopadla druhá dvojice.
- **Nedohraná jamka** – viz [Vzdaná jamka vs. nehraná jamka](#vzdaná-jamka-vs-nehraná-jamka).

---

## Skins

**Hráči:** 2, 3 nebo 4, každý sám za sebe
**Soubor:** [`src/games/skins.ts`](../src/games/skins.ts)

Každá jamka je jeden skin. Bere ho hráč, který ji zahraje nejnižším počtem
ran. Když se o nejnižší skóre dělí víc hráčů, skin se nepřiděluje a přenáší
se do další jamky – další rozhodnutá jamka pak vynese víc skinů najednou.

Vyhrává hráč s nejvyšším celkovým skóre, tedy součtem skinů a přiznaných
extra bodů.

### Extra body ve Skins

Skins používá stejné nastavení extra bodů, ale jejich příjemcem je vždy
jednotlivý hráč, který bonus zapsal. Extra body se započítávají do stejného
celkového skóre jako skiny a ve scorekartě se zapisují jako `+N` přímo za
výsledkem příslušného hráče. Vítězný skin je označen podbarvením a rámečkem
celé buňky, takže je zřejmé, komu patří. Hodnota bonusu se násobí výsledkem
hráče stejně jako v týmových hrách; Longest a Nearest se při potvrzování buď
započítají hráči, nebo se při horším než par nezapočítají.

### Rozhodnutí tam, kde pravidla mlčí

- **Nedohraná jamka** – jamka se vyhodnocuje, jakmile na ní někdo zapsal;
  kdo zápis nemá, tu jamku vzdal. Dokud nezapsal nikdo, bank se nemění.
- **Konec kola** – skiny přenesené z poslední jamky propadají.
- **Dvojnásobná jamka** – do hry jde rovnou dvojnásobný skin, přenesený
  i vyhraný.
- **Extra body** se počítají samostatně pro hráče a nemění bank skinů.

---

## Match play

**Hráči:** 2 (jednotlivci) nebo 4 (dvojice, four-ball)
**Soubor:** [`src/games/matchPlay.ts`](../src/games/matchPlay.ts)

Nehraje se na celkový počet ran, ale jamka po jamce. Kdo zahraje jamku líp,
jde o jednu nahoru; shodná jamka je dělená a stav nemění.

Při čtyřech hráčích jde o **four-ball**: za dvojici hraje na každé jamce
vždy její lepší míč.

Stav se zobrazuje golfovým názvoslovím:

| Zápis    | Význam                                        |
| -------- | --------------------------------------------- |
| `2 UP`   | strana vede o dvě jamky                       |
| `2 DOWN` | strana prohrává o dvě jamky                   |
| `AS`     | nerozhodně (all square)                       |
| `dormie` | náskok se rovná počtu zbývajících jamek       |
| `3&2`    | zápas skončil: 3 nahoru, když zbývaly 2 jamky |

Zápas je matematicky rozhodnutý, jakmile je náskok větší než počet
zbývajících jamek. Pravidlo 3.2a Pravidel golfu pak výsledek stanoví už na
této jamce; zbývající jamky lze v aplikaci zapsat jen jako informaci mimo
hru a do výsledku zápasu se nezapočítají.

### Rozhodnutí tam, kde pravidla mlčí

- **Nedohraná jamka** – strana bez zápisu na rozehrané jamce ji vzdala
  a prohrává; jamka, kam se nedošlo, stav nemění.
- **Dohrávání po rozhodnutí** – aplikace zápas nezastavuje. Zbylé jamky jde
  dohrát a zapsat, ale hlavička je označí jako „mimo hru“, stav ani platby
  zápasu se už nezmění.
- **Dvojnásobné jamky** hra nenabízí (`supportsDoubleHoles: false`) – rozbily
  by stav zápasu i notaci `3&2`.

---

## Přidání další hry

1. Nový soubor v `src/games/` implementující rozhraní `GameDefinition`
   z [`src/games/types.ts`](../src/games/types.ts).
2. Zaregistrovat ho v [`src/games/index.ts`](../src/games/index.ts).
3. Přidat testy `src/games/<hra>.test.ts` (pomocník `makeRound` je
   v `src/games/fixtures.ts`).
4. Popsat pravidla v tomto dokumentu.

Zbytek aplikace – zápis skóre, ukládání, archiv i výsledková tabulka – je
společný a nic dalšího se upravovat nemusí. Podrobněji to rozebírá
[`architecture.md`](architecture.md#rozhraní-hry).

Rozhraní hry vrací:

- `computeStandings(round)` – jednu nebo víc výsledkových tabulek; **první
  z nich je zároveň podkladem pro peněžní vyrovnání**
- `holeSummary(round, hole)` – nepovinné shrnutí u právě zapisované jamky;
  klíč `_game` znamená informaci k celé jamce, jinak se páruje na id dvojice
- `headerSummary(round, hole)` – nepovinné průběžné skóre a stav aktuální
  jamky v hlavičce zápisu; Match play tak zobrazuje `UP`, dormie, konečný
  výsledek i jamky mimo hru
- `scorecardPlayerCell(round, playerId, hole)` – nepovinná dekorace
  hráčova výsledku ve scorekartě; Skins ji používá pro žlutý rámeček a
  suffix extra bodů
- `scorecardPlayerTotal(round, playerId)` – nepovinný souhrn hry za celkovým
  počtem ran hráče; Skins zde zobrazuje v novém řádku pod součtem ran `B`/`P`
  a hodnotu skinů s nenulovými extra body
- `scorecardColumns(round)` – nepovinné sloupce navíc ve scorekartě

Hra také deklaruje `scoringOptions`: které bonusy, násobiče a další volby
skutečně používá a zda extra body připadnou celé dvojici, nebo jednotlivému
hráči. Obrazovka nastavení pak nezobrazuje volby, které v dané hře nemají
význam.
