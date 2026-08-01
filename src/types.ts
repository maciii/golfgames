export type PlayerId = string

export interface Player {
  id: PlayerId
  name: string
}

export interface Team {
  id: string
  playerIds: PlayerId[]
}

export interface Round {
  id: string
  gameId: string
  createdAt: string
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
}

export const DEFAULT_PAR = 4

export function createRound(
  gameId: string,
  playerNames: string[],
  holeCount: number,
  /** Rozdělení do týmů po indexech hráčů, např. [[0, 1], [2, 3]]. */
  teamIndices?: number[][],
): Round {
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
    id: `${Date.now()}`,
    gameId,
    createdAt: new Date().toISOString(),
    players,
    teams,
    holeCount,
    pars: Array<number>(holeCount).fill(DEFAULT_PAR),
    scores,
    currentHole: 0,
  }
}

/** Tým se pojmenovává podle hráčů, ať se drží v souladu se zadanými jmény. */
export function teamName(round: Round, team: Team): string {
  return team.playerIds
    .map((id) => round.players.find((p) => p.id === id)?.name ?? '?')
    .join(' + ')
}

export function scoreAt(round: Round, playerId: PlayerId, hole: number): number | null {
  return round.scores[playerId]?.[hole] ?? null
}

export function parAt(round: Round, hole: number): number {
  return round.pars[hole] ?? DEFAULT_PAR
}

/** Součet ran hráče přes zapsané jamky. */
export function strokeTotal(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).reduce<number>((sum, s) => sum + (s ?? 0), 0)
}

/** Kolik jamek už má hráč zapsaných. */
export function holesPlayed(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).filter((s) => s !== null).length
}

/** Součet parů jen za jamky, které hráč skutečně zapsal - kvůli férovému "vs par". */
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
