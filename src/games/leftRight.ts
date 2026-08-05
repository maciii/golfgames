import type { HolePairings, HoleSide, PlayerId, Round, Team } from '../types'
import { holesPlayed, isHoleStarted, scoreAt, strokeTotal, teamName } from '../types'
import { t } from '../i18n'
import { holePointsForTeams } from './bestAggregate'
import type {
  GameDefinition,
  HeaderSummary,
  HoleSetup,
  HoleSummary,
  ScorecardColumn,
  StandingsSection,
} from './types'
import { rankRows } from './types'

const LEFT: HoleSide = 'left'
const RIGHT: HoleSide = 'right'
const SIDES: HoleSide[] = [LEFT, RIGHT]

function pairingAt(round: Round, hole: number): Partial<Record<PlayerId, HoleSide>> {
  return round.holePairings?.[String(hole)] ?? {}
}

/** Dvojice odvozené z aktuálního směru prvních ran. */
export function teamsForHole(round: Round, hole: number): Team[] {
  const pairing = pairingAt(round, hole)
  const teams = SIDES.map((side) => ({
    id: `hole-${hole}-${side}`,
    playerIds: round.players
      .filter((player) => pairing[player.id] === side)
      .map((player) => player.id),
  }))

  return teams.every((team) => team.playerIds.length === 2) ? teams : []
}

export function isPairingComplete(round: Round, hole: number): boolean {
  return teamsForHole(round, hole).length === 2
}

/** Změní směr první rány a při opravě smaže skóre pod předchozí dvojicí. */
export function setHoleSide(
  round: Round,
  hole: number,
  playerId: PlayerId,
  side: string,
): Round {
  if (!SIDES.includes(side as HoleSide)) return round
  if (!round.players.some((player) => player.id === playerId)) return round
  if (hole < 0 || hole >= round.holeCount) return round

  const current = pairingAt(round, hole)[playerId]
  const holePairings: HolePairings = {
    ...(round.holePairings ?? {}),
    [String(hole)]: {
      ...pairingAt(round, hole),
      [playerId]: side as HoleSide,
    },
  }
  if (current === side) return round

  const scores = { ...round.scores }
  const bonuses = { ...round.bonuses }
  const hasScore = round.players.some(
    (player) => scoreAt(round, player.id, hole) !== null,
  )
  if (!hasScore) return { ...round, holePairings }

  for (const player of round.players) {
    const playerScores = [...(scores[player.id] ?? [])]
    playerScores[hole] = null
    scores[player.id] = playerScores

    const playerBonuses = [...(bonuses[player.id] ?? [])]
    playerBonuses[hole] = []
    bonuses[player.id] = playerBonuses
  }

  return { ...round, holePairings, scores, bonuses }
}

function playerHolePoints(round: Round, playerId: PlayerId, hole: number): number {
  const teams = teamsForHole(round, hole)
  const teamIndex = teams.findIndex((team) => team.playerIds.includes(playerId))
  return teamIndex < 0
    ? 0
    : (holePointsForTeams(round, teams, hole)[teamIndex]?.total ?? 0)
}

export function totalPlayerPoints(round: Round, playerId: PlayerId): number {
  let total = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    total += playerHolePoints(round, playerId, hole)
  }
  return total
}

function setupForHole(round: Round, hole: number): HoleSetup {
  const pairing = pairingAt(round, hole)
  const options = [
    { id: LEFT, label: t('leftRight.left') },
    { id: RIGHT, label: t('leftRight.right') },
  ]
  const entries = round.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    ...(pairing[player.id] ? { selectedOptionId: pairing[player.id] } : {}),
  }))
  const groups = options.map((option) => ({
    optionId: option.id,
    label: option.label,
    playerNames: round.players
      .filter((player) => pairing[player.id] === option.id)
      .map((player) => player.name),
  }))

  return {
    title: t('leftRight.setupTitle'),
    message: isPairingComplete(round, hole)
      ? t('leftRight.setupReady')
      : t('leftRight.setupHint'),
    options,
    entries,
    groups,
    complete: isPairingComplete(round, hole),
  }
}

export const leftRight: GameDefinition = {
  id: 'left-right',
  playerCounts: [4],
  usesTeams: () => false,
  supportsDoubleHoles: true,
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

  holeSetup: setupForHole,
  setHoleSetup: setHoleSide,

  computeStandings(round: Round): StandingsSection[] {
    const rows = round.players.map((player) => {
      const points = totalPlayerPoints(round, player.id)
      return {
        id: player.id,
        name: player.name,
        value: points,
        valueLabel: t('common.points', { count: points }),
        detail: t('leftRight.detail'),
        secondary: t('common.strokes', { count: strokeTotal(round, player.id) }),
        holesPlayed: holesPlayed(round, player.id),
      }
    })

    return [
      {
        id: 'left-right',
        title: t('leftRight.title'),
        description: t('leftRight.description'),
        rows: rankRows(rows, 'highest'),
      },
    ]
  },

  headerSummary(round: Round): HeaderSummary {
    return {
      entries: round.players.map((player) => ({
        label: player.name,
        value: `${totalPlayerPoints(round, player.id)}`,
      })),
      note: t('leftRight.headerNote'),
    }
  },

  holeSummary(round: Round, hole: number): HoleSummary[] {
    const teams = teamsForHole(round, hole)
    if (teams.length !== 2) {
      return [
        {
          id: '_game',
          entries: [{ label: t('leftRight.pairing'), value: t('leftRight.notReady') }],
        },
      ]
    }

    const points = holePointsForTeams(round, teams, hole)
    return [
      {
        id: '_game',
        entries: teams.map((team, index) => ({
          label: teamName(round, team),
          value: t('common.points', { count: points[index]?.total ?? 0 }),
        })),
      },
    ]
  },

  scorecardColumns(round: Round): ScorecardColumn[] {
    return round.players.map((player) => ({
      id: `left-right-${player.id}`,
      label: t('leftRight.column'),
      afterPlayerId: player.id,
      cell: (r, hole) =>
        isHoleStarted(r, hole) && isPairingComplete(r, hole)
          ? `${playerHolePoints(r, player.id, hole)}`
          : '',
      total: (r) => `${totalPlayerPoints(r, player.id)}`,
    }))
  },
}

export { pairingAt }
