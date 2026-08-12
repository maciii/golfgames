import { beforeEach, describe, expect, it } from 'vitest'
import {
  addToRoster,
  archiveRound,
  loadArchive,
  loadRoster,
  setRosterTee,
  toggleRosterFavorite,
  updateArchivedRound,
} from './storage'
import { makeRound } from './games/fixtures'
import type { Round } from './types'

/**
 * Testy seznamu hráčů.
 *
 * Testy běží v prostředí `node` (viz `vite.config.ts`), kde localStorage není.
 * Stačí ale to málo, co `storage.ts` používá - čtení, zápis a mazání klíče.
 */

class MemoryStorage {
  private data = new Map<string, string>()
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  clear(): void {
    this.data.clear()
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage
})

describe('odpaliště v seznamu hráčů', () => {
  it('uloží se spolu se jménem a indexem', () => {
    addToRoster(['Eva'], [30.1], ['red'])

    expect(loadRoster()).toEqual([
      { id: expect.any(String), name: 'Eva', handicapIndex: 30.1, preferredTeeId: 'red' },
    ])
  })

  it('další kolo preferenci přepíše', () => {
    addToRoster(['Eva'], [30.1], ['red'])
    addToRoster(['Eva'], [30.1], ['blue'])

    expect(loadRoster()[0]?.preferredTeeId).toBe('blue')
  })

  it('kolo bez hřiště uloženou preferenci nepřepíše', () => {
    // Stejné pravidlo jako u indexu: prázdná hodnota nesmí smazat uloženou.
    addToRoster(['Eva'], [30.1], ['red'])
    addToRoster(['Eva'], [undefined], [undefined])

    expect(loadRoster()[0]?.preferredTeeId).toBe('red')
    expect(loadRoster()[0]?.handicapIndex).toBe(30.1)
  })

  it('hráč bez odpaliště pole vůbec nemá', () => {
    addToRoster(['Martin'])

    expect(loadRoster()[0]).toEqual({ id: expect.any(String), name: 'Martin' })
  })

  it('setRosterTee změní odpaliště jednoho hráče', () => {
    addToRoster(['Eva', 'Martin'], undefined, ['red', 'yellow'])
    const eva = loadRoster().find((entry) => entry.name === 'Eva')!

    const roster = setRosterTee(eva.id, 'blue')

    expect(roster.find((entry) => entry.name === 'Eva')?.preferredTeeId).toBe('blue')
    expect(roster.find((entry) => entry.name === 'Martin')?.preferredTeeId).toBe('yellow')
  })
})

describe('oblíbení hráči na domovské obrazovce', () => {
  it('toggleRosterFavorite zapne a zase vypne', () => {
    addToRoster(['Eva', 'Martin'])
    const eva = loadRoster().find((entry) => entry.name === 'Eva')!

    const withFavorite = toggleRosterFavorite(eva.id)
    expect(withFavorite.find((entry) => entry.name === 'Eva')?.favorite).toBe(true)
    expect(
      withFavorite.find((entry) => entry.name === 'Martin')?.favorite,
    ).toBeUndefined()

    const withoutFavorite = toggleRosterFavorite(eva.id)
    expect(withoutFavorite.find((entry) => entry.name === 'Eva')?.favorite).toBe(false)
  })
})

describe('dodatečná oprava archivního kola', () => {
  /** Tři kola v archivu tak, jak by tam po sobě přišla - nejnovější první. */
  function seedArchive(): Round[] {
    const rounds = ['a', 'b', 'c'].map((suffix, index) => ({
      ...makeRound({
        gameId: 'best-aggregate',
        players: ['Eva', 'Martin'],
        pars: [4, 4, 4],
        scores: [
          [4, 4, 4],
          [5, 5, 5],
        ],
      }),
      id: `round-${suffix}`,
      finishedAt: `2026-0${index + 1}-01T10:00:00.000Z`,
    }))
    // Archiv drží nejnovější kolo první, takže se ukládá v pořadí, ve kterém
    // se dohrála.
    for (const round of rounds) archiveRound(round)
    return rounds
  }

  it('přepíše skóre a nechá kolo na jeho místě v archivu', () => {
    const [oldest] = seedArchive()
    const eva = oldest!.players[0]!

    updateArchivedRound({
      ...oldest!,
      scores: { ...oldest!.scores, [eva.id]: [3, 4, 4] },
      updatedAt: '2026-08-12T09:00:00.000Z',
    })

    const archive = loadArchive()
    expect(archive.map((r) => r.id)).toEqual(['round-c', 'round-b', 'round-a'])
    expect(archive.find((r) => r.id === 'round-a')?.scores[eva.id]).toEqual([3, 4, 4])
    expect(archive.find((r) => r.id === 'round-a')?.updatedAt).toBe(
      '2026-08-12T09:00:00.000Z',
    )
  })

  it('kolo, které v archivu není, nepřidá', () => {
    seedArchive()

    updateArchivedRound({
      ...makeRound({
        gameId: 'best-aggregate',
        players: ['Eva', 'Martin'],
        pars: [4],
        scores: [[4], [5]],
      }),
      id: 'round-x',
    })

    expect(loadArchive().map((r) => r.id)).toEqual(['round-c', 'round-b', 'round-a'])
  })

  it('archiveRound by naopak opravené kolo vytáhl na první místo', () => {
    // Proto se na opravu používá updateArchivedRound: jinak by se rok stará
    // hra po opravě tvářila jako poslední odehraná.
    const [oldest] = seedArchive()

    archiveRound(oldest!)

    expect(loadArchive().map((r) => r.id)).toEqual(['round-a', 'round-c', 'round-b'])
  })
})
