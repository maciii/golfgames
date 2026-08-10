import { describe, expect, it } from 'vitest'
import {
  decodeBonuses,
  encodeBonuses,
  forFirestore,
  fromDocument,
  toDocument,
} from './document'
import type { Round } from '../types'
import { makeRound } from '../games/fixtures'
import { normalizeCourse } from '../courses/types'

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
    source.holePairings = {
      '0': { p1: 'left', p2: 'left', p3: 'right', p4: 'right' },
      '1': { p1: 'right', p2: 'left', p3: 'right', p4: 'left' },
    }

    const restored = fromDocument(toDocument(source)) as Round

    expect(restored.bonuses).toEqual(source.bonuses)
    expect(restored.scores).toEqual(source.scores)
    expect(restored.teams).toEqual(source.teams)
    expect(restored.holePairings).toEqual(source.holePairings)
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

describe('forFirestore', () => {
  /**
   * `normalizeCourse()` nechává v hřišti `loops: undefined`, aby přebilo
   * poškozené smyčky z uložené kopie. Do Firestoru to poslat nejde - odmítne
   * celý zápis chybou `invalid-argument`, takže přestane fungovat celá
   * synchronizace předvoleb, ne jen jedno hřiště.
   */
  it('zahodí klíče s hodnotou undefined', () => {
    const course = { id: 'x', name: 'X', loops: undefined, catalogUpdatedAt: undefined }

    const clean = forFirestore(course)

    expect(Object.keys(clean)).toEqual(['id', 'name'])
    expect('loops' in clean).toBe(false)
  })

  it('projde i do vnořených objektů a polí', () => {
    const prefs = {
      courses: [{ id: 'a', loops: undefined, tees: [{ id: 'yellow', par: undefined }] }],
      roster: [{ id: 'r1', name: 'Eva', preferredTeeId: undefined }],
    }

    expect(forFirestore(prefs)).toEqual({
      courses: [{ id: 'a', tees: [{ id: 'yellow' }] }],
      roster: [{ id: 'r1', name: 'Eva' }],
    })
  })

  it('nemění délku pole - z undefined udělá null', () => {
    // Vyhozením prvku by se posunuly indexy a pars[3] by přestal být par
    // čtvrté jamky.
    expect(forFirestore({ pars: [4, undefined, 5] })).toEqual({ pars: [4, null, 5] })
  })

  it('vyčistí hřiště tak, jak ho aplikace opravdu drží', () => {
    // Ne vymyšlený objekt, ale výstup normalizeCourse() - právě on do
    // předvoleb `undefined` dostává a právě on shodil synchronizaci.
    const course = normalizeCourse({
      id: 'local:test',
      name: 'Testovací',
      holeCount: 9,
      pars: [4, 4, 3, 4, 5, 4, 3, 4, 4],
      strokeIndex: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      tees: [{ id: 'yellow', name: 'Žlutá' }],
      source: 'manual',
    })
    expect('loops' in course).toBe(true)
    expect(course.loops).toBeUndefined()

    expect('loops' in forFirestore(course)).toBe(false)
  })

  it('nesahá na hodnoty, které Firestore přijme', () => {
    const round = { id: 'r', scores: { p1: [4, null, 5] }, teams: [{ id: 't1' }] }

    expect(forFirestore(round)).toEqual(round)
  })
})
