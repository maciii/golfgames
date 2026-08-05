# Katalog hřišť

Aplikace si hřiště nedrží v sobě. Bere je z **katalogu**: rejstřík pro hledání
a scorekartu až u hřiště, které si někdo vybral. Vybrané hřiště se uloží
natrvalo, takže rozehrané kolo na síti nikdy nezávisí.

## Kde katalog běží

Adresu určuje proměnná `VITE_COURSES_URL`. Bez ní se katalog čte ze **stejné
domény jako aplikace** (`/courses/`), kam ho při buildu vygeneruje
`scripts/build-catalog.mjs` z [`data/hriste.json`](../data/hriste.json).

Cílový stav je **samostatný projekt** `golfgames-courses` s vlastními GitHub
Pages — data se mění po měsících, aplikace po dnech, takže nemá smysl kvůli
opravě jednoho stroke indexu nasazovat aplikaci. Přepnutí je jedna proměnná:

```
VITE_COURSES_URL=https://maciii.github.io/golfgames-courses/
```

Obsah toho repozitáře je připravený ve složce [`../catalog/`](../catalog/):
build, kontrola dat, workflow i README. Zbývá repozitář založit (to je jediný
krok, který nejde udělat odsud — GitHub App na zakládání repozitářů nemá
oprávnění), pustit `node scripts/split.mjs ../golfgames/data/hriste.json`
a zapnout Pages.

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
- Katalog **není v předcache** service workeru (`workbox.globIgnores`), aby si
  ho nestahoval každý, kdo aplikaci otevře.
- Když katalog nejde načíst, obrazovka **funguje dál nad hřišti v telefonu**
  a řekne proč: jiná hláška pro chybějící připojení, jinou pro neodpovídající
  adresu a jinou pro obsah, kterému aplikace nerozumí. Ruční zadání hřiště
  funguje vždycky.
- Hřiště z katalogu prochází stejnou kontrolou (`isValidCourse`) jako hřiště ze
  zálohy — poškozený záznam se do výpočtů nedostane.

## Údržba dat

Hřiště se přidávají a opravují **ručně** úpravou souboru v `courses/`.
Kontrola (`npm run validate` v katalogu, `npm run check:courses` v aplikaci)
odděluje chyby, které by rozbily výpočty, od podezření k ověření.

Historii normování drží git: každá změna CR nebo SR je commit s datem
a zdůvodněním, takže `git log -p courses/<id>.json` je normovací historie
hřiště. Aplikace tenhle problém řeší z druhé strany — kolo si při založení
dělá vlastní kopii hřiště, takže pozdější změna v katalogu nepřepočítá archiv.
