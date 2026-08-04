import type { Auth } from 'firebase/auth'
import { loadFirebase } from './firebase'

/**
 * Přihlášení účtem Google.
 *
 * **Zásadní omezení prohlížečů:** vyskakovací okno smí otevřít jen kód, který
 * běží přímo v obsluze klepnutí. Jakékoli čekání na síť mezitím (třeba
 * dynamický import SDK) uživatelské gesto "spotřebuje" a Safari okno zablokuje.
 * Proto se SDK **předem načte** (preloadAuth) a `signInWithGoogle()` pak popup
 * otevírá synchronně, bez jediného `await` před ním.
 *
 * Přesměrování zůstává jako záloha pro případ, že okno zablokuje nastavení
 * prohlížeče. Není výchozí cestou: prochází doménou `*.firebaseapp.com`,
 * takže ho v Safari trápí blokování úložiště třetích stran.
 */

type AuthModule = typeof import('firebase/auth')

/** Připravené SDK. Dokud je null, popup se otevřít nedá. */
let ready: { auth: Auth; module: AuthModule } | null = null
let loading: Promise<{ auth: Auth; module: AuthModule }> | null = null

/**
 * Načte SDK dopředu, aby šel popup otevřít synchronně při klepnutí.
 * Volá se při otevření obrazovky účtu.
 */
export function preloadAuth(): Promise<{ auth: Auth; module: AuthModule }> {
  loading ??= (async () => {
    const { auth } = await loadFirebase()
    const module = await import('firebase/auth')

    // Firebase si před otevřením okna samo ověřuje původ stránky proti
    // autorizovaným doménám, a to je síťový požadavek. Kdyby na něj došlo až
    // při klepnutí, spotřeboval by uživatelské gesto a prohlížeč by okno
    // zablokoval. `getRedirectResult` tuhle přípravu udělá dopředu a zároveň
    // vyzvedne případný návrat z přesměrování.
    await module.getRedirectResult(auth).catch(() => null)

    ready = { auth, module }
    return ready
  })()
  return loading
}

/** Je SDK připravené? Podle toho se povoluje tlačítko přihlášení. */
export function isAuthReady(): boolean {
  return ready !== null
}

export interface Account {
  uid: string
  name: string
  email: string
}

/** Chyby, na které umíme uživateli odpovědět srozumitelně. */
export type SignInError = 'cancelled' | 'network' | 'unavailable' | 'notReady' | 'unknown'

/** Kódy, které znamenají "uživatel to sám zavřel" - není co hlásit jako chybu. */
const CANCELLED = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]

/** Kódy, po kterých má smysl zkusit přesměrování místo okna. */
const POPUP_BLOCKED = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]

function codeOf(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''
}

export function describeSignInError(error: unknown): SignInError {
  const code = codeOf(error)
  if (code === 'app/not-ready') return 'notReady'
  if (CANCELLED.includes(code)) return 'cancelled'
  if (code === 'auth/network-request-failed') return 'network'
  if (code.startsWith('auth/')) return 'unavailable'
  return 'unknown'
}

function toAccount(user: {
  uid: string
  displayName: string | null
  email: string | null
}): Account {
  return {
    uid: user.uid,
    name: user.displayName ?? user.email ?? 'Hráč',
    email: user.email ?? '',
  }
}

/**
 * Spustí přihlášení. Při úspěchu vrací účet; při přesměrování se stránka
 * načte znovu a účet dorazí až přes `watchAccount()`.
 *
 * Funkce **není async** a popup otevírá hned prvním příkazem - jinak by se
 * ztratilo uživatelské gesto a prohlížeč by okno zablokoval. Když SDK ještě
 * není načtené, vrací chybu `notReady` místo toho, aby na něj čekala.
 */
export function signInWithGoogle(): Promise<Account | null> {
  if (!ready) {
    // Načteme na příště, ale tenhle pokus zahodíme - čekáním bychom o gesto
    // přišli a popup by neprošel.
    void preloadAuth()
    return Promise.reject(
      Object.assign(new Error('SDK není načtené'), {
        code: 'app/not-ready',
      }),
    )
  }

  const { auth, module } = ready
  const provider = new module.GoogleAuthProvider()

  // Žádné `await` před tímhle řádkem. Tady se otevírá okno.
  return module.signInWithPopup(auth, provider).then(
    (credential) => toAccount(credential.user),
    async (error: unknown) => {
      if (!POPUP_BLOCKED.includes(codeOf(error))) throw error
      // Okno zablokovalo nastavení prohlížeče - zkusíme přesměrování;
      // návrat obslouží watchAccount().
      await module.signInWithRedirect(auth, provider)
      return null
    },
  )
}

export async function signOutAccount(): Promise<void> {
  const { auth } = await loadFirebase()
  const { signOut } = await import('firebase/auth')
  await signOut(auth)
}

/**
 * Sleduje přihlášený účet. Zachytí i návrat z přesměrování, takže volající
 * nemusí řešit, kterou cestou se uživatel přihlásil.
 */
export async function watchAccount(
  onChange: (account: Account | null) => void,
): Promise<() => void> {
  const { auth } = await loadFirebase()
  const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth')

  // Výsledek přesměrování je potřeba vyzvednout, jinak se přihlášení
  // "ztratí" mezi načtením stránky a prvním posluchačem.
  void getRedirectResult(auth).catch(() => null)

  return onAuthStateChanged(auth, (user) => onChange(user ? toAccount(user) : null))
}

/**
 * Smaže účet i s daty.
 *
 * Firebase u citlivých operací vyžaduje nedávné přihlášení; když ho postrádá,
 * uživatele nejdřív znovu přihlásíme a zkusíme to podruhé.
 */
export async function deleteAccount(): Promise<void> {
  const { auth } = await loadFirebase()
  const { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } =
    await import('firebase/auth')
  const user = auth.currentUser
  if (!user) return

  try {
    await deleteUser(user)
  } catch (error) {
    if (codeOf(error) !== 'auth/requires-recent-login') throw error
    await reauthenticateWithPopup(user, new GoogleAuthProvider())
    await deleteUser(user)
  }
}
