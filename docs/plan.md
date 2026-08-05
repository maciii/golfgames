# Plán: hřiště, handicapy a katalog

Rozpracovaný záměr a to, co z něj zbývá. Hotové věci popisují ostatní dokumenty
(`architecture.md`, `katalog.md`, `games.md`); tenhle soubor je o směru.

Stav při poslední revizi: verze **0.24.0**, 228 testů prochází.

## Kde to stojí

| Fáze                                        | Stav                      |
| ------------------------------------------- | ------------------------- |
| **A** – model hřiště, handicapy, Stableford | ✅ hotovo (0.14.0)        |
| **B** – katalog hřišť a jeho data           | ✅ hotovo (0.16.0)        |
| **B2** – návrh hřiště podle polohy (GPS)    | ✅ hotovo (0.22.0)        |
| **C** – příspěvek zpět do OpenGolfAPI       | 🟡 připraveno, neodesláno |

Katalog běží samostatně na
[`maciii/golfgames-courses`](https://github.com/maciii/golfgames-courses),
publikuje se na <https://maciii.github.io/golfgames-courses/> a aplikace na něj
míří přes repository variable `VITE_COURSES_URL`. Podrobnosti v
[`katalog.md`](katalog.md).

## Co zbývá udělat

### 1. Atribuce ODbL v aplikaci

**Nesplněná povinnost licence, ne kosmetika.** Katalog je pod ODbL, která
vyžaduje uvést zdroj u míst, kde se data používají. Aplikace dnes atribuci
neukazuje nikde: `Course.attribution` je v modelu i v datech, ale žádná
obrazovka ho nevykresluje a v `src/i18n/` není jediný klíč o licenci.

Stačí málo – zdroj u detailu hřiště nebo v patičce výběru hřiště plus věta
o licenci katalogu. Dokud to tam není, porušujeme podmínku, na které stojí
i celý plán přispívat data zpátky.

### 2. Rozhodnout, co s `data/hriste.json`

Od chvíle, kdy se katalog odstěhoval do
[vlastního repozitáře](https://github.com/maciii/golfgames-courses), existuje
**stejná sada hřišť na dvou místech**. Nic je nedrží v souladu: oprava stroke
indexu v katalogu se do `data/hriste.json` nepromítne a `npm run check:courses`
kontroluje tu zastaralou kopii.

Dvě rozumné cesty:

- **Smazat** `data/hriste.json`, `scripts/check-courses.mjs`, `npm run check:courses`
  a [`import-hrist.md`](import-hrist.md). Zdrojem pravdy je katalog, ruční
  zadání hřiště zůstává pojistkou pro místa bez signálu.
- **Nechat jako zmrazený seed** a do `data/README.md` napsat, že se
  neaktualizuje a slouží jen k prvotnímu naplnění nového katalogu.

První varianta je čistší; druhá dává smysl, jen pokud se počítá se zakládáním
dalších katalogů. Zatím to není rozhodnuté, a proto to tady stojí.

### 3. Odeslat příspěvek do OpenGolfAPI

305 hřišť je připravených v [`../contrib/`](../contrib/). Odsud to nešlo –
`api.opengolfapi.org` i `courses.opengolfapi.org` jsou blokované proxy (403).

**Před odesláním balík vygenerovat znovu z katalogu**, ne z `contrib/`. Ten
vznikl z `data/hriste.json` ještě před osamostatněním katalogu, takže neobsahuje
pozdější opravy.

Dál **ověřit názvy polí** proti `_template.json` v jejich repozitáři
`open-course-data`; náš tvar je zvolený jako snadno převeditelný, ne jako přesná
shoda. Doporučená cesta je pull request, protože je ověřitelná a nechá stopu.

V `contrib/README.md` je poznámka o tom, že sada obsahuje všech 107 českých
hřišť opsaných ze scorekaret – rozhodnutí o zveřejnění pod ODbL je vědomé
a nevratné.

### 4. Návrh hřiště podle polohy (fáze B2)

Hotové části používají `lat` a `lon` z rejstříku a zahrnují:

- dotaz na `navigator.geolocation` až po otevření výběru hřiště; odmítnutí
  přepne na skupinové a abecední řazení
- řazení nabídky podle vzdálenosti (haversine), přepínač na skupiny a abecedu
- filtr zemí a oblíbená hřiště, která se řadí před stažené kopie

Zbývá jen volitelné **předstažení scorekaret v okolí**, dokud je signál. Není
nutné pro offline hraní: hřiště se ukládá při výběru a katalogová kopie se při
dalším otevření pickeru sama aktualizuje.

### 5. Doplnit chybějící data

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
7. **Bez `VITE_COURSES_URL` se čte publikovaný katalog projektu**, ne prázdno.
   Fork tak má hřiště bez jediného nastavení – stejné pravidlo jako u chybějící
   konfigurace Firebase.
8. **Úprava katalogového hřiště vytvoří soukromý klon.** Původní kopie zůstane,
   takže ji další aktualizace katalogu může dál obnovovat, a vlastní zásah se
   nikdy nepřepíše.

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
