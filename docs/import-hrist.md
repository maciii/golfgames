# Hromadný import hřišť

Aplikace zatím nemá vlastní import hřišť z cizích aplikací (přijde s katalogem
ve fázi B). Hřiště ale jdou nahrát už teď: **souborem ve formátu zálohy**,
který umí načíst obrazovka _Záloha dat → Obnovit ze zálohy_.

Hotový vzor k vyplnění je [`vzor-hriste.json`](vzor-hriste.json); jeho platnost
hlídá test `src/importFormat.test.ts`, takže se nemůže rozejít s kódem.

## Postup

1. Připravit soubor podle struktury níž.
2. V aplikaci otevřít **Záloha dat → Obnovit ze zálohy** a soubor vybrat.
3. Zvolit **sloučit** (výchozí). Režim „nahradit vše" by smazal archiv i hráče.

Sloučení nikdy nic nemaže: hřiště se přidají k těm, která už v telefonu jsou.
Když se id shodne, vyhraje verze s novějším `updatedAt`.

Po přihlášení se hřiště sama nahrají i do cloudu, takže se objeví na dalších
zařízeních.

## Struktura souboru

Povinná je jen obálka a pole `courses`; ostatní části zálohy jdou vynechat.

> Ukázky níž jsou **komentované** (JSONC), aby šlo popsat jednotlivá pole.
> Skutečný soubor musí být čistý JSON: **bez komentářů a bez koncových čárek**,
> jinak ho aplikace odmítne jako poškozený. Kdo si nechce nic přepisovat, ať
> vyjde z [`vzor-hriste.json`](vzor-hriste.json) — ten je platný JSON a jeho
> načtení ověřuje test.

```jsonc
{
  "format": "golfgames-backup", // musí být přesně tohle
  "schemaVersion": 1,
  "data": {
    "courses": [/* … hřiště … */],
  },
}
```

### Jedno hřiště

```jsonc
{
  "id": "golfshot:karlstejn", // libovolný, ale stabilní a jedinečný text
  "name": "Karlštejn",
  "club": "Golf Resort Karlštejn", // nepovinné
  "country": "CZ", // nepovinné, ISO 3166-1 alpha-2
  "lat": 49.9386, // nepovinné, kvůli pozdějšímu vyhledání podle polohy
  "lon": 14.1889,
  "holeCount": 18, // 9 nebo 18
  "pars": [4, 3, 5 /* … */], // délka MUSÍ sedět na holeCount, hodnoty 3-6
  "strokeIndex": [5, 15, 1 /* … */], // délka MUSÍ sedět na holeCount
  "tees": [
    {
      "id": "yellow", // jedinečné v rámci hřiště
      "name": "Žlutá",
      "courseRating": 71.2, // nepovinné
      "slopeRating": 132, // nepovinné, 55-155
      "par": 72, // nepovinné; bez něj se sečtou pary jamek
      "distance": 5834, // nepovinné, metry
    },
  ],
  "source": "manual",
  "attribution": "Vlastní zápis ze scorekarty", // nepovinné
}
```

### Co soubor odmítne

Kontrola je záměrně přísná — napůl přečtené hřiště je horší než žádné.
Vadné hřiště se přeskočí a zbytek se načte.

| Pravidlo                                           | Proč                                                    |
| -------------------------------------------------- | ------------------------------------------------------- |
| `id` a `name` neprázdný text                       | bez id nejde hřiště spárovat při další aktualizaci      |
| `holeCount` kladné číslo                           | délky polí se proti němu kontrolují                     |
| `pars` má délku `holeCount`, hodnoty 3–6           | jinak by výpočet sáhl mimo pole                         |
| `strokeIndex` buď chybí, nebo má délku `holeCount` | totéž; chybějící SI se doplní pořadím jamek             |
| `tees` je pole (klidně prázdné)                    | bez odpališť hřiště funguje, jen bez handicapu z indexu |

## Na co si dát pozor

**Stroke index musí být permutace, ne odhad.** Každé číslo právě jednou. Dvě
jamky se stejným SI rozdělí rány špatně a nikdo si toho nevšimne, dokud se
nepočítají peníze.

**Devítijamková hřiště mají SI často podepsaný z mateřské osmnáctky** (1, 3, 5,
… 17). Tak to klidně nech — aplikace si ho přepočítá na pořadí 1–9 sama.
Kdyby se bral doslova, dostal by hráč s handicapem 5 rány jen na třech jamkách
z devíti.

**Norma odpaliště musí odpovídat počtu jamek.** Devítka potřebuje devítijamkové
CR (kolem 35), ne osmnáctijamkové (kolem 71). S osmnáctijamkovou hodnotou vyjde
handicap zhruba dvojnásobný, protože do vzorce vstupuje rozdíl `CR − par`.

**Různá odpaliště pro muže a ženy** se zadávají jako samostatné položky
v `tees` — každé má vlastní CR a SR.

## Až přijde katalog

Fáze B přinese sdílenou databázi hřišť, ze které půjde hřiště stáhnout podle
polohy. Ručně zadaná a naimportovaná hřiště se přitom **nepřepíšou** — vlastní
data uživatele mají vždycky přednost před tím, co přijde z katalogu (viz plán
projektu). Import touhle cestou proto nepřijde vniveč.
