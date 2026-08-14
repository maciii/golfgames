import { localeTag, t } from './i18n'

/**
 * Datový model jednoho kola a základní výpočty nad ním.
 *
 * Model je záměrně společný pro všechny hry - hry se liší jen tím, jak z
 * uložených ran spočítají výsledek (viz src/games/).
 */

export type PlayerId = string

/** Strana hřiště použitá při určování dvojice na jamce. */
export type HoleSide = 'left' | 'right'

/** Přiřazení hráčů ke stranám na jednotlivých jamkách. */
export type HolePairings = Record<string, Partial<Record<PlayerId, HoleSide>>>

export interface Player {
  id: PlayerId
  name: string
  /**
   * WHS handicapový index hráče (např. 18.4). Z něj a z parametrů odpaliště
   * se počítá hrací handicap; samotný index se s hřištěm nemění.
   */
  handicapIndex?: number
  /**
   * Hrací handicap v ranách pro tohle kolo.
   *
   * Dopočítá se z indexu, ale jde ho přepsat ručně - na hřišti bez CR a SR je
   * to jediná cesta, jak netto hrát.
   */
  playingHandicap?: number
  /** Odpaliště, ze kterého hráč hraje; kvůli různým CR/SR u dvojic. */
  teeId?: string
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
  /**
   * Název a popis se berou z překladů podle id - klíče `bonus.<id>.name`
   * a `bonus.<id>.description` (viz src/i18n).
   */
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
    kind: 'multiplier',
    defaultValue: 1,
    mark: '×2',
  },
  {
    id: 'longest',
    kind: 'points',
    defaultValue: 1,
    onlyPar: 5,
    exclusive: true,
    mark: 'L',
  },
  {
    id: 'nearest',
    kind: 'points',
    defaultValue: 1,
    onlyPar: 3,
    exclusive: true,
    mark: 'N',
  },
  {
    id: 'bunker',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'doubleBunker',
    kind: 'points',
    defaultValue: 3,
  },
  {
    id: 'water',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'barkie',
    kind: 'points',
    defaultValue: 1,
  },
  {
    id: 'arnie',
    kind: 'points',
    defaultValue: 1,
  },
]

export function getBonus(id: BonusId): BonusDefinition | undefined {
  return BONUSES.find((b) => b.id === id)
}

/** Výsledky, které extra bod znásobují. Par je vždy jednonásobek. */
export type ResultTier = 'birdie' | 'eagle' | 'albatross' | 'condor'

/** Názvy a poznámky jsou v překladech pod `tier.<id>.name` a `.note`. */
export const RESULT_TIERS: { id: ResultTier }[] = [
  { id: 'birdie' },
  { id: 'eagle' },
  { id: 'albatross' },
  { id: 'condor' },
]

export const DEFAULT_RESULT_MULTIPLIERS: Record<ResultTier, number> = {
  birdie: 2,
  eagle: 3,
  albatross: 10,
  condor: 1000,
}

/**
 * Kolikrát se extra bod počítá podle výsledku hráče na jamce.
 * Par platí jednou, lepší výsledky podle nastavených násobičů, bogey a horší
 * extra bod neuhraje.
 */
export function bonusMultiplier(
  diff: number,
  multipliers: Record<ResultTier, number> = DEFAULT_RESULT_MULTIPLIERS,
): number {
  if (diff > 0) return 0
  if (diff === 0) return 1
  if (diff === -1) return multipliers.birdie
  if (diff === -2) return multipliers.eagle
  if (diff === -3) return multipliers.albatross
  return multipliers.condor
}

/**
 * Varianta bodové hry Dots: devět, nebo šest bodů na jamce.
 *
 * Obě se liší jen tabulkou bodů, takže jsou to volby jedné hry (viz
 * `src/games/dots.ts`).
 */
export type DotVariant = 'nine' | 'six'

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
  /**
   * Násobí se extra body podle **netto** výsledku jamky?
   *
   * Ve výchozím stavu ne: rozdané rány mění to, kdo jamku vyhrál, ne to, jak
   * se zahrála, takže násobič stojí na skutečném birdie (brutto). Se zapnutou
   * volbou se v netto kole násobí podle osobního paru - kdo dostane na jamce
   * ránu a zahraje par, má netto birdie a extra bod se mu znásobí.
   */
  multipliersWithHandicap: boolean
  /**
   * V netto kole se **Longest** potvrzuje osobním parem - parem jamky plus
   * ranami, které na ní hráč podle handicapu dostává.
   *
   * Bez toho by potvrzování bralo brutto par a slabší hráč by bonus na dlouhé
   * pětiparové jamce prakticky nikdy neuhrál, i když ji netto zahrál dobře.
   * Nearest se tímhle neřídí - ten se potvrzuje vždycky brutto parem. Na brutto
   * kolo volba nemá vliv, tam žádný osobní par neexistuje.
   */
  confirmByPersonalPar: boolean
  /** Která tabulka bodů se u hry Dots hraje. */
  dotVariant: DotVariant
  /** Výhra jamky o dvě a víc ran bere všechny body jamky. */
  sweepOnTwoStrokes: boolean
  /** Výhra o dvě rány s birdie a lepším bere dvojnásobek bodů jamky. */
  doubleSweepOnBirdie: boolean
  /** Vítěz skinu musí na následující jamce zahrát alespoň brutto par. */
  confirmSkinsByPar: boolean
  /** Kolikrát se extra bod násobí podle výsledku na jamce. */
  resultMultipliers: Record<ResultTier, number>
  /** Devátá a osmnáctá jamka se počítají dvojnásobně. */
  doubleClosingHoles: boolean
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  bonusValues: Object.fromEntries(BONUSES.map((b) => [b.id, b.defaultValue])) as Record<
    BonusId,
    number
  >,
  doubleBest: 1,
  noDoubleBonuses: false,
  confirmLongest: true,
  confirmNearest: true,
  // Násobič stojí na skutečném výsledku; osobní par je volba, ne výchozí stav.
  multipliersWithHandicap: false,
  confirmByPersonalPar: true,
  dotVariant: 'nine',
  // Obě nadstavby jsou volitelné pravidlo, ne základ hry - proto vypnuté.
  sweepOnTwoStrokes: false,
  doubleSweepOnBirdie: false,
  confirmSkinsByPar: false,
  resultMultipliers: DEFAULT_RESULT_MULTIPLIERS,
  doubleClosingHoles: true,
}

export type Currency = 'CZK' | 'EUR'

/** Nastavení bodování a sázky. */
export interface RoundSettings {
  currency: Currency
  /** Kolik peněz je jeden bod (skin, vyhraná jamka). */
  pointValue: number
  /** Volby bodování konkrétní hry (extra body, Double Best, dvojnásobky). */
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
  options: DEFAULT_GAME_OPTIONS,
}

/**
 * Jamky, které se při zapnuté volbě počítají dvojnásobně. Porovnává se s
 * číslem jamky (`holeNumber()`), ne s indexem - u zadní devítky je poslední
 * jamka osmnáctka.
 */
export const DOUBLE_HOLES = [9, 18]

/**
 * Hřiště tak, jak si ho nese odehrané kolo.
 *
 * Je to hluboká kopie údajů z katalogu, ne odkaz na něj. Klub může hřiště
 * přenormovat nebo se může opravit SI, a archivní kolo se tím nesmí
 * přepočítat - stejný důvod, proč je kopií i `settings`.
 */
export interface RoundCourse {
  /** Id v katalogu; ručně zadané hřiště ho mít nemusí. */
  id?: string
  name: string
  /**
   * Hraná část hřiště, jak se jmenuje na resortu („Forest + River", „10–18").
   * Chybí u kola na celé hřiště - tam by nic nedodala.
   */
  layoutName?: string
  teeId?: string
  teeName?: string
  /** Course Rating zvoleného odpaliště. */
  courseRating?: number
  /** Slope Rating zvoleného odpaliště. */
  slopeRating?: number
  /**
   * Součet parů odpaliště - vstupuje do vzorce pro hrací handicap. U kola
   * hraného jen na jednu devítku je to par těch jamek, na které se hrálo.
   */
  par?: number
  /** Stroke index jamek (1 = nejtěžší), délka === holeCount. */
  strokeIndex: number[]
  /**
   * Všechna odpaliště hřiště, ne jen zvolené.
   *
   * Hráči hrají z různých odpališť a každé má vlastní normu; kolo si proto
   * musí nést celou nabídku, aby šel handicap dopočítat i zpětně. Pole výš
   * (`teeId`, `courseRating`, ...) zůstávají a popisují **výchozí** odpaliště
   * kola - archivní kola se tím nemění a kód, který je čte, funguje dál.
   */
  tees?: RoundTee[]
  /**
   * Ze kterých devítek je kolo složené.
   *
   * Jen popis pro zobrazení - pary, stroke indexy i normy výš jsou už
   * poskládané za obě devítky dohromady.
   */
  composite?: RoundComposite
}

/**
 * Odpaliště tak, jak si ho nese odehrané kolo (hluboká kopie z katalogu).
 *
 * Proti `CourseTee` chybí `holeCount`: norma v kole už je přepočtená na jamky,
 * které se opravdu hrají, takže tady by jen mátl.
 */
export interface RoundTee {
  id: string
  name: string
  courseRating?: number
  slopeRating?: number
  par?: number
  /** Délka v metrech. */
  distance?: number
}

/** Popis kola složeného ze dvou devítek. */
export interface RoundComposite {
  frontName: string
  backName: string
  /** Id hřiště devítky v katalogu; ručně zadaná ho mít nemusí. */
  frontId?: string
  backId?: string
}

export interface Round {
  id: string
  gameId: string
  /** ISO timestamp založení kola. */
  createdAt: string
  /** ISO timestamp ukončení; dokud chybí, je kolo rozehrané. */
  finishedAt?: string
  /**
   * ISO timestamp poslední změny zápisu.
   *
   * Podle něj se při synchronizaci rozhoduje, která verze kola je novější.
   * Zvedá ho jen skutečná změna dat (skóre, extra body, par, ukončení), ne
   * pouhé listování jamkami - jinak by zařízení, kde se jen kouká, přebilo
   * zápis z toho, kde se hraje.
   */
  updatedAt?: string
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
  /** Hřiště, na kterém se hraje; chybí u kola založeného bez výběru hřiště. */
  course?: RoundCourse
  /** Hraje se na rány s handicapem? Bez hodnoty se počítá brutto skóre. */
  netScoring?: boolean
  /** Strany prvních ran, podle kterých se u dynamických her skládají dvojice. */
  holePairings?: HolePairings
  /**
   * Číslo první hrané jamky (1-based); chybí u kola hraného od jedničky.
   *
   * Osmnáctijamkové hřiště se běžně hraje jen na jednu devítku. Zadní devítka
   * má proto `holeCount` 9, ale jamky se číslují 10-18. `pars` i
   * `course.strokeIndex` jsou výřezem hřiště, takže indexy jamek zůstávají
   * 0-based od nuly jako u každého jiného kola a číslo pro hráče dopočítá
   * `holeNumber()`.
   */
  startHole?: number
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
  /** Hřiště, ze kterého se převezmou pary a stroke indexy. */
  course?: RoundCourse
  /** Pary jamek z hřiště; bez nich se založí kolo se samými čtyřkami. */
  pars?: number[]
  /** Handicapové indexy hráčů ve stejném pořadí jako `playerNames`. */
  handicapIndexes?: (number | undefined)[]
  /** Hrací handicapy v ranách ve stejném pořadí jako `playerNames`. */
  playingHandicaps?: (number | undefined)[]
  /**
   * Odpaliště jednotlivých hráčů ve stejném pořadí jako `playerNames`.
   *
   * Bez hodnoty dostane hráč výchozí odpaliště kola, takže volající, který
   * odpaliště nerozlišuje, se nemusí měnit.
   */
  playerTeeIds?: (string | undefined)[]
  netScoring?: boolean
  /** Číslo první hrané jamky; 10 u zadní devítky osmnáctijamkového hřiště. */
  startHole?: number
}

export function createRound({
  gameId,
  playerNames,
  holeCount,
  teamIndices,
  settings = DEFAULT_SETTINGS,
  course,
  pars,
  handicapIndexes,
  playingHandicaps,
  playerTeeIds,
  netScoring,
  startHole,
}: CreateRoundOptions): Round {
  const players: Player[] = playerNames.map((name, i) => {
    // Bez vlastní volby hraje hráč z výchozího odpaliště kola - přesně jako
    // dřív, kdy odpaliště bylo jen jedno pro všechny.
    const teeId = playerTeeIds?.[i] ?? course?.teeId
    return {
      id: `p${i + 1}`,
      name: name.trim() || t('common.player', { number: i + 1 }),
      ...(handicapIndexes?.[i] !== undefined
        ? { handicapIndex: handicapIndexes[i] }
        : {}),
      ...(playingHandicaps?.[i] !== undefined
        ? { playingHandicap: playingHandicaps[i] }
        : {}),
      ...(teeId ? { teeId } : {}),
    }
  })

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

  const now = new Date().toISOString()

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId,
    createdAt: now,
    updatedAt: now,
    players,
    teams,
    holePairings: {},
    holeCount,
    pars:
      pars?.length === holeCount ? [...pars] : Array<number>(holeCount).fill(DEFAULT_PAR),
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
        resultMultipliers: { ...settings.options.resultMultipliers },
      },
    },
    // Ze stejného důvodu je kopií i hřiště - přenormování nebo oprava SI
    // v katalogu nesmí sáhnout na kolo, které se s ním už odehrálo.
    ...(course ? { course: { ...course, strokeIndex: [...course.strokeIndex] } } : {}),
    ...(netScoring ? { netScoring: true } : {}),
    // Kolo od jedničky si číslo první jamky nenese - je to výchozí stav
    // a starší uložená kola ho taky nemají.
    ...(startHole !== undefined && startHole > 1 ? { startHole } : {}),
  }
}

/**
 * Označí kolo za právě změněné.
 *
 * Volá se u každé změny zápisu, aby synchronizace poznala novější verzi.
 * Listování jamkami sem záměrně nepatří (viz komentář u `Round.updatedAt`).
 */
export function touchRound(round: Round): Round {
  return { ...round, updatedAt: new Date().toISOString() }
}

/**
 * Čas poslední změny kola v milisekundách.
 *
 * Kola z verzí před zavedením `updatedAt` spadnou na datum ukončení, případně
 * založení - to je nejlepší odhad, jaký o nich máme.
 */
export function roundTimestamp(round: Round): number {
  const stamp = round.updatedAt ?? round.finishedAt ?? round.createdAt
  const time = Date.parse(stamp ?? '')
  return Number.isNaN(time) ? 0 : time
}

/**
 * Číslo první hrané jamky.
 *
 * Kolo bez údaje (a kolo s poškozenou hodnotou) začíná jedničkou, takže se na
 * tuhle funkci dá spolehnout i u dat z cizího zdroje.
 */
export function firstHoleNumber(round: Round): number {
  const start = round.startHole ?? 1
  return Number.isInteger(start) && start > 0 ? start : 1
}

/**
 * Číslo jamky, jak se ukazuje hráči.
 *
 * Devítka hraná ze zadní půlky osmnáctky má indexy 0-8 jako každé jiné
 * devítijamkové kolo, ale čísla jamek 10-18.
 */
export function holeNumber(round: Round, hole: number): number {
  return firstHoleNumber(round) + hole
}

/**
 * Kolikrát se jamka počítá. Devátá a osmnáctá mohou být za dvojnásobek -
 * u devítijamkového kola tak dvojnásobí poslední jamku, ať se hraje první
 * devítka (jamka 9), nebo druhá (jamka 18). Zvolený extra bod "double" násobí
 * navíc, takže dvojnásobná jamka s doublem je za čtyřnásobek.
 */
export function holeMultiplier(round: Round, hole: number): number {
  const closing =
    round.settings.options.doubleClosingHoles &&
    DOUBLE_HOLES.includes(holeNumber(round, hole))
      ? 2
      : 1
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

/**
 * Nastaví par jamky a zahodí extra body, které na novém paru nedávají smysl.
 *
 * Longest se hraje jen na pětiparových jamkách a Nearest na tříparových.
 * Když se par opraví dodatečně (typicky až po zápisu), musí zapsaný bonus
 * zmizet - jinak by se počítal na jamce, kde vůbec nejde zvolit.
 */
export function setHolePar(round: Round, hole: number, par: number): Round {
  const pars = [...round.pars]
  pars[hole] = par

  const bonuses: Record<PlayerId, BonusId[][]> = {}
  for (const player of round.players) {
    const perPlayer = round.bonuses[player.id] ?? []
    const holes = Array.from({ length: round.holeCount }, (_, i) => perPlayer[i] ?? [])
    holes[hole] = (holes[hole] ?? []).filter((id) => {
      const onlyPar = getBonus(id)?.onlyPar
      return onlyPar === undefined || onlyPar === par
    })
    bonuses[player.id] = holes
  }

  return { ...round, pars, bonuses }
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

/**
 * Krátké jméno hráče do těsných míst - hlavička jamky.
 *
 * Bere první slovo jména, protože „Alexandra Pániková 2 UP" se vedle druhého
 * zápasu do hlavičky nevejde a uříznuté „Alexandra Pánik…" je horší než
 * „Alexandra". Když se dva hráči v kole na prvním slově shodnou, přibere
 * ještě první písmeno toho dalšího - jinak by se stavy zápasů popletly.
 */
export function shortPlayerName(round: Round, playerId: PlayerId): string {
  const full = playerName(round, playerId)
  const [first, ...rest] = full.trim().split(/\s+/)
  if (!first || rest.length === 0) return full

  const shared = round.players.some(
    (other) => other.id !== playerId && other.name.trim().split(/\s+/)[0] === first,
  )
  if (!shared) return first

  const initial = rest[0]?.[0]
  return initial ? `${first} ${initial}.` : full
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
  return strokeTotalBetween(round, playerId, 0, round.holeCount)
}

/**
 * Součet ran na části kola; `from` se počítá, `to` už ne. Meze jsou indexy
 * jamek od nuly, ne čísla jamek pro hráče - výřez hřiště čísluje jinak
 * (viz `holeNumber()`), ale první devítka kola jsou vždycky indexy 0 až 8.
 *
 * Nezapsaná jamka se počítá jako nula, stejně jako v celkovém součtu -
 * mezisoučet rozehraného kola tak roste s tím, co je zapsané.
 */
export function strokeTotalBetween(
  round: Round,
  playerId: PlayerId,
  from: number,
  to: number,
): number {
  return (round.scores[playerId] ?? [])
    .slice(from, to)
    .reduce<number>((sum, s) => sum + (s ?? 0), 0)
}

/**
 * Součet parů na části kola; meze jako u `strokeTotalBetween()`.
 *
 * Bere se přes `parAt()`, ne přímo z `round.pars` - u kola bez hřiště je pole
 * parů prázdné a jamka pak má výchozí par.
 */
export function parTotalBetween(round: Round, from: number, to: number): number {
  let total = 0
  for (let hole = from; hole < to; hole += 1) total += parAt(round, hole)
  return total
}

/**
 * Jamka, po které se na scorekartě ukáže mezisoučet, nebo `undefined`, když
 * se nikde neukazuje. Osmnáctka se dělí na devítky přesně jako turnajová
 * scorekarta (OUT/IN); kratší kolo se nedělí - mezisoučet po devíti jamkách
 * z dvanáctky nic neříká.
 */
export function turnHole(round: Round): number | undefined {
  return round.holeCount === 18 ? 9 : undefined
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
  /** Čísla jamek, kde se hrálo, ale někomu chybí zápis - vzdané. */
  conceded: number[]
  /** Čísla jamek, na které se vůbec nedošlo. */
  unplayed: number[]
  complete: boolean
}

/** Přehled chybějících zápisů pro upozornění při ukončení kola. */
export function roundCompleteness(round: Round): RoundCompleteness {
  const conceded: number[] = []
  const unplayed: number[] = []

  for (let hole = 0; hole < round.holeCount; hole++) {
    if (!isHoleStarted(round, hole)) unplayed.push(holeNumber(round, hole))
    else if (!isHoleComplete(round, hole)) conceded.push(holeNumber(round, hole))
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
/** Dvojice, ve které hráč je; u her bez dvojic vrací undefined. */
export function teamOf(round: Round, playerId: PlayerId): Team | undefined {
  return round.teams.find((team) => team.playerIds.includes(playerId))
}

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

/**
 * Kategorie do legendy. Popisky jsou v překladech pod `score.<kategorie>`;
 * tenhle seznam drží jejich pořadí.
 */
export const SCORE_CATEGORIES: ScoreCategory[] = [
  'eagle',
  'birdie',
  'par',
  'bogey',
  'double',
  'triple',
]

/** Formátuje rozdíl vůči paru: -2 -> "-2", 0 -> "E", 3 -> "+3". */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

/** Datum kola v českém formátu pro archiv. */
export function formatRoundDate(round: Round): string {
  return new Date(round.createdAt).toLocaleDateString(localeTag(), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}
