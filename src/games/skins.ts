import type { PlayerId, Round } from '../types'
import {
  holeMultiplier,
  holeNumber,
  holesPlayed,
  isHoleStarted,
  parAt,
  playerName,
  scoreAt,
  strokeTotal,
} from '../types'
import { netScoreAt } from '../handicap'
import { CONCEDED } from './shared'
import { holeSideBetPoints } from './sideBets'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSummary,
  ScorecardPlayerCell,
  ScorecardPlayerTotal,
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
 *   - V kole s HCP rozhoduje o skinu netto skóre; extra body se naproti tomu
 *     počítají z brutto výsledku (viz `skinExtraPoints`).
 */

/** Výsledek jedné jamky. */
export interface SkinResult {
  hole: number
  /** Vítěz jamky, nebo null při shodě či nedohrané jamce. */
  winnerId: PlayerId | null
  /** Hráč, jehož výhra čeká na potvrzení parem další jamky. */
  reservedId?: PlayerId
  /** Kolik skinů se na jamce rozdělilo (včetně přenesených). */
  skins: number
  /** Kolik skinů se po jamce přenáší dál. */
  carry: number
}

interface PendingSkin {
  hole: number
  winnerId: PlayerId
  skins: number
}

/**
 * Body, které hráč získá na jedné jamce mimo samotný skin.
 *
 * Skins si extra body počítá do svých bodů, protože sám body rozdává; hry,
 * které to nedělají, je berou jako vedlejší sázku (`sideBets.ts`). Pravidlo je
 * v obou případech totéž, proto je i výpočet jeden.
 */
export const skinExtraPoints = holeSideBetPoints

function skinCount(
  round: Round,
  playerId: PlayerId,
  results = skinResults(round),
): number {
  return results
    .filter((result) => result.winnerId === playerId)
    .reduce((sum, result) => sum + result.skins, 0)
}

function extraTotal(round: Round, playerId: PlayerId): number {
  let total = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    total += skinExtraPoints(round, playerId, hole)
  }
  return total
}

/** Jamky, jejichž skiny byly později přidělené jednomu hráči. */
function skinAwardHoles(round: Round): Record<PlayerId, Set<number>> {
  const awarded: Record<PlayerId, Set<number>> = {}
  for (const player of round.players) awarded[player.id] = new Set()

  const carriedHoles: number[] = []
  for (const [hole, result] of skinResults(round).entries()) {
    if (result.winnerId !== null) {
      const holes = awarded[result.winnerId]
      if (!holes) continue
      for (const carriedHole of carriedHoles) holes.add(carriedHole)
      holes.add(hole)
      carriedHoles.length = 0
    } else if (isHoleStarted(round, hole)) {
      carriedHoles.push(hole)
    }
  }

  return awarded
}

/**
 * Projde kolo jamku po jamce a rozdělí skiny včetně přenášení banku.
 * Při potvrzení parem se výhra drží dočasně u vítěze a rozhodne ji až jeho
 * skóre na následující jamce. Poslední jamka se potvrzuje automaticky - další
 * jamka, na které by šla výhra ověřit, už neexistuje.
 * Vrací záznam za každou jamku kola.
 */
export function skinResults(round: Round): SkinResult[] {
  const results: SkinResult[] = []
  let carry = 0
  let pending: PendingSkin | null = null

  for (let hole = 0; hole < round.holeCount; hole++) {
    // Přeskočená následující jamka potvrzení nesplní. Pozdější zápis už nesmí
    // zpětně potvrdit výhru přes jamku, která zůstala nehraná.
    if (pending && hole > pending.hole + 1) {
      carry += pending.skins
      const previous = results[pending.hole]
      if (previous) previous.carry = carry
      pending = null
    }

    if (pending && hole === pending.hole + 1 && isHoleStarted(round, hole)) {
      const score = scoreAt(round, pending.winnerId, hole)
      const previous = results[pending.hole]
      const confirmed = score !== null && score <= parAt(round, hole)

      if (confirmed) {
        if (previous) {
          previous.winnerId = pending.winnerId
          previous.skins = pending.skins
          previous.carry = 0
          delete previous.reservedId
        }
      } else {
        carry += pending.skins
        if (previous) {
          previous.carry = carry
          delete previous.reservedId
        }
      }
      pending = null
    }

    if (!isHoleStarted(round, hole)) {
      // Na jamku se ještě nedošlo - nevyhodnocuje se a bank se nemění.
      results.push({
        hole,
        winnerId: null,
        skins: 0,
        carry: carry + (pending?.skins ?? 0),
      })
      continue
    }

    // Devátá a osmnáctá jamka mohou být za dvojnásobek - do hry pak jde
    // rovnou dvojnásobný skin, přenesený i vyhraný.
    const stake = holeMultiplier(round, hole)

    // Kdo jamku vzdal, o skin se ucházet nemůže. Porovnává se netto skóre,
    // takže v kole s HCP bere skin hráč, který jamku zahrál líp po odečtu ran
    // - při shodě brutto ran rozhodne tečka na jamce.
    const holeScores: { id: PlayerId; score: number }[] = round.players.map((p) => ({
      id: p.id,
      score: netScoreAt(round, p.id, hole) ?? CONCEDED,
    }))
    const lowest = Math.min(...holeScores.map((entry) => entry.score))
    const leaders = holeScores.filter((entry) => entry.score === lowest)

    if (leaders.length === 1 && leaders[0]) {
      const skins = carry + stake
      carry = 0
      if (round.settings.options.confirmSkinsByPar && hole < round.holeCount - 1) {
        pending = { hole, winnerId: leaders[0].id, skins }
        results.push({
          hole,
          winnerId: null,
          reservedId: leaders[0].id,
          skins: 0,
          carry: skins,
        })
      } else {
        results.push({ hole, winnerId: leaders[0].id, skins, carry })
      }
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
  scoringOptions: {
    bonusIds: [
      'double',
      'longest',
      'nearest',
      'bunker',
      'doubleBunker',
      'water',
      'barkie',
      'arnie',
    ],
    resultMultipliers: true,
    doubleBest: false,
    noDoubleBonuses: true,
    confirmLongest: true,
    confirmNearest: true,
    confirmSkinsByPar: true,
    bonusScope: 'player',
  },
  supportsDoubleHoles: true,

  computeStandings(round: Round): StandingsSection[] {
    const results = skinResults(round)

    const rows = round.players.map((player) => {
      const won = results.filter((r) => r.winnerId === player.id)
      const skinsWon = skinCount(round, player.id, results)
      const extra = extraTotal(round, player.id)
      return {
        id: player.id,
        name: player.name,
        value: skinsWon + extra,
        valueLabel: `${skinsWon + extra}`,
        detail: [
          t('skins.scoreDetail', { skins: skinsWon, extra }),
          won.length > 0
            ? t('skins.wonHoles', {
                count: won.length,
                holes: won.map((r) => holeNumber(round, r.hole)).join(', '),
              })
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
        secondary: t('common.strokes', { count: strokeTotal(round, player.id) }),
        holesPlayed: holesPlayed(round, player.id),
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

  /**
   * Zvýrazní všechny zdrojové jamky přeneseného banku, ne jen tu, kde se
   * nakonec rozhodl. Hráč tak vidí, odkud se jeho tři skiny sešly.
   */
  scorecardPlayerCell(
    round: Round,
    playerId: PlayerId,
    hole: number,
  ): ScorecardPlayerCell {
    const result = skinResults(round)[hole]
    const player = round.players.find((entry) => entry.id === playerId)
    const extra = skinExtraPoints(round, playerId, hole)
    const cell: ScorecardPlayerCell = {}
    const awardedHoles = skinAwardHoles(round)

    if (awardedHoles[playerId]?.has(hole) && player) {
      cell.skin = {
        ariaLabel:
          result?.winnerId === playerId
            ? t('skins.scorecardSkin', {
                name: player.name,
                count: result.skins,
              })
            : t('skins.scorecardSkinCarried', { name: player.name }),
      }
    }

    if (extra > 0 && player) {
      cell.suffix = {
        text: `+${extra}`,
        ariaLabel: t('skins.scorecardExtra', {
          name: player.name,
          count: extra,
        }),
      }
    }

    return cell
  },

  scorecardPlayerTotal(round: Round, playerId: PlayerId): ScorecardPlayerTotal {
    const skinsWon = skinCount(round, playerId)
    const extra = extraTotal(round, playerId)
    return {
      text: extra > 0 ? `${skinsWon} + ${extra} = ${skinsWon + extra}` : `${skinsWon}`,
      ariaLabel: t('skins.scorecardTotal', {
        name: playerName(round, playerId),
        skins: skinsWon,
        extra,
        total: skinsWon + extra,
      }),
    }
  },

  headerSummary(round: Round): HeaderSummary {
    const results = skinResults(round)
    return {
      entries: round.players.map((player) => ({
        label: player.name,
        value: `${skinCount(round, player.id, results) + extraTotal(round, player.id)}`,
      })),
      note: t('skins.headerNote'),
    }
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const carry = carryInto(round, hole)
    const results = skinResults(round)
    const result = results[hole]
    const previous = hole > 0 ? results[hole - 1] : undefined
    const reservedId =
      result?.reservedId ??
      (previous?.winnerId === null ? previous.reservedId : undefined)
    const reservedName = reservedId ? playerName(round, reservedId) : undefined
    const value =
      result?.winnerId != null
        ? `${playerName(round, result.winnerId)} (${result.skins})`
        : '–'

    return [
      {
        id: '_game',
        entries: [
          { label: t('skins.atStake'), value: `${carry + holeMultiplier(round, hole)}` },
          ...(reservedName
            ? [{ label: t('skins.reservedBy'), value: reservedName }]
            : []),
          { label: t('skins.takes'), value },
        ],
      },
    ]
  },
}
