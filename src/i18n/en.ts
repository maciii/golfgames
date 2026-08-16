import type { Message } from './plural'
import type { MessageKey } from './index'

/**
 * English texts.
 *
 * The type is `Record<MessageKey, Message>`, so a missing key is a compile
 * error, not a string that silently stays Czech in the app.
 */
export const en: Record<MessageKey, Message> = {
  // --- shared -------------------------------------------------------------
  'common.back': 'Back',
  'common.close': 'Close',
  'common.done': 'Done',
  'common.edit': 'Edit',
  'common.version': 'version {version}',
  'common.player': 'Player {number}',
  'common.strokes': '{count} strokes',
  'common.points': '{count} pts',
  'common.holePoints': 'Points for the hole',
  'common.dash': '–',

  // --- home screen and menu ------------------------------------------------
  'home.openMenu': 'Menu',
  'home.newRound': 'New round',
  'home.recentRounds': 'Recent rounds',
  'home.seeArchive': 'Archive',
  'home.favoritePlayers': 'Favorite players',
  'home.favoriteCourses': 'Favorite courses',
  'menu.title': 'Menu',
  'menu.courses': 'Courses',
  'menu.coursesCount': {
    one: '{count} saved',
    other: '{count} saved',
  },
  'menu.players': 'Players',
  'menu.playersCount': {
    one: '{count} playing partner',
    other: '{count} playing partners',
  },
  'menu.archive': 'Archive',
  'menu.archiveCount': {
    one: '{count} played',
    other: '{count} played',
  },
  'menu.backup': 'Backup',
  'menu.account': 'Account',

  // --- players (roster management) -----------------------------------------
  'players.title': 'Players',
  'players.empty': 'No saved players yet',
  'players.count': {
    one: '{count} saved player',
    other: '{count} saved players',
  },
  'players.emptyHint':
    'Playing partners save themselves when you start a round, or add one right here.',
  'players.namePlaceholder': 'Name',
  'players.hcpPlaceholder': 'HCP',
  'players.hcpFor': 'Handicap index for {name}',
  'players.add': 'Add',
  'players.remove': 'Remove {name}',
  'players.removeConfirm': 'Remove {name} from the list?',
  'players.addFavorite': 'Highlight {name} on the home screen',
  'players.removeFavorite': 'Stop highlighting {name} on the home screen',
  'players.teeFor': 'Default tee for {name}',
  'players.defaultTee': 'Default tee',
  'players.noTeePreference': 'No default tee',

  // --- setup --------------------------------------------------------------
  'setup.subtitle': 'New round',
  'setup.next': 'Next',
  'setup.stepTeeTitle': 'Tees and holes',
  'setup.stepGameTitle': 'Game and teams',
  'setup.teeIndividualHint': 'Individual player tees can be set in the next step.',
  'setup.noBet': 'Play without a bet',
  'setup.noBetHint': 'The app will only work out the game result, no money.',
  'setup.game': 'Game',
  'setup.gameSettings': 'Scoring settings',
  'setup.gameSettingsFor': 'Scoring settings for {name}',
  'setup.players': 'Players',
  'setup.fixedPlayers': 'This game is always played by {count} players.',
  'setup.savedPlayers': 'Saved players',
  'setup.removePlayer': 'Remove {name} from the list',
  'setup.addPlayer': 'Add {name} to the round',
  'setup.allPlayersUsed': 'All saved players are already in the round.',
  'setup.pairs': 'Pairs',
  'setup.pairsChoose': 'Choose pairs',
  'setup.pairsHint': 'Pairs can be changed during the round; results are recalculated.',
  'setup.opponentsHint':
    'Who plays whom can be changed during the round; both matches are recalculated.',
  'setup.pairsEditHint':
    'The change applies right away and the round is recalculated from hole one. Entered scores are kept.',
  'setup.editRoundSubtitle': 'Round setup',
  'setup.backToRound': 'Back to the round',
  'setup.versus': 'vs',
  'setup.stake': 'Stake',
  'setup.pointValue': 'Point value',
  'setup.pointValueLabel': 'Value of one point',
  'setup.stakeHint':
    'At the end of the round the point difference is converted to money; the losing side pays the winning one.',
  'setup.holeCount': 'Number of holes',
  'setup.holeCountHint': 'You set the par of each hole while playing.',
  'setup.holeCountFromCourse': 'The selected course sets the number of holes.',
  'setup.holesAll': '18 holes',
  'setup.holesFront': '1–9',
  'setup.holesBack': '10–18',
  'setup.holeRangeHint':
    'An 18-hole course can be played in full, or as just the front or back nine. Pars, stroke indexes and handicaps come from the holes you pick.',
  'setup.loops': 'Course loops',
  'setup.loopOrder': 'played {order}',
  'setup.loopSelection': {
    one: 'Playing {loops} – {count} hole',
    other: 'Playing {loops} – {count} holes',
  },
  'setup.loopsHint':
    'This course has more than one nine, and which ones you play — and in what order — matters: every combination has its own pars, stroke indexes and rating. Tap a nine to add it, tap the last one again to drop it. A nine that no longer fits into eighteen holes starts a new selection.',

  // Courses and handicaps
  'setup.course': 'Course',
  'setup.courseChoice': 'Course',
  'setup.noCourse': 'No course',
  'setup.chooseCourse': 'Choose a course',
  'setup.newCourse': 'New course',
  'setup.editCourse': 'Edit course',
  'setup.tee': 'Tee',
  'setup.teeForAll': 'Tee for everyone',
  'setup.playerTee': 'Tee for {name}',
  'setup.secondNine': 'Second nine',
  'setup.secondNineHint':
    'A nine can be played twice around or joined with another one; the order matters.',
  'setup.sameNineTwice': '{name} again',
  'setup.courseHint': 'Pars and stroke indexes come from the course ({count} holes).',
  'setup.noCourseHint':
    'Without a course nothing changes: pars are set while playing and handicaps are not used.',
  'setup.handicaps': 'Handicaps',
  'setup.netScoring': 'Play with handicap strokes (net)',
  'setup.handicapIndex': 'Index',
  'setup.handicapStrokes': 'Strokes',
  'setup.handicapShort': 'HCP',
  'setup.handicapFor': 'Handicap for {name}',
  'setup.noHandicap': 'no HCP',
  'setup.strokesGiven': { one: '{count} stroke', other: '{count} strokes' },
  'setup.handicapHintRated':
    'The playing handicap is calculated from the {tee} tee rating (CR {cr}, SR {sr}).',
  'setup.handicapHintPlain':
    'The tee has no rating, so the number you enter is used directly as strokes.',
  'setup.archive': 'Archive of played rounds',
  'setup.archiveWithCount': 'Archive of played rounds ({count})',
  'setup.backup': 'Data backup',
  'setup.signIn': 'Sign in and back up',
  'setup.account': 'Account and sync',
  'pwa.installApp': 'Add Fairsome to home screen',
  'pwa.installAppBenefit':
    'Open the app with one tap without the address bar. Scoring stays available even without a signal.',
  'pwa.installIosTitle': 'Add to home screen',
  'pwa.installIosHint': 'In Safari, tap Share and choose Add to Home Screen.',
  'pwa.installBrowserTitle': 'Install the app',
  'pwa.installBrowserHint':
    'Open the browser menu and choose Install app or Add to home screen.',
  'pwa.installClose': 'Close instructions',
  'setup.start': 'Start round',
  'setup.language': 'Language',
  'setup.syncedShort': 'backed up',
  'setup.syncingShort': 'syncing',
  'setup.offlineShort': 'offline',

  // --- playing ------------------------------------------------------------
  'play.backToSetup': 'Back to round setup',
  'play.previousHole': 'Previous hole',
  'play.nextHole': 'Next hole',
  'play.hole': 'Hole {number}',
  'play.par': 'Par',
  'play.noScore': 'no score yet',
  'play.total': '{strokes} strokes · {toPar}',
  'play.bonusesFor': '{name}: extra points',
  'play.minus': '{name}: one stroke less, birdie from an empty cell',
  'play.score': '{name}: enter par, press and hold to clear',
  'play.plus': '{name}: one stroke more, bogey from an empty cell',
  'play.hint':
    'Tap the middle to enter par ({par}), − for a birdie and + for a bogey. Press and hold the number to clear it.',
  'play.strokesReceivedPair': {
    one: 'The pair receives 1 stroke on this hole',
    other: 'The pair receives {count} strokes on this hole',
  },
  'play.strokesReceived': {
    one: 'Receives {count} stroke on this hole',
    other: 'Receives {count} strokes on this hole',
  },
  'play.standings': 'Standings',
  'play.finish': 'Finish',
  'play.account': 'Account',
  'play.next': 'Next hole',
  'play.skip': 'Skip to next',
  'play.finishAndSave': 'Finish and save round',
  'play.saveEdits': 'Done, back to archive',
  'play.incompleteTitle': 'The round is not complete.',
  'play.incompleteConceded':
    'Missing scores on holes {holes} – they will count as conceded.',
  'play.incompleteUnplayed': 'Unplayed holes {holes} will not count towards the result.',
  'play.incompleteConfirm': 'Save the round anyway?',

  // --- extra points -------------------------------------------------------
  'bonus.sheetTitle': 'Extra points',
  'bonus.sheetSubtitle': '{name} · hole {hole}',
  'bonus.none':
    'No extra points are available for this hole. You turn them on in the game settings before the round; Longest is only on par 5 holes and Nearest on par 3.',
  'bonus.footer':
    'An extra point counts for the whole pair. The value applies to par, a better result multiplies it according to the game settings; a bogey or worse scores nothing.',
  'bonus.footerPlayer':
    'An extra point counts for the player who entered it. The value applies to par, a better result multiplies it according to the game settings; a bogey or worse scores nothing.',
  'bonus.double.name': 'Double stake',
  'bonus.double.description': 'Allows doubling the stake on the hole.',
  'bonus.longest.name': 'Longest',
  'bonus.longest.description': 'Longest drive; par 5 holes only, for a single player.',
  'bonus.nearest.name': 'Nearest',
  'bonus.nearest.description': 'Nearest to the pin; par 3 only, for a single player.',
  'bonus.bunker.name': 'Bunker (sandie)',
  'bonus.bunker.description': 'Out of a bunker and still a good result.',
  'bonus.doubleBunker.name': 'Double bunker',
  'bonus.doubleBunker.description': 'Two bunkers on a single hole.',
  'bonus.water.name': 'Water',
  'bonus.water.description': 'Ball in the water and still a good result.',
  'bonus.barkie.name': 'Barkie',
  'bonus.barkie.description': 'Hit a tree and still a good result.',
  'bonus.arnie.name': 'Arnie',
  'bonus.arnie.description': 'A good result without ever being on the fairway.',

  // --- scoring settings ---------------------------------------------------
  'gameSettings.title': 'Scoring',
  'gameSettings.intro': 'Zero means off – such an extra point is not offered at all.',
  'gameSettings.introTeam':
    'Zero means off – such an extra point is not offered at all. The value applies to par, a better result multiplies it according to the settings below; a bogey or worse scores nothing. A bonus always counts for the whole pair.',
  'gameSettings.introPlayer':
    'Zero means off – such an extra point is not offered at all. The value applies to par, a better result multiplies it according to the settings below; a bogey or worse scores nothing. A bonus counts for the player who entered it.',
  'gameSettings.noOptions': 'This game has no additional scoring options.',
  'gameSettings.extraPoints': 'Extra points',
  'gameSettings.bonusValue': 'Value of the {name} bonus',
  'gameSettings.decreaseValue': 'Decrease value: {name}',
  'gameSettings.increaseValue': 'Increase value: {name}',
  'gameSettings.pointsSuffix': 'pts',
  'gameSettings.multipliers': 'Result multipliers',
  'gameSettings.multipliersHint':
    'How many times the extra point counts when the hole is played under par. Par always counts once.',
  'gameSettings.multipliersWithHandicap': 'Apply handicap',
  'gameSettings.multipliersWithHandicapNote':
    'Unchecked, the multiplier follows the actual score - a birdie means one under the hole par. Checked, a net round uses personal par, so a player who gets a stroke on the hole only needs a par.',
  'gameSettings.multiplierFor': 'Multiplier for {name}',
  'gameSettings.otherOptions': 'Other options',
  'gameSettings.doubleClosing': 'Holes 9 and 18 count double',
  'gameSettings.doubleClosingNote': 'in a nine hole round only the last hole',
  'gameSettings.noDoubleBonuses': 'Do not double extra points',
  'gameSettings.noDoubleBonusesNote':
    'neither a double hole nor “double stake” multiplies extra points',
  'gameSettings.confirmLongest': 'Confirm Longest',
  'gameSettings.confirmNearest': 'Confirm Nearest',
  'gameSettings.confirmNote':
    'with a result worse than PAR, the point goes to the opponents',
  'gameSettings.confirmPlayerNote': 'worse than par and the bonus scores nothing',
  'gameSettings.confirmByPersonalPar': 'Confirm Longest against personal par',
  'gameSettings.confirmByPersonalParNote':
    'in a handicap round Longest is confirmed against the hole par plus the strokes the player receives there; Nearest is always confirmed against gross par and a gross round is unaffected',
  'gameSettings.confirmSkinsByPar': 'Confirm with par',
  'gameSettings.confirmSkinsByParNote':
    'The hole winner must make at least par on the next hole or the skin carries into the pot.',
  'gameSettings.dotVariant': 'Variant',
  'gameSettings.dotVariantNine': 'Nine Dot · 9 pts',
  'gameSettings.dotVariantSix': 'Six Dot · 6 pts',
  'gameSettings.dotVariantNote':
    'Nine Dot splits 9 points (5-3-1), Six Dot splits 6 points (4-2-0). The round carries its variant, so changing it later does not rescore finished rounds.',
  'gameSettings.sweepOnTwoStrokes': 'Winning by 2 takes all {count} points',
  'gameSettings.sweepOnTwoStrokesNote':
    'Win the hole by two or more strokes and you take every point on it. The margin is measured against a recorded second score.',
  'gameSettings.doubleSweepOnBirdie': 'A birdie doubles it to {count}',
  'gameSettings.doubleSweepOnBirdieNote':
    'Winning by two with a birdie or better doubles the points. Only offered with the option above turned on.',
  'gameSettings.doubleBest': 'Double Best',
  'gameSettings.doubleBestNote':
    'An extra point when both partners played better than both opponents.',
  'gameSettings.doubleBestValue': 'Double Best value',

  // --- results ------------------------------------------------------------
  'results.archived': 'Archived round',
  'results.final': 'Results',
  'results.live': 'Current standings',
  'results.onlyPlayed': 'Only holes that already have a score are counted.',
  'results.conceded': 'Conceded holes: {holes} – the pair lost the aggregate on them.',
  'results.unplayed': 'The round ended early, holes {holes} were not played.',
  'results.settlement': 'Settlement',
  'results.totalWinnings': 'Total winnings',
  'results.optimizedPayments': 'Optimized payments',
  'results.detailedPayments': 'Individual payments',
  'results.pointWorth': 'A point is {money}.',
  'results.doubleClosingNote': 'Holes 9 and 18 counted double.',
  'results.configuration': 'Round scoring',
  'results.configDoubleClosing': 'holes 9 and 18 double',
  'results.configDoubleBest': 'Double Best {count} pts',
  'results.configNoDoubleBonuses': 'extra points are not doubled',
  'results.configConfirmSkinsByPar': 'winning skins are confirmed with par',
  'results.backToArchive': 'Back to archive',
  'results.editScores': 'Edit scores',
  'results.backToPlay': 'Back to the round',
  'results.newRound': 'New round',
  'results.discardRound': 'Discard round in progress',
  'results.discardConfirm':
    "The round in progress will be deleted and can't be undone. Discard it?",

  // --- scorecard ----------------------------------------------------------
  'scorecard.hole': 'Hole',
  'scorecard.holeShort': 'H',
  'scorecard.par': 'Par',
  'scorecard.total': 'Total',
  'scorecard.gameTotal': 'P',

  // --- archive ------------------------------------------------------------
  'archive.title': 'Archive',
  'archive.empty': 'No rounds played yet',
  'archive.count': { one: '{count} round played', other: '{count} rounds played' },
  'archive.emptyHint':
    'Finished rounds are saved here automatically once you tap “Finish and save round” on the last hole.',
  'archive.noResult': 'no result',
  'archive.draw': 'draw: {names}',
  'archive.holes': { one: '{count} hole', other: '{count} holes' },
  'archive.holesPartial': '{done} of {total} holes',
  'archive.netScoring': 'net HCP',
  'archive.grossScoring': 'gross',
  'archive.deleteConfirm': 'Delete the round from {date} from the archive?',
  'archive.deleteLabel': 'Delete the round from {date}',

  // --- file backup --------------------------------------------------------
  'backup.title': 'Data backup',
  'backup.subtitle': 'Export and restore',
  'backup.intro':
    'Rounds, players and settings are stored only on this device. A backup takes them out into a file – before changing phones or just to be safe.',
  'backup.exportTitle': 'Back up',
  'backup.download': 'Download backup',
  'backup.downloadHint':
    'One JSON file with everything: the round in progress, the archive, the player list and the scoring settings. On an iPhone the file is offered through the share sheet – save it to Files or e-mail it to yourself.',
  'backup.downloaded': 'The backup has been downloaded.',
  'backup.importTitle': 'Restore from a backup',
  'backup.merge': 'Merge',
  'backup.replace': 'Replace everything',
  'backup.mergeHint':
    'Rounds from the backup are added to the current ones and nothing is deleted. The round in progress stays as it is.',
  'backup.replaceHint':
    'All current data is discarded and replaced by the backup. Useful on a new device.',
  'backup.choose': 'Choose a backup file',
  'backup.mergeConfirm':
    'Merge the backup from {date} with the current data? Nothing will be deleted, the backup contains {count} rounds.',
  'backup.replaceConfirm':
    'Replace all data with the backup from {date}? Current rounds will be deleted. The backup contains {count} rounds.',
  'backup.summary': 'The archive holds {count} rounds',
  'backup.summaryAdded': '{count} of them new',
  'backup.summaryCurrent': 'the round in progress was restored too',
  'backup.errorInvalid': 'This file is not a Fairsome backup, or it is damaged.',
  'backup.errorTooNew':
    'The backup comes from a newer version of the app. Update the app and try again.',

  // --- account and sync ---------------------------------------------------
  'account.title': 'Account',
  'account.subtitle': 'Cloud backup',
  'account.disabledNotice':
    'This build has no cloud connection configured, so signing in is not possible. Back your data up through the “Data backup” screen for now.',
  'account.missingTitle': 'What is missing',
  'account.missingHint':
    'The build did not receive these values – add them to the repository as GitHub Secrets (Settings → Secrets and variables → Actions) and run the deployment again:',
  'account.missingFooter':
    'The procedure is described in docs/sync.md. The app version is {version} – check that this is the deployed one.',
  'account.signedIn': 'Signed in',
  'account.lastSync': 'Last sync {time}.',
  'account.syncNow': 'Sync now',
  'account.signOutTitle': 'Sign out',
  'account.signOutHint':
    'After signing out the rounds stay on this device and stop being backed up. Data in the cloud is not deleted – it reappears once you sign in again.',
  'account.signOut': 'Sign out',
  'account.deleteTitle': 'Delete account',
  'account.deleteHint':
    'Deletes the account and all data in the cloud. Rounds on this phone stay – if you want to take them with you, make a file backup first.',
  'account.delete': 'Delete account and cloud data',
  'account.deleteConfirm':
    'Delete the account and all data in the cloud?\n\nRounds saved on this phone will stay. You will lose the backup and access from other devices. This cannot be undone.',
  'account.intro':
    'Without signing in, rounds are stored only on this device. Signing in with a Google account starts backing them up and makes them available anywhere – phone, tablet or computer.',
  'account.signIn': 'Sign in with Google',
  'account.signingIn': 'Signing in…',
  'account.preparing': 'Preparing sign-in…',
  'account.optional':
    'Nothing is required – the app works exactly the same without signing in. A file backup is on the “Data backup” screen.',
  'account.storedTitle': 'What is stored',
  'account.storedHint':
    'Played rounds, the list of playing partners and the scoring settings. From the Google account only the e-mail and name, so the data can be matched to you. Nothing else is collected and nothing is passed on.',
  'account.privacy': 'Privacy policy',

  // sync status
  'sync.disabled': 'Sync is not available in this version.',
  'sync.anonymous': 'Not signed in – data is only on this device.',
  'sync.syncing': 'Syncing…',
  'sync.synced': 'Data is backed up.',
  'sync.offline': 'Offline. Changes will be sent once there is a signal.',
  'sync.error': 'Sync failed. It will be retried on the next start.',

  // sign-in errors
  'signIn.network': 'Sign-in failed because of the connection. Please try again.',
  'signIn.unavailable': 'Sign-in failed. Please try again.',
  'signIn.notReady': 'Sign-in is still being prepared, please try again in a moment.',
  'signIn.unknown': 'Something went wrong. Please try again.',

  // sync errors
  'syncError.permissionDenied':
    'The database refused access. The rules are probably not deployed – Firebase Console → Firestore Database → Rules.',
  'syncError.notFound':
    'The Firestore database does not exist. Create it: Firebase Console → Build → Firestore Database → Create database.',
  'syncError.unavailable':
    'The database is unavailable. It is either not created or cannot be reached.',
  'syncError.unauthenticated': 'Your sign-in expired. Sign out and sign in again.',
  'syncError.failedPrecondition':
    'Firestore reports that the project is not ready – check that the database exists.',
  'syncError.other': 'Error {code}.',
  'syncError.unknown': 'Unknown sync error.',

  // --- privacy policy -----------------------------------------------------
  'privacy.title': 'Privacy',
  'privacy.offlineTitle': 'Without signing in',
  'privacy.offline':
    'Without signing in the app sends nothing anywhere. All data – played rounds, partner names and settings – stays in your browser storage on your device. There is no account and no server that knows about it.',
  'privacy.cloudTitle': 'With signing in',
  'privacy.cloud':
    'When you sign in with a Google account, this data is stored in Google Firebase (Firestore) so that it is backed up and available from other devices:',
  'privacy.itemRounds':
    'played and ongoing rounds including scores, players and scoring settings',
  'privacy.itemRoster': 'the list of saved playing partners',
  'privacy.itemSettings': 'stake and scoring preferences',
  'privacy.itemAccount':
    'e-mail and name from the Google account, so the data can be matched to you',
  'privacy.accessTitle': 'Who can access the data',
  'privacy.access':
    'Only you. The database rules are set so that only the signed-in owner can reach their data. Nothing is passed on, used for advertising or profiling. The storage processor is Google Ireland Limited as the operator of Firebase.',
  'privacy.retentionTitle': 'For how long',
  'privacy.retention':
    'Until you delete it. You delete the account and all cloud data with the “Delete account and cloud data” button on the Account screen. Deletion is immediate and cannot be undone.',
  'privacy.rightsTitle': 'Your rights',
  'privacy.rights':
    'You have the right to access, correct, delete and port your data. Access and portability are covered by the “Download backup” button on the Data backup screen, which exports everything in open JSON format. You can correct data directly in the app and delete it with the button above.',
  'privacy.contactTitle': 'Contact',
  'privacy.contact':
    'The data controller is the operator of the app. For anything regarding processing write to',
  'privacy.publicVersion': 'A public version of this page is at',

  // --- hole results -------------------------------------------------------
  'score.eagle': 'Eagle or better',
  'score.birdie': 'Birdie',
  'score.par': 'Par',
  'score.bogey': 'Bogey',
  'score.double': 'Double bogey',
  'score.triple': 'Triple bogey or worse',

  // --- result multipliers -------------------------------------------------
  'tee.sheetTitle': 'Tee – {name}',
  'tee.useForAll': 'Use for all players',
  'tee.notRated': 'not rated',
  'tee.rating': 'CR {cr} / SR {sr}',
  'tier.birdie.name': 'Birdie',
  'tier.birdie.note': 'one under par',
  'tier.eagle.name': 'Eagle',
  'tier.eagle.note': 'two under par',
  'tier.albatross.name': 'Albatross',
  'tier.albatross.note': 'three under par',
  'tier.condor.name': 'Condor',
  'tier.condor.note': 'four or more under par',

  // --- games --------------------------------------------------------------
  'games.best-aggregate.name': 'Best Aggregate',
  'games.best-aggregate.tagline': 'Two pairs, points for results and optional bonuses',
  'games.best-aggregate.rules':
    'Always four players in two pairs. On every hole the better ball and the aggregate of both partners are compared. Additional points and multipliers follow the game settings. The pair with the most points wins.',
  'games.left-right.name': 'Left-Right',
  'games.left-right.tagline':
    '(Edges-Centers) · pairs from the first shots, new pairs on every hole',
  'games.left-right.rules':
    'Always four players. Before every hole, the two pairs are set according to the first shots. Scoring is the same as Best Aggregate, but the points are recorded for each player separately according to the pair they play in on that hole.',
  'games.skins.name': 'Skins',
  'games.skins.tagline': 'Every hole is a skin, a tie carries it over',
  'games.skins.rules':
    'Played by individuals, 2 to 4 players. Every hole is one skin and goes to the player with the lowest score. When the hole is tied, the skin is not awarded and carries over to the next hole. The player with the most skins wins.',
  'games.match-play.name': 'Match play',
  'games.match-play.tagline': 'A match played by holes, not by strokes',
  'games.match-play.rules':
    'A match between two sides – either two players, or two pairs where the better ball counts. Whoever plays the hole better goes one up; a tied hole is halved. The match ends once the lead is greater than the number of remaining holes.',
  'games.foursome.name': 'Foursome',
  'games.foursome.tagline': 'One ball per pair, played by holes',
  'games.foursome.rules':
    'Match play between two pairs sharing a single ball: the pair tees off once and then alternates shots, so it has one score per hole. Whoever plays the hole better goes one up; a tied hole is halved. One score is entered per pair. With net scoring the pair receives strokes from half the sum of both partners’ playing handicaps.',
  'games.singles-matches.name': 'Two singles matches',
  'games.singles-matches.tagline': 'Four players in one flight, two separate matches',
  'games.singles-matches.rules':
    'Four players go round together in one flight, but play two separate singles matches – pick who plays whom under Opponents. Each match counts on its own, money included: the result of one has no effect on the other. Whoever plays the hole better goes one up; a tied hole is halved.',
  'games.stableford.name': 'Stableford',
  'games.stableford.tagline': 'Points per hole, one bad hole cannot ruin the round',
  'games.stableford.rules':
    'Played by individuals, 1 to 4 players. Each hole scores points against par: par 2 points, birdie 3, eagle 4, bogey 1, double bogey or worse nothing. With net scoring on, the result counts after deducting the strokes a player receives on the hole according to its stroke index. The player with the most points wins.',
  'games.dots.name': 'Dots',
  'games.dots.tagline': 'Nine Dot or Six Dot · points by rank on the hole, three players',
  'games.dots.rules':
    'A game for three players. Every hole puts a fixed number of points at stake and splits them by rank. Nine Dot awards 9 points: 5-3-1, 4-4-1 when the two best tie, 5-2-2 when the two worst tie and 3-3-3 when all three tie. Six Dot awards 6 points: 4-2-0, 3-3-0, 4-1-1 and 2-2-2. The variant and both extra rules are set in the scoring settings.',

  // Best Aggregate
  // --- hole points breakdown ----------------------------------------------
  'breakdown.title': 'Points breakdown',
  'breakdown.subtitle': '{name} · hole {hole}',
  'breakdown.open': 'Points breakdown: {name}',
  'breakdown.versus': '{own} against {other}',
  'breakdown.net': 'net {value}',
  'breakdown.gross': 'gross {value}',
  'breakdown.total': 'Points for the hole',
  'breakdown.empty': 'Nothing to break down on this hole yet.',
  'breakdown.doubled': 'This hole counts double.',
  'breakdown.pending': 'recorded by {name} – not confirmed yet',
  'breakdown.forfeited': 'forfeited, recorded by {name}',
  'breakdown.handicapOn': 'Birdies and eagles are judged net (Apply handicap).',
  'breakdown.handicapOff': 'Birdies and eagles are judged from gross strokes.',
  'best.doubleBest': 'Double Best',
  'best.doubleBestNote': 'both balls better than the opponents',
  'best.points': 'Points',
  'best.headerNote': 'Current score',
  'best.pointsDescription':
    'Per hole: points for the best ball, lower aggregate and other bonuses according to the game settings.',
  'best.best': 'Best',
  'best.aggregate': 'Aggregate',
  'best.holePoints': 'Points',
  'best.detailBest': 'BEST {count}',
  'best.detailAggregate': 'Aggregate {count}',
  'best.detailDoubleBest': '2×BEST {count}',
  'best.detailBonus': 'Bonus {count}',
  'best.detailExtra': 'Extra {count}',
  'best.conceded': 'conceded',

  // Left-Right
  'leftRight.left': 'Left',
  'leftRight.right': 'Right',
  'leftRight.setupTitle': 'Pairs',
  'leftRight.setupHint': 'Choose the pairs from the first shots off the tee.',
  'leftRight.setupReady': 'Pairs are ready.',
  'leftRight.title': 'Player points',
  'leftRight.description': 'The pair points on each hole are credited to both players.',
  'leftRight.detail': 'Pair points on individual holes',
  'leftRight.headerNote': 'Total individual points',
  'leftRight.pairing': 'Pairs',
  'leftRight.notReady': 'set pairs first',
  'leftRight.scorecardPair': 'Pair: {pair}',
  'leftRight.column': 'P',

  // Skins
  'skins.title': 'Skins',
  'skins.pending': '{count} skins are still in the pot.',
  'skins.description': 'A tied hole awards no skin and carries it over to the next one.',
  'skins.noHole': 'no hole yet',
  'skins.wonHoles': '{count} holes won: {holes}',
  'skins.scoreDetail': 'Skins {skins} · Extra {extra} pts',
  'skins.scorecardSkin': {
    one: '{name}: 1 skin',
    other: '{name}: {count} skins',
  },
  'skins.scorecardSkinCarried': '{name}: skin from this hole was carried and won later',
  'skins.scorecardExtra': {
    one: '{name}: +1 extra point',
    other: '{name}: +{count} extra points',
  },
  'skins.scorecardTotal': '{name}: {skins} skins +{extra} extra points = {total} total',
  'skins.headerNote': 'Skins + extra points',
  'skins.atStake': 'At stake',
  'skins.reservedBy': 'Reserved by',
  'skins.takes': 'Takes',

  // Stableford
  'stableford.title': 'Points',
  'stableford.description': 'Par 2 points, birdie 3, eagle 4, bogey 1, worse nothing.',
  'stableford.netDescription':
    'Net: strokes are deducted according to the stroke index of the hole. Par 2 points, birdie 3, eagle 4, bogey 1, worse nothing.',
  'stableford.grossDetail': 'gross',
  'stableford.netDetail': 'net, HCP {handicap}',
  'stableford.column': 'P',
  'stableford.received': 'Strokes',
  'stableford.relativeStrokes': {
    one: '{name}: {count} stroke received from the best HCP',
    other: '{name}: {count} strokes received from the best HCP',
  },
  'stableford.headerNote': 'Points per hole: par 2, birdie 3, eagle 4, bogey 1.',
  'stableford.headerNetNote': 'Net points based on the stroke index of the hole.',

  // Dots (Nine Dot / Six Dot)
  'dot.nineName': 'Nine Dot',
  'dot.sixName': 'Six Dot',
  'dot.title': 'Points',
  'dot.description': '{variant}: every hole splits {count} points between three players.',
  'dot.headerNote': '{variant} · {count} points per hole',
  'dot.column': 'P',
  'dot.columnAria': '{name}: points for the hole',

  // Course editor
  'scorecard.turnShort': 'OUT',
  'scorecard.turn': 'Front nine subtotal',
  'scorecard.strokeIndex': 'Stroke index of the hole',
  'scorecard.strokeIndexShort': 'SI',
  'scorecard.title': 'Scorecard',
  'scorecard.dotsCourse': 'Course',
  'scorecard.dotsBestPlayer': 'Best player',
  'scorecard.dotsCourseAria': {
    one: '{name}: {count} stroke from the course handicap',
    other: '{name}: {count} strokes from the course handicap',
  },
  'scorecard.dotsBestPlayerAria': {
    one: '{name}: {count} stroke received from the best HCP',
    other: '{name}: {count} strokes received from the best HCP',
  },

  // Course picker
  'picker.title': 'Choose a course',
  'picker.startTitle': 'Where are you playing?',
  'picker.browseTitle': 'Courses',
  'picker.skipCourse': 'Play without a course',
  'picker.count': '{stored} on this phone, {total} available',
  'picker.loading': 'Loading the course catalogue…',
  'picker.inCatalog': 'in catalogue',
  'picker.downloaded': 'downloaded',
  'picker.privateCourse': 'private',
  'picker.downloading': 'downloading…',
  'picker.rated': 'rated',
  'picker.notRated': 'not rated',
  'picker.errorOffline':
    'The catalogue could not be loaded, most likely no connection. Courses saved on this phone still work.',
  'picker.errorMissing':
    'The catalogue is not responding at its address. Courses saved on this phone still work.',
  'picker.errorBroken':
    'The catalogue returned something the app does not understand. Courses saved on this phone still work.',
  'picker.search': 'Search by name or club',
  'picker.sortNearest': 'Sort by distance from my location',
  'picker.sortGrouped': 'Sort by groups and alphabetically',
  'picker.country': 'Country',
  'picker.allCountries': 'All countries',
  'picker.locationUnavailable':
    'Location is unavailable. Showing courses by groups and alphabetically.',
  'picker.addFavorite': 'Add {name} to favorites',
  'picker.removeFavorite': 'Remove {name} from favorites',
  'picker.noCourseMeta': 'Pars are set while playing, handicaps are not used.',
  'picker.credit': 'Courses from the open Fairsome catalogue, ODbL licensed.',
  'picker.creditLink': 'Source and corrections',
  'picker.holes': { one: '{count} hole', other: '{count} holes' },
  'picker.loops': { one: '{count} nine', other: '{count} nines' },
  'picker.tees': { one: '{count} tee', other: '{count} tees' },
  'picker.noTees': 'no tees',
  'picker.nothingFound': 'Nothing found. Try another name, or add the course manually.',

  'course.newTitle': 'New course',
  'course.editTitle': 'Edit course',
  'course.name': 'Name',
  'course.namePlaceholder': 'e.g. St Andrews',
  'course.nameRequired': 'The course needs a name.',
  'course.parTotal': 'Course par: {count}',
  'course.attribution': 'Data source: {source}',
  'course.holes': 'Holes',
  'course.holesHint':
    'Set the par and difficulty of each hole. The stroke index is moved with the buttons so it stays a ranking without duplicates.',
  'course.loopName': 'Name of nine {number}',
  'course.loopsHint':
    'A course with more than eighteen holes is split into nines. A round is then built from them when you set up a game, and the order matters.',
  'course.parForHole': 'Par {par} on hole {hole}',
  'course.siShort': 'SI {si}',
  'course.harder': 'Hole {hole} is harder',
  'course.easier': 'Hole {hole} is easier',
  'course.tees': 'Tees',
  'course.teesHint':
    'Course Rating and Slope Rating are only needed to convert a handicap index into playing strokes. The course works without them. For a nine hole course enter the nine hole rating, otherwise the handicap comes out roughly double.',
  'course.teeName': 'Tee name',
  'course.teeNamePlaceholder': 'e.g. yellow',
  'course.tee.black': 'Black',
  'course.tee.blue': 'Blue',
  'course.tee.bronze': 'Bronze',
  'course.tee.darkGreen': 'Dark Green',
  'course.tee.gold': 'Gold',
  'course.tee.green': 'Green',
  'course.tee.jade': 'Jade',
  'course.tee.members': 'Members',
  'course.tee.men': 'Men',
  'course.tee.middle': 'Middle',
  'course.tee.orange': 'Orange',
  'course.tee.players': 'Players',
  'course.tee.purple': 'Purple',
  'course.tee.red': 'Red',
  'course.tee.silver': 'Silver',
  'course.tee.tournament': 'Tournament',
  'course.tee.white': 'White',
  'course.tee.yellow': 'Yellow',
  'course.tee.number': 'Tee {number}',
  'course.courseRating': 'CR',
  'course.slopeRating': 'SR',
  'course.courseRatingFor': 'Course Rating of the {tee} tee',
  'course.slopeRatingFor': 'Slope Rating of the {tee} tee',
  'course.addTee': 'Add tee',
  'course.removeTee': 'Remove tee',
  'course.delete': 'Delete course',
  'course.save': 'Save course',

  // Match play
  'match.title': 'Match status',
  'match.notStarted': 'The match has not started yet',
  'match.allSquareRemaining': 'All square, {count} holes to play',
  'match.wins': '{name} wins {lead}&{remaining}',
  'match.winsFinal': '{name} wins {lead} UP',
  'match.allSquareFinished': 'All square after the final hole',
  'match.dormie': '{name} is {lead} UP (dormie), {remaining} holes to play',
  'match.leads': '{name} is {lead} UP, {remaining} holes to play',
  'match.allSquare': 'AS',
  'match.up': '{count} UP',
  'match.down': '{count} DOWN',
  'match.detail': '{won} holes won · {halved} halved',
  'match.takesHole': 'Hole goes to',
  'match.scorecardWonHole': '{name}: hole won',
  'match.outOfPlayShort': 'Out of play',
  'match.remainingShort': { one: '{count} hole left', other: '{count} holes left' },
  'match.dormieShort': {
    one: 'dormie · {count} hole left',
    other: 'dormie · {count} holes left',
  },
  'match.dormieOnly': 'dormie',
  'match.resultShort': '{lead}&{remaining}',
  'match.finalShort': 'final · {lead} UP',
  'match.finishedShort': 'finished',
  'match.halved': 'halved',
  'match.takes': 'wins',
  'match.loses': 'loses',
  'match.bestBall': 'Best ball',
  'match.hole': 'Hole',
  'match.outOfPlay': 'Out of play - the match is already decided',

  // Foursome and two singles matches in one flight
  'foursome.net': 'Pair net',
  'foursome.pairHandicap': 'pair HCP {handicap}',
  'singles.title': 'Matches in the flight',
  'singles.versusJoin': ' vs. ',
  'singles.versusDetail': 'vs. {name} · won {won} · halved {halved}',
  'singles.opponents': 'Opponents',

  // --- money settlement ---------------------------------------------------
  // --- extra points as a side bet -----------------------------------------
  'sideBets.title': 'Extra points',
  'sideBets.description':
    'A side bet outside the rules of the game; points are added to the round settlement.',
  'sideBets.settingsHint':
    'Extra points are a side bet: they start at zero and count only once you set a value.',

  'money.perGroup': 'Each match settles on its own.',
  'money.nobodyOwes': 'Nobody owes anybody anything.',
  'money.eachOpponent': 'Every extra point is paid by each opponent separately.',
  'money.optimizedSettlement':
    'Payments are combined into the fewest possible transfers.',
  'money.draw': 'A draw, nobody owes anybody anything.',
  'money.transfers':
    'Difference of {units} pts × {value} = {amount}, paid by each player separately.',
}
