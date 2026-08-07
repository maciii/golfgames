import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'
import { normalizeStrokeIndex, strokesForHole } from './handicap'
import { layoutTee, requiresLoopSelection, resolveLayout } from './courses/layout'
import { normalizeCourse } from './courses/types'

/**
 * Kontrola vzoru pro hromadný import hřišť.
 *
 * Vzor v `docs/vzor-hriste.json` je to, co dostane do ruky člověk, který si
 * chce nahrát vlastní databázi hřišť. Kdyby se změnila kontrola v
 * `parseBackup()` nebo tvar `Course`, musí to spadnout tady - ne až u
 * uživatele, kterému by se soubor tiše odmítl.
 */

const sample = readFileSync(new URL('../docs/vzor-hriste.json', import.meta.url), 'utf8')

describe('vzor pro import hřišť', () => {
  it('projde kontrolou zálohy', () => {
    const result = parseBackup(sample)
    expect(result.ok).toBe(true)
  })

  it('načte všechna hřiště i s odpališti', () => {
    const result = parseBackup(sample)
    if (!result.ok) throw new Error('vzor neprošel kontrolou')

    const courses = result.backup.data.courses
    expect(courses).toHaveLength(3)
    expect(courses[0]?.name).toBe('Karlštejn')
    expect(courses[0]?.tees).toHaveLength(2)
    expect(courses[0]?.tees[0]?.slopeRating).toBe(132)
  })

  it('resort ve vzoru se dá poskládat z devítek', () => {
    const result = parseBackup(sample)
    if (!result.ok) throw new Error('vzor neprošel kontrolou')

    const resort = result.backup.data.courses.find((c) => c.holeCount === 27)
    if (!resort) throw new Error('ve vzoru chybí hřiště s devítkami')

    // Devítky musí pokrýt celé hřiště, jinak by je normalizace zahodila.
    const course = normalizeCourse(resort)
    expect(course.loops).toHaveLength(3)
    expect(requiresLoopSelection(course)).toBe(true)

    // Kombinace se skládá z devítkových norem: CR se sčítá, SR průměruje.
    const layout = resolveLayout(course, ['forest', 'river'])
    const tee = layoutTee(course, layout, 'yellow')
    expect(layout.holeCount).toBe(18)
    expect(tee?.courseRating).toBe(71)
    expect(tee?.slopeRating).toBe(129)
    expect(tee?.share).toBe(1)
  })

  it('devítka s vlastní normou se nekrátí, s osmnáctijamkovou ano', () => {
    const result = parseBackup(sample)
    if (!result.ok) throw new Error('vzor neprošel kontrolou')

    const nine = result.backup.data.courses.find((c) => c.holeCount === 9)
    if (!nine) throw new Error('ve vzoru chybí devítijamkové hřiště')

    const course = normalizeCourse(nine)
    expect(layoutTee(course, resolveLayout(course), 'yellow')?.share).toBe(1)
  })

  it('pary i stroke index sedí délkou na počet jamek', () => {
    const result = parseBackup(sample)
    if (!result.ok) throw new Error('vzor neprošel kontrolou')

    for (const course of result.backup.data.courses) {
      expect(course.pars).toHaveLength(course.holeCount)
      expect(course.strokeIndex).toHaveLength(course.holeCount)
    }
  })

  it('devítka se stroke indexem z osmnáctky rozdá rány správně', () => {
    const result = parseBackup(sample)
    if (!result.ok) throw new Error('vzor neprošel kontrolou')

    const nine = result.backup.data.courses.find((c) => c.holeCount === 9)
    if (!nine) throw new Error('ve vzoru chybí devítijamkové hřiště')

    // SI je ve vzoru podepsané z mateřské osmnáctky (liché hodnoty 1-17).
    const ranked = normalizeStrokeIndex(nine.strokeIndex, 9)
    expect([...ranked].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])

    // Hráč s pěti ranami je musí dostat na pěti různých jamkách.
    const total = ranked.reduce((sum, si) => sum + strokesForHole(5, si, 9), 0)
    expect(total).toBe(5)
  })
})
