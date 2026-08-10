import { beforeEach, describe, expect, it } from 'vitest'
import { addToRoster, loadRoster, setRosterTee } from './storage'

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
