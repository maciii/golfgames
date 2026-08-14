import type { GameOptions, PlayerId, Round, Team } from './types'
import { touchRound } from './types'
import { getGame } from './games'
import { t } from './i18n'

/**
 * Dvojice v kole: jak se skládají při zakládání a jak se dají změnit
 * v rozehraném kole.
 *
 * Volba dvojic není pravidlo hry (to patří do `src/games/`), ale ani obrazovka -
 * uplatňuje se při zakládání kola, čte se zpátky z rozehraného kola a mění se
 * dodatečně. Kdyby žila v komponentě, měl by každý z těch tří případů vlastní
 * kopii a hráči by dostali jiné dvojice, než jaké si vybrali.
 */

/**
 * Tři možná rozdělení čtyř hráčů do dvojic. Víc jich neexistuje - u čtyř
 * hráčů určuje dvojice už jen to, koho dostane první hráč za partnera.
 *
 * Pořadí je zároveň veřejné rozhraní: kolo si nese dvojice, ne index, ale
 * obrazovky vybírají právě indexem do tohohle pole.
 */
export const PAIRINGS: number[][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
]

/**
 * Rozdělení hráčů do dvojic podle zvolené volby.
 *
 * Míň než čtyři hráči nemají co dělit - hraje se jedna dvojice proti poli,
 * což je stejné rozdělení, jaké appka zakládala odjakživa.
 */
export function pairingTeamIndices(playerCount: number, pairing: number): number[][] {
  if (playerCount !== 4) return [[0, 1]]
  return PAIRINGS[pairing] ?? PAIRINGS[0] ?? []
}

/**
 * Zvolené dvojice jednou řádkou: „Mac + Michal vs Alex + Petr", u dvou
 * jamkovek ve flightu „Mac vs. Michal · Alex vs. Petr".
 */
export function pairingLabel(gameId: string, names: string[], pairing: number): string {
  const opponents = getGame(gameId).pairingKind === 'opponents'
  const displayName = (index: number) =>
    names[index]?.trim() || t('common.player', { number: index + 1 })

  return pairingTeamIndices(names.length, pairing)
    .map((group) =>
      group.map(displayName).join(opponents ? t('singles.versusJoin') : ' + '),
    )
    .join(opponents ? ' · ' : ` ${t('setup.versus')} `)
}

/** Které z voleb odpovídají dvojice, se kterými se kolo hraje. */
export function pairingIndexOf(round: Round): number {
  const first = round.teams[0]
  if (!first) return 0
  const indexes = first.playerIds
    .map((id) => round.players.findIndex((player) => player.id === id))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)

  const found = PAIRINGS.findIndex((option) => {
    const side = [...(option[0] ?? [])].sort((a, b) => a - b)
    return side.length === indexes.length && side.every((v, i) => v === indexes[i])
  })
  return found < 0 ? 0 : found
}

/** Dvojice pro rozehrané kolo; hry jednotlivců je nemají žádné. */
function teamsFor(round: Round, gameId: string, pairing: number): Team[] {
  if (!getGame(gameId).usesTeams(round.players.length)) return []
  return pairingTeamIndices(round.players.length, pairing).map((indices, index) => ({
    id: `t${index + 1}`,
    playerIds: indices.flatMap((playerIndex) => {
      const id: PlayerId | undefined = round.players[playerIndex]?.id
      return id ? [id] : []
    }),
  }))
}

/** Sedí dvojice na sebe, včetně pořadí (peníze párují protějšky podle indexu)? */
function sameTeams(current: Team[], next: Team[]): boolean {
  return (
    current.length === next.length &&
    current.every((team, index) => {
      const other = next[index]
      return (
        other !== undefined &&
        team.playerIds.length === other.playerIds.length &&
        team.playerIds.every((id, i) => id === other.playerIds[i])
      )
    })
  )
}

/**
 * Změní hru nebo dvojice **rozehraného** kola.
 *
 * Zapsané skóre se nikdy nemaže (viz `AGENTS.md`) - kolo se jen přepočítá
 * celé znovu podle nového nastavení, protože všechny hry počítají výsledek
 * ze `Round.scores` až při zobrazení. Nastavení bodování se bere pro novou
 * hru stejně jako při zakládání kola, jinak by si Skins nesl volby Dots.
 */
export function applyRoundGame(
  round: Round,
  gameId: string,
  pairing: number,
  gameOptions: GameOptions,
): Round {
  const game = getGame(gameId)
  const teams = teamsFor(round, gameId, pairing)
  const sameGame = round.gameId === gameId

  if (sameGame && sameTeams(round.teams, teams)) return round

  return touchRound({
    ...round,
    gameId,
    teams,
    // Kolo si nese vlastní kopii nastavení (nepřekročitelné pravidlo #4).
    settings: sameGame
      ? round.settings
      : {
          ...round.settings,
          options: {
            ...gameOptions,
            bonusValues: { ...gameOptions.bonusValues },
            resultMultipliers: { ...gameOptions.resultMultipliers },
            doubleClosingHoles:
              game.supportsDoubleHoles && gameOptions.doubleClosingHoles,
          },
        },
  })
}
