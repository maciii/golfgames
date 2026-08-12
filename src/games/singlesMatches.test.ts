import { beforeAll, describe, expect, it } from 'vitest'
import { flightMatches, singlesMatches } from './singlesMatches'
import { makeRound } from './fixtures'
import { setActiveLocale } from '../i18n'
import { settleGroups } from '../money'
import type { Round } from '../types'

beforeAll(() => setActiveLocale('cs'))

/** Flight čtyř hráčů, ve kterém běží dva zápasy: Adam–Bára a Cyril–Dana. */
function flightRound(options: {
  pars: number[]
  scores: (number | null)[][]
  pointValue?: number
}): Round {
  return makeRound({
    gameId: 'singles-matches',
    players: ['Adam', 'Bára', 'Cyril', 'Dana'],
    teams: [
      [0, 1],
      [2, 3],
    ],
    pars: options.pars,
    scores: options.scores,
    ...(options.pointValue !== undefined
      ? { settings: { currency: 'CZK', pointValue: options.pointValue } }
      : {}),
  })
}

describe('Dvě jamkovky ve flightu - dva samostatné zápasy', () => {
  /**
   * Zápas 1: Adam 4/4 vs Bára 5/4  -> Adam 1 UP, jedna dělená
   * Zápas 2: Cyril 5/6 vs Dana 4/5 -> Dana 2 UP
   */
  const round = flightRound({
    pars: [4, 4],
    scores: [
      [4, 4],
      [5, 4],
      [5, 6],
      [4, 5],
    ],
  })

  it('počítá každý zápas zvlášť', () => {
    const [first, second] = flightMatches(round)

    expect(first?.state.won).toEqual([1, 0])
    expect(first?.state.halved).toBe(1)
    expect(second?.state.won).toEqual([0, 2])
  })

  it('výsledek jednoho zápasu neovlivní druhý', () => {
    const rows = singlesMatches.computeStandings(round)[0]?.rows ?? []

    expect(rows.map((r) => [r.name, r.valueLabel])).toEqual([
      ['Dana', '2 UP'],
      ['Adam', '1 UP'],
      ['Bára', '1 DOWN'],
      ['Cyril', '2 DOWN'],
    ])
  })

  it('pod tabulkou hlásí stav obou zápasů', () => {
    const section = singlesMatches.computeStandings(round)[0]

    // Obě jamky jsou zapsané, takže oba zápasy jsou dohrané.
    expect(section?.description).toBe('Adam vyhrává 1 UP · Dana vyhrává 2 UP')
  })

  it('u hráče je vidět, s kým hraje', () => {
    const rows = singlesMatches.computeStandings(round)[0]?.rows ?? []

    expect(rows.find((r) => r.name === 'Adam')?.detail).toBe(
      'vs. Bára · vyhrané 1 · dělené 1',
    )
  })

  it('dvojici pojmenuje jako soupeře, ne jako partnery', () => {
    const team = round.teams[0]!

    expect(singlesMatches.teamLabel?.(round, team)).toBe('Adam vs. Bára')
    expect(singlesMatches.pairingKind).toBe('opponents')
  })

  it('hraje se jen ve čtyřech', () => {
    expect(singlesMatches.playerCounts).toEqual([4])
    expect(singlesMatches.usesTeams(4)).toBe(true)
  })
})

describe('Dvě jamkovky ve flightu - rozehraná jamka platí jen pro svůj zápas', () => {
  /**
   * Rozhodnutí #34: jamka běží podle zápasu, ne podle flightu. Kdyby platila
   * společná „rozehraná jamka", zapsaný první zápas by ze druhého udělal
   * vzdanou jamku pro oba jeho hráče.
   */
  const round = flightRound({
    pars: [4, 4],
    scores: [
      [4, null],
      [5, null],
      [null, null],
      [null, null],
    ],
  })

  it('zápis prvního zápasu nezakládá jamku druhému', () => {
    const [first, second] = flightMatches(round)

    expect(first?.state.won).toEqual([1, 0])
    expect(second?.state.won).toEqual([0, 0])
    expect(second?.state.halved).toBe(0)
    expect(second?.state.remaining).toBe(2)
  })

  it('kdo v rozehrané jamce svého zápasu chybí, ji vzdal', () => {
    const conceded = flightRound({
      pars: [4],
      scores: [[4], [null], [5], [null]],
    })
    const [first, second] = flightMatches(conceded)

    expect(first?.state.won).toEqual([1, 0])
    expect(second?.state.won).toEqual([1, 0])
  })
})

describe('Dvě jamkovky ve flightu - peníze', () => {
  const round = flightRound({
    pars: [4, 4, 4],
    scores: [
      [4, 4, 4],
      [5, 4, 5],
      [5, 5, 5],
      [4, 5, 4],
    ],
    pointValue: 10,
  })

  /** Vyrovnání tak, jak ho staví obrazovka výsledků. */
  function settlement() {
    const rows = singlesMatches.computeStandings(round)[0]?.rows ?? []
    const parties = rows.map((row) => ({
      id: row.id,
      name: row.name,
      units: row.value,
    }))
    const groups = singlesMatches.settlementGroups?.(round) ?? []
    return settleGroups(
      round,
      groups.map((ids) => ids.flatMap((id) => parties.filter((p) => p.id === id))),
    )
  }

  it('platí se jen svému soupeři, ne přes zápasy', () => {
    const result = settlement()
    if (result.kind !== 'balances') throw new Error('čekáme zůstatky jednotlivců')

    expect(result.transfers.map((tr) => [tr.fromName, tr.toName, tr.amount])).toEqual([
      ['Bára', 'Adam', 20],
      ['Cyril', 'Dana', 20],
    ])
  })

  it('zůstatky se sčítají na nulu v každém zápase', () => {
    const result = settlement()
    if (result.kind !== 'balances') throw new Error('čekáme zůstatky jednotlivců')

    expect(result.rows.map((row) => [row.name, row.amount]).sort()).toEqual([
      ['Adam', 20],
      ['Bára', -20],
      ['Cyril', -20],
      ['Dana', 20],
    ])
    expect(result.summary).toBe('Každý zápas se vyrovnává zvlášť.')
  })

  it('remíza v zápase znamená, že si v něm nikdo nic neplatí', () => {
    const drawn = flightRound({
      pars: [4],
      scores: [[4], [4], [5], [4]],
      pointValue: 10,
    })
    const rows = singlesMatches.computeStandings(drawn)[0]?.rows ?? []
    const parties = rows.map((row) => ({ id: row.id, name: row.name, units: row.value }))
    const groups = singlesMatches.settlementGroups?.(drawn) ?? []
    const result = settleGroups(
      drawn,
      groups.map((ids) => ids.flatMap((id) => parties.filter((p) => p.id === id))),
    )
    if (result.kind !== 'balances') throw new Error('čekáme zůstatky jednotlivců')

    expect(result.transfers.map((tr) => [tr.fromName, tr.toName])).toEqual([
      ['Cyril', 'Dana'],
    ])
  })
})

describe('Dvě jamkovky ve flightu - netto', () => {
  it('rány se odečítají hráči, ne dvojici', () => {
    const round = flightRound({
      pars: [4],
      scores: [[4], [4], [4], [4]],
    })
    round.netScoring = true
    round.course = { name: 'Testovací hřiště', strokeIndex: [1] }
    round.players[1]!.playingHandicap = 1

    const [first, second] = flightMatches(round)
    expect(first?.state.won).toEqual([0, 1])
    expect(second?.state.halved).toBe(1)
  })
})
