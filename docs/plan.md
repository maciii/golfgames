# Plán: hřiště, handicapy a katalog

Rozpracovaný záměr a to, co z něj zbývá. Hotové věci popisují ostatní dokumenty
(`architecture.md`, `katalog.md`, `games.md`); tenhle soubor je o směru.

Stav při poslední revizi: verze **0.25.0**, 232 testů prochází. Plán je tím
prakticky vyčerpaný – zbývá jediná položka a je to práce s daty.

## Kde to stojí

| Fáze                                        | Stav               |
| ------------------------------------------- | ------------------ |
| **A** – model hřiště, handicapy, Stableford | ✅ hotovo (0.14.0) |
| **B** – katalog hřišť a jeho data           | ✅ hotovo (0.16.0) |
| **B2** – návrh hřiště podle polohy (GPS)    | ✅ hotovo (0.22.0) |
| **C** – atribuce ODbL v aplikaci            | ✅ hotovo (0.25.0) |

Katalog běží samostatně na
[`maciii/golfgames-courses`](https://github.com/maciii/golfgames-courses),
publikuje se na <https://maciii.github.io/golfgames-courses/> a aplikace na něj
míří přes repository variable `VITE_COURSES_URL`. Podrobnosti v
[`katalog.md`](katalog.md).

## Co zbývá udělat

### Doplnit chybějící data

Jediná otevřená položka, a je to práce s daty, ne s kódem. Kontrola katalogu
(`npm run validate` v repozitáři katalogu) hlásí sedm podezření, která stojí za
doplnění, až budou po ruce scorekarty. Opravují se **v katalogu**, ne tady:

- `east` a `karolinka-golf-park` nemají stroke index
- `lhotka`, `lozorno` a `zlonin` nemají u odpališť slope

Aplikace si s tím poradí – bez stroke indexu rozdá rány podle pořadí jamek
a bez slope se handicap zadá rovnou v ranách. Jen to není přesné.

## Co se rozhodlo nedělat

Body, které v plánu byly a vypadly. Zapsané proto, aby se za půl roku
neotevíraly znovu od nuly:

- **Předstažení scorekaret v okolí.** Hřiště se vybírá před kolem, kdy signál
  obvykle je – v klubovně nebo cestou. Složitost navíc (kdy stáhnout, jak velké
  okolí, kdy zahodit) za tím užitkem zaostávala.
- **Příspěvek dat do OpenGolfAPI.** Data zůstávají v našem katalogu. Odpadá tím
  i úvaha o zveřejnění 107 českých hřišť opsaných ze scorekaret pod ODbL, která
  by byla nevratná. Připravený balík se z repozitáře odstranil; kdyby se
  rozhodnutí někdy otočilo, je v historii gitu a stejně by se musel vygenerovat
  znovu z katalogu.
- **Druhá kopie dat v repozitáři aplikace.** `data/hriste.json`, kontrolní
  skript i návod k importu ze souboru se odstranily. Katalog je jediný zdroj
  pravdy; ruční zadání hřiště zůstává pojistkou pro místa bez signálu.

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
5. **Schéma vychází z `open-course-data`** OpenGolfAPI. Přispívat data zpět se
   nakonec nerozhodlo, ale zavedené schéma nemá důvod se měnit a nechává dveře
   otevřené.
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
