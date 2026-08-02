import { describe, expect, it } from 'vitest'
import { balances, formatMoney, settleRound } from './money'
import type { RoundSettings } from './types'
import { makeRound } from './games/fixtures'

const CZK: RoundSettings = { currency: 'CZK', pointValue: 10, doubleClosingHoles: false }

/** Kolo dvou dvojic; skóre není podstatné, body dodáváme přímo. */
function pairRound(settings: RoundSettings = CZK) {
  return makeRound({
    gameId: 'best-aggregate',
    players: ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4'],
    teams: [
      [0, 2],
      [1, 3],
    ],
    pars: [4],
    scores: [[4], [4], [4], [4]],
    settings,
  })
}

describe('Vyrovnání dvojic', () => {
  // Dvojice 1+3 má 10 bodů, dvojice 2+4 tři body -> rozdíl 7 bodů = 70 Kč.
  const parties = [
    { id: 't1', name: 'Hráč 1 + Hráč 3', units: 10 },
    { id: 't2', name: 'Hráč 2 + Hráč 4', units: 3 },
  ]

  it('částku platí každý hráč prohrávající dvojice zvlášť', () => {
    const result = settleRound(pairRound(), parties)

    expect(result.kind).toBe('transfers')
    if (result.kind !== 'transfers') return
    expect(result.unitDiff).toBe(7)
    expect(result.perPlayer).toBe(70)
  })

  it('páruje protějšky podle pořadí ve dvojici', () => {
    const result = settleRound(pairRound(), parties)

    if (result.kind !== 'transfers') throw new Error('čekány platby')
    expect(result.transfers.map((t) => [t.fromName, t.toName, t.amount])).toEqual([
      ['Hráč 2', 'Hráč 1', 70],
      ['Hráč 4', 'Hráč 3', 70],
    ])
  })

  it('vítězná dvojice dostane dvojnásobek rozdílu', () => {
    const result = settleRound(pairRound(), parties)

    if (result.kind !== 'transfers') throw new Error('čekány platby')
    const total = result.transfers.reduce((sum, t) => sum + t.amount, 0)
    expect(total).toBe(140)
  })

  it('při shodě bodů nikdo nic neplatí', () => {
    const result = settleRound(pairRound(), [
      { id: 't1', name: 'A', units: 5 },
      { id: 't2', name: 'B', units: 5 },
    ])

    if (result.kind !== 'transfers') throw new Error('čekány platby')
    expect(result.transfers).toEqual([])
    expect(result.summary).toContain('nedluží')
  })

  it('popíše výpočet i částku na hráče', () => {
    const result = settleRound(pairRound(), parties)

    expect(
      result.kind === 'transfers' && result.summary.replace(/[\u00a0\u202f]/g, ' '),
    ).toBe('Rozdíl 7 b. × 10 Kč = 70 Kč, které platí každý hráč zvlášť.')
  })

  it('bez sázky se nevyrovnává nic', () => {
    const free = pairRound({ ...CZK, pointValue: 0 })

    expect(settleRound(free, parties).kind).toBe('none')
  })
})

describe('Vyrovnání jednotlivců', () => {
  function soloRound() {
    return makeRound({
      gameId: 'skins',
      players: ['Adam', 'Bára', 'Cyril'],
      pars: [4],
      scores: [[4], [4], [4]],
      settings: CZK,
    })
  }

  const parties = [
    { id: 'p1', name: 'Adam', units: 5 },
    { id: 'p2', name: 'Bára', units: 2 },
    { id: 'p3', name: 'Cyril', units: 1 },
  ]

  it('každý bod navíc inkasuje od každého soupeře zvlášť', () => {
    const result = settleRound(soloRound(), parties)

    expect(result.kind).toBe('balances')
    if (result.kind !== 'balances') return
    expect(result.rows.map((r) => r.amount)).toEqual([70, -20, -50])
  })

  it('součet všech zůstatků je nula', () => {
    const rows = balances(parties, 10)

    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(0)
  })

  it('dva hráči se vyrovnají prostým rozdílem bodů', () => {
    const rows = balances(
      [
        { id: 'p1', name: 'Adam', units: 6 },
        { id: 'p2', name: 'Bára', units: 2 },
      ],
      10,
    )

    expect(rows.map((r) => r.amount)).toEqual([40, -40])
  })
})

describe('Formátování částek', () => {
  it('píše koruny i eura', () => {
    // Intl odděluje částku od měny nezlomitelnou mezerou (U+00A0, u části
    // locale U+202F); pro porovnání ji srovnáme na obyčejnou.
    expect(formatMoney(60, 'CZK').replace(/[\u00a0\u202f]/g, ' ')).toBe('60 Kč')
    expect(formatMoney(12.5, 'EUR').replace(/[\u00a0\u202f]/g, ' ')).toBe('12,50 €')
  })

  it('u záporné částky nechá znaménko', () => {
    expect(formatMoney(-60, 'CZK')).toContain('-60')
  })
})
