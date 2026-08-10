import { describe, expect, it } from 'vitest'
import { composeNines } from './composite'
import { normalizeCourse, type Course } from './types'

/**
 * Testy skládání dvou devítek.
 *
 * Čísla jsou ze skutečných hřišť v katalogu, ať se ověřuje pravidlo na datech,
 * na kterých se opravdu hraje.
 */

/** Spa Golf Club: devítka s devítkovou normou. */
const spa = (): Course =>
  normalizeCourse({
    id: 'spa-golf-club',
    name: 'Spa Golf Club',
    holeCount: 9,
    pars: [4, 3, 4, 4, 4, 3, 4, 4, 4],
    strokeIndex: [3, 9, 1, 5, 7, 8, 2, 6, 4],
    tees: [
      { id: 'yellow', name: 'Yellow', courseRating: 32.5, slopeRating: 124, par: 34 },
    ],
    source: 'manual',
  })

/** Gloria Verde: devítka, kterou klub normuje jako dvě kola dokola. */
const verde = (): Course =>
  normalizeCourse({
    id: 'gloria-golf-resort-verde-course',
    name: 'Gloria Golf Resort - Verde Course',
    holeCount: 9,
    pars: [4, 4, 3, 4, 5, 4, 3, 4, 4],
    strokeIndex: [6, 2, 4, 7, 1, 5, 8, 3, 9],
    tees: [
      {
        id: 'white',
        name: 'White',
        courseRating: 70.3,
        slopeRating: 117,
        par: 70,
        distance: 5846,
        holeCount: 18,
      },
    ],
    source: 'manual',
  })

describe('composeNines', () => {
  it('tatáž devítka dvakrát dá osmnáctku', () => {
    const course = composeNines(spa(), spa())

    expect(course.holeCount).toBe(18)
    expect(course.pars).toHaveLength(18)
    expect(course.pars.reduce((sum, par) => sum + par, 0)).toBe(68)
    expect(course.name).toBe('Spa Golf Club')
  })

  it('CR se sečte a SR zprůměruje', () => {
    const tee = composeNines(spa(), spa()).tees[0]

    expect(tee?.courseRating).toBe(65)
    expect(tee?.slopeRating).toBe(124)
    expect(tee?.par).toBe(68)
  })

  it('stroke index se proloží na lichá a sudá čísla', () => {
    const { strokeIndex } = composeNines(spa(), spa())

    expect(strokeIndex).toHaveLength(18)
    // Bez proložení by v kole byly dvě jamky se stroke indexem 1.
    expect(new Set(strokeIndex).size).toBe(18)
    expect([...strokeIndex].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    )
    expect(strokeIndex.slice(0, 9).every((si) => si % 2 === 1)).toBe(true)
    expect(strokeIndex.slice(9).every((si) => si % 2 === 0)).toBe(true)
  })

  it('devítka s osmnáctijamkovou normou se nesečte dvakrát', () => {
    // Gloria Verde má na devíti jamkách podepsané CR 70,3 / SR 117 / par 70,
    // protože ji klub normuje jako dvě kola dokola. Sečtení by dalo 140,6.
    const tee = composeNines(verde(), verde()).tees[0]

    expect(tee?.courseRating).toBe(70.3)
    expect(tee?.slopeRating).toBe(117)
    expect(tee?.par).toBe(70)
    expect(tee?.distance).toBe(5846)
  })

  it('devítkovou a osmnáctijamkovou normu složí dohromady', () => {
    const front = verde()
    const back = spa()
    // Verde zkrácená na devítku (35,15 / 117 / 35) + Spa (32,5 / 124 / 34).
    const tee = composeNines(
      { ...front, tees: [{ ...front.tees[0]!, id: 'yellow', name: 'Yellow' }] },
      back,
    ).tees[0]

    expect(tee?.courseRating).toBe(67.7)
    expect(tee?.slopeRating).toBe(121)
    expect(tee?.par).toBe(69)
  })

  it('odpaliště bez normy u jedné devítky zůstane bez normy', () => {
    const rated = spa()
    const unrated: Course = normalizeCourse({
      ...spa(),
      id: 'druha',
      name: 'Druhá',
      tees: [{ id: 'yellow', name: 'Yellow' }],
    })
    const tee = composeNines(rated, unrated).tees[0]

    expect(tee?.id).toBe('yellow')
    expect(tee?.courseRating).toBeUndefined()
    expect(tee?.slopeRating).toBeUndefined()
  })

  it('nabídne jen odpaliště, která mají obě devítky', () => {
    const front = normalizeCourse({
      ...spa(),
      tees: [
        { id: 'yellow', name: 'Yellow', courseRating: 32.5, slopeRating: 124, par: 34 },
        { id: 'red', name: 'Red', courseRating: 30.1, slopeRating: 118, par: 34 },
      ],
    })

    expect(composeNines(front, spa()).tees.map((tee) => tee.id)).toEqual(['yellow'])
  })

  it('nese devítky jako pojmenované smyčky, aby šlo poznat, co se hraje', () => {
    const course = composeNines(spa(), verde())

    expect(course.loops?.map((loop) => loop.name)).toEqual([
      'Spa Golf Club',
      'Gloria Golf Resort - Verde Course',
    ])
    expect(course.loops?.map((loop) => loop.holeCount)).toEqual([9, 9])
  })
})
