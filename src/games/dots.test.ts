import { beforeAll, describe, expect, it } from 'vitest'
import { SIDE_BET_BONUSES } from './sideBets'
import type { DotVariant, Round } from '../types'
import { DEFAULT_GAME_OPTIONS } from '../types'
import { dots, holePoints, totalPoints } from './dots'
import { makeRound } from './fixtures'
import { setActiveLocale } from '../i18n'

// Test ověřuje i konkrétní česká znění, takže si jazyk určuje sám.
beforeAll(() => setActiveLocale('cs'))

/** Základní nastavení: obě nadstavby vypnuté, dvojnásobné jamky taky. */
const BASE_OPTIONS = {
  ...DEFAULT_GAME_OPTIONS,
  doubleClosingHoles: false,
}

/**
 * Kolo tří hráčů na jedné jamce s parem 4.
 *
 * `scores` jsou rány Adama, Báry a Cyrila; `null` znamená vzdanou jamku,
 * jakmile na ní někdo jiný zapsal.
 */
function round(
  scores: (number | null)[],
  options: Partial<typeof DEFAULT_GAME_OPTIONS> = {},
  pars = [4],
): Round {
  return makeRound({
    gameId: 'dots',
    players: ['Adam', 'Bára', 'Cyril'],
    pars,
    scores: scores.map((score) => [score]),
    settings: { options: { ...BASE_OPTIONS, ...options } },
  })
}

/** Body všech tří hráčů na první jamce v pořadí Adam, Bára, Cyril. */
function points(r: Round, hole = 0): number[] {
  const awarded = holePoints(r, hole)
  return ['p1', 'p2', 'p3'].map((id) => awarded.get(id) ?? 0)
}

function withVariant(variant: DotVariant) {
  return { dotVariant: variant }
}

describe('Dots - Nine Dot rozdělení bodů', () => {
  it('tři různé výsledky dostanou 5-3-1', () => {
    expect(points(round([3, 4, 5]))).toEqual([5, 3, 1])
  })

  it('jeden vítěz a dva remízoví poražení dostanou 5-2-2', () => {
    expect(points(round([3, 5, 5]))).toEqual([5, 2, 2])
  })

  it('dva vítězové a jeden poražený dostanou 4-4-1', () => {
    expect(points(round([4, 4, 6]))).toEqual([4, 4, 1])
  })

  it('remíza všech tří je 3-3-3', () => {
    expect(points(round([4, 4, 4]))).toEqual([3, 3, 3])
  })

  it('na jamce se vždy rozdá devět bodů', () => {
    for (const scores of [
      [3, 4, 5],
      [3, 5, 5],
      [4, 4, 6],
      [4, 4, 4],
    ]) {
      expect(points(round(scores)).reduce((a, b) => a + b, 0)).toBe(9)
    }
  })
})

describe('Dots - Six Dot rozdělení bodů', () => {
  it('tři různé výsledky dostanou 4-2-0', () => {
    expect(points(round([3, 4, 5], withVariant('six')))).toEqual([4, 2, 0])
  })

  it('jeden vítěz a dva remízoví poražení dostanou 4-1-1', () => {
    expect(points(round([3, 5, 5], withVariant('six')))).toEqual([4, 1, 1])
  })

  it('dva vítězové a jeden poražený dostanou 3-3-0', () => {
    expect(points(round([4, 4, 6], withVariant('six')))).toEqual([3, 3, 0])
  })

  it('remíza všech tří je 2-2-2', () => {
    expect(points(round([4, 4, 4], withVariant('six')))).toEqual([2, 2, 2])
  })

  it('na jamce se vždy rozdá šest bodů', () => {
    for (const scores of [
      [3, 4, 5],
      [3, 5, 5],
      [4, 4, 6],
      [4, 4, 4],
    ]) {
      expect(points(round(scores, withVariant('six'))).reduce((a, b) => a + b, 0)).toBe(6)
    }
  })

  it('neznámá varianta spadne na Nine Dot', () => {
    const broken = round([3, 4, 5], { dotVariant: 'osm' as DotVariant })

    expect(points(broken)).toEqual([5, 3, 1])
  })
})

describe('Dots - nedohrané a vzdané jamky', () => {
  it('na jamce, kam se nedošlo, nemá nikdo nic', () => {
    expect(points(round([null, null, null]))).toEqual([0, 0, 0])
  })

  it('kdo jamku vzdal, skončí poslední', () => {
    // Bára i Cyril vzdali, takže dělí poslední místo: 5-2-2.
    expect(points(round([4, null, null]))).toEqual([5, 2, 2])
  })

  it('jediný vzdaný míč je horší než jakýkoli zápis', () => {
    expect(points(round([4, 5, null]))).toEqual([5, 3, 1])
  })
})

describe('Dots - výhra o dvě rány', () => {
  const sweep = { sweepOnTwoStrokes: true }

  it('vypnutá volba nechává běžné rozdělení', () => {
    expect(points(round([3, 5, 6]))).toEqual([5, 3, 1])
  })

  it('vítěz o dvě rány bere všech devět bodů', () => {
    expect(points(round([3, 5, 6], sweep))).toEqual([9, 0, 0])
  })

  it('u Six Dot bere všech šest', () => {
    expect(points(round([3, 5, 6], { ...sweep, ...withVariant('six') }))).toEqual([
      6, 0, 0,
    ])
  })

  it('náskok jedné rány nestačí', () => {
    expect(points(round([3, 4, 6], sweep))).toEqual([5, 3, 1])
  })

  it('dva vítězové smetení nespustí, i když je třetí daleko', () => {
    expect(points(round([3, 3, 6], sweep))).toEqual([4, 4, 1])
  })

  /**
   * O kolik se vyhrálo proti vzdané jamce, nikdo neví - devět bodů v sázce
   * nemá stát na čísle, které nikdo nezapsal.
   */
  it('proti vzdané jamce se nesmetá', () => {
    expect(points(round([4, null, null], sweep))).toEqual([5, 2, 2])
  })
})

describe('Dots - birdie zdvojnásobí smetení', () => {
  const both = { sweepOnTwoStrokes: true, doubleSweepOnBirdie: true }

  it('výhra o dvě rány na birdie bere osmnáct bodů', () => {
    expect(points(round([3, 5, 6], both))).toEqual([18, 0, 0])
  })

  it('u Six Dot bere dvanáct', () => {
    expect(points(round([3, 5, 6], { ...both, ...withVariant('six') }))).toEqual([
      12, 0, 0,
    ])
  })

  it('výhra o dvě rány na par zůstává na devíti', () => {
    expect(points(round([4, 6, 7], both))).toEqual([9, 0, 0])
  })

  it('birdie bez náskoku dvou ran nic nemění', () => {
    expect(points(round([3, 4, 5], both))).toEqual([5, 3, 1])
  })

  it('bez zapnutého smetení se birdie neuplatní', () => {
    expect(points(round([3, 5, 6], { doubleSweepOnBirdie: true }))).toEqual([5, 3, 1])
  })
})

describe('Dots - netto HCP', () => {
  /** Tři shodné čtyřky; Bára dostává na jamce ránu podle SI 1. */
  function netRound(options: Partial<typeof DEFAULT_GAME_OPTIONS> = {}) {
    const r = round([4, 4, 4], options)
    r.netScoring = true
    r.course = { name: 'Testovací hřiště', strokeIndex: [1] }
    r.players[1]!.playingHandicap = 1
    return r
  }

  it('rána k dobru dělá z remízy výhru jamky', () => {
    expect(points(netRound())).toEqual([2, 5, 2])
  })

  it('v brutto kole zůstává remíza', () => {
    const r = netRound()
    r.netScoring = false

    expect(points(r)).toEqual([3, 3, 3])
  })

  it('smetení se počítá z netto ran', () => {
    const r = round([4, 6, 6], { sweepOnTwoStrokes: true })
    r.netScoring = true
    r.course = { name: 'Testovací hřiště', strokeIndex: [1] }
    // Adam ránu vrací (plusový handicap), takže netto vyhrává jen o jednu.
    r.players[0]!.playingHandicap = -1

    expect(points(r)).toEqual([5, 2, 2])
  })

  it('birdie ke smetení se posuzuje netto jen s volbou Uplatňovat HCP', () => {
    function sweepRound(multipliersWithHandicap: boolean) {
      const r = round([4, 6, 7], {
        sweepOnTwoStrokes: true,
        doubleSweepOnBirdie: true,
        multipliersWithHandicap,
      })
      r.netScoring = true
      r.course = { name: 'Testovací hřiště', strokeIndex: [1] }
      // S ranou k dobru je čtyřka na paru 4 netto birdie, brutto ale par.
      r.players[0]!.playingHandicap = 1
      return r
    }

    expect(points(sweepRound(false))).toEqual([9, 0, 0])
    expect(points(sweepRound(true))).toEqual([18, 0, 0])
  })
})

describe('Dots - kolo a výsledky', () => {
  function threeHoles() {
    return makeRound({
      gameId: 'dots',
      players: ['Adam', 'Bára', 'Cyril'],
      pars: [4, 4, 4],
      // jamka 1: 3/4/5   -> tři různé výsledky,     5-3-1
      // jamka 2: 4/4/5   -> dva vítězové,           4-4-1
      // jamka 3: 4/4/4   -> remíza všech tří,       3-3-3
      scores: [
        [3, 4, 4], // Adam:  5 + 4 + 3 = 12
        [4, 4, 4], // Bára:  3 + 4 + 3 = 10
        [5, 5, 4], // Cyril: 1 + 1 + 3 = 5
      ],
      settings: { options: BASE_OPTIONS },
    })
  }

  it('sečte body přes celé kolo', () => {
    const r = threeHoles()

    expect(totalPoints(r, 'p1')).toBe(12)
    expect(totalPoints(r, 'p2')).toBe(10)
    expect(totalPoints(r, 'p3')).toBe(5)

    // Na každé jamce se rozdá devět bodů, takže tři jamky dají 27.
    expect(['p1', 'p2', 'p3'].reduce((sum, id) => sum + totalPoints(r, id), 0)).toBe(27)
  })

  it('pořadí řadí od nejvíc bodů', () => {
    const rows = dots.computeStandings(threeHoles())[0]?.rows ?? []

    expect(rows.map((row) => [row.name, row.value])).toEqual([
      ['Adam', 12],
      ['Bára', 10],
      ['Cyril', 5],
    ])
  })

  it('popis výsledků pojmenuje zvolenou variantu', () => {
    const nine = dots.computeStandings(threeHoles())[0]?.description
    expect(nine).toContain('Nine Dot')
    expect(nine).toContain('9')

    const six = threeHoles()
    six.settings.options.dotVariant = 'six'
    expect(dots.computeStandings(six)[0]?.description).toContain('Six Dot')
  })

  it('dvojnásobná závěrečná jamka násobí i body', () => {
    const r = threeHoles()
    r.settings.options.doubleClosingHoles = true
    r.startHole = 7 // třetí jamka kola je devátá jamka hřiště

    expect(points(r, 2)).toEqual([6, 6, 6])
  })

  it('scorekarta ukazuje body jamku po jamce a součet', () => {
    const r = threeHoles()
    const column = dots.scorecardColumns?.(r)?.[0]

    expect(column?.cell(r, 0)).toBe('5')
    expect(column?.total(r)).toBe('12')
  })

  /**
   * Body na jamce se ukazují u jména hráče při zápisu, takže musí přijít
   * s vlastním popiskem (jméno by v odznaku u jména bylo k ničemu) a vítěz
   * jamky musí být poznat.
   */
  it('shrnutí jamky nese body u každého hráče a značí vítěze', () => {
    const summaries = dots.holeSummary?.(round([3, 4, 5]), 0) ?? []

    expect(summaries.map((s) => s.id)).toEqual(['p1', 'p2', 'p3'])
    expect(summaries[0]?.entries).toEqual([
      { label: 'Body za jamku', value: '5', highlight: true },
    ])
    expect(summaries[1]?.entries[0]).toMatchObject({ value: '3', highlight: false })
  })

  it('na jamce bez zápisu nemá shrnutí co zvýraznit', () => {
    const summaries = dots.holeSummary?.(round([null, null, null]), 0) ?? []

    expect(summaries[0]?.entries[0]).toMatchObject({ value: '–', highlight: false })
    expect(summaries.every((s) => s.winner === false)).toBe(true)
  })

  it('hraje se ve třech a bez dvojic', () => {
    expect(dots.playerCounts).toEqual([3])
    expect(dots.usesTeams(3)).toBe(false)
  })

  it('extra body nabízí jako vedlejší sázku', () => {
    // Body za pořadí na jamce rozdává hra sama, extra body jsou vedle nich -
    // proto vlastní tabulka a nulové výchozí hodnoty.
    expect(dots.scoringOptions.bonusIds).toEqual(SIDE_BET_BONUSES)
    expect(dots.scoringOptions.bonusesAsSideBet).toBe(true)
  })
})
