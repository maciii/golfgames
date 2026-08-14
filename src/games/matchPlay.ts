import type { PlayerId, Round } from '../types'
import { teamName } from '../types'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSummary,
  ScorecardPlayerCell,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { t } from '../i18n'
import { formatSideScore } from './shared'
import { SIDE_BET_BONUSES, sideBetSection, withSideBets } from './sideBets'
import type { MatchSide, MatchState, SideScore } from './match'
import {
  bestBallScore,
  compactHeaderNote,
  headerTone,
  holeWinner,
  individualScore,
  isOutOfPlay,
  matchStateOf,
  sideTone,
  sideValueLabel,
} from './match'

/**
 * Match play - zápas dvou stran na jamky.
 *
 * Podporované sestavy:
 *   2 hráči - klasický souboj jednotlivců
 *   4 hráči - four-ball, kde za dvojici hraje vždy lepší míč
 *
 * Samotná mechanika zápasu (stav, dormie, notace `3&2`, jamky mimo hru) je
 * v `match.ts` a dělí se o ni s Foursome a dvěma jamkovkami ve flightu.
 * Tady zůstává jen to, co je pro four-ball vlastní: strany a lepší míč.
 */

/** Sestaví dvě strany zápasu podle toho, jestli se hraje ve dvojicích. */
function matchSides(round: Round): MatchSide[] {
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

/** Rána strany: u dvojice lepší míč, u jednotlivce jeho netto skóre. */
const sideScore: SideScore = (round, side, hole) =>
  side.playerIds.length === 1
    ? individualScore(round, side, hole)
    : bestBallScore(round, side, hole)

export type { MatchState } from './match'

/** Stav zápasu ze zapsaných jamek. */
export function matchState(round: Round): MatchState {
  return matchStateOf(round, matchSides(round), sideScore)
}

/** Strany pro vedlejší sázku: u čtyř hráčů dvojice, u dvou jednotlivci. */
function betSides(round: Round) {
  return matchSides(round).map((side) => ({
    id: side.id,
    name: side.name,
    playerIds: side.playerIds,
  }))
}

export const matchPlay: GameDefinition = {
  id: 'match-play',
  playerCounts: [2, 4],
  usesTeams: (playerCount) => playerCount === 4,
  scoringOptions: {
    // Extra body jsou tady vedlejší sázka: ve výchozím stavu nulové, takže
    // dokud si je někdo nezapne, hra se chová jako dřív (`sideBets.ts`).
    bonusIds: SIDE_BET_BONUSES,
    resultMultipliers: true,
    doubleBest: false,
    noDoubleBonuses: false,
    confirmLongest: true,
    confirmNearest: true,
    bonusesAsSideBet: true,
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

    // Extra body nemůžou vstoupit do tabulky zápasu - pořadí v ní drží
    // vyhrané jamky, ne bunkery. Mají proto vlastní tabulku a do peněz se
    // přidají v `settlementParties()`.
    const sideBets = sideBetSection(round, betSides(round))

    return [
      {
        id: 'match',
        title: t('match.title'),
        description: state.label,
        rows: rankRows(rows, 'highest'),
      },
      ...(sideBets ? [sideBets] : []),
    ]
  },

  settlementParties(round: Round) {
    const state = matchState(round)
    return withSideBets(
      round,
      betSides(round).map((side, index) => ({
        ...side,
        units: state.won[index === 0 ? 0 : 1],
      })),
    )
  },

  headerSummary(round: Round, hole: number): HeaderSummary {
    const state = matchState(round)
    const outOfPlay = isOutOfPlay(state, hole)

    return {
      entries: matchSides(round).map((side, index) => ({
        label: side.name,
        value: sideValueLabel(state, index),
        tone: sideTone(state, index),
      })),
      // Stav stran je v barevných UP/DOWN hodnotách; třetí řádek nese jen
      // počet zbývajících jamek nebo krátkou informaci o dormie/rozhodnutí.
      note: compactHeaderNote(state, outOfPlay),
      tone: headerTone(state, outOfPlay),
    }
  },

  scorecardPlayerCell(
    round: Round,
    playerId: PlayerId,
    hole: number,
  ): ScorecardPlayerCell {
    const sides = matchSides(round)
    const winner = holeWinner(round, sides, sideScore, hole)
    if (winner === null) return {}

    const side = sides[winner]
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
    if (isOutOfPlay(state, hole)) {
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
