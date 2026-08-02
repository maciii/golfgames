import { describe, expect, it } from 'vitest'
import type { BonusId } from '../types'
import { DEFAULT_GAME_OPTIONS, availableBonuses, toggleBonus } from '../types'
import { bestAggregate, holePoints, totalPoints } from './bestAggregate'
import { makeRound } from './fixtures'

/** Základní pravidla se testují bez Double Bestu, který je nově zapnutý. */
const BASE_OPTIONS = { ...DEFAULT_GAME_OPTIONS, doubleBest: 0 }

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
    settings: { options: BASE_OPTIONS },
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
      settings: { options: BASE_OPTIONS },
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
      settings: { options: BASE_OPTIONS },
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
      settings: { pointValue: 10, doubleClosingHoles, options: BASE_OPTIONS },
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
      settings: { pointValue: 10, doubleClosingHoles: true, options: BASE_OPTIONS },
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
    options = BASE_OPTIONS,
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
      ...BASE_OPTIONS,
      bonusValues: { ...BASE_OPTIONS.bonusValues, water: 3 },
    }
    const { round } = withBonuses(['water'], 4, options)

    expect(holePoints(round, 0)[0]?.extra).toBe(3)
  })

  it('vypnutý bonus (0) body nepřidá', () => {
    const options = {
      ...BASE_OPTIONS,
      bonusValues: { ...BASE_OPTIONS.bonusValues, arnie: 0 },
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
  function withDouble(options = BASE_OPTIONS, doubleClosingHoles = false) {
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
    const { round, hole } = withDouble({ ...BASE_OPTIONS, noDoubleBonuses: true })
    const [teamA] = holePoints(round, hole)

    expect(teamA).toMatchObject({ best: 2, aggregate: 2, extra: 1, total: 5 })
  })

  it('double na dvojnásobné jamce dá čtyřnásobek', () => {
    const { round, hole } = withDouble(BASE_OPTIONS, true)
    const [teamA] = holePoints(round, hole)

    expect(teamA).toMatchObject({ best: 4, aggregate: 4, extra: 4, total: 12 })
  })

  it('vypnutý double nic nenásobí', () => {
    const options = {
      ...BASE_OPTIONS,
      bonusValues: { ...BASE_OPTIONS.bonusValues, double: 0 },
    }
    const { round, hole } = withDouble(options)
    const [teamA] = holePoints(round, hole)

    expect(teamA).toMatchObject({ best: 1, aggregate: 1, extra: 1, total: 3 })
  })
})

describe('Best Aggregate - nastavení se drží u kola', () => {
  /** Kolo s vlastní konfigurací a zapsaným extra bodem. */
  function configuredRound() {
    const options = {
      ...DEFAULT_GAME_OPTIONS,
      bonusValues: { ...DEFAULT_GAME_OPTIONS.bonusValues, water: 5 },
      doubleBest: 2,
    }
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[3], [4], [5], [6]],
      settings: { options },
    })
    round.bonuses.p1 = [['water']]
    return { round, options }
  }

  it('pozdější změna předvoleb hry kolo nepřepíše', () => {
    const { round, options } = configuredRound()
    const before = holePoints(round, 0)[0]?.total

    // Simuluje úpravu nastavení hry po startu kola.
    options.bonusValues.water = 99
    options.doubleBest = 0

    expect(holePoints(round, 0)[0]?.total).toBe(before)
  })

  it('kolo obnovené z archivu se počítá stejně', () => {
    const { round } = configuredRound()
    // Archiv ukládá kolo jako JSON, takže tudy musí projít beze změny.
    const restored = JSON.parse(JSON.stringify(round)) as typeof round

    expect(holePoints(restored, 0)).toEqual(holePoints(round, 0))
    expect(totalPoints(restored)).toEqual(totalPoints(round))
  })

  it('archivované kolo si nese hodnoty bonusů i zapsané extra body', () => {
    const { round } = configuredRound()
    const restored = JSON.parse(JSON.stringify(round)) as typeof round

    expect(restored.settings.options.bonusValues.water).toBe(5)
    expect(restored.settings.options.doubleBest).toBe(2)
    expect(restored.bonuses.p1?.[0]).toEqual(['water'])
    // water 5 × 2 (birdie) + best 1 + součet 1 + birdie 1 + Double Best 2
    expect(holePoints(restored, 0)[0]?.total).toBe(15)
  })
})

describe('Best Aggregate - Longest a Nearest', () => {
  /**
   * Pětiparová jamka: Longest má Adam (dvojice A). Soupeři hrají 6,
   * takže o bod za Best a součet nejde.
   */
  function longestRound(adamScore: number, confirmLongest: boolean) {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [5],
      scores: [[adamScore], [6], [6], [6]],
      settings: { options: { ...BASE_OPTIONS, confirmLongest } },
    })
    round.bonuses.p1 = [['longest']]
    return round
  }

  it('bez potvrzování dostane bod dvojice, která ho zapsala', () => {
    const [teamA, teamB] = holePoints(longestRound(7, false), 0)

    expect(teamA?.extra).toBe(1)
    expect(teamB?.extra).toBe(0)
  })

  it('s potvrzováním platí při paru a lepším', () => {
    const [teamA, teamB] = holePoints(longestRound(5, true), 0)

    expect(teamA?.extra).toBe(1)
    expect(teamB?.extra).toBe(0)
  })

  it('s potvrzováním propadá soupeřům při horším než par', () => {
    const [teamA, teamB] = holePoints(longestRound(6, true), 0)

    expect(teamA?.extra).toBe(0)
    expect(teamB?.extra).toBe(1)
  })

  it('nezapsaná jamka se nepotvrzuje ani nepropadá', () => {
    const round = longestRound(5, true)
    round.scores.p1 = [null]
    const [teamA, teamB] = holePoints(round, 0)

    expect(teamA?.extra).toBe(0)
    expect(teamB?.extra).toBe(0)
  })

  it('hodnota se nenásobí podle výsledku - birdie nedá dvojnásobek', () => {
    // Adam zahraje 4 na par 5, tedy birdie.
    expect(holePoints(longestRound(4, true), 0)[0]?.extra).toBe(1)
  })

  it('Longest se nabízí jen na pětiparové jamce', () => {
    const round = longestRound(5, false)
    expect(availableBonuses(round, 0).map((b) => b.id)).toContain('longest')

    round.pars = [4]
    expect(availableBonuses(round, 0).map((b) => b.id)).not.toContain('longest')
  })

  it('Nearest se nabízí jen na tříparové jamce', () => {
    const round = longestRound(5, false)
    expect(availableBonuses(round, 0).map((b) => b.id)).not.toContain('nearest')

    round.pars = [3]
    expect(availableBonuses(round, 0).map((b) => b.id)).toContain('nearest')
  })

  it('exkluzivní bonus se při zápisu odebere ostatním hráčům', () => {
    const round = longestRound(5, false)
    const moved = toggleBonus(round, 'p3', 0, 'longest')

    expect(moved.bonuses.p1?.[0]).toEqual([])
    expect(moved.bonuses.p3?.[0]).toEqual(['longest'])
  })
})

describe('Best Aggregate - násobení doublů', () => {
  /** Jamka, kde double zapíše `calls` hráčů; dvojice A bere Best i součet. */
  function doubles(calls: number, doubleClosingHoles = false) {
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
      scores: [at(4), at(5), at(5), at(5)],
      settings: { doubleClosingHoles, options: BASE_OPTIONS },
    })
    const ids = ['p1', 'p2', 'p3', 'p4']
    for (let i = 0; i < calls; i++) {
      const id = ids[i]
      if (id) {
        round.bonuses[id] = Array.from({ length: holes }, (_, h) =>
          h === holes - 1 ? (['double'] as BonusId[]) : [],
        )
      }
    }
    return { round, hole: holes - 1 }
  }

  it('jeden double zdvojnásobí', () => {
    const { round, hole } = doubles(1)
    expect(holePoints(round, hole)[0]?.total).toBe(4)
  })

  it('dva doubly znásobí čtyřikrát', () => {
    const { round, hole } = doubles(2)
    expect(holePoints(round, hole)[0]?.total).toBe(8)
  })

  it('tři doubly znásobí osmkrát', () => {
    const { round, hole } = doubles(3)
    expect(holePoints(round, hole)[0]?.total).toBe(16)
  })

  it('tři doubly na dvojnásobné jamce znásobí šestnáctkrát', () => {
    const { round, hole } = doubles(3, true)
    expect(holePoints(round, hole)[0]?.total).toBe(32)
  })
})
