import { describe, expect, it } from 'vitest'
import { carryInto, skinResults, skins } from './skins'
import { DEFAULT_GAME_OPTIONS } from '../types'
import { makeRound } from './fixtures'

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

  it('má ve scorekartě sloupec s rozdanými skiny', () => {
    const round = sampleRound()
    const [column] = skins.scorecardColumns?.(round) ?? []

    expect(column?.label).toBe('Skin')
    expect(column?.cell(round, 0)).toBe('') // dělená jamka
    expect(column?.cell(round, 1)).toBe('2') // včetně přeneseného skinu
    expect(column?.total(round)).toBe('2')
  })

  it('jde hrát ve dvou až čtyřech a bez dvojic', () => {
    expect(skins.playerCounts).toEqual([2, 3, 4])
    expect(skins.usesTeams(4)).toBe(false)
  })
})
