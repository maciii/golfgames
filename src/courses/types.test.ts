import { describe, expect, it } from 'vitest'
import {
  copyAsPrivateCourse,
  hasNewerCatalogVersion,
  isCatalogCourse,
  normalizeCourse,
  type Course,
} from './types'

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'local:test',
    name: 'Testovací hřiště',
    holeCount: 3,
    pars: [4, 4, 4],
    strokeIndex: [1, 2, 3],
    tees: [],
    source: 'manual',
    ...overrides,
  }
}

describe('původ a verze hřiště', () => {
  it('staré lokální hřiště rozpozná jako soukromé', () => {
    expect(isCatalogCourse(course())).toBe(false)
  })

  it('staré externí hřiště rozpozná jako katalogovou kopii', () => {
    expect(isCatalogCourse(course({ id: 'karlstejn', source: 'opengolfapi' }))).toBe(true)
  })

  it('novější centrální verze předběhne lokální kopii', () => {
    const local = course({
      origin: 'catalog',
      catalogUpdatedAt: '2026-08-05T10:00:00.000Z',
    })
    const remote = course({
      origin: 'catalog',
      updatedAt: '2026-08-05T11:00:00.000Z',
    })

    expect(hasNewerCatalogVersion(local, remote)).toBe(true)
    expect(
      hasNewerCatalogVersion(local, {
        ...remote,
        updatedAt: '2026-08-05T10:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('starší kopie bez centrálního času se při prvním ověření aktualizuje', () => {
    expect(
      hasNewerCatalogVersion(
        course({ origin: 'catalog' }),
        course({ updatedAt: '2026-08-05T11:00:00.000Z' }),
      ),
    ).toBe(true)
  })

  it('normalizace doplní explicitní soukromý původ nového hřiště', () => {
    expect(normalizeCourse(course()).origin).toBe('private')
  })

  it('úprava katalogového hřiště dostane nové soukromé id', () => {
    const copy = copyAsPrivateCourse(
      course({
        id: 'karlstejn',
        origin: 'catalog',
        catalogUpdatedAt: '2026-08-05T10:00:00.000Z',
      }),
    )

    expect(copy.id).toMatch(/^local:/)
    expect(copy.id).not.toBe('karlstejn')
    expect(copy.origin).toBe('private')
    expect(copy.source).toBe('manual')
    expect(copy.catalogUpdatedAt).toBeUndefined()
  })
})
