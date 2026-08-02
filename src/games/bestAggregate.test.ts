import { describe, expect, it } from 'vitest'
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

    expect(teamA).toEqual({ best: 0, aggregate: 0, bonus: 0, total: 0 })
    // Dvojice B má nižší lepší míč (3 vs 4), nižší součet (8 vs 9)
    // a k tomu birdie Báry.
    expect(teamB).toEqual({ best: 1, aggregate: 1, bonus: 1, total: 3 })
  })

  it('boduje eagle třemi body', () => {
    const [teamA, teamB] = holePoints(sampleRound(), 1)

    expect(teamA).toEqual({ best: 1, aggregate: 1, bonus: 3, total: 5 })
    expect(teamB).toEqual({ best: 0, aggregate: 0, bonus: 0, total: 0 })
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
    expect(holePoints(round, 0)[0]).toEqual({
      best: 1,
      aggregate: 1,
      bonus: 2,
      total: 4,
    })
  })

  it('nedá bod, dokud jedna z dvojic jamku nezapsala', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[3], [4], [null], [null]],
    })

    const [teamA] = holePoints(round, 0)
    // Birdie se započítá hned, souboj o jamku až s druhou dvojicí.
    expect(teamA).toEqual({ best: 0, aggregate: 0, bonus: 1, total: 1 })
  })
})

describe('Best Aggregate - celkové pořadí', () => {
  it('sečte body přes celé kolo', () => {
    const [teamA, teamB] = totalPoints(sampleRound())

    expect(teamA).toEqual({ best: 1, aggregate: 1, bonus: 3, total: 5 })
    expect(teamB).toEqual({ best: 1, aggregate: 1, bonus: 1, total: 3 })
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

    expect(teamA).toEqual({ best: 2, aggregate: 2, bonus: 2, total: 6 })
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

  it('nechá buňku prázdnou, dokud dvojice jamku nezapsala', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[null], [null], [4], [4]],
    })
    const [teamA, teamB] = bestAggregate.scorecardColumns?.(round) ?? []

    expect(teamA?.cell(round, 0)).toBe('')
    expect(teamB?.cell(round, 0)).toBe('0')
  })
})
