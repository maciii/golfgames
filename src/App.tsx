import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { BonusId, CreateRoundOptions, PlayerId, Round, RoundSettings } from './types'
import { createRound, setHolePar, toggleBonus, touchRound } from './types'
import {
  addToRoster,
  archiveRound,
  deleteArchivedRound,
  loadArchive,
  loadCourses,
  loadCurrentRound,
  loadSettings,
  saveCurrentRound,
} from './storage'
import type { Course } from './courses/types'
import PlayScreen from './screens/PlayScreen'
import ResultsScreen from './screens/ResultsScreen'
import ArchiveScreen from './screens/ArchiveScreen'
import GameSettingsScreen from './screens/GameSettingsScreen'
import BackupScreen from './screens/BackupScreen'
import AccountScreen from './screens/AccountScreen'
import PrivacyScreen from './screens/PrivacyScreen'
import CourseEditScreen from './screens/CourseEditScreen'
import CoursePickerScreen from './screens/CoursePickerScreen'
import HomeScreen from './screens/HomeScreen'
import PlayersScreen from './screens/PlayersScreen'
import SetupTeeScreen from './screens/SetupTeeScreen'
import SetupPlayersScreen from './screens/SetupPlayersScreen'
import SetupGameScreen from './screens/SetupGameScreen'
import SetupBetScreen from './screens/SetupBetScreen'
import { findCourse } from './storage'
import { AccountProvider, useAccount } from './sync/AccountContext'
import { DEFAULT_GAME_ID, getGame } from './games'
import type { HoleSetupSelection } from './games'

const MAX_PLAYERS = 4

type View =
  | 'home'
  | 'setupTee'
  | 'setupPlayers'
  | 'setupGame'
  | 'setupBet'
  | 'play'
  | 'results'
  | 'archive'
  | 'gameSettings'
  | 'backup'
  | 'account'
  | 'privacy'
  | 'courseEdit'
  | 'coursePicker'
  | 'players'

/** Kroky zakládání kola v pořadí, ve kterém se prochází - hřiště je krok 1, `CoursePickerScreen`. */
const SETUP_STEP_VIEWS: View[] = ['setupTee', 'setupPlayers', 'setupGame', 'setupBet']

/**
 * Kam obrazovka patří podle stavu kola.
 *
 * Platí to na dvou místech - při startu aplikace a při návratu z podobrazovky -
 * a obě musí odpovídat, jinak refresh přistane jinde, než kde uživatel byl.
 *
 * Bez rozehraného kola appka vede na domovskou obrazovku - tu skutečnou
 * první, ze které se dá založit nová hra, otevřít menu nebo pokračovat
 * v posledních výsledcích. Nové kolo pak začíná **výběrem hřiště**: bez
 * hřiště není z čeho vybrat odpaliště ani počítat handicapy.
 */
function viewForRound(round: Round | null): View {
  if (!round) return 'home'
  return round.finishedAt ? 'results' : 'play'
}

/**
 * Otisk viditelné obrazovky pro navigaci prohlížeče (rozhodnutí #27
 * v docs/decisions.md). Jen `view` a otevřené kolo v archivu - zbytek stavu
 * je rozepsaná data (jména hráčů, hra, sázka...), ne pozice, a zpět se
 * nesmí ztratit.
 */
interface NavSnapshot {
  view: View
  openArchiveId: string | null
}

/**
 * Kořen aplikace: drží rozehrané kolo, archiv, rozepsané založení kola a to,
 * která obrazovka je vidět.
 *
 * Navigace je plochá - aplikace se ovládá jednou rukou na hřišti, takže se
 * nikam nezanořuje - ale zpět/swipe naviguje uvnitř appky přes History API
 * (viz `popstate` níž), ne appku rovnou neopouští. Appka do historie
 * prohlížeče dřív nezapisovala nic, takže první gesto zpět appku vždycky
 * opustilo, i uprostřed zapisování skóre.
 *
 * Zakládání kola je rozdělené na kroky (rozhodnutí v docs/decisions.md):
 * hřiště → odpaliště a jamky → hráči → hra a dvojice → sázka. Rozepsaný
 * stav proto žije přímo tady, ne v samostatném "draftu" jedné obrazovky -
 * kroky se mezi sebou přepínají stejně jako kterékoli jiné obrazovky appky
 * a nikdy se neodpojí, takže není co ztratit.
 */
function AppShell() {
  const { noteRoundChange, dataVersion, discardRound: discardSyncedRound } = useAccount()
  // Rozehrané kolo přežije zavření aplikace i restart telefonu.
  const [round, setRound] = useState<Round | null>(() => loadCurrentRound())
  const persistedDataVersion = useRef(dataVersion)
  // Obrazovka se neukládá, takže se po refreshi odvodí z kola. Bez toho by
  // dohrané kolo skončilo zpátky v zapisování skóre na první jamce, což vypadá
  // jako rozjetá nová hra.
  const [view, setView] = useState<View>(() => viewForRound(round))
  const [archive, setArchive] = useState<Round[]>(() => loadArchive())
  const [openArchiveId, setOpenArchiveId] = useState<string | null>(null)
  // Hra, jejíž bodování se právě nastavuje.
  const [settingsGameId, setSettingsGameId] = useState<string | null>(null)
  // Hřiště, které se právě upravuje; null znamená zakládání nového.
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  // Hřiště předvybrané v nastavení kola po návratu ze zadání.
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>()
  // Uložená hřiště pro kroky zakládání kola; obnoví se po úpravě/stažení.
  const [courses, setCourses] = useState<Course[]>(() => loadCourses())

  // --- rozepsané založení kola ---------------------------------------------
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID)
  const [playerCount, setPlayerCount] = useState(
    getGame(DEFAULT_GAME_ID).playerCounts[0] ?? 2,
  )
  const [names, setNames] = useState<string[]>(() => Array(MAX_PLAYERS).fill(''))
  // Počet jamek se vybírá jen u kola bez hřiště; se hřištěm ho určuje výřez.
  const [holeCount, setHoleCount] = useState(18)
  const [loopIds, setLoopIds] = useState<string[]>([])
  const [secondNineId, setSecondNineId] = useState<string | undefined>(undefined)
  const [pairing, setPairing] = useState(0)
  // Prázdné id znamená "první odpaliště"; findTee() na něj spadne sám.
  const [teeId, setTeeId] = useState('')
  /**
   * Odpaliště jednotlivých hráčů. Prázdná hodnota není „žádné", ale „jako
   * celé kolo" - hromadná volba se tak propíše sama.
   */
  const [playerTeeIds, setPlayerTeeIds] = useState<string[]>(() =>
    Array(MAX_PLAYERS).fill(''),
  )
  const [netScoring, setNetScoring] = useState(false)
  const [handicapMode, setHandicapMode] = useState<'index' | 'strokes'>('index')
  const [handicapText, setHandicapText] = useState<string[]>(() =>
    Array(MAX_PLAYERS).fill(''),
  )
  const [settings, setSettings] = useState<RoundSettings>(() => loadSettings())
  const [pointValueText, setPointValueText] = useState(
    () => `${loadSettings().pointValue}`,
  )

  /** Vrátí rozepsané založení kola na výchozí hodnoty - po startu i po zahození kola. */
  const resetSetupState = useCallback(() => {
    setGameId(DEFAULT_GAME_ID)
    setPlayerCount(getGame(DEFAULT_GAME_ID).playerCounts[0] ?? 2)
    setNames(Array(MAX_PLAYERS).fill(''))
    setHoleCount(18)
    setLoopIds([])
    setSecondNineId(undefined)
    setPairing(0)
    setTeeId('')
    setPlayerTeeIds(Array(MAX_PLAYERS).fill(''))
    setNetScoring(false)
    setHandicapMode('index')
    setHandicapText(Array(MAX_PLAYERS).fill(''))
    const fresh = loadSettings()
    setSettings(fresh)
    setPointValueText(`${fresh.pointValue}`)
    setSelectedCourseId(undefined)
  }, [])

  /**
   * Nové hřiště pro kolo: odpaliště pro všechny se nastaví na výchozí barvu
   * (žlutá, pokud ji hřiště má) a vlastní volby hráčů se zapomenou - ze
   * starého hřiště by mířily na barvu, kterou nové ani nemusí mít.
   */
  const selectCourse = useCallback((course: Course | undefined) => {
    setSelectedCourseId(course?.id)
    const defaultTee = course?.tees.some((option) => option.id === 'yellow')
      ? 'yellow'
      : (course?.tees[0]?.id ?? '')
    setTeeId(defaultTee)
    setPlayerTeeIds(Array(MAX_PLAYERS).fill(''))
  }, [])

  /** Odpaliště pro celé kolo; hráči s vlastní volbou o ni přijdou, viz `docs/decisions.md`. */
  const useTeeForAll = useCallback((nextTeeId: string) => {
    setTeeId(nextTeeId)
    setPlayerTeeIds(Array(MAX_PLAYERS).fill(''))
  }, [])

  const setPlayerName = useCallback((index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }, [])

  const setPlayerTee = useCallback((index: number, value: string) => {
    setPlayerTeeIds((prev) => prev.map((v, i) => (i === index ? value : v)))
  }, [])

  const setPlayerHandicapText = useCallback((index: number, value: string) => {
    setHandicapText((prev) => prev.map((v, i) => (i === index ? value : v)))
  }, [])

  /**
   * Je výběr hřiště prvním krokem nového kola, nebo podobrazovkou kroku
   * odpališť? V prvním kroku není kam se vracet, takže obrazovka místo
   * „Zpět" nabídne hru bez hřiště a odkaz na Hrát bez hřiště.
   */
  const [pickerAtStart, setPickerAtStart] = useState(true)
  /**
   * Výběr hřiště vede buď do zakládání kola, nebo je to čisté procházení
   * z menu (`onBrowseCourses` na `HomeScreen`) - tam klepnutí na hřiště
   * otevře jeho úpravu, ne rovnou nastavení kola.
   */
  const [pickerMode, setPickerMode] = useState<'start' | 'browse'>('start')
  const setupScrollTop = useRef(0)
  const restoreSetupScroll = useRef(false)

  // `isPoppingHistory` odliší návrat přes zpět/swipe (stav se jen převezme
  // z historie) od běžné navigace vpřed (stav se zapíše jako nový krok).
  const isPoppingHistory = useRef(false)
  const hasPushedInitialHistory = useRef(false)

  useEffect(() => {
    const snapshot: NavSnapshot = { view, openArchiveId }
    if (isPoppingHistory.current) {
      isPoppingHistory.current = false
      return
    }
    if (!hasPushedInitialHistory.current) {
      // První obrazovka appky nahradí dnešní krok historie, nepřidává nový -
      // odsud má zpět appku opravdu opustit.
      hasPushedInitialHistory.current = true
      window.history.replaceState(snapshot, '')
      return
    }
    window.history.pushState(snapshot, '')
  }, [view, openArchiveId])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const snapshot = event.state as NavSnapshot | null
      // Chybějící stav je krok před první obrazovkou appky - tam ji necháme
      // opravdu opustit, o to se postará prohlížeč sám.
      if (!snapshot) return
      isPoppingHistory.current = true
      setView(snapshot.view)
      setOpenArchiveId(snapshot.openArchiveId)
      if (SETUP_STEP_VIEWS.includes(snapshot.view)) restoreSetupScroll.current = true
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const leaveSetup = useCallback(() => {
    window.history.back()
  }, [])

  const openSetupSubscreen = useCallback((nextView: View) => {
    setupScrollTop.current = window.scrollY
    restoreSetupScroll.current = true
    setView(nextView)
  }, [])

  useLayoutEffect(() => {
    if (!SETUP_STEP_VIEWS.includes(view) || !restoreSetupScroll.current) return
    restoreSetupScroll.current = false
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: setupScrollTop.current, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [view])

  useEffect(() => {
    if (dataVersion !== persistedDataVersion.current) {
      persistedDataVersion.current = dataVersion
      return
    }
    saveCurrentRound(round)
    // Synchronizace si změnu jen poznamená; odešle ji s odkladem, aby jedno
    // kolo nestálo osmnáct zápisů do cloudu.
    if (round) noteRoundChange(round)
  }, [round, noteRoundChange, dataVersion])

  const startRound = useCallback(
    (options: CreateRoundOptions) => {
      // Spoluhráči se do seznamu doplní sami, ať se nikde nezakládají ručně -
      // a s nimi i handicap a odpaliště, ze kterého hráli.
      addToRoster(options.playerNames, options.handicapIndexes, options.playerTeeIds)
      resetSetupState()
      setRound(createRound(options))
      setView('play')
    },
    [resetSetupState],
  )

  const setScore = useCallback(
    (playerId: PlayerId, hole: number, value: number | null) => {
      setRound((prev) => {
        if (!prev) return prev
        const holes = [...(prev.scores[playerId] ?? [])]
        holes[hole] = value
        return touchRound({ ...prev, scores: { ...prev.scores, [playerId]: holes } })
      })
    },
    [],
  )

  const setBonus = useCallback((playerId: PlayerId, hole: number, bonusId: BonusId) => {
    setRound((prev) =>
      prev ? touchRound(toggleBonus(prev, playerId, hole, bonusId)) : prev,
    )
  }, [])

  const setPar = useCallback((hole: number, par: number) => {
    // setHolePar zároveň zahodí Longest/Nearest, když na novém paru nepatří.
    setRound((prev) => (prev ? touchRound(setHolePar(prev, hole, par)) : prev))
  }, [])

  const setHoleSetup = useCallback((hole: number, selection: HoleSetupSelection) => {
    setRound((prev) => {
      if (!prev) return prev
      const update = getGame(prev.gameId).setHoleSetup
      if (!update) return prev
      const next = update(prev, hole, selection)
      return next === prev ? prev : touchRound(next)
    })
  }, [])

  const goToHole = useCallback((hole: number) => {
    setRound((prev) => {
      if (!prev) return prev
      return { ...prev, currentHole: Math.max(0, Math.min(prev.holeCount - 1, hole)) }
    })
  }, [])

  const finishRound = useCallback(() => {
    setRound((prev) => {
      if (!prev) return prev
      const finished = touchRound({ ...prev, finishedAt: new Date().toISOString() })
      // Stejné id přepíše dřívější záznam, takže dodatečná oprava skóre
      // archiv nezdvojí.
      archiveRound(finished)
      setArchive(loadArchive())
      return finished
    })
    setView('results')
  }, [])

  const resumeRound = useCallback(() => {
    setRound((prev) => (prev ? touchRound({ ...prev, finishedAt: undefined }) : prev))
    setView('play')
  }, [])

  const discardRound = useCallback(() => {
    if (!round) return
    // Dohrané kolo už je v archivu; Nové kolo jen opustí jeho výsledky.
    if (!round.finishedAt) discardSyncedRound(round.id)
    resetSetupState()
    setRound(null)
    setView('home')
  }, [round, discardSyncedRound, resetSetupState])

  const removeArchived = useCallback(
    (roundId: string) => {
      deleteArchivedRound(roundId)
      setArchive(loadArchive())
      if (openArchiveId === roundId) setOpenArchiveId(null)
    },
    [openArchiveId],
  )

  const openArchive = useCallback(() => {
    setArchive(loadArchive())
    setOpenArchiveId(null)
    setView('archive')
  }, [])

  /** Otevře konkrétní odehrané kolo z domovské obrazovky rovnou v detailu. */
  const openArchivedRound = useCallback((roundId: string) => {
    setArchive(loadArchive())
    setOpenArchiveId(roundId)
    setView('archive')
  }, [])

  /**
   * Po obnově ze zálohy je v úložišti jiný stav, než jaký drží komponenta.
   * Načteme ho znovu, jinak by ho efekt ukládající rozehrané kolo přepsal zpět.
   */
  const reloadFromStorage = useCallback(() => {
    setRound(loadCurrentRound())
    setArchive(loadArchive())
    setOpenArchiveId(null)
  }, [])

  // Když synchronizace přinesla data z cloudu, načteme je do obrazovky.
  // Zůstáváme přitom tam, kde uživatel je - jen se pod ním obnoví obsah.
  useEffect(() => {
    if (dataVersion > 0) reloadFromStorage()
  }, [dataVersion, reloadFromStorage])

  const renderHome = () => (
    <HomeScreen
      archive={archive}
      onNewRound={() => {
        setPickerAtStart(true)
        setPickerMode('start')
        setView('coursePicker')
      }}
      onOpenRound={openArchivedRound}
      onPickFavoriteCourse={(course) => {
        selectCourse(course)
        setView('setupTee')
      }}
      onOpenArchive={openArchive}
      onOpenPlayers={() => setView('players')}
      onBrowseCourses={() => {
        setPickerAtStart(false)
        setPickerMode('browse')
        setView('coursePicker')
      }}
      onOpenBackup={() => setView('backup')}
      onOpenAccount={() => setView('account')}
    />
  )

  if (view === 'gameSettings' && settingsGameId) {
    return (
      <GameSettingsScreen gameId={settingsGameId} onBack={() => window.history.back()} />
    )
  }

  if (view === 'coursePicker') {
    return (
      <CoursePickerScreen
        mode={pickerMode}
        {...(selectedCourseId ? { selectedId: selectedCourseId } : {})}
        onSelect={(course) => {
          // Čisté procházení z menu vede na úpravu hřiště, ne do zakládání
          // kola - o hru se nikdo neprosí, jen chce spravovat seznam.
          if (pickerMode === 'browse') {
            if (course) {
              setEditingCourseId(course.id)
              setView('courseEdit')
            }
            return
          }
          selectCourse(course ?? undefined)
          setCourses(loadCourses())
          // Z prvního kroku se jde dál na krok odpališť, z podobrazovky
          // zpátky tam, odkud uživatel přišel.
          if (pickerAtStart) setView('setupTee')
          else leaveSetup()
        }}
        onNewCourse={() => {
          setEditingCourseId(null)
          setView('courseEdit')
        }}
        onBack={leaveSetup}
        {...(pickerAtStart && pickerMode === 'start'
          ? {
              onSkip: () => {
                selectCourse(undefined)
                setView('setupTee')
              },
            }
          : {})}
      />
    )
  }

  if (view === 'players') {
    return <PlayersScreen onBack={() => window.history.back()} />
  }

  if (view === 'courseEdit') {
    const editing = editingCourseId ? findCourse(editingCourseId) : undefined
    return (
      <CourseEditScreen
        {...(editing ? { course: editing } : {})}
        onSaved={(saved) => {
          // Uložené hřiště se rovnou předvybere, ať se nehledá v seznamu.
          setCourses(loadCourses())
          selectCourse(saved)
          setEditingCourseId(null)
          leaveSetup()
        }}
        onDeleted={() => {
          setCourses(loadCourses())
          if (selectedCourseId === editingCourseId) selectCourse(undefined)
          setEditingCourseId(null)
          leaveSetup()
        }}
        onBack={() => {
          setEditingCourseId(null)
          leaveSetup()
        }}
      />
    )
  }

  if (view === 'backup') {
    return (
      <BackupScreen onImported={reloadFromStorage} onBack={() => window.history.back()} />
    )
  }

  if (view === 'privacy') {
    return <PrivacyScreen onBack={() => window.history.back()} />
  }

  if (view === 'account') {
    return (
      <AccountScreen
        onOpenPrivacy={() => setView('privacy')}
        onBack={() => window.history.back()}
      />
    )
  }

  if (view === 'archive') {
    const opened = archive.find((r) => r.id === openArchiveId)
    if (opened) {
      return (
        <ResultsScreen round={opened} readOnly onBack={() => window.history.back()} />
      )
    }
    return (
      <ArchiveScreen
        rounds={archive}
        onOpen={setOpenArchiveId}
        onDelete={removeArchived}
        onBack={() => window.history.back()}
      />
    )
  }

  if (view === 'home') return renderHome()

  if (view === 'setupTee') {
    return (
      <SetupTeeScreen
        courses={courses}
        courseId={selectedCourseId ?? ''}
        holeCount={holeCount}
        onHoleCountChange={setHoleCount}
        loopIds={loopIds}
        onLoopIdsChange={setLoopIds}
        secondNineId={secondNineId}
        onSecondNineIdChange={setSecondNineId}
        teeId={teeId}
        onTeeIdChange={useTeeForAll}
        onPickCourse={() => {
          setPickerAtStart(false)
          setPickerMode('start')
          openSetupSubscreen('coursePicker')
        }}
        onEditCourse={(courseId) => {
          setEditingCourseId(courseId ?? null)
          openSetupSubscreen('courseEdit')
        }}
        onBack={leaveSetup}
        onNext={() => setView('setupPlayers')}
      />
    )
  }

  if (view === 'setupPlayers') {
    return (
      <SetupPlayersScreen
        courses={courses}
        courseId={selectedCourseId ?? ''}
        loopIds={loopIds}
        secondNineId={secondNineId}
        teeId={teeId}
        playerCount={playerCount}
        onPlayerCountChange={setPlayerCount}
        names={names}
        onNameChange={setPlayerName}
        playerTeeIds={playerTeeIds}
        onPlayerTeeIdChange={setPlayerTee}
        onUseTeeForAll={useTeeForAll}
        netScoring={netScoring}
        onNetScoringChange={setNetScoring}
        handicapMode={handicapMode}
        onHandicapModeChange={setHandicapMode}
        handicapText={handicapText}
        onHandicapTextChange={setPlayerHandicapText}
        onBack={() => window.history.back()}
        onNext={() => setView('setupGame')}
      />
    )
  }

  if (view === 'setupGame') {
    return (
      <SetupGameScreen
        playerCount={playerCount}
        names={names}
        gameId={gameId}
        onGameIdChange={setGameId}
        pairing={pairing}
        onPairingChange={setPairing}
        onOpenGameSettings={(id) => {
          setSettingsGameId(id)
          openSetupSubscreen('gameSettings')
        }}
        onBack={() => window.history.back()}
        onNext={() => setView('setupBet')}
      />
    )
  }

  if (view === 'setupBet') {
    return (
      <SetupBetScreen
        courses={courses}
        courseId={selectedCourseId ?? ''}
        loopIds={loopIds}
        secondNineId={secondNineId}
        teeId={teeId}
        playerTeeIds={playerTeeIds}
        gameId={gameId}
        playerCount={playerCount}
        names={names}
        pairing={pairing}
        netScoring={netScoring}
        handicapMode={handicapMode}
        handicapText={handicapText}
        settings={settings}
        onSettingsChange={setSettings}
        pointValueText={pointValueText}
        onPointValueTextChange={setPointValueText}
        onStart={startRound}
        onBack={() => window.history.back()}
      />
    )
  }

  // Bezpečnostní pojistka: kdyby se appka dostala do stavu bez rozehraného
  // kola a bez shody na nic výš (staré `view` z historie po aktualizaci
  // appky), vrátí ji tohle na domovskou obrazovku místo pádu na `PlayScreen`
  // bez kola.
  if (!round) return renderHome()

  if (view === 'results') {
    return (
      <ResultsScreen
        round={round}
        onResume={resumeRound}
        onNewRound={discardRound}
        onOpenArchive={openArchive}
        onOpenAccount={() => setView('account')}
      />
    )
  }

  return (
    <PlayScreen
      round={round}
      onSetScore={setScore}
      onToggleBonus={setBonus}
      onSetPar={setPar}
      onSetHoleSetup={setHoleSetup}
      onGoToHole={goToHole}
      onFinish={finishRound}
      onShowResults={() => setView('results')}
      onOpenAccount={() => setView('account')}
    />
  )
}

/**
 * Kořen aplikace obalený stavem účtu.
 *
 * Provider sám o sobě nic nestahuje - Firebase se načte teprve tehdy, když se
 * uživatel přihlásí (nebo už přihlášený je).
 */
export default function App() {
  return (
    <AccountProvider>
      <AppShell />
    </AccountProvider>
  )
}
