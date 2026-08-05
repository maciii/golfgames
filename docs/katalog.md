# Katalog hřišť

Aplikace si hřiště nedrží v sobě. Bere je z **katalogu**: rejstřík pro hledání
a scorekartu až u hřiště, které si někdo vybral. Vybrané hřiště se uloží
natrvalo, takže rozehrané kolo na síti nikdy nezávisí.

## Kde katalog běží

Katalog je **samostatný projekt** [`maciii/golfgames-courses`](https://github.com/maciii/golfgames-courses)
s vlastními GitHub Pages — data se mění po měsících, aplikace po dnech, takže
oprava jednoho stroke indexu nemá vyžadovat nasazení aplikace. Hřiště se
opravují a nasazují tam, ne tady.

```
https://maciii.github.io/golfgames-courses/
```

Tahle adresa je v aplikaci **výchozí**, takže fork má hřiště k dispozici a nemusí
nastavovat nic — stejné pravidlo jako u Firebase, kde chybějící konfigurace
neshodí aplikaci, jen v ní nebude účet. Přesměrovat katalog jinam (vlastní fork
dat, lokální kopie při vývoji) umí `VITE_COURSES_URL`; v nasazení ji drží
repository variable stejného jména. Aplikace tedy **žádná hřiště sama nestaví
ani neservíruje**.

[`data/hriste.json`](../data/hriste.json) v tomhle repozitáři zůstává jako
sada k ručnímu importu ze zálohy a jako výchozí bod, ze kterého katalog vznikl.
**Zdrojem pravdy už není** — ten je `courses/` v katalogu.

## Tvar katalogu

```
index.json          rejstřík: id, název, klub, země, poloha, počet jamek, normy
course/<id>.json    celá scorekarta jednoho hřiště
meta.json           datum sestavení, počet hřišť
```

Rejstřík má při dnešních 307 hřištích 41 kB. Dělení podle polohy by byla
složitost bez užitku; až katalog vyroste na tisíce hřišť, rozdělí se podle
geohashe.

## Chování v aplikaci

- **Nic se nestahuje, dokud uživatel neotevře výběr hřiště.** Stejné pravidlo
  jako u Firebase — kdo hřiště nepotřebuje, nestáhne ani bajt navíc.
- Rejstřík se drží v paměti, takže se při hledání netahá znovu.
- Katalog **není v předcache** service workeru — leží na cizí doméně, takže se
  do `globPatterns` ani nemůže dostat a nestahuje si ho každý, kdo aplikaci
  otevře.
- Když katalog nejde načíst, obrazovka **funguje dál nad hřišti v telefonu**
  a řekne proč: jiná hláška pro chybějící připojení, jinou pro neodpovídající
  adresu a jinou pro obsah, kterému aplikace nerozumí. Ruční zadání hřiště
  funguje vždycky.
- Hřiště z katalogu prochází stejnou kontrolou (`isValidCourse`) jako hřiště ze
  zálohy — poškozený záznam se do výpočtů nedostane.

### Názvy odpališť

Katalog ukládá odpaliště se stabilním `id` a původním názvem. Standardní názvy
(`yellow`, `red`, `white`, `blue` a další obecné varianty) se při zobrazení
překládají podle jazyka aplikace; v češtině se tedy ukáže například „Žlutá“ a
v angličtině „Yellow“. Vlastní názvy odpališť se nepřepisují a zůstávají tak,
jak je uživatel nebo katalog zadal. Lokalizace je pouze prezentační, takže
změna jazyka nemění uložená hřiště ani rozehraná kola.

## Údržba dat

Hřiště se přidávají a opravují **ručně** úpravou souboru v `courses/`
v repozitáři katalogu. Kontrola (`npm run validate`) odděluje chyby, které by
rozbily výpočty, od podezření k ověření a běží v CI před buildem, takže se vadné
hřiště nedostane ven. `npm run check:courses` v aplikaci dělá totéž nad
`data/hriste.json`.

Historii normování drží git: každá změna CR nebo SR je commit s datem
a zdůvodněním, takže `git log -p courses/<id>.json` je normovací historie
hřiště. Aplikace tenhle problém řeší z druhé strany — kolo si při založení
dělá vlastní kopii hřiště, takže pozdější změna v katalogu nepřepočítá archiv.
