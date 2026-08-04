import { describe, expect, it } from 'vitest'
import { LOCALES, translate } from './index'
import type { MessageKey } from './index'
import { cs } from './cs'
import { en } from './en'
import { BONUSES, RESULT_TIERS, SCORE_CATEGORIES } from '../types'
import { GAMES } from '../games'

/**
 * Úplnost katalogů a chování překladu.
 *
 * Chybějící klíč u jazyka je chyba překladu, ne text, který v aplikaci tiše
 * zůstane česky - proto se to hlídá testem i typem.
 */

const keys = Object.keys(cs) as MessageKey[]

describe('Katalogy', () => {
  it('angličtina má všechny klíče, co čeština', () => {
    const missing = keys.filter((key) => !(key in en))

    expect(missing).toEqual([])
  })

  it('nemá klíče navíc, které čeština nezná', () => {
    const extra = Object.keys(en).filter((key) => !(key in cs))

    expect(extra).toEqual([])
  })

  it('texty s množným číslem je mají v obou jazycích', () => {
    const mismatched = keys.filter(
      (key) => typeof cs[key] === 'object' && typeof en[key] !== 'object',
    )

    expect(mismatched).toEqual([])
  })

  it('žádný text není prázdný', () => {
    const empty = keys.filter((key) => {
      const value = cs[key]
      return typeof value === 'string' && value.trim() === ''
    })

    expect(empty).toEqual([])
  })
})

describe('Klíče odvozené z dat', () => {
  it('každá registrovaná hra má název, popisek i pravidla', () => {
    for (const game of GAMES) {
      for (const part of ['name', 'tagline', 'rules']) {
        expect(cs, `${game.id}.${part}`).toHaveProperty(`games.${game.id}.${part}`)
        expect(en, `${game.id}.${part}`).toHaveProperty(`games.${game.id}.${part}`)
      }
    }
  })

  it('každý extra bod má název i popis', () => {
    for (const bonus of BONUSES) {
      expect(cs).toHaveProperty(`bonus.${bonus.id}.name`)
      expect(cs).toHaveProperty(`bonus.${bonus.id}.description`)
      expect(en).toHaveProperty(`bonus.${bonus.id}.name`)
    }
  })

  it('každý násobič za výsledek má název i poznámku', () => {
    for (const tier of RESULT_TIERS) {
      expect(cs).toHaveProperty(`tier.${tier.id}.name`)
      expect(cs).toHaveProperty(`tier.${tier.id}.note`)
    }
  })

  it('každá kategorie výsledku na jamce má popisek', () => {
    for (const category of SCORE_CATEGORIES) {
      expect(cs).toHaveProperty(`score.${category}`)
      expect(en).toHaveProperty(`score.${category}`)
    }
  })
})

describe('Překlad', () => {
  it('dosadí proměnnou do textu', () => {
    expect(translate('cs', 'play.hole', { number: 7 })).toBe('Jamka 7')
    expect(translate('en', 'play.hole', { number: 7 })).toBe('Hole 7')
  })

  it('neznámou proměnnou nechá být, ať je chyba vidět', () => {
    expect(translate('cs', 'play.hole')).toBe('Jamka {number}')
  })

  it('české tvary množného čísla: 1 / 2-4 / 5+', () => {
    expect(translate('cs', 'archive.holes', { count: 1 })).toBe('1 jamka')
    expect(translate('cs', 'archive.holes', { count: 3 })).toBe('3 jamky')
    expect(translate('cs', 'archive.holes', { count: 5 })).toBe('5 jamek')
  })

  it('anglické tvary množného čísla: 1 / ostatní', () => {
    expect(translate('en', 'archive.holes', { count: 1 })).toBe('1 hole')
    expect(translate('en', 'archive.holes', { count: 5 })).toBe('5 holes')
  })

  it('počet kol má v češtině taky tři tvary', () => {
    expect(translate('cs', 'archive.count', { count: 1 })).toBe('1 odehrané kolo')
    expect(translate('cs', 'archive.count', { count: 2 })).toBe('2 odehraná kola')
    expect(translate('cs', 'archive.count', { count: 8 })).toBe('8 odehraných kol')
  })

  it('všechny texty jdou přeložit v obou jazycích bez pádu', () => {
    for (const locale of LOCALES) {
      for (const key of keys) {
        expect(translate(locale, key, { count: 2 })).not.toBe('')
      }
    }
  })
})
