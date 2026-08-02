import { describe, expect, it } from 'vitest'
import { formatHoleList, isHoleStarted, roundCompleteness } from './types'
import { makeRound } from './games/fixtures'

describe('Rozehraná jamka', () => {
  const round = makeRound({
    gameId: 'skins',
    players: ['Adam', 'Bára'],
    pars: [4, 4, 4],
    scores: [
      [4, 4, null],
      [5, null, null],
    ],
  })

  it('je rozehraná, jakmile na ní někdo zapsal', () => {
    expect(isHoleStarted(round, 0)).toBe(true)
    expect(isHoleStarted(round, 1)).toBe(true)
    expect(isHoleStarted(round, 2)).toBe(false)
  })

  it('rozliší vzdané jamky od těch, kam se nedošlo', () => {
    expect(roundCompleteness(round)).toEqual({
      conceded: [2],
      unplayed: [3],
      complete: false,
    })
  })

  it('kompletní kolo nehlásí nic', () => {
    const full = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, 4],
        [5, 5],
      ],
    })

    expect(roundCompleteness(full).complete).toBe(true)
  })
})

describe('Výpis jamek', () => {
  it('zkrátí souvislý úsek na rozsah', () => {
    expect(formatHoleList([6, 7, 8, 9, 10])).toBe('6–10')
  })

  it('kombinuje jednotlivé jamky i rozsahy', () => {
    expect(formatHoleList([1, 3, 6, 7, 8, 12])).toBe('1, 3, 6–8, 12')
  })

  it('dvojici nechá vypsanou, rozsah se vyplatí až od tří', () => {
    expect(formatHoleList([4, 5])).toBe('4, 5')
  })

  it('prázdný seznam je prázdný řetězec', () => {
    expect(formatHoleList([])).toBe('')
  })
})
