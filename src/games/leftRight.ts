import type { HolePairings, HoleSide, PlayerId, Round, Team } from '../types'
import { holesPlayed, isHoleStarted, strokeTotal, teamName } from '../types'
import { t } from '../i18n'
import { holeBreakdownForTeams, holePointsForTeams } from './bestAggregate'
import type {
  GameDefinition,
  HeaderSummary,
  HoleBreakdown,
  HoleSetup,
  HoleSetupSelection,
  HoleSummary,
  ScorecardColumn,
  ScorecardPlayerCell,
  StandingsSection,
} from './types'
import { rankRows } from './types'

const LEFT: HoleSide = 'left'
const RIGHT: HoleSide = 'right'
const SIDES: HoleSide[] = [LEFT, RIGHT]

const PAIRING_CHOICES = [
  { id: '12-34', left: [0, 1], right: [2, 3] },
  { id: '13-24', left: [0, 2], right: [1, 3] },
  { id: '14-23', left: [0, 3], right: [1, 2] },
] as const

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

function pairingAssignments(
  round: Round,
  choice: (typeof PAIRING_CHOICES)[number],
): Partial<Record<PlayerId, HoleSide>> | undefined {
  const assignments: Partial<Record<PlayerId, HoleSide>> = {}
  for (const [side, indexes] of [
    [LEFT, choice.left],
    [RIGHT, choice.right],
  ] as const) {
    for (const index of indexes) {
      const player = round.players[index]
      if (!player) return undefined
      assignments[player.id] = side
    }
  }
  return assignments
}

function selectedChoiceId(round: Round, hole: number): string | undefined {
  const pairing = pairingAt(round, hole)
  return PAIRING_CHOICES.find((choice) => {
    const assignments = pairingAssignments(round, choice)
    return (
      assignments !== undefined &&
      round.players.every((player) => pairing[player.id] === assignments[player.id])
    )
  })?.id
}

function updatePairing(
  round: Round,
  hole: number,
  nextPairing: Partial<Record<PlayerId, HoleSide>>,
): Round {
  const currentPairing = pairingAt(round, hole)
  const changed = round.players.some(
    (player) => currentPairing[player.id] !== nextPairing[player.id],
  )
  if (!changed) return round

  const holePairings: HolePairings = {
    ...(round.holePairings ?? {}),
    [String(hole)]: nextPairing,
  }
  return { ...round, holePairings }
}

/** Změní směr první rány; zapsané skóre zůstane a přepočítá se podle nové dvojice. */
export function setHoleSide(
  round: Round,
  hole: number,
  playerId: PlayerId,
  side: string,
): Round {
  if (!SIDES.includes(side as HoleSide)) return round
  if (!round.players.some((player) => player.id === playerId)) return round
  if (hole < 0 || hole >= round.holeCount) return round

  return updatePairing(round, hole, {
    ...pairingAt(round, hole),
    [playerId]: side as HoleSide,
  })
}

function setHolePairing(round: Round, hole: number, choiceId: string): Round {
  if (hole < 0 || hole >= round.holeCount) return round
  const choice = PAIRING_CHOICES.find((option) => option.id === choiceId)
  const assignments = choice ? pairingAssignments(round, choice) : undefined
  return assignments ? updatePairing(round, hole, assignments) : round
}

function setHoleSetup(round: Round, hole: number, selection: HoleSetupSelection): Round {
  return selection.kind === 'choice'
    ? setHolePairing(round, hole, selection.choiceId)
    : setHoleSide(round, hole, selection.playerId, selection.optionId)
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
  const selected = selectedChoiceId(round, hole)
  const choices = PAIRING_CHOICES.flatMap((choice) => {
    const assignments = pairingAssignments(round, choice)
    if (!assignments) return []
    const playerName = (index: number) => round.players[index]?.name ?? '?'
    const left = `${playerName(choice.left[0])} + ${playerName(choice.left[1])}`
    const right = `${playerName(choice.right[0])} + ${playerName(choice.right[1])}`
    return [
      {
        id: choice.id,
        label: `${left} ${t('setup.versus')} ${right}`,
        pairing: { left, right },
        selected: choice.id === selected,
      },
    ]
  })

  return {
    title: t('leftRight.setupTitle'),
    message: selected ? t('leftRight.setupReady') : t('leftRight.setupHint'),
    options: [],
    entries: [],
    groups: [],
    choices,
    complete: selected !== undefined,
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
  setHoleSetup,

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

  /** Rozpis bodů obou dnešních dvojic - stejná pravidla jako Best + Součet. */
  holeBreakdown(round: Round, hole: number): HoleBreakdown[] {
    const teams = teamsForHole(round, hole)
    return teams.length === 2 ? holeBreakdownForTeams(round, teams, hole) : []
  },

  /** Označí první z aktuálních dvojic; druhá je zřejmá z neoznačených buněk. */
  scorecardPlayerCell(round: Round, playerId: string, hole: number): ScorecardPlayerCell {
    const firstTeam = teamsForHole(round, hole)[0]
    if (!firstTeam?.playerIds.includes(playerId)) return {}

    return {
      pairing: {
        ariaLabel: t('leftRight.scorecardPair', {
          pair: teamName(round, firstTeam),
        }),
      },
    }
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
