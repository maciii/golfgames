import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyRoundGame,
  pairingIndexOf,
  pairingLabel,
  pairingTeamIndices,
} from './roundSetup'
import { makeRound } from './games/fixtures'
import { DEFAULT_GAME_OPTIONS } from './types'
import { setActiveLocale } from './i18n'
import type { Round } from './types'

beforeAll(() => setActiveLocale('cs'))

/** Rozehrané kolo čtyř hráčů se zapsanými dvěma jamkami. */
function startedRound(gameId = 'best-aggregate'): Round {
  return makeRound({
    gameId,
    players: ['Adam', 'Bára', 'Cyril', 'Dana'],
    teams: [
      [0, 1],
      [2, 3],
    ],
    pars: [4, 4, 4],
    scores: [
      [4, 5, null],
      [5, 4, null],
      [4, 4, null],
      [6, 5, null],
    ],
  })
}

describe('Dvojice v kole', () => {
  it('u čtyř hráčů nabízí tři rozdělení', () => {
    expect(pairingTeamIndices(4, 0)).toEqual([
      [0, 1],
      [2, 3],
    ])
    expect(pairingTeamIndices(4, 2)).toEqual([
      [0, 3],
      [1, 2],
    ])
  })

  it('mimo rozsah spadne na první rozdělení', () => {
    expect(pairingTeamIndices(4, 7)).toEqual(pairingTeamIndices(4, 0))
  })

  it('míň hráčů žádné dělení nemá', () => {
    expect(pairingTeamIndices(2, 1)).toEqual([[0, 1]])
  })

  it('z kola přečte, které rozdělení se hraje', () => {
    const round = startedRound()
    expect(pairingIndexOf(round)).toBe(0)

    const changed = applyRoundGame(round, round.gameId, 2, DEFAULT_GAME_OPTIONS)
    expect(pairingIndexOf(changed)).toBe(2)
  })

  it('popisek dvojic pojmenuje partnery, u dvou jamkovek soupeře', () => {
    const names = ['Adam', 'Bára', 'Cyril', 'Dana']

    expect(pairingLabel('best-aggregate', names, 1)).toBe('Adam + Cyril vs Bára + Dana')
    expect(pairingLabel('singles-matches', names, 0)).toBe(
      'Adam vs. Bára · Cyril vs. Dana',
    )
  })

  it('chybějící jméno zastoupí číslo hráče', () => {
    expect(pairingLabel('best-aggregate', ['Adam', '', 'Cyril', ' '], 0)).toBe(
      'Adam + Hráč 2 vs Cyril + Hráč 4',
    )
  })
})

describe('Změna nastavení rozehraného kola', () => {
  it('nová dvojice přepíše soupeře, ale nesmaže jedinou ránu', () => {
    const round = startedRound()
    const changed = applyRoundGame(round, round.gameId, 1, DEFAULT_GAME_OPTIONS)

    expect(changed.teams.map((team) => team.playerIds)).toEqual([
      ['p1', 'p3'],
      ['p2', 'p4'],
    ])
    // Nepřekročitelné pravidlo: zapsané skóre se nikdy nemaže.
    expect(changed.scores).toEqual(round.scores)
    expect(changed.bonuses).toEqual(round.bonuses)
    expect(changed.pars).toEqual(round.pars)
    expect(changed.holeCount).toBe(round.holeCount)
    expect(changed.id).toBe(round.id)
    expect(changed.createdAt).toBe(round.createdAt)
  })

  it('změna hry drží skóre a přepíše jen pravidla', () => {
    const round = startedRound()
    const changed = applyRoundGame(round, 'match-play', 0, DEFAULT_GAME_OPTIONS)

    expect(changed.gameId).toBe('match-play')
    expect(changed.scores).toEqual(round.scores)
  })

  it('hra jednotlivců dvojice zruší, ať se nekreslí prázdné bloky', () => {
    const changed = applyRoundGame(startedRound(), 'skins', 0, DEFAULT_GAME_OPTIONS)

    expect(changed.teams).toEqual([])
  })

  it('zpátky u týmové hry se dvojice postaví znovu', () => {
    const individual = applyRoundGame(startedRound(), 'skins', 0, DEFAULT_GAME_OPTIONS)
    const teamed = applyRoundGame(individual, 'best-aggregate', 2, DEFAULT_GAME_OPTIONS)

    expect(teamed.teams.map((team) => team.playerIds)).toEqual([
      ['p1', 'p4'],
      ['p2', 'p3'],
    ])
  })

  it('stejná hra i dvojice nechá kolo být', () => {
    const round = startedRound()

    expect(applyRoundGame(round, round.gameId, 0, DEFAULT_GAME_OPTIONS)).toBe(round)
  })

  it('nová hra si vezme své nastavení bodování, sázku nechá', () => {
    const round = startedRound()
    round.settings.pointValue = 25
    round.settings.currency = 'EUR'
    const changed = applyRoundGame(round, 'match-play', 0, {
      ...DEFAULT_GAME_OPTIONS,
      doubleBest: 3,
    })

    expect(changed.settings.pointValue).toBe(25)
    expect(changed.settings.currency).toBe('EUR')
    expect(changed.settings.options.doubleBest).toBe(3)
    // Match play se hraje na jamky, takže dvojnásobná 9. a 18. nemá co dělat.
    expect(changed.settings.options.doubleClosingHoles).toBe(false)
  })

  it('nastavení kola je vlastní kopie, ne odkaz na předvolby', () => {
    const options = { ...DEFAULT_GAME_OPTIONS }
    const changed = applyRoundGame(startedRound(), 'skins', 0, options)

    expect(changed.settings.options.bonusValues).not.toBe(options.bonusValues)
    expect(changed.settings.options.resultMultipliers).not.toBe(options.resultMultipliers)
  })

  it('změna zvedne čas úpravy, ať ji synchronizace pošle dál', () => {
    const round = startedRound()
    round.updatedAt = '2020-01-01T00:00:00.000Z'
    const changed = applyRoundGame(round, round.gameId, 1, DEFAULT_GAME_OPTIONS)

    expect(changed.updatedAt).not.toBe(round.updatedAt)
  })
})
