import type { GameOptions, Round, RoundSettings } from './types'
import { DEFAULT_SETTINGS, roundTimestamp } from './types'
import { localeTag } from './i18n'
import type { Course } from './courses/types'
import { isValidCourse, normalizeCourse } from './courses/types'
import type { RosterEntry } from './storage'
import {
  ARCHIVE_LIMIT,
  isValidRound,
  loadAllGameOptions,
  loadArchive,
  loadCourses,
  loadCurrentRound,
  loadFavoriteCourseIds,
  loadRoster,
  loadSettings,
  normalizeRound,
  saveAllGameOptions,
  saveArchive,
  saveCourses,
  saveCurrentRound,
  saveFavoriteCourseIds,
  saveRoster,
  saveSettings,
} from './storage'
import { APP_VERSION } from './version'

/**
 * Záloha dat do souboru a obnova z něj.
 *
 * Data aplikace žijí jen v telefonu, takže smazané úložiště prohlížeče nebo
 * výměna zařízení znamenají ztrátu archivu. Export do JSON je nejlevnější
 * pojistka a zároveň cesta, jak si data odnést jinam.
 *
 * Modul je rozdělený na čisté funkce (slučování, kontrola souboru), které jdou
 * testovat bez prohlížeče, a tenké obálky nad localStorage.
 */

/**
 * Verze tvaru souboru se zálohou. Zvedá se jen při změně, kterou starší
 * aplikace neumí přečíst - novější soubor pak radši odmítneme, než abychom ho
 * přečetli špatně.
 */
export const BACKUP_SCHEMA_VERSION = 1

/** Poznávací značka souboru, ať nejde omylem načíst cizí JSON. */
export const BACKUP_FORMAT = 'golfgames-backup'

export interface BackupData {
  /** Rozehrané kolo; null, když žádné neběží. */
  currentRound: Round | null
  archive: Round[]
  roster: RosterEntry[]
  settings: RoundSettings
  /** Volby bodování podle id hry. */
  gameOptions: Record<string, GameOptions>
  /** Oblíbená hřiště podle stabilního id. */
  favoriteCourseIds?: string[]
  /**
   * Uložená hřiště. Chybí v zálohách z verzí před jejich zavedením, proto se
   * schéma nezvedá - starší aplikace pole prostě přehlédne.
   */
  courses: Course[]
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  schemaVersion: number
  /** Verze aplikace, která zálohu vytvořila - jen pro diagnostiku. */
  appVersion: string
  exportedAt: string
  data: BackupData
}

/**
 * Jak se importovaná data potkají s těmi současnými.
 *
 * `merge` nic neztratí a při shodě dá přednost novějšímu kolu; `replace`
 * současný stav zahodí a nastaví přesně to, co je v záloze.
 */
export type ImportMode = 'merge' | 'replace'

export type ParseResult =
  { ok: true; backup: BackupFile } | { ok: false; reason: 'invalid' | 'tooNew' }

export interface ImportSummary {
  /** Kolik kol je v archivu po importu. */
  archive: number
  /** Kolik kol přibylo oproti stavu před importem. */
  added: number
  roster: number
  /** Nahradilo se rozehrané kolo? */
  currentRoundReplaced: boolean
}

// --- čisté funkce ---------------------------------------------------------

/**
 * Sloučí dva archivy podle id kola.
 *
 * Nic se nezahazuje - výsledek je sjednocení obou stran. Když se stejné kolo
 * sejde v obou, vyhrává novější podle času poslední změny; při shodě zůstává
 * místní verze, protože ta je ta, se kterou uživatel právě pracuje.
 */
export function mergeArchives(local: Round[], incoming: Round[]): Round[] {
  const byId = new Map<string, Round>()

  for (const round of local) byId.set(round.id, round)

  for (const round of incoming) {
    const existing = byId.get(round.id)
    if (!existing || roundTimestamp(round) > roundTimestamp(existing))
      byId.set(round.id, round)
  }

  return [...byId.values()]
    .sort((a, b) => roundTimestamp(b) - roundTimestamp(a))
    .slice(0, ARCHIVE_LIMIT)
}

/**
 * Sloučí seznamy hráčů podle jména bez ohledu na velikost písmen.
 * Místní záznam má přednost, ať se nemění id, na které se nikde neodkazuje.
 */
export function mergeRosters(
  local: RosterEntry[],
  incoming: RosterEntry[],
): RosterEntry[] {
  const known = new Set(local.map((e) => e.name.trim().toLowerCase()))
  const merged = [...local]

  for (const entry of incoming) {
    const name = entry.name?.trim()
    if (!name || known.has(name.toLowerCase())) continue
    known.add(name.toLowerCase())
    merged.push({
      id: entry.id,
      name,
      ...(typeof entry.handicapIndex === 'number'
        ? { handicapIndex: entry.handicapIndex }
        : {}),
      ...(typeof entry.preferredTeeId === 'string' && entry.preferredTeeId
        ? { preferredTeeId: entry.preferredTeeId }
        : {}),
      ...(entry.favorite ? { favorite: true } : {}),
    })
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name, localeTag()))
}

/**
 * Sloučí hřiště podle id; při shodě vyhrává novější podle času změny.
 *
 * Ruční doplnění SI nebo normy je práce, kterou obnova nesmí zahodit, takže
 * jako u archivu je výsledek sjednocení obou stran.
 */
export function mergeCourses(local: Course[], incoming: Course[]): Course[] {
  const byId = new Map<string, Course>()
  const stamp = (course: Course) => Date.parse(course.updatedAt ?? '') || 0

  for (const course of local) byId.set(course.id, course)

  for (const course of incoming) {
    const existing = byId.get(course.id)
    if (!existing || stamp(course) > stamp(existing)) byId.set(course.id, course)
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, localeTag()))
}

/**
 * Zkontroluje a rozbalí obsah souboru se zálohou.
 *
 * Cizí nebo poškozený JSON se odmítne (`invalid`), stejně jako soubor z novější
 * verze aplikace (`tooNew`) - ten by šlo přečíst jen napůl a tiché poškození
 * archivu je horší než odmítnutí.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'invalid' }
  const file = raw as Partial<BackupFile>
  if (file.format !== BACKUP_FORMAT) return { ok: false, reason: 'invalid' }
  if (typeof file.schemaVersion !== 'number') return { ok: false, reason: 'invalid' }
  if (file.schemaVersion > BACKUP_SCHEMA_VERSION) return { ok: false, reason: 'tooNew' }
  if (!file.data || typeof file.data !== 'object') return { ok: false, reason: 'invalid' }

  const data = file.data as Partial<BackupData>
  // Kola projdou stejnou kontrolou i doplněním jako data z localStorage,
  // takže záloha ze starší verze se cestou dovnitř sama zaktualizuje.
  const archive = Array.isArray(data.archive)
    ? data.archive.filter(isValidRound).map(normalizeRound)
    : []
  const currentRound = isValidRound(data.currentRound)
    ? normalizeRound(data.currentRound)
    : null
  const roster = Array.isArray(data.roster)
    ? data.roster.filter((e): e is RosterEntry =>
        Boolean(e && typeof e.name === 'string' && e.name),
      )
    : []
  const courses = Array.isArray(data.courses)
    ? data.courses.filter(isValidCourse).map(normalizeCourse)
    : []
  const favoriteCourseIds = Array.isArray(data.favoriteCourseIds)
    ? data.favoriteCourseIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : []

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      schemaVersion: file.schemaVersion,
      appVersion: typeof file.appVersion === 'string' ? file.appVersion : '?',
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
      data: {
        currentRound,
        archive,
        roster,
        settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
        gameOptions:
          data.gameOptions && typeof data.gameOptions === 'object'
            ? data.gameOptions
            : {},
        courses,
        favoriteCourseIds: [...new Set(favoriteCourseIds)],
      },
    },
  }
}

/** Jméno souboru s datem, ať jde ve stažených souborech poznat, co je co. */
export function backupFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `fairsome-zaloha-${stamp}.json`
}

// --- obálky nad localStorage ----------------------------------------------

/** Posbírá aktuální stav aplikace do souboru se zálohou. */
export function createBackup(): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      currentRound: loadCurrentRound(),
      archive: loadArchive(),
      roster: loadRoster(),
      settings: loadSettings(),
      gameOptions: loadAllGameOptions(),
      courses: loadCourses(),
      favoriteCourseIds: loadFavoriteCourseIds(),
    },
  }
}

/**
 * Zapíše zálohu do aplikace.
 *
 * Ve výchozím režimu `merge` se archiv i hráči sjednotí a rozehrané kolo
 * i předvolby zůstanou místní - obnova tak nemůže přepsat rozehranou hru.
 * Režim `replace` nastaví přesně stav ze zálohy.
 */
export function applyBackup(backup: BackupFile, mode: ImportMode): ImportSummary {
  const localArchive = loadArchive()
  const localRoster = loadRoster()
  const localFavoriteIds = loadFavoriteCourseIds()

  const archive =
    mode === 'replace'
      ? backup.data.archive.slice(0, ARCHIVE_LIMIT)
      : mergeArchives(localArchive, backup.data.archive)
  const roster =
    mode === 'replace'
      ? backup.data.roster
      : mergeRosters(localRoster, backup.data.roster)

  const courses =
    mode === 'replace'
      ? backup.data.courses
      : mergeCourses(loadCourses(), backup.data.courses)
  const favoriteCourseIds =
    mode === 'replace'
      ? (backup.data.favoriteCourseIds ?? [])
      : [...new Set([...localFavoriteIds, ...(backup.data.favoriteCourseIds ?? [])])]

  saveArchive(archive)
  saveRoster(roster)
  saveCourses(courses)
  saveFavoriteCourseIds(favoriteCourseIds)

  // Rozehrané kolo a předvolby přebíráme jen při náhradě, nebo když místně
  // žádné rozehrané kolo není - jinak by obnova smazala rozehranou hru.
  const localCurrent = loadCurrentRound()
  const takeCurrent = mode === 'replace' || localCurrent === null
  if (takeCurrent) saveCurrentRound(backup.data.currentRound)

  if (mode === 'replace') {
    saveSettings(backup.data.settings)
    saveAllGameOptions(backup.data.gameOptions)
  }

  return {
    archive: archive.length,
    added: archive.length - localArchive.length,
    roster: roster.length,
    currentRoundReplaced: takeCurrent && backup.data.currentRound !== null,
  }
}
