import type { Round } from '../types'
import { holesPlayed, parForPlayedHoles, strokeTotal } from '../types'
import type { GameDefinition, StandingRow } from './types'
import { assignPositions } from './types'

/**
 * Best Aggregate - vyhodnocení po jednotlivcích: vítězí nejnižší součet
 * ran přes všechny odehrané jamky.
 *
 * Pořadí se počítá průběžně, takže tabulka dává smysl i uprostřed kola;
 * "vs par" bere jen jamky, které má hráč zapsané.
 */
export const bestAggregate: GameDefinition = {
  id: 'best-aggregate',
  name: 'Best Aggregate',
  tagline: 'Nejnižší součet ran vyhrává',
  rules:
    'Každý hráč zapisuje své rány na každé jamce. Vyhodnocuje se součet ran ' +
    'za celé kolo - kdo má nejmíň, vyhrává.',
  minPlayers: 2,
  maxPlayers: 4,

  computeStandings(round: Round): StandingRow[] {
    const rows = round.players.map((player) => ({
      id: player.id,
      name: player.name,
      strokes: strokeTotal(round, player.id),
      holesPlayed: holesPlayed(round, player.id),
      toPar: strokeTotal(round, player.id) - parForPlayedHoles(round, player.id),
    }))
    return assignPositions(rows)
  },
}
