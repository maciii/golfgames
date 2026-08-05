# Plán: hřiště, handicapy a katalog

Rozpracovaný záměr a to, co z něj zbývá. Hotové věci popisují ostatní dokumenty
(`architecture.md`, `katalog.md`, `games.md`); tenhle soubor je o směru.

## Kde to stojí

| Fáze                                        | Stav                                  |
| ------------------------------------------- | ------------------------------------- |
| **A** – model hřiště, handicapy, Stableford | ✅ hotovo (0.14.0)                    |
| **B** – katalog hřišť a jeho data           | 🟡 běží z domény aplikace, repo chybí |
| **B2** – návrh hřiště podle polohy (GPS)    | ⏳ nezačato                           |
| **C** – příspěvek zpět do OpenGolfAPI       | 🟡 připraveno, neodesláno             |

## Co zbývá udělat

### 1. Založit repozitář katalogu

Obsah je hotový ve složce [`../catalog/`](../catalog/) – build, kontrola dat,
workflow pro Pages i README. Postup je v [`katalog.md`](katalog.md).

Odsud to nešlo: GitHub App použitá v cloudovém prostředí nemá oprávnění
zakládat repozitáře (403 na `POST /user/repos`). Z lokálního prostředí
s `gh auth login` to je jeden příkaz.

Po založení:

1. `node scripts/split.mjs ../golfgames/data/hriste.json` – vyrobí `courses/`
2. Settings → Pages → Source: **GitHub Actions**
3. V repozitáři aplikace nastavit proměnnou
   `VITE_COURSES_URL=https://maciii.github.io/golfgames-courses/`
4. Až katalog poběží samostatně, vyhodit generování při buildu aplikace
   (`scripts/build-catalog.mjs` a krok v `prebuild`)

### 2. Odeslat příspěvek do OpenGolfAPI

305 hřišť je připravených v [`../contrib/`](../contrib/). Odsud to nešlo –
`api.opengolfapi.org` i `courses.opengolfapi.org` jsou blokované proxy (403).

Před odesláním **ověřit názvy polí** proti `_template.json` v jejich repozitáři
`open-course-data`; náš tvar je zvolený jako snadno převeditelný, ne jako přesná
shoda. Doporučená cesta je pull request, protože je ověřitelná a nechá stopu.

V `contrib/README.md` je poznámka o tom, že sada obsahuje všech 107 českých
hřišť opsaných ze scorekaret – rozhodnutí o zveřejnění pod ODbL je vědomé
a nevratné.

### 3. Návrh hřiště podle polohy (fáze B2)

Rejstřík už nese `lat` a `lon` u 205 z 307 hřišť, takže chybí jen:

- obal nad `navigator.geolocation` – ptát se na polohu **až po klepnutí**, nikdy
  při startu; odmítnutí vede na hledání podle jména, ne na chybu
- řazení nabídky podle vzdálenosti (haversine)
- volitelně předstažení dlaždice okolí, dokud je signál

### 4. Doplnit chybějící data

Kontrola (`npm run check:courses`) hlásí sedm podezření, která stojí za doplnění
až budou po ruce scorekarty:

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
