import type { Message } from './plural'

/**
 * České texty aplikace.
 *
 * Tenhle katalog je **zdroj pravdy pro klíče** - typ `MessageKey` se odvozuje
 * právě z něj a ostatní jazyky musí mít stejné klíče, jinak je to chyba
 * překladu (viz `en.ts`).
 *
 * Konvence klíčů: `oblast.věc`. Oblast odpovídá obrazovce (`play`, `results`),
 * nebo doméně (`bonus`, `games`, `score`). Proměnné se píšou `{jmeno}`.
 *
 * Texty, které se mění podle počtu, jsou objekt s tvary `one` / `few` /
 * `other`; správný vybere `Intl.PluralRules` (viz `plural.ts`).
 */
export const cs = {
  // --- společné ----------------------------------------------------------
  'common.back': 'Zpět',
  'common.close': 'Zavřít',
  'common.done': 'Hotovo',
  'common.edit': 'Upravit',
  'common.version': 'verze {version}',
  'common.player': 'Hráč {number}',
  'common.strokes': '{count} ran',
  'common.points': '{count} b.',
  'common.holePoints': 'Body za jamku',
  'common.dash': '–',

  // --- domovská obrazovka a menu -------------------------------------------
  'home.openMenu': 'Menu',
  'home.newRound': 'Nová hra',
  'home.lastRound': 'Poslední hra',
  'home.seeArchive': 'Archiv',
  'home.favoritePlayers': 'Oblíbení hráči',
  'home.favoriteCourses': 'Oblíbená hřiště',
  'menu.title': 'Menu',
  'menu.courses': 'Hřiště',
  'menu.coursesCount': {
    one: '{count} uložené',
    few: '{count} uložená',
    other: '{count} uložených',
  },
  'menu.players': 'Hráči',
  'menu.playersCount': {
    one: '{count} spoluhráč',
    few: '{count} spoluhráči',
    other: '{count} spoluhráčů',
  },
  'menu.archive': 'Archiv',
  'menu.archiveCount': {
    one: '{count} odehrané',
    few: '{count} odehraná',
    other: '{count} odehraných',
  },
  'menu.backup': 'Záloha dat',
  'menu.account': 'Účet',

  // --- hráči (správa seznamu) ----------------------------------------------
  'players.title': 'Hráči',
  'players.empty': 'Zatím žádní uložení hráči',
  'players.count': {
    one: '{count} uložený hráč',
    few: '{count} uložení hráči',
    other: '{count} uložených hráčů',
  },
  'players.emptyHint':
    'Spoluhráči se ukládají sami při založení kola, nebo je přidej rovnou tady.',
  'players.namePlaceholder': 'Jméno',
  'players.hcpPlaceholder': 'HCP',
  'players.hcpFor': 'Handicapový index hráče {name}',
  'players.add': 'Přidat',
  'players.remove': 'Smazat hráče {name}',
  'players.removeConfirm': 'Smazat hráče {name} ze seznamu?',
  'players.addFavorite': 'Zvýraznit {name} na domovské obrazovce',
  'players.removeFavorite': 'Přestat zvýrazňovat {name} na domovské obrazovce',

  // --- úvodní obrazovka ---------------------------------------------------
  'setup.title': 'Golf Games',
  'setup.subtitle': 'Nové kolo',
  'setup.next': 'Další',
  'setup.stepTeeTitle': 'Odpaliště a jamky',
  'setup.stepGameTitle': 'Hra a dvojice',
  'setup.teeIndividualHint': 'Odpaliště jednotlivých hráčů jde vybrat v dalším kroku.',
  'setup.noBet': 'Hrát bez sázky',
  'setup.noBetHint': 'Appka spočítá jen výsledky hry, žádné peníze.',
  'setup.game': 'Hra',
  'setup.gameSettings': 'Nastavení bodování hry',
  'setup.gameSettingsFor': 'Nastavení bodování hry {name}',
  'setup.players': 'Hráči',
  'setup.fixedPlayers': 'Tahle hra se hraje vždy ve {count} hráčích.',
  'setup.savedPlayers': 'Uložení hráči',
  'setup.removePlayer': 'Odebrat {name} ze seznamu',
  'setup.addPlayer': 'Přidat {name} do kola',
  'setup.allPlayersUsed': 'Všichni uložení hráči už jsou v kole.',
  'setup.pairs': 'Dvojice',
  'setup.versus': 'vs',
  'setup.stake': 'Sázka',
  'setup.pointValue': 'Hodnota bodu',
  'setup.pointValueLabel': 'Hodnota jednoho bodu',
  'setup.stakeHint':
    'Na konci kola se rozdíl bodů přepočítá na peníze; prohrávající strana platí vítězné.',
  'setup.holeCount': 'Počet jamek',
  'setup.holeCountHint': 'Par každé jamky nastavíš přímo při hře.',
  'setup.holeCountFromCourse': 'Počet jamek určuje zvolené hřiště.',
  'setup.holesAll': '18 jamek',
  'setup.holesFront': '1–9',
  'setup.holesBack': '10–18',
  'setup.holeRangeHint':
    'Osmnáctku jde hrát celou, nebo jen na první či druhou devítku. Pary, stroke indexy i handicapy se vezmou z vybraných jamek.',
  'setup.loops': 'Části hřiště',
  'setup.loopOrder': 'v pořadí {order}',
  'setup.loopSelection': {
    one: 'Hraje se {loops} – {count} jamka',
    few: 'Hraje se {loops} – {count} jamky',
    other: 'Hraje se {loops} – {count} jamek',
  },
  'setup.loopsHint':
    'Hřiště má víc devítek a záleží na tom, které a v jakém pořadí se hrají – každá kombinace má vlastní pary, stroke indexy i normu. Klepnutím devítku přidáš, dalším klepnutím na poslední ji odebereš. Devítka, která se do osmnácti jamek už nevejde, začne výběr znovu.',

  // Hřiště a handicapy
  'setup.course': 'Hřiště',
  'setup.courseChoice': 'Hřiště',
  'setup.noCourse': 'Bez hřiště',
  'setup.chooseCourse': 'Vybrat hřiště',
  'setup.newCourse': 'Nové hřiště',
  'setup.editCourse': 'Upravit hřiště',
  'setup.tee': 'Odpaliště',
  'setup.teeForAll': 'Odpaliště pro všechny',
  'setup.playerTee': 'Odpaliště hráče {name}',
  'setup.secondNine': 'Druhá devítka',
  'setup.secondNineHint':
    'Devítka se dá zahrát dvakrát dokola nebo ji spojit s jinou; na pořadí záleží.',
  'setup.sameNineTwice': '{name} podruhé',
  'setup.courseHint': 'Pary a stroke indexy se převezmou z hřiště ({count} jamek).',
  'setup.noCourseHint':
    'Bez hřiště se hraje jako dosud: pary se nastavují při hře a handicapy se nepočítají.',
  'setup.handicaps': 'Handicapy',
  'setup.netScoring': 'Hrát na rány s handicapem (netto)',
  'setup.handicapIndex': 'Index',
  'setup.handicapStrokes': 'Rány',
  'setup.handicapFor': 'Handicap hráče {name}',
  'setup.noHandicap': 'bez HCP',
  'setup.strokesGiven': {
    one: '{count} rána',
    few: '{count} rány',
    other: '{count} ran',
  },
  'setup.handicapHintRated':
    'Hrací handicap se počítá z normy odpaliště {tee} (CR {cr}, SR {sr}).',
  'setup.handicapHintPlain':
    'Odpaliště nemá zadanou normu, takže se zadané číslo bere rovnou jako počet ran.',
  'setup.archive': 'Archiv odehraných kol',
  'setup.archiveWithCount': 'Archiv odehraných kol ({count})',
  'setup.backup': 'Záloha dat',
  'setup.signIn': 'Přihlásit se a zálohovat',
  'setup.account': 'Účet a synchronizace',
  'pwa.installApp': 'Přidat Golf Games na plochu',
  'pwa.installAppBenefit':
    'Spustíš aplikaci jedním klepnutím bez adresního řádku. Zápis skóre zůstane dostupný i bez signálu.',
  'pwa.installIosTitle': 'Přidání na plochu',
  'pwa.installIosHint': 'V Safari klepni na Sdílet a zvol Přidat na plochu.',
  'pwa.installBrowserTitle': 'Přidání aplikace',
  'pwa.installBrowserHint':
    'V nabídce prohlížeče zvol Instalovat aplikaci nebo Přidat na plochu.',
  'pwa.installClose': 'Zavřít návod',
  'setup.start': 'Začít kolo',
  'setup.language': 'Jazyk',
  'setup.syncedShort': 'zálohováno',
  'setup.syncingShort': 'synchronizuji',
  'setup.offlineShort': 'bez připojení',

  // --- zápis skóre --------------------------------------------------------
  'play.previousHole': 'Předchozí jamka',
  'play.nextHole': 'Další jamka',
  'play.hole': 'Jamka {number}',
  'play.par': 'Par',
  'play.noScore': 'zatím bez zápisu',
  'play.total': '{strokes} ran · {toPar}',
  'play.bonusesFor': '{name}: extra body',
  'play.minus': '{name}: ubrat ránu, z prázdné buňky birdie',
  'play.score': '{name}: zapsat par, přidržením smazat zápis',
  'play.plus': '{name}: přidat ránu, z prázdné buňky bogey',
  'play.hint':
    'Klepnutím doprostřed zapíšeš par ({par}), tlačítkem − birdie a tlačítkem + bogey. Přidržením čísla zápis smažeš.',
  'play.strokesReceived': {
    one: 'Na téhle jamce dostává {count} ránu',
    few: 'Na téhle jamce dostává {count} rány',
    other: 'Na téhle jamce dostává {count} ran',
  },
  'play.standings': 'Průběžné výsledky',
  'play.finish': 'Ukončit kolo',
  'play.account': 'Účet a záloha',
  'play.next': 'Další jamka',
  'play.skip': 'Přeskočit na další',
  'play.finishAndSave': 'Ukončit a uložit kolo',
  'play.incompleteTitle': 'Kolo není kompletní.',
  'play.incompleteConceded':
    'Chybí zápis na jamkách {holes} – budou se počítat jako vzdané.',
  'play.incompleteUnplayed': 'Nehrané jamky {holes} se do výsledku nezapočítají.',
  'play.incompleteConfirm': 'Uložit kolo i tak?',

  // --- extra body ---------------------------------------------------------
  'bonus.sheetTitle': 'Extra body',
  'bonus.sheetSubtitle': '{name} · jamka {hole}',
  'bonus.none':
    'Pro tuhle jamku nejsou žádné extra body k dispozici. Zapneš je v nastavení hry před začátkem kola; Longest je jen na pětiparových jamkách a Nearest na tříparových.',
  'bonus.footer':
    'Extra bod se počítá celé dvojici. Hodnota platí za par, lepší výsledek ji znásobí podle nastavení hry; při bogey a horším se nepočítá.',
  'bonus.footerPlayer':
    'Extra bod se počítá hráči, který ho zapsal. Hodnota platí za par, lepší výsledek ji znásobí podle nastavení hry; při bogey a horším se nepočítá.',
  'bonus.double.name': 'Dvojnásobná sázka',
  'bonus.double.description': 'Umožňuje zdvojnásobit sázku na jamce.',
  'bonus.longest.name': 'Longest',
  'bonus.longest.description':
    'Nejdelší odpal; jen na pětiparových jamkách, pro jednoho hráče.',
  'bonus.nearest.name': 'Nearest',
  'bonus.nearest.description':
    'Nejbližší rána k jamce; jen na tříparových, pro jednoho hráče.',
  'bonus.bunker.name': 'Bunker (sandie)',
  'bonus.bunker.description': 'Rána z bunkeru a přesto dobrý výsledek.',
  'bonus.doubleBunker.name': 'Double bunker',
  'bonus.doubleBunker.description': 'Dva bunkery na jedné jamce.',
  'bonus.water.name': 'Water',
  'bonus.water.description': 'Míč ve vodě a přesto dobrý výsledek.',
  'bonus.barkie.name': 'Barkie',
  'bonus.barkie.description': 'Trefa do stromu a přesto dobrý výsledek.',
  'bonus.arnie.name': 'Arnie',
  'bonus.arnie.description': 'Dobrý výsledek, aniž by míč byl na fairwayi.',

  // --- nastavení bodování hry --------------------------------------------
  'gameSettings.title': 'Bodování',
  'gameSettings.intro':
    'Nula znamená vypnuto – takový extra bod se při zápisu vůbec nenabídne.',
  'gameSettings.introTeam':
    'Nula znamená vypnuto – takový extra bod se při zápisu vůbec nenabídne. Hodnota platí za par, lepší výsledek ji znásobí podle nastavení níž; při bogey a horším se extra bod nepočítá. Bonus vždy získává celá dvojice.',
  'gameSettings.introPlayer':
    'Nula znamená vypnuto – takový extra bod se při zápisu vůbec nenabídne. Hodnota platí za par, lepší výsledek ji znásobí podle nastavení níž; při bogey a horším se extra bod nepočítá. Bonus získává hráč, který ho zapsal.',
  'gameSettings.noOptions': 'Tahle hra nemá další volby bodování.',
  'gameSettings.extraPoints': 'Extra body',
  'gameSettings.bonusValue': 'Hodnota bonusu {name}',
  'gameSettings.decreaseValue': 'Snížit hodnotu: {name}',
  'gameSettings.increaseValue': 'Zvýšit hodnotu: {name}',
  'gameSettings.pointsSuffix': 'b.',
  'gameSettings.multipliers': 'Násobiče za výsledek',
  'gameSettings.multipliersHint':
    'Kolikrát se hodnota extra bodu počítá, když hráč jamku zahraje pod par. Par platí vždy jednou.',
  'gameSettings.multiplierFor': 'Násobič za {name}',
  'gameSettings.otherOptions': 'Další volby',
  'gameSettings.doubleClosing': '9. a 18. jamka za dvojnásobek',
  'gameSettings.doubleClosingNote': 'u devítijamkového kola jen poslední jamka',
  'gameSettings.noDoubleBonuses': 'Nenásobit extra body',
  'gameSettings.noDoubleBonusesNote':
    'dvojnásobná jamka ani „dvojnásobná sázka“ nenásobí extra body',
  'gameSettings.confirmLongest': 'Potvrzovat Longest',
  'gameSettings.confirmNearest': 'Potvrzovat Nearest',
  'gameSettings.confirmNote': 'při horším výsledku než PAR bod propadá soupeřům',
  'gameSettings.confirmPlayerNote': 'při horším než par se bonus nepočítá',
  'gameSettings.confirmByPersonalPar': 'Potvrzovat Longest osobním PARem',
  'gameSettings.confirmByPersonalParNote':
    'v kole s HCP se Longest potvrzuje parem jamky včetně ran, které na ní hráč dostává; Nearest se potvrzuje vždy brutto parem a brutto kola se volba netýká',
  'gameSettings.confirmSkinsByPar': 'Potvrzení parem',
  'gameSettings.confirmSkinsByParNote':
    'Vítěz jamky musí na následující jamce zahrát alespoň par, jinak se skin přenese do banku.',
  'gameSettings.dotVariant': 'Varianta',
  'gameSettings.dotVariantNine': 'Nine Dot · 9 b.',
  'gameSettings.dotVariantSix': 'Six Dot · 6 b.',
  'gameSettings.dotVariantNote':
    'Nine Dot dělí 9 bodů (5-3-1), Six Dot 6 bodů (4-2-0). Kolo si zvolenou variantu nese s sebou, takže pozdější změna nepřepočítá odehraná kola.',
  'gameSettings.sweepOnTwoStrokes': 'Výhra o 2 rány bere všech {count} bodů',
  'gameSettings.sweepOnTwoStrokesNote':
    'Kdo vyhraje jamku o dvě a víc ran, bere všechny body jamky a na ostatní nezbude nic. Náskok se počítá proti zapsanému druhému výsledku.',
  'gameSettings.doubleSweepOnBirdie': 'Birdie k tomu zdvojnásobí na {count}',
  'gameSettings.doubleSweepOnBirdieNote':
    'Výhra o dvě rány zahraná na birdie a lepší bere dvojnásobek. Nabízí se jen se zapnutou volbou výš.',
  'gameSettings.doubleBest': 'Double Best',
  'gameSettings.doubleBestNote':
    'Bod navíc, když oba partneři zahráli líp než oba soupeři.',
  'gameSettings.doubleBestValue': 'Hodnota Double Best',

  // --- výsledky -----------------------------------------------------------
  'results.archived': 'Archivní kolo',
  'results.final': 'Výsledky',
  'results.live': 'Průběžné výsledky',
  'results.onlyPlayed': 'Počítají se jen jamky, které už mají zápis.',
  'results.conceded': 'Vzdané jamky: {holes} – dvojice na nich přišla o součet.',
  'results.unplayed': 'Kolo skončilo dřív, jamky {holes} se nehrály.',
  'results.settlement': 'Vyrovnání',
  'results.totalWinnings': 'Celková výhra',
  'results.optimizedPayments': 'Optimalizované platby',
  'results.detailedPayments': 'Konkrétní jednotlivé platby',
  'results.pointWorth': 'Bod je {money}.',
  'results.doubleClosingNote': '9. a 18. jamka byla za dvojnásobek.',
  'results.configuration': 'Bodování kola',
  'results.configDoubleClosing': '9. a 18. jamka dvojnásobně',
  'results.configDoubleBest': 'Double Best {count} b.',
  'results.configNoDoubleBonuses': 'extra body se nedoublují',
  'results.configConfirmSkinsByPar': 'vítězné skiny se potvrzují parem',
  'results.backToArchive': 'Zpět do archivu',
  'results.editScores': 'Upravit skóre',
  'results.backToPlay': 'Zpět do hry',
  'results.newRound': 'Nové kolo',
  'results.discardRound': 'Zahodit rozehrané kolo',
  'results.discardConfirm':
    'Rozehrané kolo se smaže a nedá se vrátit. Opravdu ho chceš zahodit?',

  // --- scorekarta ---------------------------------------------------------
  'scorecard.hole': 'Jamka',
  'scorecard.holeShort': 'J',
  'scorecard.par': 'Par',
  'scorecard.total': 'Celkem',
  'scorecard.gameTotal': 'B',

  // --- archiv -------------------------------------------------------------
  'archive.title': 'Archiv',
  'archive.empty': 'Zatím žádné odehrané kolo',
  'archive.count': {
    one: '{count} odehrané kolo',
    few: '{count} odehraná kola',
    other: '{count} odehraných kol',
  },
  'archive.emptyHint':
    'Dohraná kola se sem ukládají sama, jakmile na poslední jamce klepneš na „Ukončit a uložit kolo“.',
  'archive.noResult': 'bez výsledku',
  'archive.draw': 'remíza: {names}',
  'archive.holes': {
    one: '{count} jamka',
    few: '{count} jamky',
    other: '{count} jamek',
  },
  'archive.holesPartial': '{done} z {total} jamek',
  'archive.netScoring': 's HCP',
  'archive.grossScoring': 'bez HCP',
  'archive.deleteConfirm': 'Smazat kolo z {date} z archivu?',
  'archive.deleteLabel': 'Smazat kolo z {date}',

  // --- záloha do souboru --------------------------------------------------
  'backup.title': 'Záloha dat',
  'backup.subtitle': 'Export a obnova',
  'backup.intro':
    'Kola, hráči i nastavení jsou uložená jen v tomhle zařízení. Zálohou si je odneseš do souboru – před výměnou telefonu nebo jen pro jistotu.',
  'backup.exportTitle': 'Zálohovat',
  'backup.download': 'Stáhnout zálohu',
  'backup.downloadHint':
    'Uloží se jeden soubor JSON se vším: rozehrané kolo, archiv, seznam hráčů i nastavení bodování. Na iPhonu se soubor nabídne přes sdílení – ulož ho třeba do Souborů nebo si ho pošli e-mailem.',
  'backup.downloaded': 'Záloha se stáhla.',
  'backup.importTitle': 'Obnovit ze zálohy',
  'backup.merge': 'Sloučit',
  'backup.replace': 'Nahradit vše',
  'backup.mergeHint':
    'Kola ze zálohy se přidají k těm současným a nic se nesmaže. Rozehrané kolo zůstane to současné.',
  'backup.replaceHint':
    'Všechna současná data se zahodí a nahradí obsahem zálohy. Hodí se na novém zařízení.',
  'backup.choose': 'Vybrat soubor se zálohou',
  'backup.mergeConfirm':
    'Sloučit zálohu z {date} se současnými daty? Nic se nesmaže, záloha obsahuje {count} kol.',
  'backup.replaceConfirm':
    'Nahradit všechna data zálohou z {date}? Současná kola se smažou. Záloha obsahuje {count} kol.',
  'backup.summary': 'V archivu je {count} kol',
  'backup.summaryAdded': 'z toho {count} nových',
  'backup.summaryCurrent': 'obnovilo se i rozehrané kolo',
  'backup.errorInvalid': 'Tenhle soubor není záloha Golf Games, nebo je poškozený.',
  'backup.errorTooNew':
    'Záloha pochází z novější verze aplikace. Aktualizuj aplikaci a zkus to znovu.',

  // --- účet a synchronizace ----------------------------------------------
  'account.title': 'Účet',
  'account.subtitle': 'Záloha do cloudu',
  'account.disabledNotice':
    'Tahle verze aplikace nemá nastavené připojení k cloudu, takže se nejde přihlásit. Data si zatím zálohuj přes obrazovku „Záloha dat“.',
  'account.missingTitle': 'Co chybí',
  'account.missingHint':
    'Buildu se nedostaly tyhle údaje – doplň je v repozitáři jako GitHub Secrets (Settings → Secrets and variables → Actions) a spusť nasazení znovu:',
  'account.missingFooter':
    'Postup je popsaný v docs/sync.md. Verze aplikace je {version} – zkontroluj, že je to ta nasazená.',
  'account.signedIn': 'Přihlášen',
  'account.lastSync': 'Naposledy {time}.',
  'account.syncNow': 'Synchronizovat teď',
  'account.signOutTitle': 'Odhlášení',
  'account.signOutHint':
    'Po odhlášení zůstanou kola v tomhle zařízení a přestanou se zálohovat. Data v cloudu se nemažou – po přihlášení se zase objeví.',
  'account.signOut': 'Odhlásit se',
  'account.deleteTitle': 'Smazání účtu',
  'account.deleteHint':
    'Smaže účet i všechna data v cloudu. Kola v tomhle telefonu zůstanou – pokud si je chceš odnést, udělej si nejdřív zálohu do souboru.',
  'account.delete': 'Smazat účet a data v cloudu',
  'account.deleteConfirm':
    'Smazat účet a všechna data v cloudu?\n\nKola uložená v tomhle telefonu zůstanou. Přijdeš o zálohu a o přístup z jiných zařízení. Akce je nevratná.',
  'account.intro':
    'Bez přihlášení jsou kola uložená jen v tomhle zařízení. Přihlášením účtem Google se začnou zálohovat a dostaneš se k nim odkudkoli – z telefonu, tabletu i počítače.',
  'account.signIn': 'Přihlásit se účtem Google',
  'account.signingIn': 'Přihlašuji…',
  'account.preparing': 'Připravuji přihlášení…',
  'account.optional':
    'Nic se nemusí – aplikace funguje bez přihlášení úplně stejně. Zálohu do souboru najdeš na obrazovce „Záloha dat“.',
  'account.storedTitle': 'Co se ukládá',
  'account.storedHint':
    'Odehraná kola, seznam spoluhráčů a nastavení bodování. Z účtu Google jen e-mail a jméno, aby šlo data přiřadit. Nic dalšího se nesbírá a nikomu se nepředává.',
  'account.privacy': 'Zásady zpracování údajů',

  // stavy synchronizace
  'sync.disabled': 'Synchronizace není v téhle verzi dostupná.',
  'sync.anonymous': 'Nepřihlášeno – data jsou jen v tomhle zařízení.',
  'sync.syncing': 'Synchronizuji…',
  'sync.synced': 'Data jsou zálohovaná.',
  'sync.offline': 'Bez připojení. Změny se pošlou, až bude signál.',
  'sync.error': 'Synchronizace se nepovedla. Zkusím to znovu při dalším spuštění.',

  // chyby přihlášení
  'signIn.network': 'Přihlášení se nepovedlo kvůli připojení. Zkus to prosím znovu.',
  'signIn.unavailable': 'Přihlášení se nepovedlo. Zkus to prosím znovu.',
  'signIn.notReady': 'Přihlášení se ještě připravuje, zkus to prosím za okamžik.',
  'signIn.unknown': 'Něco se pokazilo. Zkus to prosím znovu.',

  // chyby synchronizace
  'syncError.permissionDenied':
    'Databáze odmítla přístup. Nejspíš nejsou nasazená pravidla – Firebase Console → Firestore Database → Rules.',
  'syncError.notFound':
    'Databáze Firestore neexistuje. Vytvoř ji: Firebase Console → Build → Firestore Database → Create database.',
  'syncError.unavailable':
    'Databáze není dostupná. Buď není vytvořená, nebo se k ní nedá připojit.',
  'syncError.unauthenticated': 'Přihlášení vypršelo. Odhlas se a přihlas znovu.',
  'syncError.failedPrecondition':
    'Firestore hlásí, že projekt není připravený – zkontroluj, že je databáze vytvořená.',
  'syncError.other': 'Chyba {code}.',
  'syncError.unknown': 'Neznámá chyba při synchronizaci.',

  // --- zásady zpracování údajů -------------------------------------------
  'privacy.title': 'Zpracování údajů',
  'privacy.offlineTitle': 'Bez přihlášení',
  'privacy.offline':
    'Aplikace bez přihlášení neodesílá nikam nic. Všechna data – odehraná kola, jména spoluhráčů i nastavení – zůstávají v úložišti prohlížeče ve tvém zařízení. Neexistuje žádný účet ani server, který by o nich věděl.',
  'privacy.cloudTitle': 'S přihlášením',
  'privacy.cloud':
    'Když se přihlásíš účtem Google, ukládají se tato data do služby Google Firebase (Firestore), aby byla zálohovaná a dostupná z dalších zařízení:',
  'privacy.itemRounds':
    'odehraná a rozehraná kola včetně skóre, hráčů a nastavení bodování',
  'privacy.itemRoster': 'seznam uložených spoluhráčů',
  'privacy.itemSettings': 'předvolby sázky a bodování',
  'privacy.itemAccount': 'e-mail a jméno z účtu Google, aby šlo data přiřadit',
  'privacy.accessTitle': 'Kdo k datům má přístup',
  'privacy.access':
    'Jen ty. Pravidla databáze jsou nastavená tak, že ke svým datům se dostane výhradně přihlášený vlastník. Data se nikomu nepředávají, nepoužívají se k reklamě ani k profilování. Zpracovatelem úložiště je Google Ireland Limited jako provozovatel Firebase.',
  'privacy.retentionTitle': 'Jak dlouho',
  'privacy.retention':
    'Dokud data sám nesmažeš. Účet i všechna data v cloudu smažeš tlačítkem „Smazat účet a data v cloudu“ na obrazovce Účet. Smazání je okamžité a nevratné.',
  'privacy.rightsTitle': 'Tvá práva',
  'privacy.rights':
    'Máš právo na přístup k údajům, jejich opravu, výmaz a přenositelnost. Přístup i přenositelnost pokrývá tlačítko „Stáhnout zálohu“ na obrazovce Záloha dat, které vydá všechna data v otevřeném formátu JSON. Opravit je můžeš přímo v aplikaci, smazat tlačítkem výše.',
  'privacy.contactTitle': 'Kontakt',
  'privacy.contact':
    'Správcem údajů je provozovatel aplikace. S čímkoli ohledně zpracování se ozvi na',
  'privacy.publicVersion': 'Veřejná verze téhle stránky je na',

  // --- výsledky na jamce --------------------------------------------------
  'score.eagle': 'Eagle a lepší',
  'score.birdie': 'Birdie',
  'score.par': 'Par',
  'score.bogey': 'Bogey',
  'score.double': 'Doble',
  'score.triple': 'Triple',

  // --- násobiče za výsledek ----------------------------------------------
  'tee.sheetTitle': 'Odpaliště – {name}',
  'tee.useForAll': 'Použít pro všechny hráče',
  'tee.notRated': 'bez normy',
  'tee.rating': 'CR {cr} / SR {sr}',
  'tier.birdie.name': 'Birdie',
  'tier.birdie.note': 'jedna rána pod par',
  'tier.eagle.name': 'Eagle',
  'tier.eagle.note': 'dvě rány pod par',
  'tier.albatross.name': 'Albatros',
  'tier.albatross.note': 'tři rány pod par',
  'tier.condor.name': 'Condor',
  'tier.condor.note': 'čtyři a víc ran pod par',

  // --- hry ----------------------------------------------------------------
  'games.best-aggregate.name': 'Best + Součet',
  'games.best-aggregate.tagline': 'Dvě dvojice, body za výsledek a volitelné bonusy',
  'games.best-aggregate.rules':
    'Hrají vždy čtyři hráči ve dvou dvojicích. Na každé jamce se porovnává lepší míč a součet obou partnerů. Další body a jejich násobení se řídí nastavením hry. Vyhrává dvojice s nejvyšším počtem bodů.',
  'games.left-right.name': 'Levá-Pravá',
  'games.left-right.tagline':
    '(Kraje-Středy) · dvojice podle prvních ran, nová dvojice na každé jamce',
  'games.left-right.rules':
    'Hrají vždy čtyři hráči. Před každou jamkou se podle prvních ran určí dvě dvojice. Bodování je stejné jako u Best + Součet, ale body se zapisují každému hráči zvlášť podle dvojice, ve které na dané jamce hraje.',
  'games.skins.name': 'Skins',
  'games.skins.tagline': 'Každá jamka je skin, shoda ho přenáší dál',
  'games.skins.rules':
    'Hraje se za jednotlivce, 2 až 4 hráči. Každá jamka je jeden skin a bere ho hráč s nejnižším počtem ran. Když je na jamce shoda, skin se nepřiděluje a přičte se k další jamce. Vyhrává hráč s nejvíc skiny.',
  'games.match-play.name': 'Match play',
  'games.match-play.tagline': 'Zápas na jamky, ne na rány',
  'games.match-play.rules':
    'Zápas dvou stran - buď dva hráči proti sobě, nebo dvě dvojice, za které hraje vždy lepší míč. Kdo zahraje jamku líp, jde o jednu nahoru; shodná jamka je dělená. Zápas končí, jakmile je náskok větší než počet zbývajících jamek.',
  'games.stableford.name': 'Stableford',
  'games.stableford.tagline': 'Body za jamku, zkažená jamka kolo nezničí',
  'games.stableford.rules':
    'Hraje se za jednotlivce, 1 až 4 hráči. Za jamku se počítají body podle výsledku vůči paru: par 2 body, birdie 3, eagle 4, bogey 1, dvojbogey a horší nic. Se zapnutým netto se výsledek počítá po odečtení ran, které hráč na jamce dostává podle jejího stroke indexu. Vyhrává hráč s nejvíc body.',
  'games.dots.name': 'Dots',
  'games.dots.tagline': 'Nine Dot nebo Six Dot · body za pořadí na jamce, tři hráči',
  'games.dots.rules':
    'Hra pro tři hráče. Na každé jamce je v sázce pevný počet bodů a rozdělí se podle pořadí. Nine Dot (Devítka) rozdává 9 bodů: 5-3-1, při shodě dvou nejlepších 4-4-1, při shodě dvou nejhorších 5-2-2 a při remíze všech 3-3-3. Six Dot (Šestka) rozdává 6 bodů: 4-2-0, 3-3-0, 4-1-1 a 2-2-2. Variantu i obě nadstavby zapneš v nastavení bodování hry.',

  // Best + Součet
  'best.points': 'Body',
  'best.headerNote': 'Průběžné skóre',
  'best.pointsDescription':
    'Za jamku: body za lepší míč, nižší součet a další bonusy podle nastavení hry.',
  'best.best': 'Best',
  'best.aggregate': 'Součet',
  'best.holePoints': 'Body',
  'best.detailBest': 'BEST {count}',
  'best.detailAggregate': 'Součet {count}',
  'best.detailDoubleBest': '2×BEST {count}',
  'best.detailBonus': 'Bonus {count}',
  'best.detailExtra': 'Extra {count}',
  'best.conceded': 'vzdáno',

  // Levá-Pravá
  'leftRight.left': 'Levá',
  'leftRight.right': 'Pravá',
  'leftRight.setupTitle': 'Dvojice',
  'leftRight.setupHint': 'Vyber dvojici podle prvních ran z odpaliště.',
  'leftRight.setupReady': 'Dvojice jsou připravené.',
  'leftRight.title': 'Body hráčů',
  'leftRight.description': 'Body dvojice se na každé jamce připíšou oběma jejím hráčům.',
  'leftRight.detail': 'Body za dvojici na jednotlivých jamkách',
  'leftRight.headerNote': 'Součet osobních bodů',
  'leftRight.pairing': 'Dvojice',
  'leftRight.notReady': 'nejdřív urč dvojice',
  'leftRight.scorecardPair': 'Dvojice: {pair}',
  'leftRight.column': 'B',

  // Skins
  'skins.title': 'Skiny',
  'skins.pending': 'V banku zůstává {count} nerozdělených skinů.',
  'skins.description': 'Shoda na jamce skin nepřidělí a přenese ho do další.',
  'skins.noHole': 'zatím žádná jamka',
  'skins.wonHoles': '{count} vyhraných jamek: {holes}',
  'skins.scoreDetail': 'Skiny {skins} · Extra {extra} b.',
  'skins.scorecardSkin': {
    one: '{name}: 1 skin',
    few: '{name}: {count} skiny',
    other: '{name}: {count} skinů',
  },
  'skins.scorecardSkinCarried': '{name}: skin z této jamky byl přenesen a později získán',
  'skins.scorecardExtra': {
    one: '{name}: +1 extra bod',
    few: '{name}: +{count} extra body',
    other: '{name}: +{count} extra bodů',
  },
  'skins.scorecardTotal': '{name}: {skins} skinů +{extra} extra bodů = {total} celkem',
  'skins.headerNote': 'Skiny + extra body',
  'skins.atStake': 'V sázce',
  'skins.reservedBy': 'Rezervuje',
  'skins.takes': 'Bere',

  // Stableford
  'stableford.title': 'Body',
  'stableford.description': 'Par 2 body, birdie 3, eagle 4, bogey 1, horší nic.',
  'stableford.netDescription':
    'Netto: rány se odečítají podle stroke indexu jamky. Par 2 body, birdie 3, eagle 4, bogey 1, horší nic.',
  'stableford.grossDetail': 'brutto',
  'stableford.netDetail': 'netto, HCP {handicap}',
  'stableford.column': 'B',
  'stableford.received': 'Rány',
  'stableford.relativeStrokes': {
    one: '{name}: {count} rána k dobru vůči nejlepšímu HCP',
    few: '{name}: {count} rány k dobru vůči nejlepšímu HCP',
    other: '{name}: {count} ran k dobru vůči nejlepšímu HCP',
  },
  'stableford.headerNote': 'Body za jamku: par 2, birdie 3, eagle 4, bogey 1.',
  'stableford.headerNetNote': 'Netto body podle stroke indexu jamky.',

  // Dots (Nine Dot / Six Dot)
  'dot.nineName': 'Nine Dot',
  'dot.sixName': 'Six Dot',
  'dot.title': 'Body',
  'dot.description': '{variant}: na každé jamce se mezi tři hráče dělí {count} bodů.',
  'dot.headerNote': '{variant} · {count} bodů na jamce',
  'dot.column': 'B',
  'dot.columnAria': '{name}: body za jamku',

  // Zadání hřiště
  'scorecard.strokeIndex': 'Stroke index jamky',
  'scorecard.strokeIndexShort': 'SI',
  'scorecard.title': 'Scorekarta',
  'scorecard.dotsCourse': 'Hřiště',
  'scorecard.dotsBestPlayer': 'Nejlepší hráč',
  'scorecard.dotsCourseAria': {
    one: '{name}: {count} rána podle HCP hřiště',
    few: '{name}: {count} rány podle HCP hřiště',
    other: '{name}: {count} ran podle HCP hřiště',
  },
  'scorecard.dotsBestPlayerAria': {
    one: '{name}: {count} rána k dobru vůči nejlepšímu HCP',
    few: '{name}: {count} rány k dobru vůči nejlepšímu HCP',
    other: '{name}: {count} ran k dobru vůči nejlepšímu HCP',
  },

  // Výběr hřiště
  'picker.title': 'Výběr hřiště',
  'picker.startTitle': 'Kde se hraje?',
  'picker.browseTitle': 'Hřiště',
  'picker.skipCourse': 'Hrát bez hřiště',
  'picker.count': '{stored} v telefonu, {total} k dispozici',
  'picker.loading': 'Načítám katalog hřišť…',
  'picker.inCatalog': 'v katalogu',
  'picker.downloaded': 'staženo',
  'picker.privateCourse': 'vlastní',
  'picker.downloading': 'stahuji…',
  'picker.rated': 's normou',
  'picker.notRated': 'bez normy',
  'picker.errorOffline':
    'Katalog se nepodařilo načíst, nejspíš chybí připojení. Hřiště uložená v telefonu fungují dál.',
  'picker.errorMissing':
    'Katalog na své adrese neodpovídá. Hřiště uložená v telefonu fungují dál.',
  'picker.errorBroken':
    'Katalog vrátil něco, čemu aplikace nerozumí. Hřiště uložená v telefonu fungují dál.',
  'picker.search': 'Hledat podle názvu nebo klubu',
  'picker.sortNearest': 'Řadit podle vzdálenosti od mé polohy',
  'picker.sortGrouped': 'Řadit podle skupin a abecedy',
  'picker.country': 'Země',
  'picker.allCountries': 'Všechny země',
  'picker.locationUnavailable':
    'Poloha není dostupná. Zobrazuji hřiště podle skupin a abecedy.',
  'picker.addFavorite': 'Přidat hřiště {name} mezi oblíbená',
  'picker.removeFavorite': 'Odebrat hřiště {name} z oblíbených',
  'picker.noCourseMeta': 'Pary se nastavují při hře, handicapy se nepočítají.',
  'picker.credit': 'Hřiště z otevřeného katalogu Golf Games, licence ODbL.',
  'picker.creditLink': 'Zdroj a opravy',
  'picker.holes': { one: '{count} jamka', few: '{count} jamky', other: '{count} jamek' },
  'picker.loops': {
    one: '{count} devítka',
    few: '{count} devítky',
    other: '{count} devítek',
  },
  'picker.tees': {
    one: '{count} odpaliště',
    few: '{count} odpaliště',
    other: '{count} odpališť',
  },
  'picker.noTees': 'bez odpališť',
  'picker.nothingFound': 'Nic nenalezeno. Zkus jiný název, nebo hřiště přidej ručně.',

  'course.newTitle': 'Nové hřiště',
  'course.editTitle': 'Úprava hřiště',
  'course.name': 'Název',
  'course.namePlaceholder': 'Např. Karlštejn',
  'course.nameRequired': 'Hřiště potřebuje název.',
  'course.parTotal': 'Par hřiště: {count}',
  'course.attribution': 'Zdroj údajů: {source}',
  'course.holes': 'Jamky',
  'course.holesHint':
    'U každé jamky nastav par a její obtížnost. Stroke index se posouvá tlačítky, aby zůstal pořadím bez duplicit.',
  'course.loopName': 'Název {number}. devítky',
  'course.loopsHint':
    'Hřiště s víc než osmnácti jamkami se dělí na devítky. Kolo se z nich pak skládá při zakládání hry a záleží na pořadí.',
  'course.parForHole': 'Par {par} na jamce {hole}',
  'course.siShort': 'SI {si}',
  'course.harder': 'Jamka {hole} je těžší',
  'course.easier': 'Jamka {hole} je lehčí',
  'course.tees': 'Odpaliště',
  'course.teesHint':
    'Course Rating a Slope Rating jsou potřeba jen pro dopočet hracího handicapu z indexu. Bez nich hřiště funguje dál. U devítijamkového hřiště zadej devítijamkovou normu, jinak vyjde handicap zhruba dvojnásobný.',
  'course.teeName': 'Název odpaliště',
  'course.teeNamePlaceholder': 'Např. žlutá',
  'course.tee.black': 'Černá',
  'course.tee.blue': 'Modrá',
  'course.tee.bronze': 'Bronzová',
  'course.tee.darkGreen': 'Tmavě zelená',
  'course.tee.gold': 'Zlatá',
  'course.tee.green': 'Zelená',
  'course.tee.jade': 'Jadeitová',
  'course.tee.members': 'Členská',
  'course.tee.men': 'Muži',
  'course.tee.middle': 'Střední',
  'course.tee.orange': 'Oranžová',
  'course.tee.players': 'Hráčská',
  'course.tee.purple': 'Fialová',
  'course.tee.red': 'Červená',
  'course.tee.silver': 'Stříbrná',
  'course.tee.tournament': 'Turnajová',
  'course.tee.white': 'Bílá',
  'course.tee.yellow': 'Žlutá',
  'course.tee.number': 'Odpaliště {number}',
  'course.courseRating': 'CR',
  'course.slopeRating': 'SR',
  'course.courseRatingFor': 'Course Rating odpaliště {tee}',
  'course.slopeRatingFor': 'Slope Rating odpaliště {tee}',
  'course.addTee': 'Přidat odpaliště',
  'course.removeTee': 'Odebrat odpaliště',
  'course.delete': 'Smazat hřiště',
  'course.save': 'Uložit hřiště',

  // Match play
  'match.title': 'Stav zápasu',
  'match.notStarted': 'Zápas ještě nezačal',
  'match.allSquareRemaining': 'Nerozhodně, zbývá {count} jamek',
  'match.wins': '{name} vyhrává {lead}&{remaining}',
  'match.winsFinal': '{name} vyhrává {lead} UP',
  'match.allSquareFinished': 'Nerozhodně po poslední jamce',
  'match.dormie': '{name} vede {lead} UP (dormie), zbývá {remaining} jamek',
  'match.leads': '{name} vede {lead} UP, zbývá {remaining} jamek',
  'match.allSquare': 'AS',
  'match.up': '{count} UP',
  'match.down': '{count} DOWN',
  'match.detail': '{won} vyhraných jamek · {halved} dělených',
  'match.takesHole': 'Jamku bere',
  'match.scorecardWonHole': '{name}: vyhraná jamka',
  'match.outOfPlayShort': 'Mimo hru',
  'match.remainingShort': {
    one: 'zbývá {count} jamka',
    few: 'zbývají {count} jamky',
    other: 'zbývá {count} jamek',
  },
  'match.dormieShort': {
    one: 'dormie · zbývá {count} jamka',
    few: 'dormie · zbývají {count} jamky',
    other: 'dormie · zbývá {count} jamek',
  },
  'match.resultShort': '{lead}&{remaining}',
  'match.finalShort': 'konec · {lead} UP',
  'match.finishedShort': 'konec',
  'match.halved': 'dělená',
  'match.takes': 'bere',
  'match.loses': 'ztrácí',
  'match.bestBall': 'Lepší míč',
  'match.hole': 'Jamka',
  'match.outOfPlay': 'Mimo hru – zápas už je rozhodnutý',

  // --- peněžní vyrovnání --------------------------------------------------
  'money.nobodyOwes': 'Nikdo nikomu nic nedluží.',
  'money.eachOpponent': 'Každý bod navíc platí každý ze soupeřů zvlášť.',
  'money.optimizedSettlement':
    'Platby jsou sloučené do nejmenšího možného počtu převodů.',
  'money.draw': 'Nerozhodně, nikdo nikomu nic nedluží.',
  'money.transfers':
    'Rozdíl {units} b. × {value} = {amount}, které platí každý hráč zvlášť.',
} satisfies Record<string, Message>
