import type { GameDefinition } from './types'
import { bestAggregate } from './bestAggregate'
import { skins } from './skins'
import { matchPlay } from './matchPlay'
import { stableford } from './stableford'

/**
 * Registr her.
 *
 * Přidání další hry = nový soubor v této složce implementující GameDefinition
 * plus zápis do tohoto pole. Zbytek aplikace (zápis skóre, ukládání, archiv,
 * výsledková tabulka) je pro všechny hry společný.
 *
 * Pravidla jsou popsaná v docs/games.md.
 */
export const GAMES: GameDefinition[] = [bestAggregate, skins, matchPlay, stableford]

export const DEFAULT_GAME_ID = bestAggregate.id

/** Hra podle id; při neznámém id spadne na výchozí, ať se archiv nerozbije. */
export function getGame(gameId: string): GameDefinition {
  return GAMES.find((g) => g.id === gameId) ?? bestAggregate
}

export type {
  GameDefinition,
  GameScoringOptions,
  HeaderSummary,
  HoleSummary,
  ScorecardColumn,
  ScorecardPlayerCell,
  ScorecardPlayerTotal,
  StandingRow,
  StandingsSection,
} from './types'
