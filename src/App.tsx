import { useCallback, useEffect, useState } from 'react'
import type { PlayerId, Round } from './types'
import { createRound } from './types'
import { addToHistory, loadCurrentRound, saveCurrentRound } from './storage'
import SetupScreen from './screens/SetupScreen'
import PlayScreen from './screens/PlayScreen'
import ResultsScreen from './screens/ResultsScreen'

type View = 'play' | 'results'

export default function App() {
  // Rozehrané kolo přežije zavření appky i restart telefonu.
  const [round, setRound] = useState<Round | null>(() => loadCurrentRound())
  const [view, setView] = useState<View>('play')

  useEffect(() => {
    saveCurrentRound(round)
  }, [round])

  const startRound = useCallback(
    (
      gameId: string,
      playerNames: string[],
      holeCount: number,
      teamIndices?: number[][],
    ) => {
      setRound(createRound(gameId, playerNames, holeCount, teamIndices))
      setView('play')
    },
    [],
  )

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
      const clamped = Math.max(0, Math.min(prev.holeCount - 1, hole))
      return { ...prev, currentHole: clamped }
    })
  }, [])

  const finishRound = useCallback(() => {
    setRound((prev) => {
      if (!prev) return prev
      const finished = { ...prev, finishedAt: new Date().toISOString() }
      addToHistory(finished)
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
    setView('play')
  }, [])

  if (!round) {
    return <SetupScreen onStart={startRound} />
  }

  if (view === 'results') {
    return (
      <ResultsScreen
        round={round}
        onResume={resumeRound}
        onNewRound={discardRound}
      />
    )
  }

  return (
    <PlayScreen
      round={round}
      onSetScore={setScore}
      onSetPar={setPar}
      onGoToHole={goToHole}
      onFinish={finishRound}
      onShowResults={() => setView('results')}
    />
  )
}
