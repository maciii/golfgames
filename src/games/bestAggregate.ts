import type { Round, Team } from '../types'
import { diffToPar, holeMultiplier, isHoleStarted, teamName, teamPlayers } from '../types'
import type {
  GameDefinition,
  HoleSummary,
  ScorecardColumn,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import {
  formatSideScore,
  lowerWins,
  teamAggregate,
  teamBestBall,
  teamStrokeTotal,
} from './shared'

/**
 * Best Aggregate - bodovaná hra dvou dvojic (vždy 4 hráči).
 *
 * Na každé jamce se dvojici připisují body:
 *
 *   1 bod  za BEST     - nižší lepší míč než soupeřova dvojice
 *   1 bod  za součet   - nižší součet ran obou partnerů
 *   1 bod  za birdie   - za každé birdie kteréhokoli z partnerů
 *   3 body za eagle    - za každý eagle kteréhokoli z partnerů
 *
 * Vyhrává dvojice s nejvyšším součtem bodů.
 *
 * Chybějící zápis na rozehrané jamce znamená vzdanou jamku: dvojice tím
 * ztrácí součet (soupeř ho bere), lepší míč jí zůstává, dokud ho drží aspoň
 * jeden z partnerů.
 *
 * Rozhodnutí tam, kde pravidla mlčí (viz docs/games.md):
 *   - Při shodě lepšího míče ani součtu nezískává bod nikdo (jamka je dělená).
 *   - Bonus se počítá za každého partnera zvlášť; dvě birdie na jedné jamce
 *     tedy dvojici vynesou 2 body.
 *   - Eagle a lepší (albatros) se boduje shodně 3 body.
 */

export const POINTS = {
  best: 1,
  aggregate: 1,
  birdie: 1,
  eagle: 3,
} as const

/** Bodový rozpad jedné dvojice na jedné jamce. */
export interface TeamHolePoints {
  best: number
  aggregate: number
  bonus: number
  total: number
}

/** Bonusové body dvojice za birdie a eagly na jedné jamce. */
function bonusPoints(round: Round, team: Team, hole: number): number {
  let bonus = 0
  for (const player of teamPlayers(round, team)) {
    const diff = diffToPar(round, player.id, hole)
    if (diff === null) continue
    if (diff <= -2) bonus += POINTS.eagle
    else if (diff === -1) bonus += POINTS.birdie
  }
  return bonus
}

/**
 * Body obou dvojic na jedné jamce.
 * Vrací pole ve stejném pořadí jako round.teams.
 */
export function holePoints(round: Round, hole: number): TeamHolePoints[] {
  const [teamA, teamB] = round.teams
  const empty: TeamHolePoints = { best: 0, aggregate: 0, bonus: 0, total: 0 }
  if (!teamA || !teamB) return round.teams.map(() => ({ ...empty }))

  const bestWinner = lowerWins(
    teamBestBall(round, teamA, hole),
    teamBestBall(round, teamB, hole),
  )
  const aggWinner = lowerWins(
    teamAggregate(round, teamA, hole),
    teamAggregate(round, teamB, hole),
  )

  // Devátá a osmnáctá jamka mohou být za dvojnásobek - násobí se celý zisk
  // z jamky včetně bonusů, ne jen souboj o lepší míč.
  const multiplier = holeMultiplier(round, hole)

  return [teamA, teamB].map((team, index) => {
    const best = (bestWinner === index ? POINTS.best : 0) * multiplier
    const aggregate = (aggWinner === index ? POINTS.aggregate : 0) * multiplier
    const bonus = bonusPoints(round, team, hole) * multiplier
    return { best, aggregate, bonus, total: best + aggregate + bonus }
  })
}

/** Součet bodů dvojic přes celé kolo. */
export function totalPoints(round: Round): TeamHolePoints[] {
  const totals: TeamHolePoints[] = round.teams.map(() => ({
    best: 0,
    aggregate: 0,
    bonus: 0,
    total: 0,
  }))

  for (let hole = 0; hole < round.holeCount; hole++) {
    holePoints(round, hole).forEach((points, index) => {
      const acc = totals[index]
      if (!acc) return
      acc.best += points.best
      acc.aggregate += points.aggregate
      acc.bonus += points.bonus
      acc.total += points.total
    })
  }

  return totals
}

/** Kolik jamek už dvojici něco započítalo (kvůli řazení a "zatím bez zápisu"). */
function settledHoles(round: Round, team: Team): number {
  let count = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    if (teamBestBall(round, team, hole) !== null) count += 1
  }
  return count
}

export const bestAggregate: GameDefinition = {
  id: 'best-aggregate',
  name: 'Best Aggregate',
  tagline: 'Dvě dvojice, body za lepší míč, součet a birdie',
  rules:
    'Hrají vždy čtyři hráči ve dvou dvojicích. Na každé jamce získá dvojice ' +
    '1 bod za nižší lepší míč, 1 bod za nižší součet obou partnerů, ' +
    '1 bod za každé birdie a 3 body za každý eagle. Vyhrává dvojice ' +
    's nejvyšším počtem bodů.',
  playerCounts: [4],
  usesTeams: () => true,
  supportsDoubleHoles: true,

  computeStandings(round: Round): StandingsSection[] {
    const totals = totalPoints(round)

    const rows = round.teams.map((team, index) => {
      const points = totals[index] ?? { best: 0, aggregate: 0, bonus: 0, total: 0 }
      return {
        id: team.id,
        name: teamName(round, team),
        value: points.total,
        valueLabel: `${points.total} b.`,
        detail: `BEST ${points.best} · Součet ${points.aggregate} · Bonus ${points.bonus}`,
        secondary: `${teamStrokeTotal(round, team)} ran`,
        holesPlayed: settledHoles(round, team),
      }
    })

    return [
      {
        id: 'points',
        title: 'Body',
        description:
          'Za jamku: 1 bod za lepší míč, 1 za nižší součet, 1 za birdie, 3 za eagle.',
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  /**
   * Ke každé dvojici přidá sloupec s body, které na jamce získala - stojí
   * hned za rány obou partnerů, ať je vidět, odkud se bod vzal.
   */
  scorecardColumns(round: Round): ScorecardColumn[] {
    return round.teams.map((team, index) => ({
      id: `points-${team.id}`,
      label: 'Body',
      afterPlayerId: team.playerIds[team.playerIds.length - 1],
      cell: (r, hole) => {
        // Prázdná buňka, dokud se na jamce vůbec nehrálo; vzdaná jamka má 0.
        if (!isHoleStarted(r, hole)) return ''
        return `${holePoints(r, hole)[index]?.total ?? 0}`
      },
      total: (r) => `${totalPoints(r)[index]?.total ?? 0}`,
    }))
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const points = holePoints(round, hole)
    return round.teams.map((team, index) => ({
      id: team.id,
      entries: [
        { label: 'Lepší míč', value: formatSideScore(teamBestBall(round, team, hole)) },
        { label: 'Součet', value: formatSideScore(teamAggregate(round, team, hole)) },
        { label: 'Body', value: `${points[index]?.total ?? 0}` },
      ],
    }))
  },
}
