/**
 * Model hřiště.
 *
 * Hřiště je referenční údaj: pary jamek, jejich stroke index (SI) a parametry
 * odpališť. Aplikace ho drží ve dvou podobách - katalogové `Course`, které se
 * dá naimportovat nebo zadat ručně, a `RoundCourse` v `src/types.ts`, což je
 * hluboká kopie uložená ke konkrétnímu kolu.
 *
 * Kopie u kola je záměr, ne duplicita: klub může hřiště přenormovat (změnit CR
 * a SR) a odehrané kolo se tím nesmí přepočítat. Platí tu stejný důvod jako
 * u `round.settings` - viz invariant #2 v docs/architecture.md.
 */

/** Odkud údaje pocházejí. Rozhoduje o tom, co smí přepsat import. */
export type CourseSource = 'opengolfapi' | 'osm' | 'manual'

/** Jestli je uložené hřiště kopií katalogu, nebo soukromý údaj uživatele. */
export type CourseOrigin = 'catalog' | 'private'

/**
 * Odpaliště. CR a SR jsou potřeba jen pro dopočet hracího handicapu; bez nich
 * hřiště funguje dál, jen se handicap musí zadat rovnou v ranách.
 */
export interface CourseTee {
  /** Stabilní id v rámci hřiště, např. 'yellow'. */
  id: string
  name: string
  /** Course Rating - obtížnost pro hráče s handicapem 0. */
  courseRating?: number
  /** Slope Rating, 55-155; 113 je neutrální hřiště. */
  slopeRating?: number
  /** Součet parů z tohohle odpaliště. */
  par?: number
  /** Délka v metrech. */
  distance?: number
  /**
   * Kolika jamek se norma týká; bez hodnoty celého hřiště.
   *
   * Devítky mívají v klubové scorekartě podepsanou osmnáctijamkovou normu
   * a resort s 27 jamkami normuje osmnáctku ze dvou zvolených devítek. Bez
   * tohohle údaje by se `CR - par` vztáhlo na jiný počet jamek, než se hraje,
   * a hrací handicap by vyšel skoro dvojnásobný.
   */
  holeCount?: number
}

/**
 * Devítka (obecně smyčka) uvnitř hřiště.
 *
 * Resort s 27 jamkami nemá tři hřiště, ale jedno hřiště o třech smyčkách,
 * ze kterých se osmnáctka teprve skládá - a záleží na pořadí, protože každá
 * kombinace má vlastní normu (Panorama Kácov: Forest & River je jiné hřiště
 * než River & Forest). Smyčky jdou po sobě tak, jak jsou uložené jamky:
 * první smyčka začíná jamkou 1, druhá tam, kde první skončila.
 */
export interface CourseLoop {
  /** Stabilní id v rámci hřiště, např. 'forest'. */
  id: string
  name: string
  /** Kolik jamek smyčka má. */
  holeCount: number
  /**
   * Číslo, kterým se první jamka smyčky ukazuje hráči, když se hraje sama.
   *
   * Na resortu s víc devítkami má každá smyčka jamky 1-9, proto je výchozí
   * hodnota 1. Půlka jedné osmnáctky je jiný případ: zadní devítka má jamky
   * 10-18, a tam se hodnota vyplní.
   */
  startHole?: number
  /**
   * Normy odpališť pro tuhle smyčku samotnou (devítkové CR a SR).
   *
   * Odpaliště se páruje podle `id` s odpalištěm hřiště. Když smyčky normu
   * mají, spočítá se norma kombinace z nich; jinak se použije norma hřiště
   * přepočtená podílem hraných jamek.
   */
  tees?: CourseTee[]
}

export interface Course {
  /** 'oga:1234' | 'osm:way/567' | 'local:...' - stabilní napořád. */
  id: string
  name: string
  club?: string
  /** ISO 3166-1 alpha-2, kvůli řazení a filtrování v katalogu. */
  country?: string
  lat?: number
  lon?: number
  holeCount: number
  /** Par každé jamky, délka === holeCount. */
  pars: number[]
  /** Stroke index jamek (1 = nejtěžší), délka === holeCount. */
  strokeIndex: number[]
  tees: CourseTee[]
  /**
   * Smyčky hřiště, ze kterých se kolo skládá; bez nich se hraje celé hřiště
   * (u osmnáctky případně jedna z jejích půlek).
   */
  loops?: CourseLoop[]
  source: CourseSource
  /** Prezentační původ uložené kopie; starší data ho nemají a doplní se. */
  origin?: CourseOrigin
  /** ODbL vyžaduje uvést původ dat. */
  attribution?: string
  /** ISO timestamp poslední změny - kvůli synchronizaci. */
  updatedAt?: string
  /** Čas poslední verze, kterou vydal centrální katalog. */
  catalogUpdatedAt?: string
}

/** Nejvyšší rozumný par jamky; vyšší hodnota je skoro jistě překlep. */
const MAX_PAR = 6

/**
 * Hrubá kontrola tvaru hřiště.
 *
 * Stejný přístup jako `isValidRound()` v `src/storage.ts`: poškozený nebo cizí
 * záznam se zahodí, místo aby se s ním počítalo. Platí pro data z katalogu
 * i pro obnovu ze zálohy.
 */
export function isValidCourse(course: unknown): course is Course {
  if (!course || typeof course !== 'object') return false
  const c = course as Partial<Course>

  if (typeof c.id !== 'string' || !c.id) return false
  if (typeof c.name !== 'string' || !c.name) return false
  if (typeof c.holeCount !== 'number' || c.holeCount <= 0) return false
  if (!Array.isArray(c.pars) || c.pars.length !== c.holeCount) return false
  if (!c.pars.every((par) => typeof par === 'number' && par >= 3 && par <= MAX_PAR)) {
    return false
  }

  // SI smí chybět celý (u ručně zadaného hřiště se doplňuje později), ale když
  // je, musí sedět délkou - jinak by netto výpočet sáhl mimo pole.
  if (c.strokeIndex !== undefined) {
    if (!Array.isArray(c.strokeIndex)) return false
    if (c.strokeIndex.length !== 0 && c.strokeIndex.length !== c.holeCount) return false
  }

  if (c.loops !== undefined && !Array.isArray(c.loops)) return false

  return c.tees === undefined || Array.isArray(c.tees)
}

/**
 * Smyčky hřiště, ale jen když dávají dohromady celé hřiště.
 *
 * Neúplný nebo přesahující seznam by ukrojil jamky mimo pole parů, takže se
 * zahodí celý a hřiště se hraje jako jeden celek - stejný přístup jako u SI,
 * který nesedí délkou. Vrací `undefined`, když hřiště smyčky nemá.
 */
function validLoops(course: Course): CourseLoop[] | undefined {
  if (!Array.isArray(course.loops) || course.loops.length === 0) return undefined

  const ids = new Set<string>()
  let holes = 0
  for (const loop of course.loops) {
    if (!loop || typeof loop.id !== 'string' || !loop.id) return undefined
    if (ids.has(loop.id)) return undefined
    ids.add(loop.id)
    if (!Number.isInteger(loop.holeCount) || loop.holeCount <= 0) return undefined
    holes += loop.holeCount
  }
  if (holes !== course.holeCount) return undefined

  return course.loops.map((loop) => ({
    ...loop,
    name: typeof loop.name === 'string' && loop.name ? loop.name : loop.id,
    ...(loop.tees ? { tees: loop.tees.map((tee) => ({ ...tee })) } : {}),
  }))
}

/** Doplní pole, která v uloženém nebo naimportovaném hřišti chybí. */
export function normalizeCourse(course: Course): Course {
  const source = course.source ?? 'manual'
  const loops = validLoops(course)
  const origin =
    course.origin === 'catalog' || course.origin === 'private'
      ? course.origin
      : source === 'manual' && course.id.startsWith('local:')
        ? 'private'
        : 'catalog'

  return {
    ...course,
    pars: [...course.pars],
    strokeIndex:
      Array.isArray(course.strokeIndex) && course.strokeIndex.length === course.holeCount
        ? [...course.strokeIndex]
        : defaultStrokeIndex(course.holeCount),
    tees: Array.isArray(course.tees) ? course.tees.map((tee) => ({ ...tee })) : [],
    ...(loops ? { loops } : { loops: undefined }),
    source,
    origin,
  }
}

/** Rozpozná katalogovou kopii i ve starších uložených hřištích. */
export function isCatalogCourse(course: Course): boolean {
  return normalizeCourse(course).origin === 'catalog'
}

/** Vrátí true, když centrální scorekarta předběhla lokální katalogovou kopii. */
export function hasNewerCatalogVersion(local: Course, remote: Course): boolean {
  const remoteStamp = Date.parse(remote.updatedAt ?? '')
  const localStamp = Date.parse(local.catalogUpdatedAt ?? '')
  return (
    !Number.isNaN(remoteStamp) && (Number.isNaN(localStamp) || remoteStamp > localStamp)
  )
}

/** Vytvoří soukromou kopii katalogového hřiště pro lokální úpravy. */
export function copyAsPrivateCourse(course: Course): Course {
  return {
    ...course,
    id: `local:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'manual',
    origin: 'private',
    catalogUpdatedAt: undefined,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Náhradní SI, když ho hřiště nemá: jamky po pořadí.
 *
 * Není to pravda o hřišti, ale je to lepší než spadnout - hráč SI doplní
 * v úpravě hřiště a do té doby se rány rozdělí aspoň rovnoměrně.
 */
export function defaultStrokeIndex(holeCount: number): number[] {
  return Array.from({ length: holeCount }, (_, i) => i + 1)
}

/** Součet parů hřiště - výchozí hodnota paru odpaliště pro výpočet handicapu. */
export function coursePar(course: Course): number {
  return course.pars.reduce((sum, par) => sum + par, 0)
}

/** Odpaliště podle id; bez shody první v pořadí, ať se něco vybere vždy. */
export function findTee(course: Course, teeId?: string): CourseTee | undefined {
  if (teeId) {
    const match = course.tees.find((tee) => tee.id === teeId)
    if (match) return match
  }
  return course.tees[0]
}

/**
 * Nové prázdné hřiště pro ruční zadání.
 *
 * Pary jsou čtyřky (stejná výchozí hodnota jako u kola bez hřiště) a SI po
 * pořadí, takže hřiště je použitelné hned a upřesňuje se postupně.
 */
export function createCourse(name: string, holeCount: number): Course {
  return {
    id: `local:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    holeCount,
    pars: Array<number>(holeCount).fill(4),
    strokeIndex: defaultStrokeIndex(holeCount),
    tees: [],
    source: 'manual',
    origin: 'private',
    updatedAt: new Date().toISOString(),
  }
}
