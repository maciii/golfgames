import type { PlayerId, Round } from '../types'
import { isHoleStarted, teamName } from '../types'
import { pairNetScoreAt, pairPlayingHandicap, pairStrokesReceived } from '../handicap'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSummary,
  ScorecardPlayerCell,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { t } from '../i18n'
import { CONCEDED, formatSideScore } from './shared'
import type { MatchSide, MatchState, SideScore } from './match'
import {
  compactHeaderNote,
  headerTone,
  holeWinner,
  isOutOfPlay,
  matchStateOf,
  sideTone,
  sideValueLabel,
} from './match'

/**
 * Foursome - jamkovka dvojic, které hrají **jedním míčem** střídavě.
 *
 * Proti four-ballu (`matchPlay.ts`) se nevybírá lepší míč: dvojice odpaluje
 * na jamce jednou a dál se v ranách střídá, takže na jamku má jediné skóre.
 * Zápas na jamky je pak úplně stejný, a proto stojí na společném jádru
 * v `match.ts`.
 *
 * Zápis skóre je jeden na dvojici (`sharedBall`), ale ukládá se každému
 * partnerovi - `Round.scores` je po hráčích a nový tvar dat by znamenal
 * migraci archivu (rozhodnutí #33 v docs/decisions.md).
 *
 * V kole s HCP dostává dvojice rány z **poloviny součtu** hracích handicapů
 * obou partnerů, jak to pro foursome dělá WHS.
 */

/** Strany zápasu = obě dvojice v pořadí, ve kterém je kolo nese. */
function matchSides(round: Round): MatchSide[] {
  return round.teams.map((team) => ({
    id: team.id,
    name: teamName(round, team),
    playerIds: team.playerIds,
  }))
}

/**
 * Rána dvojice na jamce.
 *
 * Chybějící zápis na rozehrané jamce znamená, že dvojice jamku vzdala -
 * jediný míč nemá kdo dohrát za ni.
 */
const sideScore: SideScore = (round, side, hole) => {
  if (!isHoleStarted(round, hole)) return null
  return pairNetScoreAt(round, side.playerIds, hole) ?? CONCEDED
}

/** Stav zápasu ze zapsaných jamek. */
export function foursomeState(round: Round): MatchState {
  return matchStateOf(round, matchSides(round), sideScore)
}

/** Rány, které dvojice hráče dostává na jamce - pro tečky ve scorekartě. */
export function foursomePairStrokes(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number {
  const team = round.teams.find((entry) => entry.playerIds.includes(playerId))
  return team ? pairStrokesReceived(round, team.playerIds, hole) : 0
}

export const foursome: GameDefinition = {
  id: 'foursome',
  playerCounts: [4],
  usesTeams: () => true,
  sharedBall: true,
  scoringOptions: {
    bonusIds: [],
    resultMultipliers: false,
    doubleBest: false,
    noDoubleBonuses: false,
    confirmLongest: false,
    confirmNearest: false,
    bonusScope: 'team',
  },
  supportsDoubleHoles: false,

  computeStandings(round: Round): StandingsSection[] {
    const sides = matchSides(round)
    const state = foursomeState(round)

    const rows = sides.map((side, index) => {
      const wonHoles = state.won[index === 0 ? 0 : 1]
      const handicap = pairPlayingHandicap(round, side.playerIds)

      return {
        id: side.id,
        name: side.name,
        value: wonHoles,
        valueLabel: sideValueLabel(state, index),
        detail: t('match.detail', { won: wonHoles, halved: state.halved }),
        ...(handicap !== 0
          ? { secondary: t('foursome.pairHandicap', { handicap }) }
          : {}),
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
    const state = foursomeState(round)
    const outOfPlay = isOutOfPlay(state, hole)

    return {
      entries: matchSides(round).map((side, index) => ({
        label: side.name,
        value: sideValueLabel(state, index),
        tone: sideTone(state, index),
      })),
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
    return { skin: { ariaLabel: t('match.scorecardWonHole', { name: side.name }) } }
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const sides = matchSides(round)
    const [sideA, sideB] = sides
    if (!sideA || !sideB) return []

    const state = foursomeState(round)
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
      const entries = [{ label: t('match.hole'), value: outcome }]
      // Netto rána dvojice se od zapsané liší, takže se vyplatí ji ukázat.
      if (pairStrokesReceived(round, side.playerIds, hole) > 0) {
        entries.unshift({ label: t('foursome.net'), value: formatSideScore(own) })
      }
      return { id: side.id, entries }
    })
  },
}
