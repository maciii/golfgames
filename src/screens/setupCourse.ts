import type { Course, CourseTee } from '../courses/types'
import { findTee } from '../courses/types'
import type { CourseLayout, LayoutTee, PlayableLoop } from '../courses/layout'
import {
  MAX_LAYOUT_HOLES,
  defaultLoopSelection,
  layoutTee,
  playableLoops,
  requiresLoopSelection,
  resolveLayout,
  selectionHoleCount,
} from '../courses/layout'
import { composeNines } from '../courses/composite'
import type { MessageKey } from '../i18n'

/**
 * Hřiště a jeho výřez tak, jak se opravdu hraje - jedno místo, které tohle
 * počítá pro všechny kroky zakládání kola (odpaliště, hráči, start kola).
 *
 * Bývalo to součástí `SetupScreen`; rozdělením zakládání kola na samostatné
 * obrazovky (`docs/decisions.md`, rozhodnutí o krokovém zakládání) by se ta
 * samá logika musela kopírovat do každého kroku, který se hřiště byť jen
 * dotkne.
 */

/** Půlky osmnáctky se v nabídce jmenují podle překladů, ne podle hřiště. */
const SYNTHETIC_LOOP_LABEL: Record<string, MessageKey> = {
  front: 'setup.holesFront',
  back: 'setup.holesBack',
}

export interface CourseSetup {
  baseCourse: Course | undefined
  /** Devítka se dá zahrát dvakrát dokola nebo spojit s jinou na osmnáctku. */
  canComposeNines: boolean
  secondNine: Course | undefined
  /** Hřiště, na které se opravdu hraje - složená osmnáctka je obyčejný `Course`. */
  course: Course | undefined
  teeOptions: CourseTee[]
  tee: CourseTee | undefined
  /** Devítky, ze kterých jde skládat druhou půlku. */
  nineOptions: Course[]
  loops: PlayableLoop[]
  requiresLoops: boolean
  selection: string[]
  layout: CourseLayout | undefined
  startHole: number
  /** Počet jamek, na které se opravdu hraje. */
  playedHoles: number
  /** Norma zvoleného odpaliště přepočtená na hrané jamky. */
  playedTee: LayoutTee | undefined
  /** Jméno hraného výřezu, např. „Forest + River"; celé hřiště ho nemá. */
  layoutName: string | undefined
}

export function loopLabel(loop: PlayableLoop, t: (key: MessageKey) => string): string {
  const key = SYNTHETIC_LOOP_LABEL[loop.id]
  return loop.name || (key ? t(key) : loop.id)
}

/**
 * Spočítá hřiště, výřez a odpaliště z rozepsaného draftu.
 *
 * Čistá funkce nad seznamem uložených hřišť - žádný React ani storage uvnitř,
 * ať se dá zavolat z kteréhokoli kroku i z testu.
 */
export function resolveCourseSetup(
  courses: Course[],
  courseId: string,
  loopIds: string[],
  secondNineId: string | undefined,
  teeId: string,
  holeCountFallback: number,
  t: (key: MessageKey) => string,
): CourseSetup {
  const baseCourse = courses.find((c) => c.id === courseId)
  const canComposeNines = baseCourse !== undefined && baseCourse.holeCount === 9
  const secondNine = secondNineId
    ? courses.find((c) => c.id === secondNineId && c.holeCount === 9)
    : undefined
  const course =
    canComposeNines && baseCourse && secondNine
      ? composeNines(baseCourse, secondNine)
      : baseCourse
  const teeOptions = course?.tees ?? []
  const tee = course ? findTee(course, teeId) : undefined
  const nineOptions = courses.filter((entry) => entry.holeCount === 9)

  const loops: PlayableLoop[] = course ? playableLoops(course) : []
  const requiresLoops = course !== undefined && requiresLoopSelection(course)
  const selection =
    course && requiresLoops && selectionHoleCount(course, loopIds) === 0
      ? defaultLoopSelection(course)
      : loopIds
  const layout = course ? resolveLayout(course, selection) : undefined
  const startHole = layout?.startHole ?? 1
  const playedHoles = layout?.holeCount ?? holeCountFallback
  const playedTee = course && layout ? layoutTee(course, layout, teeId) : undefined

  const layoutName =
    selection.length > 0
      ? selection
          .flatMap((id) => {
            const loop = loops.find((candidate) => candidate.id === id)
            return loop ? [loopLabel(loop, t)] : []
          })
          .join(' + ')
      : undefined

  return {
    baseCourse,
    canComposeNines,
    secondNine,
    course,
    teeOptions,
    tee,
    nineOptions,
    loops,
    requiresLoops,
    selection,
    layout,
    startHole,
    playedHoles,
    playedTee,
    layoutName,
  }
}

/**
 * Přidá smyčku do výřezu, nebo ji odebere, když je poslední - viz komentář
 * u volajícího tlačítka. Vrací nové `loopIds`.
 */
export function toggleLoop(
  course: Course,
  selection: string[],
  loopId: string,
): string[] {
  if (selection.length > 1 && selection[selection.length - 1] === loopId) {
    return selection.slice(0, -1)
  }
  const next = [...selection, loopId]
  return selectionHoleCount(course, next) <= MAX_LAYOUT_HOLES ? next : [loopId]
}
