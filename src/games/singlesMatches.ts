import type { PlayerId, Round, Team } from '../types'
import { playerName, scoreAt } from '../types'
import { netScoreAt } from '../handicap'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSummary,
  ScorecardPlayerCell,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { t } from '../i18n'
import { CONCEDED } from './shared'
import type { MatchSide, MatchState, SideScore } from './match'
import {
  compactHeaderNote,
  headerTone,
  holeWinner,
  isOutOfPlay,
  matchStateOf,
  sideValueLabel,
} from './match'

/**
 * Dvě jamkovky 1 na 1 v jednom flightu.
 *
 * Čtyři hráči jdou spolu, ale nehrají jednu hru: běží **dva samostatné
 * zápasy jednotlivců** (kdo s kým, se vybírá stejně jako dvojice u ostatních
 * čtyřhráčových her). Každý zápas má vlastní stav i vlastní peněžní
 * vyrovnání - výsledek jednoho nemá na druhý žádný vliv.
 *
 * `Round.teams` tady neznamená partnery, ale **soupeře jednoho zápasu**
 * (`pairingKind: 'opponents'`), takže si kolo nenese žádný nový tvar dat.
 */

/** Jeden zápas ve flightu: dva soupeři a jeho stav. */
interface FlightMatch {
  team: Team
  sides: MatchSide[]
  sideScore: SideScore
  state: MatchState
  label: string
}

/**
 * Rána hráče v rámci **jeho** zápasu.
 *
 * Jamka je rozehraná, jakmile v ní zapsal jeden ze dvou soupeřů - ne kdokoli
 * ve flightu. Bez toho by zápis prvního zápasu udělal ze druhého vzdanou
 * jamku, protože soupeři v něm ještě nezapsali (rozhodnutí #34).
 */
function matchScore(opponentIds: PlayerId[]): SideScore {
  return (round, side, hole) => {
    const started = opponentIds.some((id) => scoreAt(round, id, hole) !== null)
    if (!started) return null
    const id = side.playerIds[0]
    const score = id ? netScoreAt(round, id, hole) : null
    // Chybějící zápis na rozehrané jamce = hráč jamku vzdal, soupeř ji bere.
    return score ?? CONCEDED
  }
}

/** Zápasy ve flightu v pořadí, ve kterém je kolo nese. */
export function flightMatches(round: Round): FlightMatch[] {
  return round.teams.map((team) => {
    const sides: MatchSide[] = team.playerIds.map((id) => ({
      id,
      name: playerName(round, id),
      playerIds: [id],
    }))
    const sideScore = matchScore(team.playerIds)
    const state = matchStateOf(round, sides, sideScore)
    return {
      team,
      sides,
      sideScore,
      state,
      label: sides.map((side) => side.name).join(t('singles.versusJoin')),
    }
  })
}

/** Zápas, ve kterém hráč hraje. */
function matchOf(round: Round, playerId: PlayerId): FlightMatch | undefined {
  return flightMatches(round).find((match) => match.team.playerIds.includes(playerId))
}

/** Stav zápasu očima vedoucího hráče: „Mac 2 UP", nebo „AS". */
function leaderLabel(match: FlightMatch): string {
  const { state } = match
  if (state.leaderIndex === null) return t('match.allSquare')
  const name = match.sides[state.leaderIndex]?.name ?? '?'
  return t('singles.leaderState', {
    name,
    state: sideValueLabel(state, state.leaderIndex),
  })
}

export const singlesMatches: GameDefinition = {
  id: 'singles-matches',
  playerCounts: [4],
  usesTeams: () => true,
  pairingKind: 'opponents',
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
    const matches = flightMatches(round)

    const rows = matches.flatMap((match) =>
      match.sides.map((side, index) => {
        const wonHoles = match.state.won[index === 0 ? 0 : 1]
        const opponent = match.sides[index === 0 ? 1 : 0]?.name ?? '?'
        return {
          id: side.id,
          name: side.name,
          value: wonHoles,
          valueLabel: sideValueLabel(match.state, index),
          detail: t('singles.versusDetail', {
            name: opponent,
            won: wonHoles,
            halved: match.state.halved,
          }),
          holesPlayed: wonHoles + match.state.halved,
        }
      }),
    )

    return [
      {
        id: 'matches',
        title: t('singles.title'),
        // Stav obou zápasů pod tabulkou; pořadí v ní je podle vyhraných jamek
        // celého flightu, ale rozhodnutý je každý zápas sám za sebe.
        description: matches.map((match) => match.state.label).join(' · '),
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  /** Každý zápas se vyrovnává zvlášť - soupeř je jen jeden. */
  settlementGroups(round: Round): string[][] {
    return round.teams.map((team) => [...team.playerIds])
  },

  teamLabel(round: Round, team: Team): string {
    return team.playerIds.map((id) => playerName(round, id)).join(t('singles.versusJoin'))
  },

  headerSummary(round: Round, hole: number): HeaderSummary {
    const matches = flightMatches(round)
    // Mimo hru je jamka jen tehdy, když už je rozhodnutý každý zápas -
    // dokud jeden běží, hraje se dál a hlavička to nesmí přebít.
    const outOfPlay =
      matches.length > 0 && matches.every((match) => isOutOfPlay(match.state, hole))
    // Krátká zpráva pod stavy patří zápasu, který ještě běží - ten určuje,
    // co se na jamce vlastně děje.
    const noteState =
      matches.find((match) => !match.state.decided)?.state ?? matches[0]?.state

    return {
      entries: matches.map((match) => ({
        label: match.label,
        value: leaderLabel(match),
        tone: match.state.leaderIndex === null ? 'neutral' : 'positive',
      })),
      note: noteState ? compactHeaderNote(noteState, outOfPlay) : '',
      tone: noteState ? headerTone(noteState, outOfPlay) : 'normal',
    }
  },

  scorecardPlayerCell(
    round: Round,
    playerId: PlayerId,
    hole: number,
  ): ScorecardPlayerCell {
    const match = matchOf(round, playerId)
    if (!match) return {}

    const winner = holeWinner(round, match.sides, match.sideScore, hole)
    if (winner === null) return {}

    const side = match.sides[winner]
    if (!side || side.id !== playerId) return {}
    return { skin: { ariaLabel: t('match.scorecardWonHole', { name: side.name }) } }
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    return flightMatches(round).map((match) => {
      if (isOutOfPlay(match.state, hole)) {
        return {
          id: match.team.id,
          entries: [{ label: t('match.hole'), value: t('match.outOfPlay') }],
        }
      }

      const winner = holeWinner(round, match.sides, match.sideScore, hole)
      const [first, second] = match.sides
      const scoreA = first ? match.sideScore(round, first, hole) : null
      const scoreB = second ? match.sideScore(round, second, hole) : null

      let value = t('common.dash')
      if (scoreA !== null && scoreB !== null) {
        value =
          winner === null
            ? t('match.halved')
            : (match.sides[winner]?.name ?? t('common.dash'))
      }

      return {
        id: match.team.id,
        entries: [
          { label: t('match.takesHole'), value },
          { label: t('singles.state'), value: leaderLabel(match) },
        ],
      }
    })
  },
}
