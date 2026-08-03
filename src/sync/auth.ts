import { loadFirebase } from './firebase'

/**
 * Přihlášení účtem Google.
 *
 * Aplikace běží na iPhonu i Androidu a každý z nich se chová jinak:
 *
 * - **Vyskakovací okno** je výchozí cesta. Funguje na Androidu i v desktopu
 *   a nemusí procházet přes doménu Firebase, takže ho netrápí blokování
 *   cookies třetích stran.
 * - **Přesměrování** je záloha pro případ, že okno prohlížeč zablokuje -
 *   typicky iOS v režimu "přidáno na plochu".
 */

export interface Account {
  uid: string
  name: string
  email: string
}

/** Chyby, na které umíme uživateli odpovědět srozumitelně. */
export type SignInError = 'cancelled' | 'network' | 'unavailable' | 'unknown'

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
 */
export async function signInWithGoogle(): Promise<Account | null> {
  const { auth } = await loadFirebase()
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
    await import('firebase/auth')
  const provider = new GoogleAuthProvider()

  try {
    const credential = await signInWithPopup(auth, provider)
    return toAccount(credential.user)
  } catch (error) {
    if (!POPUP_BLOCKED.includes(codeOf(error))) throw error
    // Okno neprošlo - zkusíme přesměrování; návrat obslouží watchAccount().
    await signInWithRedirect(auth, provider)
    return null
  }
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
