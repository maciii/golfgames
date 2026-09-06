import type { Round } from '../types'
import { roundTimestamp } from '../types'
import {
  clearDeletedRoundIds,
  clearRevivedRoundIds,
  isValidRound,
  loadAllGameOptions,
  loadArchive,
  loadCourses,
  loadCurrentRound,
  loadDeletedRoundIds,
  loadRevivedRoundIds,
  loadRoster,
  loadSettings,
  normalizeRound,
  saveAllGameOptions,
  saveArchive,
  saveCourses,
  saveCurrentRound,
  saveRoster,
  saveSettings,
} from '../storage'
import { isValidCourse, normalizeCourse } from '../courses/types'
import { mergeCourses, mergeRosters } from '../backup'
import { forFirestore, fromDocument, toDocument } from './document'
import {
  activeDeletedIds,
  finishedRounds,
  mergeRounds,
  pickCurrentRound,
  removeDeletedRounds,
} from './merge'
import { loadFirebase } from './firebase'

/**
 * Zrcadlení dat do Firestore.
 *
 * Zdrojem pravdy zůstává localStorage - cloud je záloha, ne primární úložiště.
 * Díky tomu funguje zápis skóre offline stejně rychle jako dřív a výpadek sítě
 * nemůže rozbít probíhající kolo.
 *
 * Model v cloudu:
 *
 *   users/{uid}/rounds/{roundId}   celé kolo jako JSON
 *   users/{uid}/prefs/app          hráči, sázka a volby bodování
 *
 * Rozehrané kolo je obyčejné kolo bez `finishedAt`, takže se na novém zařízení
 * pozná samo a nepotřebuje vlastní místo.
 */

/** Kola čekající na odeslání, když zrovna není signál. */
const QUEUE_KEY = 'golfgames.syncQueue.v1'

/** Po jaké době klidu se rozehrané kolo pošle do cloudu. */
const PUSH_DELAY_MS = 10_000

let pushTimer: number | null = null

function readQueue(): string[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeQueue(ids: string[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    /* fronta je jen pohodlí, hra běží dál */
  }
}

/** Všechna místní kola: rozehrané i archiv, bez duplicit. */
function localRounds(): Round[] {
  const current = loadCurrentRound()
  const archive = loadArchive()
  if (!current) return archive
  return [current, ...archive.filter((r) => r.id !== current.id)]
}

// --- čtení a zápis kol ----------------------------------------------------

async function fetchRounds(uid: string): Promise<Round[]> {
  const { db } = await loadFirebase()
  const { collection, getDocs } = await import('firebase/firestore')

  const snapshot = await getDocs(collection(db, 'users', uid, 'rounds'))
  return snapshot.docs
    .map((entry) => fromDocument(entry.data()))
    .filter(isValidRound)
    .map(normalizeRound)
}

async function uploadRounds(uid: string, rounds: Round[]): Promise<void> {
  if (rounds.length === 0) return
  const { db } = await loadFirebase()
  const { doc, writeBatch } = await import('firebase/firestore')

  // Dávkový zápis se počítá jako jedna operace na kolo, ale ušetří kolování
  // po síti; limit dávky je 500 zápisů, což archiv (max 100 kol) nepřekročí.
  const batch = writeBatch(db)
  for (const round of rounds) {
    batch.set(doc(db, 'users', uid, 'rounds', round.id), toDocument(round))
  }
  await batch.commit()
}

/** Smaže dokumenty kol po potvrzení explicitního zahození uživatelem. */
async function deleteRounds(uid: string, roundIds: string[]): Promise<void> {
  if (roundIds.length === 0) return
  const { db } = await loadFirebase()
  const { doc, writeBatch } = await import('firebase/firestore')

  // Firestore omezuje jednu dávku na 500 operací; tombstony mohou přežít více
  // kol, takže mazání rozdělíme, i když běžně půjde o jediný dokument.
  for (let start = 0; start < roundIds.length; start += 500) {
    const batch = writeBatch(db)
    for (const roundId of roundIds.slice(start, start + 500)) {
      batch.delete(doc(db, 'users', uid, 'rounds', roundId))
    }
    await batch.commit()
  }
}

// --- předvolby ------------------------------------------------------------

interface PrefsDocument {
  // Handicap i odpaliště jsou volitelné: hráči uložení dřív je nemají a kolo
  // bez hřiště odpaliště nezná.
  roster?: {
    id: string
    name: string
    handicapIndex?: number
    preferredTeeId?: string
    favorite?: boolean
  }[]
  settings?: unknown
  gameOptions?: unknown
  /**
   * Uložená hřiště. Jde o pole objektů, které samy obsahují pole (pary, SI) -
   * to Firestore zvládne; zakázané je jen pole přímo uvnitř pole.
   */
  courses?: unknown[]
  /** Id kol, která uživatel výslovně zahodil; brání jejich návratu na jiném zařízení. */
  deletedRoundIds?: unknown
  updatedAt?: string
}

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value.filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ]
}

async function fetchPrefs(uid: string): Promise<PrefsDocument> {
  const { db } = await loadFirebase()
  const { doc, getDoc } = await import('firebase/firestore')

  const reference = doc(db, 'users', uid, 'prefs', 'app')
  const snapshot = await getDoc(reference)
  return (snapshot.exists() ? snapshot.data() : {}) as PrefsDocument
}

async function fetchDeletedRoundIds(uid: string): Promise<string[]> {
  const remote = await fetchPrefs(uid)
  return stringIds(remote.deletedRoundIds)
}

/** Jsou to tytéž ids, bez ohledu na pořadí? */
function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const known = new Set(b)
  return a.every((id) => known.has(id))
}

/**
 * Sjednotí předvolby.
 *
 * Seznam smazaných kol se skládá i ubírá: `deletedRoundIds` přibývají,
 * `revivedRoundIds` (kola vrácená obnovou ze zálohy) se z něj naopak
 * vyškrtnou. Bez toho by tombstone v cloudu obnovené kolo při první
 * synchronizaci zase smazal.
 */
async function syncPrefs(
  uid: string,
  deletedRoundIds: string[],
  revivedRoundIds: string[],
): Promise<void> {
  const { db } = await loadFirebase()
  const { doc, setDoc } = await import('firebase/firestore')

  const reference = doc(db, 'users', uid, 'prefs', 'app')
  const remote = await fetchPrefs(uid)
  const remoteDeleted = stringIds(remote.deletedRoundIds)
  const mergedDeleted = activeDeletedIds(
    [...remoteDeleted, ...deletedRoundIds],
    revivedRoundIds,
  )
  // Seznam se může i zkrátit, takže na porovnání délek se spolehnout nedá.
  const deletedChanged = !sameIds(mergedDeleted, remoteDeleted)

  // Hráči se vždy sjednotí - seznam spoluhráčů nemá důvod se zmenšovat.
  const roster = mergeRosters(loadRoster(), remote.roster ?? [])
  saveRoster(roster)

  // Hřiště taky: doplněné pary, SI a normy jsou ruční práce, o kterou nemá
  // smysl přijít jen proto, že na druhém zařízení bylo nastavení novější.
  const courses = mergeCourses(
    loadCourses(),
    (remote.courses ?? []).filter(isValidCourse).map(normalizeCourse),
  )
  saveCourses(courses)

  // Sázka a volby bodování jsou jedno nastavení, takže se přebírá celé to
  // novější; míchat je po polích by dalo kombinaci, kterou nikdo nenastavil.
  const remoteTime = Date.parse(remote.updatedAt ?? '')
  const localTime = Date.parse(loadPrefsStamp() ?? '')
  const remoteWins =
    !Number.isNaN(remoteTime) && (Number.isNaN(localTime) || remoteTime > localTime)

  const remoteSettings = remoteWins
    ? (remote.settings as ReturnType<typeof loadSettings> | undefined)
    : undefined
  if (remoteSettings) {
    saveSettings(remoteSettings)
    if (remote.gameOptions) {
      saveAllGameOptions(remote.gameOptions as ReturnType<typeof loadAllGameOptions>)
    }
  }

  if (remoteSettings && !deletedChanged) {
    savePrefsStamp(remote.updatedAt ?? new Date().toISOString())
    return
  }

  const stamp = new Date().toISOString()
  // Hřiště jdou do dokumentu tak, jak je drží aplikace, a `normalizeCourse()`
  // v nich nechává `loops: undefined`. Firestore by celý zápis odmítl.
  await setDoc(
    reference,
    forFirestore({
      roster,
      settings: loadSettings(),
      gameOptions: loadAllGameOptions(),
      courses,
      deletedRoundIds: mergedDeleted,
      updatedAt: stamp,
    }),
  )
  savePrefsStamp(stamp)
}

const PREFS_STAMP_KEY = 'golfgames.prefsUpdatedAt.v1'

function loadPrefsStamp(): string | null {
  try {
    return localStorage.getItem(PREFS_STAMP_KEY)
  } catch {
    return null
  }
}

function savePrefsStamp(stamp: string): void {
  try {
    localStorage.setItem(PREFS_STAMP_KEY, stamp)
  } catch {
    /* nevadí, příště se předvolby prostě pošlou znovu */
  }
}

// --- veřejné rozhraní -----------------------------------------------------

export interface SyncResult {
  /** Kolik kol je po sloučení v zařízení. */
  rounds: number
  /** Kolik se jich nahrálo do cloudu. */
  uploaded: number
  /** Kolik místních kol zmizelo kvůli explicitnímu zahození. */
  deleted: number
}

/**
 * Úplná synchronizace: stáhne vzdálená kola, sloučí je s místními, výsledek
 * uloží do zařízení a rozdíl nahraje zpět.
 *
 * Volá se po přihlášení a při startu aplikace s přihlášeným účtem.
 */
export async function syncAll(uid: string): Promise<SyncResult> {
  const localDeleted = loadDeletedRoundIds()
  const localRevived = loadRevivedRoundIds()
  const [remoteRounds, remoteDeleted] = await Promise.all([
    fetchRounds(uid),
    fetchDeletedRoundIds(uid),
  ])
  // Obnova ze zálohy přebíjí dřívější smazání - jinak by se kolo vrácené ze
  // souboru hned zase ztratilo, protože cloud si smazání pamatuje.
  const deletedRoundIds = activeDeletedIds(
    [...remoteDeleted, ...localDeleted],
    localRevived,
  )
  const localBeforeDeletion = localRounds()
  const local = removeDeletedRounds(localBeforeDeletion, deletedRoundIds)
  const remote = removeDeletedRounds(remoteRounds, deletedRoundIds)
  const plan = mergeRounds(local, remote)

  // Rozehrané kolo si drží identitu - když si uživatel zrovna prohlíží
  // výsledky dohraného kola, nesmí mu ho synchronizace vyměnit pod rukama.
  const currentId = loadCurrentRound()?.id
  const byId = new Map(plan.local.map((r) => [r.id, r]))
  const nextCurrent =
    (currentId ? byId.get(currentId) : undefined) ?? pickCurrentRound(plan.local)

  saveArchive(finishedRounds(plan.local))
  saveCurrentRound(nextCurrent)

  await syncPrefs(uid, deletedRoundIds, localRevived)
  await deleteRounds(uid, deletedRoundIds)
  await uploadRounds(uid, plan.push)
  clearDeletedRoundIds(localDeleted)
  // Tombstony v cloudu jsou zrušené, seznam oživených došel účelu.
  clearRevivedRoundIds(localRevived)
  writeQueue([])

  return {
    rounds: plan.local.length,
    uploaded: plan.push.length,
    deleted: localBeforeDeletion.length - local.length,
  }
}

/**
 * Naplánuje odeslání kola s odkladem.
 *
 * Bez odkladu by osmnáctijamkové kolo znamenalo osmnáct zápisů; s ním vyjde
 * na jednotky, takže se denní kvóta bezplatného plánu nedá vyčerpat ani při
 * velkém počtu hráčů.
 */
export function scheduleRoundPush(uid: string, round: Round): void {
  writeQueue([...readQueue(), round.id])

  if (pushTimer !== null) clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    void flushQueue(uid)
  }, PUSH_DELAY_MS)
}

/**
 * Odešle, co čeká ve frontě. Volá se po vypršení odkladu, při odchodu
 * z aplikace a při návratu signálu.
 */
export async function flushQueue(uid: string): Promise<void> {
  const ids = readQueue()
  if (ids.length === 0) return

  const byId = new Map(localRounds().map((r) => [r.id, r]))
  const deleted = new Set(loadDeletedRoundIds())
  const rounds = ids.flatMap((id) => {
    if (deleted.has(id)) return []
    const round = byId.get(id)
    return round ? [round] : []
  })

  await uploadRounds(uid, rounds)
  writeQueue([])
}

/** Je něco neodeslaného? Používá indikátor stavu. */
export function hasPendingChanges(): boolean {
  return readQueue().length > 0
}

/** Zruší naplánované odeslání - po odhlášení už není kam posílat. */
export function cancelScheduledPush(): void {
  if (pushTimer === null) return
  clearTimeout(pushTimer)
  pushTimer = null
}

/**
 * Smaže všechna data uživatele v cloudu.
 *
 * Data v zařízení zůstávají - smazání účtu neznamená, že uživatel přijde
 * o kola, která má u sebe. Pořadí je záměrné: nejdřív data, pak účet, aby po
 * smazání účtu nezůstaly osiřelé dokumenty, ke kterým se nikdo nedostane.
 */
export async function deleteCloudData(uid: string): Promise<void> {
  const { db } = await loadFirebase()
  const { collection, deleteDoc, doc, getDocs, writeBatch } =
    await import('firebase/firestore')

  const snapshot = await getDocs(collection(db, 'users', uid, 'rounds'))
  if (snapshot.docs.length > 0) {
    const batch = writeBatch(db)
    for (const entry of snapshot.docs) batch.delete(entry.ref)
    await batch.commit()
  }

  await deleteDoc(doc(db, 'users', uid, 'prefs', 'app')).catch(() => null)
  writeQueue([])
}

/**
 * Přeloží chybu ze synchronizace na větu, se kterou se dá něco dělat.
 *
 * Nejčastější příčiny nejsou v aplikaci, ale v nastavení projektu, takže
 * obecné "nepovedlo se" je k ničemu - uživatel pak nemá kde začít.
 */
export function describeSyncError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  if (code.includes('permission-denied') || code.includes('PERMISSION_DENIED')) {
    return 'Databáze odmítla přístup. Nejspíš nejsou nasazená pravidla – Firebase Console → Firestore Database → Rules.'
  }
  if (code.includes('not-found') || code.includes('NOT_FOUND')) {
    return 'Databáze Firestore neexistuje. Vytvoř ji: Firebase Console → Build → Firestore Database → Create database.'
  }
  if (code.includes('unavailable')) {
    return 'Databáze není dostupná. Buď není vytvořená, nebo se k ní nedá připojit.'
  }
  if (code.includes('unauthenticated')) {
    return 'Přihlášení vypršelo. Odhlas se a přihlas znovu.'
  }
  if (code.includes('failed-precondition')) {
    return 'Firestore hlásí, že projekt není připravený – zkontroluj, že je databáze vytvořená.'
  }
  return code ? `Chyba ${code}.` : 'Neznámá chyba při synchronizaci.'
}

/** Čas poslední změny kola - pro popis stavu v UI. */
export function lastChangeOf(rounds: Round[]): number {
  return rounds.reduce((newest, round) => Math.max(newest, roundTimestamp(round)), 0)
}
