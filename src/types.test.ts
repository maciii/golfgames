import { describe, expect, it } from 'vitest'
import {
  bonusesAt,
  createRound,
  firstHoleNumber,
  formatHoleList,
  holeMultiplier,
  holeNumber,
  isHoleStarted,
  parAt,
  parTotalBetween,
  roundCompleteness,
  setHolePar,
  shortPlayerName,
  strokeTotal,
  strokeTotalBetween,
  toggleBonus,
  turnHole,
} from './types'
import { normalizeRound } from './storage'
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

/**
 * Devítka hraná ze zadní půlky osmnáctky.
 *
 * V datech je to obyčejné devítijamkové kolo (indexy 0-8), jen si pamatuje, že
 * začíná desítkou. Čísla jamek se proto musí posunout všude, kde je hráč vidí,
 * a dvojnásobná závěrečná jamka musí padnout na osmnáctku.
 */
describe('Kolo hrané na druhou devítku', () => {
  function backNine(scores: (number | null)[][]) {
    return makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára'],
      pars: [4, 4, 4, 4, 4, 4, 4, 4, 4],
      scores,
      startHole: 10,
    })
  }

  const full = backNine([
    [4, 4, 4, 4, 4, 4, 4, 4, 4],
    [5, 5, 5, 5, 5, 5, 5, 5, 5],
  ])

  it('čísluje jamky od desítky', () => {
    expect(firstHoleNumber(full)).toBe(10)
    expect(holeNumber(full, 0)).toBe(10)
    expect(holeNumber(full, 8)).toBe(18)
  })

  it('kolo od jedničky si číslo první jamky nenese', () => {
    const front = createRound({ gameId: 'skins', playerNames: ['Adam'], holeCount: 9 })

    expect(front.startHole).toBeUndefined()
    expect(holeNumber(front, 8)).toBe(9)
  })

  it('chybějící zápisy hlásí pod skutečnými čísly jamek', () => {
    const partial = backNine([
      [4, 4, null, null],
      [5, null, null, null],
    ])

    expect(roundCompleteness(partial)).toEqual({
      conceded: [11],
      unplayed: [12, 13, 14, 15, 16, 17, 18],
      complete: false,
    })
  })

  it('dvojnásobná závěrečná jamka padne na osmnáctku', () => {
    expect(holeMultiplier(full, 8)).toBe(2)
    expect(holeMultiplier(full, 7)).toBe(1)
    expect(holeMultiplier(full, 0)).toBe(1)
  })

  it('poškozené číslo první jamky se při načtení zahodí', () => {
    const broken = normalizeRound({ ...full, startHole: 0 })
    const nonsense = normalizeRound({ ...full, startHole: 4.5 })

    expect(firstHoleNumber(broken)).toBe(1)
    expect(nonsense.startHole).toBeUndefined()
  })

  it('platné číslo první jamky načtení přežije', () => {
    expect(normalizeRound(full).startHole).toBe(10)
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

describe('odpaliště hráčů', () => {
  it('bez vlastní volby dostanou všichni odpaliště kola', () => {
    const round = createRound({
      gameId: 'skins',
      playerNames: ['A', 'B'],
      holeCount: 18,
      course: { name: 'Test', teeId: 'yellow', teeName: 'Žlutá', strokeIndex: [] },
    })

    expect(round.players.map((player) => player.teeId)).toEqual(['yellow', 'yellow'])
  })

  it('vlastní volba přebije odpaliště kola, chybějící ne', () => {
    const round = createRound({
      gameId: 'skins',
      playerNames: ['A', 'B', 'C'],
      holeCount: 18,
      course: { name: 'Test', teeId: 'yellow', teeName: 'Žlutá', strokeIndex: [] },
      playerTeeIds: ['red', undefined, 'blue'],
    })

    expect(round.players.map((player) => player.teeId)).toEqual(['red', 'yellow', 'blue'])
  })

  it('kolo bez hřiště odpaliště nikomu nepřidělí', () => {
    const round = createRound({ gameId: 'skins', playerNames: ['A'], holeCount: 18 })

    expect(round.players[0]?.teeId).toBeUndefined()
  })
})

describe('mezisoučet po devíti jamkách', () => {
  /** Osmnáctka, kde první devítka dá 40 ran a druhá 45. */
  const round = makeRound({
    gameId: 'skins',
    players: ['Adam'],
    pars: Array.from({ length: 18 }, () => 4),
    scores: [[4, 4, 4, 5, 4, 4, 4, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]],
  })

  it('sečte jen jamky ve výřezu', () => {
    expect(strokeTotalBetween(round, 'p1', 0, 9)).toBe(40)
    expect(strokeTotalBetween(round, 'p1', 9, 18)).toBe(45)
  })

  it('obě devítky dohromady dají celkový součet', () => {
    expect(
      strokeTotalBetween(round, 'p1', 0, 9) + strokeTotalBetween(round, 'p1', 9, 18),
    ).toBe(strokeTotal(round, 'p1'))
  })

  it('nezapsaná jamka se počítá jako nula, stejně jako v celkovém součtu', () => {
    const started = makeRound({
      gameId: 'skins',
      players: ['Adam'],
      pars: Array.from({ length: 18 }, () => 4),
      scores: [[4, 5, null, null, null, null, null, null, null]],
    })

    expect(strokeTotalBetween(started, 'p1', 0, 9)).toBe(9)
  })

  it('par se bere přes parAt, takže kolo bez hřiště má výchozí par', () => {
    const noCourse = createRound({
      gameId: 'skins',
      playerNames: ['Adam'],
      holeCount: 18,
    })

    expect(parTotalBetween(noCourse, 0, 9)).toBe(9 * parAt(noCourse, 0))
  })

  it('ukazuje se jen na osmnáctce, kratší kolo se nedělí', () => {
    expect(turnHole(round)).toBe(9)
    expect(
      turnHole(
        makeRound({
          gameId: 'skins',
          players: ['Adam'],
          pars: Array.from({ length: 9 }, () => 4),
          scores: [[]],
        }),
      ),
    ).toBeUndefined()
  })

  it('na zadní devítce osmnáctky dělí kolo podle hraných jamek, ne podle čísel', () => {
    // Kolo začínající desítkou má jamky 10-18 a pak 1-9; mezisoučet patří po
    // deváté odehrané jamce, tedy na indexu 9.
    const fromTen = makeRound({
      gameId: 'skins',
      players: ['Adam'],
      pars: Array.from({ length: 18 }, () => 4),
      scores: [Array.from({ length: 18 }, () => 5)],
      startHole: 10,
    })

    expect(turnHole(fromTen)).toBe(9)
    expect(strokeTotalBetween(fromTen, 'p1', 0, 9)).toBe(45)
  })
})

describe('Krátké jméno do hlavičky', () => {
  const round = (names: string[]) =>
    makeRound({
      gameId: 'skins',
      players: names,
      pars: [4],
      scores: names.map(() => [4]),
    })

  it('z celého jména nechá první slovo', () => {
    const flight = round(['Alexandra Pániková', 'Michal Švarc'])

    expect(shortPlayerName(flight, 'p1')).toBe('Alexandra')
    expect(shortPlayerName(flight, 'p2')).toBe('Michal')
  })

  it('jednoslovné jméno nechá být', () => {
    expect(shortPlayerName(round(['Mac', 'Petr']), 'p1')).toBe('Mac')
  })

  it('při shodě jmen přibere iniciálu, ať se stavy nepopletou', () => {
    const flight = round(['Martin Kubečka', 'Martin Novák'])

    expect(shortPlayerName(flight, 'p1')).toBe('Martin K.')
    expect(shortPlayerName(flight, 'p2')).toBe('Martin N.')
  })
})
