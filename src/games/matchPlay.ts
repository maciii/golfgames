import type { PlayerId, Round } from '../types'
import { isHoleStarted, scoreAt, teamName } from '../types'
import type { GameDefinition, HoleSummary, StandingsSection } from './types'
import { rankRows } from './types'
import { CONCEDED, formatSideScore, teamBestBall } from './shared'

/**
 * Match play - zápas dvou stran na jamky.
 *
 * Nehraje se na celkový počet ran, ale jamka po jamce: kdo zahraje jamku líp,
 * jde o jednu nahoru. Shodná jamka je dělená a stav nemění.
 *
 * Podporované sestavy:
 *   2 hráči - klasický souboj jednotlivců
 *   4 hráči - four-ball, kde za dvojici hraje vždy lepší míč
 *
 * Zápas končí, jakmile je náskok větší než počet zbývajících jamek; výsledek
 * se pak zapisuje golfovou notací "3&2" (tři nahoru, dvě jamky zbývaly).
 */

/** Strana zápasu - jednotlivec, nebo dvojice. */
interface Side {
  id: string
  name: string
  playerIds: PlayerId[]
}

/** Sestaví dvě strany zápasu podle toho, jestli se hraje ve dvojicích. */
function matchSides(round: Round): Side[] {
  if (round.teams.length === 2) {
    return round.teams.map((team) => ({
      id: team.id,
      name: teamName(round, team),
      playerIds: team.playerIds,
    }))
  }
  return round.players
    .slice(0, 2)
    .map((player) => ({ id: player.id, name: player.name, playerIds: [player.id] }))
}

/**
 * Skóre strany na jamce: u dvojice lepší míč, u jednotlivce jeho rána.
 * Vrací null, dokud strana jamku nezapsala.
 */
function sideScore(round: Round, side: Side, hole: number): number | null {
  if (!isHoleStarted(round, hole)) return null

  if (side.playerIds.length === 1) {
    const id = side.playerIds[0]
    const score = id ? scoreAt(round, id, hole) : null
    // Chybějící zápis na rozehrané jamce = jamku vzdal, soupeř ji bere.
    return score ?? CONCEDED
  }
  return teamBestBall(round, { id: side.id, playerIds: side.playerIds }, hole)
}

export interface MatchState {
  /** Vyhrané jamky obou stran, ve stejném pořadí jako strany. */
  won: [number, number]
  /** Počet dělených jamek. */
  halved: number
  /** Kolik jamek ještě není rozhodnutých. */
  remaining: number
  /** Náskok vedoucí strany (0 při nerozhodném stavu). */
  lead: number
  /** Index vedoucí strany, nebo null při shodě. */
  leaderIndex: 0 | 1 | null
  /** Je zápas matematicky rozhodnutý? */
  decided: boolean
  /** Slovní stav zápasu do hlavičky výsledků. */
  label: string
}

/** Spočítá stav zápasu ze zapsaných jamek. */
export function matchState(round: Round): MatchState {
  const sides = matchSides(round)
  const [sideA, sideB] = sides
  const won: [number, number] = [0, 0]
  let halved = 0
  let settled = 0

  if (sideA && sideB) {
    for (let hole = 0; hole < round.holeCount; hole++) {
      const a = sideScore(round, sideA, hole)
      const b = sideScore(round, sideB, hole)
      if (a === null || b === null) continue
      settled += 1
      if (a < b) won[0] += 1
      else if (b < a) won[1] += 1
      else halved += 1
    }
  }

  const remaining = round.holeCount - settled
  const diff = won[0] - won[1]
  const lead = Math.abs(diff)
  const leaderIndex = diff === 0 ? null : diff > 0 ? 0 : 1
  const decided = lead > remaining

  let label: string
  if (leaderIndex === null) {
    label = settled === 0 ? 'Zápas ještě nezačal' : `Nerozhodně, zbývá ${remaining} jamek`
  } else {
    const leaderName = sides[leaderIndex]?.name ?? '?'
    if (decided) {
      // Golfová notace: náskok & počet jamek, které zbývaly.
      label = `${leaderName} vyhrává ${lead}&${remaining}`
    } else if (lead === remaining) {
      label = `${leaderName} vede ${lead} UP (dormie), zbývá ${remaining} jamek`
    } else {
      label = `${leaderName} vede ${lead} UP, zbývá ${remaining} jamek`
    }
  }

  return { won, halved, remaining, lead, leaderIndex, decided, label }
}

export const matchPlay: GameDefinition = {
  id: 'match-play',
  name: 'Match play',
  tagline: 'Zápas na jamky, ne na rány',
  rules:
    'Zápas dvou stran - buď dva hráči proti sobě, nebo dvě dvojice, za které ' +
    'hraje vždy lepší míč. Kdo zahraje jamku líp, jde o jednu nahoru; shodná ' +
    'jamka je dělená. Zápas končí, jakmile je náskok větší než počet ' +
    'zbývajících jamek.',
  playerCounts: [2, 4],
  usesTeams: (playerCount) => playerCount === 4,
  supportsDoubleHoles: false,

  computeStandings(round: Round): StandingsSection[] {
    const sides = matchSides(round)
    const state = matchState(round)

    const rows = sides.map((side, index) => {
      const wonHoles = state.won[index === 0 ? 0 : 1]
      let valueLabel: string
      if (state.leaderIndex === null) valueLabel = 'AS'
      else if (state.leaderIndex === index) valueLabel = `${state.lead} UP`
      else valueLabel = `${state.lead} DOWN`

      return {
        id: side.id,
        name: side.name,
        value: wonHoles,
        valueLabel,
        detail: `${wonHoles} vyhraných jamek · ${state.halved} dělených`,
        holesPlayed: wonHoles + state.halved,
      }
    })

    return [
      {
        id: 'match',
        title: 'Stav zápasu',
        description: state.label,
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const sides = matchSides(round)
    const [sideA, sideB] = sides
    if (!sideA || !sideB) return []

    const a = sideScore(round, sideA, hole)
    const b = sideScore(round, sideB, hole)

    // U jednotlivců nemá smysl opakovat ránu, která je vidět v zápisu výš.
    if (sideA.playerIds.length === 1) {
      let value = '–'
      if (a !== null && b !== null) {
        value = a === b ? 'dělená' : `${a < b ? sideA.name : sideB.name}`
      }
      return [{ id: '_game', entries: [{ label: 'Jamku bere', value }] }]
    }

    return sides.map((side, index) => {
      const own = index === 0 ? a : b
      const other = index === 0 ? b : a
      let outcome = '–'
      if (own !== null && other !== null) {
        outcome = own === other ? 'dělená' : own < other ? 'bere' : 'ztrácí'
      }
      return {
        id: side.id,
        entries: [
          { label: 'Lepší míč', value: formatSideScore(own) },
          { label: 'Jamka', value: outcome },
        ],
      }
    })
  },
}
