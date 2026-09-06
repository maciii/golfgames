import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Round } from '../types'
import type { Account, SignInError } from './auth'
import {
  deleteAccount,
  describeSignInError,
  isAuthReady,
  preloadAuth,
  signInWithGoogle,
  signOutAccount,
  watchAccount,
} from './auth'
import { isSyncConfigured } from './firebase'
import { loadDeletedPlayerKeys, loadDeletedRoundIds, markRoundDeleted } from '../storage'
import {
  cancelScheduledPush,
  deleteCloudData,
  describeSyncError,
  flushQueue,
  scheduleRoundPush,
  syncAll,
} from './sync'

/**
 * Stav účtu a synchronizace pro celou aplikaci.
 *
 * Klíčová vlastnost: dokud se uživatel nepřihlásí, tenhle kontext **nesáhne
 * na Firebase** a aplikace se chová přesně jako dřív. Teprve přihlášení
 * spustí dynamický import SDK.
 */

export type { Account, SignInError } from './auth'

export type SyncStatus =
  | 'disabled' // build bez konfigurace Firebase
  | 'anonymous' // nepřihlášeno, vše je jen v zařízení
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'

interface AccountValue {
  status: SyncStatus
  /**
   * Zvedne se pokaždé, když synchronizace přinesla data z cloudu. Obrazovky
   * podle toho vědí, že mají znovu načíst stav z úložiště - a zůstanou přitom
   * tam, kde uživatel je.
   */
  dataVersion: number
  account: Account | null
  /** Čas poslední úspěšné synchronizace. */
  lastSyncAt: Date | null
  /** Důvod, proč přihlášení neproběhlo; `cancelled` se nehlásí. */
  signInError: SignInError | null
  /** Proč selhala synchronizace, srozumitelně. */
  syncError: string | null
  /**
   * Je SDK načtené a jde otevřít přihlašovací okno? Dokud ne, tlačítko musí
   * zůstat vypnuté - popup otevřený po čekání na síť prohlížeč zablokuje.
   */
  authReady: boolean
  /** Načte SDK dopředu; volá obrazovka účtu při otevření. */
  prepareSignIn: () => void
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  /** Synchronizuje hned; vrací false, když není kdo. */
  syncNow: () => Promise<boolean>
  /** Ohlásí změnu kola, aby se s odkladem odeslalo. */
  noteRoundChange: (round: Round) => void
  /** Zahodí rozehrané kolo lokálně i v synchronizaci. */
  discardRound: (roundId: string) => void
  /** Smaže data v cloudu i účet; data v zařízení zůstanou. */
  deleteEverything: () => Promise<void>
}

const AccountContext = createContext<AccountValue | null>(null)

/** Klíč, pod kterým si pamatujeme, že se uživatel někdy přihlásil. */
const SIGNED_IN_KEY = 'golfgames.signedIn.v1'

function rememberSignedIn(value: boolean): void {
  try {
    if (value) localStorage.setItem(SIGNED_IN_KEY, '1')
    else localStorage.removeItem(SIGNED_IN_KEY)
  } catch {
    /* jen optimalizace, bez ní se SDK načte o něco později */
  }
}

function wasSignedIn(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === '1'
  } catch {
    return false
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [status, setStatus] = useState<SyncStatus>(
    isSyncConfigured() ? 'anonymous' : 'disabled',
  )
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [signInError, setSignInError] = useState<SignInError | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(() => isAuthReady())
  const [dataVersion, setDataVersion] = useState(0)
  // V callbackech potřebujeme aktuální uid bez toho, aby se přegenerovaly.
  const uid = useRef<string | null>(null)

  const runSync = useCallback(async (userId: string) => {
    setStatus('syncing')
    try {
      const result = await syncAll(userId)
      setLastSyncAt(new Date())
      setSyncError(null)
      setStatus('synced')
      // Obrazovky si po tomhle znovu načtou data z úložiště.
      if (result.rounds > 0 || result.deleted > 0) setDataVersion((n) => n + 1)
    } catch (error) {
      // Bez signálu to není chyba - data zůstala v zařízení a pošlou se pak.
      if (navigator.onLine) {
        setSyncError(describeSyncError(error))
        setStatus('error')
      } else {
        setStatus('offline')
      }
    }
  }, [])

  /** Načte SDK dopředu, aby šlo přihlašovací okno otevřít při klepnutí. */
  const prepareSignIn = useCallback(() => {
    if (!isSyncConfigured() || isAuthReady()) return
    void preloadAuth()
      .then(() => setAuthReady(true))
      .catch(() => setStatus('error'))
  }, [])

  /**
   * Posluchač přihlášení se nasazuje jen tehdy, když se uživatel někdy
   * přihlásil. U nepřihlášeného se tím pádem SDK vůbec nestáhne.
   */
  useEffect(() => {
    if (!isSyncConfigured() || !wasSignedIn()) return

    let stop: (() => void) | null = null
    let active = true

    void watchAccount((next) => {
      if (!active) return
      setAccount(next)
      uid.current = next?.uid ?? null
      if (next) void runSync(next.uid)
      else setStatus('anonymous')
    })
      .then((unsubscribe) => {
        if (active) stop = unsubscribe
        else unsubscribe()
      })
      .catch(() => setStatus('error'))

    return () => {
      active = false
      stop?.()
    }
  }, [runSync])

  /** Neodeslané změny posíláme při odchodu z aplikace a po návratu signálu. */
  useEffect(() => {
    function flush() {
      if (!uid.current) return
      // Čekající smazání se musí odbavit celou synchronizací; fronta umí jen
      // nahrávat, takže by se smazané kolo ani hráč do cloudu nikdy nedostali.
      const pendingDeletions =
        loadDeletedRoundIds().length > 0 || loadDeletedPlayerKeys().length > 0
      if (pendingDeletions) void runSync(uid.current)
      else void flushQueue(uid.current)
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [runSync])

  const signIn = useCallback(async () => {
    setSignInError(null)
    setStatus('syncing')
    try {
      const next = await signInWithGoogle()
      setAuthReady(true)
      rememberSignedIn(true)
      if (!next) return // přesměrování; účet dorazí po návratu na stránku

      setAccount(next)
      uid.current = next.uid
      // Posluchač se nasazuje až po prvním přihlášení, takže první
      // synchronizaci spustíme rovnou tady.
      await runSync(next.uid)
      const stop = await watchAccount((updated) => {
        setAccount(updated)
        uid.current = updated?.uid ?? null
      })
      void stop
    } catch (error) {
      const reason = describeSignInError(error)
      setSignInError(reason === 'cancelled' ? null : reason)
      setStatus('anonymous')
    }
  }, [runSync])

  const signOut = useCallback(async () => {
    cancelScheduledPush()
    try {
      if (uid.current) await flushQueue(uid.current)
    } catch {
      /* neodeslané změny zůstanou ve frontě na příště */
    }
    await signOutAccount()
    rememberSignedIn(false)
    setAccount(null)
    uid.current = null
    setStatus('anonymous')
    setLastSyncAt(null)
  }, [])

  const syncNow = useCallback(async () => {
    if (!uid.current) return false
    await runSync(uid.current)
    return true
  }, [runSync])

  const noteRoundChange = useCallback((round: Round) => {
    if (uid.current) scheduleRoundPush(uid.current, round)
  }, [])

  const discardRound = useCallback(
    (roundId: string) => {
      cancelScheduledPush()
      markRoundDeleted(roundId)
      if (uid.current) void runSync(uid.current)
    },
    [runSync],
  )

  const deleteEverything = useCallback(async () => {
    const userId = uid.current
    if (!userId) return

    cancelScheduledPush()
    await deleteCloudData(userId)
    await deleteAccount()
    rememberSignedIn(false)
    setAccount(null)
    uid.current = null
    setStatus('anonymous')
    setLastSyncAt(null)
  }, [])

  return (
    <AccountContext.Provider
      value={{
        status,
        dataVersion,
        account,
        lastSyncAt,
        signInError,
        syncError,
        authReady,
        prepareSignIn,
        signIn,
        signOut,
        syncNow,
        noteRoundChange,
        discardRound,
        deleteEverything,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount se dá volat jen uvnitř AccountProvider')
  return value
}
