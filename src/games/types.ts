import type { Round } from '../types'

/**
 * Společné rozhraní všech her.
 *
 * Aplikace o konkrétních pravidlech nic neví - jen zavolá computeStandings()
 * a vykreslí, co dostane. Přidání hry je proto nový soubor v této složce plus
 * zápis do registru v index.ts.
 */

export interface StandingRow {
  /** Stabilní klíč pro React - id hráče nebo týmu. */
  id: string
  name: string
  /** Číselná hodnota, podle které se řadí pořadí. */
  value: number
  /** Hodnota tak, jak se ukáže uživateli, např. "12 b." nebo "3 UP". */
  valueLabel: string
  /** Rozpad výsledku pod jménem, např. "BEST 3 · Součet 2 · Bonus 4". */
  detail?: string
  /** Doplňkový údaj vpravo, např. počet ran. */
  secondary?: string
  /** Kolik jamek už do výsledku vstoupilo. */
  holesPlayed: number
  /** 1-based, při shodě sdílené (1, 1, 3, ...). */
  position: number
}

/** Jedna výsledková tabulka; hra jich může vracet víc. */
export interface StandingsSection {
  id: string
  title: string
  description?: string
  rows: StandingRow[]
}

/** Průběžný výsledek zobrazený u právě zapisované jamky. */
export interface HoleSummary {
  /** Id týmu nebo hráče, ke kterému shrnutí patří. */
  id: string
  entries: { label: string; value: string }[]
}

export interface GameDefinition {
  id: string
  name: string
  /** Jednořádkový popis do výběru hry. */
  tagline: string
  /** Delší vysvětlení pravidel do nastavení kola. */
  rules: string
  /** Povolené počty hráčů. */
  playerCounts: number[]
  /** Hraje se při daném počtu hráčů ve dvojicích? */
  usesTeams(playerCount: number): boolean
  computeStandings(round: Round): StandingsSection[]
  holeSummary?(round: Round, hole: number): HoleSummary[]
}

/** Směr řazení: u ran vyhrává nejnižší, u bodů nejvyšší hodnota. */
export type RankDirection = 'lowest' | 'highest'

/**
 * Seřadí řádky a doplní pozice; shodná hodnota sdílí pozici (1, 1, 3).
 * Řádky bez jediné započítané jamky jdou na konec, aby se nikdo neocitl
 * na prvním místě jen proto, že ještě nic nezapsal.
 */
export function rankRows(
  rows: Omit<StandingRow, 'position'>[],
  direction: RankDirection,
): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if ((a.holesPlayed === 0) !== (b.holesPlayed === 0)) {
      return a.holesPlayed === 0 ? 1 : -1
    }
    return direction === 'lowest' ? a.value - b.value : b.value - a.value
  })

  let lastValue: number | null = null
  let lastPosition = 0
  return sorted.map((row, index) => {
    const position = row.value === lastValue ? lastPosition : index + 1
    lastValue = row.value
    lastPosition = position
    return { ...row, position }
  })
}
