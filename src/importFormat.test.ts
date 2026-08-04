import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'
import { normalizeStrokeIndex, strokesForHole } from './handicap'

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

  it('načte obě hřiště i s odpališti', () => {
    const result = parseBackup(sample)
    if (!result.ok) throw new Error('vzor neprošel kontrolou')

    const courses = result.backup.data.courses
    expect(courses).toHaveLength(2)
    expect(courses[0]?.name).toBe('Karlštejn')
    expect(courses[0]?.tees).toHaveLength(2)
    expect(courses[0]?.tees[0]?.slopeRating).toBe(132)
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
