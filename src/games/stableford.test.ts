import { beforeAll, describe, expect, it } from 'vitest'
import type { Round } from '../types'
import { makeRound } from './fixtures'
import { holePoints, stableford, totalPoints } from './stableford'
import { setActiveLocale } from '../i18n'
import { strokesReceived, strokesRelativeToBest } from '../handicap'

/**
 * Stableford: body za jamku podle výsledku vůči paru.
 *
 * Modelové kolo je na třech jamkách s pary 4, 3, 5 a stroke indexem 1, 3, 2,
 * takže jde ověřit i rozdělení ran u netto hry.
 */

beforeAll(() => setActiveLocale('cs'))

function makeStableford(scores: (number | null)[][]): Round {
  return makeRound({
    gameId: 'stableford',
    players: ['Anna', 'Bob'],
    pars: [4, 3, 5],
    scores,
    // Dvojnásobná závěrečná jamka by u třijamkového kola násobila třetí jamku
    // a zamlžila kontrolu bodů; hry se testují v základním nastavení.
    settings: { options: { ...makeBaseOptions() } },
  })
}

function makeBaseOptions() {
  return {
    bonusValues: {
      double: 0,
      longest: 0,
      nearest: 0,
      bunker: 0,
      doubleBunker: 0,
      water: 0,
      barkie: 0,
      arnie: 0,
    },
    doubleBest: 0,
    noDoubleBonuses: false,
    confirmLongest: false,
    confirmNearest: false,
    multipliersWithHandicap: false,
    confirmByPersonalPar: true,
    confirmSkinsByPar: false,
    dotVariant: 'nine' as const,
    sweepOnTwoStrokes: false,
    doubleSweepOnBirdie: false,
    resultMultipliers: { birdie: 2, eagle: 3, albatross: 10, condor: 1000 },
    doubleClosingHoles: false,
  }
}

/** Zapne netto a nastaví hřiště se stroke indexem. */
function withNet(round: Round, handicaps: Record<string, number>): Round {
  round.netScoring = true
  round.course = { name: 'Testovací hřiště', strokeIndex: [1, 3, 2] }
  for (const player of round.players) {
    const handicap = handicaps[player.name]
    if (handicap !== undefined) player.playingHandicap = handicap
  }
  return round
}

describe('body za jamku', () => {
  it('par dva body, birdie tři, eagle čtyři, bogey jeden', () => {
    // Anna: par, birdie, eagle. Bob: bogey, par, dvojbogey.
    const round = makeStableford([
      [4, 2, 3],
      [5, 3, 7],
    ])

    expect(holePoints(round, 'p1', 0)).toBe(2)
    expect(holePoints(round, 'p1', 1)).toBe(3)
    expect(holePoints(round, 'p1', 2)).toBe(4)

    expect(holePoints(round, 'p2', 0)).toBe(1)
    expect(holePoints(round, 'p2', 1)).toBe(2)
    expect(holePoints(round, 'p2', 2)).toBe(0)
  })

  it('dvojbogey a horší nedá nic, body nejdou pod nulu', () => {
    const round = makeStableford([
      [6, 9, 12],
      [4, 3, 5],
    ])
    expect(totalPoints(round, 'p1')).toBe(0)
  })

  it('vzdaná jamka je nula bodů', () => {
    // Na první jamce zapsal jen Bob, takže Anna ji vzdala.
    const round = makeStableford([
      [null, 3, 5],
      [4, 3, 5],
    ])
    expect(holePoints(round, 'p1', 0)).toBe(0)
    expect(totalPoints(round, 'p1')).toBe(4)
  })

  it('jamka, na kterou se nedošlo, se nepočítá nikomu', () => {
    const round = makeStableford([
      [4, null, null],
      [4, null, null],
    ])
    expect(holePoints(round, 'p1', 1)).toBe(0)
    expect(holePoints(round, 'p2', 1)).toBe(0)
  })

  it('dvojnásobná jamka násobí body, které na ní padly', () => {
    const round = makeStableford([
      [4, 3, 4],
      [4, 3, 5],
    ])
    round.settings.options.doubleClosingHoles = true
    // Třetí jamka je u tříjamkového kola poslední, ale dvojnásobek se týká
    // jen deváté a osmnácté - tady tedy nenásobí nic.
    expect(holePoints(round, 'p1', 2)).toBe(3)
  })
})

describe('hra jednoho hráče', () => {
  it('povolí a vyhodnotí Stableford pro jednoho hráče', () => {
    const round = makeRound({
      gameId: 'stableford',
      players: ['Anna'],
      pars: [4],
      scores: [[4]],
      settings: { options: { ...makeBaseOptions() } },
    })

    expect(stableford.playerCounts).toContain(1)
    expect(totalPoints(round, 'p1')).toBe(2)
    expect(stableford.computeStandings(round)[0]?.rows).toHaveLength(1)
  })
})

describe('netto', () => {
  it('rána na jamce zvedne body podle stroke indexu', () => {
    // Anna hraje s handicapem 2: rány dostává na SI 1 (jamka 1) a SI 2 (jamka 3).
    const round = withNet(
      makeStableford([
        [5, 4, 6],
        [5, 4, 6],
      ]),
      { Anna: 2 },
    )

    // Anna: 5-1=4 par (2 b.), 4 bez rány bogey (1 b.), 6-1=5 par (2 b.)
    expect(totalPoints(round, 'p1')).toBe(5)
    // Bob hraje brutto: bogey, bogey, bogey.
    expect(totalPoints(round, 'p2')).toBe(3)
  })

  it('bez zapnutého netto se handicap ignoruje', () => {
    const round = withNet(
      makeStableford([
        [5, 4, 6],
        [5, 4, 6],
      ]),
      { Anna: 2 },
    )
    round.netScoring = false
    expect(totalPoints(round, 'p1')).toBe(totalPoints(round, 'p2'))
  })

  it('spočítá rány k dobru proti nejlepšímu HCP', () => {
    const round = withNet(
      makeStableford([
        [5, 4, 6],
        [5, 4, 6],
      ]),
      { Anna: 2, Bob: 0 },
    )

    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(1)
    expect(strokesRelativeToBest(round, 'p1', 1)).toBe(0)
    expect(strokesRelativeToBest(round, 'p1', 2)).toBe(1)
    expect(strokesRelativeToBest(round, 'p2', 0)).toBe(0)
  })

  it('zobrazí více teček, když rozdíl HCP přesáhne počet jamek', () => {
    const round = withNet(
      makeStableford([
        [5, 4, 6],
        [5, 4, 6],
      ]),
      { Anna: 6, Bob: 0 },
    )

    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(2)
  })

  it('přepne tečky z rozdílu hráčů na plný HCP hřiště', () => {
    const round = withNet(
      makeStableford([
        [4, 4, 4],
        [4, 4, 4],
      ]),
      { Anna: 6, Bob: 6 },
    )

    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(0)
    expect(strokesReceived(round, 'p1', 0)).toBe(2)
  })
})

describe('výsledková tabulka', () => {
  it('řadí od nejvyššího počtu bodů a doplní pozice', () => {
    const round = makeStableford([
      [4, 2, 3], // 2 + 3 + 4 = 9
      [5, 3, 7], // 1 + 2 + 0 = 3
    ])

    const section = stableford.computeStandings(round)[0]
    expect(section?.rows[0]?.name).toBe('Anna')
    expect(section?.rows[0]?.value).toBe(9)
    expect(section?.rows[0]?.position).toBe(1)
    expect(section?.rows[1]?.value).toBe(3)
    expect(section?.rows[1]?.position).toBe(2)
  })

  it('shodný počet bodů sdílí pozici', () => {
    const round = makeStableford([
      [4, 3, 5],
      [4, 3, 5],
    ])
    const rows = stableford.computeStandings(round)[0]?.rows ?? []
    expect(rows[0]?.position).toBe(1)
    expect(rows[1]?.position).toBe(1)
  })

  it('hráč bez zápisu jde na konec, i když má stejně bodů', () => {
    const round = makeStableford([
      [4, 3, 5],
      [null, null, null],
    ])
    const rows = stableford.computeStandings(round)[0]?.rows ?? []
    expect(rows[0]?.name).toBe('Anna')
    expect(rows[1]?.holesPlayed).toBe(0)
  })
})

describe('shrnutí jamky', () => {
  /**
   * Body se ukazují u jména hráče při zápisu. Rány, které tam hráč dostává,
   * jsou vedle jména jako tečky, takže druhý štítek s toutéž informací by byl
   * jen zmatek navíc.
   */
  it('nese body za jamku a neopakuje rozdané rány', () => {
    const round = withNet(
      makeStableford([
        [4, 3, 5],
        [4, 3, 5],
      ]),
      { Anna: 2 },
    )
    const summaries = stableford.holeSummary?.(round, 0) ?? []

    expect(summaries[0]?.entries).toEqual([
      { label: 'Body za jamku', value: '3', highlight: true },
    ])
  })
})
