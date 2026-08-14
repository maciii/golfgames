import type { PlayerId, Round } from '../types'
import { holeMultiplier, holesPlayed, isHoleStarted, strokeTotal } from '../types'
import { bonusDiffToPar, netScoreAt } from '../handicap'
import { CONCEDED } from './shared'
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
 * Dots - bodová hra pro tři hráče ve dvou variantách.
 *
 * Na každé jamce je v sázce pevný počet bodů a rozdělí se podle pořadí:
 *
 *   Nine Dot (Devítka)   9 bodů   5-3-1, při shodách 4-4-1 / 5-2-2 / 3-3-3
 *   Six Dot  (Šestka)    6 bodů   4-2-0, při shodách 3-3-0 / 4-1-1 / 2-2-2
 *
 * Obě varianty se liší jen tabulkou, takže jsou to volby jedné hry a ne dvě
 * hry - jinak by se dvakrát udržovalo totéž a jedna by se dřív nebo později
 * s druhou rozešla. Kolo si zvolenou variantu nese ve svém nastavení, takže
 * pozdější přepnutí nepřepočítá archiv.
 *
 * V anglických zdrojích se Nine Dot jmenuje **Nines** nebo **5-3-1**, Six Dot
 * **Split Sixes** (taky "English" nebo "6-point"). Rozdělení bodů odpovídá
 * zavedeným pravidlům; obě volby navíc jsou běžná domácí nadstavba.
 *
 * Rozhodnutí tam, kde pravidla mlčí (viz docs/games.md):
 *   - O pořadí na jamce rozhoduje netto skóre, stejně jako u ostatních her.
 *   - Vzdaná jamka je nejhorší možný výsledek; kdo vzdal, skončí poslední.
 *   - Výhra o dvě rány se počítá jen proti **zapsanému** druhému výsledku.
 *     Když zbylí dva jamku vzdali, nikdo neví, o kolik se vyhrálo, a devět
 *     bodů v sázce nemá stát na čísle, které nikdo nezapsal.
 *   - Extra body hra nezná: tabulka sama odměňuje lepší výsledek na jamce.
 */

/** Kolik bodů se na jamce rozdá při jednotlivých výsledcích. */
export interface DotPointsTable {
  /** Celkem bodů na jamce; jde do popisků, rozdělení řídí pole níž. */
  perHole: number
  /** Remíza všech tří. */
  allTied: number
  /** Jeden vítěz a dva remízoví poražení: [vítěz, oba poražení]. */
  oneWinner: [number, number]
  /** Dva vítězové a jeden poražený: [oba vítězové, poražený]. */
  twoWinners: [number, number]
  /** Tři různé výsledky: [první, druhý, třetí]. */
  distinct: [number, number, number]
  /** Výhra o dvě rány bere všechno. */
  sweep: number
  /** Výhra o dvě rány s birdie a lepším. */
  birdieSweep: number
}

export const NINE_DOT: DotPointsTable = {
  perHole: 9,
  allTied: 3,
  oneWinner: [5, 2],
  twoWinners: [4, 1],
  distinct: [5, 3, 1],
  sweep: 9,
  birdieSweep: 18,
}

export const SIX_DOT: DotPointsTable = {
  perHole: 6,
  allTied: 2,
  oneWinner: [4, 1],
  twoWinners: [3, 0],
  distinct: [4, 2, 0],
  sweep: 6,
  birdieSweep: 12,
}

/**
 * Tabulka podle nastavení kola. Neznámá hodnota spadne na Devítku, aby se
 * poškozené nebo cizí nastavení nepropsalo do bodování.
 */
export function dotTable(round: Round): DotPointsTable {
  return round.settings.options.dotVariant === 'six' ? SIX_DOT : NINE_DOT
}

/** Název varianty do výsledků a hlavičky. */
function variantName(round: Round): string {
  return round.settings.options.dotVariant === 'six'
    ? t('dot.sixName')
    : t('dot.nineName')
}

/** Hráč a jeho netto výsledek na jamce; vzdaná jamka je CONCEDED. */
interface HoleScore {
  id: PlayerId
  score: number
}

function holeScores(round: Round, hole: number): HoleScore[] {
  return round.players
    .map((player) => ({
      id: player.id,
      score: netScoreAt(round, player.id, hole) ?? CONCEDED,
    }))
    .sort((a, b) => a.score - b.score)
}

/**
 * Body podle pořadí na jamce.
 *
 * Rozdělení určuje jen to, kolik hráčů sdílí které skóre - proto stačí
 * porovnat setříděné hodnoty a nemusí se vypisovat každá kombinace zvlášť.
 */
function rankPoints(sorted: HoleScore[], table: DotPointsTable): Map<PlayerId, number> {
  const points = new Map<PlayerId, number>()
  const [first, second, third] = sorted
  if (!first || !second || !third) return points

  const firstTwoTied = first.score === second.score
  const lastTwoTied = second.score === third.score

  if (firstTwoTied && lastTwoTied) {
    for (const entry of sorted) points.set(entry.id, table.allTied)
  } else if (firstTwoTied) {
    points.set(first.id, table.twoWinners[0])
    points.set(second.id, table.twoWinners[0])
    points.set(third.id, table.twoWinners[1])
  } else if (lastTwoTied) {
    points.set(first.id, table.oneWinner[0])
    points.set(second.id, table.oneWinner[1])
    points.set(third.id, table.oneWinner[1])
  } else {
    points.set(first.id, table.distinct[0])
    points.set(second.id, table.distinct[1])
    points.set(third.id, table.distinct[2])
  }

  return points
}

/**
 * Bere vítěz jamky všechno? Vrací hráče a body, jinak null.
 *
 * Podmínkou je jediný vítěz a náskok aspoň dvou ran proti zapsanému druhému
 * výsledku. Birdie a lepší náskok ještě zdvojnásobí, je-li volba zapnutá;
 * posuzuje se netto, protože netto se hraje i o samotnou jamku.
 */
function sweepPoints(
  round: Round,
  hole: number,
  sorted: HoleScore[],
  table: DotPointsTable,
): { winnerId: PlayerId; points: number } | null {
  const options = round.settings.options
  if (!options.sweepOnTwoStrokes) return null

  const [first, second] = sorted
  if (!first || !second) return null
  if (!Number.isFinite(first.score) || !Number.isFinite(second.score)) return null
  if (second.score - first.score < 2) return null

  // Co je birdie, rozhoduje volba „Uplatňovat HCP" - stejně jako u ostatních
  // bonusů za výsledek. Samotné pořadí na jamce se počítá netto vždycky.
  const diff = bonusDiffToPar(round, first.id, hole)
  const birdie = options.doubleSweepOnBirdie && diff !== null && diff <= -1

  return { winnerId: first.id, points: birdie ? table.birdieSweep : table.sweep }
}

/**
 * Body všech hráčů na jedné jamce, včetně násobiče dvojnásobné jamky.
 * Na jamce, kam se ještě nedošlo, nemá nikdo nic.
 */
export function holePoints(round: Round, hole: number): Map<PlayerId, number> {
  const empty = new Map<PlayerId, number>(round.players.map((p) => [p.id, 0]))
  // Rozdělení je postavené na třech hráčích; u jiného počtu nedává smysl.
  if (round.players.length !== 3 || !isHoleStarted(round, hole)) return empty

  const table = dotTable(round)
  const sorted = holeScores(round, hole)
  const sweep = sweepPoints(round, hole, sorted, table)
  const points = sweep
    ? new Map(
        round.players.map((p) => [p.id, p.id === sweep.winnerId ? sweep.points : 0]),
      )
    : rankPoints(sorted, table)

  const multiplier = holeMultiplier(round, hole)
  if (multiplier === 1) return points

  return new Map([...points].map(([id, value]) => [id, value * multiplier]))
}

/** Body hráče za celé kolo. */
export function totalPoints(round: Round, playerId: PlayerId): number {
  let total = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    total += holePoints(round, hole).get(playerId) ?? 0
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

export const dots: GameDefinition = {
  id: 'dots',
  playerCounts: [3],
  usesTeams: () => false,
  scoringOptions: {
    // Extra body jsou tady vedlejší sázka: ve výchozím stavu nulové, takže
    // dokud si je někdo nezapne, hra se chová jako dřív (`sideBets.ts`).
    bonusIds: SIDE_BET_BONUSES,
    resultMultipliers: true,
    doubleBest: false,
    noDoubleBonuses: false,
    confirmLongest: true,
    confirmNearest: true,
    dotVariant: true,
    sweepOnTwoStrokes: true,
    doubleSweepOnBirdie: true,
    bonusesAsSideBet: true,
    bonusScope: 'player',
  },
  supportsDoubleHoles: true,

  computeStandings(round: Round): StandingsSection[] {
    const rows = round.players.map((player) => {
      const points = totalPoints(round, player.id)
      return {
        id: player.id,
        name: player.name,
        value: points,
        valueLabel: t('common.points', { count: points }),
        secondary: t('common.strokes', { count: strokeTotal(round, player.id) }),
        holesPlayed: holesPlayed(round, player.id),
      }
    })

    // Body za pořadí na jamce rozdává hra sama; extra body jsou vedle nich
    // vedlejší sázka, takže mají vlastní tabulku a vstupují až do peněz.
    const sideBets = sideBetSection(round, betSides(round))

    return [
      {
        id: 'dots',
        title: t('dot.title'),
        description: t('dot.description', {
          variant: variantName(round),
          count: dotTable(round).perHole,
        }),
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

  headerSummary(round: Round): HeaderSummary {
    return {
      entries: round.players.map((player) => ({
        label: player.name,
        value: `${totalPoints(round, player.id)}`,
      })),
      note: t('dot.headerNote', {
        variant: variantName(round),
        count: dotTable(round).perHole,
      }),
    }
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const points = holePoints(round, hole)
    const started = isHoleStarted(round, hole)
    const best = Math.max(0, ...points.values())

    return round.players.map((player) => {
      const value = points.get(player.id) ?? 0
      return {
        id: player.id,
        winner: started && value > 0 && value === best,
        entries: [
          {
            label: t('common.holePoints'),
            value: started ? `${value}` : t('common.dash'),
            highlight: started && value > 0 && value === best,
          },
        ],
      }
    })
  },

  /** Sloupec s body u každého hráče, aby stál hned vedle jeho ran. */
  scorecardColumns(round: Round): ScorecardColumn[] {
    return round.players.map((player) => ({
      id: `dots-${player.id}`,
      label: t('dot.column'),
      ariaLabel: t('dot.columnAria', { name: player.name }),
      afterPlayerId: player.id,
      cell: (r, hole) =>
        isHoleStarted(r, hole) ? `${holePoints(r, hole).get(player.id) ?? 0}` : '',
      total: (r) => `${totalPoints(r, player.id)}`,
    }))
  },
}
