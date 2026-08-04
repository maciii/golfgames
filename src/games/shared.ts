import type { Round, Team } from '../types'
import { isHoleStarted, scoreAt } from '../types'
import { t } from '../i18n'

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

/** Součet dvojice na jamce: kolik míčů dohrála a kolik to dalo ran. */
export interface AggregateResult {
  played: number
  strokes: number
}

/**
 * Součet ran dvojice na jamce.
 *
 * Kdo jamku vzdal, se do součtu nepočítá - sčítají se rány těch, kdo dohráli.
 * Vrací null, dokud se na jamce vůbec nehrálo.
 */
export function teamAggregate(
  round: Round,
  team: Team,
  hole: number,
): AggregateResult | null {
  if (!isHoleStarted(round, hole)) return null

  const entered = team.playerIds
    .map((id) => scoreAt(round, id, hole))
    .filter((s): s is number => s !== null)

  return {
    played: entered.length,
    strokes: entered.reduce((sum, s) => sum + s, 0),
  }
}

/**
 * Porovná součty dvojic. Přednost má dvojice s víc dohranými míči; při stejném
 * počtu rozhoduje nižší součet. Škrtnutím míče si tak dvojice nepomůže.
 * Vrací index vítěze, nebo null při shodě či nerozehrané jamce.
 */
export function aggregateWins(
  a: AggregateResult | null,
  b: AggregateResult | null,
): 0 | 1 | null {
  if (!a || !b) return null
  if (a.played !== b.played) return a.played > b.played ? 0 : 1
  if (a.strokes === b.strokes) return null
  return a.strokes < b.strokes ? 0 : 1
}

/** Hodnota součtu do UI. */
export function formatAggregate(result: AggregateResult | null): string {
  if (!result) return t('common.dash')
  return result.played === 0 ? t('best.conceded') : `${result.strokes}`
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
  if (value === null) return t('common.dash')
  return value === CONCEDED ? t('best.conceded') : `${value}`
}
