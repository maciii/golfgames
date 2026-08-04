import { describe, expect, it } from 'vitest'
import { carryInto, skinExtraPoints, skinResults, skins } from './skins'
import { DEFAULT_GAME_OPTIONS } from '../types'
import { makeRound } from './fixtures'

import { beforeAll } from 'vitest'
import { setActiveLocale } from '../i18n'

// Tenhle test ověřuje konkrétní česká znění, takže si jazyk určuje sám -
// jinak by závisel na jazyce prostředí, ve kterém běží.
beforeAll(() => setActiveLocale('cs'))

/**
 * jamka 1: 4 / 4 / 5 -> shoda na nejnižším skóre, skin se přenáší
 * jamka 2: 3 / 5 / 5 -> Adam bere jamku i přenesený skin (2 skiny)
 * jamka 3: 5 / 5 / 5 -> shoda, skin se přenáší a na konci kola propadá
 */
function sampleRound() {
  return makeRound({
    gameId: 'skins',
    players: ['Adam', 'Bára', 'Cyril'],
    pars: [4, 4, 4],
    scores: [
      [4, 3, 5], // Adam
      [4, 5, 5], // Bára
      [5, 5, 5], // Cyril
    ],
  })
}

describe('Skins - rozdělení jamek', () => {
  it('při shodě nepřidělí skin a přenese ho dál', () => {
    const results = skinResults(sampleRound())

    expect(results[0]).toEqual({ hole: 0, winnerId: null, skins: 0, carry: 1 })
  })

  it('vítěz další jamky bere i přenesený skin', () => {
    const results = skinResults(sampleRound())

    expect(results[1]?.skins).toBe(2)
    expect(results[1]?.carry).toBe(0)
  })

  it('nerozdělené skiny na konci kola propadají', () => {
    const results = skinResults(sampleRound())

    expect(results[2]?.winnerId).toBe(null)
    expect(results[2]?.carry).toBe(1)
  })

  it('kdo jamku vzdal, o skin se ucházet nemůže', () => {
    const round = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      // Na druhé jamce Bára nedohrála, Adam ji tím pádem bere.
      scores: [
        [3, 4],
        [5, null],
      ],
    })

    expect(skinResults(round)[1]).toEqual({ hole: 1, winnerId: 'p1', skins: 1, carry: 0 })
  })

  it('na jamku, kam se nedošlo, se nic nerozděluje ani nepřenáší', () => {
    const round = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [3, null],
        [5, null],
      ],
    })

    expect(skinResults(round)[1]).toEqual({ hole: 1, winnerId: null, skins: 0, carry: 0 })
  })

  it('hlásí, kolik skinů se do jamky přenáší', () => {
    const round = sampleRound()

    expect(carryInto(round, 0)).toBe(0)
    expect(carryInto(round, 1)).toBe(1)
    expect(carryInto(round, 2)).toBe(0)
  })
})

describe('Skins - dvojnásobná devátá a osmnáctá', () => {
  /** Devítijamkové kolo; první jamka dělená, poslední bere Adam. */
  function closingHoleRound(doubleClosingHoles: boolean) {
    const middle = [null, null, null, null, null, null, null]
    return makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára'],
      pars: Array<number>(9).fill(4),
      scores: [
        [4, ...middle, 3],
        [4, ...middle, 5],
      ],
      settings: {
        pointValue: 10,
        options: { ...DEFAULT_GAME_OPTIONS, doubleClosingHoles },
      },
    })
  }

  it('poslední jamka je bez volby za jeden skin (plus přenesený)', () => {
    expect(skinResults(closingHoleRound(false))[8]?.skins).toBe(2)
  })

  it('se zapnutou volbou je poslední jamka za dva skiny (plus přenesený)', () => {
    expect(skinResults(closingHoleRound(true))[8]?.skins).toBe(3)
  })
})

describe('Skins - pořadí', () => {
  it('řadí podle počtu získaných skinů', () => {
    const rows = skins.computeStandings(sampleRound())[0]?.rows ?? []

    expect(rows.map((r) => [r.name, r.valueLabel])).toEqual([
      ['Adam', '2'],
      ['Bára', '0'],
      ['Cyril', '0'],
    ])
    expect(rows[1]?.position).toBe(2)
    expect(rows[2]?.position).toBe(2)
  })

  it('upozorní na skiny zbylé v banku', () => {
    const section = skins.computeStandings(sampleRound())[0]

    expect(section?.description).toContain('1')
  })

  it('označí vítěze skinu přímo u jeho výsledku', () => {
    const round = sampleRound()
    const cell = skins.scorecardPlayerCell?.(round, 'p1', 1)
    const carriedCell = skins.scorecardPlayerCell?.(round, 'p1', 0)

    expect(skins.scorecardColumns).toBeUndefined()
    expect(cell?.skin?.ariaLabel).toBe('Adam: 2 skiny')
    expect(carriedCell?.skin?.ariaLabel).toContain('přenesen')
  })

  it('označí všechny jamky, ze kterých vznikly tři skiny najednou', () => {
    const round = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára', 'Cyril'],
      pars: [4, 4, 4],
      scores: [
        [4, 4, 3],
        [4, 4, 4],
        [4, 4, 5],
      ],
    })

    expect(skinResults(round).map((result) => result.skins)).toEqual([0, 0, 3])
    expect(skins.scorecardPlayerCell?.(round, 'p1', 0)?.skin).toBeDefined()
    expect(skins.scorecardPlayerCell?.(round, 'p1', 1)?.skin).toBeDefined()
    expect(skins.scorecardPlayerCell?.(round, 'p1', 2)?.skin).toBeDefined()
    expect(skins.scorecardPlayerCell?.(round, 'p2', 0)?.skin).toBeUndefined()
  })

  it('jde hrát ve dvou až čtyřech a bez dvojic', () => {
    expect(skins.playerCounts).toEqual([2, 3, 4])
    expect(skins.usesTeams(4)).toBe(false)
  })

  it('deklaruje hráčské bonusy a nepoužívá Double Best', () => {
    expect(skins.scoringOptions.bonusScope).toBe('player')
    expect(skins.scoringOptions.doubleBest).toBe(false)
    expect(skins.scoringOptions.bonusIds).toContain('bunker')
  })
})

describe('Skins - extra body', () => {
  it('přičte extra body ke skóre hráče a zobrazí je ve scorekartě', () => {
    const round = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára', 'Cyril'],
      pars: [4],
      scores: [[3], [4], [5]],
    })
    round.bonuses.p1 = [['bunker']]

    expect(skinExtraPoints(round, 'p1', 0)).toBe(2)

    const rows = skins.computeStandings(round)[0]?.rows ?? []
    expect(rows[0]).toMatchObject({ value: 3, valueLabel: '3' })
    expect(rows[0]?.detail).toContain('Skiny 1 · Extra 2 b.')

    const cell = skins.scorecardPlayerCell?.(round, 'p1', 0)

    expect(skins.scorecardColumns).toBeUndefined()
    expect(cell?.suffix?.text).toBe('+2')
    expect(cell?.suffix?.ariaLabel).toBe('Adam: +2 extra body')
    expect(skins.scorecardPlayerTotal?.(round, 'p1')).toEqual({
      text: '1 + 2 = 3',
      ariaLabel: 'Adam: 1 skinů +2 extra bodů = 3 celkem',
    })
    expect(skins.scorecardPlayerTotal?.(round, 'p2')).toEqual({
      text: '0',
      ariaLabel: 'Bára: 0 skinů +0 extra bodů = 0 celkem',
    })
  })

  it('nepřidá značku do scorekarty jamky, na kterou se ještě nedošlo', () => {
    const round = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [4],
      scores: [[null], [null], [null], [null]],
    })

    expect(skins.scorecardPlayerCell?.(round, 'p1', 0)).toEqual({})
  })

  it('extra bod za bogey nepřidá', () => {
    const round = makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára'],
      pars: [4],
      scores: [[5], [4]],
    })
    round.bonuses.p1 = [['bunker']]

    expect(skinExtraPoints(round, 'p1', 0)).toBe(0)
  })
})
