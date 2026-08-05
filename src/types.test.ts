import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAME_OPTIONS,
  bonusesAt,
  createRound,
  exclusiveBonusOutcome,
  formatHoleList,
  isHoleStarted,
  parAt,
  roundCompleteness,
  setHolePar,
  toggleBonus,
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

describe('HCP v kole', () => {
  it('uchová HCP hráčů i mimo Stableford', () => {
    const round = createRound({
      gameId: 'match-play',
      playerNames: ['Adam', 'Bára'],
      holeCount: 18,
      handicapIndexes: [12.4, 7.8],
      playingHandicaps: [14, 9],
      netScoring: true,
    })

    expect(round.netScoring).toBe(true)
    expect(round.players).toEqual([
      expect.objectContaining({
        name: 'Adam',
        handicapIndex: 12.4,
        playingHandicap: 14,
      }),
      expect.objectContaining({
        name: 'Bára',
        handicapIndex: 7.8,
        playingHandicap: 9,
      }),
    ])
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

/**
 * Par jde opravit i dodatečně, klidně až po zápisu extra bodů. Longest patří
 * jen na pětiparovou jamku a Nearest na tříparovou, takže změna paru je musí
 * zahodit - jinak by se počítaly tam, kde je vůbec nejde zvolit.
 *
 * Kolo: tři jamky (par 5, 3, 4), čtyři hráči ve dvou dvojicích.
 */
describe('Změna paru jamky', () => {
  function roundWithBonuses() {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [5, 3, 4],
      scores: [
        [5, 3, 4],
        [5, 3, 4],
        [5, 3, 4],
        [5, 3, 4],
      ],
      teams: [
        [0, 1],
        [2, 3],
      ],
    })
    // Adam má Longest na pětiparové a Nearest na tříparové jamce, k tomu
    // bunker, který na paru nezávisí.
    const withLongest = toggleBonus(round, 'p1', 0, 'longest')
    const withBunker = toggleBonus(withLongest, 'p1', 0, 'bunker')
    return toggleBonus(withBunker, 'p1', 1, 'nearest')
  }

  it('z pětiparové jamky zmizí Longest', () => {
    const next = setHolePar(roundWithBonuses(), 0, 4)

    expect(bonusesAt(next, 'p1', 0)).not.toContain('longest')
  })

  it('z tříparové jamky zmizí Nearest', () => {
    const next = setHolePar(roundWithBonuses(), 1, 4)

    expect(bonusesAt(next, 'p1', 1)).not.toContain('nearest')
  })

  it('bonusy nezávislé na paru zůstávají', () => {
    const next = setHolePar(roundWithBonuses(), 0, 4)

    expect(bonusesAt(next, 'p1', 0)).toEqual(['bunker'])
  })

  it('ostatní jamky změna paru neovlivní', () => {
    const next = setHolePar(roundWithBonuses(), 0, 4)

    expect(bonusesAt(next, 'p1', 1)).toContain('nearest')
  })

  it('při návratu na původní par se bonus sám neobnoví', () => {
    const next = setHolePar(setHolePar(roundWithBonuses(), 0, 4), 0, 5)

    expect(bonusesAt(next, 'p1', 0)).toEqual(['bunker'])
  })

  it('nový par se zapíše', () => {
    const next = setHolePar(roundWithBonuses(), 0, 3)

    expect(parAt(next, 0)).toBe(3)
  })

  it('bonus vázaný na nový par zůstane', () => {
    // Pětiparová jamka se opraví na tříparovou; Nearest by na ní obstál,
    // Longest ne.
    const round = toggleBonus(roundWithBonuses(), 'p2', 0, 'longest')
    const next = setHolePar(round, 0, 3)

    expect(bonusesAt(next, 'p2', 0)).toEqual([])
    expect(bonusesAt(next, 'p1', 0)).toEqual(['bunker'])
  })
})
