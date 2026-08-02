/**
 * Datový model jednoho kola a základní výpočty nad ním.
 *
 * Model je záměrně společný pro všechny hry - hry se liší jen tím, jak z
 * uložených ran spočítají výsledek (viz src/games/).
 */

export type PlayerId = string

export interface Player {
  id: PlayerId
  name: string
}

/** Dvojice hráčů u týmových her. */
export interface Team {
  id: string
  playerIds: PlayerId[]
}

/**
 * Extra body - speciální herní bonusy, které si hráč u jamky sám zaškrtne.
 *
 * "double" je výjimka: nepřidává body, ale zdvojnásobuje celý výsledek jamky.
 *
 * Bonus vždycky připadá celé dvojici, ne jen tomu, kdo ho uhrál. (Platí i pro
 * hry, které se přidají později.)
 */
export type BonusId =
  | 'double'
  | 'longest'
  | 'nearest'
  | 'bunker'
  | 'doubleBunker'
  | 'water'
  | 'barkie'
  | 'arnie'

export interface BonusDefinition {
  id: BonusId
  name: string
  description: string
  /** points = přičte body, multiplier = násobí jamku. */
  kind: 'points' | 'multiplier'
  defaultValue: number
  /** Nabízí se jen na jamkách s tímhle parem; bez hodnoty na všech. */
  onlyPar?: number
  /** Na jamce ho může mít jen jeden hráč. */
  exclusive?: boolean
  /** Písmeno, kterým je bonus vidět u zápisu. */
  mark?: string
}

export const BONUSES: BonusDefinition[] = [
  {
    id: 'double',
    name: 'Double',
    description: 'Zdvojnásobí výsledek celé jamky pro obě dvojice.',
    kind: 'multiplier',
    defaultValue: 1,
  },
  {
    id: 'longest',
    name: 'Longest',
    description: 'Nejdelší odpal; jen na pětiparových jamkách, pro jednoho hráče.',
    kind: 'points',
    defaultValue: 1,
    onlyPar: 5,
    exclusive: true,
    mark: 'L',
  },
  {
    id: 'nearest',
    name: 'Nearest',
    description: 'Nejbližší rána k jamce; jen na tříparových, pro jednoho hráče.',
    kind: 'points',
    defaultValue: 1,
    onlyPar: 3,
    exclusive: true,
    mark: 'P',
  },
  {
    id: 'bunker',
    name: 'Bunker (sandie)',
    description: 'Rána z bunkeru a přesto dobrý výsledek.',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'doubleBunker',
    name: 'Double bunker',
    description: 'Dva bunkery na jedné jamce.',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'water',
    name: 'Water',
    description: 'Míč ve vodě a přesto dobrý výsledek.',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'barkie',
    name: 'Barkie',
    description: 'Trefa do stromu a přesto dobrý výsledek.',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'arnie',
    name: 'Arnie',
    description: 'Dobrý výsledek, aniž by míč byl na fairwayi.',
    kind: 'points',
    defaultValue: 1,
  },
]

export function getBonus(id: BonusId): BonusDefinition | undefined {
  return BONUSES.find((b) => b.id === id)
}

/**
 * Kolikrát se extra bod počítá podle výsledku hráče na jamce.
 * Bogey a horší extra bod neuhraje.
 */
export function bonusMultiplier(diff: number): number {
  if (diff <= -2) return 3
  if (diff === -1) return 2
  if (diff === 0) return 1
  return 0
}

/** Volby bodování konkrétní hry. */
export interface GameOptions {
  /** Hodnota jednotlivých extra bodů; 0 znamená vypnuto. */
  bonusValues: Record<BonusId, number>
  /** Bod navíc, když oba partneři zahráli líp než oba soupeři; 0 = vypnuto. */
  doubleBest: number
  /** Dvojnásobná jamka ani "double" nenásobí extra body. */
  noDoubleBonuses: boolean
  /** Longest platí jen při paru a lepším, jinak bod bere soupeř. */
  confirmLongest: boolean
  /** Nearest platí jen při paru a lepším, jinak bod bere soupeř. */
  confirmNearest: boolean
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  bonusValues: Object.fromEntries(BONUSES.map((b) => [b.id, b.defaultValue])) as Record<
    BonusId,
    number
  >,
  doubleBest: 1,
  noDoubleBonuses: false,
  confirmLongest: false,
  confirmNearest: false,
}

export type Currency = 'CZK' | 'EUR'

/** Nastavení bodování a sázky. */
export interface RoundSettings {
  currency: Currency
  /** Kolik peněz je jeden bod (skin, vyhraná jamka). */
  pointValue: number
  /** Devátá a osmnáctá jamka se počítají dvojnásobně. */
  doubleClosingHoles: boolean
  /** Volby bodování konkrétní hry (extra body, Double Best). */
  options: GameOptions
}

/** Obvyklá sázka podle měny: desetikoruna, nebo euro za bod. */
export const DEFAULT_POINT_VALUE: Record<Currency, number> = {
  CZK: 10,
  EUR: 1,
}

export const DEFAULT_SETTINGS: RoundSettings = {
  currency: 'CZK',
  pointValue: DEFAULT_POINT_VALUE.CZK,
  doubleClosingHoles: false,
  options: DEFAULT_GAME_OPTIONS,
}

/** Jamky, které se při zapnuté volbě počítají dvojnásobně (1-based). */
export const DOUBLE_HOLES = [9, 18]

export interface Round {
  id: string
  gameId: string
  /** ISO timestamp založení kola. */
  createdAt: string
  /** ISO timestamp ukončení; dokud chybí, je kolo rozehrané. */
  finishedAt?: string
  players: Player[]
  /** Prázdné u her, které se hrají za jednotlivce. */
  teams: Team[]
  holeCount: number
  /** Par každé jamky, délka === holeCount. */
  pars: number[]
  /** scores[playerId][holeIndex] === null znamená "zatím nezapsáno". */
  scores: Record<PlayerId, (number | null)[]>
  /** bonuses[playerId][holeIndex] = extra body, které hráč na jamce uhrál. */
  bonuses: Record<PlayerId, BonusId[][]>
  /** Jamka zobrazená naposledy, 0-based. */
  currentHole: number
  /** Bodování a sázka; kolo si je nese, ať archiv sedí i po změně předvoleb. */
  settings: RoundSettings
}

export const DEFAULT_PAR = 4

/** Nejvyšší zapsatelný počet ran na jamce - pojistka proti překliku. */
export const MAX_STROKES = 20

export interface CreateRoundOptions {
  gameId: string
  playerNames: string[]
  holeCount: number
  /** Rozdělení do týmů po indexech hráčů, např. [[0, 1], [2, 3]]. */
  teamIndices?: number[][]
  settings?: RoundSettings
}

export function createRound({
  gameId,
  playerNames,
  holeCount,
  teamIndices,
  settings = DEFAULT_SETTINGS,
}: CreateRoundOptions): Round {
  const players: Player[] = playerNames.map((name, i) => ({
    id: `p${i + 1}`,
    name: name.trim() || `Hráč ${i + 1}`,
  }))

  const scores: Record<PlayerId, (number | null)[]> = {}
  const bonuses: Record<PlayerId, BonusId[][]> = {}
  for (const player of players) {
    scores[player.id] = Array<number | null>(holeCount).fill(null)
    bonuses[player.id] = Array.from({ length: holeCount }, () => [])
  }

  const teams: Team[] = (teamIndices ?? []).map((indices, i) => ({
    id: `t${i + 1}`,
    playerIds: indices
      .map((index) => players[index]?.id)
      .filter((id): id is PlayerId => id !== undefined),
  }))

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId,
    createdAt: new Date().toISOString(),
    players,
    teams,
    holeCount,
    pars: Array<number>(holeCount).fill(DEFAULT_PAR),
    scores,
    bonuses,
    currentHole: 0,
    // Hluboká kopie: kolo si nese vlastní nastavení, takže pozdější změna
    // předvoleb hry nepřepíše, jak se počítalo odehrané kolo v archivu.
    settings: {
      ...settings,
      options: {
        ...settings.options,
        bonusValues: { ...settings.options.bonusValues },
      },
    },
  }
}

/**
 * Kolikrát se jamka počítá. Devátá a osmnáctá mohou být za dvojnásobek -
 * u devítijamkového kola tak dvojnásobí poslední jamku. Zvolený extra bod
 * "double" násobí navíc, takže dvojnásobná jamka s doublem je za čtyřnásobek.
 */
export function holeMultiplier(round: Round, hole: number): number {
  const closing =
    round.settings.doubleClosingHoles && DOUBLE_HOLES.includes(hole + 1) ? 2 : 1
  return closing * doubleCallMultiplier(round, hole)
}

/**
 * Kolikrát se jamka násobí kvůli zvolenému "double". Každý zápis doublu
 * násobí zvlášť, takže tři doubly na jamce znamenají osminásobek.
 */
export function doubleCallMultiplier(round: Round, hole: number): number {
  if ((round.settings.options.bonusValues.double ?? 0) <= 0) return 1
  const calls = round.players.filter((p) =>
    bonusesAt(round, p.id, hole).includes('double'),
  ).length
  return 2 ** calls
}

/** Bonusy, které jde na dané jamce zvolit; ty vázané na par jdou první. */
export function availableBonuses(round: Round, hole: number): BonusDefinition[] {
  const par = parAt(round, hole)
  return BONUSES.filter(
    (bonus) =>
      (round.settings.options.bonusValues[bonus.id] ?? 0) > 0 &&
      (bonus.onlyPar === undefined || bonus.onlyPar === par),
  ).sort((a, b) => (a.onlyPar ? -1 : 0) - (b.onlyPar ? -1 : 0))
}

/**
 * Kolik bodů má hráč na jamce zapsáno v extra bodech - do odznaku u zápisu.
 * Longest a Nearest se počítají v základní hodnotě, protože o jejich přiznání
 * rozhoduje až potvrzovací pravidlo.
 */
export function playerBonusPoints(
  round: Round,
  playerId: PlayerId,
  hole: number,
): number {
  const values = round.settings.options.bonusValues
  const diff = diffToPar(round, playerId, hole)

  let total = 0
  for (const bonusId of bonusesAt(round, playerId, hole)) {
    const bonus = getBonus(bonusId)
    if (!bonus || bonus.kind === 'multiplier') continue
    const value = values[bonusId] ?? 0
    total += bonus.exclusive ? value : value * (diff === null ? 0 : bonusMultiplier(diff))
  }
  return total
}

/** Extra body, které má hráč zapsané na jamce. */
export function bonusesAt(round: Round, playerId: PlayerId, hole: number): BonusId[] {
  return round.bonuses?.[playerId]?.[hole] ?? []
}

/**
 * Přepne extra bod u hráče na jamce.
 *
 * Bonusy označené jako exkluzivní (Longest, Nearest) může mít na jamce jen
 * jeden hráč, takže se ostatním zároveň odeberou.
 */
export function toggleBonus(
  round: Round,
  playerId: PlayerId,
  hole: number,
  bonusId: BonusId,
): Round {
  const holesOf = (id: PlayerId) => {
    const perPlayer = round.bonuses[id] ?? []
    return Array.from({ length: round.holeCount }, (_, i) => perPlayer[i] ?? [])
  }

  const own = holesOf(playerId)
  const current = own[hole] ?? []
  const adding = !current.includes(bonusId)
  own[hole] = adding ? [...current, bonusId] : current.filter((b) => b !== bonusId)

  const bonuses: Record<PlayerId, BonusId[][]> = { ...round.bonuses, [playerId]: own }

  if (adding && getBonus(bonusId)?.exclusive) {
    for (const player of round.players) {
      if (player.id === playerId) continue
      const holes = holesOf(player.id)
      if (!(holes[hole] ?? []).includes(bonusId)) continue
      holes[hole] = (holes[hole] ?? []).filter((b) => b !== bonusId)
      bonuses[player.id] = holes
    }
  }

  return { ...round, bonuses }
}

/** Tým se pojmenovává podle hráčů, ať se drží v souladu se zadanými jmény. */
export function teamName(round: Round, team: Team): string {
  return team.playerIds
    .map((id) => round.players.find((p) => p.id === id)?.name ?? '?')
    .join(' + ')
}

export function playerName(round: Round, playerId: PlayerId): string {
  return round.players.find((p) => p.id === playerId)?.name ?? '?'
}

export function scoreAt(round: Round, playerId: PlayerId, hole: number): number | null {
  return round.scores[playerId]?.[hole] ?? null
}

export function parAt(round: Round, hole: number): number {
  return round.pars[hole] ?? DEFAULT_PAR
}

/** Rány vůči paru na jedné jamce; null, když hráč jamku nezapsal. */
export function diffToPar(round: Round, playerId: PlayerId, hole: number): number | null {
  const score = scoreAt(round, playerId, hole)
  return score === null ? null : score - parAt(round, hole)
}

/** Součet ran hráče přes zapsané jamky. */
export function strokeTotal(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).reduce<number>((sum, s) => sum + (s ?? 0), 0)
}

/** Kolik jamek už má hráč zapsaných. */
export function holesPlayed(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).filter((s) => s !== null).length
}

/** Součet parů jen za jamky, které hráč zapsal - kvůli férovému "vs par". */
export function parForPlayedHoles(round: Round, playerId: PlayerId): number {
  return (round.scores[playerId] ?? []).reduce<number>(
    (sum, s, hole) => (s === null ? sum : sum + parAt(round, hole)),
    0,
  )
}

/**
 * Hrálo se už na téhle jamce?
 *
 * Rozlišuje dvě různé věci, které v datech vypadají stejně (chybějící zápis):
 * jamka, na kterou se ještě nedošlo, a jamka, kterou hráč vzdal. Jakmile na
 * jamce zapsal aspoň jeden hráč, je jamka rozehraná - a komu tam zápis chybí,
 * ten ji vzdal.
 */
export function isHoleStarted(round: Round, hole: number): boolean {
  return round.players.some((p) => scoreAt(round, p.id, hole) !== null)
}

export function isHoleComplete(round: Round, hole: number): boolean {
  return round.players.every((p) => scoreAt(round, p.id, hole) !== null)
}

export interface RoundCompleteness {
  /** Jamky (1-based), kde se hrálo, ale někomu chybí zápis - vzdané. */
  conceded: number[]
  /** Jamky (1-based), na které se vůbec nedošlo. */
  unplayed: number[]
  complete: boolean
}

/** Přehled chybějících zápisů pro upozornění při ukončení kola. */
export function roundCompleteness(round: Round): RoundCompleteness {
  const conceded: number[] = []
  const unplayed: number[] = []

  for (let hole = 0; hole < round.holeCount; hole++) {
    if (!isHoleStarted(round, hole)) unplayed.push(hole + 1)
    else if (!isHoleComplete(round, hole)) conceded.push(hole + 1)
  }

  return {
    conceded,
    unplayed,
    complete: conceded.length === 0 && unplayed.length === 0,
  }
}

/** Seznam jamek se souvislými úseky zkrácenými na rozsah: "1, 3, 6–18". */
export function formatHoleList(holes: number[]): string {
  const parts: string[] = []
  let start: number | null = null
  let previous: number | null = null

  const flush = () => {
    if (start === null || previous === null) return
    if (previous - start >= 2) parts.push(`${start}–${previous}`)
    else for (let h = start; h <= previous; h++) parts.push(`${h}`)
  }

  for (const hole of holes) {
    if (previous !== null && hole === previous + 1) {
      previous = hole
      continue
    }
    flush()
    start = hole
    previous = hole
  }
  flush()

  return parts.join(', ')
}

export function isRoundComplete(round: Round): boolean {
  for (let hole = 0; hole < round.holeCount; hole++) {
    if (!isHoleComplete(round, hole)) return false
  }
  return true
}

/** Hráči daného týmu v pořadí, v jakém jsou v týmu uvedení. */
export function teamPlayers(round: Round, team: Team): Player[] {
  return team.playerIds
    .map((id) => round.players.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined)
}

/**
 * Hráči v pořadí pro scorekartu: u týmových her po dvojicích, ať jsou rány
 * partnerů vedle sebe a body dvojice stály hned za nimi.
 */
export function scorecardPlayers(round: Round): Player[] {
  if (round.teams.length === 0) return round.players
  const ordered = round.teams.flatMap((team) => teamPlayers(round, team))
  // Hráč mimo dvojici by jinak ze scorekarty zmizel.
  const missing = round.players.filter((p) => !ordered.some((o) => o.id === p.id))
  return [...ordered, ...missing]
}

/**
 * Kategorie výsledku na jamce. Používá se pro barvu i tvar značky, aby
 * scorekarta a zápis skóre vypadaly stejně.
 */
export type ScoreCategory = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple'

export function scoreCategory(score: number, par: number): ScoreCategory {
  const diff = score - par
  if (diff <= -2) return 'eagle'
  if (diff === -1) return 'birdie'
  if (diff === 0) return 'par'
  if (diff === 1) return 'bogey'
  if (diff === 2) return 'double'
  return 'triple'
}

/** Popisky kategorií do legendy. */
export const SCORE_CATEGORY_LABEL: Record<ScoreCategory, string> = {
  eagle: 'Eagle a lepší',
  birdie: 'Birdie',
  par: 'Par',
  bogey: 'Bogey',
  double: 'Dvojbogey',
  triple: 'Trojbogey a horší',
}

/** Formátuje rozdíl vůči paru: -2 -> "-2", 0 -> "E", 3 -> "+3". */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

/** Datum kola v českém formátu pro archiv. */
export function formatRoundDate(round: Round): string {
  return new Date(round.createdAt).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}
