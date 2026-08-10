import type { Course, CourseTee } from './types'
import { normalizeCourse } from './types'
import { combineStrokeIndex, layoutTee, resolveLayout } from './layout'

/**
 * Osmnáctka složená ze dvou devítijamkových hřišť.
 *
 * Devítka se běžně hraje dvakrát dokola a stejně tak se dá poskládat ze dvou
 * různých devítek (Ropice: Ocelová a Werková). Aplikace to neumí jinak než
 * jako hřiště, takže se tu z obou devítek postaví obyčejný `Course` o osmnácti
 * jamkách - výběr odpališť, `coursePar()` i zakládání kola pak fungují beze
 * změny.
 *
 * Skládání samo se **nepočítá tady**. Devítky se vloží do `loops` a normu
 * kombinace složí `layoutTee()` ze `src/courses/layout.ts` - stejný kód, který
 * skládá osmnáctky na resortech (Kácov, Cornelia). Dvě implementace stejného
 * pravidla by se dřív nebo později rozešly.
 */

/** Id smyček složeného hřiště; nekoliduje s devítkami resortů v katalogu. */
export const FRONT_LOOP = 'composite-front'
export const BACK_LOOP = 'composite-back'

/**
 * Norma devítky přepočtená tak, aby se opravdu týkala jejích jamek.
 *
 * Klub může devítku normovat jako dvě kola dokola - Gloria Verde má na devíti
 * jamkách podepsané CR 70,3 a par 70, tedy normu na osmnáct jamek
 * (`tee.holeCount`). Sečíst dvě takové normy by dalo CR 140,6, proto se napřed
 * zkrátí na jednu devítku. Slope se nekrátí: je to poměr, ne součet.
 */
function nineTees(course: Course): CourseTee[] {
  return course.tees.map((tee) => {
    const rated = tee.holeCount ?? course.holeCount
    const share = rated > 0 ? course.holeCount / rated : 1
    if (share === 1) {
      const { holeCount: _rated, ...rest } = tee
      return { ...rest }
    }
    return {
      id: tee.id,
      name: tee.name,
      // Bez zaokrouhlení: půlka se sečte zpátky do celku a zaokrouhlí se až
      // tam, jinak by se z 70,3 stalo 70,4.
      ...(tee.courseRating !== undefined
        ? { courseRating: tee.courseRating * share }
        : {}),
      ...(tee.slopeRating !== undefined ? { slopeRating: tee.slopeRating } : {}),
      ...(tee.par !== undefined ? { par: Math.round(tee.par * share) } : {}),
      ...(tee.distance !== undefined
        ? { distance: Math.round(tee.distance * share) }
        : {}),
    }
  })
}

/**
 * Složí dvě devítky do jednoho hřiště.
 *
 * Tatáž devítka dvakrát je platný vstup a zdaleka nejčastější případ.
 * Odpaliště se párují podle `id` (barvy): složené hřiště nabídne jen ty, které
 * mají obě devítky, protože z barvy, která na druhé devítce není, se hrát nedá.
 */
export function composeNines(front: Course, back: Course): Course {
  const frontTees = nineTees(front)
  const backTees = nineTees(back)
  const backIds = new Set(backTees.map((tee) => tee.id))
  const shared = frontTees.filter((tee) => backIds.has(tee.id))

  const skeleton: Course = {
    // Složené hřiště v katalogu není, je to soukromá kombinace dvou záznamů.
    id: `local:${front.id}+${back.id}`,
    name: front.name === back.name ? front.name : `${front.name} + ${back.name}`,
    ...(front.club ? { club: front.club } : {}),
    ...(front.country ? { country: front.country } : {}),
    ...(front.lat !== undefined ? { lat: front.lat, lon: front.lon } : {}),
    holeCount: front.holeCount + back.holeCount,
    pars: [...front.pars, ...back.pars],
    strokeIndex: combineStrokeIndex([front.strokeIndex, back.strokeIndex]),
    // Napřed jen jména - normu k nim doplní `layoutTee()` níž, ale bez
    // odpaliště v hřišti by ho neměl kde najít (`findTee()`).
    tees: shared.map((tee) => ({ id: tee.id, name: tee.name })),
    loops: [
      {
        id: FRONT_LOOP,
        name: front.name,
        holeCount: front.holeCount,
        startHole: 1,
        tees: frontTees,
      },
      {
        id: BACK_LOOP,
        name: back.name,
        holeCount: back.holeCount,
        startHole: front.holeCount + 1,
        tees: backTees,
      },
    ],
    source: 'manual',
    ...(front.attribution ? { attribution: front.attribution } : {}),
  }

  const layout = resolveLayout(skeleton, [FRONT_LOOP, BACK_LOOP])
  const tees: CourseTee[] = shared.map((tee) => {
    const composed = layoutTee(skeleton, layout, tee.id)
    return {
      id: tee.id,
      name: tee.name,
      ...(composed?.courseRating !== undefined
        ? { courseRating: composed.courseRating }
        : {}),
      ...(composed?.slopeRating !== undefined
        ? { slopeRating: composed.slopeRating }
        : {}),
      ...(composed?.par !== undefined ? { par: composed.par } : {}),
      ...(composed?.distance !== undefined ? { distance: composed.distance } : {}),
    }
  })

  return normalizeCourse({ ...skeleton, tees })
}
