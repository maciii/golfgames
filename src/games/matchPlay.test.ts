import { describe, expect, it } from 'vitest'
import { matchPlay, matchState } from './matchPlay'
import { makeRound } from './fixtures'

describe('Match play - souboj jednotlivců', () => {
  /**
   * jamka 1: Adam 4, Bára 5 -> Adam 1 nahoru
   * jamka 2: 4 / 4         -> dělená
   * jamka 3: Adam 3, Bára 5 -> Adam 2 nahoru
   * jamka 4: nezapsaná      -> zbývá jedna jamka
   */
  const round = makeRound({
    gameId: 'match-play',
    players: ['Adam', 'Bára'],
    pars: [4, 4, 4, 4],
    scores: [
      [4, 4, 3, null],
      [5, 4, 5, null],
    ],
  })

  it('počítá vyhrané a dělené jamky', () => {
    const state = matchState(round)

    expect(state.won).toEqual([2, 0])
    expect(state.halved).toBe(1)
    expect(state.remaining).toBe(1)
  })

  it('pozná rozhodnutý zápas a zapíše ho golfovou notací', () => {
    const state = matchState(round)

    // Náskok 2 je větší než jedna zbývající jamka.
    expect(state.decided).toBe(true)
    expect(state.label).toBe('Adam vyhrává 2&1')
  })

  it('ukazuje stav z pohledu obou stran', () => {
    const rows = matchPlay.computeStandings(round)[0]?.rows ?? []

    expect(rows.map((r) => [r.name, r.valueLabel])).toEqual([
      ['Adam', '2 UP'],
      ['Bára', '2 DOWN'],
    ])
  })

  it('nerozhodnutý stav hlásí jako AS', () => {
    const level = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, 5],
        [5, 4],
      ],
    })
    const rows = matchPlay.computeStandings(level)[0]?.rows ?? []

    expect(rows.every((r) => r.valueLabel === 'AS')).toBe(true)
  })

  it('rozpozná dormie, když se náskok rovná zbývajícím jamkám', () => {
    const dormie = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, null],
        [5, null],
      ],
    })

    expect(matchState(dormie).label).toContain('dormie')
  })
})

describe('Match play - vzdané jamky', () => {
  it('kdo jamku vzdal, ji prohrává', () => {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      // Na druhé jamce Bára nedohrála.
      scores: [
        [4, 5],
        [5, null],
      ],
    })

    expect(matchState(round).won).toEqual([2, 0])
  })

  it('jamka, kam se nedošlo, stav nemění', () => {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, null],
        [5, null],
      ],
    })
    const state = matchState(round)

    expect(state.won).toEqual([1, 0])
    expect(state.remaining).toBe(1)
  })
})

describe('Match play - four-ball dvojic', () => {
  /**
   * Za dvojici hraje lepší míč:
   * jamka 1: A 4/6 -> 4, B 5/5 -> 5  => dvojice A bere jamku
   * jamka 2: A 5/5 -> 5, B 3/7 -> 3  => dvojice B bere jamku
   */
  const round = makeRound({
    gameId: 'match-play',
    players: ['Adam', 'Alena', 'Bára', 'Bořek'],
    teams: [
      [0, 1],
      [2, 3],
    ],
    pars: [4, 4],
    scores: [
      [4, 5],
      [6, 5],
      [5, 3],
      [5, 7],
    ],
  })

  it('porovnává lepší míče dvojic', () => {
    const state = matchState(round)

    expect(state.won).toEqual([1, 1])
    expect(state.leaderIndex).toBe(null)
  })

  it('pojmenuje strany podle dvojic', () => {
    const rows = matchPlay.computeStandings(round)[0]?.rows ?? []

    expect(rows.map((r) => r.name).sort()).toEqual(['Adam + Alena', 'Bára + Bořek'])
  })

  it('ve dvou hraje jednotlivce, ve čtyřech dvojice', () => {
    expect(matchPlay.playerCounts).toEqual([2, 4])
    expect(matchPlay.usesTeams(2)).toBe(false)
    expect(matchPlay.usesTeams(4)).toBe(true)
  })
})
