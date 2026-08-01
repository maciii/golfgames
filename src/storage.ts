import type { Round } from './types'

const CURRENT_KEY = 'golfgames.currentRound.v1'
const HISTORY_KEY = 'golfgames.history.v1'
const HISTORY_LIMIT = 20

// localStorage může selhat (privátní režim, plná kvóta). Zápis skóre je
// důležitější než perzistence, takže chyby jen spolkneme.
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
    /* offline zápis skóre běží dál i bez uložení */
  }
}

export function loadCurrentRound(): Round | null {
  const round = read<Round>(CURRENT_KEY)
  // Hrubá kontrola tvaru: starší/poškozená data radši zahodíme, než abychom
  // spadli při renderu.
  if (!round || !Array.isArray(round.players) || !round.players.length) return null
  if (!Array.isArray(round.pars) || typeof round.scores !== 'object') return null
  // Kola uložená před zavedením týmů `teams` nemají.
  return { ...round, teams: Array.isArray(round.teams) ? round.teams : [] }
}

export function saveCurrentRound(round: Round | null): void {
  if (round === null) {
    try {
      localStorage.removeItem(CURRENT_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  write(CURRENT_KEY, round)
}

export function loadHistory(): Round[] {
  const history = read<Round[]>(HISTORY_KEY)
  return Array.isArray(history) ? history : []
}

export function addToHistory(round: Round): void {
  const history = loadHistory().filter((r) => r.id !== round.id)
  write(HISTORY_KEY, [round, ...history].slice(0, HISTORY_LIMIT))
}
