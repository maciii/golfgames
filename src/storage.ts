import type { GameOptions, Round, RoundSettings } from './types'
import {
  DEFAULT_GAME_OPTIONS,
  DEFAULT_RESULT_MULTIPLIERS,
  DEFAULT_SETTINGS,
} from './types'

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
  return {
    ...round,
    teams: Array.isArray(round.teams) ? round.teams : [],
    bonuses: round.bonuses ?? {},
    settings: {
      ...settings,
      options: {
        ...DEFAULT_GAME_OPTIONS,
        // Volba se dřív ukládala v settings, ne v options.
        ...('doubleClosingHoles' in settings
          ? { doubleClosingHoles: Boolean(settings.doubleClosingHoles) }
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
 * Volby bodování se pamatují zvlášť pro každou hru - Best Aggregate a Skins
 * mají jiné extra body a nemá smysl je přepisovat jedno druhým.
 */
export function loadGameOptions(gameId: string): GameOptions {
  const all = read<Record<string, GameOptions>>(GAME_OPTIONS_KEY) ?? {}
  const stored: Partial<GameOptions> = all[gameId] ?? {}
  return {
    ...DEFAULT_GAME_OPTIONS,
    ...stored,
    bonusValues: {
      ...DEFAULT_GAME_OPTIONS.bonusValues,
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

// --- seznam hráčů ---------------------------------------------------------

export interface RosterEntry {
  id: string
  name: string
}

/** Uložení spoluhráči, seřazení podle abecedy. */
export function loadRoster(): RosterEntry[] {
  const roster = read<RosterEntry[]>(ROSTER_KEY)
  if (!Array.isArray(roster)) return []
  return roster
    .filter((e): e is RosterEntry => Boolean(e && typeof e.name === 'string' && e.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
}

/**
 * Doplní jména do seznamu hráčů. Volá se při startu kola, takže spoluhráči
 * přibývají sami a nikde se nemusí zakládat ručně. Duplicity (bez ohledu na
 * velikost písmen) se ignorují.
 */
export function addToRoster(names: string[]): RosterEntry[] {
  const roster = loadRoster()
  const known = new Set(roster.map((e) => e.name.trim().toLowerCase()))

  for (const raw of names) {
    const name = raw.trim()
    if (!name || known.has(name.toLowerCase())) continue
    known.add(name.toLowerCase())
    roster.push({ id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`, name })
  }

  const sorted = roster.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
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
