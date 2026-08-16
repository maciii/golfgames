import type { BonusId, GameOptions, Round, RoundSettings } from './types'
import {
  BONUSES,
  DEFAULT_GAME_OPTIONS,
  DEFAULT_RESULT_MULTIPLIERS,
  DEFAULT_SETTINGS,
  firstHoleNumber,
} from './types'
import { getGame } from './games'
import type { Course } from './courses/types'
import { isValidCourse, normalizeCourse } from './courses/types'
import { localeTag } from './i18n'

/**
 * Perzistence v localStorage.
 *
 * Aplikace nemá server ani účty - všechno zůstává v telefonu. Klíče nesou
 * verzi (`.v1`), aby šlo případnou změnu tvaru dat poznat a odbavit.
 *
 * Zápis skóre je důležitější než ukládání, takže selhání localStorage
 * (privátní režim, plná kvóta) se tiše ignoruje a hra běží dál.
 */

const CURRENT_KEY = 'golfgames.currentRound.v1'
const ARCHIVE_KEY = 'golfgames.archive.v1'
const ROSTER_KEY = 'golfgames.roster.v1'
const SETTINGS_KEY = 'golfgames.settings.v1'
const GAME_OPTIONS_KEY = 'golfgames.gameOptions.v1'
const COURSES_KEY = 'golfgames.courses.v1'
const FAVORITE_COURSES_KEY = 'golfgames.favoriteCourses.v1'
const DELETED_ROUNDS_KEY = 'golfgames.deletedRounds.v1'

/** Kolik odehraných kol se drží v archivu. */
export const ARCHIVE_LIMIT = 100

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* zápis skóre běží dál i bez uložení */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * Hrubá kontrola tvaru: poškozená data radši zahodíme, než spadnout.
 *
 * Exportované kvůli záloze - importovaný soubor prochází stejnou kontrolou
 * jako data z localStorage, ať se cizí JSON nedostane dál.
 */
export function isValidRound(round: unknown): round is Round {
  if (!round || typeof round !== 'object') return false
  const r = round as Partial<Round>
  return (
    Array.isArray(r.players) &&
    r.players.length > 0 &&
    Array.isArray(r.pars) &&
    typeof r.scores === 'object' &&
    r.scores !== null
  )
}

/**
 * Doplní pole, která ve starších uložených kolech chybí.
 *
 * Exportované kvůli záloze; je to čistá funkce, takže se dá použít i na kolo,
 * které nepřišlo z localStorage.
 */
export function normalizeRound(round: Round): Round {
  const settings = { ...DEFAULT_SETTINGS, ...(round.settings ?? {}) }

  // Hřiště s nesedícím stroke indexem by rozdalo rány mimo pole jamek, takže
  // se radši zahodí celý údaj - kolo se pak počítá brutto jako dřív.
  const course =
    round.course && Array.isArray(round.course.strokeIndex)
      ? {
          ...round.course,
          strokeIndex:
            round.course.strokeIndex.length === round.holeCount
              ? [...round.course.strokeIndex]
              : [],
          // Nabídka odpališť je pole objektů, takže se kopíruje po prvcích -
          // jinak by ji kolo sdílelo s tím, odkud přišla (invariant #2).
          ...(Array.isArray(round.course.tees)
            ? { tees: round.course.tees.map((tee) => ({ ...tee })) }
            : {}),
          ...(round.course.composite ? { composite: { ...round.course.composite } } : {}),
        }
      : undefined

  // Číslo první jamky posouvá číslování i dvojnásobné jamky, takže poškozená
  // hodnota se zahodí; kolo od jedničky si údaj nenese vůbec.
  const startHole = firstHoleNumber(round)

  return {
    ...round,
    ...(course ? { course } : {}),
    startHole: startHole > 1 ? startHole : undefined,
    // Kola z verzí před synchronizací čas změny nemají; datum ukončení
    // (u nedohraných založení) je nejlepší dostupný odhad.
    updatedAt: round.updatedAt ?? round.finishedAt ?? round.createdAt,
    teams: Array.isArray(round.teams) ? round.teams : [],
    holePairings: round.holePairings ?? {},
    bonuses: round.bonuses ?? {},
    settings: {
      ...settings,
      options: {
        ...DEFAULT_GAME_OPTIONS,
        // Volba se dřív ukládala v settings, ne v options.
        ...('doubleClosingHoles' in settings
          ? { doubleClosingHoles: Boolean(settings.doubleClosingHoles) }
          : {}),
        // Dohrané kolo bez volby „Uplatňovat HCP" se hrálo v době, kdy se
        // birdie a eagle počítaly z netto ran vždycky. Archiv musí zůstat
        // takový, jak se hrálo a jak se za něj zaplatilo - nová výchozí
        // hodnota (brutto) platí až pro kola založená potom.
        ...(settings.options !== undefined &&
        !('multipliersWithHandicap' in settings.options) &&
        round.finishedAt !== undefined
          ? { multipliersWithHandicap: true }
          : {}),
        ...(settings.options ?? {}),
        resultMultipliers: {
          ...DEFAULT_RESULT_MULTIPLIERS,
          ...(settings.options?.resultMultipliers ?? {}),
        },
      },
    },
  }
}

// --- rozehrané kolo -------------------------------------------------------

export function loadCurrentRound(): Round | null {
  const round = read<Round>(CURRENT_KEY)
  return isValidRound(round) ? normalizeRound(round) : null
}

export function saveCurrentRound(round: Round | null): void {
  if (round === null) remove(CURRENT_KEY)
  else write(CURRENT_KEY, round)
}

/** Ids kol, která uživatel výslovně zahodil a nesmí se vrátit ze synchronizace. */
export function loadDeletedRoundIds(): string[] {
  const ids = read<unknown>(DELETED_ROUNDS_KEY)
  if (!Array.isArray(ids)) return []
  return [
    ...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)),
  ]
}

export function markRoundDeleted(roundId: string): void {
  if (!roundId) return
  write(DELETED_ROUNDS_KEY, [...new Set([...loadDeletedRoundIds(), roundId])])
}

/** Po úspěšné synchronizaci odstraní lokální tombstony, které už cloud zná. */
export function clearDeletedRoundIds(roundIds: string[]): void {
  if (roundIds.length === 0) return
  const deleted = new Set(roundIds)
  write(
    DELETED_ROUNDS_KEY,
    loadDeletedRoundIds().filter((roundId) => !deleted.has(roundId)),
  )
}

// --- archiv odehraných kol ------------------------------------------------

export function loadArchive(): Round[] {
  const archive = read<Round[]>(ARCHIVE_KEY)
  if (!Array.isArray(archive)) return []
  return archive.filter(isValidRound).map(normalizeRound)
}

/**
 * Uloží kolo do archivu. Opakované uložení téhož kola (např. po dodatečné
 * opravě skóre) starý záznam přepíše místo zdvojení.
 */
export function archiveRound(round: Round): void {
  const rest = loadArchive().filter((r) => r.id !== round.id)
  write(ARCHIVE_KEY, [round, ...rest].slice(0, ARCHIVE_LIMIT))
}

/**
 * Přepíše kolo, které v archivu už je, **na jeho místě**.
 *
 * `archiveRound()` staví nejnovější kolo na začátek seznamu, což je správné
 * při ukládání dohraného kola, ale ne při dodatečné opravě: oprava skóre
 * z loňska by tím kolo vytáhla na první místo v archivu i na domovskou
 * obrazovku jako „poslední odehraná hra". Kolo, které v archivu není, se
 * neukládá - editace se vždycky týká existujícího záznamu.
 */
export function updateArchivedRound(round: Round): void {
  const archive = loadArchive()
  if (!archive.some((r) => r.id === round.id)) return
  write(
    ARCHIVE_KEY,
    archive.map((r) => (r.id === round.id ? round : r)),
  )
}

export function deleteArchivedRound(roundId: string): void {
  write(
    ARCHIVE_KEY,
    loadArchive().filter((r) => r.id !== roundId),
  )
}

/**
 * Přepíše celý archiv najednou - používá obnova ze zálohy, která má výsledný
 * seznam už poskládaný a nemá smysl ho ukládat kolo po kole.
 */
export function saveArchive(rounds: Round[]): void {
  write(ARCHIVE_KEY, rounds.slice(0, ARCHIVE_LIMIT))
}

// --- předvolby bodování ---------------------------------------------------

/**
 * Naposledy použité nastavení sázky. Slouží jen jako předvyplnění dalšího
 * kola - samotné kolo si nese vlastní kopii, aby archiv seděl i po změně.
 */
export function loadSettings(): RoundSettings {
  return { ...DEFAULT_SETTINGS, ...(read<RoundSettings>(SETTINGS_KEY) ?? {}) }
}

export function saveSettings(settings: RoundSettings): void {
  write(SETTINGS_KEY, settings)
}

/**
 * Volby bodování se pamatují zvlášť pro každou hru - Best + Součet a Skins
 * mají jiné extra body a nemá smysl je přepisovat jedno druhým.
 */
/**
 * Výchozí hodnoty extra bodů pro hru.
 *
 * U her, kde jsou extra body **vedlejší sázka** (jamkovka, Stableford, Dots),
 * jsou nulové: nabídnout je má appka všude, ale hrát se o ně začne teprve
 * tehdy, když si někdo hodnotu zadá. Hry, které je mají v bodování odjakživa,
 * si nechávají hodnoty z katalogu.
 */
function defaultBonusValues(gameId: string): Record<BonusId, number> {
  if (!getGame(gameId).scoringOptions.bonusesAsSideBet) {
    return DEFAULT_GAME_OPTIONS.bonusValues
  }
  return Object.fromEntries(BONUSES.map((bonus) => [bonus.id, 0])) as Record<
    BonusId,
    number
  >
}

export function loadGameOptions(gameId: string): GameOptions {
  const all = read<Record<string, GameOptions>>(GAME_OPTIONS_KEY) ?? {}
  const stored: Partial<GameOptions> = all[gameId] ?? {}
  return {
    ...DEFAULT_GAME_OPTIONS,
    ...stored,
    bonusValues: {
      ...defaultBonusValues(gameId),
      ...(stored.bonusValues ?? {}),
    },
    resultMultipliers: {
      ...DEFAULT_RESULT_MULTIPLIERS,
      ...(stored.resultMultipliers ?? {}),
    },
  }
}

export function saveGameOptions(gameId: string, options: GameOptions): void {
  const all = read<Record<string, GameOptions>>(GAME_OPTIONS_KEY) ?? {}
  write(GAME_OPTIONS_KEY, { ...all, [gameId]: options })
}

/** Volby všech her najednou - pro zálohu, která je ukládá jako celek. */
export function loadAllGameOptions(): Record<string, GameOptions> {
  return read<Record<string, GameOptions>>(GAME_OPTIONS_KEY) ?? {}
}

export function saveAllGameOptions(all: Record<string, GameOptions>): void {
  write(GAME_OPTIONS_KEY, all)
}

// --- hřiště ---------------------------------------------------------------

/**
 * Hřiště, která si uživatel zadal nebo naimportoval.
 *
 * Katalog hřišť žije na serveru a do telefonu se nikdy nestahuje celý - tady
 * končí jen ta hřiště, která si někdo opravdu vybral. Ukládají se natrvalo
 * (ne do Cache API, kterou umí prohlížeč při nedostatku místa sám vyprázdnit),
 * takže hřiště hrané jednou je k dispozici i bez signálu.
 */
export function loadCourses(): Course[] {
  const courses = read<Course[]>(COURSES_KEY)
  if (!Array.isArray(courses)) return []
  return courses
    .filter(isValidCourse)
    .map(normalizeCourse)
    .sort((a, b) => a.name.localeCompare(b.name, localeTag()))
}

/** Uloží hřiště; stejné id přepíše místo zdvojení. */
export function saveCourse(course: Course): Course[] {
  const rest = loadCourses().filter((c) => c.id !== course.id)
  const courses = [
    ...rest,
    normalizeCourse({ ...course, updatedAt: new Date().toISOString() }),
  ].sort((a, b) => a.name.localeCompare(b.name, localeTag()))
  write(COURSES_KEY, courses)
  return courses
}

export function deleteCourse(courseId: string): Course[] {
  const courses = loadCourses().filter((c) => c.id !== courseId)
  write(COURSES_KEY, courses)
  saveFavoriteCourseIds(loadFavoriteCourseIds().filter((id) => id !== courseId))
  return courses
}

export function findCourse(courseId: string): Course | undefined {
  return loadCourses().find((c) => c.id === courseId)
}

/** Přepíše celý seznam hřišť - pro obnovu ze zálohy. */
export function saveCourses(courses: Course[]): void {
  write(COURSES_KEY, courses.filter(isValidCourse).map(normalizeCourse))
}

/** Ids hřišť označených jako oblíbená; fungují i pro katalogová hřiště dosud bez kopie. */
export function loadFavoriteCourseIds(): string[] {
  const ids = read<unknown>(FAVORITE_COURSES_KEY)
  if (!Array.isArray(ids)) return []
  return [
    ...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)),
  ]
}

export function saveFavoriteCourseIds(ids: string[]): void {
  write(FAVORITE_COURSES_KEY, [
    ...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0)),
  ])
}

export function toggleFavoriteCourse(courseId: string): boolean {
  if (!courseId) return false
  const favorites = new Set(loadFavoriteCourseIds())
  const wasFavorite = favorites.has(courseId)
  if (wasFavorite) favorites.delete(courseId)
  else favorites.add(courseId)
  saveFavoriteCourseIds([...favorites])
  return !wasFavorite
}

// --- seznam hráčů ---------------------------------------------------------

export interface RosterEntry {
  id: string
  name: string
  /**
   * Handicapový index hráče, ať se nezadává před každým kolem znovu.
   * Chybí u hráčů uložených před zavedením handicapů.
   */
  handicapIndex?: number
  /**
   * Odpaliště, ze kterého hráč obvykle hraje ('yellow', 'red', ...).
   *
   * Id odpališť jsou v katalogu barvy, takže preference platí i na hřišti,
   * kde hráč ještě nehrál. Když ho hřiště nemá, použije se výchozí odpaliště
   * kola.
   */
  preferredTeeId?: string
  /**
   * Hráč zvýrazněný na domovské obrazovce pro rychlé založení kola.
   *
   * Čistě lokální předvolba - nepřenáší se do zakládání kola ani přes ni
   * neprochází žádný výpočet, proto na rozdíl od `favoriteCourses` nepotřebuje
   * vlastní klíč: obojí žije přímo na záznamu hráče jako `preferredTeeId`.
   */
  favorite?: boolean
}

/** Přepne, jestli je hráč zvýrazněný na domovské obrazovce. */
export function toggleRosterFavorite(entryId: string): RosterEntry[] {
  const roster = loadRoster().map((entry) =>
    entry.id === entryId ? { ...entry, favorite: !entry.favorite } : entry,
  )
  write(ROSTER_KEY, roster)
  return roster
}

/**
 * Zapamatuje si odpaliště u uloženého hráče. `undefined` znamená "nic
 * neměň" (kolo bez hřiště žádné odpaliště nemá a nesmí smazat dřívější
 * volbu), prázdný řetězec naopak uloženou preferenci smaže.
 */
export function setRosterTee(entryId: string, teeId: string | undefined): RosterEntry[] {
  const roster = loadRoster().map((entry) => {
    if (entry.id !== entryId || teeId === undefined) return entry
    if (teeId === '') {
      const next = { ...entry }
      delete next.preferredTeeId
      return next
    }
    return { ...entry, preferredTeeId: teeId }
  })
  write(ROSTER_KEY, roster)
  return roster
}

/** Zapamatuje si handicapový index u uloženého hráče. */
export function setRosterHandicap(
  entryId: string,
  handicapIndex: number | undefined,
): RosterEntry[] {
  const roster = loadRoster().map((entry) =>
    entry.id === entryId
      ? { ...entry, ...(handicapIndex === undefined ? {} : { handicapIndex }) }
      : entry,
  )
  write(ROSTER_KEY, roster)
  return roster
}

/** Uložení spoluhráči, seřazení podle abecedy. */
export function loadRoster(): RosterEntry[] {
  const roster = read<RosterEntry[]>(ROSTER_KEY)
  if (!Array.isArray(roster)) return []
  return roster
    .filter((e): e is RosterEntry => Boolean(e && typeof e.name === 'string' && e.name))
    .sort((a, b) => a.name.localeCompare(b.name, localeTag()))
}

/**
 * Doplní jména do seznamu hráčů. Volá se při startu kola, takže spoluhráči
 * přibývají sami a nikde se nemusí zakládat ručně. Duplicity (bez ohledu na
 * velikost písmen) se ignorují, ale nově zadaný HCP index se u nich obnoví.
 */
export function addToRoster(
  names: string[],
  handicapIndexes?: (number | undefined)[],
  teeIds?: (string | undefined)[],
): RosterEntry[] {
  const roster = loadRoster()

  for (const [index, raw] of names.entries()) {
    const name = raw.trim()
    if (!name) continue

    const handicapIndex = handicapIndexes?.[index]
    const storedIndex =
      typeof handicapIndex === 'number' && Number.isFinite(handicapIndex)
        ? handicapIndex
        : undefined
    const teeId = teeIds?.[index]
    const storedTee = typeof teeId === 'string' && teeId ? teeId : undefined
    const known = roster.find(
      (entry) => entry.name.trim().toLowerCase() === name.toLowerCase(),
    )

    if (known) {
      // Prázdný nebo ručně zadaný počet ran nesmí přepsat uložený HCP index -
      // a stejné pravidlo platí pro odpaliště: kolo bez hřiště žádné nemá.
      if (storedIndex !== undefined) known.handicapIndex = storedIndex
      if (storedTee !== undefined) known.preferredTeeId = storedTee
      continue
    }

    roster.push({
      id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      name,
      ...(storedIndex !== undefined ? { handicapIndex: storedIndex } : {}),
      ...(storedTee !== undefined ? { preferredTeeId: storedTee } : {}),
    })
  }

  const sorted = roster.sort((a, b) => a.name.localeCompare(b.name, localeTag()))
  write(ROSTER_KEY, sorted)
  return sorted
}

export function removeFromRoster(entryId: string): RosterEntry[] {
  const roster = loadRoster().filter((e) => e.id !== entryId)
  write(ROSTER_KEY, roster)
  return roster
}

/** Přepíše celý seznam hráčů - pro obnovu ze zálohy. */
export function saveRoster(roster: RosterEntry[]): void {
  write(ROSTER_KEY, roster)
}
