import type { PlayerId, Round } from '../types'
import { holeMultiplier, isHoleStarted, strokeTotal } from '../types'
import { holeStablefordPoints, isNetRound } from '../handicap'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSummary,
  ScorecardColumn,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { t } from '../i18n'
import { SIDE_BET_BONUSES, sideBetSection, withSideBets } from './sideBets'

/**
 * Stableford - hra jednotlivců na body, ne na rány.
 *
 * Za jamku se dostávají body podle výsledku vůči paru: par dva body, birdie
 * tři, eagle čtyři, bogey jeden, dvojbogey a horší nic. Hraje-li se netto,
 * počítá se výsledek po odečtení ran, které hráč na jamce dostává podle jejího
 * stroke indexu.
 *
 * Proti hrám na rány má jednu vlastnost, kvůli které se hraje: zkažená jamka
 * stojí nejvýš dva body, takže jedna devítka nezničí celé kolo.
 *
 * Rozhodnutí tam, kde pravidla mlčí (viz docs/games.md):
 *   - Vzdaná jamka je nula bodů, stejně jako netto dvojbogey a horší.
 *   - Dvojnásobná jamka násobí body, které na ní padly.
 */

/** Body hráče na jamce včetně násobiče jamky. */
export function holePoints(round: Round, playerId: PlayerId, hole: number): number {
  if (!isHoleStarted(round, hole)) return 0
  return holeStablefordPoints(round, playerId, hole) * holeMultiplier(round, hole)
}

/** Body hráče za celé kolo. */
export function totalPoints(round: Round, playerId: PlayerId): number {
  let total = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    total += holePoints(round, playerId, hole)
  }
  return total
}

/** Strany pro vedlejší sázku - hra jednotlivců, takže každý sám za sebe. */
function betSides(round: Round) {
  return round.players.map((player) => ({
    id: player.id,
    name: player.name,
    playerIds: [player.id],
  }))
}

export const stableford: GameDefinition = {
  id: 'stableford',
  playerCounts: [1, 2, 3, 4],
  usesTeams: () => false,
  supportsDoubleHoles: true,

  // Stableford zatím extra body nevyhodnocuje: bodovací systém sám o sobě
  // odměňuje lepší výsledek na jamce, takže by se násobiče překrývaly. Model
  // je na ně připravený, kdyby se to ukázalo jako žádané.
  scoringOptions: {
    // Extra body jsou tady vedlejší sázka: ve výchozím stavu nulové, takže
    // dokud si je někdo nezapne, hra se chová jako dřív (`sideBets.ts`).
    bonusIds: SIDE_BET_BONUSES,
    resultMultipliers: true,
    doubleBest: false,
    noDoubleBonuses: false,
    confirmLongest: true,
    confirmNearest: true,
    bonusesAsSideBet: true,
    bonusScope: 'player',
  },

  computeStandings(round: Round): StandingsSection[] {
    const net = isNetRound(round)

    const rows = round.players.map((player) => {
      const points = totalPoints(round, player.id)
      const played = (round.scores[player.id] ?? []).filter((s) => s !== null).length

      return {
        id: player.id,
        name: player.name,
        value: points,
        valueLabel: t('common.points', { count: points }),
        // U netto kola je vidět, s kolika ranami hráč hraje - jinak se pořadí
        // nedá přečíst, protože body samy o sobě neřeknou, kdo dostal kolik.
        detail: net
          ? t('stableford.netDetail', {
              handicap: player.playingHandicap ?? 0,
            })
          : t('stableford.grossDetail'),
        secondary: t('common.strokes', { count: strokeTotal(round, player.id) }),
        holesPlayed: played,
      }
    })

    // Extra body nejsou stablefordové body - proti paru se nepočítají, takže
    // mají vlastní tabulku a k penězům se přidají v `settlementParties()`.
    const sideBets = sideBetSection(round, betSides(round))

    return [
      {
        id: 'stableford',
        title: t('stableford.title'),
        description: net ? t('stableford.netDescription') : t('stableford.description'),
        rows: rankRows(rows, 'highest'),
      },
      ...(sideBets ? [sideBets] : []),
    ]
  },

  settlementParties(round: Round) {
    return withSideBets(
      round,
      betSides(round).map((side) => ({
        ...side,
        units: totalPoints(round, side.playerIds[0] ?? ''),
      })),
    )
  },

  /** Sloupec s body u každého hráče, aby stál hned vedle jeho ran. */
  scorecardColumns(round: Round): ScorecardColumn[] {
    return round.players.map((player) => ({
      id: `stableford-${player.id}`,
      label: t('stableford.column'),
      afterPlayerId: player.id,
      cell: (r, hole) =>
        isHoleStarted(r, hole) ? `${holePoints(r, player.id, hole)}` : '',
      total: (r) => `${totalPoints(r, player.id)}`,
    }))
  },

  headerSummary(round: Round): HeaderSummary {
    return {
      entries: round.players.map((player) => ({
        label: player.name,
        value: `${totalPoints(round, player.id)}`,
      })),
      note: isNetRound(round)
        ? t('stableford.headerNetNote')
        : t('stableford.headerNote'),
    }
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const best = Math.max(...round.players.map((p) => holePoints(round, p.id, hole)))

    return round.players.map((player) => {
      const points = holePoints(round, player.id, hole)

      return {
        id: player.id,
        winner: isHoleStarted(round, hole) && points > 0 && points === best,
        // Rány, které hráč na jamce dostává, se u jména ukazují jako tečky
        // (viz PlayScreen), takže sem druhý štítek s toutéž informací nepatří.
        entries: [
          {
            label: t('common.holePoints'),
            value: isHoleStarted(round, hole) ? `${points}` : t('common.dash'),
            highlight: points === best && points > 0,
          },
        ],
      }
    })
  },
}
