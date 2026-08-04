import type { PlayerId, Round } from '../types'
import { holeMultiplier, isHoleStarted, playerName, scoreAt, strokeTotal } from '../types'
import { CONCEDED } from './shared'
import type {
  GameDefinition,
  HoleSummary,
  ScorecardColumn,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { t } from '../i18n'

/**
 * Skins - hra jednotlivců pro 2 až 4 hráče.
 *
 * Každá jamka je jeden skin. Kdo ji zahraje nejnižším počtem ran, skin bere.
 * Když se o nejnižší skóre dělí víc hráčů, skin se nepřiděluje a přenáší se
 * do další jamky - další rozhodnutá jamka tak vynese víc skinů najednou.
 *
 * Rozhodnutí tam, kde pravidla mlčí (viz docs/games.md):
 *   - Jamka se vyhodnocuje, jakmile na ní někdo zapsal; komu zápis chybí,
 *     ten jamku vzdal a o skin se ucházet nemůže.
 *   - Skiny přenesené z poslední jamky propadají.
 */

/** Výsledek jedné jamky. */
export interface SkinResult {
  hole: number
  /** Vítěz jamky, nebo null při shodě či nedohrané jamce. */
  winnerId: PlayerId | null
  /** Kolik skinů se na jamce rozdělilo (včetně přenesených). */
  skins: number
  /** Kolik skinů se po jamce přenáší dál. */
  carry: number
}

/**
 * Projde kolo jamku po jamce a rozdělí skiny včetně přenášení banku.
 * Vrací záznam za každou jamku kola.
 */
export function skinResults(round: Round): SkinResult[] {
  const results: SkinResult[] = []
  let carry = 0

  for (let hole = 0; hole < round.holeCount; hole++) {
    if (!isHoleStarted(round, hole)) {
      // Na jamku se ještě nedošlo - nevyhodnocuje se a bank se nemění.
      results.push({ hole, winnerId: null, skins: 0, carry })
      continue
    }

    // Devátá a osmnáctá jamka mohou být za dvojnásobek - do hry pak jde
    // rovnou dvojnásobný skin, přenesený i vyhraný.
    const stake = holeMultiplier(round, hole)

    // Kdo jamku vzdal, o skin se ucházet nemůže.
    const scores = round.players.map((p) => ({
      id: p.id,
      score: scoreAt(round, p.id, hole) ?? CONCEDED,
    }))
    const lowest = Math.min(...scores.map((s) => s.score))
    const leaders = scores.filter((s) => s.score === lowest)

    if (leaders.length === 1 && leaders[0]) {
      const skins = carry + stake
      carry = 0
      results.push({ hole, winnerId: leaders[0].id, skins, carry })
    } else {
      // Dělená jamka: skin se přenáší do další.
      carry += stake
      results.push({ hole, winnerId: null, skins: 0, carry })
    }
  }

  return results
}

/** Kolik skinů se aktuálně přenáší do jamky `hole`. */
export function carryInto(round: Round, hole: number): number {
  if (hole === 0) return 0
  return skinResults(round)[hole - 1]?.carry ?? 0
}

export const skins: GameDefinition = {
  id: 'skins',
  playerCounts: [2, 3, 4],
  usesTeams: () => false,
  supportsDoubleHoles: true,

  computeStandings(round: Round): StandingsSection[] {
    const results = skinResults(round)

    const rows = round.players.map((player) => {
      const won = results.filter((r) => r.winnerId === player.id)
      const skinCount = won.reduce((sum, r) => sum + r.skins, 0)
      return {
        id: player.id,
        name: player.name,
        value: skinCount,
        valueLabel: `${skinCount}`,
        detail:
          won.length === 0
            ? t('skins.noHole')
            : t('skins.wonHoles', {
                count: won.length,
                holes: won.map((r) => r.hole + 1).join(', '),
              }),
        secondary: t('common.strokes', { count: strokeTotal(round, player.id) }),
        holesPlayed: results.filter((r) => r.winnerId !== null).length,
      }
    })

    const pending = results[round.holeCount - 1]?.carry ?? 0
    return [
      {
        id: 'skins',
        title: t('skins.title'),
        description:
          pending > 0 ? t('skins.pending', { count: pending }) : t('skins.description'),
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  /** Sloupec se skiny rozdanými na jamce; prázdný, když se jamka dělila. */
  scorecardColumns(): ScorecardColumn[] {
    return [
      {
        id: 'skins',
        label: t('skins.column'),
        cell: (round, hole) => {
          const result = skinResults(round)[hole]
          return result?.winnerId ? `${result.skins}` : ''
        },
        total: (round) => `${skinResults(round).reduce((sum, r) => sum + r.skins, 0)}`,
      },
    ]
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const carry = carryInto(round, hole)
    const result = skinResults(round)[hole]
    const value =
      result?.winnerId != null
        ? `${playerName(round, result.winnerId)} (${result.skins})`
        : '–'

    return [
      {
        id: '_game',
        entries: [
          { label: t('skins.atStake'), value: `${carry + holeMultiplier(round, hole)}` },
          { label: t('skins.takes'), value },
        ],
      },
    ]
  },
}
