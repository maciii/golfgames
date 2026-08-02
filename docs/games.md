# Pravidla her

Referenční popis toho, jak aplikace jednotlivé hry vyhodnocuje. Každá hra je
implementovaná v samostatném souboru v `src/games/` a pokrytá testy vedle něj.

Společné pro všechny hry:

- Zapisuje se **hrubé skóre** (počet ran). Handicapy se zatím nepoužívají.
- Par každé jamky se nastavuje při hře (3, 4 nebo 5), výchozí je 4.
- Průběžné pořadí se počítá jen z jamek, které už mají zápis, takže tabulka
  dává smysl i uprostřed kola.
- Kolo lze hrát na 9 nebo 18 jamek.

## Sázka a peněžní vyrovnání

Před kolem se nastavuje měna, hodnota jednoho bodu a případné zdvojnásobení
závěrečných jamek. Předvolby se pamatují do dalšího kola, ale **každé kolo
si nese vlastní kopii** – změna sázky proto nepřepíše archiv.

| Volba                         | Výchozí     | Poznámka                                  |
| ----------------------------- | ----------- | ----------------------------------------- |
| Měna                          | Kč          | přepínatelná na €                         |
| Hodnota bodu                  | 10 Kč / 1 € | libovolné číslo, i desetinné (0,5 €)      |
| 9. a 18. jamka za dvojnásobek | vypnuto     | u devítijamkového kola jen poslední jamka |

Dvojnásobná jamka násobí **celý zisk z jamky**, tedy u Best Aggregate včetně
bonusů za birdie a eagle, u Skins hodnotu skinu v sázce. Match play volbu
nenabízí – počítá se na jamky a dvojnásobná jamka by rozbila stav zápasu
i notaci `3&2`.

### Jak se počítají peníze

Každý bod navíc zaplatí soupeř. Při dvou stranách (dvě dvojice, dva hráči
v match play) je to prostě **rozdíl bodů × hodnota bodu** – prohrávající
strana platí vítězné.

U tří a čtyř hráčů ve Skins platí stejný princip vůči každému soupeři
zvlášť: kdo bere skin, inkasuje ho od všech ostatních. Pro stranu `i` tedy

```
částka = hodnota bodu × (body_i × (počet stran − 1) − součet bodů ostatních)
```

Součet všech částek je vždy nula. Výpočet je v
[`src/money.ts`](../src/money.ts) a pokrytý testy.

## Značky ve scorekartě

Skóre se ve scorekartě značí golfovou konvencí – tvar nese informaci i bez
barvy, takže je čitelná i pro barvoslepé a na tisku:

| Skóre             | Značka                       | Barva     |
| ----------------- | ---------------------------- | --------- |
| Eagle a lepší     | kroužek s dvojitým obrysem   | červená   |
| Birdie            | kroužek                      | červená   |
| Par               | bez značky                   | neutrální |
| Bogey             | čtvereček                    | modrá     |
| Dvojbogey a horší | čtvereček s dvojitým obrysem | modrá     |

Barevné rozdělení (podpar červeně, nadpar modře) odpovídá turnajovým
scorekartám. Par se záměrně nijak nezvýrazňuje – tvar má upozorňovat na to,
co se od paru liší.

Hra může do scorekarty přidat vlastní sloupce (`scorecardColumns`) – Best
Aggregate takhle ukazuje body dvojice na každé jamce, Skins rozdané skiny.

---

## Best Aggregate

**Hráči:** vždy 4, rozdělení do dvou dvojic
**Soubor:** [`src/games/bestAggregate.ts`](../src/games/bestAggregate.ts)

Bodovaná hra dvou dvojic. Na každé jamce se dvojici připisují body:

| Za co                                        | Body |
| -------------------------------------------- | ---- |
| BEST – nižší lepší míč než soupeřova dvojice | 1    |
| Součet – nižší součet ran obou partnerů      | 1    |
| Birdie kteréhokoli z partnerů                | 1    |
| Eagle kteréhokoli z partnerů                 | 3    |

Vyhrává dvojice s nejvyšším součtem bodů.

**Lepší míč** dvojice je nejnižší zapsaná rána některého z partnerů.
**Součet** je součet ran obou partnerů.

### Rozhodnutí tam, kde pravidla mlčí

Tohle nebylo v zadání specifikované; pokud to hrajete jinak, dá se to změnit
v jednom souboru:

- **Shoda na jamce** – při stejném lepším míči nezíská bod za BEST nikdo,
  totéž platí pro součet. Jamka se tedy dělí a bod propadá.
- **Bonus za partnera zvlášť** – dvě birdie v jedné dvojici na jedné jamce
  znamenají 2 body.
- **Eagle a lepší** – albatros se boduje stejně jako eagle, tedy 3 body.
- **Bonus bez soupeře** – birdie a eagle se dvojici započítají hned, i když
  soupeřova dvojice jamku ještě nezapsala. Body za BEST a součet se přidělí
  až ve chvíli, kdy má zápis i druhá dvojice.
- **Nedohraný lepší míč** – pro lepší míč stačí zápis jednoho partnera.
  Součet se počítá až se zápisem obou, jinak by dvojice s jedním nedohraným
  míčem vycházela nesprávně lépe.

---

## Skins

**Hráči:** 2, 3 nebo 4, každý sám za sebe
**Soubor:** [`src/games/skins.ts`](../src/games/skins.ts)

Každá jamka je jeden skin. Bere ho hráč, který ji zahraje nejnižším počtem
ran. Když se o nejnižší skóre dělí víc hráčů, skin se nepřiděluje a přenáší
se do další jamky – další rozhodnutá jamka pak vynese víc skinů najednou.

Vyhrává hráč s nejvyšším počtem skinů.

### Rozhodnutí tam, kde pravidla mlčí

- **Nedohraná jamka** – jamka se vyhodnocuje až ve chvíli, kdy mají zápis
  všichni hráči. Do té doby se bank nemění.
- **Konec kola** – skiny přenesené z poslední jamky propadají.

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
zbývajících jamek.

### Rozhodnutí tam, kde pravidla mlčí

- **Nedohraná jamka** – do stavu vstoupí až ve chvíli, kdy mají zápis obě
  strany.
- **Dohrávání po rozhodnutí** – aplikace zápas nezastavuje. Zbylé jamky jde
  dohrát a zapsat, stav zápasu se ale už nezmění.

---

## Přidání další hry

1. Nový soubor v `src/games/` implementující rozhraní `GameDefinition`
   z [`src/games/types.ts`](../src/games/types.ts).
2. Zaregistrovat ho v [`src/games/index.ts`](../src/games/index.ts).
3. Přidat testy `src/games/<hra>.test.ts` (pomocník `makeRound` je
   v `src/games/fixtures.ts`).
4. Popsat pravidla v tomto dokumentu.

Zbytek aplikace – zápis skóre, ukládání, archiv i výsledková tabulka – je
společný a nic dalšího se upravovat nemusí.

Rozhraní hry vrací:

- `computeStandings(round)` – jednu nebo víc výsledkových tabulek
- `holeSummary(round, hole)` – nepovinné shrnutí u právě zapisované jamky;
  klíč `_game` znamená informaci k celé jamce, jinak se páruje na id dvojice
