import type { BonusId, PlayerId, Round } from '../types'
import { bonusMultiplier, bonusesAt, getBonus, holeMultiplier } from '../types'
import { bonusDiffToPar, exclusiveBonusOutcome } from '../handicap'
import type { StandingsSection } from './types'
import { rankRows } from './types'
import { t } from '../i18n'

/**
 * Extra body jako **vedlejší sázka**.
 *
 * Longest, Nearest, bunker, voda a spol. nejsou součástí žádných pravidel
 * hry - hraje se o ně vedle ní. Best + Součet, Levá-Pravá a Skins si je
 * počítají do svých bodů, protože samy body rozdávají. Jamkovka, Stableford
 * ani Dots ale svoje jednotky míchat nemohou: přičtení bonusu k vyhraným
 * jamkám by rozbilo stav zápasu a k Stablefordu by přilepilo body, které
 * s výsledkem proti paru nemají nic společného.
 *
 * Vedlejší sázka proto stojí zvlášť: vlastní tabulka pod výsledkem hry
 * a body, které se **přidají do peněžního vyrovnání** té samé hry (jedna
 * hodnota bodu platí v kole na všechno). Ve výchozím stavu jsou všechny
 * hodnoty **nula**, takže dokud si je někdo nezapne, appka se chová stejně
 * jako dřív - o žádné extra body se nehraje.
 */

/** Extra body, o které jde hrát vedle hry. Násobič jamky mezi ně nepatří. */
export const SIDE_BET_BONUSES: BonusId[] = [
  'longest',
  'nearest',
  'bunker',
  'doubleBunker',
  'water',
  'barkie',
  'arnie',
]

/**
 * Body z extra bodů, které hráč uhrál na jedné jamce.
 *
 * Platí stejná pravidla jako u her, které si extra body počítají do svých
 * bodů: hodnota platí za par, lepší výsledek ji znásobí podle nastavení hry
 * a při bogey a horším se nepočítá vůbec. Jestli se výsledek bere brutto, nebo
 * podle osobního paru, rozhoduje volba „Uplatňovat HCP" (`bonusDiffToPar()`). Longest a Nearest drží na jamce
 * jediný hráč a se zapnutým potvrzováním musí jamku zahrát na par nebo líp;
 * nepotvrzený bod u hry jednotlivců propadá (není soupeřova dvojice, které by
 * mohl připadnout).
 */
export function holeSideBetPoints(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number {
  const diff = bonusDiffToPar(round, playerId, hole)
  if (diff === null) return 0

  const resultMultiplier = bonusMultiplier(diff, round.settings.options.resultMultipliers)
  if (resultMultiplier === 0) return 0

  let total = 0
  for (const bonusId of bonusesAt(round, playerId, hole)) {
    if (!SIDE_BET_BONUSES.includes(bonusId)) continue
    const bonus = getBonus(bonusId)
    const value = round.settings.options.bonusValues[bonusId] ?? 0
    if (!bonus || bonus.kind !== 'points' || value <= 0) continue

    if (bonus.exclusive) {
      if (exclusiveBonusOutcome(round, playerId, hole, bonusId) !== 'own') continue
      total += value
    } else {
      total += value * resultMultiplier
    }
  }

  const multiplier = round.settings.options.noDoubleBonuses
    ? 1
    : holeMultiplier(round, hole)
  return total * multiplier
}

/** Extra body strany za celé kolo; u dvojice se sčítají body obou partnerů. */
export function sideBetTotal(round: Round, playerIds: PlayerId[]): number {
  let total = 0
  for (const playerId of playerIds) {
    for (let hole = 0; hole < round.holeCount; hole++) {
      total += holeSideBetPoints(round, playerId, hole)
    }
  }
  return total
}

/** Kolik jamek strana v extra bodech skutečně bodovala. */
function scoringHoles(round: Round, playerIds: PlayerId[]): number {
  let holes = 0
  for (let hole = 0; hole < round.holeCount; hole++) {
    const points = playerIds.reduce(
      (sum, playerId) => sum + holeSideBetPoints(round, playerId, hole),
      0,
    )
    if (points > 0) holes += 1
  }
  return holes
}

/** Hraje se v tomhle kole vůbec o extra body? */
export function hasSideBets(round: Round): boolean {
  return SIDE_BET_BONUSES.some((id) => (round.settings.options.bonusValues[id] ?? 0) > 0)
}

/** Strana vedlejší sázky - hráč, nebo dvojice. */
export interface SideBetSide {
  id: string
  name: string
  playerIds: PlayerId[]
}

/**
 * Tabulka extra bodů pod výsledkem hry; `null`, když se o ně nehraje.
 *
 * Stojí zvlášť, aby hlavní tabulka zůstala tím, co hra opravdu spočítala -
 * pořadí v jamkovce je podle vyhraných jamek, ne podle toho, kdo víckrát
 * trefil bunker.
 */
export function sideBetSection(
  round: Round,
  sides: SideBetSide[],
): StandingsSection | null {
  if (!hasSideBets(round)) return null

  const rows = sides.map((side) => {
    const points = sideBetTotal(round, side.playerIds)
    return {
      id: side.id,
      name: side.name,
      value: points,
      valueLabel: t('common.points', { count: points }),
      holesPlayed: scoringHoles(round, side.playerIds),
    }
  })

  return {
    id: 'side-bets',
    title: t('sideBets.title'),
    description: t('sideBets.description'),
    rows: rankRows(rows, 'highest'),
  }
}

/**
 * Strany peněžního vyrovnání: jednotky hry plus extra body.
 *
 * Vedlejší sázka se vyrovnává **tam, kde se vyrovnává hra** - u dvou jamkovek
 * ve flightu tedy v rámci zápasu, u dvojic mezi dvojicemi. Hodnota bodu je
 * v kole jedna, takže vyhraná jamka a extra bod mají stejnou cenu.
 */
export function withSideBets(
  round: Round,
  sides: (SideBetSide & { units: number })[],
): { id: string; name: string; units: number }[] {
  return sides.map((side) => ({
    id: side.id,
    name: side.name,
    units: side.units + sideBetTotal(round, side.playerIds),
  }))
}
