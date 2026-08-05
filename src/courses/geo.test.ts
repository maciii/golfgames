import { describe, expect, it } from 'vitest'
import { distanceKm } from './geo'

describe('vzdálenost hřiště', () => {
  it('počítá vzdálenost po povrchu Země', () => {
    expect(distanceKm({ latitude: 0, longitude: 0 }, 0, 1)).toBeCloseTo(111.2, 1)
  })

  it('nepočítá vzdálenost bez souřadnic hřiště', () => {
    expect(distanceKm({ latitude: 50, longitude: 14 })).toBeUndefined()
  })
})
