import { useCallback, useEffect, useState } from 'react'
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
import SetupScreen from './screens/SetupScreen'
import PlayScreen from './screens/PlayScreen'
import ResultsScreen from './screens/ResultsScreen'
import ArchiveScreen from './screens/ArchiveScreen'
import GameSettingsScreen from './screens/GameSettingsScreen'
import BackupScreen from './screens/BackupScreen'
import AccountScreen from './screens/AccountScreen'
import PrivacyScreen from './screens/PrivacyScreen'
import CourseEditScreen from './screens/CourseEditScreen'
import { findCourse } from './storage'
import { AccountProvider, useAccount } from './sync/AccountContext'

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

/**
 * Kořen aplikace: drží rozehrané kolo, archiv a to, která obrazovka je vidět.
 *
 * Navigace je záměrně plochá - aplikace se ovládá jednou rukou na hřišti,
 * takže se nikam nezanořuje a router by byl zbytečná váha.
 */
function AppShell() {
  const { noteRoundChange, dataVersion } = useAccount()
  // Rozehrané kolo přežije zavření aplikace i restart telefonu.
  const [round, setRound] = useState<Round | null>(() => loadCurrentRound())
  const [view, setView] = useState<View>('play')
  const [archive, setArchive] = useState<Round[]>(() => loadArchive())
  const [openArchiveId, setOpenArchiveId] = useState<string | null>(null)
  // Hra, jejíž bodování se právě nastavuje.
  const [settingsGameId, setSettingsGameId] = useState<string | null>(null)
  // Hřiště, které se právě upravuje; null znamená zakládání nového.
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  // Hřiště předvybrané v nastavení kola po návratu ze zadání.
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>()

  useEffect(() => {
    saveCurrentRound(round)
    // Synchronizace si změnu jen poznamená; odešle ji s odkladem, aby jedno
    // kolo nestálo osmnáct zápisů do cloudu.
    if (round) noteRoundChange(round)
  }, [round, noteRoundChange])

  const startRound = useCallback((options: CreateRoundOptions) => {
    // Spoluhráči se do seznamu doplní sami, ať se nikde nezakládají ručně.
    addToRoster(options.playerNames)
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
    setRound(null)
    setView('setup')
  }, [])

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
  const mainView = useCallback(
    (): View => (round ? (round.finishedAt ? 'results' : 'play') : 'setup'),
    [round],
  )

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

  if (view === 'courseEdit') {
    const editing = editingCourseId ? findCourse(editingCourseId) : undefined
    return (
      <CourseEditScreen
        {...(editing ? { course: editing } : {})}
        onSaved={(saved) => {
          // Uložené hřiště se rovnou předvybere, ať se nehledá v seznamu.
          setSelectedCourseId(saved.id)
          setEditingCourseId(null)
          setView('setup')
        }}
        onDeleted={() => {
          if (selectedCourseId === editingCourseId) setSelectedCourseId(undefined)
          setEditingCourseId(null)
          setView('setup')
        }}
        onBack={() => {
          setEditingCourseId(null)
          setView('setup')
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
          setView('gameSettings')
        }}
        onOpenBackup={() => setView('backup')}
        onOpenAccount={() => setView('account')}
        onEditCourse={(courseId) => {
          setEditingCourseId(courseId ?? null)
          setView('courseEdit')
        }}
        {...(selectedCourseId ? { selectedCourseId } : {})}
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
