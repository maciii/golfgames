# Golf Games – databáze hřišť

Katalog golfových hřišť pro aplikaci [Golf Games](https://golf.kubecka.cz):
pary jamek, stroke indexy a parametry odpališť včetně Course Ratingu
a Slope Ratingu.

Je to **samostatný projekt**, protože data mají jiný životní cyklus než
aplikace. Hřiště se mění po měsících (typicky přenormováním), aplikace po
dnech. Katalog se proto aktualizuje bez nasazování aplikace a naopak.

**Publikovaný katalog:** https://maciii.github.io/golfgames-courses/

## Obsah

307 hřišť, z toho 107 českých a 21 slovenských.

| Země                | Hřišť |
| ------------------- | ----- |
| Česko               | 107   |
| Španělsko           | 44    |
| Rakousko            | 39    |
| USA                 | 25    |
| Slovensko           | 21    |
| ostatní a neuvedeno | 71    |

## Jak to funguje

```
courses/<id>.json     zdroj pravdy, upravuje se ručně
      │
      ├─ scripts/validate.mjs   kontrola (běží v CI před buildem)
      └─ scripts/build.mjs      sestavení publikované podoby
                │
                ▼
dist/index.json          rejstřík pro hledání (~41 kB)
dist/course/<id>.json    scorekarta jednoho hřiště
dist/meta.json           datum sestavení, počty, licence
```

**Zdrojem pravdy je `courses/`**, `dist/` je odvozený a při každém buildu se
přepisuje – nikdy se needituje ručně.

Aplikace si stáhne rejstřík, nechá v něm hledat a **scorekartu stahuje až
u hřiště, které si někdo vybral**. Telefon tak netahá data, která neuvidí,
a jednou stažené hřiště v něm zůstane natrvalo i bez signálu.

Rejstřík je zatím jeden soubor. Při stovkách hřišť má desítky kilobajtů, takže
dělení podle polohy by byla složitost bez užitku; až katalog vyroste na tisíce,
rozdělí se podle geohashe.

## Historie normování

Klub může hřiště přenormovat a **starý údaj tím nepřestane být pravdou
o kolech odehraných dřív**. Historii proto drží git: každá změna normy je
commit s datem a zdůvodněním.

```bash
git log -p courses/karlstejn.json
```

Aplikace tenhle problém řeší z druhé strany – kolo si při založení dělá vlastní
hlubokou kopii hřiště, takže pozdější změna v katalogu nepřepočítá archiv.

## Přidání nebo oprava hřiště

1. Založit nebo upravit `courses/<id>.json`. Název souboru **musí** odpovídat
   poli `id`.
2. `npm run validate` – musí projít bez chyb.
3. Commit s popisem, odkud údaje jsou (scorekarta klubu, normovací tabulka).

Chyby build zastaví, podezření se jen vypíšou.

### Tvar souboru

```jsonc
{
  "id": "karlstejn", // shodné s názvem souboru
  "name": "Karlštejn",
  "club": "Český Golfový Klub", // nepovinné
  "country": "CZ", // nepovinné, ISO 3166-1 alpha-2
  "lat": 49.9386, // nepovinné
  "lon": 14.1889,
  "holeCount": 18,
  "pars": [4, 3, 5], // délka musí sedět na holeCount, hodnoty 3-6
  "strokeIndex": [5, 15, 1], // délka musí sedět, každé číslo právě jednou
  "tees": [
    {
      "id": "yellow",
      "name": "Žlutá",
      "courseRating": 71.2, // nepovinné
      "slopeRating": 132, // nepovinné, 55-155
      "par": 72, // nepovinné; bez něj se sečtou pary jamek
      "distance": 5834, // nepovinné, metry
    },
  ],
  "source": "manual",
  "attribution": "Scorekarta klubu",
}
```

Ukázky výš jsou komentované kvůli popisu; skutečný soubor musí být čistý JSON.

### Tři pasti

**Stroke index musí být permutace**, každé číslo právě jednou. Kontrola to
hlídá, protože duplicita rozdělí rány špatně a projeví se až na penězích.

**Devítky mívají SI podepsaný z mateřské osmnáctky** (1, 3, 5, … 17). Nechte
to tak – aplikace si ho přepočítá na pořadí 1–9 sama.

**Norma odpaliště musí odpovídat počtu jamek.** Devítka potřebuje CR kolem 35,
ne 71. Do vzorce pro hrací handicap vstupuje rozdíl `CR − par`, takže
osmnáctijamková norma na devítce udělá handicap zhruba dvojnásobný.

### Co vypadá jako chyba a chyba to není

- **Předsunutá odpaliště mívají jiný par než hřiště.** Weitra má ze zelených
  par 57 proti 72 ze žlutých. `tee.par` má přednost před součtem parů jamek.
- **Krátká hřiště mají nízké CR.** Čierna Voda je par 54 na 1764 m s CR 51,6.
  Není to zaměněná devítijamková norma.

## Licence

Data jsou pod [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/):
smí se používat i dál šířit, odvozená databáze musí zůstat pod stejnou licencí
a musí uvádět zdroj.
