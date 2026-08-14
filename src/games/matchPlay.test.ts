import { describe, expect, it } from 'vitest'
import { SIDE_BET_BONUSES } from './sideBets'
import { matchPlay, matchState } from './matchPlay'
import { makeRound } from './fixtures'
import { settleRound } from '../money'
import { toggleBonus } from '../types'
import type { Round } from '../types'

import { beforeAll } from 'vitest'
import { setActiveLocale } from '../i18n'

// Tenhle test ověřuje konkrétní česká znění, takže si jazyk určuje sám -
// jinak by závisel na jazyce prostředí, ve kterém běží.
beforeAll(() => setActiveLocale('cs'))

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

  it('po rozhodnutí zápasu už další jamky do výsledku nepočítá', () => {
    const afterDecision = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4, 4, 4],
      scores: [
        [4, 4, 4, 10],
        [5, 5, 5, 1],
      ],
    })

    const state = matchState(afterDecision)

    expect(state.won).toEqual([3, 0])
    expect(state.remaining).toBe(1)
    expect(state.label).toBe('Adam vyhrává 3&1')

    const header = matchPlay.headerSummary?.(afterDecision, 3)
    expect(header?.tone).toBe('outOfPlay')
    expect(header?.note).toBe('Mimo hru')
    expect(matchPlay.holeSummary?.(afterDecision, 3)[0]?.entries[0]?.value).toContain(
      'Mimo hru',
    )
  })

  it('stav v hlavičce používá kompaktní barevné hodnoty stran', () => {
    const header = matchPlay.headerSummary?.(round, 2)

    expect(header?.note).toBe('2&1')
    expect(header?.entries.map((entry) => [entry.value, entry.tone])).toEqual([
      ['2 UP', 'positive'],
      ['2 DOWN', 'negative'],
    ])
  })

  it('označí vyhranou jamku ve scorekartě', () => {
    expect(matchPlay.scorecardPlayerCell?.(round, 'p1', 0)?.skin).toBeDefined()
    expect(matchPlay.scorecardPlayerCell?.(round, 'p2', 0)?.skin).toBeUndefined()
    expect(matchPlay.scorecardPlayerCell?.(round, 'p1', 1)?.skin).toBeUndefined()
  })

  it('u four-ballu označí oba hráče vítězné dvojice', () => {
    const fourBall = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[4], [6], [5], [5]],
    })

    expect(matchPlay.scorecardPlayerCell?.(fourBall, 'p1', 0)?.skin).toBeDefined()
    expect(matchPlay.scorecardPlayerCell?.(fourBall, 'p2', 0)?.skin).toBeDefined()
    expect(matchPlay.scorecardPlayerCell?.(fourBall, 'p3', 0)?.skin).toBeUndefined()
  })
  it('ve třetím řádku ukáže dormie a počet zbývajících jamek', () => {
    const dormie = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, null],
        [5, null],
      ],
    })

    expect(matchPlay.headerSummary?.(dormie, 0)?.note).toBe('dormie · zbývá 1 jamka')
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

  it('extra body nabízí jako vedlejší sázku, ne jako body zápasu', () => {
    expect(matchPlay.scoringOptions.bonusIds).toEqual(SIDE_BET_BONUSES)
    expect(matchPlay.scoringOptions.bonusesAsSideBet).toBe(true)
    // Dvojnásobná jamka by rozbila stav zápasu, ta zůstává vypnutá.
    expect(matchPlay.supportsDoubleHoles).toBe(false)
  })
})

describe('Match play - netto HCP', () => {
  /** Dva hráči zahrají obě jamky shodně; Bára dostává ránu na SI 1. */
  function netRound() {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, 4],
        [4, 4],
      ],
    })
    round.netScoring = true
    round.course = { name: 'Testovací hřiště', strokeIndex: [1, 2] }
    round.players[1]!.playingHandicap = 1
    return round
  }

  it('jamku bere hráč, který na ní má ránu k dobru', () => {
    const state = matchState(netRound())

    expect(state.won).toEqual([0, 1])
    expect(state.halved).toBe(1)
    expect(state.leaderIndex).toBe(1)
  })

  it('v brutto kole jsou obě jamky dělené', () => {
    const round = netRound()
    round.netScoring = false

    const state = matchState(round)
    expect(state.won).toEqual([0, 0])
    expect(state.halved).toBe(2)
  })

  it('u four-ballu se netto počítá i lepší míč dvojice', () => {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Alena', 'Bára', 'Bořek'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[4], [4], [4], [4]],
    })
    round.netScoring = true
    round.course = { name: 'Testovací hřiště', strokeIndex: [1] }
    round.players[3]!.playingHandicap = 1

    expect(matchState(round).won).toEqual([0, 1])
  })
})

describe('Match play - vedlejší sázka', () => {
  /** Zápas o jednu jamku, ve kterém Adam navíc uhrál bunker za 5 bodů. */
  function betRound(): Round {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, 4],
        [5, 4],
      ],
      settings: { pointValue: 10 },
    })
    round.settings.options = {
      ...round.settings.options,
      bonusValues: { ...round.settings.options.bonusValues, bunker: 5 },
    }
    return toggleBonus(round, 'p1', 0, 'bunker')
  }

  it('stav zápasu se extra body nemíchá', () => {
    const section = matchPlay.computeStandings(betRound())[0]

    expect(section?.rows.map((row) => [row.name, row.valueLabel])).toEqual([
      ['Adam', '1 UP'],
      ['Bára', '1 DOWN'],
    ])
  })

  it('extra body mají vlastní tabulku', () => {
    const sections = matchPlay.computeStandings(betRound())

    expect(sections[1]?.title).toBe('Extra body')
    expect(sections[1]?.rows.map((row) => [row.name, row.value])).toEqual([
      ['Adam', 5],
      ['Bára', 0],
    ])
  })

  it('do peněz se přidají k vyhraným jamkám', () => {
    const round = betRound()
    const parties = matchPlay.settlementParties?.(round) ?? []
    const settlement = settleRound(round, parties)
    if (settlement.kind !== 'balances') throw new Error('čekáme zůstatky jednotlivců')

    // Adam vede 1 UP (1 jamka) a má 5 bodů z bunkeru: 6 jednotek po 10 Kč.
    expect(parties.map((party) => party.units)).toEqual([6, 0])
    expect(settlement.transfers.map((tr) => [tr.fromName, tr.toName, tr.amount])).toEqual(
      [['Bára', 'Adam', 60]],
    )
  })

  it('bez zadané hodnoty se o extra body nehraje', () => {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, 4],
        [5, 4],
      ],
      settings: { pointValue: 10 },
    })
    // Kolo z `makeRound()` nese katalogové hodnoty, takže se nula musí nastavit
    // stejně jako to dělá `loadGameOptions()` u her s vedlejší sázkou.
    round.settings.options = {
      ...round.settings.options,
      bonusValues: Object.fromEntries(
        Object.keys(round.settings.options.bonusValues).map((id) => [id, 0]),
      ) as typeof round.settings.options.bonusValues,
    }

    expect(matchPlay.computeStandings(round)).toHaveLength(1)
    expect(matchPlay.settlementParties?.(round)?.map((p) => p.units)).toEqual([1, 0])
  })
})
