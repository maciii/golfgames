import type { Round, Team } from '../types'
import { scoreAt } from '../types'

/**
 * Výpočty, které potřebuje víc her najednou (lepší míč, součet dvojice).
 */

/**
 * Lepší míč dvojice na jamce = nejnižší zapsaná rána.
 *
 * Stačí zápis jednoho z partnerů: kdo jamku vzdal, tým nebrzdí - přesně tak
 * se lepší míč hraje i na hřišti.
 */
export function teamBestBall(round: Round, team: Team, hole: number): number | null {
  const entered = team.playerIds
    .map((id) => scoreAt(round, id, hole))
    .filter((s): s is number => s !== null)
  return entered.length > 0 ? Math.min(...entered) : null
}

/**
 * Součet ran dvojice na jamce.
 *
 * Na rozdíl od lepšího míče dává smysl až se zápisem obou partnerů - jinak by
 * dvojice s jedním nedohraným míčem vycházela nesprávně lépe.
 */
export function teamAggregate(round: Round, team: Team, hole: number): number | null {
  const scores = team.playerIds.map((id) => scoreAt(round, id, hole))
  if (scores.some((s) => s === null)) return null
  return scores.reduce<number>((sum, s) => sum + (s ?? 0), 0)
}

/** Součet ran dvojice přes celé kolo (jen za zapsané jamky). */
export function teamStrokeTotal(round: Round, team: Team): number {
  let total = 0
  for (const id of team.playerIds) {
    for (const score of round.scores[id] ?? []) total += score ?? 0
  }
  return total
}

/**
 * Porovná dvě hodnoty, kde nižší je lepší.
 * Vrací index vítěze, nebo null při shodě či chybějícím zápisu.
 */
export function lowerWins(a: number | null, b: number | null): 0 | 1 | null {
  if (a === null || b === null) return null
  if (a === b) return null
  return a < b ? 0 : 1
}
