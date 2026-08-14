import type { PlayerId, Round } from '../types'
import { isHoleStarted } from '../types'
import { netScoreAt } from '../handicap'
import { t } from '../i18n'
import { CONCEDED, teamBestBall } from './shared'

/**
 * Jádro jamkovky (match play), společné všem jejím variantám.
 *
 * Zápas se nehraje na celkový počet ran, ale jamka po jamce: kdo zahraje
 * jamku líp, jde o jednu nahoru, shodná jamka je dělená a stav nemění.
 * Tohle pravidlo je ve všech variantách stejné - liší se jen **co je strana
 * zápasu a jak se počítá její rána na jamce**:
 *
 *   Match play, 2 hráči - stranou je hráč, ranou jeho netto skóre
 *   Four-ball, 4 hráči  - stranou je dvojice, ranou její lepší míč
 *   Foursome, 4 hráči   - stranou je dvojice, ranou její jediný míč
 *   Dvě jamkovky        - dva samostatné zápasy jednotlivců v jednom flightu
 *
 * Varianta proto dodá strany a funkci na ránu strany; zbytek (stav, notace
 * `3&2`, dormie, rozhodnutá jamka, texty do hlavičky) je tady.
 */

/** Strana zápasu - jednotlivec, nebo dvojice. */
export interface MatchSide {
  id: string
  name: string
  playerIds: PlayerId[]
}

/** Rána strany na jamce; `null` dokud se na jamce nehrálo. */
export type SideScore = (round: Round, side: MatchSide, hole: number) => number | null

export interface MatchState {
  /** Vyhrané jamky obou stran, ve stejném pořadí jako strany. */
  won: [number, number]
  /** Počet dělených jamek. */
  halved: number
  /** Kolik jamek ještě není rozhodnutých. */
  remaining: number
  /** Náskok vedoucí strany (0 při nerozhodném stavu). */
  lead: number
  /** Index vedoucí strany, nebo null při shodě. */
  leaderIndex: 0 | 1 | null
  /** Je zápas matematicky rozhodnutý? */
  decided: boolean
  /** 0-based jamka, na které se zápas stal matematicky rozhodnutým. */
  decisionHole: number | null
  /** Slovní stav zápasu do hlavičky výsledků. */
  label: string
}

/**
 * Netto rána jednotlivce na jamce.
 *
 * Chybějící zápis na rozehrané jamce = hráč jamku vzdal, soupeř ji bere.
 * `netScoreAt()` u brutto kola vrací zapsané rány beze změny, takže se to
 * nikde nemusí větvit.
 */
export function individualScore(
  round: Round,
  side: MatchSide,
  hole: number,
): number | null {
  if (!isHoleStarted(round, hole)) return null
  const id = side.playerIds[0]
  const score = id ? netScoreAt(round, id, hole) : null
  return score ?? CONCEDED
}

/** Lepší míč dvojice (four-ball). */
export function bestBallScore(
  round: Round,
  side: MatchSide,
  hole: number,
): number | null {
  return teamBestBall(round, { id: side.id, playerIds: side.playerIds }, hole)
}

/** Spočítá stav zápasu ze zapsaných jamek. */
export function matchStateOf(
  round: Round,
  sides: MatchSide[],
  sideScore: SideScore,
): MatchState {
  const [sideA, sideB] = sides
  const won: [number, number] = [0, 0]
  let halved = 0
  let settled = 0
  let decisionHole: number | null = null

  if (sideA && sideB) {
    for (let hole = 0; hole < round.holeCount; hole++) {
      const a = sideScore(round, sideA, hole)
      const b = sideScore(round, sideB, hole)
      if (a === null || b === null) continue
      settled += 1
      if (a < b) won[0] += 1
      else if (b < a) won[1] += 1
      else halved += 1

      const lead = Math.abs(won[0] - won[1])
      if (lead > round.holeCount - settled) {
        decisionHole = hole
        break
      }
    }
  }

  const remaining = round.holeCount - settled
  const diff = won[0] - won[1]
  const lead = Math.abs(diff)
  const leaderIndex = diff === 0 ? null : diff > 0 ? 0 : 1
  const decided = decisionHole !== null

  let label: string
  if (leaderIndex === null) {
    label =
      settled === 0
        ? t('match.notStarted')
        : remaining === 0
          ? t('match.allSquareFinished')
          : t('match.allSquareRemaining', { count: remaining })
  } else {
    const name = sides[leaderIndex]?.name ?? '?'
    if (decided) {
      // Golfová notace: náskok & počet jamek, které zbývaly.
      label =
        remaining === 0
          ? t('match.winsFinal', { name, lead })
          : t('match.wins', { name, lead, remaining })
    } else if (lead === remaining) {
      label = t('match.dormie', { name, lead, remaining })
    } else {
      label = t('match.leads', { name, lead, remaining })
    }
  }

  return { won, halved, remaining, lead, leaderIndex, decided, decisionHole, label }
}

/** Stav strany do tabulky a hlavičky: `2 UP`, `2 DOWN`, `AS`. */
export function sideValueLabel(state: MatchState, index: number): string {
  if (state.leaderIndex === null) return t('match.allSquare')
  return state.leaderIndex === index
    ? t('match.up', { count: state.lead })
    : t('match.down', { count: state.lead })
}

/** Krátká zpráva pod stavem stran: zbývající jamky, dormie, výsledek. */
export function compactHeaderNote(state: MatchState, outOfPlay: boolean): string {
  if (outOfPlay) return t('match.outOfPlayShort')
  if (state.decided) {
    return state.remaining > 0
      ? t('match.resultShort', { lead: state.lead, remaining: state.remaining })
      : t('match.finalShort', { lead: state.lead })
  }
  if (state.remaining === 0) return t('match.finishedShort')
  if (state.leaderIndex !== null && state.lead === state.remaining) {
    return t('match.dormieShort', { count: state.remaining })
  }
  return t('match.remainingShort', { count: state.remaining })
}

/**
 * Stav **jednoho** zápasu, když jich v kole běží víc.
 *
 * Na rozdíl od `compactHeaderNote()` vynechává zbývající jamky: ty jsou pro
 * všechny zápasy ve flightu stejné, takže patří jednou pod ně, ne dvakrát na
 * jejich řádky - v hlavičce jamky není místo. Zůstává jen to, co platí právě
 * pro tenhle zápas: dormie, výsledek, jamka mimo hru.
 */
export function matchStateNote(state: MatchState, outOfPlay: boolean): string {
  if (outOfPlay) return t('match.outOfPlayShort')
  if (state.decided) {
    return state.remaining > 0
      ? t('match.resultShort', { lead: state.lead, remaining: state.remaining })
      : t('match.finalShort', { lead: state.lead })
  }
  if (
    state.leaderIndex !== null &&
    state.remaining > 0 &&
    state.lead === state.remaining
  ) {
    return t('match.dormieOnly')
  }
  return ''
}

/** Je jamka už mimo hru, protože zápas byl rozhodnutý dřív? */
export function isOutOfPlay(state: MatchState, hole: number): boolean {
  return state.decisionHole !== null && hole > state.decisionHole
}

/** Vítězná strana jamky; dělené a po rozhodnutí neplatné jamky vrací null. */
export function holeWinner(
  round: Round,
  sides: MatchSide[],
  sideScore: SideScore,
  hole: number,
): 0 | 1 | null {
  const state = matchStateOf(round, sides, sideScore)
  if (isOutOfPlay(state, hole)) return null

  const [sideA, sideB] = sides
  if (!sideA || !sideB) return null

  const scoreA = sideScore(round, sideA, hole)
  const scoreB = sideScore(round, sideB, hole)
  if (scoreA === null || scoreB === null || scoreA === scoreB) return null
  return scoreA < scoreB ? 0 : 1
}

/** Barva stavu strany v hlavičce: vede zeleně, prohrává červeně. */
export function sideTone(
  state: MatchState,
  index: number,
): 'positive' | 'negative' | 'neutral' {
  if (state.leaderIndex === null) return 'neutral'
  return state.leaderIndex === index ? 'positive' : 'negative'
}

/** Vzhled hlavičky podle toho, jak daleko zápas je. */
export function headerTone(
  state: MatchState | undefined,
  outOfPlay: boolean,
): 'normal' | 'dormie' | 'decided' | 'outOfPlay' {
  if (outOfPlay) return 'outOfPlay'
  if (!state) return 'normal'
  if (state.decided) return 'decided'
  if (state.leaderIndex !== null && state.lead === state.remaining) return 'dormie'
  return 'normal'
}
