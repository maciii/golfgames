# Plán: hřiště, handicapy a katalog

Rozpracovaný záměr a to, co z něj zbývá. Hotové věci popisují ostatní dokumenty
(`architecture.md`, `katalog.md`, `games.md`); tenhle soubor je o směru.

## Kde to stojí

| Fáze                                        | Stav                      |
| ------------------------------------------- | ------------------------- |
| **A** – model hřiště, handicapy, Stableford | ✅ hotovo (0.14.0)        |
| **B** – katalog hřišť a jeho data           | ✅ hotovo (0.16.0)        |
| **B2** – návrh hřiště podle polohy (GPS)    | ⏳ nezačato               |
| **C** – příspěvek zpět do OpenGolfAPI       | 🟡 připraveno, neodesláno |

Katalog běží samostatně na
[`maciii/golfgames-courses`](https://github.com/maciii/golfgames-courses),
publikuje se na <https://maciii.github.io/golfgames-courses/> a aplikace na něj
míří přes repository variable `VITE_COURSES_URL`. Podrobnosti v
[`katalog.md`](katalog.md).

## Co zbývá udělat

### 1. Odeslat příspěvek do OpenGolfAPI

305 hřišť je připravených v [`../contrib/`](../contrib/). Odsud to nešlo –
`api.opengolfapi.org` i `courses.opengolfapi.org` jsou blokované proxy (403).

Před odesláním **ověřit názvy polí** proti `_template.json` v jejich repozitáři
`open-course-data`; náš tvar je zvolený jako snadno převeditelný, ne jako přesná
shoda. Doporučená cesta je pull request, protože je ověřitelná a nechá stopu.

V `contrib/README.md` je poznámka o tom, že sada obsahuje všech 107 českých
hřišť opsaných ze scorekaret – rozhodnutí o zveřejnění pod ODbL je vědomé
a nevratné.

### 2. Návrh hřiště podle polohy (fáze B2)

Rejstřík už nese `lat` a `lon` u 205 z 307 hřišť, takže chybí jen:

- obal nad `navigator.geolocation` – ptát se na polohu **až po klepnutí**, nikdy
  při startu; odmítnutí vede na hledání podle jména, ne na chybu
- řazení nabídky podle vzdálenosti (haversine)
- volitelně předstažení dlaždice okolí, dokud je signál

### 3. Doplnit chybějící data

Kontrola hlásí sedm podezření, která stojí za doplnění až budou po ruce
scorekarty. Opravují se **v repozitáři katalogu** (`npm run validate`), ne tady:

- `east` a `karolinka-golf-park` nemají stroke index
- `lhotka`, `lozorno` a `zlonin` nemají u odpališť slope

## Rozhodnutí, na kterých to stojí

1. **Netto je volitelné u všech her**, ne jen u Stablefordu. Výchozí zůstává
   hrubé skóre.
2. **U hráče se ukládá HCP index**, hrací handicap se dopočítá z CR a SR podle
   WHS a u kola jde přepsat rovnou v ranách – to je jediná cesta na hřišti bez
   normy.
3. **Katalog je samostatný projekt.** Data se mění po měsících, aplikace po
   dnech; oprava stroke indexu nemá vyžadovat nasazení aplikace.
4. **Aplikace čte živá data**, ne pinnutou verzi. Riziko je malé, protože kolo
   si hřiště kopíruje při založení, takže špatný záznam nemůže přepočítat
   archiv – nejhůř se nabídne špatný údaj, který jde přepsat.
5. **Schéma vychází z `open-course-data`** OpenGolfAPI, aby byl příspěvek zpět
   kopie souboru, ne překlad.
6. **Data se udržují ručně.** Import ze zdrojů by měl generovat návrhy změn
   k odsouhlasení, ne tichý přepis – ručně ověřený údaj nesmí automatika
   přebít.

## Co se zjistilo o zdrojích dat

Kdyby se katalog někdy doplňoval automaticky:

| Zdroj                        | Co dá                                                  | Licence                    |
| ---------------------------- | ------------------------------------------------------ | -------------------------- |
| **OpenGolfAPI**              | 32 tis. hřišť; plné scorekarty hlavně USA (~15,7 tis.) | ODbL, zdarma, bez klíče    |
| **OpenStreetMap** (Overpass) | polohy hřišť; `golf=hole` s `par` a `handicap` (= SI)  | ODbL                       |
| golfcourseapi.com            | ~30 tis. hřišť včetně CR/SR                            | nejasné podmínky přebalení |
| ČGF / SKGA                   | autoritativní CR, SR a SI pro ČR a SK                  | žádné otevřené API         |
| golfapi.io, iGolf            | kompletní data                                         | placené – vyloučeno        |

Celosvětově existuje zhruba **38 000 hřišť**, ne stovky tisíc. Rejstřík celého
světa je proto řádově jednotky MB a statické soubory na Pages úlohu pokryjí –
databáze se serverem není potřeba.

**Hromadně stáhnout databázi ČGF nebo SKGA a přebalit ji není v pořádku** –
jednotlivé údaje jsou fakta, ale na podstatnou část obsahu databáze se v EU
vztahuje zvláštní právo pořizovatele. Proto ruční doplňování hřiště po hřišti,
ne scraper.
