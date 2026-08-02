import { useCallback, useEffect, useState } from 'react'
import type { BonusId, CreateRoundOptions, PlayerId, Round } from './types'
import { createRound, toggleBonus } from './types'
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

type View = 'setup' | 'play' | 'results' | 'archive' | 'gameSettings'

/**
 * Kořen aplikace: drží rozehrané kolo, archiv a to, která obrazovka je vidět.
 *
 * Navigace je záměrně plochá - aplikace se ovládá jednou rukou na hřišti,
 * takže se nikam nezanořuje a router by byl zbytečná váha.
 */
export default function App() {
  // Rozehrané kolo přežije zavření aplikace i restart telefonu.
  const [round, setRound] = useState<Round | null>(() => loadCurrentRound())
  const [view, setView] = useState<View>('play')
  const [archive, setArchive] = useState<Round[]>(() => loadArchive())
  const [openArchiveId, setOpenArchiveId] = useState<string | null>(null)
  // Hra, jejíž bodování se právě nastavuje.
  const [settingsGameId, setSettingsGameId] = useState<string | null>(null)

  useEffect(() => {
    saveCurrentRound(round)
  }, [round])

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
        return { ...prev, scores: { ...prev.scores, [playerId]: holes } }
      })
    },
    [],
  )

  const setBonus = useCallback((playerId: PlayerId, hole: number, bonusId: BonusId) => {
    setRound((prev) => (prev ? toggleBonus(prev, playerId, hole, bonusId) : prev))
  }, [])

  const setPar = useCallback((hole: number, par: number) => {
    setRound((prev) => {
      if (!prev) return prev
      const pars = [...prev.pars]
      pars[hole] = par
      return { ...prev, pars }
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
      const finished = { ...prev, finishedAt: new Date().toISOString() }
      // Stejné id přepíše dřívější záznam, takže dodatečná oprava skóre
      // archiv nezdvojí.
      archiveRound(finished)
      setArchive(loadArchive())
      return finished
    })
    setView('results')
  }, [])

  const resumeRound = useCallback(() => {
    setRound((prev) => (prev ? { ...prev, finishedAt: undefined } : prev))
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

  const leaveArchive = useCallback(() => {
    setOpenArchiveId(null)
    setView(round ? (round.finishedAt ? 'results' : 'play') : 'setup')
  }, [round])

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
    />
  )
}
