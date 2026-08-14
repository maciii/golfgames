import { beforeAll, describe, expect, it } from 'vitest'
import { setActiveLocale } from '../i18n'
import { DEFAULT_GAME_OPTIONS } from '../types'
import { makeRound } from './fixtures'
import {
  isPairingComplete,
  leftRight,
  setHoleSide,
  teamsForHole,
  totalPlayerPoints,
} from './leftRight'

beforeAll(() => setActiveLocale('cs'))

const BASE_OPTIONS = {
  ...DEFAULT_GAME_OPTIONS,
  doubleBest: 0,
  doubleClosingHoles: false,
}

type Assignment = readonly [string, 'left' | 'right']

function roundWithPairings(
  scores: (number | null)[][],
  assignments: readonly Assignment[][],
  pars = [4],
) {
  let round = makeRound({
    gameId: 'left-right',
    players: ['Adam', 'Alena', 'Bára', 'Bořek'],
    pars,
    scores: Array.from({ length: 4 }, () => Array<number | null>(pars.length).fill(null)),
    settings: { options: BASE_OPTIONS },
  })

  for (const [hole, players] of assignments.entries()) {
    if (hole >= pars.length) break
    for (const [playerId, side] of players) {
      round = setHoleSide(round, hole, playerId, side)
    }
  }
  scores.forEach((playerScores, index) => {
    round.scores[`p${index + 1}`] = [...playerScores]
  })
  return round
}

function pairedRound(scores: (number | null)[][], pars = [4]) {
  return roundWithPairings(
    scores,
    pars.map(
      () =>
        [
          ['p1', 'left'],
          ['p2', 'left'],
          ['p3', 'right'],
          ['p4', 'right'],
        ] as const,
    ),
    pars,
  )
}

describe('Levá-Pravá - příprava jamky', () => {
  it('vyžaduje čtyři hráče a dvě dvojice na každé jamce', () => {
    expect(leftRight.playerCounts).toEqual([4])
    expect(leftRight.usesTeams(4)).toBe(false)

    const round = makeRound({
      gameId: 'left-right',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      pars: [4],
      scores: [[null], [null], [null], [null]],
    })

    expect(isPairingComplete(round, 0)).toBe(false)
    expect(teamsForHole(round, 0)).toEqual([])
    expect(leftRight.holeSetup?.(round, 0).complete).toBe(false)
  })

  it('nabídne tři hotové dvojice a jedním výběrem připraví celou jamku', () => {
    const round = makeRound({
      gameId: 'left-right',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      pars: [4],
      scores: [[null], [null], [null], [null]],
    })
    const setup = leftRight.holeSetup?.(round, 0)

    expect(setup?.choices?.map((choice) => choice.pairing)).toEqual([
      { left: 'Adam + Alena', right: 'Bára + Bořek' },
      { left: 'Adam + Bára', right: 'Alena + Bořek' },
      { left: 'Adam + Bořek', right: 'Alena + Bára' },
    ])
    expect(setup?.choices?.map((choice) => choice.label)).toEqual([
      'Adam + Alena vs Bára + Bořek',
      'Adam + Bára vs Alena + Bořek',
      'Adam + Bořek vs Alena + Bára',
    ])

    const selected = leftRight.setHoleSetup?.(round, 0, {
      kind: 'choice',
      choiceId: '13-24',
    })
    expect(selected).toBeDefined()
    expect(teamsForHole(selected!, 0).map((team) => team.playerIds)).toEqual([
      ['p1', 'p3'],
      ['p2', 'p4'],
    ])
    expect(leftRight.holeSetup?.(selected!, 0)).toMatchObject({
      complete: true,
      choices: [
        { id: '12-34', selected: false },
        { id: '13-24', selected: true },
        { id: '14-23', selected: false },
      ],
    })
  })

  it('uloží nové složení dvojic zvlášť pro každou jamku', () => {
    const round = roundWithPairings(
      [
        [4, 3],
        [5, 4],
        [3, 5],
        [5, 4],
      ],
      [
        [
          ['p1', 'left'],
          ['p2', 'left'],
          ['p3', 'right'],
          ['p4', 'right'],
        ],
        [
          ['p1', 'left'],
          ['p3', 'left'],
          ['p2', 'right'],
          ['p4', 'right'],
        ],
      ],
      [4, 4],
    )

    expect(teamsForHole(round, 0).map((team) => team.playerIds)).toEqual([
      ['p1', 'p2'],
      ['p3', 'p4'],
    ])
    expect(teamsForHole(round, 1).map((team) => team.playerIds)).toEqual([
      ['p1', 'p3'],
      ['p2', 'p4'],
    ])
    expect(round.holePairings).toMatchObject({
      '0': { p1: 'left', p2: 'left', p3: 'right', p4: 'right' },
      '1': { p1: 'left', p3: 'left', p2: 'right', p4: 'right' },
    })
  })

  it('změna dvojice po zápisu zachová skóre a přepočítá body jamky', () => {
    const round = pairedRound([[4], [5], [3], [5]])
    round.bonuses.p1 = [['bunker']]

    const changed = leftRight.setHoleSetup?.(round, 0, {
      kind: 'choice',
      choiceId: '13-24',
    })

    expect(changed?.scores).toEqual(round.scores)
    expect(changed?.bonuses).toEqual(round.bonuses)
    expect(totalPlayerPoints(changed!, 'p1')).toBe(4)
    expect(totalPlayerPoints(changed!, 'p2')).toBe(0)
    expect(totalPlayerPoints(changed!, 'p3')).toBe(4)
    expect(totalPlayerPoints(changed!, 'p4')).toBe(0)
  })
})

describe('Levá-Pravá - body', () => {
  it('připíše body dvojice oběma hráčům zvlášť', () => {
    const round = pairedRound([[4], [5], [3], [5]])

    // Pravá dvojice má lepší míč, nižší součet a Bára birdie.
    expect(totalPlayerPoints(round, 'p1')).toBe(0)
    expect(totalPlayerPoints(round, 'p2')).toBe(0)
    expect(totalPlayerPoints(round, 'p3')).toBe(3)
    expect(totalPlayerPoints(round, 'p4')).toBe(3)
  })

  it('použije pro dynamické dvojice stejné netto výpočty jako Best + Součet', () => {
    function netRound(multipliersWithHandicap: boolean) {
      const round = pairedRound([[5], [5], [4], [4]])
      round.netScoring = true
      round.course = { name: 'Testovací hřiště', strokeIndex: [1] }
      round.players[0]!.playingHandicap = 3
      round.players[1]!.playingHandicap = 3
      round.settings.options = { ...round.settings.options, multipliersWithHandicap }
      return round
    }

    // Kdo jamku vyhrál, se počítá netto: levá dvojice má BEST i Součet.
    expect(totalPlayerPoints(netRound(false), 'p1')).toBe(2)
    expect(totalPlayerPoints(netRound(false), 'p3')).toBe(0)

    // Netto eagle se přizná až s volbou Uplatňovat HCP: 2 × eagle navíc.
    expect(totalPlayerPoints(netRound(true), 'p1')).toBe(8)
    expect(totalPlayerPoints(netRound(true), 'p2')).toBe(8)
    expect(totalPlayerPoints(netRound(true), 'p3')).toBe(0)
  })

  it('změna dvojic mezi jamkami změní i adresáta bodů', () => {
    const round = roundWithPairings(
      [
        [4, 3],
        [5, 4],
        [3, 4],
        [5, 4],
      ],
      [
        [
          ['p1', 'left'],
          ['p2', 'left'],
          ['p3', 'right'],
          ['p4', 'right'],
        ],
        [
          ['p1', 'left'],
          ['p3', 'left'],
          ['p2', 'right'],
          ['p4', 'right'],
        ],
      ],
      [4, 4],
    )
    // Druhá jamka má nové složení: levá = Adam + Bára, pravá = Alena + Bořek.
    const changed = round

    expect(totalPlayerPoints(changed, 'p1')).toBe(3)
    expect(totalPlayerPoints(changed, 'p2')).toBe(0)
    expect(totalPlayerPoints(changed, 'p3')).toBe(6)
    expect(totalPlayerPoints(changed, 'p4')).toBe(3)
  })

  it('řadí čtyři hráče podle jejich osobního součtu bodů', () => {
    const round = pairedRound([[4], [5], [3], [5]])
    const rows = leftRight.computeStandings(round)[0]?.rows ?? []

    expect(rows.map((row) => [row.name, row.valueLabel, row.position])).toEqual([
      ['Bára', '3 b.', 1],
      ['Bořek', '3 b.', 1],
      ['Adam', '0 b.', 3],
      ['Alena', '0 b.', 3],
    ])
  })

  it('přidá bodovací sloupec každému hráči', () => {
    const round = pairedRound([[4], [5], [3], [5]])
    const columns = leftRight.scorecardColumns?.(round) ?? []

    expect(columns.map((column) => column.afterPlayerId)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ])
    expect(columns.map((column) => column.cell(round, 0))).toEqual(['0', '0', '3', '3'])
    expect(columns.map((column) => column.total(round))).toEqual(['0', '0', '3', '3'])
  })

  it('označí ve scorekartě první dvojici barevným rámečkem', () => {
    const round = pairedRound([[4], [5], [3], [5]])
    const firstPair = leftRight.scorecardPlayerCell?.(round, 'p1', 0)
    const secondPair = leftRight.scorecardPlayerCell?.(round, 'p3', 0)

    expect(firstPair?.pairing?.ariaLabel).toBe('Dvojice: Adam + Alena')
    expect(secondPair?.pairing).toBeUndefined()

    const changed = leftRight.setHoleSetup?.(round, 0, {
      kind: 'choice',
      choiceId: '13-24',
    })
    expect(leftRight.scorecardPlayerCell?.(changed!, 'p1', 0)?.pairing?.ariaLabel).toBe(
      'Dvojice: Adam + Bára',
    )
    expect(leftRight.scorecardPlayerCell?.(changed!, 'p2', 0)?.pairing).toBeUndefined()
  })

  it('má bodovací sloupec stejného hráče ve stejné označené dvojici', () => {
    const round = pairedRound([[4], [5], [3], [5]])
    const columns = leftRight.scorecardColumns?.(round) ?? []

    expect(columns.map((column) => column.afterPlayerId)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ])
    expect(
      columns
        .slice(0, 2)
        .map(
          (column) =>
            leftRight.scorecardPlayerCell?.(round, column.afterPlayerId!, 0).pairing,
        ),
    ).toEqual([
      { ariaLabel: 'Dvojice: Adam + Alena' },
      { ariaLabel: 'Dvojice: Adam + Alena' },
    ])
    expect(
      columns
        .slice(2)
        .map(
          (column) =>
            leftRight.scorecardPlayerCell?.(round, column.afterPlayerId!, 0).pairing,
        ),
    ).toEqual([undefined, undefined])
  })
})
