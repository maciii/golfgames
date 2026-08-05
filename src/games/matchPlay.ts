import type { PlayerId, Round } from '../types'
import { isHoleStarted, scoreAt, teamName } from '../types'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSummary,
  ScorecardPlayerCell,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { t } from '../i18n'
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
  /** 0-based jamka, na které se zápas stal matematicky rozhodnutým. */
  decisionHole: number | null
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
  let decisionHole: number | null = null

  if (sideA && sideB) {
    for (let hole = 0; hole < round.holeCount; hole++) {
      const a = sideScore(round, sideA, hole)
      const b = sideScore(round, sideB, hole)
      if (a === null || b === null) continue
      settled += 1
      if (a < b) won[0] += 1
      else if (b < a) won[1] += 1
      else halved += 1

      const lead = Math.abs(won[0] - won[1])
      if (lead > round.holeCount - settled) {
        decisionHole = hole
        break
      }
    }
  }

  const remaining = round.holeCount - settled
  const diff = won[0] - won[1]
  const lead = Math.abs(diff)
  const leaderIndex = diff === 0 ? null : diff > 0 ? 0 : 1
  const decided = decisionHole !== null

  let label: string
  if (leaderIndex === null) {
    label =
      settled === 0
        ? t('match.notStarted')
        : remaining === 0
          ? t('match.allSquareFinished')
          : t('match.allSquareRemaining', { count: remaining })
  } else {
    const name = sides[leaderIndex]?.name ?? '?'
    if (decided) {
      // Golfová notace: náskok & počet jamek, které zbývaly.
      label =
        remaining === 0
          ? t('match.winsFinal', { name, lead })
          : t('match.wins', { name, lead, remaining })
    } else if (lead === remaining) {
      label = t('match.dormie', { name, lead, remaining })
    } else {
      label = t('match.leads', { name, lead, remaining })
    }
  }

  return { won, halved, remaining, lead, leaderIndex, decided, decisionHole, label }
}

function sideValueLabel(state: MatchState, index: number): string {
  if (state.leaderIndex === null) return t('match.allSquare')
  return state.leaderIndex === index
    ? t('match.up', { count: state.lead })
    : t('match.down', { count: state.lead })
}

function compactHeaderNote(state: MatchState, outOfPlay: boolean): string {
  if (outOfPlay) return t('match.outOfPlayShort')
  if (state.decided) {
    return state.remaining > 0
      ? t('match.resultShort', { lead: state.lead, remaining: state.remaining })
      : t('match.finalShort', { lead: state.lead })
  }
  if (state.remaining === 0) return t('match.finishedShort')
  if (state.leaderIndex !== null && state.lead === state.remaining) {
    return t('match.dormieShort', { count: state.remaining })
  }
  return t('match.remainingShort', { count: state.remaining })
}

/** Vítězná strana jamky; dělené a po rozhodnutí neplatné jamky vrací null. */
function matchHoleWinner(round: Round, hole: number): 0 | 1 | null {
  const state = matchState(round)
  if (state.decisionHole !== null && hole > state.decisionHole) return null

  const [sideA, sideB] = matchSides(round)
  if (!sideA || !sideB) return null

  const scoreA = sideScore(round, sideA, hole)
  const scoreB = sideScore(round, sideB, hole)
  if (scoreA === null || scoreB === null || scoreA === scoreB) return null
  return scoreA < scoreB ? 0 : 1
}

export const matchPlay: GameDefinition = {
  id: 'match-play',
  playerCounts: [2, 4],
  usesTeams: (playerCount) => playerCount === 4,
  scoringOptions: {
    bonusIds: [],
    resultMultipliers: false,
    doubleBest: false,
    noDoubleBonuses: false,
    confirmLongest: false,
    confirmNearest: false,
    bonusScope: 'player',
  },
  supportsDoubleHoles: false,

  computeStandings(round: Round): StandingsSection[] {
    const sides = matchSides(round)
    const state = matchState(round)

    const rows = sides.map((side, index) => {
      const wonHoles = state.won[index === 0 ? 0 : 1]

      return {
        id: side.id,
        name: side.name,
        value: wonHoles,
        valueLabel: sideValueLabel(state, index),
        detail: t('match.detail', { won: wonHoles, halved: state.halved }),
        holesPlayed: wonHoles + state.halved,
      }
    })

    return [
      {
        id: 'match',
        title: t('match.title'),
        description: state.label,
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  headerSummary(round: Round, hole: number): HeaderSummary {
    const state = matchState(round)
    const outOfPlay = state.decisionHole !== null && hole > state.decisionHole
    const tone = outOfPlay
      ? 'outOfPlay'
      : state.decided
        ? 'decided'
        : state.leaderIndex !== null && state.lead === state.remaining
          ? 'dormie'
          : 'normal'

    return {
      entries: matchSides(round).map((side, index) => ({
        label: side.name,
        value: sideValueLabel(state, index),
        tone:
          state.leaderIndex === null
            ? 'neutral'
            : state.leaderIndex === index
              ? 'positive'
              : 'negative',
      })),
      // Stav stran je v barevných UP/DOWN hodnotách; třetí řádek nese jen
      // počet zbývajících jamek nebo krátkou informaci o dormie/rozhodnutí.
      note: compactHeaderNote(state, outOfPlay),
      tone,
    }
  },

  scorecardPlayerCell(
    round: Round,
    playerId: PlayerId,
    hole: number,
  ): ScorecardPlayerCell {
    const winner = matchHoleWinner(round, hole)
    if (winner === null) return {}

    const side = matchSides(round)[winner]
    if (!side || !side.playerIds.includes(playerId)) return {}

    const player = round.players.find((entry) => entry.id === playerId)
    return player
      ? { skin: { ariaLabel: t('match.scorecardWonHole', { name: player.name }) } }
      : {}
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const sides = matchSides(round)
    const [sideA, sideB] = sides
    if (!sideA || !sideB) return []

    const state = matchState(round)
    if (state.decisionHole !== null && hole > state.decisionHole) {
      return [
        {
          id: '_game',
          entries: [{ label: t('match.hole'), value: t('match.outOfPlay') }],
        },
      ]
    }

    const a = sideScore(round, sideA, hole)
    const b = sideScore(round, sideB, hole)

    // U jednotlivců nemá smysl opakovat ránu, která je vidět v zápisu výš.
    if (sideA.playerIds.length === 1) {
      let value = t('common.dash')
      if (a !== null && b !== null) {
        value = a === b ? t('match.halved') : a < b ? sideA.name : sideB.name
      }
      return [{ id: '_game', entries: [{ label: t('match.takesHole'), value }] }]
    }

    return sides.map((side, index) => {
      const own = index === 0 ? a : b
      const other = index === 0 ? b : a
      let outcome = t('common.dash')
      if (own !== null && other !== null) {
        outcome =
          own === other
            ? t('match.halved')
            : own < other
              ? t('match.takes')
              : t('match.loses')
      }
      return {
        id: side.id,
        entries: [
          { label: t('match.bestBall'), value: formatSideScore(own) },
          { label: t('match.hole'), value: outcome },
        ],
      }
    })
  },
}
