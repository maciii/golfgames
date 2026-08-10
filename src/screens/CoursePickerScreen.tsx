import { useEffect, useMemo, useState } from 'react'
import { hasNewerCatalogVersion, isCatalogCourse } from '../courses/types'
import type { Course } from '../courses/types'
import { distanceKm } from '../courses/geo'
import type { CatalogEntry } from '../courses/catalog'
import { CatalogError, fetchCourse, fetchIndex } from '../courses/catalog'
import {
  loadCourses,
  loadFavoriteCourseIds,
  saveCourse,
  toggleFavoriteCourse,
} from '../storage'
import { localeTag } from '../i18n'
import type { MessageKey } from '../i18n'
import { useT } from '../i18n'
import { HeartIcon } from './icons'

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
  /**
   * Režim startu kola: obrazovka je první podobrazovka zakládání kola, ne
   * návrat k rozepsanému nastavení - proto nabídne i hru bez hřiště. Odkazy
   * na archiv/zálohu/účet tu záměrně nejsou - stejné položky má i menu na
   * domovské obrazovce, odkud se do zakládání kola vstupuje.
   */
  onSkip?: () => void
  /**
   * Čisté procházení hřišť z menu, ne první krok zakládání kola.
   *
   * Volba „bez hřiště" v takovém kontextu nedává smysl, proto zmizí; `onSelect`
   * dostane vždycky vybrané hřiště, nikdy `null`.
   */
  mode?: 'start' | 'browse'
}

/** Bez diakritiky a malými písmeny, ať „Karlstejn" najde „Karlštejn". */
function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Řádek seznamu: buď hřiště v telefonu, nebo nabídka z katalogu. */
type CourseStatus = 'catalog' | 'downloaded' | 'private'

interface Row {
  id: string
  name: string
  meta: string
  stored: boolean
  status: CourseStatus
  country?: string
  distanceKm?: number
}

/**
 * Kam vede odkaz na zdroj dat.
 *
 * Ne přímo na `catalogBase()`, což je adresa souborů - člověku je k ničemu
 * stránka se surovým JSON. Odkaz míří na projekt, kde je licence i postup,
 * jak hřiště opravit.
 */
const CATALOG_HOME = 'https://github.com/maciii/golfgames-courses'

const CATALOG_ERROR: Record<CatalogError['reason'], MessageKey> = {
  offline: 'picker.errorOffline',
  missing: 'picker.errorMissing',
  broken: 'picker.errorBroken',
}

type LocationState = 'loading' | 'ready' | 'unavailable'

interface GeoPoint {
  latitude: number
  longitude: number
}

function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function courseGroup(row: Row, favorites: Set<string>): number {
  if (row.status === 'private') return 0
  if (favorites.has(row.id)) return 1
  if (row.status === 'downloaded') return 2
  return 3
}

function compareGroupedRows(a: Row, b: Row, favorites: Set<string>): number {
  const groupDifference = courseGroup(a, favorites) - courseGroup(b, favorites)
  if (groupDifference !== 0) return groupDifference
  return a.name.localeCompare(b.name, localeTag(), { sensitivity: 'base' })
}

function compareNearbyRows(a: Row, b: Row, favorites: Set<string>): number {
  const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY
  const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY
  if (aDistance !== bDistance) return aDistance - bDistance
  return compareGroupedRows(a, b, favorites)
}

/** Obnoví uložené katalogové kopie, ale soukromá hřiště nechá offline. */
async function refreshStoredCatalogCourses(
  courses: Course[],
  entries: CatalogEntry[],
): Promise<boolean> {
  const available = new Set(entries.map((entry) => entry.id))
  const candidates = courses.filter(
    (course) => isCatalogCourse(course) && available.has(course.id),
  )

  const changed = await Promise.all(
    candidates.map(async (local) => {
      try {
        const remote = await fetchCourse(local.id)
        if (!hasNewerCatalogVersion(local, remote)) return false
        saveCourse(remote)
        return true
      } catch {
        // Lokální kopie je pořád použitelná; aktualizace se zkusí příště.
        return false
      }
    }),
  )

  return changed.some(Boolean)
}

export default function CoursePickerScreen({
  selectedId,
  onSelect,
  onNewCourse,
  onBack,
  onSkip,
  mode = 'start',
}: Props) {
  const t = useT()
  const [stored, setStored] = useState<Course[]>(() => loadCourses())
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogError, setCatalogError] = useState<MessageKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoriteCourseIds())
  const [country, setCountry] = useState('')
  const [nearestFirst, setNearestFirst] = useState(true)
  const [location, setLocation] = useState<GeoPoint | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('loading')

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState('unavailable')
      setNearestFirst(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationState('ready')
      },
      () => {
        setLocationState('unavailable')
        setNearestFirst(false)
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    )
  }, [])

  useEffect(() => {
    let live = true
    fetchIndex()
      .then((entries) => {
        if (!live) return
        setCatalog(entries)
        void refreshStoredCatalogCourses(stored, entries).then((changed) => {
          if (live && changed) setStored(loadCourses())
        })
      })
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

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const allRows = useMemo<Row[]>(() => {
    const storedIds = new Set(stored.map((course) => course.id))
    const fromStorage: Row[] = stored.map((course) => ({
      id: course.id,
      name: course.name,
      meta: [
        course.club && course.club !== course.name ? course.club : null,
        course.country,
        t('picker.holes', { count: course.holeCount }),
        course.loops && course.loops.length > 0
          ? t('picker.loops', { count: course.loops.length })
          : null,
        course.tees.length > 0
          ? t('picker.tees', { count: course.tees.length })
          : t('picker.noTees'),
      ]
        .filter(Boolean)
        .join(' · '),
      stored: true,
      status: isCatalogCourse(course) ? 'downloaded' : 'private',
      ...(course.country ? { country: course.country } : {}),
      ...(location ? { distanceKm: distanceKm(location, course.lat, course.lon) } : {}),
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
          entry.loops ? t('picker.loops', { count: entry.loops }) : null,
          entry.rated ? t('picker.rated') : t('picker.notRated'),
        ]
          .filter(Boolean)
          .join(' · '),
        stored: false,
        status: 'catalog',
        ...(entry.country ? { country: entry.country } : {}),
        ...(location ? { distanceKm: distanceKm(location, entry.lat, entry.lon) } : {}),
      }))

    return [...fromStorage, ...fromCatalog].sort((a, b) =>
      nearestFirst && location
        ? compareNearbyRows(a, b, favoriteSet)
        : compareGroupedRows(a, b, favoriteSet),
    )
  }, [catalog, favoriteSet, location, nearestFirst, stored, t])

  const countries = useMemo(
    () =>
      [...new Set(allRows.flatMap((row) => (row.country ? [row.country] : [])))].sort(
        (a, b) => countryName(a, localeTag()).localeCompare(countryName(b, localeTag())),
      ),
    [allRows],
  )

  const rows = useMemo(() => {
    const needle = foldText(query.trim())
    return allRows.filter((row) => {
      if (country && row.country !== country) return false
      return !needle || foldText(`${row.name} ${row.meta}`).includes(needle)
    })
  }, [allRows, country, query])

  /**
   * Zhuštěný přehled srdíčkem označených hřišť nahoře, mimo dlouhý seznam -
   * ten dole slouží k hledání a procházení, tenhle k rychlému výběru toho,
   * co se hraje nejčastěji. Při hledání zmizí, ať nezabírá místo dvojmo.
   */
  const favoriteRows = useMemo(
    () =>
      allRows
        .filter((row) => favoriteSet.has(row.id))
        .sort((a, b) =>
          a.name.localeCompare(b.name, localeTag(), { sensitivity: 'base' }),
        ),
    [allRows, favoriteSet],
  )

  /**
   * Oblíbenost se řídí výhradně srdíčkem, ne tím, jestli je hřiště stažené -
   * ale na domovské obrazovce se oblíbená hřiště čtou z `loadCourses()`
   * (jen to, co je v telefonu), takže katalogové hřiště bez stažení by se
   * tam nikdy neukázalo. Přidání do oblíbených proto hřiště nejdřív stáhne,
   * přesně jako `choose()` - odebrání už stahovat nemusí.
   */
  async function toggleFavorite(row: Row) {
    const willFavorite = !favoriteSet.has(row.id)
    if (willFavorite && !row.stored) {
      setDownloading(row.id)
      setCatalogError(null)
      try {
        const course = await fetchCourse(row.id)
        saveCourse(course)
        setStored(loadCourses())
      } catch (error: unknown) {
        const reason = error instanceof CatalogError ? error.reason : 'broken'
        setCatalogError(CATALOG_ERROR[reason])
        setDownloading(null)
        return
      }
      setDownloading(null)
    }
    toggleFavoriteCourse(row.id)
    setFavoriteIds(loadFavoriteCourseIds())
  }

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
        {onSkip === undefined && (
          <button type="button" className="link-button" onClick={onBack}>
            {t('common.back')}
          </button>
        )}
        <h1>
          {mode === 'browse'
            ? t('picker.browseTitle')
            : onSkip
              ? t('picker.startTitle')
              : t('picker.title')}
        </h1>
        <p className="subtitle">
          {loading
            ? t('picker.loading')
            : t('picker.count', { stored: stored.length, total: rows.length })}
        </p>
      </header>

      <main className="content">
        {favoriteRows.length > 0 && !query.trim() && (
          <div className="favorite-course-row">
            {favoriteRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="favorite-course-chip"
                onClick={() => void choose(row)}
                disabled={downloading !== null}
              >
                <HeartIcon filled />
                <span className="favorite-course-chip-name">{row.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="picker-search-row">
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
          <button
            type="button"
            className={`location-sort-button${nearestFirst ? ' active' : ''}`}
            onClick={() => setNearestFirst((value) => !value)}
            aria-label={nearestFirst ? t('picker.sortGrouped') : t('picker.sortNearest')}
            aria-pressed={nearestFirst}
            title={nearestFirst ? t('picker.sortGrouped') : t('picker.sortNearest')}
          >
            ⌖
          </button>
        </div>

        <label className="country-filter">
          <span className="sr-only">{t('picker.country')}</span>
          <select
            className="name-input"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            aria-label={t('picker.country')}
          >
            <option value="">{t('picker.allCountries')}</option>
            {countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code, localeTag())} ({code})
              </option>
            ))}
          </select>
        </label>

        {locationState === 'unavailable' && (
          <p className="hint">{t('picker.locationUnavailable')}</p>
        )}

        {catalogError && <p className="notice error">{t(catalogError)}</p>}

        <div className="course-list">
          {/* Volba "bez hřiště" patří na začátek, ale ne mezi výsledky hledání -
              tam by se tvářila jako nalezené hřiště - a v čistém procházení
              nedává smysl vůbec. */}
          {mode === 'start' && !query.trim() && (
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
            <div
              key={row.id}
              className={`course-item${row.id === selectedId ? ' selected' : ''}`}
            >
              <button
                type="button"
                className="course-item-main"
                onClick={() => void choose(row)}
                disabled={downloading !== null}
              >
                <span className="course-item-name">
                  {row.name}
                  <span className={`course-item-tag course-item-tag-${row.status}`}>
                    {row.status === 'catalog'
                      ? downloading === row.id
                        ? t('picker.downloading')
                        : t('picker.inCatalog')
                      : row.status === 'downloaded'
                        ? t('picker.downloaded')
                        : t('picker.privateCourse')}
                  </span>
                </span>
                <span className="course-item-meta">{row.meta}</span>
              </button>
              <button
                type="button"
                className={`course-favorite${favoriteSet.has(row.id) ? ' active' : ''}`}
                onClick={() => void toggleFavorite(row)}
                disabled={downloading !== null}
                aria-label={
                  favoriteSet.has(row.id)
                    ? t('picker.removeFavorite', { name: row.name })
                    : t('picker.addFavorite', { name: row.name })
                }
                aria-pressed={favoriteSet.has(row.id)}
                title={
                  favoriteSet.has(row.id)
                    ? t('picker.removeFavorite', { name: row.name })
                    : t('picker.addFavorite', { name: row.name })
                }
              >
                <HeartIcon filled={favoriteSet.has(row.id)} />
              </button>
            </div>
          ))}

          {rows.length === 0 && !loading && (
            <p className="hint">{t('picker.nothingFound')}</p>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="link-row">
          <button type="button" className="link-button" onClick={onNewCourse}>
            {t('setup.newCourse')}
          </button>
          {onSkip && (
            <button type="button" className="link-button" onClick={onSkip}>
              {t('picker.skipCourse')}
            </button>
          )}
        </div>
        {/* Katalog je pod ODbL a ta vyžaduje uvést zdroj tam, kde se data
            používají - nestačí ho mít v README katalogu. */}
        <p className="hint catalog-credit">
          {t('picker.credit')}{' '}
          <a href={CATALOG_HOME} target="_blank" rel="noreferrer noopener">
            {t('picker.creditLink')}
          </a>
        </p>
      </footer>
    </div>
  )
}
