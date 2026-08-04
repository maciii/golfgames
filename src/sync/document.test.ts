import { describe, expect, it } from 'vitest'
import { decodeBonuses, encodeBonuses, fromDocument, toDocument } from './document'
import type { Round } from '../types'
import { makeRound } from '../games/fixtures'

/**
 * Tvar dokumentu pro Firestore.
 *
 * Hlídá hlavně jednu věc: v dokumentu nesmí být pole uvnitř pole, protože
 * Firestore takový zápis odmítne chybou `invalid-argument`.
 */

function round(): Round {
  return makeRound({
    gameId: 'best-aggregate',
    players: ['Adam', 'Bára', 'Cyril', 'Dana'],
    pars: [5, 3, 4],
    scores: [
      [4, 3, 4],
      [5, 3, 4],
      [5, 4, 4],
      [6, 3, 5],
    ],
    teams: [
      [0, 1],
      [2, 3],
    ],
  })
}

/** Najde v dokumentu pole, které obsahuje další pole. */
function nestedArrayPath(value: unknown, path = ''): string | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (Array.isArray(item)) return `${path}[${index}]`
      const deeper = nestedArrayPath(item, `${path}[${index}]`)
      if (deeper) return deeper
    }
    return null
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const deeper = nestedArrayPath(item, path ? `${path}.${key}` : key)
      if (deeper) return deeper
    }
  }
  return null
}

describe('Dokument pro Firestore', () => {
  it('v modelu aplikace pole v poli je (proto se převádí)', () => {
    expect(nestedArrayPath(round())).toBe('bonuses.p1[0]')
  })

  it('v dokumentu už žádné pole v poli není', () => {
    const document = toDocument(round())

    expect(nestedArrayPath(document)).toBe(null)
  })

  it('nezapisuje hodnoty undefined', () => {
    const unfinished = { ...round(), finishedAt: undefined }

    expect(Object.keys(toDocument(unfinished))).not.toContain('finishedAt')
  })

  it('bonusy se v dokumentu klíčují číslem jamky', () => {
    const source = round()
    source.bonuses.p1 = [['longest'], [], ['bunker', 'water']]

    expect(encodeBonuses(source.bonuses).p1).toEqual({
      '0': ['longest'],
      '2': ['bunker', 'water'],
    })
  })

  it('prázdné jamky se do dokumentu nepíšou', () => {
    const empty = encodeBonuses({ p1: [[], [], []] })

    expect(empty.p1).toEqual({})
  })
})

describe('Dokument z Firestore', () => {
  it('kolo projde tam a zpět beze změny', () => {
    const source = round()
    source.bonuses.p1 = [['longest'], [], ['bunker']]
    source.bonuses.p3 = [[], ['nearest'], []]

    const restored = fromDocument(toDocument(source)) as Round

    expect(restored.bonuses).toEqual(source.bonuses)
    expect(restored.scores).toEqual(source.scores)
    expect(restored.teams).toEqual(source.teams)
  })

  it('doplní prázdné jamky až do konce kola', () => {
    const decoded = decodeBonuses({ p1: { '0': ['longest'] } }, 3)

    expect(decoded.p1).toEqual([['longest'], [], []])
  })

  it('zvládne i starý tvar uložený jako pole polí', () => {
    const decoded = decodeBonuses({ p1: [['longest'], [], ['water']] }, 3)

    expect(decoded.p1).toEqual([['longest'], [], ['water']])
  })

  it('jamku mimo rozsah kola zahodí', () => {
    const decoded = decodeBonuses({ p1: { '9': ['longest'] } }, 3)

    expect(decoded.p1).toEqual([[], [], []])
  })

  it('poškozený obsah nezhavaruje', () => {
    expect(decodeBonuses(null, 3)).toEqual({})
    expect(decodeBonuses({ p1: 'nesmysl' }, 2).p1).toEqual([[], []])
  })
})
