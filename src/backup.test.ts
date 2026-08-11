import { describe, expect, it } from 'vitest'
import type { BackupFile, BackupData } from './backup'
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupFileName,
  mergeArchives,
  mergeCourses,
  mergeRosters,
  parseBackup,
} from './backup'
import type { Course } from './courses/types'
import type { Round } from './types'
import { DEFAULT_SETTINGS } from './types'
import { makeRound } from './games/fixtures'

/**
 * Testuje se čistá část zálohy - slučování a kontrola souboru. Obálky nad
 * localStorage se netestují, protože testy běží v Node bez prohlížeče.
 */

/** Kolo s určeným id a časem, ať jde ověřit, které při shodě vyhraje. */
function round(id: string, finishedAt: string): Round {
  const base = makeRound({
    gameId: 'skins',
    players: ['Adam', 'Bára'],
    pars: [4],
    scores: [[4], [5]],
  })
  return { ...base, id, createdAt: finishedAt, updatedAt: finishedAt, finishedAt }
}

function fileWith(data: Partial<BackupData>, overrides: Partial<BackupFile> = {}) {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: '1.0.0',
    exportedAt: '2026-08-03T10:00:00.000Z',
    data: {
      currentRound: null,
      archive: [],
      roster: [],
      settings: DEFAULT_SETTINGS,
      gameOptions: {},
      courses: [],
      ...data,
    },
    ...overrides,
  }
  return JSON.stringify(file)
}

describe('Záloha - slučování archivu', () => {
  it('sjednotí obě strany a nic nezahodí', () => {
    const merged = mergeArchives(
      [round('a', '2026-05-01T10:00:00.000Z')],
      [round('b', '2026-06-01T10:00:00.000Z')],
    )

    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })

  it('při shodě id vyhraje novější kolo', () => {
    const merged = mergeArchives(
      [round('a', '2026-05-01T10:00:00.000Z')],
      [round('a', '2026-07-01T10:00:00.000Z')],
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]?.finishedAt).toBe('2026-07-01T10:00:00.000Z')
  })

  it('při stejném čase zůstává místní verze', () => {
    const local = { ...round('a', '2026-05-01T10:00:00.000Z'), currentHole: 7 }
    const merged = mergeArchives([local], [round('a', '2026-05-01T10:00:00.000Z')])

    expect(merged[0]?.currentHole).toBe(7)
  })

  it('řadí od nejnovějšího kola', () => {
    const merged = mergeArchives(
      [round('stare', '2026-01-01T10:00:00.000Z')],
      [round('nove', '2026-08-01T10:00:00.000Z')],
    )

    expect(merged.map((r) => r.id)).toEqual(['nove', 'stare'])
  })

  it('prázdná záloha místní archiv nezmění', () => {
    const local = [round('a', '2026-05-01T10:00:00.000Z')]

    expect(mergeArchives(local, [])).toHaveLength(1)
  })
})

describe('Záloha - slučování hráčů', () => {
  it('doplní chybějící hráče', () => {
    const merged = mergeRosters(
      [{ id: 'r1', name: 'Adam' }],
      [{ id: 'r9', name: 'Bára' }],
    )

    expect(merged.map((e) => e.name)).toEqual(['Adam', 'Bára'])
  })

  it('přenese handicap i odpaliště', () => {
    const merged = mergeRosters(
      [],
      [{ id: 'r9', name: 'Eva', handicapIndex: 30.1, preferredTeeId: 'red' }],
    )

    expect(merged).toEqual([
      { id: 'r9', name: 'Eva', handicapIndex: 30.1, preferredTeeId: 'red' },
    ])
  })

  it('duplicitu bez ohledu na velikost písmen nepřidá', () => {
    const merged = mergeRosters(
      [{ id: 'r1', name: 'Adam' }],
      [{ id: 'r9', name: 'adam' }],
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe('r1')
  })

  it('přenese zvýraznění na domovské obrazovce', () => {
    const merged = mergeRosters([], [{ id: 'r9', name: 'Eva', favorite: true }])

    expect(merged[0]?.favorite).toBe(true)
  })
})

describe('Záloha - čtení souboru', () => {
  it('přečte vlastní soubor včetně kol', () => {
    const result = parseBackup(
      fileWith({ archive: [round('a', '2026-05-01T10:00:00.000Z')] }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.data.archive).toHaveLength(1)
  })

  it('odmítne cizí JSON', () => {
    const result = parseBackup(JSON.stringify({ neco: 'jineho' }))

    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('odmítne poškozený text', () => {
    expect(parseBackup('{tohle není JSON')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('odmítne zálohu z novější verze aplikace', () => {
    const result = parseBackup(fileWith({}, { schemaVersion: BACKUP_SCHEMA_VERSION + 1 }))

    expect(result).toEqual({ ok: false, reason: 'tooNew' })
  })

  it('poškozené kolo v archivu zahodí, zbytek zachová', () => {
    const raw = JSON.parse(
      fileWith({ archive: [round('a', '2026-05-01T10:00:00.000Z')] }),
    ) as BackupFile
    raw.data.archive.push({ id: 'rozbite' } as unknown as Round)

    const result = parseBackup(JSON.stringify(raw))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.data.archive.map((r) => r.id)).toEqual(['a'])
  })

  it('kolo ze starší verze doplní na aktuální tvar', () => {
    const old = round('a', '2026-05-01T10:00:00.000Z')
    const raw = JSON.parse(fileWith({ archive: [old] })) as BackupFile
    // Kolo z doby, kdy se volby bodování ještě neukládaly.
    delete (raw.data.archive[0] as { settings?: unknown }).settings

    const result = parseBackup(JSON.stringify(raw))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.backup.data.archive[0]?.settings.options.bonusValues).toBeDefined()
    }
  })
})

describe('Záloha - hřiště', () => {
  function course(id: string, name: string, updatedAt: string, si = [1, 2, 3]): Course {
    return {
      id,
      name,
      holeCount: 3,
      pars: [4, 3, 5],
      strokeIndex: si,
      tees: [],
      source: 'manual',
      updatedAt,
    }
  }

  it('sloučení nic nezahodí a řadí podle jména', () => {
    const local = [course('a', 'Beroun', '2026-05-01T10:00:00.000Z')]
    const incoming = [course('b', 'Albatross', '2026-05-01T10:00:00.000Z')]

    expect(mergeCourses(local, incoming).map((c) => c.name)).toEqual([
      'Albatross',
      'Beroun',
    ])
  })

  it('při shodě id vyhrává novější verze hřiště', () => {
    // Doplněné SI je ruční práce, o kterou obnova nesmí připravit.
    const local = [course('a', 'Beroun', '2026-05-01T10:00:00.000Z', [1, 2, 3])]
    const incoming = [course('a', 'Beroun', '2026-06-01T10:00:00.000Z', [3, 1, 2])]

    expect(mergeCourses(local, incoming)[0]?.strokeIndex).toEqual([3, 1, 2])
  })

  it('starší verze hřiště tu novější nepřebije', () => {
    const local = [course('a', 'Beroun', '2026-06-01T10:00:00.000Z', [3, 1, 2])]
    const incoming = [course('a', 'Beroun', '2026-05-01T10:00:00.000Z', [1, 2, 3])]

    expect(mergeCourses(local, incoming)[0]?.strokeIndex).toEqual([3, 1, 2])
  })

  it('záloha z verze bez hřišť se načte s prázdným seznamem', () => {
    const raw = JSON.parse(fileWith({})) as BackupFile
    delete (raw.data as { courses?: unknown }).courses

    const result = parseBackup(JSON.stringify(raw))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.data.courses).toEqual([])
  })

  it('poškozené hřiště se do zálohy nepustí', () => {
    const broken = { id: 'x', name: 'Bez parů', holeCount: 3 } as unknown as Course
    const raw = fileWith({
      courses: [broken, course('a', 'Beroun', '2026-05-01T10:00:00.000Z')],
    })

    const result = parseBackup(raw)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.data.courses.map((c) => c.id)).toEqual(['a'])
  })
})

describe('Záloha - jméno souboru', () => {
  it('obsahuje datum vytvoření', () => {
    expect(backupFileName(new Date('2026-08-03T18:00:00.000Z'))).toBe(
      'fairsome-zaloha-2026-08-03.json',
    )
  })
})
