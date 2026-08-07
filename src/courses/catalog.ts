import type { Course } from './types'
import { isValidCourse, normalizeCourse } from './types'

/**
 * Katalog hřišť.
 *
 * Databáze hřišť žije na serveru a do telefonu se nikdy nestahuje celá -
 * stáhne se rejstřík (jméno, poloha, počet jamek) a scorekarta až u hřiště,
 * které si někdo vybral. Vybrané hřiště se pak uloží natrvalo, takže rozehrané
 * kolo na síti nikdy nezávisí.
 *
 * Stejně jako u Firebase platí: **žádný dotaz, dokud ho uživatel nevyvolá.**
 * Modul se ani nenačte, dokud se neotevře výběr hřiště.
 */

/**
 * Adresa katalogu.
 *
 * Výchozí je katalog projektu, takže fork má hřiště k dispozici bez jediného
 * nastavení - stejně jako je aplikace bez konfigurace Firebase plně funkční,
 * jen bez účtu. Vlastní katalog se podstrčí přes VITE_COURSES_URL.
 */
const DEFAULT_BASE = 'https://maciii.github.io/golfgames-courses/'

// Schválně `||`, ne `??`: nenastavená repository variable se do buildu propíše
// jako prázdný řetězec, ne jako undefined, a ten by adresu utnul na kořen.
const BASE = (import.meta.env.VITE_COURSES_URL || DEFAULT_BASE)
  .toString()
  .replace(/\/?$/, '/')

/** Položka rejstříku - jen to, podle čeho se hřiště hledá a vybírá. */
export interface CatalogEntry {
  id: string
  name: string
  club?: string
  country?: string
  lat?: number
  lon?: number
  holeCount: number
  /**
   * Na kolik devítek se hřiště dělí; chybí u hřiště, které se hraje vcelku.
   * Rejstřík to nese proto, aby bylo poznat resort ještě před stažením.
   */
  loops?: number
  /** Kolik má hřiště odpališť. */
  tees: number
  /** Má aspoň jedno odpaliště normu? Bez ní se handicap nedopočítá z indexu. */
  rated: boolean
  /** Volitelné; starší rejstříky ho nemají, scorekarta ho má vždy. */
  updatedAt?: string
}

/** Rejstřík se drží v paměti, ať se při každém hledání netahá znovu. */
let cached: CatalogEntry[] | null = null

export class CatalogError extends Error {
  constructor(readonly reason: 'offline' | 'missing' | 'broken') {
    super(reason)
  }
}

function isEntry(value: unknown): value is CatalogEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<CatalogEntry>
  return typeof entry.id === 'string' && typeof entry.name === 'string'
}

/**
 * Stáhne rejstřík hřišť.
 *
 * Chyby se rozlišují, protože každá znamená něco jiného: bez signálu se dá
 * hrát dál, chybějící katalog je chyba nasazení a poškozený obsah znamená, že
 * na adrese je něco jiného než katalog.
 */
export async function fetchIndex(): Promise<CatalogEntry[]> {
  if (cached) return cached

  let response: Response
  try {
    response = await fetch(`${BASE}index.json`, { cache: 'no-cache' })
  } catch {
    throw new CatalogError('offline')
  }
  if (!response.ok) throw new CatalogError('missing')

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new CatalogError('broken')
  }
  if (!Array.isArray(data)) throw new CatalogError('broken')

  cached = data.filter(isEntry)
  return cached
}

/** Stáhne scorekartu jednoho hřiště. */
export async function fetchCourse(id: string): Promise<Course> {
  let response: Response
  try {
    response = await fetch(`${BASE}course/${encodeURIComponent(id)}.json`, {
      cache: 'no-cache',
    })
  } catch {
    throw new CatalogError('offline')
  }
  if (!response.ok) throw new CatalogError('missing')

  const data: unknown = await response.json().catch(() => null)
  // Hřiště z katalogu prochází stejnou kontrolou jako hřiště ze zálohy -
  // poškozený záznam se nesmí dostat do výpočtů.
  if (!isValidCourse(data)) throw new CatalogError('broken')
  const course = normalizeCourse(data)
  return {
    ...course,
    origin: 'catalog',
    ...(course.updatedAt ? { catalogUpdatedAt: course.updatedAt } : {}),
  }
}

/** Adresa katalogu pro diagnostiku v UI. */
export function catalogBase(): string {
  return BASE
}
