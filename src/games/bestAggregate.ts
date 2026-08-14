import type { PlayerId, Round, Team } from '../types'
import {
  bonusMultiplier,
  bonusesAt,
  getBonus,
  holeMultiplier,
  isHoleStarted,
  scoreAt,
  teamName,
  teamPlayers,
} from '../types'
import type {
  GameDefinition,
  HeaderSummary,
  HoleBreakdown,
  HoleSummary,
  ScorecardColumn,
  StandingsSection,
} from './types'
import { rankRows } from './types'
import { dynamicKey, t } from '../i18n'
import {
  bonusDiffToPar,
  exclusiveBonusOutcome,
  isNetRound,
  netScoreAt,
} from '../handicap'
import {
  CONCEDED,
  aggregateWins,
  formatAggregate,
  formatSideScore,
  lowerWins,
  teamAggregate,
  teamBestBall,
  teamStrokeTotal,
} from './shared'

/**
 * Best + Součet - bodovaná hra dvou dvojic (vždy 4 hráči).
 *
 * Na každé jamce se dvojici připisují body:
 *
 *   1 bod  za BEST     - nižší lepší míč než soupeřova dvojice
 *   1 bod  za součet   - nižší součet ran obou partnerů
 *   1 bod  za birdie   - za každé birdie kteréhokoli z partnerů
 *   3 body za eagle    - za každý eagle kteréhokoli z partnerů
 *
 * Vyhrává dvojice s nejvyšším součtem bodů.
 *
 * Chybějící zápis na rozehrané jamce znamená vzdanou jamku: dvojice tím
 * ztrácí součet (soupeř ho bere), lepší míč jí zůstává, dokud ho drží aspoň
 * jeden z partnerů.
 *
 * Rozhodnutí tam, kde pravidla mlčí (viz docs/games.md):
 *   - Při shodě lepšího míče ani součtu nezískává bod nikdo (jamka je dělená).
 *   - Bonus se počítá za každého partnera zvlášť; dvě birdie na jedné jamce
 *     tedy dvojici vynesou 2 body.
 *   - Eagle a lepší (albatros) se boduje shodně 3 body.
 */

export const POINTS = {
  best: 1,
  aggregate: 1,
  birdie: 1,
  eagle: 3,
} as const

/** Bodový rozpad jedné dvojice na jedné jamce. */
export interface TeamHolePoints {
  best: number
  aggregate: number
  /** Volitelný bod za oba lepší individuální výsledky. */
  doubleBest: number
  /** Body za birdie a eagly partnerů. */
  bonus: number
  /** Extra body (longest, bunker, water...). */
  extra: number
  total: number
}

const EMPTY_POINTS: TeamHolePoints = {
  best: 0,
  aggregate: 0,
  doubleBest: 0,
  bonus: 0,
  extra: 0,
  total: 0,
}

/**
 * Extra body dvojice na jamce.
 *
 * Hodnota bonusu se násobí podle výsledku hráče: par jednou, birdie dvakrát,
 * eagle a lepší třikrát. Bogey a horší extra bod neuhraje. Bonus se počítá
 * celé dvojici, i když ho zahrál jen jeden z partnerů.
 *
 * Násobí se **brutto** výsledek, i když se kolo hraje netto. Rozdané rány mění
 * to, kdo jamku vyhrál, ne to, jak se zahrála - jinak by hráč s ranou na jamce
 * dostal za bunker na par dva body místo jednoho. Kdo to chce jinak, zapne
 * volbu „Uplatňovat HCP" a násobič pak stojí na osobním paru
 * (`bonusDiffToPar()`); stejně tak může na osobním paru stát potvrzení
 * Longestu.
 */
function extraPoints(round: Round, team: Team, hole: number): number {
  const values = round.settings.options.bonusValues
  let total = 0

  for (const player of teamPlayers(round, team)) {
    const diff = bonusDiffToPar(round, player.id, hole)
    if (diff === null) continue
    const multiplier = bonusMultiplier(diff, round.settings.options.resultMultipliers)
    if (multiplier === 0) continue

    for (const bonusId of bonusesAt(round, player.id, hole)) {
      const bonus = getBonus(bonusId)
      // "double" násobí celou jamku, body sám o sobě nepřidává.
      // Longest a Nearest mají vlastní pravidlo (viz longestNearestPoints).
      if (!bonus || bonus.kind === 'multiplier' || bonus.exclusive) continue
      total += (values[bonusId] ?? 0) * multiplier
    }
  }

  return total
}

/**
 * Longest a Nearest: bonus na jamce drží jediný hráč a body z něj mohou
 * skončit i u soupeře.
 *
 * Se zapnutým potvrzováním platí, že hráč musí jamku zahrát na par nebo líp -
 * jinak bod propadá soupeřově dvojici. Bez potvrzování bod vždy zůstává
 * dvojici, která bonus zapsala. V netto kole rozhoduje osobní par, pokud je
 * volba zapnutá; o obojím rozhoduje `exclusiveBonusOutcome()`, takže značka
 * u jména při zápisu ukazuje přesně to, co se pak započítá.
 *
 * Na rozdíl od ostatních extra bodů se hodnota nenásobí podle výsledku;
 * o přiznání rozhoduje právě potvrzovací pravidlo.
 *
 * Vrací body pro obě dvojice ve stejném pořadí jako round.teams.
 */
function longestNearestPoints(
  round: Round,
  hole: number,
  teams: Team[],
): [number, number] {
  const { bonusValues } = round.settings.options
  const awarded: [number, number] = [0, 0]

  for (const bonusId of ['longest', 'nearest'] as const) {
    const value = bonusValues[bonusId] ?? 0
    if (value <= 0) continue

    const holder = round.players.find((p) =>
      bonusesAt(round, p.id, hole).includes(bonusId),
    )
    if (!holder) continue

    const teamIndex = teams.findIndex((t) => t.playerIds.includes(holder.id))
    if (teamIndex < 0) continue

    const outcome = exclusiveBonusOutcome(round, holder.id, hole, bonusId)
    // Dokud hráč jamku nezapsal, není co potvrzovat.
    if (outcome === 'pending') continue

    const winner = outcome === 'own' ? teamIndex : 1 - teamIndex
    awarded[winner === 0 ? 0 : 1] += value
  }

  return awarded
}

/**
 * Double Best: dvojice získá bod navíc, když oba její míče byly lepší než
 * oba míče soupeře. Vzdaný míč se počítá jako nejhorší možný, takže dvojice
 * s nedohraným míčem Double Best nezíská.
 */
function doubleBestWinner(round: Round, hole: number, teams: Team[]): 0 | 1 | null {
  const [teamA, teamB] = teams
  if (!teamA || !teamB || !isHoleStarted(round, hole)) return null

  const scores = (team: Team) =>
    team.playerIds.map((id) => netScoreAt(round, id, hole) ?? CONCEDED)
  const a = scores(teamA)
  const b = scores(teamB)
  if (a.length === 0 || b.length === 0) return null

  if (Math.max(...a) < Math.min(...b)) return 0
  if (Math.max(...b) < Math.min(...a)) return 1
  return null
}

/**
 * Bonusové body dvojice za birdie a eagly na jedné jamce.
 *
 * Co je birdie, rozhoduje volba **Uplatňovat HCP** (`bonusDiffToPar()`): bez ní
 * platí jen skutečná rána pod par jamky, s ní i netto birdie hráče, který na
 * jamce dostává ránu. Kdo jamku vyhrál (BEST, součet), se počítá netto vždycky -
 * to je pravidlo hry, ne bonus.
 */
function bonusPoints(round: Round, team: Team, hole: number): number {
  let bonus = 0
  for (const player of teamPlayers(round, team)) {
    const diff = bonusDiffToPar(round, player.id, hole)
    if (diff === null) continue
    if (diff <= -2) bonus += POINTS.eagle
    else if (diff === -1) bonus += POINTS.birdie
  }
  return bonus
}

/**
 * Body obou dvojic na jedné jamce.
 * Vrací pole ve stejném pořadí jako round.teams.
 */
export function holePointsForTeams(
  round: Round,
  teams: Team[],
  hole: number,
): TeamHolePoints[] {
  const [teamA, teamB] = teams
  if (!teamA || !teamB) return teams.map(() => ({ ...EMPTY_POINTS }))

  const bestWinner = lowerWins(
    teamBestBall(round, teamA, hole),
    teamBestBall(round, teamB, hole),
  )
  const aggWinner = aggregateWins(
    teamAggregate(round, teamA, hole),
    teamAggregate(round, teamB, hole),
  )
  const dbWinner =
    round.settings.options.doubleBest > 0 ? doubleBestWinner(round, hole, teams) : null

  // Dvojnásobná devátá/osmnáctá a zvolený "double" se násobí mezi sebou.
  const multiplier = holeMultiplier(round, hole)
  // Volba "nedoublovat extra body" nechává extra body v základní hodnotě.
  const extraMultiplier = round.settings.options.noDoubleBonuses ? 1 : multiplier
  const exclusive = longestNearestPoints(round, hole, teams)

  return [teamA, teamB].map((team, index) => {
    const best = (bestWinner === index ? POINTS.best : 0) * multiplier
    const aggregate = (aggWinner === index ? POINTS.aggregate : 0) * multiplier
    const doubleBest =
      (dbWinner === index ? round.settings.options.doubleBest : 0) * multiplier
    const bonus = bonusPoints(round, team, hole) * multiplier
    const extra =
      (extraPoints(round, team, hole) + (exclusive[index === 0 ? 0 : 1] ?? 0)) *
      extraMultiplier
    return {
      best,
      aggregate,
      doubleBest,
      bonus,
      extra,
      total: best + aggregate + doubleBest + bonus + extra,
    }
  })
}

export function holePoints(round: Round, hole: number): TeamHolePoints[] {
  return holePointsForTeams(round, round.teams, hole)
}

/** Součet bodů dvojic přes celé kolo. */
export function totalPoints(round: Round): TeamHolePoints[] {
  const totals: TeamHolePoints[] = round.teams.map(() => ({ ...EMPTY_POINTS }))

  for (let hole = 0; hole < round.holeCount; hole++) {
    holePoints(round, hole).forEach((points, index) => {
      const acc = totals[index]
      if (!acc) return
      acc.best += points.best
      acc.aggregate += points.aggregate
      acc.doubleBest += points.doubleBest
      acc.bonus += points.bonus
      acc.extra += points.extra
      acc.total += points.total
    })
  }

  return totals
}

/** Kolik jamek už dvojici něco započítalo (kvůli řazení a "zatím bez zápisu"). */
function settledHoles(round: Round, team: Team): number {
  let count = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    if (teamBestBall(round, team, hole) !== null) count += 1
  }
  return count
}

/**
 * Rozpis bodů dvojice na jamce - odpověď na „proč máme tři body".
 *
 * Staví na stejných funkcích jako `holePointsForTeams()`, jen místo součtu
 * vypíše každý zdroj zvlášť včetně čísel, ze kterých se rozhodovalo. Řádky
 * s nulou zůstávají, protože „bunker se nepočítá, bylo to bogey" je pro
 * hráče stejně důležitá informace jako přiznaný bod.
 */
export function holeBreakdownForTeams(
  round: Round,
  teams: Team[],
  hole: number,
): HoleBreakdown[] {
  const points = holePointsForTeams(round, teams, hole)
  const [teamA, teamB] = teams
  if (!teamA || !teamB) return []

  const { doubleBest: doubleBestValue, noDoubleBonuses } = round.settings.options
  const multiplier = holeMultiplier(round, hole)
  const extraMultiplier = noDoubleBonuses ? 1 : multiplier
  const net = isNetRound(round)
  /** Číslo tak, jak o něm rozhodovala hra - v netto kole netto. */
  const scoreNote = (value: string) =>
    net ? t('breakdown.net', { value }) : t('breakdown.gross', { value })

  return teams.map((team, index) => {
    const other = index === 0 ? teamB : teamA
    const own = points[index] ?? EMPTY_POINTS
    const lines: HoleBreakdown['lines'] = [
      {
        kind: 'best',
        label: t('best.best'),
        note: scoreNote(
          t('breakdown.versus', {
            own: formatSideScore(teamBestBall(round, team, hole)),
            other: formatSideScore(teamBestBall(round, other, hole)),
          }),
        ),
        points: own.best,
      },
      {
        kind: 'aggregate',
        label: t('best.aggregate'),
        note: scoreNote(
          t('breakdown.versus', {
            own: formatAggregate(teamAggregate(round, team, hole)),
            other: formatAggregate(teamAggregate(round, other, hole)),
          }),
        ),
        points: own.aggregate,
      },
    ]

    if (doubleBestValue > 0) {
      lines.push({
        kind: 'doubleBest',
        label: t('best.doubleBest'),
        note: t('best.doubleBestNote'),
        points: own.doubleBest,
      })
    }

    // Birdie a eagle podle toho, co je v tomhle kole birdie (volba HCP).
    for (const player of teamPlayers(round, team)) {
      const diff = bonusDiffToPar(round, player.id, hole)
      if (diff === null || diff > -1) continue
      const eagle = diff <= -2
      lines.push({
        kind: 'result',
        label: t(eagle ? 'tier.eagle.name' : 'tier.birdie.name'),
        note: `${player.name} · ${resultNote(round, player.id, hole)}`,
        points: (eagle ? POINTS.eagle : POINTS.birdie) * multiplier,
      })
    }

    lines.push(...extraLines(round, teams, index, hole, extraMultiplier))

    return { id: team.id, name: teamName(round, team), lines, total: own.total }
  })
}

/** Číslo, ze kterého se u hráče posuzoval výsledek jamky pro bonusy. */
function resultNote(round: Round, playerId: PlayerId, hole: number): string {
  const withHandicap = round.settings.options.multipliersWithHandicap && isNetRound(round)
  const value = withHandicap
    ? (netScoreAt(round, playerId, hole) ?? 0)
    : (scoreAt(round, playerId, hole) ?? 0)
  return withHandicap
    ? t('breakdown.net', { value: `${value}` })
    : t('breakdown.gross', { value: `${value}` })
}

/** Rozpis extra bodů dvojice: který bonus, komu a kolik vynesl. */
function extraLines(
  round: Round,
  teams: Team[],
  index: number,
  hole: number,
  extraMultiplier: number,
): HoleBreakdown['lines'] {
  const { bonusValues } = round.settings.options
  const team = teams[index]
  if (!team) return []
  const lines: HoleBreakdown['lines'] = []

  // Běžné extra body drží hráč, který je zapsal, a násobí se výsledkem jamky.
  for (const player of teamPlayers(round, team)) {
    const diff = bonusDiffToPar(round, player.id, hole)
    for (const bonusId of bonusesAt(round, player.id, hole)) {
      const bonus = getBonus(bonusId)
      const value = bonusValues[bonusId] ?? 0
      if (!bonus || bonus.kind !== 'points' || bonus.exclusive || value <= 0) continue
      const multiplier =
        diff === null
          ? 0
          : bonusMultiplier(diff, round.settings.options.resultMultipliers)
      lines.push({
        kind: 'extra',
        label: t(dynamicKey('bonus', bonusId, 'name')),
        note: `${player.name} · ${resultNote(round, player.id, hole)}`,
        points: value * multiplier * extraMultiplier,
      })
    }
  }

  // Longest a Nearest drží na jamce jediný hráč a mohou propadnout soupeřům.
  for (const bonusId of ['longest', 'nearest'] as const) {
    const value = bonusValues[bonusId] ?? 0
    if (value <= 0) continue
    const holder = round.players.find((p) =>
      bonusesAt(round, p.id, hole).includes(bonusId),
    )
    if (!holder) continue
    const holderTeam = teams.findIndex((t) => t.playerIds.includes(holder.id))
    if (holderTeam < 0) continue

    const outcome = exclusiveBonusOutcome(round, holder.id, hole, bonusId)
    const winner = outcome === 'own' ? holderTeam : 1 - holderTeam
    const mine = holderTeam === index
    if (outcome !== 'pending' && winner !== index) continue

    lines.push({
      kind: 'extra',
      label: t(dynamicKey('bonus', bonusId, 'name')),
      note:
        outcome === 'pending'
          ? t('breakdown.pending', { name: holder.name })
          : mine
            ? holder.name
            : t('breakdown.forfeited', { name: holder.name }),
      points: outcome === 'pending' ? 0 : value * extraMultiplier,
    })
  }

  return lines
}

export const bestAggregate: GameDefinition = {
  id: 'best-aggregate',
  playerCounts: [4],
  usesTeams: () => true,
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
    doubleBest: true,
    noDoubleBonuses: true,
    confirmLongest: true,
    confirmNearest: true,
    bonusScope: 'team',
  },
  supportsDoubleHoles: true,

  computeStandings(round: Round): StandingsSection[] {
    const totals = totalPoints(round)

    const rows = round.teams.map((team, index) => {
      const points = totals[index] ?? EMPTY_POINTS
      const detail = [
        t('best.detailBest', { count: points.best }),
        t('best.detailAggregate', { count: points.aggregate }),
        points.doubleBest > 0
          ? t('best.detailDoubleBest', { count: points.doubleBest })
          : null,
        t('best.detailBonus', { count: points.bonus }),
        points.extra > 0 ? t('best.detailExtra', { count: points.extra }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
      return {
        id: team.id,
        name: teamName(round, team),
        value: points.total,
        valueLabel: t('common.points', { count: points.total }),
        detail,
        secondary: t('common.strokes', { count: teamStrokeTotal(round, team) }),
        holesPlayed: settledHoles(round, team),
      }
    })

    return [
      {
        id: 'points',
        title: t('best.points'),
        description: t('best.pointsDescription'),
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  headerSummary(round: Round): HeaderSummary {
    const totals = totalPoints(round)
    return {
      entries: round.teams.map((team, index) => ({
        label: teamName(round, team),
        value: t('common.points', { count: totals[index]?.total ?? 0 }),
      })),
      note: t('best.headerNote'),
    }
  },

  /**
   * Ke každé dvojici přidá sloupec s body, které na jamce získala - stojí
   * hned za rány obou partnerů, ať je vidět, odkud se bod vzal.
   */
  scorecardColumns(round: Round): ScorecardColumn[] {
    return round.teams.map((team, index) => ({
      id: `points-${team.id}`,
      label: t('best.holePoints'),
      afterPlayerId: team.playerIds[team.playerIds.length - 1],
      cell: (r, hole) => {
        // Prázdná buňka, dokud se na jamce vůbec nehrálo; vzdaná jamka má 0.
        if (!isHoleStarted(r, hole)) return ''
        return `${holePoints(r, hole)[index]?.total ?? 0}`
      },
      total: (r) => `${totalPoints(r)[index]?.total ?? 0}`,
    }))
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const [teamA, teamB] = round.teams
    const points = holePoints(round, hole)
    const bestWinner =
      teamA &&
      teamB &&
      lowerWins(teamBestBall(round, teamA, hole), teamBestBall(round, teamB, hole))
    const aggWinner =
      teamA &&
      teamB &&
      aggregateWins(teamAggregate(round, teamA, hole), teamAggregate(round, teamB, hole))
    const totals = round.teams.map((_, i) => points[i]?.total ?? 0)
    const bestTotal = Math.max(...totals, 0)
    // Vítěze jamky zvýrazníme jen když opravdu vede, ne při shodě.
    const leaders = totals.filter((t) => t === bestTotal && t > 0).length

    return round.teams.map((team, index) => ({
      id: team.id,
      winner: leaders === 1 && totals[index] === bestTotal,
      entries: [
        {
          label: t('best.best'),
          value: formatSideScore(teamBestBall(round, team, hole)),
          highlight: bestWinner === index,
        },
        {
          label: t('best.aggregate'),
          value: formatAggregate(teamAggregate(round, team, hole)),
          highlight: aggWinner === index,
        },
        // Zdroje bodů (birdie, Double Best, extra body) tady nejsou schválně:
        // s dlouhými názvy se řádek zalomil na dva a zápis skóre přerostl
        // displej. Celý rozpis je za modrým „i" (`holeBreakdown()`).
        { label: t('best.holePoints'), value: `${points[index]?.total ?? 0}` },
      ],
    }))
  },

  holeBreakdown(round: Round, hole: number): HoleBreakdown[] {
    return holeBreakdownForTeams(round, round.teams, hole)
  },
}
