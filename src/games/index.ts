import type { GameDefinition } from './types'
import { bestAggregate } from './bestAggregate'

/**
 * Registr her. Přidání další hry = nový soubor v této složce + zápis sem;
 * zbytek aplikace (zápis skóre, ukládání, výsledková tabulka) je společný.
 */
export const GAMES: GameDefinition[] = [bestAggregate]

export const DEFAULT_GAME_ID = bestAggregate.id

export function getGame(gameId: string): GameDefinition {
  return GAMES.find((g) => g.id === gameId) ?? bestAggregate
}

export type { GameDefinition, StandingRow } from './types'
