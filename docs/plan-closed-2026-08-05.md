# Uzavřený plán: hřiště, handicapy a katalog

Tento plán byl uzavřen 2026-08-05. Aktuální plán pro další práci je v
[`plan.md`](plan.md). Historie zůstává také v gitu.

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

## Co zbývalo udělat

### Doplnit chybějící data

Jediná otevřená položka byla práce s daty, ne s kódem. Kontrola katalogu
(`npm run validate` v repozitáři katalogu) hlásila sedm podezření, která stojí
za doplnění, až budou po ruce scorekarty. Opravují se **v katalogu**, ne tady:

- `east` a `karolinka-golf-park` nemají stroke index
- `lhotka`, `lozorno` a `zlonin` nemají u odpališť slope

Aplikace si s tím poradí – bez stroke indexu rozdá rány podle pořadí jamek
a bez slope se handicap zadá rovnou v ranách. Jen to není přesné.

## Co se rozhodlo nedělat

- **Předstažení scorekaret v okolí.** Hřiště se vybírá před kolem, kdy signál
  obvykle je – v klubovně nebo cestou. Složitost navíc za tím užitkem
  zaostávala.
- **Příspěvek dat do OpenGolfAPI.** Data zůstávají v našem katalogu.
- **Druhá kopie dat v repozitáři aplikace.** Katalog je jediný zdroj pravdy;
  ruční zadání hřiště zůstává pojistkou pro místa bez signálu.

## Trvalá rozhodnutí

1. Netto je volitelné u všech her, výchozí zůstává hrubé skóre.
2. U hráče se ukládá HCP index a hrací handicap se dopočítá z CR a SR podle WHS.
3. Katalog je samostatný projekt a aplikace čte živá data.
4. Kolo si hřiště kopíruje při založení, takže pozdější změna katalogu
   nepřepočítá archivní kola.
5. Data se udržují ručně; ručně ověřený údaj nesmí automatika tiše přebít.
6. Bez `VITE_COURSES_URL` se čte publikovaný katalog projektu.
7. Úprava katalogového hřiště vytvoří soukromý klon; původní kopie zůstane.

## Zdroje dat

| Zdroj                        | Co dá                                                  | Licence                    |
| ---------------------------- | ------------------------------------------------------ | -------------------------- |
| **OpenGolfAPI**              | 32 tis. hřišť; plné scorekarty hlavně USA (~15,7 tis.) | ODbL, zdarma, bez klíče    |
| **OpenStreetMap** (Overpass) | polohy hřišť; `golf=hole` s `par` a `handicap` (= SI)  | ODbL                       |
| golfcourseapi.com            | ~30 tis. hřišť včetně CR/SR                            | nejasné podmínky přebalení |
| ČGF / SKGA                   | autoritativní CR, SR a SI pro ČR a SK                  | žádné otevřené API         |
| golfapi.io, iGolf            | kompletní data                                         | placené – vyloučeno        |

Hromadně stáhnout databázi ČGF nebo SKGA a přebalit ji není v pořádku –
jednotlivé údaje jsou fakta, ale na podstatnou část obsahu databáze se v EU
vztahuje zvláštní právo pořizovatele. Proto ruční doplňování hřiště po hřišti,
ne scraper.
