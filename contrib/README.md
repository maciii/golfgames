# Příspěvek do OpenGolfAPI

`opengolfapi-podani.json` je 305 hřišť připravených k odeslání do komunitní
databáze [OpenGolfAPI](https://courses.opengolfapi.org) (dataset
`open-course-data`, licence ODbL). Zdrojem je `data/hriste.json`; vynechána
jsou dvě hřiště bez stroke indexu, protože neúplná scorekarta komunitní
databázi nepomůže.

## Stav: neodesláno

**Příspěvek zatím odeslaný není.** Prostředí, ve kterém se soubor připravoval,
má blokovaný odchozí provoz na `api.opengolfapi.org` i
`courses.opengolfapi.org` (proxy vrací 403 na CONNECT), takže nešlo ani ověřit
jejich schéma, ani nic odeslat.

Než se soubor odešle, je proto potřeba **ověřit názvy polí** proti
`_template.json` v repozitáři `open-course-data`. Tvar tady je zvolený tak, aby
byl snadno převeditelný, ne aby přesně odpovídal jejich schématu.

## Jak odeslat

Podle dokumentace OpenGolfAPI vedou k přijetí dat čtyři cesty:

1. Tlačítko _Edit_ na stránce konkrétního hřiště (oprava, stačí e-mail).
2. Formulář `courses.opengolfapi.org/submit` pro jedno nové hřiště.
3. `POST api.opengolfapi.org/v1/courses/submit`, hromadně až 100 hřišť naráz —
   tedy tahle sada ve čtyřech dávkách.
4. **Pull request do repozitáře `open-course-data`**, kde je každé hřiště
   samostatný JSON ve `/courses/` podle `_template.json`; před odesláním se
   pouští `npm run validate`.

Doporučená je cesta 4: je ověřitelná, nechá stopu a projde revizí.

## Než se to pošle, promyslet

Data pocházejí z opsaných scorekaret (`attribution` u jednotlivých záznamů).
Jednotlivé údaje — par, stroke index, CR a SR — jsou **fakta, ne autorské
dílo**, takže jejich zapsání je v pořádku.

Jiná otázka je systematičnost. Sada obsahuje **všech 107 českých hřišť**, což
se blíží úplné kopii národního přehledu. V EU chrání databáze zvláštní právo
pořizovatele, které se nevztahuje na jednotlivé údaje, ale na podstatnou část
obsahu databáze. Zveřejnění pod ODbL je nevratné.

Není to důvod to neudělat — je to důvod si to rozmyslet vědomě a případně se
předem zeptat ČGF, jestli s tím nemá problém. Rozhodnutí je na majiteli dat,
ne na téhle poznámce.
