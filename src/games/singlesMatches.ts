import type { PlayerId, Round, Team } from '../types'
import { playerName, scoreAt, shortPlayerName } from '../types'
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
import { SIDE_BET_BONUSES, sideBetSection, withSideBets } from './sideBets'
import type { MatchSide, MatchState, SideScore } from './match'
import {
  headerTone,
  holeWinner,
  isOutOfPlay,
  matchStateNote,
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

/** Strany pro vedlejší sázku: každý hráč sám za sebe, jako jeho zápas. */
function betSides(round: Round) {
  return round.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
  }))
}

export const singlesMatches: GameDefinition = {
  id: 'singles-matches',
  playerCounts: [4],
  usesTeams: () => true,
  pairingKind: 'opponents',
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

    // Extra body stojí mimo zápasy - drží si vlastní tabulku a do peněz
    // vstupují v `settlementParties()`, každý ve svém zápase.
    const sideBets = sideBetSection(round, betSides(round))

    return [
      {
        id: 'matches',
        title: t('singles.title'),
        // Stav obou zápasů pod tabulkou; pořadí v ní je podle vyhraných jamek
        // celého flightu, ale rozhodnutý je každý zápas sám za sebe.
        description: matches.map((match) => match.state.label).join(' · '),
        rows: rankRows(rows, 'highest'),
      },
      ...(sideBets ? [sideBets] : []),
    ]
  },

  settlementParties(round: Round) {
    const won = new Map<PlayerId, number>()
    for (const match of flightMatches(round)) {
      match.sides.forEach((side, index) => {
        won.set(side.id, match.state.won[index === 0 ? 0 : 1])
      })
    }

    return withSideBets(
      round,
      betSides(round).map((side) => ({ ...side, units: won.get(side.id) ?? 0 })),
    )
  },

  /** Každý zápas se vyrovnává zvlášť - soupeř je jen jeden. */
  settlementGroups(round: Round): string[][] {
    return round.teams.map((team) => [...team.playerIds])
  },

  teamLabel(round: Round, team: Team): string {
    return team.playerIds.map((id) => playerName(round, id)).join(t('singles.versusJoin'))
  },

  /**
   * Stav obou zápasů v hlavičce jamky.
   *
   * Každý zápas dostane jeden řádek „kdo vede a jak", ne „kdo s kým hraje" -
   * soupeře je vidět v bloku zápasu pod tím a v hlavičce se dvě dlouhá jména
   * stejně nevešla. Poznámka (dormie, konec) patří ke svému zápasu, protože
   * jedna společná by netvrdila, kterého z nich se týká.
   */
  headerSummary(round: Round, hole: number): HeaderSummary {
    const matches = flightMatches(round)
    // Mimo hru je jamka jen tehdy, když už je rozhodnutý každý zápas -
    // dokud jeden běží, hraje se dál a hlavička to nesmí přebít.
    const outOfPlay =
      matches.length > 0 && matches.every((match) => isOutOfPlay(match.state, hole))
    // Zápas, který se pořád hraje. Nerozhodný zápas po poslední jamce není
    // „rozhodnutý", ale hrát se v něm už taky nedá - jinak by hlavička na
    // osmnáctce hlásila „zbývá 0 jamek".
    const running = matches.find(
      (match) => !match.state.decided && match.state.remaining > 0,
    )?.state

    return {
      entries: matches.map((match) => {
        const { state } = match
        // Bez vedoucího není koho jmenovat, ale zápas musí být poznat -
        // za nerozhodného stavu ho zastoupí první ze soupeřů.
        const side = match.sides[state.leaderIndex ?? 0]
        return {
          label: side ? shortPlayerName(round, side.id) : '?',
          value:
            state.leaderIndex === null
              ? t('match.allSquare')
              : sideValueLabel(state, state.leaderIndex),
          tone: state.leaderIndex === null ? ('neutral' as const) : ('positive' as const),
          note: matchStateNote(state, isOutOfPlay(state, hole)),
        }
      }),
      // Zbývající jamky platí pro celý flight, takže jsou jednou pod stavy.
      note: running
        ? t('match.remainingShort', { count: running.remaining })
        : t('match.finishedShort'),
      tone: headerTone(running ?? matches[0]?.state, outOfPlay),
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

      // Stav zápasu je v hlavičce jamky u každého zápasu zvlášť; druhý zápis
      // by tady jen lámal řádek dlouhými jmény.
      return {
        id: match.team.id,
        entries: [{ label: t('match.takesHole'), value }],
      }
    })
  },
}
