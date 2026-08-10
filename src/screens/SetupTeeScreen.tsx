import { useState } from 'react'
import type { Course } from '../courses/types'
import { layoutTee } from '../courses/layout'
import { localeTag, localizedTeeName, useT } from '../i18n'
import { BackIcon, ChevronDownIcon } from './icons'
import PickSheet from './PickSheet'
import { loopLabel, resolveCourseSetup, toggleLoop } from './setupCourse'

/** Počty jamek pro kolo bez hřiště. Šestka i dvanáctka existují - krátká hřiště se staví právě takhle. */
const HOLE_OPTIONS = [6, 9, 12, 18]

interface Props {
  courses: Course[]
  courseId: string
  holeCount: number
  onHoleCountChange: (value: number) => void
  loopIds: string[]
  onLoopIdsChange: (value: string[]) => void
  secondNineId: string | undefined
  onSecondNineIdChange: (value: string | undefined) => void
  teeId: string
  onTeeIdChange: (value: string) => void
  onPickCourse: () => void
  onEditCourse: (courseId?: string) => void
  onBack: () => void
  onNext: () => void
}

/**
 * Krok 2 zakládání kola: hřiště je už vybrané (krok 1, `CoursePickerScreen`),
 * tady se volí společné odpaliště a výřez hřiště. Odpaliště jednotlivých
 * hráčů se řeší až v dalším kroku u hráčů samotných.
 */
export default function SetupTeeScreen({
  courses,
  courseId,
  holeCount,
  onHoleCountChange,
  loopIds,
  onLoopIdsChange,
  secondNineId,
  onSecondNineIdChange,
  teeId,
  onTeeIdChange,
  onPickCourse,
  onEditCourse,
  onBack,
  onNext,
}: Props) {
  const t = useT()
  const [teeSheetOpen, setTeeSheetOpen] = useState(false)
  const [secondNineSheetOpen, setSecondNineSheetOpen] = useState(false)
  const setup = resolveCourseSetup(
    courses,
    courseId,
    loopIds,
    secondNineId,
    teeId,
    holeCount,
    t,
  )
  const {
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
    layoutName,
    playedHoles,
  } = setup

  // Délka i norma patří k hraným jamkám, ne k celému resortu.
  const teeSheetOptions = course
    ? teeOptions.map((option) => {
        const played = layout ? layoutTee(course, layout, option.id) : undefined
        const distance =
          played?.distance !== undefined
            ? ` · ${new Intl.NumberFormat(localeTag(), {
                maximumFractionDigits: 0,
              }).format(played.distance)} m`
            : ''
        return {
          id: option.id,
          label: `${localizedTeeName(option.id, option.name)}${distance}`,
        }
      })
    : []

  const nineSheetOptions = nineOptions.map((entry) => ({
    id: entry.id,
    label:
      baseCourse && entry.id === baseCourse.id
        ? t('setup.sameNineTwice', { name: entry.name })
        : entry.name,
  }))

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
          <h1>{t('setup.stepTeeTitle')}</h1>
        </div>
        <p className="subtitle">{t('setup.subtitle')}</p>
      </header>

      <main className="content">
        <section className="section">
          <h2 className="section-title">{t('setup.course')}</h2>

          <button type="button" className="secondary-button" onClick={onPickCourse}>
            {course
              ? layoutName
                ? `${course.name} · ${layoutName}`
                : course.name
              : t('setup.chooseCourse')}
          </button>

          <div className="link-row">
            <button type="button" className="link-button" onClick={() => onEditCourse()}>
              {t('setup.newCourse')}
            </button>
            {baseCourse && (
              <button
                type="button"
                className="link-button"
                onClick={() => onEditCourse(baseCourse.id)}
              >
                {t('setup.editCourse')}
              </button>
            )}
          </div>

          {course && teeOptions.length > 0 && (
            <>
              <label className="field tee-field">
                <span className="field-label">{t('setup.teeForAll')}</span>
                <button
                  type="button"
                  className="name-input pick-trigger"
                  onClick={() => setTeeSheetOpen(true)}
                  aria-haspopup="dialog"
                >
                  <span>
                    {tee ? localizedTeeName(tee.id, tee.name) : t('setup.teeForAll')}
                  </span>
                  <ChevronDownIcon />
                </button>
              </label>
              <p className="hint">{t('setup.teeIndividualHint')}</p>
            </>
          )}

          <p className="hint">
            {course
              ? t('setup.courseHint', { count: playedHoles })
              : t('setup.noCourseHint')}
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">{t('setup.holeCount')}</h2>
          {baseCourse && canComposeNines ? (
            <>
              <div className="segmented">
                <button
                  type="button"
                  className={`segment${secondNine ? '' : ' selected'}`}
                  onClick={() => onSecondNineIdChange(undefined)}
                  aria-pressed={!secondNine}
                >
                  {baseCourse.holeCount}
                </button>
                <button
                  type="button"
                  className={`segment${secondNine ? ' selected' : ''}`}
                  onClick={() => onSecondNineIdChange(secondNine?.id ?? baseCourse.id)}
                  aria-pressed={Boolean(secondNine)}
                >
                  {baseCourse.holeCount * 2}
                </button>
              </div>
              {secondNine && (
                <label className="field">
                  <span className="field-label">{t('setup.secondNine')}</span>
                  <button
                    type="button"
                    className="name-input pick-trigger"
                    onClick={() => setSecondNineSheetOpen(true)}
                    aria-haspopup="dialog"
                  >
                    <span>
                      {secondNine.id === baseCourse.id
                        ? t('setup.sameNineTwice', { name: secondNine.name })
                        : secondNine.name}
                    </span>
                    <ChevronDownIcon />
                  </button>
                </label>
              )}
              <p className="hint">{t('setup.secondNineHint')}</p>
            </>
          ) : course && requiresLoops ? (
            <>
              <div className="loop-options" role="group" aria-label={t('setup.loops')}>
                {loops.map((loop) => {
                  const order = selection.flatMap((id, index) =>
                    id === loop.id ? [index + 1] : [],
                  )
                  return (
                    <button
                      key={loop.id}
                      type="button"
                      className={`loop-option${order.length > 0 ? ' selected' : ''}`}
                      onClick={() =>
                        onLoopIdsChange(toggleLoop(course, selection, loop.id))
                      }
                      aria-pressed={order.length > 0}
                    >
                      <span className="loop-option-name">{loopLabel(loop, t)}</span>
                      <span className="loop-option-meta">
                        {order.length > 0
                          ? t('setup.loopOrder', { order: order.join(', ') })
                          : t('picker.holes', { count: loop.holeCount })}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="hint">
                {t('setup.loopSelection', {
                  loops: layoutName ?? '',
                  count: playedHoles,
                })}
              </p>
              <p className="hint">{t('setup.loopsHint')}</p>
            </>
          ) : course && loops.length > 0 ? (
            <>
              <div className="segmented">
                {[[] as string[], ...loops.map((loop) => [loop.id])].map((option) => {
                  const selected = option.join() === selection.join()
                  const loop = loops.find((candidate) => candidate.id === option[0])
                  return (
                    <button
                      key={option.join() || 'full'}
                      type="button"
                      className={`segment${selected ? ' selected' : ''}`}
                      onClick={() => onLoopIdsChange(option)}
                      aria-pressed={selected}
                    >
                      {loop ? loopLabel(loop, t) : t('setup.holesAll')}
                    </button>
                  )
                })}
              </div>
              <p className="hint">{t('setup.holeRangeHint')}</p>
            </>
          ) : course ? (
            <p className="hint">
              {t('setup.holeCountFromCourse')} {t('picker.holes', { count: playedHoles })}
            </p>
          ) : (
            <>
              <div className="segmented">
                {HOLE_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`segment${count === playedHoles ? ' selected' : ''}`}
                    onClick={() => onHoleCountChange(count)}
                    aria-pressed={count === playedHoles}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="hint">{t('setup.holeCountHint')}</p>
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {t('setup.next')}
        </button>
      </footer>

      {teeSheetOpen && (
        <PickSheet
          title={t('setup.teeForAll')}
          selectedId={tee?.id ?? ''}
          onSelect={onTeeIdChange}
          onClose={() => setTeeSheetOpen(false)}
          options={teeSheetOptions}
        />
      )}

      {secondNineSheetOpen && (
        <PickSheet
          title={t('setup.secondNine')}
          selectedId={secondNine?.id ?? ''}
          onSelect={onSecondNineIdChange}
          onClose={() => setSecondNineSheetOpen(false)}
          options={nineSheetOptions}
        />
      )}
    </div>
  )
}
