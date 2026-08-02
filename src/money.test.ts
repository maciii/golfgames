import { describe, expect, it } from 'vitest'
import { formatMoney, settle, settlementSummary } from './money'

describe('Vyrovnání mezi dvěma stranami', () => {
  const parties = [
    { id: 't1', name: 'Adam + Alena', units: 9 },
    { id: 't2', name: 'Bára + Bořek', units: 3 },
  ]

  it('prohrávající dvojice platí rozdíl bodů krát hodnota bodu', () => {
    const rows = settle(parties, 10)

    expect(rows.map((r) => r.amount)).toEqual([60, -60])
  })

  it('při shodě bodů nikdo nic neplatí', () => {
    const rows = settle(
      [
        { id: 't1', name: 'A', units: 5 },
        { id: 't2', name: 'B', units: 5 },
      ],
      10,
    )

    expect(rows.map((r) => r.amount)).toEqual([0, 0])
  })

  it('pojmenuje, kdo komu kolik platí', () => {
    // Intl vkládá mezi číslo a měnu nezlomitelnou mezeru; pro porovnání ji
    // srovnáme na obyčejnou.
    expect(settlementSummary(settle(parties, 10), 'CZK').replace(/ /g, ' ')).toBe(
      'Bára + Bořek platí Adam + Alena 60 Kč (rozdíl 6 b.).',
    )
  })
})

describe('Vyrovnání mezi víc hráči', () => {
  const parties = [
    { id: 'p1', name: 'Adam', units: 5 },
    { id: 'p2', name: 'Bára', units: 2 },
    { id: 'p3', name: 'Cyril', units: 1 },
  ]

  it('každý bod navíc inkasuje od každého soupeře zvlášť', () => {
    const rows = settle(parties, 10)

    expect(rows.map((r) => r.amount)).toEqual([70, -20, -50])
  })

  it('součet všech částek je nula', () => {
    const rows = settle(parties, 10)

    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(0)
  })

  it('nulová hodnota bodu znamená nulové vyrovnání', () => {
    expect(settle(parties, 0).every((r) => r.amount === 0)).toBe(true)
  })
})

describe('Formátování částek', () => {
  it('píše koruny i eura', () => {
    // Nezlomitelná mezera z Intl se pro porovnání normalizuje.
    expect(formatMoney(60, 'CZK').replace(/ /g, ' ')).toBe('60 Kč')
    expect(formatMoney(12.5, 'EUR').replace(/ /g, ' ')).toBe('12,50 €')
  })

  it('u záporné částky nechá znaménko', () => {
    expect(formatMoney(-60, 'CZK')).toContain('-60')
  })
})
