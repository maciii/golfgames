import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { BonusId, CreateRoundOptions, PlayerId, Round } from './types'
import { createRound, setHolePar, toggleBonus, touchRound } from './types'
import {
  addToRoster,
  archiveRound,
  deleteArchivedRound,
  loadArchive,
  loadCurrentRound,
  saveCurrentRound,
} from './storage'
import SetupScreen, { type SetupDraft } from './screens/SetupScreen'
import PlayScreen from './screens/PlayScreen'
import ResultsScreen from './screens/ResultsScreen'
import ArchiveScreen from './screens/ArchiveScreen'
import GameSettingsScreen from './screens/GameSettingsScreen'
import BackupScreen from './screens/BackupScreen'
import AccountScreen from './screens/AccountScreen'
import PrivacyScreen from './screens/PrivacyScreen'
import CourseEditScreen from './screens/CourseEditScreen'
import CoursePickerScreen from './screens/CoursePickerScreen'
import { findCourse } from './storage'
import { AccountProvider, useAccount } from './sync/AccountContext'
import { getGame } from './games'
import type { HoleSetupSelection } from './games'

type View =
  | 'setup'
  | 'play'
  | 'results'
  | 'archive'
  | 'gameSettings'
  | 'backup'
  | 'account'
  | 'privacy'
  | 'courseEdit'
  | 'coursePicker'

/**
 * Kam obrazovka patří podle stavu kola.
 *
 * Platí to na dvou místech - při startu aplikace a při návratu z podobrazovky -
 * a obě musí odpovídat, jinak refresh přistane jinde, než kde uživatel byl.
 *
 * Nové kolo začíná **výběrem hřiště**: bez hřiště není z čeho vybrat odpaliště
 * ani počítat handicapy, takže se nastavení kola otevírá až proti němu.
 */
function viewForRound(round: Round | null): View {
  if (!round) return 'coursePicker'
  return round.finishedAt ? 'results' : 'play'
}

/**
 * Kořen aplikace: drží rozehrané kolo, archiv a to, která obrazovka je vidět.
 *
 * Navigace je záměrně plochá - aplikace se ovládá jednou rukou na hřišti,
 * takže se nikam nezanořuje a router by byl zbytečná váha.
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
  const [setupDraft, setSetupDraft] = useState<SetupDraft | undefined>()
  /**
   * Je výběr hřiště prvním krokem nového kola, nebo podobrazovkou nastavení?
   *
   * V prvním kroku není kam se vracet, takže obrazovka místo „Zpět" nabídne
   * hru bez hřiště a odkazy na archiv, zálohu a účet.
   */
  const [pickerAtStart, setPickerAtStart] = useState(true)
  const setupScrollTop = useRef(0)
  const restoreSetupScroll = useRef(false)

  const rememberSetupDraft = useCallback((draft: SetupDraft) => {
    setSetupDraft(draft)
  }, [])

  const leaveSetup = useCallback(() => {
    restoreSetupScroll.current = true
    setView('setup')
  }, [])

  const openSetupSubscreen = useCallback((nextView: View) => {
    setupScrollTop.current = window.scrollY
    restoreSetupScroll.current = true
    setView(nextView)
  }, [])

  useLayoutEffect(() => {
    if (view !== 'setup' || !restoreSetupScroll.current) return
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

  const startRound = useCallback((options: CreateRoundOptions) => {
    // Spoluhráči se do seznamu doplní sami, ať se nikde nezakládají ručně -
    // a s nimi i handicap a odpaliště, ze kterého hráli.
    addToRoster(options.playerNames, options.handicapIndexes, options.playerTeeIds)
    setSetupDraft(undefined)
    setRound(createRound(options))
    setView('play')
  }, [])

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
    setSetupDraft(undefined)
    setSelectedCourseId(undefined)
    setRound(null)
    setPickerAtStart(true)
    setView('coursePicker')
  }, [round, discardSyncedRound])

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

  /**
   * Po obnově ze zálohy je v úložišti jiný stav, než jaký drží komponenta.
   * Načteme ho znovu, jinak by ho efekt ukládající rozehrané kolo přepsal zpět.
   */
  const reloadFromStorage = useCallback(() => {
    setRound(loadCurrentRound())
    setArchive(loadArchive())
    setOpenArchiveId(null)
  }, [])

  /** Kam se vrátit z podobrazovky: do rozehrané hry, výsledků, nebo na úvod. */
  const mainView = useCallback((): View => {
    if (round) return viewForRound(round)
    // Kdo už hřiště vybral nebo má rozepsané nastavení, vrací se do nastavení -
    // ne zpátky na výběr hřiště, kterým kolo teprve začínalo.
    return setupDraft || selectedCourseId ? 'setup' : 'coursePicker'
  }, [round, setupDraft, selectedCourseId])

  const leaveArchive = useCallback(() => {
    setOpenArchiveId(null)
    setView(mainView())
  }, [mainView])

  // Když synchronizace přinesla data z cloudu, načteme je do obrazovky.
  // Zůstáváme přitom tam, kde uživatel je - jen se pod ním obnoví obsah.
  useEffect(() => {
    if (dataVersion > 0) reloadFromStorage()
  }, [dataVersion, reloadFromStorage])

  if (view === 'gameSettings' && settingsGameId) {
    return (
      <GameSettingsScreen
        gameId={settingsGameId}
        onBack={() => {
          setSettingsGameId(null)
          setView(round ? 'play' : 'setup')
        }}
      />
    )
  }

  if (view === 'coursePicker') {
    return (
      <CoursePickerScreen
        {...(selectedCourseId ? { selectedId: selectedCourseId } : {})}
        onSelect={(course) => {
          setSelectedCourseId(course?.id)
          // Z prvního kroku se jde dál na nastavení, z podobrazovky zpátky
          // tam, odkud uživatel přišel (včetně místa, kde skončil).
          if (pickerAtStart) setView('setup')
          else leaveSetup()
        }}
        onNewCourse={() => {
          setEditingCourseId(null)
          setView('courseEdit')
        }}
        onBack={leaveSetup}
        {...(pickerAtStart
          ? {
              onSkip: () => {
                setSelectedCourseId(undefined)
                setView('setup')
              },
              onOpenArchive: openArchive,
              onOpenBackup: () => setView('backup'),
              onOpenAccount: () => setView('account'),
              archiveCount: archive.length,
            }
          : {})}
      />
    )
  }

  if (view === 'courseEdit') {
    const editing = editingCourseId ? findCourse(editingCourseId) : undefined
    return (
      <CourseEditScreen
        {...(editing ? { course: editing } : {})}
        onSaved={(saved) => {
          // Uložené hřiště se rovnou předvybere, ať se nehledá v seznamu.
          setSelectedCourseId(saved.id)
          setEditingCourseId(null)
          leaveSetup()
        }}
        onDeleted={() => {
          if (selectedCourseId === editingCourseId) setSelectedCourseId(undefined)
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
      <BackupScreen onImported={reloadFromStorage} onBack={() => setView(mainView())} />
    )
  }

  if (view === 'privacy') {
    return <PrivacyScreen onBack={() => setView('account')} />
  }

  if (view === 'account') {
    return (
      <AccountScreen
        onOpenPrivacy={() => setView('privacy')}
        onBack={() => setView(mainView())}
      />
    )
  }

  if (view === 'archive') {
    const opened = archive.find((r) => r.id === openArchiveId)
    if (opened) {
      return (
        <ResultsScreen round={opened} readOnly onBack={() => setOpenArchiveId(null)} />
      )
    }
    return (
      <ArchiveScreen
        rounds={archive}
        onOpen={setOpenArchiveId}
        onDelete={removeArchived}
        onBack={leaveArchive}
      />
    )
  }

  if (!round) {
    return (
      <SetupScreen
        onStart={startRound}
        onOpenArchive={openArchive}
        onOpenGameSettings={(gameId) => {
          setSettingsGameId(gameId)
          openSetupSubscreen('gameSettings')
        }}
        onOpenBackup={() => setView('backup')}
        onOpenAccount={() => setView('account')}
        onEditCourse={(courseId) => {
          setEditingCourseId(courseId ?? null)
          openSetupSubscreen('courseEdit')
        }}
        onPickCourse={() => {
          setPickerAtStart(false)
          openSetupSubscreen('coursePicker')
        }}
        {...(selectedCourseId ? { selectedCourseId } : {})}
        {...(setupDraft ? { initialDraft: setupDraft } : {})}
        onDraftChange={rememberSetupDraft}
        archiveCount={archive.length}
      />
    )
  }

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
