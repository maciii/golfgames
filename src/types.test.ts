import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAME_OPTIONS,
  exclusiveBonusOutcome,
  formatHoleList,
  isHoleStarted,
  roundCompleteness,
} from './types'
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

/**
 * Komu na jamce připadne Longest / Nearest. Řídí barvu značky u jména při
 * zápisu; samotné body počítá hra (viz bestAggregate.test.ts).
 *
 * Jamka je par 4; Adam ji zahraje podle testu, ostatní na par.
 */
describe('Přidělení Longest a Nearest', () => {
  function roundWith(adamScore: number | null, confirm: boolean) {
    return makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [4],
      scores: [[adamScore], [4], [4], [4]],
      teams: [
        [0, 1],
        [2, 3],
      ],
      settings: {
        options: {
          ...DEFAULT_GAME_OPTIONS,
          confirmLongest: confirm,
          confirmNearest: confirm,
        },
      },
    })
  }

  it('bez potvrzování zůstává bonus vždy vlastní dvojici', () => {
    const round = roundWith(6, false)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('own')
  })

  it('s potvrzováním zůstává při paru vlastní dvojici', () => {
    const round = roundWith(4, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('own')
  })

  it('s potvrzováním zůstává i při lepším výsledku', () => {
    const round = roundWith(3, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('own')
  })

  it('s potvrzováním propadá soupeřům při horším než par', () => {
    const round = roundWith(5, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('opponent')
  })

  it('dokud hráč jamku nezapsal, není rozhodnuto', () => {
    const round = roundWith(null, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('pending')
  })

  it('Longest a Nearest se řídí každý vlastním přepínačem', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [4],
      scores: [[5], [4], [4], [4]],
      teams: [
        [0, 1],
        [2, 3],
      ],
      settings: {
        options: {
          ...DEFAULT_GAME_OPTIONS,
          confirmLongest: true,
          confirmNearest: false,
        },
      },
    })

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('opponent')
    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('own')
  })
})
