import type { Round } from '../types'

export interface StandingRow {
  /** Stabilní klíč pro React - id hráče nebo týmu. */
  id: string
  name: string
  /** Doplňková informace pod jménem, např. složení týmu. */
  detail?: string
  strokes: number
  holesPlayed: number
  /** Rány vůči paru započítaných jamek; záporné je lepší. */
  toPar: number
  /** 1-based, při shodě sdílené (1, 1, 3, ...). */
  position: number
}

/**
 * Jedna výsledková tabulka. Hra jich může vracet víc - Best Aggregate
 * sleduje vedle sebe lepší míč a součet obou partnerů.
 */
export interface StandingsSection {
  id: string
  title: string
  description?: string
  rows: StandingRow[]
}

/** Výsledek týmu na právě zapisované jamce, zobrazený při hře. */
export interface HoleSummary {
  id: string
  entries: { label: string; value: string }[]
}

export interface GameDefinition {
  id: string
  name: string
  tagline: string
  rules: string
  /** Povolené počty hráčů; týmové hry potřebují sudé počty. */
  playerCounts: number[]
  /** True u her, kde se hráči dělí do dvojic. */
  teamBased: boolean
  computeStandings(round: Round): StandingsSection[]
  /** Volitelné: průběžný týmový výsledek zobrazený u zapisované jamky. */
  holeSummary?(round: Round, hole: number): HoleSummary[]
}

/**
 * Doplní pozice do řádků; shodná skóre sdílí pozici.
 * Řádky bez započítané jamky se řadí na konec, aby nezačínaly na 1. místě.
 */
export function assignPositions(
  rows: Omit<StandingRow, 'position'>[],
): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if ((a.holesPlayed === 0) !== (b.holesPlayed === 0)) {
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
