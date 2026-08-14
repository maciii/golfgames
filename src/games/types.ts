import type { BonusId, PlayerId, Round, Team } from '../types'

/**
 * Společné rozhraní všech her.
 *
 * Aplikace o konkrétních pravidlech nic neví - jen zavolá computeStandings()
 * a vykreslí, co dostane. Přidání hry je proto nový soubor v této složce plus
 * zápis do registru v index.ts.
 */

export interface StandingRow {
  /** Stabilní klíč pro React - id hráče nebo týmu. */
  id: string
  name: string
  /** Číselná hodnota, podle které se řadí pořadí. */
  value: number
  /** Hodnota tak, jak se ukáže uživateli, např. "12 b." nebo "3 UP". */
  valueLabel: string
  /** Rozpad výsledku pod jménem, např. "BEST 3 · Součet 2 · Bonus 4". */
  detail?: string
  /** Doplňkový údaj vpravo, např. počet ran. */
  secondary?: string
  /** Kolik jamek už do výsledku vstoupilo. */
  holesPlayed: number
  /** 1-based, při shodě sdílené (1, 1, 3, ...). */
  position: number
}

/** Jedna výsledková tabulka; hra jich může vracet víc. */
export interface StandingsSection {
  id: string
  title: string
  description?: string
  rows: StandingRow[]
}

/** Průběžný výsledek zobrazený u právě zapisované jamky. */
export interface HoleSummary {
  /** Id týmu nebo hráče, ke kterému shrnutí patří. */
  id: string
  /** Vede tahle strana na jamce? Zvýrazní se při zápisu. */
  winner?: boolean
  /** highlight zvýrazní hodnotu, která na jamce vyhrála. */
  entries: { label: string; value: string; highlight?: boolean }[]
}

/** Jedna volba při přípravě aktuální jamky před zápisem skóre. */
export interface HoleSetupOption {
  id: string
  label: string
}

/** Hráč a jeho aktuálně zvolená volba přípravy jamky. */
export interface HoleSetupEntry {
  playerId: PlayerId
  name: string
  selectedOptionId?: string
}

/** Přehled skupiny vzniklé z voleb hráčů. */
export interface HoleSetupGroup {
  optionId: string
  label: string
  playerNames: string[]
}

/** Jedna předdefinovaná kombinace skupin pro rychlou volbu setupu jamky. */
export interface HoleSetupChoice {
  id: string
  label: string
  pairing?: { left: string; right: string }
  selected?: boolean
}

/** Výběr buď hotové kombinace, nebo jedné položky v obecném setupu. */
export type HoleSetupSelection =
  | { kind: 'choice'; choiceId: string }
  | { kind: 'entry'; playerId: PlayerId; optionId: string }

/** Obecný model přípravy jamky; konkrétní pravidla zůstávají ve hře. */
export interface HoleSetup {
  title: string
  message: string
  options: HoleSetupOption[]
  entries: HoleSetupEntry[]
  groups: HoleSetupGroup[]
  choices?: HoleSetupChoice[]
  complete: boolean
}

/**
 * Volby bodování, které mají v konkrétní hře skutečný význam.
 *
 * `GameOptions` zůstává společný a serializovatelný kvůli archivům, ale UI i
 * pravidla hry se řídí tímhle popisem, aby se nenabízely mrtvé volby.
 */
export interface GameScoringOptions {
  /** Extra body, které hra umí vyhodnotit. */
  bonusIds: BonusId[]
  /** Hra používá násobiče podle výsledku hráče. */
  resultMultipliers: boolean
  /** Hra má volbu Double Best. */
  doubleBest: boolean
  /** Hra umožňuje ponechat extra body mimo násobení jamky. */
  noDoubleBonuses: boolean
  /** Hra potvrzuje Longest podle výsledku hráče. */
  confirmLongest: boolean
  /** Hra potvrzuje Nearest podle výsledku hráče. */
  confirmNearest: boolean
  /** Skins může vyžadovat potvrzení výhry parem na další jamce. */
  confirmSkinsByPar?: boolean
  /** Hra se hraje ve variantách s různou tabulkou bodů (Dots). */
  dotVariant?: boolean
  /** Hra zná výhru o dvě rány, která bere všechny body jamky. */
  sweepOnTwoStrokes?: boolean
  /** Hra zná zdvojnásobení takové výhry za birdie a lepší. */
  doubleSweepOnBirdie?: boolean
  /** Komu připadne běžný bonus: celé dvojici, nebo jednotlivci. */
  bonusScope: 'team' | 'player'
  /**
   * Jsou extra body **vedlejší sázka** mimo bodování hry?
   *
   * Hry, které samy rozdávají body (Best + Součet, Levá-Pravá, Skins), si je
   * počítají do svých bodů. Jamkovka, Stableford ani Dots to nemohou - přičtení
   * bonusu k vyhraným jamkám by rozbilo stav zápasu. U nich stojí extra body
   * zvlášť (`sideBets.ts`): vlastní tabulka, body do vyrovnání kola a hodnoty
   * **ve výchozím stavu nulové**, takže se o ně hraje teprve po zapnutí.
   */
  bonusesAsSideBet?: boolean
}

/**
 * Přesný rozpis bodů jedné strany na jedné jamce - „proč mám tři body".
 *
 * Hra ho dodá, když se její body skládají z víc zdrojů (BEST, součet, birdie,
 * extra body). Obrazovka ho jen vypíše, takže se nemusí ptát na pravidla.
 */
export interface HoleBreakdown {
  /** Id dvojice nebo hráče, ke kterému rozpis patří. */
  id: string
  name: string
  lines: {
    /**
     * Druh zdroje. Shrnutí jamky vypisuje vedle BESTu a součtu právě ty
     * ostatní, aby bylo vidět, o jaké body navíc jde.
     */
    kind: 'best' | 'aggregate' | 'doubleBest' | 'result' | 'extra'
    /** Z čeho bod je: „BEST", „Birdie", „Bunker (sandie)". */
    label: string
    /** Čím je to podložené: „netto 3 proti 4", „Alexandra, netto 3". */
    note?: string
    /** Kolik to vyneslo; nula znamená „nezískáno". */
    points: number
  }[]
  total: number
}

/** Průběžné skóre, které hra zobrazí vedle hlavičky aktuální jamky. */
export interface HeaderSummary {
  entries: {
    label: string
    value: string
    highlight?: boolean
    tone?: 'positive' | 'negative' | 'neutral'
    /**
     * Krátká poznámka jen k tomuhle stavu (dormie, konec zápasu). Patří sem,
     * když v kole běží víc samostatných zápasů - společná poznámka pod nimi
     * by netvrdila, kterého z nich se týká.
     */
    note?: string
  }[]
  note?: string
  tone?: 'normal' | 'dormie' | 'decided' | 'outOfPlay'
}

/** Dekorace hráčova výsledku, kterou může hra přidat do scorekarty. */
export interface ScorecardPlayerCell {
  skin?: { ariaLabel: string }
  suffix?: { text: string; ariaLabel: string }
  /** Označení hráče v dynamické dvojici na konkrétní jamce. */
  pairing?: { ariaLabel: string }
}

/** Souhrn hry zobrazený za celkovým počtem ran hráče. */
export interface ScorecardPlayerTotal {
  text: string
  ariaLabel: string
}

/**
 * Vlastní sloupec ve scorekartě - typicky body, které hra rozdala na jamce.
 * Scorekarta sama o pravidlech nic neví, jen sloupce vykreslí.
 */
export interface ScorecardColumn {
  id: string
  label: string
  /** Přístupný popis pro sloupce, jejichž viditelný label je jen symbol. */
  ariaLabel?: string
  /**
   * Id hráče, za jehož sloupcem se tenhle zobrazí. Díky tomu stojí body
   * dvojice hned vedle ran obou partnerů. Bez hodnoty se řadí na konec.
   */
  afterPlayerId?: string
  /** Obsah buňky v řádku jamky; prázdný řetězec nechá buňku prázdnou. */
  cell(round: Round, hole: number): string
  /** Obsah buňky v součtovém řádku. */
  total(round: Round): string
}

export interface GameDefinition {
  /**
   * Id je zároveň základ překladových klíčů: `games.<id>.name`,
   * `games.<id>.tagline` a `games.<id>.rules` (viz src/i18n).
   */
  id: string
  /** Povolené počty hráčů. */
  playerCounts: number[]
  /** Hraje se při daném počtu hráčů ve dvojicích? */
  usesTeams(playerCount: number): boolean
  /** Volby bodování relevantní pro tuhle hru. */
  scoringOptions: GameScoringOptions
  /**
   * Dává u téhle hry smysl volba "9. a 18. jamka za dvojnásobek"? Match play
   * se počítá na jamky, kde by dvojnásobná jamka rozbila stav zápasu.
   */
  supportsDoubleHoles: boolean
  /**
   * Hraje dvojice **jedním míčem** (foursome)? Zápis skóre je pak jeden na
   * dvojici a ukládá se oběma partnerům; scorekarta má jeden sloupec.
   */
  sharedBall?: boolean
  /**
   * Co `Round.teams` v téhle hře znamená: partnery jedné strany (výchozí),
   * nebo soupeře jednoho zápasu. Rozhoduje o textech při zakládání kola
   * i o tom, jak se čtou dvojice ve výsledcích.
   */
  pairingKind?: 'partners' | 'opponents'
  /** Vlastní pojmenování dvojice, když „A + B" nesedí (dva zápasy: „A vs B"). */
  teamLabel?(round: Round, team: Team): string
  /**
   * Nezávislá peněžní vyrovnání v jednom kole - vrací id řádků výsledkové
   * tabulky, které se vyrovnávají spolu. Bez hodnoty se vyrovnává celé kolo
   * jako jedna hra. Dva zápasy ve flightu si takhle nemíchají peníze.
   */
  settlementGroups?(round: Round): string[][]
  /**
   * Strany peněžního vyrovnání, když se nekryjí s hlavní tabulkou.
   *
   * Bez hodnoty se vyrovnává první tabulka podle `row.value`. Hry s vedlejší
   * sázkou (`bonusesAsSideBet`) tady k jednotkám hry přidají extra body -
   * do tabulky se přičíst nemohou, protože ta drží pořadí podle pravidel hry.
   */
  settlementParties?(round: Round): { id: string; name: string; units: number }[]
  computeStandings(round: Round): StandingsSection[]
  holeSetup?(round: Round, hole: number): HoleSetup
  setHoleSetup?(round: Round, hole: number, selection: HoleSetupSelection): Round
  holeSummary?(round: Round, hole: number): HoleSummary[]
  /**
   * Rozpis bodů jamky do posledního bodu. Bez něj se u shrnutí jamky
   * nenabízí odkaz na podrobnosti - u hry, kde jamka jen padne nebo nepadne,
   * není co rozepisovat.
   */
  holeBreakdown?(round: Round, hole: number): HoleBreakdown[]
  headerSummary?(round: Round, hole: number): HeaderSummary
  scorecardPlayerCell?(round: Round, playerId: string, hole: number): ScorecardPlayerCell
  scorecardPlayerTotal?(round: Round, playerId: string): ScorecardPlayerTotal
  /** Nepovinné sloupce navíc ve scorekartě (body dvojic, skiny apod.). */
  scorecardColumns?(round: Round): ScorecardColumn[]
}

/** Směr řazení: u ran vyhrává nejnižší, u bodů nejvyšší hodnota. */
export type RankDirection = 'lowest' | 'highest'

/**
 * Seřadí řádky a doplní pozice; shodná hodnota sdílí pozici (1, 1, 3).
 * Řádky bez jediné započítané jamky jdou na konec, aby se nikdo neocitl
 * na prvním místě jen proto, že ještě nic nezapsal.
 */
export function rankRows(
  rows: Omit<StandingRow, 'position'>[],
  direction: RankDirection,
): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if ((a.holesPlayed === 0) !== (b.holesPlayed === 0)) {
      return a.holesPlayed === 0 ? 1 : -1
    }
    return direction === 'lowest' ? a.value - b.value : b.value - a.value
  })

  let lastValue: number | null = null
  let lastPosition = 0
  return sorted.map((row, index) => {
    const position = row.value === lastValue ? lastPosition : index + 1
    lastValue = row.value
    lastPosition = position
    return { ...row, position }
  })
}
