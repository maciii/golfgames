# Data hřišť

`hriste.json` je připravená sada **307 hřišť** ve formátu zálohy aplikace
(popis struktury je v [`../docs/import-hrist.md`](../docs/import-hrist.md)).
Načte se v aplikaci přes _Záloha dat → Obnovit ze zálohy_ v režimu **sloučit**.

| Země                | Hřišť |
| ------------------- | ----- |
| Česko               | 107   |
| Španělsko           | 44    |
| Rakousko            | 39    |
| USA                 | 25    |
| Slovensko           | 21    |
| ostatní a neuvedeno | 71    |

302 hřišť je osmnáctijamkových, 5 devítijamkových.

## Kontrola

```bash
node scripts/check-courses.mjs data/hriste.json
```

Skript hlásí odděleně **chyby** (rozbily by výpočty — chybějící nebo
duplicitní id, špatná délka polí, opakovaný stroke index, slope mimo rozsah,
slope zapsaný do pole pro CR) a **podezření** (chybějící stroke index nebo SR,
nezvyklý poměr CR a paru). Chyba vrací nenulový návratový kód, podezření ne.

## Provedené opravy

Proti dodanému souboru jsou tři změny, všechny doložitelné z dat samotných:

- `arabella-golf-mallorca`, odpaliště Yellow a Red: **prohozené CR a SR**
  (CR 133 / SR 71). Slope nad sto v poli pro CR nemůže být nic jiného; s
  původními hodnotami by hráči s indexem 18 vyšel hrací handicap 73 ran.
- `lozorno`, odpaliště Orange: **CR 0** znamená neznámou hodnotu, ne nulovou
  obtížnost — pole je odstraněné, aby se handicap nedopočítával z nesmyslu.
- Karlštejn měl id `karstejn` (překlep, chybějící „l"). Opraveno na `karlstejn`
  **před založením katalogu** — id se váže na hřiště uložená v telefonech, takže
  pozdější přejmenování by z jednoho hřiště udělalo dvě.

## Co zůstalo a proč

Kontrola hlásí sedm podezření, která **nejsou chyba**:

- `east` a `karolinka-golf-park` nemají stroke index. Aplikace jim rozdá rány
  podle pořadí jamek; až se SI doplní, stačí hřiště přepsat.
- `lhotka`, `lozorno` a `zlonin` nemají u odpališť slope. Handicap se u nich
  nedá dopočítat z indexu, takže se zadá rovnou v ranách.

Ověřoval jsem i dvě věci, které jako chyba vypadaly, a chyba to není:

- **Předsunutá odpaliště mívají jiný par než hřiště** (Weitra: zelené par 57
  proti 72 z žlutých). Je to reálné a model s tím počítá — `tee.par` má
  přednost před součtem parů jamek.
- **Krátká hřiště mají nízké CR** (Čierna Voda: par 54 na 1764 m, CR 51,6).
  Odpovídá to skutečnosti, není to zaměněná devítijamková norma.
