import { beforeAll, describe, expect, it } from 'vitest'
import {
  SIDE_BET_BONUSES,
  hasSideBets,
  holeSideBetPoints,
  sideBetSection,
  sideBetTotal,
  withSideBets,
} from './sideBets'
import { makeRound } from './fixtures'
import { GAMES } from './index'
import { DEFAULT_GAME_OPTIONS, toggleBonus } from '../types'
import { setActiveLocale } from '../i18n'
import type { BonusId, Round } from '../types'

beforeAll(() => setActiveLocale('cs'))

/**
 * Extra body jako vedlejší sázka: platí u her, které si je nepočítají do
 * svých bodů (jamkovka, Stableford, Dots). Pravidla hodnoty jsou stejná jako
 * u ostatních her - hodnota za par, násobič za lepší výsledek, nic za bogey.
 */

/** Kolo dvou hráčů se zvolenými hodnotami extra bodů. */
function betRound(
  values: Partial<Record<BonusId, number>>,
  scores: (number | null)[][] = [
    [4, 5],
    [4, 5],
  ],
): Round {
  const round = makeRound({
    gameId: 'match-play',
    players: ['Adam', 'Bára'],
    pars: [4, 5],
    scores,
  })
  round.settings.pointValue = 10
  round.settings.options = {
    ...DEFAULT_GAME_OPTIONS,
    bonusValues: {
      ...(Object.fromEntries(SIDE_BET_BONUSES.map((id) => [id, 0])) as Record<
        BonusId,
        number
      >),
      double: 0,
      ...values,
    },
  }
  return round
}

describe('Vedlejší sázka - jestli se o ni hraje', () => {
  it('nulové hodnoty znamenají, že se o extra body nehraje', () => {
    expect(hasSideBets(betRound({}))).toBe(false)
  })

  it('stačí jedna zadaná hodnota', () => {
    expect(hasSideBets(betRound({ bunker: 5 }))).toBe(true)
  })

  it('bez sázky není tabulka extra bodů', () => {
    const round = betRound({})
    const sides = [{ id: 'p1', name: 'Adam', playerIds: ['p1'] }]

    expect(sideBetSection(round, sides)).toBeNull()
  })
})

describe('Vedlejší sázka - hodnota bodu na jamce', () => {
  it('za par platí zadaná hodnota', () => {
    const round = toggleBonus(betRound({ bunker: 5 }), 'p1', 0, 'bunker')

    expect(holeSideBetPoints(round, 'p1', 0)).toBe(5)
  })

  it('za birdie se hodnota znásobí podle nastavení hry', () => {
    const round = toggleBonus(
      betRound({ bunker: 5 }, [
        [3, 5],
        [4, 5],
      ]),
      'p1',
      0,
      'bunker',
    )

    // Birdie má výchozí násobič 2.
    expect(holeSideBetPoints(round, 'p1', 0)).toBe(10)
  })

  it('při bogey a horším se nepočítá nic', () => {
    const round = toggleBonus(
      betRound({ bunker: 5 }, [
        [5, 5],
        [4, 5],
      ]),
      'p1',
      0,
      'bunker',
    )

    expect(holeSideBetPoints(round, 'p1', 0)).toBe(0)
  })

  it('vypnutý extra bod nedá nic, i když je zapsaný', () => {
    // Hodnota se dá stáhnout na nulu i po zápisu bonusu.
    const round = toggleBonus(betRound({ bunker: 0 }), 'p1', 0, 'bunker')

    expect(holeSideBetPoints(round, 'p1', 0)).toBe(0)
  })

  it('nepotvrzený Longest propadá, nedostane ho nikdo', () => {
    // Longest je jen na pětiparové jamce; druhá jamka je par 5 a Adam ji
    // zahrál na bogey, takže s potvrzováním bod nemá.
    const round = toggleBonus(
      betRound({ longest: 20 }, [
        [4, 6],
        [4, 5],
      ]),
      'p1',
      1,
      'longest',
    )

    expect(round.settings.options.confirmLongest).toBe(true)
    expect(holeSideBetPoints(round, 'p1', 1)).toBe(0)
    expect(holeSideBetPoints(round, 'p2', 1)).toBe(0)
  })

  it('potvrzený Longest se nenásobí za birdie', () => {
    const round = toggleBonus(betRound({ longest: 20 }), 'p1', 1, 'longest')

    expect(holeSideBetPoints(round, 'p1', 1)).toBe(20)
  })
})

describe('Vedlejší sázka - součty a peníze', () => {
  /** Adam má bunker na první jamce a barkie na druhé. */
  function scoredRound(): Round {
    let round = betRound({ bunker: 5, barkie: 3 })
    round = toggleBonus(round, 'p1', 0, 'bunker')
    round = toggleBonus(round, 'p1', 1, 'barkie')
    return round
  }

  it('sčítá body za celé kolo', () => {
    expect(sideBetTotal(scoredRound(), ['p1'])).toBe(8)
    expect(sideBetTotal(scoredRound(), ['p2'])).toBe(0)
  })

  it('u dvojice se sčítají body obou partnerů', () => {
    const round = toggleBonus(scoredRound(), 'p2', 0, 'bunker')

    expect(sideBetTotal(round, ['p1', 'p2'])).toBe(13)
  })

  it('do peněz se extra body přidají k jednotkám hry', () => {
    const round = scoredRound()
    const parties = withSideBets(round, [
      { id: 'p1', name: 'Adam', playerIds: ['p1'], units: 1 },
      { id: 'p2', name: 'Bára', playerIds: ['p2'], units: 0 },
    ])

    expect(parties).toEqual([
      { id: 'p1', name: 'Adam', units: 9 },
      { id: 'p2', name: 'Bára', units: 0 },
    ])
  })

  it('tabulka drží pořadí podle extra bodů', () => {
    const section = sideBetSection(scoredRound(), [
      { id: 'p1', name: 'Adam', playerIds: ['p1'] },
      { id: 'p2', name: 'Bára', playerIds: ['p2'] },
    ])

    expect(section?.title).toBe('Extra body')
    expect(section?.rows.map((row) => [row.name, row.valueLabel])).toEqual([
      ['Adam', '8 b.'],
      ['Bára', '0 b.'],
    ])
  })
})

describe('Vedlejší sázka - napříč hrami', () => {
  it('o extra body jde hrát v každé hře', () => {
    const without = GAMES.filter((game) => game.scoringOptions.bonusIds.length === 0)

    expect(without.map((game) => game.id)).toEqual([])
  })

  it('hra s vedlejší sázkou musí dodat strany vyrovnání sama', () => {
    // Do hlavní tabulky se extra body přičíst nedají (drží pořadí podle
    // pravidel hry), takže bez `settlementParties()` by se nedostaly do peněz.
    for (const game of GAMES) {
      if (!game.scoringOptions.bonusesAsSideBet) continue
      expect(typeof game.settlementParties, game.id).toBe('function')
    }
  })

  it('hra, která si extra body počítá do bodů, sázku nedeklaruje', () => {
    const folded = ['best-aggregate', 'left-right', 'skins']

    for (const id of folded) {
      const game = GAMES.find((entry) => entry.id === id)
      expect(game?.scoringOptions.bonusesAsSideBet, id).toBeUndefined()
    }
  })
})

describe('Vedlejší sázka - volba Uplatňovat HCP', () => {
  /** Netto kolo, kde Adam dostává na první jamce ránu a zahraje par jamky. */
  function netRound(withHandicap: boolean): Round {
    const round = betRound({ bunker: 5 })
    round.netScoring = true
    round.course = { name: 'Testovací hřiště', strokeIndex: [1, 2] }
    round.players[0]!.playingHandicap = 1
    round.settings.options = {
      ...round.settings.options,
      multipliersWithHandicap: withHandicap,
    }
    return toggleBonus(round, 'p1', 0, 'bunker')
  }

  it('vypnutá volba platí jen za skutečné birdie', () => {
    expect(holeSideBetPoints(netRound(false), 'p1', 0)).toBe(5)
  })

  it('zapnutá volba znásobí bod za netto birdie', () => {
    expect(holeSideBetPoints(netRound(true), 'p1', 0)).toBe(10)
  })
})
