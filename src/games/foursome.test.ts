import { beforeAll, describe, expect, it } from 'vitest'
import { SIDE_BET_BONUSES } from './sideBets'
import { foursome, foursomeState } from './foursome'
import { makeRound } from './fixtures'
import { setActiveLocale } from '../i18n'
import { pairPlayingHandicap, pairStrokesReceived } from '../handicap'
import type { Round } from '../types'

// Test ověřuje konkrétní česká znění, takže si jazyk určuje sám.
beforeAll(() => setActiveLocale('cs'))

/**
 * Kolo Foursome tak, jak ho appka ukládá: dvojice má na jamku jedno skóre
 * a nese ho **každý** partner (rozhodnutí #33).
 */
function pairRound(options: {
  pars: number[]
  /** Skóre dvojic po jamkách: [dvojiceA, dvojiceB]. */
  scores: (number | null)[][]
}): Round {
  const [teamA = [], teamB = []] = options.scores
  return makeRound({
    gameId: 'foursome',
    players: ['Adam', 'Alena', 'Bára', 'Bořek'],
    teams: [
      [0, 1],
      [2, 3],
    ],
    pars: options.pars,
    scores: [teamA, teamA, teamB, teamB],
  })
}

describe('Foursome - jeden míč na dvojici', () => {
  /**
   * jamka 1: A 4, B 5 -> A jednu nahoru
   * jamka 2: A 5, B 5 -> dělená
   * jamka 3: A 4, B 3 -> srovnáno
   */
  const round = pairRound({
    pars: [4, 4, 4],
    scores: [
      [4, 5, 4],
      [5, 5, 3],
    ],
  })

  it('počítá jamky z jediného skóre dvojice', () => {
    const state = foursomeState(round)

    expect(state.won).toEqual([1, 1])
    expect(state.halved).toBe(1)
    expect(state.leaderIndex).toBe(null)
  })

  it('nevybírá lepší míč - obě zapsané hodnoty jsou tentýž míč', () => {
    // Kdyby se bralo lepší z obou zápisů, výsledek by byl stejný; test proto
    // rozpojí zápis partnerů a ověří, že se počítá první zapsaná hodnota.
    const split = pairRound({
      pars: [4],
      scores: [[6], [5]],
    })
    // Alena má omylem lepší zápis než Adam; míč je ale jeden a platí ten jeho.
    split.scores['p2'] = [3]

    expect(foursomeState(split).won).toEqual([0, 1])
  })

  it('pojmenuje strany podle dvojic', () => {
    const rows = foursome.computeStandings(round)[0]?.rows ?? []

    expect(rows.map((r) => r.name).sort()).toEqual(['Adam + Alena', 'Bára + Bořek'])
  })

  it('hraje se jen ve čtyřech a vždy ve dvojicích', () => {
    expect(foursome.playerCounts).toEqual([4])
    expect(foursome.usesTeams(4)).toBe(true)
    expect(foursome.sharedBall).toBe(true)
  })

  it('nenabízí dvojnásobné jamky, extra body ano jako vedlejší sázku', () => {
    expect(foursome.supportsDoubleHoles).toBe(false)
    expect(foursome.scoringOptions.bonusIds).toEqual(SIDE_BET_BONUSES)
    expect(foursome.scoringOptions.bonusesAsSideBet).toBe(true)
    // Jeden míč na dvojici znamená i jeden extra bod pro dvojici.
    expect(foursome.scoringOptions.bonusScope).toBe('team')
  })
})

describe('Foursome - vzdaná a nehraná jamka', () => {
  it('dvojice bez zápisu na rozehrané jamce ji prohrává', () => {
    const round = pairRound({
      pars: [4, 4],
      scores: [
        [4, 5],
        [5, null],
      ],
    })

    expect(foursomeState(round).won).toEqual([2, 0])
  })

  it('jamka, kam se nedošlo, stav nemění', () => {
    const round = pairRound({
      pars: [4, 4],
      scores: [
        [4, null],
        [5, null],
      ],
    })
    const state = foursomeState(round)

    expect(state.won).toEqual([1, 0])
    expect(state.remaining).toBe(1)
  })
})

describe('Foursome - rozhodnutý zápas', () => {
  const round = pairRound({
    pars: [4, 4, 4],
    scores: [
      [4, 4, null],
      [5, 5, null],
    ],
  })

  it('zapíše výsledek golfovou notací', () => {
    const state = foursomeState(round)

    expect(state.decided).toBe(true)
    expect(state.label).toBe('Adam + Alena vyhrává 2&1')
  })

  it('jamky po rozhodnutí jsou mimo hru', () => {
    const summary = foursome.holeSummary?.(round, 2) ?? []

    expect(summary[0]?.entries[0]?.value).toBe('Mimo hru – zápas už je rozhodnutý')
  })

  it('vyhranou jamku označí u obou partnerů vítězné dvojice', () => {
    expect(foursome.scorecardPlayerCell?.(round, 'p1', 0)?.skin).toBeDefined()
    expect(foursome.scorecardPlayerCell?.(round, 'p2', 0)?.skin).toBeDefined()
    expect(foursome.scorecardPlayerCell?.(round, 'p3', 0)?.skin).toBeUndefined()
  })
})

describe('Foursome - netto z poloviny součtu HCP', () => {
  /** Dvojice A má hrací handicapy 8 a 12, dvojice B 4 a 6. */
  function netRound(scores: (number | null)[][]): Round {
    const round = pairRound({ pars: [4, 4], scores })
    round.netScoring = true
    round.course = { name: 'Testovací hřiště', strokeIndex: [1, 2] }
    round.players[0]!.playingHandicap = 8
    round.players[1]!.playingHandicap = 12
    round.players[2]!.playingHandicap = 4
    round.players[3]!.playingHandicap = 6
    return round
  }

  it('hrací handicap dvojice je polovina součtu', () => {
    const round = netRound([
      [4, 4],
      [4, 4],
    ])

    expect(pairPlayingHandicap(round, ['p1', 'p2'])).toBe(10)
    expect(pairPlayingHandicap(round, ['p3', 'p4'])).toBe(5)
  })

  it('rány dvojice se rozdají po jamkách podle stroke indexu', () => {
    const round = netRound([
      [4, 4],
      [4, 4],
    ])

    // Deset ran na dvě jamky: pět na každou.
    expect(pairStrokesReceived(round, ['p1', 'p2'], 0)).toBe(5)
    expect(pairStrokesReceived(round, ['p3', 'p4'], 1)).toBe(2)
    // Zbytek po dělení jde na těžší jamku (SI 1).
    expect(pairStrokesReceived(round, ['p3', 'p4'], 0)).toBe(3)
  })

  it('jamku bere dvojice, která má po odečtu ran nižší skóre', () => {
    // Brutto shoda 4:4, netto A 4-5 = -1, B 4-3 = 1 -> jamku bere A.
    const round = netRound([
      [4, null],
      [4, null],
    ])

    expect(foursomeState(round).won).toEqual([1, 0])
  })

  it('v brutto kole je stejná jamka dělená', () => {
    const round = netRound([
      [4, null],
      [4, null],
    ])
    round.netScoring = false

    expect(foursomeState(round).halved).toBe(1)
  })

  it('HCP dvojice ukáže i ve výsledkové tabulce', () => {
    const round = netRound([
      [4, 4],
      [5, 5],
    ])
    const rows = foursome.computeStandings(round)[0]?.rows ?? []

    expect(rows.find((r) => r.name === 'Adam + Alena')?.secondary).toBe('HCP dvojice 10')
  })
})
