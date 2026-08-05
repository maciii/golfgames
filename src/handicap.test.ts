import { beforeAll, describe, expect, it } from 'vitest'
import {
  courseHandicap,
  normalizeStrokeIndex,
  stablefordPoints,
  strokesForHole,
  strokesReceived,
  strokesRelativeToBest,
  netDiffToPar,
} from './handicap'
import { makeRound } from './games/fixtures'
import { setActiveLocale } from './i18n'

/**
 * Testy handicapových výpočtů.
 *
 * Ověřují matematiku, ne UI - stejně jako u peněz je chyba tady nejdražší,
 * protože se podle ní hraje o peníze.
 */

beforeAll(() => setActiveLocale('cs'))

/** SI osmnáctijamkového hřiště: jamka 1 je nejtěžší, jamka 18 nejlehčí. */
const SI_18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

describe('courseHandicap', () => {
  it('na neutrálním hřišti (SR 113, CR = par) vrací index zaokrouhlený', () => {
    expect(courseHandicap(18.4, 113, 72, 72)).toBe(18)
  })

  it('těžší slope handicap zvedá', () => {
    // 18.4 × 132/113 = 21.49 -> 21 (CR i par jsou stejné, druhý člen je nula)
    expect(courseHandicap(18.4, 132, 72, 72)).toBe(21)
  })

  it('rozdíl CR a paru se přičítá', () => {
    // 10 × 113/113 + (74.5 - 72) = 12.5 -> 13
    expect(courseHandicap(10, 113, 74.5, 72)).toBe(13)
  })

  it('plusový hráč dostává záporný handicap', () => {
    expect(courseHandicap(-2.4, 113, 72, 72)).toBe(-2)
  })
})

describe('strokesForHole', () => {
  it('handicap 0 nedává rány nikde', () => {
    for (const si of SI_18) expect(strokesForHole(0, si, 18)).toBe(0)
  })

  it('handicap 9 dává ránu na devíti nejtěžších jamkách', () => {
    const total = SI_18.reduce((sum, si) => sum + strokesForHole(9, si, 18), 0)
    expect(total).toBe(9)
    expect(strokesForHole(9, 9, 18)).toBe(1)
    expect(strokesForHole(9, 10, 18)).toBe(0)
  })

  it('handicap 18 dává přesně jednu ránu na každou jamku', () => {
    for (const si of SI_18) expect(strokesForHole(18, si, 18)).toBe(1)
  })

  it('handicap 27 dává dvě rány na devíti nejtěžších, jinde jednu', () => {
    expect(strokesForHole(27, 1, 18)).toBe(2)
    expect(strokesForHole(27, 9, 18)).toBe(2)
    expect(strokesForHole(27, 10, 18)).toBe(1)
    const total = SI_18.reduce((sum, si) => sum + strokesForHole(27, si, 18), 0)
    expect(total).toBe(27)
  })

  it('plusový handicap rány naopak bere, a to od nejlehčí jamky', () => {
    // -3 znamená vrátit tři rány: na SI 18, 17 a 16.
    expect(strokesForHole(-3, 18, 18)).toBe(-1)
    expect(strokesForHole(-3, 16, 18)).toBe(-1)
    expect(strokesForHole(-3, 15, 18)).toBe(0)
    expect(strokesForHole(-3, 1, 18)).toBe(0)

    const total = SI_18.reduce((sum, si) => sum + strokesForHole(-3, si, 18), 0)
    expect(total).toBe(-3)
  })

  it('na devítijamkovém kole rozdává rány po devíti jamkách', () => {
    const si9 = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const total = si9.reduce((sum, si) => sum + strokesForHole(5, si, 9), 0)
    expect(total).toBe(5)
    expect(strokesForHole(5, 5, 9)).toBe(1)
    expect(strokesForHole(5, 6, 9)).toBe(0)
  })
})

describe('normalizeStrokeIndex', () => {
  it('SI, které už je pořadím, nechává být', () => {
    expect(normalizeStrokeIndex([3, 1, 2], 3)).toEqual([3, 1, 2])
  })

  it('devítku podepsanou z osmnáctky přepočte na pořadí 1..9', () => {
    // Typické liché SI devítijamkového hřiště.
    const parent = [1, 3, 5, 7, 9, 11, 13, 15, 17]
    expect(normalizeStrokeIndex(parent, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('zachovává pořadí obtížnosti, ne jen hodnoty', () => {
    const parent = [11, 3, 17, 1]
    expect(normalizeStrokeIndex(parent, 4)).toEqual([3, 2, 4, 1])
  })

  it('chybějící nebo nesedící SI nahradí pořadím jamek', () => {
    expect(normalizeStrokeIndex([], 3)).toEqual([1, 2, 3])
    expect(normalizeStrokeIndex([1, 2], 3)).toEqual([1, 2, 3])
  })
})

describe('stablefordPoints', () => {
  it('par jsou dva body, každá rána nad par jeden dolů', () => {
    expect(stablefordPoints(-3)).toBe(5) // albatros
    expect(stablefordPoints(-2)).toBe(4) // eagle
    expect(stablefordPoints(-1)).toBe(3) // birdie
    expect(stablefordPoints(0)).toBe(2) // par
    expect(stablefordPoints(1)).toBe(1) // bogey
  })

  it('netto dvojbogey a horší nedá nic, nikdy záporné body', () => {
    expect(stablefordPoints(2)).toBe(0)
    expect(stablefordPoints(5)).toBe(0)
  })
})

describe('výpočty nad kolem', () => {
  /** Kolo na třech jamkách: par 4, 3, 5 se SI 1, 3, 2. */
  function netRound(playingHandicap: number, scores: (number | null)[]) {
    const round = makeRound({
      gameId: 'stableford',
      players: ['A', 'B'],
      pars: [4, 3, 5],
      scores: [scores, [4, 3, 5]],
    })
    round.netScoring = true
    round.course = { name: 'Test', strokeIndex: [1, 3, 2] }
    const first = round.players[0]
    if (first) first.playingHandicap = playingHandicap
    return round
  }

  it('u hrubého kola se rány neodečítají, i když je handicap zadaný', () => {
    const round = netRound(3, [5, 4, 6])
    round.netScoring = false
    expect(strokesReceived(round, 'p1', 0)).toBe(0)
    expect(netDiffToPar(round, 'p1', 0)).toBe(1)
  })

  it('rány se rozdělí podle stroke indexu jamky', () => {
    // Handicap 2 na tříjamkovém kole: rány jdou na SI 1 a SI 2.
    const round = netRound(2, [5, 4, 6])
    expect(strokesReceived(round, 'p1', 0)).toBe(1) // SI 1
    expect(strokesReceived(round, 'p1', 1)).toBe(0) // SI 3
    expect(strokesReceived(round, 'p1', 2)).toBe(1) // SI 2
  })

  it('netto výsledek je skóre po odečtení ran', () => {
    const round = netRound(2, [5, 4, 6])
    expect(netDiffToPar(round, 'p1', 0)).toBe(0) // 5 - 1 = 4 = par
    expect(netDiffToPar(round, 'p1', 1)).toBe(1) // bez rány zůstává bogey
    expect(netDiffToPar(round, 'p1', 2)).toBe(0) // 6 - 1 = 5 = par
  })

  it('nezapsaná jamka zůstává bez výsledku', () => {
    const round = netRound(2, [null, 4, 6])
    expect(netDiffToPar(round, 'p1', 0)).toBeNull()
  })

  it('hráč bez zadaného handicapu hraje hrubě i v netto kole', () => {
    const round = netRound(2, [5, 4, 6])
    expect(strokesReceived(round, 'p2', 0)).toBe(0)
  })

  it('rozdíl vůči nejnižšímu HCP rozdělí podle stroke indexu', () => {
    // Anna má proti Bobovi o dvě rány k dobru, proto je dostane na SI 1 a 2.
    const round = netRound(2, [5, 4, 6])
    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(1)
    expect(strokesRelativeToBest(round, 'p1', 1)).toBe(0)
    expect(strokesRelativeToBest(round, 'p1', 2)).toBe(1)
    expect(strokesRelativeToBest(round, 'p2', 0)).toBe(0)
  })

  it('relativní rány u hrubého kola nezobrazuje', () => {
    const round = netRound(2, [5, 4, 6])
    round.netScoring = false
    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(0)
  })
})
