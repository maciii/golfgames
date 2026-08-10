import { useState } from 'react'
import type { Course, CourseLoop, CourseTee } from '../courses/types'
import {
  copyAsPrivateCourse,
  coursePar,
  createCourse,
  defaultStrokeIndex,
  isCatalogCourse,
} from '../courses/types'
import { deleteCourse, saveCourse } from '../storage'
import { useT } from '../i18n'
import { BackIcon } from './icons'

/**
 * Zadání a úprava hřiště.
 *
 * Katalog hřišť žije na serveru (viz plán fáze B), ale ruční zadání musí
 * fungovat vždycky - i bez signálu na neznámém hřišti. Proto je tahle
 * obrazovka soběstačná a nic nestahuje.
 *
 * Stroke index se needituje volným textem, ale posouváním pořadí: SI je
 * permutace 1..počet jamek a překlep, který by dvě jamky nechal se stejným
 * číslem, by tiše rozbil rozdělení ran.
 */

const PAR_OPTIONS = [3, 4, 5, 6]

/**
 * Počty jamek, které jde zadat.
 *
 * Nejsou to jen devítka a osmnáctka: krátká hřiště mívají šest nebo dvanáct
 * jamek a resort s víc devítkami se zadává jako jedno hřiště o 27 jamkách,
 * které se rozpadá na pojmenované devítky.
 */
const HOLE_OPTIONS = [6, 9, 12, 18, 27, 36]

/** Od kolika jamek se hřiště dělí na devítky. */
const LOOP_SIZE = 9

/**
 * Devítky pro zadaný počet jamek.
 *
 * Rozdělují se jen hřiště nad osmnáct jamek: osmnáctka svoje půlky
 * nepotřebuje pojmenovat (výběr přední a zadní devítky umí aplikace sama)
 * a kratší hřiště se hraje celé. Jména se pak dají přepsat.
 */
function defaultLoops(holeCount: number, previous: CourseLoop[] = []): CourseLoop[] {
  if (holeCount <= 18 || holeCount % LOOP_SIZE !== 0) return []

  return Array.from({ length: holeCount / LOOP_SIZE }, (_, index) => {
    const id = String.fromCharCode(97 + index)
    const kept = previous[index]
    return {
      id: kept?.id ?? id,
      name: kept?.name ?? id.toUpperCase(),
      holeCount: LOOP_SIZE,
      ...(kept?.tees ? { tees: kept.tees } : {}),
    }
  })
}

/** Rozepsaná norma odpaliště tak, jak ji uživatel právě píše. */
interface RatingText {
  cr: string
  sr: string
}

interface Props {
  /** Upravované hřiště; bez něj se zakládá nové. */
  course?: Course
  onSaved: (course: Course) => void
  onDeleted?: () => void
  onBack: () => void
}

export default function CourseEditScreen({ course, onSaved, onDeleted, onBack }: Props) {
  const t = useT()
  const [draft, setDraft] = useState<Course>(() => course ?? createCourse('', 18))
  const [nameError, setNameError] = useState(false)

  /**
   * Normy odpališť se drží zvlášť jako text.
   *
   * Kdyby se pole řídilo přímo číslem z modelu, nešlo by zadat desetinnou
   * hodnotu: po napsání "71." vrátí parsování 71, pole se překreslí bez tečky
   * a další číslice se nemá kam připsat. Model dostává rozparsovanou hodnotu,
   * uživatel vidí přesně to, co napsal.
   */
  const [ratingText, setRatingText] = useState<Record<string, RatingText>>(() =>
    Object.fromEntries(
      (course?.tees ?? []).map((tee) => [
        tee.id,
        {
          cr: tee.courseRating === undefined ? '' : `${tee.courseRating}`,
          sr: tee.slopeRating === undefined ? '' : `${tee.slopeRating}`,
        },
      ]),
    ),
  )

  function setHoleCount(holeCount: number) {
    setDraft((prev) => {
      const loops = defaultLoops(holeCount, prev.loops)
      return {
        ...prev,
        holeCount,
        pars: Array.from({ length: holeCount }, (_, i) => prev.pars[i] ?? 4),
        // Zkrácené nebo prodloužené hřiště by mělo děravý SI, takže se přečísluje.
        strokeIndex: defaultStrokeIndex(holeCount),
        ...(loops.length > 0 ? { loops } : { loops: undefined }),
      }
    })
  }

  function renameLoop(index: number, name: string) {
    setDraft((prev) => ({
      ...prev,
      ...(prev.loops
        ? { loops: prev.loops.map((loop, i) => (i === index ? { ...loop, name } : loop)) }
        : {}),
    }))
  }

  /** První jamka smyčky v číslování hřiště - kvůli popiskům v seznamu jamek. */
  function loopStart(index: number): number {
    return (draft.loops ?? [])
      .slice(0, index)
      .reduce((sum, loop) => sum + loop.holeCount, 0)
  }

  /**
   * Jamky rozdělené do smyček; hřiště bez smyček má jedinou skupinu.
   *
   * Na resortu se jamky každé devítky číslují od jedničky, ne průběžně přes
   * celé hřiště - tak je má i klubová scorekarta.
   */
  const holeGroups = (draft.loops ?? []).map((loop, index) => ({
    loop,
    index,
    start: loopStart(index),
    holeCount: loop.holeCount,
  }))

  function setPar(hole: number, par: number) {
    setDraft((prev) => {
      const pars = [...prev.pars]
      pars[hole] = par
      return { ...prev, pars }
    })
  }

  /**
   * Posune jamku ve žebříčku obtížnosti o jedno místo.
   *
   * Prohození dvou jamek udrží SI permutací 1..N za všech okolností - proto se
   * mění pořadím a ne přepisem čísla.
   */
  function moveStrokeIndex(hole: number, direction: -1 | 1) {
    setDraft((prev) => {
      const current = prev.strokeIndex[hole] ?? hole + 1
      const target = current + direction
      if (target < 1 || target > prev.holeCount) return prev

      const strokeIndex = prev.strokeIndex.map((si, index) => {
        if (index === hole) return target
        return si === target ? current : si
      })
      return { ...prev, strokeIndex }
    })
  }

  function updateTee(index: number, patch: Partial<CourseTee>) {
    setDraft((prev) => ({
      ...prev,
      tees: prev.tees.map((tee, i) => (i === index ? { ...tee, ...patch } : tee)),
    }))
  }

  function addTee() {
    setDraft((prev) => ({
      ...prev,
      tees: [
        ...prev.tees,
        {
          id: `tee${prev.tees.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
          name: '',
        },
      ],
    }))
  }

  function removeTee(index: number) {
    setDraft((prev) => ({ ...prev, tees: prev.tees.filter((_, i) => i !== index) }))
  }

  /**
   * Číslo z pole; prázdné nebo rozepsané pole znamená "neznámé", ne nulu.
   * Desetinná čárka i tečka, ať jde 71,2 napsat podle zvyku.
   */
  function parseNumber(text: string): number | undefined {
    const value = Number.parseFloat(text.replace(',', '.'))
    return Number.isFinite(value) ? value : undefined
  }

  /** Text normy tak, jak ho uživatel napsal. */
  function ratingOf(tee: CourseTee, field: keyof RatingText): string {
    const stored = ratingText[tee.id]?.[field]
    if (stored !== undefined) return stored
    const value = field === 'cr' ? tee.courseRating : tee.slopeRating
    return value === undefined ? '' : `${value}`
  }

  function updateRating(index: number, field: keyof RatingText, text: string) {
    const tee = draft.tees[index]
    if (!tee) return

    setRatingText((prev) => ({
      ...prev,
      [tee.id]: { cr: ratingOf(tee, 'cr'), sr: ratingOf(tee, 'sr'), [field]: text },
    }))
    updateTee(
      index,
      field === 'cr'
        ? { courseRating: parseNumber(text) }
        : { slopeRating: parseNumber(text) },
    )
  }

  function save() {
    const name = draft.name.trim()
    if (!name) {
      setNameError(true)
      return
    }
    const edited: Course = {
      ...draft,
      name,
      tees: draft.tees
        .filter((tee) => tee.name.trim())
        .map((tee) => ({ ...tee, name: tee.name.trim() })),
    }
    const saved = course && isCatalogCourse(course) ? copyAsPrivateCourse(edited) : edited
    saveCourse(saved)
    onSaved(saved)
  }

  function remove() {
    if (!course) return
    deleteCourse(course.id)
    onDeleted?.()
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div className="screen-header-row">
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <BackIcon />
          </button>
          <h1>{course ? t('course.editTitle') : t('course.newTitle')}</h1>
        </div>
      </header>

      <main className="content">
        <section className="section">
          <label className="field">
            <span className="field-label">{t('course.name')}</span>
            <span className="field-input">
              <input
                className="name-input"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                placeholder={t('course.namePlaceholder')}
                value={draft.name}
                onChange={(e) => {
                  setNameError(false)
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }}
              />
            </span>
          </label>
          {nameError && <p className="hint error">{t('course.nameRequired')}</p>}

          <div className="segmented">
            {HOLE_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`segment${count === draft.holeCount ? ' selected' : ''}`}
                onClick={() => setHoleCount(count)}
                aria-pressed={count === draft.holeCount}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="hint">{t('course.parTotal', { count: coursePar(draft) })}</p>
          {/* Odkud údaje pocházejí. U katalogových hřišť to vyžaduje ODbL,
              u vlastních je to poznámka, odkud se scorekarta opisovala. */}
          {draft.attribution && (
            <p className="hint">
              {t('course.attribution', { source: draft.attribution })}
            </p>
          )}
        </section>

        <section className="section">
          <h2 className="section-title">{t('course.holes')}</h2>
          <p className="hint">{t('course.holesHint')}</p>

          {holeGroups.length > 0 && <p className="hint">{t('course.loopsHint')}</p>}

          {(holeGroups.length > 0
            ? holeGroups
            : [{ loop: undefined, index: 0, start: 0, holeCount: draft.holeCount }]
          ).map((group) => (
            <div key={group.loop?.id ?? 'all'} className="course-loop">
              {group.loop && (
                <label className="field">
                  <span className="field-label">
                    {t('course.loopName', { number: group.index + 1 })}
                  </span>
                  <span className="field-input">
                    <input
                      className="name-input"
                      type="text"
                      autoComplete="off"
                      value={group.loop.name}
                      onChange={(e) => renameLoop(group.index, e.target.value)}
                      aria-label={t('course.loopName', { number: group.index + 1 })}
                    />
                  </span>
                </label>
              )}

              <div className="course-hole-list">
                {Array.from({ length: group.holeCount }, (_, offset) => {
                  const hole = group.start + offset
                  const number = group.loop ? offset + 1 : hole + 1
                  // Na resortu je „C1" srozumitelnější než průběžná devatenáctka.
                  const label = group.loop ? `${group.loop.name}${number}` : `${number}`

                  return (
                    <div key={hole} className="course-hole-row">
                      <span className="course-hole-number">{number}</span>

                      <div className="segmented compact">
                        {PAR_OPTIONS.map((par) => (
                          <button
                            key={par}
                            type="button"
                            className={`segment${
                              draft.pars[hole] === par ? ' selected' : ''
                            }`}
                            onClick={() => setPar(hole, par)}
                            aria-label={t('course.parForHole', { hole: label, par })}
                            aria-pressed={draft.pars[hole] === par}
                          >
                            {par}
                          </button>
                        ))}
                      </div>

                      <div className="course-si">
                        <button
                          type="button"
                          className="value-step"
                          onClick={() => moveStrokeIndex(hole, -1)}
                          aria-label={t('course.harder', { hole: label })}
                        >
                          −
                        </button>
                        <span className="course-si-value">
                          {t('course.siShort', {
                            si: draft.strokeIndex[hole] ?? hole + 1,
                          })}
                        </span>
                        <button
                          type="button"
                          className="value-step"
                          onClick={() => moveStrokeIndex(hole, 1)}
                          aria-label={t('course.easier', { hole: label })}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="section">
          <h2 className="section-title">{t('course.tees')}</h2>
          <p className="hint">{t('course.teesHint')}</p>

          {draft.tees.map((tee, index) => (
            <div key={tee.id} className="course-tee">
              <label className="field">
                <span className="field-label">{t('course.teeName')}</span>
                <span className="field-input">
                  <input
                    className="name-input"
                    type="text"
                    autoComplete="off"
                    placeholder={t('course.teeNamePlaceholder')}
                    value={tee.name}
                    onChange={(e) => updateTee(index, { name: e.target.value })}
                  />
                </span>
              </label>

              <div className="course-tee-ratings">
                <label className="field">
                  <span className="field-label">{t('course.courseRating')}</span>
                  <span className="field-input">
                    <input
                      className="name-input value-input"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={ratingOf(tee, 'cr')}
                      onChange={(e) => updateRating(index, 'cr', e.target.value)}
                      aria-label={t('course.courseRatingFor', { tee: tee.name })}
                    />
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">{t('course.slopeRating')}</span>
                  <span className="field-input">
                    <input
                      className="name-input value-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={ratingOf(tee, 'sr')}
                      onChange={(e) => updateRating(index, 'sr', e.target.value)}
                      aria-label={t('course.slopeRatingFor', { tee: tee.name })}
                    />
                  </span>
                </label>
              </div>

              <button
                type="button"
                className="link-button danger"
                onClick={() => removeTee(index)}
              >
                {t('course.removeTee')}
              </button>
            </div>
          ))}

          <button type="button" className="secondary-button" onClick={addTee}>
            {t('course.addTee')}
          </button>
        </section>

        {course && (
          <div className="link-row">
            <button type="button" className="link-button danger" onClick={remove}>
              {t('course.delete')}
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={save}>
          {t('course.save')}
        </button>
      </footer>
    </div>
  )
}
