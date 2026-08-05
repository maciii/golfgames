import { useMemo, useState } from 'react'
import type { Course } from '../courses/types'
import { loadCourses } from '../storage'
import { useT } from '../i18n'

/**
 * Výběr hřiště ze seznamu.
 *
 * Rozbalovací nabídka přestala stačit ve chvíli, kdy si člověk naimportoval
 * tři stovky hřišť - v seznamu bez hledání se hřiště nedá najít palcem na
 * hřišti. Tahle obrazovka je proto hledání podle jména a klubu.
 *
 * Návrh podle polohy (GPS) a stažení z katalogu přijdou ve fázi B; tady se
 * zatím vybírá jen z toho, co už je v telefonu.
 */

interface Props {
  /** Právě zvolené hřiště, ať je vidět, co je nastavené. */
  selectedId?: string
  onSelect: (course: Course | null) => void
  onNewCourse: () => void
  onBack: () => void
}

/** Bez diakritiky a malými písmeny, ať „Karlstejn" najde „Karlštejn". */
function foldText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function CoursePickerScreen({
  selectedId,
  onSelect,
  onNewCourse,
  onBack,
}: Props) {
  const t = useT()
  const [courses] = useState<Course[]>(() => loadCourses())
  const [query, setQuery] = useState('')

  const found = useMemo(() => {
    const needle = foldText(query.trim())
    if (!needle) return courses
    return courses.filter((course) => {
      const haystack = foldText(
        `${course.name} ${course.club ?? ''} ${course.country ?? ''}`,
      )
      return haystack.includes(needle)
    })
  }, [courses, query])

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="link-button" onClick={onBack}>
          {t('common.back')}
        </button>
        <h1>{t('picker.title')}</h1>
        <p className="subtitle">{t('picker.count', { count: courses.length })}</p>
      </header>

      <main className="content">
        <input
          className="name-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={t('picker.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('picker.search')}
        />

        <div className="course-list">
          {/* Volba "bez hřiště" patří na začátek seznamu, ale ne mezi výsledky
              hledání - tam by se tvářila jako nalezené hřiště. */}
          {!query.trim() && (
            <button
              type="button"
              className={`course-item${selectedId ? '' : ' selected'}`}
              onClick={() => onSelect(null)}
            >
              <span className="course-item-name">{t('setup.noCourse')}</span>
              <span className="course-item-meta">{t('picker.noCourseMeta')}</span>
            </button>
          )}

          {found.map((course) => (
            <button
              key={course.id}
              type="button"
              className={`course-item${course.id === selectedId ? ' selected' : ''}`}
              onClick={() => onSelect(course)}
            >
              <span className="course-item-name">{course.name}</span>
              <span className="course-item-meta">
                {[
                  course.club && course.club !== course.name ? course.club : null,
                  course.country,
                  t('picker.holes', { count: course.holeCount }),
                  course.tees.length > 0
                    ? t('picker.tees', { count: course.tees.length })
                    : t('picker.noTees'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))}

          {found.length === 0 && <p className="hint">{t('picker.nothingFound')}</p>}
        </div>
      </main>

      <footer className="app-footer">
        <button type="button" className="secondary-button" onClick={onNewCourse}>
          {t('setup.newCourse')}
        </button>
      </footer>
    </div>
  )
}
