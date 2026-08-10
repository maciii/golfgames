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

**Jediným zdrojem pravdy je `courses/` v katalogu.** Kopie sady, ze které
katalog vznikl, se z tohohle repozitáře odstranila – druhé místo se stejnými
daty se nemělo jak držet v souladu a kontrola nad ním by tvrdila výsledek
o zastaralém stavu. Historie je v gitu, kdyby se někdy hodila.

## Tvar katalogu

```
index.json          rejstřík: id, název, klub, země, poloha, počet jamek, devítky, normy
course/<id>.json    celá scorekarta jednoho hřiště včetně devítek
meta.json           datum sestavení, počet hřišť
```

Rejstřík má při dnešních 353 hřištích 49 kB. Dělení podle polohy by byla
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
- V seznamu jsou hřiště rozlišená stavem: **v katalogu** (zatím jen online),
  **staženo** (lokální kopie katalogového hřiště) a **vlastní** (soukromé
  hřiště zadané uživatelem). Barevný odznak je prezentační, id hřiště zůstává
  stejné.
- Výchozí řazení používá polohu zařízení a řadí hřiště od nejbližšího. Poloha
  se používá jen v paměti pro výpočet vzdálenosti a nikam se neukládá ani
  neposílá. Když ji prohlížeč neposkytne, řazení se přepne na soukromá,
  oblíbená, stažená a nakonec katalogová hřiště, každou skupinu abecedně.
- Srdíčkem lze označit oblíbené hřiště i před jeho stažením. Oblíbené id se
  ukládají lokálně a jsou součástí JSON zálohy.
- Nabídku lze omezit filtrem podle země.
- Při otevření výběru se lokální katalogové kopie na pozadí porovnají s jejich
  centrální scorekartou. Pokud má vzdálený záznam novější `updatedAt`, kopie se
  sama uloží znovu; soukromá hřiště se nikdy nekontrolují ani neposílají na
  katalogový server. Bez připojení zůstávají lokální kopie použitelné a
  aktualizace se zkusí při příštím otevření výběru.
- Úprava staženého katalogového hřiště nikdy nepřepíše originál. Editor uloží
  nový soukromý `local:` klon; původní katalogové hřiště zůstane v telefonu i
  v centrální nabídce.

### Resorty a devítky

Areál nemusí být jedno hřiště. Čeladná má dvě osmnáctky (Old a New), Kácov tři
devítky (Forest, River, Meadows) a vedle mistrovského hřiště bývá ještě
akademie o šesti jamkách. Katalog to drží dvěma způsoby:

- **Dvě hřiště v areálu jsou dva záznamy** se stejným klubem a názvem
  „areál – hřiště“ (`celadna-old-course`, `celadna-new-course`). V nabídce se
  proto dají vybrat zvlášť a každé má vlastní normu.
- **Devítky jednoho hřiště jsou `loops`** – pojmenované úseky, které jdou po
  sobě tak, jak jsou uložené jamky. Hřiště nad osmnáct jamek se z nich při
  zakládání kola teprve **skládá, a to v pořadí**: Forest + River je jiná
  osmnáctka než River + Forest, s jinými pary, jiným stroke indexem i jinou
  normou. Osmnáctka svoje půlky mít pojmenované může, ale hraje se dál celá.

Devítky nesou vlastní (devítkové) normy odpališť; normu kombinace z nich
aplikace složí – CR sečte, SR zprůměruje podle počtu jamek. Proti tabulce klubu
to může minout o jednotku slope, protože se zaokrouhluje z už zaokrouhlených
čísel; na hracím handicapu je to desetina rány. U hřiště, které vlastní devítky
normované nemá, se použije norma hřiště zkrácená podílem hraných jamek
a `tee.holeCount` říká, kolika jamek se norma týká.

Kolo delší než osmnáct jamek se neskládá – hry počítají s dvojnásobnou devátou
a osmnáctou jamkou.

### Názvy odpališť

Katalog ukládá odpaliště se stabilním `id` a původním názvem. Standardní názvy
(`yellow`, `red`, `white`, `blue` a další obecné varianty) se při zobrazení
překládají podle jazyka aplikace; v češtině se tedy ukáže například „Žlutá“ a
v angličtině „Yellow“. Vlastní názvy odpališť se nepřepisují a zůstávají tak,
jak je uživatel nebo katalog zadal. Lokalizace je pouze prezentační, takže
změna jazyka nemění uložená hřiště ani rozehraná kola.

U stažené kopie se vedle lokálního času uložení drží také `catalogUpdatedAt`.
Ten je časem centrální scorekarty a rozhoduje, zda je při dalším otevření
výběru potřeba kopii obnovit.

## Údržba dat

Hřiště se přidávají a opravují **ručně** úpravou souboru v `courses/`
v repozitáři katalogu. Kontrola (`npm run validate`) odděluje chyby, které by
rozbily výpočty, od podezření k ověření a běží v CI před buildem, takže se vadné
hřiště nedostane ven.

Historii normování drží git: každá změna CR nebo SR je commit s datem
a zdůvodněním, takže `git log -p courses/<id>.json` je normovací historie
hřiště. Aplikace tenhle problém řeší z druhé strany — kolo si při založení
dělá vlastní kopii hřiště, takže pozdější změna v katalogu nepřepočítá archiv.
