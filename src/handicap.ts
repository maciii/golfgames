import type { BonusId, PlayerId, Round } from './types'
import { diffToPar, parAt, scoreAt } from './types'

/**
 * Handicapy a netto výpočty.
 *
 * Čisté funkce nad modelem kola, stejně jako `src/money.ts` - hry a obrazovky
 * je jen volají. Vzorce jsou z World Handicap System, který je veřejně
 * dokumentovaný; aplikace ale žádný oficiální handicap nevede ani nepočítá,
 * jen pracuje s indexem, který si hráč zadá sám.
 *
 * Patří sem i přidělení Longestu a Nearestu: o potvrzení Longestu rozhoduje
 * osobní par, tedy handicapový výpočet. Hry i obrazovky se ptají tady, aby
 * značka u jména a skutečné body nemohly tvrdit každá něco jiného.
 */

/** Slope neutrálního hřiště. Vzorec pro hrací handicap je k němu vztažený. */
export const NEUTRAL_SLOPE = 113

/**
 * Hrací handicap = index × (SR / 113) + (CR − par).
 *
 * Druhý člen dorovnává absolutní obtížnost: na hřišti, kde je CR vyšší než par,
 * dostane hráč rány navíc, i kdyby byl slope neutrální.
 *
 * `share` je podíl hřiště, který se hraje - devítka z osmnáctijamkového hřiště
 * je 0.5. WHS počítá devítkový handicap z poloviny indexu a devítkové normy;
 * když je po ruce jen osmnáctijamkové CR, SR a par (a to je náš případ, protože
 * devítková norma se do katalogu nezadává), vyjde totéž jako polovina celého
 * výsledku - jen se zaokrouhluje až nakonec, ne dvakrát.
 */
export function courseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number,
  share = 1,
): number {
  return Math.round(
    (handicapIndex * (slopeRating / NEUTRAL_SLOPE) + (courseRating - par)) * share,
  )
}

/**
 * Přepočte stroke index na pořadí 1..holeCount.
 *
 * Devítijamková hřiště mívají SI podepsané z mateřské osmnáctky (liché 1-17,
 * nebo sudé 2-18). Kdyby se braly tak, jak jsou, dostal by hráč s handicapem 5
 * rány na jamkách s SI 1, 3 a 5 - tedy na třech z devíti místo na pěti.
 * Přepočet na skutečné pořadí tohle srovná.
 */
export function normalizeStrokeIndex(strokeIndex: number[], holeCount: number): number[] {
  const usable = strokeIndex.length === holeCount
  if (!usable) return Array.from({ length: holeCount }, (_, i) => i + 1)

  const alreadyRanked = strokeIndex.every((si) => si >= 1 && si <= holeCount)
  if (alreadyRanked) return [...strokeIndex]

  // Seřadíme jamky podle obtížnosti a rozdáme pořadí 1..holeCount.
  const order = strokeIndex.map((si, hole) => ({ si, hole })).sort((a, b) => a.si - b.si)

  const ranked = Array<number>(holeCount).fill(1)
  order.forEach((entry, index) => {
    ranked[entry.hole] = index + 1
  })
  return ranked
}

/**
 * Kolik ran hráč dostane na jedné jamce.
 *
 * Základ je `floor(HCP / počet jamek)` na každou jamku, zbytek se rozdá po
 * jedné jamkám od nejtěžší. Plusový (záporný) handicap funguje obráceně -
 * hráč rány vrací, a to od nejlehčí jamky, proto se pořadí obrací.
 */
export function strokesForHole(
  playingHandicap: number,
  strokeIndex: number,
  holeCount: number,
): number {
  if (!Number.isFinite(playingHandicap) || playingHandicap === 0) return 0
  if (holeCount <= 0) return 0

  const sign = playingHandicap > 0 ? 1 : -1
  const amount = Math.abs(Math.round(playingHandicap))
  const base = Math.floor(amount / holeCount)
  const extra = amount % holeCount

  const rank = sign > 0 ? strokeIndex : holeCount + 1 - strokeIndex
  const strokes = base + (rank <= extra ? 1 : 0)

  // Bez téhle podmínky by u plusového handicapu vyšla na nedotčené jamce
  // záporná nula, která se v UI umí zobrazit jako "-0".
  return strokes === 0 ? 0 : sign * strokes
}

/**
 * Stablefordovy body z rozdílu netto skóre vůči paru.
 *
 * Par jsou dva body, každá rána nad par jeden dolů (netto dvojbogey a horší
 * nedá nic), každá pod par jeden nahoru.
 */
export function stablefordPoints(netDiff: number): number {
  return Math.max(0, 2 - netDiff)
}

// --- výpočty nad kolem ----------------------------------------------------

/** Hraje se tohle kolo netto? */
export function isNetRound(round: Round): boolean {
  return round.netScoring === true
}

/** Stroke index kola přepočtený na pořadí; bez hřiště jamky po pořadí. */
export function roundStrokeIndex(round: Round): number[] {
  return normalizeStrokeIndex(round.course?.strokeIndex ?? [], round.holeCount)
}

/** Hrací handicap hráče; bez zadané hodnoty nula, tedy hraje hrubě. */
export function playingHandicap(round: Round, playerId: PlayerId): number {
  const player = round.players.find((p) => p.id === playerId)
  return player?.playingHandicap ?? 0
}

/**
 * Rány, které hráč dostává na jamce. U hrubého kola vždy nula, aby se netto
 * logika nemusela obcházet podmínkami na každém volajícím místě.
 */
export function strokesReceived(round: Round, playerId: PlayerId, hole: number): number {
  if (!isNetRound(round)) return 0
  const strokeIndex = roundStrokeIndex(round)[hole] ?? hole + 1
  return strokesForHole(playingHandicap(round, playerId), strokeIndex, round.holeCount)
}

/**
 * Rány k dobru proti hráči s nejnižším hracím handicapem ve flightu.
 *
 * Stableford se boduje z plného vlastního HCP vůči paru, ale při společné hře
 * se rozdíl handicapů tradičně zapisuje tečkami. Tečky proto nesmí měnit
 * skóre ani body - jsou jen srozumitelným vysvětlením vzájemné výhody.
 */
export function strokesRelativeToBest(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number {
  if (!isNetRound(round)) return 0

  const bestHandicap = Math.min(
    ...round.players.map((player) => player.playingHandicap ?? 0),
  )
  const difference = playingHandicap(round, playerId) - bestHandicap
  if (difference <= 0) return 0

  const strokeIndex = roundStrokeIndex(round)[hole] ?? hole + 1
  return strokesForHole(difference, strokeIndex, round.holeCount)
}

/**
 * Netto rány hráče na jamce; null, dokud jamku nezapsal.
 *
 * U hrubého kola vrací zapsané skóre beze změny - hry proto můžou volat tuhle
 * funkci vždycky a nemusí řešit, jestli se hraje netto.
 */
export function netScoreAt(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number | null {
  const score = scoreAt(round, playerId, hole)
  if (score === null) return null
  return score - strokesReceived(round, playerId, hole)
}

/** Netto rozdíl vůči paru na jamce; null, dokud hráč jamku nezapsal. */
export function netDiffToPar(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number | null {
  const net = netScoreAt(round, playerId, hole)
  return net === null ? null : net - parAt(round, hole)
}

/**
 * Rozdíl vůči paru, kterým se potvrzuje Longest nebo Nearest.
 *
 * Osobním parem (par jamky plus rány, které na ní hráč dostává) se v netto kole
 * potvrzuje **jen Longest**, a jen se zapnutou volbou. Nearest se potvrzuje
 * vždycky hrubým parem: je to rána na tříparovou jamku, kde délka hřiště
 * slabšího hráče netrestá, takže na ni handicap nepatří.
 *
 * Jinde se handicap do extra bodů nepromítá vůbec - hodnota bonusu se násobí
 * podle **hrubého** výsledku, protože rozdané rány nemají s tím, jak se jamka
 * zahrála, nic společného.
 */
export function confirmDiffToPar(
  round: Round,
  playerId: PlayerId,
  hole: number,
  bonusId: BonusId,
): number | null {
  const personal = bonusId === 'longest' && round.settings.options.confirmByPersonalPar

  return personal && isNetRound(round)
    ? netDiffToPar(round, playerId, hole)
    : diffToPar(round, playerId, hole)
}

/**
 * Komu na jamce připadne bonus, který drží jediný hráč (Longest, Nearest).
 *
 * Bez potvrzování zůstává vždy jeho straně. S potvrzováním rozhoduje výsledek:
 * par a lepší bonus potvrdí, horší ho posílá soupeři. Dokud hráč jamku
 * nezapsal, není rozhodnuto.
 */
export function exclusiveBonusOutcome(
  round: Round,
  playerId: PlayerId,
  hole: number,
  bonusId: BonusId,
): 'own' | 'opponent' | 'pending' {
  const confirm =
    bonusId === 'longest'
      ? round.settings.options.confirmLongest
      : round.settings.options.confirmNearest
  if (!confirm) return 'own'

  const diff = confirmDiffToPar(round, playerId, hole, bonusId)
  if (diff === null) return 'pending'
  return diff <= 0 ? 'own' : 'opponent'
}

/** Stablefordovy body hráče na jamce; 0 za nezapsanou (vzdanou) jamku. */
export function holeStablefordPoints(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number {
  const diff = netDiffToPar(round, playerId, hole)
  return diff === null ? 0 : stablefordPoints(diff)
}
