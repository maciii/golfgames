import type { Round } from '../types'

export interface StandingRow {
  /** Stabilní klíč pro React - id hráče nebo týmu. */
  id: string
  name: string
  /** Doplňková informace pod jménem, např. složení týmu. */
  detail?: string
  strokes: number
  holesPlayed: number
  /** Rány vůči paru odehraných jamek; záporné je lepší. */
  toPar: number
  /** 1-based, při shodě sdílené (1, 1, 3, ...). */
  position: number
}

export interface GameDefinition {
  id: string
  name: string
  tagline: string
  rules: string
  minPlayers: number
  maxPlayers: number
  /** Pro týmové hry: povolené počty hráčů (jinak min..max). */
  playerCounts?: number[]
  computeStandings(round: Round): StandingRow[]
}

/**
 * Doplní pozice do už seřazených řádků; shodná skóre sdílí pozici.
 * Řádky bez odehrané jamky se řadí na konec, aby nezačínali na 1. místě.
 */
export function assignPositions(
  rows: Omit<StandingRow, 'position'>[],
): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.holesPlayed === 0 !== (b.holesPlayed === 0)) {
      return a.holesPlayed === 0 ? 1 : -1
    }
    return a.strokes - b.strokes
  })

  let lastStrokes: number | null = null
  let lastPosition = 0
  return sorted.map((row, index) => {
    const position = row.strokes === lastStrokes ? lastPosition : index + 1
    lastStrokes = row.strokes
    lastPosition = position
    return { ...row, position }
  })
}
