import type { Course, CourseLoop } from './types'
import { coursePar, findTee } from './types'
import { normalizeStrokeIndex } from '../handicap'

/**
 * Výřez hřiště, na který se hraje.
 *
 * Ne každé kolo se hraje na celé hřiště a ne každé hřiště je osmnáctka.
 * Osmnáctka se běžně hraje jen na jednu devítku, resort s 27 jamkami skládá
 * osmnáctku ze dvou svých devítek (a záleží na pořadí) a existují hřiště o
 * šesti nebo dvanácti jamkách. Tenhle modul je jediné místo, kde se z hřiště
 * a zvolených smyček spočítá, co kolo dostane: pary, stroke index, číslo
 * první jamky a norma odpaliště.
 *
 * Obrazovky si nic z toho nepočítají samy - jinak by výběr jamek a výpočet
 * handicapu mohly tvrdit každý něco jiného.
 */

/**
 * Nejvíc jamek, ze kterých jde kolo poskládat.
 *
 * Hry počítají s osmnáctijamkovým kolem (dvojnásobná 9. a 18. jamka), takže
 * delší kolo než osmnáctka se nenabízí, i když má resort smyček víc.
 */
export const MAX_LAYOUT_HOLES = 18

/** Smyčka i s tím, kde v poli jamek začíná. */
export interface PlayableLoop extends CourseLoop {
  /** Index první jamky smyčky v `course.pars`. */
  start: number
  /**
   * Půlka osmnáctky, kterou hřiště samo nedeklaruje.
   *
   * Nemá vlastní jméno - popisek dodá obrazovka z překladů, protože „přední
   * devítka" je uživatelský text, ne údaj o hřišti.
   */
  synthetic: boolean
}

/** Ze kterých částí jde na hřišti poskládat kolo. */
export function playableLoops(course: Course): PlayableLoop[] {
  if (course.loops && course.loops.length > 0) {
    let start = 0
    return course.loops.map((loop) => {
      const entry: PlayableLoop = { ...loop, start, synthetic: false }
      start += loop.holeCount
      return entry
    })
  }

  // Osmnáctka bez pojmenovaných smyček má pořád dvě půlky a na tom, kterou se
  // hraje, záleží: každá má vlastní pary, SI i čísla jamek.
  if (course.holeCount === 18) {
    return [
      { id: 'front', name: '', holeCount: 9, startHole: 1, start: 0, synthetic: true },
      { id: 'back', name: '', holeCount: 9, startHole: 10, start: 9, synthetic: true },
    ]
  }

  return []
}

/** Součet jamek zvolených smyček. */
export function selectionHoleCount(course: Course, loopIds: string[]): number {
  const loops = playableLoops(course)
  return loopIds.reduce(
    (sum, id) => sum + (loops.find((loop) => loop.id === id)?.holeCount ?? 0),
    0,
  )
}

/**
 * Musí se kolo z hřiště teprve poskládat?
 *
 * Hřiště do osmnácti jamek se dá hrát celé, takže pojmenované devítky jsou
 * jen doplňková volba. Resort s víc než osmnácti jamkami žádnou „celou"
 * podobu nemá - kolo z něj vzniká až výběrem devítek.
 */
export function requiresLoopSelection(course: Course): boolean {
  return (
    course.holeCount > MAX_LAYOUT_HOLES &&
    course.loops !== undefined &&
    course.loops.length > 0
  )
}

/**
 * Výchozí volba smyček.
 *
 * Hřiště, které jde odehrát celé, se celé hraje (prázdná volba). Resort se
 * poskládá od první devítky do plné osmnáctky - to je zdaleka nejčastější
 * případ.
 */
export function defaultLoopSelection(course: Course): string[] {
  if (!requiresLoopSelection(course)) return []

  const loops = playableLoops(course)
  const selection: string[] = []
  let holes = 0
  for (const loop of loops) {
    if (holes > 0 && holes + loop.holeCount > MAX_LAYOUT_HOLES) break
    selection.push(loop.id)
    holes += loop.holeCount
  }
  return selection
}

export interface CourseLayout {
  /** Smyčky v pořadí hry; prázdné znamená celé hřiště tak, jak je uložené. */
  loopIds: string[]
  holeCount: number
  pars: number[]
  strokeIndex: number[]
  /** Číslo první hrané jamky. */
  startHole: number
  /** Součet parů hraných jamek. */
  par: number
}

/**
 * Poskládá stroke index z několika smyček.
 *
 * Devítka má SI 1-9 sama pro sebe, ale ve složené osmnáctce nesmí mít obě
 * devítky stejná čísla - hráč s devíti ranami by je dostal všechny na první
 * devítce. Proto se v každé smyčce jamky seřadí podle obtížnosti a čísla se
 * mezi smyčky prostřídají: první smyčka lichá, druhá sudá (u tří smyček po
 * třech). Přesně tak to dělají klubové scorekarty složených osmnáctek.
 */
function combineStrokeIndex(slices: number[][]): number[] {
  const first = slices[0]
  if (slices.length === 1 && first) return [...first]

  const count = slices.length
  return slices.flatMap((slice, position) =>
    normalizeStrokeIndex(slice, slice.length).map(
      (rank) => rank * count - (count - 1 - position),
    ),
  )
}

/**
 * Hřiště zúžené na hrané jamky.
 *
 * Neznámé id smyčky se přeskočí, takže uložená volba přežije i to, že se
 * hřiště v katalogu mezitím přestavělo. Když nezbude nic, hraje se celé
 * hřiště.
 */
export function resolveLayout(course: Course, loopIds: string[] = []): CourseLayout {
  const loops = playableLoops(course)
  const selected = loopIds.flatMap((id) => {
    const loop = loops.find((candidate) => candidate.id === id)
    return loop ? [loop] : []
  })

  if (selected.length === 0) {
    return {
      loopIds: [],
      holeCount: course.holeCount,
      pars: [...course.pars],
      strokeIndex: [...course.strokeIndex],
      startHole: 1,
      par: coursePar(course),
    }
  }

  const slice = (loop: PlayableLoop, values: number[]) =>
    values.slice(loop.start, loop.start + loop.holeCount)

  const pars = selected.flatMap((loop) => slice(loop, course.pars))
  const strokeIndex = combineStrokeIndex(
    selected.map((loop) => slice(loop, course.strokeIndex)),
  )
  const single = selected.length === 1 ? selected[0] : undefined

  return {
    loopIds: selected.map((loop) => loop.id),
    holeCount: pars.length,
    pars,
    strokeIndex,
    // Jen samostatně hraná smyčka si nese čísla jamek z hřiště (zadní devítka
    // osmnáctky je 10-18); složené kolo se čísluje od jedničky.
    startHole: single?.startHole ?? 1,
    par: pars.reduce((sum, par) => sum + par, 0),
  }
}

/** Norma odpaliště pro hraný výřez. */
export interface LayoutTee {
  id: string
  name: string
  courseRating?: number
  slopeRating?: number
  /** Par, ke kterému se norma vztahuje. */
  par: number
  /**
   * Podíl normy, který se hraje. Devítka hraná z osmnáctijamkové normy je
   * 0.5; norma sedící přesně na hrané jamky je 1.
   */
  share: number
  distance?: number
}

/**
 * Norma zvoleného odpaliště pro hraný výřez.
 *
 * Když mají hrané smyčky vlastní (devítkovou) normu, složí se z nich norma
 * kombinace: CR se sčítá, SR se průměruje podle počtu jamek. Přesně tak
 * vznikají osmnáctijamkové normy kombinací na resortech s víc devítkami - na
 * Kácově vychází Forest & River 73,9 / 139 z devítek 38,0 / 149 a 35,9 / 129.
 * Průměrování SR může proti tabulce klubu minout o jednotku, protože se
 * zaokrouhluje z už zaokrouhlených čísel; na hracím handicapu to dělá desetinu
 * rány.
 *
 * Bez devítkových norem se použije norma hřiště přepočtená podílem hraných
 * jamek - a `tee.holeCount` říká, kolika jamek se norma vlastně týká.
 */
export function layoutTee(
  course: Course,
  layout: CourseLayout,
  teeId?: string,
): LayoutTee | undefined {
  const tee = findTee(course, teeId)
  if (!tee) return undefined

  const loops = playableLoops(course)
  const selected = layout.loopIds.flatMap((id) => {
    const loop = loops.find((candidate) => candidate.id === id)
    return loop ? [loop] : []
  })
  const rated = selected.flatMap((loop) => {
    const own = loop.tees?.find((candidate) => candidate.id === tee.id)
    return own?.courseRating !== undefined && own.slopeRating !== undefined
      ? [{ loop, tee: own }]
      : []
  })

  if (selected.length > 0 && rated.length === selected.length) {
    const holes = rated.reduce((sum, { loop }) => sum + loop.holeCount, 0)
    const distances = rated.flatMap(({ tee: own }) =>
      own.distance === undefined ? [] : [own.distance],
    )

    return {
      id: tee.id,
      name: tee.name,
      courseRating: round1(
        rated.reduce((sum, { tee: own }) => sum + (own.courseRating ?? 0), 0),
      ),
      slopeRating: Math.round(
        rated.reduce(
          (sum, { loop, tee: own }) => sum + (own.slopeRating ?? 0) * loop.holeCount,
          0,
        ) / holes,
      ),
      par: rated.reduce(
        (sum, { loop, tee: own }) =>
          sum + (own.par ?? sumPars(course, loop.start, loop.holeCount)),
        0,
      ),
      share: 1,
      ...(distances.length === rated.length
        ? { distance: distances.reduce((sum, value) => sum + value, 0) }
        : {}),
    }
  }

  const ratedHoles = tee.holeCount ?? course.holeCount

  return {
    id: tee.id,
    name: tee.name,
    ...(tee.courseRating !== undefined ? { courseRating: tee.courseRating } : {}),
    ...(tee.slopeRating !== undefined ? { slopeRating: tee.slopeRating } : {}),
    par: tee.par ?? coursePar(course),
    share: ratedHoles > 0 ? layout.holeCount / ratedHoles : 1,
    ...(tee.distance !== undefined ? { distance: tee.distance } : {}),
  }
}

/** Součet parů úseku jamek - náhrada za chybějící par odpaliště smyčky. */
function sumPars(course: Course, start: number, holeCount: number): number {
  return course.pars.slice(start, start + holeCount).reduce((sum, par) => sum + par, 0)
}

/** CR se uvádí na desetinu; součet dvou devítek by jinak nesl chybu z plovoucí. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}
