# Pravidla her

Referenční popis toho, jak aplikace jednotlivé hry vyhodnocuje. Každá hra je
implementovaná v samostatném souboru v `src/games/` a pokrytá testy vedle něj.

Společné pro všechny hry:

- Zapisuje se **brutto skóre** (počet ran). Se zvoleným hřištěm lze zapnout
  netto: hráči pak dostávají rány podle svého hracího handicapu a stroke indexu
  jamky.
- Par každé jamky se nastavuje při hře (3, 4 nebo 5), výchozí je 4.
- Průběžné pořadí se počítá jen z jamek, které už mají zápis, takže tabulka
  dává smysl i uprostřed kola.
- Kolo lze hrát na 9 nebo 18 jamek. U osmnáctijamkového hřiště se navíc
  vybírá, jestli se hraje celé kolo, první devítka (1–9), nebo druhá (10–18) –
  viz [Devítka z osmnáctky](#devítka-z-osmnáctky).

## Obsah

- [Vzdaná jamka vs. nehraná jamka](#vzdaná-jamka-vs-nehraná-jamka)
- [Devítka z osmnáctky](#devítka-z-osmnáctky)
- [Hra s HCP (netto)](#hra-s-hcp-netto)
- [Předčasně ukončené kolo](#předčasně-ukončené-kolo)
- [Extra body](#extra-body)
- [Nastavení bodování hry](#nastavení-bodování-hry)
- [Sázka a peněžní vyrovnání](#sázka-a-peněžní-vyrovnání)
- [Značky výsledku na jamce](#značky-výsledku-na-jamce)
- [Best + Součet](#best-součet) · [Levá-Pravá](#levá-pravá) · [Skins](#skins) · [Stableford](#stableford) · [Dots](#dots-nine-dot--six-dot) · [Match play](#match-play) · [Foursome](#foursome) · [Dvě jamkovky 1 na 1](#dvě-jamkovky-1-na-1)
- [Přidání další hry](#přidání-další-hry)

## Kolik hráčů která hra potřebuje

Počet hráčů není doporučení, ale podmínka hry: `GameDefinition.playerCounts`
říká, které počty se v zakládání kola vůbec nabídnou, a přepnutí hry počet
hráčů srovná, když ho nová hra nepodporuje. Tabulka je tedy přepisem toho, co
hry deklarují – při změně musí sedět obojí.

| Hra                   | Hráči     | Uspořádání                                   |
| --------------------- | --------- | -------------------------------------------- |
| Best + Součet         | **4**     | dvě pevné dvojice                            |
| Levá-Pravá            | **4**     | dvojice se určují znovu na každé jamce       |
| Skins                 | **2–4**   | každý sám za sebe                            |
| Match play            | **2 a 4** | 2 jednotlivci, 4 jako dvojice (four-ball)    |
| Foursome              | **4**     | dvě dvojice, každá hraje jedním míčem        |
| Dvě jamkovky 1 na 1   | **4**     | dva samostatné zápasy jednotlivců ve flightu |
| Stableford            | **1–4**   | každý sám za sebe; jediná hra pro jednoho    |
| Dots (Nine / Six Dot) | **3**     | každý sám za sebe                            |

Tři počty stojí za vysvětlení. **Match play přeskakuje trojici**, protože zápas
má dvě strany – dva jednotlivce, nebo dvě dvojice – a tři hráči se na ně
nerozdělí. **Foursome a dvě jamkovky jsou jen pro čtyři**: první potřebuje dvě
dvojice u jednoho míče, druhá dva zápasy po dvou soupeřích. **Dots je jen pro tři**, protože se na jamce rozdává pevný počet
bodů za pořadí a obě tabulky mají tři místa (9 bodů 5-3-1, 6 bodů 4-2-0).
**Stableford jako jediný zvládne jednoho hráče**, protože se boduje proti paru,
ne proti soupeři.

**Dvojice se vybírají ve vlastním kroku** zakládání kola a jde je změnit i
uprostřed rozehraného kola (rozhodnutí #35) - hráči se na jamce přeskupí
častěji, než by se čekalo. Změna přepíše `Round.teams` a **kolo se přepočítá
od první jamky**: výsledek i peníze se počítají ze zapsaného skóre až při
zobrazení, takže i jamky zapsané dřív platí pro nové dvojice. Zapsané skóre se
při tom nikdy nemaže. U **Foursome** má změna dvojic zvláštní důsledek: míč
dvojice je uložený u obou partnerů (rozhodnutí #33), takže nová dvojice čte na
už zapsaných jamkách ránu svého prvního hráče. U **Levé-Pravé** se dvojice
takhle měnit nedají vůbec - určují se znovu na každé jamce podle první rány.

## Vzdaná jamka vs. nehraná jamka

Chybějící zápis znamená dvě různé věci a aplikace je rozlišuje podle toho,
jestli na jamce zapsal **aspoň jeden** hráč:

| Stav jamky                 | Význam                 | Dopad na body              |
| -------------------------- | ---------------------- | -------------------------- |
| Nikdo nezapsal             | ještě se na ni nedošlo | nezapočítá se nikomu       |
| Někdo zapsal, někomu chybí | ten hráč jamku vzdal   | vzdaný hráč jamku prohrává |

Vzdaná jamka se tedy počítá, a to v neprospěch toho, kdo ji nedohrál:

- **Best + Součet** – do součtu dvojice se počítají rány těch, kdo dohráli,
  ale přednost má dvojice s **víc dohranými míči**; při stejném počtu rozhoduje
  nižší součet. Škrtnutím špatného míče si tak dvojice nepomůže. **Lepší míč**
  jí zůstává, dokud ho drží aspoň jeden z partnerů; když vzdali oba, ztrácí
  i ten.
- **Skins** – kdo jamku vzdal, se o skin ucházet nemůže; skin bere nejnižší
  z těch, kdo dohráli.
- **Stableford** – vzdaná jamka je nula bodů, stejně jako netto dvojbogey a
  horší výsledek.
- **Match play** – kdo jamku vzdal, ji prohrává.

Při zápisu je vzdaný výsledek označený slovem „vzdáno“.

## Devítka z osmnáctky

Osmnáctijamkové hřiště se často hraje jen na půl kola. V zadání kola se proto
u takového hřiště místo počtu jamek vybírá rozsah:

| Volba        | Jamky | Poznámka                                      |
| ------------ | ----- | --------------------------------------------- |
| **18 jamek** | 1–18  | výchozí, celé kolo                            |
| **1–9**      | 1–9   | první devítka                                 |
| **10–18**    | 10–18 | druhá devítka; jamky se číslují dál od desíti |

Volba není jen kosmetická – každá devítka má vlastní pary a stroke indexy, a ty
se do kola vezmou právě z vybraných jamek. Konkrétně:

- **Čísla jamek** při zápisu, ve scorekartě, ve výběru extra bodů, ve výpisu
  vyhraných jamek u Skins i v hlášce o chybějících zápisech odpovídají hřišti,
  takže druhá devítka běží od 10 do 18.
- **Pary a stroke indexy** jsou výřezem hřiště. Stroke indexy se pro rozdělení
  ran přepočítají na pořadí 1–9 uvnitř hrané devítky – jinak by hráč
  s handicapem 5 dostal rány jen na jamkách s SI 1, 3 a 5.
- **Hrací handicap** se počítá z poloviny normy odpaliště, protože devítkové CR
  a SR katalog nevede. Zadává-li se handicap rovnou v ranách, bere se tak, jak
  je napsaný – to už je hrací handicap pro tohle kolo.
- **Dvojnásobná závěrečná jamka** (je-li volba zapnutá) padne u první devítky na
  jamku 9 a u druhé na jamku 18, tedy v obou případech na poslední hranou.
- **V archivu** je u druhé devítky vidět rozsah, například „9 jamek (10–18)“.

Devítijamkové hřiště žádný výběr nenabízí a bez zvoleného hřiště se jen jako
dosud volí 9, nebo 18 jamek.

## Hra s HCP (netto)

Se zvoleným hřištěm jde zapnout **hru na rány s handicapem**. Hráč pak na
jamce dostává rány podle svého hracího handicapu a stroke indexu jamky; při
zápisu i ve scorekartě je to vidět jako tečky u jeho výsledku.

**Teček je vždycky tolik, kolik ran hráč na jamce opravdu dostává** – žádný
strop. Index 54 dává ze slopovaného odpaliště hrací handicap nad 54, takže na
nejtěžších jamkách jsou to čtyři rány, a zastropovaná trojka by tvrdila, že je
mezi hráči o ránu menší rozdíl, než s jakým se počítá vítěz jamky. Scorekarta
navíc umí tečky ukázat ve dvou vztažných soustavách: **Hřiště** jsou skutečně
přidělené rány (totéž, co ukazuje zápis skóre), **Nejlepší hráč** je rozdíl
proti nejnižšímu hracímu handicapu ve flightu, jak se rozdíl tradičně zapisuje
na kartu. Ani jedno nemění skóre, jsou to jen dva pohledy na totéž.

Platí jedno pravidlo, ze kterého se odvozuje všechno ostatní: **rozdané rány
mění, kdo jamku vyhrál, ne to, jak se zahrála.**

| Co se počítá                                     | Z čeho     |
| ------------------------------------------------ | ---------- |
| Vítěz jamky ve Skins                             | netto      |
| Vítěz jamky v Match play (i lepší míč four-ball) | netto      |
| `BEST` a `Součet` v Best + Součet                | netto      |
| `Double Best`                                    | netto      |
| Body za birdie a eagle v Best + Součet           | netto      |
| Stablefordovy body                               | netto      |
| **Násobič extra bodů podle výsledku**            | **brutto** |
| **Potvrzení Longestu**                           | osobní par |
| **Potvrzení Nearestu**                           | **brutto** |
| Součty ran ve výsledcích a ve scorekartě         | brutto     |

Extra body jsou tedy jediná část bodování, kterou handicap nezvedá. Bunker za
1 bod je 1 bod bez ohledu na to, kolik teček hráč na jamce má; dva body dá až
tehdy, když jamku zahrál na **brutto** birdie. Bez toho by hráč s ranou na
jamce dostal za stejný výkon dvojnásobek a s dvěma ranami trojnásobek.

Jedinou výjimkou je potvrzování **Longestu**, které naopak stojí na osobním
paru – jinak by slabší hráč bonus na dlouhé pětiparové jamce prakticky nikdy
neuhrál. Nearest se potvrzuje brutto parem. Podrobnosti jsou v kapitole
[Potvrzování osobním parem](#potvrzování-osobním-parem).

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
Sloupec „Výchozí" v tabulce platí pro hry, které si extra body počítají do
svých bodů (Best + Součet, Levá-Pravá, Skins). **U ostatních her jsou výchozí
hodnoty nulové** – viz vedlejší sázka níž.

### O extra body jde hrát v každé hře

Extra body nejsou pravidlem žádné hry, hraje se o ně vedle ní. Rozdíl je jen
v tom, jestli je hra umí vzít do svého bodování:

| Hra                                | Extra body                                      |
| ---------------------------------- | ----------------------------------------------- |
| Best + Součet, Levá-Pravá, Skins   | součást bodů hry, výchozí hodnoty z tabulky výš |
| Match play, Foursome, dvě jamkovky | **vedlejší sázka**, výchozí hodnoty nulové      |
| Stableford, Dots                   | **vedlejší sázka**, výchozí hodnoty nulové      |

**Vedlejší sázka** (`src/games/sideBets.ts`) znamená, že extra body:

- mají ve výsledcích **vlastní tabulku „Extra body"** – do hlavní tabulky se
  přičíst nedají, protože ta drží pořadí podle pravidel hry (vyhrané jamky
  v jamkovce, body proti paru ve Stablefordu),
- **přidávají se do peněžního vyrovnání** té samé hry, protože hodnota bodu je
  v kole jedna: vyhraná jamka a extra bod mají stejnou cenu. U dvou jamkovek ve
  flightu se vyrovnávají v rámci zápasu, u dvojic mezi dvojicemi,
- začínají **na nule**, takže dokud si někdo hodnotu nezadá v nastavení
  bodování hry, appka se chová jako dřív a tlačítko s hvězdičkou se u zápisu
  vůbec nenabídne.

Pravidla samotné hodnoty jsou v obou případech stejná – násobič podle výsledku,
potvrzování Longestu a Nearestu i dvojnásobná jamka fungují identicky.

### Rozpis bodů u jamky

Body dvojice na jamce se skládají z několika zdrojů a z čísel v hlavičce se to
přečíst nedá. Vedle `Best`, `Součet` a `Body` proto stojí modré **i**, které
otevře přesný rozpis: každý zdroj s hodnotou, ze které se rozhodovalo
(`netto 3 proti 4`), včetně bonusů, které se **nepočítaly** - „Water · netto 5
→ 0" je pro hráče stejně důležitá odpověď jako přiznaný bod.

V řádku samotném zdroje nejsou schválně: s názvy jako „Bunker (sandie)" se
zalomil na dva řádky a zápis skóre se u čtyř hráčů přestal vejít na jednu
obrazovku (nepřekročitelné pravidlo 10). Rozpis dodává hra
(`GameDefinition.holeBreakdown()`), obrazovka ho jen vypíše.

### Komu bonus připadne

Příjemce extra bodu určuje konkrétní hra. V týmových hrách se extra bod
uhraný jedním hráčem počítá celé jeho dvojici (u Foursome tedy dvojici, která
hraje jedním míčem). Ve hrách jednotlivců se počítá hráči, který ho uhrál;
u vedlejší sázky pak vstupuje do jeho vyrovnání. Nová hra tenhle rozsah
deklaruje v `GameDefinition.scoringOptions`.

U vedlejší sázky **nepotvrzený Longest nebo Nearest propadá** – nedostane ho
nikdo. V týmové hře, která extra body počítá do svých bodů, přechází na
soupeřovu dvojici; ve vedlejší sázce žádná „soupeřova strana" být nemusí
(Stableford, Dots), takže by pravidlo nemělo komu bod přiznat.

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

**Uplatňovat HCP** (pod násobiči, ve výchozím stavu vypnuto) rozhoduje, z jakého
výsledku se násobič bere:

| Volba       | Co se počítá                                                                   |
| ----------- | ------------------------------------------------------------------------------ |
| **vypnuto** | skutečný výsledek: birdie je rána pod **par jamky** (brutto)                   |
| **zapnuto** | v netto kole **osobní par**: kdo dostává na jamce ránu, má za par netto birdie |

Vypnuto je výchozí stav, protože rozdané rány mění to, kdo jamku vyhrál, ne to,
jak se zahrála - jinak by hráč s tečkou na jamce dostal za bunker na par dva
body místo jednoho a se dvěma tečkami rovnou tři. Na brutto kolo volba nemá
žádný vliv, tam osobní par neexistuje.

Volba platí pro **všechny bonusy za výsledek**, ne jen pro násobič extra bodů:

| Kde                       | Co se změní                                 |
| ------------------------- | ------------------------------------------- |
| Best + Součet, Levá-Pravá | body za **birdie a eagle** partnerů         |
| všechny hry               | násobič extra bodů (bunker, water, barkie…) |
| Dots                      | „birdie" u výhry o dvě rány (volba Smetení) |

Co volba **nemění**: kdo jamku vyhrál. `BEST`, součet, skin, jamkovka, pořadí
v Dots i body ve Stablefordu se v netto kole počítají z netto ran vždycky - to
je pravidlo hry, ne bonus. Potvrzování Longestu má vlastní volbu.

**Dohraná kola v archivu** si nechávají pravidlo, se kterým se hrála: kolo
odehrané dřív, než volba existovala, se dál počítá s netto birdie, protože se
za něj tak zaplatilo.

Příklad: bunker za 1 bod zahraný na birdie dá v Best + Součet dvojici
2 body, ve Skins hráči 2 body; stejný bunker zahraný na bogey nedá nic.

**Rozhoduje brutto výsledek, i když se hraje netto.** Rozdané rány mění to, kdo
jamku vyhrál, ne to, jak se zahrála – hráč s tečkou na jamce má za bunker na
par jeden bod jako každý jiný, ne dva. Jediná výjimka je potvrzování Longestu,
které o osobní par naopak stojí (viz níž).

### Longest a Nearest

Tyhle dva bonusy drží na jamce vždy jen **jeden hráč** – když ho zaškrtne
někdo další, prvnímu se odebere.

Jsou navázané na par jamky (Longest par 5, Nearest par 3). Když se par
jamky dodatečně opraví, zapsaný bonus se **smaže** – jinak by se počítal na
jamce, kde ho vůbec nejde zvolit. Zpětná oprava paru ho neobnoví, na správné
jamce se zaškrtne znovu.

Potvrzení je **volitelné a pro každý bonus samostatné**; ve výchozím nastavení
je zapnuté. Když je zapnuté, hráč musí jamku dohrát na par nebo líp. V týmových
hrách jinak bod propadá soupeřově dvojici. Ve Skins se při horším výsledku bonus
nepočítá, protože tam není soupeřova dvojice, které by šel připsat. Po vypnutí
konkrétního přepínače se bonus přizná bez podmínky potvrzení parem.

#### Potvrzování osobním parem

**Týká se jen Longestu.** V kole s HCP se ve výchozím stavu potvrzuje
**osobním parem** – parem jamky plus ranami, které na ní hráč podle svého
handicapu dostává. Slabší hráč tak Longest uhraje bogeyem na jamce, kde má
tečku, protože netto je to par.

Kdyby se potvrzoval brutto par, byla by hra s vyrovnáním handicapů proti
slabším hráčům dvakrát: jednou na skóre a podruhé na bonusu, který by na dlouhé
pětiparové jamce prakticky nikdy nepotvrdili. Volbu **Potvrzovat Longest
osobním PARem** jde v nastavení bodování hry vypnout a vrátit se k brutto
paru. Na brutto kolo volba nemá vliv – tam žádný osobní par neexistuje.

**Nearest se potvrzuje vždycky brutto parem**, ať je volba zapnutá, nebo ne. Je
to rána na tříparovou jamku, kde délka hřiště slabšího hráče netrestá, takže
handicap na ni nepatří.

Značka u jména napoví, jak to dopadne:

| Barva značky | Význam                                |
| ------------ | ------------------------------------- |
| zelená       | bod zůstává vlastní dvojici           |
| červená      | bod propadá soupeřům                  |
| tlumená      | hráč jamku ještě nezapsal, není jasno |

Na rozdíl od ostatních bonusů se jejich hodnota **nenásobí** podle výsledku.
Když je potvrzování zapnuté, o přiznání rozhoduje potvrzovací pravidlo; při
vypnutém potvrzování bonus zůstává vlastní straně nebo hráči bez této podmínky.

### Dvojnásobná sázka

**Dvojnásobná sázka** jako jediná nepřidává body, ale **násobí sázku celé
jamky**. Každý zápis násobí zvlášť, takže dva zápisy na jedné jamce znamenají
čtyřnásobek. S dvojnásobnou 9./18. jamkou se násobí dohromady.

Volba **Nenásobit extra body** nechá extra body v základní hodnotě, i když se
zbytek jamky násobí.

## Nastavení bodování hry

Obrazovka **Nastavení bodování hry** (odkaz pod výběrem hry) drží volby
**zvlášť pro každou hru** – Best + Součet a Skins si je nepřepisují navzájem.

| Volba                          | Výchozí     | Popis                                               |
| ------------------------------ | ----------- | --------------------------------------------------- |
| Hodnoty extra bodů             | viz výš     | 0 = vypnuto                                         |
| Násobiče za výsledek           | 2/3/10/1000 | birdie, eagle, albatros, condor                     |
| Dvojnásobná sázka              | zapnuto     | volba, která násobí sázku na jamce                  |
| 9. a 18. jamka za dvojnásobek  | zapnuto     | jen u her, které to podporují                       |
| Nenásobit extra body           | vypnuto     | dvojnásobná jamka ani double nenásobí extra body    |
| Potvrzovat Longest             | zapnuto     | při horším než par bod propadá soupeřům             |
| Potvrzovat Nearest             | zapnuto     | při horším než par bod propadá soupeřům             |
| Potvrzovat Longest osob. PARem | zapnuto     | jen Longest a jen v kole s HCP; Nearest brutto      |
| Potvrzení parem                | vypnuto     | jen Skins; vítěz potvrdí výhru parem na další jamce |
| Double Best                    | 1 b.        | jen Best + Součet; bod za oba lepší míče            |

Nabídka voleb je **pro každou hru zvlášť**. U každé hry se otevírá ozubeným
tlačítkem přímo u její karty. Best + Součet má týmové bonusy a Double Best,
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
výchozím stavu zapnutá); u devítijamkového kola se týká poslední jamky, ať se
hraje devítka první (jamka 9), nebo druhá (jamka 18).
Násobí **celý zisk z jamky**, tedy u Best + Součet včetně bonusů za birdie
a eagle, u Skins hodnotu skinu i extra body v sázce. Match play volbu nenabízí – počítá se
na jamky a dvojnásobná jamka by rozbila stav zápasu i notaci `3&2`.

### Jak se počítají peníze

Výpočet je v [`src/money.ts`](../src/money.ts) a pokrytý testy. Vstupem je
první výsledková tabulka hry, takže funguje stejně pro body, skiny i vyhrané
jamky. Liší se podle toho, jestli se hraje ve dvojicích.

#### Dvojice (Best + Součet, four-ball match play)

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
dekoraci hráčova výsledku (`scorecardPlayerCell`). Best + Součet takhle
ukazuje body dvojice na každé jamce; Skins označuje vítěze skinu podbarvením
a rámečkem celé buňky a extra body zapisuje jako `+N` za výsledkem. Ve
spodním řádku pod součtem ran scorekarta Skins zobrazuje `B` v češtině a `P`
v angličtině. Stableford v netto hře přidává tečky za rány k dobru vůči
nejnižšímu hracímu handicapu ve flightu. Nenulové extra body se zapisují jako
`skiny + extra = celkem`; pokud jsou nulové, zobrazí se jen počet skinů.
Levá-Pravá přes `scorecardPlayerCell` označuje barevným rámečkem buňky první
dvojice aktuální jamky.

---

## Best + Součet

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

Při zapnutém netto se před výpočtem `BEST`, `Součtu`, `Double Best` i bodů za
birdie a eagle odečtou každému hráči rány podle jeho hracího HCP a stroke
indexu jamky. To znamená, že pro `BEST` se porovnává nejlepší netto míč a pro
`Součet` součet netto ran obou partnerů; brutto rány se používají jen ve
výchozím brutto režimu. **Extra body** se naopak násobí brutto výsledkem –
podrobně v kapitole [Hra s HCP](#hra-s-hcp-netto).

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

## Levá-Pravá (Kraje-Středy)

**Hráči:** vždy 4, dvojice se určují na každé jamce
**Soubor:** [`src/games/leftRight.ts`](../src/games/leftRight.ts)

Levá-Pravá, které se také říká **Kraje-Středy**, používá stejné bodování jako
Best + Součet, ale dvojice nejsou pevné pro celé kolo. Před každou jamkou se
vybere jedna ze tří možných dvojic podle toho, kam hráči zahráli první ránu z
odpaliště: vlevo nebo vpravo. Na každé straně jsou právě dva hráči; teprve
potom aplikace povolí zápis skóre.

Volba dvojic má tři tlačítka se jmény hráčů, stejně jako výběr dvojic u Best +
Součet. Jedním klepnutím se uloží celé složení jamky.

| Za co                                              | Body          |
| -------------------------------------------------- | ------------- |
| BEST – nižší lepší míč než druhá strana            | 1             |
| Součet – nižší součet ran obou hráčů na straně     | 1             |
| Birdie kteréhokoli hráče na straně                 | 1             |
| Eagle kteréhokoli hráče na straně                  | 3             |
| **Double Best** – oba míče lepší než oba soupeřovy | 1 (volitelné) |
| **Extra body** – bunker, water, longest…           | dle nastavení |

Body získané stranou se na dané jamce připíšou **oběma hráčům**, ale výsledky
se sčítají a zobrazují jednotlivě. První výsledková tabulka proto obsahuje
čtyři hráče a peněžní vyrovnání používá pravidla pro jednotlivce. Scorekarta
má za každým hráčem vlastní sloupec `B` s body za jeho aktuální dvojici. U
první dvojice jsou buňky se skóre na každé jamce označené barevným rámečkem;
rámeček se proto přesouvá podle zvoleného složení dvojic.

V kole s HCP se `BEST`, `Součet`, `Double Best` i birdie/eagle vyhodnocují
stejně jako u Best + Součet z netto ran. Násobič běžných extra bodů se bere z
brutto výsledku; Longest a Nearest se potvrzují podle stejného pravidla jako
u Best + Součet.

### Rozhodnutí tam, kde pravidla mlčí

- **Neúplné přiřazení** – dokud nejsou na obou stranách právě dva hráči,
  skóre ani bonusy nejdou zapsat a jamka nedává body.
- **Změna po zápisu** – dvojice jde změnit kdykoli. Zapsané skóre a bonusy
  zůstávají a body jamky se okamžitě přepočítají podle nového složení.
- **Uložení** – přiřazení se ukládá pro každou jamku zvlášť v `Round.holePairings`;
  změna dvojic na jedné jamce neovlivní žádnou jinou.
- **Vzdaná jamka** – po dokončení dvojic se řídí stejným pravidlem jako Best +
  Součet; chybějící výsledek je vzdaný míč.

---

## Skins

**Hráči:** 2, 3 nebo 4, každý sám za sebe
**Soubor:** [`src/games/skins.ts`](../src/games/skins.ts)

Každá jamka je jeden skin. Bere ho hráč, který ji zahraje nejnižším počtem
ran. Když se o nejnižší skóre dělí víc hráčů, skin se nepřiděluje a přenáší
se do další jamky – další rozhodnutá jamka pak vynese víc skinů najednou.

V kole s HCP se porovnává **netto** skóre. Když všichni zahrají jamku na
čtyři rány a jeden z nich na ní má tečku, skin bere on.

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

### Potvrzení parem

Volitelná varianta **Potvrzení parem** vyžaduje, aby hráč, který vyhrál jamku,
zahrál na následující jamce alespoň brutto par. Teprve potom se jeho výhra
započítá. Pokud zahraje bogey nebo hůř, skin se nepotvrdí a vrátí se do banku,
takže ho může získat vítěz další rozhodnuté jamky. Dokud následující jamka nemá
zápis, zůstává výhra nepotvrzená. Poslední jamka se potvrzuje automaticky,
protože už nemá další jamku, na které by šla ověřit.

V průběžném zápisu se čekající stav zobrazí vedle banku jako **Rezervuje:
hráč**. Po zapsání paru nebo lepšího výsledku se skin převede do jeho skóre;
po bogey nebo horším se vrátí do banku.

---

## Stableford

**Hráči:** 1 až 4, každý sám za sebe
**Soubor:** [`src/games/stableford.ts`](../src/games/stableford.ts)

Za výsledek vůči paru dostane hráč par 2 body, birdie 3, eagle 4, bogey 1 a
dvojbogey nebo horší 0 bodů. Vyhrává nejvyšší součet bodů; jedna zkažená jamka
tak nemůže sebrat víc než dva body.

Při zapnutém netto se od brutto skóre odečtou rány podle hracího handicapu a
stroke indexu jamky. HCP index uloženého hráče se při výběru do Stablefordu
předvyplní a nové platné indexy se zapamatují pro příště. Při porovnání hráčů
ukazuje scorekarta tečky. Přepínač vedle názvu scorekarty volí mezi plným HCP
hřiště a rozdílem hracích handicapů proti nejlepšímu hráči ve flightu; tečky
bodování nijak nemění.

### Rozhodnutí tam, kde pravidla mlčí

- **Vzdaná jamka** má nula bodů.
- **Dvojnásobná jamka** násobí získané body.
- **Tečky HCP vůči hřišti** se rozdají podle celého hracího handicapu po jamkách
  od nejtěžší podle stroke indexu.
- **Tečky HCP vůči nejlepšímu hráči** používají jen rozdíl handicapů; hráč s
  nejnižším hracím HCP žádnou nedostane. Výchozí zobrazení zůstává toto.

---

## Dots (Nine Dot / Six Dot)

**Hráči:** vždy 3, každý sám za sebe
**Soubor:** [`src/games/dots.ts`](../src/games/dots.ts)

Na každé jamce je v sázce pevný počet bodů a rozdělí se mezi tři hráče podle
pořadí. Hra má dvě varianty, které se liší jen tabulkou; přepínají se
v nastavení bodování hry.

| Výsledek jamky        | Nine Dot (9 b.) | Six Dot (6 b.) |
| --------------------- | --------------- | -------------- |
| Tři různé výsledky    | 5-3-1           | 4-2-0          |
| Dva nejlepší remizují | 4-4-1           | 3-3-0          |
| Dva nejhorší remizují | 5-2-2           | 4-1-1          |
| Remíza všech tří      | 3-3-3           | 2-2-2          |

Součet na jamce je vždy stejný (9, resp. 6), takže za osmnáct jamek se rozdá
162, resp. 108 bodů. Kdyby všichni tři hráli naprosto stejně, skončí každý na
54, resp. 36 bodech.

V anglických zdrojích se Nine Dot jmenuje **Nines** nebo **5-3-1**, Six Dot
**Split Sixes** (taky „English" nebo „6-point").

### Volitelné nadstavby

Obě jsou ve výchozím stavu **vypnuté** – jsou to domácí pravidla, ne základ
hry. Druhá se nabízí až se zapnutou první.

| Volba                            | Co dělá                                             |
| -------------------------------- | --------------------------------------------------- |
| Výhra o 2 rány bere všechny body | Jediný vítěz s náskokem ≥ 2 rány bere 9, resp. 6 b. |
| Birdie to zdvojnásobí            | Taková výhra na birdie a lepší bere 18, resp. 12 b. |

### Rozhodnutí tam, kde pravidla mlčí

- **Netto.** O pořadí na jamce rozhoduje netto skóre jako u ostatních her; tím
  pádem se z netto počítá i náskok dvou ran a birdie k němu.
- **Vzdaná jamka** je nejhorší možný výsledek, takže kdo vzdal, skončí
  poslední. Když vzdají dva, dělí se o poslední místo (5-2-2, resp. 4-1-1).
- **Smetení potřebuje zapsaný druhý výsledek.** Když zbylí dva jamku vzdali,
  nikdo neví, o kolik se vyhrálo, a devět bodů v sázce nemá stát na čísle,
  které nikdo nezapsal. Vítěz pak bere běžných 5, resp. 4 body.
- **Dvojnásobná jamka** násobí body všech hráčů včetně smetení.
- **Extra body hra nezná.** Tabulka sama odměňuje lepší výsledek na jamce
  a bonusy by ji jen rozmazaly.

Při zápisu skóre je u jména každého hráče vidět, kolik bodů mu právě zapisovaná
jamka vynesla; vítěz jamky je zvýrazněný. Celkový stav všech tří hráčů je nad
tím v hlavičce jamky.

> **Pozor na sázku.** Body tu rostou mnohem rychleji než u ostatních her –
> rozdíl 20 bodů je při desetikoruně za bod 200 Kč. Hodnotu bodu se vyplatí
> nastavit odpovídajícím dílem níž.

---

## Match play

**Hráči:** 2 (jednotlivci) nebo 4 (dvojice, four-ball)
**Soubor:** [`src/games/matchPlay.ts`](../src/games/matchPlay.ts)

Nehraje se na celkový počet ran, ale jamka po jamce. Kdo zahraje jamku líp,
jde o jednu nahoru; shodná jamka je dělená a stav nemění.

Při čtyřech hráčích jde o **four-ball**: za dvojici hraje na každé jamce
vždy její lepší míč.

V kole s HCP se jamka rozhoduje **netto**, tedy po odečtu ran přidělených podle
stroke indexu jamky – u four-ballu se netto počítá i lepší míč dvojice.

Scorekarta označuje vyhranou jamku stejným žlutým rámečkem jako Skins. U
four-ballu se označí buňky obou hráčů vítězné dvojice; dělené a po rozhodnutí
neplatné jamky se neoznačují.

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

V hlavičce zápisu se stav stran zobrazuje kompaktně barevnými hodnotami
`UP` (zeleně) a `DOWN` (červeně); dlouhá věta o tom, kdo vede a kdo prohrává,
se neopakuje. Třetí řádek ukazuje počet zbývajících jamek, `dormie`, výsledek
ve tvaru `3&1` nebo krátké „mimo hru“. Číslo aktuální jamky je v kruhu obarveném podle paru: par 3
červeně, par 4 zeleně, par 5 modře a par 6 černě. U kola s definovaným hřištěm
se par v zápisu nemění ručně, přebírá se ze scorekarty hřiště.

### Rozhodnutí tam, kde pravidla mlčí

- **Nedohraná jamka** – strana bez zápisu na rozehrané jamce ji vzdala
  a prohrává; jamka, kam se nedošlo, stav nemění.
- **Dohrávání po rozhodnutí** – aplikace zápas nezastavuje. Zbylé jamky jde
  dohrát a zapsat, ale hlavička je označí jako „mimo hru“, stav ani platby
  zápasu se už nezmění.
- **Dvojnásobné jamky** hra nenabízí (`supportsDoubleHoles: false`) – rozbily
  by stav zápasu i notaci `3&2`.

---

## Foursome

**Hráči:** 4 (dvě dvojice)
**Soubor:** [`src/games/foursome.ts`](../src/games/foursome.ts)

Jamkovka dvojic, které hrají **jedním míčem**. Dvojice na jamce jednou odpálí
a dál se v ranách střídá, takže má na jamku jediné skóre – proti four-ballu se
nevybírá lepší míč, protože žádný druhý není. Zápas na jamky se pak počítá
úplně stejně jako [Match play](#match-play) včetně notace `3&2`, dormie
a jamek mimo hru po rozhodnutí.

**Zápis skóre je jeden na dvojici.** `PlayScreen` má proto dva řádky místo
čtyř a scorekarta jeden sloupec na dvojici, pojmenovaný „Mac + Michal“.

**Netto: rány z poloviny součtu.** Hrací handicap dvojice je polovina součtu
hracích handicapů obou partnerů, zaokrouhlená na celé rány – tak to pro
foursome dělá WHS. Rány se pak rozdají po jamkách podle stroke indexu jako
u jednotlivce a tečky ve scorekartě patří dvojici, ne hráči. Se HCP 12 a 20
dostane dvojice 16 ran.

**Peníze** se počítají jako u ostatních her dvojic: rozdíl vyhraných jamek
krát hodnota bodu platí každý hráč prohrávající dvojice svému protějšku.

### Rozhodnutí tam, kde pravidla mlčí

- **Vzdaná jamka** – dvojice bez zápisu na rozehrané jamce ji vzdala. Míč je
  jeden, takže ho za ni nemá kdo dohrát a jamku bere soupeř.
- **Kdo z dvojice je „nositel“ míče** – nikdo. Skóre se ukládá oběma
  partnerům (rozhodnutí #33 v [decisions.md](decisions.md)), takže se
  celkové rány, značky ani archiv nemusí ptát, kdo zapisoval.
- **Střídání ran** aplikace nesleduje. Kdo má odpal na které jamce, je
  pravidlo hry mezi partnery; do zápisu skóre by přineslo jen další klepání.
- **Extra body a dvojnásobné jamky** hra nenabízí – stejný důvod jako
  u Match play: rozbily by stav zápasu.

---

## Dvě jamkovky 1 na 1

**Hráči:** 4 (dva zápasy po dvou)
**Soubor:** [`src/games/singlesMatches.ts`](../src/games/singlesMatches.ts)

Čtyři hráči jdou spolu v jednom flightu, ale nehrají jednu hru: běží **dva
samostatné zápasy jednotlivců**. Kdo s kým, se vybírá v kroku hry stejně jako
dvojice u ostatních čtyřhráčových her – jen se to jmenuje **Soupeři** a volby
se čtou „Mac vs. Michal · Alex vs. Petr“.

Každý zápas má vlastní stav, vlastní rozhodnutí (`3&2`) i vlastní peníze.
`Round.teams` tady neznamená partnery, ale soupeře jednoho zápasu
(`pairingKind: 'opponents'`), takže si kolo nenese žádná nová data.

Při zápisu skóre je každý zápas svým blokem s hlavičkou „Mac vs. Michal“, kde
je vidět, kdo jamku bere a jak zápas stojí. Hlavička jamky ukazuje stav obou
zápasů zároveň.

**Peníze: každý zápas zvlášť.** Rozdíl vyhraných jamek krát hodnota bodu platí
prohrávající svému soupeři. Hráči z různých zápasů si neplatí nic, i když jdou
ve stejném flightu – vyrovnání proto neprochází přes `settleRound()`, ale přes
`settleGroups()` (rozhodnutí #34).

### Rozhodnutí tam, kde pravidla mlčí

- **Rozehraná jamka platí jen pro svůj zápas.** Jinde v aplikaci stačí zápis
  kohokoli z flightu, aby jamka „běžela“. Tady by zápis prvního zápasu udělal
  ze druhého vzdanou jamku, protože jeho soupeři ještě nezapsali. Jamka proto
  běží podle dvou hráčů daného zápasu (rozhodnutí #34).
- **Pořadí v tabulce** je podle vyhraných jamek celého flightu, aby archiv i
  výsledky měly jedno pořadí. Skutečný výsledek je ale u každého řádku:
  `1 UP`, `AS`, `2 DOWN` a údaj, s kým hráč hraje.
- **Extra body a dvojnásobné jamky** hra nenabízí, stejně jako Match play.

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
- `holeSetup(round, hole)` a `setHoleSetup(...)` – nepovinný setup před
  zápisem skóre, pokud hra potřebuje doplnit stav konkrétní jamky

Hra také deklaruje `scoringOptions`: které bonusy, násobiče a další volby
skutečně používá a zda extra body připadnou celé dvojici, nebo jednotlivému
hráči. Obrazovka nastavení pak nezobrazuje volby, které v dané hře nemají
význam.
