import { useEffect, useMemo, useState } from 'react'
import type { Course } from '../courses/types'
import type { CatalogEntry } from '../courses/catalog'
import { CatalogError, fetchCourse, fetchIndex } from '../courses/catalog'
import { loadCourses, saveCourse } from '../storage'
import type { MessageKey } from '../i18n'
import { useT } from '../i18n'

/**
 * Výběr hřiště.
 *
 * Hledá se najednou v hřištích uložených v telefonu i v katalogu na serveru.
 * Uložené hřiště je použitelné hned a offline; katalogové se při klepnutí
 * stáhne a uloží, takže se z něj rovnou stane uložené.
 *
 * Rejstřík se stahuje až tady, ne při startu aplikace - kdo hřiště nepotřebuje,
 * nestáhne ani bajt navíc. Když se katalog nepodaří načíst, obrazovka funguje
 * dál nad tím, co je v telefonu, a důvod řekne nahlas.
 */

interface Props {
  selectedId?: string
  onSelect: (course: Course | null) => void
  onNewCourse: () => void
  onBack: () => void
}

/** Bez diakritiky a malými písmeny, ať „Karlstejn" najde „Karlštejn". */
function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Řádek seznamu: buď hřiště v telefonu, nebo nabídka z katalogu. */
interface Row {
  id: string
  name: string
  meta: string
  stored: boolean
}

const CATALOG_ERROR: Record<CatalogError['reason'], MessageKey> = {
  offline: 'picker.errorOffline',
  missing: 'picker.errorMissing',
  broken: 'picker.errorBroken',
}

export default function CoursePickerScreen({
  selectedId,
  onSelect,
  onNewCourse,
  onBack,
}: Props) {
  const t = useT()
  const [stored, setStored] = useState<Course[]>(() => loadCourses())
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogError, setCatalogError] = useState<MessageKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetchIndex()
      .then((entries) => live && setCatalog(entries))
      .catch((error: unknown) => {
        if (!live) return
        const reason = error instanceof CatalogError ? error.reason : 'broken'
        setCatalogError(CATALOG_ERROR[reason])
      })
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])

  const rows = useMemo<Row[]>(() => {
    const storedIds = new Set(stored.map((course) => course.id))

    const fromStorage: Row[] = stored.map((course) => ({
      id: course.id,
      name: course.name,
      meta: [
        course.club && course.club !== course.name ? course.club : null,
        course.country,
        t('picker.holes', { count: course.holeCount }),
        course.tees.length > 0
          ? t('picker.tees', { count: course.tees.length })
          : t('picker.noTees'),
      ]
        .filter(Boolean)
        .join(' · '),
      stored: true,
    }))

    // Katalogové hřiště, které už je v telefonu, se nenabízí podruhé.
    const fromCatalog: Row[] = catalog
      .filter((entry) => !storedIds.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        meta: [
          entry.club,
          entry.country,
          t('picker.holes', { count: entry.holeCount }),
          entry.rated ? t('picker.rated') : t('picker.notRated'),
        ]
          .filter(Boolean)
          .join(' · '),
        stored: false,
      }))

    const all = [...fromStorage, ...fromCatalog]
    const needle = foldText(query.trim())
    if (!needle) return all
    return all.filter((row) => foldText(`${row.name} ${row.meta}`).includes(needle))
  }, [stored, catalog, query, t])

  async function choose(row: Row) {
    if (row.stored) {
      const course = stored.find((c) => c.id === row.id)
      if (course) onSelect(course)
      return
    }

    setDownloading(row.id)
    setCatalogError(null)
    try {
      const course = await fetchCourse(row.id)
      saveCourse(course)
      setStored(loadCourses())
      onSelect(course)
    } catch (error: unknown) {
      const reason = error instanceof CatalogError ? error.reason : 'broken'
      setCatalogError(CATALOG_ERROR[reason])
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="link-button" onClick={onBack}>
          {t('common.back')}
        </button>
        <h1>{t('picker.title')}</h1>
        <p className="subtitle">
          {loading
            ? t('picker.loading')
            : t('picker.count', { stored: stored.length, total: rows.length })}
        </p>
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

        {catalogError && <p className="notice error">{t(catalogError)}</p>}

        <div className="course-list">
          {/* Volba "bez hřiště" patří na začátek, ale ne mezi výsledky hledání -
              tam by se tvářila jako nalezené hřiště. */}
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

          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`course-item${row.id === selectedId ? ' selected' : ''}`}
              onClick={() => void choose(row)}
              disabled={downloading !== null}
            >
              <span className="course-item-name">
                {row.name}
                {!row.stored && (
                  <span className="course-item-tag">
                    {downloading === row.id
                      ? t('picker.downloading')
                      : t('picker.inCatalog')}
                  </span>
                )}
              </span>
              <span className="course-item-meta">{row.meta}</span>
            </button>
          ))}

          {rows.length === 0 && !loading && (
            <p className="hint">{t('picker.nothingFound')}</p>
          )}
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
