import { describe, expect, it } from 'vitest'
import {
  defaultLoopSelection,
  layoutTee,
  playableLoops,
  requiresLoopSelection,
  resolveLayout,
} from './layout'
import type { Course } from './types'
import { normalizeCourse } from './types'
import { normalizeStrokeIndex, strokesForHole } from '../handicap'

/** Osmnáctka bez pojmenovaných smyček - běžné hřiště. */
function eighteen(): Course {
  return normalizeCourse({
    id: 'test:18',
    name: 'Osmnáctka',
    holeCount: 18,
    pars: [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4],
    strokeIndex: [5, 15, 1, 11, 7, 17, 3, 9, 13, 6, 16, 2, 12, 8, 18, 14, 4, 10],
    tees: [
      { id: 'yellow', name: 'Žlutá', courseRating: 71.2, slopeRating: 132, par: 72 },
    ],
    source: 'manual',
  })
}

/**
 * Resort o třech devítkách podle Panorama Kácov: každá smyčka má vlastní SI
 * 1-9 a vlastní devítkovou normu.
 */
function resort(): Course {
  const forestPars = [4, 4, 3, 4, 5, 5, 4, 3, 4]
  const riverPars = [4, 4, 4, 3, 4, 4, 3, 5, 5]
  const meadowsPars = [5, 3, 4, 4, 4, 5, 3, 4, 4]

  return normalizeCourse({
    id: 'test:27',
    name: 'Resort',
    holeCount: 27,
    pars: [...forestPars, ...riverPars, ...meadowsPars],
    strokeIndex: [
      ...[7, 2, 9, 3, 1, 6, 8, 5, 4],
      ...[4, 2, 6, 8, 1, 5, 9, 3, 7],
      ...[1, 9, 5, 3, 7, 2, 8, 6, 4],
    ],
    tees: [{ id: 'men', name: 'Muži' }],
    loops: [
      {
        id: 'forest',
        name: 'Forest',
        holeCount: 9,
        tees: [
          { id: 'men', name: 'Muži', courseRating: 38.0, slopeRating: 149, par: 36 },
        ],
      },
      {
        id: 'river',
        name: 'River',
        holeCount: 9,
        tees: [
          { id: 'men', name: 'Muži', courseRating: 35.9, slopeRating: 129, par: 36 },
        ],
      },
      {
        id: 'meadows',
        name: 'Meadows',
        holeCount: 9,
        tees: [
          { id: 'men', name: 'Muži', courseRating: 38.2, slopeRating: 153, par: 36 },
        ],
      },
    ],
    source: 'manual',
  })
}

describe('části hřiště', () => {
  it('osmnáctka bez smyček se dělí na dvě půlky', () => {
    expect(playableLoops(eighteen()).map((loop) => loop.id)).toEqual(['front', 'back'])
  })

  it('kratší hřiště se nedělí', () => {
    const six = normalizeCourse({
      id: 'test:6',
      name: 'Šestka',
      holeCount: 6,
      pars: [4, 3, 5, 4, 4, 3],
      strokeIndex: [3, 5, 1, 4, 2, 6],
      tees: [],
      source: 'manual',
    })

    expect(playableLoops(six)).toEqual([])

    const layout = resolveLayout(six)
    expect(layout.holeCount).toBe(6)
    expect(layout.startHole).toBe(1)
    expect(layout.par).toBe(23)
  })

  it('smyčky s děravým součtem jamek se zahodí', () => {
    const broken = normalizeCourse({
      ...resort(),
      loops: [{ id: 'forest', name: 'Forest', holeCount: 9 }],
    })

    expect(broken.loops).toBeUndefined()
    expect(playableLoops(broken)).toEqual([])
  })
})

describe('kdy se kolo skládá z devítek', () => {
  it('resort nad osmnáct jamek si devítky vybrat musí', () => {
    const course = resort()

    expect(requiresLoopSelection(course)).toBe(true)
    // Výchozí je plná osmnáctka od první devítky, ne celých 27 jamek.
    expect(defaultLoopSelection(course)).toEqual(['forest', 'river'])
  })

  it('osmnáctka s pojmenovanými devítkami se pořád hraje celá', () => {
    const course = normalizeCourse({
      ...eighteen(),
      loops: [
        { id: 'lesni', name: 'Lesní', holeCount: 9 },
        { id: 'ostrovni', name: 'Ostrovní', holeCount: 9, startHole: 10 },
      ],
    })

    expect(requiresLoopSelection(course)).toBe(false)
    expect(defaultLoopSelection(course)).toEqual([])
    // Devítky jsou navíc, ne místo celého hřiště.
    expect(playableLoops(course).map((loop) => loop.id)).toEqual(['lesni', 'ostrovni'])
    expect(resolveLayout(course, ['ostrovni']).startHole).toBe(10)
  })
})

describe('výřez hřiště', () => {
  it('zadní devítka osmnáctky si nese své jamky, SI i čísla 10-18', () => {
    const layout = resolveLayout(eighteen(), ['back'])

    expect(layout.holeCount).toBe(9)
    expect(layout.startHole).toBe(10)
    expect(layout.pars).toEqual([4, 3, 4, 5, 4, 4, 3, 5, 4])
    expect(layout.strokeIndex).toEqual([6, 16, 2, 12, 8, 18, 14, 4, 10])
    expect(layout.par).toBe(36)
  })

  it('celé hřiště zůstane, když se nevybere žádná smyčka', () => {
    const layout = resolveLayout(eighteen())

    expect(layout.holeCount).toBe(18)
    expect(layout.startHole).toBe(1)
    expect(layout.loopIds).toEqual([])
  })

  it('devítka resortu se hraje jako jamky 1-9', () => {
    const layout = resolveLayout(resort(), ['river'])

    expect(layout.holeCount).toBe(9)
    expect(layout.startHole).toBe(1)
    expect(layout.par).toBe(36)
  })

  it('pořadí devítek rozhoduje o pořadí jamek', () => {
    const course = resort()
    const forestFirst = resolveLayout(course, ['forest', 'meadows'])
    const meadowsFirst = resolveLayout(course, ['meadows', 'forest'])

    expect(forestFirst.holeCount).toBe(18)
    expect(forestFirst.startHole).toBe(1)
    expect(forestFirst.pars).toEqual([
      ...meadowsFirst.pars.slice(9),
      ...meadowsFirst.pars.slice(0, 9),
    ])
    expect(forestFirst.strokeIndex).not.toEqual(meadowsFirst.strokeIndex)
    expect(forestFirst.strokeIndex.slice(0, 9).every((si) => si % 2 === 1)).toBe(true)
    expect(forestFirst.strokeIndex.slice(9).every((si) => si % 2 === 0)).toBe(true)
  })

  it('složená osmnáctka má stroke index 1-18 bez opakování', () => {
    const layout = resolveLayout(resort(), ['forest', 'river'])
    const sorted = [...layout.strokeIndex].sort((a, b) => a - b)

    expect(sorted).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
  })

  it('devět ran se rozdělí mezi obě devítky, ne jen do první', () => {
    const layout = resolveLayout(resort(), ['forest', 'river'])
    const ranked = normalizeStrokeIndex(layout.strokeIndex, 18)
    const strokes = ranked.map((si) => strokesForHole(9, si, 18))

    expect(strokes.slice(0, 9).reduce((sum, value) => sum + value, 0)).toBe(5)
    expect(strokes.slice(9).reduce((sum, value) => sum + value, 0)).toBe(4)
  })

  it('stejná devítka dvakrát dá osmnáctijamkové kolo', () => {
    const layout = resolveLayout(resort(), ['forest', 'forest'])

    expect(layout.holeCount).toBe(18)
    expect(layout.pars.slice(0, 9)).toEqual(layout.pars.slice(9))
    expect(new Set(layout.strokeIndex).size).toBe(18)
  })

  it('neznámá smyčka se přeskočí a hraje se, co zbylo', () => {
    const layout = resolveLayout(resort(), ['forest', 'zbourano'])

    expect(layout.loopIds).toEqual(['forest'])
    expect(layout.holeCount).toBe(9)
  })
})

describe('norma odpaliště pro výřez', () => {
  it('kombinace devítek sečte CR a zprůměruje SR', () => {
    const course = resort()
    const layout = resolveLayout(course, ['forest', 'river'])
    const tee = layoutTee(course, layout, 'men')

    // Tabulka ČGF uvádí pro Forest & River 73,9 / 139.
    expect(tee?.courseRating).toBe(73.9)
    expect(tee?.slopeRating).toBe(139)
    expect(tee?.par).toBe(72)
    expect(tee?.ratedHoles).toBe(18)
  })

  it('samostatná devítka resortu má vlastní devítkovou normu', () => {
    const course = resort()
    const tee = layoutTee(course, resolveLayout(course, ['meadows']), 'men')

    expect(tee?.courseRating).toBe(38.2)
    expect(tee?.slopeRating).toBe(153)
    // Norma sedí na hrané jamky, takže se člen CR − par nekrátí.
    expect(tee?.ratedHoles).toBe(9)
  })

  it('bez devítkových norem se norma hřiště krátí podílem hraných jamek', () => {
    const course = eighteen()
    const tee = layoutTee(course, resolveLayout(course, ['front']), 'yellow')

    expect(tee?.courseRating).toBe(71.2)
    expect(tee?.par).toBe(72)
    expect(tee?.ratedHoles).toBe(18)
  })

  it('devítka s podepsanou osmnáctijamkovou normou se počítá jako půlka', () => {
    const nine = normalizeCourse({
      id: 'test:9',
      name: 'Devítka',
      holeCount: 9,
      pars: [4, 4, 3, 5, 4, 4, 3, 4, 5],
      strokeIndex: [3, 7, 17, 1, 11, 5, 15, 13, 9],
      tees: [
        {
          id: 'yellow',
          name: 'Žlutá',
          courseRating: 71.2,
          slopeRating: 132,
          par: 72,
          holeCount: 18,
        },
      ],
      source: 'manual',
    })

    const tee = layoutTee(nine, resolveLayout(nine), 'yellow')
    expect(tee?.ratedHoles).toBe(18)
  })
})
