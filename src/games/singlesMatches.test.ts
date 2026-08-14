import { beforeAll, describe, expect, it } from 'vitest'
import { flightMatches, singlesMatches } from './singlesMatches'
import { makeRound } from './fixtures'
import { setActiveLocale } from '../i18n'
import { settleGroups } from '../money'
import { strokesReceived } from '../handicap'
import { toggleBonus } from '../types'
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
  /**
   * Osmnáctijamkové kolo, ve kterém je zapsaná jen první jamka - par 3 se
   * stroke indexem 5. Kratší fixtura by tady lhala: na kole o jedné jamce
   * padne celý hrací handicap na tu jamku.
   */
  function highHandicapRound(alexHandicap: number): Round {
    const pars = [3, ...Array(17).fill(4)]
    const empty = Array<number | null>(18).fill(null)
    const round = flightRound({
      pars,
      scores: [
        [6, ...empty.slice(1)],
        [3, ...empty.slice(1)],
        [4, ...empty.slice(1)],
        [4, ...empty.slice(1)],
      ],
    })
    round.netScoring = true
    round.course = {
      name: 'Testovací hřiště',
      strokeIndex: [5, 1, 17, 7, 11, 3, 15, 9, 13, 6, 2, 18, 8, 12, 4, 16, 10, 14],
    }
    // Alex má index 54 a ze slopovaného odpaliště hrací handicap 61, Mac 12.
    round.players[0]!.playingHandicap = alexHandicap
    round.players[1]!.playingHandicap = 12
    return round
  }

  it('par 3 s vysokým HCP: šest proti třem je dělená jamka', () => {
    // Skutečné kolo, které vypadalo jako chyba v bodování: na jamce se SI 5
    // dostává Alex čtyři rány a Mac jednu, takže brutto 6 proti 3 je netto
    // 2 proti 2. Chyba byla jen v zápisu skóre, který u Alexe ukazoval tři
    // tečky místo čtyř.
    const round = highHandicapRound(61)

    expect(strokesReceived(round, 'p1', 0)).toBe(4)
    expect(strokesReceived(round, 'p2', 0)).toBe(1)

    const [first] = flightMatches(round)
    expect(first?.state.halved).toBe(1)
    expect(first?.state.won).toEqual([0, 0])
  })

  it('o ránu nižší handicap by jamku Macovi dal', () => {
    // Kontrola, že dělená jamka výš není nečitelnost výpočtu: s hracím
    // handicapem 54 dostává Alex tři rány a netto 3 proti 2 jamku prohrává.
    const round = highHandicapRound(54)

    expect(strokesReceived(round, 'p1', 0)).toBe(3)

    const [first] = flightMatches(round)
    expect(first?.state.won).toEqual([0, 1])
  })

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

describe('Dvě jamkovky ve flightu - hlavička jamky', () => {
  /**
   * Zápas Adam-Bára je po dvou jamkách dormie (Adam 1 UP, zbývá jedna),
   * zápas Cyril-Dana nerozhodně. Přesně ten stav, kdy se v hlavičce nesmí
   * splést, koho se dormie týká.
   */
  const round = flightRound({
    pars: [4, 4, 4],
    scores: [
      [4, 4, null],
      [5, 4, null],
      [4, 4, null],
      [4, 4, null],
    ],
  })

  it('u stavu nepíše, kdo s kým hraje - jen kdo vede', () => {
    const header = singlesMatches.headerSummary?.(round, 2)

    expect(header?.entries.map((entry) => [entry.label, entry.value])).toEqual([
      ['Adam', '1 UP'],
      ['Cyril', 'AS'],
    ])
  })

  it('dormie hlásí u toho zápasu, kterého se týká', () => {
    const header = singlesMatches.headerSummary?.(round, 2)

    expect(header?.entries.map((entry) => entry.note)).toEqual(['dormie', ''])
  })

  it('zbývající jamky jsou jednou pod stavy, ne u každého zápasu', () => {
    const header = singlesMatches.headerSummary?.(round, 2)

    expect(header?.note).toBe('zbývá 1 jamka')
  })

  it('krátké jméno bere z celého jména hráče', () => {
    const named = makeRound({
      gameId: 'singles-matches',
      players: ['Alexandra Pániková', 'Michal Švarc', 'Martin Kubečka', 'Petr'],
      teams: [
        [0, 1],
        [2, 3],
      ],
      pars: [4],
      scores: [[4], [5], [4], [4]],
    })
    const header = singlesMatches.headerSummary?.(named, 0)

    expect(header?.entries.map((entry) => entry.label)).toEqual(['Alexandra', 'Martin'])
  })

  it('rozhodnutý zápas hlásí výsledek, dohraný flight konec', () => {
    const decided = flightRound({
      pars: [4, 4],
      scores: [
        [4, 4],
        [5, 5],
        [4, 5],
        [5, 4],
      ],
    })
    const header = singlesMatches.headerSummary?.(decided, 1)

    // Adam vyhrál oba, Cyril s Danou jednu a jednu - první zápas je rozhodnutý.
    expect(header?.entries[0]?.note).toBe('konec · 2 UP')
    expect(header?.note).toBe('konec')
  })

  it('stav zápasu se v bloku jamky neopakuje', () => {
    const summaries = singlesMatches.holeSummary?.(round, 1) ?? []

    expect(
      summaries.map((summary) => summary.entries.map((entry) => entry.label)),
    ).toEqual([['Jamku bere'], ['Jamku bere']])
  })
})

describe('Dvě jamkovky ve flightu - vedlejší sázka', () => {
  /**
   * Adam vede svůj zápas 1 UP a navíc uhrál bunker za 5 bodů; druhý zápas je
   * po jedné jamce nerozhodně. Extra body se nesmí přelít do cizího zápasu.
   */
  function betRound(): Round {
    const round = flightRound({
      pars: [4],
      scores: [[4], [5], [4], [4]],
      pointValue: 10,
    })
    round.settings.options = {
      ...round.settings.options,
      bonusValues: { ...round.settings.options.bonusValues, bunker: 5 },
    }
    return toggleBonus(round, 'p1', 0, 'bunker')
  }

  it('extra body mají vlastní tabulku, zápasy zůstávají čisté', () => {
    const sections = singlesMatches.computeStandings(betRound())

    expect(sections[0]?.rows.map((row) => row.valueLabel)).toEqual([
      '1 UP',
      'AS',
      'AS',
      '1 DOWN',
    ])
    expect(sections[1]?.title).toBe('Extra body')
    expect(sections[1]?.rows.map((row) => [row.name, row.value])).toEqual([
      ['Adam', 5],
      ['Bára', 0],
      ['Cyril', 0],
      ['Dana', 0],
    ])
  })

  it('platí se za ně jen ve svém zápase', () => {
    const round = betRound()
    const parties = singlesMatches.settlementParties?.(round) ?? []
    const groups = singlesMatches.settlementGroups?.(round) ?? []
    const settlement = settleGroups(
      round,
      groups.map((ids) => ids.flatMap((id) => parties.filter((p) => p.id === id))),
    )
    if (settlement.kind !== 'balances') throw new Error('čekáme zůstatky jednotlivců')

    // Adam: 1 jamka + 5 bodů = 6 jednotek, Bára 0 -> 60 Kč. Druhý zápas je
    // nerozhodný a bunker prvního zápasu s ním nemá nic společného.
    expect(settlement.transfers.map((tr) => [tr.fromName, tr.toName, tr.amount])).toEqual(
      [['Bára', 'Adam', 60]],
    )
  })
})
