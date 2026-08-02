import type { Round, Team } from '../types'
import { isHoleStarted, scoreAt } from '../types'

/**
 * Výpočty, které potřebuje víc her najednou (lepší míč, součet dvojice).
 *
 * Chybějící zápis na rozehrané jamce znamená, že hráč jamku vzdal - nesmí se
 * proto tvářit jako "ještě nehráno". Vzdaná hodnota se reprezentuje jako
 * CONCEDED, což je nekonečno: v porovnáních prohraje s jakýmkoli skóre, ale
 * dvě vzdané hodnoty proti sobě vyjdou jako shoda.
 */

/** Vzdaná jamka - horší než jakýkoli zapsaný počet ran. */
export const CONCEDED = Number.POSITIVE_INFINITY

/**
 * Lepší míč dvojice na jamce = nejnižší zapsaná rána.
 *
 * Stačí zápis jednoho z partnerů - kdo jamku vzdal, tým nebrzdí. Když jamku
 * vzdali oba, je lepší míč vzdaný.
 * Vrací null, dokud se na jamce vůbec nehrálo.
 */
export function teamBestBall(round: Round, team: Team, hole: number): number | null {
  if (!isHoleStarted(round, hole)) return null

  const entered = team.playerIds
    .map((id) => scoreAt(round, id, hole))
    .filter((s): s is number => s !== null)

  return entered.length > 0 ? Math.min(...entered) : CONCEDED
}

/**
 * Součet ran dvojice na jamce.
 *
 * Na rozdíl od lepšího míče ho dvojice ztrácí, jakmile jeden z partnerů jamku
 * nedohraje - součet totiž nejde dopočítat a soupeř ho tím pádem bere.
 * Vrací null, dokud se na jamce vůbec nehrálo.
 */
export function teamAggregate(round: Round, team: Team, hole: number): number | null {
  if (!isHoleStarted(round, hole)) return null

  const scores = team.playerIds.map((id) => scoreAt(round, id, hole))
  if (scores.some((s) => s === null)) return CONCEDED

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
 * Vrací index vítěze, nebo null při shodě či nerozehrané jamce.
 */
export function lowerWins(a: number | null, b: number | null): 0 | 1 | null {
  if (a === null || b === null) return null
  // Shoda i "obojí vzdáno" znamená, že bod nedostane nikdo.
  if (a === b) return null
  return a < b ? 0 : 1
}

/** Hodnota do UI: pomlčka pro nehranou jamku, slovo pro vzdanou. */
export function formatSideScore(value: number | null): string {
  if (value === null) return '–'
  return value === CONCEDED ? 'vzdáno' : `${value}`
}
