import { describe, expect, it } from 'vitest'
import { finishedRounds, mergeRounds, pickCurrentRound } from './merge'
import type { Round } from '../types'
import { makeRound } from '../games/fixtures'

/**
 * Slučování při synchronizaci. Základní pravidlo, které tyhle testy hlídají:
 * nic se nikdy nezahodí a při shodě id vyhrává novější `updatedAt`.
 */

/** Kolo s daným id, časem změny a případným ukončením. */
function round(id: string, updatedAt: string, finished = true): Round {
  const base = makeRound({
    gameId: 'skins',
    players: ['Adam', 'Bára'],
    pars: [4],
    scores: [[4], [5]],
  })
  return {
    ...base,
    id,
    createdAt: updatedAt,
    updatedAt,
    finishedAt: finished ? updatedAt : undefined,
  }
}

const DRIVE = '2026-05-01T10:00:00.000Z'
const LATER = '2026-06-01T10:00:00.000Z'

describe('Synchronizace - slučování kol', () => {
  it('kolo, které je jen v zařízení, se nahraje do cloudu', () => {
    const plan = mergeRounds([round('a', DRIVE)], [])

    expect(plan.local.map((r) => r.id)).toEqual(['a'])
    expect(plan.push.map((r) => r.id)).toEqual(['a'])
  })

  it('kolo, které je jen v cloudu, se stáhne a nenahrává zpět', () => {
    const plan = mergeRounds([], [round('a', DRIVE)])

    expect(plan.local.map((r) => r.id)).toEqual(['a'])
    expect(plan.push).toEqual([])
  })

  it('sjednotí obě strany, nic nezahodí', () => {
    const plan = mergeRounds([round('a', DRIVE)], [round('b', LATER)])

    expect(plan.local.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })

  it('novější místní verze přebije vzdálenou a nahraje se', () => {
    const plan = mergeRounds([round('a', LATER)], [round('a', DRIVE)])

    expect(plan.local[0]?.updatedAt).toBe(LATER)
    expect(plan.push.map((r) => r.id)).toEqual(['a'])
  })

  it('novější vzdálená verze přebije místní a nenahrává se', () => {
    const plan = mergeRounds([round('a', DRIVE)], [round('a', LATER)])

    expect(plan.local[0]?.updatedAt).toBe(LATER)
    expect(plan.push).toEqual([])
  })

  it('při shodě časů zůstává místní verze a nic se nenahrává', () => {
    const local = { ...round('a', DRIVE), currentHole: 7 }
    const plan = mergeRounds([local], [round('a', DRIVE)])

    expect(plan.local[0]?.currentHole).toBe(7)
    expect(plan.push).toEqual([])
  })

  it('kolo bez updatedAt spadne na datum ukončení', () => {
    const legacy: Round = { ...round('a', DRIVE), updatedAt: undefined }
    const plan = mergeRounds([legacy], [round('a', LATER)])

    expect(plan.local[0]?.updatedAt).toBe(LATER)
  })

  it('řadí od nejnovějšího kola', () => {
    const plan = mergeRounds([round('stare', DRIVE)], [round('nove', LATER)])

    expect(plan.local.map((r) => r.id)).toEqual(['nove', 'stare'])
  })

  it('prázdné obě strany dají prázdný výsledek', () => {
    expect(mergeRounds([], [])).toEqual({ local: [], push: [] })
  })
})

describe('Synchronizace - rozehrané kolo', () => {
  it('rozehrané kolo se pozná podle chybějícího ukončení', () => {
    const rounds = [round('hotove', LATER), round('rozehrane', DRIVE, false)]

    expect(pickCurrentRound(rounds)?.id).toBe('rozehrane')
  })

  it('ze dvou rozehraných vyhrává to novější', () => {
    const rounds = [round('stare', DRIVE, false), round('nove', LATER, false)]

    expect(pickCurrentRound(rounds)?.id).toBe('nove')
  })

  it('bez rozehraného kola vrací null', () => {
    expect(pickCurrentRound([round('a', DRIVE)])).toBe(null)
  })

  it('do archivu jdou jen dohraná kola', () => {
    const rounds = [round('hotove', LATER), round('rozehrane', DRIVE, false)]

    expect(finishedRounds(rounds).map((r) => r.id)).toEqual(['hotove'])
  })
})
