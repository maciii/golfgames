import type { Round, Team } from '../types'
import { parAt, scoreAt, teamName } from '../types'
import type { GameDefinition, HoleSummary, StandingRow, StandingsSection } from './types'
import { assignPositions } from './types'

/**
 * Best Aggregate - hraje se ve dvojicích a každá jamka dává dva výsledky:
 *
 *  - lepší míč: nižší z ran obou partnerů
 *  - součet: rány obou partnerů dohromady
 *
 * Obě se sčítají přes celé kolo a vedou se jako dvě samostatné tabulky.
 * Počítá se hrubé skóre, handicap se zatím neuplatňuje.
 */

interface HoleResult {
  best: number | null
  aggregate: number | null
}

/**
 * Lepší míč stačí zapsat jednomu z dvojice - kdo jamku vzdal, tým nebrzdí.
 * Součet naopak dává smysl až s oběma zápisy.
 */
function holeResult(round: Round, team: Team, hole: number): HoleResult {
  const scores = team.playerIds.map((id) => scoreAt(round, id, hole))
  const entered = scores.filter((s): s is number => s !== null)

  return {
    best: entered.length > 0 ? Math.min(...entered) : null,
    aggregate:
      entered.length === team.playerIds.length
        ? entered.reduce((sum, s) => sum + s, 0)
        : null,
  }
}

type Metric = 'best' | 'aggregate'

function buildRows(round: Round, metric: Metric): Omit<StandingRow, 'position'>[] {
  return round.teams.map((team) => {
    let strokes = 0
    let holesPlayed = 0
    let par = 0

    for (let hole = 0; hole < round.holeCount; hole++) {
      const value = holeResult(round, team, hole)[metric]
      if (value === null) continue
      strokes += value
      holesPlayed += 1
      // U součtu je referencí par za oba hráče.
      par += metric === 'aggregate' ? parAt(round, hole) * team.playerIds.length : parAt(round, hole)
    }

    return {
      id: team.id,
      name: teamName(round, team),
      strokes,
      holesPlayed,
      toPar: strokes - par,
    }
  })
}

export const bestAggregate: GameDefinition = {
  id: 'best-aggregate',
  name: 'Best Aggregate',
  tagline: 'Ve dvojicích: lepší míč i součet obou',
  rules:
    'Hraje se ve dvojicích. Na každé jamce se zapisují rány obou partnerů a ' +
    'počítají se dva výsledky - lepší míč (nižší z obou ran) a součet obou. ' +
    'Obojí se sčítá přes celé kolo a vede se jako dvě tabulky.',
  playerCounts: [2, 4],
  teamBased: true,

  computeStandings(round: Round): StandingsSection[] {
    return [
      {
        id: 'best',
        title: 'Lepší míč',
        description: 'Na každé jamce se počítá nižší z ran obou partnerů.',
        rows: assignPositions(buildRows(round, 'best')),
      },
      {
        id: 'aggregate',
        title: 'Součet obou',
        description: 'Na každé jamce se sčítají rány obou partnerů.',
        rows: assignPositions(buildRows(round, 'aggregate')),
      },
    ]
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    return round.teams.map((team) => {
      const { best, aggregate } = holeResult(round, team, hole)
      return {
        id: team.id,
        entries: [
          { label: 'Lepší míč', value: best === null ? '–' : `${best}` },
          { label: 'Součet', value: aggregate === null ? '–' : `${aggregate}` },
        ],
      }
    })
  },
}
