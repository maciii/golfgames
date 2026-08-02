/**
 * Datový model jednoho kola a základní výpočty nad ním.
 *
 * Model je záměrně společný pro všechny hry - hry se liší jen tím, jak z
 * uložených ran spočítají výsledek (viz src/games/).
 */

export type PlayerId = string

export interface Player {
  id: PlayerId
  name: string
}

/** Dvojice hráčů u týmových her. */
export interface Team {
  id: string
  playerIds: PlayerId[]
}

export type Currency = 'CZK' | 'EUR'

/** Nastavení bodování a sázky, společné všem hrám. */
export interface RoundSettings {
  currency: Currency
  /** Kolik peněz je jeden bod (skin, vyhraná jamka). */
  pointValue: number
  /** Devátá a osmnáctá jamka se počítají dvojnásobně. */
  doubleClosingHoles: boolean
}

/** Obvyklá sázka podle měny: desetikoruna, nebo euro za bod. */
export const DEFAULT_POINT_VALUE: Record<Currency, number> = {
  CZK: 10,
  EUR: 1,
}

export const DEFAULT_SETTINGS: RoundSettings = {
  currency: 'CZK',
  pointValue: DEFAULT_POINT_VALUE.CZK,
  doubleClosingHoles: false,
}

/** Jamky, které se při zapnuté volbě počítají dvojnásobně (1-based). */
export const DOUBLE_HOLES = [9, 18]

export interface Round {
  id: string
  gameId: string
  /** ISO timestamp založení kola. */
  createdAt: string
  /** ISO timestamp ukončení; dokud chybí, je kolo rozehrané. */
  finishedAt?: string
  players: Player[]
  /** Prázdné u her, které se hrají za jednotlivce. */
  teams: Team[]
  holeCount: number
  /** Par každé jamky, délka === holeCount. */
  pars: number[]
  /** scores[playerId][holeIndex] === null znamená "zatím nezapsáno". */
  scores: Record<PlayerId, (number | null)[]>
  /** Jamka zobrazená naposledy, 0-based. */
  currentHole: number
  /** Bodování a sázka; kolo si je nese, ať archiv sedí i po změně předvoleb. */
  settings: RoundSettings
}

export const DEFAULT_PAR = 4

/** Nejvyšší zapsatelný počet ran na jamce - pojistka proti překliku. */
export const MAX_STROKES = 20

export interface CreateRoundOptions {
  gameId: string
  playerNames: string[]
  holeCount: number
  /** Rozdělení do týmů po indexech hráčů, např. [[0, 1], [2, 3]]. */
  teamIndices?: number[][]
  settings?: RoundSettings
}

export function createRound({
  gameId,
  playerNames,
  holeCount,
  teamIndices,
  settings = DEFAULT_SETTINGS,
}: CreateRoundOptions): Round {
  const players: Player[] = playerNames.map((name, i) => ({
    id: `p${i + 1}`,
    name: name.trim() || `Hráč ${i + 1}`,
  }))

  const scores: Record<PlayerId, (number | null)[]> = {}
  for (const player of players) {
    scores[player.id] = Array<number | null>(holeCount).fill(null)
  }

  const teams: Team[] = (teamIndices ?? []).map((indices, i) => ({
    id: `t${i + 1}`,
    playerIds: indices
      .map((index) => players[index]?.id)
      .filter((id): id is PlayerId => id !== undefined),
  }))

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId,
    createdAt: new Date().toISOString(),
    players,
    teams,
    holeCount,
    pars: Array<number>(holeCount).fill(DEFAULT_PAR),
    scores,
    currentHole: 0,
    settings: { ...settings },
  }
}

/**
 * Kolikrát se jamka počítá. Devátá a osmnáctá mohou být za dvojnásobek -
 * u devítijamkového kola tak dvojnásobí poslední jamku.
 */
export function holeMultiplier(round: Round, hole: number): number {
  return round.settings.doubleClosingHoles && DOUBLE_HOLES.includes(hole + 1) ? 2 : 1
}

/** Tým se pojmenovává podle hráčů, ať se drží v souladu se zadanými jmény. */
export function teamName(round: Round, team: Team): string {
  return team.playerIds
    .map((id) => round.players.find((p) => p.id === id)?.name ?? '?')
    .join(' + ')
}

export function playerName(round: Round, playerId: PlayerId): string {
  return round.players.find((p) => p.id === playerId)?.name ?? '?'
}

export function scoreAt(round: Round, playerId: PlayerId, hole: number): number | null {
  return round.scores[playerId]?.[hole] ?? null
}

export function parAt(round: Round, hole: number): number {
  return round.pars[hole] ?? DEFAULT_PAR
}

/** Rány vůči paru na jedné jamce; null, když hráč jamku nezapsal. */
export function diffToPar(round: Round, playerId: PlayerId, hole: number): number | null {
  const score = scoreAt(round, playerId, hole)
  return score === null ? null : score - parAt(round, hole)
}

/** Součet ran hráče přes zapsané jamky. */
export function strokeTotal(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).reduce<number>((sum, s) => sum + (s ?? 0), 0)
}

/** Kolik jamek už má hráč zapsaných. */
export function holesPlayed(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).filter((s) => s !== null).length
}

/** Součet parů jen za jamky, které hráč zapsal - kvůli férovému "vs par". */
export function parForPlayedHoles(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).reduce<number>(
    (sum, s, hole) => (s === null ? sum : sum + parAt(round, hole)),
    0,
  )
}

export function isHoleComplete(round: Round, hole: number): boolean {
  return round.players.every((p) => scoreAt(round, p.id, hole) !== null)
}

export function isRoundComplete(round: Round): boolean {
  for (let hole = 0; hole < round.holeCount; hole++) {
    if (!isHoleComplete(round, hole)) return false
  }
  return true
}

/** Hráči daného týmu v pořadí, v jakém jsou v týmu uvedení. */
export function teamPlayers(round: Round, team: Team): Player[] {
  return team.playerIds
    .map((id) => round.players.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined)
}

/**
 * Hráči v pořadí pro scorekartu: u týmových her po dvojicích, ať jsou rány
 * partnerů vedle sebe a body dvojice stály hned za nimi.
 */
export function scorecardPlayers(round: Round): Player[] {
  if (round.teams.length === 0) return round.players
  const ordered = round.teams.flatMap((team) => teamPlayers(round, team))
  // Hráč mimo dvojici by jinak ze scorekarty zmizel.
  const missing = round.players.filter((p) => !ordered.some((o) => o.id === p.id))
  return [...ordered, ...missing]
}

/** Formátuje rozdíl vůči paru: -2 -> "-2", 0 -> "E", 3 -> "+3". */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

/** Datum kola v českém formátu pro archiv. */
export function formatRoundDate(round: Round): string {
  return new Date(round.createdAt).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}
