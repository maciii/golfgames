import type { Round, RoundSettings } from '../types'
import { createRound } from '../types'

/**
 * Pomocník pro testy: postaví kolo s předvyplněnými pary a skóre.
 *
 * Používají ho jen testy, do produkčního bundlu se nedostane (nic z aplikace
 * ho neimportuje).
 */
export function makeRound(options: {
  gameId: string
  players: string[]
  pars: number[]
  /** scores[hráč][jamka]; null = nezapsáno. */
  scores: (number | null)[][]
  /** Rozdělení do dvojic po indexech hráčů. */
  teams?: number[][]
  /** Nastavení sázky; bez něj se použije výchozí. */
  settings?: RoundSettings
}): Round {
  const { gameId, players, pars, scores, teams, settings } = options
  const round = createRound({
    gameId,
    playerNames: players,
    holeCount: pars.length,
    teamIndices: teams,
    settings,
  })

  round.pars = [...pars]
  round.players.forEach((player, index) => {
    round.scores[player.id] = [...(scores[index] ?? [])]
  })

  return round
}
