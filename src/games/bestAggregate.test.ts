import { describe, expect, it } from 'vitest'
import type { BonusId } from '../types'
import { DEFAULT_GAME_OPTIONS } from '../types'
import { bestAggregate, holePoints, totalPoints } from './bestAggregate'
import { makeRound } from './fixtures'

/**
 * Kolo pro testy: dvojice A (Adam + Alena) proti dvojici B (Bára + Bořek).
 *
 * jamka 1 (par 4): A 4/5 -> lepší míč 4, součet 9
 *                  B 3/5 -> lepší míč 3, součet 8, Bára má birdie
 * jamka 2 (par 4): A 2/4 -> lepší míč 2, součet 6, Adam má eagle
 *                  B 4/4 -> lepší míč 4, součet 8
 * jamka 3 (par 3): obě dvojice 3/3 -> lepší míč i součet shodné
 */
function sampleRound() {
  return makeRound({
    gameId: 'best-aggregate',
    players: ['Adam', 'Alena', 'Bára', 'Bořek'],
    teams: [
      [0, 1],
      [2, 3],
    ],
    pars: [4, 4, 3],
    scores: [
      [4, 2, 3], // Adam
      [5, 4, 3], // Alena
      [3, 4, 3], // Bára
      [5, 4, 3], // Bořek
    ],
  })
}

describe('Best Aggregate - body za jamku', () => {
  it('dá bod za lepší míč, za nižší součet a bonus za birdie', () => {
    const [teamA, teamB] = holePoints(sampleRound(), 0)

    expect(teamA).toMatchObject({ best: 0, aggregate: 0, bonus: 0, total: 0 })
    // Dvojice B má nižší lepší míč (3 vs 4), nižší součet (8 vs 9)
    // a k tomu birdie Báry.
    expect(teamB).toMatchObject({ best: 1, aggregate: 1, bonus: 1, total: 3 })
  })

  it('boduje eagle třemi body', () => {
    const [teamA, teamB] = holePoints(sampleRound(), 1)

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, bonus: 3, total: 5 })
    expect(teamB).toMatchObject({ best: 0, aggregate: 0, bonus: 0, total: 0 })
  })

  it('při shodě lepšího míče i součtu nedá bod nikomu', () => {
    const [teamA, teamB] = holePoints(sampleRound(), 2)

    expect(teamA?.total).toBe(0)
    expect(teamB?.total).toBe(0)
  })

  it('počítá bonus každému partnerovi zvlášť', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[3], [3], [5], [5]],
    })

    // Dvě birdie v jedné dvojici = 2 bonusové body.
    expect(holePoints(round, 0)[0]).toMatchObject({
      best: 1,
      aggregate: 1,
      bonus: 2,
      total: 4,
    })
  })

  it('na jamce, kam se ještě nedošlo, nezískává nikdo nic', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[null], [null], [null], [null]],
    })

    expect(holePoints(round, 0).map((p) => p.total)).toEqual([0, 0])
  })
})

describe('Best Aggregate - vzdané jamky', () => {
  /** Rozehraná jamka bez zápisu = hráč ji vzdal, ne že se na ni nedošlo. */
  function concessionRound(scores: (number | null)[][]) {
    return makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores,
    })
  }

  it('dvojice s víc dohranými míči bere součet', () => {
    // A: Adam 4, Alena vzdala -> jeden dohraný míč, součet 4
    // B: 5/5 -> dva dohrané míče, součet 10
    const [teamA, teamB] = holePoints(concessionRound([[4], [null], [5], [5]]), 0)

    // Lepší míč bere A (4 vs 5), součet bere B - má víc dohraných míčů.
    expect(teamA).toMatchObject({ best: 1, aggregate: 0, total: 1 })
    expect(teamB).toMatchObject({ best: 0, aggregate: 1, total: 1 })
  })

  it('při stejném počtu dohraných míčů rozhoduje nižší součet', () => {
    // Obě dvojice mají jeden dohraný míč: 3 proti 5.
    const [teamA, teamB] = holePoints(concessionRound([[3], [null], [5], [null]]), 0)

    // Dvojice A bere lepší míč, součet i birdie Adama.
    expect(teamA).toMatchObject({ best: 1, aggregate: 1, bonus: 1, total: 3 })
    expect(teamB).toMatchObject({ best: 0, aggregate: 0, total: 0 })
  })

  it('když jamku vzdala celá dvojice, bere soupeř lepší míč i součet', () => {
    const [teamA, teamB] = holePoints(concessionRound([[3], [4], [null], [null]]), 0)

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, bonus: 1, total: 3 })
    expect(teamB).toMatchObject({ best: 0, aggregate: 0, total: 0 })
  })

  it('jediný zapsaný výsledek ze čtveřice bere lepší míč i součet', () => {
    const [teamA, teamB] = holePoints(concessionRound([[4], [null], [null], [null]]), 0)

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, total: 2 })
    expect(teamB).toMatchObject({ best: 0, aggregate: 0, total: 0 })
  })
})

describe('Best Aggregate - celkové pořadí', () => {
  it('sečte body přes celé kolo', () => {
    const [teamA, teamB] = totalPoints(sampleRound())

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, bonus: 3, total: 5 })
    expect(teamB).toMatchObject({ best: 1, aggregate: 1, bonus: 1, total: 3 })
  })

  it('řadí dvojici s vyšším počtem bodů první', () => {
    const rows = bestAggregate.computeStandings(sampleRound())[0]?.rows ?? []

    expect(rows.map((r) => [r.name, r.valueLabel, r.position])).toEqual([
      ['Adam + Alena', '5 b.', 1],
      ['Bára + Bořek', '3 b.', 2],
    ])
  })

  it('rozepíše, odkud body přišly', () => {
    const rows = bestAggregate.computeStandings(sampleRound())[0]?.rows ?? []

    expect(rows[0]?.detail).toBe('BEST 1 · Součet 1 · Bonus 3')
  })

  it('hraje se vždy ve čtyřech', () => {
    expect(bestAggregate.playerCounts).toEqual([4])
    expect(bestAggregate.usesTeams(4)).toBe(true)
  })
})

describe('Best Aggregate - dvojnásobná devátá a osmnáctá', () => {
  /** Devítijamkové kolo, kde se hraje jen poslední jamka: A 3/4, B 5/5. */
  function closingHoleRound(doubleClosingHoles: boolean) {
    const empty = [null, null, null, null, null, null, null, null]
    return makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: Array<number>(9).fill(4),
      scores: [
        [...empty, 3],
        [...empty, 4],
        [...empty, 5],
        [...empty, 5],
      ],
      settings: { currency: 'CZK', pointValue: 10, doubleClosingHoles },
    })
  }

  it('bez volby počítá poslední jamku normálně', () => {
    // lepší míč 1 + součet 1 + birdie 1
    expect(holePoints(closingHoleRound(false), 8)[0]?.total).toBe(3)
  })

  it('se zapnutou volbou zdvojnásobí celý zisk z jamky včetně bonusu', () => {
    const [teamA] = holePoints(closingHoleRound(true), 8)

    expect(teamA).toMatchObject({ best: 2, aggregate: 2, bonus: 2, total: 6 })
  })

  it('ostatní jamky volba neovlivní', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4, 4],
      scores: [
        [3, 3],
        [4, 4],
        [5, 5],
        [5, 5],
      ],
      settings: { currency: 'CZK', pointValue: 10, doubleClosingHoles: true },
    })

    expect(holePoints(round, 0)[0]?.total).toBe(3)
  })
})

describe('Best Aggregate - sloupce ve scorekartě', () => {
  it('přidá sloupec bodů za každou dvojici, hned za jejího druhého hráče', () => {
    const round = sampleRound()
    const columns = bestAggregate.scorecardColumns?.(round) ?? []

    expect(columns).toHaveLength(2)
    expect(columns.map((c) => c.afterPlayerId)).toEqual(['p2', 'p4'])
    expect(columns.every((c) => c.label === 'Body')).toBe(true)
  })

  it('ukazuje body získané na konkrétní jamce', () => {
    const round = sampleRound()
    const [teamA, teamB] = bestAggregate.scorecardColumns?.(round) ?? []

    expect(teamA?.cell(round, 0)).toBe('0')
    expect(teamB?.cell(round, 0)).toBe('3')
    expect(teamA?.cell(round, 1)).toBe('5')
  })

  it('v součtovém řádku má celkové body dvojice', () => {
    const round = sampleRound()
    const [teamA, teamB] = bestAggregate.scorecardColumns?.(round) ?? []

    expect(teamA?.total(round)).toBe('5')
    expect(teamB?.total(round)).toBe('3')
  })

  it('nechá buňku prázdnou jen u jamky, kam se nedošlo', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4, 4],
      // jamka 1 rozehraná (A ji vzdala), jamka 2 nehraná
      scores: [
        [null, null],
        [null, null],
        [4, null],
        [4, null],
      ],
    })
    const [teamA] = bestAggregate.scorecardColumns?.(round) ?? []

    expect(teamA?.cell(round, 0)).toBe('0')
    expect(teamA?.cell(round, 1)).toBe('')
  })
})

describe('Best Aggregate - Double Best', () => {
  /** A zahrála 3/4, B 5/6 - oba míče A jsou lepší než oba míče B. */
  function round(doubleBest: number) {
    return makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[3], [4], [5], [6]],
      settings: { options: { ...DEFAULT_GAME_OPTIONS, doubleBest } },
    })
  }

  it('vypnutý (0) bod nepřidá', () => {
    expect(holePoints(round(0), 0)[0]?.doubleBest).toBe(0)
  })

  it('dá bod, když jsou oba míče dvojice lepší než oba soupeřovy', () => {
    const [teamA, teamB] = holePoints(round(1), 0)

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, doubleBest: 1, bonus: 1 })
    expect(teamB?.doubleBest).toBe(0)
  })

  it('respektuje nastavenou hodnotu', () => {
    expect(holePoints(round(2), 0)[0]?.doubleBest).toBe(2)
  })

  it('nedá bod, když se výsledky prolínají', () => {
    const mixed = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      // Alena (5) je horší než Bára (4), takže Double Best nevzniká.
      scores: [[3], [5], [4], [6]],
      settings: { options: { ...DEFAULT_GAME_OPTIONS, doubleBest: 1 } },
    })

    expect(holePoints(mixed, 0).every((p) => p.doubleBest === 0)).toBe(true)
  })

  it('dvojice s nedohraným míčem Double Best nezíská', () => {
    const conceded = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[3], [null], [5], [6]],
      settings: { options: { ...DEFAULT_GAME_OPTIONS, doubleBest: 1 } },
    })

    expect(holePoints(conceded, 0)[0]?.doubleBest).toBe(0)
  })
})

describe('Best Aggregate - extra body', () => {
  /** Kolo, kde si Adam na jamce zapíše zadané extra body. */
  function withBonuses(
    adamBonuses: BonusId[],
    adamScore: number,
    options = DEFAULT_GAME_OPTIONS,
    doubleClosingHoles = false,
  ) {
    const holes = doubleClosingHoles ? 9 : 1
    const pad = Array<number | null>(holes - 1).fill(null)
    const at = (score: number | null) => [...pad, score]

    const base = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: Array<number>(holes).fill(4),
      scores: [at(adamScore), at(5), at(5), at(5)],
      settings: { doubleClosingHoles, options },
    })
    base.bonuses.p1 = Array.from({ length: holes }, (_, i) =>
      i === holes - 1 ? adamBonuses : [],
    )
    return { round: base, hole: holes - 1 }
  }

  it('za par se počítá základní hodnota', () => {
    const { round, hole } = withBonuses(['bunker'], 4)

    expect(holePoints(round, hole)[0]?.extra).toBe(1)
  })

  it('za birdie dvojnásobek a za eagle trojnásobek', () => {
    expect(holePoints(withBonuses(['bunker'], 3).round, 0)[0]?.extra).toBe(2)
    expect(holePoints(withBonuses(['bunker'], 2).round, 0)[0]?.extra).toBe(3)
  })

  it('při bogey a horším se extra bod nepočítá', () => {
    expect(holePoints(withBonuses(['bunker'], 5).round, 0)[0]?.extra).toBe(0)
  })

  it('sečte víc extra bodů na jedné jamce', () => {
    const { round } = withBonuses(['bunker', 'water', 'longest'], 4)

    expect(holePoints(round, 0)[0]?.extra).toBe(3)
  })

  it('respektuje hodnotu nastavenou pro daný bonus', () => {
    const options = {
      ...DEFAULT_GAME_OPTIONS,
      bonusValues: { ...DEFAULT_GAME_OPTIONS.bonusValues, water: 3 },
    }
    const { round } = withBonuses(['water'], 4, options)

    expect(holePoints(round, 0)[0]?.extra).toBe(3)
  })

  it('vypnutý bonus (0) body nepřidá', () => {
    const options = {
      ...DEFAULT_GAME_OPTIONS,
      bonusValues: { ...DEFAULT_GAME_OPTIONS.bonusValues, arnie: 0 },
    }
    const { round } = withBonuses(['arnie'], 4, options)

    expect(holePoints(round, 0)[0]?.extra).toBe(0)
  })

  it('extra bod jednoho hráče se počítá celé dvojici', () => {
    const { round } = withBonuses(['bunker'], 4)
    const [teamA, teamB] = holePoints(round, 0)

    expect(teamA?.extra).toBe(1)
    expect(teamB?.extra).toBe(0)
  })
})

describe('Best Aggregate - double a násobiče', () => {
  function withDouble(options = DEFAULT_GAME_OPTIONS, doubleClosingHoles = false) {
    const holes = doubleClosingHoles ? 9 : 1
    const pad = Array<number | null>(holes - 1).fill(null)
    const at = (score: number) => [...pad, score]

    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: Array<number>(holes).fill(4),
      // Adam 4 (par, s bunkerem), ostatní 5 -> A bere best i součet.
      scores: [at(4), at(5), at(5), at(5)],
      settings: { doubleClosingHoles, options },
    })
    round.bonuses.p1 = Array.from({ length: holes }, (_, i) =>
      i === holes - 1 ? (['double', 'bunker'] as BonusId[]) : [],
    )
    return { round, hole: holes - 1 }
  }

  it('zvolený double zdvojnásobí body za BEST, součet i extra body', () => {
    const { round, hole } = withDouble()
    const [teamA] = holePoints(round, hole)

    // best 1 + součet 1 + extra 1, vše krát dva
    expect(teamA).toMatchObject({ best: 2, aggregate: 2, extra: 2, total: 6 })
  })

  it('s volbou "nedoublovat extra body" zůstanou extra body v základu', () => {
    const { round, hole } = withDouble({
      ...DEFAULT_GAME_OPTIONS,
      noDoubleBonuses: true,
    })
    const [teamA] = holePoints(round, hole)

    expect(teamA).toMatchObject({ best: 2, aggregate: 2, extra: 1, total: 5 })
  })

  it('double na dvojnásobné jamce dá čtyřnásobek', () => {
    const { round, hole } = withDouble(DEFAULT_GAME_OPTIONS, true)
    const [teamA] = holePoints(round, hole)

    expect(teamA).toMatchObject({ best: 4, aggregate: 4, extra: 4, total: 12 })
  })

  it('vypnutý double nic nenásobí', () => {
    const options = {
      ...DEFAULT_GAME_OPTIONS,
      bonusValues: { ...DEFAULT_GAME_OPTIONS.bonusValues, double: 0 },
    }
    const { round, hole } = withDouble(options)
    const [teamA] = holePoints(round, hole)

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, extra: 1, total: 3 })
  })
})
